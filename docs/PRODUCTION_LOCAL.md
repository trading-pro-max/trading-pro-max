# Production Local Deployment

Primary production commands:
- `.\PROD-BUILD.ps1`
- `.\PROD-START.ps1`
- `.\PROD-STOP.ps1`
- `.\PROD-STATUS.ps1`
- `.\PROD-DEPLOY.ps1`

Behavior:
- builds the Vite web app into `apps/web/dist`
- starts the API in `NODE_ENV=production`
- serves the built web app through Express static on port `8787`
- writes production logs into `logs/production`
- stores production PID into `runtime/prod-api.pid`

Current mode:
- fast local production deployment
- SQLite + current Prisma schema
- next hardening step later: cloud host + reverse proxy + managed database + versioned migrations