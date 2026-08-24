# XPLAY Screenshot → Blender World Lab

This isolated test contains **three reference screenshots**, **three Scene Rig JSON files**, and **three navigable GLB environments**.

## Purpose
Validate the spatial-test workflow before spending time on photorealism:
1. reference screenshot
2. structured Scene Rig
3. GLB world
4. first-person browser traversal
5. persistent landmark identity / coordinates

## Environments
- Suburban Boulevard
- Desert Outpost
- Neon Industrial District

## Run
Double-click `START_TEST.bat`, or run:

    node server.js

Then open:

    http://localhost:8788/

Do not open `index.html` with `file://`.

## Controls
- WASD: move
- Shift: sprint
- Mouse: look (click world for pointer lock)
- Esc: release mouse
- Reset Player: return to the Scene Rig spawn
- Collision Debug: show obstacle bounds + landmark anchors

## Validation modes
- REFERENCE: view the source test screenshot
- MATCH: overlays the reference screenshot over the first-person view for rough perspective comparison
- PLAY: normal walkable environment

## What this proves
The browser loads actual GLB files, not a JavaScript-built replacement world. The Scene Rig JSON stores player start and landmark identities independently of the GLB.

## Important limitation
These three worlds are **controlled baseline test scenes** packaged to validate the XPLAY comparison/runtime harness. They are not evidence that an AI vision model independently inferred every coordinate from the screenshots. The next Antigravity/Blender MCP step is to regenerate each GLB from its Scene Rig automatically, then later generate the Scene Rig itself from uploaded screenshots.

Recommended next pipeline:

Screenshot → Vision/Scene Rig → Blender MCP → geometry → style/material pass → GLB → XPLAY runtime.
