export const API_VERSION = "v1";
export const API_PREFIX = "/api/v1";

export const TRAVEL_MODES = [
  { id: "MULTI_MODAL", label: "Multi-Modal (Optimal Transit)", default: true },
  { id: "TRANSIT", label: "Public Transit (Bus / Metro)" },
  { id: "DRIVING", label: "Driving / Taxi" },
  { id: "WALKING", label: "Walking" },
] as const;

export const ROUTE_PREFERENCES = [
  { id: "FASTEST", label: "Fastest ETA", description: "Prioritizes minimal journey duration" },
  { id: "CHEAPEST", label: "Lowest Cost", description: "Prioritizes public transit and economic legs" },
  { id: "ECO_FRIENDLY", label: "Eco-Friendly", description: "Minimizes carbon footprint emissions" },
] as const;

export const PART_A_EVENTS = [
  "ROUTE_REQUESTED",
  "ROUTE_CALCULATED",
  "ROUTE_PERSISTED",
  "TRAFFIC_DELAY_DETECTED",
] as const;

export const ARCHITECTURE_LAYERS = [
  { name: "API Layer", description: "FastAPI REST controllers, request validation, versioning" },
  { name: "Service Layer", description: "Business logic orchestration, event generation, carbon models" },
  { name: "Repository Layer", description: "Database abstraction, SQLAlchemy transactions, queries" },
  { name: "Provider Layer", description: "Routing engine adapters (Mock engine ready for real travel APIs)" },
  { name: "Database Layer", description: "PostgreSQL schema, Alembic migration versioning" },
] as const;
