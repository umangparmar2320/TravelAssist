import uuid
from datetime import datetime
from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.part_a.models.trip import (
    Trip,
    JourneySegment,
    TransportBooking,
    Flight,
    Train,
    Vehicle,
)
from backend.part_a.models.user import User
from backend.part_a.repositories.trip_repository import TripRepository
from backend.part_a.repositories.segment_repository import SegmentRepository
from backend.part_a.schemas.trip import (
    TripCreate,
    TripUpdate,
    JourneySegmentCreate,
    JourneySegmentUpdate,
)


class TripService:
    def __init__(self, db: Session):
        self.db = db
        self.trip_repo = TripRepository(db)
        self.segment_repo = SegmentRepository(db)

    def create_trip(self, payload: TripCreate, current_user_id: Optional[str] = None) -> Trip:
        # Determine owning user_id and ensure connection with existing User
        user_id = payload.user_id or current_user_id
        if user_id:
            existing_user = self.db.query(User).filter(User.id == user_id).first()
            if not existing_user:
                existing_user = self.db.query(User).filter(User.email == user_id).first()
            if existing_user:
                user_id = existing_user.id
            else:
                user = User(
                    id=user_id,
                    email=f"user_{user_id[:8]}@example.com" if "@" not in user_id else user_id,
                    hashed_password="mock_hash_for_dev",
                    full_name="Registered Traveler",
                    role="TRAVELER",
                )
                self.db.add(user)
                self.db.commit()
                self.db.refresh(user)
                user_id = user.id
        else:
            user = self.db.query(User).first()
            if user:
                user_id = user.id
            else:
                user = User(
                    id=str(uuid.uuid4()),
                    email="traveler@example.com",
                    hashed_password="mock_hash_for_dev",
                    full_name="Default Traveler",
                    role="TRAVELER",
                )
                self.db.add(user)
                self.db.commit()
                self.db.refresh(user)
                user_id = user.id

        # Validate date range
        if payload.start_date > payload.end_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="start_date cannot be after end_date.",
            )

        # Validate segment order if segments are provided upfront
        if payload.segments:
            self._validate_segments_sequence(payload.segments)

        # Calculate initial total cost
        total_cost = payload.total_cost
        if total_cost == 0.0 and payload.segments:
            for s in payload.segments:
                seg_cost = s.estimated_cost
                if s.booking and s.booking.fare_amount > 0:
                    seg_cost = s.booking.fare_amount
                total_cost += seg_cost

        # Create Trip entity
        trip = Trip(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=payload.title,
            description=payload.description,
            status=payload.status.upper() if payload.status else "PLANNED",
            origin=payload.origin,
            destination=payload.destination,
            start_date=payload.start_date,
            end_date=payload.end_date,
            total_cost=total_cost,
            currency=payload.currency.upper() if payload.currency else "USD",
            policy_id=payload.policy_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(trip)
        self.db.flush()

        # Add initial segments if present
        if payload.segments:
            sorted_segs = sorted(payload.segments, key=lambda s: s.sequence_order)
            for seg_data in sorted_segs:
                self._persist_segment(trip.id, seg_data)

        self.db.commit()
        return self.trip_repo.get_with_segments(trip.id)

    def get_trip(self, trip_id: str) -> Trip:
        trip = self.trip_repo.get_with_segments(trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip with id '{trip_id}' not found.",
            )
        return trip

    def list_trips(
        self,
        user_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Trip], int]:
        trips = self.trip_repo.list_trips(
            user_id=user_id,
            status=status_filter,
            skip=skip,
            limit=limit,
        )
        total = self.trip_repo.count_trips(user_id=user_id, status=status_filter)
        return trips, total

    def update_trip(self, trip_id: str, payload: TripUpdate) -> Trip:
        trip = self.get_trip(trip_id)

        update_dict = payload.model_dump(exclude_unset=True)
        if "start_date" in update_dict or "end_date" in update_dict:
            new_start = update_dict.get("start_date", trip.start_date)
            new_end = update_dict.get("end_date", trip.end_date)
            if new_start > new_end:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="start_date cannot be after end_date.",
                )

        for key, value in update_dict.items():
            if value is not None:
                if key == "status":
                    setattr(trip, key, value.upper())
                elif key == "currency":
                    setattr(trip, key, value.upper())
                else:
                    setattr(trip, key, value)

        trip.updated_at = datetime.utcnow()
        self.db.commit()
        return self.trip_repo.get_with_segments(trip_id)

    def delete_trip(self, trip_id: str) -> bool:
        trip = self.get_trip(trip_id)
        self.db.delete(trip)
        self.db.commit()
        return True

    def get_trip_segments(self, trip_id: str) -> List[JourneySegment]:
        # Ensure trip exists
        self.get_trip(trip_id)
        return self.segment_repo.get_by_trip(trip_id)

    def get_segment(self, trip_id: str, segment_id: str) -> JourneySegment:
        self.get_trip(trip_id)
        seg = self.segment_repo.get_with_details(segment_id)
        if not seg or seg.trip_id != trip_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Segment with id '{segment_id}' not found in trip '{trip_id}'.",
            )
        return seg

    def add_segment_to_trip(self, trip_id: str, payload: JourneySegmentCreate) -> JourneySegment:
        trip = self.get_trip(trip_id)
        existing_segments = self.segment_repo.get_by_trip(trip_id)

        # Segment sequence validation
        seq_orders = [s.sequence_order for s in existing_segments]

        if payload.sequence_order in seq_orders:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Segment with sequence_order {payload.sequence_order} already exists for trip '{trip_id}'.",
            )

        if payload.sequence_order < 1:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="sequence_order must be a positive integer >= 1.",
            )

        # Sequential gap check: sequence_order should be consecutive with existing segments
        expected_next = len(existing_segments) + 1
        if payload.sequence_order != expected_next and payload.sequence_order > expected_next:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sequence_order {payload.sequence_order}. Expected contiguous order {expected_next}.",
            )

        # Chronological validation with adjacent segments
        for ex in existing_segments:
            if ex.sequence_order < payload.sequence_order:
                if ex.arrival_time > payload.departure_time:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Segment order conflict: Existing segment {ex.sequence_order} arrives at "
                            f"{ex.arrival_time.isoformat()}, which is after new segment departure at "
                            f"{payload.departure_time.isoformat()}."
                        ),
                    )
            elif ex.sequence_order > payload.sequence_order:
                if payload.arrival_time > ex.departure_time:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Segment order conflict: New segment arrives at {payload.arrival_time.isoformat()}, "
                            f"which is after subsequent segment {ex.sequence_order} departure at "
                            f"{ex.departure_time.isoformat()}."
                        ),
                    )

        # Persist segment and sub-models
        segment = self._persist_segment(trip_id, payload)

        # Update trip total cost
        cost_inc = payload.estimated_cost
        if payload.booking and payload.booking.fare_amount > 0:
            cost_inc = payload.booking.fare_amount
        trip.total_cost += cost_inc
        trip.updated_at = datetime.utcnow()

        self.db.commit()
        return self.segment_repo.get_with_details(segment.id)

    def update_segment(self, trip_id: str, segment_id: str, payload: JourneySegmentUpdate) -> JourneySegment:
        segment = self.get_segment(trip_id, segment_id)
        update_dict = payload.model_dump(exclude_unset=True)

        # If sequence order is changing, check uniqueness
        if "sequence_order" in update_dict and update_dict["sequence_order"] != segment.sequence_order:
            new_order = update_dict["sequence_order"]
            existing = self.segment_repo.get_by_trip(trip_id)
            for ex in existing:
                if ex.id != segment_id and ex.sequence_order == new_order:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"sequence_order {new_order} is already taken by another segment.",
                    )

        for key in ["mode", "origin_location", "destination_location", "origin_lat", "origin_lon",
                    "destination_lat", "destination_lon", "departure_time", "arrival_time",
                    "duration_minutes", "distance_km", "status", "estimated_cost", "currency",
                    "instructions", "sequence_order"]:
            if key in update_dict and update_dict[key] is not None:
                val = update_dict[key]
                if key in ["mode", "status", "currency"]:
                    val = val.upper()
                setattr(segment, key, val)

        # Time check
        if segment.departure_time > segment.arrival_time:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="departure_time cannot be after arrival_time.",
            )

        segment.updated_at = datetime.utcnow()
        self.db.commit()
        return self.segment_repo.get_with_details(segment_id)

    def delete_segment(self, trip_id: str, segment_id: str) -> bool:
        segment = self.get_segment(trip_id, segment_id)
        self.db.delete(segment)

        # Re-sequence remaining segments to maintain contiguous 1..N order
        remaining = [s for s in self.segment_repo.get_by_trip(trip_id) if s.id != segment_id]
        for idx, s in enumerate(sorted(remaining, key=lambda x: x.sequence_order), start=1):
            s.sequence_order = idx

        self.db.commit()
        return True

    def _validate_segments_sequence(self, segments: List[JourneySegmentCreate]) -> None:
        orders = [s.sequence_order for s in segments]
        if any(o < 1 for o in orders):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Segment sequence_order must be a positive integer >= 1.",
            )

        sorted_segs = sorted(segments, key=lambda s: s.sequence_order)
        expected = list(range(1, len(sorted_segs) + 1))
        actual = [s.sequence_order for s in sorted_segs]
        if actual != expected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Segments must form a contiguous sequence starting at 1. Expected {expected}, got {actual}.",
            )

        for i in range(len(sorted_segs) - 1):
            curr_s = sorted_segs[i]
            next_s = sorted_segs[i + 1]
            if curr_s.arrival_time > next_s.departure_time:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Segment order conflict: Segment {curr_s.sequence_order} arrives at "
                        f"{curr_s.arrival_time.isoformat()}, which is after Segment {next_s.sequence_order} "
                        f"departs at {next_s.departure_time.isoformat()}."
                    ),
                )

    def _persist_segment(self, trip_id: str, seg_data: JourneySegmentCreate) -> JourneySegment:
        seg_id = str(uuid.uuid4())
        diff_min = seg_data.duration_minutes
        if not diff_min or diff_min == 0.0:
            diff_sec = (seg_data.arrival_time - seg_data.departure_time).total_seconds()
            diff_min = round(diff_sec / 60.0, 2)

        segment = JourneySegment(
            id=seg_id,
            trip_id=trip_id,
            sequence_order=seg_data.sequence_order,
            mode=seg_data.mode.upper(),
            origin_location=seg_data.origin_location,
            destination_location=seg_data.destination_location,
            origin_lat=seg_data.origin_lat,
            origin_lon=seg_data.origin_lon,
            destination_lat=seg_data.destination_lat,
            destination_lon=seg_data.destination_lon,
            departure_time=seg_data.departure_time,
            arrival_time=seg_data.arrival_time,
            duration_minutes=diff_min,
            distance_km=seg_data.distance_km or 0.0,
            status=seg_data.status.upper() if seg_data.status else "PLANNED",
            estimated_cost=seg_data.estimated_cost or 0.0,
            currency=seg_data.currency.upper() if seg_data.currency else "USD",
            instructions=seg_data.instructions,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(segment)
        self.db.flush()

        # Handle Booking if provided or if provider is specified
        if seg_data.booking:
            b_data = seg_data.booking
            booking = TransportBooking(
                id=str(uuid.uuid4()),
                segment_id=seg_id,
                booking_reference=b_data.booking_reference,
                provider_name=b_data.provider_name,
                status=b_data.status.upper() if b_data.status else "CONFIRMED",
                fare_amount=b_data.fare_amount,
                currency=b_data.currency.upper() if b_data.currency else "USD",
                booking_class=b_data.booking_class,
                seat_number=b_data.seat_number,
                ticket_number=b_data.ticket_number,
                booked_at=b_data.booked_at or datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            self.db.add(booking)
        elif getattr(seg_data, "provider", None):
            prov_name = seg_data.provider
            booking = TransportBooking(
                id=str(uuid.uuid4()),
                segment_id=seg_id,
                booking_reference=f"BK-{seg_id[:8].upper()}",
                provider_name=prov_name,
                status="CONFIRMED",
                fare_amount=seg_data.estimated_cost,
                currency=seg_data.currency.upper() if seg_data.currency else "USD",
                booking_class="ECONOMY",
                booked_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            self.db.add(booking)

        # Handle Flight if provided
        if seg_data.flight:
            f_data = seg_data.flight
            flight = Flight(
                id=str(uuid.uuid4()),
                segment_id=seg_id,
                flight_number=f_data.flight_number.upper(),
                airline_code=f_data.airline_code.upper(),
                airline_name=f_data.airline_name,
                departure_airport=f_data.departure_airport.upper(),
                arrival_airport=f_data.arrival_airport.upper(),
                departure_terminal=f_data.departure_terminal,
                arrival_terminal=f_data.arrival_terminal,
                departure_gate=f_data.departure_gate,
                arrival_gate=f_data.arrival_gate,
                aircraft_type=f_data.aircraft_type,
                cabin_class=f_data.cabin_class.upper() if f_data.cabin_class else "ECONOMY",
                seat=f_data.seat,
                baggage_allowance=f_data.baggage_allowance,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            self.db.add(flight)

        # Handle Train if provided
        if seg_data.train:
            t_data = seg_data.train
            train = Train(
                id=str(uuid.uuid4()),
                segment_id=seg_id,
                train_number=t_data.train_number,
                train_name=t_data.train_name,
                operator_name=t_data.operator_name,
                departure_station=t_data.departure_station,
                arrival_station=t_data.arrival_station,
                departure_platform=t_data.departure_platform,
                arrival_platform=t_data.arrival_platform,
                coach_number=t_data.coach_number,
                seat_berth_number=t_data.seat_berth_number,
                travel_class=t_data.travel_class.upper() if t_data.travel_class else "STANDARD",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            self.db.add(train)

        # Handle Vehicle if provided
        if seg_data.vehicle:
            v_data = seg_data.vehicle
            vehicle = Vehicle(
                id=str(uuid.uuid4()),
                segment_id=seg_id,
                vehicle_type=v_data.vehicle_type.upper() if v_data.vehicle_type else "TAXI",
                provider_name=v_data.provider_name,
                vehicle_model=v_data.vehicle_model,
                license_plate=v_data.license_plate,
                driver_name=v_data.driver_name,
                driver_phone=v_data.driver_phone,
                pickup_address=v_data.pickup_address,
                dropoff_address=v_data.dropoff_address,
                confirmation_code=v_data.confirmation_code,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            self.db.add(vehicle)

        return segment

    def get_trip_status(self, trip_id: str) -> dict:
        trip = self.trip_repo.get_with_segments(trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip with id '{trip_id}' not found.",
            )

        segments = trip.segments or []
        sorted_segments = sorted(segments, key=lambda s: s.sequence_order)

        confirmed_count = sum(1 for s in sorted_segments if s.status and s.status.upper() == "CONFIRMED")
        planned_count = sum(1 for s in sorted_segments if not s.status or s.status.upper() == "PLANNED")
        cancelled_count = sum(1 for s in sorted_segments if s.status and s.status.upper() == "CANCELLED")

        now = datetime.utcnow()
        trip_status_upper = trip.status.upper() if trip.status else "PLANNED"
        is_active = (trip_status_upper == "IN_PROGRESS") or (
            trip_status_upper != "CANCELLED" and trip.start_date <= now <= trip.end_date
        )

        segment_summaries = []
        for s in sorted_segments:
            segment_summaries.append({
                "segment_id": s.id,
                "sequence_order": s.sequence_order,
                "mode": s.mode,
                "provider": s.provider,
                "status": s.status or "PLANNED",
                "departure_time": s.departure_time,
                "arrival_time": s.arrival_time,
                "estimated_cost": s.estimated_cost or 0.0,
                "currency": s.currency or "USD",
                "instructions": s.instructions,
            })

        return {
            "trip_id": trip.id,
            "status": trip.status,
            "title": trip.title,
            "origin": trip.origin,
            "destination": trip.destination,
            "start_date": trip.start_date,
            "end_date": trip.end_date,
            "total_cost": trip.total_cost or 0.0,
            "currency": trip.currency or "USD",
            "total_segments": len(sorted_segments),
            "confirmed_segments": confirmed_count,
            "planned_segments": planned_count,
            "cancelled_segments": cancelled_count,
            "is_active": is_active,
            "segments": segment_summaries,
            "updated_at": trip.updated_at,
        }
