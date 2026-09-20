import React, { useState, useEffect } from "react";
import {
  MapPin,
  Key,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Layers,
} from "lucide-react";
import {
  MapLocation,
  MapRouteStep,
  MapDisruptionInfo,
} from "./types";
import {
  getGoogleMapsApiKey,
  resolveLocationCoordinates,
} from "./mapProvider";

interface GoogleMapViewProps {
  currentLocation: string | MapLocation;
  destination: string | MapLocation;
  routeSteps: MapRouteStep[];
  disruption?: MapDisruptionInfo | string;
  onFallbackToRadar: () => void;
  onFallbackToOsm: () => void;
}

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  currentLocation,
  destination,
  routeSteps,
  disruption,
  onFallbackToRadar,
  onFallbackToOsm,
}) => {
  const apiKey = getGoogleMapsApiKey();
  const originName = typeof currentLocation === "string" ? currentLocation : currentLocation.name;
  const destName = typeof destination === "string" ? destination : destination.name;

  const originCoord = resolveLocationCoordinates(currentLocation);
  const destCoord = resolveLocationCoordinates(destination);

  // If no API key is provided, show clean configuration status with fallback options
  if (!apiKey) {
    return (
      <div className="relative w-full h-80 sm:h-96 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 flex flex-col items-center justify-center text-center shadow-xs">
        <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
          <Key className="h-6 w-6" />
        </div>

        <h4 className="text-base font-bold text-zinc-900">
          Google Maps Provider Not Configured
        </h4>
        <p className="text-xs text-zinc-500 max-w-md mt-1.5 leading-relaxed">
          To use Google Maps Platform, set <code className="bg-zinc-200 px-1 py-0.5 rounded text-[11px] font-mono text-zinc-800">VITE_GOOGLE_MAPS_API_KEY</code> in your environment variables.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onFallbackToRadar}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 text-amber-400" />
            Switch to Demo Vector Radar
          </button>
          <button
            type="button"
            onClick={onFallbackToOsm}
            className="px-3.5 py-2 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-800 text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
            View OpenStreetMap (Zero Key)
          </button>
        </div>

        <div className="mt-5 flex items-center gap-2 text-[11px] text-zinc-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Zero-downtime architecture: Demo radar is active automatically</span>
        </div>
      </div>
    );
  }

  // If apiKey is provided, embed Google Maps Directions / View
  const embedUrl = `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(
    apiKey
  )}&origin=${encodeURIComponent(originName)}&destination=${encodeURIComponent(
    destName
  )}&mode=transit`;

  return (
    <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-zinc-200 shadow-inner bg-zinc-100">
      <iframe
        title="Google Maps Route View"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={embedUrl}
        className="w-full h-full"
      />

      <div className="absolute bottom-2 left-3 z-10 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-200 text-[10px] text-zinc-600 font-mono shadow-xs flex items-center gap-1.5">
        <ShieldCheck className="h-3 w-3 text-emerald-600" />
        <span>Live Google Maps API Connected</span>
      </div>
    </div>
  );
};
