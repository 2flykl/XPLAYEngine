import { localDirect } from '../core/LocalDirector.js';
export async function directPLX({prompt,imageDataUrl,styleDNA,visualAnalysis,options={}}){
 try{
  const r=await fetch('/api/direct',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt,imageDataUrl,styleDNA,visualAnalysis,options})});
  if(r.ok){const data=await r.json();if(data?.spec)return {...data.spec,directorMode:'ai'};}
 }catch(e){}
 return localDirect(prompt,styleDNA,options);
}
export async function apiHealth(){try{const r=await fetch('/api/health');return await r.json();}catch(e){return {ok:false,aiConfigured:false,visionConfigured:false,imageModelConfigured:false};}}
