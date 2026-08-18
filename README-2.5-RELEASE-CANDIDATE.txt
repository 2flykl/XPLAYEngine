XPLAY PLX ENGINE 2.5 — RELEASE CANDIDATE GULP

WHAT CHANGED

1. PLX LIBRARY
Every library card now has:
- Launch Demo
- Use this PLX

Use this PLX opens Create PLX and locks that engine as the generation foundation.

2. ALL 10 ENGINE FAMILIES ARE GENERATION-CAPABLE
- Runner
- Dodge
- Collect
- Rhythm
- Puzzle
- First-Person Shooter
- Fighting
- Open World
- Racing
- Platformer

The generated art contract now always creates the asset keys required by all ten runtimes.

3. VISUAL STYLE LIBRARY
Release-safe public style names are used in the UI:
- Cinematic Photo
- Mascot 64
- Speed 16
- Arcade 8
- Graphic Novel
- Block Sandbox
- Storybook Animation
- Retro Handheld

Each includes a temporary "test comparable" description so testers can understand the visual target without shipping trademark-dependent category names.

4. OVERLAY SYSTEM
- None
- Cinema
- Soft Vignette
- Light Scanlines
- CRT
- Comic Ink
- Soft Bloom
- Handheld Screen
- Film Grain
- VHS

5. PHOTOREALISTIC PATH
Cinematic Photo works offline by using the actual uploaded image as a composited scene layer and creating readable game assets over it.
For arbitrary newly-generated photorealistic characters / sprite sheets / enemies, connect the existing server-side OpenAI image generation hook.

6. READY-FOR-NEXT-PHASE STRUCTURE
The release candidate now separates:
- PLX gameplay family
- visual style
- overlay
- Style DNA
- art asset contract
- runtime manifest

This is important because one PLX family can now produce many visually distinct games without duplicating engine code.

INSTALL
Stop the old server with Ctrl+C.
Copy this package into xplay-plx-engine.
Then:
npm install
npm run dev
