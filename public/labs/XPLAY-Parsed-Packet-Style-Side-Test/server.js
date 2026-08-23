import fs from 'fs';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import OpenAI, { toFile } from 'openai';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.join(__dirname, '.env'),
  path.resolve(__dirname, '../server/.env'),
  path.resolve(__dirname, '../../server/.env')
];
let envLoadedFrom = null;
for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: false });
    envLoadedFrom = p;
    break;
  }
}
if (!envLoadedFrom) dotenv.config();

const PORT = Number(process.env.PORT || 8824);
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
  const invariant = `SOURCE IS REFERENCE ONLY FOR CONTENT AND LAYOUT.
STYLE DIVERGENCE IS MANDATORY.
Preserve: Alex identity, enemy identities, pose meaning, frame count, grid geometry, environment landmarks, side-view composition, gameplay readability.
DO NOT preserve the original pixel-art rendering unless the selected style explicitly calls for it.
The output should be immediately distinguishable from every other style at a glance.

SELECTED STYLE: ${s.label}
STYLE DNA: ${s.prompt}`;

  if (kind === 'stage') {
    return `${invariant}

ASSET TYPE: ENVIRONMENT PLATE.
Rebuild the environment visually in the selected style while preserving the same spatial composition:
- moonlit skyline
- B7 / Security Level 3 building
- chain-link fence and caution sign
- green barrels
- rust-red Zenith Industries container
- danger sign
- ladder, pipes, catwalk
- hazard-striped pavement
- foreground barrel

CRITICAL:
- environment only
- no characters
- no HUD
- no gameplay UI
- do not simply color-grade the source
- re-render materials, lighting, texture language and dimensionality so the selected style is unmistakable
- retain a side-view combat plane suitable for scrolling`;
  }

  if (kind === 'player') {
    return `${invariant}

ASSET TYPE: ALEX CHARACTER ACTION SHEET.
Alex remains a Black male martial artist with a large afro, white sleeveless gi, black belt and bare feet.

STRICT SHEET CONTRACT:
- EXACT 4 columns × 2 rows
- eight full-body frames
- same pose meanings:
  row 1 = idle, walk A, walk B, walk C
  row 2 = attack windup, attack impact, hurt reaction, victory
- transparent background
- consistent baseline and character scale
- no environment, labels, borders, vignettes or HUD

STYLE ENFORCEMENT:
- completely re-render the body, clothing, hair, shading, dimensionality and material treatment into the selected style
- do not preserve pixel-art pixels or pixel-art surface shading unless selected style is Source/64-bit
- all eight cells must visibly belong to the selected style`;
  }

  return `${invariant}

ASSET TYPE: ENEMY ACTION ATLAS.
STRICT ATLAS CONTRACT:
- EXACT 4 columns × 3 rows
- row 1 = Knife enemy, pink mohawk, knife
- row 2 = red-bandanna fighter
- row 3 = blue-bandanna muscular fighter
- columns = idle, advance, attack, hurt/knockback
- transparent background
- consistent baseline and scale within each row
- no environment, labels, borders, vignettes or HUD

STYLE ENFORCEMENT:
- fully reconstruct every enemy into the selected style
- do not preserve original pixel-art pixels or sprite-surface shading
- preserve recognizable outfit colors, silhouette role, weapon identity and action meaning
- the selected style must be obvious even when viewing the atlas by itself`;
}
async function generateVariant(style, kind) {
  const client = getClient();
  if (!client) throw new Error('OPENAI_API_KEY is not configured.');

  const src = masterFile(kind);
  const out = cachePath(style, kind);
  const file = await toFile(fs.createReadStream(src), path.basename(src), { type: 'image/png' });

  const request = {
    model: IMAGE_MODEL,
    image: file,
    prompt: assetPrompt(style, kind),
    size: kind === 'stage' ? '1536x1024' : '1024x1024',
    quality: 'medium',
    background: kind === 'stage' ? 'opaque' : 'transparent',
    output_format: 'png'
  };

  let result;
  try {
    result = await client.images.edit(request);
  } catch (firstError) {
    console.warn(`Primary image edit failed for ${style}/${kind}:`, firstError?.message || firstError);
    // Compatibility retry: some model/account combinations are pickier about transparent
    // backgrounds or aspect ratios. Retry with the safest square PNG settings.
    const retry = { ...request, size: '1024x1024' };
    if (kind !== 'stage') retry.background = 'transparent';
    result = await client.images.edit(retry);
  }

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`Image model returned no image data for ${style}/${kind}.`);
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
    note: 'This lab starts from the saved parsed packet and saved source assets. Only non-source style generations use the image API, and generated variants are cached.'
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
    const failed = [];
    for (const kind of ['stage', 'player', 'enemies']) {
      const existing = cachePath(style, kind);
      if (fs.existsSync(existing)) {
        skipped.push(kind);
      } else {
        try {
          await generateVariant(style, kind);
          generated.push(kind);
        } catch (kindError) {
          console.error(`Generate missing failed for ${style}/${kind}`, kindError);
          failed.push({ kind, error: kindError?.message || String(kindError) });
        }
      }
    }
    res.json({ ok: failed.length === 0, generated, skipped, failed });
  } catch (err) {
    console.error('GENERATE MISSING ERROR', err);
    res.status(err.status || 500).json({ ok: false, error: err.message || String(err) });
  }
});


app.post('/api/regenerate-style/:style', async (req, res) => {
  try {
    const { style } = req.params;
    if (!styles[style]) throw new Error('Unknown style.');
    if (style === 'source64') {
      return res.json({ ok: true, generated: [], note: 'Source / 64-bit uses the canonical master assets.' });
    }
    const dir = path.join(__dirname, 'cache', style);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });

    const generated = [];
    const failed = [];
    for (const kind of ['stage', 'player', 'enemies']) {
      try {
        await generateVariant(style, kind);
        generated.push(kind);
      } catch (err) {
        failed.push({ kind, error: err?.message || String(err) });
      }
    }
    res.json({ ok: failed.length === 0, generated, failed });
  } catch (err) {
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
  console.log('XPLAY STYLE DIVERGENCE LAB V3');
  console.log(`Open: http://localhost:${PORT}`);
  console.log(`Image model: ${IMAGE_MODEL}`);
  console.log(`Key configured: ${!!(process.env.OPENAI_API_KEY || '').trim()}`);
  console.log('Vision is NOT called in this lab.');
  console.log('Source / 64-bit uses the saved checkpoint with zero image-generation calls. All additional style outputs are cached after first generation.');
  console.log('Other styles are cached after first generation.');
  console.log('============================================================');
});
