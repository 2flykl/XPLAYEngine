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
    if (fs.existsSync(p)) { dotenv.config({ path:p }); console.log('ENV:', p); break; }
  }
}
loadEnv();

const app = express();
const PORT = Number(process.env.PORT || 8833);
const games = JSON.parse(fs.readFileSync(path.join(__dirname,'data','games.json'),'utf8'));
const byId = new Map(games.map(g=>[g.id,g]));
const cacheRoot = path.join(__dirname,'cache');

app.use(express.json({limit:'2mb'}));
app.use(express.static(path.join(__dirname,'public')));
app.use('/cache', express.static(cacheRoot));

const safe = s => String(s).replace(/[^a-z0-9_-]/gi,'-');
function gameDir(id){ const p=path.join(cacheRoot,safe(id)); fs.mkdirSync(p,{recursive:true}); return p; }

function actorSheetPrompt(game, actor) {
  const cols = actor.sheet?.columns || 4;
  const rows = actor.sheet?.rows || Math.ceil(actor.states.length/cols);
  const stateLines = [];
  actor.states.forEach((s,i)=>{
    const r=Math.floor(i/cols)+1,c=(i%cols)+1;
    stateLines.push(`row ${r}, column ${c}: ${s}`);
  });
  return `
XPLAY SPRITE-SHEET BEAST — HARD GRID CONTRACT

SOURCE SCREENSHOT PURPOSE:
Use the screenshot only to preserve the game's visual style, character identity, materials, palette, body proportions, costume, weapons/tools, and camera-era look.
DO NOT crop the character out of the screenshot. Reconstruct the character as production-ready sprite art.

GAME: ${game.title}
GENRE: ${game.genre}
STYLE: ${game.style}
CHARACTER: ${actor.name}
ROLE: ${actor.role}
IDENTITY/DESIGN: ${actor.description}
DEFAULT FACING: ${actor.facing}

OUTPUT ONE TRANSPARENT PNG SPRITE SHEET ONLY.
EXACT GRID: ${cols} columns x ${rows} rows.
EXACT STATES:
${stateLines.join('\n')}

SPRITE-SHEET SAFETY RULES:
- Transparent RGBA background across the entire sheet.
- Every state must stay completely inside its own grid cell.
- Leave at least 12% transparent internal padding on all four sides of EVERY cell.
- Leave visually obvious transparent gutters between neighboring poses.
- No hair, hands, fingers, feet, clothing tails, weapons, tools, ears, wheels, effects, or shadows may cross a cell boundary.
- No pose may touch or overlap another pose.
- No decorative frames, labels, captions, floor, environment, HUD, circles, panels, or colored boxes.
- Keep consistent scale, body proportions, baseline, costume and identity across all cells.
- Full-body pose in every cell unless the state logically requires a fall/knockdown pose; even then the full silhouette must remain completely visible.
- Preserve weapon/tool silhouettes in full.
- Do not fuse impact VFX into the body unless the state explicitly requires it.
- Make each requested state visually distinct and readable in gameplay.

The final sheet will be automatically cell-sliced, alpha-trimmed, silhouette-cleaned and re-packed by XPLAY. Therefore the grid and gutters MUST be clean and regular.
`.trim();
}

function stagePrompt(game){
  return `${game.backgroundPrompt}

XPLAY STAGE PLATE CONTRACT:
- Preserve ${game.style}.
- Opaque landscape environment only.
- No player, enemies, NPCs, vehicles that are gameplay actors, HUD, portraits, health bars or floating combat VFX.
- Preserve the screenshot's major landmarks and composition.
- Extend the navigable world coherently enough for approximately ${game.targetSeconds} seconds of play.
`.trim();
}

function complementarySheetPrompt(game){
  const items = (game.props && game.props.length ? game.props : ['pickup','breakable_crate','sign','small-prop']);
  const cols = 4;
  const rows = Math.max(2, Math.ceil(items.length/cols));
  const lines = items.map((p,i)=>{
    const r = Math.floor(i/cols)+1, c = (i%cols)+1;
    return `row ${r}, column ${c}: ${p}`;
  });
  return `
XPLAY COMPLEMENTARY SPRITE-SHEET BEAST — SUPPORT ASSET CONTRACT

SOURCE SCREENSHOT PURPOSE:
Use the screenshot only to preserve the game's visual language, materials, palette, lighting, prop design language, scale logic, and camera-era feel.
Do NOT crop literal objects from the screenshot. Reconstruct clean production-ready support assets that complement the stage and generated actors.

GAME: ${game.title}
GENRE: ${game.genre}
STYLE: ${game.style}
PURPOSE: Complementary support sprite sheet for environmental gameplay props, pickups, decor fragments, and interactable support assets.

OUTPUT ONE TRANSPARENT PNG SPRITE SHEET ONLY.
EXACT GRID: ${cols} columns x ${rows} rows.
EXACT ASSETS:
${lines.join('\n')}

COMPLEMENTARY SHEET RULES:
- Transparent RGBA background across the entire sheet.
- Each asset must stay completely inside its own grid cell.
- Leave at least 12% transparent internal padding on all four sides of every cell.
- Leave obvious transparent gutters between neighboring assets.
- No asset may bleed into another cell.
- No captions, floor plates, panels, frames, labels or boxed cutouts.
- Render full silhouettes only — no rectangular background patches.
- Match the established game style so these assets naturally complement the current stage and actor sheets.
- Favor high-utility assets: pickups, breakables, cover fragments, sign pieces, props, effect-free interactables, set-dressing gameplay objects.
- Do not include whole characters unless an item explicitly calls for a vehicle or creature prop.

The final sheet will be automatically cell-sliced, alpha-trimmed, silhouette-cleaned and re-packed by XPLAY.
`.trim();
}

async function sliceAndRepackComplementarySheet(raw, game, dir){
  const items = (game.props && game.props.length ? game.props : ['pickup','breakable_crate','sign','small-prop']);
  const cols = 4, rows = Math.max(2, Math.ceil(items.length/cols));
  const meta = await sharp(raw).metadata();
  const cellW = Math.floor(meta.width/cols), cellH = Math.floor(meta.height/rows);
  const cleaned = [];
  const validation = [];
  for(let i=0;i<items.length;i++){
    const c=i%cols,r=Math.floor(i/cols);
    const ix=Math.max(0,Math.floor(cellW*0.015)), iy=Math.max(0,Math.floor(cellH*0.015));
    const left=c*cellW+ix, top=r*cellH+iy;
    const width=Math.min(cellW-ix*2,meta.width-left);
    const height=Math.min(cellH-iy*2,meta.height-top);
    const cell=await sharp(raw).extract({left,top,width,height}).png().toBuffer();
    const cleanedCell=await cleanCell(cell,640);
    cleaned.push(cleanedCell.buffer);
    validation.push({asset:items[i],sourceCell:{row:r+1,column:c+1,left,top,width,height},alphaBounds:cleanedCell.bounds});
    fs.writeFileSync(path.join(dir,`complementary__${safe(items[i])}.png`),cleanedCell.buffer);
  }
  const gutter=48,target=640,outCols=cols,outRows=rows;
  const outW=outCols*target+(outCols+1)*gutter, outH=outRows*target+(outRows+1)*gutter;
  const comps=cleaned.map((buf,i)=>({input:buf,left:gutter+(i%outCols)*(target+gutter),top:gutter+Math.floor(i/outCols)*(target+gutter)}));
  const atlas=await sharp({create:{width:outW,height:outH,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(comps).png().toBuffer();
  return {atlas,validation,map:{cell:target,gutter,cols:outCols,rows:outRows,states:items}};
}


async function callOpenAIImage({sourcePath,prompt,transparent,size}) {
  const key=process.env.OPENAI_API_KEY;
  if(!key) throw new Error('OPENAI_API_KEY not configured.');
  const fd=new FormData();
  fd.append('model',process.env.OPENAI_IMAGE_MODEL||'gpt-image-1');
  fd.append('prompt',prompt);
  fd.append('size',size);
  fd.append('quality',process.env.CUTOUT_IMAGE_QUALITY||'medium');
  if(transparent) fd.append('background','transparent');
  const buf=fs.readFileSync(sourcePath);
  fd.append('image',new Blob([buf],{type:'image/png'}),path.basename(sourcePath));
  const r=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:fd});
  const j=await r.json();
  if(!r.ok) throw new Error(j?.error?.message||`OpenAI image edit failed (${r.status})`);
  const item=j.data?.[0]||{};
  if(item.b64_json) return Buffer.from(item.b64_json,'base64');
  if(item.url){const ir=await fetch(item.url);if(!ir.ok)throw new Error(`Generated image download failed (${ir.status})`);return Buffer.from(await ir.arrayBuffer());}
  throw new Error('OpenAI returned no image data.');
}

function findAlphaBounds(data,w,h,threshold=20){
  let minX=w,minY=h,maxX=-1,maxY=-1,count=0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const a=data[(y*w+x)*4+3];
    if(a>threshold){count++; if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
  }
  if(!count) return null;
  return {left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1,count};
}

async function cleanCell(cellBuffer,target=640){
  const {data,info}=await sharp(cellBuffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const b=findAlphaBounds(data,info.width,info.height);
  if(!b) throw new Error('No alpha silhouette found in sprite cell.');
  const extracted=await sharp(cellBuffer).extract({left:b.left,top:b.top,width:b.width,height:b.height}).png().toBuffer();
  const safety=Math.round(target*0.12);
  const resized=await sharp(extracted).resize({width:target-safety*2,height:target-safety*2,fit:'inside',withoutEnlargement:false}).png().toBuffer();
  const m=await sharp(resized).metadata();
  const left=Math.round((target-m.width)/2);
  const top=Math.max(safety,target-safety-m.height); // bottom-center baseline
  const out=await sharp({create:{width:target,height:target,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:resized,left,top}]).png().toBuffer();
  return {buffer:out,bounds:b};
}

async function sliceAndRepackSheet(raw, actor, dir){
  const meta=await sharp(raw).metadata();
  const cols=actor.sheet?.columns||4, rows=actor.sheet?.rows||Math.ceil(actor.states.length/cols);
  const cellW=Math.floor(meta.width/cols), cellH=Math.floor(meta.height/rows);
  const cleaned=[];
  const validation=[];
  for(let i=0;i<actor.states.length;i++){
    const c=i%cols,r=Math.floor(i/cols);
    // inset by 2% of cell to avoid border artifacts, but never clip the intended center content
    const ix=Math.max(0,Math.floor(cellW*0.015)), iy=Math.max(0,Math.floor(cellH*0.015));
    const left=c*cellW+ix, top=r*cellH+iy;
    const width=Math.min(cellW-ix*2,meta.width-left);
    const height=Math.min(cellH-iy*2,meta.height-top);
    const cell=await sharp(raw).extract({left,top,width,height}).png().toBuffer();
    const cleanedCell=await cleanCell(cell,640);
    cleaned.push(cleanedCell.buffer);
    validation.push({state:actor.states[i],sourceCell:{row:r+1,column:c+1,left,top,width,height},alphaBounds:cleanedCell.bounds});
    fs.writeFileSync(path.join(dir,`${actor.id}__${actor.states[i]}.png`),cleanedCell.buffer);
  }
  const gutter=48,target=640,outCols=cols,outRows=rows;
  const outW=outCols*target+(outCols+1)*gutter, outH=outRows*target+(outRows+1)*gutter;
  const comps=cleaned.map((buf,i)=>({input:buf,left:gutter+(i%outCols)*(target+gutter),top:gutter+Math.floor(i/outCols)*(target+gutter)}));
  const atlas=await sharp({create:{width:outW,height:outH,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(comps).png().toBuffer();
  return {atlas,validation,map:{cell:target,gutter,cols:outCols,rows:outRows,states:actor.states}};
}

app.get('/api/health',(_q,res)=>res.json({
  ok:true,
  openAIConfigured:!!process.env.OPENAI_API_KEY,
  model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-1',
  quality:process.env.CUTOUT_IMAGE_QUALITY||'medium',
  mode:'sprite-sheet-beast-v2-gutter-slice-alpha-trim-repack',
  port:PORT
}));

app.get('/api/games',(_q,res)=>res.json({ok:true,games}));

app.get('/api/cache/:gameId',(req,res)=>{
  const game=byId.get(req.params.gameId);
  if(!game)return res.status(404).json({ok:false,error:'Unknown game'});
  const dir=gameDir(game.id);
  res.json({ok:true,files:fs.readdirSync(dir).filter(f=>f.endsWith('.png')||f.endsWith('.json'))});
});

app.post('/api/generate-stage/:gameId',async(req,res)=>{
  try{
    const game=byId.get(req.params.gameId);if(!game)return res.status(404).json({ok:false,error:'Unknown game'});
    const dir=gameDir(game.id), out=path.join(dir,'stage.png');
    if(fs.existsSync(out)&&!req.body?.force)return res.json({ok:true,cached:true,url:`/cache/${game.id}/stage.png`});
    const source=path.join(__dirname,'public','assets','source',`${game.id}.png`);
    const raw=await callOpenAIImage({sourcePath:source,prompt:stagePrompt(game),transparent:false,size:process.env.CUTOUT_STAGE_SIZE||'1536x1024'});
    await sharp(raw).png().toFile(out);
    fs.writeFileSync(path.join(dir,'stage.json'),JSON.stringify({prompt:stagePrompt(game),generatedAt:new Date().toISOString()},null,2));
    res.json({ok:true,cached:false,url:`/cache/${game.id}/stage.png`});
  }catch(e){res.status(500).json({ok:false,error:e.message||String(e)})}
});

app.post('/api/generate-sheet/:gameId/:actorId',async(req,res)=>{
  try{
    const game=byId.get(req.params.gameId);if(!game)return res.status(404).json({ok:false,error:'Unknown game'});
    const actor=(game.actors||[]).find(a=>a.id===req.params.actorId);if(!actor)return res.status(404).json({ok:false,error:'Unknown actor'});
    const dir=gameDir(game.id), out=path.join(dir,`${actor.id}__atlas.png`);
    if(fs.existsSync(out)&&!req.body?.force){
      return res.json({ok:true,cached:true,url:`/cache/${game.id}/${path.basename(out)}`,map:JSON.parse(fs.readFileSync(path.join(dir,`${actor.id}__atlas.json`),'utf8'))});
    }
    const source=path.join(__dirname,'public','assets','source',`${game.id}.png`);
    const prompt=actorSheetPrompt(game,actor);
    const raw=await callOpenAIImage({sourcePath:source,prompt,transparent:true,size:process.env.CUTOUT_SHEET_SIZE||'1536x1024'});
    fs.writeFileSync(path.join(dir,`${actor.id}__raw-sheet.png`),raw);
    const packed=await sliceAndRepackSheet(raw,actor,dir);
    fs.writeFileSync(out,packed.atlas);
    fs.writeFileSync(path.join(dir,`${actor.id}__atlas.json`),JSON.stringify(packed.map,null,2));
    fs.writeFileSync(path.join(dir,`${actor.id}__validation.json`),JSON.stringify({prompt,validation:packed.validation,generatedAt:new Date().toISOString()},null,2));
    res.json({ok:true,cached:false,url:`/cache/${game.id}/${path.basename(out)}`,rawUrl:`/cache/${game.id}/${actor.id}__raw-sheet.png`,map:packed.map,validation:packed.validation});
  }catch(e){res.status(500).json({ok:false,error:e.message||String(e)})}
});



app.post('/api/generate-complementary/:gameId',async(req,res)=>{
  try{
    const game=byId.get(req.params.gameId);if(!game)return res.status(404).json({ok:false,error:'Unknown game'});
    const dir=gameDir(game.id), out=path.join(dir,'complementary__atlas.png');
    if(fs.existsSync(out)&&!req.body?.force){
      return res.json({ok:true,cached:true,url:`/cache/${game.id}/${path.basename(out)}`,map:JSON.parse(fs.readFileSync(path.join(dir,'complementary__atlas.json'),'utf8'))});
    }
    const source=path.join(__dirname,'public','assets','source',`${game.id}.png`);
    const prompt=complementarySheetPrompt(game);
    const raw=await callOpenAIImage({sourcePath:source,prompt,transparent:true,size:process.env.CUTOUT_SHEET_SIZE||'1536x1024'});
    fs.writeFileSync(path.join(dir,'complementary__raw-sheet.png'),raw);
    const packed=await sliceAndRepackComplementarySheet(raw,game,dir);
    fs.writeFileSync(out,packed.atlas);
    fs.writeFileSync(path.join(dir,'complementary__atlas.json'),JSON.stringify(packed.map,null,2));
    fs.writeFileSync(path.join(dir,'complementary__validation.json'),JSON.stringify({prompt,validation:packed.validation,generatedAt:new Date().toISOString()},null,2));
    res.json({ok:true,cached:false,url:`/cache/${game.id}/${path.basename(out)}`,rawUrl:`/cache/${game.id}/complementary__raw-sheet.png`,map:packed.map,validation:packed.validation});
  }catch(e){res.status(500).json({ok:false,error:e.message||String(e)})}
});


function environmentProfile(game){
  const g = game.genre.toLowerCase();
  if (g.includes('racing')) return {
    mode:'track',
    chunks:3,
    worldWidth:6600,
    worldHeight:1400,
    camera:'forward-track',
    movement:'forward',
    notes:'Continuous elevated raceway with readable curves, barriers, boost zones and skyline depth.'
  };
  if (g.includes('shooter')) return {
    mode:'street-depth',
    chunks:3,
    worldWidth:6000,
    worldHeight:1500,
    camera:'follow-2.5d',
    movement:'free-2d',
    notes:'Traversable street sectors with cover lanes, sidewalks, alleys, wrecks and extraction route.'
  };
  if (g.includes('horror')) return {
    mode:'corridor-zone',
    chunks:3,
    worldWidth:4800,
    worldHeight:1200,
    camera:'follow-tight',
    movement:'free-2d',
    notes:'Connected motel zones with corridor continuation, side rooms, occlusion and pursuit space.'
  };
  if (g.includes('beat-em-up')) return {
    mode:'side-scroll',
    chunks:3,
    worldWidth:5600,
    worldHeight:1100,
    camera:'side-follow',
    movement:'lane-brawler',
    notes:'Long horizontal combat route with foreground props, midground barriers and parallax harbor skyline.'
  };
  if (g.includes('action rpg')) return {
    mode:'combat-zone',
    chunks:3,
    worldWidth:5600,
    worldHeight:1400,
    camera:'follow-2.5d',
    movement:'free-2d',
    notes:'Temple approach, courtyard encounter zone, stairs/guardian arena and landmark continuity.'
  };
  if (g.includes('life-sim')) return {
    mode:'village-zone',
    chunks:3,
    worldWidth:5000,
    worldHeight:1600,
    camera:'follow-soft',
    movement:'free-2d',
    notes:'Connected village paths with bakery, homes, gardens, square and delivery destinations.'
  };
  if (g.includes('rhythm')) return {
    mode:'performance-stage',
    chunks:3,
    worldWidth:4800,
    worldHeight:1100,
    camera:'performance-pan',
    movement:'stage-pan',
    notes:'Rooftop performance zones with changing skyline, speakers, crowd space and stage depth.'
  };
  return {
    mode:'open-zone',
    chunks:3,
    worldWidth:6200,
    worldHeight:1600,
    camera:'follow-2.5d',
    movement:'free-2d',
    notes:'Connected traversal platforms/catwalks with landmark progression and multiple explorable sectors.'
  };
}

function environmentChunkPrompt(game, profile, index){
  const position = index === 0 ? 'opening segment' : index === 1 ? 'middle continuation segment' : 'late / destination segment';
  const continuity = index === 0
    ? 'Use the screenshot as the first-frame visual truth and reconstruct a clean playable opening zone.'
    : 'Continue the SAME world beyond the previous area. Do not repeat the exact composition. Preserve architecture, lighting, material language, scale and landmark continuity while introducing new traversable space.';
  return `
XPLAY ENVIRONMENT BEAST — WORLD CHUNK ${index + 1}/${profile.chunks}

GAME: ${game.title}
GENRE: ${game.genre}
STYLE: ${game.style}
WORLD MODE: ${profile.mode}
CAMERA: ${profile.camera}
SEGMENT ROLE: ${position}

${continuity}

SOURCE WORLD TRUTH:
${game.backgroundPrompt}

WORLD-CONSTRUCTION CONTRACT:
- Environment only. No player character, enemies, NPCs, gameplay vehicles, HUD, portraits or floating combat text.
- This is NOT a wallpaper. Build a navigable gameplay zone with clear traversable surfaces, boundaries, cover/obstacles where appropriate, and readable route continuation.
- Preserve the screenshot's visual identity and major environmental motifs.
- Extend the world naturally so the next segment can continue from this one.
- Do not simply mirror, tile or duplicate the previous composition.
- Keep a strong foreground gameplay plane, readable midground structures and a separate distant background.
- Avoid giant close-up props that block traversal.
- Provide visual landmarks to communicate progression through the level.
- Leave the left and right edges visually continuation-friendly.
- Keep the ground / track / walkway perspective consistent from edge to edge.
- GROUNDING CONTRACT: reserve a clear, continuous gameplay surface in the lower 28–38% of the frame unless the genre explicitly requires a track.
- Do not place the main traversable floor halfway up the image.
- The player and enemies must be able to stand with their feet visually touching this surface.
- Keep major walkable surfaces broad enough for full-body characters and combat/navigation.
- Avoid placing decorative platforms directly behind the expected character baseline where they could make actors appear to float.
- For elevated catwalk/open-world scenes, create one dominant connected traversable catwalk/floor band across the lower third, with optional upper platforms as secondary routes.
- Target gameplay purpose: ${profile.notes}
- No decorative title card, no labels, no borders, no sprite sheet grid.

OUTPUT: one clean landscape gameplay environment chunk, 1536x1024, suitable for side-by-side world assembly.
`.trim();
}

async function saveEnvironmentChunk(game, profile, index, sourcePath, outPath){
  const prompt = environmentChunkPrompt(game, profile, index);
  const raw = await callOpenAIImage({
    sourcePath,
    prompt,
    transparent:false,
    size:process.env.CUTOUT_STAGE_SIZE || '1536x1024'
  });
  await sharp(raw).png().toFile(outPath);
  return {prompt, path:outPath};
}

async function makeEnvironmentLayers(game, profile, dir){
  const chunkFiles = Array.from({length:profile.chunks},(_,i)=>path.join(dir,`environment__chunk-${i+1}.png`));
  const chunkMeta = [];

  // First chunk uses the original screenshot as reference.
  let reference = path.join(__dirname,'public','assets','source',`${game.id}.png`);
  for(let i=0;i<profile.chunks;i++){
    const result = await saveEnvironmentChunk(game, profile, i, reference, chunkFiles[i]);
    chunkMeta.push({index:i+1,file:path.basename(chunkFiles[i]),prompt:result.prompt});
    // Chain continuity: each next chunk references the previous generated chunk.
    reference = chunkFiles[i];
  }

  // Build a parallax-friendly far layer locally from each generated chunk.
  for(let i=0;i<chunkFiles.length;i++){
    const farOut = path.join(dir,`environment__far-${i+1}.png`);
    await sharp(chunkFiles[i])
      .resize({width:1536,height:1024,fit:'cover'})
      .blur(2.2)
      .modulate({brightness:0.82,saturation:0.82})
      .png()
      .toFile(farOut);
  }

  // Spatial manifest: simple genre-aware world graph.
  const chunkWidth = Math.round(profile.worldWidth / profile.chunks);
  const zones = [];
  const spawns = [];
  const obstacles = [];
  for(let i=0;i<profile.chunks;i++){
    const x = i*chunkWidth;
    zones.push({
      id:`zone-${i+1}`,
      x,
      y:0,
      width:chunkWidth,
      height:profile.worldHeight,
      type:i===0?'entry':i===profile.chunks-1?'destination':'progression'
    });
    spawns.push({id:`spawn-${i+1}`,x:x+Math.round(chunkWidth*0.68),y:Math.round(profile.worldHeight*0.62),kind:i===profile.chunks-1?'elite':'enemy-group'});
    obstacles.push({id:`obstacle-${i+1}`,x:x+Math.round(chunkWidth*0.44),y:Math.round(profile.worldHeight*0.68),w:Math.round(chunkWidth*0.08),h:120});
  }

  const manifest = {
    version:1,
    gameId:game.id,
    mode:profile.mode,
    camera:profile.camera,
    movement:profile.movement,
    worldWidth:profile.worldWidth,
    worldHeight:profile.worldHeight,
    chunkWidth,
    chunkCount:profile.chunks,
    chunks:chunkMeta.map((m,i)=>({
      ...m,
      url:`/cache/${game.id}/${m.file}`,
      farUrl:`/cache/${game.id}/environment__far-${i+1}.png`,
      x:i*chunkWidth,
      width:chunkWidth
    })),
    zones,
    spawnPoints:spawns,
    obstacles,
    grounding:{
      baselineRatio: profile.mode==='track' ? 0.80 :
                     profile.mode==='corridor-zone' ? 0.82 :
                     profile.mode==='side-scroll' ? 0.82 :
                     profile.mode==='street-depth' ? 0.80 :
                     profile.mode==='combat-zone' ? 0.80 :
                     profile.mode==='village-zone' ? 0.78 :
                     profile.mode==='performance-stage' ? 0.78 : 0.80,
      depthMinRatio: profile.mode==='side-scroll' ? 0.72 :
                     profile.mode==='track' ? 0.72 :
                     profile.mode==='performance-stage' ? 0.70 : 0.68,
      depthMaxRatio: profile.mode==='side-scroll' ? 0.86 :
                     profile.mode==='track' ? 0.84 :
                     profile.mode==='performance-stage' ? 0.84 : 0.86,
      feetAnchor:'bottom-center',
      clampActorsToGround:true,
      description:'Runtime feet baseline and depth band. Actors must be projected onto the walkable floor instead of arbitrary image-space Y.'
    },
    cameraBounds:{x:0,y:0,width:profile.worldWidth,height:profile.worldHeight},
    generatedAt:new Date().toISOString()
  };
  fs.writeFileSync(path.join(dir,'environment__manifest.json'),JSON.stringify(manifest,null,2));
  return manifest;
}

app.post('/api/generate-environment/:gameId',async(req,res)=>{
  try{
    const game=byId.get(req.params.gameId);
    if(!game)return res.status(404).json({ok:false,error:'Unknown game'});
    const dir=gameDir(game.id);
    const manifestPath=path.join(dir,'environment__manifest.json');
    if(fs.existsSync(manifestPath) && !req.body?.force){
      return res.json({ok:true,cached:true,manifest:JSON.parse(fs.readFileSync(manifestPath,'utf8'))});
    }
    const profile=environmentProfile(game);
    const manifest=await makeEnvironmentLayers(game,profile,dir);
    res.json({ok:true,cached:false,manifest});
  }catch(e){res.status(500).json({ok:false,error:e.message||String(e)})}
});

app.get('/api/environment/:gameId',(req,res)=>{
  try{
    const game=byId.get(req.params.gameId);
    if(!game)return res.status(404).json({ok:false,error:'Unknown game'});
    const p=path.join(gameDir(game.id),'environment__manifest.json');
    if(!fs.existsSync(p))return res.status(404).json({ok:false,error:'Environment Beast has not been generated yet.'});
    res.json({ok:true,manifest:JSON.parse(fs.readFileSync(p,'utf8'))});
  }catch(e){res.status(500).json({ok:false,error:e.message||String(e)})}
});



function runtimeFamilyFor(game){
  const g=game.genre.toLowerCase();
  if(g.includes('shooter')||g.includes('open-world')||g.includes('open world')||g.includes('racing')) return '3d-lite';
  if(g.includes('beat-em-up')||g.includes('action rpg')||g.includes('life-sim')||g.includes('horror')) return '2.5d';
  return '2d';
}
function defaultSceneRig(game){
  const family=runtimeFamilyFor(game),profile=environmentProfile(game);
  const rig={version:1,gameId:game.id,title:game.title,genre:game.genre,style:game.style,runtimeFamily:family,
    camera:{type:family==='3d-lite'?'perspective-follow':family==='2.5d'?'side-depth-follow':'orthographic-follow',horizonRatio:family==='3d-lite'?0.36:0.40,playerScreenXRatio:family==='3d-lite'?0.34:0.28,smoothing:0.12,lookAheadRatio:family==='3d-lite'?0.20:0.14},
    ground:{farYRatio:family==='3d-lite'?0.58:0.70,nearYRatio:family==='3d-lite'?0.90:0.86,playerBaselineRatio:family==='3d-lite'?0.83:0.82,walkableDepth:family!=='2d',clampToSurface:true},
    scale:{playerHeightRatio:family==='3d-lite'?0.20:0.23,enemyHeightRatio:family==='3d-lite'?0.18:0.21,npcHeightRatio:0.18,propHeightRatio:0.10,minDepthScale:family==='3d-lite'?0.52:0.78,maxDepthScale:1.08},
    world:{width:profile.worldWidth,height:profile.worldHeight,zones:profile.chunks,mode:profile.mode},
    anchors:{actorFeet:'bottom-center',vehicleContact:'bottom-center',propContact:'bottom-center'},collision:{actorRadius:family==='3d-lite'?42:34,obstaclePadding:14},calibration:{passed:false,notes:[],updatedAt:new Date().toISOString()}};
  if(profile.mode==='track'){rig.ground.farYRatio=.50;rig.ground.nearYRatio=.94;rig.ground.playerBaselineRatio=.84;rig.scale.playerHeightRatio=.16;rig.scale.enemyHeightRatio=.14;}
  if(profile.mode==='side-scroll'){rig.camera.horizonRatio=.38;rig.ground.farYRatio=.72;rig.ground.nearYRatio=.87;}
  if(profile.mode==='corridor-zone'){rig.camera.horizonRatio=.42;rig.ground.farYRatio=.66;rig.ground.nearYRatio=.90;}
  return rig;
}
function readSceneRig(game){const p=path.join(gameDir(game.id),'scene-rig.json');if(fs.existsSync(p))return JSON.parse(fs.readFileSync(p,'utf8'));const rig=defaultSceneRig(game);fs.writeFileSync(p,JSON.stringify(rig,null,2));return rig;}
function writeSceneRig(game,rig){const p=path.join(gameDir(game.id),'scene-rig.json');rig.gameId=game.id;rig.updatedAt=new Date().toISOString();fs.writeFileSync(p,JSON.stringify(rig,null,2));return rig;}
function composerCheck(game){
  const dir=gameDir(game.id),rig=readSceneRig(game),{player,opponents}=pickPrimaryActors(game),issues=[],fixes=[];
  const actor=(a,role)=>{if(!a)return null;const atlas=`${a.id}__atlas.png`,map=`${a.id}__atlas.json`;if(!fs.existsSync(path.join(dir,atlas))||!fs.existsSync(path.join(dir,map))){issues.push(`${role} atlas missing: ${a.name}`);return null;}const ratio=role==='player'?rig.scale.playerHeightRatio:role==='npc'?rig.scale.npcHeightRatio:rig.scale.enemyHeightRatio;fixes.push(`${a.name}: ${Math.round(ratio*100)}% viewport height + bottom-center anchor`);return{id:a.id,name:a.name,role,atlas:runtimeAssetPath(game.id,atlas),map:JSON.parse(fs.readFileSync(path.join(dir,map),'utf8')),screenHeightRatio:ratio,anchor:'bottom-center'};};
  const playerEntry=actor(player,'player'),opponentEntries=opponents.map(a=>actor(a,a.role==='npc'?'npc':'enemy')).filter(Boolean);
  let environment=null;const ep=path.join(dir,'environment__manifest.json');if(fs.existsSync(ep)){environment=JSON.parse(fs.readFileSync(ep,'utf8'));environment.grounding={...(environment.grounding||{}),baselineRatio:rig.ground.playerBaselineRatio,depthMinRatio:rig.ground.farYRatio,depthMaxRatio:rig.ground.nearYRatio,feetAnchor:'bottom-center',clampActorsToGround:true};fixes.push(`Environment ground band synced ${rig.ground.farYRatio.toFixed(2)}–${rig.ground.nearYRatio.toFixed(2)}`);}else issues.push('Environment Beast manifest missing.');
  let complementary=null;if(fs.existsSync(path.join(dir,'complementary__atlas.png'))&&fs.existsSync(path.join(dir,'complementary__atlas.json'))){complementary={atlas:runtimeAssetPath(game.id,'complementary__atlas.png'),map:JSON.parse(fs.readFileSync(path.join(dir,'complementary__atlas.json'),'utf8')),screenHeightRatio:rig.scale.propHeightRatio,anchor:'bottom-center'};fixes.push(`Complementary props synced ${Math.round(rig.scale.propHeightRatio*100)}% viewport height`);}
  const report={ok:!!playerEntry,gameId:game.id,sceneRig:rig,issues,fixes,player:playerEntry,opponents:opponentEntries,environment,complementary,generatedAt:new Date().toISOString()};fs.writeFileSync(path.join(dir,'composer-manifest.json'),JSON.stringify(report,null,2));return report;
}
app.get('/api/scene-rig/:gameId',(req,res)=>{try{const game=byId.get(req.params.gameId);if(!game)return res.status(404).json({ok:false,error:'Unknown game'});res.json({ok:true,rig:readSceneRig(game)});}catch(e){res.status(500).json({ok:false,error:e.message||String(e)})}});
app.post('/api/scene-rig/:gameId',(req,res)=>{try{const game=byId.get(req.params.gameId);if(!game)return res.status(404).json({ok:false,error:'Unknown game'});const cur=readSceneRig(game),b=req.body||{};const rig={...cur,...b,camera:{...cur.camera,...(b.camera||{})},ground:{...cur.ground,...(b.ground||{})},scale:{...cur.scale,...(b.scale||{})},world:{...cur.world,...(b.world||{})},calibration:{...cur.calibration,...(b.calibration||{}),updatedAt:new Date().toISOString()}};res.json({ok:true,rig:writeSceneRig(game,rig)});}catch(e){res.status(500).json({ok:false,error:e.message||String(e)})}});
app.post('/api/scene-rig-reset/:gameId',(req,res)=>{try{const game=byId.get(req.params.gameId);if(!game)return res.status(404).json({ok:false,error:'Unknown game'});res.json({ok:true,rig:writeSceneRig(game,defaultSceneRig(game))});}catch(e){res.status(500).json({ok:false,error:e.message||String(e)})}});
app.post('/api/composer-check/:gameId',(req,res)=>{try{const game=byId.get(req.params.gameId);if(!game)return res.status(404).json({ok:false,error:'Unknown game'});res.json({ok:true,report:composerCheck(game)});}catch(e){res.status(500).json({ok:false,error:e.message||String(e)})}});

function runtimeAssetPath(gameId, file) {
  return `/cache/${gameId}/${file}`;
}

function pickPrimaryActors(game) {
  const player = (game.actors || []).find(a => ['player','vehicle'].includes(a.role)) || (game.actors || [])[0] || null;
  const opponents = (game.actors || []).filter(a => a !== player && ['enemy','npc','vehicle'].includes(a.role));
  return { player, opponents };
}

function buildManifest(game) {
  const dir = gameDir(game.id);
  const { player, opponents } = pickPrimaryActors(game);
  const stageFile = fs.existsSync(path.join(dir,'stage.png')) ? 'stage.png' : null;

  const actorEntry = (actor) => {
    if (!actor) return null;
    const atlasFile = `${actor.id}__atlas.png`;
    const mapFile = `${actor.id}__atlas.json`;
    if (!fs.existsSync(path.join(dir, atlasFile)) || !fs.existsSync(path.join(dir, mapFile))) return null;
    return {
      id: actor.id,
      name: actor.name,
      role: actor.role,
      description: actor.description,
      facing: actor.facing,
      atlas: runtimeAssetPath(game.id, atlasFile),
      map: JSON.parse(fs.readFileSync(path.join(dir, mapFile),'utf8'))
    };
  };

  const manifest = {
    buildId: `xplay_${game.id}_${Date.now()}`,
    gameId: game.id,
    title: game.title,
    genre: game.genre,
    style: game.style,
    targetSeconds: game.targetSeconds,
    analysisPrompt: game.analysisPrompt,
    sourceScreenshot: `/assets/source/${game.id}.png`,
    stage: stageFile ? runtimeAssetPath(game.id, stageFile) : `/assets/source/${game.id}.png`,
    stageGenerated: !!stageFile,
    player: actorEntry(player),
    opponents: opponents.map(actorEntry).filter(Boolean),
    controls: {},
    complementary: (fs.existsSync(path.join(dir,'complementary__atlas.png')) && fs.existsSync(path.join(dir,'complementary__atlas.json'))) ? {atlas: runtimeAssetPath(game.id,'complementary__atlas.png'), map: JSON.parse(fs.readFileSync(path.join(dir,'complementary__atlas.json'),'utf8'))} : null,
    environment: fs.existsSync(path.join(dir,'environment__manifest.json')) ? JSON.parse(fs.readFileSync(path.join(dir,'environment__manifest.json'),'utf8')) : null,
    sceneRig: readSceneRig(game),
    composer: fs.existsSync(path.join(dir,'composer-manifest.json')) ? JSON.parse(fs.readFileSync(path.join(dir,'composer-manifest.json'),'utf8')) : null,
    builtAt: new Date().toISOString()
  };

  const g = game.genre.toLowerCase();
  if (g.includes('beat-em-up')) manifest.runtime = 'brawler';
  else if (g.includes('shooter')) manifest.runtime = 'shooter';
  else if (g.includes('life-sim')) manifest.runtime = 'lifesim';
  else if (g.includes('horror')) manifest.runtime = 'horror';
  else if (g.includes('action rpg')) manifest.runtime = 'rpg';
  else if (g.includes('racing')) manifest.runtime = 'racing';
  else if (g.includes('rhythm')) manifest.runtime = 'rhythm';
  else manifest.runtime = 'adventure';

  const controls = {
    brawler: {move:'A/D or ←/→',depth:'W/S or ↑/↓',attack:'J / Space',heavy:'K',block:'L'},
    shooter: {move:'WASD',aim:'Mouse',fire:'Click / Space',reload:'R',sprint:'Shift'},
    lifesim: {move:'WASD / Arrows',interact:'E / Space',task:'Collect & deliver'},
    horror: {move:'WASD',look:'Mouse / Arrows',interact:'E',flashlight:'F',sprint:'Shift'},
    rpg: {move:'WASD',light:'J',heavy:'K',dodge:'Space',ability:'E'},
    racing: {steer:'A/D or ←/→',accelerate:'W / ↑',brake:'S / ↓',boost:'Space'},
    rhythm: {lanes:'D F J K',dodge:'Space',special:'E'},
    adventure: {move:'WASD',interact:'E',dodge:'Space',tool:'J'}
  };
  manifest.controls = controls[manifest.runtime] || controls.adventure;
  return manifest;
}

app.post('/api/build/:gameId', (req,res) => {
  try {
    const game = byId.get(req.params.gameId);
    if (!game) return res.status(404).json({ok:false,error:'Unknown game'});
    const manifest = buildManifest(game);
    if (!manifest.player) {
      return res.status(400).json({
        ok:false,
        error:'Generate the primary player/vehicle sprite sheet before building the playable.'
      });
    }
    const dir = gameDir(game.id);
    fs.writeFileSync(path.join(dir,'playable-manifest.json'), JSON.stringify(manifest,null,2));
    res.json({
      ok:true,
      buildId:manifest.buildId,
      runtime:manifest.runtime,
      stageGenerated:manifest.stageGenerated,
      playUrl:`/play.html?game=${encodeURIComponent(game.id)}`
    });
  } catch(e) {
    res.status(500).json({ok:false,error:e.message||String(e)});
  }
});

app.get('/api/play-manifest/:gameId', (req,res) => {
  try {
    const game = byId.get(req.params.gameId);
    if (!game) return res.status(404).json({ok:false,error:'Unknown game'});
    const dir = gameDir(game.id);
    const p = path.join(dir,'playable-manifest.json');
    const manifest = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf8')) : buildManifest(game);
    if (!manifest.player) return res.status(400).json({ok:false,error:'Playable has not been built yet.'});
    res.json({ok:true,manifest});
  } catch(e) {
    res.status(500).json({ok:false,error:e.message||String(e)});
  }
});

app.listen(PORT,()=>console.log(`XPLAY V8 SCENE RIG + COMPOSER: http://localhost:${PORT}`));
