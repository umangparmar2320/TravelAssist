from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from backend.part_a.models.trip import (
    JourneySegment,
    TransportBooking,
    Flight,
    Train,
    Vehicle,
)
from backend.part_a.repositories.base import BaseRepository


class SegmentRepository(BaseRepository[JourneySegment]):
    def __init__(self, db: Session):
        super().__init__(JourneySegment, db)

    def get_with_details(self, segment_id: str) -> Optional[JourneySegment]:
        return (
            self.db.query(JourneySegment)
            .options(
                joinedload(JourneySegment.booking),
                joinedload(JourneySegment.flight),
                joinedload(JourneySegment.train),
                joinedload(JourneySegment.vehicle),
            )
            .filter(JourneySegment.id == segment_id)
            .first()
        )

    def get_by_trip(self, trip_id: str) -> List[JourneySegment]:
        return (
            self.db.query(JourneySegment)
            .options(
                joinedload(JourneySegment.booking),
                joinedload(JourneySegment.flight),
                joinedload(JourneySegment.train),
                joinedload(JourneySegment.vehicle),
            )
            .filter(JourneySegment.trip_id == trip_id)
            .order_by(JourneySegment.sequence_order.asc())
            .all()
        )

    def get_max_sequence_order(self, trip_id: str) -> int:
        seg = (
            self.db.query(JourneySegment)
            .filter(JourneySegment.trip_id == trip_id)
            .order_by(JourneySegment.sequence_order.desc())
            .first()
        )
        return seg.sequence_order if seg else 0
