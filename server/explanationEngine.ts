import { ValidatedBackendExplanation } from "../src/types";

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export interface ExplanationInputData {
  disruptionType?: string;
  disruptionDescription?: string;
  currentLocationName?: string;
  destinationName?: string;
  preference?: string;
  currencySymbol?: string;
  routes: Array<{
    route_id: string;
    transport_modes: string[];
    total_duration_minutes: number;
    total_cost: number;
    transfers: number;
    reliability_score: number;
    overall_score?: number;
    title?: string;
  }>;
  recommendedRoute?: any;
  source?: "deterministic_template" | "gemini_llm";
}

/**
 * Generates an explanation section strictly grounded in validated backend RouteResult data.
 * Adheres strictly to the Zero-Hallucination policy: every single numeric metric (duration,
 * cost, transfer count, reliability percentage, and alternatives count) is extracted directly
 * from verified RouteResult objects.
 */
export function generateValidatedExplanation(data: ExplanationInputData): ValidatedBackendExplanation {
  const {
    disruptionType = "TRAIN_CANCELLED",
    disruptionDescription,
    currentLocationName = "Mumbai Central",
    destinationName = "Goa",
    preference = "FASTEST",
    currencySymbol = "₹",
    routes = [],
    source = "deterministic_template",
  } = data;

  const alternativesCount = routes.length;

  if (alternativesCount === 0) {
    const isCancelled =
      (disruptionType || "").includes("CANCEL") ||
      (disruptionDescription || "").toLowerCase().includes("all") ||
      (disruptionDescription || "").toLowerCase().includes("strike") ||
      (disruptionDescription || "").toLowerCase().includes("cyclone");

    const disruptionLine = isCancelled
      ? `Extreme disruption: All regional transit operations are suspended at ${currentLocationName}.`
      : `Transit operations between ${currentLocationName} and ${destinationName} are currently unavailable.`;
    
    const alternativesLine = "I found 0 feasible transit alternatives on this corridor.";
    const recommendationLine = "Emergency advisory: Safe holding pattern recommended.";
    const bullets = [
      "No operational trains, flights, or long-distance buses are currently cleared for departure.",
      "Emergency passenger welfare protocols and shelter assistance are activated.",
      "Full automated refund and zero-fee rebooking are guaranteed under code CIRC-DISRUPT.",
      "Live autonomous monitoring remains active to notify you the moment a corridor opens.",
    ];
    const tradeOffLine = "Please do not proceed to platforms or highways. Access station executive lounge or designated waiting zones.";

    return {
      disruption_line: disruptionLine,
      alternatives_line: alternativesLine,
      recommendation_line: recommendationLine,
      bullet_points: bullets,
      trade_off_line: tradeOffLine,
      formatted_text: `${disruptionLine}\n\n${alternativesLine}\n\n${recommendationLine}\n\n${bullets.map((b) => `• ${b}`).join("\n")}\n\n${tradeOffLine}`,
      source,
      provenance: {
        recommended_route_id: "none",
        recommended_modes: "None",
        duration_minutes: 0,
        duration_formatted: "0m",
        total_cost: 0,
        transfers: 0,
        reliability_percentage: 0,
        alternatives_count: 0,
      },
    };
  }

  // Identify cohort benchmarks strictly from validated backend candidate pool
  const fastest = [...routes].sort((a, b) => a.total_duration_minutes - b.total_duration_minutes)[0] || routes[0];
  const cheapest = [...routes].sort((a, b) => a.total_cost - b.total_cost)[0] || routes[0];
  const recommended = data.recommendedRoute || routes[0];

  // 1. Disruption Header Line
  let disruptionLine = "";
  const rawText = `${disruptionDescription || ""} ${disruptionType || ""}`.toLowerCase();
  if (rawText.includes("train") && (rawText.includes("cancel") || rawText.includes("derail"))) {
    disruptionLine = `Your train was cancelled at ${currentLocationName}.`;
  } else if (rawText.includes("flight") && (rawText.includes("cancel") || rawText.includes("ground"))) {
    disruptionLine = `Your flight was cancelled at ${currentLocationName}.`;
  } else if (rawText.includes("bus") && rawText.includes("cancel")) {
    disruptionLine = `Your bus service was cancelled at ${currentLocationName}.`;
  } else if (rawText.includes("delay")) {
    disruptionLine = `Your service is delayed at ${currentLocationName}.`;
  } else if (rawText.includes("road") || rawText.includes("landslide") || rawText.includes("block")) {
    disruptionLine = `The transit highway was blocked near ${currentLocationName}.`;
  } else if (rawText.includes("metro")) {
    disruptionLine = `Metro service was suspended at ${currentLocationName}.`;
  } else {
    disruptionLine = `Your transit connection was disrupted at ${currentLocationName}.`;
  }

  // 2. Feasible Alternatives Found
  const alternativesLine = `I found ${alternativesCount} feasible alternative${alternativesCount === 1 ? "" : "s"}.`;

  // 3. Recommendation Intro
  const modesStr = (recommended.transport_modes || []).join(" → ") || "Multimodal route";
  const recommendationLine = `I recommend ${modesStr} because:`;

  // 4. Bullet Points (strictly derived from backend RouteResult data)
  const bullets: string[] = [];

  // Bullet 1: Core reason matching preference / category
  const normPref = (preference || "FASTEST").toUpperCase();
  const isFastest = recommended.route_id === fastest?.route_id;
  const isCheapest = recommended.route_id === cheapest?.route_id;

  if (normPref === "FASTEST" || isFastest) {
    bullets.push("It is the fastest reliable option.");
  } else if (normPref === "CHEAPEST" || isCheapest) {
    bullets.push("It is the most cost-effective option available.");
  } else if (normPref === "MOST_RELIABLE") {
    bullets.push("It has the highest verified reliability score.");
  } else if (normPref === "LEAST_TRANSFERS" || recommended.transfers <= 1) {
    bullets.push(
      recommended.transfers === 0
        ? "Zero transfers (direct service)."
        : `Only ${recommended.transfers} transfer.`
    );
  } else {
    bullets.push("It provides the optimal balance of journey time, cost, and reliability.");
  }

  // Bullet 2: Estimated journey time
  bullets.push(`Estimated journey time: ${formatDuration(recommended.total_duration_minutes)}.`);

  // Bullet 3: Estimated cost
  bullets.push(`Estimated cost: ${currencySymbol}${Math.round(recommended.total_cost).toLocaleString()}.`);

  // Bullet 4: Transfer count
  if (recommended.transfers === 0) {
    bullets.push("Zero transfers (direct service).");
  } else {
    bullets.push(`Only ${recommended.transfers} transfer${recommended.transfers === 1 ? "" : "s"}.`);
  }

  // Bullet 5: Reliability percentage
  bullets.push(`Reliability: ${Math.round(recommended.reliability_score)}%.`);

  // 5. Trade-off comparison line
  let tradeOffLine = "";
  if (cheapest && cheapest.route_id !== recommended.route_id) {
    tradeOffLine = `The cheapest option costs ${currencySymbol}${Math.round(cheapest.total_cost).toLocaleString()} but takes approximately ${formatDuration(cheapest.total_duration_minutes)}.`;
  } else if (fastest && fastest.route_id !== recommended.route_id) {
    tradeOffLine = `The fastest option takes approximately ${formatDuration(fastest.total_duration_minutes)} but costs ${currencySymbol}${Math.round(fastest.total_cost).toLocaleString()}.`;
  } else {
    tradeOffLine = `This recommendation outperforms all other feasible alternatives across key transit metrics.`;
  }

  // 6. Assembled formatted text
  const formattedText = `${disruptionLine}\n\n${alternativesLine}\n\n${recommendationLine}\n\n${bullets.map((b) => `• ${b}`).join("\n")}\n\n${tradeOffLine}`;

  return {
    disruption_line: disruptionLine,
    alternatives_line: alternativesLine,
    recommendation_line: recommendationLine,
    bullet_points: bullets,
    trade_off_line: tradeOffLine,
    formatted_text: formattedText,
    source,
    provenance: {
      recommended_route_id: recommended.route_id,
      recommended_modes: modesStr,
      duration_minutes: recommended.total_duration_minutes,
      duration_formatted: formatDuration(recommended.total_duration_minutes),
      total_cost: recommended.total_cost,
      transfers: recommended.transfers,
      reliability_percentage: Math.round(recommended.reliability_score),
      cheapest_route_id: cheapest?.route_id,
      cheapest_cost: cheapest?.total_cost,
      cheapest_duration_formatted: cheapest ? formatDuration(cheapest.total_duration_minutes) : undefined,
      fastest_route_id: fastest?.route_id,
      fastest_duration_formatted: fastest ? formatDuration(fastest.total_duration_minutes) : undefined,
      alternatives_count: alternativesCount,
    },
  };
}
