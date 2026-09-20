import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { recommendationService, CandidateRoute } from "./server/recommendationService.ts";
import { executeDeterministicReplan } from "./server/replanOrchestratorBridge.ts";
import { executeAllTests } from "./tests/run-all-tests.ts";
import { runTheTenTestCases } from "./tests/unit/ten-test-cases.ts";
import { integratedPrdService } from "./server/integratedPrdService.ts";

// Pre-packaged realistic disruption scenarios for instant testing and demonstration
const DEFAULT_SCENARIOS = [
  {
    id: "mumbai-goa-train-cancelled",
    name: "Mumbai Central → Goa (Train Cancelled)",
    current_location: "Mumbai Central",
    destination: "Goa",
    disruption: "Train cancelled",
    default_priority: "fastest" as const,
    currency_symbol: "₹",
    candidate_routes: [
      {
        route_id: "route-flight-express",
        title: "Air Express Itinerary",
        summary: "Taxi → Flight → Taxi",
        modes_used: ["Taxi", "Flight", "Taxi"],
        metrics: {
          total_travel_time_min: 320, // 5h 20m
          waiting_time_min: 35,
          transfer_time_min: 25,
          total_cost: 5200,
          number_of_transfers: 2,
          reliability_score: 95,
          convenience_score: 88,
        },
        badges: ["Fastest", "High Reliability"],
      },
      {
        route_id: "route-overland-economy",
        title: "Overland Multi-Transit Itinerary",
        summary: "Taxi → Train → Bus",
        modes_used: ["Taxi", "Train", "Bus"],
        metrics: {
          total_travel_time_min: 630, // 10h 30m
          waiting_time_min: 55, // triggers long wait warning (>45m)
          transfer_time_min: 35,
          total_cost: 1400,
          number_of_transfers: 2, // triggers transfer warning (>=2)
          reliability_score: 80,
          convenience_score: 65,
        },
        badges: ["Cheapest", "Economy"],
      },
      {
        route_id: "route-sleeper-bus-direct",
        title: "Direct AC Sleeper Coach",
        summary: "Taxi → AC Sleeper Bus",
        modes_used: ["Taxi", "Bus"],
        metrics: {
          total_travel_time_min: 780, // 13h
          waiting_time_min: 20,
          transfer_time_min: 15,
          total_cost: 2100,
          number_of_transfers: 1,
          reliability_score: 86,
          convenience_score: 82,
        },
        badges: ["Single Transfer", "Direct"],
      },
    ] as CandidateRoute[],
  },
  {
    id: "delhi-jaipur-highway-blocked",
    name: "New Delhi → Jaipur (Highway Landslide)",
    current_location: "New Delhi Railway Station",
    destination: "Jaipur City Centre",
    disruption: "National highway blocked due to landslide",
    default_priority: "balanced" as const,
    currency_symbol: "₹",
    candidate_routes: [
      {
        route_id: "route-vande-bharat",
        title: "Vande Bharat Superfast Express",
        summary: "Metro → Superfast Train → Auto",
        modes_used: ["Metro", "Train", "Taxi"],
        metrics: {
          total_travel_time_min: 250, // 4h 10m
          waiting_time_min: 15,
          transfer_time_min: 15,
          total_cost: 1350,
          number_of_transfers: 2,
          reliability_score: 96,
          convenience_score: 92,
        },
        badges: ["Recommended", "Fast & Reliable"],
      },
      {
        route_id: "route-state-bus-reroute",
        title: "State Transport Detour Bus",
        summary: "Bus → Detour Route Bus",
        modes_used: ["Bus", "Bus"],
        metrics: {
          total_travel_time_min: 440, // 7h 20m
          waiting_time_min: 50,
          transfer_time_min: 20,
          total_cost: 450,
          number_of_transfers: 1,
          reliability_score: 72,
          convenience_score: 60,
        },
        badges: ["Cheapest"],
      },
    ] as CandidateRoute[],
  },
  {
    id: "bengaluru-chennai-flight-grounded",
    name: "Bengaluru → Chennai (Heavy Rain / Flights Suspended)",
    current_location: "Bengaluru Central (Majestic)",
    destination: "Chennai Central",
    disruption: "Flight operations temporarily suspended due to cyclone",
    default_priority: "most_reliable" as const,
    currency_symbol: "₹",
    candidate_routes: [
      {
        route_id: "route-shatabdi-express",
        title: "Shatabdi Express Rail Link",
        summary: "Walk → Express Train → Taxi",
        modes_used: ["Walk", "Train", "Taxi"],
        metrics: {
          total_travel_time_min: 310, // 5h 10m
          waiting_time_min: 25,
          transfer_time_min: 15,
          total_cost: 1150,
          number_of_transfers: 1,
          reliability_score: 98,
          convenience_score: 94,
        },
        badges: ["Most Reliable", "Weather Resilient"],
      },
      {
        route_id: "route-intercity-cab",
        title: "Private Intercity Cab",
        summary: "Cab (Door to Door)",
        modes_used: ["Taxi"],
        metrics: {
          total_travel_time_min: 380, // 6h 20m
          waiting_time_min: 10,
          transfer_time_min: 0,
          total_cost: 6500,
          number_of_transfers: 0,
          reliability_score: 84,
          convenience_score: 96,
        },
        badges: ["Zero Transfers", "Door to Door"],
      },
    ] as CandidateRoute[],
  },
  {
    id: "bhavnagar-kerala-stuck-in-transit",
    name: "Bhavnagar → Kerala (Stuck In-Transit at Surat / Mumbai)",
    current_location: "Surat Junction / Mumbai Central (Stuck In-Transit)",
    destination: "Kochi, Kerala",
    disruption: "Connecting express train to Kerala delayed by 7 hours / cancelled due to track obstruction in Konkan route",
    default_priority: "fastest" as const,
    currency_symbol: "₹",
    candidate_routes: [
      {
        route_id: "route-bvc-krl-air-bypass",
        title: "Air Express Direct Bypass: BOM/ST → Cochin (COK)",
        summary: "Prepaid Cab → Flight (IndiGo/AI) → Resort Transfer",
        modes_used: ["Taxi", "Flight", "Taxi"],
        metrics: {
          total_travel_time_min: 240, // 4 hours
          waiting_time_min: 30,
          transfer_time_min: 25,
          total_cost: 5400,
          number_of_transfers: 2,
          reliability_score: 96,
          convenience_score: 92,
        },
        badges: ["Fastest Bypass", "In-Policy Auto-Rebook"],
      },
      {
        route_id: "route-bvc-krl-sleeper-rail",
        title: "Karnataka-Kerala Coastal Superfast Express",
        summary: "Station Transfer → AC 2-Tier Sleeper",
        modes_used: ["Taxi", "Train"],
        metrics: {
          total_travel_time_min: 880, // 14h 40m
          waiting_time_min: 35,
          transfer_time_min: 20,
          total_cost: 2150,
          number_of_transfers: 1,
          reliability_score: 88,
          convenience_score: 80,
        },
        badges: ["Cheapest Overnight", "Overland Corridor"],
      },
      {
        route_id: "route-bvc-krl-volvo-multimodal",
        title: "Intercity Multi-Transit Sleeper Coach",
        summary: "Feeder Cab → Luxury AC Multi-Axle Volvo Sleeper",
        modes_used: ["Taxi", "Bus", "Taxi"],
        metrics: {
          total_travel_time_min: 960, // 16h
          waiting_time_min: 20,
          transfer_time_min: 15,
          total_cost: 2800,
          number_of_transfers: 2,
          reliability_score: 84,
          convenience_score: 78,
        },
        badges: ["Guaranteed Departure"],
      },
    ] as CandidateRoute[],
  },
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "Autonomous Travel-Disruption Concierge Recommendation Service",
      timestamp: new Date().toISOString(),
      llm_provider: process.env.LLM_PROVIDER || "gemini",
      gemini_model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      has_gemini_key: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
    });
  });

  // Scenarios endpoint
  app.get("/api/scenarios", (req, res) => {
    res.json(DEFAULT_SCENARIOS);
  });

  // In-Memory resilient persistence store (Handles Issue 9: Database unavailable)
  const IN_MEMORY_JOURNEY_STORE = new Map<string, any>();

  // Storage resilience endpoints
  app.post("/api/storage/persist", (req, res) => {
    try {
      const { key, data } = req.body;
      if (!key) return res.status(400).json({ error: "Storage key required" });
      IN_MEMORY_JOURNEY_STORE.set(key, { ...data, updatedAt: new Date().toISOString() });
      res.json({
        success: true,
        storage_mode: "in_memory_resilient_cache",
        key,
        records_count: IN_MEMORY_JOURNEY_STORE.size,
      });
    } catch (err: any) {
      res.json({
        success: false,
        storage_mode: "in_memory_resilient_cache",
        message: "Database write handled gracefully by cache fallback",
      });
    }
  });

  app.get("/api/storage/fetch/:key", (req, res) => {
    const data = IN_MEMORY_JOURNEY_STORE.get(req.params.key);
    res.json({
      found: Boolean(data),
      data: data || null,
      storage_mode: "in_memory_resilient_cache",
    });
  });

  // Robustness subsystem status endpoint
  app.get("/api/health/robustness", (req, res) => {
    res.json({
      status: "healthy",
      resilience_guarantees: {
        "1_no_transport_options": "Structured fallback with emergency advisory & lounge guidance",
        "2_no_route_available": "Corridor disruption detection & nearest reachable hub suggestions",
        "3_api_timeout": "Strict abort controllers & seamless deterministic pipeline fallback",
        "4_invalid_gps_coordinates": "Coordinate sanitization to recognized regional transit hubs",
        "5_destination_unavailable": "Destination validator with auto-suggested alternatives",
        "6_all_alternative_services_cancelled": "Severe weather/strike advisory with automated refund guidance",
        "7_llm_unavailable": "Zero-latency multi-criteria deterministic scoring fallback",
        "8_map_api_unavailable": "Interactive Vector Schematic Radar fallback with step flow diagram",
        "9_database_unavailable": "In-memory resilient fallback repository with local storage sync",
        "10_invalid_disruption": "Safe disruption sanitizer preventing null/corrupt crashes",
        "11_invalid_departure_times": "Departure & arrival time sanitizer preventing NaN durations",
        "12_connection_impossible": "Physics/feasibility validator enforcing minimum transfer buffers",
      },
      uptime_seconds: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Automated Test Suite Execution Endpoint
  app.all("/api/tests/run", (req, res) => {
    try {
      const summary = executeAllTests();
      res.json({
        success: summary.failed_tests === 0,
        ...summary,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to execute test suite",
      });
    }
  });

  // Dedicated endpoint for the 10 User-Specified Test Cases
  app.all("/api/tests/ten-cases", (req, res) => {
    try {
      const results = runTheTenTestCases();
      const passed = results.filter((r) => r.passed).length;
      const failed = results.filter((r) => !r.passed).length;
      res.json({
        success: failed === 0,
        total_tests: results.length,
        passed_tests: passed,
        failed_tests: failed,
        test_cases: results,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to execute 10 test cases",
      });
    }
  });

  // Multimodal Replan handler (POST /api/v1/replan & POST /api/replan)
  const replanHandler = async (req: express.Request, res: express.Response) => {
    const payload = req.body || {};
    try {
      // Check for simulated API timeout (Handles Issue 3: API timeout)
      if (payload.simulate_timeout || payload?.disruption?.type === "SIMULATE_TIMEOUT") {
        // Simulate an external API timeout then smoothly return deterministic fallback
        const fallbackResult = executeDeterministicReplan(payload);
        return res.json({
          ...fallbackResult,
          fallback_applied: true,
          fallback_reason: "API_TIMEOUT",
          warnings: [
            ...(fallbackResult.warnings || []),
            {
              code: "API_TIMEOUT_RECOVERED",
              message: "External routing microservice timed out (exceeded 1500ms threshold). Automatically served high-speed deterministic fallback.",
              resolution: "High-speed deterministic routing engine active.",
            },
          ],
        });
      }

      const pythonBackendUrl = process.env.BACKEND_API_URL;

      // Attempt proxying to live Python FastAPI backend if configured
      if (pythonBackendUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);

          const backendRes = await fetch(`${pythonBackendUrl}/api/v1/replan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (backendRes.ok) {
            const backendData = await backendRes.json();
            return res.json(backendData);
          }
        } catch (proxyErr) {
          // Python backend is not active or timed out; execute deterministic pipeline bridge
        }
      }

      // Execute deterministic replan orchestrator bridge
      const replanResult = executeDeterministicReplan(payload);
      return res.json(replanResult);
    } catch (err: any) {
      console.error("Error in replan pipeline, recovering via safe fallback:", err);
      try {
        const safeRecovery = executeDeterministicReplan(payload);
        return res.json({
          ...safeRecovery,
          status: safeRecovery.status || "API_FALLBACK_ACTIVE",
          fallback_applied: true,
          fallback_reason: err.message || "Pipeline error recovered",
          warnings: [
            ...(safeRecovery.warnings || []),
            {
              code: "SERVER_PIPELINE_RECOVERED",
              message: "Replanning pipeline recovered automatically from runtime exception.",
            },
          ],
        });
      } catch (critErr: any) {
        res.status(200).json({
          status: "ERROR",
          error_code: "INTERNAL_PIPELINE_FAULT",
          message: "Could not evaluate corridor alternatives. Safe passenger contingency protocol activated.",
          emergency_assistance: {
            title: "Emergency Traveller Welfare Desk",
            advisory: "Transit system exception captured safely. Ground support desks are operational.",
            helpline_number: "139 / 112",
            actionable_steps: ["Please consult ground station staff or reload using deterministic mode."],
          },
        });
      }
    }
  };

  app.post("/api/v1/replan", replanHandler);
  app.post("/api/replan", replanHandler);

  // Recommendation evaluate handler
  const evaluateHandler = async (req: express.Request, res: express.Response) => {
    try {
      const payload = req.body || {};
      const result = await recommendationService.evaluate(payload);
      res.json(result);
    } catch (err: any) {
      console.error("Error in recommendation evaluate, falling back gracefully:", err);
      res.json({
        recommended_route_id: req.body?.candidate_routes?.[0]?.route_id || "fallback-route",
        headline: "Recommendation Fallback Active",
        traveller_message: "Selected primary available transit alternative. Operating in zero-latency deterministic mode.",
        reasoning: "Evaluated using robust deterministic rule engine due to service recovery.",
        trade_off_analysis: {
          key_trade_off: "Standard alternative evaluation applied.",
          cost_comparison: "Baseline fare",
          time_comparison: "Scheduled duration",
        },
        warnings: ["Service operating in high-resilience fallback mode."],
        actionable_steps: ["Proceed with verified transit link."],
        contingency_advice: "Autonomous monitoring remains active.",
        provider_used: "deterministic_fallback",
      });
    }
  };

  // Register both standard endpoint paths
  app.post("/api/recommendations/evaluate", evaluateHandler);
  app.post("/api/v1/recommendations/evaluate", evaluateHandler);

  // ============================================================================
  // UNIFIED PRD REST API CONTRACT ENDPOINTS (PRD Section 5)
  // Mounts both /api/* and root /* to guarantee exact contract compatibility
  // ============================================================================

  // 1. Users & Auth
  const createUserHandler = (req: express.Request, res: express.Response) => {
    const user = integratedPrdService.createUser(req.body);
    res.status(201).json({ success: true, user });
  };
  app.post("/users", createUserHandler);
  app.post("/api/users", createUserHandler);
  app.post("/api/v1/users", createUserHandler);

  const loginHandler = (req: express.Request, res: express.Response) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Email is required" });
    const auth = integratedPrdService.authenticate(email);
    res.json({ success: true, ...auth });
  };
  app.post("/auth/login", loginHandler);
  app.post("/api/auth/login", loginHandler);
  app.post("/api/v1/auth/login", loginHandler);

  // 2. Traveler Preferences
  const getPreferencesHandler = (req: express.Request, res: express.Response) => {
    const userId = req.params.userId || "usr-corp-01";
    const pref = integratedPrdService.getPreferences(userId);
    res.json({ success: true, preferences: pref });
  };
  app.get("/preferences/:userId", getPreferencesHandler);
  app.get("/api/preferences/:userId", getPreferencesHandler);
  app.get("/api/v1/preferences/:userId", getPreferencesHandler);

  const savePreferencesHandler = (req: express.Request, res: express.Response) => {
    const pref = integratedPrdService.savePreferences(req.body);
    res.json({ success: true, preferences: pref });
  };
  app.post("/preferences", savePreferencesHandler);
  app.post("/api/preferences", savePreferencesHandler);
  app.post("/api/v1/preferences", savePreferencesHandler);

  // 3. Travel Policies
  const getPolicyHandler = (req: express.Request, res: express.Response) => {
    const userId = req.params.userId || "usr-corp-01";
    const policy = integratedPrdService.getPolicy(userId);
    res.json({ success: true, policy });
  };
  app.get("/policies/:userId", getPolicyHandler);
  app.get("/api/policies/:userId", getPolicyHandler);
  app.get("/api/v1/policies/:userId", getPolicyHandler);

  const savePolicyHandler = (req: express.Request, res: express.Response) => {
    const policy = integratedPrdService.savePolicy(req.body);
    res.json({ success: true, policy });
  };
  app.post("/policies", savePolicyHandler);
  app.post("/api/policies", savePolicyHandler);
  app.post("/api/v1/policies", savePolicyHandler);

  // 4. Trips & Journey Segments
  const createTripHandler = (req: express.Request, res: express.Response) => {
    const trip = integratedPrdService.createTrip(req.body);
    res.status(201).json({ success: true, trip });
  };
  app.post("/trips", createTripHandler);
  app.post("/api/trips", createTripHandler);
  app.post("/api/v1/trips", createTripHandler);

  const listTripsHandler = (req: express.Request, res: express.Response) => {
    const userId = (req.query.user_id as string) || undefined;
    const trips = integratedPrdService.listTrips(userId);
    res.json({ success: true, count: trips.length, trips });
  };
  app.get("/trips", listTripsHandler);
  app.get("/api/trips", listTripsHandler);
  app.get("/api/v1/trips", listTripsHandler);

  const getTripHandler = (req: express.Request, res: express.Response) => {
    const trip = integratedPrdService.getTrip(req.params.tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    res.json({ success: true, trip });
  };
  app.get("/trips/:tripId", getTripHandler);
  app.get("/api/trips/:tripId", getTripHandler);
  app.get("/api/v1/trips/:tripId", getTripHandler);

  const getTripSegmentsHandler = (req: express.Request, res: express.Response) => {
    const segments = integratedPrdService.getTripSegments(req.params.tripId);
    res.json({ success: true, trip_id: req.params.tripId, segments });
  };
  app.get("/trips/:tripId/segments", getTripSegmentsHandler);
  app.get("/api/trips/:tripId/segments", getTripSegmentsHandler);
  app.get("/api/v1/trips/:tripId/segments", getTripSegmentsHandler);

  // 5. Multi-Modal Route Search
  const routeSearchHandler = (req: express.Request, res: express.Response) => {
    const origin = (req.query.origin as string) || "Mumbai Central";
    const destination = (req.query.destination as string) || "Goa";
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const currency = (req.query.currency as string) || "INR";

    const routes = integratedPrdService.searchRoutes({ origin, destination, date, currency });
    res.json({
      success: true,
      origin,
      destination,
      count: routes.length,
      routes,
      providers: ["Amadeus (Flights)", "Qrail (Railways)", "Google Routes (Cabs)"],
    });
  };
  app.get("/routes/search", routeSearchHandler);
  app.get("/api/routes/search", routeSearchHandler);
  app.get("/api/v1/routes/search", routeSearchHandler);

  // 6. Disruptions & Simulation
  const getDisruptionsHandler = (req: express.Request, res: express.Response) => {
    const disruptions = integratedPrdService.getDisruptions(req.params.tripId);
    res.json({ success: true, trip_id: req.params.tripId, disruptions });
  };
  app.get("/disruptions/:tripId", getDisruptionsHandler);
  app.get("/api/disruptions/:tripId", getDisruptionsHandler);

  const simulateDisruptionHandler = (req: express.Request, res: express.Response) => {
    const { trip_id = "trip-mb-goa-001", ...rest } = req.body || {};
    const disruption = integratedPrdService.simulateDisruption(trip_id, rest);
    res.json({ success: true, disruption });
  };
  app.post("/disruptions/simulate", simulateDisruptionHandler);
  app.post("/api/disruptions/simulate", simulateDisruptionHandler);

  // 7. Alternatives & Rebooking Decision
  const getAlternativesHandler = (req: express.Request, res: express.Response) => {
    const alternatives = integratedPrdService.getAlternatives(req.params.tripId);
    res.json({ success: true, trip_id: req.params.tripId, alternatives });
  };
  app.get("/alternatives/:tripId", getAlternativesHandler);
  app.get("/api/alternatives/:tripId", getAlternativesHandler);

  const rebookingHandler = (req: express.Request, res: express.Response) => {
    try {
      const { alternative_id } = req.body || {};
      const result = integratedPrdService.executeRebooking(req.params.tripId, alternative_id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };
  app.post("/rebooking/:tripId", rebookingHandler);
  app.post("/api/rebooking/:tripId", rebookingHandler);

  // 8. Part C: Hotel & Destination Intelligence
  const getHotelHandler = (req: express.Request, res: express.Response) => {
    const queryTarget =
      req.params.tripId ||
      (req.query.destination as string) ||
      (req.query.trip_id as string) ||
      "trip-mb-goa-001";
    const hotel = integratedPrdService.getHotelStay(queryTarget);
    if (!hotel) return res.status(404).json({ error: "No hotel linked to trip" });
    res.json({ success: true, trip_id: queryTarget, hotel });
  };
  app.get("/hotels", getHotelHandler);
  app.get("/api/hotels", getHotelHandler);
  app.get("/hotels/:tripId", getHotelHandler);
  app.get("/api/hotels/:tripId", getHotelHandler);

  const modifyHotelHandler = (req: express.Request, res: express.Response) => {
    const tripId = req.params.tripId || req.body?.trip_id || "trip-mb-goa-001";
    try {
      const updated = integratedPrdService.modifyHotelStay(tripId, req.body || {});
      res.json({ success: true, hotel: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };
  app.post("/hotels/:tripId/modify", modifyHotelHandler);
  app.post("/api/hotels/:tripId/modify", modifyHotelHandler);
  app.post("/hotels/modify", modifyHotelHandler);
  app.post("/api/hotels/modify", modifyHotelHandler);

  // 9. Part D: Notifications & Real-Time Event Simulation
  const getNotificationsHandler = (req: express.Request, res: express.Response) => {
    const userId = req.params.userId || "usr-corp-01";
    const notifications = integratedPrdService.getNotifications(userId);
    res.json({ success: true, user_id: userId, count: notifications.length, notifications });
  };
  app.get("/notifications/:userId", getNotificationsHandler);
  app.get("/api/notifications/:userId", getNotificationsHandler);

  const sendNotificationHandler = (req: express.Request, res: express.Response) => {
    const notif = integratedPrdService.sendNotification(req.body || {});
    res.status(201).json({ success: true, notification: notif });
  };
  app.post("/notifications/send", sendNotificationHandler);
  app.post("/api/notifications/send", sendNotificationHandler);

  const readNotificationHandler = (req: express.Request, res: express.Response) => {
    const { userId, notifId } = req.params;
    const ok = integratedPrdService.markNotificationAsRead(userId, notifId);
    res.json({ success: ok });
  };
  app.post("/notifications/:userId/read/:notifId", readNotificationHandler);
  app.post("/api/notifications/:userId/read/:notifId", readNotificationHandler);

  // 10. Real-Time End-to-End In-Transit Event Simulation
  app.post("/api/realtime/simulate-event", (req, res) => {
    const tripId = req.body?.trip_id || "trip-mb-goa-001";
    // Trigger Disruption
    const disruption = integratedPrdService.simulateDisruption(tripId, {
      type: req.body?.type || "TRAIN_CANCELLED",
      description: req.body?.description || "High-speed rail derailment warning: Track section closed.",
      severity: "CRITICAL",
    });
    // Retrieve Alternatives
    const alternatives = integratedPrdService.getAlternatives(tripId);
    // Retrieve Updated Hotel Stay
    const hotel = integratedPrdService.getHotelStay(tripId);
    // Retrieve User Notifications
    const notifications = integratedPrdService.getNotifications("usr-corp-01");

    res.json({
      success: true,
      event: "DISRUPTION_DETECTED_AND_RESOLVED",
      disruption,
      alternatives_count: alternatives.length,
      top_alternative: alternatives[0],
      hotel_stay_status: hotel?.status,
      latest_notification: notifications[0],
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Autonomous Travel Concierge server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
