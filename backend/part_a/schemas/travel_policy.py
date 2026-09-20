from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from backend.part_a.schemas.traveler_preference import CabinClass


class TravelPolicyBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    company_id: Optional[str] = Field(None, max_length=100)
    is_active: bool = True

    # Policy constraint fields
    max_additional_fare: float = Field(
        default=50.0,
        ge=0.0,
        description="Maximum allowed fare deviation above the lowest logical fare",
    )
    max_stops: int = Field(default=1, ge=0, le=5)
    preferred_airlines: List[str] = Field(default_factory=list)
    blocked_airlines: List[str] = Field(default_factory=list)
    auto_rebooking_allowed: bool = Field(default=True)
    approval_required_conditions: List[str] = Field(
        default_factory=lambda: [
            "FARE_EXCEEDS_CAP",
            "OUT_OF_POLICY_CABIN",
            "BLOCKED_CARRIER",
        ]
    )
    max_cabin_class: CabinClass = CabinClass.ECONOMY

    @field_validator("preferred_airlines", "blocked_airlines")
    @classmethod
    def normalize_airline_codes(cls, v: List[str]) -> List[str]:
        seen = set()
        normalized = []
        for code in v:
            clean = code.strip().upper()
            if clean and clean not in seen:
                seen.add(clean)
                normalized.append(clean)
        return normalized

    @field_validator("blocked_airlines")
    @classmethod
    def validate_no_preferred_blocked_overlap(cls, v: List[str], info) -> List[str]:
        preferred = info.data.get("preferred_airlines", [])
        overlap = set(preferred).intersection(set(v))
        if overlap:
            raise ValueError(f"Airlines cannot be both preferred and blocked: {list(overlap)}")
        return v


class TravelPolicyCreate(TravelPolicyBase):
    pass


class TravelPolicyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    company_id: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None
    max_additional_fare: Optional[float] = Field(None, ge=0.0)
    max_stops: Optional[int] = Field(None, ge=0, le=5)
    preferred_airlines: Optional[List[str]] = None
    blocked_airlines: Optional[List[str]] = None
    auto_rebooking_allowed: Optional[bool] = None
    approval_required_conditions: Optional[List[str]] = None
    max_cabin_class: Optional[CabinClass] = None

    @field_validator("preferred_airlines", "blocked_airlines")
    @classmethod
    def normalize_airline_codes(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        seen = set()
        normalized = []
        for code in v:
            clean = code.strip().upper()
            if clean and clean not in seen:
                seen.add(clean)
                normalized.append(clean)
        return normalized


class TravelPolicyResponse(TravelPolicyBase):
    id: str
    created_by_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PolicyEvaluationRequest(BaseModel):
    fare_amount: float = Field(..., ge=0.0)
    lowest_logical_fare: float = Field(default=0.0, ge=0.0)
    stops: int = Field(default=0, ge=0)
    airline_code: Optional[str] = None
    cabin_class: CabinClass = CabinClass.ECONOMY


class PolicyEvaluationResponse(BaseModel):
    is_compliant: bool
    requires_approval: bool
    violations: List[str]
    allowed_auto_rebooking: bool
    policy_id: str
    policy_name: str
