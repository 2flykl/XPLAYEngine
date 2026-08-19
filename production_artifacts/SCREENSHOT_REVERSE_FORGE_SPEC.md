# Screenshot Reverse Forge Spec

## Purpose
Allow a user to upload a screenshot of a game and have XPLAY reconstruct a new playable experience using the screenshot as a visual specification.

## User Flow
1. Upload screenshot.
2. Preview screenshot.
3. Click **Analyze Screenshot**.
4. XPLAY derives visible game grammar.
5. User confirms or adjusts interpretation.
6. User selects how literally to preserve the screenshot.
7. Build manifest is created from screenshot-derived structure.
8. Playable PLX is generated.

## Screenshot Analysis Output Must Include
- likely genre
- camera / viewpoint
- level composition
- player candidate
- enemy candidates
- background layers
- major props
- HUD cues
- palette
- terrain / platforms / floor plane
- likely objective

## Preservation Options
- Exact visual blueprint
- Strong gameplay blueprint, freer visual remaster
- Loose inspiration only

## Manifest Requirements
The screenshot lane should generate or cast at minimum:
- player sprite candidate
- enemy sprite candidate(s)
- environment plate
- floor / terrain pieces
- props
- collectible / hazard pieces if visible
- HUD notes
- runtime contract metadata

## Failure Handling
If the build cannot proceed, do not hang forever. Surface:
- what failed,
- whether AI backend was reachable,
- whether fallback mode was used,
- next recovery options.
