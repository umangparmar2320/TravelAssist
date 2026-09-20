from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.part_a.models.travel_policy import TravelPolicy
from backend.part_a.repositories.travel_policy_repository import TravelPolicyRepository
from backend.part_a.schemas.travel_policy import (
    TravelPolicyCreate,
    TravelPolicyUpdate,
    PolicyEvaluationRequest,
    PolicyEvaluationResponse,
)
from backend.part_a.schemas.traveler_preference import CabinClass

# Hierarchy ranking for cabin class comparison
CABIN_RANKS = {
    CabinClass.ECONOMY: 1,
    CabinClass.PREMIUM_ECONOMY: 2,
    CabinClass.BUSINESS: 3,
    CabinClass.FIRST: 4,
}


class TravelPolicyService:
    def __init__(self, db: Session):
        self.db = db
        self.policy_repo = TravelPolicyRepository(db)

    def create_policy(
        self, policy_in: TravelPolicyCreate, created_by_id: Optional[str] = None
    ) -> TravelPolicy:
        existing = self.policy_repo.get_by_name(policy_in.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Travel policy with name '{policy_in.name}' already exists.",
            )

        new_policy = TravelPolicy(
            name=policy_in.name,
            description=policy_in.description,
            company_id=policy_in.company_id,
            is_active=policy_in.is_active,
            max_additional_fare=policy_in.max_additional_fare,
            max_stops=policy_in.max_stops,
            preferred_airlines=policy_in.preferred_airlines,
            blocked_airlines=policy_in.blocked_airlines,
            auto_rebooking_allowed=policy_in.auto_rebooking_allowed,
            approval_required_conditions=policy_in.approval_required_conditions,
            max_cabin_class=policy_in.max_cabin_class.value,
            created_by_id=created_by_id,
        )
        return self.policy_repo.create(new_policy)

    def get_policy_by_id(self, policy_id: str) -> TravelPolicy:
        policy = self.policy_repo.get(policy_id)
        if not policy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Travel policy with ID '{policy_id}' not found.",
            )
        return policy

    def list_policies(
        self,
        company_id: Optional[str] = None,
        active_only: bool = True,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TravelPolicy]:
        if active_only:
            return self.policy_repo.get_active_by_company(
                company_id=company_id, skip=skip, limit=limit
            )
        query = self.db.query(TravelPolicy)
        if company_id:
            query = query.filter(
                (TravelPolicy.company_id == company_id) | (TravelPolicy.company_id.is_(None))
            )
        return query.offset(skip).limit(limit).all()

    def update_policy(self, policy_id: str, policy_update: TravelPolicyUpdate) -> TravelPolicy:
        policy = self.get_policy_by_id(policy_id)

        if policy_update.name is not None:
            policy.name = policy_update.name
        if policy_update.description is not None:
            policy.description = policy_update.description
        if policy_update.company_id is not None:
            policy.company_id = policy_update.company_id
        if policy_update.is_active is not None:
            policy.is_active = policy_update.is_active
        if policy_update.max_additional_fare is not None:
            policy.max_additional_fare = policy_update.max_additional_fare
        if policy_update.max_stops is not None:
            policy.max_stops = policy_update.max_stops
        if policy_update.preferred_airlines is not None:
            policy.preferred_airlines = policy_update.preferred_airlines
        if policy_update.blocked_airlines is not None:
            policy.blocked_airlines = policy_update.blocked_airlines
        if policy_update.auto_rebooking_allowed is not None:
            policy.auto_rebooking_allowed = policy_update.auto_rebooking_allowed
        if policy_update.approval_required_conditions is not None:
            policy.approval_required_conditions = (
                policy_update.approval_required_conditions
            )
        if policy_update.max_cabin_class is not None:
            policy.max_cabin_class = policy_update.max_cabin_class.value

        return self.policy_repo.update(policy)

    def delete_policy(self, policy_id: str) -> bool:
        self.get_policy_by_id(policy_id)  # verify existence
        return self.policy_repo.delete(policy_id)

    def evaluate_compliance(
        self, policy_id: str, request: PolicyEvaluationRequest
    ) -> PolicyEvaluationResponse:
        policy = self.get_policy_by_id(policy_id)
        violations = []

        # 1. Fare cap check
        fare_threshold = request.lowest_logical_fare + policy.max_additional_fare
        if request.fare_amount > fare_threshold:
            violations.append(
                f"Fare ${request.fare_amount:.2f} exceeds cap of ${fare_threshold:.2f} "
                f"(lowest ${request.lowest_logical_fare:.2f} + max deviation ${policy.max_additional_fare:.2f})."
            )

        # 2. Stops check
        if request.stops > policy.max_stops:
            violations.append(
                f"Number of stops ({request.stops}) exceeds allowed maximum ({policy.max_stops})."
            )

        # 3. Blocked airline check
        if request.airline_code:
            norm_code = request.airline_code.upper().strip()
            if norm_code in [code.upper() for code in policy.blocked_airlines]:
                violations.append(f"Airline '{norm_code}' is in corporate blocked carriers list.")

        # 4. Cabin class check
        requested_rank = CABIN_RANKS.get(request.cabin_class, 1)
        allowed_rank = CABIN_RANKS.get(CabinClass(policy.max_cabin_class), 1)
        if requested_rank > allowed_rank:
            violations.append(
                f"Requested cabin '{request.cabin_class.value}' exceeds allowed corporate class '{policy.max_cabin_class}'."
            )

        is_compliant = len(violations) == 0
        requires_approval = not is_compliant

        return PolicyEvaluationResponse(
            is_compliant=is_compliant,
            requires_approval=requires_approval,
            violations=violations,
            allowed_auto_rebooking=policy.auto_rebooking_allowed and is_compliant,
            policy_id=policy.id,
            policy_name=policy.name,
        )
