from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class LocationBase(BaseModel):
    name: str = Field(..., example="Central Metro Station")
    latitude: float = Field(..., ge=-90.0, le=90.0, example=28.6139)
    longitude: float = Field(..., ge=-180.0, le=180.0, example=77.2090)
    address: Optional[str] = Field(None, example="Connaught Place, New Delhi")
    city: Optional[str] = Field(None, example="New Delhi")
    category: str = Field("TRANSIT_HUB", example="TRANSIT_HUB")


class LocationCreate(LocationBase):
    pass


class LocationResponse(LocationBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class RouteSegmentBase(BaseModel):
    sequence_order: int
    start_name: str
    start_lat: float
    start_lon: float
    end_name: str
    end_lat: float
    end_lon: float
    mode: str = "TRANSIT"
    provider_name: str = "MockProvider"
    distance_km: float
    duration_minutes: float
    delay_minutes: float = 0.0
    instructions: Optional[str] = None


class RouteSegmentResponse(RouteSegmentBase):
    id: str
    route_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class RoutePlanRequest(BaseModel):
    origin_name: str = Field(..., example="Indira Gandhi International Airport")
    origin_lat: float = Field(..., ge=-90.0, le=90.0, example=28.5562)
    origin_lon: float = Field(..., ge=-180.0, le=180.0, example=77.1000)

    destination_name: str = Field(..., example="New Delhi Railway Station")
    destination_lat: float = Field(..., ge=-90.0, le=90.0, example=28.6430)
    destination_lon: float = Field(..., ge=-180.0, le=180.0, example=77.2195)

    travel_mode: str = Field("MULTI_MODAL", description="MULTI_MODAL, TRANSIT, DRIVING, WALKING")
    preference: str = Field("FASTEST", description="FASTEST, CHEAPEST, ECO_FRIENDLY")

    @field_validator("travel_mode")
    @classmethod
    def validate_mode(cls, v: str) -> str:
        allowed = {"MULTI_MODAL", "TRANSIT", "DRIVING", "WALKING"}
        val = v.upper().strip()
        if val not in allowed:
            raise ValueError(f"travel_mode must be one of {allowed}")
        return val

    @field_validator("preference")
    @classmethod
    def validate_preference(cls, v: str) -> str:
        allowed = {"FASTEST", "CHEAPEST", "ECO_FRIENDLY"}
        val = v.upper().strip()
        if val not in allowed:
            raise ValueError(f"preference must be one of {allowed}")
        return val


class RoutePlanResponse(BaseModel):
    id: str
    title: Optional[str] = None
    origin_name: str
    origin_lat: float
    origin_lon: float
    destination_name: str
    destination_lat: float
    destination_lon: float
    status: str
    travel_mode: str
    preference: str
    total_distance_km: float
    total_duration_minutes: float
    estimated_cost: float
    carbon_emissions_kg: float
    created_at: datetime
    updated_at: datetime
    segments: List[RouteSegmentResponse] = []

    class Config:
        from_attributes = True


class RoutePlanListResponse(BaseModel):
    total: int
    items: List[RoutePlanResponse]


class ProviderStatusResponse(BaseModel):
    provider_name: str
    status: str
    latency_ms: float
    is_mock: bool = True
    capabilities: List[str] = ["multimodal_routing", "traffic_estimation", "carbon_calculation"]


class HealthCheckResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str
    database: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[dict] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail
    timestamp: datetime = Field(default_factory=datetime.utcnow)
