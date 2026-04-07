# Trading Pro Max Architecture

## Workspace shape

The platform is split into apps and domain packages:

- **Apps** provide operator-facing experiences or process boundaries.
- **Packages** provide domain logic and platform services.

## Apps

### apps/api
Backend control plane and internal API. Current responsibilities:
- auth entry point
- overview and reports
- market/data endpoints
- engine controls
- studio endpoints
- ops endpoints
- cloud/workspace endpoints
- integrations endpoints
- local persistence fallback

### apps/web
Hosted control center starter for browser-based operations.

### apps/desktop
Local operator shell for the current desktop workflow.

### apps/mobile
Expo starter for monitoring, alerts, and quick actions.

## Packages

### packages/shared
Cross-platform contracts, phase metadata, health/report helpers.

### packages/db
Prisma + SQLite schema starter for the future persistent core.

### packages/data
Data ingestion adapters, normalization, replay records, market snapshots.

### packages/engine
Signal scoring, rule checks, execution acceptance logic.

### packages/studio
Strategy definitions, backtest requests, simulation summaries.

### packages/ops
Metrics, incidents, audit lines, operational status generation.

### packages/cloud
Workspace sync payloads, environments, deployment-oriented metadata.

### packages/integrations
Broker, notification, and external connector interfaces.

## Delivery model

This repo is designed to evolve in this order:
1. local desktop + API proof
2. stronger DB + auth + services
3. hosted web sync
4. integrations and cloud rollout
5. mobile + production closure
