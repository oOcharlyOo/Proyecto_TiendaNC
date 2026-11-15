import { ref } from 'vue';

/**
 * Rendimiento automático del POS.
 *  - 'auto' (por defecto): decide solo, midiendo el equipo.
 *      1) Señales fuertes de equipo muy limitado (<=2 GB de RAM, sin GPU, ahorro de datos,
 *         "reducir movimiento") -> modo ligero desde el inicio.
 *      2) Si no, arranca en modo completo y vigila los cuadros por segundo reales durante
 *         los primeros segundos de uso y tras cada cambio de pantalla; si el equipo no
 *         aguanta, pasa solo a modo ligero. Un equipo que sí aguanta se queda en completo.
 *      3) El resultado se recuerda unos días para no parpadear al volver a abrir; pasado
 *         ese tiempo se vuelve a medir (por si cambió de equipo o lo actualizaron).
 *  - 'lite' / 'full': lo fuerza el usuario desde el menú.
 */
export type ModoRendimiento = 'auto' | 'lite' | 'full';
const KEY = 'perfMode';
const KEY_AUTO = 'perfAuto';
const VIGENCIA_MS = 3 * 24 * 60 * 60 * 1000;

const FPS_LENTO = 30;        // por debajo de esto se considera lento
const VENTANA_MS = 3000;     // ventana de medición
const MONITOREO_MS = 25000;  // tiempo máximo de vigilancia tras el arranque / cambio de pantalla

function leer(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function guardar(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }

function leerModo(): ModoRendimiento {
  const v = leer(KEY);
  return v === 'lite' || v === 'full' ? v : 'auto';
}

function resultadoRecordado(): 'lite' | 'full' | null {
  const raw = leer(KEY_AUTO);
  if (!raw) return null;
  const [res, ts] = raw.split('|');
  if ((res !== 'lite' && res !== 'full') || Date.now() - Number(ts) > VIGENCIA_MS) return null;
  return res;
}

function sinGpu(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl') || c.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    return /swiftshader|llvmpipe|software|basic render/i.test(r);
  } catch { return false; }
}

function equipoMuyLimitado(): boolean {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (n.deviceMemory && n.deviceMemory <= 2) return true;
  if (n.connection?.saveData) return true;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  return sinGpu();
}

const modo = ref<ModoRendimiento>(leerModo());
const ligeroActivo = ref(false);
let medicion: number | null = null;

function pintar(lite: boolean) {
  ligeroActivo.value = lite;
  document.documentElement.classList.toggle('perf-lite', lite);
}

function detenerMedicion() {
  if (medicion !== null) { cancelAnimationFrame(medicion); medicion = null; }
}

/** Vigila los cuadros por segundo; si el equipo no aguanta, activa el modo ligero. */
function vigilar() {
  detenerMedicion();
  if (modo.value !== 'auto' || ligeroActivo.value) return;
  const inicio = performance.now();
  let ultimo = 0;
  let inicioVentana = 0;
  let cuadros = 0;

  const paso = (t: number) => {
    if (modo.value !== 'auto' || ligeroActivo.value) { medicion = null; return; }
    if (t - inicio > MONITOREO_MS) {
      guardar(KEY_AUTO, `full|${Date.now()}`); // aguantó todo el periodo: equipo capaz
      medicion = null;
      return;
    }
    // Pestaña oculta o pausa larga: no cuenta, se reinicia la ventana.
    if (document.hidden || (ultimo && t - ultimo > 1000)) {
      inicioVentana = 0;
      cuadros = 0;
    } else if (!inicioVentana) {
      inicioVentana = t;
      cuadros = 0;
    } else {
      cuadros++;
      if (t - inicioVentana >= VENTANA_MS) {
        const fps = (cuadros * 1000) / (t - inicioVentana);
        if (fps < FPS_LENTO) {
          guardar(KEY_AUTO, `lite|${Date.now()}`);
          pintar(true);
          medicion = null;
          return;
        }
        inicioVentana = t;
        cuadros = 0;
      }
    }
    ultimo = t;
    medicion = requestAnimationFrame(paso);
  };
  medicion = requestAnimationFrame(paso);
}

function aplicar() {
  detenerMedicion();
  if (modo.value === 'lite') { pintar(true); return; }
  if (modo.value === 'full') { pintar(false); return; }
  const recordado = resultadoRecordado();
  if (recordado === 'lite') { pintar(true); return; }
  if (equipoMuyLimitado()) { pintar(true); guardar(KEY_AUTO, `lite|${Date.now()}`); return; }
  pintar(false);
  if (recordado !== 'full') vigilar();
}

aplicar();

export function useRendimiento() {
  const setModo = (m: ModoRendimiento) => {
    modo.value = m;
    guardar(KEY, m);
    if (m === 'auto') { try { localStorage.removeItem(KEY_AUTO); } catch { /* sin almacenamiento */ } }
    aplicar();
  };
  const alternar = () => setModo(ligeroActivo.value ? 'full' : 'lite');
  /** Se llama al cambiar de pantalla: vuelve a vigilar si aún no hay veredicto de "equipo capaz". */
  const revigilar = () => {
    if (modo.value === 'auto' && !ligeroActivo.value && resultadoRecordado() !== 'full') vigilar();
  };
  return { modo, ligeroActivo, setModo, alternar, revigilar };
}
