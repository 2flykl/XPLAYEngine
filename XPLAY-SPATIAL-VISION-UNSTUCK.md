# XPLAY Spatial Vision Unstuck Pathway

## New production path

Screenshot
→ Gemini Vision description
→ Spatial Vision Lab
→ whole-image geometry pass
→ six overlapping detail tiles
→ normalized bounding boxes
→ coarse segmentation contours
→ HUD separation
→ playable-floor detection
→ depth/layer classification
→ Scene Graph
→ Asset Manifest Draft
→ current-build Asset Manifest Gate
→ spatially cropped/masked source references
→ PLX Builder

## How to access it

From the screenshot creator flow, complete Gemini Vision and reach **Step 3**.
Press:

**OPEN SPATIAL VISION LAB**

The lab receives the current screenshot + current Vision analysis. Press **RUN SPATIAL VISION**.

The overlay lets you inspect:
- 8 x 6 grid
- entity boxes
- coarse segmentation contours
- player/enemies
- HUD regions
- detected playfield
- depth roles

When the geometry is good, press:

**USE IN XPLAY**

Return to XPLAY and continue the build. The next build reads the saved Scene Graph and uses it to crop/mask current-source player/enemy/environment references instead of relying on fixed guessed crop coordinates.

## New API

`GET /api/vision/spatial/health`

`POST /api/vision/spatial`

Request body:
```json
{
  "imageDataUrl": "data:image/png;base64,...",
  "analysis": "existing Gemini Vision description",
  "selectedEngine": "fighting",
  "userIntent": "...",
  "detailTiles": [
    {"id":"tile-0-0","bounds":[0,0,575,383],"dataUrl":"data:image/jpeg;base64,..."}
  ]
}
```

Response contains:
- `sceneGraph`
- `assetManifest`
- raw Gemini spatial packet

## Asset contamination protections

The current Asset Manifest Gate rejects unrelated old-build assets from screenshot builds. Examples include:
- signatureJet
- runway/airport artifacts
- generic terrainNN sheets
- generic propNN sheets
- playerFighter / enemyFighter fallbacks
- unrelated weapon/crosshair assets

For screenshot builds, only approved runtime roles survive. Current source references are stored separately from approved runtime assets.

## Purged from this delivery

Dead/obsolete code paths removed:
- unused Beast Lab backend/UI
- unused Translation Lab backend/UI
- stale server backup copy
- legacy Python vision-service directory/path
- obsolete patch installers and Antigravity handoff files
- old version-by-version patch notes/install BAT clutter

Not removed:
- active runtime source
- Cloud Run/GitHub deployment files
- verification scripts and artifacts they explicitly require
- PLX engine scenes
- current Asset Manifest Gate
- current Gemini Vision path

## Local test

From the repo root:

```powershell
npm install
npm run dev
```

Then open:

`http://localhost:5173/`

Spatial Lab directly:

`http://localhost:5173/vision-spatial-lab.html`

## Cloud Run

The frontend page can be deployed to GitHub Pages with the rest of `public/`.
The new `/api/vision/spatial` route requires the updated `server/` to be deployed to the existing Cloud Run `xplay-api` service.

The route uses the same existing variables:
- `GEMINI_API_KEY`
- `GEMINI_VISION_MODEL` (default `gemini-3.6-flash`)
