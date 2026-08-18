XPLAY PLX ENGINE 2.9 — DIRECTOR STUDIO DOUBLE GULP

THE ARCHITECTURAL CHANGE
XPLAY is no longer modeled as one generic game generator.
It is modeled as a shared AI production studio with 10 specialist game directors.

Each director owns:
- camera contract
- movement model
- world-scroll law
- required asset roles
- mechanics
- signature moments
- quality rules

The shared studio owns:
1. Prompt calibration
2. Source understanding / extraction
3. Specialist director selection
4. Production blueprint
5. Asset casting and art
6. PLX compilation
7. Automated critic
8. Auto-repair
9. Runtime
10. Export

WHY THIS IS MORE LIKE THE SUCCESSFUL ONE-SHOT ZIP WORKFLOW
A one-shot succeeds because many creative decisions are made before runtime.
2.9 makes those decisions explicit in a Production Blueprint instead of asking a generic scene to improvise everything.

FPS IS FIRST-CLASS
Library ID: frontline
Engine: fps
Scene: src/scenes/FPSScene.js
Controls: mouse aim / click fire / R reload
Verified required assets: background, enemy, crosshair, weapon, hitfx
Gameplay: depth-scaling enemy approach, ammo, reload, health, score, elite targets

FIGHTING IS FIRST-CLASS
Library ID: streetclash
Engine: fighting
Scene: src/scenes/FightingScene.js
Controls: A/D move / W jump / J punch / K kick / L block
Verified required assets: player, rival, arena floor, background
Gameplay: two fighters, floor physics, enemy AI, punch/kick/block, health, round timer, KO

RUN
1. npm install
2. npm run verify:plx
3. npm run dev

Or use DIRECTOR-STUDIO-START.bat.

WHAT TO TEST FIRST
- Launch Frontline Echo directly from first library card.
- Launch Street Clash directly from second library card.
- Generate: "first person shooter inside an airport..."
- Generate: "one-on-one fighting game outside a hangar..."
- Generate your airport runner/dodge prompt and compare scrolling behavior.

NEXT ANTICIPATED GULP
The next major threshold is not adding more genres.
It is an asynchronous Art Department:
- semantic role casting
- multiple generated candidate assets per role
- critic ranks candidates
- consistent character pose generation
- level-specific prop packs
- automated screenshot critic that visually inspects the running PLX
- regenerate only the failed part rather than rebuilding the whole game
