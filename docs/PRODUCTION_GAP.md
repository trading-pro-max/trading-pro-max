# Production Gap

This bundle accelerates the platform massively, but the following must still be completed before public production launch:

## Security
- JWT/session hardening
- password hashing and real user management
- RBAC and audit integrity
- secret management
- rate limiting and abuse controls

## Data
- real feed providers
- historical retention policy
- replay storage scaling
- data quality pipelines

## Engine
- deterministic backtest execution
- model/rules versioning
- strategy lifecycle governance
- risk boundaries enforced server-side against real accounts

## Cloud
- deployment pipelines
- environment isolation
- observability stack
- backup/restore
- infra scaling

## Integrations
- broker adapters
- email/SMS/push providers
- payment/billing if needed

## QA
- API tests
- smoke tests
- UI tests
- manual launch checklist
