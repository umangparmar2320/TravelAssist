import React, { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Sparkles,
  Train,
  Car,
  Plane,
  Bus,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ChevronRight,
  Layers,
  MapPin,
  HelpCircle,
  Zap,
  Split,
  Timer,
  FileText,
  BadgeAlert,
} from "lucide-react";
import { ReplanApiResponse, ReplanRouteItem, OriginalJourneyInfo } from "../../types";

export interface BeforeAfterJourneyProps {
  replanData: ReplanApiResponse | null;
  selectedRoute: ReplanRouteItem | null;
  currentLocation: string;
  destination: string;
  disruption: string;
}

export const BeforeAfterJourney: React.FC<BeforeAfterJourneyProps> = ({
  replanData,
  selectedRoute,
  currentLocation,
  destination,
  disruption,
}) => {
  const [viewMode, setViewMode] = useState<"side-by-side" | "diff">("side-by-side");

  const effectiveRoute = selectedRoute || replanData?.recommended_route;

  // Pre-disruption original journey reference (defaults to 8h 30m, ₹1,500)
  const originalJourney: OriginalJourneyInfo = replanData?.original_journey || {
    service_id: "TR123",
    service_name: "Mandovi Express #10103",
    transport_mode: "Train",
    origin: currentLocation || "Mumbai",
    destination: destination || "Goa",
    departure_time: "07:10 AM",
    arrival_time: "03:40 PM",
    duration_minutes: 510, // 8h 30m
    cost: 1500, // ₹1,500
    status: "CANCELLED / DISRUPTED",
    original_ticket: "Confirmed AC-3 Tier Berth B3-42",
  };

  // Metrics
  const hasRoute = Boolean(effectiveRoute);
  const originalDuration = originalJourney.duration_minutes || 510;
  const newDuration = effectiveRoute?.total_duration_minutes ?? 0;

  const originalCost = originalJourney.cost || 1500;
  const newCost = effectiveRoute?.total_cost ?? 0;

  // Time delta (positive = time saved)
  const timeDifferenceMinutes = hasRoute ? originalDuration - newDuration : 0;
  const isTimeSaved = hasRoute && timeDifferenceMinutes > 0;
  const absTimeDiff = Math.abs(timeDifferenceMinutes);
  const timeDiffHours = Math.floor(absTimeDiff / 60);
  const timeDiffMins = absTimeDiff % 60;

  // Additional cost
  const additionalCost = hasRoute ? newCost - originalCost : 0;

  // Reason for change
  let reasonForChange = "Service disrupted due to corridor incident; rerouted via multi-modal contingency path to prevent journey termination.";
  if (disruption.toUpperCase().includes("TRAIN")) {
    reasonForChange = "Primary train cancelled due to track derailment & signal failure on rail corridor. Rerouted via multimodal Air Express corridor.";
  } else if (disruption.toUpperCase().includes("FLIGHT")) {
    reasonForChange = "Aviation departure grounded by severe weather and airport radar outage. Re-routed via semi-high speed rail.";
  } else if (disruption.toUpperCase().includes("BUS")) {
    reasonForChange = "Interstate bus corridor suspended due to transport strike. Bypassed via fast intercity air connection.";
  } else if (disruption.toUpperCase().includes("ROAD")) {
    reasonForChange = "National highway blocked by landslide on mountain pass. Shifted passengers to scheduled rail corridors.";
  } else if (disruption.toUpperCase().includes("METRO")) {
    reasonForChange = "Urban metro station closed due to flash waterlogging. Transferred to on-demand surface cab feeder.";
  }

  // Generate dynamic steps for "After Disruption" if route steps exist
  const routeSteps = effectiveRoute?.steps || [];
  const hasDynamicSteps = routeSteps.length > 0;

  return (
    <section
      id="before-after-journey-card"
      className="bg-white rounded-2xl border-2 border-zinc-200 shadow-sm overflow-hidden transition-all hover:border-zinc-300"
    >
      {/* ========================================================
          1. HEADER BANNER
          ======================================================== */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Autonomous Journey Evolution
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Hackathon Showcase
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Before / After Journey Visualization
            </h2>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-zinc-800/80 p-1 rounded-xl border border-zinc-700/60 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("side-by-side")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              viewMode === "side-by-side"
                ? "bg-amber-500 text-zinc-950 shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Side-by-Side Flow
          </button>
          <button
            type="button"
            onClick={() => setViewMode("diff")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              viewMode === "diff"
                ? "bg-amber-500 text-zinc-950 shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Metric Comparison Diff
          </button>
        </div>
      </div>

      {/* ========================================================
          2. METRIC STAT BAR (Original vs New vs Time Saved vs Additional Cost)
          ======================================================== */}
      <div className="bg-zinc-50/90 border-b border-zinc-200 p-4 sm:p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Original Journey */}
          <div className="bg-white rounded-xl border border-zinc-200 p-3.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              Original Journey
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-extrabold text-zinc-800 font-mono">
                {Math.floor(originalDuration / 60)}h {originalDuration % 60}m
              </span>
              <span className="text-xs text-zinc-500 font-semibold font-mono">
                ₹{originalCost.toLocaleString()}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 block truncate">
              {originalJourney.service_name}
            </span>
          </div>

          {/* Card 2: New Recommended Journey */}
          <div className="bg-emerald-50/70 rounded-xl border border-emerald-300 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                New Recommended
              </span>
              <span className="text-[9px] font-bold uppercase bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">
                Autonomous
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-extrabold text-emerald-900 font-mono">
                {Math.floor(newDuration / 60)}h {newDuration % 60}m
              </span>
              <span className="text-xs text-emerald-800 font-semibold font-mono">
                ₹{newCost.toLocaleString()}
              </span>
            </div>
            <span className="text-[11px] text-emerald-800 font-medium mt-1 block truncate">
              {effectiveRoute?.title || "Air Express Direct Link"}
            </span>
          </div>

          {/* Card 3: Time Saved */}
          <div
            className={`rounded-xl border p-3.5 shadow-2xs ${
              isTimeSaved
                ? "bg-amber-50/80 border-amber-300"
                : "bg-zinc-100 border-zinc-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isTimeSaved ? "text-amber-800" : "text-zinc-600"
                }`}
              >
                Time Saved
              </span>
              {isTimeSaved ? (
                <TrendingDown className="h-3.5 w-3.5 text-amber-700" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-zinc-500" />
              )}
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`text-lg sm:text-xl font-extrabold font-mono ${
                  hasRoute ? (isTimeSaved ? "text-amber-900" : "text-zinc-800") : "text-zinc-500"
                }`}
              >
                {!hasRoute
                  ? "N/A"
                  : isTimeSaved
                  ? `${timeDiffHours}h ${timeDiffMins}m`
                  : `+${timeDiffHours}h ${timeDiffMins}m`}
              </span>
              <span className="text-[10px] font-bold uppercase text-amber-800">
                {!hasRoute ? "severed" : isTimeSaved ? "saved" : "extra"}
              </span>
            </div>
            <span className="text-[11px] text-amber-900/80 mt-1 block">
              {!hasRoute ? "Corridor closed" : isTimeSaved ? "Faster arrival" : "Transit buffer"}
            </span>
          </div>

          {/* Card 4: Additional Cost */}
          <div className="bg-blue-50/70 rounded-xl border border-blue-300 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                Additional Cost
              </span>
              <TrendingUp className="h-3.5 w-3.5 text-blue-700" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-extrabold text-blue-900 font-mono">
                {!hasRoute
                  ? "₹0"
                  : additionalCost >= 0
                  ? `₹${additionalCost.toLocaleString()}`
                  : `-₹${Math.abs(additionalCost).toLocaleString()}`}
              </span>
              <span className="text-[10px] font-bold uppercase text-blue-800">
                {!hasRoute ? "refund" : additionalCost >= 0 ? "fare diff" : "saved"}
              </span>
            </div>
            <span className="text-[11px] text-blue-900/80 mt-1 block">
              {!hasRoute ? "Full ticket refund" : "Direct emergency fare"}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. MAIN CONTENT: SIDE-BY-SIDE OR DIFF
          ======================================================== */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* REASON FOR CHANGE BANNER */}
        <div className="bg-amber-500/10 border-l-4 border-amber-500 rounded-r-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                Reason for Change
              </span>
              <p className="text-xs sm:text-sm font-semibold text-zinc-900 mt-0.5">
                {reasonForChange}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 text-left sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              Disruption Event
            </span>
            <span className="text-xs font-mono font-bold text-rose-700 uppercase">
              {disruption}
            </span>
          </div>
        </div>

        {viewMode === "side-by-side" ? (
          /* ========================================================
              SIDE-BY-SIDE MODE
             ======================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
            {/* ----------------------------------------------------
                COLUMN 1: BEFORE DISRUPTION (Original Route)
                Mumbai  ↓  Train  ↓  Goa
                ---------------------------------------------------- */}
            <div className="rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50/25 p-5 flex flex-col justify-between relative overflow-hidden">
              {/* Badge */}
              <div className="absolute -top-3 -right-3 transform rotate-12 bg-rose-600 text-white font-mono font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded shadow-xs">
                ORIGINAL • DISRUPTED
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-rose-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                        Original Route
                      </span>
                      <h3 className="text-sm font-bold text-zinc-900">Before Disruption</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-extrabold text-zinc-800 block">
                      {Math.floor(originalDuration / 60)}h {originalDuration % 60}m
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 font-semibold block">
                      ₹{originalCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* EXACT SPEC STEP SEQUENCE:
                    Mumbai
                     ↓
                    Train
                     ↓
                    Goa
                */}
                <div className="py-4 flex flex-col items-center space-y-2">
                  {/* Origin: Mumbai */}
                  <div className="w-full max-w-sm bg-white rounded-xl border border-zinc-300 p-3 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-zinc-700" />
                      <div>
                        <span className="text-[10px] font-bold uppercase text-zinc-400 block">Origin</span>
                        <div className="text-sm font-bold text-zinc-900">{currentLocation || "Mumbai"}</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500 font-medium">07:10 AM</span>
                  </div>

                  {/* Down Arrow */}
                  <div className="flex items-center justify-center text-zinc-400 py-0.5">
                    <ArrowDown className="h-4 w-4 stroke-[2.5]" />
                  </div>

                  {/* Leg: Train */}
                  <div className="w-full max-w-sm bg-rose-100/90 rounded-xl border-2 border-rose-400 p-3 shadow-2xs flex items-center justify-between relative">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-rose-200 text-rose-800 flex items-center justify-center">
                        <Train className="h-4 w-4 text-rose-700" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                          <span className="line-through">Train</span>
                          <span className="text-xs text-rose-600 font-normal">({originalJourney.service_name})</span>
                        </div>
                        <span className="text-[11px] text-rose-700 font-semibold">
                          ⚠ Derailed / Inoperative
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded">
                      Cancelled
                    </span>
                  </div>

                  {/* Down Arrow */}
                  <div className="flex items-center justify-center text-zinc-400 py-0.5">
                    <ArrowDown className="h-4 w-4 stroke-[2.5]" />
                  </div>

                  {/* Destination: Goa */}
                  <div className="w-full max-w-sm bg-white rounded-xl border border-zinc-300 p-3 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      <div>
                        <span className="text-[10px] font-bold uppercase text-zinc-400 block">Destination</span>
                        <div className="text-sm font-bold text-zinc-900">{destination || "Goa"}</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-rose-600 line-through font-medium">
                      03:40 PM (Voided)
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-rose-200/80 text-[11px] text-rose-800 flex items-center justify-between font-medium">
                <span>Direct single-leg rail route</span>
                <span className="font-bold text-rose-900">Journey Interrupted</span>
              </div>
            </div>

            {/* ----------------------------------------------------
                COLUMN 2: AFTER DISRUPTION (New Multi-Modal Route)
                Mumbai Central
                 ↓
                Taxi
                 ↓
                Airport
                 ↓
                Flight
                 ↓
                Taxi
                 ↓
                Goa
                ---------------------------------------------------- */}
            <div className={`rounded-2xl border-2 p-5 flex flex-col justify-between shadow-xs relative overflow-hidden ${
              hasRoute ? "border-emerald-500 bg-emerald-50/30" : "border-amber-400 bg-amber-50/40"
            }`}>
              {/* Badge */}
              <div className={`absolute -top-3 -right-3 transform rotate-12 text-white font-mono font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded shadow-xs flex items-center gap-1 ${
                hasRoute ? "bg-emerald-600" : "bg-amber-600"
              }`}>
                <Sparkles className="h-3 w-3" />
                {hasRoute ? "NEW RECOMMENDED" : "EMERGENCY HOLD"}
              </div>

              <div className="space-y-4">
                <div className={`flex items-center justify-between border-b pb-3 ${
                  hasRoute ? "border-emerald-200" : "border-amber-200"
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-lg text-white flex items-center justify-center font-bold text-xs ${
                      hasRoute ? "bg-emerald-600" : "bg-amber-600"
                    }`}>
                      2
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                        hasRoute ? "text-emerald-700" : "text-amber-700"
                      }`}>
                        {hasRoute ? "New Route" : "Corridor Status"}
                      </span>
                      <h3 className={`text-sm font-bold ${
                        hasRoute ? "text-emerald-950" : "text-amber-950"
                      }`}>
                        {hasRoute ? "After Disruption" : "Holding Protocol"}
                      </h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-mono font-extrabold block ${
                      hasRoute ? "text-emerald-900" : "text-amber-900"
                    }`}>
                      {hasRoute ? `${Math.floor(newDuration / 60)}h ${newDuration % 60}m` : "Suspended"}
                    </span>
                    <span className={`text-[11px] font-mono font-semibold block ${
                      hasRoute ? "text-emerald-700" : "text-amber-700"
                    }`}>
                      {hasRoute ? `₹${newCost.toLocaleString()}` : "100% Refundable"}
                    </span>
                  </div>
                </div>

                {!hasRoute ? (
                  <div className="p-4 rounded-xl bg-white border border-amber-200 space-y-2 text-center my-4">
                    <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto" />
                    <h4 className="text-xs font-bold text-amber-950">No Viable Outbound Route Cleared</h4>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      All scheduled rail, road, and air connections are severed. Station welfare teams are providing lounge accommodations and zero-fee rebooking.
                    </p>
                  </div>
                ) : (
                <div className="py-2 flex flex-col items-center space-y-1.5">
                  {/* Step 1: Mumbai Central */}
                  <div className="w-full max-w-sm bg-white rounded-xl border border-zinc-300 p-2.5 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-blue-600" />
                      <div>
                        <span className="text-[9px] font-bold uppercase text-zinc-400 block">Origin</span>
                        <span className="text-xs font-bold text-zinc-900">{currentLocation || "Mumbai Central"}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 font-semibold">Immediate Dispatch</span>
                  </div>

                  <ArrowDown className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />

                  {/* Step 2: Taxi */}
                  <div className="w-full max-w-sm bg-blue-50 border border-blue-200 rounded-xl p-2.5 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Car className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-blue-950 block">Taxi</span>
                        <span className="text-[10px] text-blue-700">Uber Premier Airport Feeder</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-blue-800">45m • ₹650</span>
                  </div>

                  <ArrowDown className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />

                  {/* Step 3: Airport */}
                  <div className="w-full max-w-sm bg-white rounded-xl border border-purple-200 p-2.5 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-purple-500"></div>
                      <div>
                        <span className="text-[9px] font-bold uppercase text-purple-700 block">Hub Transfer</span>
                        <span className="text-xs font-bold text-zinc-900">Airport (BOM Terminal 2)</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-purple-700 font-semibold">Fast Baggage Drop</span>
                  </div>

                  <ArrowDown className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />

                  {/* Step 4: Flight */}
                  <div className="w-full max-w-sm bg-purple-50 border border-purple-200 rounded-xl p-2.5 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                        <Plane className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-purple-950 block">Flight</span>
                        <span className="text-[10px] text-purple-700">Air India AI-667 (BOM → GOX)</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-purple-800">70m • ₹3,890</span>
                  </div>

                  <ArrowDown className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />

                  {/* Step 5: Taxi */}
                  <div className="w-full max-w-sm bg-blue-50 border border-blue-200 rounded-xl p-2.5 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Car className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-blue-950 block">Taxi</span>
                        <span className="text-[10px] text-blue-700">Goa Miles Airport Prepaid Cab</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-blue-800">60m • ₹660</span>
                  </div>

                  <ArrowDown className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />

                  {/* Step 6: Goa */}
                  <div className="w-full max-w-sm bg-emerald-100/90 border-2 border-emerald-400 rounded-xl p-2.5 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                      <div>
                        <span className="text-[9px] font-bold uppercase text-emerald-800 block">Final Destination</span>
                        <span className="text-xs font-extrabold text-emerald-950">{destination || "Goa"}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      On-Time Arrival
                    </span>
                  </div>
                </div>
              )}
              </div>

              {/* Card Footer */}
              <div className={`mt-4 pt-3 border-t text-[11px] flex items-center justify-between font-medium ${
                hasRoute ? "border-emerald-200 text-emerald-800" : "border-amber-200 text-amber-800"
              }`}>
                <span>{hasRoute ? "Door-to-door multi-modal continuity" : "Passenger welfare protocol"}</span>
                <span className={`font-bold ${hasRoute ? "text-emerald-900" : "text-amber-900"}`}>
                  {hasRoute ? "Active Guidance" : "Holding Pattern Active"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
              METRIC COMPARISON DIFF MODE (Detailed Breakdown)
             ======================================================== */
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
              <Split className="h-4 w-4 text-zinc-700" />
              Side-by-Side Impact Matrix
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Journey Parameter</th>
                    <th className="py-2.5 px-3">Original Route</th>
                    <th className="py-2.5 px-3">New Recommended Route</th>
                    <th className="py-2.5 px-3">Autonomous Variance (Delta)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80 font-mono">
                  <tr>
                    <td className="py-3 px-3 font-sans font-bold text-zinc-800">Total Duration</td>
                    <td className="py-3 px-3 text-zinc-700 font-bold">{Math.floor(originalDuration / 60)}h {originalDuration % 60}m</td>
                    <td className="py-3 px-3 text-emerald-700 font-extrabold">{Math.floor(newDuration / 60)}h {newDuration % 60}m</td>
                    <td className="py-3 px-3 text-emerald-700 font-bold">
                      {isTimeSaved ? `-${timeDiffHours}h ${timeDiffMins}m (Saved)` : `+${timeDiffHours}h ${timeDiffMins}m`}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-sans font-bold text-zinc-800">Total Expenditure</td>
                    <td className="py-3 px-3 text-zinc-700 font-bold">₹{originalCost.toLocaleString()}</td>
                    <td className="py-3 px-3 text-zinc-900 font-extrabold">₹{newCost.toLocaleString()}</td>
                    <td className="py-3 px-3 text-blue-700 font-bold">+₹{additionalCost.toLocaleString()} (Air + Cab)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-sans font-bold text-zinc-800">Transit Modality</td>
                    <td className="py-3 px-3 font-sans text-rose-700 font-semibold">Single-modal Rail (Blocked)</td>
                    <td className="py-3 px-3 font-sans text-emerald-800 font-semibold">Multi-modal (Taxi → Flight → Taxi)</td>
                    <td className="py-3 px-3 font-sans text-zinc-700">3 Synchronized Segments</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-sans font-bold text-zinc-800">Disruption Status</td>
                    <td className="py-3 px-3 font-sans text-rose-700 font-bold">Cancelled by Incident</td>
                    <td className="py-3 px-3 font-sans text-emerald-700 font-bold">Fully Confirmed & Available</td>
                    <td className="py-3 px-3 font-sans text-emerald-700">Resumed with 0s Interruption</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            4. BOTTOM SUMMARY COMPARISON CARD
            ======================================================== */}
        <div className="bg-gradient-to-r from-zinc-50 to-zinc-100 border border-zinc-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs flex-shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-900 block">
                Hackathon Demo Outcome: 3h 10m Saved via Resilient Multi-Modal Pivot
              </span>
              <p className="text-[11px] text-zinc-600 leading-relaxed mt-0.5">
                The agent evaluated rail corridor disruption, bypassed blocked tracks, and synthesized a <strong>Taxi → Flight → Taxi</strong> rescue route. Travel time dropped from <strong>8h 30m</strong> to <strong>5h 20m</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs flex-shrink-0">
            <div className="bg-white border border-zinc-200 px-3 py-1.5 rounded-lg text-center shadow-2xs">
              <span className="text-[9px] uppercase text-zinc-400 font-bold block">Time Saved</span>
              <span className="text-emerald-700 font-extrabold">{timeDiffHours}h {timeDiffMins}m</span>
            </div>
            <div className="bg-white border border-zinc-200 px-3 py-1.5 rounded-lg text-center shadow-2xs">
              <span className="text-[9px] uppercase text-zinc-400 font-bold block">Additional Cost</span>
              <span className="text-blue-700 font-extrabold">₹{additionalCost.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
