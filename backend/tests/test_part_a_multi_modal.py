import pytest
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient

from backend.main import app
from backend.part_a.services.multi_modal_generator import (
    MultiModalRouteGenerator,
    parse_datetime_to_utc,
    normalize_mode_string,
    MIN_TRANSFER_BUFFERS,
)
from backend.part_a.schemas.route_search import RouteSearchSegment
from backend.part_a.schemas.multi_modal import (
    ConnectionValidationResult,
    MultiModalRouteGenerateRequest,
)

client = TestClient(app)


def test_mode_normalization():
    """Verify normalize_mode_string correctly standardizes transit modes."""
    assert normalize_mode_string("CAB") == "CAB"
    assert normalize_mode_string("Taxi") == "CAB"
    assert normalize_mode_string("Ridehail") == "CAB"
    assert normalize_mode_string("BUS") == "BUS"
    assert normalize_mode_string("coach") == "BUS"
    assert normalize_mode_string("Train") == "TRAIN"
    assert normalize_mode_string("RAIL") == "TRAIN"
    assert normalize_mode_string("Flight") == "FLIGHT"
    assert normalize_mode_string("plane") == "FLIGHT"


def test_parse_datetime_with_tz_and_overnight():
    """Verify UTC parsing handles Z, offsets, naive datetimes, and calculates accurate elapsed time across day boundaries."""
    # Departure in India Standard Time (UTC+05:30) at 11:30 PM on Oct 15
    dep_str = "2026-10-15T23:30:00+05:30"
    dep_utc, dep_tz = parse_datetime_to_utc(dep_str)
    # 23:30 - 05:30 = 18:00 UTC
    assert dep_utc.hour == 18
    assert dep_utc.day == 15

    # Arrival in London (UTC+01:00) at 4:30 AM on Oct 16
    arr_str = "2026-10-16T04:30:00+01:00"
    arr_utc, arr_tz = parse_datetime_to_utc(arr_str)
    # 04:30 - 01:00 = 03:30 UTC next day
    assert arr_utc.hour == 3
    assert arr_utc.minute == 30
    assert arr_utc.day == 16

    # Real physical elapsed duration = 18:00 to 03:30 next day = 9.5 hours = 570 mins
    diff_minutes = (arr_utc - dep_utc).total_seconds() / 60.0
    assert diff_minutes == 570.0


def test_connection_step_1_to_5_valid_connection():
    """Test connection validation across CAB -> TRAIN -> FLIGHT -> BUS."""
    generator = MultiModalRouteGenerator()
    base_time = datetime(2026, 11, 10, 8, 0, 0, tzinfo=timezone.utc)

    # Segment 1: CAB Bhavnagar -> Ahmedabad
    seg_cab = RouteSearchSegment(
        id="SEG-CAB-1",
        mode="CAB",
        provider="City Taxi Fleet",
        price=35.0,
        currency="USD",
        departure=base_time.isoformat(),
        arrival=(base_time + timedelta(hours=2)).isoformat(),  # arrives 10:00
        duration=120.0,
        origin="Bhavnagar",
        destination="Ahmedabad Central",
        identifier="Sedan Taxi",
    )

    # Segment 2: TRAIN Ahmedabad -> Mumbai (departs 10:30, 30m buffer >= 20m required)
    seg_train = RouteSearchSegment(
        id="SEG-TRN-1",
        mode="TRAIN",
        provider="National Railways",
        price=18.0,
        currency="USD",
        departure=(base_time + timedelta(hours=2, minutes=30)).isoformat(),
        arrival=(base_time + timedelta(hours=7)).isoformat(),  # arrives 15:00
        duration=270.0,
        origin="Ahmedabad Central",
        destination="Mumbai Central",
        identifier="Express 12902",
    )

    # Validate CAB -> TRAIN connection
    res1 = generator.validate_connection(seg_cab, seg_train)
    assert res1.is_valid is True
    assert res1.transfer_time_minutes == 30.0
    assert res1.min_buffer_minutes == 20.0
    assert res1.rejection_code is None


def test_connection_step_5_reject_impossible_connections():
    """Test rejection of impossible connections: negative layover, insufficient buffer, excessive layover, location mismatch."""
    generator = MultiModalRouteGenerator()
    now = datetime(2026, 11, 10, 10, 0, 0, tzinfo=timezone.utc)

    seg_prev = RouteSearchSegment(
        id="SEG-PREV",
        mode="FLIGHT",
        provider="Airline 1",
        price=120.0,
        currency="USD",
        departure=now.isoformat(),
        arrival=(now + timedelta(hours=2)).isoformat(),  # arrives 12:00
        duration=120.0,
        origin="Mumbai",
        destination="Kochi Airport",
    )

    # 1. Reject Chronologically Impossible (Departure 11:30 is before Arrival 12:00)
    seg_negative_layover = RouteSearchSegment(
        id="SEG-NEG",
        mode="CAB",
        provider="Kochi Taxi",
        price=25.0,
        currency="USD",
        departure=(now + timedelta(hours=1, minutes=30)).isoformat(),
        arrival=(now + timedelta(hours=3)).isoformat(),
        duration=90.0,
        origin="Kochi Airport",
        destination="Kerala Backwaters",
    )
    res_neg = generator.validate_connection(seg_prev, seg_negative_layover)
    assert res_neg.is_valid is False
    assert res_neg.rejection_code == "CHRONOLOGICALLY_IMPOSSIBLE"
    assert res_neg.transfer_time_minutes == -30.0

    # 2. Reject Insufficient Transfer Buffer (FLIGHT -> CAB requires 30m, only 10m given)
    seg_insufficient = RouteSearchSegment(
        id="SEG-INS",
        mode="CAB",
        provider="Kochi Taxi",
        price=25.0,
        currency="USD",
        departure=(now + timedelta(hours=2, minutes=10)).isoformat(),
        arrival=(now + timedelta(hours=3, minutes=30)).isoformat(),
        duration=80.0,
        origin="Kochi Airport",
        destination="Kerala Backwaters",
    )
    res_ins = generator.validate_connection(seg_prev, seg_insufficient)
    assert res_ins.is_valid is False
    assert res_ins.rejection_code == "INSUFFICIENT_TRANSFER_TIME"
    assert res_ins.transfer_time_minutes == 10.0
    assert res_ins.min_buffer_minutes == 30.0

    # 3. Reject Excessive Layover (> 1440m / 24h)
    seg_excessive = RouteSearchSegment(
        id="SEG-EXC",
        mode="CAB",
        provider="Kochi Taxi",
        price=25.0,
        currency="USD",
        departure=(now + timedelta(days=2)).isoformat(),
        arrival=(now + timedelta(days=2, hours=1)).isoformat(),
        duration=60.0,
        origin="Kochi Airport",
        destination="Kerala Backwaters",
    )
    res_exc = generator.validate_connection(seg_prev, seg_excessive, max_wait_minutes=1440.0)
    assert res_exc.is_valid is False
    assert res_exc.rejection_code == "EXCESSIVE_LAYOVER"

    # 4. Reject Geographic Discontinuity
    seg_mismatch = RouteSearchSegment(
        id="SEG-MIS",
        mode="CAB",
        provider="Delhi Taxi",
        price=20.0,
        currency="USD",
        departure=(now + timedelta(hours=3)).isoformat(),
        arrival=(now + timedelta(hours=4)).isoformat(),
        duration=60.0,
        origin="Delhi Connaught Place",  # does not match Kochi
        destination="Agra",
    )
    res_mis = generator.validate_connection(seg_prev, seg_mismatch, enforce_geographic_continuity=True)
    assert res_mis.is_valid is False
    assert res_mis.rejection_code == "GEOGRAPHIC_DISCONTINUITY"


def test_build_journey_steps_6_to_10_and_metrics():
    """Verify Steps 6-10: JourneySegment sequence order, duration, price, waiting time, transfer count, overnight."""
    generator = MultiModalRouteGenerator()
    start_dt = datetime(2026, 11, 10, 22, 0, 0, tzinfo=timezone.utc)  # 10 PM

    seg1 = RouteSearchSegment(
        id="SEG-1",
        mode="CAB",
        provider="City Cab",
        price=40.0,
        currency="USD",
        departure=start_dt.isoformat(),
        arrival=(start_dt + timedelta(hours=1)).isoformat(),  # 11:00 PM
        duration=60.0,
        origin="Bhavnagar",
        destination="Ahmedabad",
        details={"distance_km": 170.0},
    )

    # Connects with 45m wait, departs 11:45 PM, arrives 06:45 AM next day (overnight)
    seg2 = RouteSearchSegment(
        id="SEG-2",
        mode="TRAIN",
        provider="Railways",
        price=25.0,
        currency="USD",
        departure=(start_dt + timedelta(hours=1, minutes=45)).isoformat(),
        arrival=(start_dt + timedelta(hours=8, minutes=45)).isoformat(),
        duration=420.0,
        origin="Ahmedabad",
        destination="Mumbai",
        details={"distance_km": 490.0},
    )

    journey = generator.build_journey_from_segments([seg1, seg2], passengers=2)

    # 6. Check JourneySegment sequences
    assert len(journey.segments) == 2
    assert journey.segments[0].sequence_order == 1
    assert journey.segments[1].sequence_order == 2

    # 7. Total journey duration = 22:00 to 06:45 next day = 8 hours 45 mins = 525 mins
    assert journey.total_duration == 525.0
    assert journey.is_overnight is True

    # 8. Total price = Cab ($40 per vehicle) + Train ($25 * 2 passengers) = $90
    assert journey.total_price == 90.0
    assert journey.currency == "USD"

    # 9. Total waiting time = 45 mins between 23:00 and 23:45
    assert journey.waiting_time == 45.0

    # 10. Transfer count = 1
    assert journey.transfer_count == 1
    assert "CAB" in journey.modes_used
    assert "TRAIN" in journey.modes_used


def test_full_bhavnagar_ahmedabad_mumbai_kochi_kerala_flow():
    """
    Test the complete multi-modal route example requested by the user:
    Bhavnagar -> Ahmedabad (CAB)
    -> Mumbai (TRAIN)
    -> Kochi (FLIGHT)
    -> Kerala (BUS)
    """
    generator = MultiModalRouteGenerator()
    start_dt = datetime(2026, 12, 1, 6, 0, 0, tzinfo=timezone.utc)

    # Leg 1: Bhavnagar -> Ahmedabad (CAB)
    leg1_cab = RouteSearchSegment(
        id="LEG1-CAB",
        mode="CAB",
        provider="Gujarat Cab Fleet",
        price=50.0,
        currency="USD",
        departure=start_dt.isoformat(),
        arrival=(start_dt + timedelta(hours=2, minutes=30)).isoformat(),  # 08:30
        duration=150.0,
        origin="Bhavnagar",
        destination="Ahmedabad",
        details={"distance_km": 175.0},
    )

    # Leg 2: Ahmedabad -> Mumbai (TRAIN, dep 09:00, arr 14:30)
    leg2_train = RouteSearchSegment(
        id="LEG2-TRN",
        mode="TRAIN",
        provider="Vande Bharat Express",
        price=30.0,
        currency="USD",
        departure=(start_dt + timedelta(hours=3)).isoformat(),  # 09:00 (30m wait >= 20m buffer)
        arrival=(start_dt + timedelta(hours=8, minutes=30)).isoformat(),  # 14:30
        duration=330.0,
        origin="Ahmedabad",
        destination="Mumbai",
        details={"distance_km": 490.0},
    )

    # Leg 3: Mumbai -> Kochi (FLIGHT, dep 16:00, arr 18:00)
    leg3_flight = RouteSearchSegment(
        id="LEG3-FLT",
        mode="FLIGHT",
        provider="IndiGo 6E-512",
        price=75.0,
        currency="USD",
        departure=(start_dt + timedelta(hours=10)).isoformat(),  # 16:00 (90m wait >= 60m buffer)
        arrival=(start_dt + timedelta(hours=12)).isoformat(),  # 18:00
        duration=120.0,
        origin="Mumbai",
        destination="Kochi",
        details={"distance_km": 1060.0},
    )

    # Leg 4: Kochi -> Kerala (BUS, dep 18:45, arr 20:30)
    leg4_bus = RouteSearchSegment(
        id="LEG4-BUS",
        mode="BUS",
        provider="KSRTC Express Coach",
        price=12.0,
        currency="USD",
        departure=(start_dt + timedelta(hours=12, minutes=45)).isoformat(),  # 18:45 (45m wait >= 30m buffer)
        arrival=(start_dt + timedelta(hours=14, minutes=30)).isoformat(),  # 20:30
        duration=105.0,
        origin="Kochi",
        destination="Kerala",
        details={"distance_km": 65.0},
    )

    legs = [[leg1_cab], [leg2_train], [leg3_flight], [leg4_bus]]

    journeys, rejected_count, rejection_summary = generator.generate_journeys_from_legs(
        legs=legs,
        passengers=1,
        preference="FASTEST",
    )

    assert len(journeys) == 1
    assert rejected_count == 0
    journey = journeys[0]

    # Check metrics
    assert journey.transfer_count == 3
    # Waiting times:
    # Leg 1 to 2: 08:30 to 09:00 = 30m
    # Leg 2 to 3: 14:30 to 16:00 = 90m
    # Leg 3 to 4: 18:00 to 18:45 = 45m
    # Total wait = 30 + 90 + 45 = 165m
    assert journey.waiting_time == 165.0

    # Total duration = 06:00 to 20:30 = 14.5 hours = 870 mins
    assert journey.total_duration == 870.0

    # Total price = 50 + 30 + 75 + 12 = 167.0
    assert journey.total_price == 167.0

    # Segments
    assert len(journey.segments) == 4
    assert [s.mode for s in journey.segments] == ["CAB", "TRAIN", "FLIGHT", "BUS"]
    assert [s.sequence_order for s in journey.segments] == [1, 2, 3, 4]


def test_fastapi_multi_modal_endpoints():
    """Verify POST /routes/generate and POST /routes/connections/validate API endpoints."""
    # 1. Validate connection API
    now = datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0)
    seg_a = {
        "id": "A1",
        "mode": "TRAIN",
        "provider": "Railways",
        "price": 20.0,
        "currency": "USD",
        "departure": now.isoformat(),
        "arrival": (now + timedelta(hours=2)).isoformat(),  # 11:00
        "duration": 120.0,
        "origin": "Station X",
        "destination": "Station Y",
    }
    seg_b_valid = {
        "id": "B1",
        "mode": "CAB",
        "provider": "City Cab",
        "price": 15.0,
        "currency": "USD",
        "departure": (now + timedelta(hours=2, minutes=20)).isoformat(),  # 11:20 (20m >= 15m)
        "arrival": (now + timedelta(hours=3)).isoformat(),
        "duration": 40.0,
        "origin": "Station Y",
        "destination": "Hotel Z",
    }

    resp = client.post(
        "/routes/connections/validate",
        json={"prev_segment": seg_a, "next_segment": seg_b_valid},
    )
    assert resp.status_code == 200
    val_data = resp.json()
    assert val_data["is_valid"] is True
    assert val_data["transfer_time_minutes"] == 20.0
    assert val_data["min_buffer_minutes"] == 15.0

    # 2. Generate multi-modal route API across Indian waypoints
    resp_gen = client.post(
        "/routes/generate",
        json={
            "waypoints": ["Bhavnagar", "Ahmedabad", "Mumbai"],
            "travel_date": "2026-11-20",
            "passengers": 1,
            "transport_modes": ["CAB", "TRAIN"],
            "preference": "FASTEST",
        },
    )
    assert resp_gen.status_code == 200
    gen_data = resp_gen.json()
    assert gen_data["source"] == "Bhavnagar"
    assert gen_data["destination"] == "Mumbai"
    assert len(gen_data["waypoints"]) == 3
    assert gen_data["valid_routes"] >= 1
    assert len(gen_data["routes"]) >= 1

    first_route = gen_data["routes"][0]
    assert first_route["total_price"] > 0
    assert first_route["total_duration"] > 0
    assert first_route["waiting_time"] >= 0
    assert first_route["transfer_count"] >= 1
    assert len(first_route["segments"]) >= 2
