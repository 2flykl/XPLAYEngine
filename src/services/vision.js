import { apiUrl } from '../core/ApiBase.js';

function offline(error='Semantic AI Vision unavailable.'){
  return {
    ok:false,
    provider:'offline',
    error,
    analysis:{
      player:'Semantic AI Vision unavailable',
      environment:'Semantic AI Vision unavailable',
      vehicles:'Semantic AI Vision unavailable',
      notableObjects:'Semantic AI Vision unavailable',
      dominantColors:'',
      strongOpportunities:'Genre not semantically confirmed',
      recommended_plx:[],
      qualityScore:0,
      qualityLabel:'offline'
    }
  };
}

export async function analyzeVisualSource(imageDataUrl,prompt=''){
  const endpoint=apiUrl('/api/vision/analyze');
  if(!endpoint)return offline('No XPLAY API endpoint configured.');
  try{
    const r=await fetch(endpoint,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({imageDataUrl,prompt})
    });
    const text=await r.text();
    let out={};
    try{out=JSON.parse(text);}catch{throw new Error(`Vision returned non-JSON: ${text.slice(0,240)}`);}
    if(!r.ok||!out?.ok)throw new Error(out?.detail||out?.error||`Vision HTTP ${r.status}`);
    return out;
  }catch(e){
    console.error('[XPLAY Vision]',e);
    return offline(e?.message||String(e));
  }
}

export async function visionHealth(){
  const endpoint=apiUrl('/api/vision/health');
  if(!endpoint)return{ok:false,provider:'offline',configured:false,error:'No live XPLAY API base configured.'};
  try{
    const r=await fetch(endpoint,{cache:'no-store'});
    const text=await r.text();
    try{return JSON.parse(text);}catch{return{ok:false,provider:'offline',configured:false,error:text.slice(0,240)}}
  }catch(e){return{ok:false,provider:'offline',configured:false,error:e.message}}
}
