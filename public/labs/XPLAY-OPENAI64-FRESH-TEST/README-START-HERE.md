# XPLAY OPENAI64 FRESH TEST

This lab was rebuilt from zero after repeated issues with old test code.

## It does NOT replace your XPLAY homepage
Run it as a separate server. It uses port **8792**, not 8788.

## What is different
- Fresh server and frontend; no reused Asset Forge code.
- Uses `openai.responses.parse()` + `zodTextFormat()` for the Vision packet. There is no `JSON.parse()` of free-form model prose.
- Accepts only real image MIME types on both browser and server.
- Uses GPT Image 2's image edit API for reference-guided 64-bit generation.
- Uses your locked OpenAI packet as the source for the deterministic Interpreter Beast.
- Provides three deliberate asset calls: stage, Alex sheet, enemy atlas.
- Playable runtime can consume the generated stage and sprite grids.
- Uses port 8792 so stale 8788 servers cannot masquerade as this test.

## Install location I recommend
Inside your repo:

`C:\Users\2flyk\Documents\GitHub\XPLAY\XPLAYEngine\labs\openai64-fresh-test`

The server automatically looks for your existing key at:

`XPLAYEngine\server\.env`

If you instead extract the lab somewhere else, copy `.env.example` to `.env` and paste your API key there.

## Start
Double-click:

`START-FRESH-TEST.bat`

Or PowerShell:

```powershell
cd "C:\Users\2flyk\Documents\GitHub\XPLAY\XPLAYEngine\labs\openai64-fresh-test"
npm install
node server.js
```

Open:

`http://localhost:8792`

## Test order
1. Health — verify `configured: true` and `version: fresh-v1`.
2. Use Included Alex Screenshot (or upload your own).
3. Analyze + Lock Packet.
4. Build Interpreter Beast.
5. Generate Alex Sheet first.
6. If Alex is acceptable, generate 64-bit Stage.
7. Generate Enemy Atlas.
8. Build 64-bit Playable.

Each Asset Forge button is a separate image-generation/edit call.
