import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Text,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from backend.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Trip(Base):
    __tablename__ = "trips"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="PLANNED", nullable=False, index=True)
    origin = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    total_cost = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    policy_id = Column(
        String(36),
        ForeignKey("travel_policies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="trips")
    policy = relationship("TravelPolicy")
    segments = relationship(
        "JourneySegment",
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="JourneySegment.sequence_order",
    )


class JourneySegment(Base):
    __tablename__ = "journey_segments"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    trip_id = Column(
        String(36),
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sequence_order = Column(Integer, nullable=False, index=True)
    mode = Column(String(50), nullable=False, index=True)  # FLIGHT, TRAIN, VEHICLE, BUS, METRO, WALK
    origin_location = Column(String(255), nullable=False)
    destination_location = Column(String(255), nullable=False)
    origin_lat = Column(Float, nullable=True)
    origin_lon = Column(Float, nullable=True)
    destination_lat = Column(Float, nullable=True)
    destination_lon = Column(Float, nullable=True)
    departure_time = Column(DateTime, nullable=False)
    arrival_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Float, default=0.0, nullable=False)
    distance_km = Column(Float, default=0.0, nullable=False)
    status = Column(String(50), default="PLANNED", nullable=False)  # PLANNED, CONFIRMED, DELAYED, CANCELLED
    estimated_cost = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    instructions = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    trip = relationship("Trip", back_populates="segments")
    booking = relationship(
        "TransportBooking",
        back_populates="segment",
        uselist=False,
        cascade="all, delete-orphan",
    )
    flight = relationship(
        "Flight",
        back_populates="segment",
        uselist=False,
        cascade="all, delete-orphan",
    )
    train = relationship(
        "Train",
        back_populates="segment",
        uselist=False,
        cascade="all, delete-orphan",
    )
    vehicle = relationship(
        "Vehicle",
        back_populates="segment",
        uselist=False,
        cascade="all, delete-orphan",
    )

    @property
    def provider(self) -> Optional[str]:
        """Resolves the operating carrier or transport provider name."""
        if self.booking and self.booking.provider_name:
            return self.booking.provider_name
        if self.flight and self.flight.airline_name:
            return self.flight.airline_name
        if self.train and self.train.operator_name:
            return self.train.operator_name
        if self.vehicle and self.vehicle.provider_name:
            return self.vehicle.provider_name
        return None


class TransportBooking(Base):
    __tablename__ = "transport_bookings"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    segment_id = Column(
        String(36),
        ForeignKey("journey_segments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    booking_reference = Column(String(100), nullable=False, index=True)  # PNR, confirmation number
    provider_name = Column(String(100), nullable=False)  # Airline, railway company, cab provider
    status = Column(String(50), default="CONFIRMED", nullable=False)  # CONFIRMED, PENDING, CANCELLED
    fare_amount = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    booking_class = Column(String(50), nullable=True)  # ECONOMY, BUSINESS, FIRST, etc.
    seat_number = Column(String(50), nullable=True)
    ticket_number = Column(String(100), nullable=True)
    booked_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    segment = relationship("JourneySegment", back_populates="booking")


class Flight(Base):
    __tablename__ = "flights"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    segment_id = Column(
        String(36),
        ForeignKey("journey_segments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    flight_number = Column(String(50), nullable=False, index=True)  # e.g. "AI 102", "DL 435"
    airline_code = Column(String(10), nullable=False, index=True)   # e.g. "AI", "DL"
    airline_name = Column(String(100), nullable=False)             # e.g. "Air India"
    departure_airport = Column(String(10), nullable=False)         # e.g. "DEL", "JFK"
    arrival_airport = Column(String(10), nullable=False)           # e.g. "BOM", "SFO"
    departure_terminal = Column(String(50), nullable=True)
    arrival_terminal = Column(String(50), nullable=True)
    departure_gate = Column(String(50), nullable=True)
    arrival_gate = Column(String(50), nullable=True)
    aircraft_type = Column(String(100), nullable=True)
    cabin_class = Column(String(50), default="ECONOMY", nullable=False)
    seat = Column(String(50), nullable=True)
    baggage_allowance = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    segment = relationship("JourneySegment", back_populates="flight")


class Train(Base):
    __tablename__ = "trains"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    segment_id = Column(
        String(36),
        ForeignKey("journey_segments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    train_number = Column(String(50), nullable=False, index=True)  # e.g. "12004", "Acela 2150"
    train_name = Column(String(100), nullable=False)               # e.g. "Shatabdi Express"
    operator_name = Column(String(100), nullable=False)            # e.g. "Indian Railways", "Amtrak"
    departure_station = Column(String(100), nullable=False)
    arrival_station = Column(String(100), nullable=False)
    departure_platform = Column(String(50), nullable=True)
    arrival_platform = Column(String(50), nullable=True)
    coach_number = Column(String(50), nullable=True)
    seat_berth_number = Column(String(50), nullable=True)
    travel_class = Column(String(50), default="STANDARD", nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    segment = relationship("JourneySegment", back_populates="train")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    segment_id = Column(
        String(36),
        ForeignKey("journey_segments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    vehicle_type = Column(String(50), default="TAXI", nullable=False, index=True)  # TAXI, CAB, RENTAL_CAR, SHUTTLE
    provider_name = Column(String(100), nullable=False)                           # e.g. Uber, Lyft, Hertz
    vehicle_model = Column(String(100), nullable=True)                            # e.g. Toyota Camry
    license_plate = Column(String(50), nullable=True)
    driver_name = Column(String(100), nullable=True)
    driver_phone = Column(String(50), nullable=True)
    pickup_address = Column(String(255), nullable=True)
    dropoff_address = Column(String(255), nullable=True)
    confirmation_code = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    segment = relationship("JourneySegment", back_populates="vehicle")
