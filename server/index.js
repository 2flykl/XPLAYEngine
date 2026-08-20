import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
dotenv.config({path:path.join(__dirname,'.env')});
dotenv.config({path:path.resolve(__dirname,'..','.env'),override:false});

const app=express();
app.use(cors());
app.use(express.json({limit:'28mb'}));
const port=Number(process.env.PORT||8787);
const visionUrl=process.env.VISION_SERVICE_URL||'http://127.0.0.1:8790';
const client=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
const geminiKey=String(process.env.GEMINI_API_KEY||'').trim();
const geminiModel=String(process.env.GEMINI_VISION_MODEL||'gemini-3.6-flash').trim();

async function visionFetch(pathname,opts={}){const r=await fetch(`${visionUrl}${pathname}`,opts);if(!r.ok)throw new Error(`Vision service ${r.status}`);return await r.json();}

function parseDataUrl(dataUrl=''){
 const match=String(dataUrl).match(/^data:([^;]+);base64,(.+)$/s);
 if(!match)throw new Error('Expected a base64 image data URL');
 return {mimeType:match[1]||'image/png',data:match[2]};
}

function normalizeEngine(v=''){
 const raw=String(v).toLowerCase().replace(/[^a-z0-9]/g,'');
 const map={firstpersonshooter:'fps',shooter:'fps',beatemup:'fighting',brawler:'fighting',fighter:'fighting',openworld:'openworld',platform:'platformer',platforming:'platformer',race:'racing'};
 const out=map[raw]||raw;
 return ['runner','dodge','collect','rhythm','puzzle','fps','fighting','openworld','racing','platformer'].includes(out)?out:'';
}

function toFrontendAnalysis(raw={}){
 const recs=(Array.isArray(raw.recommended_plx)?raw.recommended_plx:[])
  .map(r=>({type:normalizeEngine(r?.type),confidence:Math.max(0,Math.min(100,Number(r?.confidence)||0)),reason:String(r?.reason||'')}))
  .filter(r=>r.type)
  .sort((a,b)=>b.confidence-a.confidence)
  .slice(0,3);
 return {
  camera:String(raw.camera||'unknown'),
  sceneType:String(raw.scene_type||raw.sceneType||'unknown'),
  player:String(raw.player||'Semantic identity not confirmed'),
  enemies:Array.isArray(raw.enemies)?raw.enemies:[],
  environment:String(raw.environment||'Semantic environment not confirmed'),
  vehicles:Array.isArray(raw.vehicles)?raw.vehicles.join(', '):String(raw.vehicles||'None confidently identified'),
  notableObjects:(Array.isArray(raw.objects)?raw.objects:[]).join(', ')||String(raw.notable_objects||'No semantic object list returned'),
  objects:Array.isArray(raw.objects)?raw.objects:[],
  hud:Array.isArray(raw.hud)?raw.hud:[],
  dominantColors:(Array.isArray(raw.dominant_colors)?raw.dominant_colors:[]).join(', ')||String(raw.dominant_colors||'source-derived palette'),
  gameplaySignals:Array.isArray(raw.gameplay_signals)?raw.gameplay_signals:[],
  strongOpportunities:recs.length?recs.map(r=>`${r.type} ${Math.round(r.confidence)}%`).join(', '):(Array.isArray(raw.gameplay_signals)?raw.gameplay_signals.join(', '):'Genre not semantically confirmed'),
  possibleHazards:(Array.isArray(raw.hazards)?raw.hazards:[]).join(', ')||'Use only source-supported hazards',
  possibleCollectibles:(Array.isArray(raw.collectibles)?raw.collectibles:[]).join(', ')||'Use only source-supported rewards',
  recommended_plx:recs,
  confidence:raw.confidence||{},
  qualityScore:Number(raw?.confidence?.scene||raw?.confidence?.genre||90),
  qualityLabel:'Gemini multimodal vision',
  analysisSource:'gemini-semantic',
  description:String(raw.overview||raw.description||'')
 };
}

function cleanGeminiJson(text=''){
 return String(text).trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'').trim();
}

async function geminiAnalyze({imageDataUrl,prompt='',subjectHint='game screenshot'}={}){
 if(!geminiKey)throw new Error('GEMINI_API_KEY is not configured.');
 const {mimeType,data}=parseDataUrl(imageDataUrl);
 const instruction=`Analyze this image with the same literal visual-understanding depth as a strong multimodal image describer. Do not invent details. Return ONLY valid JSON, with no markdown fences, using exactly these keys: overview, camera, scene_type, player, enemies, environment, vehicles, objects, hud, gameplay_signals, dominant_colors, hazards, collectibles, recommended_plx, confidence.\n\nRequirements:\n- overview: a detailed but concise visual description of the image.\n- player: specific visible player/primary-subject description.\n- enemies: array of visible opponents or hostile characters.\n- environment: specific setting/background description.\n- vehicles: array of visible vehicles; empty if none.\n- objects: array of notable visible objects/props/signs.\n- hud: array of visible HUD/interface elements and readable text.\n- gameplay_signals: array of visible gameplay/action cues.\n- dominant_colors: array of major colors/palette descriptions.\n- hazards and collectibles: arrays; empty when not visible.\n- recommended_plx: exactly three objects with keys type, confidence, reason. type must be one of runner,dodge,collect,rhythm,puzzle,fps,fighting,openworld,racing,platformer. confidence is 0-100. Base recommendations on visible evidence only.\n- confidence: object with numeric scene, player, genre fields from 0-100.\n\nBe source-grounded. If uncertain, say unknown or use an empty array. Never insert generic city, street, airport, runway, district, character, enemy, vehicle, object or HUD content that is not visible. User/context prompt: ${prompt||'(none)'}. Subject hint: ${subjectHint}.`;
 const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiKey)}`;
 const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
  contents:[{role:'user',parts:[{text:instruction},{inline_data:{mime_type:mimeType,data}}]}],
  generationConfig:{temperature:0.2}
 })});
 const rawBody=await r.text();
 if(!r.ok)throw new Error(`Gemini HTTP ${r.status}: ${rawBody.slice(0,900)}`);
 let body;try{body=JSON.parse(rawBody);}catch{throw new Error('Gemini returned an unreadable API response');}
 const text=body?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
 if(!text)throw new Error('Gemini returned no visual analysis');
 let raw;
 try{raw=JSON.parse(cleanGeminiJson(text));}
 catch{
   return {ok:true,provider:'gemini',model:geminiModel,analysis:{
     camera:'unknown',sceneType:'unknown',player:'See Gemini visual description',enemies:[],environment:'See Gemini visual description',vehicles:'None confidently identified',notableObjects:text,objects:[],hud:[],dominantColors:'source-derived palette',gameplaySignals:[],strongOpportunities:'Review Gemini description before selecting game type',possibleHazards:'Use only source-supported hazards',possibleCollectibles:'Use only source-supported rewards',recommended_plx:[],confidence:{},qualityScore:80,qualityLabel:'Gemini multimodal vision',analysisSource:'gemini-semantic',description:text
   },rawAnalysis:{overview:text},description:text,assets:{}};
 }
 return {ok:true,provider:'gemini',model:geminiModel,analysis:toFrontendAnalysis(raw),rawAnalysis:raw,description:String(raw.overview||''),assets:{}};
}

app.get('/api/health',async(_req,res)=>{
 let pythonVision=false,pythonProvider='offline';
 try{const v=await visionFetch('/health');pythonVision=!!v.ok;pythonProvider=v.provider||'python';}catch{}
 res.json({ok:true,aiConfigured:Boolean(client&&process.env.OPENAI_MODEL),imageModelConfigured:Boolean(client&&process.env.OPENAI_IMAGE_MODEL),visionConfigured:Boolean(geminiKey)||pythonVision,visionProvider:geminiKey?'gemini':pythonProvider,geminiModel:geminiKey?geminiModel:null});
});
app.get('/api/vision/health',(_req,res)=>{
 if(!geminiKey)return res.status(503).json({ok:false,provider:'offline',error:'GEMINI_API_KEY is not configured.'});
 res.json({ok:true,provider:'gemini',model:geminiModel,configured:true});
});
app.post('/api/vision/analyze',async(req,res)=>{
 try{
  if(geminiKey)return res.json(await geminiAnalyze(req.body||{}));
  try{const body=JSON.stringify(req.body||{});return res.json(await visionFetch('/analyze',{method:'POST',headers:{'content-type':'application/json'},body}));}
  catch{return res.status(503).json({ok:false,provider:'offline',error:'Semantic AI Vision unavailable.',analysis:{player:'Semantic AI Vision unavailable',environment:'Semantic AI Vision unavailable',notableObjects:'Semantic AI Vision unavailable',strongOpportunities:'Genre not semantically confirmed',recommended_plx:[]},assets:{}});}
 }catch(error){console.error('gemini vision',error);res.status(502).json({ok:false,provider:'gemini',model:geminiModel,error:error.message,analysis:{player:'Semantic AI Vision unavailable',environment:'Semantic AI Vision unavailable',notableObjects:'Semantic AI Vision unavailable',strongOpportunities:'Genre not semantically confirmed',recommended_plx:[]},assets:{}});}
});

const CALIBRATION_PROFILES={
 runner:{camera:'side-scrolling / on-rails forward movement',loop:'continuous forward movement, jumping/sliding/dodging and escalating hazards',scroll:'world moves left as the player advances right'},
 dodge:{camera:'top-down forward-motion dodge view',loop:'free lateral movement while hazards enter from ahead',scroll:'world moves downward toward the player'},
 collect:{camera:'top-down exploration',loop:'explore, collect themed objects, avoid contextual hazards, complete the set',scroll:'camera follows player naturally; no fake auto-scroll'},
 rhythm:{camera:'front-facing rhythm arcade view',loop:'incoming beat cues descend to timing zones',scroll:'rhythm field moves downward with notes'},
 puzzle:{camera:'fixed puzzle board',loop:'manipulate themed pieces to solve a clear visual challenge',scroll:'static board with animated feedback'},
 fps:{camera:'first-person arcade shooter',loop:'aim, fire, reload and clear waves of themed targets',scroll:'no arbitrary auto-scroll; target/camera motion supplies action'},
 fighting:{camera:'side-view fighting / beat-em-up',loop:'move, jump, attack, block and defeat visible rivals',scroll:'stable arena or authored side-scroll based on source/user intent'},
 openworld:{camera:'free-roam exploration',loop:'travel, interact, collect and discover events',scroll:'camera follows the player through the world'},
 racing:{camera:'behind/top-down arcade racing',loop:'steer, dodge traffic, collect boosts and finish',scroll:'road and scenery move downward toward the player'},
 platformer:{camera:'side-scrolling platformer',loop:'run, jump, climb, avoid enemies and reach the goal',scroll:'world moves left as player advances right'}
};
function inferCalibrationEngine(prompt=''){const p=String(prompt).toLowerCase();const tests=[['fighting',/karate|martial|fight|fighting|beat.?em.?up|brawler|punch|kick|duel|versus|1v1/],['fps',/fps|first person|shooter|shoot|target/],['racing',/race|racing|drive|driving|vehicle|car/],['rhythm',/rhythm|dance|beat|music|tempo/],['puzzle',/puzzle|match|memory|solve|sequence/],['openworld',/open world|free roam|sandbox|quest/],['platformer',/platform|jump across|side scroll/],['dodge',/dodge|avoid|falling|escape/],['collect',/collect|gather|find|hunt|relic/]];for(const [e,r] of tests)if(r.test(p))return e;return 'runner';}
function localCalibration({prompt='',engine='',style='premium arcade',sourceSummary=''}){
 engine=engine||inferCalibrationEngine(prompt);const p=CALIBRATION_PROFILES[engine]||CALIBRATION_PROFILES.runner;const idea=String(prompt||'').trim().replace(/\s+/g,' ');
 return `Create a polished ${style} ${String(engine).toUpperCase()} PLX from the uploaded media.\n\nCORE IDEA\n${idea}\n\nGAMEPLAY\n- Camera: ${p.camera}.\n- Core loop: ${p.loop}.\n- World motion: ${p.scroll}.\n- First meaningful interaction within 3–5 seconds; escalate difficulty and end with a satisfying finish.\n\nSOURCE MEDIA\n- Separate the primary subject from large background objects before creating the player.\n- Use the upload as visual DNA, not as a flat full-screen background.\n- Use clean extracted objects only when masks are strong; otherwise substitute polished themed game assets.\n${sourceSummary?`- Source analysis: ${sourceSummary}.\n`:''}\nART DIRECTION\n- Build far, mid, near and gameplay layers with movement appropriate to this engine.\n- Preserve recognizable source colors/motifs but unify them into finished arcade art.\n- Use clean silhouettes, transparent edges, lighting, particles, impact feedback and premium HUD treatment.\n- Never use black squares, plain rectangles or debug geometry as visible final gameplay assets.\n\nQUALITY BAR\nThe game should look like a finished arcade mini-game, not a prototype or an image pasted behind moving shapes.`;
}
app.post('/api/calibrate-prompt',async(req,res)=>{
 try{
  const {prompt='',engine='',style='premium arcade',sourceSummary=''}=req.body||{};
  const fallback=localCalibration({prompt,engine,style,sourceSummary});
  if(!client||!process.env.OPENAI_MODEL)return res.json({ok:true,mode:'local',prompt:fallback});
  const response=await client.responses.create({model:process.env.OPENAI_MODEL,input:[{role:'user',content:[{type:'input_text',text:`Rewrite this user's game idea into a precise XPLAY generation brief. Preserve the user's actual concept. Optimize it for a ${engine} engine, correct camera/world movement, source-image decomposition, arcade-quality asset generation, and no placeholder geometry. Return only the calibrated prompt text.\n\nUSER IDEA:\n${prompt}\n\nLOCAL STRUCTURE TO IMPROVE:\n${fallback}`}]}]});
  res.json({ok:true,mode:'ai',prompt:(response.output_text||fallback).trim()});
 }catch(error){res.json({ok:true,mode:'local-fallback',prompt:localCalibration(req.body||{})});}
});

app.post('/api/direct',async(req,res)=>{
 try{
  const {prompt='',imageDataUrl,styleDNA,visualAnalysis,options={}}=req.body||{};
  const selected=normalizeEngine(options.selectedEngine||'');
  if(!client||!process.env.OPENAI_MODEL)return res.status(503).json({ok:false,mode:'local',error:'AI Director not configured'});
  const content=[{type:'input_text',text:`You are the XPLAY PLX Creative Director. Return ONLY JSON with keys: title,engine,template,camera,objective,playerRole,environment,collectibles,hazards,artDirection,duration,difficulty,assetPrompts,scenePlan. engine must be one of runner,dodge,collect,rhythm,puzzle,fps,fighting,openworld,racing,platformer. HARD RULE: if Selected engine is present, output exactly that engine and do not reinterpret it. Selected engine: ${selected||'(none)'}. Preserve the CURRENT visual analysis; never invent old prototype/airport content. User prompt: ${prompt}\nStyle DNA: ${JSON.stringify(styleDNA||{})}\nVisual analysis: ${JSON.stringify(visualAnalysis||{})}\nOptions: ${JSON.stringify(options||{})}`}];
  if(imageDataUrl)content.push({type:'input_image',image_url:imageDataUrl});
  const response=await client.responses.create({model:process.env.OPENAI_MODEL,input:[{role:'user',content}]});
  const cleaned=(response.output_text||'{}').replace(/^```json/i,'').replace(/^```/,'').replace(/```$/,'').trim();
  const spec=JSON.parse(cleaned);if(selected)spec.engine=selected;
  res.json({ok:true,mode:'ai',spec});
 }catch(error){console.error(error);res.status(500).json({ok:false,error:error.message});}
});

app.post('/api/generate-asset',async(req,res)=>{
 try{if(!client||!process.env.OPENAI_IMAGE_MODEL)return res.status(503).json({ok:false,error:'Image generation not configured'});const {prompt,size='1024x1024'}=req.body||{};const result=await client.images.generate({model:process.env.OPENAI_IMAGE_MODEL,prompt,size});const item=result.data?.[0];res.json({ok:true,image:item?.b64_json?`data:image/png;base64,${item.b64_json}`:item?.url});}
 catch(error){res.status(500).json({ok:false,error:error.message});}
});

app.post('/api/forge-art-pack',async(req,res)=>{
 try{
  if(!client||!process.env.OPENAI_IMAGE_MODEL)return res.status(503).json({ok:false,error:'Production image model not configured'});
  const {prompt='',engine='runner',style='polished 16-bit arcade',imageDataUrl='',visualAnalysis=null,characterBible=null,characterLock='',repairFeedback='',regenerationPass=0}=req.body||{};
  const theme=`${prompt} ${visualAnalysis?.environment||''}`.trim();
  const bible=`ORIGINAL ${style}. Cohesive commercial 2D arcade game art. Same palette, lighting, perspective, outline language, scale and material treatment across every sheet. No copyrighted characters, logos, text labels, UI mockups, checkerboard, watermarks, or photoreal collage. ${engine==='fps'?'First-person arcade world.':'Side-view 2D game world.'}`;
  const source=imageDataUrl?'Use the uploaded source as the canonical identity and world reference; reinterpret it into original game art while preserving the chosen subject identity.':'';
  const identity=characterLock||characterBible?.identityLock||'';
  const repair=repairFeedback?`QUALITY REPAIR PASS: Correct these prior atlas defects: ${repairFeedback}. Do not repeat them.`:'';
  const prompts={
   background:`${bible} ${source} World concept: ${theme}. Create one complete 16:9 gameplay background/environment plate with clear far, mid and near depth, authored landmarks, texture, atmospheric perspective, and dense environmental storytelling. Leave the central playable lane readable. No characters or UI.`,
   player:`${bible} ${source} ${identity} ${repair} World concept: ${theme}. Create a STRICT 4 columns x 4 rows sprite contact sheet on transparent background for the SAME original player character, centered in every cell, equal scale, no cell borders. Row-major poses: idleA,idleB,run1,run2,run3,run4,jumpA,jumpB,fall,landA,landB,hurtA,hurtB,victoryA,victoryB,victoryC. Full body. Consistent costume and proportions.`,
   tiles:`${bible} ${repair} World concept: ${theme}. Create a STRICT 4x4 tileset/contact sheet with sixteen seamless terrain/platform pieces, one piece per cell, consistent scale, clean game-ready edges: center,left edge,right edge,inner corner,outer corner,slope up,slope down,ramp,thin platform,wide platform,bridge,ledge,wall,damaged variant,alternate material,special/finish tile. No text.`,
   props:`${bible} ${repair} World concept: ${theme}. Create a STRICT 4x4 transparent-background prop sheet, one isolated gameplay prop per cell, equal scale and clean silhouette. Make sixteen visually distinct environment-specific props with strong material detail and readable shape. No text labels.`,
   actors:`${bible} ${repair} World concept: ${theme}. Create a STRICT 4x4 transparent-background gameplay actor sheet: four hazard families, four enemy/target families, four collectible/reward objects, and four signature/FX objects. One object per cell, equal game-ready scale, strong silhouettes, no labels.`
  };
  async function gen(text,size='1024x1024'){const result=await client.images.generate({model:process.env.OPENAI_IMAGE_MODEL,prompt:text,size});const item=result.data?.[0];return item?.b64_json?`data:image/png;base64,${item.b64_json}`:item?.url;}
  const [background,player,tiles,props,actors]=await Promise.all([gen(prompts.background,process.env.OPENAI_WIDE_IMAGE_SIZE||'1536x1024'),gen(prompts.player),gen(prompts.tiles),gen(prompts.props),gen(prompts.actors)]);
  res.json({ok:true,background,sheets:{player,tiles,props,actors},regenerationPass,provenance:{mode:'ai-batch-world-forge-v4',engine,style,sourceUsed:Boolean(imageDataUrl),model:process.env.OPENAI_IMAGE_MODEL,characterBible:Boolean(characterBible),regenerationPass,repairFeedback:repairFeedback||null}});
 }catch(error){console.error('forge-art-pack',error);res.status(500).json({ok:false,error:error.message});}
});

app.post('/api/remaster-asset',async(req,res)=>{
 try{
  if(!client||!process.env.OPENAI_IMAGE_MODEL)return res.status(503).json({ok:false,error:'OPENAI_IMAGE_MODEL not configured'});
  const {imageDataUrl,role='player',style='premium arcade',prompt=''}=req.body||{};
  const match=imageDataUrl?.match(/^data:(.*?);base64,(.*)$/s);if(!match)return res.status(400).json({ok:false,error:'Expected base64 image data URL'});
  const mime=match[1]||'image/png';const bytes=Buffer.from(match[2],'base64');const file=new File([bytes],`source.${mime.includes('jpeg')?'jpg':'png'}`,{type:mime});
  const artPrompt=`Transform this isolated ${role} reference into polished ${style} game art for XPLAY. Preserve recognizable identity and silhouette. Clean edges. No background clutter. ${role==='player'?'Full-body arcade character, readable pose, transparent background if supported.':'Standalone game asset with clean silhouette.'} ${prompt}`;
  const result=await client.images.edit({model:process.env.OPENAI_IMAGE_MODEL,image:file,prompt:artPrompt});const item=result.data?.[0];const image=item?.b64_json?`data:image/png;base64,${item.b64_json}`:item?.url;
  res.json({ok:true,image,prompt:artPrompt});
 }catch(error){console.error(error);res.status(500).json({ok:false,error:error.message});}
});

app.listen(port,()=>{console.log(`XPLAY API server: http://localhost:${port}`);console.log(`Gemini Vision: ${geminiKey?`READY (${geminiModel})`:'OFFLINE (add GEMINI_API_KEY to server/.env)'}`);console.log(`Legacy Visual Intelligence target: ${visionUrl}`);if(!process.env.OPENAI_API_KEY)console.log('AI/Art: LOCAL FALLBACK (add OPENAI_API_KEY for semantic direction + remaster)');});