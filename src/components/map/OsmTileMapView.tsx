import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  MapPin,
  Plane,
  Train,
  Bus,
  Car,
  Navigation,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
} from "lucide-react";
import {
  MapLocation,
  MapRouteStep,
  MapTransportNode,
  MapDisruptionInfo,
} from "./types";
import {
  extractTransportNodes,
  resolveLocationCoordinates,
} from "./mapProvider";

interface OsmTileMapViewProps {
  currentLocation: string | MapLocation;
  destination: string | MapLocation;
  routeSteps: MapRouteStep[];
  disruption?: MapDisruptionInfo | string;
  selectedStepId?: string | null;
  onSelectStep?: (stepId: string) => void;
}

// Convert Lat/Lng to OpenStreetMap Web Mercator tile numbers with boundary safety clamping
function latLngToTileXY(lat: number, lng: number, zoom: number) {
  const safeLat = Math.max(-85.0511, Math.min(85.0511, isNaN(lat) ? 18.9696 : lat));
  const safeLng = Math.max(-180, Math.min(180, isNaN(lng) ? 72.8194 : lng));
  const safeZoom = Math.max(1, Math.min(18, isNaN(zoom) ? 7 : zoom));
  const n = Math.pow(2, safeZoom);
  const x = ((safeLng + 180) / 360) * n;
  const latRad = (safeLat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? 0 : y };
}

// Convert Lat/Lng to pixel offsets relative to container center with NaN guards
function latLngToPixel(lat: number, lng: number, centerLat: number, centerLng: number, zoom: number, containerW: number, containerH: number) {
  const centerTile = latLngToTileXY(centerLat, centerLng, zoom);
  const targetTile = latLngToTileXY(lat, lng, zoom);

  const dxPixels = (targetTile.x - centerTile.x) * 256;
  const dyPixels = (targetTile.y - centerTile.y) * 256;

  const px = (containerW || 800) / 2 + dxPixels;
  const py = (containerH || 380) / 2 + dyPixels;

  return {
    x: isNaN(px) ? 0 : px,
    y: isNaN(py) ? 0 : py,
  };
}

export const OsmTileMapView: React.FC<OsmTileMapViewProps> = ({
  currentLocation,
  destination,
  routeSteps,
  disruption,
  selectedStepId,
  onSelectStep,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 380 });

  // Extract all transit nodes
  const transportNodes = useMemo(
    () => extractTransportNodes(currentLocation, destination, routeSteps),
    [currentLocation, destination, routeSteps]
  );

  // Compute bounding center and initial zoom
  const { centerLat, centerLng, defaultZoom } = useMemo(() => {
    if (transportNodes.length === 0) {
      return { centerLat: 17.2, centerLng: 73.3, defaultZoom: 7 };
    }
    const lats = transportNodes.map((n) => n.latitude);
    const lngs = transportNodes.map((n) => n.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const cLat = (minLat + maxLat) / 2;
    const cLng = (minLng + maxLng) / 2;

    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    let z = 8;
    if (maxDiff > 8) z = 5;
    else if (maxDiff > 4) z = 6;
    else if (maxDiff > 2) z = 7;
    else if (maxDiff > 0.8) z = 8;
    else if (maxDiff > 0.3) z = 9;
    else z = 10;

    return { centerLat: cLat, centerLng: cLng, defaultZoom: z };
  }, [transportNodes]);

  const [zoom, setZoom] = useState(defaultZoom);
  const [panCenter, setPanCenter] = useState({ lat: centerLat, lng: centerLng });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setZoom(defaultZoom);
    setPanCenter({ lat: centerLat, lng: centerLng });
  }, [defaultZoom, centerLat, centerLng]);

  // Track container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 380,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Compute active tiles for rendering
  const tilesToRender = useMemo(() => {
    const centerTile = latLngToTileXY(panCenter.lat, panCenter.lng, zoom);
    const halfTilesW = Math.ceil(containerSize.width / 512) + 1;
    const halfTilesH = Math.ceil(containerSize.height / 512) + 1;

    const minTileX = Math.floor(centerTile.x) - halfTilesW;
    const maxTileX = Math.floor(centerTile.x) + halfTilesW;
    const minTileY = Math.floor(centerTile.y) - halfTilesH;
    const maxTileY = Math.floor(centerTile.y) + halfTilesH;

    const maxCoord = Math.pow(2, zoom);
    const tiles: { key: string; x: number; y: number; z: number; px: number; py: number }[] = [];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        if (ty < 0 || ty >= maxCoord) continue;
        const normalizedX = ((tx % maxCoord) + maxCoord) % maxCoord;
        const px = containerSize.width / 2 + (tx - centerTile.x) * 256;
        const py = containerSize.height / 2 + (ty - centerTile.y) * 256;

        tiles.push({
          key: `${zoom}-${normalizedX}-${ty}`,
          x: normalizedX,
          y: ty,
          z: zoom,
          px,
          py,
        });
      }
    }
    return tiles;
  }, [panCenter, zoom, containerSize]);

  // Handle Dragging / Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    // Convert pixel delta to lat/lng delta at current zoom
    const n = Math.pow(2, zoom);
    const dLng = -(dx / 256 / n) * 360;
    const dLat = (dy / 256 / n) * 180;

    setPanCenter((prev) => ({
      lat: Math.max(-85, Math.min(85, prev.lat + dLat)),
      lng: Math.max(-180, Math.min(180, prev.lng + dLng)),
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Compute node pixel coordinates
  const nodePixelMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    transportNodes.forEach((node) => {
      const p = latLngToPixel(
        node.latitude,
        node.longitude,
        panCenter.lat,
        panCenter.lng,
        zoom,
        containerSize.width,
        containerSize.height
      );
      map.set(node.id, p);
    });
    return map;
  }, [transportNodes, panCenter, zoom, containerSize]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-slate-100 border border-zinc-200 select-none cursor-grab active:cursor-grabbing shadow-inner"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* OSM Tile Background Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {tilesToRender.map((tile) => (
          <img
            key={tile.key}
            src={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`}
            alt=""
            loading="lazy"
            crossOrigin="anonymous"
            className="absolute w-[256px] h-[256px] select-none pointer-events-none"
            style={{
              left: `${tile.px}px`,
              top: `${tile.py}px`,
            }}
          />
        ))}
      </div>

      {/* Subtle Overlay Filter for high-contrast readability */}
      <div className="absolute inset-0 bg-white/10 pointer-events-none" />

      {/* SVG Vector Path Layer over the OSM tiles */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <filter id="osmGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.4" />
          </filter>
        </defs>

        {routeSteps.map((step, idx) => {
          const fromName = typeof step.origin === "string" ? step.origin : step.origin.name;
          const toName = typeof step.destination === "string" ? step.destination : step.destination.name;

          const fromCoord = resolveLocationCoordinates(fromName);
          const toCoord = resolveLocationCoordinates(toName);

          const p1 = latLngToPixel(fromCoord.lat, fromCoord.lng, panCenter.lat, panCenter.lng, zoom, containerSize.width, containerSize.height);
          const p2 = latLngToPixel(toCoord.lat, toCoord.lng, panCenter.lat, panCenter.lng, zoom, containerSize.width, containerSize.height);

          const isSelected = selectedStepId === step.stepId;
          const m = step.transportMode.toUpperCase();
          const isFlight = m.includes("FLIGHT") || m.includes("AIR");
          const isTrain = m.includes("TRAIN") || m.includes("RAIL");
          const strokeColor = isFlight ? "#0284c7" : isTrain ? "#d97706" : "#f59e0b";

          // Arc for flight vs direct for ground
          let pathD = `M ${p1.x},${p1.y} L ${p2.x},${p2.y}`;
          if (isFlight) {
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2 - 40;
            pathD = `M ${p1.x},${p1.y} Q ${midX},${midY} ${p2.x},${p2.y}`;
          }

          return (
            <g key={step.stepId || idx} filter="url(#osmGlow)">
              {/* Outer stroke for contrast against map tiles */}
              <path
                d={pathD}
                fill="none"
                stroke="#ffffff"
                strokeWidth={isSelected ? 6 : 5}
                strokeLinecap="round"
              />
              {/* Colored route line */}
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isSelected ? 4 : 3}
                strokeLinecap="round"
                strokeDasharray={isFlight ? "8 4" : undefined}
              />
            </g>
          );
        })}
      </svg>

      {/* DOM Interactive Markers for Transport Nodes */}
      {transportNodes.map((node) => {
        const pos = nodePixelMap.get(node.id) || { x: 0, y: 0 };
        const isOrigin = node.type === "origin";
        const isDestination = node.type === "destination";
        const isAirport = node.type === "airport";
        const isStation = node.type === "station";

        // Skip rendering if marker is far outside the viewport
        if (pos.x < -60 || pos.x > containerSize.width + 60 || pos.y < -60 || pos.y > containerSize.height + 60) {
          return null;
        }

        return (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group transition-transform hover:scale-110"
            style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
          >
            {isOrigin && (
              <div className="flex flex-col items-center">
                <div className="h-7 w-7 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs animate-bounce">
                  <Navigation className="h-3.5 w-3.5" />
                </div>
                <div className="bg-blue-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md mt-1 whitespace-nowrap">
                  {node.name} (Origin)
                </div>
              </div>
            )}

            {isDestination && (
              <div className="flex flex-col items-center">
                <div className="h-7 w-7 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs animate-pulse">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="bg-emerald-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md mt-1 whitespace-nowrap">
                  {node.name} (Destination)
                </div>
              </div>
            )}

            {isAirport && !isOrigin && !isDestination && (
              <div className="flex flex-col items-center">
                <div className="h-6 w-6 rounded-full bg-sky-500 border-2 border-white shadow-md flex items-center justify-center text-white">
                  <Plane className="h-3 w-3" />
                </div>
                <span className="bg-zinc-900/80 text-white text-[9px] font-medium px-1.5 py-0.5 rounded shadow mt-0.5 whitespace-nowrap opacity-80 group-hover:opacity-100">
                  {node.name}
                </span>
              </div>
            )}

            {isStation && !isOrigin && !isDestination && (
              <div className="flex flex-col items-center">
                <div className="h-6 w-6 rounded-full bg-amber-600 border-2 border-white shadow-md flex items-center justify-center text-white">
                  <Train className="h-3 w-3" />
                </div>
                <span className="bg-zinc-900/80 text-white text-[9px] font-medium px-1.5 py-0.5 rounded shadow mt-0.5 whitespace-nowrap opacity-80 group-hover:opacity-100">
                  {node.name}
                </span>
              </div>
            )}

            {!isOrigin && !isDestination && !isAirport && !isStation && (
              <div className="h-3.5 w-3.5 rounded-full bg-zinc-700 border border-white shadow-xs" />
            )}
          </div>
        );
      })}

      {/* Floating Controls HUD */}
      <div className="absolute top-3 right-3 z-20 flex items-center bg-white/95 backdrop-blur-md rounded-xl border border-zinc-200 shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(z + 1, 16))}
          className="p-1.5 hover:bg-zinc-100 text-zinc-700 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(z - 1, 3))}
          className="p-1.5 hover:bg-zinc-100 text-zinc-700 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(defaultZoom);
            setPanCenter({ lat: centerLat, lng: centerLng });
          }}
          className="p-1.5 hover:bg-zinc-100 text-zinc-700 transition-colors"
          title="Reset Map Bounds"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Attribution Badge for OpenStreetMap */}
      <div className="absolute bottom-1 right-2 z-10 text-[9px] text-zinc-600 bg-white/80 backdrop-blur-xs px-1.5 py-0.5 rounded border border-zinc-200 font-mono pointer-events-none">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline pointer-events-auto">OpenStreetMap</a> contributors
      </div>
    </div>
  );
};
