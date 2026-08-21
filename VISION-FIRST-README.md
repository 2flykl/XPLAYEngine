# XPLAY Vision-First Clean Build

This cleanup focuses on one milestone: upload an image, send it to the live Gemini multimodal backend, and show the detailed source-grounded description in XPLAY.

## Fixed
- Removed unresolved Git merge markers from `src/core/ApiBase.js`.
- Made the Cloud Run backend URL authoritative for GitHub Pages.
- Removed fake semantic fallbacks from the Vision client.
- Increased Gemini request timeout to 60 seconds.
- Rebuilt the Analyze screen so a failed Gemini call stays visibly failed instead of silently substituting old analysis.
- Rebuilt the Vision Report screen to show the full Gemini description plus player, environment, camera, opponents, props, HUD, gameplay signals, colors and game-type fits.
- Removed workflow patch hacks and unresolved build fragility.
- Removed real `.env` files/API keys from this ZIP.

## Live backend expected
`https://xplay-api-246473132693.us-central1.run.app/api/vision/health`

Expected: `ok:true`, `configured:true`, `model: gemini-3.6-flash`, `mode: vision-drop-proven`.

## Local test
Create `server/.env` locally only if testing the API on your computer:

GEMINI_API_KEY=YOUR_KEY
GEMINI_VISION_MODEL=gemini-3.6-flash

Then run:

`npm install`
`npm run dev`

For the deployed GitHub Pages frontend, the browser calls the Cloud Run API directly; the API key must stay in Cloud Run Secret Manager, not in this repo.
