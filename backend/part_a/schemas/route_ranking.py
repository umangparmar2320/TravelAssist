from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from backend.part_a.schemas.route_search import RouteOption
from backend.part_a.schemas.traveler_preference import TravelerPreferenceBase


class TransferImpactFactor(BaseModel):
    count: int = Field(..., description="Number of transfers between journey legs")
    penalty: float = Field(..., description="Penalty deducted for transfers")
    preferred_max_stops: Optional[int] = Field(None, description="Traveler preferred maximum stops if specified")
    exceeds_preferred_stops: bool = Field(False, description="True if transfers exceed traveler preferred stops")


class WaitingTimeImpactFactor(BaseModel):
    total_minutes: float = Field(..., description="Total waiting/layover minutes across connections")
    penalty: float = Field(..., description="Penalty deducted for waiting time")
    preferred_max_waiting_time: Optional[int] = Field(None, description="Traveler preferred max waiting minutes if specified")
    exceeds_max_preferred: bool = Field(False, description="True if waiting time exceeds traveler preference")


class JourneyDurationImpactFactor(BaseModel):
    total_minutes: float = Field(..., description="Total journey duration in minutes")
    formatted_duration: str = Field(..., description="Human-readable duration (e.g. 4h 30m)")
    penalty: float = Field(..., description="Penalty deducted for total travel time")


class ReliabilityImpactFactor(BaseModel):
    available: bool = Field(..., description="True if genuine provider reliability metrics were reported; False if missing")
    score: Optional[float] = Field(None, description="Average on-time performance/reliability (0.0 - 1.0) when available")
    impact: float = Field(0.0, description="Adjustment to comfort score (-5.0 to +5.0) when available")
    segment_count_with_data: int = Field(0, description="Number of segments with verified provider reliability")
    explanation: str = Field(..., description="Explanation of reliability data presence or absence without inventing data")


class TravelerPreferenceImpactFactor(BaseModel):
    applied: bool = Field(False, description="True if traveler preferences were applied to ranking")
    preferred_modes: List[str] = Field(default_factory=list, description="Traveler preferred transport modes")
    mode_match_ratio: float = Field(1.0, description="Proportion of segments matching preferred transport modes")
    mode_bonus: float = Field(0.0, description="Comfort adjustment based on mode match")
    airline_match: bool = Field(False, description="True if any flight segment matches preferred airline")
    cabin_class: str = Field("ECONOMY", description="Traveler cabin class")
    cabin_class_bonus: float = Field(0.0, description="Comfort bonus for premium cabin classes")


class ComfortFactors(BaseModel):
    comfort_score: float = Field(..., ge=0.0, le=100.0, description="Composite deterministic comfort score (0 - 100)")
    transfer_count: int
    transfers: TransferImpactFactor
    waiting_time: WaitingTimeImpactFactor
    journey_duration: JourneyDurationImpactFactor
    reliability: ReliabilityImpactFactor
    traveler_preferences: TravelerPreferenceImpactFactor
    summary: str = Field(..., description="Human-readable rationale for the comfort score")

    model_config = ConfigDict(extra="ignore")


class CheapestFactors(BaseModel):
    total_price: float = Field(..., description="Lowest valid total price")
    currency: str = Field("USD", description="Currency code")
    duration_minutes: float = Field(..., description="Total journey duration in minutes")
    transfer_count: int = Field(..., description="Number of transfers")
    price_difference_vs_fastest: Optional[float] = Field(None, description="Savings vs fastest option")
    price_difference_vs_average: Optional[float] = Field(None, description="Savings vs candidate average")
    savings_percentage_vs_average: Optional[float] = Field(None, description="Percentage savings vs candidate average")
    summary: str = Field(..., description="Human-readable rationale for cheapest recommendation")

    model_config = ConfigDict(extra="ignore")


class FastestFactors(BaseModel):
    total_duration_minutes: float = Field(..., description="Shortest valid total duration in minutes")
    formatted_duration: str = Field(..., description="Human-readable duration (e.g. 2h 15m)")
    waiting_time_minutes: float = Field(..., description="Total waiting time in minutes")
    transfer_count: int = Field(..., description="Number of transfers")
    total_price: float = Field(..., description="Total fare for the fastest option")
    time_saved_vs_cheapest_minutes: Optional[float] = Field(None, description="Minutes saved vs cheapest option")
    time_saved_vs_average_minutes: Optional[float] = Field(None, description="Minutes saved vs candidate average")
    summary: str = Field(..., description="Human-readable rationale for fastest recommendation")

    model_config = ConfigDict(extra="ignore")


class RankedRecommendation(BaseModel):
    category: str = Field(..., description="CHEAPEST, FASTEST, or MOST_COMFORTABLE")
    rank: int = Field(1, description="Ranking position (1 is best recommendation)")
    score: float = Field(..., description="Primary ranking metric (price, duration, or comfort score)")
    route: RouteOption = Field(..., description="Selected route option")
    factors: Dict[str, Any] = Field(..., description="Comprehensive breakdown of recommendation factors")

    model_config = ConfigDict(extra="ignore")


class RouteRankingRequest(BaseModel):
    routes: List[RouteOption] = Field(..., min_length=1, description="List of candidate routes to rank")
    user_id: Optional[str] = Field(None, description="Optional user ID to retrieve stored traveler preferences")
    traveler_preferences: Optional[TravelerPreferenceBase] = Field(
        None, description="Explicit traveler preferences override"
    )

    model_config = ConfigDict(extra="ignore")


class RouteRankingResponse(BaseModel):
    cheapest: Optional[RankedRecommendation] = Field(
        None, description="Route with the lowest valid total price"
    )
    fastest: Optional[RankedRecommendation] = Field(
        None, description="Route with the shortest valid total duration"
    )
    most_comfortable: Optional[RankedRecommendation] = Field(
        None, description="Route with the highest deterministic comfort score"
    )
    all_routes: List[RouteOption] = Field(
        default_factory=list, description="All evaluated candidate routes"
    )

    model_config = ConfigDict(extra="ignore")
