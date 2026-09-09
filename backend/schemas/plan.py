from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class Resource(BaseModel):
    """A single learning resource (video, article, etc.)"""
    title: str
    type: str = Field(..., description="Type: 'video', 'article', 'exercise', 'quiz'")
    url: Optional[str] = None
    duration_minutes: Optional[int] = None
    source: Optional[str] = None  # e.g. 'YouTube', 'Khan Academy'

class DailyTask(BaseModel):
    """A single day's study task within a week."""
    day: int = Field(..., description="Day of the week (1=Monday, 7=Sunday)")
    topic: str
    study_hours: float
    resources: list[Resource] = Field(default_factory=list)
    objectives: list[str] = Field(default_factory=list, description="Learning objectives for this day")

class WeekPlan(BaseModel):
    """One week of the study plan."""
    week_number: int
    theme: str = Field(..., description="Overall theme/topic for this week")
    days: list[DailyTask]

class StudyPlanResponse(BaseModel):
    """The complete AI-generated study plan."""
    subject: str
    total_weeks: int
    weeks: list[WeekPlan]
    exam_date: date
    weekly_hours: float
    summary: str = Field(..., description="Brief overview of the study plan")

class GeneratePlanRequest(BaseModel):
    """Request body for plan generation (used when text is pasted, not file upload)."""
    subject_name: str = Field(..., min_length=1, max_length=200)
    syllabus_text: Optional[str] = Field(None, min_length=10)
    exam_date: date
    weekly_study_hours: float = Field(..., gt=0, le=100)
