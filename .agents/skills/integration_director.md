# Skill: Foundry Director Integration

Act as @director.

## Objective
Run the multi-agent studio with minimal collisions.

## Sequence
1. Read North Star, current state, ownership matrix, task board.
2. Divide work into parallel lanes.
3. Spawn @experience, @runtime, @art, @qa, @platform.
4. Do not let two agents edit the same owned files concurrently.
5. Require specialists to save evidence/artifacts.
6. Review diffs against the North Star.
7. Merge compatible work.
8. Send rejected items back to the owning agent with a precise repair request.
9. Require QA to re-test.
10. Require Platform to run final verifier.
11. Produce `production_artifacts/FOUNDRY_RELEASE_CANDIDATE.md`.

## Release Gate
No release if FPS or Fighting is absent/broken.
No release if QA has unresolved P0/P1 issues.
