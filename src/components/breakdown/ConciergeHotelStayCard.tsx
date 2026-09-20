import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sun,
  Edit3,
  RefreshCw,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import { HotelStay } from '../../types/unifiedContract';

interface ConciergeHotelStayCardProps {
  hotel: HotelStay | null;
  loading: boolean;
  onRefresh?: () => void;
  destinationCity: string;
  revisedArrivalTime?: string;
  onNotifyLateArrival?: (instructions: string) => Promise<boolean>;
  onModifyDates?: (newDate: string, notes: string) => Promise<boolean>;
}

export const ConciergeHotelStayCard: React.FC<ConciergeHotelStayCardProps> = ({
  hotel,
  loading,
  onRefresh,
  destinationCity,
  revisedArrivalTime,
  onNotifyLateArrival,
  onModifyDates,
}) => {
  const [notifying, setNotifying] = useState(false);
  const [notificationSuccess, setNotificationSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState(hotel?.check_in_date || '');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSendNotification = async () => {
    if (!hotel) return;
    setNotifying(true);
    setNotificationSuccess(null);
    try {
      const instructions = `Traveler disrupted in-transit (Bhavnagar-Kerala corridor). Guaranteed room hold requested until revised arrival at ${
        revisedArrivalTime || '10:30 PM'
      }.`;
      if (onNotifyLateArrival) {
        const ok = await onNotifyLateArrival(instructions);
        if (ok) {
          setNotificationSuccess(
            `Front Desk at ${hotel.hotel_name} notified! Guaranteed late arrival room hold active until 02:00 AM.`
          );
        }
      } else {
        const res = await fetch(`/api/hotels/${hotel.trip_id}/modify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            late_check_in_notified: true,
            special_instructions: instructions,
          }),
        });
        if (res.ok) {
          setNotificationSuccess(
            `Front Desk at ${hotel.hotel_name} notified! Guaranteed late arrival room hold active until 02:00 AM.`
          );
        }
      }
    } catch (err) {
      console.error('Failed to notify hotel:', err);
    } finally {
      setNotifying(false);
    }
  };

  const handleSaveModification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel) return;
    setSavingEdit(true);
    try {
      if (onModifyDates) {
        await onModifyDates(editDate, editNotes);
      } else {
        await fetch(`/api/hotels/${hotel.trip_id}/modify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            new_check_in_date: editDate,
            special_instructions: editNotes,
          }),
        });
      }
      setIsEditing(false);
      setNotificationSuccess('Hotel reservation details updated with corporate travel partner.');
    } catch (err) {
      console.error('Failed to modify hotel:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-center gap-3 text-slate-500 text-xs py-8">
        <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
        <span>Synchronizing destination hotel stay and late check-in protection...</span>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-5 shadow-xs text-center text-xs text-slate-500">
        <Building2 className="h-6 w-6 text-slate-400 mx-auto mb-2" />
        <p className="font-semibold text-slate-700">No destination accommodation linked</p>
        <p className="text-[11px] text-slate-400 mt-1">
          When replanning to {destinationCity || 'your destination'}, hotels will automatically sync here.
        </p>
      </div>
    );
  }

  const isDelayed =
    hotel.status === 'CHECK_IN_DELAYED' ||
    Boolean(revisedArrivalTime) ||
    !hotel.late_check_in_notified;

  return (
    <div
      id="concierge-hotel-stay-card"
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
    >
      {/* Header: Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                Destination Stay Protection
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Code: {hotel.confirmation_code}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
              {hotel.hotel_name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hotel.late_check_in_notified ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Room Hold Active
            </span>
          ) : isDelayed ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Late Check-in Risk
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
              <Check className="h-3.5 w-3.5 text-blue-600" />
              Confirmed
            </span>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
              title="Refresh hotel status"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Notification Success Banner */}
      {notificationSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{notificationSuccess}</div>
        </div>
      )}

      {/* Hotel Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[11px] text-slate-500 block mb-0.5 flex items-center gap-1 font-medium">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            Location & City
          </span>
          <span className="font-semibold text-slate-800 line-clamp-1">
            {hotel.city || destinationCity}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5 line-clamp-1">
            {hotel.address}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[11px] text-slate-500 block mb-0.5 flex items-center gap-1 font-medium">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Check-in & Room Type
          </span>
          <span className="font-semibold text-slate-800">{hotel.check_in_date}</span>
          <span className="text-[11px] text-slate-500 block mt-0.5 line-clamp-1">
            {hotel.room_type}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
          <span className="text-[11px] text-amber-800 block mb-0.5 flex items-center gap-1 font-medium">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            Arrival Timing Sync
          </span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 line-through text-[11px]">
              {hotel.original_check_in_time}
            </span>
            <span className="font-bold text-amber-900">
              {revisedArrivalTime || hotel.estimated_arrival_time || '10:30 PM'}
            </span>
          </div>
          <span className="text-[10px] text-amber-700 block mt-0.5 font-medium">
            {hotel.late_check_in_notified
              ? '✓ Front desk notified of delayed arrival'
              : '⚠ Action advised: notify front desk'}
          </span>
        </div>
      </div>

      {/* Destination Intel & Helpline */}
      {hotel.destination_info && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span>Weather: {hotel.destination_info.weather_condition} ({hotel.destination_info.temperature_celsius}°C)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="h-3 w-3 text-slate-400" />
              <span>Helpline: <strong>{hotel.destination_info.emergency_helpline}</strong></span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
            <strong>Transit & First-Mile:</strong> {hotel.destination_info.transit_tips}
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSendNotification}
          disabled={notifying}
          className={`flex-1 min-w-[220px] py-3 px-4 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
            hotel.late_check_in_notified
              ? "bg-emerald-700 hover:bg-emerald-800 text-white"
              : "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md"
          }`}
        >
          {notifying ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Notifying Hotel Front Desk...</span>
            </>
          ) : (
            <>
              {hotel.late_check_in_notified ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              ) : (
                <Send className="h-3.5 w-3.5 text-slate-950" />
              )}
              <span>
                {hotel.late_check_in_notified
                  ? '✓ Front Desk Notified • Re-Send Notice'
                  : '⚡ Notify Hotel of Late Arrival (Guaranteed Room Hold)'}
              </span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="py-3 px-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 bg-white text-slate-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Edit3 className="h-3.5 w-3.5 text-slate-500" />
          <span>{isEditing ? 'Cancel Edit' : 'Modify Dates'}</span>
        </button>

        <a
          href={`tel:${hotel.contact_phone}`}
          className="py-3 px-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 bg-white text-slate-800 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <Phone className="h-3.5 w-3.5 text-emerald-600" />
          <span>Call Desk</span>
        </a>
      </div>

      {/* Inline Modification Form */}
      {isEditing && (
        <form
          onSubmit={handleSaveModification}
          className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Modify Hotel Reservation Dates & Instructions
            </span>
            <span className="text-[11px] text-slate-500">Corporate Travel Desk</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                New Check-In Date
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Special Front Desk Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Flight lands at midnight, keep key at concierge"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              {savingEdit ? 'Updating Reservation...' : 'Save & Dispatch to Hotel'}
            </button>
          </div>
        </form>
      )}

      {/* Corporate Policy Protection Notice */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
        <Shield className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
        <span>
          <strong>Corporate No-Show Protection:</strong> Travel disruption clause active. No cancellation penalty or forfeit charged for delays.
        </span>
      </div>
    </div>
  );
};
