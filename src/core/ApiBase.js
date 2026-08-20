export function getApiBase(){const e=String(import.meta.env.VITE_XPLAY_API_BASE_URL||'').trim().replace(/\/+$/,'');if(e)return e;try{const s=String(localStorage.getItem('xplay:api-base')||'').trim().replace(/\/+$/,'');if(s)return s;}catch{}if(location.hostname.endsWith('github.io'))return '';return location.origin;}
export function hasRemoteApi(){return !!getApiBase();}
export function apiUrl(path=''){const b=getApiBase();if(!b)return '';return `${b}${path.startsWith('/')?path:`/${path}`}`;}
