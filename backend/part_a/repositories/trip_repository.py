from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from backend.part_a.models.trip import Trip, JourneySegment
from backend.part_a.repositories.base import BaseRepository


class TripRepository(BaseRepository[Trip]):
    def __init__(self, db: Session):
        super().__init__(Trip, db)

    def get_with_segments(self, trip_id: str) -> Optional[Trip]:
        return (
            self.db.query(Trip)
            .options(
                joinedload(Trip.segments).joinedload(JourneySegment.booking),
                joinedload(Trip.segments).joinedload(JourneySegment.flight),
                joinedload(Trip.segments).joinedload(JourneySegment.train),
                joinedload(Trip.segments).joinedload(JourneySegment.vehicle),
            )
            .filter(Trip.id == trip_id)
            .first()
        )

    def list_trips(
        self,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Trip]:
        query = self.db.query(Trip)
        if user_id:
            query = query.filter(Trip.user_id == user_id)
        if status:
            query = query.filter(Trip.status == status.upper())
        return query.order_by(Trip.created_at.desc()).offset(skip).limit(limit).all()

    def count_trips(
        self,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> int:
        query = self.db.query(Trip)
        if user_id:
            query = query.filter(Trip.user_id == user_id)
        if status:
            query = query.filter(Trip.status == status.upper())
        return query.count()
