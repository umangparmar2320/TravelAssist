# Part A Analysis & Architectural Foundation (PERSON A)

## 1. Features Owned by Part A
- **Multi-Modal Route Engine Foundation**: Calculation of routes across multiple transport modes (walking, metro, bus, driving).
- **Segmented Journey Breakdown**: Splitting end-to-end trips into sequential legs with start/end waypoints, transit modes, distance, duration, and instructions.
- **Trip Estimation Models**: Standardized calculation of travel time (ETA), estimated fares/costs, and carbon emissions footprint (kg CO2).
- **Location & Waypoint Management**: Registration, storage, and spatial querying of landmarks, stations, and transit hubs.
- **Provider Abstraction Framework**: Clean provider interface (`BaseRouteProvider`) separating business logic from third-party travel APIs.
- **Health & Traffic Hooks**: Monitoring route provider latency and tracking real-time delay minutes per segment.

## 2. Database Tables Owned by Part A
- **`route_plans`**: Master record for planned journeys (id, origin/destination coordinates and names, status, travel mode, preference, total distance, duration, cost, carbon footprint, timestamps).
- **`route_segments`**: Sequential hops belonging to a route plan (id, route_id FK, sequence order, start/end locations, mode, provider name, distance, duration, delay minutes, instructions).
- **`locations`**: Geospatial directory of stations, airports, transit hubs, and points of interest.
- **`provider_health_records`**: Operational telemetry of routing engines (latency, status, endpoint, last check).

## 3. APIs Owned by Part A
- `POST /api/v1/routes/plan` - Calculates and persists a new multi-modal route plan.
- `GET /api/v1/routes` - Paginated list of computed journeys.
- `GET /api/v1/routes/{route_id}` - Detailed route plan including all sub-segments and transit legs.
- `GET /api/v1/routes/providers/status` - Health status and telemetry of routing engines.
- `POST /api/v1/routes/locations` - Registers transit stops or landmarks.
- `GET /api/v1/routes/locations/search` - Searches registered stations/landmarks by name or city.
- `GET /api/v1/routes/events/catalog` - Catalog of lifecycle events produced by Part A.
- `GET /api/v1/health` - System health, database connectivity, and environment metadata.

## 4. APIs Other Parts Need from Part A
- **For Part B (Ticketing & Booking / Payment)**:
  - Needs `GET /api/v1/routes/{route_id}` to retrieve segment breakdown, provider metadata, and estimated fare for issuing tickets.
  - Needs segment details (`RouteSegment`) to know which transit agency or operator operates each leg.
- **For Part C (Real-Time Tracking & User Navigation)**:
  - Needs `GET /api/v1/routes/{route_id}` to follow active waypoints and compare live GPS against planned segments.
  - Needs `GET /api/v1/routes/providers/status` to monitor live traffic feeds.
- **For Part D (Analytics, Carbon Auditing & Admin Portal)**:
  - Needs `GET /api/v1/routes` to aggregate user travel patterns, total kilometers traveled, and carbon savings across modes.

## 5. Events Produced by Part A
- `ROUTE_REQUESTED`: Emitted when an origin-destination calculation is initiated.
- `ROUTE_CALCULATED`: Emitted after provider resolves segments, ETA, cost, and carbon metrics.
- `ROUTE_PERSISTED`: Emitted once the route and segments are successfully saved to PostgreSQL.
- `TRAFFIC_DELAY_DETECTED`: Emitted when real-time segment analysis detects delay deviation.

## 6. External APIs Required for Real-Time Route Planning (Subsequent Phase)
- **Google Maps Routes API / Directions API**: Real-time traffic, transit lines, turn-by-turn navigation.
- **OpenRouteService (ORS) / OpenStreetMap (OSM)**: Open-source multi-modal routing, pedestrian paths, and isochrones.
- **HERE Maps / TomTom Traffic API**: Real-time incident feeds and traffic congestion indices.
- **Public GTFS / GTFS-Realtime Feeds**: Live bus/metro schedules, vehicle positions, and arrival alerts.

## 7. Dependencies
- **Backend Core**: FastAPI, Uvicorn, Pydantic v2, Pydantic-Settings, Python-Dotenv.
- **Database & Persistence**: PostgreSQL, SQLAlchemy 2.0 (ORM), Psycopg2-binary, Asyncpg, Alembic (migrations).
- **Networking & Utilities**: HTTPX (async HTTP client), Starlette.
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide Icons.

## 8. Recommended Implementation Order
1. **Foundation Setup** *(Completed in this step)*: FastAPI, Next.js, PostgreSQL connection, SQLAlchemy models, Alembic migrations, clean service architecture, CORS, error handling, logging, and shared contracts.
2. **Provider Integration**: Plug in real external routing APIs (Google Routes, GTFS, OpenRouteService) behind `BaseRouteProvider`.
3. **Real-Time Traffic & Recalculation**: Implement dynamic traffic polling and automatic alternative rerouting.
4. **Integration with Parts B, C, and D**: Expose webhook/event listeners and authenticated client SDKs for booking, tracking, and analytics.
