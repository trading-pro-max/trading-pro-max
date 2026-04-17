# Local Validation Contract

This note covers only local Trading Pro Max product validation support.

## Operator Commands

- `npm run tpm:validate`
  - Runs the local manifest validation.
  - Prints the default human-readable validation summary.
  - Skips canonical desk route coverage.

- `npm run tpm:validate -- --canonical-routes`
  - Runs the local manifest validation.
  - Adds canonical desk route coverage for:
    - `/`
    - `/market-intelligence`
    - `/execution-center`
    - `/risk-control`
    - `/ai-copilot`
    - `/journal-vault`
    - `/strategy-lab`
  - Prints the human-readable validation summary.

- `npm run tpm:validate -- --json`
  - Runs the local manifest validation.
  - Prints machine-readable JSON for:
    - manifest status
    - canonical-route summary
    - overall validation status
  - Leaves canonical desk route coverage skipped.

- `npm run tpm:validate -- --canonical-routes --json`
  - Runs the local manifest validation.
  - Adds canonical desk route coverage.
  - Prints machine-readable JSON for:
    - manifest status
    - canonical-route summary
    - overall validation status

## Scope

- Local-only.
- Trading Pro Max product surface only.
- No website, marketing, deployment, or public-site validation is included here.
