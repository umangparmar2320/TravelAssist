import React, { useState } from "react";
import {
  MapPin,
  Plane,
  Train,
  Bus,
  Car,
  Footprints,
  AlertTriangle,
  Compass,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import {
  MapLocation,
  MapRouteStep,
  MapTransportNode,
  MapDisruptionInfo,
} from "./types";
import {
  resolveLocationCoordinates,
  extractTransportNodes,
} from "./mapProvider";

interface SchematicRadarViewProps {
  currentLocation: string | MapLocation;
  destination: string | MapLocation;
  routeSteps: MapRouteStep[];
  disruption?: MapDisruptionInfo | string;
  selectedStepId?: string | null;
  onSelectStep?: (stepId: string) => void;
}

function getTransportIcon(mode: string, className = "h-4 w-4") {
  const m = mode.toUpperCase();
  if (m.includes("FLIGHT") || m.includes("AIR")) return <Plane className={className} />;
  if (m.includes("TRAIN") || m.includes("RAIL")) return <Train className={className} />;
  if (m.includes("BUS")) return <Bus className={className} />;
  if (m.includes("WALK")) return <Footprints className={className} />;
  return <Car className={className} />;
}

function getModeColor(mode: string): { stroke: string; fill: string; gradientId: string; label: string } {
  const m = mode.toUpperCase();
  if (m.includes("FLIGHT") || m.includes("AIR")) {
    return { stroke: "#38bdf8", fill: "#0284c7", gradientId: "flightArcGrad", label: "Flight Link" };
  }
  if (m.includes("TRAIN") || m.includes("RAIL")) {
    return { stroke: "#f59e0b", fill: "#d97706", gradientId: "trainTrackGrad", label: "Rail Track" };
  }
  if (m.includes("BUS")) {
    return { stroke: "#10b981", fill: "#059669", gradientId: "busRouteGrad", label: "Bus Highway" };
  }
  return { stroke: "#fbbf24", fill: "#d97706", gradientId: "cabFeederGrad", label: "Feeder Cab" };
}

export const SchematicRadarView: React.FC<SchematicRadarViewProps> = ({
  currentLocation,
  destination,
  routeSteps,
  disruption,
  selectedStepId,
  onSelectStep,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const originName = typeof currentLocation === "string" ? currentLocation : currentLocation.name;
  const destName = typeof destination === "string" ? destination : destination.name;

  const disruptionText =
    typeof disruption === "string"
      ? disruption
      : disruption?.description || disruption?.type || "";

  // Extract all transit nodes
  const transportNodes = extractTransportNodes(currentLocation, destination, routeSteps);

  // Normalize nodes into an SVG viewport of 800 x 440
  // If coordinates are in standard lat/lng, project them linearly onto the 800x440 canvas
  const lats = transportNodes.map((n) => n.latitude);
  const lngs = transportNodes.map((n) => n.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Guard against identical coordinates
  const latSpan = Math.max(maxLat - minLat, 0.4);
  const lngSpan = Math.max(maxLng - minLng, 0.4);

  // Padding inside 800 x 440
  const padX = 110;
  const padY = 80;
  const availW = 800 - padX * 2;
  const availH = 440 - padY * 2;

  // Project lat/lng to SVG canvas x, y (lat increases northward = y decreases)
  const nodeCanvasCoords = new Map<string, { x: number; y: number }>();
  transportNodes.forEach((node, idx) => {
    // If only 2 nodes (origin and dest), place cleanly left and right
    if (transportNodes.length <= 2) {
      if (node.type === "origin") {
        nodeCanvasCoords.set(node.id, { x: 130, y: 220 });
      } else {
        nodeCanvasCoords.set(node.id, { x: 670, y: 220 });
      }
      return;
    }

    const relLng = (node.longitude - minLng) / lngSpan;
    const relLat = (node.latitude - minLat) / latSpan;

    // x mapped to lng (west to east), y mapped to lat (north to south)
    const x = Math.round(padX + relLng * availW);
    const y = Math.round(padY + (1 - relLat) * availH);

    // Minor jitter separation if two nodes collide
    const key = `${x}-${y}`;
    nodeCanvasCoords.set(node.id, { x: Math.max(90, Math.min(710, x)), y: Math.max(60, Math.min(380, y)) });
  });

  // Helper to get canvas coords for a location string
  const getCoordsForLocation = (locName: string) => {
    const lower = locName.toLowerCase().trim();
    const node = transportNodes.find(
      (n) => n.name.toLowerCase().trim() === lower || n.label.toLowerCase().includes(lower)
    );
    if (node && nodeCanvasCoords.has(node.id)) {
      return nodeCanvasCoords.get(node.id)!;
    }
    const resolved = resolveLocationCoordinates(locName);
    const relLng = (resolved.lng - minLng) / lngSpan;
    const relLat = (resolved.lat - minLat) / latSpan;
    return {
      x: Math.round(padX + relLng * availW),
      y: Math.round(padY + (1 - relLat) * availH),
    };
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.75));
  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full rounded-2xl bg-zinc-950 text-white overflow-hidden border border-zinc-800 select-none shadow-inner">
      {/* HUD Header Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-700/80 shadow-md text-xs">
          <Compass className="h-4 w-4 text-amber-400 animate-spin-slow" />
          <span className="font-semibold text-zinc-100">Autonomous Radar</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-300 font-mono text-[11px] truncate max-w-[180px] sm:max-w-none">
            {originName} → {destName}
          </span>
        </div>

        {/* Status Pills & Disruption Alert */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {disruptionText && (
            <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-600/70 px-2.5 py-1 rounded-xl text-rose-300 text-xs shadow-md">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400 animate-pulse flex-shrink-0" />
              <span className="font-medium text-[11px] truncate max-w-[160px] sm:max-w-none">
                Disruption: {disruptionText}
              </span>
            </div>
          )}

          {/* Zoom / Pan HUD controls */}
          <div className="flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-700/80 rounded-xl overflow-hidden shadow-md">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-zinc-800 text-zinc-300 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-zinc-800 text-zinc-300 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 hover:bg-zinc-800 text-zinc-300 transition-colors"
              title="Reset View"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full h-80 sm:h-96 relative overflow-hidden bg-radial from-slate-900/40 to-zinc-950">
        <svg
          viewBox="0 0 800 440"
          className="w-full h-full object-cover transition-transform duration-200"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Background Grid Pattern */}
            <pattern id="radarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
            </pattern>
            {/* Concentric Radar Rings */}
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.08" />
              <stop offset="70%" stopColor="#1e293b" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
            </radialGradient>
            {/* Gradients for Paths */}
            <linearGradient id="flightArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
            <linearGradient id="trainTrackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="busRouteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="cabFeederGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>

          {/* Background Grid & Radar Glow */}
          <rect width="800" height="440" fill="url(#radarGrid)" />
          <circle cx="400" cy="220" r="210" fill="url(#radarGlow)" />
          <circle cx="400" cy="220" r="140" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="3 3" />
          <circle cx="400" cy="220" r="280" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeDasharray="4 4" />

          {/* Stylized Coastal / Corridor Outline */}
          <path
            d="M 80,40 Q 150,180 230,240 T 400,320 T 580,360 T 740,410"
            fill="none"
            stroke="rgba(56, 189, 248, 0.06)"
            strokeWidth="32"
            strokeLinecap="round"
          />

          {/* Disrupted Track / Corridor if applicable */}
          {disruptionText && (
            <g id="disrupted-line-radar" opacity="0.65">
              <path
                d="M 140,220 C 300,260 450,280 670,330"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeDasharray="6 6"
              />
              <circle cx="420" cy="275" r="12" fill="#7f1d1d" opacity="0.6" />
              <circle cx="420" cy="275" r="7" fill="#ef4444" />
              <text x="438" y="279" fill="#fca5a5" fontSize="10" fontWeight="600">
                Disrupted Sector
              </text>
            </g>
          )}

          {/* Route Path Segments */}
          {routeSteps.map((step, idx) => {
            const fromName = typeof step.origin === "string" ? step.origin : step.origin.name;
            const toName = typeof step.destination === "string" ? step.destination : step.destination.name;
            const p1 = getCoordsForLocation(fromName);
            const p2 = getCoordsForLocation(toName);

            const isSelected = selectedStepId === step.stepId;
            const m = step.transportMode.toUpperCase();
            const isFlight = m.includes("FLIGHT") || m.includes("AIR");
            const isTrain = m.includes("TRAIN") || m.includes("RAIL");
            const colorCfg = getModeColor(step.transportMode);

            // Compute curved path for flight vs straight/poly for ground
            let pathD = "";
            if (isFlight) {
              // High altitude arc
              const midX = (p1.x + p2.x) / 2;
              const midY = Math.min(p1.y, p2.y) - 70;
              pathD = `M ${p1.x},${p1.y} Q ${midX},${midY} ${p2.x},${p2.y}`;
            } else if (isTrain) {
              // Gentle wave
              const cx1 = p1.x + (p2.x - p1.x) * 0.35;
              const cy1 = p1.y + (p2.y - p1.y) * 0.2 + 20;
              const cx2 = p1.x + (p2.x - p1.x) * 0.65;
              const cy2 = p1.y + (p2.y - p1.y) * 0.8 - 15;
              pathD = `M ${p1.x},${p1.y} C ${cx1},${cy1} ${cx2},${cy2} ${p2.x},${p2.y}`;
            } else {
              // Ground feeder
              pathD = `M ${p1.x},${p1.y} L ${p2.x},${p2.y}`;
            }

            return (
              <g
                key={step.stepId || idx}
                id={`path-step-${step.stepId}`}
                className="cursor-pointer group"
                onClick={() => onSelectStep?.(step.stepId)}
              >
                {/* Wider invisible stroke for easy clicking/hovering */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="20"
                  strokeLinecap="round"
                />

                {/* Outer Glow on Selected / Hover */}
                {isSelected && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={colorCfg.stroke}
                    strokeWidth="10"
                    strokeLinecap="round"
                    opacity="0.3"
                    className="animate-pulse"
                  />
                )}

                {/* Main Visible Path Stroke */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isFlight ? "url(#flightArcGrad)" : colorCfg.stroke}
                  strokeWidth={isSelected ? "4.5" : "3.5"}
                  strokeLinecap="round"
                  strokeDasharray={isFlight ? "8 5" : isTrain ? "6 3" : undefined}
                  className="transition-all duration-300"
                />

                {/* Animated Direction Indicator Marker along the path */}
                {isFlight ? (
                  <g transform={`translate(${(p1.x + p2.x) / 2}, ${Math.min(p1.y, p2.y) - 50})`}>
                    <circle cx="0" cy="0" r="13" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                    <path d="M -4,-4 L 5,0 L -4,4 L -2,0 Z" fill="#ffffff" />
                  </g>
                ) : (
                  <circle
                    cx={(p1.x + p2.x) / 2}
                    cy={(p1.y + p2.y) / 2}
                    r={isSelected ? "5" : "4"}
                    fill={colorCfg.stroke}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                )}
              </g>
            );
          })}

          {/* Transport Nodes / Waypoints Pins */}
          {transportNodes.map((node) => {
            const pos = nodeCanvasCoords.get(node.id) || { x: 400, y: 220 };
            const isOrigin = node.type === "origin";
            const isDestination = node.type === "destination";
            const isAirport = node.type === "airport";
            const isStation = node.type === "station";
            const isHovered = hoveredNodeId === node.id;

            return (
              <g
                key={node.id}
                id={`node-${node.id}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {/* Origin Marker (Pulsing Blue) */}
                {isOrigin && (
                  <>
                    <circle cx="0" cy="0" r="20" fill="#3b82f6" opacity="0.25" className="animate-ping" />
                    <circle cx="0" cy="0" r="12" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />
                    <circle cx="0" cy="0" r="4" fill="#ffffff" />
                    <text
                      x="0"
                      y="-22"
                      fill="#93c5fd"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                      className="drop-shadow-md"
                    >
                      CURRENT LOCATION
                    </text>
                    <text
                      x="0"
                      y="-9"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {node.name}
                    </text>
                  </>
                )}

                {/* Destination Marker (Pulsing Emerald) */}
                {isDestination && (
                  <>
                    <circle cx="0" cy="0" r="22" fill="#10b981" opacity="0.25" className="animate-ping" />
                    <circle cx="0" cy="0" r="13" fill="#059669" stroke="#ffffff" strokeWidth="2.5" />
                    <circle cx="0" cy="0" r="5" fill="#ffffff" />
                    <text
                      x="0"
                      y="-22"
                      fill="#6ee7b7"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                      className="drop-shadow-md"
                    >
                      DESTINATION
                    </text>
                    <text
                      x="0"
                      y="-9"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {node.name}
                    </text>
                  </>
                )}

                {/* Airport Node */}
                {isAirport && !isOrigin && !isDestination && (
                  <>
                    <circle cx="0" cy="0" r="10" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
                    <circle cx="0" cy="0" r="4" fill="#ffffff" />
                    <text
                      x="0"
                      y="18"
                      fill="#bae6fd"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {node.name}
                    </text>
                  </>
                )}

                {/* Station Node */}
                {isStation && !isOrigin && !isDestination && (
                  <>
                    <rect x="-8" y="-8" width="16" height="16" rx="4" fill="#b45309" stroke="#f59e0b" strokeWidth="1.5" />
                    <rect x="-3" y="-3" width="6" height="6" fill="#ffffff" />
                    <text
                      x="0"
                      y="18"
                      fill="#fde68a"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {node.name}
                    </text>
                  </>
                )}

                {/* Generic Waypoint Hub */}
                {!isOrigin && !isDestination && !isAirport && !isStation && (
                  <>
                    <circle cx="0" cy="0" r="7" fill="#475569" stroke="#cbd5e1" strokeWidth="1.5" />
                    <text
                      x="0"
                      y="16"
                      fill="#cbd5e1"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      {node.name}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Radar Bottom Legend Overlay */}
        <div className="absolute bottom-2.5 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 text-[11px] bg-zinc-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-zinc-800 text-zinc-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-zinc-200 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block shadow-xs shadow-blue-500/50" />
              Traveller Location
            </span>
            <span className="flex items-center gap-1.5 text-zinc-200 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block shadow-xs shadow-emerald-500/50" />
              Destination
            </span>
            <span className="flex items-center gap-1.5 text-amber-300 font-medium">
              <span className="h-2 w-4 bg-amber-400 rounded-xs inline-block" />
              Feeder Cab
            </span>
            <span className="flex items-center gap-1.5 text-sky-300 font-medium">
              <span className="h-2 w-4 bg-sky-400 rounded-xs inline-block" />
              Flight Corridor
            </span>
            <span className="flex items-center gap-1.5 text-orange-400 font-medium">
              <span className="h-2 w-4 bg-orange-500 rounded-xs inline-block" />
              Rail Link
            </span>
          </div>

          <div className="text-[10px] text-zinc-500 font-mono">
            {transportNodes.length} Transport Nodes • {routeSteps.length} Route Steps
          </div>
        </div>
      </div>
    </div>
  );
};
