from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class NormalizedOption(BaseModel):
    """Universal contract for travel options preserving pricing, timing, and availability."""
    id: str = Field(..., description="Unique identifier for the offer/option")
    mode: str = Field(..., description="Transport mode: FLIGHT, TRAIN, VEHICLE, TRANSIT")
    provider: str = Field(..., description="Operating carrier, platform, or API provider")
    price: float = Field(..., ge=0.0, description="Total fare amount")
    currency: str = Field("USD", max_length=10, description="ISO 4217 Currency Code")
    departure: str = Field(..., description="ISO 8601 departure timestamp")
    arrival: str = Field(..., description="ISO 8601 arrival timestamp")
    duration: float = Field(..., ge=0.0, description="Total journey duration in minutes")
    availability: bool = Field(True, description="Availability status (True if seats/rides bookable)")
    seats_available: Optional[int] = Field(None, description="Remaining seats or vehicle capacity")
    origin: str = Field(..., description="Origin name, airport IATA, station, or address")
    destination: str = Field(..., description="Destination name, airport IATA, station, or address")
    last_updated: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="Timestamp of quote/live status")
    details: Dict[str, Any] = Field(default_factory=dict, description="Raw provider metadata and modal specifics")

    model_config = ConfigDict(extra="ignore")


class NormalizedFlightOption(NormalizedOption):
    """Normalized flight offer with aviation-specific attributes."""
    flight_number: str
    airline_code: str
    airline_name: str
    departure_airport: str
    arrival_airport: str
    departure_terminal: Optional[str] = None
    arrival_terminal: Optional[str] = None
    cabin_class: str = "ECONOMY"
    aircraft_type: Optional[str] = None
    stops: int = 0


class NormalizedTrainOption(NormalizedOption):
    """Normalized rail option with railway-specific attributes."""
    train_number: str
    train_name: str
    operator_name: str
    departure_station: str
    arrival_station: str
    departure_platform: Optional[str] = None
    arrival_platform: Optional[str] = None
    travel_class: str = "STANDARD"
    delay_minutes: float = 0.0


class NormalizedGroundOption(NormalizedOption):
    """Normalized ground transport / ride option."""
    vehicle_type: str  # TAXI, RIDEHAIL, RENTAL, SHUTTLE
    provider_name: str
    distance_km: float
    traffic_delay_minutes: float = 0.0
    estimated_pickup_minutes: float = 5.0
    fare_breakdown: Dict[str, float] = Field(default_factory=dict)


class NormalizedLocation(BaseModel):
    """Normalized geocoding / location entity."""
    id: str
    name: str
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    postal_code: Optional[str] = None
    category: str = "LOCATION"
    provider: str
    last_updated: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    model_config = ConfigDict(extra="ignore")


class ProviderHealth(BaseModel):
    """Provider health and latency check."""
    provider_name: str
    category: str  # FLIGHT, TRAIN, GROUND, LOCATION
    status: str    # OPERATIONAL, DEGRADED, OFFLINE
    latency_ms: float
    is_live_api: bool
    api_endpoint: Optional[str] = None
    error_message: Optional[str] = None
    last_checked: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
