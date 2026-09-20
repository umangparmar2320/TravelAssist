import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from backend.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class RoutePlan(Base):
    __tablename__ = "route_plans"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    title = Column(String(255), nullable=True)
    origin_name = Column(String(255), nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lon = Column(Float, nullable=False)

    destination_name = Column(String(255), nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lon = Column(Float, nullable=False)

    status = Column(String(50), default="COMPUTED", nullable=False, index=True)
    travel_mode = Column(String(50), default="MULTI_MODAL", nullable=False)
    preference = Column(String(50), default="FASTEST", nullable=False)

    total_distance_km = Column(Float, default=0.0, nullable=False)
    total_duration_minutes = Column(Float, default=0.0, nullable=False)
    estimated_cost = Column(Float, default=0.0, nullable=False)
    carbon_emissions_kg = Column(Float, default=0.0, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    segments = relationship(
        "RouteSegment",
        back_populates="route_plan",
        cascade="all, delete-orphan",
        order_by="RouteSegment.sequence_order",
    )


class RouteSegment(Base):
    __tablename__ = "route_segments"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    route_id = Column(String(36), ForeignKey("route_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence_order = Column(Integer, nullable=False)

    start_name = Column(String(255), nullable=False)
    start_lat = Column(Float, nullable=False)
    start_lon = Column(Float, nullable=False)

    end_name = Column(String(255), nullable=False)
    end_lat = Column(Float, nullable=False)
    end_lon = Column(Float, nullable=False)

    mode = Column(String(50), default="TRANSIT", nullable=False)
    provider_name = Column(String(100), default="MockProvider", nullable=False)

    distance_km = Column(Float, default=0.0, nullable=False)
    duration_minutes = Column(Float, default=0.0, nullable=False)
    delay_minutes = Column(Float, default=0.0, nullable=False)
    instructions = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    route_plan = relationship("RoutePlan", back_populates="segments")


class Location(Base):
    __tablename__ = "locations"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    name = Column(String(255), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True, index=True)
    category = Column(String(100), default="TRANSIT_HUB", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ProviderHealthRecord(Base):
    __tablename__ = "provider_health_records"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    provider_name = Column(String(100), nullable=False, index=True)
    status = Column(String(50), default="OPERATIONAL", nullable=False)
    latency_ms = Column(Float, default=0.0, nullable=False)
    endpoint_url = Column(String(255), nullable=True)
    checked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
