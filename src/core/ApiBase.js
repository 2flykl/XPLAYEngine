const LIVE_API='https://xplay-api-246473132693.us-central1.run.app';

export function getApiBase(){
  const envBase=String(import.meta.env.VITE_XPLAY_API_BASE_URL||'').trim().replace(/\/+$/,'');
  if(envBase)return envBase;

  try{
    const saved=String(localStorage.getItem('xplay:api-base')||'').trim().replace(/\/+$/,'');
    if(saved)return saved;
  }catch{}

  if(location.hostname.endsWith('github.io'))return LIVE_API;
  return location.origin;
}

export function hasRemoteApi(){return !!getApiBase();}

export function apiUrl(path=''){
  const base=getApiBase();
  if(!base)return '';
  return `${base}${path.startsWith('/')?path:`/${path}`}`;
}
