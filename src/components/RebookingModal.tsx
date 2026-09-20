import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  X,
  Sparkles,
  Zap,
} from 'lucide-react';
import { RouteOption, RebookingAlternative, CorporatePolicy } from '../types/travel';

interface RebookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: RouteOption | null;
  delayMinutes: number;
  breachMinutes: number;
  alternatives: RebookingAlternative[];
  policy: CorporatePolicy;
  onApplyRebooking: (alternative: RebookingAlternative) => void;
}

export const RebookingModal: React.FC<RebookingModalProps> = ({
  isOpen,
  onClose,
  route,
  delayMinutes,
  breachMinutes,
  alternatives,
  policy,
  onApplyRebooking,
}) => {
  if (!isOpen || !route) return null;

  const curr = route.currency || 'USD';
  const sym = route.currency_symbol || (curr === 'INR' ? '₹' : '$');
  const allowanceAmount =
    curr === 'INR'
      ? Math.round(policy.auto_rebooking_max_delta_usd * 84.5)
      : policy.auto_rebooking_max_delta_usd;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        id="rebooking-modal-card"
        className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-amber-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/60 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-base leading-tight">
                Disruption Alert: Missed Connection Detected
              </h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Automated Rebooking Engine & Policy Evaluation
              </p>
            </div>
          </div>
          <button
            id="close-rebooking-modal-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-amber-600/50 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Disruption Metrics Box */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-semibold text-sm text-amber-950 flex items-center gap-1.5">
              <span>Impact Analysis on {route.title}</span>
            </div>
            <p>
              A simulated delay of <strong>+{delayMinutes} minutes</strong> has exceeded the scheduled transfer buffer by <strong>{breachMinutes} minutes</strong>, causing an involuntary missed onward connection.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-amber-800">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Original arrival: {route.segments[route.segments.length - 1]?.arrival_time}
              </span>
            </div>
          </div>

          {/* Corporate Policy Rebooking Clause */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Corporate Policy Auto-Rebooking Evaluation ({policy.name})</span>
            </div>
            <p className="text-slate-600">
              Auto-rebooking allowance: Up to <strong>+{sym}{allowanceAmount.toLocaleString()} {curr}</strong> additional fare.
              {policy.auto_rebooking_allowed ? (
                <span className="text-emerald-700 font-medium ml-1">
                  • Pre-authorization active (No manager approval needed if under limit).
                </span>
              ) : (
                <span className="text-rose-700 font-medium ml-1">
                  • Manual approval required for all fare changes.
                </span>
              )}
            </p>
          </div>

          {/* Alternative Itineraries */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Available Recovery Alternatives ({alternatives.length})
            </h4>

            <div className="space-y-3">
              {alternatives.map((alt) => (
                <div
                  key={alt.id}
                  id={`alt-card-${alt.id}`}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{alt.title}</span>
                      {alt.is_policy_compliant ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Auto-Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Manager Sign-off Required
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        New ETA: <strong>{alt.new_arrival_time}</strong> (+{alt.duration_delta_minutes}m)
                      </span>
                      <span>
                        Fare delta: <strong>+{alt.currency_symbol || sym}{(alt.cost_delta ?? alt.cost_delta_usd).toLocaleString()} {alt.currency || curr}</strong>
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      {alt.policy_rule_note}
                    </div>
                  </div>

                  <button
                    id={`apply-rebooking-${alt.id}`}
                    type="button"
                    onClick={() => onApplyRebooking(alt)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Confirm & Rebook</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            id="dismiss-rebooking-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
          >
            Dismiss Disruption
          </button>
        </div>
      </div>
    </div>
  );
};
