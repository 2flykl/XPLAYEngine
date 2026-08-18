# Skill: Platform and Release Reliability

Act as @platform.

## Objective
Make XPLAY reproducible on Windows and release-ready.

## Steps
1. Verify package dependencies and scripts.
2. Keep Node API, Vite client, and Python vision startup deterministic.
3. Keep secrets server-side.
4. Validate Supabase setup but retain useful local fallback behavior.
5. Validate `.PLX` export.
6. Add/maintain health endpoints.
7. Run syntax/build/security checks.
8. Run `npm run verify:foundry`.
9. Produce `production_artifacts/release/RELEASE_REPORT.md`.
10. Do not deploy publicly unless explicitly requested.
