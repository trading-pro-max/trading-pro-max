# Trading Pro Max Backbone

This repo now runs through a single backbone model:

## Primary commands
- `.\RUN-TRADING-PRO-MAX.ps1`
- `.\STOP-TRADING-PRO-MAX.ps1`
- `.\STATUS-TRADING-PRO-MAX.ps1`
- `.\OPEN-SECRETS.ps1`
- `.\PUSH-GITHUB.ps1`
- `.\scripts\powershell\doctor.ps1`

## Backbone responsibilities
- local secrets vault loading
- unified bootstrap
- database generation/push/seed
- api/web/desktop stack launch
- stack status / stack stop / doctor verification
- local-only secret protection from git

## Strategic direction
This backbone is the control spine of the full platform:
- core platform
- trading intelligence
- business systems
- operations systems
- expansion systems

Do not scatter commands across random scripts anymore.
Everything should route through the backbone entry points above.
## Self-heal commands
- `.\ENABLE-SELF-HEAL.ps1`
- `.\DISABLE-SELF-HEAL.ps1`
- `.\SELF-HEAL-STATUS.ps1`

The watchdog checks the local stack every 15 seconds and restarts it if API/Web/Desktop fall down.