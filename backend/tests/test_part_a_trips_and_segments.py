import uuid
from datetime import datetime, timedelta
import pytest
from starlette.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_create_trip_minimal_and_get():
    """Test creating a minimal trip and retrieving it by ID."""
    now = datetime.utcnow()
    trip_payload = {
        "title": "Business Symposium 2026",
        "description": "Annual Technology and Infrastructure Summit",
        "status": "PLANNED",
        "origin": "New York, USA",
        "destination": "London, UK",
        "start_date": (now + timedelta(days=10)).isoformat(),
        "end_date": (now + timedelta(days=15)).isoformat(),
        "total_cost": 1250.0,
        "currency": "USD",
    }

    # Test POST /trips
    res = client.post("/trips", json=trip_payload)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["id"] is not None
    assert data["title"] == "Business Symposium 2026"
    assert data["origin"] == "New York, USA"
    assert data["destination"] == "London, UK"
    assert data["total_cost"] == 1250.0
    trip_id = data["id"]

    # Test GET /trips/{trip_id}
    get_res = client.get(f"/trips/{trip_id}")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["id"] == trip_id
    assert get_data["title"] == "Business Symposium 2026"
    assert isinstance(get_data["segments"], list)
    assert len(get_data["segments"]) == 0

    # Also test GET /trips/{trip_id}/segments
    segs_res = client.get(f"/trips/{trip_id}/segments")
    assert segs_res.status_code == 200
    assert segs_res.json() == []


def test_create_trip_with_multi_modal_segments():
    """Test creating a trip with Flight, Train, Vehicle, and TransportBooking sub-models."""
    now = datetime.utcnow()
    t1_dep = now + timedelta(days=20, hours=8)
    t1_arr = t1_dep + timedelta(minutes=45)

    t2_dep = t1_arr + timedelta(minutes=75)  # 75 min airport transfer / check-in
    t2_arr = t2_dep + timedelta(hours=7)

    t3_dep = t2_arr + timedelta(hours=2)   # 2 hours immigration & train station
    t3_arr = t3_dep + timedelta(hours=2, minutes=15)

    trip_payload = {
        "title": "NYC to Paris via London",
        "description": "Multi-modal journey across airport and train links",
        "status": "PLANNED",
        "origin": "Manhattan, NY",
        "destination": "Paris Gare du Nord, France",
        "start_date": (now + timedelta(days=20)).isoformat(),
        "end_date": (now + timedelta(days=22)).isoformat(),
        "currency": "USD",
        "segments": [
            {
                "sequence_order": 1,
                "mode": "VEHICLE",
                "origin_location": "Midtown Manhattan Hotel",
                "destination_location": "JFK Airport Terminal 4",
                "departure_time": t1_dep.isoformat(),
                "arrival_time": t1_arr.isoformat(),
                "distance_km": 28.5,
                "estimated_cost": 85.0,
                "vehicle": {
                    "vehicle_type": "TAXI",
                    "provider_name": "NYC Yellow Cab",
                    "license_plate": "NYC-7842",
                    "driver_name": "Michael S.",
                    "driver_phone": "+1-212-555-0144",
                    "pickup_address": "450 Lexington Ave, NY",
                    "dropoff_address": "JFK Terminal 4 Departures",
                    "confirmation_code": "CAB-9921",
                },
                "booking": {
                    "booking_reference": "BK-CAB-01",
                    "provider_name": "NYC Yellow Cab",
                    "status": "CONFIRMED",
                    "fare_amount": 85.0,
                    "currency": "USD",
                }
            },
            {
                "sequence_order": 2,
                "mode": "FLIGHT",
                "origin_location": "New York (JFK)",
                "destination_location": "London Heathrow (LHR)",
                "departure_time": t2_dep.isoformat(),
                "arrival_time": t2_arr.isoformat(),
                "distance_km": 5540.0,
                "estimated_cost": 720.0,
                "flight": {
                    "flight_number": "BA 178",
                    "airline_code": "BA",
                    "airline_name": "British Airways",
                    "departure_airport": "JFK",
                    "arrival_airport": "LHR",
                    "departure_terminal": "7",
                    "arrival_terminal": "5",
                    "departure_gate": "4B",
                    "aircraft_type": "Boeing 777-300ER",
                    "cabin_class": "BUSINESS",
                    "seat": "12A",
                    "baggage_allowance": "2x32kg",
                },
                "booking": {
                    "booking_reference": "PNR-BA7891",
                    "provider_name": "British Airways",
                    "status": "CONFIRMED",
                    "fare_amount": 720.0,
                    "currency": "USD",
                    "booking_class": "BUSINESS",
                    "seat_number": "12A",
                    "ticket_number": "125-9923847291",
                }
            },
            {
                "sequence_order": 3,
                "mode": "TRAIN",
                "origin_location": "London St Pancras International",
                "destination_location": "Paris Gare du Nord",
                "departure_time": t3_dep.isoformat(),
                "arrival_time": t3_arr.isoformat(),
                "distance_km": 492.0,
                "estimated_cost": 165.0,
                "train": {
                    "train_number": "ES 9024",
                    "train_name": "Eurostar e320",
                    "operator_name": "Eurostar International",
                    "departure_station": "London St Pancras",
                    "arrival_station": "Paris Gare du Nord",
                    "departure_platform": "5",
                    "arrival_platform": "3",
                    "coach_number": "6",
                    "seat_berth_number": "42",
                    "travel_class": "STANDARD_PREMIER",
                },
                "booking": {
                    "booking_reference": "EUR-66512",
                    "provider_name": "Eurostar",
                    "status": "CONFIRMED",
                    "fare_amount": 165.0,
                    "currency": "USD",
                    "booking_class": "STANDARD_PREMIER",
                    "seat_number": "Coach 6, Seat 42",
                }
            }
        ]
    }

    # Post trip
    res = client.post("/api/v1/trips", json=trip_payload)
    assert res.status_code == 201, res.text
    trip_data = res.json()
    trip_id = trip_data["id"]
    assert len(trip_data["segments"]) == 3
    # Verify calculated total cost
    assert trip_data["total_cost"] == 85.0 + 720.0 + 165.0

    # Retrieve segments via GET /trips/{trip_id}/segments
    segs_res = client.get(f"/trips/{trip_id}/segments")
    assert segs_res.status_code == 200
    segs = segs_res.json()
    assert len(segs) == 3

    # Check segment 1: Vehicle & Booking
    s1 = segs[0]
    assert s1["sequence_order"] == 1
    assert s1["mode"] == "VEHICLE"
    assert s1["vehicle"] is not None
    assert s1["vehicle"]["vehicle_type"] == "TAXI"
    assert s1["vehicle"]["provider_name"] == "NYC Yellow Cab"
    assert s1["booking"]["booking_reference"] == "BK-CAB-01"

    # Check segment 2: Flight & Booking
    s2 = segs[1]
    assert s2["sequence_order"] == 2
    assert s2["mode"] == "FLIGHT"
    assert s2["flight"] is not None
    assert s2["flight"]["flight_number"] == "BA 178"
    assert s2["flight"]["airline_code"] == "BA"
    assert s2["flight"]["departure_airport"] == "JFK"
    assert s2["flight"]["arrival_airport"] == "LHR"
    assert s2["booking"]["booking_reference"] == "PNR-BA7891"

    # Check segment 3: Train & Booking
    s3 = segs[2]
    assert s3["sequence_order"] == 3
    assert s3["mode"] == "TRAIN"
    assert s3["train"] is not None
    assert s3["train"]["train_number"] == "ES 9024"
    assert s3["train"]["operator_name"] == "Eurostar International"
    assert s3["booking"]["booking_reference"] == "EUR-66512"


def test_validation_segment_order_and_continuity():
    """Verify segment order validation for non-contiguous sequence orders and duplicates."""
    now = datetime.utcnow()
    t1 = now + timedelta(days=30)
    t2 = t1 + timedelta(hours=2)
    t3 = t2 + timedelta(hours=3)
    t4 = t3 + timedelta(hours=2)

    # 1. Non-contiguous sequence numbers (e.g. sequence 1 and 3, missing 2)
    bad_order_payload = {
        "title": "Invalid Sequence Gap Trip",
        "origin": "Seattle",
        "destination": "Tokyo",
        "start_date": t1.isoformat(),
        "end_date": (t1 + timedelta(days=5)).isoformat(),
        "segments": [
            {
                "sequence_order": 1,
                "mode": "FLIGHT",
                "origin_location": "SEA",
                "destination_location": "HND",
                "departure_time": t1.isoformat(),
                "arrival_time": t2.isoformat(),
            },
            {
                "sequence_order": 3,  # Gap: missing 2!
                "mode": "TRAIN",
                "origin_location": "HND",
                "destination_location": "Shinjuku",
                "departure_time": t3.isoformat(),
                "arrival_time": t4.isoformat(),
            }
        ]
    }
    res = client.post("/trips", json=bad_order_payload)
    assert res.status_code in [400, 422], res.text

    # 2. Duplicate sequence orders (1 and 1)
    dup_order_payload = {
        "title": "Duplicate Sequence Trip",
        "origin": "Seattle",
        "destination": "Tokyo",
        "start_date": t1.isoformat(),
        "end_date": (t1 + timedelta(days=5)).isoformat(),
        "segments": [
            {
                "sequence_order": 1,
                "mode": "FLIGHT",
                "origin_location": "SEA",
                "destination_location": "HND",
                "departure_time": t1.isoformat(),
                "arrival_time": t2.isoformat(),
            },
            {
                "sequence_order": 1,  # Duplicate!
                "mode": "TRAIN",
                "origin_location": "HND",
                "destination_location": "Tokyo Station",
                "departure_time": t3.isoformat(),
                "arrival_time": t4.isoformat(),
            }
        ]
    }
    res_dup = client.post("/trips", json=dup_order_payload)
    assert res_dup.status_code in [400, 422], res_dup.text

    # 3. Starting sequence_order > 1 (e.g. [2, 3])
    start_order_payload = {
        "title": "Start Non-1 Sequence Trip",
        "origin": "Boston",
        "destination": "Chicago",
        "start_date": t1.isoformat(),
        "end_date": (t1 + timedelta(days=5)).isoformat(),
        "segments": [
            {
                "sequence_order": 2,  # Should start at 1
                "mode": "FLIGHT",
                "origin_location": "BOS",
                "destination_location": "ORD",
                "departure_time": t1.isoformat(),
                "arrival_time": t2.isoformat(),
            }
        ]
    }
    res_start = client.post("/trips", json=start_order_payload)
    assert res_start.status_code in [400, 422], res_start.text


def test_validation_chronological_time_conflict():
    """Verify segment arrival time cannot be after next segment departure time."""
    now = datetime.utcnow()
    t1_dep = now + timedelta(days=40, hours=10)
    t1_arr = t1_dep + timedelta(hours=4)  # Arrives at 14:00

    t2_dep = t1_dep + timedelta(hours=2)  # Departs at 12:00 -> Conflict!
    t2_arr = t2_dep + timedelta(hours=3)

    conflict_payload = {
        "title": "Time Travel Conflict Trip",
        "origin": "San Francisco",
        "destination": "Rome",
        "start_date": (now + timedelta(days=40)).isoformat(),
        "end_date": (now + timedelta(days=45)).isoformat(),
        "segments": [
            {
                "sequence_order": 1,
                "mode": "FLIGHT",
                "origin_location": "SFO",
                "destination_location": "JFK",
                "departure_time": t1_dep.isoformat(),
                "arrival_time": t1_arr.isoformat(),
            },
            {
                "sequence_order": 2,
                "mode": "FLIGHT",
                "origin_location": "JFK",
                "destination_location": "FCO",
                "departure_time": t2_dep.isoformat(),
                "arrival_time": t2_arr.isoformat(),
            }
        ]
    }
    res = client.post("/trips", json=conflict_payload)
    assert res.status_code in [400, 422], res.text


def test_validation_required_fields_and_dates():
    """Verify trip start_date <= end_date and segment departure_time <= arrival_time."""
    now = datetime.utcnow()

    # 1. Invalid trip date range: start_date > end_date
    invalid_dates_trip = {
        "title": "Reversed Dates Trip",
        "origin": "Chicago",
        "destination": "Miami",
        "start_date": (now + timedelta(days=10)).isoformat(),
        "end_date": (now + timedelta(days=5)).isoformat(),
    }
    res = client.post("/trips", json=invalid_dates_trip)
    assert res.status_code == 422

    # 2. Missing required fields in trip
    missing_fields_trip = {
        "title": "Incomplete Trip",
        # Missing origin, destination, dates
    }
    res_missing = client.post("/trips", json=missing_fields_trip)
    assert res_missing.status_code == 422

    # 3. Invalid segment date range: departure_time > arrival_time
    invalid_seg_trip = {
        "title": "Backwards Flight Trip",
        "origin": "Dallas",
        "destination": "Austin",
        "start_date": (now + timedelta(days=1)).isoformat(),
        "end_date": (now + timedelta(days=2)).isoformat(),
        "segments": [
            {
                "sequence_order": 1,
                "mode": "FLIGHT",
                "origin_location": "DFW",
                "destination_location": "AUS",
                "departure_time": (now + timedelta(days=1, hours=10)).isoformat(),
                "arrival_time": (now + timedelta(days=1, hours=9)).isoformat(),  # 1 hour earlier!
            }
        ]
    }
    res_seg = client.post("/trips", json=invalid_seg_trip)
    assert res_seg.status_code == 422


def test_add_update_delete_segment_lifecycle():
    """Test dynamically adding segments, checking order enforcement, updating, and deleting."""
    now = datetime.utcnow()
    trip_res = client.post(
        "/trips",
        json={
            "title": "California Coastal Expedition",
            "origin": "San Diego",
            "destination": "San Francisco",
            "start_date": (now + timedelta(days=50)).isoformat(),
            "end_date": (now + timedelta(days=55)).isoformat(),
            "total_cost": 0.0,
        },
    )
    assert trip_res.status_code == 201
    trip_id = trip_res.json()["id"]

    # 1. Add Segment 1
    t1_dep = now + timedelta(days=50, hours=9)
    t1_arr = t1_dep + timedelta(hours=2, minutes=30)
    seg1_payload = {
        "sequence_order": 1,
        "mode": "TRAIN",
        "origin_location": "San Diego Santa Fe Depot",
        "destination_location": "Los Angeles Union Station",
        "departure_time": t1_dep.isoformat(),
        "arrival_time": t1_arr.isoformat(),
        "distance_km": 205.0,
        "estimated_cost": 36.0,
        "train": {
            "train_number": "564",
            "train_name": "Pacific Surfliner",
            "operator_name": "Amtrak California",
            "departure_station": "San Diego Santa Fe Depot",
            "arrival_station": "LA Union Station",
            "travel_class": "COACH",
        }
    }
    s1_res = client.post(f"/trips/{trip_id}/segments", json=seg1_payload)
    assert s1_res.status_code == 201
    s1_id = s1_res.json()["id"]

    # 2. Add duplicate sequence_order 1 -> should fail with 400
    dup_res = client.post(f"/trips/{trip_id}/segments", json=seg1_payload)
    assert dup_res.status_code == 400

    # 3. Add segment with sequence_order 3 when only 1 exists -> should fail with 400
    gap_payload = {
        "sequence_order": 3,
        "mode": "TRAIN",
        "origin_location": "LA",
        "destination_location": "SF",
        "departure_time": (t1_arr + timedelta(hours=3)).isoformat(),
        "arrival_time": (t1_arr + timedelta(hours=8)).isoformat(),
    }
    gap_res = client.post(f"/trips/{trip_id}/segments", json=gap_payload)
    assert gap_res.status_code == 400

    # 4. Add Segment 2 with time conflict (departs before seg 1 arrives) -> should fail with 400
    conflict_payload = {
        "sequence_order": 2,
        "mode": "TRAIN",
        "origin_location": "LA",
        "destination_location": "SF",
        "departure_time": (t1_dep + timedelta(hours=1)).isoformat(),  # Conflicts with seg1!
        "arrival_time": (t1_dep + timedelta(hours=5)).isoformat(),
    }
    conflict_res = client.post(f"/trips/{trip_id}/segments", json=conflict_payload)
    assert conflict_res.status_code == 400

    # 5. Add valid Segment 2
    t2_dep = t1_arr + timedelta(hours=1)
    t2_arr = t2_dep + timedelta(hours=6)
    seg2_payload = {
        "sequence_order": 2,
        "mode": "TRAIN",
        "origin_location": "Los Angeles Union Station",
        "destination_location": "San Francisco Emeryville",
        "departure_time": t2_dep.isoformat(),
        "arrival_time": t2_arr.isoformat(),
        "distance_km": 680.0,
        "estimated_cost": 65.0,
        "train": {
            "train_number": "14",
            "train_name": "Coast Starlight",
            "operator_name": "Amtrak",
            "departure_station": "LA Union Station",
            "arrival_station": "Emeryville",
            "travel_class": "ROOMETTE",
        }
    }
    s2_res = client.post(f"/trips/{trip_id}/segments", json=seg2_payload)
    assert s2_res.status_code == 201
    s2_id = s2_res.json()["id"]

    # 6. Verify GET /trips/{trip_id}/segments returns 2 ordered segments
    list_segs_res = client.get(f"/trips/{trip_id}/segments")
    assert list_segs_res.status_code == 200
    segs_list = list_segs_res.json()
    assert len(segs_list) == 2
    assert segs_list[0]["id"] == s1_id
    assert segs_list[1]["id"] == s2_id

    # 7. Update segment 2 status
    upd_res = client.put(
        f"/trips/{trip_id}/segments/{s2_id}",
        json={"status": "CONFIRMED", "estimated_cost": 70.0}
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["status"] == "CONFIRMED"
    assert upd_res.json()["estimated_cost"] == 70.0

    # 8. Delete segment 1, verify segment 2 is re-sequenced to 1
    del_res = client.delete(f"/trips/{trip_id}/segments/{s1_id}")
    assert del_res.status_code == 204

    remaining_res = client.get(f"/trips/{trip_id}/segments")
    assert remaining_res.status_code == 200
    rem_list = remaining_res.json()
    assert len(rem_list) == 1
    assert rem_list[0]["id"] == s2_id
    assert rem_list[0]["sequence_order"] == 1


def test_trip_list_and_cascade_delete():
    """Verify trip filtering and cascading deletion."""
    now = datetime.utcnow()
    # Create trip
    trip_res = client.post(
        "/trips",
        json={
            "title": "Cascade Delete Test Trip",
            "origin": "Paris",
            "destination": "Nice",
            "status": "COMPLETED",
            "start_date": (now + timedelta(days=60)).isoformat(),
            "end_date": (now + timedelta(days=63)).isoformat(),
        }
    )
    assert trip_res.status_code == 201
    trip_id = trip_res.json()["id"]

    # List with status filter
    list_res = client.get("/trips?status=COMPLETED")
    assert list_res.status_code == 200
    assert any(t["id"] == trip_id for t in list_res.json())

    # Delete trip
    del_res = client.delete(f"/trips/{trip_id}")
    assert del_res.status_code == 204

    # Confirm 404
    get_res = client.get(f"/trips/{trip_id}")
    assert get_res.status_code == 404
