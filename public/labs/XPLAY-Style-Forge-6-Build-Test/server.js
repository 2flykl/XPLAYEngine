
import fs from 'fs';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import OpenAI, { toFile } from 'openai';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.join(__dirname,'.env'),
  path.resolve(__dirname,'../server/.env'),
  path.resolve(__dirname,'../../server/.env')
];
let envLoadedFrom = null;
for (const p of envCandidates) {
  if (fs.existsSync(p)) { dotenv.config({path:p,override:false}); envLoadedFrom=p; break; }
}
if (!envLoadedFrom) dotenv.config();

const PORT = Number(process.env.PORT || 8798);
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const app = express();
app.use(express.json({limit:'3mb'}));
app.use(express.static(path.join(__dirname,'public'),{etag:false,lastModified:false}));
app.use('/master', express.static(path.join(__dirname,'master'),{etag:false,lastModified:false}));
app.use('/cache', express.static(path.join(__dirname,'cache'),{etag:false,lastModified:false}));

const styles = JSON.parse(fs.readFileSync(path.join(__dirname,'styles.json'),'utf8'));

function client(){
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({apiKey:process.env.OPENAI_API_KEY});
}
function mime(kind){ return kind==='stage' ? 'image/png' : 'image/png'; }
function masterFile(kind){
  return path.join(__dirname,'master', kind==='stage' ? 'stage.png' : kind==='player' ? 'alex-sheet.png' : 'enemy-atlas.png');
}
function cacheFile(style,kind){
  const dir=path.join(__dirname,'cache',style);
  fs.mkdirSync(dir,{recursive:true});
  return path.join(dir,`${kind}.png`);
}
function assetPrompt(style,kind){
  const s=styles[style];
  const common=`STYLE TRANSFORM ONLY. Preserve the canonical XPLAY asset structure. ${s.prompt}`;
  if (kind==='stage') return `${common}

ASSET TYPE: environment plate.
Preserve the same side-on camera, combat floor, Zenith Industries container, B7/security door, fence, barrels, ladder, hazard signs, skyline and moon.
No characters. No HUD. No text overlays beyond environmental signage already present.
Keep the stage gameplay-readable and suitable for horizontal scrolling.`;
  if (kind==='player') return `${common}

ASSET TYPE: Alex player sheet.
Preserve EXACT 4 columns × 2 rows grid, same eight poses, same baseline, same transparent background, same Alex identity: Black male martial artist, large afro, white sleeveless gi, black belt, barefoot.
Do not change pose order. Do not crop limbs. No labels, HUD, environment, vignette or extra characters.`;
  return `${common}

ASSET TYPE: enemy atlas.
Preserve EXACT 4 columns × 3 rows grid. Row 1 Knife enemy; row 2 red-bandanna fighter; row 3 blue-bandanna fighter.
Columns remain idle, walk/advance, attack, hurt/knockback.
Transparent background only. Preserve correct weapon and identity. No labels, HUD, environment or extra characters.`;
}
async function transform(kind,style){
  const c=client();
  if(!c) throw new Error('OPENAI_API_KEY is not configured.');
  const src=masterFile(kind);
  const out=cacheFile(style,kind);
  const file=await toFile(fs.createReadStream(src), path.basename(src), {type:mime(kind)});
  const result=await c.images.edit({
    model:IMAGE_MODEL,
    image:file,
    prompt:assetPrompt(style,kind),
    size:'1536x1024',
    quality:'medium',
    background:kind==='stage'?'opaque':'transparent',
    output_format:'png'
  });
  const b64=result.data?.[0]?.b64_json;
  if(!b64) throw new Error('Image model returned no image data.');
  fs.writeFileSync(out,Buffer.from(b64,'base64'));
  return out;
}
app.get('/api/health',(_req,res)=>{
  const key=process.env.OPENAI_API_KEY||'';
  res.json({ok:true,app:'XPLAY-STYLE-FORGE-6-BUILD-TEST',configured:!!key,keyLength:key.trim().length,imageModel:IMAGE_MODEL,port:PORT,envLoadedFrom:envLoadedFrom||'default'});
});
app.get('/api/checkpoint',(_req,res)=>{
  const packet=JSON.parse(fs.readFileSync(path.join(__dirname,'master','packet.json'),'utf8'));
  const blueprint=JSON.parse(fs.readFileSync(path.join(__dirname,'master','blueprint.json'),'utf8'));
  res.json({ok:true,packet,blueprint,master:{
    stage:'/master/stage.png',player:'/master/alex-sheet.png',enemies:'/master/enemy-atlas.png'
  }});
});
app.get('/api/styles',(_req,res)=>res.json({ok:true,styles}));
app.get('/api/cache',(_req,res)=>{
  const state={};
  for(const style of Object.keys(styles)){
    state[style]={};
    for(const kind of ['stage','player','enemies']){
      const f=cacheFile(style,kind);
      state[style][kind]=fs.existsSync(f)?`/cache/${style}/${kind}.png?t=${fs.statSync(f).mtimeMs}`:null;
    }
  }
  res.json({ok:true,state});
});
app.post('/api/generate/:style/:kind',async(req,res)=>{
  try{
    const {style,kind}=req.params;
    const force=!!req.body?.force;
    if(!styles[style]) throw new Error('Unknown style.');
    if(!['stage','player','enemies'].includes(kind)) throw new Error('Unknown asset kind.');
    if(style==='64bit'&&!force){
      return res.json({ok:true,cached:true,source:'master',url:`/master/${kind==='stage'?'stage.png':kind==='player'?'alex-sheet.png':'enemy-atlas.png'}`});
    }
    const out=cacheFile(style,kind);
    if(fs.existsSync(out)&&!force){
      return res.json({ok:true,cached:true,source:'cache',url:`/cache/${style}/${kind}.png?t=${fs.statSync(out).mtimeMs}`});
    }
    await transform(kind,style);
    res.json({ok:true,cached:false,source:'openai',url:`/cache/${style}/${kind}.png?t=${Date.now()}`});
  }catch(err){
    console.error('GENERATE ERROR',err);
    res.status(err.status||500).json({ok:false,error:err.message||String(err)});
  }
});
app.post('/api/cache/clear/:style',(req,res)=>{
  try{
    const style=req.params.style;
    if(!styles[style]) throw new Error('Unknown style.');
    const dir=path.join(__dirname,'cache',style);
    if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true,force:true});
    res.json({ok:true});
  }catch(err){res.status(400).json({ok:false,error:err.message||String(err)})}
});
app.listen(PORT,()=>{
  console.log('============================================================');
  console.log('XPLAY STYLE FORGE — 6 BUILD TEST');
  console.log(`Open: http://localhost:${PORT}`);
  console.log(`Image model: ${IMAGE_MODEL}`);
  console.log(`Key configured: ${!!process.env.OPENAI_API_KEY}`);
  console.log('64-bit uses master checkpoint with ZERO image-generation calls by default.');
  console.log('Other styles are cached after first generation.');
  console.log('============================================================');
});
