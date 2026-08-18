XPLAY PLX ENGINE 2.8 — ARCADE CALIBRATION GULP

Corrections in this build:
- Explicitly exposes all 10 PLX categories: Runner, Dodge, Collect, Rhythm, Puzzle, FPS, Fighting, Open World, Racing, Platformer.
- Corrects environment movement profiles by engine instead of horizontally scrolling every background.
- Adds layered far/mid/near environment paths to built-in PLX manifests.
- Replaces visible generic/black placeholder gameplay objects with themed arcade fallback assets.
- Generated games only trust extracted object cutouts when Visual Intelligence quality is strong; otherwise use themed game art.
- Adds Calibrate Prompt button. It rewrites a plain-language idea into an engine-aware generation brief.
- Calibrator uses OpenAI Director when configured, but has a full local fallback so the button works without an API key.

SCROLL PROFILES
Runner / Platformer: world left as player advances right.
Dodge / Rhythm / Racing: world down toward player.
FPS / Fighting / Puzzle: no arbitrary auto-scroll.
Collect / Open World: movement follows player/camera.