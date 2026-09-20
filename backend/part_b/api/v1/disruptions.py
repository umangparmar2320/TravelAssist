from typing import List
from datetime import datetime
from fastapi import APIRouter, status, HTTPException
from backend.part_b.schemas.disruption import (
    DisruptionCreate,
    DisruptionResponse,
    AlternativeResponse,
    RebookingRequest,
    RebookingResponse,
)

router = APIRouter(tags=["Part B — Disruption & Decision Engine"])

# Mock store for Part B
MOCK_DISRUPTIONS = [
    {
        "id": "disrupt-konkan-001",
        "trip_id": "trip-mb-goa-001",
        "segment_id": "seg-002-train",
        "type": "TRAIN_CANCELLED",
        "severity": "HIGH",
        "description": "Jan Shatabdi Express cancelled due to track obstacle on Konkan corridor.",
        "detected_at": datetime.utcnow(),
        "status": "ACTIVE",
        "affected_provider": "Qrail / Indian Railways",
        "delay_minutes": 360,
    }
]

@router.get("/disruptions/{trip_id}", response_model=List[DisruptionResponse], summary="Get trip disruptions")
def get_disruptions(trip_id: str):
    matches = [d for d in MOCK_DISRUPTIONS if d["trip_id"] == trip_id]
    if not matches:
        # Return default disruption scenario for testing
        return [
            DisruptionResponse(
                id=f"disrupt-{trip_id}",
                trip_id=trip_id,
                segment_id="seg-default",
                type="TRAIN_CANCELLED",
                severity="HIGH",
                description="Service suspended due to corridor obstruction.",
                detected_at=datetime.utcnow(),
                status="ACTIVE",
                affected_provider="Qrail / Rail Corridor",
                delay_minutes=240,
            )
        ]
    return [DisruptionResponse(**d) for d in matches]

@router.post("/disruptions/simulate", response_model=DisruptionResponse, status_code=status.HTTP_201_CREATED)
def simulate_disruption(payload: DisruptionCreate):
    new_d = {
        "id": f"disrupt-{len(MOCK_DISRUPTIONS) + 1}",
        "trip_id": payload.trip_id,
        "segment_id": payload.segment_id or "seg-auto",
        "type": payload.type,
        "severity": payload.severity,
        "description": payload.description,
        "detected_at": datetime.utcnow(),
        "status": "ACTIVE",
        "affected_provider": payload.affected_provider or "Qrail",
        "delay_minutes": payload.delay_minutes or 180,
    }
    MOCK_DISRUPTIONS.insert(0, new_d)
    return DisruptionResponse(**new_d)

@router.get("/alternatives/{trip_id}", response_model=List[AlternativeResponse], summary="Find corridor alternatives")
def get_alternatives(trip_id: str):
    return [
        AlternativeResponse(
            id=f"alt-air-{trip_id}",
            trip_id=trip_id,
            title="Air Bypass via Domestic Flight (Amadeus)",
            segments=[
                {"mode": "CAB", "provider": "Google Routes", "origin": "Station", "destination": "Airport", "price": 650},
                {"mode": "FLIGHT", "provider": "Amadeus / Indigo", "origin": "Airport", "destination": "Goa Airport", "price": 4600},
                {"mode": "CAB", "provider": "Local Cab", "origin": "Goa Airport", "destination": "Hotel", "price": 1200},
            ],
            total_price=6450.0,
            currency="INR",
            total_duration=315,
            additional_cost=2950.0,
            policy_valid=True,
            reason="Fastest bypass around Konkan rail blockage; fully compliant with corporate auto-rebooking ceiling.",
            confidence_score=96.0,
            recommendation_badge="FASTEST",
        ),
        AlternativeResponse(
            id=f"alt-bus-{trip_id}",
            trip_id=trip_id,
            title="AC Sleeper Coach Detour",
            segments=[
                {"mode": "BUS", "provider": "State Express Transport", "origin": "City Hub", "destination": "Goa Central", "price": 1650}
            ],
            total_price=1650.0,
            currency="INR",
            total_duration=720,
            additional_cost=-1850.0,
            policy_valid=True,
            reason="Economical overland detour requiring zero budget escalation.",
            confidence_score=85.0,
            recommendation_badge="CHEAPEST",
        ),
    ]

@router.post("/rebooking/{trip_id}", response_model=RebookingResponse, summary="Execute rebooking decision")
def execute_rebooking(trip_id: str, payload: RebookingRequest = None):
    alt_id = payload.alternative_id if payload and payload.alternative_id else f"alt-air-{trip_id}"
    return RebookingResponse(
        success=True,
        trip_id=trip_id,
        status="REBOOKED",
        rebooked_alternative_id=alt_id,
        message="Journey successfully rebooked onto alternate carrier. Hotel front desk notified.",
    )
