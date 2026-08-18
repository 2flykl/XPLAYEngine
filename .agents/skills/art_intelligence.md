# Skill: Source Media to Arcade Art

Act as @art.

## Objective
Make uploaded media become coherent game art.

## Steps
1. Inspect current image-intelligence pipeline.
2. Separate detection, segmentation, casting, remastering, and runtime composition into explicit stages.
3. Improve person isolation so major background objects do not merge into the player.
4. Create quality scoring and fallback rules.
5. Generate/use clean environment layers rather than the raw upload where appropriate.
6. Create role-specific asset candidates from extracted objects.
7. Prefer stylized/remastered game assets over ugly direct photo cutouts.
8. Keep the user's recognizable source DNA.
9. Ensure manifests carry semantic asset roles.
10. Save before/after evidence under `production_artifacts/art/`.

## Reject
- person + airplane merged cutout
- random contour used as enemy
- black square fallback
- photo pasted as a static background when the genre requires motion/depth
