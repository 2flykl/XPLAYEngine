# XPLAY Style Divergence Lab V3

## Why this version exists
The previous matrix preserved the source too aggressively, so many generated variants looked like the same 64-bit graphics.

V3 changes the contract:

**Preserve structure, identity, pose grid, landmark placement and gameplay logic — but completely re-render the visual language.**

## Styles
- Source / 64-bit
- PlayStation 2 Era
- HD Remaster
- Modern Stylized PC
- Modern Realistic PC
- Photorealistic
- Feature Animation 3D
- Urban Anime-Inspired Cartoon
- Claymation / Stop-Motion

## IMPORTANT
This zip intentionally starts with an EMPTY `cache/` folder so old same-looking generations do not contaminate the test.

For any style that already exists on your computer from an older lab, either use this fresh V3 folder or click **Force Re-render Style**.

## API usage
- Loading packet/blueprint: **0 API usage**
- Building/replaying runtime from cached assets: **0 API usage**
- Source / 64-bit: **0 image API usage**
- Generating a new Stage / Player / Enemies variant: **1 image call per asset**
- **Generate Missing**: only calls for missing assets
- **Force Re-render Style**: intentionally makes up to 3 new image calls (stage + player + enemies)

## Run
Use a fresh port to avoid your other XPLAY labs:

```powershell
$env:PORT=8824
node server.js
```

Then open:

```text
http://localhost:8824
```

Your API key can still be loaded from your main XPLAY `server/.env` if the env patch is present in your local copy. If startup says `Key configured: false`, copy your OpenAI key into a `.env` in this V3 folder.
