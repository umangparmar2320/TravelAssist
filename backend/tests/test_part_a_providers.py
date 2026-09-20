import pytest
from datetime import datetime
from starlette.testclient import TestClient
from unittest.mock import patch, MagicMock

from backend.main import app
from backend.part_a.providers.flight_provider import FlightProvider
from backend.part_a.providers.train_provider import TrainProvider
from backend.part_a.providers.ground_provider import GroundTransportProvider
from backend.part_a.providers.location_provider import LocationProvider


client = TestClient(app)


def test_flight_provider_search_preserves_contract():
    """Verify FlightProvider produces normalized flight options preserving required fields."""
    provider = FlightProvider(timeout_seconds=2)
    options = provider.search_flights(
        origin_iata="JFK",
        dest_iata="LHR",
        departure_date=datetime(2026, 10, 15),
        adults=1,
        cabin_class="ECONOMY",
        currency="USD",
    )

    assert len(options) > 0
    for opt in options:
        # Check mandatory preserved fields
        assert opt.price > 0.0
        assert isinstance(opt.price, float)
        assert opt.currency == "USD"
        assert isinstance(opt.departure, str) and len(opt.departure) > 0
        assert isinstance(opt.arrival, str) and len(opt.arrival) > 0
        assert opt.duration > 0.0
        assert opt.availability is True
        assert "provider" in opt.model_dump() and len(opt.provider) > 0
        assert isinstance(opt.last_updated, str) and len(opt.last_updated) > 0

        # Check aviation specific fields
        assert opt.mode == "FLIGHT"
        assert opt.flight_number is not None
        assert opt.airline_code is not None


def test_flight_provider_timeout_and_error_handling():
    """Verify flight provider handles upstream timeouts and authentication failures gracefully."""
    provider = FlightProvider(timeout_seconds=1)
    provider.amadeus_client_id = "mock_client_id"
    provider.amadeus_client_secret = "mock_client_secret"

    # Simulate network timeout during token request
    with patch("urllib.request.urlopen", side_effect=TimeoutError("Connection timed out")):
        # Must not crash, should fall back to deterministic IATA calculation engine
        options = provider.search_flights("ORD", "LAX")
        assert len(options) > 0
        assert options[0].price > 0.0

    # Health check under error
    with patch("urllib.request.urlopen", side_effect=Exception("Server Down")):
        health = provider.health_check()
        assert health.status in ("DEGRADED", "OPERATIONAL")
        assert health.category == "FLIGHT"


def test_train_provider_search_preserves_contract():
    """Verify TrainProvider produces normalized rail options preserving required fields."""
    provider = TrainProvider(timeout_seconds=2)
    options = provider.search_train_options(
        origin_station="Penn Station New York",
        dest_station="30th Street Station Philadelphia",
        origin_lat=40.7505,
        origin_lon=-73.9935,
        dest_lat=39.9558,
        dest_lon=-75.1820,
        currency="USD",
    )

    assert len(options) > 0
    for opt in options:
        # Mandatory preserved fields
        assert opt.price > 0.0
        assert opt.currency == "USD"
        assert isinstance(opt.departure, str)
        assert isinstance(opt.arrival, str)
        assert opt.duration > 0.0
        assert opt.availability is True
        assert len(opt.provider) > 0
        assert len(opt.last_updated) > 0

        # Rail specific fields
        assert opt.mode == "TRAIN"
        assert opt.train_number is not None
        assert opt.operator_name is not None


def test_train_provider_live_api_and_fallback_timeout():
    """Verify train provider handles live API fetch and handles timeouts without crashing."""
    provider = TrainProvider(timeout_seconds=1)

    with patch("urllib.request.urlopen", side_effect=TimeoutError("Network timeout")):
        # Must gracefully fall back to rail schedule engine
        options = provider.search_train_options("Station A", "Station B", 40.0, -74.0, 41.0, -73.0)
        assert len(options) > 0
        assert options[0].price > 0.0
        assert options[0].mode == "TRAIN"


def test_ground_provider_search_preserves_contract():
    """Verify GroundTransportProvider calculates road routes and metered options preserving required fields."""
    provider = GroundTransportProvider(timeout_seconds=2)
    # NYC Manhattan to JFK Airport
    options = provider.search_ground_options(
        origin_lat=40.7580,
        origin_lon=-73.9855,
        dest_lat=40.6413,
        dest_lon=-73.7781,
        origin_name="Times Square",
        dest_name="JFK Airport",
        currency="USD",
    )

    assert len(options) >= 3
    vehicle_types = {opt.vehicle_type for opt in options}
    assert "TAXI" in vehicle_types
    assert "RIDEHAIL" in vehicle_types

    for opt in options:
        assert opt.price > 0.0
        assert opt.currency == "USD"
        assert isinstance(opt.departure, str)
        assert isinstance(opt.arrival, str)
        assert opt.duration > 0.0
        assert opt.availability is True
        assert len(opt.provider) > 0
        assert len(opt.last_updated) > 0

        assert opt.mode == "VEHICLE"
        assert opt.distance_km > 0.0
        assert "base_fare" in opt.fare_breakdown


def test_ground_provider_timeout_handling():
    """Verify GroundTransportProvider falls back to terrestrial curvature on timeout."""
    provider = GroundTransportProvider(timeout_seconds=1)

    with patch("urllib.request.urlopen", side_effect=TimeoutError("OSRM timed out")):
        dist, dur, delay = provider.get_route_and_eta(40.7, -74.0, 40.8, -73.9)
        assert dist > 0.0
        assert dur > 0.0
        assert delay >= 1.5


def test_location_provider_geocoding_and_reverse():
    """Verify LocationProvider performs geocoding and reverse geocoding."""
    provider = LocationProvider(timeout_seconds=3)

    # 1. Search major city
    results = provider.search_locations("London", limit=2)
    assert len(results) > 0
    assert results[0].latitude != 0.0
    assert results[0].longitude != 0.0
    assert results[0].provider is not None
    assert results[0].last_updated is not None

    # 2. Offline fallback catalog
    fallback_res = provider._fallback_locations("New York")
    assert len(fallback_res) > 0
    assert fallback_res[0].city == "New York"


def test_location_provider_timeout_handling():
    """Verify LocationProvider falls back cleanly when external APIs time out."""
    provider = LocationProvider(timeout_seconds=1)

    with patch("urllib.request.urlopen", side_effect=TimeoutError("Nominatim down")):
        res = provider.search_locations("Paris", limit=1)
        assert len(res) > 0
        assert res[0].city == "Paris"


def test_fastapi_provider_endpoints_integration():
    """Test full HTTP API endpoints for all providers."""
    # 1. Health probe
    resp_health = client.get("/api/v1/providers/health")
    assert resp_health.status_code == 200
    health_data = resp_health.json()
    assert len(health_data) == 4
    categories = {item["category"] for item in health_data}
    assert categories == {"FLIGHT", "TRAIN", "GROUND", "LOCATION"}

    # 2. Flight search API
    resp_flt = client.get(
        "/api/v1/providers/flights/search",
        params={"origin": "JFK", "destination": "LHR", "departure_date": "2026-11-20", "adults": 1},
    )
    assert resp_flt.status_code == 200
    flt_data = resp_flt.json()
    assert len(flt_data) > 0
    first_flt = flt_data[0]
    assert "price" in first_flt
    assert "currency" in first_flt
    assert "departure" in first_flt
    assert "arrival" in first_flt
    assert "duration" in first_flt
    assert "availability" in first_flt
    assert "provider" in first_flt
    assert "last_updated" in first_flt

    # 3. Train search API
    resp_trn = client.get(
        "/api/v1/providers/trains/search",
        params={"origin_station": "Boston South Station", "dest_station": "New York Penn"},
    )
    assert resp_trn.status_code == 200
    trn_data = resp_trn.json()
    assert len(trn_data) > 0
    first_trn = trn_data[0]
    assert first_trn["price"] > 0
    assert first_trn["currency"] == "USD"
    assert first_trn["mode"] == "TRAIN"

    # 4. Ground transport search API
    resp_grd = client.get(
        "/api/v1/providers/ground/search",
        params={
            "origin_lat": 40.7580,
            "origin_lon": -73.9855,
            "dest_lat": 40.6413,
            "dest_lon": -73.7781,
        },
    )
    assert resp_grd.status_code == 200
    grd_data = resp_grd.json()
    assert len(grd_data) > 0
    first_grd = grd_data[0]
    assert first_grd["mode"] == "VEHICLE"
    assert first_grd["price"] > 0

    # 5. Locations search API
    resp_loc = client.get("/api/v1/providers/locations/search", params={"query": "London", "limit": 2})
    assert resp_loc.status_code == 200
    loc_data = resp_loc.json()
    assert len(loc_data) > 0
    assert "latitude" in loc_data[0]
    assert "longitude" in loc_data[0]
