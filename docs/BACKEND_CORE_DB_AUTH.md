# Backend Core Upgrade: DB + Auth

## Delivered in this bundle

- Prisma schema with SQLite datasource
- Persistent `User`, `Session`, `Workspace`, `Signal`, `LedgerEntry`, `JournalEntry`, `Incident`
- Seed script for default operator user and workspace
- Signed access tokens backed by DB session records
- Protected API route middleware based on persistent sessions
- CMD init flow for Windows operators

## Remaining hardening

1. Replace signed access-only flow with access + refresh split.
2. Move from SQLite to PostgreSQL for shared/cloud environments.
3. Add zod or equivalent request validation.
4. Add structured audit trail tables.
5. Add role-based access beyond owner.
6. Add test coverage for auth, reports, and execution rules.
