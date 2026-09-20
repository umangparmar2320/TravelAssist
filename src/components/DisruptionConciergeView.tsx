import React, { useState, useEffect, useRef } from "react";
import { RouteList as ReplanRouteList } from "./breakdown/ReplanRouteList";
import { RecommendationCard } from "./breakdown/RecommendationCard";
import { MapView } from "./map/MapView";
import { DisruptionSimulator } from "./breakdown/DisruptionSimulator";
import { BeforeAfterJourney } from "./breakdown/BeforeAfterJourney";
import { BackendExplanationSection } from "./breakdown/BackendExplanationSection";
import { EmergencyAssistanceBanner } from "./breakdown/EmergencyAssistanceBanner";
import {
  RobustnessTestSuite,
  RobustnessScenarioTest,
} from "./breakdown/RobustnessTestSuite";
import {
  DisruptionScenario,
  CandidateRoute,
  ReplanApiResponse,
  ReplanRouteItem,
  SimulatorDisruptionType,
  RecommendationResponse,
} from "../types";
import { HotelStay } from "../types/unifiedContract";
import { ConciergeHotelStayCard } from "./breakdown/ConciergeHotelStayCard";
import {
  Sparkles,
  RefreshCw,
  Sliders,
  MapPin,
  AlertTriangle,
  Zap,
  Shield,
  Layers,
  CheckCircle2,
  Navigation,
  Compass,
  ArrowRight,
  Briefcase,
  Check,
  Building2,
  Train,
  Crosshair,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface DisruptionConciergeViewProps {
  initialOrigin?: string;
  initialDestination?: string;
  initialDisruption?: string;
  currencySymbol?: string;
  onBookAlternativeToTrips?: (route: ReplanRouteItem, origin: string, dest: string) => void;
  onSwitchToPlanner?: () => void;
}

export const DisruptionConciergeView: React.FC<DisruptionConciergeViewProps> = ({
  initialOrigin = "Mumbai Central",
  initialDestination = "Goa",
  initialDisruption = "Train cancelled",
  currencySymbol: initialCurrency = "₹",
  onBookAlternativeToTrips,
  onSwitchToPlanner,
}) => {
  const [scenarios, setScenarios] = useState<DisruptionScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("mumbai-goa-train-cancelled");
  const [priority, setPriority] = useState<string>("FASTEST");
  const [providerMode, setProviderMode] = useState<"llm" | "deterministic">("llm");
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(false);
  const [activeTestId, setActiveTestId] = useState<number | null>(null);

  // Active form / scenario data
  const [currentLocation, setCurrentLocation] = useState<string>(initialOrigin);
  const [destination, setDestination] = useState<string>(initialDestination);
  const [disruption, setDisruption] = useState<string>(initialDisruption);
  const [currencySymbol, setCurrencySymbol] = useState<string>(initialCurrency);

  // Destination Hotel Stay State (User Requirement: hotel info & late check-in notification)
  const [hotelStay, setHotelStay] = useState<HotelStay | null>(null);
  const [hotelLoading, setHotelLoading] = useState<boolean>(false);

  // Replan Pipeline Output (POST /api/v1/replan)
  const [replanData, setReplanData] = useState<ReplanApiResponse | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<ReplanRouteItem | null>(null);

  // LLM Recommendation Output
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedRouteId, setBookedRouteId] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  const latestRequestIdRef = useRef(0);

  // Fetch Hotel Stay for destination
  const fetchHotelStay = async (destQuery?: string) => {
    const target = destQuery || destination;
    if (!target) return;
    setHotelLoading(true);
    try {
      const res = await fetch(`/api/hotels?destination=${encodeURIComponent(target)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.hotel) {
          setHotelStay(data.hotel);
        }
      }
    } catch (err) {
      console.error("Failed to load destination hotel:", err);
    } finally {
      setHotelLoading(false);
    }
  };

  const handleNotifyHotelLateArrival = async (instructions: string): Promise<boolean> => {
    if (!hotelStay) return false;
    try {
      const res = await fetch(`/api/hotels/${hotelStay.trip_id}/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          late_check_in_notified: true,
          special_instructions: instructions,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.hotel) {
          setHotelStay(data.hotel);
          return true;
        }
      }
    } catch (err) {
      console.error("Failed to notify hotel of late arrival:", err);
    }
    return false;
  };

  const handleModifyHotelStayDates = async (newDate: string, notes: string): Promise<boolean> => {
    if (!hotelStay) return false;
    try {
      const res = await fetch(`/api/hotels/${hotelStay.trip_id}/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_check_in_date: newDate,
          special_instructions: notes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.hotel) {
          setHotelStay(data.hotel);
          return true;
        }
      }
    } catch (err) {
      console.error("Failed to modify hotel dates:", err);
    }
    return false;
  };

  // Load scenarios and check server health
  useEffect(() => {
    async function init() {
      try {
        const [scenariosRes, healthRes] = await Promise.all([
          fetch("/api/scenarios"),
          fetch("/api/health"),
        ]);

        if (scenariosRes.ok) {
          const data: DisruptionScenario[] = await scenariosRes.json();
          setScenarios(data);
          if (data.length > 0 && !initialOrigin) {
            const initial = data[0];
            setSelectedScenarioId(initial.id);
            setCurrentLocation(initial.current_location);
            setDestination(initial.destination);
            setDisruption(initial.disruption);
            setPriority(initial.default_priority.toUpperCase());
            setCurrencySymbol(initial.currency_symbol || "₹");
          }
        }

        if (healthRes.ok) {
          const health = await healthRes.json();
          setHasGeminiKey(Boolean(health.has_gemini_key));
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    }
    init();
  }, []);

  // Main pipeline execution calling POST /api/v1/replan and AI Recommendation
  const runReplanPipeline = async (overrideParams?: {
    loc?: string;
    dest?: string;
    disrupt?: string;
    disruptType?: SimulatorDisruptionType | string;
    prio?: string;
    currSym?: string;
    provMode?: "llm" | "deterministic";
    simulateTimeout?: boolean;
  }) => {
    const currentRequestId = ++latestRequestIdRef.current;
    setLoading(true);
    setError(null);

    const activeLoc = overrideParams?.loc ?? currentLocation;
    const activeDest = overrideParams?.dest ?? destination;
    const activeDisrupt = overrideParams?.disrupt ?? disruption;
    const activeDisruptType =
      overrideParams?.disruptType ??
      (activeDisrupt.toUpperCase().includes("TRAIN") &&
      activeDisrupt.toUpperCase().includes("DELAY")
        ? "TRAIN DELAYED"
        : activeDisrupt.toUpperCase().includes("TRAIN")
        ? "TRAIN CANCELLED"
        : activeDisrupt.toUpperCase().includes("BUS")
        ? "BUS CANCELLED"
        : activeDisrupt.toUpperCase().includes("FLIGHT")
        ? "FLIGHT CANCELLED"
        : activeDisrupt.toUpperCase().includes("ROAD")
        ? "ROAD BLOCKED"
        : activeDisrupt.toUpperCase().includes("METRO")
        ? "METRO CLOSED"
        : "TRAIN CANCELLED");

    const activePrio = overrideParams?.prio ?? priority;
    const activeCurrSym = overrideParams?.currSym ?? currencySymbol;
    const activeProvMode = overrideParams?.provMode ?? providerMode;
    const simulateTimeout = Boolean(overrideParams?.simulateTimeout);

    try {
      // 1. Call POST /api/v1/replan (The unified multimodal route engine orchestrator)
      const replanPayload = {
        journey_id: `JRN-${Date.now().toString().slice(-6)}`,
        simulate_timeout: simulateTimeout,
        current_location: {
          latitude: activeLoc.includes("NaN") ? (null as any) : 19.076,
          longitude: activeLoc.includes("NaN") ? 999.0 : 72.8777,
          name: activeLoc,
        },
        destination: {
          latitude: activeDest.includes("Military") ? 34.1526 : 15.4909,
          longitude: activeDest.includes("Military") ? 77.5771 : 73.8278,
          name: activeDest,
        },
        disruption: {
          type: activeDisruptType,
          affected_service: activeDisruptType.includes("TRAIN") ? "TR123" : undefined,
          description: activeDisrupt,
          severity: "severe",
        },
        preference: activePrio.toUpperCase(),
      };

      const replanRes = await fetch("/api/v1/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(replanPayload),
      });

      if (!replanRes.ok) {
        throw new Error(`Replan failed (${replanRes.status}): ${replanRes.statusText}`);
      }

      if (currentRequestId !== latestRequestIdRef.current) {
        return;
      }

      const replanJson: ReplanApiResponse = await replanRes.json();
      setReplanData(replanJson);

      const topRoute =
        replanJson.recommended_route ||
        (replanJson.routes && replanJson.routes.length > 0 ? replanJson.routes[0] : null);
      setSelectedRoute(topRoute);

      // 2. Call AI Recommendation Concierge using ONLY validated RouteResult data
      if (replanJson.routes && replanJson.routes.length > 0) {
        const candidateRoutes: CandidateRoute[] = replanJson.routes.map((r) => ({
          route_id: r.route_id,
          title: r.title || r.transport_modes.join(" → "),
          summary: `${r.transport_modes.join(" → ")} (${Math.floor(r.total_duration_minutes / 60)}h ${r.total_duration_minutes % 60}m)`,
          modes_used: r.transport_modes,
          metrics: {
            total_travel_time_min: r.total_duration_minutes,
            waiting_time_min: r.waiting_minutes,
            transfer_time_min: r.transfer_minutes,
            total_cost: r.total_cost,
            number_of_transfers: r.transfers,
            reliability_score: r.reliability_score,
            convenience_score: r.convenience_score,
          },
          badges: r.categories || [r.category || "Standard"],
        }));

        const recPayload = {
          current_location: activeLoc,
          destination: activeDest,
          disruption: activeDisrupt,
          priority: activePrio.toLowerCase(),
          candidate_routes: candidateRoutes,
          currency_symbol: activeCurrSym,
          force_deterministic: activeProvMode === "deterministic",
        };

        const recRes = await fetch("/api/recommendations/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(recPayload),
        });

        if (recRes.ok) {
          if (currentRequestId !== latestRequestIdRef.current) return;
          const recJson: RecommendationResponse = await recRes.json();
          setRecommendation(recJson);
        }
      } else {
        setRecommendation(null);
      }
    } catch (err: any) {
      if (currentRequestId !== latestRequestIdRef.current) return;
      console.error("Pipeline error:", err);
      setError(err.message || "Failed to execute replanning pipeline.");
    } finally {
      if (currentRequestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Run test scenario from 12-scenario suite
  const handleRunRobustnessTest = async (test: RobustnessScenarioTest) => {
    setActiveTestId(test.id);
    setCurrentLocation(test.payload.loc);
    setDestination(test.payload.dest);
    setDisruption(test.payload.disrupt);
    await runReplanPipeline({
      loc: test.payload.loc,
      dest: test.payload.dest,
      disrupt: test.payload.disrupt,
      disruptType: test.payload.disruptType,
      simulateTimeout: test.payload.timeout,
    });
  };

  // Trigger from the dedicated Demo Disruption Simulator
  const handleTriggerSimulatorDisruption = async (
    disruptionType: SimulatorDisruptionType,
    description: string
  ) => {
    setDisruption(description);
    setActiveTestId(null);
    await runReplanPipeline({
      disrupt: description,
      disruptType: disruptionType,
    });
  };

  // When scenario changes, update inputs and trigger replan immediately
  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    const scen = scenarios.find((s) => s.id === scenarioId);
    if (scen) {
      setCurrentLocation(scen.current_location);
      setDestination(scen.destination);
      setDisruption(scen.disruption);
      const newPrio = scen.default_priority.toUpperCase();
      setPriority(newPrio);
      const newSym = scen.currency_symbol || "₹";
      setCurrencySymbol(newSym);
      setReplanData(null);
      setSelectedRoute(null);
      setRecommendation(null);

      runReplanPipeline({
        loc: scen.current_location,
        dest: scen.destination,
        disrupt: scen.disruption,
        prio: newPrio,
        currSym: newSym,
      });
    }
  };

  // Initial trigger
  useEffect(() => {
    if (destination) {
      fetchHotelStay(destination);
    }
    if (currentLocation && destination && !replanData && !loading) {
      runReplanPipeline();
    }
  }, [currentLocation, destination, selectedScenarioId]);

  const handleBookSelected = async (route: ReplanRouteItem) => {
    setBookedRouteId(route.route_id);
    if (onBookAlternativeToTrips) {
      onBookAlternativeToTrips(route, currentLocation, destination);
    }
    if (hotelStay) {
      const revisedArr = route.arrival_time
        ? new Date(route.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "10:30 PM";
      await handleNotifyHotelLateArrival(
        `Alternative route confirmed (${route.title || route.transport_modes.join(" → ")}). Guaranteed late arrival hold requested for revised arrival at ${revisedArr}.`
      );
    }
    setTimeout(() => {
      setBookedRouteId(null);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Concierge Sub-header Banner with Mode & Provider Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300/60">
              Module B: Autonomous Concierge
            </span>
            <span className="text-xs font-semibold text-slate-800">
              Dynamic Multimodal Re-Routing Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time transit replanning, passenger welfare emergency guidance, and LLM reasoning.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI / Deterministic Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => {
                setProviderMode("llm");
                runReplanPipeline({ provMode: "llm" });
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                providerMode === "llm"
                  ? "bg-amber-500 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gemini AI Mode</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProviderMode("deterministic");
                runReplanPipeline({ provMode: "deterministic" });
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                providerMode === "deterministic"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Deterministic Rule Mode</span>
            </button>
          </div>

          {onSwitchToPlanner && (
            <button
              type="button"
              onClick={onSwitchToPlanner}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Switch to Corporate Planner</span>
            </button>
          )}
        </div>
      </div>

      {/* DISRUPTION DETECTED ALERT & CONTEXT BANNER */}
      <section
        id="disruption-alert-banner"
        className="rounded-2xl border-2 border-rose-500/80 bg-rose-50/80 p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-widest uppercase text-rose-700">
                  ACTIVE TRAVEL DISRUPTION
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900 uppercase">
                  Re-Routing Active
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-rose-950 mt-0.5">
                ⚠ {disruption}
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-rose-800 font-medium mt-1">
                <span>Stuck at: <strong>{currentLocation}</strong></span>
                <span>•</span>
                <span>Destination: <strong>{destination}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick 1-Click Bhavnagar - Kerala Corridor Shortcut */}
          <button
            type="button"
            onClick={() => {
              setCurrentLocation("Surat Junction / Mumbai Central (Stuck In-Transit)");
              setDestination("Kochi, Kerala");
              setDisruption("Connecting express train to Kerala delayed by 7 hours / cancelled due to track obstruction in Konkan route");
              fetchHotelStay("Kochi, Kerala");
              runReplanPipeline({
                loc: "Surat Junction / Mumbai Central (Stuck In-Transit)",
                dest: "Kochi, Kerala",
                disrupt: "Connecting express train to Kerala delayed by 7 hours / cancelled due to track obstruction in Konkan route",
              });
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-2 self-start sm:self-center cursor-pointer"
          >
            <Train className="h-4 w-4 text-amber-400" />
            <span>1-Click Preset: Bhavnagar ➔ Kerala</span>
          </button>
        </div>
      </section>

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* MAIN WORKING INTERFACE (Inputs + Recommended + Hotel + Map) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: In-Transit Disruption Reporting & Preference Selector */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800 flex items-center gap-2">
                <Navigation className="h-4 w-4 text-amber-600" />
                Report Stuck Location
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 uppercase">
                Transit Input
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* STUCK LOCATION INPUT */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <MapPin className="h-4 w-4 text-rose-600" />
                    Where are you stuck right now?
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentLocation("Surat Junction (GPS Verified)");
                    }}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Auto-detect current GPS station"
                  >
                    <Crosshair className="h-3.5 w-3.5 text-amber-600" />
                    GPS Auto-Detect
                  </button>
                </div>
                <input
                  type="text"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-bold text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all"
                  placeholder="e.g. Surat Junction / Mumbai Central"
                />

                {/* Quick Station Pills along the Bhavnagar - Kerala Corridor */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    "Surat Junction",
                    "Mumbai Central",
                    "Vadodara",
                    "Ahmedabad",
                    "Bhavnagar Terminus",
                    "Goa (Madgaon)",
                  ].map((stn) => (
                    <button
                      key={stn}
                      type="button"
                      onClick={() => setCurrentLocation(stn)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        currentLocation.includes(stn)
                          ? "bg-slate-900 text-white font-bold border-slate-900 shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border-slate-200"
                      }`}
                    >
                      {stn}
                    </button>
                  ))}
                </div>
              </div>

              {/* FINAL DESTINATION INPUT */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5 text-xs">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Final Destination (Hotel City)
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    fetchHotelStay(e.target.value);
                  }}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all"
                  placeholder="e.g. Kochi, Kerala"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["Kochi, Kerala", "Goa", "Trivandrum, Kerala", "Jaipur"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDestination(d);
                        fetchHotelStay(d);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        destination.includes(d)
                          ? "bg-blue-900 text-white font-bold border-blue-900 shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border-slate-200"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* DISRUPTION CAUSE INPUT */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  Why are you stuck? (Disruption Event)
                </label>
                <input
                  type="text"
                  value={disruption}
                  onChange={(e) => setDisruption(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-rose-300 bg-rose-50/30 text-rose-950 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 shadow-2xs transition-all"
                  placeholder="e.g. Train cancelled due to track obstruction"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    "Train cancelled (Konkan route)",
                    "Connecting train delayed 6h+",
                    "Flight grounded / bad weather",
                    "Missed train connection",
                  ].map((cause) => (
                    <button
                      key={cause}
                      type="button"
                      onClick={() => setDisruption(cause)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        disruption === cause
                          ? "bg-rose-900 text-white font-bold border-rose-900 shadow-2xs"
                          : "bg-rose-50 hover:bg-rose-100 text-rose-900 font-semibold border-rose-200"
                      }`}
                    >
                      {cause}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* TRAVELLER PREFERENCE SELECTOR (Horizontal compact pills) */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-slate-600" />
                  Optimization Priority
                </span>
                <span className="text-xs text-amber-600 font-mono font-bold">
                  {priority}
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  { id: "FASTEST", label: "⚡ Fastest" },
                  { id: "CHEAPEST", label: "💰 Cheapest" },
                  { id: "MOST_RELIABLE", label: "🛡️ Reliable" },
                  { id: "LEAST_TRANSFERS", label: "🔄 Direct" },
                  { id: "BALANCED", label: "⚖️ Balanced" },
                ].map((p) => {
                  const active = priority === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPriority(p.id);
                        runReplanPipeline({ prio: p.id });
                      }}
                      className={`py-2 px-1 text-center rounded-xl border transition-all cursor-pointer ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white font-bold shadow-2xs"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold"
                      }`}
                    >
                      <span className="text-xs block">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Call to Action Trigger: POST /api/v1/replan */}
            <button
              type="button"
              id="replan-pipeline-btn"
              onClick={() => runReplanPipeline()}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                  <span>Calculating Bypass Routes...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-slate-950 fill-slate-950" />
                  <span>Replan Multimodal Journey from Stuck Location</span>
                </>
              )}
            </button>

            {/* Emergency Hotline bar */}
            <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-100 flex items-center justify-center gap-3">
              <span>Railways: <strong>139</strong></span>
              <span>•</span>
              <span>Emergency: <strong>112</strong></span>
              <span>•</span>
              <span>Kerala Tourist Helpline: <strong>1363</strong></span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Recommended Route + Hotel Stay Protection + Map Area + Alternative Routes */}
        <div className="lg:col-span-7 space-y-6">
          {/* RECOMMENDED ROUTE */}
          <div>
            <RecommendationCard
              recommendation={recommendation}
              recommendedRoute={replanData?.recommended_route || null}
              loading={loading}
              onRefresh={runReplanPipeline}
              onSelectRoute={(route) => setSelectedRoute(route)}
              isSelected={selectedRoute?.route_id === replanData?.recommended_route?.route_id}
            />

            {/* Direct Booking to Active Trips Action */}
            {selectedRoute && onBookAlternativeToTrips && (
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xs">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      Accept this bypass: {selectedRoute.title || selectedRoute.transport_modes.join(" → ")}
                    </span>
                    <span className="text-[11px] text-emerald-800">
                      Syncs to corporate itinerary and dispatches guaranteed room hold to hotel
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleBookSelected(selectedRoute)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer flex-shrink-0"
                >
                  {bookedRouteId === selectedRoute.route_id ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Booked & Hotel Notified!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept Route & Sync Hotel</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* DESTINATION HOTEL STAY & LATE CHECK-IN PROTECTION */}
          <ConciergeHotelStayCard
            hotel={hotelStay}
            loading={hotelLoading}
            destinationCity={destination}
            revisedArrivalTime={
              selectedRoute?.arrival_time
                ? new Date(selectedRoute.arrival_time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : undefined
            }
            onRefresh={() => fetchHotelStay(destination)}
            onNotifyLateArrival={handleNotifyHotelLateArrival}
            onModifyDates={handleModifyHotelStayDates}
          />

          {/* MAP VISUALIZATION LAYER */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Compass className="h-4 w-4 text-slate-600" />
                MULTIMODAL MAP & RADAR LAYER
              </h3>
              <span className="text-[11px] text-slate-400">Live GPS & Route Coordinates</span>
            </div>
            <MapView
              currentLocation={currentLocation}
              destination={destination}
              routeSteps={(selectedRoute || replanData?.recommended_route)?.steps || []}
              disruption={disruption}
            />
          </div>

          {/* ALTERNATIVE ROUTES & METRICS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <ReplanRouteList
              routes={replanData?.routes || []}
              recommendedRouteId={replanData?.recommended_route?.route_id}
              selectedRouteId={selectedRoute?.route_id}
              currencySymbol={currencySymbol}
              onSelectRoute={(route) => setSelectedRoute(route)}
              alternatives={replanData?.alternatives}
            />
          </div>
        </div>
      </div>

      {/* ADVANCED JOURNEY DIAGNOSTICS & SIMULATOR ACCORDION (Keeps main interface clean and fast) */}
      <div className="pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Layers className="h-4 w-4 text-slate-500" />
          <span>
            {showDiagnostics
              ? "Hide Advanced Journey Diagnostics & Simulation Tools"
              : "Show Advanced Journey Diagnostics & Test Tools (Before/After Journey, AI Reasoning, Disruption Simulator)"}
          </span>
          {showDiagnostics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showDiagnostics && (
          <div className="mt-6 space-y-6 animate-fadeIn">
            {/* DEMO DISRUPTION SIMULATOR */}
            <DisruptionSimulator
              onTriggerDisruption={handleTriggerSimulatorDisruption}
              isLoading={loading}
              replanData={replanData}
              selectedRoute={selectedRoute}
              currentLocation={currentLocation}
              destination={destination}
            />

            {/* BEFORE / AFTER JOURNEY VISUALIZATION */}
            <BeforeAfterJourney
              replanData={replanData}
              selectedRoute={selectedRoute}
              currentLocation={currentLocation}
              destination={destination}
              disruption={disruption}
            />

            {/* VALIDATED BACKEND EXPLANATION SECTION */}
            {(recommendation?.explanation || replanData?.explanation) && (
              <BackendExplanationSection
                explanation={recommendation?.explanation || replanData?.explanation}
                recommendedRoute={replanData?.recommended_route || null}
                alternativesCount={replanData?.routes?.length || 0}
                currencySymbol={currencySymbol}
                sourceProvider={recommendation?.provider_used}
              />
            )}

            {/* Emergency Assistance Banner when severe disruption */}
            {(replanData?.emergency_assistance ||
              (replanData?.warnings && replanData.warnings.length > 0) ||
              replanData?.status !== "SUCCESS") && (
              <EmergencyAssistanceBanner
                status={replanData?.status}
                emergencyAssistance={replanData?.emergency_assistance}
                warnings={replanData?.warnings}
                suggestedDestinations={replanData?.emergency_assistance?.suggested_nearest_hubs}
                currentLocation={currentLocation}
                destination={destination}
                onSelectAlternativeDestination={(altDest) => {
                  setDestination(altDest);
                  runReplanPipeline({ dest: altDest });
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
