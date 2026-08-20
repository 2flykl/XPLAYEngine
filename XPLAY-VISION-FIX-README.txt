XPLAY VISION FIX — WHAT CHANGED

1. Gemini multimodal vision is now wired directly into server/index.js.
2. server/.env is loaded explicitly even when Node starts from the repo root.
3. /api/vision/health reports Gemini configuration.
4. /api/vision/analyze sends the CURRENT screenshot to Gemini and requests structured JSON.
5. Hard-coded semantic fallbacks ("outdoor urban space", generic street/anchor-district behavior) were removed from generated-user analysis.
6. Screenshot analysis now supplies up to 3 compatible PLX recommendations with confidence + reason.
7. The user-selected PLX type is a hard lock through manifest/build summary/runtime handoff.
8. Build Summary now shows Engine Authority, Vision Mode, Current Source, Build ID, and Pacing.
9. Build DNA is connected to the generation path.
10. GitHub Pages workflow now reads repository variable XPLAY_API_BASE_URL and exposes it to Vite as VITE_XPLAY_API_BASE_URL.
11. Dockerfile + .dockerignore added so the existing backend can be deployed to Google Cloud Run.
12. Real secrets are excluded from this returned ZIP.

LOCAL SETUP
Create/keep this file on YOUR machine (do not commit it):
server/.env

GEMINI_API_KEY=<your key>
GEMINI_VISION_MODEL=gemini-2.5-flash
PORT=8787

From the repo root:
npm install
npm run dev:api

Then open:
http://localhost:8787/api/vision/health

Expected:
{"ok":true,"provider":"gemini","model":"gemini-2.5-flash","configured":true}

Then run the web app and test Screenshot -> Game.

LIVE / CLOUD RUN
After local Vision works, deploy the backend Dockerfile to Cloud Run.
Put GEMINI_API_KEY in Cloud Run's server-side environment/secrets.
Create a GitHub Actions repository variable:
XPLAY_API_BASE_URL=https://<your-cloud-run-service>.run.app
Then rebuild GitHub Pages.

SECURITY
The uploaded project contained a raw Gemini key in server/.env. This returned ZIP intentionally omits server/.env.
Rotate that key after your test is working, because it was previously exposed in a transcript.
