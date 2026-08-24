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
  const atlas=await sharp({create:{width:outW,height:outH,channels:4,background:{r:0,g:0,b:0,alpha:0}}).composite(comps).png().toBuffer();
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

app.listen(PORT,()=>console.log(`XPLAY SPRITE-SHEET BEAST V2: http://localhost:${PORT}`));
