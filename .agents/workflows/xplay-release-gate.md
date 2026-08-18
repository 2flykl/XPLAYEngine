---
description: Run the XPLAY Foundry release gate and reject broken categories, placeholders, or failed QA
---

Act as @director.
Run `npm run verify:foundry`.
Then invoke @qa for browser checks and @platform for packaging checks.

Reject release if:
- fewer than 10 categories
- FPS or Fighting missing/broken
- black placeholder squares in normal gameplay
- category motion law visibly wrong
- Create PLX or Calibrate Prompt broken
- mobile page prevents necessary scrolling
- P0/P1 issue unresolved
