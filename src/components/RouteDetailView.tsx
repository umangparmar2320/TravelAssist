import React, { useState } from 'react';
import {
  Clock,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  Train,
  Plane,
  Car,
  Footprints,
  Navigation,
  Briefcase,
  Play,
  CheckCircle2,
  MapPin,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { RouteOption, SegmentMode, CorporatePolicy } from '../types/travel';

interface RouteDetailViewProps {
  route: RouteOption;
  policy: CorporatePolicy;
  onBookTrip: (route: RouteOption) => void;
  onSimulateDisruption: (route: RouteOption, segmentIndex: number, delayMinutes: number) => void;
  onOpenInConcierge?: (route: RouteOption) => void;
}

export const RouteDetailView: React.FC<RouteDetailViewProps> = ({
  route,
  policy,
  onBookTrip,
  onSimulateDisruption,
  onOpenInConcierge,
}) => {
  const [selectedSegIndex, setSelectedSegIndex] = useState(0);
  const [delayInput, setDelayInput] = useState(75);
  const [expandedStops, setExpandedStops] = useState<Record<string, boolean>>({});

  const toggleStops = (segId: string) => {
    setExpandedStops((prev) => ({
      ...prev,
      [segId]: prev[segId] === undefined ? false : !prev[segId],
    }));
  };

  const getModeIcon = (mode: SegmentMode) => {
    switch (mode) {
      case 'FLIGHT':
        return <Plane className="w-4 h-4 text-indigo-600" />;
      case 'HIGH_SPEED_RAIL':
      case 'COMMUTER_TRAIN':
        return <Train className="w-4 h-4 text-blue-600" />;
      case 'METRO':
      case 'BUS':
        return <Navigation className="w-4 h-4 text-emerald-600" />;
      case 'RIDE_SHARE':
        return <Car className="w-4 h-4 text-amber-600" />;
      case 'WALK':
        return <Footprints className="w-4 h-4 text-slate-500" />;
      default:
        return <Navigation className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div id="route-detail-container" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 mb-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              Selected Route Itinerary
            </span>
            <span className="text-xs text-slate-400">• {route.total_distance_km} km total</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {route.title}
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">
            {route.origin_name} ({route.origin_code}) → {route.destination_name} ({route.destination_code})
          </div>
          {route.via_stations && route.via_stations.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                <MapPin className="w-3 h-3 text-blue-600" />
                <span>Via Intermediate Stations: {route.via_stations.join(' → ')}</span>
              </span>
            </div>
          )}
        </div>

        {/* Book Trip CTA */}
        <div className="flex items-center gap-3">
          <button
            id="book-itinerary-btn"
            type="button"
            onClick={() => onBookTrip(route)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs hover:shadow transition-all active:scale-98"
          >
            <Briefcase className="w-4 h-4" />
            <span>Book Corporate Itinerary</span>
          </button>
        </div>
      </div>

      {/* Disruption Simulator Widget */}
      <div id="disruption-simulator-card" className="my-5 p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Disruption & Automated Rebooking Simulator</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Simulate flight/train delays on any leg to test connection buffer breach detection and automated corporate rebooking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              id="disruption-segment-select"
              value={selectedSegIndex}
              onChange={(e) => setSelectedSegIndex(Number(e.target.value))}
              className="text-xs bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
            >
              {route.segments.map((seg, idx) => (
                <option key={seg.id} value={idx}>
                  Leg {idx + 1}: {seg.provider_name} ({seg.mode})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-lg px-2 py-1">
              <span className="text-[11px] text-slate-500 font-medium">Delay:</span>
              <input
                id="disruption-delay-input"
                type="number"
                min="10"
                max="300"
                step="15"
                value={delayInput}
                onChange={(e) => setDelayInput(Number(e.target.value))}
                className="w-12 text-xs font-bold text-slate-800 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500">min</span>
            </div>

            <button
              id="simulate-disruption-btn"
              type="button"
              onClick={() => onSimulateDisruption(route, selectedSegIndex, delayInput)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Test Disruption Impact</span>
            </button>

            {onOpenInConcierge && (
              <button
                type="button"
                id="open-in-concierge-btn"
                onClick={() => onOpenInConcierge(route)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-95"
                title="Send route and endpoints to Autonomous Disruption Concierge"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Open in Concierge</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step-by-Step Multi-Modal Timeline */}
      <div className="space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Sequential Transit Legs & Transfer Buffers
        </h3>

        <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {route.segments.map((seg, idx) => {
            const hasLayover = seg.layover_after_minutes && seg.layover_after_minutes > 0;

            return (
              <div key={seg.id || idx} className="relative group">
                {/* Node icon */}
                <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center shadow-xs">
                  {getModeIcon(seg.mode)}
                </div>

                {/* Segment Content Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Leg {seg.sequence_order}: {seg.provider_name}
                      </span>
                      {seg.flight_or_service_num && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700 font-mono">
                          {seg.flight_or_service_num}
                        </span>
                      )}
                      {seg.cabin_class && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {seg.cabin_class}
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-semibold text-slate-800">
                      {seg.currency_symbol || route.currency_symbol || '$'}{(seg.cost ?? seg.cost_usd).toLocaleString()} • {seg.duration_minutes} min
                    </div>
                  </div>

                  {/* Route points */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2 text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Departure</div>
                      <div className="font-semibold text-slate-900 mt-0.5">{seg.departure_time}</div>
                      <div className="text-slate-600">{seg.start_name} {seg.start_code ? `(${seg.start_code})` : ''}</div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Arrival</div>
                      <div className="font-semibold text-slate-900 mt-0.5">{seg.arrival_time}</div>
                      <div className="text-slate-600">{seg.end_name} {seg.end_code ? `(${seg.end_code})` : ''}</div>
                    </div>
                  </div>

                  {/* Instructions */}
                  {seg.instructions && (
                    <div className="mt-2 text-xs text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200/60">
                      <span className="font-medium text-slate-700">Transit Instructions: </span>
                      {seg.instructions}
                    </div>
                  )}

                  {/* Scheduled Intermediate Stops & Halts (Beech Ke Stations) */}
                  {seg.intermediate_stops && seg.intermediate_stops.length > 0 && (
                    <div className="mt-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleStops(seg.id)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-100/90 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800">
                            Intermediate Stations & Scheduled Halts ({seg.intermediate_stops.length} Stations)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <span className="text-[11px]">{expandedStops[seg.id] === false ? 'View Halts' : 'Hide Halts'}</span>
                          {expandedStops[seg.id] === false ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </button>

                      {expandedStops[seg.id] !== false && (
                        <div className="p-3 border-t border-slate-100 divide-y divide-slate-100 bg-white">
                          <div className="text-[11px] text-slate-400 font-medium pb-2 px-1">
                            Scheduled intermediate halts along this leg corridor:
                          </div>
                          {seg.intermediate_stops.map((stop, sIdx) => (
                            <div key={sIdx} className="flex items-center justify-between py-2 text-xs text-slate-700">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                <div className="font-semibold text-slate-800">{stop.station_name}</div>
                                {stop.station_code && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium">
                                    {stop.station_code}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
                                {stop.arrival_time && (
                                  <span>Arr: <strong className="text-slate-700 font-medium">{stop.arrival_time}</strong></span>
                                )}
                                {stop.departure_time && (
                                  <span>Dep: <strong className="text-slate-700 font-medium">{stop.departure_time}</strong></span>
                                )}
                                {stop.halt_minutes && stop.halt_minutes > 0 ? (
                                  <span className="bg-amber-50 text-amber-800 border border-amber-200/60 px-1.5 py-0.5 rounded font-medium">
                                    {stop.halt_minutes}m halt
                                  </span>
                                ) : null}
                                {stop.distance_km ? (
                                  <span className="text-slate-400 font-medium">{stop.distance_km} km</span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Layover banner if intermediate transfer */}
                  {hasLayover && (
                    <div className="mt-3 py-1.5 px-3 rounded-lg bg-slate-200/60 flex items-center justify-between text-xs text-slate-700">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Transfer Buffer: {seg.layover_after_minutes} minutes
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Sufficient connection security buffer
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Corporate Policy Audit & Expense Summary */}
      <div className="mt-8 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Policy evaluation box */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Corporate Travel Policy Audit
            </h4>
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <p>
              <strong className="text-slate-800">Evaluated Against: </strong>
              {policy.name}
            </p>
            <p>
              <strong className="text-slate-800">Compliance Status: </strong>
              <span className={`font-semibold ${
                route.compliance_status === 'COMPLIANT'
                  ? 'text-emerald-700'
                  : route.compliance_status === 'WARNING'
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}>
                {route.compliance_status}
              </span>
            </p>
            <p>
              <strong className="text-slate-800">Audit Findings: </strong>
              {route.compliance_notes.join(' • ')}
            </p>
          </div>
        </div>

        {/* Corporate Expense & Fare Breakdown */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-slate-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Expense & Budget Benchmark
            </h4>
          </div>
          <div className="text-xs text-slate-700 space-y-1">
            <p>
              <strong>Total Itinerary Fare: </strong> {route.currency_symbol || '$'}{(route.total_cost ?? route.total_cost_usd).toLocaleString()} {route.currency || 'USD'}
            </p>
            <p>
              <strong>Policy Benchmark Limit: </strong> {route.currency_symbol || '$'}{(route.benchmark_cost ?? route.benchmark_cost_usd).toLocaleString()} {route.currency || 'USD'}
            </p>
            <p className={(route.total_cost ?? route.total_cost_usd) <= (route.benchmark_cost ?? route.benchmark_cost_usd) ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
              {(route.total_cost ?? route.total_cost_usd) <= (route.benchmark_cost ?? route.benchmark_cost_usd)
                ? `Policy Compliant: ${route.currency_symbol || '$'}${Math.round((route.benchmark_cost ?? route.benchmark_cost_usd) - (route.total_cost ?? route.total_cost_usd)).toLocaleString()} savings achieved below allowable limit.`
                : `Budget Variance: ${route.currency_symbol || '$'}${Math.round((route.total_cost ?? route.total_cost_usd) - (route.benchmark_cost ?? route.benchmark_cost_usd)).toLocaleString()} over benchmark (pre-approval required).`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
