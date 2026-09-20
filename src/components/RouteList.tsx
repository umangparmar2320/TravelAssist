import React from 'react';
import {
  Clock,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Train,
  Plane,
  Car,
  Footprints,
  Navigation,
  ArrowRight,
  Info,
  Briefcase,
  MapPin,
} from 'lucide-react';
import { RouteOption, RouteSegment, SegmentMode } from '../types/travel';

interface RouteListProps {
  routes: RouteOption[];
  selectedRouteId: string | null;
  onSelectRoute: (route: RouteOption) => void;
}

export const RouteList: React.FC<RouteListProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
}) => {
  const getModeIcon = (mode: SegmentMode) => {
    switch (mode) {
      case 'FLIGHT':
        return <Plane className="w-3.5 h-3.5 text-indigo-600" />;
      case 'HIGH_SPEED_RAIL':
      case 'COMMUTER_TRAIN':
        return <Train className="w-3.5 h-3.5 text-blue-600" />;
      case 'METRO':
      case 'BUS':
        return <Navigation className="w-3.5 h-3.5 text-emerald-600" />;
      case 'RIDE_SHARE':
        return <Car className="w-3.5 h-3.5 text-amber-600" />;
      case 'WALK':
        return <Footprints className="w-3.5 h-3.5 text-slate-500" />;
      default:
        return <Navigation className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m > 0 ? `${m}m` : ''}`;
  };

  return (
    <div id="route-options-container" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
          Corporate Route Options ({routes.length} Alternatives)
        </h2>
        <span className="text-xs text-slate-400">
          Ranked by policy compliance, travel duration, and fare benchmark
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {routes.map((route) => {
          const isSelected = route.id === selectedRouteId;
          const firstSeg = route.segments[0];
          const lastSeg = route.segments[route.segments.length - 1];

          return (
            <div
              key={route.id}
              id={`route-card-${route.id}`}
              onClick={() => onSelectRoute(route)}
              className={`rounded-2xl border transition-all cursor-pointer p-5 bg-white ${
                isSelected
                  ? 'border-slate-900 shadow-md ring-2 ring-slate-900/10'
                  : 'border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              {/* Header row: Badge, Title & Compliance Status */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      route.badge === 'Corporate Pick'
                        ? 'bg-blue-100 text-blue-800'
                        : route.badge === 'Fastest'
                        ? 'bg-purple-100 text-purple-800'
                        : route.badge === 'Best Value'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {route.badge}
                  </span>
                  <h3 className="text-sm md:text-base font-semibold text-slate-900">
                    {route.title}
                  </h3>
                  {route.via_stations && route.via_stations.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200/80">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      <span>Via {route.via_stations.join(', ')}</span>
                    </span>
                  )}
                </div>

                {/* Compliance Badge */}
                <div className="flex items-center gap-2">
                  {route.compliance_status === 'COMPLIANT' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Policy Compliant</span>
                    </span>
                  )}
                  {route.compliance_status === 'WARNING' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Warning: Flagged</span>
                    </span>
                  )}
                  {route.compliance_status === 'OUT_OF_POLICY' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/80">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Requires Manager Approval</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Main metrics grid: 4 columns - Duration, Fare, Cabin Tier, Transfers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-100 mb-3 bg-slate-50/50 rounded-xl px-4">
                {/* Duration */}
                <div>
                  <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Total Duration
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {formatDuration(route.total_duration_minutes)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {firstSeg?.departure_time} → {lastSeg?.arrival_time}
                  </div>
                </div>

                {/* Cost */}
                <div>
                  <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-slate-400" />
                    Estimated Fare
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {route.currency_symbol || '$'}{(route.total_cost ?? route.total_cost_usd).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {(route.total_cost ?? route.total_cost_usd) <= (route.benchmark_cost ?? route.benchmark_cost_usd) ? (
                      <span className="text-emerald-600 font-medium">
                        -{route.currency_symbol || '$'}{((route.benchmark_cost ?? route.benchmark_cost_usd) - (route.total_cost ?? route.total_cost_usd)).toLocaleString()} under cap
                      </span>
                    ) : (
                      <span className="text-amber-600">
                        +{route.currency_symbol || '$'}{((route.total_cost ?? route.total_cost_usd) - (route.benchmark_cost ?? route.benchmark_cost_usd)).toLocaleString()} over cap
                      </span>
                    )}
                  </div>
                </div>

                {/* Cabin Tier */}
                <div>
                  <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-slate-400" />
                    Max Cabin Tier
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {route.max_cabin_class}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {route.total_distance_km} km distance
                  </div>
                </div>

                {/* Transfers & Reliability */}
                <div>
                  <div className="text-[11px] font-medium text-slate-400">
                    Transfers & Stops
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {(() => {
                      const totalHalts = route.segments.reduce(
                        (sum, seg) => sum + (seg.intermediate_stops?.length || 0),
                        0
                      );
                      if (route.transfer_count === 0) {
                        return totalHalts > 0 ? `Direct (${totalHalts} Halts)` : 'Direct (Non-Stop)';
                      }
                      return `${route.transfer_count} Transfer${route.transfer_count > 1 ? 's' : ''}${
                        totalHalts > 0 ? ` (${totalHalts} Halts)` : ''
                      }`;
                    })()}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {route.reliability_score}% on-time rating
                  </div>
                </div>
              </div>

              {/* Segment timeline visualization strip */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-600">
                  {route.segments.map((seg, idx) => (
                    <React.Fragment key={seg.id || idx}>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-800 font-medium">
                        {getModeIcon(seg.mode)}
                        <span className="text-[11px]">{seg.provider_name}</span>
                        <span className="text-[10px] text-slate-500">({seg.duration_minutes}m)</span>
                        {seg.intermediate_stops && seg.intermediate_stops.length > 0 && (
                          <span className="text-[9px] bg-blue-100/80 text-blue-700 px-1 py-0.2 rounded font-semibold">
                            +{seg.intermediate_stops.length} halts
                          </span>
                        )}
                      </span>
                      {idx < route.segments.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <button
                  id={`select-route-btn-${route.id}`}
                  type="button"
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  <span>{isSelected ? 'Selected' : 'Inspect Itinerary'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Compliance Notes preview */}
              {route.compliance_notes.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-start gap-1.5 text-xs text-slate-500">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    {route.compliance_notes.map((note, idx) => (
                      <div key={idx} className="text-[11px] text-slate-600">
                        • {note}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
