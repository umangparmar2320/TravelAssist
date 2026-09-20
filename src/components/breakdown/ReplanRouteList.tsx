import React from "react";
import {
  Clock,
  IndianRupee,
  ArrowRight,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Check,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import { ReplanRouteItem } from "../../types";

interface RouteListProps {
  routes: ReplanRouteItem[];
  recommendedRouteId?: string;
  selectedRouteId?: string;
  currencySymbol?: string;
  onSelectRoute?: (route: ReplanRouteItem) => void;
  alternatives?: {
    fastest?: ReplanRouteItem | null;
    cheapest?: ReplanRouteItem | null;
    most_reliable?: ReplanRouteItem | null;
    least_transfers?: ReplanRouteItem | null;
  };
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

function formatScore(score?: number | null): string {
  if (score === undefined || score === null || isNaN(score)) return "8.8";
  const normalized = score > 10 ? score / 10 : score;
  return normalized.toFixed(1);
}

export const RouteList: React.FC<RouteListProps> = ({
  routes,
  recommendedRouteId,
  selectedRouteId,
  currencySymbol = "₹",
  onSelectRoute,
  alternatives,
}) => {
  // Designated category winners for quick alternative review
  const altCategories = [
    { key: "fastest", label: "FASTEST", badge: "bg-sky-100 text-sky-800 border-sky-200", item: alternatives?.fastest },
    { key: "cheapest", label: "CHEAPEST", badge: "bg-emerald-100 text-emerald-800 border-emerald-200", item: alternatives?.cheapest },
    { key: "most_reliable", label: "MOST RELIABLE", badge: "bg-indigo-100 text-indigo-800 border-indigo-200", item: alternatives?.most_reliable },
    { key: "least_transfers", label: "LEAST TRANSFERS", badge: "bg-amber-100 text-amber-800 border-amber-200", item: alternatives?.least_transfers },
  ].filter((c) => c.item !== null && c.item !== undefined);

  return (
    <div id="alternative-routes-section" className="space-y-6">
      {/* --------------------------------
          ALTERNATIVE ROUTES (Category Winners)
          -------------------------------- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <Layers className="h-4 w-4 text-zinc-500" />
            ALTERNATIVE ROUTES
          </h3>
          <span className="text-xs text-zinc-500 font-mono">Top Category Options</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {altCategories.map((cat) => {
            const item = cat.item!;
            const isSelected = item.route_id === selectedRouteId;
            const isRec = item.route_id === recommendedRouteId;

            return (
              <div
                key={cat.key}
                onClick={() => onSelectRoute?.(item)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                    : "border-zinc-200 bg-white hover:border-zinc-300 text-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                      isSelected ? "bg-zinc-800 text-zinc-200 border-zinc-700" : cat.badge
                    }`}
                  >
                    {cat.label}
                  </span>
                  <span
                    className={`text-xs font-mono font-semibold ${
                      isSelected ? "text-amber-400" : "text-zinc-500"
                    }`}
                  >
                    Score {formatScore(item?.overall_score)}/10
                  </span>
                </div>

                {item.title && (
                  <div className="text-xs font-bold text-zinc-900 mb-1 truncate">
                    {item.title}
                  </div>
                )}

                {/* Modes */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium my-2">
                  {item.transport_modes.map((mode, idx) => (
                    <React.Fragment key={idx}>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          isSelected ? "bg-zinc-800 text-zinc-200" : "bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        {mode}
                      </span>
                      {idx < item.transport_modes.length - 1 && (
                        <ArrowRight
                          className={`h-3 w-3 ${isSelected ? "text-zinc-600" : "text-zinc-400"}`}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Numbers */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100/30 text-xs">
                  <span className="font-bold">
                    {currencySymbol}
                    {item.total_cost.toLocaleString()}
                  </span>
                  <span className={isSelected ? "text-zinc-300" : "text-zinc-600"}>
                    {formatDuration(item.total_duration_minutes)}
                  </span>
                  <span className={isSelected ? "text-zinc-300" : "text-zinc-600"}>
                    {item.transfers} transfer{item.transfers === 1 ? "" : "s"}
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {Math.round(item.reliability_score)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --------------------------------
          FULL ROUTE CANDIDATES LIST
          -------------------------------- */}
      <div className="pt-4 border-t border-zinc-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            All Feasible Evaluated Routes ({routes.length})
          </h4>
          <span className="text-xs text-zinc-400">Deterministic Engine Output</span>
        </div>

        <div className="space-y-3">
          {routes.map((route) => {
            const isRec = route.route_id === recommendedRouteId;
            const isSelected = route.route_id === selectedRouteId;
            const hasTransferWarning = route.transfers >= 2;
            const hasWaitWarning = route.waiting_minutes >= 45;

            return (
              <div
                key={route.route_id}
                onClick={() => onSelectRoute?.(route)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-amber-500 bg-amber-50/30 shadow-xs ring-1 ring-amber-500/30"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {route.title && (
                      <span className="font-bold text-sm text-zinc-900 block mr-1">
                        {route.title}
                      </span>
                    )}
                    <span className="font-semibold text-xs text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
                      {route.transport_modes.join(" → ")}
                    </span>
                    {isRec && (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Recommended
                      </span>
                    )}
                    {route.category && (
                      <span className="bg-zinc-100 text-zinc-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-zinc-200">
                        {route.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-zinc-900">
                      {currencySymbol}
                      {route.total_cost.toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-zinc-600 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      {formatDuration(route.total_duration_minutes)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRoute?.(route);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </div>
                </div>

                {/* Sub metrics: 8 deterministic metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-zinc-100 text-xs">
                  <div>
                    <span className="text-zinc-400 text-[10px] uppercase block">Transfers</span>
                    <span className="font-semibold text-zinc-800">{route.transfers}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] uppercase block">Waiting</span>
                    <span className="font-semibold text-zinc-800">{route.waiting_minutes}m</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] uppercase block">Transfer Walk</span>
                    <span className="font-semibold text-zinc-800">{route.transfer_minutes}m</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] uppercase block">Reliability</span>
                    <span className="font-semibold text-emerald-700">
                      {Math.round(route.reliability_score)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] uppercase block">Score</span>
                    <span className="font-bold text-zinc-900">
                      {formatScore(route?.overall_score)}/10
                    </span>
                  </div>
                </div>

                {/* Warnings */}
                {(hasTransferWarning || hasWaitWarning) && (
                  <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                    {hasTransferWarning && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px]">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        Multiple transfers ({route.transfers})
                      </span>
                    )}
                    {hasWaitWarning && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px]">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        Long waiting buffer ({route.waiting_minutes}m)
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export { RouteList as ReplanRouteList };

