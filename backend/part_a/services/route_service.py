from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.part_a.models.route import RoutePlan, RouteSegment, Location
from backend.part_a.repositories.route_repository import RouteRepository, LocationRepository
from backend.part_a.providers.base import BaseRouteProvider
from backend.part_a.providers.mock_provider import MockRouteProvider
from backend.part_a.schemas.route import RoutePlanRequest, LocationCreate
from backend.part_a.utils.logger import logger
from backend.part_a.utils.geo import validate_coordinates


class RoutePlanningService:
    """Service layer orchestrating business logic for multi-modal travel planning in Part A."""

    def __init__(self, db: Session, provider: Optional[BaseRouteProvider] = None):
        self.db = db
        self.route_repo = RouteRepository(db)
        self.location_repo = LocationRepository(db)
        self.provider = provider or MockRouteProvider()

    def plan_route(self, req: RoutePlanRequest) -> RoutePlan:
        """Plans a multi-modal journey, validates spatial boundaries, persists, and returns RoutePlan."""
        logger.info(
            f"Event: ROUTE_REQUESTED | From: '{req.origin_name}' ({req.origin_lat},{req.origin_lon}) "
            f"To: '{req.destination_name}' ({req.destination_lat},{req.destination_lon}) Mode: {req.travel_mode}"
        )

        if not validate_coordinates(req.origin_lat, req.origin_lon):
            raise ValueError(f"Invalid origin coordinates ({req.origin_lat}, {req.origin_lon})")
        if not validate_coordinates(req.destination_lat, req.destination_lon):
            raise ValueError(f"Invalid destination coordinates ({req.destination_lat}, {req.destination_lon})")

        # Compute route via routing provider
        plan_data = self.provider.calculate_route(
            origin_lat=req.origin_lat,
            origin_lon=req.origin_lon,
            origin_name=req.origin_name,
            dest_lat=req.destination_lat,
            dest_lon=req.destination_lon,
            dest_name=req.destination_name,
            travel_mode=req.travel_mode,
            preference=req.preference,
        )

        logger.info(
            f"Event: ROUTE_CALCULATED | Distance: {plan_data['total_distance_km']}km, "
            f"Duration: {plan_data['total_duration_minutes']}min, Segments: {len(plan_data['segments'])}"
        )

        # Create RoutePlan entity
        route_plan = RoutePlan(
            title=plan_data.get("title", f"Trip to {req.destination_name}"),
            origin_name=plan_data["origin_name"],
            origin_lat=plan_data["origin_lat"],
            origin_lon=plan_data["origin_lon"],
            destination_name=plan_data["destination_name"],
            destination_lat=plan_data["destination_lat"],
            destination_lon=plan_data["destination_lon"],
            status=plan_data["status"],
            travel_mode=plan_data["travel_mode"],
            preference=plan_data["preference"],
            total_distance_km=plan_data["total_distance_km"],
            total_duration_minutes=plan_data["total_duration_minutes"],
            estimated_cost=plan_data["estimated_cost"],
            carbon_emissions_kg=plan_data["carbon_emissions_kg"],
        )

        saved_plan = self.route_repo.create(route_plan)

        # Create Segment entities
        for seg_data in plan_data["segments"]:
            segment = RouteSegment(
                route_id=saved_plan.id,
                sequence_order=seg_data["sequence_order"],
                start_name=seg_data["start_name"],
                start_lat=seg_data["start_lat"],
                start_lon=seg_data["start_lon"],
                end_name=seg_data["end_name"],
                end_lat=seg_data["end_lat"],
                end_lon=seg_data["end_lon"],
                mode=seg_data["mode"],
                provider_name=seg_data["provider_name"],
                distance_km=seg_data["distance_km"],
                duration_minutes=seg_data["duration_minutes"],
                delay_minutes=seg_data.get("delay_minutes", 0.0),
                instructions=seg_data.get("instructions"),
            )
            self.route_repo.add_segment(segment)

        logger.info(f"Event: ROUTE_PERSISTED | Plan ID: {saved_plan.id}")
        return self.route_repo.get_with_segments(saved_plan.id)

    def get_route(self, route_id: str) -> Optional[RoutePlan]:
        return self.route_repo.get_with_segments(route_id)

    def list_routes(self, skip: int = 0, limit: int = 50) -> List[RoutePlan]:
        return self.route_repo.list_routes(skip=skip, limit=limit)

    def count_routes(self) -> int:
        return self.route_repo.count_routes()

    def get_provider_status(self) -> Dict[str, Any]:
        return self.provider.health_check()

    def create_location(self, loc_in: LocationCreate) -> Location:
        location = Location(
            name=loc_in.name,
            latitude=loc_in.latitude,
            longitude=loc_in.longitude,
            address=loc_in.address,
            city=loc_in.city,
            category=loc_in.category,
        )
        return self.location_repo.create(location)

    def search_locations(self, query: str) -> List[Location]:
        return self.location_repo.search_by_name_or_city(query)
