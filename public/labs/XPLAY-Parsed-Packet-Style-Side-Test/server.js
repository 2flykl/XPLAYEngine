import fs from 'fs';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import OpenAI, { toFile } from 'openai';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust env discovery: this lab may live under XPLAYEngine/public/labs/...
// Walk upward and look for either .env or server/.env.
const envCandidates = [];
let cursor = __dirname;
for (let i = 0; i < 8; i++) {
  envCandidates.push(path.join(cursor, '.env'));
  envCandidates.push(path.join(cursor, 'server', '.env'));
  const parent = path.dirname(cursor);
  if (parent === cursor) break;
  cursor = parent;
}
let envLoadedFrom = null;
for (const p of [...new Set(envCandidates)]) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: false });
    envLoadedFrom = p;
    break;
  }
}
if (!envLoadedFrom) dotenv.config();

const PORT = Number(process.env.PORT || 8808);
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

const app = express();
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public'), { etag: false, lastModified: false }));
app.use('/master', express.static(path.join(__dirname, 'master'), { etag: false, lastModified: false }));
app.use('/cache', express.static(path.join(__dirname, 'cache'), { etag: false, lastModified: false }));

const packet = JSON.parse(fs.readFileSync(path.join(__dirname, 'master', 'packet.json'), 'utf8'));
const blueprint = JSON.parse(fs.readFileSync(path.join(__dirname, 'master', 'blueprint.json'), 'utf8'));
const styles = JSON.parse(fs.readFileSync(path.join(__dirname, 'styles.json'), 'utf8'));

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function masterFile(kind) {
  if (kind === 'stage') return path.join(__dirname, 'master', 'stage.png');
  if (kind === 'player') return path.join(__dirname, 'master', 'alex-sheet.png');
  return path.join(__dirname, 'master', 'enemy-atlas.png');
}

function masterUrl(kind) {
  if (kind === 'stage') return '/master/stage.png';
  if (kind === 'player') return '/master/alex-sheet.png';
  return '/master/enemy-atlas.png';
}

function cachePath(style, kind) {
  const dir = path.join(__dirname, 'cache', style);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${kind}.png`);
}

function assetPrompt(style, kind) {
  const s = styles[style];
  const common = `STYLE TRANSFORM ONLY. Preserve the canonical parsed checkpoint structure. ${s.prompt}`;
  if (kind === 'stage') {
    return `${common}\n\nASSET TYPE: environment plate. Preserve the same side-on camera, combat floor, skyline, moon, B7 security building, chain-link fence with caution sign, green barrels, rust-red Zenith Industries container, danger sign, ladder, pipes, catwalk, hazard stripes, and foreground barrel. No characters. No HUD. Keep it gameplay-readable and horizontally scroll-friendly.`;
  }
  if (kind === 'player') {
    return `${common}\n\nASSET TYPE: Alex player sheet. Preserve EXACT 4 columns by 2 rows, the same eight poses, same frame ordering, same transparent background, same Alex identity: Black male martial artist, large afro, white sleeveless gi, black belt, barefoot. No cropping, no labels, no HUD, no environment, no extra characters.`;
  }
  return `${common}\n\nASSET TYPE: enemy atlas. Preserve EXACT 4 columns by 3 rows. Row 1 = Knife enemy, row 2 = red-bandanna fighter, row 3 = blue-bandanna fighter. Columns remain idle, walk/advance, attack, hurt/knockback. Transparent background only. Preserve correct identity, outfits and weapon. No labels, no HUD, no environment.`;
}

async function generateVariant(style, kind) {
  const client = getClient();
  if (!client) throw new Error('OPENAI_API_KEY is not configured.');

  const src = masterFile(kind);
  const out = cachePath(style, kind);
  const file = await toFile(fs.createReadStream(src), path.basename(src), { type: 'image/png' });

  const result = await client.images.edit({
    model: IMAGE_MODEL,
    image: file,
    prompt: assetPrompt(style, kind),
    size: '1536x1024',
    quality: 'medium',
    background: kind === 'stage' ? 'opaque' : 'transparent',
    output_format: 'png'
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error('Image model returned no image data.');
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  return out;
}

app.get('/api/health', (_req, res) => {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  res.json({
    ok: true,
    app: 'XPLAY-PARSED-PACKET-STYLE-SIDE-TEST',
    port: PORT,
    imageModel: IMAGE_MODEL,
    keyConfigured: !!key,
    keyLength: key.length,
    envLoadedFrom: envLoadedFrom || 'default process env',
    visionCallsRequired: false,
    note: 'This lab starts from the saved parsed packet and saved source assets.'
  });
});

app.get('/api/checkpoint', (_req, res) => {
  res.json({
    ok: true,
    packet,
    blueprint,
    master: {
      stage: '/master/stage.png',
      player: '/master/alex-sheet.png',
      enemies: '/master/enemy-atlas.png'
    }
  });
});

app.get('/api/styles', (_req, res) => {
  res.json({ ok: true, styles });
});

app.get('/api/cache', (_req, res) => {
  const state = {};
  for (const style of Object.keys(styles)) {
    state[style] = {};
    for (const kind of ['stage', 'player', 'enemies']) {
      if (style === 'source64') {
        state[style][kind] = masterUrl(kind);
      } else {
        const file = cachePath(style, kind);
        state[style][kind] = fs.existsSync(file) ? `/cache/${style}/${kind}.png?t=${fs.statSync(file).mtimeMs}` : null;
      }
    }
  }
  res.json({ ok: true, state });
});

app.post('/api/generate/:style/:kind', async (req, res) => {
  try {
    const { style, kind } = req.params;
    const force = !!req.body?.force;
    if (!styles[style]) throw new Error('Unknown style.');
    if (!['stage', 'player', 'enemies'].includes(kind)) throw new Error('Unknown asset kind.');

    if (style === 'source64') {
      return res.json({ ok: true, cached: true, source: 'master', url: masterUrl(kind) });
    }

    const existing = cachePath(style, kind);
    if (fs.existsSync(existing) && !force) {
      return res.json({ ok: true, cached: true, source: 'cache', url: `/cache/${style}/${kind}.png?t=${fs.statSync(existing).mtimeMs}` });
    }

    await generateVariant(style, kind);
    res.json({ ok: true, cached: false, source: 'openai', url: `/cache/${style}/${kind}.png?t=${Date.now()}` });
  } catch (err) {
    console.error('GENERATE ERROR', err);
    res.status(err.status || 500).json({ ok: false, error: err.message || String(err) });
  }
});

app.post('/api/generate-missing/:style', async (req, res) => {
  try {
    const { style } = req.params;
    if (!styles[style]) throw new Error('Unknown style.');
    if (style === 'source64') {
      return res.json({ ok: true, generated: [], skipped: ['stage', 'player', 'enemies'] });
    }
    const generated = [];
    const skipped = [];
    for (const kind of ['stage', 'player', 'enemies']) {
      const existing = cachePath(style, kind);
      if (fs.existsSync(existing)) {
        skipped.push(kind);
      } else {
        await generateVariant(style, kind);
        generated.push(kind);
      }
    }
    res.json({ ok: true, generated, skipped });
  } catch (err) {
    console.error('GENERATE MISSING ERROR', err);
    res.status(err.status || 500).json({ ok: false, error: err.message || String(err) });
  }
});

app.post('/api/cache/clear/:style', (req, res) => {
  try {
    const { style } = req.params;
    if (!styles[style]) throw new Error('Unknown style.');
    if (style === 'source64') {
      return res.json({ ok: true, note: 'Master source style uses built-in canonical assets.' });
    }
    const dir = path.join(__dirname, 'cache', style);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log('============================================================');
  console.log('XPLAY PARSED PACKET STYLE SIDE TEST');
  console.log(`Open: http://localhost:${PORT}`);
  console.log(`Image model: ${IMAGE_MODEL}`);
  console.log(`Key configured: ${!!(process.env.OPENAI_API_KEY || '').trim()}`);
  console.log(`Env loaded from: ${envLoadedFrom || 'none found'}`);
  console.log('Vision is NOT called in this lab.');
  console.log('Source / 64-bit uses the saved checkpoint with zero image-generation calls.');
  console.log('Other styles are cached after first generation.');
  console.log('============================================================');
});
