import {
  MapCoordinates,
  MapLocation,
  MapRouteStep,
  MapTransportNode,
  MapProviderInfo,
  MapProviderType,
} from "./types";

/**
 * Known coordinate database for key transit hubs, stations, and cities.
 * Enables accurate positioning even when simple string names are provided.
 */
export const TRANSIT_GEO_DATABASE: Record<string, { lat: number; lng: number; code?: string; type: MapTransportNode["type"] }> = {
  // Mumbai corridor
  "mumbai central": { lat: 18.9696, lng: 72.8194, code: "MMCT", type: "origin" },
  "mumbai csmt": { lat: 18.9401, lng: 72.8354, code: "CSMT", type: "station" },
  "mumbai": { lat: 18.9696, lng: 72.8194, code: "BOM-CITY", type: "origin" },
  "mumbai bom airport": { lat: 19.0896, lng: 72.8656, code: "BOM", type: "airport" },
  "bom airport": { lat: 19.0896, lng: 72.8656, code: "BOM", type: "airport" },
  "mumbai airport (bom)": { lat: 19.0896, lng: 72.8656, code: "BOM", type: "airport" },
  "chhatrapati shivaji terminal": { lat: 18.9401, lng: 72.8354, code: "CSMT", type: "station" },
  "pune": { lat: 18.5204, lng: 73.8567, code: "PUNE", type: "station" },
  "pune junction": { lat: 18.5284, lng: 73.8744, code: "PUNE", type: "station" },
  "ratnagiri": { lat: 16.9902, lng: 73.3120, code: "RN", type: "station" },
  "ratnagiri station": { lat: 16.9850, lng: 73.3320, code: "RN", type: "station" },

  // Goa corridor
  "goa": { lat: 15.4909, lng: 73.8278, code: "GOA", type: "destination" },
  "goa (destination)": { lat: 15.4909, lng: 73.8278, code: "GOA", type: "destination" },
  "goa mopa (gox)": { lat: 15.7686, lng: 73.8647, code: "GOX", type: "airport" },
  "goa mopa": { lat: 15.7686, lng: 73.8647, code: "GOX", type: "airport" },
  "mopa airport": { lat: 15.7686, lng: 73.8647, code: "GOX", type: "airport" },
  "goa dabolim (goi)": { lat: 15.3808, lng: 73.8314, code: "GOI", type: "airport" },
  "goa dabolim": { lat: 15.3808, lng: 73.8314, code: "GOI", type: "airport" },
  "karmali station": { lat: 15.5139, lng: 73.9189, code: "KRMI", type: "station" },
  "karmali": { lat: 15.5139, lng: 73.9189, code: "KRMI", type: "station" },
  "madgaon": { lat: 15.2736, lng: 73.9582, code: "MAO", type: "station" },
  "madgaon junction (mao)": { lat: 15.2736, lng: 73.9582, code: "MAO", type: "destination" },
  "panaji": { lat: 15.4989, lng: 73.8278, code: "PAN", type: "destination" },

  // Delhi / Jaipur corridor
  "delhi": { lat: 28.6139, lng: 77.2090, code: "DEL", type: "origin" },
  "new delhi": { lat: 28.6139, lng: 77.2090, code: "NDLS", type: "origin" },
  "new delhi railway station": { lat: 28.6431, lng: 77.2197, code: "NDLS", type: "station" },
  "delhi airport (del)": { lat: 28.5562, lng: 77.1000, code: "DEL", type: "airport" },
  "jaipur": { lat: 26.9124, lng: 75.7873, code: "JAI", type: "destination" },
  "jaipur junction": { lat: 26.9196, lng: 75.7885, code: "JP", type: "station" },
  "jaipur airport (jai)": { lat: 26.8242, lng: 75.8122, code: "JAI", type: "airport" },

  // Bengaluru / Chennai corridor
  "bengaluru": { lat: 12.9716, lng: 77.5946, code: "BLR", type: "origin" },
  "bengaluru central": { lat: 12.9778, lng: 77.5729, code: "SBC", type: "origin" },
  "bengaluru airport (blr)": { lat: 13.1986, lng: 77.7066, code: "BLR", type: "airport" },
  "chennai": { lat: 13.0827, lng: 80.2707, code: "MAS", type: "destination" },
  "chennai central": { lat: 13.0825, lng: 80.2755, code: "MAS", type: "destination" },
  "chennai airport (maa)": { lat: 12.9941, lng: 80.1709, code: "MAA", type: "airport" },
};

/**
 * Returns whether a real Google Maps API key is configured in the environment.
 * Never hardcoded; reads dynamically from import.meta.env.VITE_GOOGLE_MAPS_API_KEY.
 */
export function getGoogleMapsApiKey(): string | null {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (key && typeof key === "string" && key.trim() !== "" && !key.includes("MY_")) {
    return key.trim();
  }
  return null;
}

/**
 * Inspects environment and available providers.
 */
export function getAvailableMapProviders(): MapProviderInfo[] {
  const googleKey = getGoogleMapsApiKey();

  return [
    {
      id: "fallback-schematic",
      name: "Demo Vector Radar",
      badge: "No Key Needed",
      description: "Autonomous transit corridor radar with animated vector paths, nodes, and disruption alerts",
      requiresKey: false,
      isConfigured: true,
    },
    {
      id: "osm-tiles",
      name: "OpenStreetMap Slippy",
      badge: "Open Source",
      description: "Global geographic tile map with real-world road and rail network overlays",
      requiresKey: false,
      isConfigured: true,
    },
    {
      id: "google-maps",
      name: "Google Maps Platform",
      badge: googleKey ? "Active Key" : "Requires Key",
      description: "Google Maps JavaScript SDK with street, satellite, and live traffic data",
      requiresKey: true,
      isConfigured: Boolean(googleKey),
    },
  ];
}

/**
 * Resolves latitude and longitude for any location name or object.
 */
export function resolveLocationCoordinates(
  loc: string | MapLocation | undefined,
  fallbackDefault?: MapCoordinates
): { lat: number; lng: number; name: string; type: MapTransportNode["type"] } {
  if (!loc) {
    return {
      lat: fallbackDefault?.latitude ?? 18.9696,
      lng: fallbackDefault?.longitude ?? 72.8194,
      name: "Unknown Location",
      type: "waypoint",
    };
  }

  if (typeof loc === "object") {
    if (typeof loc.latitude === "number" && typeof loc.longitude === "number") {
      return {
        lat: loc.latitude,
        lng: loc.longitude,
        name: loc.name || "Waypoint",
        type: loc.type || "waypoint",
      };
    }
    const nameKey = (loc.name || "").toLowerCase().trim();
    if (TRANSIT_GEO_DATABASE[nameKey]) {
      const match = TRANSIT_GEO_DATABASE[nameKey];
      return { lat: match.lat, lng: match.lng, name: loc.name, type: match.type };
    }
    return {
      lat: fallbackDefault?.latitude ?? 18.9696,
      lng: fallbackDefault?.longitude ?? 72.8194,
      name: loc.name || "Location",
      type: loc.type || "waypoint",
    };
  }

  // String lookup
  const cleanStr = loc.toLowerCase().trim();
  if (TRANSIT_GEO_DATABASE[cleanStr]) {
    const match = TRANSIT_GEO_DATABASE[cleanStr];
    return { lat: match.lat, lng: match.lng, name: loc, type: match.type };
  }

  // Fuzzy partial match
  for (const [key, val] of Object.entries(TRANSIT_GEO_DATABASE)) {
    if (cleanStr.includes(key) || key.includes(cleanStr)) {
      return { lat: val.lat, lng: val.lng, name: loc, type: val.type };
    }
  }

  return {
    lat: fallbackDefault?.latitude ?? 18.9696,
    lng: fallbackDefault?.longitude ?? 72.8194,
    name: loc,
    type: "waypoint",
  };
}

/**
 * Normalizes arbitrary step objects into strongly typed MapRouteStep items.
 */
export function normalizeRouteSteps(steps: any[] | undefined): MapRouteStep[] {
  if (!steps || !Array.isArray(steps)) return [];

  return steps.map((s, index) => {
    const stepId = s.step_id || s.id || `step-${index + 1}`;
    const transportMode = s.transport_mode || s.mode || s.transportMode || "Transit";
    const origin = s.origin || s.from || "Start";
    const destination = s.destination || s.to || "End";
    const durationMinutes = s.duration_minutes ?? s.durationMinutes ?? 30;
    const cost = s.cost ?? s.price ?? 0;
    const provider = s.provider || s.operator || s.service_id || s.name || "";
    const departureTime = s.departure_time || s.departureTime;
    const arrivalTime = s.arrival_time || s.arrivalTime;
    const notes = s.notes || s.description;
    const status = s.status || "scheduled";

    return {
      stepId,
      transportMode,
      origin,
      destination,
      durationMinutes,
      cost,
      provider,
      departureTime,
      arrivalTime,
      notes,
      status,
    };
  });
}

/**
 * Extracts transport nodes (airports, stations, interchange hubs) from origin, destination, and steps.
 */
export function extractTransportNodes(
  originLoc: string | MapLocation,
  destLoc: string | MapLocation,
  steps: MapRouteStep[]
): MapTransportNode[] {
  const nodes: MapTransportNode[] = [];
  const visitedNames = new Set<string>();

  // 1. Origin Node
  const originCoord = resolveLocationCoordinates(originLoc, { latitude: 18.9696, longitude: 72.8194 });
  const originName = typeof originLoc === "string" ? originLoc : originLoc.name;
  visitedNames.add(originName.toLowerCase());
  nodes.push({
    id: "origin-node",
    name: originName,
    label: `Origin: ${originName}`,
    type: "origin",
    latitude: originCoord.lat,
    longitude: originCoord.lng,
    mode: "Start",
  });

  // 2. Intermediate step nodes
  steps.forEach((step, idx) => {
    const fromName = typeof step.origin === "string" ? step.origin : step.origin.name;
    const toName = typeof step.destination === "string" ? step.destination : step.destination.name;

    [fromName, toName].forEach((nodeName) => {
      const lower = nodeName.toLowerCase().trim();
      if (!visitedNames.has(lower)) {
        visitedNames.add(lower);
        const resolved = resolveLocationCoordinates(nodeName);
        let nodeType: MapTransportNode["type"] = resolved.type || "hub";

        const m = step.transportMode.toUpperCase();
        if (m.includes("FLIGHT") || m.includes("AIR") || lower.includes("airport") || lower.includes("bom") || lower.includes("gox") || lower.includes("del")) {
          nodeType = "airport";
        } else if (m.includes("TRAIN") || m.includes("RAIL") || lower.includes("station") || lower.includes("junction") || lower.includes("csmt")) {
          nodeType = "station";
        } else if (m.includes("BUS") || lower.includes("bus")) {
          nodeType = "bus_terminal";
        }

        nodes.push({
          id: `node-${idx}-${lower.replace(/[^a-z0-9]/g, "-")}`,
          name: nodeName,
          label: nodeName,
          type: nodeType,
          latitude: resolved.lat,
          longitude: resolved.lng,
          mode: step.transportMode,
          stepIndex: idx,
        });
      }
    });
  });

  // 3. Destination Node
  const destCoord = resolveLocationCoordinates(destLoc, { latitude: 15.4909, longitude: 73.8278 });
  const destName = typeof destLoc === "string" ? destLoc : destLoc.name;
  const destLower = destName.toLowerCase();

  // If destination is not already present, add it
  const existingDest = nodes.find((n) => n.name.toLowerCase() === destLower);
  if (!existingDest) {
    nodes.push({
      id: "destination-node",
      name: destName,
      label: `Destination: ${destName}`,
      type: "destination",
      latitude: destCoord.lat,
      longitude: destCoord.lng,
      mode: "Finish",
    });
  } else {
    existingDest.type = "destination";
  }

  return nodes;
}
