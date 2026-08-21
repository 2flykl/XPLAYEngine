XPLAY Asset Purge + Provenance Gate Patch

What changed
- Added a strict Asset Manifest Beast layer.
- Screenshot/reverse-forge builds now reject stale legacy assets such as jets, crosshairs, generic terrain sheets, and old prop packs.
- Assembled Assets now show only approved current-build runtime assets plus a small current-build reference section.
- Reverse-forge fighting builds no longer populate worldKit propKeys / terrainKeys with old generic packs.

Files changed
- src/core/AssetManifestBeast.js (new)
- src/core/StudioPipeline.js
- src/main.js

Intent
- Prevent old sheets from bleeding into the current screenshot-to-game build.
- Keep the current uploaded screenshot as the visual anchor.
- Make the asset review page cleaner and easier to trust.

Notes
- I validated the touched modules by importing them with Node.
- Full vite build was not executed in this environment because the bundled node_modules snapshot is missing an optional Rollup native dependency.
