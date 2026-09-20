/**
 * Independent types for the MapView component and MapProvider abstraction.
 * Completely decoupled from specific backend routing engines.
 */

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

export interface MapLocation {
  name: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  code?: string; // e.g., 'BOM', 'GOX', 'CSMT'
  type?: "origin" | "destination" | "hub" | "airport" | "station" | "waypoint";
}

export interface MapRouteStep {
  stepId: string;
  transportMode: string; // e.g. "Taxi", "Flight", "Train", "Bus", "Metro", "Walk"
  origin: string | MapLocation;
  destination: string | MapLocation;
  durationMinutes?: number;
  cost?: number;
  provider?: string; // e.g. "IndiGo 6E-241", "Vande Bharat Express", "Uber Premium"
  departureTime?: string;
  arrivalTime?: string;
  notes?: string;
  status?: "scheduled" | "active" | "disrupted" | "completed" | "recommended";
  distanceKm?: number;
}

export interface MapTransportNode {
  id: string;
  name: string;
  label: string;
  type: "origin" | "destination" | "airport" | "station" | "bus_terminal" | "hub" | "waypoint";
  latitude: number;
  longitude: number;
  mode?: string;
  code?: string;
  stepIndex?: number;
}

export type MapProviderType = "fallback-schematic" | "osm-tiles" | "google-maps";

export interface MapProviderInfo {
  id: MapProviderType;
  name: string;
  badge: string;
  description: string;
  requiresKey: boolean;
  isConfigured: boolean;
}

export interface MapDisruptionInfo {
  type?: string;
  description?: string;
  affectedLocation?: string;
  severity?: "minor" | "moderate" | "severe" | "critical";
}

export interface MapViewProps {
  currentLocation: string | MapLocation;
  destination: string | MapLocation;
  routeSteps?: (MapRouteStep | any)[];
  disruption?: MapDisruptionInfo | string;
  selectedStepId?: string | null;
  onSelectStep?: (stepId: string) => void;
  initialProvider?: MapProviderType;
  className?: string;
  height?: string | number;
  showControls?: boolean;
  showStepTimeline?: boolean;
}
