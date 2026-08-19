# XPLAY World Forge v2 — handoff

This package replaces the first World Forge proof with a denser runtime-ready forge and flagship scene integration.

## Core upgrades
- 24 coherent terrain variants per generated world kit.
- 18 prop assets, 4 hazard families, 3 collectible families, 3 enemy families.
- 4 manufactured parallax/environment layers plus runtime foreground dressing.
- World Kit metadata attached to every finished manifest.
- Runner and Platformer now consume the generated world-kit asset families instead of repeating one platform/hazard image.
- Runner includes layered runway dressing, three ambient motion systems, premium collectible arcs, and a natural signature aircraft flyover.
- Platformer now uses authored ground sections, gaps, upper routes, prop density, multiple enemy visuals, collectibles, ambient movement, and a signature event.
- Fighting now presents a denser arena, larger fighters, impact bursts, camera reactions, a chargeable special attack, and environmental motion.
- FPS now builds a pseudo-3D runway approach, varied enemy families, environment props, weapon recoil/reload motion, and a naturally triggered signature wave.
- Visual quality scoring no longer awards fixed 85/90 scores just because keys exist. It audits actual world-kit counts and production contracts.
- GitHub Pages workflow no longer rewrites src/main.js during deployment.

## Validation performed in this package
- `npm run verify:foundry` — PASS
- `npm run verify:rc` — PASS
- `node --check` on every modified JS file — PASS

`npm run build` could not be completed inside the packaging sandbox because the uploaded Windows `node_modules` lacked Rollup's Linux optional binary and the sandbox could not complete a clean npm install. The GitHub workflow already performs a clean Linux install before building, which is the correct deployment path.
