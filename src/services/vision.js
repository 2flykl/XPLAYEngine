import { apiUrl, hasRemoteApi } from '../core/ApiBase.js';

export async function analyzeVisualSource({imageDataUrl,prompt='',subjectHint='person'}) {
  if (!hasRemoteApi()) {
    return {
      ok:false,
      error:'No XPLAY backend configured for this GitHub Pages build.',
      analysis:{
        qualityScore:0,
        qualityLabel:'backend-required',
        warnings:['Semantic screenshot analysis requires VITE_XPLAY_API_BASE_URL or a configured XPLAY backend.']
      },
      assets:{}
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), 12000);
    const r = await fetch(apiUrl('/api/vision/analyze'), {
      method:'POST',
      headers:{'content-type':'application/json'},
      signal:controller.signal,
      body:JSON.stringify({imageDataUrl,prompt,subjectHint})
    });
    clearTimeout(timer);
    if(!r.ok) throw new Error(await r.text());
    return await r.json();
  } catch(error) {
    return {
      ok:false,
      error:error.message,
      analysis:{
        qualityScore:0,
        qualityLabel:'offline',
        warnings:['Semantic Visual Intelligence backend is unavailable.']
      },
      assets:{}
    };
  }
}

export async function visionHealth() {
  if (!hasRemoteApi()) return {ok:false,provider:'unconfigured'};
  try {
    const r=await fetch(apiUrl('/api/vision/health'));
    return await r.json();
  } catch {
    return {ok:false,provider:'offline'};
  }
}
