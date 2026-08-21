const LIVE_XPLAY_API='https://xplay-api-246473132693.us-central1.run.app';

export function getApiBase(){
  const envBase=String(import.meta.env.VITE_XPLAY_API_BASE_URL||'').trim().replace(/\/+$/,'');
  if(envBase)return envBase;
  try{
    const stored=String(localStorage.getItem('xplay:api-base')||'').trim().replace(/\/+$/,'');
    if(stored)return stored;
  }catch{}
  if(typeof location!=='undefined' && location.hostname.endsWith('github.io')) return LIVE_XPLAY_API;
  if(typeof location!=='undefined' && /^https?:$/.test(location.protocol)) return location.origin;
  return LIVE_XPLAY_API;
}

export function hasRemoteApi(){return !!getApiBase();}

export function apiUrl(path=''){
  const base=getApiBase();
  if(!base)return '';
  const clean=String(path);
  return `${base}${clean.startsWith('/')?clean:`/${clean}`}`;
}
