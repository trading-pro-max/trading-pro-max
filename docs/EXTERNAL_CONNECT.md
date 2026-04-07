# External real connection

Current external-readiness layer now includes:
- public base url support
- api base url support
- webhook public url support
- runtime config endpoint
- external connection page
- payment redirect urls derived from public base url

Update local secrets vault later with real public values:
- PUBLIC_BASE_URL
- API_BASE_URL
- WEBHOOK_PUBLIC_URL
- CORS_ORIGIN

After public deployment these values should point to the real domain.