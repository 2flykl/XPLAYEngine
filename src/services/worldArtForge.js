/* XPLAY Production Art Forge v4
 * Batch art manufacturing + identity locking + atlas criticism + one targeted regeneration.
 * Static GitHub Pages runs packed output; it does not need to manufacture the art itself.
 */
import { buildCharacterBible, characterBiblePrompt } from '../core/CharacterBible.js';
import { critiqueGridDataUrl } from '../core/AtlasCritic.js';
const isStatic=()=>typeof location!=='undefined'&&location.hostname.endsWith('github.io');

async function sliceGrid(dataUrl,cols,rows,prefix){
  if(!dataUrl)return {};
  const img=new Image();img.decoding='async';img.src=dataUrl;
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});
  const sw=Math.floor(img.naturalWidth/cols),sh=Math.floor(img.naturalHeight/rows);const out={};
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const cv=document.createElement('canvas');cv.width=sw;cv.height=sh;const x=cv.getContext('2d');x.imageSmoothingEnabled=true;x.drawImage(img,c*sw,r*sh,sw,sh,0,0,sw,sh);out[`${prefix}${String(r*cols+c).padStart(2,'0')}`]=cv.toDataURL('image/png');
  }
  return out;
}
async function requestPack(payload){
  const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),120000);
  try{const r=await fetch('/api/forge-art-pack',{method:'POST',headers:{'content-type':'application/json'},signal:ctl.signal,body:JSON.stringify(payload)});if(!r.ok)return null;const data=await r.json();return data?.ok?data:null;}catch{return null}finally{clearTimeout(timeout)}
}

export async function forgeProductionArtPack({prompt='',engine='runner',style='polished 16-bit arcade',imageDataUrl='',visualAnalysis=null}={}){
  if(isStatic())return null;
  const characterBible=buildCharacterBible({visualAnalysis:visualAnalysis||{},prompt,style,role:'player'});
  let data=await requestPack({prompt,engine,style,imageDataUrl,visualAnalysis,characterBible,characterLock:characterBiblePrompt(characterBible)});
  if(!data)return null;
  let playerCritic=null,tileCritic=null,propCritic=null,actorCritic=null;
  try{[playerCritic,tileCritic,propCritic,actorCritic]=await Promise.all([
    critiqueGridDataUrl(data.sheets?.player,4,4),critiqueGridDataUrl(data.sheets?.tiles,4,4),critiqueGridDataUrl(data.sheets?.props,4,4),critiqueGridDataUrl(data.sheets?.actors,4,4)
  ]);}catch{/* accept first pack if browser cannot inspect a remote URL */}
  const critiques={player:playerCritic,tiles:tileCritic,props:propCritic,actors:actorCritic};
  const failed=Object.entries(critiques).filter(([,v])=>v&&v.pass===false);
  if(failed.length){
    const repairFeedback=failed.map(([k,v])=>`${k}: ${(v.issues||[]).join('; ')} (score ${v.score})`).join(' | ');
    const retry=await requestPack({prompt,engine,style,imageDataUrl,visualAnalysis,characterBible,characterLock:characterBiblePrompt(characterBible),repairFeedback,regenerationPass:1});
    if(retry){data=retry;try{[playerCritic,tileCritic,propCritic,actorCritic]=await Promise.all([
      critiqueGridDataUrl(data.sheets?.player,4,4),critiqueGridDataUrl(data.sheets?.tiles,4,4),critiqueGridDataUrl(data.sheets?.props,4,4),critiqueGridDataUrl(data.sheets?.actors,4,4)
    ]);}catch{} }
  }
  const [player,tile,prop,actor]=await Promise.all([
    sliceGrid(data.sheets?.player,4,4,'aiPlayerFrame'),sliceGrid(data.sheets?.tiles,4,4,'aiTerrain'),sliceGrid(data.sheets?.props,4,4,'aiProp'),sliceGrid(data.sheets?.actors,4,4,'aiActor')
  ]);
  const assets={...player,...tile,...prop,...actor};if(data.background)assets.aiBackground=data.background;assets.player=player.aiPlayerFrame00||assets.player;
  return {
    assets,characterBible,
    animation:{player:{idle:['aiPlayerFrame00','aiPlayerFrame01'],run:['aiPlayerFrame02','aiPlayerFrame03','aiPlayerFrame04','aiPlayerFrame05'],jump:['aiPlayerFrame06','aiPlayerFrame07'],fall:['aiPlayerFrame08'],land:['aiPlayerFrame09','aiPlayerFrame10'],hurt:['aiPlayerFrame11','aiPlayerFrame12'],victory:['aiPlayerFrame13','aiPlayerFrame14','aiPlayerFrame15']}},
    keys:{terrain:Object.keys(tile),props:Object.keys(prop),actors:Object.keys(actor)},background:data.background,
    provenance:{...(data.provenance||{}),atlasCritic:{player:playerCritic,tiles:tileCritic,props:propCritic,actors:actorCritic},regenerationPass:data.regenerationPass||0}
  };
}
