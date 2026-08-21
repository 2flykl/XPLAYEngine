<<<<<<< HEAD
const LIVE_XPLAY_API='https://xplay-api-246473132693.us-central1.run.app';
export function getApiBase(){
  const envBase=String(import.meta.env.VITE_XPLAY_API_BASE_URL||'').trim().replace(/\/+$/,'');
  if(envBase)return envBase;
  try{
    const stored=String(localStorage.getItem('xplay:api-base')||'').trim().replace(/\/+$/,'');
    if(stored)return stored;
  }catch{}
  if(typeof location!=='undefined'&&location.hostname.endsWith('github.io'))return LIVE_XPLAY_API;
  return typeof location!=='undefined'?location.origin:LIVE_XPLAY_API;
}
export function hasRemoteApi(){return !!getApiBase();}
export function apiUrl(path=''){
  const base=getApiBase();
  if(!base)return '';
  return `${base}${String(path).startsWith('/')?path:`/${path}`}`;
=======
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
>>>>>>> c89deb214dd68a5bd1006547e6fe6f66f18f054f
}
