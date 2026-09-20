from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict

from backend.part_a.schemas.route_search import RouteOption


# ------------------------------------------------------------------------------
# Transport Booking Schemas
# ------------------------------------------------------------------------------
class TransportBookingBase(BaseModel):
    booking_reference: str = Field(..., min_length=1, max_length=100, description="Booking reference code or PNR")
    provider_name: str = Field(..., min_length=1, max_length=100, description="Carrier, provider, or operator name")
    status: str = Field("CONFIRMED", max_length=50, description="Booking status (CONFIRMED, PENDING, CANCELLED)")
    fare_amount: float = Field(0.0, ge=0.0, description="Total fare amount")
    currency: str = Field("USD", max_length=10, description="Currency ISO code")
    booking_class: Optional[str] = Field(None, max_length=50, description="Booking or cabin class")
    seat_number: Optional[str] = Field(None, max_length=50, description="Assigned seat or berth")
    ticket_number: Optional[str] = Field(None, max_length=100, description="Ticket or e-ticket number")


class TransportBookingCreate(TransportBookingBase):
    booked_at: Optional[datetime] = None


class TransportBookingUpdate(BaseModel):
    booking_reference: Optional[str] = Field(None, max_length=100)
    provider_name: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, max_length=50)
    fare_amount: Optional[float] = Field(None, ge=0.0)
    currency: Optional[str] = Field(None, max_length=10)
    booking_class: Optional[str] = Field(None, max_length=50)
    seat_number: Optional[str] = Field(None, max_length=50)
    ticket_number: Optional[str] = Field(None, max_length=100)


class TransportBookingResponse(TransportBookingBase):
    id: str
    segment_id: str
    booked_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Flight Details Schemas
# ------------------------------------------------------------------------------
class FlightBase(BaseModel):
    flight_number: str = Field(..., min_length=1, max_length=50, description="Flight number, e.g., AI 102, DL 435")
    airline_code: str = Field(..., min_length=2, max_length=10, description="IATA/ICAO airline code, e.g., AI, DL")
    airline_name: str = Field(..., min_length=1, max_length=100, description="Operating airline name")
    departure_airport: str = Field(..., min_length=2, max_length=10, description="Departure airport IATA code, e.g. DEL, JFK")
    arrival_airport: str = Field(..., min_length=2, max_length=10, description="Arrival airport IATA code, e.g. BOM, SFO")
    departure_terminal: Optional[str] = Field(None, max_length=50)
    arrival_terminal: Optional[str] = Field(None, max_length=50)
    departure_gate: Optional[str] = Field(None, max_length=50)
    arrival_gate: Optional[str] = Field(None, max_length=50)
    aircraft_type: Optional[str] = Field(None, max_length=100)
    cabin_class: str = Field("ECONOMY", max_length=50)
    seat: Optional[str] = Field(None, max_length=50)
    baggage_allowance: Optional[str] = Field(None, max_length=100)

    @field_validator("airline_code", "departure_airport", "arrival_airport")
    @classmethod
    def normalize_codes(cls, v: str) -> str:
        return v.strip().upper()


class FlightCreate(FlightBase):
    pass


class FlightUpdate(BaseModel):
    flight_number: Optional[str] = Field(None, max_length=50)
    airline_code: Optional[str] = Field(None, max_length=10)
    airline_name: Optional[str] = Field(None, max_length=100)
    departure_airport: Optional[str] = Field(None, max_length=10)
    arrival_airport: Optional[str] = Field(None, max_length=10)
    departure_terminal: Optional[str] = Field(None, max_length=50)
    arrival_terminal: Optional[str] = Field(None, max_length=50)
    departure_gate: Optional[str] = Field(None, max_length=50)
    arrival_gate: Optional[str] = Field(None, max_length=50)
    aircraft_type: Optional[str] = Field(None, max_length=100)
    cabin_class: Optional[str] = Field(None, max_length=50)
    seat: Optional[str] = Field(None, max_length=50)
    baggage_allowance: Optional[str] = Field(None, max_length=100)


class FlightResponse(FlightBase):
    id: str
    segment_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Train Details Schemas
# ------------------------------------------------------------------------------
class TrainBase(BaseModel):
    train_number: str = Field(..., min_length=1, max_length=50, description="Train number or service code")
    train_name: str = Field(..., min_length=1, max_length=100, description="Train service name, e.g. Shatabdi Express")
    operator_name: str = Field(..., min_length=1, max_length=100, description="Railway operator, e.g. Indian Railways, Amtrak")
    departure_station: str = Field(..., min_length=1, max_length=100, description="Departure railway station name")
    arrival_station: str = Field(..., min_length=1, max_length=100, description="Arrival railway station name")
    departure_platform: Optional[str] = Field(None, max_length=50)
    arrival_platform: Optional[str] = Field(None, max_length=50)
    coach_number: Optional[str] = Field(None, max_length=50)
    seat_berth_number: Optional[str] = Field(None, max_length=50)
    travel_class: str = Field("STANDARD", max_length=50)


class TrainCreate(TrainBase):
    pass


class TrainUpdate(BaseModel):
    train_number: Optional[str] = Field(None, max_length=50)
    train_name: Optional[str] = Field(None, max_length=100)
    operator_name: Optional[str] = Field(None, max_length=100)
    departure_station: Optional[str] = Field(None, max_length=100)
    arrival_station: Optional[str] = Field(None, max_length=100)
    departure_platform: Optional[str] = Field(None, max_length=50)
    arrival_platform: Optional[str] = Field(None, max_length=50)
    coach_number: Optional[str] = Field(None, max_length=50)
    seat_berth_number: Optional[str] = Field(None, max_length=50)
    travel_class: Optional[str] = Field(None, max_length=50)


class TrainResponse(TrainBase):
    id: str
    segment_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Vehicle Details Schemas
# ------------------------------------------------------------------------------
class VehicleBase(BaseModel):
    vehicle_type: str = Field("TAXI", max_length=50, description="Vehicle category: TAXI, CAB, RENTAL_CAR, SHUTTLE, BUS")
    provider_name: str = Field(..., min_length=1, max_length=100, description="Provider/fleet name, e.g. Uber, Hertz")
    vehicle_model: Optional[str] = Field(None, max_length=100, description="Make and model of vehicle")
    license_plate: Optional[str] = Field(None, max_length=50)
    driver_name: Optional[str] = Field(None, max_length=100)
    driver_phone: Optional[str] = Field(None, max_length=50)
    pickup_address: Optional[str] = Field(None, max_length=255)
    dropoff_address: Optional[str] = Field(None, max_length=255)
    confirmation_code: Optional[str] = Field(None, max_length=100)


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    vehicle_type: Optional[str] = Field(None, max_length=50)
    provider_name: Optional[str] = Field(None, max_length=100)
    vehicle_model: Optional[str] = Field(None, max_length=100)
    license_plate: Optional[str] = Field(None, max_length=50)
    driver_name: Optional[str] = Field(None, max_length=100)
    driver_phone: Optional[str] = Field(None, max_length=50)
    pickup_address: Optional[str] = Field(None, max_length=255)
    dropoff_address: Optional[str] = Field(None, max_length=255)
    confirmation_code: Optional[str] = Field(None, max_length=100)


class VehicleResponse(VehicleBase):
    id: str
    segment_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Journey Segment Schemas
# ------------------------------------------------------------------------------
class JourneySegmentBase(BaseModel):
    sequence_order: int = Field(..., ge=1, description="Sequential position of segment in the trip (1, 2, 3...)")
    mode: str = Field(..., min_length=1, max_length=50, description="FLIGHT, TRAIN, VEHICLE, BUS, METRO, WALK")
    origin_location: str = Field(..., min_length=1, max_length=255)
    destination_location: str = Field(..., min_length=1, max_length=255)
    origin_lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    origin_lon: Optional[float] = Field(None, ge=-180.0, le=180.0)
    destination_lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    destination_lon: Optional[float] = Field(None, ge=-180.0, le=180.0)
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: Optional[float] = Field(0.0, ge=0.0)
    distance_km: Optional[float] = Field(0.0, ge=0.0)
    status: str = Field("PLANNED", max_length=50)
    estimated_cost: float = Field(0.0, ge=0.0)
    currency: str = Field("USD", max_length=10)
    instructions: Optional[str] = None
    provider: Optional[str] = Field(None, max_length=100, description="Operating transport carrier or provider name")

    @field_validator("mode")
    @classmethod
    def normalize_mode(cls, v: str) -> str:
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_segment_times(self) -> "JourneySegmentBase":
        if self.departure_time and self.arrival_time:
            if self.departure_time > self.arrival_time:
                raise ValueError("departure_time cannot be after arrival_time.")
            # Auto-calculate duration if not provided or 0
            if not self.duration_minutes or self.duration_minutes == 0.0:
                diff_sec = (self.arrival_time - self.departure_time).total_seconds()
                self.duration_minutes = round(diff_sec / 60.0, 2)
        return self


class JourneySegmentCreate(JourneySegmentBase):
    booking: Optional[TransportBookingCreate] = None
    flight: Optional[FlightCreate] = None
    train: Optional[TrainCreate] = None
    vehicle: Optional[VehicleCreate] = None


class JourneySegmentUpdate(BaseModel):
    sequence_order: Optional[int] = Field(None, ge=1)
    mode: Optional[str] = Field(None, max_length=50)
    origin_location: Optional[str] = Field(None, max_length=255)
    destination_location: Optional[str] = Field(None, max_length=255)
    origin_lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    origin_lon: Optional[float] = Field(None, ge=-180.0, le=180.0)
    destination_lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    destination_lon: Optional[float] = Field(None, ge=-180.0, le=180.0)
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    duration_minutes: Optional[float] = Field(None, ge=0.0)
    distance_km: Optional[float] = Field(None, ge=0.0)
    status: Optional[str] = Field(None, max_length=50)
    estimated_cost: Optional[float] = Field(None, ge=0.0)
    currency: Optional[str] = Field(None, max_length=10)
    instructions: Optional[str] = None
    booking: Optional[TransportBookingCreate] = None
    flight: Optional[FlightCreate] = None
    train: Optional[TrainCreate] = None
    vehicle: Optional[VehicleCreate] = None


class JourneySegmentResponse(JourneySegmentBase):
    id: str
    trip_id: str
    created_at: datetime
    updated_at: datetime
    booking: Optional[TransportBookingResponse] = None
    flight: Optional[FlightResponse] = None
    train: Optional[TrainResponse] = None
    vehicle: Optional[VehicleResponse] = None

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Trip Schemas
# ------------------------------------------------------------------------------
class TripBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Trip title, e.g. Executive Meeting in Mumbai")
    description: Optional[str] = Field(None, description="Detailed trip purpose or itinerary notes")
    status: str = Field("PLANNED", max_length=50, description="Trip lifecycle status (PLANNED, IN_PROGRESS, COMPLETED, CANCELLED)")
    origin: str = Field(..., min_length=1, max_length=255, description="Starting city or location")
    destination: str = Field(..., min_length=1, max_length=255, description="Final destination city or location")
    start_date: datetime = Field(..., description="Trip departure / start datetime")
    end_date: datetime = Field(..., description="Trip conclusion / return datetime")
    total_cost: float = Field(0.0, ge=0.0, description="Total estimated or booked trip cost")
    currency: str = Field("USD", max_length=10, description="Cost currency")
    policy_id: Optional[str] = Field(None, max_length=36, description="Optional applicable travel policy ID")

    @model_validator(mode="after")
    def validate_trip_dates(self) -> "TripBase":
        if self.start_date and self.end_date:
            if self.start_date > self.end_date:
                raise ValueError("start_date cannot be after end_date.")
        return self


def _convert_route_segment_to_segment_dict(seg: Dict[str, Any], idx: int) -> Dict[str, Any]:
    seg_id = str(seg.get("id") or idx)
    sequence_order = seg.get("sequence_order") or idx
    mode = str(seg.get("mode") or "TRANSIT").upper()
    origin = seg.get("origin") or "Origin"
    destination = seg.get("destination") or "Destination"
    departure = seg.get("departure")
    arrival = seg.get("arrival")
    price = float(seg.get("price") or 0.0)
    currency = str(seg.get("currency") or "USD").upper()
    duration = float(seg.get("duration") or 0.0)
    provider = seg.get("provider") or "Transit Operator"
    identifier = seg.get("identifier")
    details = seg.get("details") or {}

    # Booking sub-model payload
    booking_payload = {
        "booking_reference": str(details.get("booking_reference") or details.get("pnr") or f"BK-{seg_id[:8]}".upper()),
        "provider_name": str(provider),
        "status": "CONFIRMED",
        "fare_amount": price,
        "currency": currency,
        "booking_class": str(details.get("cabin_class") or details.get("travel_class") or details.get("booking_class") or "ECONOMY"),
        "seat_number": details.get("seat") or details.get("seat_number"),
        "ticket_number": details.get("ticket_number"),
    }

    flight_payload = None
    train_payload = None
    vehicle_payload = None

    if mode in ("FLIGHT", "AIR"):
        flight_payload = {
            "flight_number": str(identifier or details.get("flight_number") or f"{provider[:2].upper()}-101"),
            "airline_code": str(details.get("airline_code") or (identifier.split()[0].upper() if identifier and " " in identifier else provider[:2].upper())),
            "airline_name": str(provider),
            "departure_airport": str(details.get("departure_airport") or (origin[:3].upper() if len(origin) <= 4 else origin[:10])),
            "arrival_airport": str(details.get("arrival_airport") or (destination[:3].upper() if len(destination) <= 4 else destination[:10])),
            "departure_terminal": details.get("departure_terminal") or details.get("terminal"),
            "arrival_terminal": details.get("arrival_terminal"),
            "departure_gate": details.get("departure_gate"),
            "arrival_gate": details.get("arrival_gate"),
            "aircraft_type": details.get("aircraft_type") or details.get("aircraft"),
            "cabin_class": str(details.get("cabin_class") or "ECONOMY").upper(),
            "seat": details.get("seat"),
            "baggage_allowance": details.get("baggage_allowance"),
        }
    elif mode in ("TRAIN", "RAIL"):
        train_payload = {
            "train_number": str(details.get("train_number") or identifier or f"TR-{idx}01"),
            "train_name": str(details.get("train_name") or f"{provider} Express"),
            "operator_name": str(provider),
            "departure_station": str(details.get("departure_station") or origin),
            "arrival_station": str(details.get("arrival_station") or destination),
            "departure_platform": details.get("departure_platform") or details.get("platform"),
            "arrival_platform": details.get("arrival_platform"),
            "coach_number": details.get("coach_number") or details.get("coach"),
            "seat_berth_number": details.get("seat_berth_number") or details.get("seat"),
            "travel_class": str(details.get("travel_class") or "STANDARD").upper(),
        }
    elif mode in ("VEHICLE", "CAB", "TAXI", "BUS", "CAR", "SHUTTLE", "RIDESHARE"):
        v_type = "CAB" if ("CAB" in mode or "TAXI" in mode) else ("BUS" if "BUS" in mode else "TAXI")
        vehicle_payload = {
            "vehicle_type": v_type,
            "provider_name": str(provider),
            "vehicle_model": str(details.get("vehicle_model") or details.get("model") or (identifier if identifier and not identifier.startswith("TC-") else "Standard Sedan")),
            "license_plate": details.get("license_plate") or details.get("plate"),
            "driver_name": details.get("driver_name") or details.get("driver"),
            "driver_phone": details.get("driver_phone") or details.get("phone"),
            "pickup_address": details.get("pickup_address") or origin,
            "dropoff_address": details.get("dropoff_address") or destination,
            "confirmation_code": details.get("confirmation_code") or details.get("booking_reference"),
        }

    return {
        "sequence_order": sequence_order,
        "mode": mode,
        "origin_location": origin,
        "destination_location": destination,
        "departure_time": departure,
        "arrival_time": arrival,
        "duration_minutes": duration,
        "distance_km": float(details.get("distance_km") or 0.0),
        "status": "PLANNED",
        "estimated_cost": price,
        "currency": currency,
        "instructions": identifier or details.get("instructions") or f"{mode} operated by {provider}",
        "provider": provider,
        "booking": booking_payload,
        "flight": flight_payload,
        "train": train_payload,
        "vehicle": vehicle_payload,
    }


class TripCreate(TripBase):
    user_id: Optional[str] = Field(None, max_length=36, description="User ID owning the trip (optional if provided via auth token)")
    selected_route: Optional[Dict[str, Any]] = Field(None, description="Selected route option to construct trip and journey segments from")
    route: Optional[Dict[str, Any]] = Field(None, description="Alias for selected_route")
    segments: Optional[List[JourneySegmentCreate]] = Field(None, description="Initial journey segments")

    @model_validator(mode="before")
    @classmethod
    def populate_from_selected_route(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        # Look for route option in selected_route, route, or root dict
        route_obj = data.get("selected_route") or data.get("route")
        if not route_obj and "total_price" in data and "total_duration" in data and "segments" in data:
            segs = data.get("segments") or []
            if segs and isinstance(segs[0], dict) and ("provider" in segs[0] or "price" in segs[0]):
                route_obj = dict(data)

        if route_obj:
            if hasattr(route_obj, "model_dump"):
                route_dict = route_obj.model_dump()
            elif isinstance(route_obj, dict):
                route_dict = route_obj
            else:
                route_dict = {}

            if route_dict:
                # Fill missing top-level trip fields
                if not data.get("title"):
                    data["title"] = route_dict.get("title") or f"Trip: {route_dict.get('id', 'Selected Route')}"

                r_segs = route_dict.get("segments") or []
                if r_segs and not data.get("origin"):
                    first_seg = r_segs[0]
                    data["origin"] = (first_seg.origin if hasattr(first_seg, "origin") else first_seg.get("origin")) or "Origin"

                if r_segs and not data.get("destination"):
                    last_seg = r_segs[-1]
                    data["destination"] = (last_seg.destination if hasattr(last_seg, "destination") else last_seg.get("destination")) or "Destination"

                if not data.get("start_date"):
                    dep = route_dict.get("departure")
                    if not dep and r_segs:
                        first_s = r_segs[0]
                        dep = first_s.departure if hasattr(first_s, "departure") else first_s.get("departure")
                    data["start_date"] = dep

                if not data.get("end_date"):
                    arr = route_dict.get("arrival")
                    if not arr and r_segs:
                        last_s = r_segs[-1]
                        arr = last_s.arrival if hasattr(last_s, "arrival") else last_s.get("arrival")
                    data["end_date"] = arr

                if data.get("total_cost") is None or data.get("total_cost") == 0.0:
                    data["total_cost"] = float(route_dict.get("total_price") or 0.0)

                if not data.get("currency"):
                    data["currency"] = route_dict.get("currency", "USD")

                # If segments are not manually specified, convert from route segments
                if not data.get("segments") and r_segs:
                    converted_segs = []
                    for idx, s in enumerate(r_segs, start=1):
                        s_dict = s.model_dump() if hasattr(s, "model_dump") else s
                        if isinstance(s_dict, dict):
                            converted_segs.append(_convert_route_segment_to_segment_dict(s_dict, idx))
                    data["segments"] = converted_segs

        return data

    @model_validator(mode="after")
    def validate_segment_order(self) -> "TripCreate":
        if not self.segments:
            return self

        # Validate sequence orders: must start at 1, be positive, distinct, and contiguous
        orders = [s.sequence_order for s in self.segments]
        if any(o < 1 for o in orders):
            raise ValueError("All segment sequence_order values must be positive integers >= 1.")

        sorted_segments = sorted(self.segments, key=lambda s: s.sequence_order)
        expected_orders = list(range(1, len(sorted_segments) + 1))
        actual_orders = [s.sequence_order for s in sorted_segments]

        if actual_orders != expected_orders:
            raise ValueError(
                f"Segments must have consecutive sequence_order starting at 1 without gaps or duplicates. "
                f"Expected {expected_orders}, got {actual_orders}."
            )

        # Validate chronological order between consecutive segments
        for i in range(len(sorted_segments) - 1):
            curr_seg = sorted_segments[i]
            next_seg = sorted_segments[i + 1]
            if curr_seg.arrival_time > next_seg.departure_time:
                raise ValueError(
                    f"Segment order conflict: Segment {curr_seg.sequence_order} arrives at {curr_seg.arrival_time.isoformat()}, "
                    f"which is after Segment {next_seg.sequence_order} departs at {next_seg.departure_time.isoformat()}."
                )

        return self


class TripUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(None, max_length=50)
    origin: Optional[str] = Field(None, min_length=1, max_length=255)
    destination: Optional[str] = Field(None, min_length=1, max_length=255)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    total_cost: Optional[float] = Field(None, ge=0.0)
    currency: Optional[str] = Field(None, max_length=10)
    policy_id: Optional[str] = Field(None, max_length=36)

    @model_validator(mode="after")
    def validate_update_dates(self) -> "TripUpdate":
        if self.start_date and self.end_date:
            if self.start_date > self.end_date:
                raise ValueError("start_date cannot be after end_date.")
        return self


class TripResponse(TripBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    segments_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class TripDetailResponse(TripBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    segments: List[JourneySegmentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class SegmentStatusSummary(BaseModel):
    segment_id: str
    sequence_order: int
    mode: str
    provider: Optional[str] = None
    status: str
    departure_time: datetime
    arrival_time: datetime
    estimated_cost: float = 0.0
    currency: str = "USD"
    instructions: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TripStatusResponse(BaseModel):
    trip_id: str
    status: str
    title: str
    origin: str
    destination: str
    start_date: datetime
    end_date: datetime
    total_cost: float
    currency: str
    total_segments: int
    confirmed_segments: int
    planned_segments: int
    cancelled_segments: int
    is_active: bool
    segments: List[SegmentStatusSummary] = []
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
