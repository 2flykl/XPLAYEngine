# XPLAY Style Forge — 6 Build Test

This lab starts from your **already-successful canonical checkpoint** and tests how the same PNGs translate into six visual styles.

## No repeated Vision usage
This lab does **not** run OpenAI Vision again.
It uses:
- `master/packet.json`
- `master/blueprint.json`
- `master/stage.png`
- `master/alex-sheet.png`
- `master/enemy-atlas.png`

## Six styles
1. 64-bit Arcade
2. PlayStation 2 Era
3. Xbox / GameCube Era
4. HD Remaster
5. Modern Stylized PC
6. Modern Realistic PC

## API / cache behavior
- 64-bit uses your canonical master PNGs by default: **0 image-generation calls**.
- Every other style calls OpenAI only when an asset is missing.
- Generated assets are saved under `cache/<style>/`.
- Reopening the lab reuses cached images.
- `Generate Missing` only makes calls for missing assets.
- `Clear Cache` deletes only that style's generated variants.
- To intentionally redo an image, clear that style cache first.

## Setup
Copy your existing OpenAI API key into a `.env` in this folder:

```env
OPENAI_API_KEY=your_real_key_here
OPENAI_IMAGE_MODEL=gpt-image-1
PORT=8798
```

Then run:
```powershell
npm install
node server.js
```

Open:
`http://localhost:8798`

Or double-click:
`START-STYLE-LAB.bat`

## Recommended test order
1. Click **Load Master Checkpoint**
2. Confirm the 64-bit card is immediately populated
3. Pick ONE target style first (PS2 is a good next test)
4. Click **Generate Missing**
5. Build that style's playable runtime
6. Only then move to another style

This protects API credit and isolates which style transforms are actually useful.
