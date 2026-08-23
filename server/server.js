require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const OpenAI = require('openai');
const localUpscaler = require('./localUpscaler');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });
const PORT = Number(process.env.PORT || 8788);

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

function client() {
  return process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
}
function outText(r) {
  if (r.output_text) return r.output_text;
  const a = [];
  for (const item of r.output || []) for (const c of item.content || []) if (c.text) a.push(c.text);
  return a.join('\n');
}
function strip(s) {
  return String(s || '').replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
}

const VISION_PROMPT = `Return ONLY valid JSON. Analyze the image as an XPLAY game screenshot and freeze the visible truth. Do not drift to another preset or genre. Required fields: title, primaryGenre, genreCandidates, player, enemies, landmarks, palette, camera, gameplay, world, hud, summary, buildPrompt. For a side-view multi-enemy beat-em-up, primaryGenre must be fighting and genreCandidates should include beat-em-up. Preserve visible player identity, enemy roles, scene landmarks, camera, HUD hierarchy, and gameplay cues. Unknown stays unknown. Do not replace visible facts with generic city/street/rooftop content.`;

const VISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title','primaryGenre','genreCandidates','player','enemies','landmarks',
    'palette','camera','gameplay','world','hud','summary','buildPrompt'
  ],
  properties: {
    title: { type: 'string' },
    primaryGenre: { type: 'string' },
    genreCandidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type','score','source'],
        properties: {
          type: { type: 'string' },
          score: { type: 'number' },
          source: { type: 'string' }
        }
      }
    },
    player: {
      type: 'object',
      additionalProperties: false,
      required: ['name','identity','appearance','action'],
      properties: {
        name: { type: 'string' },
        identity: { type: 'string' },
        appearance: { type: 'array', items: { type: 'string' } },
        action: { type: 'string' }
      }
    },
    enemies: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name','weapon','region'],
        properties: {
          name: { type: 'string' },
          weapon: { type: 'string' },
          region: { type: 'string' }
        }
      }
    },
    landmarks: { type: 'array', items: { type: 'string' } },
    palette: { type: 'array', items: { type: 'string' } },
    camera: {
      type: 'object',
      additionalProperties: false,
      required: ['type','preserveComposition','extendForScroll'],
      properties: {
        type: { type: 'string' },
        preserveComposition: { type: 'boolean' },
        extendForScroll: { type: 'boolean' }
      }
    },
    gameplay: {
      type: 'object',
      additionalProperties: false,
      required: ['intention','cues','stageTime','tests'],
      properties: {
        intention: { type: 'string' },
        cues: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['type','score','source'],
            properties: {
              type: { type: 'string' },
              score: { type: 'number' },
              source: { type: 'string' }
            }
          }
        },
        stageTime: { type: 'number' },
        tests: { type: 'array', items: { type: 'string' } }
      }
    },
    world: {
      type: 'object',
      additionalProperties: false,
      required: ['width','targetSeconds','scrolling'],
      properties: {
        width: { type: 'number' },
        targetSeconds: { type: 'number' },
        scrolling: { type: 'boolean' }
      }
    },
    hud: {
      type: 'object',
      additionalProperties: false,
      required: ['present','elements'],
      properties: {
        present: { type: 'boolean' },
        elements: { type: 'array', items: { type: 'string' } }
      }
    },
    summary: { type: 'string' },
    buildPrompt: { type: 'string' }
  }
};

app.get('/api/health', (_q, res) => res.json({
  ok: !!process.env.OPENAI_API_KEY,
  configured: !!process.env.OPENAI_API_KEY,
  visionModel: process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini',
  imageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
  localUpscaler: localUpscaler.status(),
  mode: 'vision-lock-interpreter-64bit-asset-forge-v4-mime-source-fix'
}));

app.get('/api/upscale/health', (_q, res) => {
  const upscaler = localUpscaler.status();
  res.status(upscaler.available ? 200 : 503).json({
    ok: upscaler.available,
    zeroApiUsage: true,
    upscaler
  });
});

app.post('/api/upscale/:scale', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'PNG image is required.' });
    if (!req.file.mimetype || !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ ok: false, error: 'Only image uploads can be upscaled.' });
    }

    const scale = Number(String(req.params.scale || '').replace(/x$/i, ''));
    const kind = String(req.body.kind || 'general').toLowerCase();
    const requestedModel = req.body.model ? String(req.body.model) : undefined;
    const result = await localUpscaler.upscaleBuffer(req.file.buffer, {
      scale,
      kind,
      model: requestedModel
    });

    res.json({
      ok: true,
      scale: result.scale,
      model: result.model,
      zeroApiUsage: true,
      mimeType: 'image/png',
      image: `data:image/png;base64,${result.buffer.toString('base64')}`
    });
  } catch (e) {
    const message = e.message || String(e);
    const missingExe = /executable not found/i.test(message);
    res.status(missingExe ? 503 : 500).json({
      ok: false,
      zeroApiUsage: true,
      error: message,
      upscaler: localUpscaler.status()
    });
  }
});

app.post('/api/vision/analyze', upload.single('image'), async (req, res) => {
  try {
    const c = client();
    if (!c) return res.status(400).json({ ok: false, error: 'OPENAI_API_KEY is not configured.' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'No image uploaded.' });
    if (!req.file.mimetype || !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        ok: false,
        error: `Rejected non-image upload before OpenAI call. Received MIME: ${req.file.mimetype || 'unknown'}`
      });
    }

    const model = process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini';
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const input = [
      { role: 'system', content: [{ type: 'input_text', text: VISION_PROMPT }] },
      { role: 'user', content: [
        { type: 'input_text', text: req.body.context || 'Analyze and lock this screenshot as the source of truth for a playable conversion.' },
        { type: 'input_image', image_url: dataUrl }
      ] }
    ];

    let r;
    let structured = true;

    try {
      r = await c.responses.create({
        model,
        input,
        text: {
          format: {
            type: 'json_schema',
            name: 'xplay_scene_packet',
            description: 'A locked XPLAY scene packet derived only from the uploaded screenshot.',
            strict: true,
            schema: VISION_SCHEMA
          }
        },
        max_output_tokens: 2200
      });
    } catch (schemaError) {
      structured = false;
      r = await c.responses.create({
        model,
        input,
        text: { format: { type: 'json_object' } },
        max_output_tokens: 2200
      });
    }

    const raw = strip(outText(r));
    let packet;

    try {
      packet = JSON.parse(raw);
    } catch (parseError) {
      const repair = await c.responses.create({
        model,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: 'Repair the supplied malformed XPLAY packet. Preserve the information. Do not add new scene facts.' }]
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: raw }]
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'xplay_scene_packet_repair',
            strict: true,
            schema: VISION_SCHEMA
          }
        },
        max_output_tokens: 2200
      });

      const repairedRaw = strip(outText(repair));
      try {
        packet = JSON.parse(repairedRaw);
        return res.json({
          ok: true,
          packet,
          raw: repairedRaw,
          model,
          structuredOutput: true,
          repaired: true
        });
      } catch {
        return res.status(502).json({
          ok: false,
          error: 'Vision packet could not be normalized into valid JSON.',
          raw,
          model
        });
      }
    }

    return res.json({
      ok: true,
      packet,
      raw,
      model,
      structuredOutput: structured,
      repaired: false
    });
  } catch (e) {
    return res.status(e.status || 500).json({
      ok: false,
      error: e.message || String(e)
    });
  }
});

function styleTruth(packet) {
  return `LOCKED XPLAY SOURCE TRUTH:\nTitle: ${packet.title || 'Untitled'}\nGenre: ${packet.primaryGenre || 'fighting'}\nPlayer: ${packet.player?.name || 'Alex'} — ${packet.player?.identity || ''}. Appearance: ${(packet.player?.appearance || []).join(', ')}.\nEnemies: ${(packet.enemies || []).map(e => `${e.name}${e.weapon ? ` (${e.weapon})` : ''}`).join('; ')}.\nLandmarks: ${(packet.landmarks || []).join('; ')}.\nPalette: ${(packet.palette || []).join(', ')}.\nCamera: ${packet.camera?.type || '2D side-view beat-em-up'}.\nGameplay: ${packet.gameplay?.intention || ''}.`;
}

function assetPrompt(kind, packet) {
  const truth = styleTruth(packet);
  const common = `\nVISUAL ERA TARGET: polished late-1990s / early-2000s 64-bit arcade-console game art. Crisp readable silhouettes, intentional low-poly/64-bit forms, hand-authored texture feel, saturated moonlit industrial lighting, strong arcade readability. Preserve the source identities and color relationships. DO NOT redesign the genre, characters, landmarks, or camera. DO NOT add unrelated assets.\n`;
  if (kind === 'stage') return `${truth}${common}\nOUTPUT: one clean SIDE-VIEW ENVIRONMENT PLATE only, landscape composition, no player, no enemies, no HUD, no portraits, no health bars, no text overlays except environmental signage that belongs in the source world. Reconstruct the same dockyard after the fighters have stepped out of frame. Preserve the B7 security entrance, chain-link fence, green barrels, Zenith Industries container, danger sign, metal stairs/catwalk, moonlit skyline, hazard-striped concrete. Extend the world horizontally in the same visual grammar so it can support side-scrolling. Do not mirror the scene mechanically. Do not repeat HUD elements. Keep a clear walkable combat plane across the lower third.`;
  if (kind === 'player') return `${truth}${common}\nOUTPUT: a transparent-background CHARACTER SPRITE SHEET for ${packet.player?.name || 'Alex'} only. STRICT 4 columns x 2 rows, exactly eight full-body cells. Row 1: idle A, idle B, walk A, walk B. Row 2: punch wind-up, punch impact, hurt reaction, knockdown. Same character identity, white sleeveless gi, black belt, barefoot, afro and proportions across every cell. Character faces right in all standing/action cells. Every pose completely inside its cell with generous transparent padding. Same baseline and scale. NO background, NO floor, NO shadows, NO HUD, NO labels, NO text, NO other characters, NO circular crop, NO vignette. Transparent RGBA background.`;
  return `${truth}${common}\nOUTPUT: a transparent-background ENEMY SPRITE ATLAS. STRICT 4 columns x 3 rows, exactly twelve full-body cells. Row 1 is ${packet.enemies?.[0]?.name || 'Knife Punk'} with visible knife: idle, approach, attack, hurt. Row 2 is ${packet.enemies?.[1]?.name || 'Bandanna Rival'}: idle, approach, punch/attack, hurt. Row 3 is ${packet.enemies?.[2]?.name || 'Blue Cap Brawler'}: idle, approach, heavy attack, hurt. Preserve each enemy's distinctive headwear, clothing, body build and palette from the screenshot. All characters face left toward the player, same scale within each row, same baseline, full bodies completely visible. NO background, NO floor, NO shadows, NO HUD, NO labels, NO text, NO decorative frame, NO circular crop. Transparent RGBA background.`;
}

async function callImageEdit({ file, prompt, transparent }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not configured.');
  const fd = new FormData();
  fd.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2');
  fd.append('prompt', prompt);
  fd.append('size', '1536x1024');
  fd.append('quality', 'high');
  if (transparent) fd.append('background', 'transparent');
  const blob = new Blob([file.buffer], { type: file.mimetype || 'image/png' });
  fd.append('image', blob, file.originalname || 'source.png');
  const r = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: fd
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `OpenAI image edit failed (${r.status})`);
  const item = j.data?.[0] || {};
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item.url) return item.url;
  throw new Error('OpenAI image API returned no image data.');
}

app.post('/api/assets/forge64/:kind', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'Reference screenshot is required.' });
    let packet;
    try { packet = JSON.parse(req.body.packet || '{}'); }
    catch { return res.status(400).json({ ok: false, error: 'Locked packet JSON is invalid.' }); }
    const kind = req.params.kind;
    if (!['stage', 'player', 'enemies'].includes(kind)) return res.status(400).json({ ok: false, error: 'Unknown asset kind.' });
    const prompt = assetPrompt(kind, packet);
    const image = await callImageEdit({ file: req.file, prompt, transparent: kind !== 'stage' });
    res.json({ ok: true, kind, model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2', prompt, image });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

app.listen(PORT, () => {
  const upscaler = localUpscaler.status();
  console.log(`XPLAY Vision → Interpreter → 64-bit Asset Forge Lab: http://localhost:${PORT}`);
  console.log(`Local Upscale Beast: ${upscaler.available ? 'READY' : 'WAITING FOR REAL-ESRGAN'} (${upscaler.exePath})`);
});
