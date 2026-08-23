# XPLAY Parsed Packet Style Side Test

This lab starts from your **already parsed** checkpoint.

It does **not** rerun OpenAI Vision.
It uses these saved source files directly:
- `master/packet.json`
- `master/blueprint.json`
- `master/stage.png`
- `master/alex-sheet.png`
- `master/enemy-atlas.png`

## What this test does
- Treats the parsed packet as the locked truth.
- Treats the blueprint as the interpreter/runtime source.
- Lets you build from the same starting assets into multiple styles.
- Lets you test a lightweight playable runtime for each style.

## Included styles
1. Source / 64-bit
2. PlayStation 2 Era
3. HD Remaster
4. Modern Stylized PC
5. Modern Realistic PC

## API usage behavior
- **Source / 64-bit** uses the current working assets directly with **zero new image-generation calls**.
- Other styles only use OpenAI image generation when you click their generation buttons.
- Generated variants are cached in `cache/<style>/`.
- Reopening the lab reuses cached files.
- `Generate Missing` only creates assets that do not exist yet.
- `Clear Cache` deletes only that style's cached variants.

## Setup
Create a `.env` file in this folder using `.env.example` as your guide:

```env
OPENAI_API_KEY=your_real_key_here
OPENAI_IMAGE_MODEL=gpt-image-1
PORT=8808
```

## Run
```powershell
npm install
node server.js
```

Open:
`http://localhost:8808`

Or double-click:
`START-PARSED-STYLE-SIDE-TEST.bat`

## Suggested testing order
1. Start the server.
2. Click **Load Parsed Checkpoint**.
3. Confirm the **Source / 64-bit** style is populated immediately.
4. Test the 64-bit playable first.
5. Then choose one new style (PS2 is a good next test).
6. Click **Generate Missing** for that style.
7. Build that style's playable.

That approach keeps credit usage under control while still letting you test the different reinterpretations from the same parsed checkpoint.
