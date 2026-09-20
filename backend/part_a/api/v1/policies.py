from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.part_a.api.deps import get_optional_current_user
from backend.part_a.models.user import User
from backend.part_a.schemas.travel_policy import (
    TravelPolicyCreate,
    TravelPolicyUpdate,
    TravelPolicyResponse,
    PolicyEvaluationRequest,
    PolicyEvaluationResponse,
)
from backend.part_a.services.travel_policy_service import TravelPolicyService

router = APIRouter(prefix="/policies", tags=["Travel Policy"])


@router.post(
    "",
    response_model=TravelPolicyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Travel Policy",
    description="Creates a corporate travel policy defining maximum additional fare, max stops, preferred/blocked carriers, and auto-rebooking permissions.",
)
def create_policy(
    policy_in: TravelPolicyCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    service = TravelPolicyService(db)
    created_by_id = current_user.id if current_user else None
    policy = service.create_policy(policy_in, created_by_id=created_by_id)
    return TravelPolicyResponse.model_validate(policy)


@router.get(
    "",
    response_model=List[TravelPolicyResponse],
    summary="List Travel Policies",
    description="Retrieves a list of corporate travel policies with filtering by company ID and active state.",
)
def list_policies(
    company_id: Optional[str] = Query(None, description="Filter by company/organization ID"),
    active_only: bool = Query(True, description="Filter only active policies"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    service = TravelPolicyService(db)
    policies = service.list_policies(
        company_id=company_id, active_only=active_only, skip=skip, limit=limit
    )
    return [TravelPolicyResponse.model_validate(p) for p in policies]


@router.get(
    "/{policy_id}",
    response_model=TravelPolicyResponse,
    summary="Get Travel Policy by ID",
    description="Retrieves the detailed specifications of a travel policy by UUID.",
)
def get_policy(
    policy_id: str,
    db: Session = Depends(get_db),
):
    service = TravelPolicyService(db)
    policy = service.get_policy_by_id(policy_id)
    return TravelPolicyResponse.model_validate(policy)


@router.put(
    "/{policy_id}",
    response_model=TravelPolicyResponse,
    summary="Update Travel Policy",
    description="Updates fare limits, stop limits, preferred/blocked carriers, or rebooking rules.",
)
def update_policy(
    policy_id: str,
    policy_update: TravelPolicyUpdate,
    db: Session = Depends(get_db),
):
    service = TravelPolicyService(db)
    updated = service.update_policy(policy_id, policy_update)
    return TravelPolicyResponse.model_validate(updated)


@router.delete(
    "/{policy_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Travel Policy",
    description="Removes a travel policy by ID.",
)
def delete_policy(
    policy_id: str,
    db: Session = Depends(get_db),
):
    service = TravelPolicyService(db)
    service.delete_policy(policy_id)
    return None


@router.post(
    "/{policy_id}/evaluate",
    response_model=PolicyEvaluationResponse,
    summary="Evaluate Route/Fare Compliance",
    description="Evaluates whether a planned journey or segment meets the constraints of this travel policy (fare caps, stops, blocked airlines, cabin class).",
)
def evaluate_compliance(
    policy_id: str,
    evaluation_req: PolicyEvaluationRequest,
    db: Session = Depends(get_db),
):
    service = TravelPolicyService(db)
    return service.evaluate_compliance(policy_id, evaluation_req)
