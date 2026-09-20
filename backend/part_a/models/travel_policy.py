import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from backend.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class TravelPolicy(Base):
    __tablename__ = "travel_policies"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    company_id = Column(String(100), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Core corporate travel constraints
    max_additional_fare = Column(Float, default=0.0, nullable=False)
    max_stops = Column(Integer, default=1, nullable=False)
    preferred_airlines = Column(JSON, default=list, nullable=False)
    blocked_airlines = Column(JSON, default=list, nullable=False)
    auto_rebooking_allowed = Column(Boolean, default=False, nullable=False)
    approval_required_conditions = Column(JSON, default=list, nullable=False)

    # Allowed cabin class threshold
    max_cabin_class = Column(String(50), default="ECONOMY", nullable=False)

    created_by_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    created_by = relationship(
        "User",
        back_populates="created_policies",
        foreign_keys=[created_by_id],
    )
