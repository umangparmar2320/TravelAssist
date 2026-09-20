/**
 * Shared TypeScript definitions between Frontend and Backend for Part A.
 */

export type TravelMode = 'MULTI_MODAL' | 'TRANSIT' | 'DRIVING' | 'WALKING';
export type PreferenceMode = 'FASTEST' | 'CHEAPEST' | 'ECO_FRIENDLY';
export type SegmentMode = 'WALK' | 'BUS' | 'METRO' | 'TRAIN' | 'RIDE_SHARE';
export type RouteStatus = 'PENDING' | 'COMPUTED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

export interface LocationCoordinate {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
}

export interface RouteSegment {
  id: string;
  route_id: string;
  sequence_order: number;
  start_name: string;
  start_lat: number;
  start_lon: number;
  end_name: string;
  end_lat: number;
  end_lon: number;
  mode: SegmentMode;
  provider_name: string;
  distance_km: number;
  duration_minutes: number;
  delay_minutes: number;
  instructions?: string;
  created_at: string;
}

export interface RoutePlan {
  id: string;
  title?: string;
  origin_name: string;
  origin_lat: number;
  origin_lon: number;
  destination_name: string;
  destination_lat: number;
  destination_lon: number;
  status: RouteStatus;
  travel_mode: TravelMode;
  preference: PreferenceMode;
  total_distance_km: number;
  total_duration_minutes: number;
  estimated_cost: number;
  carbon_emissions_kg: number;
  created_at: string;
  updated_at: string;
  segments: RouteSegment[];
}

export interface RoutePlanRequest {
  origin_name: string;
  origin_lat: number;
  origin_lon: number;
  destination_name: string;
  destination_lat: number;
  destination_lon: number;
  travel_mode: TravelMode;
  preference: PreferenceMode;
}

export interface ProviderStatus {
  provider_name: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  latency_ms: number;
  is_mock: boolean;
  capabilities: string[];
}

export interface BackendHealth {
  status: 'healthy' | 'degraded' | 'error';
  service: string;
  version: string;
  environment: string;
  database: {
    status: string;
    dialect: string;
    latency_ms?: number;
    pool_size?: number;
    error?: string;
  };
  timestamp: string;
}

export interface SystemEvent {
  event_type: 'ROUTE_REQUESTED' | 'ROUTE_CALCULATED' | 'ROUTE_PERSISTED' | 'TRAFFIC_DELAY_DETECTED';
  timestamp: string;
  payload: Record<string, unknown>;
}
