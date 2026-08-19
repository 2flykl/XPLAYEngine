# Live Card Capture Spec

## Purpose
Use actual or representative gameplay screenshots as the basis for library/feed cards.

## Rules
- A card should not be illustrated as a poster when a gameplay frame can be captured.
- If a PLX can launch, capture at least one showcase frame from it.
- If a build is incomplete, generate a representative gameplay frame using the same runtime contract and asset manifest.

## Capture Requirements
Each captured frame should try to include:
- player character visible,
- environment structure,
- challenge/hazard/enemy,
- collectible/objective when appropriate,
- enough readable context to identify genre.

## Capture Targets by Category
- FPS: weapon + crosshair + enemy depth + target geometry
- Fighting: two fighters + arena plane + HUD or hit moment
- Runner: forward movement + collectibles/hazards + terrain rhythm
- Dodge: threat pattern + navigable safe space
- Collect: player + pickups + traversal path
- Rhythm: note lanes + performer + timing targets
- Puzzle: board state + active pieces + objective clarity
- Open World: traversable environment + player + POI / quest signal
- Racing: vehicle + lane structure + sense of motion
- Platformer: jumps, platforms, enemies, coins/goal cues

## Output Rule
Cards in the library/feed should prefer:
1. real runtime screenshot,
2. representative gameplay frame rendered from the same manifest,
3. only lastly, a fallback composition explicitly marked as such.
