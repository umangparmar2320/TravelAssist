/**
 * Frontend Component and State Tests
 * Validates rendering and behavior for:
 * 1. Disruption Alert (EmergencyAssistanceBanner)
 * 2. Route Cards (RouteList)
 * 3. Recommendation (RecommendationCard)
 * 4. Loading State
 * 5. Error State
 */

import assert from "node:assert";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { EmergencyAssistanceBanner } from "../../src/components/breakdown/EmergencyAssistanceBanner";
import { ReplanRouteList as RouteList } from "../../src/components/breakdown/ReplanRouteList";
import { RecommendationCard } from "../../src/components/breakdown/RecommendationCard";
import { TestResult } from "./backend-tests";
import { ReplanRouteItem, RecommendationResponse } from "../../src/types";

// Mock Route Items for testing
const MOCK_ROUTE_1: ReplanRouteItem = {
  route_id: "ROUTE-AIR-EXP-01",
  title: "Air Express Direct Link",
  category: "FASTEST",
  categories: ["FASTEST", "AIR_EXPRESS"],
  total_duration_minutes: 320,
  waiting_minutes: 35,
  transfer_minutes: 25,
  total_cost: 5200.0,
  transfers: 2,
  number_of_transport_modes: 2,
  transport_modes: ["Taxi", "Flight", "Taxi"],
  departure_time: new Date().toISOString(),
  arrival_time: new Date(Date.now() + 320 * 60000).toISOString(),
  time_score: 95.0,
  cost_score: 45.0,
  reliability_score: 91.0,
  convenience_score: 88.0,
  transfer_score: 85.0,
  overall_score: 9.1,
  steps: [
    {
      step_id: "STEP-1",
      service_id: "CAB-01",
      transport_mode: "TAXI",
      origin: "Mumbai Central",
      destination: "Mumbai BOM Airport",
      departure_time: "07:30",
      arrival_time: "08:15",
      duration_minutes: 45,
      cost: 650.0,
      reliability_score: 92.0,
      provider: "Uber",
    },
    {
      step_id: "STEP-2",
      service_id: "AI667",
      transport_mode: "FLIGHT",
      origin: "Mumbai BOM Airport",
      destination: "Goa GOX Airport",
      departure_time: "09:30",
      arrival_time: "10:40",
      duration_minutes: 70,
      cost: 3890.0,
      reliability_score: 93.0,
      provider: "Air India",
    },
  ],
};

const MOCK_ROUTE_2: ReplanRouteItem = {
  route_id: "ROUTE-BUS-02",
  title: "Kadamba State Highway Express",
  category: "CHEAPEST",
  categories: ["CHEAPEST"],
  total_duration_minutes: 630,
  waiting_minutes: 20,
  transfer_minutes: 10,
  total_cost: 1400.0,
  transfers: 1,
  number_of_transport_modes: 2,
  transport_modes: ["Taxi", "Bus"],
  departure_time: new Date().toISOString(),
  arrival_time: new Date(Date.now() + 630 * 60000).toISOString(),
  time_score: 60.0,
  cost_score: 96.0,
  reliability_score: 82.0,
  convenience_score: 75.0,
  transfer_score: 90.0,
  overall_score: 8.4,
  steps: [
    {
      step_id: "STEP-1",
      service_id: "BUS-01",
      transport_mode: "BUS",
      origin: "Dadar Bus Terminal",
      destination: "Goa Panaji",
      departure_time: "08:00",
      arrival_time: "18:30",
      duration_minutes: 630,
      cost: 1400.0,
      reliability_score: 82.0,
      provider: "Kadamba State Transport",
    },
  ],
};

const MOCK_RECOMMENDATION: RecommendationResponse = {
  recommended_route_id: "ROUTE-AIR-EXP-01",
  recommended_route_title: "Air Express Direct Link",
  confidence_score: 95.0,
  reason_headline: "Optimal Flight Bypass Around Cancelled Rail Corridor",
  detailed_reasoning: "Air Express gets you to Goa 5 hours earlier than ground transit with high on-time reliability.",
  trade_off_analysis: {
    advantages: ["Saves 5+ hours of travel time", "Bypasses track blockades completely", "Guaranteed confirmed seat"],
    disadvantages: ["Higher upfront fare than train", "Requires airport terminal transfer"],
  },
  alternative_insights: "Budget travellers can opt for the Kadamba Highway Express Bus to save ₹3,800.",
  urgency_level: "HIGH",
  booking_action_prompt: "Book Air India AI-667 immediately before departure gate closes.",
};

export function runFrontendTests(): TestResult[] {
  const results: TestResult[] = [];

  function record(suite: string, name: string, fn: () => void, details?: string) {
    const start = performance.now();
    try {
      fn();
      results.push({
        suite,
        name,
        passed: true,
        durationMs: parseFloat((performance.now() - start).toFixed(2)),
        details,
      });
    } catch (err: any) {
      results.push({
        suite,
        name,
        passed: false,
        durationMs: parseFloat((performance.now() - start).toFixed(2)),
        error: err.message,
        details,
      });
    }
  }

  // =========================================================================
  // 1. DISRUPTION ALERT TESTS
  // =========================================================================
  record("Frontend - Disruption Alert", "Renders emergency assistance banner with advisory and helpline", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(EmergencyAssistanceBanner, {
        status: "ALL_SERVICES_CANCELLED",
        emergencyAssistance: {
          title: "Regional Transit Disruption Support & Assistance",
          advisory: "Severe Cyclone warning - all transit operations suspended",
          helpline: "Railway & Police Emergency: 139 / 112",
          nearest_safe_hub: "Mumbai CSMT Passenger Waiting Lounge",
          action_steps: ["Do not attempt to travel to terminal", "Request automated full refund"],
        },
        warnings: [
          {
            code: "CRITICAL_WEATHER",
            message: "Red weather alert active",
            resolution: "Shelter advisory activated",
          },
        ],
        currentLocation: "Mumbai Central",
        destination: "Goa",
      })
    );

    assert(html.includes("Regional Transit Disruption Support"), "Should render emergency advisory title");
    assert(html.includes("139 / 112"), "Should render emergency helpline number");
    assert(html.includes("CRITICAL_WEATHER"), "Should render warning code");
    assert(html.includes("Severe Cyclone warning"), "Should render advisory description");
  });

  // =========================================================================
  // 2. ROUTE CARDS TESTS
  // =========================================================================
  record("Frontend - Route Cards", "Renders candidate route cards with title, fare, duration, and recommended badge", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(RouteList, {
        routes: [MOCK_ROUTE_1, MOCK_ROUTE_2],
        recommendedRouteId: "ROUTE-AIR-EXP-01",
        selectedRouteId: "ROUTE-AIR-EXP-01",
        currencySymbol: "₹",
        alternatives: {
          fastest: MOCK_ROUTE_1,
          cheapest: MOCK_ROUTE_2,
        },
      })
    );

    assert(html.includes("Air Express Direct Link"), "Should render route 1 title");
    assert(html.includes("Kadamba State Highway Express"), "Should render route 2 title");
    assert(html.includes("5,200") || html.includes("5200"), "Should render route 1 fare");
    assert(html.includes("1,400") || html.includes("1400"), "Should render route 2 fare");
    assert(html.includes("Recommended") || html.includes("RECOMMENDED"), "Should display recommended route badge");
    assert(html.includes("FASTEST"), "Should display FASTEST badge");
  });

  // =========================================================================
  // 3. RECOMMENDATION TESTS
  // =========================================================================
  record("Frontend - Recommendation", "Renders AI recommendation card with reasoning, advantages, and action prompt", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(RecommendationCard, {
        recommendation: MOCK_RECOMMENDATION,
        recommendedRoute: MOCK_ROUTE_1,
        loading: false,
        onRefresh: () => {},
      })
    );

    assert(html.includes("Optimal Flight Bypass"), "Should render reason headline");
    assert(html.includes("Saves 5+ hours of travel time"), "Should render advantage bullet");
    assert(html.includes("Book Air India AI-667"), "Should render booking prompt");
    assert(html.includes("95% Match") || html.includes("95"), "Should render confidence percentage");
  });

  // =========================================================================
  // 4. LOADING STATE TESTS
  // =========================================================================
  record("Frontend - Loading State", "Renders animated skeleton placeholders when loading is active", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(RecommendationCard, {
        recommendation: null,
        recommendedRoute: null,
        loading: true,
        onRefresh: () => {},
      })
    );

    assert(html.includes("animate-pulse"), "Loading state must render pulse animation container");
    assert(html.includes("bg-zinc-100") || html.includes("bg-zinc-200"), "Loading state must render skeleton placeholders");
  });

  // =========================================================================
  // 5. ERROR STATE TESTS
  // =========================================================================
  record("Frontend - Error State", "Renders warning/error guidance and alternative hubs on severed corridors", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(EmergencyAssistanceBanner, {
        status: "DESTINATION_UNREACHABLE",
        emergencyAssistance: {
          title: "Destination Corridor Unreachable",
          advisory: "All road, rail, and air access to destination is impassable.",
          helpline: "Emergency Control: 112",
          nearest_safe_hub: "Pune Junction Staging Area",
        },
        warnings: [
          {
            code: "DESTINATION_UNAVAILABLE",
            message: "Destination is currently unreachable due to port closure.",
            resolution: "Defaulted corridor to nearest reachable terminal.",
          },
        ],
        suggestedDestinations: ["Pune", "Belagavi", "Kolhapur"],
        currentLocation: "Mumbai Central",
        destination: "Goa",
      })
    );

    assert(html.includes("Destination Corridor Unreachable"), "Must render error title");
    assert(html.includes("impassable"), "Must render advisory description");
    assert(html.includes("Pune") || html.includes("Belagavi"), "Must render reachable alternative destinations");
  });

  return results;
}
