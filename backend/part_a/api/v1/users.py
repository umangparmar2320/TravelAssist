from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.part_a.api.deps import get_current_user
from backend.part_a.models.user import User
from backend.part_a.schemas.user import UserCreate, UserUpdate, UserResponse
from backend.part_a.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users Foundation"])


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a User",
    description="Creates a new user record with credentials and defaults.",
)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    service = UserService(db)
    user = service.register_user(user_in)
    return UserResponse.model_validate(user)


@router.get(
    "",
    response_model=List[UserResponse],
    summary="List Users",
    description="Returns a paginated list of users with optional filtering by company ID.",
)
def list_users(
    company_id: Optional[str] = Query(None, description="Filter by company/organization ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    users = service.list_users(company_id=company_id, skip=skip, limit=limit)
    return [UserResponse.model_validate(u) for u in users]


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get User by ID",
    description="Fetches full details of a specific user by their UUID primary key.",
)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
):
    service = UserService(db)
    user = service.get_user_by_id(user_id)
    return UserResponse.model_validate(user)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update User",
    description="Updates user attributes such as name, role, department, phone, or password.",
)
def update_user(
    user_id: str,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
):
    service = UserService(db)
    updated = service.update_user(user_id, user_update)
    return UserResponse.model_validate(updated)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete User",
    description="Deletes a user and cascades deletion of traveler preferences.",
)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
):
    service = UserService(db)
    service.delete_user(user_id)
    return None
