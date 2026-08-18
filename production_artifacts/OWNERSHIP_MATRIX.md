# File Ownership Matrix

| Area | Primary Agent | Secondary / Proposal Only |
|---|---|---|
| `.agents/`, `production_artifacts/` | @director | all agents may append evidence |
| `src/styles/` | @experience | @qa reports only |
| site-shell portions of `src/main.js` | @experience when assigned | @director integrates conflicts |
| `src/scenes/` | @runtime | @qa reports only |
| `src/core/PLXRuntime.js` | @runtime | @director |
| `src/directors/` | @runtime | @director |
| `vision-service/` | @art | @platform may advise dependencies |
| `src/core/AssetFactory.js` | @art | @runtime may request asset contracts |
| `src/core/VisualAssetFactory.js` | @art | @runtime may request asset contracts |
| `server/` | @platform | @art may propose AI endpoints |
| Supabase/schema/deploy/export | @platform | @director |
| browser/Playwright tests | @qa | @platform |
| `package.json` | @platform | @director for integration |
