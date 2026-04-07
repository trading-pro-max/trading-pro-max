#!/usr/bin/env bash
set -euo pipefail

npm install --no-audit --no-fund --legacy-peer-deps
npm run build -w apps/web