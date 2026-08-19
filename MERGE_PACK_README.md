# XPLAY V14 — Beast Orchestrator All-in-One Merge Pack

This is the consolidation pass.

It includes the critical V13 backend/runtime stability files PLUS the new Build DNA orchestration layer.

## What it is designed to prevent
- old airplane-test assets leaking into new builds
- one agent deciding a different genre than another agent
- stale assets from previous generations
- malformed asset values crashing all Phaser games
- generated animation metadata crashing runtime
- GitHub Pages pretending it has a local AI backend
- Flux silently becoming every game's player
- successful “builds” that never become playable

## New core concept
Every generation gets one structured `Build DNA` and one `buildId`.
All beasts work from that same contract.

## Paste
If V9–V12 are already applied, paste V14 on top.
V14 supersedes the separate V13 merge pack.

Then have Antigravity execute `ANTIGRAVITY_V14_COMMAND.txt`.

## Backend
For real semantic screenshot analysis on GitHub Pages, configure:
`VITE_XPLAY_API_BASE_URL=https://YOUR-XPLAY-BACKEND`
