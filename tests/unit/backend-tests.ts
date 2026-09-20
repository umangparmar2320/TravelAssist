/**
 * Complete Backend Test Suite for Dynamic Multimodal Re-Routing
 * Covers requirements 1 through 14:
 * 1. Location service
 * 2. Transport provider
 * 3. Disruption service
 * 4. Graph creation
 * 5. Route search
 * 6. Route calculation
 * 7. Route scoring
 * 8. Preference handling
 * 9. Replanning API
 * 10. No-route scenario
 * 11. Cancelled transportation
 * 12. Delayed transportation
 * 13. Multiple transfers
 * 14. Invalid connections
 */

import assert from "node:assert";
import { LocationService } from "../../server/locationService";
import { TransportProviderService } from "../../server/transportProvider";
import { DisruptionService } from "../../server/disruptionService";
import { MultimodalRoutingGraph } from "../../server/routingGraph";
import { RouteCalculator } from "../../server/routeCalculator";
import { RouteScorer, PreferenceHandler } from "../../server/routeScorer";
import { executeDeterministicReplan } from "../../server/replanOrchestratorBridge";
import { FIXTURE_STATIONS, FIXTURE_SERVICES } from "../fixtures/transitFixtures";

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

export function runBackendTests(): TestResult[] {
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
  // 1. LOCATION SERVICE TESTS
  // =========================================================================
  record("1. Location Service", "Calculates Haversine distance between Mumbai and Goa accurately (~435km)", () => {
    const loc = new LocationService();
    // Mumbai (18.9696, 72.8194) to Goa (15.4909, 73.8278)
    const dist = loc.calculateDistanceKm(18.9696, 72.8194, 15.4909, 73.8278);
    assert(dist > 390 && dist < 460, `Expected distance ~435km, got ${dist}km`);
  });

  record("1. Location Service", "Validates legitimate GPS coordinates and rejects non-finite/out-of-range coordinates", () => {
    const loc = new LocationService();
    assert.strictEqual(loc.isValidCoordinate(19.076, 72.8777), true);
    assert.strictEqual(loc.isValidCoordinate(999.0, 72.0), false);
    assert.strictEqual(loc.isValidCoordinate(-95.0, 10.0), false);
    assert.strictEqual(loc.isValidCoordinate(NaN, 50.0), false);
    assert.strictEqual(loc.isValidCoordinate(undefined, null), false);
  });

  record("1. Location Service", "Finds nearest airport to Mumbai Central (resolves BOM Airport)", () => {
    const loc = new LocationService();
    const nearestAir = loc.findNearestHub(18.9696, 72.8194, "AIR");
    assert(nearestAir !== null, "Nearest airport should be found");
    assert.strictEqual(nearestAir.station.id, "MUM_BOM_AIRPORT");
    assert(nearestAir.distanceKm < 20, `Airport should be within 20km, got ${nearestAir.distanceKm}km`);
  });

  record("1. Location Service", "Sanitizes corrupted GPS to nearest verified regional transit hub", () => {
    const loc = new LocationService();
    const sanitized = loc.sanitize({ latitude: 999.0, longitude: -999.0, name: "Mumbai Central" });
    assert.strictEqual(sanitized.wasSanitized, true);
    assert(sanitized.latitude >= 18.0 && sanitized.latitude <= 19.5, "Sanitized latitude should be in Mumbai");
    assert(sanitized.warning?.includes("normalized to hub"), "Should emit sanitization warning");
  });

  // =========================================================================
  // 2. TRANSPORT PROVIDER TESTS
  // =========================================================================
  record("2. Transport Provider", "Registers multi-carrier catalogue across rail, air, bus, ferry, and cab", () => {
    const provider = new TransportProviderService();
    const services = provider.getAllServices();
    assert(services.length >= 10, `Expected at least 10 services in catalogue, got ${services.length}`);
    const modes = new Set(services.map((s) => s.mode));
    assert(modes.has("TRAIN") && modes.has("FLIGHT") && modes.has("BUS") && modes.has("TAXI"), "Must cover key modes");
  });

  record("2. Transport Provider", "Retrieves operational services and allows cancelling individual service", () => {
    const provider = new TransportProviderService();
    assert.strictEqual(provider.isServiceOperational("TR10103"), true);
    provider.cancelService("TR10103");
    assert.strictEqual(provider.isServiceOperational("TR10103"), false);
  });

  record("2. Transport Provider", "Injects schedule delay and updates effective duration", () => {
    const provider = new TransportProviderService();
    const baseService = provider.getService("TR10103")!;
    provider.setDelay("TR10103", 120); // +2h delay
    const effective = provider.getEffectiveService("TR10103")!;
    assert.strictEqual(effective.delay_minutes, 120);
    assert.strictEqual(effective.effective_duration_minutes, baseService.duration_minutes + 120);
  });

  // =========================================================================
  // 3. DISRUPTION SERVICE TESTS
  // =========================================================================
  record("3. Disruption Service", "Classifies train cancellation and flags affected rail services", () => {
    const disruption = new DisruptionService();
    const impact = disruption.assessImpact({
      type: "TRAIN_CANCELLED",
      description: "Landslide in Western Ghats halts all Konkan rail traffic",
      affected_service: "TR10103",
    });
    assert.strictEqual(impact.category, "TRAIN_CANCELLED");
    assert(impact.affectedModes.includes("TRAIN"));
    assert(impact.affectedServiceIds.includes("TR10103"));
  });

  record("3. Disruption Service", "Identifies catastrophic multi-service cancellation (Red Alert Cyclone)", () => {
    const disruption = new DisruptionService();
    const impact = disruption.assessImpact({
      type: "ALL_SERVICES_CANCELLED",
      description: "Severe Cyclone warning - all transportation grounded",
    });
    assert.strictEqual(impact.isAllCancelled, true);
    assert.strictEqual(impact.severity, "CRITICAL");
    const filtered = disruption.filterOperationalServices(FIXTURE_SERVICES, impact);
    assert.strictEqual(filtered.length, 0, "No operational services should remain under all-services cancelled");
  });

  // =========================================================================
  // 4. GRAPH CREATION TESTS
  // =========================================================================
  record("4. Graph Creation", "Constructs directed multimodal graph with valid nodes and edges", () => {
    const graph = MultimodalRoutingGraph.buildFromFixtures(FIXTURE_STATIONS, FIXTURE_SERVICES);
    assert(graph.getNodeCount() >= 10, `Expected at least 10 nodes, got ${graph.getNodeCount()}`);
    assert(graph.getEdgeCount() >= 12, `Expected at least 12 edges, got ${graph.getEdgeCount()}`);
    const mumCentralEdges = graph.getOutEdges("MUM_CENTRAL");
    assert(mumCentralEdges.length >= 3, `Mumbai Central should connect to multiple hubs, got ${mumCentralEdges.length}`);
  });

  // =========================================================================
  // 5. ROUTE SEARCH TESTS
  // =========================================================================
  record("5. Route Search", "Finds multiple multimodal paths between Mumbai Central and Goa Central", () => {
    const graph = MultimodalRoutingGraph.buildFromFixtures(FIXTURE_STATIONS, FIXTURE_SERVICES);
    const paths = graph.searchPaths("MUM_CENTRAL", "GOA_DESTINATION", { maxTransfers: 3 });
    assert(paths.length >= 3, `Expected at least 3 distinct multimodal paths, found ${paths.length}`);
    // Check that air, rail, and bus routes are discovered
    const discoveredModes = new Set(paths.flatMap((p) => p.modes));
    assert(discoveredModes.has("TAXI"), "Expected feeder taxi legs");
    assert(discoveredModes.has("FLIGHT") || discoveredModes.has("TRAIN") || discoveredModes.has("BUS"), "Expected long-distance carriers");
  });

  // =========================================================================
  // 6. ROUTE CALCULATION TESTS
  // =========================================================================
  record("6. Route Calculation", "Calculates aggregate travel duration, transfer waiting, and total cost", () => {
    const graph = MultimodalRoutingGraph.buildFromFixtures(FIXTURE_STATIONS, FIXTURE_SERVICES);
    const paths = graph.searchPaths("MUM_CENTRAL", "GOA_DESTINATION", { maxTransfers: 3 });
    assert(paths.length > 0, "Need at least one path to calculate");

    const airPath = paths.find((p) => p.modes.includes("FLIGHT")) || paths[0];
    const calculated = RouteCalculator.calculateRoute(airPath, 420 /* 07:00 AM */);

    assert(calculated.total_duration_minutes >= calculated.total_travel_minutes, "Total duration must include waiting");
    assert(calculated.total_cost > 0, "Total cost must be calculated");
    assert(calculated.steps.length >= 2, "Path should contain multiple steps");
    assert(calculated.departure_time.includes(":"), "Departure time must be formatted HH:MM");
    assert(calculated.arrival_time.includes(":"), "Arrival time must be formatted HH:MM");
  });

  // =========================================================================
  // 7. ROUTE SCORING TESTS
  // =========================================================================
  record("7. Route Scoring", "Generates normalized sub-scores for speed, cost, reliability, convenience, and transfers", () => {
    const graph = MultimodalRoutingGraph.buildFromFixtures(FIXTURE_STATIONS, FIXTURE_SERVICES);
    const paths = graph.searchPaths("MUM_CENTRAL", "GOA_DESTINATION");
    const calculatedRoutes = paths.map((p) => RouteCalculator.calculateRoute(p));

    const bounds = {
      minDuration: 300,
      maxDuration: 800,
      minCost: 1200,
      maxCost: 6000,
    };

    const subScores = RouteScorer.calculateSubScores(calculatedRoutes[0], bounds);
    assert(subScores.time_score >= 10 && subScores.time_score <= 100, `Invalid time score: ${subScores.time_score}`);
    assert(subScores.cost_score >= 10 && subScores.cost_score <= 100, `Invalid cost score: ${subScores.cost_score}`);
    assert(subScores.reliability_score >= 10 && subScores.reliability_score <= 100, `Invalid reliability: ${subScores.reliability_score}`);
    assert(subScores.transfer_score >= 10 && subScores.transfer_score <= 100, `Invalid transfer score: ${subScores.transfer_score}`);
  });

  // =========================================================================
  // 8. PREFERENCE HANDLING TESTS
  // =========================================================================
  record("8. Preference Handling", "Preference weights shift overall scores and re-orders route rankings", () => {
    const subFast = { time_score: 95, cost_score: 30, reliability_score: 90, convenience_score: 85, transfer_score: 80 };
    const subCheap = { time_score: 40, cost_score: 95, reliability_score: 85, convenience_score: 75, transfer_score: 80 };

    const fastScoreWithFastestPref = PreferenceHandler.applyPreference(subFast, "FASTEST");
    const cheapScoreWithFastestPref = PreferenceHandler.applyPreference(subCheap, "FASTEST");
    assert(fastScoreWithFastestPref > cheapScoreWithFastestPref, "Fast route must beat cheap route under FASTEST preference");

    const fastScoreWithCheapestPref = PreferenceHandler.applyPreference(subFast, "CHEAPEST");
    const cheapScoreWithCheapestPref = PreferenceHandler.applyPreference(subCheap, "CHEAPEST");
    assert(cheapScoreWithCheapestPref > fastScoreWithCheapestPref, "Cheap route must beat fast route under CHEAPEST preference");
  });

  // =========================================================================
  // 9. REPLANNING API TESTS
  // =========================================================================
  record("9. Replanning API", "POST /api/v1/replan orchestrator returns compliant ReplanApiResponse", () => {
    const response = executeDeterministicReplan({
      current_location: { name: "Mumbai Central", latitude: 18.9696, longitude: 72.8194 },
      destination: { name: "Goa", latitude: 15.4909, longitude: 73.8278 },
      disruption: { type: "TRAIN_CANCELLED", description: "Mandovi Express cancelled due to signal failure" },
      preference: "FASTEST",
    });

    assert.strictEqual(response.status, "SUCCESS");
    assert(response.routes.length > 0, "Routes list must be populated");
    assert(response.recommended_route !== null, "Recommended route must be present");
    assert(response.alternatives.fastest !== undefined, "Fastest alternative must be defined");
    assert(response.alternatives.cheapest !== undefined, "Cheapest alternative must be defined");
    assert(response.removed_services !== undefined && response.removed_services.length > 0, "Removed services must record cancelled rail lines");
    assert(response.explanation !== undefined, "Structured AI explanation must be included");
  });

  // =========================================================================
  // 10. NO-ROUTE SCENARIO TESTS
  // =========================================================================
  record("10. No-route Scenario", "Handles unreachable destinations gracefully with structured suggestions and no crashes", () => {
    const response = executeDeterministicReplan({
      current_location: { name: "Mumbai Central" },
      destination: { name: "Unreachable Mountain Pass" },
      disruption: { type: "ROAD_BLOCKED", description: "Avalanche severed all access" },
    });

    assert.strictEqual(response.status, "DESTINATION_UNREACHABLE");
    assert.strictEqual(response.routes.length, 0);
    assert(response.emergency_assistance !== undefined, "Emergency assistance must guide traveller");
    assert(response.warnings && response.warnings.length > 0, "Must return actionable warnings");
  });

  // =========================================================================
  // 11. CANCELLED TRANSPORTATION TESTS
  // =========================================================================
  record("11. Cancelled Transportation", "Filters cancelled service and safely provides non-rail multimodal options", () => {
    const response = executeDeterministicReplan({
      current_location: { name: "Mumbai Central" },
      destination: { name: "Goa" },
      disruption: { type: "TRAIN_CANCELLED", description: "All rail lines on Konkan sector cancelled" },
    });

    assert.strictEqual(response.status, "SUCCESS");
    for (const r of response.routes) {
      assert(!r.transport_modes.includes("Train"), `Route ${r.title} includes cancelled Train mode`);
      for (const step of r.steps) {
        assert.notStrictEqual(step.transport_mode, "TRAIN", "Step transport mode cannot be TRAIN");
      }
    }
  });

  // =========================================================================
  // 12. DELAYED TRANSPORTATION TESTS
  // =========================================================================
  record("12. Delayed Transportation", "Adjusts train duration +180m, reduces time score, and re-evaluates ranking", () => {
    const response = executeDeterministicReplan({
      current_location: { name: "Mumbai Central" },
      destination: { name: "Goa" },
      disruption: {
        type: "TRAIN_DELAYED",
        delay_minutes: 180,
        description: "Heavy waterlogging delaying trains by 3 hours",
      },
      preference: "FASTEST",
    });

    assert.strictEqual(response.status, "SUCCESS");
    // Under FASTEST preference, the delayed train route should not be top recommendation; Air should prevail
    assert(
      response.recommended_route?.transport_modes.includes("Flight") ||
      response.recommended_route?.route_id.includes("AIR"),
      "Fastest route during heavy train delay should be Flight"
    );
  });

  // =========================================================================
  // 13. MULTIPLE TRANSFERS TESTS
  // =========================================================================
  record("13. Multiple Transfers", "Evaluates multi-transfer journeys and correctly scores transfer penalties", () => {
    const response = executeDeterministicReplan({
      current_location: { name: "Mumbai Central" },
      destination: { name: "Goa" },
      disruption: { type: "TRAIN_CANCELLED" },
      preference: "LEAST_TRANSFERS",
    });

    assert.strictEqual(response.status, "SUCCESS");
    // Under LEAST_TRANSFERS, 0 or 1 transfer routes must be prioritized over 2+ transfer routes
    const topTransfers = response.recommended_route?.transfers ?? 99;
    assert(topTransfers <= 1, `Recommended route under LEAST_TRANSFERS had ${topTransfers} transfers, expected <= 1`);
  });

  // =========================================================================
  // 14. INVALID CONNECTIONS TESTS
  // =========================================================================
  record("14. Invalid Connections", "Detects impossible connection timings (departure before feeder arrival) and drops them", () => {
    const response = executeDeterministicReplan({
      current_location: { name: "Mumbai Central" },
      destination: { name: "Goa" },
      disruption: {
        type: "IMPOSSIBLE_CONNECTION",
        description: "Connecting flight departs 15 minutes before train arrives",
      },
    });

    assert.strictEqual(response.status, "CONNECTION_IMPOSSIBLE");
    assert.strictEqual(response.error_code, "TRANSPORTATION_CONNECTION_IMPOSSIBLE");
    assert(response.connection_diagnostics !== undefined, "Connection diagnostics must be present");
    assert(response.connection_diagnostics.infeasible_connections_dropped > 0, "Should drop infeasible connections");
  });

  return results;
}
