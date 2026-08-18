XPLAY PLX ENGINE 2.6 — FLUX LIBRARY

WHAT CHANGED
- Flux is integrated into all 10 built-in PLX demos.
- Runtime preloads category-specific Flux animations from the Double Gulp asset pack.
- Library cards use Flux showcase art.
- Built-in demos use layered Flux environment kits instead of generic backgrounds.
- Rhythm and Puzzle now feature reactive Flux avatars.
- FPS features a Flux action avatar.
- Runner, Dodge, Collect, Fighting, Open World, Racing and Platformer animate Flux directly.
- Full 300 speculative frames per category remain included under public/flux-pack.
- API health check is delayed/retried to avoid the harmless startup proxy race shown in the terminal.

INSTALL / REPLACE
1. Stop the current dev server with Ctrl+C.
2. Replace the contents of your xplay-plx-engine folder with this package.
3. Run npm install.
4. Run npm run dev.
5. Open http://localhost:5173 and hard refresh Ctrl+Shift+R.

You do NOT need to move the Flux folders into the project root anymore. They now live under public/flux-pack where Vite can serve them cleanly.
