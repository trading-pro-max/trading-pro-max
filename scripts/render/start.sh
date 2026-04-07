#!/usr/bin/env bash
set -euo pipefail

export NODE_ENV=production
npx tsx apps/api/src/server.ts