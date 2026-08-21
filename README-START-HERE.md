# XPLAY — Analysis to Playable Packets

This pack adds the translation layer that was missing between **Vision** and **game construction**.

## New pipeline

Vision Analysis
→ Game Interpreter Beast
→ Asset Manifest Beast
→ Builder Packet Compiler

The pack does **not** fake sprite generation or world extension. It creates the structured contracts those specialist production beasts need.

## Install

Extract this ZIP and copy the contents into the root of your current `XPLAYEngine` repository.

Then run:

```powershell
node .\APPLY-PLAYABLE-TRANSLATION.mjs
npm run build
```

For local testing, start your normal XPLAY dev/server setup and open:

`http://localhost:5173/translation-lab.html`

If your Express API runs on port 8787, the lab uses it automatically.

On GitHub Pages, the lab uses:

`https://xplay-api-246473132693.us-central1.run.app`

## What to test

1. Paste the detailed Gemini Vision analysis.
2. Attach the same source image when possible.
3. Optionally lock the game type.
4. Add gameplay intent and "must keep" constraints.
5. Press **RUN TRANSLATION PIPELINE**.
6. Inspect:
   - Game Interpreter Packet
   - Asset Manifest Packet
   - Builder Packet
7. Download the complete JSON packet.

## Hard rules built into this pack

- User-selected engine outranks AI recommendation.
- Vision analysis/image are source truth.
- Unknown stays unknown.
- No unrelated legacy assets.
- Asset Manifest must classify every asset as:
  - EXTRACT
  - REBUILD
  - EXTEND
  - SYNTHESIZE
- Asset Manifest routes jobs to advanced methods such as:
  - segmentation
  - alpha matting
  - OCR
  - monocular depth
  - pose estimation
  - sprite synthesis
  - animation completion
  - tileset generation
  - world extension/outpainting
  - image-to-video motion reference
  - UI reconstruction
  - FX generation
  - collision-mask extraction
  - consistency QA
- Builder packet may reference only assets in the manifest.
- Builder should fail closed when required assets are missing.

## Important

This ZIP contains no API keys and no `.env` file. It uses the same `GEMINI_API_KEY` and `GEMINI_VISION_MODEL` already configured for XPLAY.
