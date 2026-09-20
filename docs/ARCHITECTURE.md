# Part A Clean Service Architecture

## Architectural Principles
Part A implements a layered, unidirectional **Clean Service Architecture**:

```
[ Frontend (Next.js 15 + TypeScript + Tailwind) ]
                     │  HTTP /api/v1/*
                     ▼
[ API Layer: FastAPI Routers & Versioning (/backend/part_a/api/v1) ]
                     │  Pydantic Schemas Validation
                     ▼
[ Service Layer: Business Orchestration (/backend/part_a/services) ]
          │                                  │
          ▼                                  ▼
[ Provider Layer (/backend/part_a/providers) ]   [ Repository Layer (/backend/part_a/repositories) ]
(BaseRouteProvider / Mock / External APIs)       (BaseRepository / RouteRepository)
                                                     │
                                                     ▼
                                         [ SQLAlchemy ORM Models ]
                                                     │
                                                     ▼
                                         [ PostgreSQL Database ]
                                         (Managed via Alembic)
```

## Layer Responsibilities
1. **API Layer (`/backend/part_a/api`)**:
   - Manages HTTP status codes, query parameters, route prefixing, and OpenAPI metadata.
   - Delegates business execution directly to the Service Layer via FastAPI dependency injection (`Depends(get_route_service)`).
2. **Service Layer (`/backend/part_a/services`)**:
   - Contains pure domain and business logic: coordinate validation, multi-modal routing workflow, carbon footprint estimation, and event generation.
   - Decoupled from HTTP frameworks; can be invoked from CLI or background workers.
3. **Repository Layer (`/backend/part_a/repositories`)**:
   - Encapsulates database transactions, filtering, pagination, and atomic inserts.
   - Extends generic `BaseRepository[ModelType]`.
4. **Provider Layer (`/backend/part_a/providers`)**:
   - Polymorphic abstraction (`BaseRouteProvider`). Allows swapping mock data with live external APIs (Google Maps, OpenRouteService) with zero changes to the service layer.
5. **Database Layer (`/backend/database.py` & `/backend/part_a/models`)**:
   - PostgreSQL engine with connection pooling and schema versioning via Alembic migrations.
