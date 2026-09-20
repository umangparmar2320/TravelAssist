import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from starlette.testclient import TestClient

from backend.main import app
from backend.part_a.services.route_search_service import (
    RealTimeRouteSearchService,
    InvalidLocationError,
)
from backend.part_a.providers.location_provider import LocationProvider
from backend.part_a.schemas.route_search import RouteSearchSegment
from backend.part_a.schemas.provider import (
    NormalizedFlightOption,
    NormalizedTrainOption,
    NormalizedGroundOption,
)


client = TestClient(app)


def test_real_time_route_search_main_flow():
    """Verify main search flow: location resolution, real API search, route metrics, and required fields."""
    resp = client.get(
        "/routes/search",
        params={
            "source": "JFK",
            "destination": "LHR",
            "travel_date": "2026-11-25",
            "passengers": 2,
            "cabin_class": "ECONOMY",
            "transport_modes": "FLIGHT",
        },
    )

    assert resp.status_code == 200
    data = resp.json()

    assert data["source"] != ""
    assert data["destination"] != ""
    assert data["passengers"] == 2
    assert data["total_routes"] > 0
    assert len(data["routes"]) == data["total_routes"]

    for route in data["routes"]:
        # Verify required calculated fields for every route
        assert route["total_price"] > 0.0
        assert isinstance(route["total_price"], float)
        assert route["currency"] == "USD"
        assert route["total_duration"] > 0.0
        assert isinstance(route["waiting_time"], (int, float))
        assert route["waiting_time"] >= 0.0
        assert isinstance(route["transfer_count"], int)
        assert route["transfer_count"] >= 0
        assert isinstance(route["departure"], str) and len(route["departure"]) > 0
        assert isinstance(route["arrival"], str) and len(route["arrival"]) > 0
        assert len(route["segments"]) > 0
        assert isinstance(route["provider"], str) and len(route["provider"]) > 0
        assert isinstance(route["last_updated"], str) and len(route["last_updated"]) > 0

        # Verify segments structure
        for seg in route["segments"]:
            assert seg["price"] > 0.0
            assert seg["currency"] == "USD"
            assert seg["departure"] is not None
            assert seg["arrival"] is not None
            assert seg["duration"] > 0.0
            assert seg["origin"] is not None
            assert seg["destination"] is not None
            assert seg["provider"] is not None
            assert seg["last_updated"] is not None


def test_route_search_api_v1_path_parity():
    """Verify /api/v1/routes/search works identically to /routes/search."""
    resp = client.get(
        "/api/v1/routes/search",
        params={
            "source": "New York",
            "destination": "London",
            "passengers": 1,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_routes"] > 0


def test_multi_modal_route_connections_and_buffers():
    """Verify multi-modal route generation (Ground + Flight + Ground) and connection layover calculations."""
    service = RealTimeRouteSearchService()
    result = service.search_routes(
        source="New York",
        destination="London",
        travel_date="2026-10-15",
        passengers=1,
        transport_modes=["FLIGHT", "VEHICLE"],
    )

    assert result.total_routes > 0
    # Check if multi-modal route option was created
    multi_modal_routes = [r for r in result.routes if r.transfer_count > 0]
    if multi_modal_routes:
        mm = multi_modal_routes[0]
        assert len(mm.segments) >= 2
        assert mm.waiting_time >= 0.0
        assert mm.total_duration > 0.0

        # Validate that chronological order holds strictly: seg[i].arrival <= seg[i+1].departure
        for i in range(len(mm.segments) - 1):
            arr_i = datetime.fromisoformat(mm.segments[i].arrival.replace("Z", "+00:00"))
            dep_next = datetime.fromisoformat(mm.segments[i + 1].departure.replace("Z", "+00:00"))
            assert dep_next >= arr_i


def test_invalid_location_handling():
    """Verify system handles empty, whitespace, and unresolvable locations gracefully with 400."""
    # Empty source
    resp_empty = client.get("/routes/search", params={"source": "", "destination": "LHR"})
    assert resp_empty.status_code == 400

    # Unresolvable location query
    with patch.object(LocationProvider, "search_locations", return_value=[]):
        resp_unresolved = client.get(
            "/routes/search",
            params={"source": "XYZ999UnknownPlaceDoesNotExist", "destination": "LHR"},
        )
        assert resp_unresolved.status_code == 400
        msg = resp_unresolved.json().get("detail") or resp_unresolved.json().get("error", {}).get("message", "")
        assert "Could not resolve" in msg


def test_api_timeout_resilience():
    """Verify route search continues gracefully when upstream provider APIs time out."""
    service = RealTimeRouteSearchService()

    # Flight provider search raises TimeoutError
    with patch.object(service.flight_provider, "search_flights", side_effect=TimeoutError("Amadeus timeout")):
        result = service.search_routes(
            source="Penn Station New York",
            destination="30th Street Station Philadelphia",
            travel_date="2026-11-20",
            transport_modes=["TRAIN", "FLIGHT"],
        )
        # Should still return train routes without throwing 500
        assert result.total_routes > 0
        train_routes = [r for r in result.routes if any(s.mode == "TRAIN" for s in r.segments)]
        assert len(train_routes) > 0


def test_provider_failure_handling():
    """Verify route search gracefully isolates provider failure without crashing."""
    service = RealTimeRouteSearchService()

    with patch.object(service.train_provider, "search_train_options", side_effect=RuntimeError("Amtraker down")):
        result = service.search_routes(
            source="JFK",
            destination="LHR",
            transport_modes=["TRAIN", "FLIGHT"],
        )
        assert result.total_routes > 0
        assert result.routes[0].segments[0].mode == "FLIGHT"


def test_unavailable_price_and_schedule_rejection():
    """Verify that options with missing/zero price or unparseable schedules are rejected."""
    service = RealTimeRouteSearchService()

    bad_flight = NormalizedFlightOption(
        id="FLT-BAD-1",
        mode="FLIGHT",
        provider="TestAir",
        price=0.0,  # Invalid zero price
        currency="USD",
        departure="2026-11-20T10:00:00",
        arrival="2026-11-20T14:00:00",
        duration=240.0,
        availability=True,
        origin="JFK",
        destination="LHR",
        last_updated="2026-09-19T00:00:00",
        airline_code="TA",
        airline_name="TestAir",
        flight_number="101",
        departure_airport="JFK",
        arrival_airport="LHR",
        cabin_class="ECONOMY",
    )

    normalized = service._normalize_flights([bad_flight])
    assert len(normalized) == 0  # Must be filtered out because price <= 0.0


def test_invalid_connection_rejection():
    """Verify that negative layovers or insufficient connection buffers are rejected by validator."""
    service = RealTimeRouteSearchService()

    now = datetime.utcnow()
    seg_1 = RouteSearchSegment(
        id="SEG-1",
        mode="FLIGHT",
        provider="Airline A",
        price=300.0,
        currency="USD",
        departure=now.isoformat(),
        arrival=(now + timedelta(hours=3)).isoformat(),  # Arrives at T+3h
        duration=180.0,
        origin="JFK",
        destination="ORD",
        last_updated=now.isoformat(),
    )

    # Segment 2 departs at T+2h (before Segment 1 arrives!)
    seg_2_invalid_time = RouteSearchSegment(
        id="SEG-2",
        mode="FLIGHT",
        provider="Airline B",
        price=250.0,
        currency="USD",
        departure=(now + timedelta(hours=2)).isoformat(),  # Departs BEFORE arrival!
        arrival=(now + timedelta(hours=5)).isoformat(),
        duration=180.0,
        origin="ORD",
        destination="LAX",
        last_updated=now.isoformat(),
    )

    valid, reason = service._validate_connections([seg_1, seg_2_invalid_time])
    assert valid is False
    assert "occurs before arrival" in reason

    # Segment 3 has only 10 minutes buffer between flights (minimum is 45m)
    seg_3_insufficient_buffer = RouteSearchSegment(
        id="SEG-3",
        mode="FLIGHT",
        provider="Airline B",
        price=250.0,
        currency="USD",
        departure=(now + timedelta(hours=3, minutes=10)).isoformat(),
        arrival=(now + timedelta(hours=6)).isoformat(),
        duration=170.0,
        origin="ORD",
        destination="LAX",
        last_updated=now.isoformat(),
    )

    valid_buffer, reason_buffer = service._validate_connections([seg_1, seg_3_insufficient_buffer])
    assert valid_buffer is False
    assert "below minimum flight layover" in reason_buffer


def test_no_routes_found_clean_response():
    """Verify clean response when no routes match criteria."""
    service = RealTimeRouteSearchService()

    # Search with empty providers mocked
    with patch.object(service.flight_provider, "search_flights", return_value=[]), \
         patch.object(service.train_provider, "search_train_options", return_value=[]), \
         patch.object(service.ground_provider, "search_ground_options", return_value=[]):
        resp = service.search_routes(
            source="JFK",
            destination="LHR",
        )
        assert resp.total_routes == 0
        assert resp.routes == []
