# XPLAY V7 — Screenshot → Game / Reverse Forge Test

This build keeps the existing XPLAY creation process intact and adds a second creation lane on Step 1.

## New test lane
**Create → Screenshot → Game TEST**

The user can upload a screenshot/mockup and provide optional reconstruction guidance:
- Exact visual blueprint / Strong reference / Loose inspiration
- Preserve: layout, art style, character, camera, HUD, enemy placement, palette, level structure
- Camera/viewpoint lock
- Playable-character source
- Game objective
- Do-not-change anchors
- Motion/patrol hints

XPLAY then uses the existing image-analysis pipeline plus a new `ScreenshotReconstructionDirector` to generate a reconstruction-constrained prompt for the existing specialist Director, Production Art Forge and manifest compiler.

## Important
This is an additive test feature. The original Upload → Analyze → Game Type → Description → Feel → Style → Extra Media → HTML → Review flow remains available and unchanged.

## Test
1. Run the app normally.
2. Open **Create**.
3. Choose **Screenshot → Game TEST**.
4. Upload a gameplay screenshot or game concept mockup.
5. Confirm/adjust the AI interpretation and screenshot locks.
6. Continue through the normal XPLAY creation flow and build.
7. Open Build Diagnostics to confirm `Reverse Forge visual-spec lock enabled` appears.

The final manifest includes a `reverseForge` block containing the screenshot reconstruction guide and generated visual-spec prompt.
