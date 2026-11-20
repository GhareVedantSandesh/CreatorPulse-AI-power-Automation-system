from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum

class SlideType(str, Enum):
    COVER = "cover"
    PROBLEM = "problem"
    INSIGHT = "insight"
    STAT = "stat"
    LIST = "list"
    QUOTE = "quote"
    CTA = "cta"

class CarouselJobStatus(str, Enum):
    QUEUED = "queued"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    STYLING = "styling"
    RENDERING = "rendering"
    EXPORTING = "exporting"
    DONE = "done"
    FAILED = "failed"

# --- Step 1: Analysis ---
class TopicAnalysis(BaseModel):
    title: str = Field(..., description="Catchy title for the carousel")
    slides_count: int = Field(..., ge=3, le=10)
    core_message: str = Field(..., description="The single biggest takeaway")
    emotional_hook: str = Field(..., description="The hook used for the first slide")
    keywords: List[str] = Field(default_factory=list)

# --- Step 2: Content Generation ---
class SlideContent(BaseModel):
    type: SlideType
    title: Optional[str] = None
    heading: Optional[str] = None
    subtext: Optional[str] = None
    body: Optional[str] = None
    list_points: Optional[List[str]] = None
    number: Optional[str] = None
    label: Optional[str] = None
    context: Optional[str] = None
    action_text: Optional[str] = None
    visual_hint: Optional[str] = Field(None, description="Hint for the designer/image gen")

class CarouselStructure(BaseModel):
    slides: List[SlideContent]

# --- Step 3: Styling ---
class VisualTheme(BaseModel):
    color_palette: str = Field(..., description="indigo, emerald, slate, etc.")
    font_pair: str = Field(..., description="Modern sans-serif pairs")
    background_style: str = Field(..., description="gradient, mesh, minimal")

# --- Final Response ---
class CarouselJobUpdate(BaseModel):
    job_id: str
    status: CarouselJobStatus
    current_step: int
    payload: Optional[dict] = None
    error_log: Optional[str] = None
