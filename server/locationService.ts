/**
 * 1. Location Service: Geospatial calculations, station resolution, coordinate validation
 */

import { FIXTURE_STATIONS, TestTransitStation } from "../tests/fixtures/transitFixtures";

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  name?: string;
}

export class LocationService {
  private stations: Map<string, TestTransitStation>;

  constructor(customStations?: Record<string, TestTransitStation>) {
    this.stations = new Map(Object.entries(customStations || FIXTURE_STATIONS));
  }

  /**
   * Calculate great-circle distance between two coordinates in kilometers using Haversine formula
   */
  public calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Validate whether a coordinate is mathematically and geographically valid
   */
  public isValidCoordinate(lat: any, lng: any): boolean {
    const pLat = typeof lat === "number" ? lat : parseFloat(lat);
    const pLng = typeof lng === "number" ? lng : parseFloat(lng);
    return !isNaN(pLat) && !isNaN(pLng) && pLat >= -90 && pLat <= 90 && pLng >= -180 && pLng <= 180;
  }

  /**
   * Resolve station by ID or partial name
   */
  public findStation(query: string): TestTransitStation | null {
    const q = query.trim().toLowerCase();
    for (const [id, station] of this.stations.entries()) {
      if (id.toLowerCase() === q || station.name.toLowerCase().includes(q)) {
        return station;
      }
    }
    return null;
  }

  /**
   * Find nearest transit hub of a given modal type to a location
   */
  public findNearestHub(
    lat: number,
    lng: number,
    type?: "RAIL" | "AIR" | "BUS" | "FERRY" | "METRO"
  ): { station: TestTransitStation; distanceKm: number } | null {
    let bestStation: TestTransitStation | null = null;
    let minDistance = Infinity;

    for (const station of this.stations.values()) {
      if (type && !station.types.includes(type)) continue;

      const dist = this.calculateDistanceKm(lat, lng, station.lat, station.lng);
      if (dist < minDistance) {
        minDistance = dist;
        bestStation = station;
      }
    }

    return bestStation ? { station: bestStation, distanceKm: minDistance } : null;
  }

  /**
   * Sanitize coordinates, falling back to a recognized regional transit hub
   */
  public sanitize(coord: { latitude?: any; longitude?: any; name?: string }): {
    latitude: number;
    longitude: number;
    name: string;
    wasSanitized: boolean;
    warning?: string;
  } {
    const lat = coord.latitude;
    const lng = coord.longitude;
    const name = coord.name || "Mumbai Central";

    if (this.isValidCoordinate(lat, lng)) {
      return {
        latitude: typeof lat === "number" ? lat : parseFloat(lat),
        longitude: typeof lng === "number" ? lng : parseFloat(lng),
        name,
        wasSanitized: false,
      };
    }

    // Attempt matching by name or fallback to Mumbai Central
    const matched = this.findStation(name) || this.stations.get("MUM_CENTRAL")!;
    return {
      latitude: matched.lat,
      longitude: matched.lng,
      name,
      wasSanitized: true,
      warning: `Invalid GPS coordinates [lat: ${lat}, lng: ${lng}] normalized to hub: ${matched.name} (${matched.lat}, ${matched.lng})`,
    };
  }

  /**
   * Check if a location point is inside a circular geofence
   */
  public isWithinRadius(
    centerLat: number,
    centerLng: number,
    targetLat: number,
    targetLng: number,
    radiusKm: number
  ): boolean {
    return this.calculateDistanceKm(centerLat, centerLng, targetLat, targetLng) <= radiusKm;
  }
}
