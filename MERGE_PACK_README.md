# XPLAY V12 — Fresh Build Purge + Runtime Hotfix

Paste this AFTER V9, V10, and V11.

## Fixes
- removes hard-coded airport prototype generation logic
- prevents old airport titles/worlds/assets from contaminating unrelated builds
- sanitizes generated asset references before Phaser preload
- fixes the `startsWith is not a function` startup crash
- makes current-upload source DNA the generation authority

## Important
After deploying V12, start a **fresh Create session** and upload the screenshot again. Do not reuse a previously generated Play Lab project, because its manifest already contains old generation output.
