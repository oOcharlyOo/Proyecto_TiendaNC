const originalFetch = window.fetch;

const LOCAL_BASE = 'http://localhost:8080';
const REMOTE_BASE = 'https://api.laleyendadeldulce.com';
const CACHE_KEY = 'api_base_activo';
const PROBE_TIMEOUT = 1200;
const REPROBE_INTERVAL = 30000;
const RELOAD_FLAG_KEY = 'api_base_reload_for';
const BACKEND_DATA_KEYS = ['productos_cache', 'productos_cache_timestamp', 'montoInicialCaja', 'rental_estaciones'];

let currentBase = '';
let baseAlCargar = '';

async function detectLocal(): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT);
  try {
    await originalFetch.call(window, LOCAL_BASE, { mode: 'no-cors', signal: ctrl.signal });
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

function limpiarDatosBackend() {
  try {
    for (const key of BACKEND_DATA_KEYS) localStorage.removeItem(key);
  } catch {
    // localStorage no disponible: se ignora
  }
}

function cambiarBase(nueva: string) {
  if (nueva === currentBase) return;
  currentBase = nueva;
  guardarCache(nueva);
  if (!baseAlCargar || nueva === baseAlCargar) return;
  let yaRecargado = '';
  try {
    yaRecargado = sessionStorage.getItem(RELOAD_FLAG_KEY) || '';
  } catch {
    yaRecargado = '';
  }
  if (yaRecargado === nueva) return;
  limpiarDatosBackend();
  try {
    sessionStorage.setItem(RELOAD_FLAG_KEY, nueva);
  } catch {
    // sessionStorage no disponible: se ignora
  }
  window.location.reload();
}

async function reProbe() {
  cambiarBase(await detectLocal());
}

const pendingBase = (async () => {
  const cached = leerCache();
  if (cached) {
    currentBase = cached;
    baseAlCargar = cached;
    void reProbe();
    return cached;
  }
  currentBase = await detectLocal();
  baseAlCargar = currentBase;
  guardarCache(currentBase);
  return currentBase;
})();

setInterval(() => void reProbe(), REPROBE_INTERVAL);

async function baseActiva(): Promise<string> {
  await pendingBase;
  return currentBase;
}

window.fetch = async function (url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const sucursal = localStorage.getItem('sucursalActiva');

  const base = await baseActiva();

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
  cambiarBase(REMOTE_BASE);
  return res;
}

export {};
