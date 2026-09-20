import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  RouteOption,
  CorporatePolicy,
  TravelerProfile,
  BookedTrip,
  TravelMode,
  PreferenceMode,
  RebookingAlternative,
  CurrencyCode,
} from './types/travel';
import {
  DEFAULT_POLICIES,
  DEFAULT_TRAVELER,
  CITY_PRESETS,
} from './data/travelData';
import {
  calculateRoutes,
  evaluateDisruptionAndRebooking,
  detectCountryOrRegion,
} from './services/routeEngine';
import { fetchGoogleDirections, GoogleRouteResult } from './services/googleDirections';
import { Header, NavigationTab } from './components/Header';
import { RouteSearchForm } from './components/RouteSearchForm';
import { RouteList } from './components/RouteList';
import { RouteDetailView } from './components/RouteDetailView';
import { ActiveTripsView } from './components/ActiveTripsView';
import { PolicyManager } from './components/PolicyManager';
import { RebookingModal } from './components/RebookingModal';
import { ProviderHealthModal } from './components/ProviderHealthModal';
import { PlaceResult } from './services/googlePlaces';
import { DisruptionConciergeView } from './components/DisruptionConciergeView';
import { RobustnessSuiteView } from './components/RobustnessSuiteView';
import { SystemArchitectureView } from './components/SystemArchitectureView';
import { HotelDestinationView } from './components/HotelDestinationView';
import { NotificationsView } from './components/NotificationsView';
import { EndToEndJourneyModal } from './components/EndToEndJourneyModal';
import { ReplanRouteItem } from './types';

const ADDITIONAL_TRAVELERS: TravelerProfile[] = [
  DEFAULT_TRAVELER,
  {
    id: 'usr-4102',
    name: 'Marcus Vance',
    email: 'm.vance@acmecorp.com',
    department: 'Global Operations',
    tier: 'Executive',
    seat_preference: 'Window',
    preferred_cabin: 'BUSINESS',
    optimization_priority: 'FASTEST',
    preferred_alliances: ['Star Alliance', 'OneWorld'],
    auto_rebooking_opt_in: true,
  },
  {
    id: 'usr-6619',
    name: 'Elena Rostova',
    email: 'e.rostova@acmecorp.com',
    department: 'Corporate Strategy',
    tier: 'Standard Employee',
    seat_preference: 'Aisle',
    preferred_cabin: 'ECONOMY',
    optimization_priority: 'BALANCED',
    preferred_alliances: ['SkyTeam'],
    auto_rebooking_opt_in: true,
  },
];

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<NavigationTab>('planner');
  const [telemetryModalOpen, setTelemetryModalOpen] = useState(false);

  // Concierge Bridge Parameters
  const [conciergeOrigin, setConciergeOrigin] = useState<string>('Mumbai Central');
  const [conciergeDest, setConciergeDest] = useState<string>('Goa');
  const [conciergeDisruption, setConciergeDisruption] = useState<string>('Train cancelled');

  // Search State with Google Places Integration
  const [originPlace, setOriginPlace] = useState<PlaceResult>({
    name: `${CITY_PRESETS[0].name} (${CITY_PRESETS[0].code})`,
    formattedAddress: `${CITY_PRESETS[0].name}, ${CITY_PRESETS[0].country}`,
    lat: CITY_PRESETS[0].lat,
    lon: CITY_PRESETS[0].lon,
    city: CITY_PRESETS[0].name,
    country: CITY_PRESETS[0].country,
    code: CITY_PRESETS[0].code,
  });

  const [destPlace, setDestPlace] = useState<PlaceResult>({
    name: `${CITY_PRESETS[1].name} (${CITY_PRESETS[1].code})`,
    formattedAddress: `${CITY_PRESETS[1].name}, ${CITY_PRESETS[1].country}`,
    lat: CITY_PRESETS[1].lat,
    lon: CITY_PRESETS[1].lon,
    city: CITY_PRESETS[1].name,
    country: CITY_PRESETS[1].country,
    code: CITY_PRESETS[1].code,
  });

  const [travelMode, setTravelMode] = useState<TravelMode>('ALL_MODES');
  const [preference, setPreference] = useState<PreferenceMode>('FASTEST');
  const [departureDate, setDepartureDate] = useState('2026-09-21');
  const [departureTime, setDepartureTime] = useState('08:00');
  const [viaStation, setViaStation] = useState('');

  // Corporate Policy & Traveler State
  const [policies, setPolicies] = useState<CorporatePolicy[]>(DEFAULT_POLICIES);
  const [selectedPolicy, setSelectedPolicy] = useState<CorporatePolicy>(DEFAULT_POLICIES[0]);
  const [travelers] = useState<TravelerProfile[]>(ADDITIONAL_TRAVELERS);
  const [currentTraveler, setCurrentTraveler] = useState<TravelerProfile>(DEFAULT_TRAVELER);

  // Route Results & Currency State
  const [isCalculating, setIsCalculating] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);

  // Auto-detect regional currency when origin or destination changes
  useEffect(() => {
    const region = detectCountryOrRegion(
      originPlace.name,
      originPlace.code || '',
      destPlace.name,
      destPlace.code || '',
      { lat: originPlace.lat, lon: originPlace.lon },
      { lat: destPlace.lat, lon: destPlace.lon }
    );
    if (region.isIndia) {
      setCurrency('INR');
    } else if (region.isUK) {
      setCurrency('GBP');
    } else if (region.isEurope) {
      setCurrency('EUR');
    }
  }, [originPlace, destPlace]);

  // Active Booked Trips
  const [bookedTrips, setBookedTrips] = useState<BookedTrip[]>(() => {
    try {
      const saved = localStorage.getItem('smart_route_booked_trips');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'trip-init-1',
        booking_ref: 'TRIP-2026-8192',
        traveler_id: DEFAULT_TRAVELER.id,
        traveler_name: DEFAULT_TRAVELER.name,
        route_id: 'rt-acela-1',
        title: 'Amtrak Acela Express (Downtown-to-Downtown)',
        origin_name: 'New York Moynihan Train Hall',
        destination_name: 'Washington Union Station',
        departure_date: '2026-09-22',
        status: 'CONFIRMED',
        total_cost_usd: 185,
        booked_at: '2026-09-19',
        policy_id: DEFAULT_POLICIES[0].id,
        policy_status: 'COMPLIANT',
        segments: [
          {
            id: 'seg-init-1',
            sequence_order: 1,
            mode: 'HIGH_SPEED_RAIL',
            provider_name: 'Amtrak Acela',
            flight_or_service_num: 'Acela Express #2159',
            cabin_class: 'BUSINESS',
            start_name: 'New York Moynihan Train Hall',
            start_lat: 40.7513,
            start_lon: -73.9934,
            departure_time: '08:05 AM',
            end_name: 'Washington Union Station',
            end_lat: 38.8973,
            end_lon: -77.0063,
            arrival_time: '11:03 AM',
            distance_km: 365,
            duration_minutes: 178,
            delay_minutes: 0,
            cost_usd: 185,
            instructions: 'Reserved Business seat. Car 3, Seat 12A.',
          },
        ],
      },
    ];
  });

  // Persist booked trips
  useEffect(() => {
    try {
      localStorage.setItem('smart_route_booked_trips', JSON.stringify(bookedTrips));
    } catch {
      // ignore
    }
  }, [bookedTrips]);

  // Disruption & Rebooking Modal State
  const [rebookingModalOpen, setRebookingModalOpen] = useState(false);
  const [e2eModalOpen, setE2EModalOpen] = useState(false);
  const [disruptionDelay, setDisruptionDelay] = useState(0);
  const [disruptionBreach, setDisruptionBreach] = useState(0);
  const [rebookingAlternatives, setRebookingAlternatives] = useState<RebookingAlternative[]>([]);
  const [disruptedRoute, setDisruptedRoute] = useState<RouteOption | null>(null);

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Compute routes with Google Directions integration and regional calibration
  const runRouteSearch = async () => {
    setIsCalculating(true);
    let googleRoute: GoogleRouteResult | null = null;

    try {
      if (originPlace && destPlace && (originPlace.lat || destPlace.lat)) {
        googleRoute = await fetchGoogleDirections(
          { lat: originPlace.lat, lon: originPlace.lon },
          { lat: destPlace.lat, lon: destPlace.lon }
        );
      }
    } catch (e) {
      console.warn('Google Directions live API fallback:', e);
    }

    const calculated = calculateRoutes(
      originPlace.name,
      originPlace.code || 'HUB',
      destPlace.name,
      destPlace.code || 'DST',
      travelMode,
      preference,
      selectedPolicy,
      currentTraveler,
      { lat: originPlace.lat, lon: originPlace.lon },
      { lat: destPlace.lat, lon: destPlace.lon },
      googleRoute,
      currency,
      viaStation.trim() || undefined
    );
    setRoutes(calculated);
    setSelectedRoute(calculated[0] || null);
    setIsCalculating(false);
  };

  useEffect(() => {
    runRouteSearch();
  }, [originPlace, destPlace, travelMode, preference, selectedPolicy, currency, viaStation]);

  // Booking action
  const handleBookTrip = (route: RouteOption) => {
    const newRef = `TRIP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTrip: BookedTrip = {
      id: `trip-${Date.now()}`,
      booking_ref: newRef,
      traveler_id: currentTraveler.id,
      traveler_name: currentTraveler.name,
      route_id: route.id,
      title: route.title,
      origin_name: route.origin_name,
      destination_name: route.destination_name,
      departure_date: departureDate,
      status: 'CONFIRMED',
      total_cost_usd: route.total_cost_usd,
      total_cost: route.total_cost ?? route.total_cost_usd,
      currency: route.currency || currency,
      currency_symbol: route.currency_symbol || (currency === 'INR' ? '₹' : '$'),
      booked_at: new Date().toISOString().split('T')[0],
      policy_id: selectedPolicy.id,
      policy_status: route.compliance_status,
      segments: route.segments,
    };

    setBookedTrips((prev) => [newTrip, ...prev]);
    showToast(`Trip ${newRef} booked successfully for ${currentTraveler.name}!`);
    setActiveTab('trips');
  };

  // Disruption Simulation Trigger
  const handleSimulateDisruption = (
    route: RouteOption,
    segmentIndex: number,
    delayMinutes: number
  ) => {
    const activeRouteCurrency = route.currency || currency;
    const result = evaluateDisruptionAndRebooking(
      route.segments,
      segmentIndex,
      delayMinutes,
      selectedPolicy,
      activeRouteCurrency
    );

    if (result.isConnectionMissed) {
      setDisruptedRoute(route);
      setDisruptionDelay(delayMinutes);
      setDisruptionBreach(result.breachMinutes);
      setRebookingAlternatives(result.alternatives);
      setRebookingModalOpen(true);
    } else {
      showToast(
        `Simulation Result: Delay of +${delayMinutes}m is safely absorbed by the scheduled transfer buffer.`
      );
    }
  };

  // Disruption on Booked Trip
  const handleSimulateDisruptionOnTrip = (trip: BookedTrip) => {
    const tripCurrency = trip.currency || currency;
    const tripSym = trip.currency_symbol || (tripCurrency === 'INR' ? '₹' : '$');
    const mockRoute: RouteOption = {
      id: trip.route_id,
      title: trip.title,
      badge: 'Corporate Pick',
      origin_name: trip.origin_name,
      origin_code: 'DEP',
      destination_name: trip.destination_name,
      destination_code: 'ARR',
      travel_mode: 'MULTI_MODAL',
      total_distance_km: 380,
      total_duration_minutes: 190,
      total_cost_usd: trip.total_cost_usd,
      benchmark_cost_usd: trip.total_cost_usd,
      total_cost: trip.total_cost ?? trip.total_cost_usd,
      benchmark_cost: trip.total_cost ?? trip.total_cost_usd,
      currency: tripCurrency,
      currency_symbol: tripSym,
      transfer_count: trip.segments.length - 1,
      compliance_status: trip.policy_status,
      compliance_notes: [],
      max_cabin_class: 'ECONOMY',
      reliability_score: 90,
      segments: trip.segments.map((s) => ({
        ...s,
        layover_after_minutes: s.layover_after_minutes ?? 25,
      })),
    };

    handleSimulateDisruption(mockRoute, 0, 75);
  };

  // Apply Rebooking Choice
  const handleApplyRebooking = (alternative: RebookingAlternative) => {
    if (!disruptedRoute) return;

    const updatedSegments = [...disruptedRoute.segments];
    if (updatedSegments.length > 1) {
      updatedSegments[1] = alternative.replacement_segments[0];
    } else {
      updatedSegments[0] = {
        ...updatedSegments[0],
        arrival_time: alternative.new_arrival_time,
        is_rebooked: true,
        delay_minutes: alternative.duration_delta_minutes,
      };
    }

    const updatedRoute: RouteOption = {
      ...disruptedRoute,
      total_cost_usd: disruptedRoute.total_cost_usd + alternative.cost_delta_usd,
      segments: updatedSegments,
    };

    setSelectedRoute(updatedRoute);
    setRoutes((prev) =>
      prev.map((r) => (r.id === updatedRoute.id ? updatedRoute : r))
    );

    setBookedTrips((prev) =>
      prev.map((t) => {
        if (t.title === disruptedRoute.title) {
          return {
            ...t,
            status: 'REBOOKED',
            total_cost_usd: t.total_cost_usd + alternative.cost_delta_usd,
            segments: updatedSegments,
          };
        }
        return t;
      })
    );

    setRebookingModalOpen(false);
    showToast(`Itinerary rebooked via ${alternative.title}! Confirmation sent.`);
  };

  // Update policy in Studio
  const handleUpdatePolicy = (updated: CorporatePolicy) => {
    setPolicies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedPolicy.id === updated.id) {
      setSelectedPolicy(updated);
    }
    showToast(`Policy '${updated.name}' updated! Route compliance recalculated.`);
  };

  // Cancel Trip
  const handleCancelTrip = (id: string) => {
    setBookedTrips((prev) => prev.filter((t) => t.id !== id));
    showToast('Corporate booking canceled and refunded.');
  };

  // Cross-Module: Book alternative from Disruption Concierge
  const handleBookAlternativeFromConcierge = (
    route: ReplanRouteItem,
    origin: string,
    dest: string
  ) => {
    const sym = currency === 'INR' ? '₹' : '$';
    const isIndia = currency === 'INR';
    const costUsd = isIndia ? Math.round(route.total_cost / 84) : route.total_cost;
    const costInr = isIndia ? route.total_cost : Math.round(route.total_cost * 84);

    const newTrip: BookedTrip = {
      id: `trip-alt-${Date.now().toString().slice(-4)}`,
      booking_ref: `BKD-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      traveler_id: currentTraveler.id,
      traveler_name: currentTraveler.name,
      route_id: route.route_id,
      title: route.title || `${route.transport_modes.join(' → ')} Replanned Bypass`,
      origin_name: origin,
      destination_name: dest,
      departure_date: new Date().toISOString().split('T')[0],
      booked_at: new Date().toISOString(),
      policy_id: selectedPolicy.id,
      total_cost_usd: costUsd,
      total_cost: isIndia ? costInr : costUsd,
      currency: currency,
      currency_symbol: sym,
      policy_status: 'COMPLIANT',
      status: 'CONFIRMED',
      segments: (route.steps || []).map((st, idx) => {
        const modeNormalized = (st.transport_mode || '').toLowerCase();
        const segmentMode =
          modeNormalized.includes('flight') || modeNormalized.includes('air')
            ? 'FLIGHT'
            : modeNormalized.includes('rail') || modeNormalized.includes('train')
            ? 'HIGH_SPEED_RAIL'
            : modeNormalized.includes('bus')
            ? 'BUS'
            : modeNormalized.includes('metro')
            ? 'METRO'
            : 'RIDE_SHARE';

        return {
          id: `seg-alt-${idx}`,
          sequence_order: idx + 1,
          mode: segmentMode,
          provider_name:
            st.provider ||
            (modeNormalized.charAt(0).toUpperCase() + modeNormalized.slice(1)),
          carrier_code: st.service_id || 'REPLAN',
          flight_or_service_num: st.service_id || `ALT-${idx + 1}`,
          cabin_class: 'ECONOMY',
          start_name: st.origin,
          start_lat: 19.076,
          start_lon: 72.8777,
          end_name: st.destination,
          end_lat: 15.4909,
          end_lon: 73.8278,
          departure_time: st.departure_time || 'Ready',
          arrival_time: st.arrival_time || `${st.duration_minutes}m later`,
          duration_minutes: st.duration_minutes,
          delay_minutes: 0,
          distance_km: 100,
          cost_usd: isIndia ? Math.round(st.cost / 84) : st.cost,
          cost: st.cost,
          currency_symbol: sym,
          layover_after_minutes: st.waiting_time_minutes || 0,
        };
      }),
    };

    setBookedTrips((prev) => [newTrip, ...prev]);
    showToast(`Alternative route "${newTrip.title}" saved to Active Trips!`);
  };

  // Cross-Module: Launch Route into Disruption Concierge
  const handleLaunchInConcierge = (
    origin: string,
    dest: string,
    disruptionDescription: string = 'Service disruption detected'
  ) => {
    setConciergeOrigin(origin);
    setConciergeDest(dest);
    setConciergeDisruption(disruptionDescription);
    setActiveTab('disruptions');
    showToast(`Disruption Concierge loaded for ${origin} → ${dest}`);
  };

  return (
    <div id="smart-route-planner-app" className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        bookedCount={bookedTrips.length}
        currentTraveler={currentTraveler}
        onSelectTraveler={setCurrentTraveler}
        onOpenTelemetry={() => setTelemetryModalOpen(true)}
        onOpenE2EModal={() => setE2EModalOpen(true)}
        currency={currency}
        onChangeCurrency={setCurrency}
      />

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* TAB 1: Route Planner */}
        {activeTab === 'planner' && (
          <div id="planner-tab-view" className="space-y-6">
            <RouteSearchForm
              originPlace={originPlace}
              destPlace={destPlace}
              onChangeOrigin={setOriginPlace}
              onChangeDest={setDestPlace}
              travelMode={travelMode}
              setTravelMode={setTravelMode}
              preference={preference}
              setPreference={setPreference}
              selectedPolicy={selectedPolicy}
              setSelectedPolicy={setSelectedPolicy}
              policies={policies}
              currentTraveler={currentTraveler}
              travelers={travelers}
              onSelectTraveler={setCurrentTraveler}
              departureDate={departureDate}
              setDepartureDate={setDepartureDate}
              departureTime={departureTime}
              setDepartureTime={setDepartureTime}
              viaStation={viaStation}
              setViaStation={setViaStation}
              onSearch={runRouteSearch}
              isCalculating={isCalculating}
            />

            {/* Results layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Route List Alternatives */}
              <div className="lg:col-span-6 space-y-4">
                <RouteList
                  routes={routes}
                  selectedRouteId={selectedRoute?.id || null}
                  onSelectRoute={setSelectedRoute}
                />
              </div>

              {/* Right Column: In-depth Detail View & Simulator */}
              <div className="lg:col-span-6 sticky top-20">
                {selectedRoute ? (
                  <RouteDetailView
                    route={selectedRoute}
                    policy={selectedPolicy}
                    onBookTrip={handleBookTrip}
                    onSimulateDisruption={handleSimulateDisruption}
                    onOpenInConcierge={(r) =>
                      handleLaunchInConcierge(
                        r.origin_name,
                        r.destination_name,
                        'Rail service disrupted on corridor'
                      )
                    }
                  />
                ) : (
                  <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                    Select a route to inspect its detailed journey timeline.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Disruption Concierge (Autonomous Travel Concierge & Re-routing) */}
        {activeTab === 'disruptions' && (
          <div id="disruptions-tab-view">
            <DisruptionConciergeView
              initialOrigin={conciergeOrigin}
              initialDestination={conciergeDest}
              initialDisruption={conciergeDisruption}
              currencySymbol={currency === 'INR' ? '₹' : '$'}
              onBookAlternativeToTrips={handleBookAlternativeFromConcierge}
              onSwitchToPlanner={() => setActiveTab('planner')}
            />
          </div>
        )}

        {/* TAB 3: Active Bookings & Trips */}
        {activeTab === 'trips' && (
          <div id="trips-tab-view">
            <ActiveTripsView
              trips={bookedTrips}
              onCancelTrip={handleCancelTrip}
              onSimulateDisruptionOnTrip={handleSimulateDisruptionOnTrip}
              onOpenTripInConcierge={(trip) =>
                handleLaunchInConcierge(
                  trip.origin_name,
                  trip.destination_name,
                  'Active journey delayed / connection threatened'
                )
              }
              onBookSampleTrip={() => {
                if (routes[0]) handleBookTrip(routes[0]);
              }}
            />
          </div>
        )}

        {/* TAB 4: Hotels & Destination (Part C) */}
        {activeTab === 'hotels' && (
          <div id="hotels-tab-view">
            <HotelDestinationView tripId="trip-mb-goa-001" currency={currency} />
          </div>
        )}

        {/* TAB 5: Notifications & Real-Time Alerts (Part D) */}
        {activeTab === 'notifications' && (
          <div id="notifications-tab-view">
            <NotificationsView
              userId="usr-corp-01"
              onNavigateToTab={(tab) => setActiveTab(tab as any)}
            />
          </div>
        )}

        {/* TAB 6: Corporate Policy Studio */}
        {activeTab === 'policies' && (
          <div id="policies-tab-view">
            <PolicyManager
              policies={policies}
              activePolicyId={selectedPolicy.id}
              onSelectPolicy={(id) => {
                const p = policies.find((item) => item.id === id);
                if (p) setSelectedPolicy(p);
              }}
              onUpdatePolicy={handleUpdatePolicy}
            />
          </div>
        )}

        {/* TAB 7: Robustness Test Suite & Fault Tolerance Runner */}
        {activeTab === 'robustness' && (
          <div id="robustness-tab-view">
            <RobustnessSuiteView
              onRunTestToConcierge={(test) =>
                handleLaunchInConcierge(
                  test.payload.loc,
                  test.payload.dest,
                  test.payload.disrupt
                )
              }
            />
          </div>
        )}

        {/* TAB 8: System Architecture & Endpoints Directory */}
        {activeTab === 'architecture' && (
          <div id="architecture-tab-view">
            <SystemArchitectureView />
          </div>
        )}
      </main>

      {/* PRD End-to-End Flow Guided Simulator Modal */}
      <EndToEndJourneyModal
        isOpen={e2eModalOpen}
        onClose={() => setE2EModalOpen(false)}
        onComplete={() => showToast('12-step autonomous integration verification completed successfully!')}
      />

      {/* Disruption & Automated Rebooking Modal */}
      <RebookingModal
        isOpen={rebookingModalOpen}
        onClose={() => setRebookingModalOpen(false)}
        route={disruptedRoute}
        delayMinutes={disruptionDelay}
        breachMinutes={disruptionBreach}
        alternatives={rebookingAlternatives}
        policy={selectedPolicy}
        onApplyRebooking={handleApplyRebooking}
      />

      {/* Provider Telemetry & Service Mesh Modal */}
      <ProviderHealthModal
        isOpen={telemetryModalOpen}
        onClose={() => setTelemetryModalOpen(false)}
      />
    </div>
  );
}
