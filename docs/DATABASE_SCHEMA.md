# Part A PostgreSQL Database Schema

## Entity Relationship (ER) Summary

```
┌────────────────────────────────────────┐
│              route_plans               │
├────────────────────────────────────────┤
│ id: VARCHAR(36) [PK]                   │
│ title: VARCHAR(255)                    │
│ origin_name: VARCHAR(255)              │
│ origin_lat: FLOAT                      │
│ origin_lon: FLOAT                      │
│ destination_name: VARCHAR(255)         │
│ destination_lat: FLOAT                 │
│ destination_lon: FLOAT                 │
│ status: VARCHAR(50)                    │
│ travel_mode: VARCHAR(50)               │
│ preference: VARCHAR(50)                │
│ total_distance_km: FLOAT               │
│ total_duration_minutes: FLOAT          │
│ estimated_cost: FLOAT                  │
│ carbon_emissions_kg: FLOAT             │
│ created_at: DATETIME                   │
│ updated_at: DATETIME                   │
└───────────────────┬────────────────────┘
                    │ 1
                    │
                    │ N (CASCADE DELETE)
┌───────────────────▼────────────────────┐
│             route_segments             │
├────────────────────────────────────────┤
│ id: VARCHAR(36) [PK]                   │
│ route_id: VARCHAR(36) [FK]             │
│ sequence_order: INTEGER                │
│ start_name: VARCHAR(255)               │
│ start_lat: FLOAT                       │
│ start_lon: FLOAT                       │
│ end_name: VARCHAR(255)                 │
│ end_lat: FLOAT                         │
│ end_lon: FLOAT                         │
│ mode: VARCHAR(50)                      │
│ provider_name: VARCHAR(100)            │
│ distance_km: FLOAT                     │
│ duration_minutes: FLOAT                │
│ delay_minutes: FLOAT                   │
│ instructions: TEXT                     │
│ created_at: DATETIME                   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│               locations                │
├────────────────────────────────────────┤
│ id: VARCHAR(36) [PK]                   │
│ name: VARCHAR(255)                     │
│ latitude: FLOAT                        │
│ longitude: FLOAT                       │
│ address: VARCHAR(500)                  │
│ city: VARCHAR(100)                     │
│ category: VARCHAR(100)                 │
│ created_at: DATETIME                   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│        provider_health_records         │
├────────────────────────────────────────┤
│ id: VARCHAR(36) [PK]                   │
│ provider_name: VARCHAR(100)            │
│ status: VARCHAR(50)                    │
│ latency_ms: FLOAT                      │
│ endpoint_url: VARCHAR(255)             │
│ checked_at: DATETIME                   │
└────────────────────────────────────────┘
```

## Migration Tooling
- Schema management is handled by **Alembic** (`backend/alembic/versions/`).
- Initial baseline migration: `0001_initial_part_a_tables.py`.
- Run `alembic upgrade head` to apply migrations in staging/production environments.
