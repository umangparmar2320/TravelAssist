import React from "react";
import {
  MapPin,
  Plane,
  Train,
  Bus,
  Car,
  Footprints,
  ArrowRight,
  Clock,
  CircleDot,
  CheckCircle2,
  Navigation,
} from "lucide-react";
import { MapLocation, MapRouteStep, MapTransportNode } from "./types";

interface RouteDiagramProps {
  currentLocation: string | MapLocation;
  destination: string | MapLocation;
  routeSteps: MapRouteStep[];
  selectedStepId?: string | null;
  onSelectStep?: (stepId: string) => void;
}

function getModeIcon(mode: string, className = "h-4 w-4") {
  const m = mode.toUpperCase();
  if (m.includes("FLIGHT") || m.includes("AIR")) return <Plane className={className} />;
  if (m.includes("TRAIN") || m.includes("RAIL")) return <Train className={className} />;
  if (m.includes("BUS")) return <Bus className={className} />;
  if (m.includes("WALK")) return <Footprints className={className} />;
  return <Car className={className} />;
}

function getModeColorClasses(mode: string) {
  const m = mode.toUpperCase();
  if (m.includes("FLIGHT") || m.includes("AIR")) {
    return {
      bg: "bg-sky-50",
      border: "border-sky-300",
      text: "text-sky-700",
      badge: "bg-sky-100 text-sky-800",
      pill: "bg-sky-500",
    };
  }
  if (m.includes("TRAIN") || m.includes("RAIL")) {
    return {
      bg: "bg-amber-50",
      border: "border-amber-300",
      text: "text-amber-700",
      badge: "bg-amber-100 text-amber-800",
      pill: "bg-amber-500",
    };
  }
  if (m.includes("BUS")) {
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-300",
      text: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-800",
      pill: "bg-emerald-500",
    };
  }
  return {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-800",
    pill: "bg-yellow-500",
  };
}

export const RouteDiagram: React.FC<RouteDiagramProps> = ({
  currentLocation,
  destination,
  routeSteps,
  selectedStepId,
  onSelectStep,
}) => {
  const originName = typeof currentLocation === "string" ? currentLocation : currentLocation.name;
  const destName = typeof destination === "string" ? destination : destination.name;

  if (!routeSteps || routeSteps.length === 0) {
    return (
      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-center text-xs text-zinc-500">
        No active route steps to display.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-amber-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            Route Step Sequence & Nodes
          </h4>
        </div>
        <span className="text-[11px] text-zinc-400 font-mono">
          {routeSteps.length} Segments
        </span>
      </div>

      {/* Sequential Flow Layout */}
      <div className="space-y-2">
        {/* Origin Node Entry */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-50/70 border border-blue-200/80 text-xs">
          <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Navigation className="h-3 w-3" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">
              Traveller Location (Origin)
            </div>
            <div className="font-semibold text-zinc-900 truncate">
              {originName}
            </div>
          </div>
          <span className="text-[10px] font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
            START
          </span>
        </div>

        {/* Steps */}
        {routeSteps.map((step, idx) => {
          const isSelected = selectedStepId === step.stepId;
          const colors = getModeColorClasses(step.transportMode);
          const fromName = typeof step.origin === "string" ? step.origin : step.origin.name;
          const toName = typeof step.destination === "string" ? step.destination : step.destination.name;

          return (
            <div
              key={step.stepId || idx}
              onClick={() => onSelectStep?.(step.stepId)}
              className={`cursor-pointer transition-all rounded-lg border p-2.5 ${
                isSelected
                  ? `${colors.bg} ${colors.border} shadow-xs ring-2 ring-offset-1 ring-amber-400`
                  : "bg-zinc-50/60 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`h-6 w-6 rounded-md ${colors.badge} flex items-center justify-center flex-shrink-0 font-bold`}
                  >
                    {getModeIcon(step.transportMode, "h-3.5 w-3.5")}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Step {idx + 1} • {step.transportMode}
                      </span>
                      {step.provider && (
                        <span className="text-[10px] font-medium text-zinc-600 bg-zinc-200/80 px-1.5 py-0.2 rounded">
                          {step.provider}
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-semibold text-zinc-900 truncate flex items-center gap-1 mt-0.5">
                      <span>{fromName}</span>
                      <ArrowRight className="h-3 w-3 text-zinc-400 flex-shrink-0" />
                      <span className="text-zinc-700">{toName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end flex-shrink-0 text-right">
                  <span className="text-xs font-bold text-zinc-900 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-zinc-400" />
                    {step.durationMinutes ? `${step.durationMinutes}m` : "Est."}
                  </span>
                  {step.cost ? (
                    <span className="text-[10px] text-zinc-500 font-mono">
                      ₹{step.cost.toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        {/* Destination Node */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-xs">
          <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
              Final Destination
            </div>
            <div className="font-semibold text-zinc-900 truncate">
              {destName}
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
            ARRIVE
          </span>
        </div>
      </div>
    </div>
  );
};
