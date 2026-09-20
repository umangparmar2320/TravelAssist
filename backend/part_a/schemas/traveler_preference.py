from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class CabinClass(str, Enum):
    ECONOMY = "ECONOMY"
    PREMIUM_ECONOMY = "PREMIUM_ECONOMY"
    BUSINESS = "BUSINESS"
    FIRST = "FIRST"


class TransportMode(str, Enum):
    FLIGHT = "FLIGHT"
    TRAIN = "TRAIN"
    BUS = "BUS"
    METRO = "METRO"
    RIDE_SHARE = "RIDE_SHARE"
    WALK = "WALK"


class SeatPreference(str, Enum):
    WINDOW = "WINDOW"
    AISLE = "AISLE"
    MIDDLE = "MIDDLE"
    ANY = "ANY"


class TravelerPreferenceBase(BaseModel):
    cabin_class: CabinClass = CabinClass.ECONOMY
    preferred_airlines: List[str] = Field(default_factory=list)
    preferred_transport_modes: List[str] = Field(
        default_factory=lambda: ["FLIGHT", "TRAIN", "METRO"]
    )
    max_waiting_time_minutes: int = Field(default=120, ge=0, le=1440)
    max_stops: int = Field(default=1, ge=0, le=10)
    seat_preference: Optional[SeatPreference] = SeatPreference.AISLE

    @field_validator("preferred_airlines")
    @classmethod
    def validate_preferred_airlines(cls, v: List[str]) -> List[str]:
        # Normalize and remove duplicates while preserving order
        seen = set()
        normalized = []
        for airline in v:
            clean = airline.strip().upper()
            if clean and clean not in seen:
                seen.add(clean)
                normalized.append(clean)
        return normalized

    @field_validator("preferred_transport_modes")
    @classmethod
    def validate_transport_modes(cls, v: List[str]) -> List[str]:
        valid_modes = {mode.value for mode in TransportMode}
        normalized = []
        for mode in v:
            clean = mode.strip().upper()
            if clean in valid_modes and clean not in normalized:
                normalized.append(clean)
        return normalized


class TravelerPreferenceCreate(TravelerPreferenceBase):
    pass


class TravelerPreferenceUpdate(BaseModel):
    cabin_class: Optional[CabinClass] = None
    preferred_airlines: Optional[List[str]] = None
    preferred_transport_modes: Optional[List[str]] = None
    max_waiting_time_minutes: Optional[int] = Field(None, ge=0, le=1440)
    max_stops: Optional[int] = Field(None, ge=0, le=10)
    seat_preference: Optional[SeatPreference] = None

    @field_validator("preferred_airlines")
    @classmethod
    def validate_preferred_airlines(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        seen = set()
        normalized = []
        for airline in v:
            clean = airline.strip().upper()
            if clean and clean not in seen:
                seen.add(clean)
                normalized.append(clean)
        return normalized


class TravelerPreferenceResponse(TravelerPreferenceBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
