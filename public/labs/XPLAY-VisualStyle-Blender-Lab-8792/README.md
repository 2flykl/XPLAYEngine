# IMPORTANT STARTUP NOTE

This is the **Visual Style → Blender** lab, not the older screenshot-to-blender lab.

Correct folder name:
`XPLAY-VisualStyle-Blender-Lab-8792`

Correct URL:
`http://localhost:8792/`

Double-click:
`START_VISUAL_BLENDER_LAB.bat`

If your console path contains:
`screenshot-to-blender-world-lab`

you are running the OLD 8791 lab.

---

# XPLAY Visual Style → Blender World Lab

Dedicated test port: **8792**

## Goal
Insert Blender after XPLAY's successful visual-style phase:

**Screenshot → Vision Truth → Visual Target → Scene Rig → Blender → GLB → Play**

## Run
Double-click `START_TEST.bat` and open `http://localhost:8792/`.

## Buttons / sequence
1. **CHOOSE SCREENSHOT**
2. **Vision Truth — START**
3. choose 64-bit / PS2 / HD Stylized / Modern / Modern Realistic
4. **Visual Target — START**
5. **Scene Rig — START**
6. **Blender Build — START**
7. **Load GLB — START**
8. **Playable Runtime — START**

Or use **RUN FULL PIPELINE**.

## Controls
WASD move · Mouse look · Shift sprint · Space jump · Esc releases mouse.

## Required local software
- Node.js
- Blender installed locally. The server searches `C:\Program Files\Blender Foundation\...\blender.exe`.
- If Blender is elsewhere, set environment variable `BLENDER_EXE` to the full `blender.exe` path.

## What is real in this proof
- local screenshot upload
- locked source packet
- era/style visual target
- Scene Rig generation
- Blender headless scene construction
- GLB export
- Three.js GLB loading
- first-person runtime

## Important architecture note
The Visual Target stage is deliberately the insertion point for the already-successful XPLAY visual lab. In this standalone package it uses local style emulation so the workflow can be tested without API keys. Replace that canvas output with the real AI-generated visual target later; the Blender / GLB / runtime stages do not need to change.
