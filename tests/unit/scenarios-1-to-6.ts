/**
 * Tests for Mandatory Core Scenarios 1 to 6:
 * - Scenario 1: Train cancelled → flight alternative found.
 * - Scenario 2: Train cancelled → bus alternative found.
 * - Scenario 3: Multiple services cancelled → remaining multimodal route found.
 * - Scenario 4: No route available.
 * - Scenario 5: Cheapest and fastest routes are different.
 * - Scenario 6: Traveller changes preference from CHEAPEST to FASTEST and recommended route changes.
 */

import assert from "node:assert";
import { executeDeterministicReplan } from "../../server/replanOrchestratorBridge";
import { TestResult } from "./backend-tests";

export function runScenarioTests(): TestResult[] {
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
  // SCENARIO 1: Train cancelled → flight alternative found
  // =========================================================================
  record("Scenario 1", "Train cancelled → flight alternative found", () => {
    const res = executeDeterministicReplan({
      current_location: { name: "Mumbai Central", latitude: 18.9696, longitude: 72.8194 },
      destination: { name: "Goa", latitude: 15.4909, longitude: 73.8278 },
      disruption: {
        type: "TRAIN_CANCELLED",
        description: "Mandovi Express cancelled due to derailment on Konkan Railway route",
      },
      preference: "FASTEST",
    });

    assert.strictEqual(res.status, "SUCCESS", "Pipeline should return SUCCESS status");
    assert(res.routes.length > 0, "Routes list should contain alternatives");

    // Find if flight alternative exists in candidate routes
    const flightAlternative = res.routes.find((r) =>
      r.transport_modes.some((m) => m.toLowerCase() === "flight") ||
      r.steps.some((s) => s.transport_mode === "FLIGHT")
    );

    assert(flightAlternative !== undefined && flightAlternative.title !== undefined, "A flight alternative must be found in the route pool");
    assert(flightAlternative.title.toLowerCase().includes("air"), `Flight route title mismatch: ${flightAlternative.title}`);

    // Since preference is FASTEST, the flight alternative should be the recommended route or fastest alternative
    assert.strictEqual(
      res.alternatives.fastest?.route_id,
      flightAlternative.route_id,
      "Fastest alternative must be the flight route"
    );
    assert.strictEqual(
      res.recommended_route?.route_id,
      flightAlternative.route_id,
      "Recommended route under FASTEST preference must be the flight alternative"
    );
  });

  // =========================================================================
  // SCENARIO 2: Train cancelled → bus alternative found
  // =========================================================================
  record("Scenario 2", "Train cancelled → bus alternative found", () => {
    const res = executeDeterministicReplan({
      current_location: { name: "Mumbai Central", latitude: 18.9696, longitude: 72.8194 },
      destination: { name: "Goa", latitude: 15.4909, longitude: 73.8278 },
      disruption: {
        type: "TRAIN_CANCELLED",
        description: "Heavy monsoons washed away tracks; Indian Railways suspended all trains",
      },
      preference: "CHEAPEST",
    });

    assert.strictEqual(res.status, "SUCCESS");

    // Check that a bus alternative exists in candidate routes
    const busAlternative = res.routes.find((r) =>
      r.transport_modes.some((m) => m.toLowerCase() === "bus") ||
      r.steps.some((s) => s.transport_mode === "BUS")
    );

    assert(busAlternative !== undefined, "A bus alternative must be found in the candidate routes");
    assert(busAlternative.total_cost < 2500, `Bus route cost should be economical, was ${busAlternative.total_cost}`);

    // Under CHEAPEST preference, the bus alternative should be the recommended route or cheapest alternative
    assert(
      res.alternatives.cheapest?.transport_modes.includes("Bus") ||
      res.alternatives.cheapest?.steps.some((s) => s.transport_mode === "BUS"),
      "Cheapest alternative must utilize Bus transit"
    );
    assert.strictEqual(
      res.recommended_route?.route_id,
      res.alternatives.cheapest?.route_id,
      "Recommended route under CHEAPEST preference must match cheapest bus alternative"
    );
  });

  // =========================================================================
  // SCENARIO 3: Multiple services cancelled → remaining multimodal route found
  // =========================================================================
  record("Scenario 3", "Multiple services cancelled → remaining multimodal route found", () => {
    // Both rail and commercial flights are unavailable
    // E.g. Disruption cancelling Train, and we simulate flight unavailability or multiple services dropped
    const res = executeDeterministicReplan({
      current_location: { name: "Mumbai Central", latitude: 18.9696, longitude: 72.8194 },
      destination: { name: "Goa", latitude: 15.4909, longitude: 73.8278 },
      disruption: {
        type: "TRAIN_CANCELLED",
        affected_service: "AI667", // simultaneously drops train and Air India AI-667
        description: "Track closure and commercial flight capacity exhausted",
      },
      preference: "BALANCED",
    });

    assert.strictEqual(res.status, "SUCCESS");
    assert(res.routes.length > 0, "Remaining routes must still exist");

    // Verify neither train nor cancelled flight AI667 are in remaining routes
    for (const r of res.routes) {
      assert(!r.transport_modes.includes("Train"), "Train should be eliminated");
      assert(!r.steps.some((s) => s.service_id === "AI667"), "Service AI667 should be eliminated");
    }

    // A valid multimodal option (like Metro + Bus or Highway Bus or Ro-Pax Ferry + Cab) must be recommended
    assert(res.recommended_route !== null, "Recommended multimodal route must be found");
    assert(res.recommended_route.steps.length >= 1, "Must have valid steps");
  });

  // =========================================================================
  // SCENARIO 4: No route available
  // =========================================================================
  record("Scenario 4", "No route available", () => {
    const res = executeDeterministicReplan({
      current_location: { name: "Mumbai Central" },
      destination: { name: "Goa" },
      disruption: {
        type: "ALL_SERVICES_CANCELLED",
        description: "Severe Cyclone Red Alert - all flights, trains, buses, and ferries grounded",
      },
    });

    assert.strictEqual(res.status, "ALL_SERVICES_CANCELLED", "Status must reflect all services cancelled");
    assert.strictEqual(res.routes.length, 0, "No candidate routes should be returned");
    assert.strictEqual(res.recommended_route, null, "Recommended route must be null");
    assert(res.emergency_assistance !== undefined, "Emergency assistance guidance must be provided");
    const helplineStr = res.emergency_assistance.helpline_number || (res.emergency_assistance as any).helpline || "";
    assert(helplineStr.includes("139") || helplineStr.includes("112"), "Helpline number must be provided");
  });

  // =========================================================================
  // SCENARIO 5: Cheapest and fastest routes are different
  // =========================================================================
  record("Scenario 5", "Cheapest and fastest routes are different", () => {
    const res = executeDeterministicReplan({
      current_location: { name: "Mumbai Central", latitude: 18.9696, longitude: 72.8194 },
      destination: { name: "Goa", latitude: 15.4909, longitude: 73.8278 },
      disruption: {
        type: "TRAIN_CANCELLED",
        description: "Konkan rail traffic halted due to rockfall",
      },
      preference: "BALANCED",
    });

    assert.strictEqual(res.status, "SUCCESS");
    assert(res.alternatives.cheapest !== null, "Cheapest alternative must exist");
    assert(res.alternatives.fastest !== null, "Fastest alternative must exist");

    const cheapestRoute = res.alternatives.cheapest!;
    const fastestRoute = res.alternatives.fastest!;

    // 1. They must have different route IDs
    assert.notStrictEqual(
      cheapestRoute.route_id,
      fastestRoute.route_id,
      `Expected cheapest (${cheapestRoute.route_id}) and fastest (${fastestRoute.route_id}) to be different routes`
    );

    // 2. Cheapest route cost must be strictly less than fastest route cost
    assert(
      cheapestRoute.total_cost < fastestRoute.total_cost,
      `Cheapest cost (₹${cheapestRoute.total_cost}) must be less than fastest cost (₹${fastestRoute.total_cost})`
    );

    // 3. Fastest route duration must be strictly less than cheapest route duration
    assert(
      fastestRoute.total_duration_minutes < cheapestRoute.total_duration_minutes,
      `Fastest duration (${fastestRoute.total_duration_minutes}m) must be less than cheapest duration (${cheapestRoute.total_duration_minutes}m)`
    );
  });

  // =========================================================================
  // SCENARIO 6: Traveller changes preference from CHEAPEST to FASTEST and recommended route changes
  // =========================================================================
  record("Scenario 6", "Traveller changes preference from CHEAPEST to FASTEST and recommended route changes", () => {
    const inputCheapest = {
      current_location: { name: "Mumbai Central", latitude: 18.9696, longitude: 72.8194 },
      destination: { name: "Goa", latitude: 15.4909, longitude: 73.8278 },
      disruption: {
        type: "TRAIN_CANCELLED",
        description: "Signal failure across rail corridor",
      },
      preference: "CHEAPEST",
    };

    const inputFastest = {
      ...inputCheapest,
      preference: "FASTEST",
    };

    const resCheapest = executeDeterministicReplan(inputCheapest);
    const resFastest = executeDeterministicReplan(inputFastest);

    assert.strictEqual(resCheapest.status, "SUCCESS");
    assert.strictEqual(resFastest.status, "SUCCESS");

    const recCheapest = resCheapest.recommended_route;
    const recFastest = resFastest.recommended_route;

    assert(recCheapest !== null, "Cheapest recommendation must exist");
    assert(recFastest !== null, "Fastest recommendation must exist");

    // The recommended route ID must change between preferences
    assert.notStrictEqual(
      recCheapest.route_id,
      recFastest.route_id,
      `Recommended route should change when switching preference from CHEAPEST to FASTEST. Got same ID: ${recCheapest.route_id}`
    );

    // The CHEAPEST recommendation must be cheaper than the FASTEST recommendation
    assert(
      recCheapest.total_cost < recFastest.total_cost,
      `CHEAPEST recommendation cost (₹${recCheapest.total_cost}) should be less than FASTEST recommendation cost (₹${recFastest.total_cost})`
    );

    // The FASTEST recommendation must be quicker than the CHEAPEST recommendation
    assert(
      recFastest.total_duration_minutes < recCheapest.total_duration_minutes,
      `FASTEST recommendation duration (${recFastest.total_duration_minutes}m) should be shorter than CHEAPEST recommendation (${recCheapest.total_duration_minutes}m)`
    );
  });

  return results;
}
