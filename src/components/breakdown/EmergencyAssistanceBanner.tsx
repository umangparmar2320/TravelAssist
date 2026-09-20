import React from "react";
import {
  AlertOctagon,
  PhoneCall,
  ShieldAlert,
  Clock,
  MapPin,
  HelpCircle,
  Compass,
  ArrowRight,
  Sparkles,
  Building2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { EmergencyAssistanceInfo, ReplanWarning } from "../../types";

interface EmergencyAssistanceBannerProps {
  status?: string;
  emergencyAssistance?: EmergencyAssistanceInfo;
  warnings?: ReplanWarning[];
  suggestedDestinations?: string[];
  currentLocation?: string;
  destination?: string;
  onSelectAlternativeDestination?: (dest: string) => void;
}

export const EmergencyAssistanceBanner: React.FC<EmergencyAssistanceBannerProps> = ({
  status,
  emergencyAssistance,
  warnings,
  suggestedDestinations,
  currentLocation = "Current Location",
  destination = "Destination",
  onSelectAlternativeDestination,
}) => {
  if (!emergencyAssistance && (!warnings || warnings.length === 0) && status === "SUCCESS") {
    return null;
  }

  const isSevere =
    status === "ALL_SERVICES_CANCELLED" ||
    status === "NO_ROUTE_FOUND" ||
    status === "NO_TRANSPORT_OPTIONS" ||
    status === "CONNECTION_IMPOSSIBLE" ||
    status === "DESTINATION_UNAVAILABLE";

  return (
    <div
      id="emergency-assistance-panel"
      className={`rounded-2xl border p-5 sm:p-6 transition-all ${
        isSevere
          ? "bg-rose-50/90 border-rose-300 text-rose-950 shadow-sm"
          : "bg-amber-50/80 border-amber-200 text-amber-950 shadow-xs"
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rose-200/60">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isSevere ? "bg-rose-600 text-white" : "bg-amber-500 text-white"
            }`}
          >
            {isSevere ? (
              <AlertOctagon className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/80 border border-rose-200 text-rose-800">
                {status || "RESILIENCE ADVISORY"}
              </span>
              <span className="text-xs text-rose-700/80 font-mono">
                Safe Contingency Protocol
              </span>
            </div>
            <h3 className="text-base font-bold mt-1 text-zinc-900">
              {emergencyAssistance?.title || "Traveller Assistance & Network Contingency"}
            </h3>
          </div>
        </div>

        {(emergencyAssistance?.helpline_number || (emergencyAssistance as any)?.helpline) && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-rose-200 shadow-xs">
            <PhoneCall className="h-4 w-4 text-rose-600" />
            <div className="text-left">
              <span className="text-[10px] block text-zinc-500 uppercase tracking-wider font-medium">
                24/7 Helpline
              </span>
              <span className="text-xs font-bold text-zinc-900 font-mono">
                {emergencyAssistance?.helpline_number || (emergencyAssistance as any)?.helpline}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Advisory Text */}
      {emergencyAssistance?.advisory && (
        <p className="mt-3.5 text-xs text-zinc-700 leading-relaxed font-medium">
          {emergencyAssistance.advisory}
        </p>
      )}

      {/* Actionable Passenger Steps */}
      {emergencyAssistance?.actionable_steps && emergencyAssistance.actionable_steps.length > 0 && (
        <div className="mt-4 bg-white/80 rounded-xl border border-rose-200/60 p-3.5 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Recommended Immediate Actions for Travellers
          </h4>
          <ul className="space-y-1.5">
            {emergencyAssistance.actionable_steps.map((step, idx) => (
              <li
                key={idx}
                className="text-xs text-zinc-700 flex items-start gap-2 leading-relaxed"
              >
                <span className="h-4 w-4 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nearby Hubs / Alternative Destinations */}
      {((emergencyAssistance?.suggested_nearest_hubs && emergencyAssistance.suggested_nearest_hubs.length > 0) || (suggestedDestinations && suggestedDestinations.length > 0)) && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-rose-200/50">
          <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
            <Compass className="h-3.5 w-3.5 text-indigo-600" />
            Reachable Alternate Hubs:
          </span>
          {(emergencyAssistance?.suggested_nearest_hubs || suggestedDestinations || []).map((hub, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectAlternativeDestination && onSelectAlternativeDestination(hub)}
              className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-xs font-medium text-zinc-800 transition-colors cursor-pointer flex items-center gap-1"
            >
              <MapPin className="h-3 w-3 text-indigo-500" />
              <span>{hub}</span>
              <ArrowRight className="h-2.5 w-2.5 text-zinc-400" />
            </button>
          ))}
        </div>
      )}

      {/* Warnings & Resolutions list */}
      {warnings && warnings.length > 0 && (
        <div className="mt-3.5 space-y-1.5">
          {warnings.map((w, idx) => (
            <div
              key={idx}
              className="text-[11px] p-2.5 rounded-lg bg-white/70 border border-amber-200/80 text-zinc-800 flex items-start justify-between gap-2"
            >
              <div className="flex items-start gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-zinc-900">{w.message}</span>
                  {w.resolution && (
                    <span className="block text-zinc-600 mt-0.5 font-sans">
                      Resolution: {w.resolution}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 shrink-0">
                {w.code}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
