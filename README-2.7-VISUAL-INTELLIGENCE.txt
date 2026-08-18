XPLAY PLX ENGINE 2.7 — VISUAL INTELLIGENCE BIG GULP

GOAL
Push the current system to a much higher threshold than "photo pasted as background + rough crop".

WHAT CHANGED
1. NEW PYTHON COMPUTER-VISION TIER (port 8790)
   - face-seeded subject isolation
   - GrabCut segmentation
   - connected-component cleanup to reduce subject + airplane/background merging
   - transparent subject cutout
   - clean-plate background reconstruction
   - far/mid/near parallax-ready layers
   - object proposals with isolated alpha crops
   - palette + extraction quality score

2. NEW VISUAL INTELLIGENCE REVIEW IN CREATOR
   You can now inspect:
   - isolated subject
   - segmentation mask
   - cleaned environment
   - parallax layers
   - object candidates
   - extraction confidence
   BEFORE the PLX is considered ready.

3. QUALITY GATE
   Weak extraction is surfaced instead of silently being used as "finished" art.

4. GENERATED PLX PLAYER
   Generated experiences use the extracted/remastered source subject instead of automatically forcing Flux into the player slot.
   Flux remains the mascot/reference character for the built-in PLX Library.

5. ENVIRONMENT HANDLING
   The raw uploaded photo is no longer the preferred runtime background.
   The pipeline uses a cleaned environment and attaches far/mid/near layers to the manifest.
   Several runtime families now render those as parallax layers.

6. OPTIONAL AI ART REMASTER
   With OPENAI_API_KEY + OPENAI_IMAGE_MODEL configured, the Creator can send the CLEAN isolated subject to the image edit/remaster route.
   This is specifically meant to turn a clean source subject into more unified arcade game art instead of using a raw photo cutout.

ONE-CLICK START
Double-click: BIG-GULP-START.bat
It starts the Python vision service in a second window, installs/updates Node packages, and launches XPLAY.
Open http://localhost:5173

MANUAL START
Window 1:
  cd vision-service
  python -m pip install -r requirements.txt
  python -m uvicorn app:app --host 127.0.0.1 --port 8790

Window 2:
  npm install
  npm run dev

OPTIONAL HIGH-END CONFIG
Copy .env.example to .env and add your API key.
The build is currently prepared for:
  OPENAI_MODEL=gpt-5.6-luna
  OPENAI_IMAGE_MODEL=gpt-image-2

REALITY CHECK
This local OpenCV tier is substantially better than the old center crop and creates a real provider boundary.
It is not claiming to outperform dedicated SAM2/Grounded-SAM segmentation on every photo. The next production replacement can swap into the same /analyze contract without rewriting PLX scenes.

WHY THIS IS A THRESHOLD TEST
This package adds a second language/runtime (Python), a real image-intelligence service, quality control, clean plates, layered scenes, subject isolation, object proposals, source-subject runtime support, and optional generative remastering — while preserving the existing Phaser/Node/Supabase/Flux architecture.
