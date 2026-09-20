from typing import Optional, List
from sqlalchemy.orm import Session
from backend.part_a.models.travel_policy import TravelPolicy
from backend.part_a.repositories.base import BaseRepository


class TravelPolicyRepository(BaseRepository[TravelPolicy]):
    def __init__(self, db: Session):
        super().__init__(TravelPolicy, db)

    def get_active_by_company(
        self, company_id: Optional[str] = None, skip: int = 0, limit: int = 100
    ) -> List[TravelPolicy]:
        query = self.db.query(TravelPolicy).filter(TravelPolicy.is_active == True)
        if company_id:
            query = query.filter(
                (TravelPolicy.company_id == company_id) | (TravelPolicy.company_id.is_(None))
            )
        return query.offset(skip).limit(limit).all()

    def get_by_name(self, name: str) -> Optional[TravelPolicy]:
        return self.db.query(TravelPolicy).filter(TravelPolicy.name == name).first()
