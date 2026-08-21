
function stripCodeFences(s='') {
  return String(s).replace(/```(?:json)?/gi,'').replace(/```/g,'').trim();
}

function parseJsonLoose(s='') {
  const clean = stripCodeFences(s);
  try { return JSON.parse(clean); } catch {}
  const first = clean.indexOf('{');
  const last = clean.lastIndexOf('}');
  if (first >= 0 && last > first) return JSON.parse(clean.slice(first, last + 1));
  throw new Error('Gemini did not return valid JSON.');
}

function getGeminiText(payload) {
  return payload?.candidates?.[0]?.content?.parts?.map(p=>p?.text||'').join('\n').trim() || '';
}

async function geminiJSON({ apiKey, model, instruction, imageDataUrl }) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const parts = [{ text: instruction }];
  if (imageDataUrl && /^data:image\//i.test(imageDataUrl)) {
    const m = imageDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/i);
    if (m) parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
  }

  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.15 }
    })
  });

  const out = await r.json().catch(()=>({}));
  if (!r.ok) {
    const msg = out?.error?.message || `Gemini HTTP ${r.status}`;
    throw new Error(msg);
  }
  const text = getGeminiText(out);
  if (!text) throw new Error('Gemini returned no text.');
  return parseJsonLoose(text);
}

function requireObject(name, v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`${name} is missing or invalid.`);
  return v;
}

function normalizeEngine(v='') {
  const raw = String(v).toLowerCase().replace(/[^a-z0-9]+/g,'');
  const map = {
    firstpersonshooter:'fps', shooter:'fps',
    fighting:'fighting', fighter:'fighting', beatemup:'fighting', brawler:'fighting',
    openworld:'openworld', platform:'platformer', platformer:'platformer',
    race:'racing', racing:'racing', runner:'runner', dodge:'dodge',
    collect:'collect', rhythm:'rhythm', puzzle:'puzzle', fps:'fps'
  };
  return map[raw] || raw;
}

const INTERPRETER_SCHEMA = `{
  "game_identity": {
    "engine_recommendation": "one of: runner,dodge,collect,rhythm,puzzle,fps,fighting,openworld,racing,platformer",
    "subgenre": "specific subgenre",
    "confidence": 0,
    "reason": "why"
  },
  "player": {
    "identity": "source-grounded player description",
    "role": "player role",
    "core_actions": [],
    "movement": "movement model"
  },
  "camera": {
    "view": "camera/view",
    "behavior": "camera behavior",
    "movement_plane": "playable plane"
  },
  "enemies": [
    {
      "id": "stable id",
      "role": "combat/gameplay role",
      "appearance": "source-grounded appearance",
      "behaviors": []
    }
  ],
  "environment": {
    "theme": "source-grounded environment",
    "foreground": [],
    "midground": [],
    "background": [],
    "traversable_space": "how player moves through it"
  },
  "hud": {
    "elements": [],
    "meaning": {}
  },
  "game_loop": {
    "moment_to_moment": [],
    "progression": "progression logic",
    "win_condition": "win condition",
    "lose_condition": "lose condition"
  },
  "mechanical_locks": {
    "must_preserve": [],
    "must_not_invent": []
  }
}`;

const ASSET_SCHEMA = `{
  "target_style": "visual target",
  "production_strategy": {
    "summary": "overall plan",
    "source_is_truth": true
  },
  "assets": [
    {
      "id": "stable asset id",
      "name": "human readable name",
      "category": "character|enemy|environment|tileset|prop|fx|ui|audio",
      "strategy": "extract|rebuild|extend|synthesize",
      "reason": "why this strategy",
      "source_reference": "what in the source grounds this asset",
      "required_states_or_variants": [],
      "tool_route": [],
      "deliverables": [],
      "qa_gates": []
    }
  ],
  "world_extension": {
    "needed": true,
    "directions": [],
    "layer_plan": [],
    "continuity_rules": []
  },
  "sprite_rules": {
    "transparent_background": true,
    "consistent_scale": true,
    "consistent_identity": true,
    "animation_sets": {}
  },
  "hard_locks": {
    "preserve_subject_identity": true,
    "preserve_camera_language": true,
    "preserve_environment_theme": true,
    "preserve_palette_bias": true,
    "forbid_unlisted_generic_assets": true
  }
}`;

const BUILDER_SCHEMA = `{
  "engine_template": "locked engine id",
  "engine_authority": "user-selected|interpreter-recommended",
  "source_contract": {
    "player": "source-grounded player",
    "environment": "source-grounded environment",
    "camera": "camera contract",
    "visual_locks": []
  },
  "asset_bindings": {
    "player": [],
    "enemies": [],
    "world": [],
    "ui": [],
    "fx": []
  },
  "controls": {},
  "mechanics": {},
  "enemy_ai": [],
  "encounters": [],
  "level_flow": [],
  "hud_logic": {},
  "win_condition": "win",
  "lose_condition": "lose",
  "build_gates": [
    "must have required player animation",
    "must have required enemy animation",
    "must have traversable world",
    "must preserve locked engine",
    "must not use unrelated legacy assets"
  ]
}`;

export function registerPlayableTranslationRoutes(app, {
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_VISION_MODEL || 'gemini-3.6-flash'
} = {}) {

  app.get('/api/beasts/translation/health', (_req,res) => {
    res.status(apiKey ? 200 : 503).json({
      ok: !!apiKey,
      configured: !!apiKey,
      model,
      pipeline: 'vision-analysis -> interpreter -> asset-manifest -> builder-packet'
    });
  });

  app.post('/api/beasts/translation/run', async (req,res) => {
    try {
      const {
        analysis,
        imageDataUrl = '',
        selectedEngine = '',
        userIntent = '',
        mustKeep = ''
      } = req.body || {};

      if (!analysis || String(analysis).trim().length < 20) {
        return res.status(400).json({ ok:false, error:'A detailed Vision analysis is required.' });
      }

      const lockedEngine = normalizeEngine(selectedEngine);
      const sourceAnalysis = String(analysis).trim();

      const interpreterInstruction = `
You are the XPLAY GAME INTERPRETER BEAST.

MISSION:
Convert a literal Vision analysis into a playable game model. You are NOT an asset generator and NOT a builder.

SOURCE ANALYSIS:
${sourceAnalysis}

USER-SELECTED ENGINE:
${lockedEngine || 'none yet'}

USER INTENT:
${String(userIntent || 'none')}

MUST KEEP:
${String(mustKeep || 'none')}

AUTHORITY ORDER:
1. user-selected engine, when provided
2. explicit user intent
3. source Vision analysis
4. your recommendation

RULES:
- Treat the Vision analysis and attached image, if present, as source truth.
- Do not invent unrelated locations, characters, vehicles, props, genres, or legacy XPLAY content.
- If the user selected an engine, your recommendation MUST equal that engine.
- Translate what is visible into camera, movement plane, interactions, controls, enemies, environment, HUD meaning, game loop, progression, win/loss.
- Unknown remains unknown.
- Return JSON only.

OUTPUT EXACTLY THIS SHAPE:
${INTERPRETER_SCHEMA}
`;

      const interpreter = requireObject(
        'interpreter',
        await geminiJSON({ apiKey, model, instruction: interpreterInstruction, imageDataUrl })
      );

      if (lockedEngine) {
        interpreter.game_identity ||= {};
        interpreter.game_identity.engine_recommendation = lockedEngine;
        interpreter.game_identity.reason = `Locked by user selection. ${interpreter.game_identity.reason || ''}`.trim();
      }

      const assetInstruction = `
You are the XPLAY ASSET MANIFEST BEAST, a production planner and router.

You receive:
A) literal Vision truth
B) Game Interpreter packet
C) the original image when attached

VISION TRUTH:
${sourceAnalysis}

GAME INTERPRETER PACKET:
${JSON.stringify(interpreter, null, 2)}

MISSION:
Create the production asset manifest needed to realize THIS game accurately.

YOU MUST DECIDE FOR EACH ASSET:
- EXTRACT: source pixels are usable as reference/cutout
- REBUILD: source contains the object but a clean production-ready version is needed
- EXTEND: source contains part of a world/environment that must continue beyond the frame
- SYNTHESIZE: game requires missing frames/variants/effects not directly visible

TOOL ROUTES YOU MAY ASSIGN:
- segmentation (SAM2 / Grounded-SAM style)
- matting / alpha cleanup
- OCR
- monocular-depth / layer separation
- pose estimation
- sprite-synthesis
- animation inbetweening / motion completion
- tileset generation
- inpainting / outpainting / world-extension
- image-to-video motion reference
- UI reconstruction
- FX generation
- consistency QA
- collision-mask extraction

RULES:
- Manifest Beast is the authority on WHAT assets are required and HOW they should be produced.
- Do not generate unrelated filler.
- Characters needing animation are normally REBUILD, even if source cutouts are used as identity reference.
- Scrolling environments normally require EXTEND plus tile/layer deliverables.
- All sprite-sheet characters require transparent backgrounds.
- Every asset must state deliverables and QA gates.
- Return JSON only.

OUTPUT EXACTLY THIS SHAPE:
${ASSET_SCHEMA}
`;

      const assetManifest = requireObject(
        'assetManifest',
        await geminiJSON({ apiKey, model, instruction: assetInstruction, imageDataUrl })
      );

      const finalEngine = lockedEngine || normalizeEngine(interpreter?.game_identity?.engine_recommendation);

      const builderInstruction = `
You are the XPLAY PLAYABLE BUILDER PACKET COMPILER.

You do NOT write game code in this step.
Compile a strict handoff packet for the future specialist PLX builder.

VISION TRUTH:
${sourceAnalysis}

INTERPRETER:
${JSON.stringify(interpreter, null, 2)}

ASSET MANIFEST:
${JSON.stringify(assetManifest, null, 2)}

LOCKED/FINAL ENGINE:
${finalEngine || 'unknown'}

USER INTENT:
${String(userIntent || 'none')}

RULES:
- Only reference assets that exist in the Asset Manifest.
- Never substitute legacy/template characters, airports, runways, streets, props, or worlds unless source/manifest explicitly requires them.
- Engine is a hard contract once provided.
- Define controls, mechanics, AI, encounters, level flow, HUD logic, win/loss.
- Builder must fail closed if required assets are missing.
- Return JSON only.

OUTPUT EXACTLY THIS SHAPE:
${BUILDER_SCHEMA}
`;

      const builderPacket = requireObject(
        'builderPacket',
        await geminiJSON({ apiKey, model, instruction: builderInstruction, imageDataUrl })
      );

      if (finalEngine) {
        builderPacket.engine_template = finalEngine;
        builderPacket.engine_authority = lockedEngine ? 'user-selected' : 'interpreter-recommended';
      }

      res.json({
        ok: true,
        pipeline: 'analysis-to-playable-packets-v1',
        model,
        source: {
          analysis: sourceAnalysis,
          selectedEngine: lockedEngine || '',
          userIntent: String(userIntent || ''),
          mustKeep: String(mustKeep || '')
        },
        interpreter,
        assetManifest,
        builderPacket
      });
    } catch (e) {
      console.error('[translation pipeline]', e);
      res.status(500).json({ ok:false, error:e?.message || String(e) });
    }
  });
}
