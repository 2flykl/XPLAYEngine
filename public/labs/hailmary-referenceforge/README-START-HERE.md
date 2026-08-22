# XPLAY Hail Mary ReferenceForge Lab

## What this is
A standalone **final lab test** that pushes farther than the earlier labs:

1. **Loads one reference screenshot**
2. **Uses only the current description + current packet**
3. **Extracts visible crops** (HUD, Alex, enemies, prop zones, stage)
4. **Generates transparent proxy cutouts**
5. **Creates a lightweight clean plate / inpaint proxy**
6. **Extends the scene into a scrolling dockyard world**
7. **Builds proxy sprite sheets from the extracted cutouts**
8. **Runs a playable beat-em-up runtime**

## Important
This package is meant to be used as a **test lab**, not as a blind overwrite of your entire site.

## Where to place it
Copy the included `XPLAYEngine` folder into your repo root so it merges with your project.

That will place the lab here:

`XPLAYEngine/public/labs/hailmary-referenceforge/`

## Open the lab
Open:

`/labs/hailmary-referenceforge/index.html`

## Controls
- Move: WASD or Arrow Keys
- Attack: Space
- Reset: R

## What to look for
- Does the screenshot load immediately?
- Do the extracted crops appear?
- Do the transparent character cutouts appear?
- Does the clean plate appear?
- Does the world extend sideways?
- Does the runtime play with slower pacing than before?

## Design goal
This is a **hail mary**: extraction, simple cutout, pseudo-inpaint, world extension, sprite-sheet proxy generation, and playable runtime all in one lab.

