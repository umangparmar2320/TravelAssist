from typing import List, Optional
from sqlalchemy.orm import Session
from backend.part_a.models.route import RoutePlan, RouteSegment, Location, ProviderHealthRecord
from backend.part_a.repositories.base import BaseRepository


class RouteRepository(BaseRepository[RoutePlan]):
    def __init__(self, db: Session):
        super().__init__(RoutePlan, db)

    def get_with_segments(self, route_id: str) -> Optional[RoutePlan]:
        return self.db.query(RoutePlan).filter(RoutePlan.id == route_id).first()

    def list_routes(self, skip: int = 0, limit: int = 50) -> List[RoutePlan]:
        return (
            self.db.query(RoutePlan)
            .order_by(RoutePlan.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_routes(self) -> int:
        return self.db.query(RoutePlan).count()

    def add_segment(self, segment: RouteSegment) -> RouteSegment:
        self.db.add(segment)
        self.db.commit()
        self.db.refresh(segment)
        return segment


class LocationRepository(BaseRepository[Location]):
    def __init__(self, db: Session):
        super().__init__(Location, db)

    def search_by_name_or_city(self, query: str, limit: int = 20) -> List[Location]:
        pattern = f"%{query}%"
        return (
            self.db.query(Location)
            .filter((Location.name.ilike(pattern)) | (Location.city.ilike(pattern)))
            .limit(limit)
            .all()
        )


class ProviderHealthRepository(BaseRepository[ProviderHealthRecord]):
    def __init__(self, db: Session):
        super().__init__(ProviderHealthRecord, db)

    def get_latest_status(self, provider_name: str) -> Optional[ProviderHealthRecord]:
        return (
            self.db.query(ProviderHealthRecord)
            .filter(ProviderHealthRecord.provider_name == provider_name)
            .order_by(ProviderHealthRecord.checked_at.desc())
            .first()
        )
