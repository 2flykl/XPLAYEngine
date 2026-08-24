# XPLAY Open World FPV Side Test

A side test that lets you:
- upload a **single screenshot**
- seed a **first-person open-world exploration test** from it
- **extend the world** as you move
- **remember placement** of landmarks and generated objects
- save/load the world memory locally

## What it is
This is a **prototype lab** for testing the concept, not the final production beast.
It does **not** call an AI model.
Instead, it uses your uploaded screenshot to:
- sample sky / mid / ground color and texture bands
- create a seeded world generator
- let you stamp landmark crops from the screenshot into the world
- keep object and landmark placement persistent via local storage

## Start
1. Extract the folder.
2. Open a terminal in this folder.
3. Run:
   ```bash
   npm start
   ```
   or double-click `START-HERE.bat`
4. Open `http://localhost:8855`

## Suggested workflow
1. Upload screenshot.
2. Click **Generate / Reset World**.
3. Use **Landmark Mode** and click the screenshot preview to capture landmark crops.
4. Click on the world view to place landmark anchors.
5. Explore with `WASD`, rotate with `Q/E`, or hold right mouse / drag.
6. Click **Save Memory** when satisfied.

## Controls
- `W` / `S` = move forward / backward
- `A` / `D` = strafe left / right
- `Q` / `E` = rotate left / right
- mouse drag on main view = look around
- click world while **Place Landmark** is armed = place selected landmark

## Files
- `public/index.html` – app shell
- `public/style.css` – styling
- `public/app.js` – world generation, memory, rendering
- `server.js` – tiny static server

## Notes
- The world is **procedurally extended** in chunks around the player.
- Landmark placement and chunk contents are saved in `localStorage`.
- If you want a new test, use **Generate / Reset World**.
