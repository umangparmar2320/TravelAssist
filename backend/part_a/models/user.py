import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
)
from sqlalchemy.orm import relationship
from backend.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="TRAVELER", nullable=False, index=True)
    company_id = Column(String(100), nullable=True, index=True)
    department = Column(String(100), nullable=True)
    phone_number = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    preference = relationship(
        "TravelerPreference",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    created_policies = relationship(
        "TravelPolicy",
        back_populates="created_by",
        foreign_keys="TravelPolicy.created_by_id",
    )
    trips = relationship(
        "Trip",
        back_populates="user",
        cascade="all, delete-orphan",
    )
