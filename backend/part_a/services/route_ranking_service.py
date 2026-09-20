import logging
from typing import List, Optional, Tuple, Dict, Any
from backend.part_a.schemas.route_search import RouteOption, RouteSearchSegment
from backend.part_a.schemas.traveler_preference import TravelerPreferenceBase
from backend.part_a.schemas.route_ranking import (
    RankedRecommendation,
    RouteRankingResponse,
    ComfortFactors,
    CheapestFactors,
    FastestFactors,
    TransferImpactFactor,
    WaitingTimeImpactFactor,
    JourneyDurationImpactFactor,
    ReliabilityImpactFactor,
    TravelerPreferenceImpactFactor,
)

logger = logging.getLogger(__name__)


def format_minutes_to_duration(minutes: float) -> str:
    """Formats float minutes into a clean 'Xh Ym' or 'Ym' string."""
    mins = max(0.0, float(minutes))
    h = int(mins // 60)
    m = int(round(mins % 60))
    if h > 0:
        return f"{h}h {m}m" if m > 0 else f"{h}h"
    return f"{m}m"


def extract_segment_reliability(segment: RouteSearchSegment) -> Optional[float]:
    """
    Extracts provider-reported reliability or on-time performance if genuine data exists.
    CRITICAL: Does NOT invent or synthesize reliability metrics if not present.
    Returns float between 0.0 and 1.0, or None if no real data is provided.
    """
    if not segment.details:
        return None

    # Check known provider reliability and on-time performance keys
    reliability_keys = [
        "reliability",
        "reliability_score",
        "on_time_performance",
        "on_time_rate",
        "punctuality",
        "on_time_percentage",
    ]

    for key in reliability_keys:
        if key in segment.details and segment.details[key] is not None:
            raw_val = segment.details[key]
            try:
                val_float = float(raw_val)
                # Normalize 0-100 scale to 0.0-1.0
                if val_float > 1.0:
                    val_float = val_float / 100.0
                return max(0.0, min(1.0, val_float))
            except (ValueError, TypeError):
                continue

    return None


def calculate_comfort_score(
    route: RouteOption,
    preferences: Optional[TravelerPreferenceBase] = None,
    candidate_routes: Optional[List[RouteOption]] = None,
) -> Tuple[float, Dict[str, Any]]:
    """
    Deterministically computes the comfort score (0.0 to 100.0) based on:
      1. Transfer count
      2. Waiting time
      3. Journey duration
      4. Reliability when available (strictly omitted if not reported; no fake data invented)
      5. Traveler preferences (mode alignment, preferred airlines, cabin class, max stops/wait limits)

    Returns (comfort_score, factors_dict).
    """
    base_score = 80.0

    # 1. TRANSFER COUNT FACTOR
    # Each transfer adds friction (baggage handling, gate shifts, stress)
    tc = max(0, int(route.transfer_count))
    if tc == 0:
        transfer_penalty = 0.0
    elif tc == 1:
        transfer_penalty = 12.0
    elif tc == 2:
        transfer_penalty = 24.0
    else:
        # 3 or more transfers incur steep penalties
        transfer_penalty = 24.0 + (tc - 2) * 15.0

    preferred_max_stops = preferences.max_stops if preferences else None
    exceeds_preferred_stops = False
    if preferred_max_stops is not None and tc > preferred_max_stops:
        exceeds_preferred_stops = True
        transfer_penalty += (tc - preferred_max_stops) * 15.0

    transfer_penalty = round(transfer_penalty, 2)

    # 2. WAITING TIME FACTOR
    # Layovers cause fatigue; buffers above normal transit thresholds degrade comfort
    wait_mins = max(0.0, float(route.waiting_time))
    if wait_mins <= 30.0:
        waiting_penalty = (wait_mins / 30.0) * 3.0
    elif wait_mins <= 120.0:
        waiting_penalty = 3.0 + ((wait_mins - 30.0) / 60.0) * 6.0
    else:
        waiting_penalty = 12.0 + ((wait_mins - 120.0) / 60.0) * 8.0

    preferred_max_wait = preferences.max_waiting_time_minutes if preferences else None
    exceeds_max_preferred_wait = False
    if preferred_max_wait is not None and wait_mins > preferred_max_wait:
        exceeds_max_preferred_wait = True
        excess_wait = wait_mins - preferred_max_wait
        waiting_penalty += (excess_wait / 30.0) * 8.0

    waiting_penalty = round(waiting_penalty, 2)

    # 3. JOURNEY DURATION FACTOR
    # Prolonged transit causes physical exhaustion
    total_dur_mins = max(0.0, float(route.total_duration))
    # Base duration rate: ~2.5 points per hour
    duration_penalty = (total_dur_mins / 60.0) * 2.5

    # If candidate set provided, apply relative duration penalty vs shortest available option
    if candidate_routes and len(candidate_routes) > 1:
        valid_durations = [r.total_duration for r in candidate_routes if r.total_duration > 0]
        if valid_durations:
            min_dur = min(valid_durations)
            if total_dur_mins > min_dur:
                rel_overhead = (total_dur_mins - min_dur) / max(min_dur, 1.0)
                duration_penalty += min(15.0, rel_overhead * 10.0)

    duration_penalty = round(min(35.0, duration_penalty), 2)

    # 4. RELIABILITY FACTOR (WHEN AVAILABLE ONLY)
    # STRICT COMPLIANCE: Do not invent reliability data!
    segment_reliabilities = [
        extract_segment_reliability(s) for s in (route.segments or [])
    ]
    valid_reliabilities = [r for r in segment_reliabilities if r is not None]

    if valid_reliabilities:
        # Genuine provider data exists
        avg_reliability = sum(valid_reliabilities) / len(valid_reliabilities)
        # Benchmark against 80% on-time baseline: 95% gives +3.0 pts, 65% gives -3.0 pts
        reliability_impact = round((avg_reliability - 0.80) * 20.0, 2)
        reliability_info = {
            "available": True,
            "score": round(avg_reliability, 3),
            "impact": reliability_impact,
            "segment_count_with_data": len(valid_reliabilities),
            "explanation": (
                f"Verified provider reliability reported at {avg_reliability * 100:.1f}% "
                f"({'+' if reliability_impact >= 0 else ''}{reliability_impact:.1f} pts)"
            ),
        }
    else:
        # No reliability reported by transport providers: DO NOT INVENT DATA
        reliability_impact = 0.0
        reliability_info = {
            "available": False,
            "score": None,
            "impact": 0.0,
            "segment_count_with_data": 0,
            "explanation": "No provider reliability metrics reported; omitted from calculation without fabricating data",
        }

    # 5. TRAVELER PREFERENCES FACTOR
    applied_preferences = False
    mode_match_ratio = 1.0
    mode_bonus = 0.0
    preferred_modes_list = []
    airline_matched = False
    cabin_class_name = "ECONOMY"
    cabin_class_bonus = 0.0

    if preferences is not None:
        applied_preferences = True

        # Mode alignment
        preferred_modes = {m.strip().upper() for m in (preferences.preferred_transport_modes or [])}
        preferred_modes_list = sorted(list(preferred_modes))
        if preferred_modes and route.segments:
            match_count = sum(
                1 for s in route.segments if s.mode and s.mode.strip().upper() in preferred_modes
            )
            mode_match_ratio = round(match_count / len(route.segments), 2)
            # Bonus/penalty scaled between -5.0 (0% match) to +5.0 (100% match)
            mode_bonus = round((mode_match_ratio - 0.5) * 10.0, 2)
        elif preferred_modes and not route.segments:
            mode_match_ratio = 1.0
            mode_bonus = 0.0

        # Preferred airline alignment
        preferred_airlines = {a.strip().upper() for a in (preferences.preferred_airlines or [])}
        if preferred_airlines and route.segments:
            for seg in route.segments:
                prov = (seg.provider or "").strip().upper()
                ident = (seg.identifier or "").strip().upper()
                if any(pa in prov or pa in ident for pa in preferred_airlines):
                    airline_matched = True
                    break

        # Cabin class comfort bonus
        cabin_class_name = str(preferences.cabin_class).split(".")[-1].upper()
        if cabin_class_name in ("FIRST", "1ST"):
            cabin_class_bonus = 15.0
        elif cabin_class_name in ("BUSINESS", "BIZ"):
            cabin_class_bonus = 10.0
        elif cabin_class_name in ("PREMIUM_ECONOMY", "PREMIUM"):
            cabin_class_bonus = 5.0
        else:
            cabin_class_bonus = 0.0

    airline_bonus = 5.0 if airline_matched else 0.0
    preference_adjustment = round(mode_bonus + airline_bonus + cabin_class_bonus, 2)

    # FINAL COMPOSITE COMFORT SCORE
    raw_score = (
        base_score
        - transfer_penalty
        - waiting_penalty
        - duration_penalty
        + reliability_impact
        + preference_adjustment
    )
    final_score = round(max(0.0, min(100.0, raw_score)), 2)

    # Build human-readable rationales
    rationales = []
    if tc == 0:
        rationales.append("Direct journey with zero transfers")
    else:
        rationales.append(f"{tc} transfer{'s' if tc > 1 else ''} ({transfer_penalty:+.1f} pts)")

    if wait_mins > 0:
        rationales.append(f"{format_minutes_to_duration(wait_mins)} layover ({waiting_penalty:+.1f} pts)")
    else:
        rationales.append("Zero waiting time")

    rationales.append(f"{format_minutes_to_duration(total_dur_mins)} duration ({duration_penalty:+.1f} pts)")

    if reliability_info["available"]:
        rationales.append(f"Reliability: {reliability_info['score'] * 100:.1f}% ({reliability_impact:+.1f} pts)")
    else:
        rationales.append("Reliability: omitted (unreported)")

    if applied_preferences:
        pref_items = []
        if mode_bonus != 0.0:
            pref_items.append(f"mode alignment ({mode_bonus:+.1f} pts)")
        if airline_matched:
            pref_items.append("preferred airline (+5.0 pts)")
        if cabin_class_bonus > 0.0:
            pref_items.append(f"{cabin_class_name} cabin (+{cabin_class_bonus:.1f} pts)")
        if pref_items:
            rationales.append(f"Preferences: {', '.join(pref_items)}")

    summary_text = f"Comfort Score {final_score}/100 based on: {'; '.join(rationales)}."

    factors = {
        "comfort_score": final_score,
        "transfer_count": tc,
        "transfers": {
            "count": tc,
            "penalty": transfer_penalty,
            "preferred_max_stops": preferred_max_stops,
            "exceeds_preferred_stops": exceeds_preferred_stops,
        },
        "waiting_time": {
            "total_minutes": wait_mins,
            "penalty": waiting_penalty,
            "preferred_max_waiting_time": preferred_max_wait,
            "exceeds_max_preferred": exceeds_max_preferred_wait,
        },
        "journey_duration": {
            "total_minutes": total_dur_mins,
            "formatted_duration": format_minutes_to_duration(total_dur_mins),
            "penalty": duration_penalty,
        },
        "reliability": reliability_info,
        "traveler_preferences": {
            "applied": applied_preferences,
            "preferred_modes": preferred_modes_list,
            "mode_match_ratio": mode_match_ratio,
            "mode_bonus": mode_bonus,
            "airline_match": airline_matched,
            "cabin_class": cabin_class_name,
            "cabin_class_bonus": cabin_class_bonus,
        },
        "summary": summary_text,
    }

    return final_score, factors


def rank_by_cheapest(routes: List[RouteOption]) -> List[RouteOption]:
    """
    CHEAPEST RANKING:
    Ranks routes by lowest valid total price.
    Deterministic tie-breakers: (total_price, total_duration, transfer_count, id).
    Filters out invalid prices (None or negative) and SOLD_OUT routes.
    """
    valid_routes = [
        r for r in routes
        if r.total_price is not None and r.total_price >= 0.0 and r.status != "SOLD_OUT"
    ]
    return sorted(
        valid_routes,
        key=lambda r: (r.total_price, r.total_duration, r.transfer_count, r.id),
    )


def rank_by_fastest(routes: List[RouteOption]) -> List[RouteOption]:
    """
    FASTEST RANKING:
    Ranks routes by shortest valid total duration.
    Deterministic tie-breakers: (total_duration, total_price, transfer_count, id).
    Filters out invalid durations (None or <= 0) and SOLD_OUT routes.
    """
    valid_routes = [
        r for r in routes
        if r.total_duration is not None and r.total_duration > 0.0 and r.status != "SOLD_OUT"
    ]
    return sorted(
        valid_routes,
        key=lambda r: (r.total_duration, r.total_price, r.transfer_count, r.id),
    )


def rank_by_comfort(
    routes: List[RouteOption],
    preferences: Optional[TravelerPreferenceBase] = None,
) -> List[Tuple[RouteOption, float, Dict[str, Any]]]:
    """
    MOST COMFORTABLE RANKING:
    Ranks routes by highest deterministic comfort score.
    Deterministic tie-breakers: (-comfort_score, transfer_count, waiting_time, total_duration, total_price, id).
    Filters out SOLD_OUT routes.
    Returns list of (route, comfort_score, factors).
    """
    valid_routes = [r for r in routes if r.status != "SOLD_OUT"]
    scored = []
    for r in valid_routes:
        score, factors = calculate_comfort_score(
            r, preferences=preferences, candidate_routes=valid_routes
        )
        scored.append((r, score, factors))

    return sorted(
        scored,
        key=lambda item: (
            -item[1],  # Highest score first
            item[0].transfer_count,
            item[0].waiting_time,
            item[0].total_duration,
            item[0].total_price,
            item[0].id,
        ),
    )


def build_cheapest_recommendation(
    ranked_cheapest_routes: List[RouteOption],
    all_valid_routes: List[RouteOption],
    fastest_route: Optional[RouteOption] = None,
) -> Optional[RankedRecommendation]:
    """Builds the RankedRecommendation for the Cheapest category with transparent factors."""
    if not ranked_cheapest_routes:
        return None

    top_route = ranked_cheapest_routes[0]

    # Calculate comparisons
    prices = [r.total_price for r in all_valid_routes if r.total_price is not None]
    avg_price = sum(prices) / len(prices) if prices else top_route.total_price
    price_diff_vs_avg = round(avg_price - top_route.total_price, 2)
    savings_pct_vs_avg = (
        round((price_diff_vs_avg / avg_price) * 100.0, 1) if avg_price > 0 else 0.0
    )

    price_diff_vs_fastest = None
    if fastest_route and fastest_route.total_price is not None:
        price_diff_vs_fastest = round(fastest_route.total_price - top_route.total_price, 2)

    summary_parts = [
        f"Lowest total fare of ${top_route.total_price:.2f} {top_route.currency}"
    ]
    if price_diff_vs_fastest is not None and price_diff_vs_fastest > 0:
        summary_parts.append(f"saves ${price_diff_vs_fastest:.2f} compared to the fastest option")
    elif price_diff_vs_avg > 0:
        summary_parts.append(f"saves ${price_diff_vs_avg:.2f} ({savings_pct_vs_avg}%) vs average route cost")

    factors = {
        "total_price": top_route.total_price,
        "currency": top_route.currency,
        "duration_minutes": top_route.total_duration,
        "formatted_duration": format_minutes_to_duration(top_route.total_duration),
        "transfer_count": top_route.transfer_count,
        "price_difference_vs_fastest": price_diff_vs_fastest,
        "price_difference_vs_average": price_diff_vs_avg,
        "savings_percentage_vs_average": savings_pct_vs_avg,
        "summary": ". ".join(summary_parts) + ".",
    }

    return RankedRecommendation(
        category="CHEAPEST",
        rank=1,
        score=top_route.total_price,
        route=top_route,
        factors=factors,
    )


def build_fastest_recommendation(
    ranked_fastest_routes: List[RouteOption],
    all_valid_routes: List[RouteOption],
    cheapest_route: Optional[RouteOption] = None,
) -> Optional[RankedRecommendation]:
    """Builds the RankedRecommendation for the Fastest category with transparent factors."""
    if not ranked_fastest_routes:
        return None

    top_route = ranked_fastest_routes[0]

    durations = [r.total_duration for r in all_valid_routes if r.total_duration > 0]
    avg_duration = sum(durations) / len(durations) if durations else top_route.total_duration
    time_saved_vs_avg = round(avg_duration - top_route.total_duration, 1)

    time_saved_vs_cheapest = None
    if cheapest_route and cheapest_route.total_duration > 0:
        time_saved_vs_cheapest = round(cheapest_route.total_duration - top_route.total_duration, 1)

    summary_parts = [
        f"Shortest travel time of {format_minutes_to_duration(top_route.total_duration)} ({top_route.total_duration:.1f} min)"
    ]
    if time_saved_vs_cheapest is not None and time_saved_vs_cheapest > 0:
        summary_parts.append(
            f"saves {format_minutes_to_duration(time_saved_vs_cheapest)} compared to cheapest option"
        )
    elif time_saved_vs_avg > 0:
        summary_parts.append(f"saves {format_minutes_to_duration(time_saved_vs_avg)} vs average journey duration")

    factors = {
        "total_duration_minutes": top_route.total_duration,
        "formatted_duration": format_minutes_to_duration(top_route.total_duration),
        "waiting_time_minutes": top_route.waiting_time,
        "transfer_count": top_route.transfer_count,
        "total_price": top_route.total_price,
        "currency": top_route.currency,
        "time_saved_vs_cheapest_minutes": time_saved_vs_cheapest,
        "time_saved_vs_average_minutes": time_saved_vs_avg,
        "summary": ". ".join(summary_parts) + ".",
    }

    return RankedRecommendation(
        category="FASTEST",
        rank=1,
        score=top_route.total_duration,
        route=top_route,
        factors=factors,
    )


def build_comfort_recommendation(
    ranked_comfort_items: List[Tuple[RouteOption, float, Dict[str, Any]]],
) -> Optional[RankedRecommendation]:
    """Builds the RankedRecommendation for the Most Comfortable category with transparent factors."""
    if not ranked_comfort_items:
        return None

    top_route, top_score, factors = ranked_comfort_items[0]

    return RankedRecommendation(
        category="MOST_COMFORTABLE",
        rank=1,
        score=top_score,
        route=top_route,
        factors=factors,
    )


class RouteRankingService:
    """
    Deterministic Route Ranking Engine for Part A.
    Provides three independent rankings:
      1. Cheapest (by lowest valid total price)
      2. Fastest (by shortest valid total duration)
      3. Most Comfortable (composite score using transfers, wait time, duration, real reliability, preferences)
    """

    def rank_routes(
        self,
        routes: List[RouteOption],
        preferences: Optional[TravelerPreferenceBase] = None,
    ) -> RouteRankingResponse:
        """
        Executes all three deterministic rankings and returns:
          - cheapest
          - fastest
          - most_comfortable
          - all_routes
        with detailed factors behind each recommendation.
        """
        if not routes:
            return RouteRankingResponse(
                cheapest=None,
                fastest=None,
                most_comfortable=None,
                all_routes=[],
            )

        # 1. Rank Cheapest
        cheapest_sorted = rank_by_cheapest(routes)

        # 2. Rank Fastest
        fastest_sorted = rank_by_fastest(routes)

        # 3. Rank Most Comfortable
        comfort_sorted = rank_by_comfort(routes, preferences=preferences)

        # Build category recommendations
        cheapest_rec = build_cheapest_recommendation(
            cheapest_sorted,
            all_valid_routes=routes,
            fastest_route=fastest_sorted[0] if fastest_sorted else None,
        )

        fastest_rec = build_fastest_recommendation(
            fastest_sorted,
            all_valid_routes=routes,
            cheapest_route=cheapest_sorted[0] if cheapest_sorted else None,
        )

        comfort_rec = build_comfort_recommendation(comfort_sorted)

        return RouteRankingResponse(
            cheapest=cheapest_rec,
            fastest=fastest_rec,
            most_comfortable=comfort_rec,
            all_routes=routes,
        )
