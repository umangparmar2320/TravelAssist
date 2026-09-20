from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.part_a.models.traveler_preference import TravelerPreference
from backend.part_a.repositories.traveler_preference_repository import TravelerPreferenceRepository
from backend.part_a.repositories.user_repository import UserRepository
from backend.part_a.schemas.traveler_preference import (
    TravelerPreferenceCreate,
    TravelerPreferenceUpdate,
)


class TravelerPreferenceService:
    def __init__(self, db: Session):
        self.db = db
        self.pref_repo = TravelerPreferenceRepository(db)
        self.user_repo = UserRepository(db)

    def get_by_user_id(self, user_id: str) -> TravelerPreference:
        # Verify user exists
        user = self.user_repo.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID '{user_id}' does not exist.",
            )

        pref = self.pref_repo.get_by_user_id(user_id)
        if not pref:
            # Auto-create if somehow missing
            pref = TravelerPreference(
                user_id=user_id,
                cabin_class="ECONOMY",
                preferred_airlines=[],
                preferred_transport_modes=["FLIGHT", "TRAIN", "METRO"],
                max_waiting_time_minutes=120,
                max_stops=1,
                seat_preference="AISLE",
            )
            pref = self.pref_repo.create(pref)
        return pref

    def set_preferences(
        self, user_id: str, pref_in: TravelerPreferenceCreate
    ) -> TravelerPreference:
        user = self.user_repo.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID '{user_id}' does not exist.",
            )

        pref = self.pref_repo.get_by_user_id(user_id)
        if pref:
            pref.cabin_class = pref_in.cabin_class.value
            pref.preferred_airlines = pref_in.preferred_airlines
            pref.preferred_transport_modes = pref_in.preferred_transport_modes
            pref.max_waiting_time_minutes = pref_in.max_waiting_time_minutes
            pref.max_stops = pref_in.max_stops
            pref.seat_preference = (
                pref_in.seat_preference.value if pref_in.seat_preference else None
            )
            return self.pref_repo.update(pref)
        else:
            new_pref = TravelerPreference(
                user_id=user_id,
                cabin_class=pref_in.cabin_class.value,
                preferred_airlines=pref_in.preferred_airlines,
                preferred_transport_modes=pref_in.preferred_transport_modes,
                max_waiting_time_minutes=pref_in.max_waiting_time_minutes,
                max_stops=pref_in.max_stops,
                seat_preference=(
                    pref_in.seat_preference.value if pref_in.seat_preference else None
                ),
            )
            return self.pref_repo.create(new_pref)

    def update_preferences(
        self, user_id: str, pref_update: TravelerPreferenceUpdate
    ) -> TravelerPreference:
        pref = self.get_by_user_id(user_id)

        if pref_update.cabin_class is not None:
            pref.cabin_class = pref_update.cabin_class.value
        if pref_update.preferred_airlines is not None:
            pref.preferred_airlines = pref_update.preferred_airlines
        if pref_update.preferred_transport_modes is not None:
            pref.preferred_transport_modes = pref_update.preferred_transport_modes
        if pref_update.max_waiting_time_minutes is not None:
            pref.max_waiting_time_minutes = pref_update.max_waiting_time_minutes
        if pref_update.max_stops is not None:
            pref.max_stops = pref_update.max_stops
        if pref_update.seat_preference is not None:
            pref.seat_preference = pref_update.seat_preference.value

        return self.pref_repo.update(pref)
