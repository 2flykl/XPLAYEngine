# XPLAY OpenAI Vision → Interpreter → 64-bit Asset Forge Lab

This lab attacks the exact step that previously stalled: **getting from a correct OpenAI Vision packet to a playable scene that actually uses generated 64-bit art instead of graybox geometry.**

## Pipeline
1. Upload / use the Alex screenshot.
2. OpenAI Vision analyzes it.
3. **Lock the Vision packet as source truth.**
4. Interpreter Beast converts it into runtime + asset contracts.
5. OpenAI image generation creates:
   - environment-only 64-bit stage plate
   - Alex 4×2 transparent sprite sheet
   - enemy 4×3 transparent sprite atlas
6. Runtime crops the generated sheets into cells and uses them as playable actors.

## AI verbiage strategy
The forge prompts explicitly:
- repeat locked player/enemy/landmark truth
- lock the beat-em-up camera and genre
- ban unrelated assets
- ban HUD/background from sprite sheets
- demand transparent RGBA sprite atlases
- define exact grid dimensions and pose order
- demand full-body figures, consistent scale, baseline and padding
- separate environment generation from character generation

This is designed to stop the previous problem where the runtime remained a graybox even though the target image looked good.

## Setup
Put your real key in:
`server/.env`

Example:
```env
OPENAI_API_KEY=your_real_key
OPENAI_VISION_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-2
PORT=8788
```

Then:
```powershell
npm install
node server/server.js
```

Open:
`http://localhost:8788`

## Recommended test order
1. Check API
2. Analyze + Lock Packet
3. Build Interpreter Beast
4. Generate 64-bit Stage
5. Generate Alex 4×2 Sheet
6. Generate Enemies 4×3 Atlas
7. Build With Generated Assets

## Credit caution
Each asset-forge button makes an image-generation call. Start with **Alex Sprite Sheet** if you want to test the hardest visual gap first, then stage, then enemies.

## Important
Image models can still imperfectly obey sprite-grid geometry. This lab makes the request as strict and machine-oriented as possible, and the runtime assumes the requested grid. If the image generator produces imperfect cells, the next step is a sprite-atlas validation/correction beast rather than returning to placeholder geometry.
