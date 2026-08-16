const originalFetch = window.fetch;

const LOCAL_BASE = 'http://localhost:8080';
const REMOTE_BASE = 'https://api.laleyendadeldulce.com';
const CACHE_KEY = 'api_base_activo';
const PROBE_TIMEOUT = 1200;

let currentBase = '';

async function detectLocal(): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT);
  try {
    await originalFetch.call(window, LOCAL_BASE, { mode: 'cors', signal: ctrl.signal });
    return LOCAL_BASE;
  } catch {
    return REMOTE_BASE;
  } finally {
    clearTimeout(timer);
  }
}

function guardarCache(base: string) {
  try {
    localStorage.setItem(CACHE_KEY, base);
  } catch {
    // localStorage no disponible: se ignora
  }
}

function leerCache(): string {
  try {
    const v = localStorage.getItem(CACHE_KEY);
    if (v === LOCAL_BASE || v === REMOTE_BASE) return v;
  } catch {
    // localStorage no disponible: se ignora
  }
  return '';
}

async function reProbe() {
  const detected = await detectLocal();
  if (detected !== currentBase) {
    currentBase = detected;
    guardarCache(detected);
  }
}

const pendingBase = (async () => {
  const cached = leerCache();
  if (cached) {
    currentBase = cached;
    setTimeout(() => void reProbe(), 0);
    return cached;
  }
  currentBase = await detectLocal();
  guardarCache(currentBase);
  return currentBase;
})();

window.fetch = async function (url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const sucursal = localStorage.getItem('sucursalActiva');

  const base = await pendingBase;

  // Normalizar la URL al backend activo (local primero, remoto como fallback)
  let urlStr = typeof url === 'string' ? url : url.toString();
  urlStr = urlStr.replace(LOCAL_BASE, base).replace(REMOTE_BASE, base);

  // Para FormData, no tocar headers (el navegador debe auto-generar Content-Type con boundary)
  // Pasar sucursal como query param en su lugar
  if (init?.body instanceof FormData && sucursal) {
    const separator = urlStr.includes('?') ? '&' : '?';
    urlStr += `${separator}sucursal=${encodeURIComponent(sucursal)}`;
    try {
      return await originalFetch.call(window, urlStr, init);
    } catch (e) {
      if (base === LOCAL_BASE) return fallbackRemoto(urlStr.replace(LOCAL_BASE, REMOTE_BASE), init);
      throw e;
    }
  }

  const headers = new Headers(init?.headers || {});
  if (sucursal) {
    headers.set('X-Sucursal', sucursal);
  }

  try {
    return await originalFetch.call(window, urlStr, { ...init, headers });
  } catch (e) {
    if (base === LOCAL_BASE) return fallbackRemoto(urlStr.replace(LOCAL_BASE, REMOTE_BASE), { ...init, headers });
    throw e;
  }
};

async function fallbackRemoto(url: string, init?: RequestInit): Promise<Response> {
  const res = await originalFetch.call(window, url, init);
  currentBase = REMOTE_BASE;
  guardarCache(REMOTE_BASE);
  return res;
}

export {};
