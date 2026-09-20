from typing import Optional
from sqlalchemy.orm import Session
from backend.part_a.models.traveler_preference import TravelerPreference
from backend.part_a.repositories.base import BaseRepository


class TravelerPreferenceRepository(BaseRepository[TravelerPreference]):
    def __init__(self, db: Session):
        super().__init__(TravelerPreference, db)

    def get_by_user_id(self, user_id: str) -> Optional[TravelerPreference]:
        return (
            self.db.query(TravelerPreference)
            .filter(TravelerPreference.user_id == user_id)
            .first()
        )
