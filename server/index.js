import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app=express();
app.use(cors());
app.use(express.json({limit:'28mb'}));
const port=Number(process.env.PORT||8787);
const visionUrl=process.env.VISION_SERVICE_URL||'http://127.0.0.1:8790';
const client=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;

async function visionFetch(path,opts={}){const r=await fetch(`${visionUrl}${path}`,opts);if(!r.ok)throw new Error(`Vision service ${r.status}`);return await r.json();}

app.get('/api/health',async(_req,res)=>{let vision=false,provider='offline';try{const v=await visionFetch('/health');vision=!!v.ok;provider=v.provider||'python';}catch{}res.json({ok:true,aiConfigured:Boolean(client&&process.env.OPENAI_MODEL),imageModelConfigured:Boolean(client&&process.env.OPENAI_IMAGE_MODEL),visionConfigured:vision,visionProvider:provider});});
app.get('/api/vision/health',async(_req,res)=>{try{res.json(await visionFetch('/health'));}catch(error){res.status(503).json({ok:false,provider:'offline',error:error.message});}});
app.post('/api/vision/analyze',async(req,res)=>{try{const body=JSON.stringify(req.body||{});res.json(await visionFetch('/analyze',{method:'POST',headers:{'content-type':'application/json'},body}));}catch(error){res.status(503).json({ok:false,error:`Visual Intelligence service unavailable: ${error.message}`});}});


const CALIBRATION_PROFILES={
 runner:{camera:'side-scrolling / on-rails forward movement',loop:'continuous forward movement, jumping/sliding/dodging and escalating hazards',scroll:'world moves left as the player advances right'},
 dodge:{camera:'top-down forward-motion dodge view',loop:'free lateral movement while hazards enter from ahead',scroll:'world moves downward toward the player'},
 collect:{camera:'top-down exploration',loop:'explore, collect themed objects, avoid contextual hazards, complete the set',scroll:'camera follows player naturally; no fake auto-scroll'},
 rhythm:{camera:'front-facing rhythm arcade view',loop:'incoming beat cues descend to timing zones',scroll:'rhythm field moves downward with notes'},
 puzzle:{camera:'fixed puzzle board',loop:'manipulate themed pieces to solve a clear visual challenge',scroll:'static board with animated feedback'},
 fps:{camera:'first-person arcade shooter',loop:'aim, fire, reload and clear waves of themed targets',scroll:'no arbitrary auto-scroll; target/camera motion supplies action'},
 fighting:{camera:'side-view 1v1 fighter',loop:'move, jump, attack, block and defeat the rival',scroll:'stable arena; camera follows fighter spacing'},
 openworld:{camera:'free-roam exploration',loop:'travel, interact, collect and discover events',scroll:'camera follows the player through the world'},
 racing:{camera:'behind/top-down arcade racing',loop:'steer, dodge traffic, collect boosts and finish',scroll:'road and scenery move downward toward the player'},
 platformer:{camera:'side-scrolling platformer',loop:'run, jump, climb, avoid enemies and reach the goal',scroll:'world moves left as player advances right'}
};
function inferCalibrationEngine(prompt=''){const p=String(prompt).toLowerCase();const tests=[['fps',/fps|first person|shooter|shoot|target/],['fighting',/fight|fighting|boxing|duel|versus|1v1/],['racing',/race|racing|drive|driving|vehicle|car/],['rhythm',/rhythm|dance|beat|music|tempo/],['puzzle',/puzzle|match|memory|solve|sequence/],['openworld',/open world|free roam|sandbox|quest/],['platformer',/platform|jump across|side scroll/],['dodge',/dodge|avoid|falling|escape/],['collect',/collect|gather|find|hunt|relic/]];for(const [e,r] of tests)if(r.test(p))return e;return 'runner';}
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
  if(!client||!process.env.OPENAI_MODEL)return res.status(503).json({ok:false,mode:'local',error:'AI Director not configured'});
  const {prompt,imageDataUrl,styleDNA,visualAnalysis,options}=req.body||{};
  const content=[{type:'input_text',text:`You are the XPLAY PLX Creative Director. Design a premium arcade-quality playable experience from an image and prompt. Return ONLY JSON with keys: title,engine,template,camera,objective,playerRole,environment,collectibles,hazards,artDirection,duration,difficulty,assetPrompts,scenePlan. engine must be one of runner,dodge,collect,rhythm,puzzle,fps,fighting,openworld,racing,platformer. Use visual analysis to keep the primary subject distinct from major background objects. Prefer generated/stylized game art over simply pasting the source photograph as a backdrop. User prompt: ${prompt||''}\nStyle DNA: ${JSON.stringify(styleDNA||{})}\nVisual analysis: ${JSON.stringify(visualAnalysis||{})}\nOptions: ${JSON.stringify(options||{})}`}];
  if(imageDataUrl)content.push({type:'input_image',image_url:imageDataUrl});
  const response=await client.responses.create({model:process.env.OPENAI_MODEL,input:[{role:'user',content}]});
  const cleaned=(response.output_text||'{}').replace(/^```json/i,'').replace(/^```/,'').replace(/```$/,'').trim();
  res.json({ok:true,mode:'ai',spec:JSON.parse(cleaned)});
 }catch(error){console.error(error);res.status(500).json({ok:false,error:error.message});}
});

app.post('/api/generate-asset',async(req,res)=>{
 try{if(!client||!process.env.OPENAI_IMAGE_MODEL)return res.status(503).json({ok:false,error:'Image generation not configured'});const {prompt,size='1024x1024'}=req.body||{};const result=await client.images.generate({model:process.env.OPENAI_IMAGE_MODEL,prompt,size});const item=result.data?.[0];res.json({ok:true,image:item?.b64_json?`data:image/png;base64,${item.b64_json}`:item?.url});}
 catch(error){res.status(500).json({ok:false,error:error.message});}
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

app.listen(port,()=>{console.log(`XPLAY API server: http://localhost:${port}`);console.log(`Visual Intelligence target: ${visionUrl}`);if(!process.env.OPENAI_API_KEY)console.log('AI/Art: LOCAL FALLBACK (add OPENAI_API_KEY for semantic direction + remaster)');});
