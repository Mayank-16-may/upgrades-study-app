"""
UpGrades Backend — FastAPI Application
Handles syllabus uploads, AI plan generation, and Supabase persistence.
"""

from contextlib import asynccontextmanager
from datetime import date
from typing import Optional

from fastapi import (
    FastAPI, Request, Depends, UploadFile, File, Form,
    HTTPException, status, APIRouter
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from supabase import create_client, ClientOptions
import structlog
import uvicorn

from config import settings
from utils.logging import setup_logging, get_logger
from middleware.auth import get_current_user
from services.parser import validate_and_parse
from services.ai import configure_client, generate_plan_with_fallback, chat_with_tutor
from pydantic import BaseModel
from typing import List, Dict

# ── Logging ──────────────────────────────────────────────────────────
setup_logging()
logger = get_logger(__name__)

# ── Rate Limiter ─────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── Supabase Client ──────────────────────────────────────────────────
supabase = create_client(settings.supabase_url, settings.supabase_anon_key)

# ── Gemini Client ─────────────────────────────────────────────────────
gemini_client = configure_client(settings.gemini_api_key)

# ── Lifespan ─────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info(
        "application_startup",
        environment=settings.environment,
        ai_model=settings.gemini_model,
    )
    yield
    logger.info("application_shutdown")


# ── FastAPI App ──────────────────────────────────────────────────────
app = FastAPI(
    title="UpGrades API",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Exception Handlers ──────────────────────────────────────────────
@app.exception_handler(500)
async def internal_server_error_handler(request: Request, exc: Exception):
    logger.error("internal_server_error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


# ── Health Check ─────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {
        "status": "healthy",
        "version": app.version,
        "environment": settings.environment,
    }


# ══════════════════════════════════════════════════════════════════════
#  API v1 Router
# ══════════════════════════════════════════════════════════════════════
api_v1 = APIRouter(prefix="/api/v1", tags=["v1"])


@api_v1.post("/generate-plan")
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def generate_plan(
    request: Request,
    user_id: str = Depends(get_current_user),
    # ── File upload fields (multipart/form-data) ──
    file: Optional[UploadFile] = File(None),
    subject_name: str = Form(...),
    exam_date: date = Form(...),
    weekly_study_hours: float = Form(...),
    syllabus_text: Optional[str] = Form(None),
):
    """
    Generate a study plan from an uploaded PDF syllabus or pasted text.

    Accepts multipart/form-data with:
    - file (optional): A PDF file
    - subject_name: Name of the subject
    - exam_date: Target exam date (YYYY-MM-DD)
    - weekly_study_hours: How many hours per week to study
    - syllabus_text (optional): Pasted syllabus text (used if no file)
    """
    logger.info(
        "generate_plan_request",
        user_id=user_id,
        subject_name=subject_name,
        has_file=file is not None,
        has_text=syllabus_text is not None,
    )

    # ── 1. Extract syllabus text ────────────────────────────────────
    if file and file.filename:
        text = await validate_and_parse(file, settings.max_file_size_bytes)
        source_filename = file.filename
    elif syllabus_text and syllabus_text.strip():
        text = syllabus_text.strip()
        source_filename = None
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a PDF file or paste syllabus text.",
        )

    # ── 2. Create subject in Supabase ───────────────────────────────
    # Create a scoped client that uses the user's JWT so RLS policies pass
    auth_header = request.headers.get("Authorization")
    scoped_supabase = create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(headers={"Authorization": auth_header})
    )

    subject_result = (
        scoped_supabase.table("subjects")
        .insert({
            "user_id": user_id,
            "name": subject_name,
            "exam_date": str(exam_date),
            "weekly_study_hours": float(weekly_study_hours),
        })
        .execute()
    )

    if not subject_result.data:
        logger.error("subject_creation_failed", user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subject.",
        )

    subject_id = subject_result.data[0]["id"]
    logger.info("subject_created", subject_id=subject_id)

    # ── 3. Generate study plan via Gemini ───────────────────────────
    try:
        plan = await generate_plan_with_fallback(
            client=gemini_client,
            text=text,
            subject_name=subject_name,
            exam_date=exam_date,
            weekly_hours=weekly_study_hours,
            primary_model=settings.gemini_model,
            fallback_model=settings.gemini_fallback_model,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("ai_generation_failed", error=str(e), user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Our AI is temporarily unable to generate your plan. Please try again in a few minutes.",
        )

    # ── 4. Save plan to Supabase ────────────────────────────────────
    plan_data = plan.model_dump(mode="json")

    plan_result = (
        scoped_supabase.table("study_plans")
        .insert({
            "subject_id": subject_id,
            "user_id": user_id,
            "plan_data": plan_data,
            "raw_ai_response": plan.model_dump_json(),
            "source_filename": source_filename,
        })
        .execute()
    )

    if not plan_result.data:
        logger.error("plan_save_failed", subject_id=subject_id, user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save study plan.",
        )

    plan_id = plan_result.data[0]["id"]
    logger.info("plan_saved", plan_id=plan_id, subject_id=subject_id)

    # ── 5. Return response ──────────────────────────────────────────
    return {
        "message": "Study plan generated successfully!",
        "subject_id": subject_id,
        "plan_id": plan_id,
        "plan": plan_data,
    }


@api_v1.get("/subjects")
@limiter.limit("30/minute")
async def get_subjects(
    request: Request,
    user_id: str = Depends(get_current_user),
):
    """Get all subjects for the authenticated user."""
    auth_header = request.headers.get("Authorization")
    scoped_supabase = create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(headers={"Authorization": auth_header})
    )

    result = (
        scoped_supabase.table("subjects")
        .select("*")
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .order("created_at", desc=True)
        .execute()
    )
    return {"subjects": result.data}


@api_v1.get("/subjects/{subject_id}/plan")
@limiter.limit("30/minute")
async def get_plan(
    request: Request,
    subject_id: str,
    user_id: str = Depends(get_current_user),
):
    """Get the latest study plan for a subject."""
    auth_header = request.headers.get("Authorization")
    scoped_supabase = create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(headers={"Authorization": auth_header})
    )

    result = (
        scoped_supabase.table("study_plans")
        .select("*")
        .eq("subject_id", subject_id)
        .eq("user_id", user_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No study plan found for this subject.",
        )

    return {"plan": result.data[0]}

class PlanUpdate(BaseModel):
    plan_data: dict

@api_v1.put("/subjects/{subject_id}/plan")
@limiter.limit("30/minute")
async def update_plan(
    request: Request,
    subject_id: str,
    plan_update: PlanUpdate,
    user_id: str = Depends(get_current_user),
):
    """Update the latest study plan data (e.g. for progress tracking)."""
    auth_header = request.headers.get("Authorization")
    scoped_supabase = create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(headers={"Authorization": auth_header})
    )

    # Find the latest plan ID
    fetch_result = (
        scoped_supabase.table("study_plans")
        .select("id")
        .eq("subject_id", subject_id)
        .eq("user_id", user_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )

    if not fetch_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No study plan found to update.",
        )

    plan_id = fetch_result.data[0]["id"]

    # Update plan_data
    update_result = (
        scoped_supabase.table("study_plans")
        .update({"plan_data": plan_update.plan_data})
        .eq("id", plan_id)
        .execute()
    )

    return {"message": "Plan updated successfully", "plan": update_result.data[0]}


@api_v1.delete("/subjects/{subject_id}")
@limiter.limit("30/minute")
async def delete_subject(
    request: Request,
    subject_id: str,
    user_id: str = Depends(get_current_user),
):
    """Delete a subject and its associated plans."""
    auth_header = request.headers.get("Authorization")
    scoped_supabase = create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(headers={"Authorization": auth_header})
    )

    # Hard delete the subject (cascades to study_plans if DB is set up that way, otherwise we delete plans first)
    scoped_supabase.table("study_plans").delete().eq("subject_id", subject_id).eq("user_id", user_id).execute()
    result = scoped_supabase.table("subjects").delete().eq("id", subject_id).eq("user_id", user_id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found or you don't have permission to delete it.",
        )

    return {"message": "Subject deleted successfully"}


class ChatRequest(BaseModel):
    topic: str
    message: str
    history: List[Dict[str, str]]

@api_v1.post("/chat")
@limiter.limit("30/minute")
async def chat_endpoint(
    request: Request,
    chat_req: ChatRequest,
    user_id: str = Depends(get_current_user),
):
    """Chat with the AI tutor."""
    try:
        reply = await chat_with_tutor(
            client=gemini_client,
            topic=chat_req.topic,
            history=chat_req.history,
            new_message=chat_req.message,
            model=settings.gemini_model,
        )
        return {"reply": reply}
    except Exception as e:
        logger.error("chat_endpoint_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI response."
        )

app.include_router(api_v1)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
