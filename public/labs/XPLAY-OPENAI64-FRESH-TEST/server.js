import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import OpenAI, { toFile } from 'openai';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../server/.env'),
  path.resolve(__dirname, '../../server/.env')
];
let envLoadedFrom = null;
for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
    envLoadedFrom = candidate;
    break;
  }
}
if (!envLoadedFrom) dotenv.config();

const PORT = Number(process.env.PORT || 8796);
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini';
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) return cb(new Error(`Only image uploads allowed. Received ${file.mimetype || 'unknown'}.`));
    cb(null, true);
  }
});

app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public'), { etag: false, lastModified: false }));

function client() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function imageDataUrl(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

function unwrapJson(text='') {
  let clean = String(text).trim();
  clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const first = clean.indexOf('{');
  const last = clean.lastIndexOf('}');
  if (first >= 0 && last > first) clean = clean.slice(first, last + 1);
  return clean;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function asArray(v) { return Array.isArray(v) ? v : []; }
function asString(v, d='') { return typeof v === 'string' ? v : d; }
function titleCase(s='') { return s.replace(/\b\w/g, c => c.toUpperCase()); }

function normalizePacket(raw={}) {
  const primaryGenre = asString(raw.primaryGenre, 'fighting');
  const genreCandidates = asArray(raw.genreCandidates).map(x => ({
    type: asString(x.type, 'fighting'),
    score: clamp(Number(x.score ?? 0.8), 0, 1),
    source: 'vision'
  }));
  const landmarks = asArray(raw.landmarks).map(x => asString(x)).filter(Boolean);
  const palette = asArray(raw.palette).map(x => asString(x)).filter(Boolean);
  const enemies = asArray(raw.enemies).map((e, i) => ({
    name: asString(e.name, `Enemy ${i+1}`),
    weapon: asString(e.weapon, 'Unarmed'),
    region: asString(e.region, 'foreground')
  }));
  const player = raw.player || {};
  const hud = raw.hud || {};
  const gameplay = raw.gameplay || {};
  const camera = raw.camera || {};
  const world = raw.world || {};
  const tests = asArray(gameplay.tests).map(x => asString(x)).filter(Boolean);
  const packet = {
    title: asString(raw.title, 'Untitled Playable'),
    primaryGenre,
    genreCandidates: genreCandidates.length ? genreCandidates : [{ type: primaryGenre, score: 0.9, source: 'vision' }],
    player: {
      name: asString(player.name, 'Player'),
      identity: asString(player.identity, 'Visible player character'),
      appearance: asArray(player.appearance).map(x => asString(x)).filter(Boolean),
      action: asString(player.action, 'Ready stance')
    },
    enemies: enemies.length ? enemies : [{ name: 'Enemy 1', weapon: 'Unarmed', region: 'foreground' }],
    landmarks,
    palette,
    camera: {
      type: asString(camera.type, '2D side-view beat-em-up camera'),
      preserveComposition: camera.preserveComposition !== false,
      extendForScroll: camera.extendForScroll !== false
    },
    gameplay: {
      intention: asString(gameplay.intention, 'Playable action encounter'),
      cues: asArray(gameplay.cues).map(x => ({ type: asString(x.type, 'action'), score: clamp(Number(x.score ?? 0.8), 0, 1), source: 'vision' })),
      stageTime: clamp(Number(gameplay.stageTime ?? 20), 10, 120),
      tests: tests.length ? tests : ['Scene can convert into a playable encounter.']
    },
    world: {
      width: clamp(Number(world.width ?? 2800), 1800, 5200),
      targetSeconds: clamp(Number(world.targetSeconds ?? 22), 12, 45),
      scrolling: world.scrolling !== false
    },
    hud: {
      present: hud.present !== false,
      elements: asArray(hud.elements).map(x => asString(x)).filter(Boolean)
    },
    summary: asString(raw.summary, `${titleCase(asString(player.name,'Player'))} fights visible enemies in a side-scrolling action scene.`),
    buildPrompt: asString(raw.buildPrompt, 'Create a playable side-scrolling brawler based on the screenshot.')
  };
  packet.locks = {
    visionTruthLocked: true,
    noLegacyAssets: true,
    unknownStaysUnknown: true,
    preserveComposition: packet.camera.preserveComposition,
    genreLocked: true
  };
  return packet;
}

function visionPrompt(context='') {
  return `Analyze the uploaded screenshot as the visual source of truth for a playable XPLAY game.
Return ONLY valid JSON. Do not use markdown fences.

Required top-level keys:
- title
- primaryGenre
- genreCandidates (array of {type, score, source})
- player ({name, identity, appearance, action})
- enemies (array of {name, weapon, region})
- landmarks (array of strings)
- palette (array of strings)
- camera ({type, preserveComposition, extendForScroll})
- gameplay ({intention, cues, stageTime, tests})
- world ({width, targetSeconds, scrolling})
- hud ({present, elements})
- summary
- buildPrompt

Rules:
- visible facts first; unknown stays unknown
- preserve player identity, enemy identities, landmarks, HUD language, and camera
- if the screenshot reads like a side-scrolling brawler or beat-em-up, primaryGenre must be "fighting"
- all scored sources must be exactly "vision"
- width should support scrolling when appropriate
- targetSeconds should usually be 15-30
- buildPrompt should clearly instruct how to build the playable version

Optional user context:
${context || 'Treat the screenshot as source truth for a playable conversion.'}`;
}

app.get('/api/health', (_req, res) => {
  const key = process.env.OPENAI_API_KEY || '';
  res.json({
    ok: true,
    app: 'XPLAY-GAMEPLAY-POLISH-DUALSTYLE-LAB',
    configured: !!key,
    keyLength: key.trim().length,
    port: PORT,
    visionModel: VISION_MODEL,
    imageModel: IMAGE_MODEL,
    envLoadedFrom: envLoadedFrom || 'default process environment'
  });
});

app.post('/api/vision/lock', upload.single('image'), async (req, res) => {
  try {
    const c = client();
    if (!c) return res.status(400).json({ ok: false, error: 'OPENAI_API_KEY is not configured.' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'No image uploaded.' });

    const response = await c.responses.create({
      model: VISION_MODEL,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: visionPrompt(req.body.context || '') },
          { type: 'input_image', image_url: imageDataUrl(req.file), detail: 'high' }
        ]
      }]
    });

    const rawText = response.output_text || '';
    const parsed = JSON.parse(unwrapJson(rawText));
    const packet = normalizePacket(parsed);
    res.json({ ok: true, packet, rawText, model: VISION_MODEL, responseId: response.id });
  } catch (err) {
    console.error('VISION LOCK ERROR', err);
    res.status(err.status || 500).json({ ok: false, error: err.message || String(err) });
  }
});

function interpret(packet) {
  const runtimeGenre = 'beat-em-up';
  const worldWidth = packet.camera.extendForScroll ? Math.max(packet.world.width, 3200) : packet.world.width;
  return {
    buildId: `polish_${Date.now().toString(36)}`,
    runtimeGenre,
    sourceTitle: packet.title,
    sourceSummary: packet.summary,
    player: {
      id: 'player_1',
      displayName: packet.player.name,
      identity: packet.player.identity,
      hp: 180,
      lives: 3,
      moveSpeed: 210,
      depthSpeed: 110,
      attackRange: 108,
      attackDamage: 28,
      attackDuration: 0.28,
      hurtDuration: 0.26
    },
    enemies: packet.enemies.map((e, i) => ({
      id: `enemy_${i+1}`,
      displayName: e.name,
      weapon: e.weapon,
      role: /knife|blade|sword/i.test(e.weapon) ? 'armed_melee' : 'unarmed_melee',
      maxHp: /bruiser|brawler/i.test(e.name) ? 140 : 100,
      moveSpeed: /bruiser|brawler/i.test(e.name) ? 65 : 85,
      attackDamage: /knife|blade|sword/i.test(e.weapon) ? 18 : 12,
      region: e.region
    })),
    stage: {
      worldWidth,
      viewportWidth: 960,
      viewportHeight: 540,
      targetSeconds: packet.world.targetSeconds,
      scrolling: packet.world.scrolling,
      predictiveCamera: true,
      extensionProps: packet.landmarks
    },
    artDirection: {
      palette: packet.palette,
      landmarks: packet.landmarks,
      '64bit': 'late-1990s to early-2000s arcade console brawler',
      'modernpc': 'modern high-fidelity PC brawler with cinematic but readable real-time graphics'
    },
    hud: packet.hud,
    qa: packet.gameplay.tests
  };
}

app.post('/api/interpreter/build', (req, res) => {
  try {
    const packet = normalizePacket(req.body.packet || {});
    res.json({ ok: true, blueprint: interpret(packet) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || String(err) });
  }
});

function parsePacket(body) {
  const raw = body.packet;
  if (!raw) throw new Error('Locked packet is required.');
  return normalizePacket(typeof raw === 'string' ? JSON.parse(raw) : raw);
}

async function imageEditFromUpload(file, prompt, opts={}) {
  const c = client();
  if (!c) throw new Error('OPENAI_API_KEY is not configured.');
  if (!file?.mimetype?.startsWith('image/')) throw new Error('A valid source image is required.');
  const img = await toFile(file.buffer, file.originalname || 'source.png', { type: file.mimetype });
  const result = await c.images.edit({
    model: IMAGE_MODEL,
    image: img,
    prompt,
    size: opts.size || '1536x1024',
    quality: opts.quality || 'medium',
    background: opts.background || 'opaque'
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error('Image model returned no image data.');
  return `data:image/png;base64,${b64}`;
}

function styleLabel(style) { return style === 'modernpc' ? 'modern day computer graphics' : '64-bit arcade'; }

function stagePrompt(packet, style='64bit') {
  const styleBlock = style === 'modernpc'
    ? 'STYLE TARGET: modern high-fidelity PC brawler, realistic materials, cinematic but gameplay-readable lighting, detailed industrial props, clear silhouette readability, polished contemporary action-game presentation.'
    : 'STYLE TARGET: polished late-1990s/early-2000s 64-bit arcade brawler, chunky readable silhouettes, console-era 3D/2.5D visual language, saturated industrial night lighting, readable gameplay-first composition.';
  return `EDIT THE REFERENCE SCREENSHOT INTO A CLEAN ENVIRONMENT PLATE FOR XPLAY.
${styleBlock}
SOURCE TRUTH: ${packet.summary}
LANDMARKS TO PRESERVE: ${packet.landmarks.join('; ')}.
PALETTE: ${packet.palette.join(', ')}.
CRITICAL EDITS:
- remove all characters, hit sparks, portraits, health bars, timer, score, and HUD from the world
- reconstruct the environment behind removed actors naturally
- preserve side-view brawler composition and combat floor
- extend the environment horizontally so it supports scrolling beyond a single screen width
- no unrelated locations, no generic graybox, no text overlays
Output a clean world plate only.`;
}

function playerPrompt(packet, style='64bit') {
  const styleBlock = style === 'modernpc'
    ? 'STYLE TARGET: modern day computer graphics, high-quality game character sheet, sharper material definition, more realistic body forms while remaining game-readable.'
    : 'STYLE TARGET: polished 64-bit arcade brawler character sheet, console-era game readability, bold silhouette and strong pose clarity.';
  return `CREATE A PRODUCTION SPRITE SHEET / CHARACTER FRAME GRID FOR XPLAY.
${styleBlock}
CHARACTER: ${packet.player.name}. Identity: ${packet.player.identity}. Appearance: ${packet.player.appearance.join(', ')}.
Preserve the visible identity, skin tone, hair, outfit, silhouette, and martial-arts attitude.
OUTPUT EXACTLY EIGHT FULL-BODY FRAMES IN A 4 columns × 2 rows grid on a transparent background.
Frames in order:
row 1: idle, walk contact A, walk contact B, walk passing
row 2: attack windup, attack impact, hurt reaction, victory / ready pose
IMPORTANT: transparent background only; no environment; no text; no labels; no crop; no circular framing; generous padding; consistent baseline; clean for runtime slicing.`;
}

function enemyPrompt(packet, style='64bit') {
  const styleBlock = style === 'modernpc'
    ? 'STYLE TARGET: modern day computer graphics enemy atlas; detailed but readable game-ready characters.'
    : 'STYLE TARGET: polished 64-bit arcade brawler enemy atlas; game-readable silhouettes and clean action poses.';
  const enemyList = packet.enemies.map((e, i) => `${i+1}. ${e.name} — weapon: ${e.weapon}; region: ${e.region}`).join('\n');
  return `CREATE A PRODUCTION ENEMY ATLAS FOR XPLAY.
${styleBlock}
VISIBLE ENEMIES:
${enemyList}
OUTPUT a 4 columns × ${Math.max(1, packet.enemies.length)} rows transparent grid.
One enemy per row. Columns are: idle, walk/advance, attack, hurt/knockback.
Preserve each enemy's distinct look, clothing palette, headwear/hair, body type, and correct weapon.
IMPORTANT: transparent background only; no environment; no text; no labels; no cropping; consistent baseline; game-ready spacing.`;
}

function assetPrompt(kind, packet, style) {
  if (kind === 'stage') return stagePrompt(packet, style);
  if (kind === 'player') return playerPrompt(packet, style);
  return enemyPrompt(packet, style);
}

app.post('/api/assets/:kind', upload.single('image'), async (req, res) => {
  try {
    const { kind } = req.params;
    if (!['stage', 'player', 'enemies'].includes(kind)) throw new Error('Invalid asset kind.');
    const style = req.body.style === 'modernpc' ? 'modernpc' : '64bit';
    const packet = parsePacket(req.body);
    const prompt = assetPrompt(kind, packet, style);
    const background = kind === 'stage' ? 'opaque' : 'transparent';
    const imageData = await imageEditFromUpload(req.file, prompt, { background, size: '1536x1024', quality: 'medium' });
    res.json({ ok: true, kind, style, styleLabel: styleLabel(style), imageDataUrl: imageData, prompt });
  } catch (err) {
    console.error('ASSET ERROR', err);
    res.status(err.status || 500).json({ ok: false, error: err.message || String(err) });
  }
});

app.use((err, _req, res, _next) => {
  console.error('SERVER ERROR', err);
  res.status(400).json({ ok: false, error: err.message || String(err) });
});

app.listen(PORT, () => {
  console.log('============================================================');
  console.log('XPLAY GAMEPLAY POLISH DUAL-STYLE LAB');
  console.log(`Open:   http://localhost:${PORT}`);
  console.log(`Vision: ${VISION_MODEL}`);
  console.log(`Image:  ${IMAGE_MODEL}`);
  console.log(`Key configured: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`Env: ${envLoadedFrom || 'default process environment'}`);
  console.log('============================================================');
});
