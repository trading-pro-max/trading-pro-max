#!/usr/bin/env bash
set -euo pipefail

npx prisma generate --schema packages/db/prisma/schema.prisma
npx prisma db push --schema packages/db/prisma/schema.prisma --accept-data-loss
npx tsx packages/db/src/seed.ts