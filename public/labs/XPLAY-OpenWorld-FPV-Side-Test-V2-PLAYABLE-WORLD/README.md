# XPLAY Open World FPV Side Test V2 — Playable World

This upgrade replaces the colored geometric placeholder world with a screenshot-matched environment workflow.

## New button
**Generate Playable World**

It sends the uploaded screenshot to the configured OpenAI image model and generates three connected world regions that are instructed to preserve the screenshot's graphics, lighting, biome, geography, landmarks, architecture and environmental style.

The first-person viewport renders from those image regions — not colored boxes/circles.

## What it tests
- screenshot → world continuation
- same visual style across generated regions
- first-person navigation
- persistent world coordinates
- persistent landmark placement
- saved local world memory
- transition between generated regions

## API usage
The first generation uses up to **3 image-generation/edit calls**.
After that, generated images are cached on disk and world placement is saved locally.

## Setup
Place the folder inside:
`XPLAYEngine/public/labs/`

The server searches upward for:
`XPLAYEngine/server/.env`

Or make a local `.env`:
```env
OPENAI_API_KEY=...
OPENAI_IMAGE_MODEL=gpt-image-1
PORT=8855
```

Start:
```powershell
npm install
npm start
```

Open:
`http://localhost:8855`

## Recommended test
Use the open-world screenshot you just generated, click **Generate Playable World**, then walk with WASD and rotate with Q/E or mouse drag.
