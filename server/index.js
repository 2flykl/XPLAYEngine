import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
dotenv.config({path:path.join(__dirname,'.env')});
dotenv.config({path:path.join(__dirname,'..','.env'),override:false});

const app=express();
const PORT=Number(process.env.PORT||8787);
const GEMINI_API_KEY=process.env.GEMINI_API_KEY||'';
const GEMINI_VISION_MODEL=process.env.GEMINI_VISION_MODEL||'gemini-2.5-flash';
const allowed=(process.env.CORS_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);

app.use(cors({origin(origin,cb){if(!origin||!allowed.length||allowed.includes(origin)) return cb(null,true); cb(new Error('CORS blocked'));}}));
app.use(express.json({limit:'25mb'}));

function parseDataUrl(v=''){const m=String(v).match(/^data:([^;]+);base64,(.+)$/);if(!m)throw new Error('imageDataUrl must be base64 data URL');return{mimeType:m[1],data:m[2]};}
function normType(t=''){const s=String(t).toLowerCase().trim();return ({'beat-em-up':'fighting','beat em up':'fighting','fighter':'fighting','first-person shooter':'fps','open world':'openworld','side scroller':'platformer','side-scroll':'platformer'})[s]||s;}
function normalize(a={}){
  return {
    camera:String(a.camera||'unknown'),
    scene_type:String(a.scene_type||'unknown'),
    player:typeof a.player==='string'?a.player:JSON.stringify(a.player||'unknown'),
    enemies:Array.isArray(a.enemies)?a.enemies:[],
    environment:String(a.environment||'unknown'),
    objects:Array.isArray(a.objects)?a.objects:[],
    hud:Array.isArray(a.hud)?a.hud:[],
    gameplay_signals:Array.isArray(a.gameplay_signals)?a.gameplay_signals:[],
    recommended_plx:(Array.isArray(a.recommended_plx)?a.recommended_plx:[]).slice(0,3).map(r=>({type:normType(r?.type||''),confidence:Math.max(0,Math.min(100,Number(r?.confidence||0))),reason:String(r?.reason||'')}))
  };
}
function frontend(a){
  return {
    player:a.player,
    environment:a.environment,
    vehicles:'No reliable vehicle identification',
    notableObjects:a.objects.map(o=>typeof o==='string'?o:(o?.label||JSON.stringify(o))).join(', ')||'No notable objects identified',
    dominantColors:'',
    mood:'',
    motionPotential:'',
    possibleHazards:a.gameplay_signals.join(', '),
    possibleCollectibles:'',
    strongOpportunities:a.recommended_plx.map(r=>`${r.type} ${r.confidence}%`).join(', '),
    camera:a.camera,
    hud:a.hud.map(h=>typeof h==='string'?h:(h?.label||JSON.stringify(h))).join(', '),
    qualityScore:Math.round(a.recommended_plx?.[0]?.confidence||0),
    qualityLabel:'Gemini semantic vision',
    provider:'gemini',
    recommended_plx:a.recommended_plx,
    scene_type:a.scene_type,
    enemies:a.enemies,
    objects:a.objects,
    gameplay_signals:a.gameplay_signals
  };
}
async function gemini(imageDataUrl,userPrompt=''){
  if(!GEMINI_API_KEY)throw new Error('GEMINI_API_KEY is not configured.');
  const {mimeType,data}=parseDataUrl(imageDataUrl);
  const prompt=[
    'You are XPLAY Vision, a strict screenshot-to-game semantic analyzer.',
    'Analyze ONLY what is visible in the CURRENT image. Never invent generic city/street/airport/district content.',
    'If uncertain, use "unknown". Return JSON only.',
    'Fields: camera, scene_type, player, enemies, environment, objects, hud, gameplay_signals, recommended_plx.',
    'recommended_plx: up to 3 items with type, confidence 0-100, reason.',
    'Allowed types: runner,dodge,collect,rhythm,puzzle,fps,fighting,openworld,racing,platformer.',
    userPrompt?`USER GAMEPLAY INTENT: ${userPrompt}`:''
  ].filter(Boolean).join('\n');
  const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_VISION_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body={contents:[{role:'user',parts:[{text:prompt},{inline_data:{mime_type:mimeType,data}}]}],generationConfig:{response_mime_type:'application/json',temperature:0.1}};
  const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const raw=await r.text();
  if(!r.ok)throw new Error(`Gemini HTTP ${r.status}: ${raw.slice(0,500)}`);
  const parsed=JSON.parse(raw);
  const text=parsed?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
  if(!text)throw new Error('Gemini returned no analysis text.');
  let obj; try{obj=JSON.parse(text)}catch{const m=text.match(/\{[\s\S]*\}/);if(!m)throw new Error('Gemini response was not valid JSON');obj=JSON.parse(m[0]);}
  return normalize(obj);
}

app.get('/api/health',(req,res)=>res.json({ok:true,visionConfigured:!!GEMINI_API_KEY,visionProvider:GEMINI_API_KEY?'gemini':'offline',model:GEMINI_API_KEY?GEMINI_VISION_MODEL:null}));
app.get('/api/vision/health',(req,res)=>GEMINI_API_KEY?res.json({ok:true,provider:'gemini',configured:true,model:GEMINI_VISION_MODEL}):res.status(503).json({ok:false,provider:'offline',configured:false,error:'GEMINI_API_KEY is not configured.'}));
app.post('/api/vision/analyze',async(req,res)=>{try{const {imageDataUrl,prompt=''}=req.body||{};if(!imageDataUrl)return res.status(400).json({ok:false,error:'imageDataUrl is required.'});const semantic=await gemini(imageDataUrl,prompt);res.json({ok:true,provider:'gemini',model:GEMINI_VISION_MODEL,semantic,analysis:frontend(semantic)});}catch(e){console.error(e);res.status(502).json({ok:false,provider:GEMINI_API_KEY?'gemini':'offline',error:e.message});}});
app.post('/api/direct',(req,res)=>res.json({ok:true,provider:'local-safe',result:req.body||{}}));

app.listen(PORT,'0.0.0.0',()=>{console.log(`XPLAY API server on ${PORT}`);console.log(`Gemini Vision: ${GEMINI_API_KEY?'ON':'OFF'}`);});
