import React from 'react';
import {
  Briefcase,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plane,
  Train,
  Navigation,
  Car,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { BookedTrip, SegmentMode } from '../types/travel';

interface ActiveTripsViewProps {
  trips: BookedTrip[];
  onCancelTrip: (id: string) => void;
  onSimulateDisruptionOnTrip: (trip: BookedTrip) => void;
  onBookSampleTrip: () => void;
  onOpenTripInConcierge?: (trip: BookedTrip) => void;
}

export const ActiveTripsView: React.FC<ActiveTripsViewProps> = ({
  trips,
  onCancelTrip,
  onSimulateDisruptionOnTrip,
  onBookSampleTrip,
  onOpenTripInConcierge,
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
      default:
        return <Navigation className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  if (trips.length === 0) {
    return (
      <div id="no-trips-placeholder" className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">
          No Active Corporate Bookings
        </h3>
        <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
          Plan a multi-modal journey in the Route Planner and click &quot;Book Corporate Itinerary&quot; to manage your trips and test automated rebooking.
        </p>
        <button
          id="book-sample-trip-btn"
          type="button"
          onClick={onBookSampleTrip}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
        >
          <span>Book Sample Itinerary (NYC ⇄ DC)</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div id="active-trips-container" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Active Corporate Travel Itineraries ({trips.length})
          </h2>
          <p className="text-xs text-slate-500">
            Real-time status tracking, corporate expense confirmation & automated rebooking logs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {trips.map((trip) => (
          <div
            key={trip.id}
            id={`booked-trip-card-${trip.id}`}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 hover:border-slate-300 transition-all"
          >
            {/* Top row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {trip.booking_ref}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      trip.status === 'REBOOKED'
                        ? 'bg-purple-100 text-purple-800'
                        : trip.status === 'DELAYED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {trip.status === 'REBOOKED' && <RotateCcw className="w-3 h-3 text-purple-600" />}
                    {trip.status === 'CONFIRMED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    {trip.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    • Booked on {trip.booked_at}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {trip.title}
                </h3>
              </div>

              {/* Fare & Traveler info */}
              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Approved Fare</div>
                  <div className="text-sm font-bold text-slate-900">
                    {trip.currency_symbol || '$'}{(trip.total_cost ?? trip.total_cost_usd).toLocaleString()} {trip.currency || 'USD'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Employee</div>
                  <div className="text-sm font-bold text-slate-700">{trip.traveler_name}</div>
                </div>
              </div>
            </div>

            {/* Segments list */}
            <div className="py-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Itinerary Legs ({trip.segments.length})
              </div>
              <div className="space-y-2">
                {trip.segments.map((seg, idx) => (
                  <div
                    key={seg.id || idx}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        {getModeIcon(seg.mode)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {seg.provider_name} {seg.flight_or_service_num ? `(${seg.flight_or_service_num})` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {seg.start_name} → {seg.end_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-slate-800">
                          {seg.departure_time} - {seg.arrival_time}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {seg.duration_minutes} mins • {seg.cabin_class || 'Standard'}
                        </div>
                      </div>
                      {seg.is_rebooked && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                          Auto-Rebooked
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer action bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Travel Date: {trip.departure_date}</span>
              </div>

              <div className="flex items-center gap-2">
                {onOpenTripInConcierge && (
                  <button
                    type="button"
                    onClick={() => onOpenTripInConcierge(trip)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                    title="Test this trip in the Autonomous Disruption Concierge"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Disruption Concierge</span>
                  </button>
                )}
                <button
                  id={`simulate-trip-disruption-btn-${trip.id}`}
                  type="button"
                  onClick={() => onSimulateDisruptionOnTrip(trip)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Simulate Delay & Auto-Rebooking</span>
                </button>
                <button
                  id={`cancel-trip-btn-${trip.id}`}
                  type="button"
                  onClick={() => onCancelTrip(trip.id)}
                  className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  Cancel Itinerary
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
