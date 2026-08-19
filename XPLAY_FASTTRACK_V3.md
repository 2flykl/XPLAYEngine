# XPLAY Fast Track v3 — Production Art + World Math

This pass moves XPLAY beyond "more procedural detail" and adds two production lanes:

1. **Deterministic local World Forge** for GitHub Pages/offline play.
2. **Optional AI Production Art Forge** when the local XPLAY API has an image model configured.

## New systems

- `src/core/WorldMath.js`
  - seeded FNV/Mulberry PRNG
  - multi-octave fBm texture noise
  - logistic difficulty curves
  - reaction-time-safe obstacle spacing
  - Poisson-disc 1D placement
  - entropy-weighted asset selection
  - composition scoring
  - depth power-law parallax factors

- `src/core/LevelComposer.js`
  - deterministic Runner and Platformer authoring
  - safe intro + escalating middle + signature + finish
  - collectible arcs, alternate routes, Poisson-spaced enemies and props

- `src/services/worldArtForge.js`
  - calls `/api/forge-art-pack` only when a local API is available
  - slices 4x4 AI sprite/tile/prop/actor sheets into runtime-ready assets
  - creates generated animation maps for the player

- `server/index.js`
  - new `/api/forge-art-pack` endpoint
  - parallel coherent generation of background, 4x4 player sheet, tileset, props, actors
  - one locked style language across the entire pack

- `src/core/VisualFrameCritic.js`
  - evaluates ACTUAL rendered Phaser pixels
  - luminance entropy
  - edge density
  - spatial occupancy
  - local variation
  - color diversity
  - prototype-likeness score

## Runtime upgrades

- AI generated player state frames can now animate in `BasePLXScene`.
- Parallax speed now uses a depth power law instead of three arbitrary constants.
- Runner uses deterministic authored spawn schedules instead of `Math.random()` gameplay generation.
- Platformer geometry is generated from a constraint composer instead of hard-coded coordinate lists.
- `PLXRuntime.analyzeCurrentFrame()` exposes real rendered-frame quality metrics.

## Production-art behavior

When `OPENAI_API_KEY` and `OPENAI_IMAGE_MODEL` are configured on the local XPLAY API, Create attempts a coherent batch art manufacture pass. If it succeeds, those generated sheets override local World Forge terrain/props/actors. If it is unavailable (including GitHub Pages), XPLAY continues with deterministic local assets.

This distinction is deliberate: **GitHub Pages is the player, not necessarily the art factory.**

## Verification

- JavaScript syntax checks: PASS
- `node scripts/verify-foundry.mjs`: PASS
- `node scripts/verify-rc.mjs`: PASS

A production `vite build` was not run in the artifact environment because dependencies are intentionally excluded from the clean ZIP. GitHub Actions performs a clean `npm install` before build.
