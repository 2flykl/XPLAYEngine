XPLAY — VISION DROP PROVEN FIX

WHAT THIS DOES
- Uses the exact Gemini request style that already worked in Gemini-Vision-Drop-Test.
- Pass 1: Gemini visually describes the uploaded image with multimodal vision.
- Pass 2: Gemini converts its grounded description to XPLAY's structured analysis fields.
- Uses gemini-3.6-flash.
- Points GitHub Pages directly at the existing Cloud Run API.
- Does NOT contain your Gemini API key.

HOW TO APPLY
1. Extract this ZIP.
2. Copy ALL contents of XPLAY-VisionDrop-Proven-Fix into the ROOT of your XPLAYEngine repo.
   Allow Windows to merge folders / replace matching files.
3. In PowerShell, from XPLAYEngine root, run:
      powershell -ExecutionPolicy Bypass -File .\APPLY-XPLAY-VISION-FIX.ps1
4. Then:
      git add .
      git commit -m "Use proven Gemini Vision Drop pipeline"
      git push origin main
5. Cloud Build should redeploy xplay-api automatically from main.
6. GitHub Actions should rebuild the live stage automatically from main.
7. After both finish, test:
      https://xplay-api-246473132693.us-central1.run.app/api/vision/health
   Expected model: gemini-3.6-flash and mode: vision-drop-proven
8. Hard refresh:
      https://2flykl.github.io/XPLAYEngine/
   Then upload the same reference screenshot.

CLOUD RUN MUST STILL HAVE
- GEMINI_VISION_MODEL = gemini-3.6-flash
- GEMINI_API_KEY -> Secret Manager secret XPLAY_GEMINI_KEY -> latest
- Public access enabled

IMPORTANT
Do not copy any .env containing a real key into GitHub. This ZIP intentionally contains no key.
