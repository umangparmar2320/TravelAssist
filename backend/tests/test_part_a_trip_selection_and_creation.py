import uuid
from datetime import datetime, timedelta
import pytest
from starlette.testclient import TestClient
from sqlalchemy.orm import Session

from backend.main import app
from backend.database import get_db, SessionLocal
from backend.part_a.models.user import User
from backend.part_a.models.trip import Trip, JourneySegment, TransportBooking, Flight, Train, Vehicle


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="module")
def sample_user(db: Session):
    user = db.query(User).filter(User.email == "corp_traveler@example.com").first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email="corp_traveler@example.com",
            hashed_password="hashed_secure_password",
            full_name="Corporate Executive",
            role="TRAVELER",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def test_part_a_route_selection_and_trip_creation_full_flow(client: TestClient, sample_user: User, db: Session):
    """
    Validates complete Part A route selection and trip creation:
    1. Create Trip
    2. Create JourneySegments
    3. Save transport information
    4. Save provider information
    5. Save departure and arrival times
    6. Save price information
    7. Preserve the segment order
    8. Return the created trip
    And connects the saved trip with the existing User.
    """
    now = datetime.utcnow()
    t0 = (now + timedelta(days=1)).replace(microsecond=0)
    t1 = t0 + timedelta(minutes=45)
    t2 = t1 + timedelta(minutes=60)
    t3 = t2 + timedelta(hours=2)
    t4 = t3 + timedelta(minutes=45)
    t5 = t4 + timedelta(hours=1, minutes=30)

    # Multi-modal selected route with 3 distinct segments:
    # 1. Cab to Airport (Vehicle)
    # 2. Flight to Destination City (Flight)
    # 3. High-Speed Train to Downtown (Train)
    selected_route = {
        "id": "route-del-bom-executive",
        "title": "Delhi to Mumbai Executive Multi-Modal",
        "total_price": 285.50,
        "currency": "USD",
        "total_duration": 360.0,
        "departure": t0.isoformat(),
        "arrival": t5.isoformat(),
        "segments": [
            {
                "id": "seg-cab-1",
                "sequence_order": 1,
                "mode": "CAB",
                "provider": "Uber Premium",
                "price": 25.50,
                "currency": "USD",
                "departure": t0.isoformat(),
                "arrival": t1.isoformat(),
                "duration": 45.0,
                "origin": "Connaught Place, New Delhi",
                "destination": "Indira Gandhi International Airport, Terminal 3",
                "identifier": "UBER-PREM-101",
                "details": {
                    "vehicle_model": "Toyota Camry Hybrid",
                    "license_plate": "DL-01-AB-1234",
                    "driver_name": "Rajesh Kumar",
                    "driver_phone": "+91-9876543210",
                    "booking_reference": "UBER-BK-991",
                },
            },
            {
                "id": "seg-flt-2",
                "sequence_order": 2,
                "mode": "FLIGHT",
                "provider": "IndiGo Airlines",
                "price": 180.00,
                "currency": "USD",
                "departure": t2.isoformat(),
                "arrival": t3.isoformat(),
                "duration": 120.0,
                "origin": "DEL",
                "destination": "BOM",
                "identifier": "6E-2045",
                "details": {
                    "flight_number": "6E-2045",
                    "airline_code": "6E",
                    "airline_name": "IndiGo Airlines",
                    "departure_airport": "DEL",
                    "arrival_airport": "BOM",
                    "departure_terminal": "T3",
                    "arrival_terminal": "T2",
                    "aircraft_type": "Airbus A321neo",
                    "cabin_class": "ECONOMY",
                    "seat": "4A",
                    "booking_reference": "PNR-IND-7788",
                },
            },
            {
                "id": "seg-trn-3",
                "sequence_order": 3,
                "mode": "TRAIN",
                "provider": "Indian Railways Vande Bharat",
                "price": 80.00,
                "currency": "USD",
                "departure": t4.isoformat(),
                "arrival": t5.isoformat(),
                "duration": 90.0,
                "origin": "Mumbai Central",
                "destination": "Pune Junction",
                "identifier": "VB-22225",
                "details": {
                    "train_number": "22225",
                    "train_name": "Vande Bharat Express",
                    "operator_name": "Indian Railways Vande Bharat",
                    "departure_station": "Mumbai Central",
                    "arrival_station": "Pune Junction",
                    "departure_platform": "Platform 1",
                    "coach_number": "C2",
                    "seat_berth_number": "25",
                    "travel_class": "EXECUTIVE",
                    "booking_reference": "IRCTC-VB-4455",
                },
            },
        ],
    }

    # Step 1: POST /trips with route selection and user link
    payload = {
        "user_id": sample_user.id,
        "selected_route": selected_route,
        "description": "Executive route selection business trip",
    }

    response = client.post("/trips", json=payload)
    assert response.status_code == 201, f"Expected 201 Created, got {response.status_code}: {response.text}"
    trip_data = response.json()

    # 1. Verify Trip creation & User connection
    trip_id = trip_data["id"]
    assert trip_id is not None
    assert trip_data["user_id"] == sample_user.id
    assert trip_data["title"] == "Delhi to Mumbai Executive Multi-Modal"
    assert trip_data["origin"] == "Connaught Place, New Delhi"
    assert trip_data["destination"] == "Pune Junction"

    # 6. Verify Price information on Trip
    assert trip_data["total_cost"] == 285.50
    assert trip_data["currency"] == "USD"

    # 2. Verify JourneySegments creation
    segments = trip_data["segments"]
    assert len(segments) == 3

    # 7. Verify segment order preservation (1, 2, 3)
    orders = [s["sequence_order"] for s in segments]
    assert orders == [1, 2, 3]

    # Verify Segment 1 (CAB)
    seg1 = segments[0]
    assert seg1["sequence_order"] == 1
    assert seg1["mode"] == "CAB"
    assert seg1["origin_location"] == "Connaught Place, New Delhi"
    assert seg1["destination_location"] == "Indira Gandhi International Airport, Terminal 3"
    # 5. Departure and arrival times
    assert seg1["departure_time"] == t0.isoformat()
    assert seg1["arrival_time"] == t1.isoformat()
    # 6. Price information
    assert seg1["estimated_cost"] == 25.50
    # 4. Provider information
    assert seg1["provider"] == "Uber Premium"
    # 3. Transport information
    assert seg1["vehicle"] is not None
    assert seg1["vehicle"]["vehicle_type"] == "CAB"
    assert seg1["vehicle"]["provider_name"] == "Uber Premium"
    assert seg1["vehicle"]["vehicle_model"] == "Toyota Camry Hybrid"
    assert seg1["vehicle"]["license_plate"] == "DL-01-AB-1234"
    assert seg1["vehicle"]["driver_name"] == "Rajesh Kumar"
    assert seg1["booking"] is not None
    assert seg1["booking"]["booking_reference"] == "UBER-BK-991"
    assert seg1["booking"]["fare_amount"] == 25.50

    # Verify Segment 2 (FLIGHT)
    seg2 = segments[1]
    assert seg2["sequence_order"] == 2
    assert seg2["mode"] == "FLIGHT"
    assert seg2["origin_location"] == "DEL"
    assert seg2["destination_location"] == "BOM"
    assert seg2["departure_time"] == t2.isoformat()
    assert seg2["arrival_time"] == t3.isoformat()
    assert seg2["estimated_cost"] == 180.00
    assert seg2["provider"] == "IndiGo Airlines"
    # 3. Transport information
    assert seg2["flight"] is not None
    assert seg2["flight"]["flight_number"] == "6E-2045"
    assert seg2["flight"]["airline_code"] == "6E"
    assert seg2["flight"]["airline_name"] == "IndiGo Airlines"
    assert seg2["flight"]["departure_airport"] == "DEL"
    assert seg2["flight"]["arrival_airport"] == "BOM"
    assert seg2["flight"]["aircraft_type"] == "Airbus A321neo"
    assert seg2["flight"]["seat"] == "4A"
    assert seg2["booking"] is not None
    assert seg2["booking"]["booking_reference"] == "PNR-IND-7788"
    assert seg2["booking"]["fare_amount"] == 180.00

    # Verify Segment 3 (TRAIN)
    seg3 = segments[2]
    assert seg3["sequence_order"] == 3
    assert seg3["mode"] == "TRAIN"
    assert seg3["origin_location"] == "Mumbai Central"
    assert seg3["destination_location"] == "Pune Junction"
    assert seg3["departure_time"] == t4.isoformat()
    assert seg3["arrival_time"] == t5.isoformat()
    assert seg3["estimated_cost"] == 80.00
    assert seg3["provider"] == "Indian Railways Vande Bharat"
    # 3. Transport information
    assert seg3["train"] is not None
    assert seg3["train"]["train_number"] == "22225"
    assert seg3["train"]["train_name"] == "Vande Bharat Express"
    assert seg3["train"]["operator_name"] == "Indian Railways Vande Bharat"
    assert seg3["train"]["departure_station"] == "Mumbai Central"
    assert seg3["train"]["arrival_station"] == "Pune Junction"
    assert seg3["train"]["seat_berth_number"] == "25"
    assert seg3["booking"] is not None
    assert seg3["booking"]["booking_reference"] == "IRCTC-VB-4455"
    assert seg3["booking"]["fare_amount"] == 80.00

    # Step 2: GET /trips/{trip_id}
    res_get = client.get(f"/trips/{trip_id}")
    assert res_get.status_code == 200
    trip_retrieved = res_get.json()
    assert trip_retrieved["id"] == trip_id
    assert trip_retrieved["user_id"] == sample_user.id
    assert len(trip_retrieved["segments"]) == 3

    # Step 3: GET /trips/{trip_id}/segments
    res_segs = client.get(f"/trips/{trip_id}/segments")
    assert res_segs.status_code == 200
    segs_list = res_segs.json()
    assert len(segs_list) == 3
    assert [s["sequence_order"] for s in segs_list] == [1, 2, 3]
    assert segs_list[0]["provider"] == "Uber Premium"
    assert segs_list[1]["provider"] == "IndiGo Airlines"
    assert segs_list[2]["provider"] == "Indian Railways Vande Bharat"

    # Step 4: GET /trips/{trip_id}/status
    res_status = client.get(f"/trips/{trip_id}/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["trip_id"] == trip_id
    assert status_data["total_segments"] == 3
    assert status_data["title"] == "Delhi to Mumbai Executive Multi-Modal"
    assert status_data["total_cost"] == 285.50
    assert status_data["currency"] == "USD"
    assert len(status_data["segments"]) == 3
    assert status_data["segments"][0]["provider"] == "Uber Premium"
    assert status_data["segments"][1]["provider"] == "IndiGo Airlines"
    assert status_data["segments"][2]["provider"] == "Indian Railways Vande Bharat"

    # Step 5: Verify in database directly that User relationship holds
    db.expire_all()
    user_in_db = db.query(User).filter(User.id == sample_user.id).first()
    user_trip_ids = [t.id for t in user_in_db.trips]
    assert trip_id in user_trip_ids


def test_part_a_route_selection_with_route_alias(client: TestClient, sample_user: User):
    """Verifies route selection using the 'route' key alias."""
    now = datetime.utcnow()
    t0 = (now + timedelta(days=2)).replace(microsecond=0)
    t1 = t0 + timedelta(hours=3)

    payload = {
        "user_id": sample_user.id,
        "route": {
            "id": "route-fast-flight",
            "title": "Express Nonstop Flight",
            "total_price": 149.99,
            "currency": "USD",
            "total_duration": 180.0,
            "departure": t0.isoformat(),
            "arrival": t1.isoformat(),
            "segments": [
                {
                    "id": "seg-flt-single",
                    "sequence_order": 1,
                    "mode": "FLIGHT",
                    "provider": "Singapore Airlines",
                    "price": 149.99,
                    "currency": "USD",
                    "departure": t0.isoformat(),
                    "arrival": t1.isoformat(),
                    "duration": 180.0,
                    "origin": "SIN",
                    "destination": "BKK",
                    "identifier": "SQ-972",
                    "details": {
                        "airline_code": "SQ",
                        "airline_name": "Singapore Airlines",
                        "flight_number": "SQ-972",
                        "departure_airport": "SIN",
                        "arrival_airport": "BKK",
                        "cabin_class": "BUSINESS",
                        "seat": "12A",
                    },
                }
            ],
        },
    }

    res = client.post("/trips", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["title"] == "Express Nonstop Flight"
    assert created["total_cost"] == 149.99
    assert len(created["segments"]) == 1
    assert created["segments"][0]["provider"] == "Singapore Airlines"
    assert created["segments"][0]["flight"]["flight_number"] == "SQ-972"
    assert created["segments"][0]["flight"]["cabin_class"] == "BUSINESS"

    # Status check
    res_status = client.get(f"/trips/{created['id']}/status")
    assert res_status.status_code == 200
    assert res_status.json()["total_segments"] == 1


def test_part_a_trip_endpoints_404_handling(client: TestClient):
    """Verifies 404 responses for non-existent trip IDs across all endpoints."""
    fake_id = "non-existent-trip-uuid-9999"

    res_get = client.get(f"/trips/{fake_id}")
    assert res_get.status_code == 404

    res_segs = client.get(f"/trips/{fake_id}/segments")
    assert res_segs.status_code == 404

    res_status = client.get(f"/trips/{fake_id}/status")
    assert res_status.status_code == 404
