# Public live deployment

Primary commands:
- `.\PUBLIC-DEPLOY.ps1`
- `.\PUBLIC-STATUS.ps1`
- `.\PUBLIC-STOP.ps1`

Purpose:
- build and run the production server
- create a live public URL through Cloudflare Quick Tunnel
- save the live URL into `runtime/public-url.txt`
- open the live URL automatically in the browser

Important:
- this public link is live and direct
- it is temporary and remains active while the tunnel process is alive