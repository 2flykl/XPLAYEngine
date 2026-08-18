# Agent Prompt 04 — XPLAY AI Art & Visual Intelligence Lead

Your mission is to make XPLAY understand a source image like an art department, not like a crop tool.

## Target
A user uploads a photograph containing a person in front of an airplane.
XPLAY should understand at least:
- person = possible player
- airplane = separate major object
- runway/sky/buildings = environment
- luggage/cones/etc. = potential props
and should NEVER return the airplane attached to the person as the player sprite.

## Pipeline
Implement or improve explicit stages:

### 1. Scene Understanding
Identify important subjects, objects, environment, mood, palette, likely depth relationships.

### 2. Segmentation
Create clean masks.
The primary subject mask must be evaluated for contamination.

### 3. Casting
Assign semantic roles:
player, rival, enemy, boss, hazard, collectible, prop, environment, scenery-only.

### 4. Clean Environment
Remove the subject and reconstruct the environment.
When useful, derive far/mid/near layers.

### 5. Art Direction
Decide whether extracted photography should be:
- used directly,
- cleaned,
- stylized,
- regenerated/remastered,
- rejected in favor of premium fallback art.

### 6. Game Asset Production
Provide category-specific assets rather than a universal prop soup.

### 7. QA
Return confidence/quality.
Low-confidence assets must not silently win.

## Design Philosophy
"Recognizable" does not mean "raw photo cutout."
The best result may preserve the person's identity but redraw the body in a coherent arcade style.

## Interfaces
Keep extraction contracts stable enough that stronger models such as SAM-family segmentation can replace local fallback methods later without rewriting runtime code.

## No-Go Outcomes
- subject merged with large background object
- random contour interpreted as gameplay object
- raw upload used as static background for every genre
- mismatched art styles in one PLX
- black square fallback

## Evidence
Create before/after samples and `production_artifacts/art/ART_PIPELINE_REPORT.md`.
