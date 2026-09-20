/**
 * Unified Shared Data Contract (PRD Section 4)
 * Autonomous Travel-Disruption Concierge
 */

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'TRAVEL_ADMIN';
  department: string;
}

export interface TravelerPreference {
  user_id: string;
  preferred_modes: string[];
  max_transfers: number;
  seat_preference: 'WINDOW' | 'AISLE' | 'ANY';
  travel_priority: 'cheapest' | 'fastest' | 'balanced' | 'most_reliable';
  loyalty_programs?: Record<string, string>;
}

export interface CorporatePolicy {
  id: string;
  user_id?: string;
  name: string;
  max_budget_per_trip: number;
  allowed_modes: string[];
  require_manager_approval: boolean;
  auto_rebooking_limit: number;
  cabin_class_limit: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS';
}

export interface JourneySegment {
  id: string;
  trip_id: string;
  mode: 'FLIGHT' | 'TRAIN' | 'BUS' | 'CAB' | 'METRO' | 'WALK';
  provider: string; // e.g. "Amadeus/AirIndia", "Qrail/IRCTC", "Uber"
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  currency: string;
  status: 'SCHEDULED' | 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'REBOOKED';
  booking_id: string;
  flight_or_service_num?: string;
  seat?: string;
}

export interface Trip {
  id: string;
  user_id: string;
  source: string;
  destination: string;
  start_date: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'DISRUPTED' | 'REBOOKED' | 'COMPLETED' | 'CANCELLED';
  created_at?: string;
  segments?: JourneySegment[];
}

export interface Route {
  id: string;
  title?: string;
  segments: JourneySegment[];
  total_price: number;
  total_cost?: number; // alias for total_price
  currency: string;
  total_duration: number; // in minutes
  transfers: number;
  waiting_time: number; // in minutes
  provider: string; // "Amadeus", "Qrail", "Google Routes", "Multi-Modal"
  last_updated: string;
  policy_valid: boolean;
  reliability_score?: number;
  badges?: string[];
}

export interface Disruption {
  id: string;
  trip_id: string;
  segment_id: string;
  type: 'FLIGHT_CANCELLED' | 'TRAIN_CANCELLED' | 'SEVERE_DELAY' | 'ROAD_BLOCKED' | 'WEATHER_CYCLONE' | 'STRIKE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detected_at: string;
  status: 'ACTIVE' | 'RESOLVING' | 'RESOLVED' | 'AUTO_REBOOKED';
  affected_provider?: string;
  delay_minutes?: number;
}

export interface Alternative {
  id: string;
  trip_id: string;
  title?: string;
  mode?: 'FLIGHT' | 'TRAIN' | 'BUS' | 'CAB' | 'MULTI_MODAL';
  segments: JourneySegment[];
  total_price: number;
  cost?: number; // alias for total_price
  currency: string;
  total_duration: number;
  duration_minutes?: number; // alias for total_duration
  time_saved_minutes?: number;
  additional_cost: number;
  policy_valid: boolean;
  reason: string;
  confidence_score?: number;
  recommendation_badge?: 'FASTEST' | 'CHEAPEST' | 'RECOMMENDED' | 'HIGH_RELIABILITY';
}

export interface HotelStay {
  id: string;
  trip_id: string;
  hotel_name: string;
  address: string;
  city: string;
  check_in_date: string;
  check_out_date: string;
  original_check_in_time: string;
  estimated_arrival_time: string;
  status: 'CONFIRMED' | 'CHECK_IN_DELAYED' | 'DATE_MODIFIED' | 'CANCELLED';
  late_check_in_notified: boolean;
  last_notification_sent_at?: string;
  room_type: string;
  confirmation_code: string;
  contact_phone: string;
  special_instructions?: string;
  destination_info: {
    weather_condition: string;
    temperature_celsius: number;
    emergency_helpline: string;
    tourist_desk: string;
    transit_tips: string;
  };
}

export interface TravelNotification {
  id: string;
  user_id: string;
  trip_id?: string;
  type: 'DISRUPTION_DETECTED' | 'ALTERNATIVE_FOUND' | 'AUTO_REBOOKED' | 'HOTEL_UPDATED' | 'POLICY_ALERT';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  urgency: 'INFO' | 'WARNING' | 'CRITICAL';
  channel: 'IN_APP' | 'TELEGRAM' | 'SMS' | 'EMAIL';
  action_link?: string;
}
