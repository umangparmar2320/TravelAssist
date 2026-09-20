from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.part_a.services.route_service import RoutePlanningService
from backend.part_a.services.route_search_service import (
    RealTimeRouteSearchService,
    InvalidLocationError,
)
from backend.part_a.schemas.route import (
    RoutePlanRequest,
    RoutePlanResponse,
    RoutePlanListResponse,
    LocationCreate,
    LocationResponse,
    ProviderStatusResponse,
)
from backend.part_a.schemas.route_search import RouteSearchResponse, RouteSearchSegment
from backend.part_a.schemas.multi_modal import (
    MultiModalRouteGenerateRequest,
    MultiModalRouteGenerateResponse,
    ConnectionValidationResult,
)
from backend.part_a.services.multi_modal_generator import MultiModalRouteGenerator
from backend.part_a.schemas.route_ranking import (
    RouteRankingRequest,
    RouteRankingResponse,
)
from backend.part_a.services.route_ranking_service import RouteRankingService
from backend.part_a.repositories.traveler_preference_repository import TravelerPreferenceRepository
from backend.part_a.schemas.traveler_preference import TravelerPreferenceBase

router = APIRouter(prefix="/routes", tags=["Part A - Route Planning Foundation"])


def get_route_service(db: Session = Depends(get_db)) -> RoutePlanningService:
    return RoutePlanningService(db)


def get_route_search_service() -> RealTimeRouteSearchService:
    return RealTimeRouteSearchService()


def get_multi_modal_generator() -> MultiModalRouteGenerator:
    return MultiModalRouteGenerator()


def get_route_ranking_service() -> RouteRankingService:
    return RouteRankingService()


@router.post(
    "/plan",
    response_model=RoutePlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Plan a new multi-modal route",
    description="Calculates optimal route segments, estimates travel times, cost, and carbon emissions.",
)
def plan_route(
    payload: RoutePlanRequest,
    service: RoutePlanningService = Depends(get_route_service),
):
    try:
        route_plan = service.plan_route(payload)
        return route_plan
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route planning computation failed: {str(exc)}",
        )


@router.get(
    "",
    response_model=RoutePlanListResponse,
    summary="List route plans",
    description="Retrieve paginated list of computed route plans.",
)
def list_routes(
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    service: RoutePlanningService = Depends(get_route_service),
):
    items = service.list_routes(skip=skip, limit=limit)
    total = service.count_routes()
    return RoutePlanListResponse(total=total, items=items)


@router.get(
    "/search",
    response_model=RouteSearchResponse,
    summary="Real-time multi-modal route search",
    description=(
        "Executes end-to-end multi-modal route discovery across real travel providers "
        "(flights, rail, road/rideshare) for a specified origin, destination, and travel date."
    ),
)
def search_routes(
    source: str = Query(..., description="Origin location (city, airport code, or address)"),
    destination: str = Query(..., description="Destination location (city, airport code, or address)"),
    travel_date: Optional[str] = Query(None, description="Date of travel (YYYY-MM-DD)"),
    passengers: int = Query(1, ge=1, le=9, description="Number of passengers"),
    cabin_class: str = Query("ECONOMY", description="Cabin class: ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST"),
    transport_modes: Optional[List[str]] = Query(None, description="Modes to include: FLIGHT, TRAIN, VEHICLE"),
    service: RealTimeRouteSearchService = Depends(get_route_search_service),
):
    try:
        return service.search_routes(
            source=source,
            destination=destination,
            travel_date=travel_date,
            passengers=passengers,
            cabin_class=cabin_class,
            transport_modes=transport_modes,
        )
    except InvalidLocationError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route search computation error: {str(exc)}",
        )


@router.post(
    "/generate",
    response_model=MultiModalRouteGenerateResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate multi-modal journeys across transport modes",
    description=(
        "Combines available real transport options (CAB, TRAIN, FLIGHT, BUS) across sequential transit waypoints "
        "into valid journeys, validating connections, calculating duration, price, waiting time, and "
        "transfer counts with overnight and timezone handling."
    ),
)
def generate_multi_modal_routes(
    payload: MultiModalRouteGenerateRequest,
    generator: MultiModalRouteGenerator = Depends(get_multi_modal_generator),
):
    try:
        return generator.generate_multi_modal_itinerary(
            waypoints=payload.waypoints,
            travel_date=payload.travel_date,
            passengers=payload.passengers,
            cabin_class=payload.cabin_class,
            transport_modes=payload.transport_modes,
            preference=payload.preference,
            max_wait_minutes=payload.max_wait_minutes or 1440.0,
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Multi-modal route generation failed: {str(exc)}",
        )


@router.get(
    "/generate",
    response_model=MultiModalRouteGenerateResponse,
    summary="Query multi-modal routes across waypoints",
    description="Combines CAB, TRAIN, FLIGHT, and BUS options across a list of transit waypoints.",
)
def get_multi_modal_routes(
    waypoints: List[str] = Query(..., description="Ordered transit waypoints (e.g. Bhavnagar, Ahmedabad, Mumbai, Kochi, Kerala)"),
    travel_date: Optional[str] = Query(None, description="Date of departure (YYYY-MM-DD)"),
    passengers: int = Query(1, ge=1, le=9),
    cabin_class: str = Query("ECONOMY"),
    transport_modes: Optional[List[str]] = Query(None, description="Allowed modes: CAB, TRAIN, FLIGHT, BUS"),
    preference: str = Query("FASTEST", description="Ranking preference: FASTEST, CHEAPEST, BALANCED, FEWEST_TRANSFERS"),
    max_wait_minutes: float = Query(1440.0, ge=10.0),
    generator: MultiModalRouteGenerator = Depends(get_multi_modal_generator),
):
    try:
        return generator.generate_multi_modal_itinerary(
            waypoints=waypoints,
            travel_date=travel_date,
            passengers=passengers,
            cabin_class=cabin_class,
            transport_modes=transport_modes,
            preference=preference,
            max_wait_minutes=max_wait_minutes,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Multi-modal route query failed: {str(exc)}")


@router.post(
    "/connections/validate",
    response_model=ConnectionValidationResult,
    summary="Validate connection between two consecutive transport segments",
    description="Checks arrival/departure timestamps, mode buffer, layovers, and rejects impossible connections.",
)
def validate_connection(
    prev_segment: RouteSearchSegment,
    next_segment: RouteSearchSegment,
    max_wait_minutes: float = Query(1440.0, ge=10.0),
    generator: MultiModalRouteGenerator = Depends(get_multi_modal_generator),
):
    return generator.validate_connection(prev_segment, next_segment, max_wait_minutes=max_wait_minutes)


@router.post(
    "/rank",
    response_model=RouteRankingResponse,
    status_code=status.HTTP_200_OK,
    summary="Rank routes deterministically by Cheapest, Fastest, and Most Comfortable",
    description=(
        "Evaluates a list of candidate routes and returns three deterministic recommendations: "
        "'cheapest' (lowest valid total price), 'fastest' (shortest valid total duration), and "
        "'most_comfortable' (composite metric using transfer count, waiting time, duration, "
        "verified provider reliability when available, and traveler preferences). "
        "Includes full 'all_routes' and comprehensive factors behind each recommendation."
    ),
)
def rank_routes(
    payload: RouteRankingRequest,
    db: Session = Depends(get_db),
    ranking_service: RouteRankingService = Depends(get_route_ranking_service),
):
    try:
        pref = payload.traveler_preferences
        if not pref and payload.user_id:
            pref_repo = TravelerPreferenceRepository(db)
            user_pref = pref_repo.get_by_user_id(payload.user_id)
            if user_pref:
                pref = TravelerPreferenceBase.model_validate(user_pref)

        return ranking_service.rank_routes(payload.routes, preferences=pref)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route ranking evaluation failed: {str(exc)}",
        )


@router.get(
    "/providers/status",
    response_model=ProviderStatusResponse,
    summary="Check route provider connectivity",
    description="Returns health status, latency, and capabilities of the active route engine provider.",
)
def get_provider_status(
    service: RoutePlanningService = Depends(get_route_service),
):
    raw_status = service.get_provider_status()
    return ProviderStatusResponse(
        provider_name=raw_status["provider_name"],
        status=raw_status["status"],
        latency_ms=raw_status["latency_ms"],
        is_mock=raw_status.get("is_mock", True),
        capabilities=raw_status.get("features", []),
    )


@router.get(
    "/events/catalog",
    summary="Part A Event Catalog",
    description="Returns the events produced by Part A for consumption by other parts (e.g. Part B, C, D).",
)
def get_event_catalog():
    return {
        "producer": "Part_A_RoutePlanning",
        "events": [
            {
                "event_type": "ROUTE_REQUESTED",
                "description": "Triggered when a route calculation is received.",
                "payload_schema": "RoutePlanRequest",
            },
            {
                "event_type": "ROUTE_CALCULATED",
                "description": "Triggered when route segments, distance, and duration have been computed.",
                "payload_schema": "RoutePlanResponse",
            },
            {
                "event_type": "ROUTE_PERSISTED",
                "description": "Triggered when route plan and segments are stored in the database.",
                "payload_schema": "RoutePlanResponse.id",
            },
            {
                "event_type": "TRAFFIC_DELAY_DETECTED",
                "description": "Triggered when real-time segment delay is observed.",
                "payload_schema": "{ route_id, segment_id, delay_minutes }",
            },
        ],
    }


@router.get(
    "/{route_id}",
    response_model=RoutePlanResponse,
    summary="Get route plan by ID",
    description="Retrieve route details and sequence of multi-modal segments.",
)
def get_route_by_id(
    route_id: str,
    service: RoutePlanningService = Depends(get_route_service),
):
    route = service.get_route(route_id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Route plan with ID '{route_id}' was not found.",
        )
    return route


@router.post(
    "/locations",
    response_model=LocationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a transit location",
    description="Add a landmark or transit hub to the location repository.",
)
def create_location(
    location_in: LocationCreate,
    service: RoutePlanningService = Depends(get_route_service),
):
    return service.create_location(location_in)


@router.get(
    "/locations/search",
    response_model=List[LocationResponse],
    summary="Search transit locations",
    description="Search registered stations and transit hubs by name or city.",
)
def search_locations(
    q: str = Query(..., min_length=1, description="Search term"),
    service: RoutePlanningService = Depends(get_route_service),
):
    return service.search_locations(q)
