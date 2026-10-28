import { ref, computed } from 'vue';
import { useSucursal } from './useSucursal';

/**
 * Apariencia de la sucursal activa (wizard de arranque del proyecto
 * generico). El servidor guarda { temaBase, acento, fondo, nombre } por
 * rama; aqui se carga y se aplica sobre <html> con propiedades CSS inline,
 * que ganan a las reglas [data-theme=...] y, gracias al puente de tokens de
 * themes.css, repintan toda la app.
 *
 * Con temaBase='custom' el usuario elige el color de fondo en hexadecimal
 * (igual que el acento) y de ahi se derivan los demas tonos de superficie.
 */
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

export type AparienciaConfig = {
  temaBase: string | null;
  acento: string | null;
  fondo: string | null;
  sucursalNombre: string;
  setupPendiente: boolean;
};

const config = ref<AparienciaConfig | null>(null);
const cargada = ref(false);

function hexANum(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Mezcla un hex hacia blanco (haciaBlanco=true) o negro (false). */
function mezclar(hex: string, haciaBlanco: boolean, factor: number): string {
  const [r, g, b] = hexANum(hex);
  const t = haciaBlanco ? 255 : 0;
  const m = (c: number) => Math.round(c + (t - c) * factor);
  return '#' + [m(r), m(g), m(b)].map(c => c.toString(16).padStart(2, '0')).join('');
}

const VARIABLES_ACENTO = [
  '--accent-color',
  '--accent-hover',
  '--gradient-btn-start',
  '--gradient-btn-mid',
  '--gradient-btn-end',
];

const VARIABLES_FONDO = [
  '--bg-primary',
  '--bg-secondary',
  '--bg-panel',
  '--border-color',
  '--gradient-bg-start',
  '--gradient-bg-mid',
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function usarApariencia() {
  const { getHeader } = useSucursal();

  /**
   * Aplica tema base, fondo propio y acento. forzarTema se usa en la vista
   * previa del wizard (ignora la eleccion local del carrusel).
   */
  function aplicarValores(
    temaBase: string | null,
    acento: string | null,
    fondo: string | null = null,
    forzarTema = false
  ) {
    const root = document.documentElement;

    // Tema preset (custom NO cambia el atributo: las variables inline pintan todo)
    if (temaBase && temaBase !== 'custom' && (forzarTema || !localStorage.getItem('theme'))) {
      root.setAttribute('data-theme', temaBase);
    }

    // Fondo propio: el hex elegido + tonos derivados (mas claros para
    // paneles/bordes y mas oscuro para el fondo del degradado del body).
    if (fondo && HEX_RE.test(fondo)) {
      root.style.setProperty('--bg-primary', fondo);
      root.style.setProperty('--bg-secondary', mezclar(fondo, true, 0.10));
      root.style.setProperty('--bg-panel', mezclar(fondo, true, 0.20));
      root.style.setProperty('--border-color', mezclar(fondo, true, 0.30));
      root.style.setProperty('--gradient-bg-start', mezclar(fondo, true, 0.08));
      root.style.setProperty('--gradient-bg-mid', mezclar(fondo, false, 0.25));
    } else {
      VARIABLES_FONDO.forEach(v => root.style.removeProperty(v));
    }

    if (acento && HEX_RE.test(acento)) {
      root.style.setProperty('--accent-color', acento);
      root.style.setProperty('--accent-hover', mezclar(acento, true, 0.18));
      root.style.setProperty('--gradient-btn-start', mezclar(acento, true, 0.22));
      root.style.setProperty('--gradient-btn-mid', acento);
      root.style.setProperty('--gradient-btn-end', mezclar(acento, false, 0.28));
    } else {
      VARIABLES_ACENTO.forEach(v => root.style.removeProperty(v));
    }
  }

  function aplicar(forzarTema = false) {
    if (config.value) {
      aplicarValores(config.value.temaBase, config.value.acento, config.value.fondo, forzarTema);
    }
  }

  async function cargar() {
    try {
      const res = await fetch(`${API_BASE}/config/apariencia`, { headers: getHeader() });
      const data = await res.json();
      if (data?.codigo === 200 && data.datos) {
        config.value = data.datos as AparienciaConfig;
        aplicar();
      }
    } catch {
      // sin servidor de config: se queda el tema local
    } finally {
      cargada.value = true;
    }
  }

  /** Devuelve { ok, mensaje } para que el wizard muestre errores reales. */
  async function guardar(datos: {
    nombre?: string;
    temaBase?: string;
    acento?: string;
    fondo?: string;
  }): Promise<{ ok: boolean; mensaje?: string }> {
    const idUsuarioRaw = localStorage.getItem('idUsuario');
    const idUsuario = idUsuarioRaw && Number(idUsuarioRaw) > 0 ? Number(idUsuarioRaw) : undefined;
    try {
      const res = await fetch(`${API_BASE}/config/apariencia`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getHeader() },
        body: JSON.stringify({ ...datos, idUsuario }),
      });
      const data = await res.json();
      if (data?.codigo === 200) {
        config.value = data.datos as AparienciaConfig;
        aplicar();
        return { ok: true };
      }
      return { ok: false, mensaje: data?.mensaje || 'No se pudo guardar.' };
    } catch {
      return { ok: false, mensaje: 'Error de conexion.' };
    }
  }

  const nombreNegocio = computed(
    () => config.value?.sucursalNombre || localStorage.getItem('sucursalNombre') || 'Mi Negocio POS'
  );

  return { config, cargada, cargar, aplicar, aplicarValores, guardar, nombreNegocio };
}
