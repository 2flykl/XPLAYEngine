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
