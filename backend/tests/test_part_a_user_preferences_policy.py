import uuid
import pytest
from starlette.testclient import TestClient

from backend.main import app
from backend.core.security import hash_password, verify_password, create_access_token, decode_access_token

client = TestClient(app)


def test_password_hashing_and_verification():
    """Verify PBKDF2 secure password hashing and verification."""
    password = "SuperSecurePassword123!"
    hashed = hash_password(password)
    assert hashed != password
    assert hashed.startswith("pbkdf2_sha256$100000$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_token_creation_and_decoding():
    """Verify bearer token creation and cryptographic signature verification."""
    payload = {"sub": "user-uuid-123", "email": "test@example.com", "role": "TRAVELER"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user-uuid-123"
    assert decoded["email"] == "test@example.com"
    assert decoded["role"] == "TRAVELER"

    # Tampered token check
    tampered_token = token + "bad"
    assert decode_access_token(tampered_token) is None


def test_user_registration_and_login():
    """Test user registration, default preference initialization, and authentication."""
    unique_email = f"traveler_{uuid.uuid4().hex[:8]}@example.com"
    reg_payload = {
        "email": unique_email,
        "password": "Password123!",
        "full_name": "Jane Traveler",
        "role": "TRAVELER",
        "company_id": "CORP-GLOBAL",
        "department": "Engineering",
        "phone_number": "+1-555-0199",
    }

    # 1. Register
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == unique_email
    assert data["user"]["full_name"] == "Jane Traveler"
    assert data["user"]["company_id"] == "CORP-GLOBAL"
    user_id = data["user"]["id"]
    token = data["access_token"]

    # 2. Duplicate registration should return 409
    dup_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_res.status_code == 409

    # 3. Login with correct credentials
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "Password123!"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["user"]["id"] == user_id

    # 4. Login with incorrect password
    bad_login = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401

    # 5. Access /auth/me with bearer token
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["user"]["id"] == user_id
    assert me_data["preference"] is not None
    assert me_data["preference"]["cabin_class"] == "ECONOMY"


def test_user_crud_operations():
    """Test full CRUD endpoints on /api/v1/users."""
    email = f"crud_{uuid.uuid4().hex[:8]}@corp.com"
    create_res = client.post(
        "/api/v1/users",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "Marcus Aurelius",
            "role": "TRAVEL_MANAGER",
            "company_id": "ROME-INC",
        },
    )
    assert create_res.status_code == 201
    user = create_res.json()
    user_id = user["id"]
    assert user["role"] == "TRAVEL_MANAGER"

    # Get by ID
    get_res = client.get(f"/api/v1/users/{user_id}")
    assert get_res.status_code == 200
    assert get_res.json()["email"] == email

    # List users with company filter
    list_res = client.get("/api/v1/users", params={"company_id": "ROME-INC"})
    assert list_res.status_code == 200
    assert any(u["id"] == user_id for u in list_res.json())

    # Update user
    update_res = client.put(
        f"/api/v1/users/{user_id}",
        json={"full_name": "Marcus Aurelius Augustus", "department": "Executive"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["full_name"] == "Marcus Aurelius Augustus"
    assert update_res.json()["department"] == "Executive"

    # Delete user
    del_res = client.delete(f"/api/v1/users/{user_id}")
    assert del_res.status_code == 204

    # Verify not found
    get_after_del = client.get(f"/api/v1/users/{user_id}")
    assert get_after_del.status_code == 404


def test_traveler_preference_endpoints():
    """Test TravelerPreference retrieval, updating, and validation."""
    email = f"pref_user_{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "Pref Tester",
        },
    ).json()
    user_id = reg["user"]["id"]
    token = reg["access_token"]

    # 1. Get default preferences via /preferences/me
    get_pref = client.get(
        "/api/v1/preferences/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_pref.status_code == 200
    assert get_pref.json()["cabin_class"] == "ECONOMY"
    assert get_pref.json()["max_stops"] == 1

    # 2. Update preferences
    update_payload = {
        "cabin_class": "BUSINESS",
        "preferred_airlines": ["DL", "UA", "LH"],
        "preferred_transport_modes": ["FLIGHT", "TRAIN"],
        "max_waiting_time_minutes": 90,
        "max_stops": 0,
        "seat_preference": "WINDOW",
    }
    put_pref = client.put(
        "/api/v1/preferences/me",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert put_pref.status_code == 200
    updated_data = put_pref.json()
    assert updated_data["cabin_class"] == "BUSINESS"
    assert updated_data["preferred_airlines"] == ["DL", "UA", "LH"]
    assert updated_data["max_waiting_time_minutes"] == 90
    assert updated_data["max_stops"] == 0
    assert updated_data["seat_preference"] == "WINDOW"

    # 3. Query preferences by user ID
    by_id_res = client.get(f"/api/v1/preferences/user/{user_id}")
    assert by_id_res.status_code == 200
    assert by_id_res.json()["cabin_class"] == "BUSINESS"


def test_travel_policy_crud_and_evaluation():
    """Test TravelPolicy creation, listing, updating, and route compliance evaluation."""
    policy_name = f"Policy_{uuid.uuid4().hex[:6]}"
    policy_payload = {
        "name": policy_name,
        "description": "Enterprise standard traveler policy",
        "company_id": "ACME-CORP",
        "is_active": True,
        "max_additional_fare": 150.0,
        "max_stops": 1,
        "preferred_airlines": ["UA", "DL"],
        "blocked_airlines": ["NK", "F9"],
        "auto_rebooking_allowed": True,
        "approval_required_conditions": ["FARE_EXCEEDS_CAP", "BLOCKED_CARRIER"],
        "max_cabin_class": "ECONOMY",
    }

    # 1. Create policy
    create_res = client.post("/api/v1/policies", json=policy_payload)
    assert create_res.status_code == 201
    policy = create_res.json()
    policy_id = policy["id"]
    assert policy["name"] == policy_name
    assert policy["max_additional_fare"] == 150.0
    assert policy["blocked_airlines"] == ["NK", "F9"]
    assert policy["auto_rebooking_allowed"] is True

    # 2. Get policy by ID
    get_res = client.get(f"/api/v1/policies/{policy_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == policy_id

    # 3. List policies
    list_res = client.get("/api/v1/policies", params={"company_id": "ACME-CORP"})
    assert list_res.status_code == 200
    assert any(p["id"] == policy_id for p in list_res.json())

    # 4. Evaluate compliance: Compliant case
    # Lowest fare = 400, selected fare = 500 (within +150 cap), 1 stop, airline UA (not blocked), ECONOMY
    compliant_res = client.post(
        f"/api/v1/policies/{policy_id}/evaluate",
        json={
            "fare_amount": 500.0,
            "lowest_logical_fare": 400.0,
            "stops": 1,
            "airline_code": "UA",
            "cabin_class": "ECONOMY",
        },
    )
    assert compliant_res.status_code == 200
    eval_data = compliant_res.json()
    assert eval_data["is_compliant"] is True
    assert eval_data["requires_approval"] is False
    assert len(eval_data["violations"]) == 0
    assert eval_data["allowed_auto_rebooking"] is True

    # 5. Evaluate compliance: Non-compliant violations
    # Exceeds cap (700 > 400 + 150), blocked airline NK, cabin BUSINESS > ECONOMY, 2 stops > 1
    violating_res = client.post(
        f"/api/v1/policies/{policy_id}/evaluate",
        json={
            "fare_amount": 700.0,
            "lowest_logical_fare": 400.0,
            "stops": 2,
            "airline_code": "NK",
            "cabin_class": "BUSINESS",
        },
    )
    assert violating_res.status_code == 200
    viol_data = violating_res.json()
    assert viol_data["is_compliant"] is False
    assert viol_data["requires_approval"] is True
    assert len(viol_data["violations"]) == 4
    assert viol_data["allowed_auto_rebooking"] is False

    # 6. Update policy
    update_res = client.put(
        f"/api/v1/policies/{policy_id}",
        json={"max_additional_fare": 200.0, "max_cabin_class": "BUSINESS"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["max_additional_fare"] == 200.0
    assert update_res.json()["max_cabin_class"] == "BUSINESS"

    # 7. Delete policy
    del_res = client.delete(f"/api/v1/policies/{policy_id}")
    assert del_res.status_code == 204


def test_schema_validations():
    """Verify Pydantic validations on models."""
    # 1. Invalid email
    bad_email = client.post(
        "/api/v1/users",
        json={"email": "not-an-email", "password": "Password123!", "full_name": "Test User"},
    )
    assert bad_email.status_code == 422

    # 2. Password too short (< 8 chars)
    short_pw = client.post(
        "/api/v1/users",
        json={"email": "good@email.com", "password": "short", "full_name": "Test User"},
    )
    assert short_pw.status_code == 422

    # 3. Policy: airline cannot be both preferred and blocked
    overlap_policy = client.post(
        "/api/v1/policies",
        json={
            "name": f"Overlap_{uuid.uuid4().hex[:4]}",
            "preferred_airlines": ["DL", "UA"],
            "blocked_airlines": ["UA", "NK"],
        },
    )
    assert overlap_policy.status_code == 422
