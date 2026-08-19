# XPLAY V5 — Gameplay-Aligned Visual Purge

This pass removes Flux from active PLX presentation and replaces the old library/timeline artboard dependency with gameplay-aligned specialist previews.

## Active changes
- No PLX scene loads or renders the Flux character pack.
- Every PLX engine gets its own generated fallback character/vehicle through `CharacterFactory.js`.
- Source-derived/generated characters still override the fallback when Creator art is available.
- Fighting now uses two distinct specialist characters rather than generic `player` / `enemy` art.
- Puzzle is now a real 8x8 match-3 game with swaps, matches, cascades and score chains.
- David's mock feed post is a match-3 puzzle and uses the same `thoughtlink` gameplay preview as the game it launches.
- All Explore cards use `public/plx/<id>/thumb.svg` gameplay previews; old library artboards are no longer referenced.
- All mock feed covers use the corresponding PLX gameplay preview; old `social/posts/*.jpg` covers are removed.
- Ten new gameplay-like preview boards were created, one per engine.
- New genre-specific showcase environment layers live under `public/showcase/<engine>/`.
- Built-in manifests no longer declare Flux Edition metadata or Flux player art.
- Built-in manifests use genre-specific showcase parallax and include a unique-character policy.

## Quality / verification
- `npm run verify:foundry` — PASS
- `npm run verify:rc` — PASS
- `npm run verify:fasttrack` — PASS
- `node --check` across `src/**/*.js` — PASS

`vite build` could not run inside the packaging sandbox because the uploaded `node_modules` contains Windows Rollup binaries. GitHub Actions performs a clean Linux install and is the correct build environment.
