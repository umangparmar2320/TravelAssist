# Part A API Specification (OpenAPI v1)

Base URL: `/api/v1`

### Endpoints Overview

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check & database connection probe |
| `POST` | `/api/v1/routes/plan` | Plan a new multi-modal route |
| `GET` | `/api/v1/routes` | List saved route plans (paginated) |
| `GET` | `/api/v1/routes/{route_id}` | Get detailed route plan with segments |
| `GET` | `/api/v1/routes/providers/status` | Routing provider telemetry and latency |
| `POST` | `/api/v1/routes/locations` | Register a transit landmark or hub |
| `GET` | `/api/v1/routes/locations/search` | Search locations by name or city |
| `GET` | `/api/v1/routes/events/catalog` | Catalog of events produced by Part A |

### Error Response Format
All error responses follow the standard RFC schema:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | INTERNAL_SERVER_ERROR",
    "message": "Human-readable explanation of error",
    "details": {},
    "path": "/api/v1/routes/plan"
  },
  "timestamp": "2026-09-19T10:00:00Z"
}
```
