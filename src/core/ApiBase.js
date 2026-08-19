const normalize = (v='') => String(v || '').trim().replace(/\/+$/,'');

export function getApiBase() {
  const env = normalize(import.meta.env.VITE_XPLAY_API_BASE_URL);
  if (env) return env;

  try {
    const saved = normalize(localStorage.getItem('xplay:api-base'));
    if (saved) return saved;
  } catch {}

  // On a non-static deployment, same-origin API is valid.
  if (!location.hostname.endsWith('github.io')) return '';

  // GitHub Pages has no server-side /api route.
  return '';
}

export function apiUrl(path='') {
  const base = getApiBase();
  const p = String(path || '').startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export function hasRemoteApi() {
  return !!getApiBase() || !location.hostname.endsWith('github.io');
}
