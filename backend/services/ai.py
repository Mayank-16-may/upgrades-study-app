"""
AI service using Google Gemini for study plan generation.
Includes retry logic, fallback model, and circuit breaker.
"""

import asyncio
import json
import time
from datetime import date

import structlog
from fastapi import HTTPException
from google import genai
from google.genai import types
from pydantic import ValidationError
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from schemas.plan import StudyPlanResponse

logger = structlog.get_logger(__name__)


# ── Circuit Breaker ───────────────────────────────────────────────────
class CircuitBreaker:
    """
    Stops hammering the AI API after too many consecutive failures.
    Resets automatically after reset_timeout seconds.
    """
    def __init__(self, max_failures: int = 5, reset_timeout: int = 60):
        self.max_failures = max_failures
        self.reset_timeout = reset_timeout
        self.failures = 0
        self.last_failure_time = 0.0

    def record_failure(self) -> None:
        self.failures += 1
        self.last_failure_time = time.time()
        logger.warning("circuit_breaker_failure", failures=self.failures)

    def record_success(self) -> None:
        if self.failures > 0:
            logger.info("circuit_breaker_reset")
            self.failures = 0

    def is_open(self) -> bool:
        if self.failures >= self.max_failures:
            if time.time() - self.last_failure_time > self.reset_timeout:
                logger.info("circuit_breaker_half_open")
                return False
            return True
        return False


# Global circuit breaker instance
circuit_breaker = CircuitBreaker()


# ── Client Factory ────────────────────────────────────────────────────
def configure_client(api_key: str) -> genai.Client:
    """Create and return a configured Gemini client."""
    return genai.Client(api_key=api_key)


# ── Core AI Call (with retry) ─────────────────────────────────────────
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=8),
    retry=retry_if_exception_type((ValidationError, json.JSONDecodeError, Exception)),
    reraise=True,
)
async def _generate_and_parse(
    client: genai.Client,
    prompt: str,
    model: str,
) -> StudyPlanResponse:
    """Call Gemini API and parse the response into a StudyPlanResponse."""
    logger.info("calling_gemini", model=model)

    # Gemini API generation config (enforces JSON schema output)
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=StudyPlanResponse,
        temperature=0.2,
    )

    # SDK call
    def _call() -> str:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config,
        )
        return response.text

    raw = await asyncio.to_thread(_call)
    logger.info("gemini_response_received", length=len(raw))

    # Parse and validate the returned JSON using our Pydantic model
    data = json.loads(raw)
    return StudyPlanResponse(**data)


# ── Public API ────────────────────────────────────────────────────────
async def generate_study_plan(
    client: genai.Client,
    text: str,
    subject_name: str,
    exam_date: date,
    weekly_hours: float,
    model: str,
) -> StudyPlanResponse:
    """Generate a study plan using Gemini API."""
    logger.info("generating_study_plan", subject=subject_name, model=model)
    
    prompt = f"""
    You are an expert tutor and instructional designer. Create a comprehensive, realistic study plan for the subject "{subject_name}".
    
    The student has an exam on {exam_date} and can study {weekly_hours} hours per week.
    
    Here is the syllabus or course material to base the plan on:
    <syllabus>
    {text}
    </syllabus>
    
    Output a JSON object matching the requested schema. Make sure to distribute the {weekly_hours} hours logically across the days in a week.
    """
    
    if circuit_breaker.is_open():
        logger.error("circuit_breaker_open_preventing_call")
        raise HTTPException(status_code=503, detail="Service unavailable (Circuit open)")
        
    try:
        plan = await _generate_and_parse(client, prompt, model)
        circuit_breaker.record_success()
        return plan
    except Exception as e:
        circuit_breaker.record_failure()
        logger.error("generate_study_plan_failed", error=str(e))
        raise HTTPException(status_code=503, detail="Failed to generate plan.")


async def generate_plan_with_fallback(
    client: genai.Client,
    text: str,
    subject_name: str,
    exam_date: date,
    weekly_hours: float,
    primary_model: str,
    fallback_model: str,
) -> StudyPlanResponse:
    """Try primary model first; fall back to the smaller model on failure."""
    try:
        return await generate_study_plan(
            client, text, subject_name, exam_date, weekly_hours, primary_model
        )
    except HTTPException as e:
        if e.status_code == 503:
            raise  # Circuit is open — don't try fallback
        logger.warning(
            "primary_model_failed_trying_fallback",
            primary=primary_model,
            fallback=fallback_model,
        )
        return await generate_study_plan(
            client, text, subject_name, exam_date, weekly_hours, fallback_model
        )


async def chat_with_tutor(
    client: genai.Client,
    topic: str,
    history: list,
    new_message: str,
    model: str
) -> str:
    """Chat with the AI tutor."""
    system_instruction = f"You are an AI Tutor helping a student with the topic: {topic}. Be concise, helpful, and encouraging. Keep your responses short."
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.7
    )
    
    contents = []
    for msg in history:
        # Ignore the initial static greeting if it's there
        if msg["text"].startswith("Hi! I'm your AI Tutor"): continue
        role = "model" if msg["role"] == "ai" else "user"
        contents.append({"role": role, "parts": [{"text": msg["text"]}]})
        
    contents.append({"role": "user", "parts": [{"text": new_message}]})
    
    def _call():
        return client.models.generate_content(
            model=model,
            contents=contents,
            config=config
        )
    
    try:
        response = await asyncio.to_thread(_call)
        return response.text
    except Exception as e:
        logger.error("chat_failed", error=str(e))
        raise HTTPException(status_code=503, detail="Failed to get chat response.")
