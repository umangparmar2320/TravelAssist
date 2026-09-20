export type TravelMode = 'ALL_MODES' | 'FLIGHT_ONLY' | 'RAIL_ONLY' | 'MULTI_MODAL' | 'GROUND_ONLY';
export type PreferenceMode = 'FASTEST' | 'CHEAPEST' | 'BALANCED';
export type SegmentMode = 'FLIGHT' | 'HIGH_SPEED_RAIL' | 'COMMUTER_TRAIN' | 'METRO' | 'BUS' | 'RIDE_SHARE' | 'WALK';
export type ComplianceStatus = 'COMPLIANT' | 'WARNING' | 'OUT_OF_POLICY';
export type CabinClass = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface IntermediateStop {
  station_name: string;
  station_code?: string;
  arrival_time?: string;
  departure_time?: string;
  halt_minutes?: number;
  distance_km?: number;
}

export interface RouteSegment {
  id: string;
  sequence_order: number;
  mode: SegmentMode;
  provider_name: string;
  carrier_code?: string;
  flight_or_service_num?: string;
  cabin_class?: CabinClass;
  start_name: string;
  start_code?: string;
  start_lat: number;
  start_lon: number;
  departure_time: string;
  end_name: string;
  end_code?: string;
  end_lat: number;
  end_lon: number;
  arrival_time: string;
  distance_km: number;
  duration_minutes: number;
  delay_minutes: number;
  cost_usd: number;
  cost?: number;
  currency_symbol?: string;
  layover_after_minutes?: number;
  instructions?: string;
  disruption_note?: string;
  is_rebooked?: boolean;
  intermediate_stops?: IntermediateStop[];
}

export interface RouteOption {
  id: string;
  title: string;
  badge: 'Recommended' | 'Fastest' | 'Best Value' | 'Corporate Pick';
  origin_name: string;
  origin_code: string;
  destination_name: string;
  destination_code: string;
  travel_mode: TravelMode;
  total_distance_km: number;
  total_duration_minutes: number;
  total_cost_usd: number;
  benchmark_cost_usd: number;
  total_cost?: number;
  benchmark_cost?: number;
  currency?: CurrencyCode;
  currency_symbol?: string;
  transfer_count: number;
  compliance_status: ComplianceStatus;
  compliance_notes: string[];
  max_cabin_class: CabinClass;
  segments: RouteSegment[];
  reliability_score: number; // 0 - 100
  via_stations?: string[];
}

export interface CorporatePolicy {
  id: string;
  name: string;
  description: string;
  max_additional_fare_usd: number; // Maximum over benchmark allowed without approval
  max_stops: number;
  allowed_cabin_domestic: CabinClass;
  allowed_cabin_international: CabinClass;
  international_flight_duration_threshold_hours: number;
  preferred_carriers: string[];
  blocked_carriers: string[];
  mandate_rail_under_km: number; // e.g. 500km -> must use rail if travel time difference <= 90min
  auto_rebooking_allowed: boolean;
  auto_rebooking_max_delta_usd: number;
  require_manager_approval_for_out_of_policy: boolean;
}

export interface TravelerProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  tier: 'Standard Employee' | 'Senior Manager' | 'Executive';
  seat_preference: 'Window' | 'Aisle';
  preferred_cabin: CabinClass;
  optimization_priority: PreferenceMode;
  preferred_alliances: string[];
  auto_rebooking_opt_in: boolean;
}

export interface BookedTrip {
  id: string;
  booking_ref: string;
  traveler_id: string;
  traveler_name: string;
  route_id: string;
  title: string;
  origin_name: string;
  destination_name: string;
  departure_date: string;
  status: 'CONFIRMED' | 'IN_TRANSIT' | 'DELAYED' | 'DISRUPTED' | 'REBOOKED' | 'COMPLETED';
  total_cost_usd: number;
  total_cost?: number;
  currency?: CurrencyCode;
  currency_symbol?: string;
  booked_at: string;
  segments: RouteSegment[];
  policy_id: string;
  policy_status: ComplianceStatus;
}

export interface RebookingAlternative {
  id: string;
  title: string;
  replacement_segments: RouteSegment[];
  new_arrival_time: string;
  cost_delta_usd: number;
  cost_delta?: number;
  currency?: CurrencyCode;
  currency_symbol?: string;
  duration_delta_minutes: number;
  is_policy_compliant: boolean;
  policy_rule_note: string;
  auto_rebookable: boolean;
}
