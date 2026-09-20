from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, Response
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.part_a.api.deps import get_optional_current_user
from backend.part_a.models.user import User
from backend.part_a.schemas.trip import (
    TripCreate,
    TripUpdate,
    TripResponse,
    TripDetailResponse,
    TripStatusResponse,
    JourneySegmentCreate,
    JourneySegmentUpdate,
    JourneySegmentResponse,
)
from backend.part_a.services.trip_service import TripService

router = APIRouter(prefix="/trips", tags=["Trips & Journey Segments"])


@router.post(
    "",
    response_model=TripDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Trip",
    description="Creates a new trip with origin, destination, time boundaries, and optional initial journey segments. Validates segment sequence order and chronology.",
)
def create_trip(
    trip_in: TripCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    service = TripService(db)
    current_user_id = current_user.id if current_user else None
    trip = service.create_trip(trip_in, current_user_id=current_user_id)
    return TripDetailResponse.model_validate(trip)


@router.get(
    "",
    response_model=List[TripResponse],
    summary="List Trips",
    description="Lists trips with optional filters for user_id and status.",
)
def list_trips(
    user_id: Optional[str] = Query(None, description="Filter by traveler user ID"),
    status: Optional[str] = Query(None, description="Filter by trip status (PLANNED, IN_PROGRESS, etc.)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    service = TripService(db)
    trips, _ = service.list_trips(
        user_id=user_id, status_filter=status, skip=skip, limit=limit
    )
    result = []
    for t in trips:
        resp = TripResponse.model_validate(t)
        resp.segments_count = len(t.segments) if t.segments else 0
        result.append(resp)
    return result


@router.get(
    "/{trip_id}",
    response_model=TripDetailResponse,
    summary="Get Trip Details",
    description="Retrieves a complete trip by ID, including its ordered journey segments and nested transport booking/flight/train/vehicle details.",
)
def get_trip(
    trip_id: str,
    db: Session = Depends(get_db),
):
    service = TripService(db)
    trip = service.get_trip(trip_id)
    return TripDetailResponse.model_validate(trip)


@router.get(
    "/{trip_id}/status",
    response_model=TripStatusResponse,
    summary="Get Trip Status",
    description="Retrieves operational and lifecycle status of a trip, including segment progress and confirmation counts.",
)
def get_trip_status(
    trip_id: str,
    db: Session = Depends(get_db),
):
    service = TripService(db)
    status_data = service.get_trip_status(trip_id)
    return TripStatusResponse.model_validate(status_data)


@router.put(
    "/{trip_id}",
    response_model=TripDetailResponse,
    summary="Update Trip",
    description="Updates trip level metadata such as title, dates, status, origin, or destination.",
)
def update_trip(
    trip_id: str,
    trip_in: TripUpdate,
    db: Session = Depends(get_db),
):
    service = TripService(db)
    trip = service.update_trip(trip_id, trip_in)
    return TripDetailResponse.model_validate(trip)


@router.delete(
    "/{trip_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Trip",
    description="Deletes a trip and cascades removal of all its segments and bookings.",
)
def delete_trip(
    trip_id: str,
    db: Session = Depends(get_db),
):
    service = TripService(db)
    service.delete_trip(trip_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ------------------------------------------------------------------------------
# Segment Sub-Resource APIs
# ------------------------------------------------------------------------------

@router.get(
    "/{trip_id}/segments",
    response_model=List[JourneySegmentResponse],
    summary="Get Trip Segments",
    description="Retrieves all journey segments associated with the trip, ordered sequentially by sequence_order.",
)
def get_trip_segments(
    trip_id: str,
    db: Session = Depends(get_db),
):
    service = TripService(db)
    segments = service.get_trip_segments(trip_id)
    return [JourneySegmentResponse.model_validate(s) for s in segments]


@router.post(
    "/{trip_id}/segments",
    response_model=JourneySegmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Journey Segment to Trip",
    description="Appends or inserts a new journey segment into a trip. Enforces sequence order continuity and prevents time conflicts.",
)
def add_segment_to_trip(
    trip_id: str,
    segment_in: JourneySegmentCreate,
    db: Session = Depends(get_db),
):
    service = TripService(db)
    segment = service.add_segment_to_trip(trip_id, segment_in)
    return JourneySegmentResponse.model_validate(segment)


@router.get(
    "/{trip_id}/segments/{segment_id}",
    response_model=JourneySegmentResponse,
    summary="Get Segment Details",
    description="Retrieves detailed information for a specific journey segment.",
)
def get_segment_details(
    trip_id: str,
    segment_id: str,
    db: Session = Depends(get_db),
):
    service = TripService(db)
    segment = service.get_segment(trip_id, segment_id)
    return JourneySegmentResponse.model_validate(segment)


@router.put(
    "/{trip_id}/segments/{segment_id}",
    response_model=JourneySegmentResponse,
    summary="Update Journey Segment",
    description="Updates a segment's details, timings, status, or location metadata.",
)
def update_segment(
    trip_id: str,
    segment_id: str,
    segment_in: JourneySegmentUpdate,
    db: Session = Depends(get_db),
):
    service = TripService(db)
    segment = service.update_segment(trip_id, segment_id, segment_in)
    return JourneySegmentResponse.model_validate(segment)


@router.delete(
    "/{trip_id}/segments/{segment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Journey Segment",
    description="Removes a journey segment from a trip and re-sequences remaining segments to maintain continuity.",
)
def delete_segment(
    trip_id: str,
    segment_id: str,
    db: Session = Depends(get_db),
):
    service = TripService(db)
    service.delete_segment(trip_id, segment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
