import { resilientGeminiText, modelCascade } from './geminiResilience.js';

// Proven XPLAY Gemini multimodal path, adapted directly from the working Gemini Vision Drop Test.

const ALLOWED_ENGINES=['runner','dodge','collect','rhythm','puzzle','fps','fighting','openworld','racing','platformer'];

function parseDataUrl(dataUrl=''){
  const m=String(dataUrl).match(/^data:([^;]+);base64,(.+)$/s);
  if(!m)throw new Error('Image must be a base64 data URL.');
  return {mimeType:m[1],data:m[2]};
}

function normalizeEngine(v=''){
  const raw=String(v).toLowerCase().replace(/[^a-z0-9]/g,'');
  const aliases={firstpersonshooter:'fps',shooter:'fps',beatemup:'fighting',brawler:'fighting',fighter:'fighting',openworld:'openworld',platform:'platformer',platforming:'platformer',race:'racing'};
  const out=aliases[raw]||raw;
  return ALLOWED_ENGINES.includes(out)?out:'';
}

function stripJsonFence(text=''){
  return String(text).trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'').trim();
}

async function geminiRequest({apiKey,model,parts,temperature=0.2,label='vision'}){
  return resilientGeminiText({apiKey,primaryModel:model,parts,temperature,label});
}


function frontendAnalysis(raw={},description=''){
  const recs=(Array.isArray(raw.recommended_plx)?raw.recommended_plx:[])
    .map(r=>({type:normalizeEngine(r?.type),confidence:Math.max(0,Math.min(100,Number(r?.confidence)||0)),reason:String(r?.reason||'')}))
    .filter(r=>r.type)
    .sort((a,b)=>b.confidence-a.confidence)
    .slice(0,3);
  return {
    camera:String(raw.camera||'unknown'),
    sceneType:String(raw.scene_type||'unknown'),
    player:String(raw.player||'unknown'),
    enemies:Array.isArray(raw.enemies)?raw.enemies:[],
    environment:String(raw.environment||'unknown'),
    vehicles:Array.isArray(raw.vehicles)?raw.vehicles.join(', '):(raw.vehicles||'None confidently identified'),
    notableObjects:(Array.isArray(raw.objects)?raw.objects:[]).join(', ')||'None confidently identified',
    objects:Array.isArray(raw.objects)?raw.objects:[],
    hud:Array.isArray(raw.hud)?raw.hud:[],
    dominantColors:(Array.isArray(raw.dominant_colors)?raw.dominant_colors:[]).join(', ')||'unknown',
    gameplaySignals:Array.isArray(raw.gameplay_signals)?raw.gameplay_signals:[],
    strongOpportunities:recs.length?recs.map(r=>`${r.type} ${Math.round(r.confidence)}%`).join(', '):'Genre not semantically confirmed',
    possibleHazards:(Array.isArray(raw.hazards)?raw.hazards:[]).join(', ')||'None confidently identified',
    possibleCollectibles:(Array.isArray(raw.collectibles)?raw.collectibles:[]).join(', ')||'None confidently identified',
    recommended_plx:recs,
    confidence:raw.confidence||{},
    qualityScore:Number(raw?.confidence?.scene||raw?.confidence?.genre||90),
    qualityLabel:'Gemini multimodal vision',
    analysisSource:'gemini-vision-drop-proven',
    fullDescription:description
  };
}

export function registerGeminiVisionDropRoutes(app,{apiKey,model='gemini-3.6-flash'}={}){
  app.get('/api/vision/health',(_req,res)=>{
    const rawEnv=String(process.env.GEMINI_API_KEY||'');
    const envPresent=Object.prototype.hasOwnProperty.call(process.env,'GEMINI_API_KEY');
    const diagnostics={envPresent,rawLength:rawEnv.length,trimmedLength:rawEnv.trim().length,revision:process.env.K_REVISION||null,service:process.env.K_SERVICE||null};
    if(!apiKey)return res.status(503).json({ok:false,provider:'offline',configured:false,error:'GEMINI_API_KEY is not configured.',diagnostics});
    res.json({ok:true,provider:'gemini',model,configured:true,mode:'vision-resilient-v2',modelCascade:modelCascade(model),diagnostics});
  });

  app.post('/api/vision/analyze',async(req,res)=>{
    try{
      if(!apiKey)return res.status(503).json({ok:false,error:'GEMINI_API_KEY is not configured.'});
      const {imageDataUrl,prompt=''}=req.body||{};
      if(!imageDataUrl)return res.status(400).json({ok:false,error:'imageDataUrl is required.'});
      const {mimeType,data}=parseDataUrl(imageDataUrl);

      const descriptionPrompt=(prompt&&String(prompt).trim())
        ? `Analyze this image carefully for XPLAY. User context: ${String(prompt).trim()}\n\nDescribe the image clearly and specifically. Identify the main subject/player candidate, setting, enemies or other characters, notable objects, visible text/HUD, colors, composition/camera, likely activity/gameplay, and game genre. Do not invent details that are not visible. If something is uncertain, say so.`
        : 'Describe this image clearly and specifically. Identify the main subject/player candidate, setting, enemies or other characters, notable objects, visible text/HUD, colors, composition/camera, likely activity/gameplay, and game genre. Do not invent details that are not visible. If something is uncertain, say so.';
      const descriptionResult=await geminiRequest({apiKey,model,parts:[{text:descriptionPrompt},{inline_data:{mime_type:mimeType,data}}],temperature:0.2,label:'literal-vision'});
      const description=descriptionResult.text;

      const structurePrompt=`Convert the following already-completed visual description into STRICT JSON only. Do not add facts that are absent from the description. Unknown stays unknown.\n\nAllowed PLX types: ${ALLOWED_ENGINES.join(', ')}. Recommend the top three most compatible PLX types, with confidence 0-100 and evidence-based reasons.\n\nReturn exactly these keys:\n{\n  \"camera\":\"\",\n  \"scene_type\":\"\",\n  \"player\":\"\",\n  \"enemies\":[],\n  \"vehicles\":[],\n  \"environment\":\"\",\n  \"objects\":[],\n  \"hud\":[],\n  \"gameplay_signals\":[],\n  \"dominant_colors\":[],\n  \"hazards\":[],\n  \"collectibles\":[],\n  \"recommended_plx\":[{\"type\":\"\",\"confidence\":0,\"reason\":\"\"}],\n  \"confidence\":{\"scene\":0,\"player\":0,\"genre\":0}\n}\n\nVISUAL DESCRIPTION:\n${description}`;
      const structuredResult=await geminiRequest({apiKey,model:descriptionResult.modelUsed||model,parts:[{text:structurePrompt}],temperature:0.05,label:'vision-structure'});
      const structuredText=structuredResult.text;
      const raw=JSON.parse(stripJsonFence(structuredText));
      const analysis=frontendAnalysis(raw,description);
      res.json({ok:true,provider:'gemini',model:structuredResult.modelUsed||descriptionResult.modelUsed||model,requestedModel:model,mode:'vision-resilient-v2',description,analysis,rawAnalysis:raw,assets:{},resilience:{descriptionAttempts:descriptionResult.attempts,structureAttempts:structuredResult.attempts,modelCascade:modelCascade(model)}});
    }catch(e){
      console.error('[Gemini Vision Drop Proven]',e);
      const status=e?.status===503||e?.retryable?503:502;
      res.status(status).json({ok:false,provider:'gemini',model,code:e?.retryable?'VISION_PROVIDER_BUSY':'VISION_ERROR',retryable:!!e?.retryable,error:e?.message||String(e),details:e?.details||null});
    }
  });
}
