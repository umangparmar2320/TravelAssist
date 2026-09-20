import React, { useState } from 'react';
import {
  ShieldCheck,
  DollarSign,
  AlertCircle,
  Plus,
  Save,
  CheckCircle2,
  Sliders,
  Plane,
  Train,
} from 'lucide-react';
import { CorporatePolicy, CabinClass } from '../types/travel';

interface PolicyManagerProps {
  policies: CorporatePolicy[];
  activePolicyId: string;
  onSelectPolicy: (id: string) => void;
  onUpdatePolicy: (updated: CorporatePolicy) => void;
}

export const PolicyManager: React.FC<PolicyManagerProps> = ({
  policies,
  activePolicyId,
  onSelectPolicy,
  onUpdatePolicy,
}) => {
  const currentPolicy = policies.find((p) => p.id === activePolicyId) || policies[0];
  const [formData, setFormData] = useState<CorporatePolicy>({ ...currentPolicy });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if selected policy changes
  React.useEffect(() => {
    setFormData({ ...currentPolicy });
    setSavedSuccess(false);
  }, [activePolicyId, currentPolicy]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePolicy(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div id="policy-manager-container" className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Corporate Travel Policy Configuration Studio
          </h2>
          <p className="text-xs text-slate-500">
            Establish automated compliance rules, allowable fare caps, cabin authorizations, and pre-approved rebooking thresholds.
          </p>
        </div>

        {/* Policy Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Policy:</span>
          <select
            id="policy-editor-select"
            value={activePolicyId}
            onChange={(e) => onSelectPolicy(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-500"
          >
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Policy Edit Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Name & Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Policy Name
            </label>
            <input
              id="policy-name-input"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Policy Objective & Description
            </label>
            <input
              id="policy-desc-input"
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Sliders & Numeric Caps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Max Additional Fare */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Allowable Fare Delta</span>
              <span className="text-emerald-700 font-bold">+${formData.max_additional_fare_usd} USD</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Max amount above lowest baseline fare bookable without manager approval.
            </p>
            <input
              id="max-fare-delta-slider"
              type="range"
              min="0"
              max="500"
              step="10"
              value={formData.max_additional_fare_usd}
              onChange={(e) => setFormData({ ...formData, max_additional_fare_usd: Number(e.target.value) })}
              className="w-full accent-emerald-600"
            />
          </div>

          {/* Mandatory Rail Distance */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Mandatory Rail Corridor</span>
              <span className="text-emerald-700 font-bold">{formData.mandate_rail_under_km} km</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Flights prohibited for corridors under this distance where rail is available.
            </p>
            <input
              id="rail-mandate-slider"
              type="range"
              min="200"
              max="800"
              step="50"
              value={formData.mandate_rail_under_km}
              onChange={(e) => setFormData({ ...formData, mandate_rail_under_km: Number(e.target.value) })}
              className="w-full accent-emerald-600"
            />
          </div>

          {/* Auto-Rebooking Limit */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Auto-Rebooking Allowance</span>
              <span className="text-indigo-700 font-bold">+${formData.auto_rebooking_max_delta_usd} USD</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Max replacement segment fare change pre-approved during flight/train disruptions.
            </p>
            <input
              id="auto-rebook-slider"
              type="range"
              min="50"
              max="600"
              step="25"
              value={formData.auto_rebooking_max_delta_usd}
              onChange={(e) => setFormData({ ...formData, auto_rebooking_max_delta_usd: Number(e.target.value) })}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>

        {/* Cabin Class Authorizations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Domestic / Short-Haul Cabin Authorization
            </label>
            <select
              id="cabin-domestic-select"
              value={formData.allowed_cabin_domestic}
              onChange={(e) => setFormData({ ...formData, allowed_cabin_domestic: e.target.value as CabinClass })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-900"
            >
              <option value="ECONOMY">Economy Class Only</option>
              <option value="PREMIUM_ECONOMY">Premium Economy</option>
              <option value="BUSINESS">Business Class</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Long-Haul (over {formData.international_flight_duration_threshold_hours}h) Cabin Authorization
            </label>
            <select
              id="cabin-intl-select"
              value={formData.allowed_cabin_international}
              onChange={(e) => setFormData({ ...formData, allowed_cabin_international: e.target.value as CabinClass })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-900"
            >
              <option value="ECONOMY">Economy Class</option>
              <option value="PREMIUM_ECONOMY">Premium Economy</option>
              <option value="BUSINESS">Business Class</option>
              <option value="FIRST">First Class</option>
            </select>
          </div>
        </div>

        {/* Preferred and Blocked Carriers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Preferred Airlines & Transit Operators (Comma-separated)
            </label>
            <input
              id="preferred-carriers-input"
              type="text"
              value={formData.preferred_carriers.join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  preferred_carriers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Blocked / Non-compliant Carriers (Comma-separated)
            </label>
            <input
              id="blocked-carriers-input"
              type="text"
              value={formData.blocked_carriers.join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  blocked_carriers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
            />
          </div>
        </div>

        {/* Submit action */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Rules take effect immediately across all newly calculated route itineraries.
          </div>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Policy Rules Applied
              </span>
            )}
            <button
              id="save-policy-btn"
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save & Update Policy</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
