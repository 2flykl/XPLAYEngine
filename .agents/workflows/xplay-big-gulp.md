---
description: Run the full XPLAY six-agent Foundry overhaul with parallel specialist lanes and release gates
---

When the user types `/xplay-big-gulp <goal>`, act as @director and execute `.agents/skills/integration_director.md`.

Use `<goal>` as the release objective.

### Parallelization
Spawn these work lanes in parallel after reading shared artifacts:
- @experience using `visual_experience.md`
- @runtime using `runtime_engines.md`
- @art using `art_intelligence.md`
- @platform using `platform_release.md`

After the first implementation wave:
- spawn @qa using `browser_critic.md`
- route every P0/P1 issue back to the owning agent
- re-run QA
- require @platform to run final verification

### Non-negotiable release lock
FPS and Fighting must both:
- appear in library
- be registered in runtime
- launch
- accept controls
- resolve win/fail/KO states
- use real themed assets

### User Interaction
Do not pause for routine implementation choices.
Ask only when a decision is irreversible, expensive, security-sensitive, or changes the product's core vision.

### Final Artifact
Write `production_artifacts/FOUNDRY_RELEASE_CANDIDATE.md` with:
- what changed
- test evidence
- remaining limitations
- next highest-leverage move
