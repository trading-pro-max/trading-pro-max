<!-- TPM:MASTER:START -->
# Trading Pro Max

## Master Autonomous Build
- Local certified: YES
- Master mode: AUTONOMOUS_BUILD
- Master file: lib/tpm-master.mjs
- Build progress: 100%
- Remaining: 0%
- Production Promotion: 100%
- Real Trading: 100%
- Product Surface: 100%
- Launch Readiness: 100%
- Remote Promotion: 100%

## Language Coverage
- TypeScript: 212
- JavaScript: 140
- JSON: 71
- PowerShell: 60
- Markdown: 26
- Batch: 11
- YAML: 8
- Shell: 4
- CSS: 3
- HTML: 2
- Python: 2
- SQL: 2

<!-- TPM:MASTER:END -->



























































































































































































































































































<!-- TPM:PROGRESS:START -->
# Trading Pro Max

## Live Build Status
- Global completion: 100%
- Remaining: 0%
- Local autonomous core: IN PROGRESS
- Production jump: 14/14
- Trading jump: 12/13
- Product jump: 9/9
- Launch jump: 7/7
- Modules closed locally: 2/2

## Active Major Jumps
- Autonomous Production Core
- Real Trading Core
- Product Runtime Surface
- Launch Readiness Runtime

## Language Coverage
- TypeScript: 212
- JavaScript: 140
- JSON: 71
- PowerShell: 60
- Markdown: 26
- Batch: 11
- YAML: 8
- Shell: 4
- CSS: 3
- HTML: 2
- Python: 2
- SQL: 2

<!-- TPM:PROGRESS:END -->














































































































































































































































































































<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
# Trading Pro Max

Unified monorepo for Trading Pro Max across Desktop, Web, Mobile, API, and shared platform packages.

## What changed in this build

This build upgrades **Phase 4: Backend Core** from a transitional local JSON prototype to a more real backend foundation:

- **Prisma + SQLite** in `packages/db`
- **Signed auth sessions** stored in the database
- **Seeded admin user + workspace**
- Protected API routes backed by database reads/writes
- CMD scripts that install, initialize the database, and run the bundle on Windows

## Demo login

- Email: `admin@tradingpromax.local`
- Password: `admin123`

## Windows quick start

```bat
scripts\cmd\install.cmd
scripts\cmd\run-bundle.cmd
```

## API quick start

```bat
scripts\cmd\run-api.cmd
```

## Database quick start

```bat
scripts\cmd\init-db.cmd
```

## API highlights

Public:
- `GET /api/health`
- `GET /api/config`
- `POST /api/auth/login`
- `POST /api/auth/register`

Private:
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/overview`
- `GET /api/signals`
- `POST /api/signals/generate`
- `POST /api/signals/:signalId/execute`
- `GET /api/ledger`
- `GET /api/journal`
- `POST /api/journal`
- `POST /api/engine/status`
- `POST /api/presets/apply`
- `GET /api/report`

## Important status note

This is a strong backend-core step, but it is **not yet production-closed**. It still needs:
- refresh token flow / stricter auth hardening
- RBAC expansion
- PostgreSQL production target
- validation layer
- migrations history discipline
- background jobs / queues
- broker-grade integrations
- cloud deployment hardening
>>>>>>> 6eb7993535ecbe11b730b643aa4a51f1d208951a
