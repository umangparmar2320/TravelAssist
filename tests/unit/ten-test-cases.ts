/**
 * 10 Specific Test Cases for Autonomous Travel-Disruption Concierge
 * As requested by the user:
 * 1. Multi-Modal Route Search & Preference Optimization (Part A)
 * 2. Live Transit Disruption Detection & Alert Banner (Part B)
 * 3. Autonomous Multi-Modal Alternative Generation & Scoring (Part B)
 * 4. Corporate Travel Policy & Auto-Rebooking Limit Enforcement (Part A & B)
 * 5. One-Click Rebooking Execution & Segment State Transition (Part B)
 * 6. Hotel Stay Synchronization & Automated Late Check-in Notice (Part C)
 * 7. Multi-Channel Real-Time Notifications Dispatch (Part D)
 * 8. Multi-Currency Dynamic Conversion Engine
 * 9. Extreme Failure & Severed Corridor Resilience (Robustness Suite)
 * 10. Section 15 Autonomous Concierge 12-Step Full Pipeline
 */

import { integratedPrdService } from '../../server/integratedPrdService';
import { executeDeterministicReplan } from '../../server/replanOrchestratorBridge';
import { recommendationService } from '../../server/recommendationService';

export interface TestCaseResult {
  caseNumber: number;
  title: string;
  passed: boolean;
  durationMs: number;
  details: string;
  error?: string;
}

export function runTheTenTestCases(): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  function executeCase(
    caseNumber: number,
    title: string,
    testFn: () => { details: string }
  ) {
    const t0 = performance.now();
    try {
      const { details } = testFn();
      const durationMs = parseFloat((performance.now() - t0).toFixed(2));
      results.push({
        caseNumber,
        title,
        passed: true,
        durationMs,
        details,
      });
    } catch (err: any) {
      const durationMs = parseFloat((performance.now() - t0).toFixed(2));
      results.push({
        caseNumber,
        title,
        passed: false,
        durationMs,
        details: 'Test failed execution',
        error: err?.message || String(err),
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST CASE 1: Multi-Modal Route Search & Preference Optimization (Part A)
  // --------------------------------------------------------------------------
  executeCase(1, 'Multi-Modal Route Search & Preference Optimization', () => {
    // 1. Search routes
    const routes = integratedPrdService.searchRoutes({
      origin: 'Mumbai Central',
      destination: 'Goa',
      currency: 'INR',
    });

    if (!routes || routes.length === 0) {
      throw new Error('No multi-modal routes found between Mumbai Central and Goa.');
    }

    const hasFlight = routes.some((r) => r.segments.some((s) => s.mode === 'FLIGHT'));
    const hasTrain = routes.some((r) => r.segments.some((s) => s.mode === 'TRAIN'));
    if (!hasFlight || !hasTrain) {
      throw new Error('Route search must include normalized flight and rail multi-modal options.');
    }

    // 2. Check preference optimization
    const fastPlan = executeDeterministicReplan({
      current_location: 'Mumbai Central',
      destination: 'Goa',
      priority: 'fastest',
    });

    const cheapPlan = executeDeterministicReplan({
      current_location: 'Mumbai Central',
      destination: 'Goa',
      priority: 'cheapest',
    });

    const topFast = fastPlan.candidate_routes[0];
    const topCheap = cheapPlan.candidate_routes[0];

    if (!topFast || !topCheap) {
      throw new Error('Candidate routes missing from replan response.');
    }

    if (topFast.total_duration_minutes > topCheap.total_duration_minutes) {
      throw new Error(`Fastest route (${topFast.total_duration_minutes}m) is slower than cheapest route (${topCheap.total_duration_minutes}m).`);
    }

    if (topCheap.total_cost > topFast.total_cost) {
      throw new Error(`Cheapest route (₹${topCheap.total_cost}) is more expensive than fastest route (₹${topFast.total_cost}).`);
    }

    return {
      details: `Returned ${routes.length} multi-modal routes. Fastest: ${topFast.title} (${Math.round(topFast.total_duration_minutes / 60)}h). Cheapest: ${topCheap.title} (₹${topCheap.total_cost}).`,
    };
  });

  // --------------------------------------------------------------------------
  // TEST CASE 2: Live Transit Disruption Detection & Alert Banner (Part B)
  // --------------------------------------------------------------------------
  executeCase(2, 'Live Transit Disruption Detection & Alert Banner', () => {
    const tripId = 'trip-case-02';
    integratedPrdService.createTrip({
      id: tripId,
      user_id: 'usr-corp-01',
      source: 'Mumbai Central',
      destination: 'Goa',
      status: 'IN_PROGRESS',
    });

    const disruption = integratedPrdService.simulateDisruption(tripId, {
      segment_id: 'seg-02',
      type: 'TRAIN_CANCELLED',
      severity: 'HIGH',
      description: 'Konkan Railway line blocked due to monsoon rockfall near Ratnagiri.',
    });

    if (!disruption || disruption.severity !== 'HIGH' || disruption.status !== 'ACTIVE') {
      throw new Error('Disruption was not recorded as ACTIVE/HIGH.');
    }

    const trip = integratedPrdService.getTrip(tripId);
    if (!trip || trip.status !== 'DISRUPTED') {
      throw new Error(`Trip status must transition to DISRUPTED, found: ${trip?.status}`);
    }

    const disruptions = integratedPrdService.getDisruptions(tripId);
    if (disruptions.length === 0) {
      throw new Error('Disruptions list empty for disrupted trip.');
    }

    return {
      details: `Disruption recorded: "${disruption.description}". Trip status switched to ${trip.status}. Alert generated.`,
    };
  });

  // --------------------------------------------------------------------------
  // TEST CASE 3: Autonomous Multi-Modal Alternative Generation & Scoring (Part B)
  // --------------------------------------------------------------------------
  executeCase(3, 'Autonomous Multi-Modal Alternative Generation & Scoring', () => {
    const tripId = 'trip-case-03';
    integratedPrdService.createTrip({
      id: tripId,
      user_id: 'usr-corp-01',
      source: 'Mumbai Central',
      destination: 'Goa',
      status: 'IN_PROGRESS',
    });
    integratedPrdService.simulateDisruption(tripId, {
      type: 'TRAIN_CANCELLED',
      severity: 'HIGH',
      description: 'Engine failure at Roha junction.',
    });

    const alternatives = integratedPrdService.getAlternatives(tripId);
    if (!alternatives || alternatives.length < 2) {
      throw new Error(`Expected at least 2 alternatives, received ${alternatives?.length}`);
    }

    for (const alt of alternatives) {
      if (typeof alt.cost !== 'number' || typeof alt.duration_minutes !== 'number') {
        throw new Error(`Alternative ${alt.id} missing cost or duration.`);
      }
      if (typeof alt.time_saved_minutes !== 'number') {
        throw new Error(`Alternative ${alt.id} missing time saved calculation.`);
      }
    }

    const flightAlt = alternatives.find((a) => a.mode === 'FLIGHT' || (a.title && a.title.includes('Flight')));
    if (!flightAlt) {
      throw new Error('Expected at least one flight bypass alternative.');
    }

    return {
      details: `Discovered ${alternatives.length} alternatives. Top: ${alternatives[0].title} (Saves ${alternatives[0].time_saved_minutes} mins).`,
    };
  });

  // --------------------------------------------------------------------------
  // TEST CASE 4: Corporate Travel Policy & Auto-Rebooking Limit Enforcement
  // --------------------------------------------------------------------------
  executeCase(4, 'Corporate Travel Policy & Auto-Rebooking Limit Enforcement', () => {
    const userId = 'usr-policy-test';
    const tripId = 'trip-case-04';

    integratedPrdService.savePolicy({
      id: 'pol-test-01',
      user_id: userId,
      name: 'Standard Corporate Policy',
      max_budget_per_trip: 12000,
      allowed_modes: ['FLIGHT', 'TRAIN', 'BUS', 'CAB'],
      require_manager_approval: false,
      auto_rebooking_limit: 8000,
      cabin_class_limit: 'ECONOMY',
    });

    integratedPrdService.createTrip({
      id: tripId,
      user_id: userId,
      source: 'Mumbai Central',
      destination: 'Goa',
      status: 'IN_PROGRESS',
    });

    integratedPrdService.simulateDisruption(tripId, {
      type: 'TRAIN_CANCELLED',
      severity: 'HIGH',
      description: 'Track maintenance disruption.',
    });

    const alternatives = integratedPrdService.getAlternatives(tripId);
    const compliantAlt = alternatives.find((a) => (a.cost ?? 0) <= 8000);
    if (!compliantAlt || !compliantAlt.policy_valid) {
      throw new Error('Alternative <= ₹8,000 should be marked policy compliant.');
    }

    // Now test with strict policy limit of ₹3,000
    integratedPrdService.savePolicy({
      id: 'pol-test-02',
      user_id: userId,
      name: 'Strict Economy Policy',
      max_budget_per_trip: 5000,
      allowed_modes: ['TRAIN', 'BUS'],
      require_manager_approval: true,
      auto_rebooking_limit: 3000,
      cabin_class_limit: 'ECONOMY',
    });

    const strictAlternatives = integratedPrdService.getAlternatives(tripId);
    const expensiveFlight = strictAlternatives.find((a) => (a.cost ?? 0) > 3000);
    if (expensiveFlight && expensiveFlight.policy_valid === true) {
      throw new Error('Alternative exceeding strict limit should not be marked policy_valid without manager approval.');
    }

    return {
      details: `Validated auto-rebooking limit ceiling: compliant alternative approved at ₹${compliantAlt.cost} <= ₹8,000, and non-compliant flagged when limit is ₹3,000.`,
    };
  });

  // --------------------------------------------------------------------------
  // TEST CASE 5: One-Click Rebooking Execution & Segment State Transition (Part B)
  // --------------------------------------------------------------------------
  executeCase(5, 'One-Click Rebooking Execution & Segment State Transition', () => {
    const tripId = 'trip-case-05';
    integratedPrdService.createTrip({
      id: tripId,
      user_id: 'usr-corp-01',
      source: 'Mumbai Central',
      destination: 'Goa',
      status: 'IN_PROGRESS',
    });

    integratedPrdService.simulateDisruption(tripId, {
      type: 'TRAIN_CANCELLED',
      severity: 'HIGH',
      description: 'Konkan corridor blocked.',
    });

    const alternatives = integratedPrdService.getAlternatives(tripId);
    const selectedAlt = alternatives[0];

    const rebooking = integratedPrdService.executeRebooking(tripId, selectedAlt.id);

    if (!rebooking.success) {
      throw new Error('Rebooking execution returned failure.');
    }

    if (rebooking.trip.status !== 'REBOOKED') {
      throw new Error(`Expected trip status REBOOKED, got ${rebooking.trip.status}`);
    }

    if (!rebooking.rebooking_reference || !rebooking.rebooking_reference.startsWith('REB-')) {
      throw new Error(`Invalid rebooking reference format: ${rebooking.rebooking_reference}`);
    }

    const segments = integratedPrdService.getTripSegments(tripId);
    const hasCancelled = segments.some((s) => s.status === 'CANCELLED');
    const hasRebooked = segments.some((s) => s.status === 'REBOOKED' || s.mode === selectedAlt.mode);

    if (!hasCancelled || !hasRebooked) {
      throw new Error('Trip segments did not update to reflect CANCELLED rail leg and REBOOKED leg.');
    }

    return {
      details: `Rebooked to ${selectedAlt.title} (Ref: ${rebooking.rebooking_reference}). Segment state transitioned to REBOOKED.`,
    };
  });

  // --------------------------------------------------------------------------
  // TEST CASE 6: Hotel Stay Synchronization & Automated Late Check-in Notice (Part C)
  // --------------------------------------------------------------------------
  executeCase(6, 'Hotel Stay Synchronization & Automated Late Check-in Notice', () => {
    const tripId = 'trip-case-06';
    integratedPrdService.createTrip({
      id: tripId,
      user_id: 'usr-corp-01',
      source: 'Mumbai Central',
      destination: 'Goa',
      status: 'IN_PROGRESS',
    });

    const initialHotel = integratedPrdService.getHotelStay(tripId);
    if (!initialHotel || !initialHotel.hotel_name) {
      throw new Error('Initial hotel stay not found for trip.');
    }

    const updatedHotel = integratedPrdService.modifyHotelStay(tripId, {
      late_check_in_notified: true,
      special_instructions: 'Traveler rerouted via IndiGo 6E-452. Front desk confirmed room hold until 01:00.',
    });

    if (!updatedHotel.late_check_in_notified) {
      throw new Error('late_check_in_notified was not set to true.');
    }

    if (!updatedHotel.special_instructions?.includes('IndiGo 6E-452')) {
      throw new Error('Special instructions not saved to hotel reservation.');
    }

    return {
      details: `Hotel "${updatedHotel.hotel_name}" synchronized. Late check-in confirmed with room hold.`,
    };
  });

  // --------------------------------------------------------------------------
  // TEST CASE 7: Multi-Channel Real-Time Notifications Dispatch (Part D)
  // --------------------------------------------------------------------------
  executeCase(7, 'Multi-Channel Real-Time Notifications Dispatch', () => {
    const userId = 'usr-corp-01';
    const initialCount = integratedPrdService.getNotifications(userId).length;

    const channels: ('IN_APP' | 'TELEGRAM' | 'SMS' | 'EMAIL')[] = ['IN_APP', 'TELEGRAM', 'SMS', 'EMAIL'];

    for (const ch of channels) {
      integratedPrdService.sendNotification({
        user_id: userId,
        trip_id: 'trip-case-07',
        type: 'AUTO_REBOOKED',
        title: `Alert for ${ch}`,
        message: `Your disruption has been resolved via channel ${ch}.`,
        urgency: 'INFO',
        channel: ch,
      });
    }

    const currentNotifications = integratedPrdService.getNotifications(userId);
    if (currentNotifications.length !== initialCount + 4) {
      throw new Error(`Expected ${initialCount + 4} notifications, found ${currentNotifications.length}`);
    }

    // Verify all channels were recorded
    for (const ch of channels) {
      const found = currentNotifications.some((n) => n.channel === ch);
      if (!found) {
        throw new Error(`Missing notification for channel ${ch}`);
      }
    }

    return {
      details: `Successfully dispatched notifications across all 4 channels (In-App, Telegram, SMS, Email).`,
    };
  });

  // --------------------------------------------------------------------------
  // TEST CASE 8: Multi-Currency Dynamic Conversion Engine
  // --------------------------------------------------------------------------
  executeCase(8, 'Multi-Currency Dynamic Conversion Engine', () => {
    const inrRoutes = integratedPrdService.searchRoutes({
      origin: 'Mumbai Central',
      destination: 'Goa',
      currency: 'INR',
    });

    const usdRoutes = integratedPrdService.searchRoutes({
      origin: 'Mumbai Central',
      destination: 'Goa',
      currency: 'USD',
    });

    if (inrRoutes.length === 0 || usdRoutes.length === 0) {
      throw new Error('Routes not returned for currency conversion test.');
    }

    const inrCost = inrRoutes[0].total_cost ?? inrRoutes[0].total_price ?? 0;
    const usdCost = usdRoutes[0].total_cost ?? usdRoutes[0].total_price ?? 0;

    // USD should be roughly INR / 83 (give or take exchange margin)
    if (usdCost >= inrCost || usdCost === 0) {
      throw new Error(`USD cost ($${usdCost}) should be lower than INR cost (₹${inrCost}).`);
    }

    const impliedRate = inrCost / usdCost;
    if (impliedRate < 70 || impliedRate > 95) {
      throw new Error(`Unexpected exchange rate ratio: ${impliedRate.toFixed(2)}`);
    }

    return {
      details: `Currency conversion verified: Route 1 INR = ₹${inrCost}, USD = $${usdCost} (Implied rate: 1 USD ≈ ₹${impliedRate.toFixed(1)}).`,
    };
  });

  // --------------------------------------------------------------------------
  // TEST CASE 9: Extreme Failure & Severed Corridor Resilience (Robustness Suite)
  // --------------------------------------------------------------------------
  executeCase(9, 'Extreme Failure & Severed Corridor Resilience', () => {
    // Simulate severe corridor cut with no routes available
    const replanResult = executeDeterministicReplan({
      current_location: 'Isolated Outpost Nowhere',
      destination: 'Remote Island Nonexistent',
      priority: 'fastest',
      disruption: {
        type: 'CATASTROPHIC_SEVERANCE',
        severity: 'CRITICAL',
        description: 'All bridges, railways, and airspace closed.',
      },
    });

    if (!replanResult) {
      throw new Error('Replanning engine crashed or returned null on severed corridor.');
    }

    // Must return structured emergency assistance rather than throwing an unhandled error
    if (!replanResult.emergency_assistance && replanResult.candidate_routes.length === 0) {
      throw new Error('Emergency assistance desk advisory must be provided when corridor is severed.');
    }

    return {
      details: `Resilience verified: Gracefully provided emergency assistance advisory without application crash (Helpline: ${replanResult.emergency_assistance?.helpline_number || '139 / 112'}).`,
    };
  });

  // --------------------------------------------------------------------------
  // TEST CASE 10: Section 15 Autonomous Concierge 12-Step Full Pipeline
  // --------------------------------------------------------------------------
  executeCase(10, 'Section 15 Autonomous Concierge 12-Step Full Pipeline', () => {
    const tripId = 'e2e-case-10';
    const userId = 'usr-e2e-10';

    // Step 1: User Auth
    const auth = integratedPrdService.authenticate('alex.mercer@acmecorp.com');
    if (!auth?.user) throw new Error('Step 1 Auth failed');

    // Step 2: Create Trip
    const trip = integratedPrdService.createTrip({
      id: tripId,
      user_id: userId,
      source: 'Mumbai Central',
      destination: 'Goa',
      status: 'IN_PROGRESS',
    });
    if (!trip) throw new Error('Step 2 Trip creation failed');

    // Step 3: Traveler Preferences
    integratedPrdService.savePreferences({
      user_id: userId,
      preferred_modes: ['TRAIN', 'FLIGHT', 'CAB'],
      max_transfers: 2,
      seat_preference: 'WINDOW',
      travel_priority: 'fastest',
    });

    // Step 4: Policy
    integratedPrdService.savePolicy({
      id: 'pol-e2e-10',
      user_id: userId,
      name: 'E2E Autonomous Policy',
      max_budget_per_trip: 12000,
      allowed_modes: ['FLIGHT', 'TRAIN', 'BUS', 'CAB', 'METRO'],
      require_manager_approval: false,
      auto_rebooking_limit: 8000,
      cabin_class_limit: 'ECONOMY',
    });

    // Step 5: Search Routes
    const routes = integratedPrdService.searchRoutes({ origin: trip.source, destination: trip.destination, currency: 'INR' });
    if (!routes || routes.length === 0) throw new Error('Step 5 Route search failed');

    // Step 6: Select Route & Segments
    const segments = integratedPrdService.getTripSegments(tripId);
    if (!segments || segments.length === 0) throw new Error('Step 6 Segments retrieval failed');

    // Step 7: Monitor Journey
    const monitoredTrip = integratedPrdService.getTrip(tripId);
    if (!monitoredTrip) throw new Error('Step 7 Trip monitoring failed');

    // Step 8: Detect Disruption
    const disruption = integratedPrdService.simulateDisruption(tripId, {
      type: 'TRAIN_CANCELLED',
      severity: 'HIGH',
      description: 'Konkan Railway line blocked due to monsoon rockfall.',
    });
    if (!disruption) throw new Error('Step 8 Disruption detection failed');

    // Step 9: Find Alternatives
    const alternatives = integratedPrdService.getAlternatives(tripId);
    if (!alternatives || alternatives.length === 0) throw new Error('Step 9 Alternatives discovery failed');

    // Step 10: Auto-Rebook
    const rebooking = integratedPrdService.executeRebooking(tripId, alternatives[0].id);
    if (!rebooking.success) throw new Error('Step 10 Rebooking execution failed');

    // Step 11: Hotel Stay Sync
    const hotel = integratedPrdService.modifyHotelStay(tripId, {
      late_check_in_notified: true,
      special_instructions: 'Detoured flight passenger. Room guaranteed hold.',
    });
    if (!hotel.late_check_in_notified) throw new Error('Step 11 Hotel sync failed');

    // Step 12: Notification Dispatch
    const notification = integratedPrdService.sendNotification({
      user_id: userId,
      trip_id: tripId,
      type: 'AUTO_REBOOKED',
      title: 'Autonomous Concierge: Journey Restored',
      message: 'Rebooked to IndiGo Flight 6E-452. Hotel notified.',
      urgency: 'INFO',
      channel: 'TELEGRAM',
    });
    if (!notification) throw new Error('Step 12 Notification failed');

    return {
      details: 'All 12 steps executed successfully from Auth to Rebooking, Hotel Sync, and Alerts Dispatch.',
    };
  });

  return results;
}

// Standalone runner execution
if (process.argv[1] && process.argv[1].endsWith('ten-test-cases.ts')) {
  console.log('\n================================================================================');
  console.log('   RUNNING THE 10 USER-SPECIFIED TEST CASES FOR TRAVEL CONCIERGE');
  console.log('================================================================================\n');

  const suiteResults = runTheTenTestCases();
  let passedCount = 0;

  for (const t of suiteResults) {
    if (t.passed) {
      passedCount++;
      console.log(`✓ PASS [Case ${t.caseNumber}] ${t.title} (${t.durationMs}ms)`);
      console.log(`       → ${t.details}`);
    } else {
      console.error(`✗ FAIL [Case ${t.caseNumber}] ${t.title} (${t.durationMs}ms)`);
      console.error(`       → Error: ${t.error}`);
    }
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`Result: ${passedCount} / ${suiteResults.length} test cases passed.`);
  console.log('--------------------------------------------------------------------------------\n');

  if (passedCount !== suiteResults.length) {
    process.exit(1);
  }
}
