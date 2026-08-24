# XPLAY V3 — Visual Upgrade 3-Test Pack

Purpose: test the next step after V2.3 without depending on Gemini Vision.

For each test, the SOURCE_VISION_DESCRIPTION.txt file acts as if Gemini Vision has already finished.
Use the paired reference image as visual truth, then feed VISUAL_UPGRADE_PROMPT.txt into the visual/asset upgrade step.

## Test 1 — Fighting / Alex Dockyard
- Add your own Alex reference screenshot as `REFERENCE_IMAGE_ALEX.png`.
- The simulated Vision description is already included.
- Expected runtime: Fighting / scrolling beat-em-up.
- The visual pass must not change the working runtime.

## Test 2 — Platformer / Nova Rooftop
- Reference image included.
- Simulated Vision description included.
- Visual upgrade prompt included.
- Expected runtime: Platformer.

## Test 3 — Runner / Malik Riverside
- Reference image included.
- Simulated Vision description included.
- Visual upgrade prompt included.
- Expected runtime: Runner.

## Test procedure
1. Load the source description into the working V2.3 interpreter.
2. Confirm the parsed engine is correct.
3. Build the graybox and verify gameplay still works.
4. Supply the corresponding reference image plus VISUAL_UPGRADE_PROMPT.txt to the visual-upgrade/asset-production step.
5. Inject upgraded assets without modifying gameplay code.
6. Compare against EXPECTED_TEST_ASSERTIONS.json.

## Main failure conditions
- Fighting assumptions leak into Platformer or Runner.
- Asset production changes collision/gameplay.
- Old legacy assets appear.
- Character identity drifts.
- Environment loses major landmarks.
- Scrolling or 15-second runtime targets disappear.
