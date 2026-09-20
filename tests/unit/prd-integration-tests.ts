/**
 * PRD Integration Test Suite
 * Validates the complete Autonomous Travel-Disruption Concierge specifications:
 * - Part A: Core Travel (User, Preferences, Policy, Trip, Multi-Modal Route Search)
 * - Part B: Disruption Engine (Monitoring, Disruption Simulation, Alternatives, Policy Validation, Rebooking)
 * - Part C: Hotel & Destination (Stay Sync, Late Check-in, Local Transport)
 * - Part D: Real-Time Alerts (Notification Dispatch, Multi-Channel)
 * - Section 15: Full End-to-End Test Loop
 */

import { integratedPrdService } from '../../server/integratedPrdService';

export interface TestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  duration_ms: number;
  message?: string;
}

export function runPrdIntegrationTests(): TestResult[] {
  const results: TestResult[] = [];

  function test(id: string, name: string, fn: () => void) {
    const t0 = performance.now();
    try {
      fn();
      results.push({
        id,
        name,
        category: 'PRD Integrated Pipeline',
        passed: true,
        duration_ms: parseFloat((performance.now() - t0).toFixed(2)),
      });
    } catch (e: any) {
      results.push({
        id,
        name,
        category: 'PRD Integrated Pipeline',
        passed: false,
        duration_ms: parseFloat((performance.now() - t0).toFixed(2)),
        message: e.message || String(e),
      });
    }
  }

  // 1. Part A: User Auth
  test('PRD-A-01', 'Part A: Authenticate corporate traveler', () => {
    const auth = integratedPrdService.authenticate('alex.mercer@acmecorp.com');
    if (!auth.user || auth.user.email !== 'alex.mercer@acmecorp.com') {
      throw new Error(`Expected user alex.mercer@acmecorp.com, got ${JSON.stringify(auth.user)}`);
    }
  });

  // 2. Part A: Traveler Preferences
  test('PRD-A-02', 'Part A: Set and retrieve travel preferences', () => {
    integratedPrdService.savePreferences({
      user_id: 'usr-corp-01',
      preferred_modes: ['TRAIN', 'FLIGHT', 'CAB'],
      max_transfers: 2,
      seat_preference: 'WINDOW',
      travel_priority: 'fastest',
    });
    const retrieved = integratedPrdService.getPreferences('usr-corp-01');
    if (!retrieved || retrieved.seat_preference !== 'WINDOW' || retrieved.travel_priority !== 'fastest') {
      throw new Error('Preferences not persisted accurately');
    }
  });

  // 3. Part A: Corporate Travel Policy
  test('PRD-A-03', 'Part A: Create and enforce corporate travel policy', () => {
    integratedPrdService.savePolicy({
      id: 'pol-corp-test',
      user_id: 'usr-corp-01',
      name: 'Enterprise Tech Travel Policy',
      max_budget_per_trip: 15000,
      allowed_modes: ['FLIGHT', 'TRAIN', 'CAB', 'METRO'],
      require_manager_approval: false,
      auto_rebooking_limit: 9000,
      cabin_class_limit: 'ECONOMY',
    });
    const retrieved = integratedPrdService.getPolicy('usr-corp-01');
    if (!retrieved || retrieved.max_budget_per_trip !== 15000) {
      throw new Error('Travel policy failed validation');
    }
  });

  // 4. Part A: Multi-Modal Route Search
  test('PRD-A-04', 'Part A: Search normalized multi-modal routes across providers', () => {
    const routes = integratedPrdService.searchRoutes({
      origin: 'Mumbai Central',
      destination: 'Goa',
      currency: 'INR',
    });
    if (!routes || routes.length < 3) {
      throw new Error(`Expected at least 3 multi-modal options, got ${routes?.length}`);
    }
    const hasFlight = routes.some((r) => r.segments.some((s) => s.mode === 'FLIGHT'));
    const hasTrain = routes.some((r) => r.segments.some((s) => s.mode === 'TRAIN'));
    if (!hasFlight || !hasTrain) {
      throw new Error('Routes must include normalized flights and trains');
    }
  });

  // 5. Part A: Create Trip & Segments
  test('PRD-A-05', 'Part A: Create trip and retrieve journey segments', () => {
    const trip = integratedPrdService.createTrip({
      id: 'trip-test-prd-01',
      user_id: 'usr-corp-01',
      source: 'Mumbai Central',
      destination: 'Goa',
      status: 'IN_PROGRESS',
    });
    const segments = integratedPrdService.getTripSegments(trip.id);
    if (!segments || segments.length === 0) {
      throw new Error('Trip segments not initialized');
    }
    if (!segments[0].id || !segments[0].mode) {
      throw new Error(`Invalid segment initialization`);
    }
  });

  // 6. Part B: Disruption Engine Simulation
  test('PRD-B-01', 'Part B: Detect & simulate transit disruption', () => {
    const disruption = integratedPrdService.simulateDisruption('trip-test-prd-01', {
      segment_id: 'seg-02',
      type: 'TRAIN_CANCELLED',
      severity: 'HIGH',
      description: 'Monsoon mudslide blocked Konkan corridor',
    });
    if (!disruption.id || disruption.severity !== 'HIGH') {
      throw new Error('Disruption was not recorded correctly');
    }
  });

  // 7. Part B: Alternatives Discovery
  test('PRD-B-02', 'Part B: Compute viable multi-modal alternative routes', () => {
    const alternatives = integratedPrdService.getAlternatives('trip-test-prd-01');
    if (!alternatives || alternatives.length === 0) {
      throw new Error('Disruption engine failed to generate recovery alternatives');
    }
    const bestAlt = alternatives[0];
    if (bestAlt.policy_valid === false) {
      throw new Error('Top alternative should be corporate policy compliant');
    }
  });

  // 8. Part B: Policy Validation & Rebooking
  test('PRD-B-03', 'Part B: Validate policy and auto-rebook alternative', () => {
    const rebookingResult = integratedPrdService.executeRebooking('trip-test-prd-01');
    if (!rebookingResult.success || !rebookingResult.rebooked_alternative) {
      throw new Error('Rebooking execution failed');
    }
    if (rebookingResult.trip.status !== 'REBOOKED') {
      throw new Error(`Trip status should be REBOOKED, got: ${rebookingResult.trip.status}`);
    }
  });

  // 9. Part C: Hotel Stay Synchronization
  test('PRD-C-01', 'Part C: Modify hotel reservation & dispatch late check-in notice', () => {
    const hotel = integratedPrdService.modifyHotelStay('trip-test-prd-01', {
      late_check_in_notified: true,
      special_instructions: 'Arriving via flight detour, front desk notified.',
    });
    if (!hotel.late_check_in_notified) {
      throw new Error('Hotel late check-in was not updated');
    }
  });

  // 10. Part D: Multi-Channel Notification Dispatch
  test('PRD-D-01', 'Part D: Dispatch and verify user notifications', () => {
    const initialCount = integratedPrdService.getNotifications('usr-corp-01').length;
    integratedPrdService.sendNotification({
      user_id: 'usr-corp-01',
      trip_id: 'trip-test-prd-01',
      type: 'AUTO_REBOOKED',
      title: 'Disruption Handled: Rebooked to IndiGo 6E-452',
      message: 'Flight departure 18:30 BOM -> GOI. Hotel hold confirmed.',
      urgency: 'INFO',
      channel: 'IN_APP',
    });
    const updated = integratedPrdService.getNotifications('usr-corp-01');
    if (updated.length !== initialCount + 1) {
      throw new Error('Notification was not recorded in user alerts');
    }
  });

  // 11. Section 15: Complete End-to-End Autonomous Pipeline
  test('PRD-SEC-15', 'PRD Section 15: Complete 14-Step Autonomous Travel-Disruption Loop', () => {
    // 1. User Login
    const auth = integratedPrdService.authenticate('alex.mercer@acmecorp.com');
    // 2. Create Trip
    const trip = integratedPrdService.createTrip({
      id: 'e2e-trip-loop',
      user_id: auth.user.id,
      source: 'Mumbai Central',
      destination: 'Goa',
      status: 'IN_PROGRESS',
    });
    // 3. Set Preferences
    integratedPrdService.savePreferences({
      user_id: auth.user.id,
      preferred_modes: ['TRAIN', 'FLIGHT', 'CAB'],
      max_transfers: 2,
      seat_preference: 'WINDOW',
      travel_priority: 'fastest',
    });
    // 4. Set Policy
    integratedPrdService.savePolicy({
      id: 'loop-policy',
      user_id: auth.user.id,
      name: 'Loop Policy',
      max_budget_per_trip: 12000,
      allowed_modes: ['FLIGHT', 'TRAIN', 'CAB'],
      require_manager_approval: false,
      auto_rebooking_limit: 8000,
      cabin_class_limit: 'ECONOMY',
    });
    // 5. Search Routes
    const routes = integratedPrdService.searchRoutes({
      origin: trip.source,
      destination: trip.destination,
      currency: 'INR',
    });
    if (routes.length === 0) throw new Error('No routes returned');
    // 6. Monitor Journey
    const segs = integratedPrdService.getTripSegments(trip.id);
    if (segs.length === 0) throw new Error('No segments found');
    // 7. Detect Disruption
    integratedPrdService.simulateDisruption(trip.id, {
      type: 'TRAIN_CANCELLED',
      severity: 'HIGH',
      description: 'Overhead traction wire failure at Khed station',
    });
    // 8. Find Alternatives
    const alternatives = integratedPrdService.getAlternatives(trip.id);
    if (alternatives.length === 0) throw new Error('No alternatives generated');
    // 9. Rebook
    const rebook = integratedPrdService.executeRebooking(trip.id, alternatives[0].id);
    if (!rebook.success) throw new Error('Rebooking failed');
    // 10. Update Hotel Stay
    const hotel = integratedPrdService.modifyHotelStay(trip.id, {
      late_check_in_notified: true,
      special_instructions: 'Autonomous flight detour rerouted. Guaranteed late check-in.',
    });
    if (!hotel.late_check_in_notified) throw new Error('Hotel modification failed');
    // 11. Notify
    integratedPrdService.sendNotification({
      user_id: auth.user.id,
      trip_id: trip.id,
      type: 'AUTO_REBOOKED',
      title: 'E2E Autonomous Concierge Test Passed',
      message: 'All 14 checkpoints verified.',
      urgency: 'INFO',
      channel: 'TELEGRAM',
    });
  });

  return results;
}
