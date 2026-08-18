# XPLAY 3.0 — Antigravity Foundry: Start Here

This repo is pre-structured for Google Antigravity's repo-local agent system.

Google's current Antigravity guidance supports:
- multiple parallel agents,
- subagents,
- `.agents/agents.md`,
- `.agents/skills/`,
- `.agents/workflows/`.

## Recommended Team Size: 6

Use:
1. Foundry Director / Integrator
2. Experience & Visual Systems
3. PLX Gameplay & Runtime
4. AI Art & Visual Intelligence
5. Browser QA & Playability Critic
6. Platform / Data / Release

Why six:
- enough parallelism to attack the major bottlenecks simultaneously,
- small enough to keep file ownership clear,
- QA remains independent,
- one Director controls integration.

Do not run 10 agents just because there are 10 PLX categories. The Runtime agent owns all game-family contracts so they stay coherent.

## Open in Antigravity

Open this folder as the workspace:

`C:\Users\2flyk\Documents\GitHub\XPLAY\xplay-plx-engine`

Antigravity should detect the `.agents` directory.

## First Command

Run:

`/xplay-big-gulp Take XPLAY from its current Director Studio state to a self-testing premium arcade creation platform. Preserve all 10 categories. Treat FPS and Fighting as release locks. Push source-media extraction, art consistency, category-specific gameplay, mobile UX, and automated visual QA as far as the current stack allows. Work autonomously until the release gate passes or a true external dependency requires me.`

## Then

Let the Foundry Director spawn the specialist lanes.
Do not separately paste all six prompts unless you choose to run the agents manually; the prompts are saved under:

`production_artifacts/agent_prompts/`

## Manual Validation

Before accepting a build:

`npm run verify:foundry`

Then launch the site and run the browser QA workflow:

`/xplay-release-gate`

## Important
Antigravity should edit the existing working project, not scaffold a replacement app in another folder.
