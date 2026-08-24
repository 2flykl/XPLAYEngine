# XPLAY Cutout Beast — 8 Game Precision Lab

This lab is built to test the new asset workflow one game at a time without paying for repeated Vision analysis.

## What is already locked
- 8 source gameplay screenshots
- 8 post-analysis build prompts
- genre/style/duration targets
- actor/state manifests
- prop manifests

Vision is **not called** by this lab.

## Precision Cutout Beast
For player/enemy/prop assets, the lab deliberately avoids multi-pose sprite-sheet generation.

Pipeline:
1. One pose per image generation.
2. Transparent RGBA requested from the image model.
3. Alpha silhouette is scanned.
4. Tight alpha bounds are found.
5. Subject is normalized onto a 768×768 transparent canvas.
6. 15% transparent safety padding is enforced.
7. Bottom-center anchor is used for consistent gameplay alignment.
8. Border-touch validation is recorded.
9. Only after all states pass can an atlas be assembled, with 32px gutters.

This eliminates adjacent sprite bleed because adjacent sprites never exist during generation.

## Cost-saving test order
For each game click **Generate 3-call proof set** first:
- clean stage
- primary player idle
- first enemy/NPC idle (when applicable)

If those are not good enough, refine before generating the full state manifest.

## Setup
From this folder:
```powershell
npm install
copy .env.example .env
```

If this lab is placed inside your XPLAY repo, `server.js` also searches upward for an existing `server/.env`.

Start:
```powershell
npm start
```

Open:
http://localhost:8832

## API use
- Cached assets make zero image-generation calls.
- Clicking a state the first time makes one image edit call.
- Force regenerate makes a new call.
- Atlas assembly is local and free.
- Alpha cleanup/validation is local and free.

Default image quality is `medium` to control cost. Change `CUTOUT_IMAGE_QUALITY` only when a game has passed the workflow test and you want final art.

## Included games
1. Neon Harbor Uprising — beat-em-up / arcade pixel art
2. Ashfall Command — tactical extraction shooter / photoreal
3. Mooncrumb Village — cozy life sim / miniature feature-animation 3D
4. Whisper Motel — survival horror / cinematic realism
5. Sunblade Legends — action RPG / anime-inspired fantasy 3D
6. Skyrail Drift — anti-gravity racing / glossy next-gen 3D
7. Bassline Breakers — rhythm-action battler / urban cel-shaded
8. Clockwork Frontier — open-world action adventure / steampunk realism
