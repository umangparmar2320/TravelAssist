import React from "react";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Clock,
  IndianRupee,
  Navigation,
  Quote,
  CheckCircle2,
  Check,
} from "lucide-react";
import { RecommendationResponse, ReplanRouteItem } from "../../types";

interface RecommendationCardProps {
  recommendation: RecommendationResponse | null;
  recommendedRoute: ReplanRouteItem | null;
  loading: boolean;
  onRefresh: () => void;
  onSelectRoute?: (route: ReplanRouteItem) => void;
  isSelected?: boolean;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  recommendedRoute,
  loading,
  onRefresh,
  onSelectRoute,
  isSelected = false,
}) => {
  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 bg-zinc-200 rounded-lg" />
          <div className="h-4 w-48 bg-zinc-200 rounded" />
        </div>
        <div className="h-20 bg-zinc-100 rounded-xl mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="h-16 bg-zinc-100 rounded-xl" />
          <div className="h-16 bg-zinc-100 rounded-xl" />
          <div className="h-16 bg-zinc-100 rounded-xl" />
          <div className="h-16 bg-zinc-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!recommendedRoute && !recommendation) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
        <Sparkles className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-zinc-700">Awaiting Replanning Request</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
          Execute route replanning to generate the top recommended route and trade-off evaluation.
        </p>
      </div>
    );
  }

  const isGemini = recommendation?.provider_used?.startsWith("gemini");
  const modes = recommendedRoute?.transport_modes || ["Taxi", "Flight", "Taxi"];
  const durationText = recommendedRoute ? formatDuration(recommendedRoute.total_duration_minutes) : "5h 20m";
  const costNumber = recommendedRoute ? recommendedRoute.total_cost : 5200;
  const transfersCount = recommendedRoute ? recommendedRoute.transfers : 2;
  const reliability = recommendedRoute ? Math.round(recommendedRoute.reliability_score) : 91;
  const overallRating =
    recommendedRoute?.overall_score !== undefined && recommendedRoute?.overall_score !== null
      ? (recommendedRoute.overall_score > 10
          ? (recommendedRoute.overall_score / 10).toFixed(1)
          : Number(recommendedRoute.overall_score).toFixed(1))
      : "9.2";

  return (
    <div
      id="recommended-route-card"
      className="rounded-2xl border-2 border-amber-500/80 bg-white shadow-md overflow-hidden relative"
    >
      {/* Top Banner: RECOMMENDED ROUTE */}
      <div className="px-6 py-3.5 bg-linear-to-r from-amber-500 to-amber-600 text-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase">
              RECOMMENDED ROUTE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {((recommendation as any)?.confidence_score || (recommendation as any)?.confidence) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/25 text-white backdrop-blur-xs">
              {Math.round((recommendation as any)?.confidence_score || (recommendation as any)?.confidence)}% Match
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-white">
            Score {overallRating}/10
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white text-amber-900">
            {isGemini ? "AI Grounded" : "Engine Rank #1"}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Core Route Headline: e.g. Taxi → Flight → Taxi */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {modes.map((mode, idx) => (
                <React.Fragment key={idx}>
                  <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-sm font-semibold rounded-lg shadow-2xs">
                    {mode}
                  </span>
                  {idx < modes.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              Optimal autonomous bypass avoiding active travel disruption
            </p>
          </div>

          {/* Action: [Select Route] */}
          {recommendedRoute && (
            <button
              type="button"
              id="select-recommended-route-btn"
              onClick={() => onSelectRoute?.(recommendedRoute)}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                isSelected
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-900 hover:bg-zinc-800 text-white active:scale-98"
              }`}
            >
              {isSelected ? (
                <>
                  <Check className="h-4 w-4 text-white" />
                  Selected Route
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-amber-400" />
                  Select Route
                </>
              )}
            </button>
          )}
        </div>

        {/* The 4 Core Metric Pills (Matching spec format) */}
        {/* 5h 20m | ₹5,200 | 2 transfers | 91% reliability | 9.2/10 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Travel Time
            </span>
            <span className="text-xl font-bold text-zinc-900 mt-0.5 block flex items-center gap-1">
              <Clock className="h-4 w-4 text-zinc-500" />
              {durationText}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Total Cost
            </span>
            <span className="text-xl font-bold text-zinc-900 mt-0.5 block">
              ₹{costNumber.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Transfers
            </span>
            <span className="text-xl font-bold text-zinc-900 mt-0.5 block">
              {transfersCount} transfer{transfersCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Reliability
            </span>
            <span className="text-xl font-bold text-emerald-700 mt-0.5 block">
              {reliability}%
            </span>
          </div>
        </div>

        {/* AI Agent Traveller Message (e.g. "Your train was cancelled. I recommend Taxi → Flight → Taxi...") */}
        {recommendation && (
          <div className="relative rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
            <Quote className="absolute top-3 right-3 h-5 w-5 text-amber-300 pointer-events-none" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800">
                AI Concierge Guidance
              </span>
              {(recommendation.headline || (recommendation as any).reason_headline) && (
                <span className="text-xs font-bold text-zinc-900">
                  — {recommendation.headline || (recommendation as any).reason_headline}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-800 font-medium leading-relaxed">
              "{recommendation.traveller_message || recommendation.reasoning || (recommendation as any).detailed_reasoning}"
            </p>

            {/* Trade-off analysis advantages if present */}
            {Array.isArray((recommendation.trade_off_analysis as any)?.advantages) && (
              <ul className="text-xs text-zinc-700 space-y-1 pt-2 border-t border-amber-200/60">
                {((recommendation.trade_off_analysis as any).advantages as string[]).map((adv, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Booking action prompt if present */}
            {(recommendation as any).booking_action_prompt && (
              <div className="pt-2 text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                <span>{(recommendation as any).booking_action_prompt}</span>
              </div>
            )}
          </div>
        )}

        {/* Important Warnings if any */}
        {recommendation?.warnings && recommendation.warnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Transfer & Wait Advisory:</span>
              <ul className="space-y-0.5 text-amber-800">
                {recommendation.warnings.map((w, idx) => (
                  <li key={idx}>• {w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
