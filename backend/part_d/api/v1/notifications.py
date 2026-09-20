from typing import List
from datetime import datetime
from fastapi import APIRouter, status
from backend.part_d.schemas.notification import (
    NotificationResponse,
    NotificationCreate,
    RealtimeEventRequest,
)

router = APIRouter(tags=["Part D — Frontend & Notifications"])

MOCK_NOTIFICATIONS = [
    {
        "id": "notif-001",
        "user_id": "usr-corp-01",
        "trip_id": "trip-mb-goa-001",
        "type": "DISRUPTION_DETECTED",
        "title": "Train 12051 Cancelled",
        "message": "Your rail journey Mumbai Central → Goa Madgaon has been cancelled due to track hazard.",
        "timestamp": datetime.utcnow(),
        "read": False,
        "urgency": "CRITICAL",
        "channel": "IN_APP",
        "action_link": "/disruptions",
    },
    {
        "id": "notif-002",
        "user_id": "usr-corp-01",
        "trip_id": "trip-mb-goa-001",
        "type": "ALTERNATIVE_FOUND",
        "title": "In-Policy Air Alternative Available",
        "message": "Amadeus flight option found via BOM → GOI (IndiGo 6E 452). Arrives 3.5h earlier.",
        "timestamp": datetime.utcnow(),
        "read": False,
        "urgency": "WARNING",
        "channel": "IN_APP",
        "action_link": "/alternatives",
    },
]

@router.get("/notifications/{user_id}", response_model=List[NotificationResponse], summary="Get notifications for traveler")
def get_notifications(user_id: str):
    matches = [n for n in MOCK_NOTIFICATIONS if n["user_id"] == user_id]
    return [NotificationResponse(**n) for n in matches]

@router.post("/notifications/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def send_notification(payload: NotificationCreate):
    new_n = {
        "id": f"notif-{len(MOCK_NOTIFICATIONS) + 1}",
        "user_id": payload.user_id,
        "trip_id": payload.trip_id,
        "type": payload.type,
        "title": payload.title,
        "message": payload.message,
        "timestamp": datetime.utcnow(),
        "read": False,
        "urgency": payload.urgency,
        "channel": payload.channel,
        "action_link": payload.action_link,
    }
    MOCK_NOTIFICATIONS.insert(0, new_n)
    return NotificationResponse(**new_n)

@router.post("/realtime/simulate-event", summary="Simulate real-time monitoring disruption event")
def simulate_realtime_event(payload: RealtimeEventRequest):
    return {
        "success": True,
        "event": "DISRUPTION_DETECTED",
        "trip_id": payload.trip_id,
        "type": payload.type or "TRAIN_CANCELLED",
        "disruption_severity": "CRITICAL",
        "alternatives_count": 2,
        "hotel_notified": True,
        "notification_dispatched": True,
        "channels": ["IN_APP", "TELEGRAM", "SMS"],
    }
