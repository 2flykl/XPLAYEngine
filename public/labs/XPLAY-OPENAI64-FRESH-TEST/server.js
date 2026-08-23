import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import OpenAI, { toFile } from 'openai';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env in a predictable order. Existing XPLAY server/.env wins if found.
const envCandidates = [
  path.resolve(__dirname, '../../server/.env'),
  path.resolve(__dirname, '../server/.env'),
  path.resolve(__dirname, '.env')
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

const PORT = Number(process.env.PORT || 8792);
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-5.6';
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) return cb(new Error(`Only image uploads are allowed. Received ${file.mimetype || 'unknown'}.`));
    cb(null, true);
  }
});

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public'), { etag: false, lastModified: false }));

function client() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const Score = z.number().min(0).max(1);
const ScenePacket = z.object({
  title: z.string(),
  primaryGenre: z.string(),
  genreCandidates: z.array(z.object({ type: z.string(), score: Score, source: z.literal('vision') })),
  player: z.object({
    name: z.string(), identity: z.string(), appearance: z.array(z.string()), action: z.string()
  }),
  enemies: z.array(z.object({ name: z.string(), weapon: z.string(), region: z.string() })),
  landmarks: z.array(z.string()),
  palette: z.array(z.string()),
  camera: z.object({ type: z.string(), preserveComposition: z.boolean(), extendForScroll: z.boolean() }),
  gameplay: z.object({
    intention: z.string(),
    cues: z.array(z.object({ type: z.string(), score: Score, source: z.literal('vision') })),
    stageTime: z.number(),
    tests: z.array(z.string())
  }),
  world: z.object({ width: z.number(), targetSeconds: z.number(), scrolling: z.boolean() }),
  hud: z.object({ present: z.boolean(), elements: z.array(z.string()) }),
  summary: z.string(),
  buildPrompt: z.string()
});

function imageDataUrl(file) {
  if (!file?.mimetype?.startsWith('image/')) throw new Error('Uploaded file is not an image.');
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

function lockedPrompt(context='') {
  return `You are XPLAY Vision Truth. Analyze the uploaded screenshot as a VISUAL SPECIFICATION for a playable game.\n\nHARD RULES:\n- Report visible facts first. Unknown stays unknown.\n- Never replace the visible environment with a generic one.\n- Never change the gameplay genre because another preset exists.\n- If this is a multi-enemy side-scrolling brawler, primaryGenre must be fighting.\n- Preserve player identity, enemy count/roles, HUD language, camera, visible landmarks, palette, and gameplay cues.\n- source on all scored vision observations must be exactly \"vision\".\n- world.width should be 2200-3200 if a scrolling extension is appropriate.\n- targetSeconds should usually be 15-25 for this prototype.\n- buildPrompt must tell a builder what to make without inventing unrelated content.\n\nUSER CONTEXT:\n${context || 'Treat the screenshot as source truth and prepare it for an XPLAY playable conversion.'}`;
}

app.get('/api/health', (_req, res) => {
  const key = process.env.OPENAI_API_KEY || '';
  res.json({
    ok: true,
    app: 'XPLAY-OPENAI64-FRESH-TEST',
    version: 'fresh-v1',
    configured: !!key,
    visionModel: VISION_MODEL,
    imageModel: IMAGE_MODEL,
    port: PORT,
    envLoadedFrom: envLoadedFrom ? path.normalize(envLoadedFrom) : null,
    keyLength: key.trim().length
  });
});

app.post('/api/vision/lock', upload.single('image'), async (req, res) => {
  try {
    const c = client();
    if (!c) return res.status(400).json({ ok: false, error: 'OPENAI_API_KEY is not configured.' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'No image uploaded.' });

    const response = await c.responses.parse({
      model: VISION_MODEL,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: lockedPrompt(req.body.context || '') },
          { type: 'input_image', image_url: imageDataUrl(req.file), detail: 'high' }
        ]
      }],
      text: { format: zodTextFormat(ScenePacket, 'xplay_scene_packet') }
    });

    const packet = response.output_parsed;
    if (!packet) {
      return res.status(502).json({ ok: false, error: 'OpenAI returned no parsed scene packet.', raw: response.output_text || '' });
    }

    // Deterministic safety locks after vision. These do not invent content.
    packet.locks = {
      visionTruthLocked: true,
      noLegacyAssets: true,
      unknownStaysUnknown: true,
      preserveComposition: packet.camera.preserveComposition,
      genreLocked: true
    };

    return res.json({ ok: true, packet, model: VISION_MODEL, responseId: response.id });
  } catch (err) {
    console.error('VISION LOCK ERROR', err);
    return res.status(err.status || 500).json({ ok: false, error: err.message || String(err) });
  }
});

function interpret(packet) {
  const isFighting = packet.primaryGenre.toLowerCase().includes('fight') || packet.genreCandidates.some(g => /beat.?em.?up/i.test(g.type));
  const runtimeGenre = isFighting ? 'beat-em-up' : packet.primaryGenre;
  const enemies = packet.enemies.map((e, i) => ({
    id: `enemy_${i+1}_${e.name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}`,
    displayName: e.name,
    weapon: e.weapon,
    role: /knife|blade/i.test(e.weapon) ? 'armed_melee' : 'unarmed_melee',
    region: e.region,
    hp: /bruiser|brawler/i.test(e.name) ? 130 : 90,
    speed: /bruiser|brawler/i.test(e.name) ? 65 : 85
  }));
  return {
    buildId: `xplay64_${Date.now().toString(36)}`,
    runtimeGenre,
    sourceTitle: packet.title,
    player: {
      id: 'player_alex', displayName: packet.player.name, identity: packet.player.identity,
      hp: 160, lives: 3, speed: 185, attackRange: 92, attackDamage: 30
    },
    enemies,
    stage: {
      worldWidth: Math.max(2200, Math.min(3200, Number(packet.world.width) || 2800)),
      targetSeconds: Math.max(15, Math.min(30, Number(packet.world.targetSeconds) || 20)),
      camera: 'side-scroll',
      combatPlaneDepth: true,
      winCondition: 'defeat_all_enemies'
    },
    artDirection: {
      target: 'polished late-1990s/early-2000s 64-bit arcade brawler',
      sourcePalette: packet.palette,
      landmarks: packet.landmarks,
      noGraybox: true,
      noLegacyAssets: true
    },
    hud: packet.hud,
    qa: packet.gameplay.tests
  };
}

app.post('/api/interpreter/build', (req, res) => {
  try {
    const packet = ScenePacket.passthrough().parse(req.body.packet);
    return res.json({ ok: true, blueprint: interpret(packet) });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message || String(err) });
  }
});

function stagePrompt(packet) {
  return `EDIT THE REFERENCE SCREENSHOT INTO A CLEAN GAME ENVIRONMENT PLATE FOR XPLAY.\n\nSTYLE TARGET: polished late-1990s/early-2000s 64-bit arcade brawler; crisp readable geometry, richer than graybox, console-era 3D/2.5D visual language, dramatic but gameplay-readable lighting.\n\nSOURCE TRUTH: ${packet.summary}\nLANDMARKS TO PRESERVE: ${packet.landmarks.join('; ')}.\nPALETTE: ${packet.palette.join(', ')}.\n\nCRITICAL EDIT: remove ALL characters, hit sparks, portraits, health bars, timer, score, stage text, and other HUD from the world plate. Reconstruct the environment behind removed actors naturally. Preserve the same side-view camera and combat floor. Extend the environment visually so it can support horizontal scrolling. Do NOT add unrelated locations, aircraft, roads, rooftop platforming, fantasy props, or generic placeholders. Output a clean environment-only game plate.`;
}

function playerPrompt(packet) {
  return `CREATE A PRODUCTION SPRITE SHEET FROM THE REFERENCE IMAGE FOR XPLAY.\n\nCHARACTER: ${packet.player.name}. Identity: ${packet.player.identity}. Visible appearance cues: ${packet.player.appearance.join(', ')}.\nSTYLE: polished 64-bit-era arcade brawler character art that matches the reference scene. Preserve skin tone, hair, outfit, silhouette, proportions, and martial-arts identity.\n\nOUTPUT EXACTLY EIGHT FULL-BODY POSES IN A CLEAN 4 COLUMNS × 2 ROWS GRID, identical cell size and baseline:\nrow 1: idle, walk contact, walk passing, walk contact alternate.\nrow 2: punch windup, punch impact, hurt reaction, victory/ready pose.\n\nIMPORTANT: transparent background; no environment; no oval or vignette; no floor patch; no text; no labels; no HUD; no other characters; no cropped limbs. Keep the character centered in each cell with generous transparent padding. The grid must be regular enough for a game runtime to slice into 4×2 frames.`;
}

function enemyPrompt(packet) {
  const list = packet.enemies.map((e,i)=>`${i+1}. ${e.name} — weapon: ${e.weapon}; region: ${e.region}`).join('\n');
  return `CREATE A PRODUCTION ENEMY SPRITE ATLAS FROM THE REFERENCE IMAGE FOR XPLAY.\n\nVISIBLE ENEMIES:\n${list}\n\nSTYLE: same polished 64-bit-era arcade brawler look as the reference. Preserve each enemy's distinct visible identity, hair/headwear, clothing palette, build, and weapon where visible.\n\nOUTPUT A 4 COLUMNS × ${Math.max(1,packet.enemies.length)} ROWS GRID. ONE ENEMY PER ROW. Columns are: idle, walk/advance, attack, hurt/knockback. Full body in every cell. Consistent baseline and cell size.\n\nCRITICAL: transparent background only; no environment; no circular crop; no text; no labels; no HUD; no duplicated extra characters; no cropped limbs. Keep weapon attached to the correct enemy.`;
}

async function imageEditFromUpload(file, prompt, opts={}) {
  const c = client();
  if (!c) throw new Error('OPENAI_API_KEY is not configured.');
  if (!file?.mimetype?.startsWith('image/')) throw new Error('A valid source image is required.');
  const image = await toFile(file.buffer, file.originalname || 'source.png', { type: file.mimetype });
  const result = await c.images.edit({
    model: IMAGE_MODEL,
    image,
    prompt,
    size: opts.size || '1536x1024',
    quality: opts.quality || 'medium',
    background: opts.background || 'opaque',
    output_format: 'png'
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error('Image model returned no image data.');
  return `data:image/png;base64,${b64}`;
}

function parsePacketField(body) {
  const raw = body.packet;
  if (!raw) throw new Error('Locked packet is required.');
  return ScenePacket.passthrough().parse(typeof raw === 'string' ? JSON.parse(raw) : raw);
}

app.post('/api/assets/stage', upload.single('image'), async (req,res) => {
  try {
    const packet = parsePacketField(req.body);
    const imageDataUrl = await imageEditFromUpload(req.file, stagePrompt(packet), { size:'1536x1024', quality:'medium', background:'opaque' });
    res.json({ ok:true, imageDataUrl, prompt:stagePrompt(packet), model:IMAGE_MODEL });
  } catch(err) {
    console.error('STAGE ERROR', err);
    res.status(err.status||500).json({ok:false,error:err.message||String(err)});
  }
});

app.post('/api/assets/player', upload.single('image'), async (req,res) => {
  try {
    const packet = parsePacketField(req.body);
    const imageDataUrl = await imageEditFromUpload(req.file, playerPrompt(packet), { size:'1536x1024', quality:'medium', background:'transparent' });
    res.json({ ok:true, imageDataUrl, prompt:playerPrompt(packet), model:IMAGE_MODEL, grid:{cols:4,rows:2} });
  } catch(err) {
    console.error('PLAYER ERROR', err);
    res.status(err.status||500).json({ok:false,error:err.message||String(err)});
  }
});

app.post('/api/assets/enemies', upload.single('image'), async (req,res) => {
  try {
    const packet = parsePacketField(req.body);
    const imageDataUrl = await imageEditFromUpload(req.file, enemyPrompt(packet), { size:'1536x1024', quality:'medium', background:'transparent' });
    res.json({ ok:true, imageDataUrl, prompt:enemyPrompt(packet), model:IMAGE_MODEL, grid:{cols:4,rows:Math.max(1,packet.enemies.length)} });
  } catch(err) {
    console.error('ENEMY ERROR', err);
    res.status(err.status||500).json({ok:false,error:err.message||String(err)});
  }
});

app.use((err,_req,res,_next)=>{
  console.error('SERVER MIDDLEWARE ERROR',err);
  res.status(400).json({ok:false,error:err.message||String(err)});
});

app.listen(PORT, () => {
  console.log('============================================================');
  console.log('XPLAY OPENAI64 FRESH TEST — CLEAN SERVER');
  console.log(`Open: http://localhost:${PORT}`);
  console.log(`Vision: ${VISION_MODEL}`);
  console.log(`Image:  ${IMAGE_MODEL}`);
  console.log(`Key configured: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`Env: ${envLoadedFrom || 'default process environment'}`);
  console.log('============================================================');
});
