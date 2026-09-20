import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from backend.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class TravelerPreference(Base):
    __tablename__ = "traveler_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Core traveler preference attributes
    cabin_class = Column(String(50), default="ECONOMY", nullable=False)
    preferred_airlines = Column(JSON, default=list, nullable=False)
    preferred_transport_modes = Column(JSON, default=list, nullable=False)
    max_waiting_time_minutes = Column(Integer, default=120, nullable=False)
    max_stops = Column(Integer, default=1, nullable=False)

    # Optional ergonomics
    seat_preference = Column(String(50), nullable=True, default="AISLE")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("User", back_populates="preference")
