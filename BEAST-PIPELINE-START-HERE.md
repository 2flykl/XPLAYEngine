# XPLAY Beast Pipeline Lab — Start Here

This build adds an executable **Vision → Game Interpreter → Asset Manifest** pipeline without replacing the existing XPLAY game runtime.

## Why this exists
The builder should not be asked to invent a game directly from a prose image description. This lab creates two explicit handoffs first:

1. **Vision Truth** — what the image literally contains.
2. **Game Interpreter** — how the visible scene can function as a game.
3. **Asset Manifest Beast** — what production assets are required and how each should be obtained.

The Asset Manifest Beast classifies every item as:
- `extract`
- `rebuild`
- `extend`
- `synthesize`

and routes work toward specialist techniques such as SAM2/Grounding DINO segmentation, matting, Depth Anything, OCR, pose estimation, outpainting, sprite synthesis, tileset generation, optical-flow/frame interpolation, and consistency QA.

## Run it locally
From the XPLAYEngine folder:

```powershell
npm install
npm run dev
```

Then open:

`http://localhost:5173/beast-lab.html`

Your existing `GEMINI_API_KEY` must be available to the Node backend through `server/.env` or the root `.env`.

## What you will see
Upload one screenshot and click **RUN ALL 3 BEASTS**.

The page will show:
- Gemini's detailed literal image description
- the Game Interpreter packet
- the Asset Manifest packet
- individual asset cards showing EXTRACT / REBUILD / EXTEND / SYNTHESIZE
- a button to download the combined `xplay-plx-dna-packet.json`

## New API routes
- `GET /api/beasts/health`
- `POST /api/beasts/interpreter`
- `POST /api/beasts/assets/manifest`

The same source image is sent to every stage so downstream Beasts can visually verify the prior packet instead of trusting text alone.

## Important
This version plans asset production; it does **not** falsely claim SAM2, Depth Anything, outpainting, pose estimation, or sprite synthesis has already executed. Those are represented as specialist jobs in the manifest and are the next production layer to wire in.


## Fastest install into your current XPLAYEngine

Extract this ZIP. Copy everything inside it into the **root of your existing XPLAYEngine folder** and allow Windows to merge/replace files.

Your existing `.env` / `server\.env` stays in place because this ZIP does not contain either secret file.

Then double-click:

`RUN-BEAST-PIPELINE-LAB.bat`

Or from PowerShell:

```powershell
.\RUN-BEAST-PIPELINE-LAB.bat
```

The browser opens:

`http://localhost:5173/beast-lab.html`

### What happens when you press RUN ALL 3 BEASTS

1. **Vision Beast** receives the image and returns literal detailed description.
2. **Game Interpreter Beast** receives BOTH the exact image and Vision packet.
3. **Asset Manifest Beast** receives the exact image + Vision packet + Interpreter packet.
4. It creates asset cards labeled **EXTRACT / REBUILD / EXTEND / SYNTHESIZE**.
5. Click **DOWNLOAD PLX DNA PACKET** to export the entire handoff as JSON.

### Important boundary

This version gets XPLAY successfully through the *planning* layer for asset production. It deliberately does not fake execution of SAM2, Depth Anything, outpainting, pose estimation, or sprite generation. The manifest tells the next specialist layer exactly which tools should run, on which assets, and what QA must pass.
