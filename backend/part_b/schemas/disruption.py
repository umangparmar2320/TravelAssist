from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class DisruptionCreate(BaseModel):
    trip_id: str
    segment_id: Optional[str] = None
    type: str = "TRAIN_CANCELLED"
    severity: str = "HIGH"
    description: str
    affected_provider: Optional[str] = None
    delay_minutes: Optional[int] = 0

class DisruptionResponse(BaseModel):
    id: str
    trip_id: str
    segment_id: Optional[str] = None
    type: str
    severity: str
    description: str
    detected_at: datetime
    status: str
    affected_provider: Optional[str] = None
    delay_minutes: Optional[int] = 0

class AlternativeResponse(BaseModel):
    id: str
    trip_id: str
    title: Optional[str] = None
    segments: List[dict] = Field(default_factory=list)
    total_price: float
    currency: str = "INR"
    total_duration: int
    additional_cost: float
    policy_valid: bool
    reason: str
    confidence_score: Optional[float] = 95.0
    recommendation_badge: Optional[str] = "FASTEST"

class RebookingRequest(BaseModel):
    alternative_id: Optional[str] = None

class RebookingResponse(BaseModel):
    success: bool
    trip_id: str
    status: str
    rebooked_alternative_id: str
    message: str
