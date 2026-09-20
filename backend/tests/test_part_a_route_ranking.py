import pytest
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient

from backend.main import app
from backend.part_a.schemas.route_search import RouteOption, RouteSearchSegment
from backend.part_a.schemas.traveler_preference import (
    TravelerPreferenceBase,
    CabinClass,
    SeatPreference,
)
from backend.part_a.services.route_ranking_service import (
    RouteRankingService,
    rank_by_cheapest,
    rank_by_fastest,
    rank_by_comfort,
    calculate_comfort_score,
    extract_segment_reliability,
    format_minutes_to_duration,
)
from backend.part_a.schemas.route_ranking import RouteRankingRequest

client = TestClient(app)


def create_mock_segment(
    seg_id: str,
    mode: str = "FLIGHT",
    provider: str = "Test Carrier",
    price: float = 100.0,
    duration: float = 120.0,
    origin: str = "City A",
    destination: str = "City B",
    identifier: str = "TC-101",
    details: dict = None,
    sequence_order: int = 1,
) -> RouteSearchSegment:
    base_time = datetime(2026, 11, 15, 10, 0, 0, tzinfo=timezone.utc)
    return RouteSearchSegment(
        id=seg_id,
        sequence_order=sequence_order,
        mode=mode,
        provider=provider,
        price=price,
        currency="USD",
        departure=base_time.isoformat(),
        arrival=(base_time + timedelta(minutes=duration)).isoformat(),
        duration=duration,
        origin=origin,
        destination=destination,
        identifier=identifier,
        details=details or {},
    )


def create_mock_route(
    route_id: str,
    title: str,
    total_price: float,
    total_duration: float,
    waiting_time: float = 0.0,
    transfer_count: int = 0,
    segments: list = None,
    status: str = "AVAILABLE",
) -> RouteOption:
    base_time = datetime(2026, 11, 15, 10, 0, 0, tzinfo=timezone.utc)
    if segments is None:
        segments = [
            create_mock_segment(
                seg_id=f"{route_id}-seg-1",
                price=total_price,
                duration=total_duration,
            )
        ]
    return RouteOption(
        id=route_id,
        title=title,
        total_price=total_price,
        currency="USD",
        total_duration=total_duration,
        waiting_time=waiting_time,
        transfer_count=transfer_count,
        departure=base_time.isoformat(),
        arrival=(base_time + timedelta(minutes=total_duration)).isoformat(),
        segments=segments,
        provider="MultiModal Fleet",
        last_updated=base_time.isoformat(),
        status=status,
    )


# ============================================================================
# 1. CHEAPEST RANKING TESTS
# ============================================================================

def test_cheapest_ranks_by_lowest_valid_price():
    """Verify Cheapest ranks strictly by lowest valid total price."""
    r1 = create_mock_route("R1", "Mid Price", total_price=150.0, total_duration=120.0)
    r2 = create_mock_route("R2", "Cheapest Price", total_price=75.0, total_duration=300.0)
    r3 = create_mock_route("R3", "Expensive Price", total_price=350.0, total_duration=90.0)

    ranked = rank_by_cheapest([r1, r2, r3])
    assert [r.id for r in ranked] == ["R2", "R1", "R3"]
    assert ranked[0].total_price == 75.0


def test_cheapest_deterministic_tie_breaking():
    """When prices are equal, Cheapest tie-breaks deterministically by duration, then transfers, then ID."""
    # Same price: 100.0
    r_longer = create_mock_route("R-LONG", "Long", total_price=100.0, total_duration=240.0, transfer_count=1)
    r_shorter = create_mock_route("R-SHORT", "Short", total_price=100.0, total_duration=180.0, transfer_count=1)
    r_same_dur_fewer_transfers = create_mock_route("R-DIRECT", "Direct", total_price=100.0, total_duration=180.0, transfer_count=0)

    ranked = rank_by_cheapest([r_longer, r_shorter, r_same_dur_fewer_transfers])
    # r_same_dur_fewer_transfers wins because duration=180, transfers=0 vs 1
    assert ranked[0].id == "R-DIRECT"
    assert ranked[1].id == "R-SHORT"
    assert ranked[2].id == "R-LONG"


def test_cheapest_filters_invalid_prices_and_sold_out():
    """Verify Cheapest rejects negative prices and SOLD_OUT routes."""
    r_valid = create_mock_route("R-VAL", "Valid", total_price=120.0, total_duration=150.0)
    # Use model_construct to test handling of corrupted negative price records
    r_negative = RouteOption.model_construct(
        id="R-NEG",
        title="Negative",
        total_price=-50.0,
        currency="USD",
        total_duration=60.0,
        waiting_time=0.0,
        transfer_count=0,
        departure=r_valid.departure,
        arrival=r_valid.arrival,
        segments=[],
        provider="Corrupted",
        last_updated=r_valid.last_updated,
        status="AVAILABLE",
    )
    r_sold_out = create_mock_route("R-SOLD", "Sold Out", total_price=30.0, total_duration=80.0, status="SOLD_OUT")

    ranked = rank_by_cheapest([r_valid, r_negative, r_sold_out])
    assert len(ranked) == 1
    assert ranked[0].id == "R-VAL"


# ============================================================================
# 2. FASTEST RANKING TESTS
# ============================================================================

def test_fastest_ranks_by_shortest_valid_duration():
    """Verify Fastest ranks strictly by shortest valid total duration."""
    r1 = create_mock_route("R1", "Moderate Duration", total_price=100.0, total_duration=180.0)
    r2 = create_mock_route("R2", "Fastest Duration", total_price=250.0, total_duration=75.0)
    r3 = create_mock_route("R3", "Long Duration", total_price=50.0, total_duration=480.0)

    ranked = rank_by_fastest([r1, r2, r3])
    assert [r.id for r in ranked] == ["R2", "R1", "R3"]
    assert ranked[0].total_duration == 75.0


def test_fastest_deterministic_tie_breaking():
    """When durations are equal, Fastest tie-breaks deterministically by price, then transfers, then ID."""
    r_expensive = create_mock_route("R-EXP", "Expensive", total_price=200.0, total_duration=90.0, transfer_count=0)
    r_cheaper = create_mock_route("R-CHEAP", "Cheaper", total_price=120.0, total_duration=90.0, transfer_count=0)

    ranked = rank_by_fastest([r_expensive, r_cheaper])
    assert ranked[0].id == "R-CHEAP"
    assert ranked[1].id == "R-EXP"


def test_fastest_filters_invalid_durations_and_sold_out():
    """Verify Fastest rejects non-positive durations and SOLD_OUT routes."""
    r_valid = create_mock_route("R-VAL", "Valid", total_price=100.0, total_duration=120.0)
    r_zero_dur = create_mock_route("R-ZERO", "Zero", total_price=50.0, total_duration=0.0)
    r_sold_out = create_mock_route("R-SOLD", "Sold Out", total_price=80.0, total_duration=45.0, status="SOLD_OUT")

    ranked = rank_by_fastest([r_valid, r_zero_dur, r_sold_out])
    assert len(ranked) == 1
    assert ranked[0].id == "R-VAL"


# ============================================================================
# 3. MOST COMFORTABLE RANKING TESTS
# ============================================================================

def test_comfort_transfer_count_impact():
    """Verify route with 0 transfers scores significantly higher than 1 or 3 transfers."""
    r_direct = create_mock_route("R-DIR", "Direct", total_price=100.0, total_duration=180.0, waiting_time=0.0, transfer_count=0)
    r_1_stop = create_mock_route("R-1ST", "1 Stop", total_price=100.0, total_duration=180.0, waiting_time=30.0, transfer_count=1)
    r_3_stops = create_mock_route("R-3ST", "3 Stops", total_price=100.0, total_duration=180.0, waiting_time=90.0, transfer_count=3)

    score_dir, factors_dir = calculate_comfort_score(r_direct)
    score_1st, factors_1st = calculate_comfort_score(r_1_stop)
    score_3st, factors_3st = calculate_comfort_score(r_3_stops)

    assert score_dir > score_1st > score_3st
    assert factors_dir["transfers"]["penalty"] == 0.0
    assert factors_1st["transfers"]["penalty"] == 12.0
    assert factors_3st["transfers"]["penalty"] > 24.0


def test_comfort_waiting_time_impact():
    """Verify excessive waiting/layover time penalizes comfort score."""
    r_short_wait = create_mock_route("R-SW", "Short Layover", total_price=100.0, total_duration=200.0, waiting_time=25.0, transfer_count=1)
    r_long_wait = create_mock_route("R-LW", "Long Layover", total_price=100.0, total_duration=360.0, waiting_time=185.0, transfer_count=1)

    score_sw, factors_sw = calculate_comfort_score(r_short_wait)
    score_lw, factors_lw = calculate_comfort_score(r_long_wait)

    assert score_sw > score_lw
    assert factors_lw["waiting_time"]["penalty"] > factors_sw["waiting_time"]["penalty"]


def test_comfort_journey_duration_impact():
    """Verify shorter travel duration receives higher comfort score than prolonged duration."""
    r_short = create_mock_route("R-S", "Short Trip", total_price=100.0, total_duration=90.0, transfer_count=0)
    r_long = create_mock_route("R-L", "Long Trip", total_price=100.0, total_duration=600.0, transfer_count=0)

    score_s, factors_s = calculate_comfort_score(r_short)
    score_l, factors_l = calculate_comfort_score(r_long)

    assert score_s > score_l
    assert factors_l["journey_duration"]["penalty"] > factors_s["journey_duration"]["penalty"]


def test_comfort_reliability_when_available_and_omitted_when_missing():
    """
    CRITICAL RULE: Do not invent reliability data.
    When provider details report reliability -> factor is included with score.
    When provider details DO NOT report reliability -> available=False, score=None, impact=0.0.
    """
    # 1. Segment with genuine verified reliability
    seg_reliable = create_mock_segment(
        "SEG-REL",
        details={"reliability": 0.95, "aircraft": "A320"},
    )
    r_with_rel = create_mock_route("R-REL", "With Real Reliability", total_price=100.0, total_duration=120.0, segments=[seg_reliable])

    score_rel, factors_rel = calculate_comfort_score(r_with_rel)
    assert factors_rel["reliability"]["available"] is True
    assert factors_rel["reliability"]["score"] == 0.95
    assert factors_rel["reliability"]["impact"] > 0.0
    assert "95.0%" in factors_rel["reliability"]["explanation"]

    # 2. Segment without any reliability data: MUST NOT invent data
    seg_no_rel = create_mock_segment(
        "SEG-NO-REL",
        details={"aircraft": "A320"},  # No reliability keys
    )
    r_no_rel = create_mock_route("R-NO-REL", "No Reliability Reported", total_price=100.0, total_duration=120.0, segments=[seg_no_rel])

    score_no_rel, factors_no_rel = calculate_comfort_score(r_no_rel)
    assert factors_no_rel["reliability"]["available"] is False
    assert factors_no_rel["reliability"]["score"] is None
    assert factors_no_rel["reliability"]["impact"] == 0.0
    assert "omitted" in factors_no_rel["reliability"]["explanation"].lower()


def test_comfort_low_reliability_deducts_points():
    """Verify that a poorly performing carrier (e.g. 50% on-time) incurs a negative impact."""
    seg_poor = create_mock_segment(
        "SEG-POOR",
        details={"on_time_performance": 0.50},
    )
    r_poor = create_mock_route("R-POOR", "Poor On-Time", total_price=100.0, total_duration=120.0, segments=[seg_poor])
    score_poor, factors_poor = calculate_comfort_score(r_poor)

    assert factors_poor["reliability"]["available"] is True
    assert factors_poor["reliability"]["impact"] < 0.0


def test_comfort_traveler_preferences_mode_and_airline():
    """Verify traveler preferences reward matching transport modes, airlines, and cabin class."""
    seg_flight = create_mock_segment(
        "SEG-FLT",
        mode="FLIGHT",
        provider="IndiGo Airlines",
        identifier="6E-204",
    )
    seg_bus = create_mock_segment(
        "SEG-BUS",
        mode="BUS",
        provider="Intercity Express",
        identifier="BUS-99",
    )

    r_flight = create_mock_route("R-FLT", "Flight Route", total_price=120.0, total_duration=120.0, segments=[seg_flight])
    r_bus = create_mock_route("R-BUS", "Bus Route", total_price=120.0, total_duration=120.0, segments=[seg_bus])

    pref = TravelerPreferenceBase(
        cabin_class=CabinClass.BUSINESS,
        preferred_airlines=["INDIGO"],
        preferred_transport_modes=["FLIGHT", "TRAIN"],
        max_waiting_time_minutes=60,
        max_stops=0,
    )

    score_flight, factors_flight = calculate_comfort_score(r_flight, preferences=pref)
    score_bus, factors_bus = calculate_comfort_score(r_bus, preferences=pref)

    assert score_flight > score_bus
    assert factors_flight["traveler_preferences"]["applied"] is True
    assert factors_flight["traveler_preferences"]["airline_match"] is True
    assert factors_flight["traveler_preferences"]["mode_match_ratio"] == 1.0
    assert factors_flight["traveler_preferences"]["cabin_class_bonus"] == 10.0

    assert factors_bus["traveler_preferences"]["airline_match"] is False
    assert factors_bus["traveler_preferences"]["mode_match_ratio"] == 0.0


def test_comfort_exceeding_traveler_max_stops_and_wait():
    """Verify exceeding traveler's max stops and wait thresholds adds additional targeted penalties."""
    r_excess = create_mock_route(
        "R-EXCESS",
        "Excess Stops and Wait",
        total_price=100.0,
        total_duration=300.0,
        waiting_time=150.0,
        transfer_count=2,
    )

    pref_strict = TravelerPreferenceBase(
        max_waiting_time_minutes=60,
        max_stops=0,
    )

    score, factors = calculate_comfort_score(r_excess, preferences=pref_strict)
    assert factors["transfers"]["exceeds_preferred_stops"] is True
    assert factors["waiting_time"]["exceeds_max_preferred"] is True


def test_ranking_determinism():
    """Verify that multiple ranking executions produce exactly identical rankings and factor scores."""
    r1 = create_mock_route("R1", "Option 1", total_price=100.0, total_duration=120.0, transfer_count=0)
    r2 = create_mock_route("R2", "Option 2", total_price=80.0, total_duration=180.0, transfer_count=1)
    r3 = create_mock_route("R3", "Option 3", total_price=140.0, total_duration=90.0, transfer_count=0)
    routes = [r1, r2, r3]

    service = RouteRankingService()
    pref = TravelerPreferenceBase(preferred_transport_modes=["FLIGHT"])

    res1 = service.rank_routes(routes, preferences=pref)
    for _ in range(50):
        res2 = service.rank_routes(routes, preferences=pref)
        assert res1.cheapest.route.id == res2.cheapest.route.id
        assert res1.cheapest.score == res2.cheapest.score
        assert res1.fastest.route.id == res2.fastest.route.id
        assert res1.fastest.score == res2.fastest.score
        assert res1.most_comfortable.route.id == res2.most_comfortable.route.id
        assert res1.most_comfortable.score == res2.most_comfortable.score


# ============================================================================
# 4. FULL SERVICE & API ENDPOINT VERIFICATION
# ============================================================================

def test_service_returns_cheapest_fastest_most_comfortable_and_all_routes():
    """
    Test that the ranking response returns:
      - cheapest
      - fastest
      - most_comfortable
      - all_routes
    along with detailed factors for each.
    """
    service = RouteRankingService()

    # Route A: Cheap but slow (Coach)
    route_a = create_mock_route("R-CHEAP", "Budget Bus", total_price=30.0, total_duration=480.0, transfer_count=1, waiting_time=45.0)

    # Route B: Fast but expensive (Flight)
    route_b = create_mock_route("R-FAST", "Express Flight", total_price=220.0, total_duration=75.0, transfer_count=0, waiting_time=0.0)

    # Route C: Balanced high comfort (High-speed Rail, 0 transfers, roomy, moderate speed)
    route_c = create_mock_route("R-COMFORT", "Premium Rail", total_price=85.0, total_duration=120.0, transfer_count=0, waiting_time=0.0)

    routes = [route_a, route_b, route_c]
    res = service.rank_routes(routes)

    # Return structure verification
    assert res.cheapest is not None
    assert res.fastest is not None
    assert res.most_comfortable is not None
    assert len(res.all_routes) == 3

    # 1. Cheapest is Route A
    assert res.cheapest.category == "CHEAPEST"
    assert res.cheapest.route.id == "R-CHEAP"
    assert res.cheapest.score == 30.0
    assert "total_price" in res.cheapest.factors
    assert "summary" in res.cheapest.factors

    # 2. Fastest is Route B
    assert res.fastest.category == "FASTEST"
    assert res.fastest.route.id == "R-FAST"
    assert res.fastest.score == 75.0
    assert "total_duration_minutes" in res.fastest.factors
    assert "time_saved_vs_cheapest_minutes" in res.fastest.factors

    # 3. Most Comfortable has highest comfort score
    assert res.most_comfortable.category == "MOST_COMFORTABLE"
    assert res.most_comfortable.score > 0
    assert "comfort_score" in res.most_comfortable.factors
    assert "transfers" in res.most_comfortable.factors
    assert "waiting_time" in res.most_comfortable.factors
    assert "journey_duration" in res.most_comfortable.factors
    assert "reliability" in res.most_comfortable.factors
    assert "traveler_preferences" in res.most_comfortable.factors


def test_fastapi_post_routes_rank_endpoint():
    """Verify POST /routes/rank endpoint behaves as expected and returns all 4 keys."""
    r1 = create_mock_route("R-API-1", "Direct Flight", total_price=150.0, total_duration=90.0, transfer_count=0)
    r2 = create_mock_route("R-API-2", "Economy Train", total_price=45.0, total_duration=360.0, transfer_count=1, waiting_time=30.0)

    payload = {
        "routes": [r1.model_dump(), r2.model_dump()],
        "traveler_preferences": {
            "cabin_class": "ECONOMY",
            "preferred_airlines": [],
            "preferred_transport_modes": ["FLIGHT", "TRAIN"],
            "max_waiting_time_minutes": 120,
            "max_stops": 1,
        }
    }

    resp = client.post("/routes/rank", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert "cheapest" in data
    assert "fastest" in data
    assert "most_comfortable" in data
    assert "all_routes" in data

    # Cheapest is Train ($45)
    assert data["cheapest"]["route"]["id"] == "R-API-2"
    assert data["cheapest"]["score"] == 45.0
    assert data["cheapest"]["factors"]["total_price"] == 45.0

    # Fastest is Flight (90m)
    assert data["fastest"]["route"]["id"] == "R-API-1"
    assert data["fastest"]["score"] == 90.0
    assert data["fastest"]["factors"]["total_duration_minutes"] == 90.0

    # Most Comfortable has factors
    assert data["most_comfortable"]["route"]["id"] == "R-API-1"
    assert data["most_comfortable"]["factors"]["comfort_score"] > 0
    assert data["most_comfortable"]["factors"]["reliability"]["available"] is False
    assert len(data["all_routes"]) == 2
