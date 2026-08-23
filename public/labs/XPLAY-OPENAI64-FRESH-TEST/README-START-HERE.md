# XPLAY Gameplay Polish Dual-Style Lab

## What this pack does
This is a fresh lab focused on **polished gameplay** after the successful breakthrough:

1. **Lock OpenAI Vision truth from a screenshot**
2. **Build the Interpreter Beast**
3. **Generate asset sets in two separate styles**
   - 64-bit arcade brawler
   - Modern day computer graphics brawler
4. **Build a playable runtime** with:
   - horizontal scene scrolling
   - environment extension / repeated world segments
   - predictive camera follow
   - clearer player/enemy state changes
   - attack animation state when pressing Space
   - better spacing / combat feel than the earlier test

## Folder structure
- `server.js` — backend / OpenAI bridge
- `public/index.html` — main lab page
- `public/app.js` — front-end workflow + runtime
- `public/styles.css` — UI styles
- `public/assets/alex-source.png` — included sample screenshot
- `START-POLISH-LAB.bat` — quick start on Windows
- `.env.example` — sample environment file

## Before you start
Make sure you have:
- Node.js installed
- An OpenAI API key in a `.env` file

Create a `.env` file in this folder with at least:

```env
OPENAI_API_KEY=your_real_openai_api_key_here
OPENAI_VISION_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-1
PORT=8796
```

## Start it
### Easy way
Double-click:
- `START-POLISH-LAB.bat`

### Manual way
Open terminal in this folder and run:

```bash
npm install
node server.js
```

Then open:

```text
http://localhost:8796
```

## Recommended workflow
1. Click **Use Alex Sample** or upload your own screenshot.
2. Add optional context.
3. Click **Analyze + Lock Packet**.
4. Click **Build Interpreter Beast**.
5. In the **64-bit Arcade Test** section, generate:
   - stage
   - player sheet
   - enemy atlas
   - playable runtime
6. In the **Modern PC Test** section, do the same.
7. Compare gameplay and presentation.

## What changed vs the earlier runtime
- Attack now has its **own state** instead of still looking like walk/idle.
- Camera uses **predictive follow**.
- The world includes an **extended environment** so scrolling is stress-tested.
- Runtime spawns enemies with more spacing.
- Basic enemy attack pacing is staggered.
- Separate dual-style tests are included in one lab.

## Notes
- This is still a test lab, not the whole XPLAY site.
- This runs locally and does **not** overwrite your live XPLAY system.
- The environment extension is partly procedural so the scroll test can be verified even when the source screenshot only shows one screen-width.
