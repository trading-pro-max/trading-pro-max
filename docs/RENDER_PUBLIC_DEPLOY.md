# Render public deploy

Fast path:
1. Repo already contains `render.yaml`
2. In Render: New + Blueprint
3. Select this repository
4. Approve the prompted secret values
5. Deploy

Service design:
- Single public web service
- Express serves API and built web app
- SQLite stored on Render persistent disk at `/var/data/tradingpromax.db`
- Health check path: `/api/health`

Secret values that Render will prompt for:
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_ID
- STRIPE_SUCCESS_URL
- STRIPE_CANCEL_URL
- STRIPE_PORTAL_RETURN_URL