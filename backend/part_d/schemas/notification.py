from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    trip_id: Optional[str] = None
    type: str
    title: str
    message: str
    timestamp: datetime
    read: bool
    urgency: str
    channel: str
    action_link: Optional[str] = None

class NotificationCreate(BaseModel):
    user_id: str = "usr-corp-01"
    trip_id: Optional[str] = None
    type: str = "DISRUPTION_DETECTED"
    title: str
    message: str
    urgency: str = "INFO"
    channel: str = "IN_APP"
    action_link: Optional[str] = None

class RealtimeEventRequest(BaseModel):
    trip_id: str = "trip-mb-goa-001"
    type: Optional[str] = "TRAIN_CANCELLED"
    description: Optional[str] = None
