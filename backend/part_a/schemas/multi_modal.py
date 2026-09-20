from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from backend.part_a.schemas.route_search import RouteSearchSegment, RouteOption


class ConnectionValidationResult(BaseModel):
    """Detailed result of checking a connection between two consecutive journey segments."""
    is_valid: bool = Field(..., description="True if the connection satisfies all physical, temporal, and mode buffer rules")
    transfer_time_minutes: float = Field(..., description="Waiting/layover duration in minutes between arrival of prev and departure of next")
    min_buffer_minutes: float = Field(..., description="Required minimum buffer for the mode pair (e.g. CAB->FLIGHT is 60m)")
    mode_from: str = Field(..., description="Mode of the arriving segment (CAB, TRAIN, FLIGHT, BUS)")
    mode_to: str = Field(..., description="Mode of the departing segment (CAB, TRAIN, FLIGHT, BUS)")
    prev_arrival: str = Field(..., description="ISO 8601 arrival timestamp of previous segment")
    next_departure: str = Field(..., description="ISO 8601 departure timestamp of next segment")
    rejection_reason: Optional[str] = Field(None, description="Human-readable explanation if connection is rejected")
    rejection_code: Optional[str] = Field(None, description="Machine-readable error code if rejected")

    model_config = ConfigDict(extra="ignore")


class MultiModalJourney(RouteOption):
    """Rich multi-modal journey with overnight and timezone audit flags."""
    is_overnight: bool = Field(False, description="True if journey crosses midnight into next calendar day")
    has_timezone_change: bool = Field(False, description="True if journey crosses different UTC timezone offsets")
    modes_used: List[str] = Field(default_factory=list, description="List of unique modes used (e.g. CAB, TRAIN, FLIGHT, BUS)")
    total_distance_km: float = Field(0.0, description="Sum of segment distances in km")


class MultiModalRouteGenerateRequest(BaseModel):
    """Request payload for multi-modal route generation across waypoints or origin/destination."""
    waypoints: List[str] = Field(
        ...,
        min_length=2,
        description="Ordered list of transit waypoints (e.g. ['Bhavnagar', 'Ahmedabad', 'Mumbai', 'Kochi', 'Kerala'])",
        example=["Bhavnagar", "Ahmedabad", "Mumbai", "Kochi", "Kerala"],
    )
    travel_date: Optional[str] = Field(None, description="Starting departure date (YYYY-MM-DD)")
    passengers: int = Field(1, ge=1, le=9, description="Number of traveling passengers")
    cabin_class: str = Field("ECONOMY", description="Cabin class: ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST")
    transport_modes: Optional[List[str]] = Field(
        None,
        description="Allowed transport modes: CAB, TRAIN, FLIGHT, BUS",
    )
    max_wait_minutes: Optional[float] = Field(1440.0, ge=10.0, description="Maximum layover buffer in minutes (default 24h)")
    preference: str = Field("FASTEST", description="Ranking preference: FASTEST, CHEAPEST, BALANCED, FEWEST_TRANSFERS")


class MultiModalRouteGenerateResponse(BaseModel):
    """Response returned by multi-modal route generator."""
    source: str
    destination: str
    waypoints: List[str]
    total_routes: int
    valid_routes: int
    rejected_connections_count: int
    routes: List[RouteOption]
    rejection_summary: Dict[str, int] = Field(default_factory=dict)

    model_config = ConfigDict(extra="ignore")
