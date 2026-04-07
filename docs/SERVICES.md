# Services connection layer

Primary command:
- `.\CONNECT-SERVICES.ps1`

What it controls:
- Stripe
- Email
- Telegram
- GitHub
- Cloudflare Tunnel
- Render public URL

Primary API endpoint:
- `/api/services/status`

Purpose:
- keep all external service bindings centralized
- surface readiness from one place
- prepare the platform for faster real external connection