const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });
const PORT = process.env.PORT || 8788;

app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function extractText(response) {
  if (response.output_text) return response.output_text;
  const output = response.output || [];
  const pieces = [];
  for (const item of output) {
    const content = item.content || [];
    for (const c of content) {
      if (c.type === 'output_text' && c.text) pieces.push(c.text);
    }
  }
  return pieces.join('\n').trim();
}

function stripFences(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
}

const SCHEMA_HINT = `Return ONLY valid JSON. No markdown. No commentary.
Build a scene-analysis packet for XPLAY from the uploaded image.
Use this shape:
{
  "title": string,
  "primaryGenre": "fighting" | "platformer" | "dodge" | "shooter" | "runner" | "puzzle" | string,
  "genreCandidates": [{ "type": string, "score": number, "source": "vision" }],
  "player": {
    "name": string,
    "identity": string,
    "appearance": string[],
    "action": string
  },
  "enemies": [{ "name": string, "weapon": string, "region": string }],
  "landmarks": string[],
  "palette": string[],
  "camera": {
    "type": string,
    "preserveComposition": true,
    "extendForScroll": boolean
  },
  "gameplay": {
    "intention": string,
    "cues": [{ "type": string, "score": number, "source": "vision" }],
    "stageTime": number,
    "tests": string[]
  },
  "world": {
    "width": number,
    "targetSeconds": number,
    "scrolling": boolean
  },
  "hud": {
    "present": boolean,
    "elements": string[]
  },
  "summary": string,
  "buildPrompt": string
}
Rules:
- If facts are unknown, keep them conservative and grounded.
- Prefer what is visibly present.
- Set source to "vision".
- Keep buildPrompt concise but useful for a game builder.
- Make title short and strong.
- For beat-em-up screenshots, prefer fighting as primaryGenre.
- world.targetSeconds should usually be 15 to 25.
- world.width should usually be 2200 to 3200 for scrolling scenes.`;

app.get('/api/vision/health', (req, res) => {
  const key = process.env.OPENAI_API_KEY || '';
  res.json({
    ok: !!key,
    provider: 'openai',
    configured: !!key,
    model: process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini',
    diagnostics: {
      envPresent: !!key,
      rawLength: key.length,
      trimmedLength: key.trim().length,
      service: 'xplay-openai-vision-test-lab'
    }
  });
});

app.post('/api/vision/analyze', upload.single('image'), async (req, res) => {
  try {
    const client = getClient();
    if (!client) {
      return res.status(400).json({ ok: false, error: 'OPENAI_API_KEY is not configured.' });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No image uploaded.' });
    }

    const userContext = String(req.body.context || '').trim();
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const model = process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini';

    const response = await client.responses.create({
      model,
      input: [
        {
          role: 'system',
          content: [
            { type: 'input_text', text: 'You are the OpenAI vision step inside XPLAY. Analyze screenshots for game-scene extraction.' },
            { type: 'input_text', text: SCHEMA_HINT }
          ]
        },
        {
          role: 'user',
          content: [
            { type: 'input_text', text: userContext || 'Analyze the uploaded image as a game scene and return the JSON packet.' },
            { type: 'input_image', image_url: dataUrl }
          ]
        }
      ],
      max_output_tokens: 1800
    });

    const rawText = stripFences(extractText(response));
    let packet;
    try {
      packet = JSON.parse(rawText);
    } catch (parseError) {
      return res.status(502).json({
        ok: false,
        error: 'Model response was not valid JSON.',
        rawText,
        model
      });
    }

    return res.json({
      ok: true,
      provider: 'openai',
      model,
      packet,
      rawText
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      ok: false,
      error: error.message || 'Unknown server error.',
      details: error.response?.data || null
    });
  }
});

app.listen(PORT, () => {
  console.log(`XPLAY OpenAI Vision Test Lab running at http://localhost:${PORT}`);
});
