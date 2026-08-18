XPLAY PLX ENGINE 1.7 — LIBRARY HOTFIX

WHAT WAS WRONG IN 1.6
The new cards were added to the library, but PLXRuntime.js still only registered the original
five engines. Clicking FPS / Fighting / Open World / Racing / Platformer therefore produced
an unknown-engine launch failure.

1.7 REBUILDS THE RUNTIME MAP EXPLICITLY AND REGISTERS ALL TEN ENGINES.

THE THREE IMPORTANT NEW DEMOS ARE ALSO DEEPER NOW:

FRONTLINE ECHO — FIRST-PERSON ACTION
- first-person aiming with mouse
- click to fire
- visible weapon
- ammunition + reload (R)
- health
- pseudo-3D enemies approaching the camera
- timed mission
- hit effects

STREET CLASH — ARCADE FIGHTER
- true side-view 1v1
- A / D movement
- W jump
- J punch
- K kick
- L block
- CPU opponent
- health bars
- round timer
- K.O. win states

DRIFTLANDS — URBAN FREE-ROAM
- map much larger than screen
- scrolling follow camera
- road grid + city districts
- buildings
- NPC population
- free movement
- relic quest
- district labels
- NPC proximity / E interaction

RACING + PLATFORMER remain included as additional early library gaps.

INSTALL THIS PACKAGE INSTEAD OF 1.6.
Stop server, replace project files, then:
npm install
npm run dev
