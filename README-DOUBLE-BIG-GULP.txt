XPLAY — PLX ENGINE 1.5 / DOUBLE BIG GULP

THIS PACKAGE JUMPS TWO PHASES AT ONCE.

GULP 1 — CREATOR PIPELINE
- Create PLX studio inside the real Phaser/Vite app
- image upload
- browser Style DNA analysis
- local Creative Director
- optional OpenAI Director hook
- local image-derived asset pack
- manifest assembly
- immediate playable preview
- .PLX ZIP export

GULP 2 — PRODUCTION BACKEND FOUNDATION
- local Express API server
- OpenAI Responses API hook (server-side only)
- image-generation hook ready
- Supabase project service
- expanded Supabase SQL schema
- projects / versions / assets / plays
- private storage bucket
- Vite proxy
- cloud/backend status screen
- local fallback continues to work without keys

FAST INSTALL
1. Stop the current Vite server with Ctrl+C.
2. Copy this package over your xplay-plx-engine repo (replace existing project files).
3. Double-click DOUBLE-BIG-GULP-INSTALL.bat
   OR run:
      npm install
      npm run dev
4. Open http://localhost:5173

TEST THE BIG GULP
- Built-in PLXs should still work.
- Click Create PLX.
- Upload an image.
- Type an idea.
- Direct + Build PLX.
- Play Generated Draft.
- Export .PLX Package.

NO SECRETS REQUIRED FOR THIS TEST.

WHEN READY FOR SUPABASE
- run supabase-schema.sql in the Supabase SQL Editor
- copy .env.local.example to .env.local
- add only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

WHEN READY FOR REAL AI
- copy server/.env.example to server/.env
- set OPENAI_API_KEY privately on your machine
- set OPENAI_MODEL to an API model available to your account
- do not put OPENAI_API_KEY in Vite/frontend code
