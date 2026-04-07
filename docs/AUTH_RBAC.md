# Real auth baseline

Added:
- JWT access token
- JWT refresh token
- httpOnly cookies
- auth status / me / refresh / logout
- RBAC roles endpoint
- admin-check endpoint

Primary endpoints:
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET  /api/auth/status
- GET  /api/auth/me
- GET  /api/rbac/roles
- GET  /api/rbac/admin-check

Current baseline:
- demo admin login backed by signed JWT + refresh cookie
- admin role from RBAC_ADMIN_EMAIL
- secure cookies configurable from secrets vault