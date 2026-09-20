from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class RouteSearchSegment(BaseModel):
    """Detailed segment within a resolved route option."""
    id: str = Field(..., description="Unique segment identifier")
    sequence_order: int = Field(1, ge=1, description="1-indexed sequence position in the journey")
    mode: str = Field(..., description="CAB, TRAIN, FLIGHT, BUS, VEHICLE, TRANSIT")
    provider: str = Field(..., description="Operating carrier or provider API")
    price: float = Field(..., ge=0.0, description="Segment price per passenger or vehicle")
    currency: str = Field("USD", description="Currency code")
    departure: str = Field(..., description="ISO 8601 departure datetime")
    arrival: str = Field(..., description="ISO 8601 arrival datetime")
    duration: float = Field(..., ge=0.0, description="Segment duration in minutes")
    origin: str = Field(..., description="Origin name, terminal, or address")
    destination: str = Field(..., description="Destination name, terminal, or address")
    identifier: Optional[str] = Field(None, description="Flight number, train number, or vehicle model")
    last_updated: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    details: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(extra="ignore")


class RouteOption(BaseModel):
    """Normalized end-to-end multi-modal or single-mode journey route."""
    id: str = Field(..., description="Unique route option identifier")
    title: str = Field(..., description="Human readable route summary")
    total_price: float = Field(..., ge=0.0, description="Total route price for all passengers")
    currency: str = Field("USD", description="ISO 4217 Currency Code")
    total_duration: float = Field(..., ge=0.0, description="Total elapsed duration in minutes")
    waiting_time: float = Field(0.0, ge=0.0, description="Total connection/transfer layover waiting time in minutes")
    transfer_count: int = Field(0, ge=0, description="Number of transfers between segments")
    departure: str = Field(..., description="ISO 8601 departure timestamp")
    arrival: str = Field(..., description="ISO 8601 arrival timestamp")
    segments: List[RouteSearchSegment] = Field(..., description="Ordered list of journey segments")
    provider: str = Field(..., description="Aggregated operating providers")
    last_updated: str = Field(..., description="Most recent provider update timestamp")
    status: str = Field("AVAILABLE", description="AVAILABLE, SOLD_OUT, or SCHEDULE_CHANGED")

    model_config = ConfigDict(extra="ignore")


class RouteSearchResponse(BaseModel):
    """Response payload for GET /routes/search."""
    source: str
    destination: str
    travel_date: str
    passengers: int
    cabin_class: str
    total_routes: int
    routes: List[RouteOption]

    model_config = ConfigDict(extra="ignore")
