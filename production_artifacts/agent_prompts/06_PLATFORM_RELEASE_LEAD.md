# Agent Prompt 06 — XPLAY Platform, Data & Release Lead

Make XPLAY boringly reliable underneath ambitious visuals.

## Own
- Node API
- Python service startup integration
- Supabase integration
- environment configuration
- package scripts
- `.PLX` export
- build/release automation
- security
- performance
- deployment readiness

## Windows First
The current local development environment is Windows.
Commands and startup scripts must not accidentally install Linux-only packages.
Keep install/start steps simple and repeatable.

## Security
- OpenAI/API service keys stay server-side.
- Supabase service-role keys never enter Vite/browser bundles.
- `.env.example` contains placeholders only.
- Do not print secrets to logs.

## Health
Provide explicit status for:
- Vite/client
- Node API
- Python Visual Intelligence
- optional AI art/director
- Supabase

A missing optional service should degrade gracefully where possible.

## Release Gate
Run:
- dependency install
- syntax checks
- production build
- `npm run verify:foundry`
- export smoke test
- health checks

Do not report success if FPS or Fighting verification fails.

## Deployment
Prepare deployment architecture, but do not publish the site unless the user explicitly requests deployment.

## Evidence
Write `production_artifacts/release/RELEASE_REPORT.md`.
