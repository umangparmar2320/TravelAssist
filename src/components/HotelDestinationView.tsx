import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Sun,
  AlertTriangle,
  CheckCircle2,
  Send,
  RefreshCw,
  Compass,
  Shield,
  Car,
  BellRing,
  ExternalLink,
} from 'lucide-react';
import { HotelStay } from '../types/unifiedContract';
import { CurrencyCode } from '../types/travel';

interface HotelDestinationViewProps {
  tripId?: string;
  currency?: CurrencyCode;
}

export const HotelDestinationView: React.FC<HotelDestinationViewProps> = ({
  tripId = 'trip-mb-goa-001',
  currency = 'INR',
}) => {
  const [hotel, setHotel] = useState<HotelStay | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notifying, setNotifying] = useState<boolean>(false);
  const [modifyModalOpen, setModifyModalOpen] = useState<boolean>(false);
  const [newCheckInDate, setNewCheckInDate] = useState<string>('');
  const [specialNote, setSpecialNote] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchHotelData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hotels/${tripId}`);
      if (res.ok) {
        const data = await res.json();
        setHotel(data.hotel);
        setNewCheckInDate(data.hotel?.check_in_date || '');
      }
    } catch (err) {
      console.warn('Failed to fetch hotel data from server, using fallback', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotelData();
  }, [tripId]);

  const handleNotifyLateCheckIn = async () => {
    setNotifying(true);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/hotels/${tripId}/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          late_check_in_notified: true,
          special_instructions: 'Traveler rerouted due to transit disruption. Hold room for guaranteed late arrival.',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setHotel(data.hotel);
        setActionSuccess('Front desk at hotel notified! Guaranteed room hold activated.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNotifying(false);
    }
  };

  const handleModifyDates = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/hotels/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: tripId,
          new_check_in_date: newCheckInDate,
          special_instructions: specialNote,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setHotel(data.hotel);
        setModifyModalOpen(false);
        setActionSuccess('Hotel reservation dates successfully updated with corporate travel partner.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
        <span>Loading hotel stay and destination intelligence...</span>
      </div>
    );
  }

  const isDelayed = hotel?.status === 'CHECK_IN_DELAYED';

  return (
    <div id="hotel-destination-view" className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner & Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Part C: Hotel & Destination Engine
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-mono">Trip: {tripId}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Hotel Stay & Destination Concierge
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Synchronized accommodation monitoring, automated front-desk delay dispatch, and local destination services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchHotelData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Disruption Risk Alert if check-in is at risk */}
      {isDelayed && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-amber-900">Check-in at Risk Due to Transit Disruption</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Your originally estimated arrival was <span className="font-medium">{hotel?.original_check_in_time}</span>, but transit cancellation has pushed arrival to <span className="font-medium">{hotel?.estimated_arrival_time}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!hotel?.late_check_in_notified ? (
              <button
                type="button"
                onClick={handleNotifyLateCheckIn}
                disabled={notifying}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{notifying ? 'Dispatching Notice...' : 'Send Late Check-in Notice'}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-xl border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Late Check-in Notified</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Two Column Layout: Hotel Reservation Card & Destination Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hotel Details Card (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-medium text-slate-500 uppercase tracking-wider">
                  Confirmation #{hotel?.confirmation_code}
                </span>
                <h2 className="text-lg font-bold text-slate-900">{hotel?.hotel_name}</h2>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{hotel?.address}</span>
                </div>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                hotel?.status === 'CONFIRMED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : hotel?.status === 'CHECK_IN_DELAYED'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {hotel?.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Key Dates & Times Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-500 block">Check-in Date</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{hotel?.check_in_date}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Check-out Date</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{hotel?.check_out_date}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Standard Check-in</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{hotel?.original_check_in_time}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Estimated Arrival</span>
              <span className={`font-semibold text-sm mt-0.5 block ${isDelayed ? 'text-amber-600' : 'text-slate-800'}`}>
                {hotel?.estimated_arrival_time}
              </span>
            </div>
          </div>

          {/* Room Specs and Front Desk Info */}
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Room Category</span>
              <span className="font-medium text-slate-800">{hotel?.room_type}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Direct Hotel Desk Phone</span>
              <a href={`tel:${hotel?.contact_phone}`} className="font-medium text-emerald-700 hover:underline flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                <span>{hotel?.contact_phone}</span>
              </a>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Late Arrival Guarantee Status</span>
              <span className="font-medium text-slate-800">
                {hotel?.late_check_in_notified ? 'Dispatched & Confirmed with Concierge' : 'Action Required if Delayed'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleNotifyLateCheckIn}
              disabled={notifying}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>{notifying ? 'Sending...' : 'Notify Late Check-in'}</span>
            </button>

            <button
              type="button"
              onClick={() => setModifyModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 rounded-xl shadow-xs transition"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Modify Check-in Date</span>
            </button>
          </div>
        </div>

        {/* Destination Information & Services (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Compass className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Destination Services</h3>
          </div>

          {/* Weather Widget */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-blue-600 font-medium uppercase tracking-wider block">
                  Current Weather in {hotel?.city}
                </span>
                <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                  {hotel?.destination_info?.temperature_celsius ?? 29}°C
                </span>
                <span className="text-xs text-slate-600 mt-0.5 block">
                  {hotel?.destination_info?.weather_condition ?? 'Clear Sky'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100/80 text-amber-600 flex items-center justify-center">
                <Sun className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Ground Transfer on Arrival */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-emerald-600" />
              <span>Arrival Ground Transfers</span>
            </span>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {hotel?.destination_info?.transit_tips ||
                'Pre-paid airport counters and GoaMiles app cabs available 24/7. Intercity shuttles operate between railway hub and resort zone.'}
            </p>
          </div>

          {/* Emergency Helplines */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-rose-600" />
              <span>Emergency & Tourist Support</span>
            </span>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Helpline:</span>
                <span className="font-semibold text-slate-800">{hotel?.destination_info?.emergency_helpline || '112 / 1363'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tourist Desk:</span>
                <span className="text-slate-700 text-right">{hotel?.destination_info?.tourist_desk || 'Tourism Board Center'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modify Check-in Date Modal */}
      {modifyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900">Modify Reservation Dates</h3>
            <p className="text-xs text-slate-500 mt-1">
              Update hotel check-in date due to rebooking or travel itinerary change.
            </p>

            <form onSubmit={handleModifyDates} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Check-in Date</label>
                <input
                  type="date"
                  value={newCheckInDate}
                  onChange={(e) => setNewCheckInDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Special Instruction / Note</label>
                <textarea
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  placeholder="e.g., Hold room for traveler rebooked on morning flight."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModifyModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                >
                  Confirm & Sync Stay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
