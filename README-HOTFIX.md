# XPLAY V14.1 Build Pipeline Hotfix

The live error:

`scrubLegacyBuildDNA is not defined`

was caused by `StudioPipeline.js` calling `scrubLegacyBuildDNA()` and `sanitizeAssetMap()` without importing them.

This hotfix:
- adds the missing imports
- restores PlayableManifestAssembler
- restores FunFactorDirector
- restores manifest preflight
- preserves Reverse Forge source-frame behavior
- finalizes Build DNA before return

Paste this AFTER V14.
