import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { generateValidatedExplanation } from "./explanationEngine";
import { ValidatedBackendExplanation } from "../src/types";

dotenv.config();

export interface RouteMetrics {
  total_travel_time_min: number;
  waiting_time_min: number;
  transfer_time_min: number;
  total_cost: number;
  number_of_transfers: number;
  reliability_score: number;
  convenience_score: number;
}

export interface CandidateRoute {
  route_id: string;
  title: string;
  summary: string;
  modes_used: string[];
  metrics: RouteMetrics;
  is_recommended?: boolean;
  badges?: string[];
}

export interface RecommendationRequestPayload {
  current_location: string;
  destination: string;
  disruption?: string;
  priority: "fastest" | "cheapest" | "most_reliable" | "least_transfers" | "balanced";
  candidate_routes: CandidateRoute[];
  currency_symbol?: string;
  context?: Record<string, any>;
  force_deterministic?: boolean;
}

export interface RecommendationResponsePayload {
  recommended_route_id: string;
  headline: string;
  traveller_message: string;
  reasoning: string;
  trade_off_analysis: {
    key_trade_off: string;
    cost_comparison: string;
    time_comparison: string;
  };
  warnings: string[];
  actionable_steps: string[];
  contingency_advice: string;
  provider_used: string;
  explanation?: ValidatedBackendExplanation;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export class RecommendationService {
  private llmProvider: string;
  private geminiModel: string;
  private apiKey: string | undefined;
  private aiClient: GoogleGenAI | null = null;

  constructor() {
    this.llmProvider = (process.env.LLM_PROVIDER || "gemini").toLowerCase().trim();
    this.geminiModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    this.apiKey = process.env.GEMINI_API_KEY;

    if (this.llmProvider === "gemini" && this.apiKey && this.apiKey !== "MY_GEMINI_API_KEY") {
      try {
        this.aiClient = new GoogleGenAI({
          apiKey: this.apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      } catch (err) {
        console.warn("Failed to initialize GoogleGenAI client:", err);
        this.aiClient = null;
      }
    }
  }

  public async evaluate(payload: RecommendationRequestPayload): Promise<RecommendationResponsePayload> {
    const {
      current_location,
      destination,
      disruption,
      priority = "balanced",
      candidate_routes,
      currency_symbol = "₹",
      force_deterministic = false,
    } = payload;

    if (!candidate_routes || candidate_routes.length === 0) {
      return this.emptyResponse(disruption);
    }

    const buildExplanation = (recId: string, source: "gemini_llm" | "deterministic_template") => {
      const rec = candidate_routes.find((r) => r.route_id === recId) || candidate_routes[0];
      return generateValidatedExplanation({
        disruptionType: disruption,
        disruptionDescription: disruption,
        currentLocationName: current_location,
        destinationName: destination,
        preference: priority,
        currencySymbol: currency_symbol,
        routes: candidate_routes.map((r) => ({
          route_id: r.route_id,
          transport_modes: r.modes_used,
          total_duration_minutes: r.metrics.total_travel_time_min,
          total_cost: r.metrics.total_cost,
          transfers: r.metrics.number_of_transfers,
          reliability_score: r.metrics.reliability_score,
          title: r.title,
        })),
        recommendedRoute: {
          route_id: rec.route_id,
          transport_modes: rec.modes_used,
          total_duration_minutes: rec.metrics.total_travel_time_min,
          total_cost: rec.metrics.total_cost,
          transfers: rec.metrics.number_of_transfers,
          reliability_score: rec.metrics.reliability_score,
        },
        source,
      });
    };

    // If Gemini is available and not forced to deterministic, attempt LLM call
    if (!force_deterministic && this.aiClient && this.apiKey && this.apiKey !== "MY_GEMINI_API_KEY") {
      try {
        const llmResult = await this.callGemini(payload);
        if (llmResult && candidate_routes.some((r) => r.route_id === llmResult.recommended_route_id)) {
          return {
            ...llmResult,
            explanation: buildExplanation(llmResult.recommended_route_id, "gemini_llm"),
          };
        }
      } catch (error: any) {
        console.warn("Gemini API calls failed or timed out; falling back to deterministic scoring engine:", error?.message || error);
      }
    }

    // Deterministic fallback (strictly grounded in verified metrics)
    const deterministic = this.generateDeterministicRecommendation(payload);
    return {
      ...deterministic,
      provider_used: "deterministic_fallback",
      explanation: buildExplanation(deterministic.recommended_route_id, "deterministic_template"),
    };
  }

  private async callGemini(payload: RecommendationRequestPayload): Promise<RecommendationResponsePayload | null> {
    if (!this.aiClient) return null;

    const { current_location, destination, disruption, priority, candidate_routes, currency_symbol = "₹" } = payload;

    const systemInstruction = `You are the AI Travel Recommendation Agent for an Autonomous Travel-Disruption Concierge.
CRITICAL MANDATE - ZERO HALLUCINATION POLICY:
- You must NEVER invent:
  - transportation services or operators
  - prices or costs
  - schedules or departure/arrival times
  - availability
  - travel times or durations
  - routes or transit links
- The backend route engine provides the factual route data.
- You receive ONLY validated RouteResult data.
- Your job is to:
  1. Select/explain the best route according to traveller preference.
  2. Explain why it is recommended based on verified metrics.
  3. Compare it with alternatives.
  4. Highlight important trade-offs (e.g. monetary cost difference vs. time saved).
  5. Warn about many transfers (2 or more transfers) or long waiting times (45+ minutes).
  6. Produce concise traveller-friendly text.

Format example:
"Your train was cancelled. I recommend Taxi → Flight → Taxi because it reaches Goa in approximately 5h 20m and has high reliability. It costs about ₹3,800 more than the cheapest alternative but saves over 5 hours."

You MUST return pure JSON conforming to this schema:
{
  "recommended_route_id": "string (exact route_id from inputs)",
  "headline": "string",
  "traveller_message": "string (concise traveller-friendly text)",
  "reasoning": "string",
  "trade_off_analysis": {
    "key_trade_off": "string",
    "cost_comparison": "string",
    "time_comparison": "string"
  },
  "warnings": ["string"],
  "actionable_steps": ["string"],
  "contingency_advice": "string"
}`;

    const routesContext = candidate_routes
      .map((r, i) => {
        const modes = r.modes_used.join(" → ") || r.summary;
        const dur = formatDuration(r.metrics.total_travel_time_min);
        const cost = `${currency_symbol}${r.metrics.total_cost.toLocaleString()}`;
        return `Route #${i + 1} [ID: ${r.route_id}]:
  Modes: ${modes}
  Travel Time: ${dur} (${r.metrics.total_travel_time_min} mins)
  Cost: ${cost}
  Transfers: ${r.metrics.number_of_transfers}
  Idle Wait Time: ${r.metrics.waiting_time_min} mins
  Transfer Time: ${r.metrics.transfer_time_min} mins
  Reliability: ${r.metrics.reliability_score}%
  Convenience: ${r.metrics.convenience_score}%`;
      })
      .join("\n\n");

    const prompt = `FACTUAL ROUTE ENGINE DATA:
Current Location: ${current_location}
Destination: ${destination}
Active Disruption: ${disruption || "None reported"}
Traveller Priority: ${priority.toUpperCase()}

CANDIDATE ROUTES:
${routesContext}

Please evaluate the candidates strictly against the factual data and produce the structured recommendation.`;

    const candidateModels = Array.from(
      new Set([this.geminiModel, "gemini-3.1-flash-lite", "gemini-flash-latest"])
    );

    for (const modelName of candidateModels) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after 6000ms for ${modelName}`)), 6000)
        );

        const generatePromise = this.aiClient.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });

        const response = await Promise.race([generatePromise, timeoutPromise]);

        if (!response || !response.text) continue;

        let clean = response.text.trim();
        if (clean.startsWith("```")) {
          clean = clean.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
        }

        const parsed = JSON.parse(clean);
        return {
          ...parsed,
          provider_used: `gemini:${modelName}`,
        };
      } catch (err: any) {
        console.warn(`Gemini model ${modelName} unavailable or timed out (${err?.status || err?.message || "503/error"}). Trying fallback...`);
      }
    }

    return null;
  }

  public generateDeterministicRecommendation(payload: RecommendationRequestPayload): Omit<RecommendationResponsePayload, "provider_used"> {
    const {
      current_location,
      destination,
      disruption,
      priority = "balanced",
      candidate_routes,
      currency_symbol = "₹",
    } = payload;

    // Identify cohort benchmarks
    const fastest = [...candidate_routes].sort(
      (a, b) => a.metrics.total_travel_time_min - b.metrics.total_travel_time_min || a.metrics.total_cost - b.metrics.total_cost
    )[0];

    const cheapest = [...candidate_routes].sort(
      (a, b) => a.metrics.total_cost - b.metrics.total_cost || a.metrics.total_travel_time_min - b.metrics.total_travel_time_min
    )[0];

    const mostReliable = [...candidate_routes].sort(
      (a, b) => b.metrics.reliability_score - a.metrics.reliability_score || a.metrics.total_travel_time_min - b.metrics.total_travel_time_min
    )[0];

    const leastTransfers = [...candidate_routes].sort(
      (a, b) => a.metrics.number_of_transfers - b.metrics.number_of_transfers || a.metrics.total_travel_time_min - b.metrics.total_travel_time_min
    )[0];

    // Pick recommended route by preference
    let recommended: CandidateRoute;
    switch (priority) {
      case "fastest":
        recommended = fastest;
        break;
      case "cheapest":
        recommended = cheapest;
        break;
      case "most_reliable":
        recommended = mostReliable;
        break;
      case "least_transfers":
        recommended = leastTransfers;
        break;
      case "balanced":
      default: {
        // Multi-criteria composite score
        const minDur = fastest.metrics.total_travel_time_min || 1;
        const minCost = cheapest.metrics.total_cost > 0 ? cheapest.metrics.total_cost : 1;

        const scored = candidate_routes.map((r) => {
          const tScore = (minDur / Math.max(r.metrics.total_travel_time_min, 1)) * 100;
          const cScore = (minCost / Math.max(r.metrics.total_cost, 1)) * 100;
          const rScore = r.metrics.reliability_score;
          const trScore = Math.max(0, 100 - r.metrics.number_of_transfers * 20);
          const convScore = r.metrics.convenience_score;
          const composite = 0.35 * tScore + 0.25 * cScore + 0.2 * rScore + 0.1 * trScore + 0.1 * convScore;
          return { route: r, composite };
        });
        scored.sort((a, b) => b.composite - a.composite);
        recommended = scored[0].route;
        break;
      }
    }

    // Determine key alternative for trade-off comparison
    const alternatives = candidate_routes.filter((r) => r.route_id !== recommended.route_id);
    let topAlt: CandidateRoute | undefined;
    if (alternatives.length > 0) {
      if (recommended.route_id === fastest.route_id) {
        topAlt = cheapest.route_id !== recommended.route_id ? cheapest : alternatives[0];
      } else if (recommended.route_id === cheapest.route_id) {
        topAlt = fastest.route_id !== recommended.route_id ? fastest : alternatives[0];
      } else {
        topAlt = fastest.route_id !== recommended.route_id ? fastest : cheapest;
      }
    }

    // High transfer and long waiting warnings
    const warnings: string[] = [];
    for (const r of candidate_routes) {
      const modeStr = r.modes_used.join(" → ") || r.summary;
      const issues: string[] = [];
      if (r.metrics.number_of_transfers >= 2) {
        issues.push(`${r.metrics.number_of_transfers} transfers`);
      }
      if (r.metrics.waiting_time_min >= 45) {
        issues.push(`${r.metrics.waiting_time_min} mins waiting time`);
      }
      if (issues.length > 0) {
        warnings.push(`Warning: ${modeStr} includes ${issues.join(" and ")}.`);
      }
    }

    // Trade-off calculation
    const recModes = recommended.modes_used.join(" → ") || recommended.summary;
    const recDurStr = formatDuration(recommended.metrics.total_travel_time_min);
    let costComparison = "";
    let timeComparison = "";
    let tradeOffSentence = "";

    if (topAlt) {
      const altModes = topAlt.modes_used.join(" → ") || topAlt.summary;
      const costDiff = recommended.metrics.total_cost - topAlt.metrics.total_cost;
      const timeDiff = topAlt.metrics.total_travel_time_min - recommended.metrics.total_travel_time_min;

      if (costDiff > 0) {
        costComparison = `Costs about ${currency_symbol}${Math.round(costDiff).toLocaleString()} more than ${altModes}`;
      } else if (costDiff < 0) {
        costComparison = `Saves about ${currency_symbol}${Math.round(Math.abs(costDiff)).toLocaleString()} compared to ${altModes}`;
      } else {
        costComparison = `Costs the same as ${altModes}`;
      }

      if (timeDiff > 0) {
        timeComparison = `saves ${formatDuration(timeDiff)}`;
      } else if (timeDiff < 0) {
        timeComparison = `takes ${formatDuration(Math.abs(timeDiff))} longer`;
      } else {
        timeComparison = `same travel duration`;
      }

      tradeOffSentence = ` It ${costComparison.toLowerCase()} but ${timeComparison}.`;
    }

    // Explanation why recommended
    let whyRecommended = `it reaches ${destination} in approximately ${recDurStr} and has ${recommended.metrics.reliability_score >= 90 ? "high" : "steady"} reliability (${recommended.metrics.reliability_score}%)`;
    if (priority === "cheapest") {
      whyRecommended = `it is the most budget-friendly option at ${currency_symbol}${recommended.metrics.total_cost.toLocaleString()} reaching ${destination} in ${recDurStr}`;
    } else if (priority === "least_transfers") {
      whyRecommended = `it minimizes connection friction with only ${recommended.metrics.number_of_transfers} transfer(s)`;
    }

    // Build concise traveller message matching the exact prompt output
    const disruptionPrefix = disruption ? `Your ${disruption.toLowerCase().replace(/\.$/, "")}. ` : "";
    const travellerMessage = `${disruptionPrefix}I recommend ${recModes} because ${whyRecommended}.${tradeOffSentence}`.trim();

    return {
      recommended_route_id: recommended.route_id,
      headline: `Recommended: ${recModes} (${recDurStr})`,
      traveller_message: travellerMessage,
      reasoning: `Selected for preference '${priority.toUpperCase()}'. ${recModes} offers the optimal balance of ${recDurStr} duration, ${currency_symbol}${recommended.metrics.total_cost.toLocaleString()} cost, and ${recommended.metrics.reliability_score}% reliability.`,
      trade_off_analysis: {
        key_trade_off: topAlt ? `${costComparison} but ${timeComparison}.` : "Direct single-route comparison.",
        cost_comparison: costComparison || "Optimal in its category",
        time_comparison: timeComparison || "Fastest calculated route",
      },
      warnings,
      actionable_steps: [
        `Begin departure from ${current_location} via ${recommended.modes_used[0] || "primary carrier"}.`,
        recommended.metrics.number_of_transfers > 0
          ? `Proceed with ${recommended.metrics.number_of_transfers} verified connection(s) at scheduled hubs.`
          : `Direct non-stop service to ${destination}.`,
        `Estimated final arrival in ${destination} at ${recDurStr} total journey time.`,
      ],
      contingency_advice:
        "Alternative options remain locked in memory. If primary service experiences additional delay, autonomous re-routing will initiate instantly.",
    };
  }

  private emptyResponse(disruption?: string): RecommendationResponsePayload {
    return {
      recommended_route_id: "none",
      headline: "No Route Available",
      traveller_message: `Active disruption: ${disruption || "Service unavailable"}. No viable multimodal transit routes found.`,
      reasoning: "Route engine returned empty candidate set.",
      trade_off_analysis: {
        key_trade_off: "N/A",
        cost_comparison: "N/A",
        time_comparison: "N/A",
      },
      warnings: ["All connecting transportation services currently suspended."],
      actionable_steps: ["Remain at current terminal and monitor live updates."],
      contingency_advice: "Check back once transit authorities restore basic operations.",
      provider_used: "deterministic_fallback",
    };
  }
}

export const recommendationService = new RecommendationService();
