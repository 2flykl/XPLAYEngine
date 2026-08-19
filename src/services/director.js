import { localDirect } from '../core/LocalDirector.js';
import { apiUrl, hasRemoteApi } from '../core/ApiBase.js';

export async function directPLX({prompt,imageDataUrl,styleDNA,visualAnalysis,options={}}) {
  if (hasRemoteApi()) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(()=>controller.abort(), 12000);
      const r = await fetch(apiUrl('/api/direct'), {
        method:'POST',
        headers:{'content-type':'application/json'},
        signal:controller.signal,
        body:JSON.stringify({prompt,imageDataUrl,styleDNA,visualAnalysis,options})
      });
      clearTimeout(timer);
      if(r.ok){
        const data=await r.json();
        if(data?.spec) return {...data.spec,directorMode:'ai'};
      }
    } catch(e) {
      console.warn('XPLAY Director backend unavailable; using local director.', e);
    }
  }
  return localDirect(prompt,styleDNA,{...options,visualAnalysis});
}

export async function apiHealth() {
  if (!hasRemoteApi()) return {ok:false,aiConfigured:false,visionConfigured:false,imageModelConfigured:false,reason:'backend-unconfigured'};
  try {
    const r=await fetch(apiUrl('/api/health'));
    return await r.json();
  } catch {
    return {ok:false,aiConfigured:false,visionConfigured:false,imageModelConfigured:false};
  }
}
