import React from 'react';
import {
  Calendar,
  ArrowRightLeft,
  Layers,
  Sparkles,
  Shield,
  Zap,
  User,
  Briefcase,
  MapPin,
} from 'lucide-react';
import { TravelMode, PreferenceMode, CorporatePolicy, TravelerProfile } from '../types/travel';
import { CITY_PRESETS } from '../data/travelData';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { PlaceResult } from '../services/googlePlaces';

interface RouteSearchFormProps {
  originPlace: PlaceResult;
  destPlace: PlaceResult;
  onChangeOrigin: (place: PlaceResult) => void;
  onChangeDest: (place: PlaceResult) => void;
  travelMode: TravelMode;
  setTravelMode: (mode: TravelMode) => void;
  preference: PreferenceMode;
  setPreference: (pref: PreferenceMode) => void;
  selectedPolicy: CorporatePolicy;
  setSelectedPolicy: (policy: CorporatePolicy) => void;
  policies: CorporatePolicy[];
  currentTraveler: TravelerProfile;
  travelers: TravelerProfile[];
  onSelectTraveler: (traveler: TravelerProfile) => void;
  departureDate: string;
  setDepartureDate: (date: string) => void;
  departureTime: string;
  setDepartureTime: (time: string) => void;
  viaStation?: string;
  setViaStation?: (station: string) => void;
  onSearch: () => void;
  isCalculating: boolean;
}

export const RouteSearchForm: React.FC<RouteSearchFormProps> = ({
  originPlace,
  destPlace,
  onChangeOrigin,
  onChangeDest,
  travelMode,
  setTravelMode,
  preference,
  setPreference,
  selectedPolicy,
  setSelectedPolicy,
  policies,
  currentTraveler,
  travelers,
  onSelectTraveler,
  departureDate,
  setDepartureDate,
  departureTime,
  setDepartureTime,
  viaStation = '',
  setViaStation,
  onSearch,
  isCalculating,
}) => {
  const handleSwap = () => {
    const temp = { ...originPlace };
    onChangeOrigin(destPlace);
    onChangeDest(temp);
  };

  const handleApplyPreset = (origCode: string, destCode: string) => {
    const origCity = CITY_PRESETS.find((c) => c.code === origCode);
    const destCity = CITY_PRESETS.find((c) => c.code === destCode);
    if (!origCity || !destCity) return;

    onChangeOrigin({
      name: `${origCity.name} (${origCity.code})`,
      formattedAddress: `${origCity.name}, ${origCity.country}`,
      lat: origCity.lat,
      lon: origCity.lon,
      city: origCity.name,
      country: origCity.country,
      code: origCity.code,
    });

    onChangeDest({
      name: `${destCity.name} (${destCity.code})`,
      formattedAddress: `${destCity.name}, ${destCity.country}`,
      lat: destCity.lat,
      lon: destCity.lon,
      city: destCity.name,
      country: destCity.country,
      code: destCity.code,
    });
  };

  return (
    <div id="route-search-card" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 mb-8">
      {/* Top Bar: Corporate Corridor Quick Picks & Traveler Switcher */}
      <div className="mb-5 pb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Corporate Corridors:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              id="preset-nad-tal"
              type="button"
              onClick={() => handleApplyPreset('NAD', 'TAL')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                originPlace.code === 'NAD' && destPlace.code === 'TAL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Nadiad ⇄ Talaja (Gujarat)
            </button>
            <button
              id="preset-bom-del"
              type="button"
              onClick={() => handleApplyPreset('BOM', 'DEL')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                originPlace.code === 'BOM' && destPlace.code === 'DEL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Mumbai ⇄ Delhi
            </button>
            <button
              id="preset-nyc-was"
              type="button"
              onClick={() => handleApplyPreset('NYC', 'WAS')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                originPlace.code === 'NYC' && destPlace.code === 'WAS'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              NYC ⇄ Washington DC
            </button>
            <button
              id="preset-lon-par"
              type="button"
              onClick={() => handleApplyPreset('LON', 'PAR')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                originPlace.code === 'LON' && destPlace.code === 'PAR'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              London ⇄ Paris
            </button>
            <button
              id="preset-sfo-sea"
              type="button"
              onClick={() => handleApplyPreset('SFO', 'SEA')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                originPlace.code === 'SFO' && destPlace.code === 'SEA'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              SF ⇄ Seattle
            </button>
            <button
              id="preset-tyo-kyo"
              type="button"
              onClick={() => handleApplyPreset('TYO', 'KYO')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                originPlace.code === 'TYO' && destPlace.code === 'KYO'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tokyo ⇄ Kyoto
            </button>
          </div>
        </div>

        {/* Traveler Switcher */}
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500">Employee:</span>
          <select
            id="traveler-selector"
            value={currentTraveler.id}
            onChange={(e) => {
              const found = travelers.find((t) => t.id === e.target.value);
              if (found) onSelectTraveler(found);
            }}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            {travelers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.tier})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Google Places Autocomplete Origin & Destination Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-end mb-5">
        {/* Origin */}
        <div className="md:col-span-5">
          <PlaceAutocompleteInput
            id="origin-place-input"
            label="Origin (Any City, Airport, Address, or Hub)"
            placeholder="Search departure place worldwide (Google Places)..."
            value={originPlace}
            onChange={onChangeOrigin}
          />
        </div>

        {/* Swap button */}
        <div className="md:col-span-2 flex justify-center pb-1">
          <button
            id="swap-locations-btn"
            type="button"
            onClick={handleSwap}
            className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 shadow-2xs hover:text-slate-900 transition-all active:scale-95"
            title="Swap Origin and Destination"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Destination */}
        <div className="md:col-span-5">
          <PlaceAutocompleteInput
            id="dest-place-input"
            label="Destination (Any City, Airport, Address, or Hub)"
            placeholder="Search arrival destination worldwide (Google Places)..."
            value={destPlace}
            onChange={onChangeDest}
          />
        </div>
      </div>

      {/* Optional Via / Intermediate Station (Beech Ka Station) */}
      {setViaStation && (
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-semibold text-slate-700">
              Intermediate Station (Beech Ka Station):
            </span>
            <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
              (Optional — e.g. Vadodara, Bhavnagar, Lyon; auto-generated if left blank)
            </span>
          </div>
          <div className="w-full sm:w-80">
            <input
              id="via-station-input"
              type="text"
              placeholder="e.g. Vadodara, Anand, Philadelphia..."
              value={viaStation}
              onChange={(e) => setViaStation(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>
      )}

      {/* Second Row: Date & Time, Transit Mode, Corporate Priority, Corporate Policy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 border-t border-slate-100">
        {/* Date & Time */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Departure Date & Time
          </label>
          <div className="flex gap-2">
            <input
              id="departure-date-input"
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-3/5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <input
              id="departure-time-input"
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-2/5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Modal Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Transit Mode Filter
          </label>
          <select
            id="travel-mode-select"
            value={travelMode}
            onChange={(e) => setTravelMode(e.target.value as TravelMode)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="ALL_MODES">All Multi-Modal (Best Mix)</option>
            <option value="RAIL_ONLY">High-Speed Rail & Transit Only</option>
            <option value="FLIGHT_ONLY">Aviation Routes Only</option>
            <option value="GROUND_ONLY">Ground Transit Only (No Flights)</option>
          </select>
        </div>

        {/* Optimization Priority */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-slate-400" />
            Optimization Objective
          </label>
          <select
            id="preference-select"
            value={preference}
            onChange={(e) => setPreference(e.target.value as PreferenceMode)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="FASTEST">Fastest (Shortest Travel Time)</option>
            <option value="BALANCED">Balanced (Corporate Recommended)</option>
            <option value="CHEAPEST">Lowest Fare (Budget Optimized)</option>
          </select>
        </div>

        {/* Corporate Policy */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            Corporate Travel Policy
          </label>
          <select
            id="corporate-policy-select"
            value={selectedPolicy.id}
            onChange={(e) => {
              const pol = policies.find((p) => p.id === e.target.value);
              if (pol) setSelectedPolicy(pol);
            }}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            {policies.map((pol) => (
              <option key={pol.id} value={pol.id}>
                {pol.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action CTA */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-slate-600" />
          <span>Automated corporate travel policy compliance, fare benchmarks & allowable class auditing enabled.</span>
        </div>

        <button
          id="search-routes-btn"
          type="button"
          onClick={onSearch}
          disabled={isCalculating}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide shadow-xs hover:shadow transition-all disabled:opacity-50 active:scale-98"
        >
          {isCalculating ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Evaluating Routes...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Calculate Optimized Routes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
