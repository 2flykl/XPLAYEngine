import { resilientGeminiText, modelCascade } from './geminiResilience.js';

const ALLOWED_ENGINES=['runner','dodge','collect','rhythm','puzzle','fps','fighting','openworld','racing','platformer'];

function parseDataUrl(dataUrl=''){
  const m=String(dataUrl).match(/^data:([^;]+);base64,(.+)$/s);
  if(!m)throw new Error('Image must be a base64 data URL.');
  return {mimeType:m[1],data:m[2]};
}
function stripFence(s=''){return String(s).trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'').trim();}
function clamp(n,min=0,max=1000){n=Number(n);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):0;}
function normalizeBox(box){
  const a=Array.isArray(box)?box.map(v=>clamp(v)):[];
  if(a.length!==4)return null;
  const [y1,x1,y2,x2]=a;return [Math.min(y1,y2),Math.min(x1,x2),Math.max(y1,y2),Math.max(x1,x2)];
}
function normalizeContour(points){
  if(!Array.isArray(points))return [];
  return points.map(p=>Array.isArray(p)&&p.length>=2?[clamp(p[0]),clamp(p[1])]:null).filter(Boolean).slice(0,80);
}
function normalizeEntity(e={},i=0){
  const type=String(e.type||'object').toLowerCase().replace(/[^a-z0-9_-]/g,'_');
  return {
    id:String(e.id||`${type}_${i}`),
    label:String(e.label||e.name||type),
    type,
    role:String(e.role||''),
    box_2d:normalizeBox(e.box_2d||e.box),
    contour:normalizeContour(e.contour||e.mask_polygon||e.polygon),
    depth:String(e.depth||'unknown'),
    facing:String(e.facing||'unknown'),
    state:String(e.state||''),
    confidence:Math.max(0,Math.min(100,Number(e.confidence)||0)),
    source:String(e.source||'whole-image')
  };
}
function iou(a,b){
  if(!a||!b)return 0;const [ay1,ax1,ay2,ax2]=a,[by1,bx1,by2,bx2]=b;
  const iy=Math.max(0,Math.min(ay2,by2)-Math.max(ay1,by1));
  const ix=Math.max(0,Math.min(ax2,bx2)-Math.max(ax1,bx1));
  const inter=iy*ix,ua=(ay2-ay1)*(ax2-ax1),ub=(by2-by1)*(bx2-bx1);
  return inter/Math.max(1,ua+ub-inter);
}
function dedupeEntities(list=[]){
  const out=[];
  for(const e of list.map(normalizeEntity).filter(e=>e.box_2d)){
    const match=out.find(x=>x.type===e.type&&String(x.label).toLowerCase()===String(e.label).toLowerCase()&&iou(x.box_2d,e.box_2d)>.48);
    if(!match)out.push(e);else if(e.confidence>match.confidence)Object.assign(match,e);
  }
  return out;
}
async function geminiJSON({apiKey,model,parts,temperature=.05,label='spatial-vision'}){
  const result=await resilientGeminiText({apiKey,primaryModel:model,parts,temperature,label});
  return {json:JSON.parse(stripFence(result.text)),modelUsed:result.modelUsed,attempts:result.attempts};
}

function scenePrompt({analysis='',selectedEngine='',userIntent='',tileMode=false}={}){
  return `You are XPLAY Spatial Vision, a source-grounded computer-vision stage for game reconstruction.
${tileMode?'This request includes the full source image followed by overlapping detail tiles. Use the full image for global coordinates and tiles only to improve recognition.':''}

VISION ANALYSIS ALREADY COMPLETED:
${analysis||'(none)'}
USER-LOCKED ENGINE: ${selectedEngine||'none'}
USER INTENT: ${userIntent||'none'}

Return STRICT JSON only. Use normalized 0-1000 coordinates for the ORIGINAL full image, as [ymin,xmin,ymax,xmax]. Do not invent entities. If uncertain, omit them. Identify geometry, not just prose.

Required shape:
{
  "camera":{"view":"","scroll_axis":"horizontal|vertical|none|unknown","depth_axis":"vertical|horizontal|none|unknown"},
  "playfield":{"box_2d":[0,0,0,0],"polygon":[[y,x]],"description":""},
  "entities":[{"id":"","label":"","type":"player|enemy|npc|prop|building|environment|hud|fx|weapon|collectible|hazard|vehicle","role":"","box_2d":[0,0,0,0],"contour":[[y,x]],"depth":"foreground|playfield|midground|background|hud|unknown","facing":"left|right|up|down|unknown","state":"","confidence":0}],
  "layers":[{"name":"","depth":"foreground|playfield|midground|background","box_2d":[0,0,0,0],"confidence":0}],
  "hud_regions":[{"label":"","box_2d":[0,0,0,0],"meaning":"","confidence":0}],
  "grid_summary":{"rows":6,"cols":8,"occupied_cells":[{"cell":"A1","entities":[""]}]},
  "engine_recommendations":[{"type":"${ALLOWED_ENGINES.join('|')}","confidence":0,"reason":""}],
  "confidence":{"scene_graph":0,"playfield":0,"segmentation":0}
}

Rules:
- Player/enemy boxes should tightly bound visible bodies.
- Contours are coarse polygons around visible silhouettes when feasible; 6-30 points is enough.
- HUD must be separated from world geometry.
- The playfield is traversable gameplay space, not the entire screenshot.
- Preserve the source image's actual camera and spatial hierarchy.
- Never introduce airports, runways, jets, crosshairs, roads, props, characters, or scenery unless visible or explicitly required by user intent.`;
}
function makeSceneGraph(raw={}){
  return {
    version:1,
    camera:raw.camera||{},
    playfield:{...(raw.playfield||{}),box_2d:normalizeBox(raw.playfield?.box_2d),polygon:normalizeContour(raw.playfield?.polygon)},
    entities:dedupeEntities(raw.entities||[]),
    layers:(raw.layers||[]).map((x,i)=>({name:String(x.name||`layer_${i}`),depth:String(x.depth||'unknown'),box_2d:normalizeBox(x.box_2d),confidence:Math.max(0,Math.min(100,Number(x.confidence)||0))})).filter(x=>x.box_2d),
    hud_regions:(raw.hud_regions||[]).map((x,i)=>({id:`hud_${i}`,label:String(x.label||'HUD'),box_2d:normalizeBox(x.box_2d),meaning:String(x.meaning||''),confidence:Math.max(0,Math.min(100,Number(x.confidence)||0))})).filter(x=>x.box_2d),
    grid_summary:raw.grid_summary||{rows:6,cols:8,occupied_cells:[]},
    engine_recommendations:Array.isArray(raw.engine_recommendations)?raw.engine_recommendations:[],
    confidence:raw.confidence||{}
  };
}
function manifestFromSceneGraph(sceneGraph={},analysis=''){
  const jobs=[];
  for(const e of sceneGraph.entities||[]){
    let strategy='extract',category=e.type,deliverables=['transparent PNG reference'];
    const tools=['segmentation','alpha-matting','consistency-qa'];
    if(['player','enemy','npc'].includes(e.type)){
      strategy='rebuild';deliverables=['transparent identity reference','production sprite sheet','collision silhouette'];
      tools.push('pose-estimation','sprite-synthesis','animation-completion');
    }else if(['environment','building'].includes(e.type)||e.depth==='background'||e.depth==='midground'){
      strategy='extend';deliverables=['clean layer','left/right extension','parallax-ready layer'];
      tools.push('depth-layering','outpainting-world-extension');
    }else if(e.type==='hud'){
      strategy='rebuild';deliverables=['clean UI element'];tools.push('ocr','ui-reconstruction');
    }else if(e.type==='fx'){
      strategy='synthesize';deliverables=['transparent FX frames'];tools.push('fx-generation');
    }
    jobs.push({id:e.id,name:e.label,category,strategy,source_box_2d:e.box_2d,source_contour:e.contour,depth:e.depth,reason:`Source-grounded ${e.type} detected by Spatial Vision.`,tool_route:[...new Set(tools)],deliverables,qa_gates:['matches source identity/style','no unrelated legacy content','approved for current build only']});
  }
  if(sceneGraph.playfield?.box_2d)jobs.push({id:'playfield_tiles',name:'Playable floor / traversal plane',category:'tileset',strategy:'rebuild',source_box_2d:sceneGraph.playfield.box_2d,reason:'Convert detected traversable plane into reusable gameplay geometry.',tool_route:['perspective-analysis','tileset-generation','collision-mask-extraction','consistency-qa'],deliverables:['floor tiles','collision mask','spawn-safe geometry'],qa_gates:['matches detected playfield','no old terrain sheet reuse']});
  return {version:1,source_truth:String(analysis||''),jobs,hard_locks:{current_build_only:true,forbid_unlisted_generic_assets:true,preserve_camera:true,preserve_spatial_hierarchy:true},counts:{jobs:jobs.length,rebuild:jobs.filter(x=>x.strategy==='rebuild').length,extract:jobs.filter(x=>x.strategy==='extract').length,extend:jobs.filter(x=>x.strategy==='extend').length,synthesize:jobs.filter(x=>x.strategy==='synthesize').length}};
}

export function registerSpatialVisionRoutes(app,{apiKey,model='gemini-3.6-flash'}={}){
  app.get('/api/vision/spatial/health',(_req,res)=>res.status(apiKey?200:503).json({ok:!!apiKey,provider:apiKey?'gemini':'offline',model,mode:'spatial-resilient-v2',modelCascade:modelCascade(model)}));
  app.post('/api/vision/spatial',async(req,res)=>{
    try{
      if(!apiKey)return res.status(503).json({ok:false,error:'GEMINI_API_KEY is not configured.'});
      const {imageDataUrl,analysis='',selectedEngine='',userIntent='',detailTiles=[]}=req.body||{};
      if(!imageDataUrl)return res.status(400).json({ok:false,error:'imageDataUrl is required.'});
      const full=parseDataUrl(imageDataUrl);
      const parts=[{text:scenePrompt({analysis,selectedEngine,userIntent,tileMode:Array.isArray(detailTiles)&&detailTiles.length>0})},{inline_data:{mime_type:full.mimeType,data:full.data}}];
      for(const t of (Array.isArray(detailTiles)?detailTiles:[]).slice(0,6)){
        try{const p=parseDataUrl(t?.dataUrl||'');parts.push({text:`Detail tile ${t?.id||''}. Tile bounds in original normalized coordinates: ${JSON.stringify(t?.bounds||[])}. Use this only to improve recognition; return all final coordinates in the original full-image coordinate system.`},{inline_data:{mime_type:p.mimeType,data:p.data}});}catch{}
      }
      const spatialResult=await geminiJSON({apiKey,model,parts,temperature:.05,label:'spatial-scene-graph'});
      const raw=spatialResult.json;
      const sceneGraph=makeSceneGraph(raw);
      const assetManifest=manifestFromSceneGraph(sceneGraph,analysis);
      res.json({ok:true,provider:'gemini',model:spatialResult.modelUsed||model,requestedModel:model,mode:'spatial-resilient-v2',sceneGraph,assetManifest,raw,resilience:{attempts:spatialResult.attempts,modelCascade:modelCascade(model)}});
    }catch(e){console.error('[Spatial Vision]',e);const status=e?.status===503||e?.retryable?503:502;res.status(status).json({ok:false,code:e?.retryable?'VISION_PROVIDER_BUSY':'SPATIAL_VISION_ERROR',retryable:!!e?.retryable,error:e?.message||String(e),details:e?.details||null});}
  });
}
