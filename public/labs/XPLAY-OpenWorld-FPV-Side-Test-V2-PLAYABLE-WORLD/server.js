const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');

function loadEnv(){
  const candidates = [
    path.join(__dirname,'.env'),
    path.join(__dirname,'server','.env'),
    path.resolve(__dirname,'..','..','..','server','.env'),
    path.resolve(__dirname,'..','..','..','..','server','.env'),
    path.resolve(__dirname,'..','..','..','..','..','server','.env')
  ];
  for(const p of candidates){
    if(fs.existsSync(p)){
      dotenv.config({path:p});
      console.log('ENV:',p);
      return p;
    }
  }
  dotenv.config();
  return null;
}
loadEnv();

const app = express();
const PORT = Number(process.env.PORT || 8855);
const upload = multer({storage:multer.memoryStorage(), limits:{fileSize:20*1024*1024}});
const publicDir = path.join(__dirname,'public');
const generatedDir = path.join(publicDir,'generated');
fs.mkdirSync(generatedDir,{recursive:true});

app.use(express.json({limit:'5mb'}));
app.use(express.static(publicDir));

async function generateEdit(sourceBuffer,mime,prompt){
  const key = process.env.OPENAI_API_KEY;
  if(!key) throw new Error('OPENAI_API_KEY not configured. Put the lab inside XPLAY/public/labs so it can find XPLAY/server/.env, or add a local .env.');
  const fd = new FormData();
  fd.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
  fd.append('prompt', prompt);
  fd.append('size', '1536x1024');
  fd.append('quality', process.env.OPENAI_IMAGE_QUALITY || 'medium');
  fd.append('image', new Blob([sourceBuffer],{type:mime||'image/png'}), 'seed.png');

  const r = await fetch('https://api.openai.com/v1/images/edits',{
    method:'POST',
    headers:{Authorization:`Bearer ${key}`},
    body:fd
  });
  const j = await r.json();
  if(!r.ok) throw new Error(j?.error?.message || `Image generation failed (${r.status})`);
  const item=j.data?.[0]||{};
  if(item.b64_json) return Buffer.from(item.b64_json,'base64');
  if(item.url){
    const ir=await fetch(item.url);
    if(!ir.ok) throw new Error(`Generated image download failed (${ir.status})`);
    return Buffer.from(await ir.arrayBuffer());
  }
  throw new Error('Image generation returned no image.');
}

function continuationPrompt(index){
  const role = index===0 ? 'first continuation beyond the visible valley' :
               index===1 ? 'second connected exploration region' :
               'third connected destination region';
  return `
XPLAY OPEN WORLD ENVIRONMENT BEAST — ${role}

The uploaded screenshot is the visual truth for this game world.
Create a new first-person open-world environment view that feels like the player has physically traveled farther through the SAME WORLD.

HARD CONTINUITY RULES:
- Preserve the same realistic graphics quality, lighting, color palette, atmosphere, mountain geology, vegetation, architecture, road/path materials, lake/river language and overall art direction.
- Preserve major landmark logic: mountains remain geographically coherent, the village/castle/water system must feel connected rather than replaced.
- Invent new terrain only as a believable continuation of the same geography.
- Create actual traversable-looking paths, slopes, clearings, bridges, roads or passes.
- No characters, enemies, HUD, health bars, hands, text, minimap, UI, labels or geometric placeholder shapes.
- Do not make a concept-art collage.
- Do not turn the scene into a different biome or time of day.
- The output must look like a real screenshot from the same open-world game after walking farther.
- Keep foreground, midground and distant landmarks clearly layered for navigation.
- Leave at least one obvious route continuing deeper into the world.
- 16:9 cinematic first-person game environment composition.

This will become one remembered world region and must visually connect to neighboring regions.
`.trim();
}

app.get('/api/health',(_q,res)=>res.json({
  ok:true,
  openAIConfigured:!!process.env.OPENAI_API_KEY,
  imageModel:process.env.OPENAI_IMAGE_MODEL||'gpt-image-1',
  mode:'openworld-fpv-v2'
}));

app.post('/api/generate-world', upload.single('image'), async(req,res)=>{
  try{
    if(!req.file) return res.status(400).json({ok:false,error:'Screenshot image required.'});
    const worldId = 'world-' + Date.now();
    const outputs = [];
    let reference = req.file.buffer;
    let mime = req.file.mimetype || 'image/png';

    for(let i=0;i<3;i++){
      const out = await generateEdit(reference,mime,continuationPrompt(i));
      const name = `${worldId}-region-${i+1}.png`;
      fs.writeFileSync(path.join(generatedDir,name),out);
      outputs.push(`/generated/${name}`);
      reference = out;
      mime='image/png';
    }

    const manifest = {
      worldId,
      seedRegion:'uploaded screenshot',
      regions:[
        {id:'seed',x:0,y:0,type:'seed'},
        {id:'region-1',x:1200,y:0,type:'generated',url:outputs[0]},
        {id:'region-2',x:2400,y:250,type:'generated',url:outputs[1]},
        {id:'region-3',x:3600,y:-180,type:'generated',url:outputs[2]}
      ],
      landmarks:[],
      generatedAt:new Date().toISOString()
    };
    fs.writeFileSync(path.join(generatedDir,`${worldId}.json`),JSON.stringify(manifest,null,2));
    res.json({ok:true,worldId,regions:outputs,manifest});
  }catch(e){
    res.status(500).json({ok:false,error:e.message||String(e)});
  }
});

app.listen(PORT,()=>console.log(`XPLAY Open World FPV V2: http://localhost:${PORT}`));
