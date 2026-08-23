# XPLAY Parsed Packet Style Build Matrix Lab

This lab starts **after** Vision. It uses the saved parsed packet, saved runtime blueprint, and current working 64-bit source assets.

## What this lab does
- **Does not call Vision**
- Uses the saved packet + blueprint as the shared logic checkpoint
- Uses the current 64-bit asset set as the canonical source
- Lets you generate alternate art directions from that same checkpoint
- Lets you build a small playable runtime for each style

## Included styles
- Source / 64-bit
- PlayStation 2 Era
- HD Remaster
- Modern Stylized PC
- Modern Realistic PC
- Photorealistic
- Pixar-style 3D
- Boondocks-style Cartoon
- Claymation

## API usage notes
- **Vision usage:** none in this lab
- **Source / 64-bit style:** zero image-generation calls
- **Any other style the first time you generate its Stage / Player / Enemies:** yes, that uses the image API
- **Cached styles after generation:** no extra API usage unless you clear cache and regenerate

## Start
1. Create a local `.env` file and set `OPENAI_API_KEY=...`
2. Optional: set `OPENAI_IMAGE_MODEL=gpt-image-1` (or your preferred compatible image model)
3. Open PowerShell in this folder
4. Run `npm install`
5. Run `node server.js`
6. Open `http://localhost:8812`

## Tip
If you only want to avoid usage and work from what you already have, use **Source / 64-bit** only.
If you want one new style, generate just that style's missing assets once, then keep reusing the cached result.

## V2 fix for Feature Animation / Urban Cartoon / Claymation
The three experimental style prompts were rewritten to be more model-friendly and less brittle.
The server now retries image edits with safer square output settings, and `Generate Missing` reports exactly which asset failed instead of making the whole style look like it never loaded.

If one asset fails, generate that individual asset button again; already-successful outputs stay cached and are not regenerated.
