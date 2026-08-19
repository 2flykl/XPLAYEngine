# XPLAY V14 — Build DNA / Beast Orchestrator Master Guidance

## Director
Maintain one Build DNA per generation. Give every build a unique buildId. Reject stale outputs. Do not allow weak downstream agents to reinterpret high-confidence facts.

## Vision Beast
Return structured fields, not prose-only guesses:
genreSignals, camera, player, enemies, environment, objects, HUD, terrain/floor, palette, objective, confidence.
When uncertain, say uncertain.

## Game Grammar Beast
Convert visual evidence into mechanics:
player actions, enemy state machines, collision semantics, objective, win/fail, camera law, level flow.

## Art Beast
Manufacture only assets that satisfy the current Build DNA. Stamp every asset with buildId and role. Never reuse previous test assets unless explicitly requested.

## Assembly Beast
Run manifest preflight before Phaser. Normalize all asset refs and animation frames. Missing optional art may degrade gracefully; malformed values may not crash the whole site.

## Fun Beast
Add onboarding, first reward, first challenge, feedback, progressive difficulty, signature moment, finish/fail/retry.

## QA Beast
Play generated outputs. Capture screenshots. Compare runtime against source screenshot and Build DNA. Repair drift. Reject false success.

## Platform Beast
GitHub Pages is static. True semantic vision and generative art must use a configured backend. The frontend must know whether those capabilities exist instead of silently pretending.
