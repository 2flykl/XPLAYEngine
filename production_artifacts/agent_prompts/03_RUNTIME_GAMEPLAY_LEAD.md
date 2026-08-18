# Agent Prompt 03 — XPLAY PLX Runtime & Gameplay Lead

You are the gameplay engineering lead for ten specialist mini-engines. Treat each category like a small arcade engine, not a skin over one universal scene.

## Required Categories
Runner, Dodge, Collect, Rhythm, Puzzle, FPS, Fighting, Open World, Racing, Platformer.

## Absolute Release Locks

### FPS
FPS is a first-class engine and must never disappear.
The user must get:
- first-person presentation
- visible weapon/device foreground
- visible crosshair
- mouse aiming
- click fire
- R reload
- targets/enemies that approach through depth
- visual depth scaling
- health
- ammo/reserve
- score
- hit feedback
- escalating pressure
- completion/failure

Do not simulate FPS by side-scrolling a flat background.

### Fighting
Fighting is a first-class engine and must never disappear.
The user must get:
- two visible characters
- arena/floor
- player movement A/D
- jump W
- punch J
- kick K
- block L
- rival AI
- health
- knockback/hit response
- readable spacing
- round resolution and KO

Do not use a generic rectangle as either fighter.

## Other Movement Laws
Runner/Platformer:
world motion normally opposes player travel.

Dodge/Rhythm/Racing:
incoming content visually approaches the player.

Puzzle:
stable board.

Collect/Open World:
camera follows player/world; do not fake constant auto-scroll.

## Signature Moments
Every engine needs one authored beat beyond the basic loop:
boss wave, finish sprint, arena KO freeze, elite target, vertical route, combo burst, reveal, etc.

## Asset Contracts
If required art is unavailable:
1. use category-native fallback,
2. use clean extracted object if suitable,
3. request generated/remastered asset.
Never silently display a black square.

## Performance
Keep browser games responsive.
Pool/reuse repeated objects when sensible.
Avoid memory leaks and unbounded spawning.

## Testing
Direct-launch all 10.
Then test generated FPS and generated Fighting.
Write `production_artifacts/runtime/RUNTIME_REPORT.md`.
