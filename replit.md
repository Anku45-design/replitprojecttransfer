# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── flood-platform/     # React + Vite flood dashboard (served at /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Project: Flood Risk Prediction & Alert Platform

A professional disaster management dashboard for India (Bihar, Assam, Kerala) featuring:

### Features
- **Dashboard**: Real-time stat cards, river level trend charts, priority alerts sidebar
- **Map View**: Interactive Leaflet heatmap with district risk circles (green/yellow/orange/red)
- **Monitoring Stations**: River gauge stations with level vs. danger threshold progress bars and time-series charts
- **Authorities Panel**: Emergency resources table, evacuation orders with progress tracking
- **Active Alerts**: Full alert log with severity filtering (Critical/High/Moderate/Low)

### Data
- 20 districts across Bihar, Assam, Kerala with real lat/lng coordinates
- 10 monitoring stations on major rivers (Brahmaputra, Ganga, Bagmati, Pamba, etc.)
- 480 time-series readings (48 readings × 10 stations)
- 15 emergency resources (boats, helicopters, NDRF teams, etc.)
- 5 evacuation orders at various stages

### API Endpoints (all under /api)
- `GET /api/healthz` - Health check
- `GET /api/summary` - Dashboard summary stats
- `GET /api/districts` - All districts with risk levels
- `GET /api/districts/:id` - Single district
- `GET /api/alerts` - Active alerts (filterable by severity, state)
- `GET /api/stations` - Monitoring stations
- `GET /api/stations/:id/readings` - Time-series readings
- `GET /api/authorities/resources` - Emergency resources
- `GET /api/authorities/evacuations` - Evacuation orders

### Re-seed Data
```bash
pnpm --filter @workspace/scripts run seed-flood-data
```

## TypeScript & Composite Projects

- Always typecheck from the root: `pnpm run typecheck`
- `emitDeclarationOnly` for lib packages
- Project references in `tsconfig.json` for cross-package imports

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server serving all flood data endpoints.

### `artifacts/flood-platform` (`@workspace/flood-platform`)
React + Vite frontend. Dark mode professional disaster management UI.
Uses: Recharts (charts), React-Leaflet (map), React Query (data fetching with 30s polling).

### `lib/db` (`@workspace/db`)
Database schema: districts, flood_alerts, monitoring_stations, station_readings, emergency_resources, evacuation_orders.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `scripts` (`@workspace/scripts`)
Utility scripts. Seed data: `pnpm --filter @workspace/scripts run seed-flood-data`
