const fs = require('fs');
const path = require('path');
const express = require('express');
const sharp = require('sharp');

function loadEnv() {
  const dotenv = require('dotenv');
  const candidates = [
    path.join(__dirname, '.env'),
    path.join(__dirname, 'server', '.env'),
    path.resolve(__dirname, '..', '..', '..', 'server', '.env'),
    path.resolve(__dirname, '..', '..', '..', '..', 'server', '.env'),
    path.resolve(__dirname, '..', '..', '..', '..', '..', 'server', '.env')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      console.log('ENV:', p);
      break;
    }
  }
}
loadEnv();

const app = express();
const PORT = Number(process.env.PORT || 8832);
const games = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'games.json'), 'utf8'));
const byId = new Map(games.map(g => [g.id, g]));
const cacheRoot = path.join(__dirname, 'cache');

app.use(express.json({limit:'2mb'}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/cache', express.static(cacheRoot));

function safe(s){ return String(s).replace(/[^a-z0-9_-]/gi,'-'); }
function gameDir(id){ const p=path.join(cacheRoot,safe(id)); fs.mkdirSync(p,{recursive:true}); return p; }

function getAsset(game, assetId){
  if (assetId === 'stage') return {
    id:'stage', type:'stage', name:'Environment Plate',
    prompt: game.backgroundPrompt
  };
  for (const actor of game.actors || []) {
    for (const state of actor.states || []) {
      const id = `${actor.id}__${state}`;
      if (id === assetId) return {id,type:'pose',actor,state,name:`${actor.name} — ${state}`};
    }
  }
  for (const prop of game.props || []) {
    const id = `prop__${prop}`;
    if (id === assetId) return {id,type:'prop',prop,name:prop};
  }
  return null;
}

function assetPrompt(game, asset) {
  const common = `
XPLAY CUTOUT BEAST CONTRACT:
The supplied screenshot is REFERENCE ONLY for identity, visual style, materials, palette and design language.
Do not crop directly from the screenshot.
Reconstruct the requested asset cleanly.
For isolated assets output exactly ONE subject on a true transparent RGBA background.
No rectangle background. No panel. No floor. No scenery. No text. No labels. No border.
Keep the COMPLETE visible silhouette inside frame with at least 15% transparent safety margin on every side.
Do not cut off hair, hands, fingers, feet, clothing tails, weapons, tools, wheels, fins, ears or props.
Do not place any second pose or neighboring sprite in the image.
Do not merge VFX into the silhouette unless specifically requested.
Use consistent canonical proportions and preserve identifying colors/materials.
`;
  if (asset.type === 'stage') return `${game.backgroundPrompt}\n\nPreserve style: ${game.style}. ${common}\nOUTPUT EXCEPTION: stage is opaque landscape art, not transparent.`;
  if (asset.type === 'pose') {
    const a = asset.actor;
    return `${game.analysisPrompt}
STYLE: ${game.style}
REQUESTED CHARACTER: ${a.name}. ${a.description}
ROLE: ${a.role}. FACING: ${a.facing}.
REQUESTED STATE: ${asset.state}.
${common}
Render one full-body ${asset.state} state only. Keep a neutral transparent margin around the silhouette.`;
  }
  return `${game.analysisPrompt}
STYLE: ${game.style}
REQUESTED PROP: ${asset.prop}.
${common}
Render exactly one complete gameplay prop, isolated and centered.`;
}

async function callOpenAIImage({sourcePath,prompt,transparent,size}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured.');
  const fd = new FormData();
  fd.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
  fd.append('prompt', prompt);
  fd.append('size', size);
  fd.append('quality', process.env.CUTOUT_IMAGE_QUALITY || 'medium');
  if (transparent) fd.append('background','transparent');
  const buf = fs.readFileSync(sourcePath);
  fd.append('image', new Blob([buf],{type:'image/png'}), path.basename(sourcePath));
  const r = await fetch('https://api.openai.com/v1/images/edits', {
    method:'POST', headers:{Authorization:`Bearer ${key}`}, body:fd
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `OpenAI image edit failed (${r.status})`);
  const item = j.data?.[0] || {};
  if (item.b64_json) return Buffer.from(item.b64_json,'base64');
  if (item.url) {
    const ir = await fetch(item.url);
    if (!ir.ok) throw new Error(`Generated image download failed (${ir.status})`);
    return Buffer.from(await ir.arrayBuffer());
  }
  throw new Error('OpenAI returned no image data.');
}

async function alphaInfo(inputBuffer) {
  const {data, info} = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let minX=info.width, minY=info.height, maxX=-1, maxY=-1, count=0, edgeCount=0;
  const edgeBand = Math.max(3, Math.round(Math.min(info.width,info.height)*0.01));
  for (let y=0;y<info.height;y++) {
    for (let x=0;x<info.width;x++) {
      const a = data[(y*info.width+x)*4+3];
      if (a > 14) {
        count++;
        if (x<minX) minX=x; if (x>maxX) maxX=x;
        if (y<minY) minY=y; if (y>maxY) maxY=y;
        if (x<edgeBand || y<edgeBand || x>=info.width-edgeBand || y>=info.height-edgeBand) edgeCount++;
      }
    }
  }
  if (!count) return {ok:false,width:info.width,height:info.height,reason:'No visible alpha silhouette found.'};
  const w=maxX-minX+1,h=maxY-minY+1;
  const margins = {left:minX/info.width,right:(info.width-1-maxX)/info.width,top:minY/info.height,bottom:(info.height-1-maxY)/info.height};
  return {ok:true,width:info.width,height:info.height,bounds:{left:minX,top:minY,width:w,height:h},margins,edgeCount,alphaPixels:count};
}

async function cleanPose(inputBuffer, outPath) {
  const info = await alphaInfo(inputBuffer);
  if (!info.ok) throw new Error(info.reason);
  const b = info.bounds;
  const extracted = await sharp(inputBuffer).extract(b).png().toBuffer();
  const target = 768;
  const safety = Math.round(target * 0.15);
  const maxW = target - safety*2, maxH = target - safety*2;
  const resized = await sharp(extracted).resize({width:maxW,height:maxH,fit:'inside',withoutEnlargement:false}).png().toBuffer();
  const meta = await sharp(resized).metadata();
  const left = Math.round((target-meta.width)/2);
  const top = target - safety - meta.height; // bottom-center anchor
  await sharp({
    create:{width:target,height:target,channels:4,background:{r:0,g:0,b:0,alpha:0}}
  }).composite([{input:resized,left,top}]).png().toFile(outPath);
  const cleaned = fs.readFileSync(outPath);
  const after = await alphaInfo(cleaned);
  const pass = after.ok &&
    after.margins.left >= 0.08 && after.margins.right >= 0.08 &&
    after.margins.top >= 0.08 && after.margins.bottom >= 0.08 &&
    after.edgeCount === 0;
  return {before:info,after,pass};
}

app.get('/api/health', (_q,res) => res.json({
  ok:true,
  openAIConfigured:!!process.env.OPENAI_API_KEY,
  model:process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
  quality:process.env.CUTOUT_IMAGE_QUALITY || 'medium',
  mode:'cutout-beast-v1-pose-by-pose-alpha-normalized',
  port:PORT
}));

app.get('/api/games', (_q,res) => res.json({ok:true,games}));

app.get('/api/cache/:gameId', (req,res) => {
  const game=byId.get(req.params.gameId);
  if (!game) return res.status(404).json({ok:false,error:'Unknown game'});
  const dir=gameDir(game.id);
  const files=fs.readdirSync(dir).filter(f=>f.endsWith('.png')||f.endsWith('.json'));
  res.json({ok:true,files});
});

app.post('/api/generate/:gameId/:assetId', async (req,res) => {
  try {
    const game=byId.get(req.params.gameId);
    if (!game) return res.status(404).json({ok:false,error:'Unknown game'});
    const asset=getAsset(game,req.params.assetId);
    if (!asset) return res.status(404).json({ok:false,error:'Unknown asset'});
    const dir=gameDir(game.id);
    const cleanPath=path.join(dir,`${safe(asset.id)}.png`);
    const metaPath=path.join(dir,`${safe(asset.id)}.json`);
    if (fs.existsSync(cleanPath) && !req.body?.force) {
      return res.json({ok:true,cached:true,asset,url:`/cache/${game.id}/${path.basename(cleanPath)}`,meta:fs.existsSync(metaPath)?JSON.parse(fs.readFileSync(metaPath,'utf8')):null});
    }
    const sourcePath=path.join(__dirname,'public','assets','source',`${game.id}.png`);
    const prompt=assetPrompt(game,asset);
    const transparent=asset.type!=='stage';
    const size=transparent?(process.env.CUTOUT_POSE_SIZE||'1024x1024'):(process.env.CUTOUT_STAGE_SIZE||'1536x1024');
    const raw=await callOpenAIImage({sourcePath,prompt,transparent,size});
    let validation=null;
    if (transparent) validation=await cleanPose(raw,cleanPath);
    else await sharp(raw).png().toFile(cleanPath);
    const meta={gameId:game.id,assetId:asset.id,type:asset.type,name:asset.name,prompt,validation,generatedAt:new Date().toISOString(),model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-1',quality:process.env.CUTOUT_IMAGE_QUALITY||'medium'};
    fs.writeFileSync(metaPath,JSON.stringify(meta,null,2));
    res.json({ok:true,cached:false,asset,url:`/cache/${game.id}/${path.basename(cleanPath)}`,meta});
  } catch(e) {
    res.status(500).json({ok:false,error:e.message||String(e)});
  }
});

app.post('/api/assemble/:gameId/:actorId', async (req,res) => {
  try {
    const game=byId.get(req.params.gameId);
    if (!game) return res.status(404).json({ok:false,error:'Unknown game'});
    const actor=(game.actors||[]).find(a=>a.id===req.params.actorId);
    if (!actor) return res.status(404).json({ok:false,error:'Unknown actor'});
    const dir=gameDir(game.id);
    const paths=actor.states.map(s=>path.join(dir,`${actor.id}__${s}.png`));
    const missing=paths.filter(p=>!fs.existsSync(p)).map(p=>path.basename(p));
    if (missing.length) return res.status(400).json({ok:false,error:'Generate all actor states first.',missing});
    const cell=768,gutter=32,cols=4,rows=Math.ceil(paths.length/cols);
    const width=cols*cell+(cols+1)*gutter,height=rows*cell+(rows+1)*gutter;
    const comps=[];
    paths.forEach((p,i)=>{
      const c=i%cols,r=Math.floor(i/cols);
      comps.push({input:p,left:gutter+c*(cell+gutter),top:gutter+r*(cell+gutter)});
    });
    const out=path.join(dir,`${actor.id}__atlas.png`);
    await sharp({create:{width,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(comps).png().toFile(out);
    const map={cell,gutter,cols,rows,states:actor.states};
    fs.writeFileSync(path.join(dir,`${actor.id}__atlas.json`),JSON.stringify(map,null,2));
    res.json({ok:true,url:`/cache/${game.id}/${path.basename(out)}`,map});
  } catch(e) { res.status(500).json({ok:false,error:e.message||String(e)}); }
});

app.listen(PORT,()=>console.log(`XPLAY CUTOUT BEAST 8-GAME LAB: http://localhost:${PORT}`));
