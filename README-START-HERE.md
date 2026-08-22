# XPLAY OpenAI Vision Test Lab

## What this is
A clean standalone test lab for your new OpenAI connection.

It does **one job**:
1. Upload a screenshot.
2. Send it to OpenAI Vision.
3. Return a structured XPLAY-ready JSON scene packet.

---

## Folder structure
- `package.json`
- `.env.example`
- `server/server.js`
- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `OPEN-ME.html`

---

## Setup
1. Extract the zip.
2. Open the extracted folder in your project space or desktop.
3. Create a `.env` file from `.env.example`.
4. Paste your real OpenAI API key.

Example `.env`:
```env
OPENAI_API_KEY=sk-your-real-key-here
OPENAI_VISION_MODEL=gpt-4.1-mini
PORT=8788
```

5. Run:
```bash
npm install
npm run dev
```

6. Open:
```text
http://localhost:8788
```

---

## What success looks like
- `/api/vision/health` says `configured: true`
- The uploaded screenshot returns valid JSON
- The packet includes the right player, enemies, landmarks, genre, palette, and camera

---

## Recommended first test
Use your Alex shipping dock screenshot.

Optional context:
```text
Treat this as a screenshot from a side-scrolling beat-em-up. Preserve visible landmarks, characters, gameplay cues, and HUD details. Return a grounded XPLAY packet.
```

---

## Important note
This is intentionally isolated so you can test OpenAI Vision **without disturbing the rest of XPLAY yet**.
