export interface RouteMetrics {
  total_travel_time_min: number;
  waiting_time_min: number;
  transfer_time_min: number;
  total_cost: number;
  number_of_transfers: number;
  reliability_score: number;
  convenience_score: number;
}

export interface CandidateRoute {
  route_id: string;
  title: string;
  summary: string;
  modes_used: string[];
  metrics: RouteMetrics;
  is_recommended?: boolean;
  badges?: string[];
}

export type TravellerPriority =
  | "fastest"
  | "cheapest"
  | "most_reliable"
  | "least_transfers"
  | "balanced"
  | "FASTEST"
  | "CHEAPEST"
  | "MOST_RELIABLE"
  | "LEAST_TRANSFERS"
  | "BALANCED";

export interface DisruptionScenario {
  id: string;
  name: string;
  current_location: string;
  destination: string;
  disruption: string;
  default_priority: "fastest" | "cheapest" | "most_reliable" | "least_transfers" | "balanced";
  currency_symbol: string;
  candidate_routes: CandidateRoute[];
}

export interface ValidatedBackendExplanation {
  disruption_line: string;
  alternatives_line: string;
  recommendation_line: string;
  bullet_points: string[];
  trade_off_line: string;
  formatted_text: string;
  source: "deterministic_template" | "gemini_llm";
  provenance: {
    recommended_route_id: string;
    recommended_modes: string;
    duration_minutes: number;
    duration_formatted: string;
    total_cost: number;
    transfers: number;
    reliability_percentage: number;
    cheapest_route_id?: string;
    cheapest_cost?: number;
    cheapest_duration_formatted?: string;
    fastest_route_id?: string;
    fastest_duration_formatted?: string;
    alternatives_count: number;
  };
}

export interface RecommendationResponse {
  recommended_route_id: string;
  recommended_route_title?: string;
  headline?: string;
  reason_headline?: string;
  traveller_message?: string;
  reasoning?: string;
  detailed_reasoning?: string;
  trade_off_analysis: {
    key_trade_off?: string;
    cost_comparison?: string;
    time_comparison?: string;
    advantages?: string[];
    disadvantages?: string[];
  };
  warnings?: string[];
  actionable_steps?: string[];
  contingency_advice?: string;
  provider_used?: string;
  confidence_score?: number;
  confidence?: number;
  urgency_level?: string;
  booking_action_prompt?: string;
  alternative_insights?: string;
  explanation?: ValidatedBackendExplanation;
}

// Replan Pipeline V1 Models (Matching backend /api/v1/replan)
export interface ReplanStep {
  step_id: string;
  service_id?: string;
  transport_mode: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  cost: number;
  reliability_score: number;
  provider?: string;
  waiting_time_minutes?: number;
  transfer_time_minutes?: number;
  notes?: string;
}

export interface ReplanRouteItem {
  route_id: string;
  title?: string;
  category?: string;
  categories: string[];
  overall_score: number;
  time_score: number;
  cost_score: number;
  reliability_score: number;
  convenience_score: number;
  transfer_score: number;
  total_duration_minutes: number;
  waiting_minutes: number;
  transfer_minutes: number;
  total_cost: number;
  transfers: number;
  number_of_transport_modes: number;
  transport_modes: string[];
  departure_time?: string;
  arrival_time?: string;
  steps: ReplanStep[];
}

export type SimulatorDisruptionType =
  | "TRAIN CANCELLED"
  | "TRAIN DELAYED"
  | "BUS CANCELLED"
  | "FLIGHT CANCELLED"
  | "ROAD BLOCKED"
  | "METRO CLOSED";

export interface OriginalJourneyInfo {
  service_id: string;
  service_name: string;
  transport_mode: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  cost: number;
  status: string;
  original_ticket?: string;
}

export type ReplanStatus =
  | "SUCCESS"
  | "NO_ROUTE_FOUND"
  | "NO_TRANSPORTATION_OPTIONS"
  | "ALL_SERVICES_CANCELLED"
  | "DESTINATION_UNREACHABLE"
  | "CONNECTION_IMPOSSIBLE"
  | "API_FALLBACK_ACTIVE"
  | "ERROR";

export interface ReplanWarning {
  code: string;
  message: string;
  resolution?: string;
}

export interface EmergencyAssistanceInfo {
  title: string;
  advisory: string;
  helpline_number?: string;
  helpline?: string;
  helpline_label?: string;
  actionable_steps?: string[];
  action_steps?: string[];
  shelter_options?: string[];
  refund_link_text?: string;
  nearest_safe_hub?: string;
  suggested_nearest_hubs?: string[];
}

export interface ReplanApiResponse {
  status: ReplanStatus;
  message?: string;
  error_code?: string;
  warnings?: ReplanWarning[];
  fallback_applied?: boolean;
  fallback_reason?: string;
  emergency_assistance?: EmergencyAssistanceInfo;
  connection_diagnostics?: {
    total_checked: number;
    infeasible_connections_dropped: number;
    warnings: string[];
  };
  journey_id?: string;
  disruption: {
    type: string;
    affected_service?: string;
    affected_provider?: string;
    location?: string;
    delay_minutes?: number;
    description?: string;
    severity?: string;
  };
  disruption_category?: string;
  original_journey?: OriginalJourneyInfo;
  removed_services?: string[];
  current_location: {
    latitude?: number;
    longitude?: number;
    name?: string;
    city?: string;
    nearest_hub?: string;
    distance_to_hub_km?: number;
  };
  destination: {
    latitude?: number;
    longitude?: number;
    name?: string;
    city?: string;
    nearest_hub?: string;
  };
  recommended_route: ReplanRouteItem | null;
  routes: ReplanRouteItem[];
  alternatives: {
    fastest?: ReplanRouteItem | null;
    cheapest?: ReplanRouteItem | null;
    most_reliable?: ReplanRouteItem | null;
    least_transfers?: ReplanRouteItem | null;
  };
  explanation?: ValidatedBackendExplanation;
}
