import React, { useState, useMemo } from "react";
import {
  Compass,
  Layers,
  MapPin,
  Key,
  ListOrdered,
  Maximize2,
  Minimize2,
  Navigation,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import {
  MapViewProps,
  MapProviderType,
  MapRouteStep,
  MapLocation,
} from "./types";
import {
  getAvailableMapProviders,
  getGoogleMapsApiKey,
  normalizeRouteSteps,
} from "./mapProvider";
import { SchematicRadarView } from "./SchematicRadarView";
import { OsmTileMapView } from "./OsmTileMapView";
import { GoogleMapView } from "./GoogleMapView";
import { RouteDiagram } from "./RouteDiagram";

/**
 * Reusable, engine-independent MapView component.
 *
 * Receives:
 * - currentLocation (string | MapLocation)
 * - destination (string | MapLocation)
 * - routeSteps (Array of step objects)
 *
 * Provides:
 * - MapProvider abstraction (Fallback Vector Radar, OpenStreetMap Tiles, Google Maps Platform)
 * - Safe fallback if no API key is configured in env
 * - Traveller location, destination, intermediate transport nodes, route path, and step visualization
 */
export const MapView: React.FC<MapViewProps> = ({
  currentLocation,
  destination,
  routeSteps: rawRouteSteps = [],
  disruption,
  selectedStepId: controlledSelectedStepId,
  onSelectStep: controlledOnSelectStep,
  initialProvider = "fallback-schematic",
  className = "",
  showControls = true,
  showStepTimeline = true,
}) => {
  const [activeProvider, setActiveProvider] = useState<MapProviderType>(initialProvider);
  const [internalSelectedStepId, setInternalSelectedStepId] = useState<string | null>(null);
  const [showDiagramDrawer, setShowDiagramDrawer] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Normalize route steps so component works with any shape of route step data
  const routeSteps: MapRouteStep[] = useMemo(() => {
    const normalized = normalizeRouteSteps(rawRouteSteps);
    // If no steps provided, construct a direct leg from currentLocation to destination
    if (normalized.length === 0 && currentLocation && destination) {
      const fromName = typeof currentLocation === "string" ? currentLocation : currentLocation.name;
      const toName = typeof destination === "string" ? destination : destination.name;
      return [
        {
          stepId: "direct-route-step",
          transportMode: "Direct Transit",
          origin: fromName,
          destination: toName,
          durationMinutes: 60,
          status: "scheduled",
        },
      ];
    }
    return normalized;
  }, [rawRouteSteps, currentLocation, destination]);

  const activeStepId = controlledSelectedStepId !== undefined ? controlledSelectedStepId : internalSelectedStepId;

  const handleStepClick = (stepId: string) => {
    setInternalSelectedStepId((prev) => (prev === stepId ? null : stepId));
    controlledOnSelectStep?.(stepId);
  };

  const providers = useMemo(() => getAvailableMapProviders(), []);
  const googleKeyConfigured = Boolean(getGoogleMapsApiKey());

  const originName = typeof currentLocation === "string" ? currentLocation : currentLocation?.name || "Origin";
  const destName = typeof destination === "string" ? destination : destination?.name || "Destination";

  return (
    <div
      id="reusable-map-view"
      className={`rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs transition-all ${
        isExpanded ? "fixed inset-4 z-50 flex flex-col bg-white shadow-2xl" : ""
      } ${className}`}
    >
      {/* 1. Header Toolbar with MapProvider Selector & Location Summary */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 border-b border-zinc-100 bg-zinc-50/70">
          {/* Origin -> Destination Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-zinc-700 min-w-0">
            <div className="h-6 w-6 rounded-lg bg-zinc-900 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Navigation className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1.5 font-medium truncate">
              <span className="font-semibold text-zinc-900 truncate max-w-[140px] sm:max-w-[180px]">
                {originName}
              </span>
              <ArrowRight className="h-3 w-3 text-zinc-400 flex-shrink-0" />
              <span className="font-semibold text-zinc-900 truncate max-w-[140px] sm:max-w-[180px]">
                {destName}
              </span>
            </div>
          </div>

          {/* Map Provider Selector & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Provider Switcher Tabs */}
            <div className="flex items-center bg-zinc-200/80 p-0.5 rounded-xl text-xs font-medium">
              {providers.map((p) => {
                const active = activeProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveProvider(p.id)}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? "bg-white text-zinc-900 font-semibold shadow-xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                    title={p.description}
                  >
                    {p.id === "fallback-schematic" && <Compass className="h-3 w-3 text-amber-500" />}
                    {p.id === "osm-tiles" && <MapPin className="h-3 w-3 text-emerald-600" />}
                    {p.id === "google-maps" && <Key className="h-3 w-3 text-blue-600" />}
                    <span className="whitespace-nowrap">{p.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Toggle Route Step Diagram Drawer */}
            <button
              type="button"
              onClick={() => setShowDiagramDrawer((v) => !v)}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                showDiagramDrawer
                  ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
                  : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100"
              }`}
              title="Toggle Step Flow Diagram"
            >
              <ListOrdered className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Steps</span>
            </button>

            {/* Fullscreen Expand Button */}
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              title={isExpanded ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* 2. Map Canvas Area (Render active provider) */}
      <div className={`relative ${isExpanded ? "flex-1 min-h-0" : ""}`}>
        {activeProvider === "fallback-schematic" && (
          <SchematicRadarView
            currentLocation={currentLocation}
            destination={destination}
            routeSteps={routeSteps}
            disruption={disruption}
            selectedStepId={activeStepId}
            onSelectStep={handleStepClick}
          />
        )}

        {activeProvider === "osm-tiles" && (
          <OsmTileMapView
            currentLocation={currentLocation}
            destination={destination}
            routeSteps={routeSteps}
            disruption={disruption}
            selectedStepId={activeStepId}
            onSelectStep={handleStepClick}
          />
        )}

        {activeProvider === "google-maps" && (
          <GoogleMapView
            currentLocation={currentLocation}
            destination={destination}
            routeSteps={routeSteps}
            disruption={disruption}
            onFallbackToRadar={() => setActiveProvider("fallback-schematic")}
            onFallbackToOsm={() => setActiveProvider("osm-tiles")}
          />
        )}
      </div>

      {/* 3. Route Steps Sequence Diagram (Collapsible or visible) */}
      {showStepTimeline && showDiagramDrawer && (
        <div className="p-3 border-t border-zinc-100 bg-zinc-50/50">
          <RouteDiagram
            currentLocation={currentLocation}
            destination={destination}
            routeSteps={routeSteps}
            selectedStepId={activeStepId}
            onSelectStep={handleStepClick}
          />
        </div>
      )}
    </div>
  );
};
