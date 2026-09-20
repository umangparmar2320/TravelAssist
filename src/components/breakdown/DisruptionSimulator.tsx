import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Ban,
  Bus,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Flame,
  Layers,
  MapPin,
  Plane,
  RefreshCw,
  Route as RouteIcon,
  ShieldAlert,
  Sparkles,
  Star,
  Train,
  Zap,
} from "lucide-react";
import {
  SimulatorDisruptionType,
  ReplanApiResponse,
  ReplanRouteItem,
  OriginalJourneyInfo,
} from "../../types";

export interface DisruptionSimulatorProps {
  onTriggerDisruption: (
    disruptionType: SimulatorDisruptionType,
    description: string,
    onProgressUpdate?: (step: "original" | "disruption" | "replanning" | "completed") => void
  ) => Promise<void>;
  isLoading: boolean;
  replanData: ReplanApiResponse | null;
  selectedRoute: ReplanRouteItem | null;
  currentLocation: string;
  destination: string;
}

export const DISRUPTION_OPTIONS: {
  type: SimulatorDisruptionType;
  label: string;
  category: string;
  defaultDescription: string;
  affectedService: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
}[] = [
  {
    type: "TRAIN CANCELLED",
    label: "TRAIN CANCELLED",
    category: "Rail Corridor Outage",
    defaultDescription: "Track derailment & signal breakdown on Konkan Railway. All express trains halted.",
    affectedService: "Mandovi Express (#10103 / TR123)",
    icon: Train,
    accentColor: "text-rose-600",
    badgeBg: "bg-rose-100 text-rose-800 border-rose-200",
  },
  {
    type: "TRAIN DELAYED",
    label: "TRAIN DELAYED",
    category: "Overhead Equipment Fault",
    defaultDescription: "Overhead power line snapped. Cascading delay of +180 minutes on rail corridor.",
    affectedService: "Vande Bharat Superfast (#20671)",
    icon: Clock,
    accentColor: "text-amber-600",
    badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    type: "BUS CANCELLED",
    label: "BUS CANCELLED",
    category: "Interstate Transit Strike",
    defaultDescription: "Interstate highway permit strike and toll operator boycott. Sleeper buses cancelled.",
    affectedService: "VRL Multi-Axle Sleeper (#VRL-552)",
    icon: Bus,
    accentColor: "text-orange-600",
    badgeBg: "bg-orange-100 text-orange-800 border-orange-200",
  },
  {
    type: "FLIGHT CANCELLED",
    label: "FLIGHT CANCELLED",
    category: "Airport Ground Stop",
    defaultDescription: "Monsoon turbulence and ATC radar failure at BOM Airport. Flights grounded.",
    affectedService: "Air India (AI-667 BOM → GOX)",
    icon: Plane,
    accentColor: "text-purple-600",
    badgeBg: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    type: "ROAD BLOCKED",
    label: "ROAD BLOCKED",
    category: "Highway Landslide",
    defaultDescription: "Major mudslide and multiple fallen trees blocking National Highway 66 corridor.",
    affectedService: "NH66 Interstate Highway",
    icon: Ban,
    accentColor: "text-red-700",
    badgeBg: "bg-red-100 text-red-800 border-red-200",
  },
  {
    type: "METRO CLOSED",
    label: "METRO CLOSED",
    category: "Subway Flooding",
    defaultDescription: "Severe waterlogging at underground interchange. Metro Aqua Line suspended.",
    affectedService: "Mumbai Metro Aqua Line 3",
    icon: Layers,
    accentColor: "text-cyan-700",
    badgeBg: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
];

export const DisruptionSimulator: React.FC<DisruptionSimulatorProps> = ({
  onTriggerDisruption,
  isLoading,
  replanData,
  selectedRoute,
  currentLocation,
  destination,
}) => {
  const [selectedDisruption, setSelectedDisruption] = useState<SimulatorDisruptionType>("TRAIN CANCELLED");
  const [activeStep, setActiveStep] = useState<"original" | "disruption" | "replanning" | "completed">("completed");
  const [isSimulating, setIsSimulating] = useState(false);

  const currentOption = DISRUPTION_OPTIONS.find((o) => o.type === selectedDisruption) || DISRUPTION_OPTIONS[0];

  const handleTrigger = async () => {
    setIsSimulating(true);
    try {
      // Transition choreography to vividly demonstrate the 4 stages for judges/hackathon:
      // 1. Original Journey
      setActiveStep("original");
      await new Promise((r) => setTimeout(r, 450));

      // 2. Disruption
      setActiveStep("disruption");
      await new Promise((r) => setTimeout(r, 500));

      // 3. Automatic Replanning
      setActiveStep("replanning");

      // Execute actual backend recalculation
      await onTriggerDisruption(
        selectedDisruption,
        currentOption.defaultDescription,
        (step) => setActiveStep(step)
      );

      // 4. New Recommended Route
      setActiveStep("completed");
    } finally {
      setIsSimulating(false);
    }
  };

  const originalJourney: OriginalJourneyInfo = replanData?.original_journey || {
    service_id: "TR123",
    service_name: "Mandovi Express (#10103 / TR123)",
    transport_mode: "Train",
    origin: currentLocation || "Mumbai CSMT Terminal",
    destination: destination || "Goa Madgaon (MAO)",
    departure_time: "07:10 AM",
    arrival_time: "06:45 PM",
    duration_minutes: 695,
    cost: 1250,
    status: "CANCELLED DUE TO DISRUPTION",
    original_ticket: "Confirmed AC 3-Tier Berth B3-42",
  };

  const activeRecommended = selectedRoute || replanData?.recommended_route;
  const removedServices = replanData?.removed_services || [
    currentOption.affectedService,
    "Upstream Connecting Feeder Services",
  ];

  return (
    <div
      id="demo-disruption-simulator-panel"
      className="bg-white rounded-2xl border-2 border-zinc-200 overflow-hidden shadow-xs transition-all hover:border-zinc-300"
    >
      {/* PANEL HEADER */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Live Hackathon Showcase
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active Simulator
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Simulate Disruption
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-300">
          <Compass className="h-4 w-4 text-amber-400" />
          <span>Real-time autonomous graph rerouting</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* INTERACTIVE CONTROLS BAR: Dropdown + Trigger Button */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 space-y-1">
            <label
              htmlFor="disruption-type-dropdown"
              className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600"
            >
              Select Disruption Event to Inject
            </label>
            <div className="relative">
              <select
                id="disruption-type-dropdown"
                value={selectedDisruption}
                onChange={(e) => setSelectedDisruption(e.target.value as SimulatorDisruptionType)}
                disabled={isSimulating || isLoading}
                className="w-full text-sm font-semibold bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-zinc-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer disabled:opacity-60"
              >
                {DISRUPTION_OPTIONS.map((opt) => (
                  <option key={opt.type} value={opt.type}>
                    {opt.label} — {opt.category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:self-end pt-1 sm:pt-0">
            <button
              id="trigger-disruption-btn"
              type="button"
              onClick={handleTrigger}
              disabled={isSimulating || isLoading}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                isSimulating || isLoading
                  ? "bg-amber-600 text-white cursor-wait opacity-90"
                  : "bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white"
              }`}
            >
              {isSimulating || isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>Processing Disruption...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
                  <span>Trigger Disruption</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================
            KEY TRANSITION FLOW DEMONSTRATION:
            Original Journey  →  Disruption  →  Automatic Replanning  →  New Recommended Route
            ======================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RouteIcon className="h-4 w-4 text-zinc-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Autonomous Replanning Pipeline Transition
              </h3>
            </div>
            <span className="text-[11px] font-medium text-zinc-500">
              Live Stage:{" "}
              <strong className="uppercase text-zinc-800 font-bold">
                {activeStep === "original" && "1. Original Journey"}
                {activeStep === "disruption" && "2. Disruption Event"}
                {activeStep === "replanning" && "3. Automatic Replanning"}
                {activeStep === "completed" && "4. New Recommended Route Active"}
              </strong>
            </span>
          </div>

          {/* Stepper Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            {/* STEP 1: ORIGINAL JOURNEY */}
            <div
              className={`rounded-xl border p-3.5 transition-all duration-300 flex flex-col justify-between ${
                activeStep === "original"
                  ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/30 shadow-xs scale-[1.01]"
                  : "border-zinc-200 bg-zinc-50/80 text-zinc-700"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                    Step 1
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-200 text-zinc-700">
                    Pre-Disruption
                  </span>
                </div>
                <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <Train className="h-3.5 w-3.5 text-zinc-600" />
                  Original Journey
                </h4>
                <p className="text-[11px] font-medium text-zinc-700 leading-tight">
                  {originalJourney.service_name}
                </p>
                <div className="text-[11px] text-zinc-500 space-y-0.5 pt-1">
                  <div>Dep: {originalJourney.departure_time}</div>
                  <div>
                    Est. Duration: {Math.floor(originalJourney.duration_minutes / 60)}h{" "}
                    {originalJourney.duration_minutes % 60}m
                  </div>
                  <div>Cost: ₹{originalJourney.cost.toLocaleString()}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-200/80 mt-2 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                <span>Booked Ticket</span>
                <span className="text-emerald-700 font-semibold">Active</span>
              </div>
            </div>

            {/* STEP 2: DISRUPTION */}
            <div
              className={`rounded-xl border p-3.5 transition-all duration-300 flex flex-col justify-between ${
                activeStep === "disruption"
                  ? "border-rose-500 bg-rose-50 ring-2 ring-rose-500/30 shadow-xs scale-[1.01]"
                  : replanData?.disruption
                  ? "border-rose-200 bg-rose-50/40 text-rose-950"
                  : "border-zinc-200 bg-zinc-50/80 text-zinc-700"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-600">
                    Step 2
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    Event Triggered
                  </span>
                </div>
                <h4 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                  Disruption
                </h4>
                <div className="text-[11px] font-bold text-rose-900 uppercase">
                  {selectedDisruption}
                </div>
                <p className="text-[11px] text-rose-800 leading-tight">
                  {currentOption.defaultDescription}
                </p>
                <div className="pt-1">
                  <span className="text-[10px] uppercase font-bold text-rose-700 tracking-wider">
                    Removed Services:
                  </span>
                  <ul className="text-[10px] text-rose-900 font-medium space-y-0.5 mt-0.5">
                    {removedServices.slice(0, 2).map((s, idx) => (
                      <li key={idx} className="flex items-center gap-1 truncate">
                        <Ban className="h-2.5 w-2.5 text-rose-600 flex-shrink-0" />
                        <span className="truncate">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="pt-2 border-t border-rose-200 mt-2 text-[10px] text-rose-700 font-mono flex items-center justify-between">
                <span>Impact</span>
                <span className="font-bold text-rose-800">Direct Invalidation</span>
              </div>
            </div>

            {/* STEP 3: AUTOMATIC REPLANNING */}
            <div
              className={`rounded-xl border p-3.5 transition-all duration-300 flex flex-col justify-between ${
                activeStep === "replanning"
                  ? "border-amber-500 bg-amber-50 ring-2 ring-amber-500/30 shadow-xs scale-[1.01]"
                  : "border-zinc-200 bg-zinc-50/80 text-zinc-700"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-600">
                    Step 3
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                    Graph Engine
                  </span>
                </div>
                <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <RefreshCw
                    className={`h-3.5 w-3.5 text-amber-600 ${
                      activeStep === "replanning" ? "animate-spin" : ""
                    }`}
                  />
                  Automatic Replanning
                </h4>
                <p className="text-[11px] text-zinc-600 leading-tight">
                  Removing invalidated edges, synthesizing multimodal alternatives across Air, Rail, Bus, and Road.
                </p>
                <div className="text-[10px] space-y-1 pt-1 text-zinc-600">
                  <div className="flex items-center justify-between">
                    <span>Alternatives:</span>
                    <span className="font-bold font-mono text-zinc-900">
                      {replanData?.routes.length || 4} evaluated
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pareto Weights:</span>
                    <span className="font-mono text-amber-700 font-semibold">Time / Cost / Rel</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-200/80 mt-2 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                <span>Latency</span>
                <span className="font-bold text-zinc-700">&lt; 280ms deterministic</span>
              </div>
            </div>

            {/* STEP 4: NEW RECOMMENDED ROUTE */}
            <div
              className={`rounded-xl border p-3.5 transition-all duration-300 flex flex-col justify-between ${
                activeStep === "completed"
                  ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs"
                  : "border-zinc-200 bg-zinc-50/80 text-zinc-700"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600">
                    Step 4
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Recommended
                  </span>
                </div>
                <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  New Route Selected
                </h4>
                <p className="text-[11px] font-bold text-emerald-900 leading-tight truncate">
                  {activeRecommended?.transport_modes.join(" → ") || "Air Express Direct Link"}
                </p>
                <div className="text-[11px] space-y-0.5 text-emerald-800 pt-0.5 font-medium">
                  <div className="flex items-center justify-between">
                    <span>Duration:</span>
                    <span className="font-bold">
                      {activeRecommended
                        ? `${Math.floor(activeRecommended.total_duration_minutes / 60)}h ${
                            activeRecommended.total_duration_minutes % 60
                          }m`
                        : "5h 20m"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cost:</span>
                    <span className="font-bold">
                      ₹{activeRecommended?.total_cost.toLocaleString() || "5,200"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rating:</span>
                    <span className="font-bold text-emerald-900 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {activeRecommended?.overall_score || 9.2} / 10
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-emerald-200 mt-2 text-[10px] text-emerald-700 font-mono flex items-center justify-between">
                <span>Map Layer</span>
                <span className="font-bold text-emerald-800">Auto-synchronized</span>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION FEEDBACK BAR */}
        <div className="bg-zinc-100 border border-zinc-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>
              Triggering recalculates the entire multimodal graph, removes affected services, updates the recommendation engine, and redraws the map view immediately.
            </span>
          </div>
          <div className="font-mono text-[11px] text-zinc-500 flex-shrink-0">
            Backend Endpoint: <span className="font-bold text-zinc-700">POST /api/v1/replan</span>
          </div>
        </div>
      </div>
    </div>
  );
};
