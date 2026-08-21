import { apiUrl } from '../core/ApiBase.js';

export async function analyzeVisualSource(imageDataUrl,prompt=''){
  const endpoint=apiUrl('/api/vision/analyze');
  if(!endpoint) throw new Error('No XPLAY Vision API endpoint is configured.');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),60000);
  try{
    const r=await fetch(endpoint,{
      method:'POST',
      headers:{'content-type':'application/json'},
      signal:controller.signal,
      body:JSON.stringify({imageDataUrl,prompt})
    });
    const text=await r.text();
    let out;
    try{out=JSON.parse(text);}catch{throw new Error(`Vision returned non-JSON: ${text.slice(0,240)}`);}
    if(!r.ok||!out?.ok) throw new Error(out?.detail||out?.error||`Vision HTTP ${r.status}`);
    if(!out?.analysis) throw new Error('Gemini returned no structured analysis.');
    return out;
  }catch(e){
    if(e?.name==='AbortError') throw new Error('Gemini Vision timed out after 60 seconds.');
    throw e;
  }finally{
    clearTimeout(timeout);
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
