from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.part_a.api.deps import get_current_user
from backend.part_a.models.user import User
from backend.part_a.schemas.traveler_preference import (
    TravelerPreferenceCreate,
    TravelerPreferenceUpdate,
    TravelerPreferenceResponse,
)
from backend.part_a.services.traveler_preference_service import TravelerPreferenceService

router = APIRouter(prefix="/preferences", tags=["Traveler Preferences"])


@router.get(
    "/me",
    response_model=TravelerPreferenceResponse,
    summary="Get My Traveler Preferences",
    description="Retrieves the current authenticated user's travel preferences (cabin class, preferred airlines, max stops, max waiting time).",
)
def get_my_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TravelerPreferenceService(db)
    pref = service.get_by_user_id(current_user.id)
    return TravelerPreferenceResponse.model_validate(pref)


@router.put(
    "/me",
    response_model=TravelerPreferenceResponse,
    summary="Update My Traveler Preferences",
    description="Updates or sets preferences for the current authenticated user.",
)
def update_my_preferences(
    pref_update: TravelerPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TravelerPreferenceService(db)
    updated = service.update_preferences(current_user.id, pref_update)
    return TravelerPreferenceResponse.model_validate(updated)


@router.get(
    "/user/{user_id}",
    response_model=TravelerPreferenceResponse,
    summary="Get Preferences by User ID",
    description="Retrieves the travel preferences for a specified user UUID.",
)
def get_user_preferences(
    user_id: str,
    db: Session = Depends(get_db),
):
    service = TravelerPreferenceService(db)
    pref = service.get_by_user_id(user_id)
    return TravelerPreferenceResponse.model_validate(pref)


@router.put(
    "/user/{user_id}",
    response_model=TravelerPreferenceResponse,
    summary="Set Preferences for User ID",
    description="Creates or replaces preferences for a specified user UUID.",
)
def set_user_preferences(
    user_id: str,
    pref_in: TravelerPreferenceCreate,
    db: Session = Depends(get_db),
):
    service = TravelerPreferenceService(db)
    updated = service.set_preferences(user_id, pref_in)
    return TravelerPreferenceResponse.model_validate(updated)
