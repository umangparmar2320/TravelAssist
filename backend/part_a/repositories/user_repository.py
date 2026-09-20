from typing import Optional, List
from sqlalchemy.orm import Session
from backend.part_a.models.user import User
from backend.part_a.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email.lower().strip()).first()

    def get_by_company(self, company_id: str, skip: int = 0, limit: int = 100) -> List[User]:
        return (
            self.db.query(User)
            .filter(User.company_id == company_id)
            .offset(skip)
            .limit(limit)
            .all()
        )
