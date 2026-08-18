# MCP / Tool Plan for XPLAY in Antigravity

## Use Immediately

### 1. Antigravity Browser Agent / BrowserMCP
Use for visual QA, click-through testing, screenshots, videos, mobile viewport checks, generated FPS and Fighting verification.
Antigravity already has browser-agent capabilities; use them before adding redundant browser tooling.

### 2. GitHub MCP
Use for repo history, branches, diffs, issues, commits, and release traceability.
Recommended once connected to the XPLAY repository.

### 3. Supabase / Postgres MCP
Use for schema inspection, projects, versions, assets, play events, auth-related debugging, and data checks.
Keep destructive writes controlled.

### 4. Google Developer Knowledge MCP
Useful for current Google/Cloud/Firebase/Antigravity documentation.
Official endpoint from Google's documentation:
`https://developerknowledge.googleapis.com/mcp`
Requires a Google Developer Knowledge API key in Antigravity's MCP config.

## Useful Soon

### Context7 or equivalent current-library docs
Useful for Phaser, Vite, FastAPI and other fast-moving package documentation.

### Cloud Run tooling
Useful when the Node API and Python Visual Intelligence service move beyond localhost.

## Separate Unreal Lane
For the Unreal boomerang project, configure official Unreal MCP in its Unreal workspace.
Do not mix Unreal editor-control tasks into the XPLAY web Foundry lane unless the task explicitly connects both products.

## Principle
MCPs should increase observability or control.
Do not connect tools just to increase the tool count.
