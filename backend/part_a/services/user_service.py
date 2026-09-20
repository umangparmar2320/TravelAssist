from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.core.security import hash_password, verify_password
from backend.part_a.models.user import User
from backend.part_a.models.traveler_preference import TravelerPreference
from backend.part_a.repositories.user_repository import UserRepository
from backend.part_a.repositories.traveler_preference_repository import TravelerPreferenceRepository
from backend.part_a.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.pref_repo = TravelerPreferenceRepository(db)

    def register_user(self, user_in: UserCreate) -> User:
        # Check if email already exists
        normalized_email = user_in.email.lower().strip()
        existing = self.user_repo.get_by_email(normalized_email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User with email '{user_in.email}' already exists.",
            )

        # Hash password
        hashed_pwd = hash_password(user_in.password)

        new_user = User(
            email=normalized_email,
            hashed_password=hashed_pwd,
            full_name=user_in.full_name,
            role=user_in.role.value,
            company_id=user_in.company_id,
            department=user_in.department,
            phone_number=user_in.phone_number,
            is_active=True,
        )
        created_user = self.user_repo.create(new_user)

        # Automatically bootstrap default TravelerPreference
        default_pref = TravelerPreference(
            user_id=created_user.id,
            cabin_class="ECONOMY",
            preferred_airlines=[],
            preferred_transport_modes=["FLIGHT", "TRAIN", "METRO"],
            max_waiting_time_minutes=120,
            max_stops=1,
            seat_preference="AISLE",
        )
        self.pref_repo.create(default_pref)

        return created_user

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        normalized_email = email.lower().strip()
        user = self.user_repo.get_by_email(normalized_email)
        if not user or not user.is_active:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def get_user_by_id(self, user_id: str) -> User:
        user = self.user_repo.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID '{user_id}' not found.",
            )
        return user

    def get_user_by_email(self, email: str) -> Optional[User]:
        return self.user_repo.get_by_email(email.lower().strip())

    def list_users(
        self, company_id: Optional[str] = None, skip: int = 0, limit: int = 100
    ) -> List[User]:
        if company_id:
            return self.user_repo.get_by_company(company_id, skip=skip, limit=limit)
        return self.user_repo.get_all(skip=skip, limit=limit)

    def update_user(self, user_id: str, user_update: UserUpdate) -> User:
        user = self.get_user_by_id(user_id)

        if user_update.full_name is not None:
            user.full_name = user_update.full_name
        if user_update.role is not None:
            user.role = user_update.role.value
        if user_update.company_id is not None:
            user.company_id = user_update.company_id
        if user_update.department is not None:
            user.department = user_update.department
        if user_update.phone_number is not None:
            user.phone_number = user_update.phone_number
        if user_update.is_active is not None:
            user.is_active = user_update.is_active
        if user_update.password is not None:
            user.hashed_password = hash_password(user_update.password)

        return self.user_repo.update(user)

    def delete_user(self, user_id: str) -> bool:
        self.get_user_by_id(user_id)  # verify existence
        return self.user_repo.delete(user_id)
