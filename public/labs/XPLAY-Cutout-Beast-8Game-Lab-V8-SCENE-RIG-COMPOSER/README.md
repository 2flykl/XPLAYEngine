# XPLAY Sprite-Sheet Beast V2 — 8 Game Lab

This corrects the previous lab: **characters are generated as sprite sheets, not one API call per pose.**

## Workflow
For each character:
1. ONE image-generation call creates the whole requested sheet.
2. Prompt enforces an exact row/column grid and large transparent gutters.
3. The raw sheet is saved for inspection.
4. XPLAY locally slices each grid cell.
5. Each cell is alpha-trimmed to the actual silhouette.
6. Each cleaned silhouette is normalized to a 640×640 transparent cell with 12% safety padding and a bottom-center anchor.
7. XPLAY repacks those cleaned cells into a final atlas with 48px transparent gutters.
8. Runtime should use the cleaned/repacked atlas, not the raw generated sheet.

This gives the economy of sprite-sheet generation while solving the rectangle/bleed problem after generation.

## Cost-saving proof test
For each game, **Generate proof sheets** does at most:
- 1 stage call
- 1 primary player/vehicle sheet call
- 1 first enemy/NPC sheet call

So you can reject/refine a game before generating everything else.

## Setup
```powershell
npm install
npm start
```
Open:
http://localhost:8833

If placed inside the XPLAY repo, the server searches upward for your existing `server/.env`.

## Key rule
Do not use the raw generated sprite sheet in gameplay. The raw sheet is only a source artifact. Use the `__atlas.png` that XPLAY produces after slice → alpha-trim → normalize → repack.


## V4 Build + Play
After generating at least the primary player/vehicle sheet, click **Build + Play Game**.

The lab writes a playable manifest and opens `/play.html?game=<game-id>`.
Each of the eight genres gets its own lightweight runtime behavior:
- brawler
- tactical shooter
- cozy life sim
- survival horror
- action RPG
- anti-gravity racing
- rhythm-action
- open-world adventure

These runtimes are long-form test harnesses using each game's `targetSeconds` rather than 10-second micro-demos. They are intended to validate the screenshot → asset → cleaned atlas → playable chain.


## V5 Complementary Sprite Sheet
A new **Complementary Sprite Sheet** button appears after **Build + Play Game**.
It generates one additional transparent support-asset sheet based on each game's `props` list (pickups, breakables, cover fragments, decor/gameplay support objects), then slices, alpha-trims, and repacks it just like actor sheets.

Files produced:
- `complementary__raw-sheet.png`
- `complementary__atlas.png`
- `complementary__atlas.json`
- `complementary__validation.json`


## V6 Environment Beast
The new **Generate Environment Beast** button creates a scrollable world instead of using one screenshot as wallpaper.

It performs:
- 3 chained AI environment-chunk generations per game (cached after first run)
- local far-layer creation for parallax
- world manifest creation
- world width/height and camera bounds
- genre-aware environment mode
- zones, obstacle positions and spawn points
- chained visual continuation from chunk 1 → chunk 2 → chunk 3
- Rebuild + Play World uses the new world manifest

Generated files include:
- `environment__chunk-1.png` ... `environment__chunk-3.png`
- `environment__far-1.png` ... `environment__far-3.png`
- `environment__manifest.json`

Important: if Environment Beast is not generated, the playable falls back to the old static-stage mode so you can compare before/after.


## V7 Grounding Beast
V7 fixes actors appearing to float over generated backgrounds.

Key changes:
- Environment generation now requires a broad connected gameplay floor / track / catwalk in the lower third.
- `environment__manifest.json` now contains a `grounding` contract.
- Actor positions use world-space Y values that are projected to screen-space correctly.
- Vertical camera drift is disabled for the 2D image-world runtime.
- Player, enemies, NPCs and vehicles are clamped to the environment's depth band.
- Wave spawns and NPC placement use the same ground projection.
- HUD shows `GROUNDED` when the environment manifest is active.

This is still a 2.5D runtime: generated backgrounds are not true 3D geometry. The Grounding Beast makes the scene spatially coherent enough for the screenshot-to-playable test while preserving the Environment Beast world-scroll system.


## V8 Scene Rig + Composer
Scene Rig → zero-cost Calibration → Asset/Environment Beasts → Composer Check → Production Playable. Scene Rig stores camera, horizon, ground band, actor/prop scale, anchors, collision assumptions, world size, and runtime family (2D / 2.5D / 3D-lite).
