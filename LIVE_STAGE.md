# XPLAY Live Stage

The Release Candidate is configured to publish a static showcase to GitHub Pages.

## Expected Stage URL

If the GitHub repository is named `XPLAY` under `2flykl`:

**https://2flykl.github.io/XPLAY/**

The static stage includes:
- social-first mock timeline
- all 10 built-in playable PLX demonstrations
- FPS
- Fighting
- mock reactions/comments/remix behavior
- local fallback creation path

Server-backed AI, Supabase writes, and Python Visual Intelligence require deployed backend services and therefore may show as offline on the static Pages stage. Built-in demos and the social product story remain usable.

## Install the workflow

From PowerShell inside the project:

`powershell -ExecutionPolicy Bypass -File .\deploy\INSTALL-LIVE-STAGE.ps1`

The script detects the actual Git repository root. This matters because the engine currently lives under `XPLAY\xplay-plx-engine`.

Then commit/push the generated repo-root workflow and this Release Candidate.

## Release Rule

Do not push the stage until:

`npm run verify:rc`

passes and Browser QA has verified FPS and Fighting.
