/**
 * 7. Route Scoring & 8. Preference Handling
 */

import { CalculatedRouteMetrics } from "./routeCalculator";

export type TravellerPreference =
  | "BALANCED"
  | "FASTEST"
  | "CHEAPEST"
  | "MOST_RELIABLE"
  | "LEAST_TRANSFERS";

export interface RouteScoreBreakdown {
  time_score: number;        // 0 - 100
  cost_score: number;        // 0 - 100
  reliability_score: number; // 0 - 100
  convenience_score: number; // 0 - 100
  transfer_score: number;    // 0 - 100
  overall_score: number;     // 0.0 - 10.0
}

export interface ScoredRoute extends CalculatedRouteMetrics {
  category: TravellerPreference;
  scores: RouteScoreBreakdown;
  time_score: number;
  cost_score: number;
  reliability_score: number;
  convenience_score: number;
  transfer_score: number;
  overall_score: number;
}

export class RouteScorer {
  /**
   * Evaluates normalized sub-scores (0 - 100) for a route against reference bounds
   */
  public static calculateSubScores(
    route: CalculatedRouteMetrics,
    bounds: { minDuration: number; maxDuration: number; minCost: number; maxCost: number }
  ): Omit<RouteScoreBreakdown, "overall_score"> {
    // Time score (lower duration is better)
    const durRange = Math.max(1, bounds.maxDuration - bounds.minDuration);
    const normalizedDuration = (route.total_duration_minutes - bounds.minDuration) / durRange;
    const time_score = Math.max(10, Math.min(100, Math.round(100 - normalizedDuration * 70)));

    // Cost score (lower cost is better)
    const costRange = Math.max(1, bounds.maxCost - bounds.minCost);
    const normalizedCost = (route.total_cost - bounds.minCost) / costRange;
    const cost_score = Math.max(10, Math.min(100, Math.round(100 - normalizedCost * 75)));

    // Reliability score (average step reliability)
    const avgReliability =
      route.steps.reduce((sum, s) => sum + (s.reliability_score || 90), 0) /
      Math.max(1, route.steps.length);
    const reliability_score = Math.round(avgReliability);

    // Transfer score (0 transfers = 100, 1 transfer = 85, 2 transfers = 70, 3+ = 50)
    let transfer_score = 100;
    if (route.transfers === 1) transfer_score = 88;
    else if (route.transfers === 2) transfer_score = 72;
    else if (route.transfers >= 3) transfer_score = 55;

    // Convenience score (penalizes long waiting times)
    const waitPenalty = Math.min(30, route.total_waiting_minutes * 0.2);
    const convenience_score = Math.max(20, Math.round(95 - waitPenalty - route.transfers * 5));

    return {
      time_score,
      cost_score,
      reliability_score,
      convenience_score,
      transfer_score,
    };
  }
}

export class PreferenceHandler {
  /**
   * 8. Preference Handling: Computes weighted overall score based on traveller preference
   */
  public static applyPreference(
    subScores: Omit<RouteScoreBreakdown, "overall_score">,
    preference: TravellerPreference = "BALANCED"
  ): number {
    let rawScore = 80;

    switch (preference) {
      case "FASTEST":
        rawScore =
          subScores.time_score * 0.65 +
          subScores.reliability_score * 0.2 +
          subScores.convenience_score * 0.15;
        break;

      case "CHEAPEST":
        rawScore =
          subScores.cost_score * 0.7 +
          subScores.time_score * 0.15 +
          subScores.reliability_score * 0.15;
        break;

      case "MOST_RELIABLE":
        rawScore =
          subScores.reliability_score * 0.65 +
          subScores.time_score * 0.2 +
          subScores.convenience_score * 0.15;
        break;

      case "LEAST_TRANSFERS":
        rawScore =
          subScores.transfer_score * 0.65 +
          subScores.convenience_score * 0.2 +
          subScores.reliability_score * 0.15;
        break;

      case "BALANCED":
      default:
        rawScore =
          subScores.time_score * 0.35 +
          subScores.cost_score * 0.25 +
          subScores.reliability_score * 0.25 +
          subScores.convenience_score * 0.15;
        break;
    }

    return parseFloat((rawScore / 10).toFixed(1));
  }

  /**
   * Score and rank a list of candidate routes according to traveller preference
   */
  public static scoreAndRankRoutes(
    routes: CalculatedRouteMetrics[],
    preference: TravellerPreference = "BALANCED"
  ): ScoredRoute[] {
    if (routes.length === 0) return [];

    const durations = routes.map((r) => r.total_duration_minutes);
    const costs = routes.map((r) => r.total_cost);

    const bounds = {
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      minCost: Math.min(...costs),
      maxCost: Math.max(...costs),
    };

    const scored = routes.map((route) => {
      const sub = RouteScorer.calculateSubScores(route, bounds);
      const overall = this.applyPreference(sub, preference);

      const breakdown: RouteScoreBreakdown = {
        ...sub,
        overall_score: overall,
      };

      return {
        ...route,
        category: preference,
        scores: breakdown,
        time_score: breakdown.time_score,
        cost_score: breakdown.cost_score,
        reliability_score: breakdown.reliability_score,
        convenience_score: breakdown.convenience_score,
        transfer_score: breakdown.transfer_score,
        overall_score: overall,
      };
    });

    // Sort descending by overall score
    scored.sort((a, b) => b.overall_score - a.overall_score);

    return scored;
  }
}
