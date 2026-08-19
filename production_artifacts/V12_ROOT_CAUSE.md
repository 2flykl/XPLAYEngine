# V12 Root Cause

Two separate failures were exposed by the live test.

## 1. `b.startsWith is not a function`
`BasePLXScene.asset()` assumed every manifest asset was a string. Some generated asset values are arrays or objects. Phaser preload passed them through and the path resolver called `.startsWith()` on a non-string value.

V12 normalizes asset values before loading:
- string -> use directly
- array -> first usable reference
- object -> image/url/src/dataUrl/path
- unusable value -> skip safely

## 2. Old airport prototype DNA was still live code
`LocalDirector.js` still contained hard-coded airport titles, worlds, collectibles, and hazards such as:
- Airport District
- Runway Rush
- Airfield Zero
- Hangar Clash
- airport access cards
- restricted-zone patrols

`StudioPipeline.js` also passed `airportTheme` into World Forge.

V12 removes that prototype special-casing from the generation path. New builds bind to the current upload and current visual analysis.
