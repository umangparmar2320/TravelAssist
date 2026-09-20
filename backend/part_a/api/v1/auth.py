from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.core.security import create_access_token
from backend.part_a.api.deps import get_current_user
from backend.part_a.models.user import User
from backend.part_a.schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse
from backend.part_a.schemas.traveler_preference import TravelerPreferenceResponse
from backend.part_a.services.user_service import UserService
from backend.part_a.services.traveler_preference_service import TravelerPreferenceService

router = APIRouter(prefix="/auth", tags=["Authentication & Profile"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new User",
    description="Registers a new user, hashes password securely, initializes default traveler preferences, and issues an access token.",
)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    service = UserService(db)
    user = service.register_user(user_in)
    access_token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate User",
    description="Validates email and password, issuing an access bearer token upon success.",
)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    service = UserService(db)
    user = service.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    summary="Current Authenticated User Profile",
    description="Retrieves the currently authenticated user's profile and traveler preferences.",
)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref_service = TravelerPreferenceService(db)
    pref = pref_service.get_by_user_id(current_user.id)
    return {
        "user": UserResponse.model_validate(current_user),
        "preference": TravelerPreferenceResponse.model_validate(pref) if pref else None,
    }
