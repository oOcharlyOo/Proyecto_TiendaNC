import { ref, computed } from 'vue';
import { useSucursal } from './useSucursal';
import { useTheme, type Theme } from './useTheme';

/**
 * Apariencia de la sucursal activa (wizard de arranque del proyecto
 * generico). El servidor guarda { temaBase, acento, fondo, nombre } por
 * rama; aqui se carga y se aplica sobre <html> con propiedades CSS inline,
 * que ganan a las reglas [data-theme=...] y, gracias al puente de tokens de
 * themes.css, repintan toda la app.
 *
 * Con temaBase='custom' el usuario elige el color de fondo en hexadecimal
 * (igual que el acento). De ese fondo se derivan TODOS los demas tonos —
 * superficies, bordes, graficos y tambien el COLOR DE TEXTO— segun su
 * luminancia: con un fondo claro (blanco, crema…) h1/h2/p/inputs pasan a
 * texto oscuro automaticamente para que nunca se pierda el contraste.
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

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function hexANum(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Mezcla un hex hacia blanco (true) o negro (false). */
function mezclar(hex: string, haciaBlanco: boolean, factor: number): string {
  const [r, g, b] = hexANum(hex);
  const t = haciaBlanco ? 255 : 0;
  const m = (c: number) => Math.round(c + (t - c) * factor);
  return '#' + [m(r), m(g), m(b)].map(c => c.toString(16).padStart(2, '0')).join('');
}

/** Luminancia perceptual 0-255 (pesos ITU-R BT.601). */
function luminancia(hex: string): number {
  const [r, g, b] = hexANum(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Luminancia relativa WCAG (0-1). */
function luminanciaRel(hex: string): number {
  const [r, g, b] = hexANum(hex).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG entre dos colores hex. */
function ratioContraste(a: string, b: string): number {
  const l1 = luminanciaRel(a);
  const l2 = luminanciaRel(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Ajusta un color (aclarando u oscureciendo) hasta que cumpla el minimo de
 * contraste contra cada fondo. Devuelve la variante que menos se aleja del
 * color original; si ninguno cumple, la que mas se acerca.
 */
function ajustarContraste(color: string, fondos: { hex: string; min: number }[]): string {
  const cumple = (c: string) => fondos.every(f => ratioContraste(c, f.hex) >= f.min);
  if (cumple(color)) return color;
  let mejor = color;
  let mejorDelta = -Infinity;
  for (const haciaBlanco of [true, false]) {
    for (let i = 1; i <= 24; i++) {
      const cand = mezclar(color, haciaBlanco, i / 24);
      if (cumple(cand)) return cand;
      const delta = Math.min(...fondos.map(f => ratioContraste(cand, f.hex) - f.min));
      if (delta > mejorDelta) {
        mejorDelta = delta;
        mejor = cand;
      }
    }
  }
  return mejor;
}

/** Tinta (oscura o blanca) que mejor contrasta sobre los rellenos dados. */
function etiquetaSobre(fondos: string[]): string {
  const tinta = '#0b1220';
  const blanco = '#ffffff';
  const peor = (c: string) => Math.min(...fondos.map(f => ratioContraste(c, f)));
  return peor(blanco) >= peor(tinta) ? blanco : tinta;
}

/** Umbral: por encima, el fondo se considera CLARO. */
const UMBRAL_CLARO = 140;

function rgba(hex: string, alfa: number): string {
  const [r, g, b] = hexANum(hex);
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}

const VARIABLES_ACENTO = [
  '--accent-color',
  '--accent-hover',
  '--gradient-btn-start',
  '--gradient-btn-mid',
  '--gradient-btn-end',
];

/**
 * Tokens del puente (themes.css) que se recalculan al final para garantizar
 * contraste: los que se usan como TEXTO/icono sobre las superficies y los que
 * definen la tinta de los botones rellenos. Los degradados de boton se
 * calculan aparte con el acento crudo, por eso conservan el color de marca.
 */
const VARIABLES_CONTRASTE = [
  '--color-accent',
  '--color-success',
  '--color-error',
  '--color-info',
  '--color-warning',
  '--color-on-brand',
  '--btn-text',
  '--success-fill',
  '--success-fill-hover',
  '--error-fill',
  '--error-fill-hover',
  '--warning-fill',
  '--warning-fill-hover',
  '--info-fill',
  '--info-fill-hover',
  '--on-success',
  '--on-error',
  '--on-info',
  '--on-warning',
  '--text-secondary',
];

/** Todo lo que depende del fondo (superficies, bordes, textos y graficos). */
const VARIABLES_FONDO = [
  '--bg-primary',
  '--bg-secondary',
  '--bg-panel',
  '--border-color',
  '--gradient-bg-start',
  '--gradient-bg-mid',
  '--gradient-panel-start',
  '--gradient-panel-end',
  '--text-primary',
  '--text-secondary',
  '--chart-bg',
  '--chart-text',
  '--chart-border',
  '--chart-border-light',
  '--chart-item-bg',
  '--shadow-color',
];

/**
 * Paleta semantica basica (verde/rojo/amarillo/azul), independiente del
 * acento de la marca. Cada estado tiene:
 *  - fill: relleno vivo para botones, precios y badges.
 *  - on:   tinta que cumple 4.5:1 sobre ese relleno.
 *  - text: variante legible como texto/icono sobre las superficies.
 * Los tonos cambian entre claro y oscuro segun el fondo principal.
 */
type EstadoSemantico = {
  /** Token legacy que se conserva como relleno estable (--success-color...). */
  token: string;
  /** Relleno adaptativo (claro/oscuro). */
  fill: string;
  fillHover: string;
  /** Variante para texto e iconos. */
  texto: string;
  /** Tinta sobre el relleno. */
  tinta: string;
  /** Tono base del que se deriva la variante de texto. */
  base: string;
  fillClaro: string;
  fillOscuro: string;
  tintaClara: string;
  tintaOscura: string;
};

const ESTADOS: EstadoSemantico[] = [
  {
    token: '--success-color',
    fill: '--success-fill',
    fillHover: '--success-fill-hover',
    texto: '--color-success',
    tinta: '--on-success',
    base: '#16a34a',
    fillClaro: '#15803d',
    fillOscuro: '#22c55e',
    tintaClara: '#ffffff',
    tintaOscura: '#052e16',
  },
  {
    token: '--error-color',
    fill: '--error-fill',
    fillHover: '--error-fill-hover',
    texto: '--color-error',
    tinta: '--on-error',
    base: '#dc2626',
    fillClaro: '#b91c1c',
    fillOscuro: '#f87171',
    tintaClara: '#ffffff',
    tintaOscura: '#450a0a',
  },
  {
    token: '--warning-color',
    fill: '--warning-fill',
    fillHover: '--warning-fill-hover',
    texto: '--color-warning',
    tinta: '--on-warning',
    base: '#eab308',
    fillClaro: '#eab308',
    fillOscuro: '#facc15',
    tintaClara: '#1c1917',
    tintaOscura: '#422006',
  },
  {
    token: '--info-color',
    fill: '--info-fill',
    fillHover: '--info-fill-hover',
    texto: '--color-info',
    tinta: '--on-info',
    base: '#3b82f6',
    fillClaro: '#1d4ed8',
    fillOscuro: '#60a5fa',
    tintaClara: '#ffffff',
    tintaOscura: '#082f49',
  },
];

/**
 * Recalcula los tokens del puente a partir de lo que el tema dejo en <html>.
 * Debe llamarse DESPUES de fijar atributo de tema y variables de fondo/acento.
 */
function normalizarContraste(root: HTMLElement) {
  const cs = getComputedStyle(root);
  const val = (n: string) => cs.getPropertyValue(n).trim();
  const hex = (v: string) => (HEX_RE.test(v) ? v : null);
  const bgP = hex(val('--bg-primary'));
  const bgPanel = hex(val('--bg-panel')) || bgP;
  if (!bgP || !bgPanel) return;
  const bgSec = hex(val('--bg-secondary')) || bgPanel;
  const claro = luminancia(bgP) > UMBRAL_CLARO;

  // Base de los tintes de badges/chips: panel casi blanco en temas claros y
  // la superficie mas oscura en temas oscuros (si se usa el panel, el tinte
  // aclara el fondo y el texto claro pierde contraste).
  root.style.setProperty('--badge-bg', claro ? bgPanel : bgP);

  // Texto/iconos: margen de 6.0 sobre las superficies para que tambien se
  // lean cuando el mismo tono se usa como tinte de fondo (badges, chips).
  const fondosTexto = [
    { hex: bgP, min: 6.0 },
    { hex: bgSec, min: 6.0 },
    { hex: bgPanel, min: 6.0 },
  ];

  // Acento: el mismo tono pero aclarado/oscurecido lo justo para que se lea
  // como texto y como icono. No se mezcla con su propio tinte para no
  // deslavar el color (era lo que volvia gris el acento en fondos claros).
  const acentoRaw = hex(val('--accent-color'));
  const acento = acentoRaw ? ajustarContraste(acentoRaw, fondosTexto) : null;
  if (acento) {
    root.style.setProperty('--accent-color', acento);
    root.style.setProperty('--color-accent', acento);
  }

  // Botones de marca: se conserva el acento VIVO y se elige la tinta que
  // contraste (oscura sobre ambar/lima, clara sobre azul/violeta). Antes en
  // temas claros se oscurecia el relleno para forzar tinta blanca, y eso
  // apagaba los botones de acento (se veian marrones).
  if (acentoRaw && acento) {
    let inicio: string;
    let medio: string;
    let finSt: string;

    medio = acentoRaw;
    inicio = mezclar(acentoRaw, true, 0.10);
    finSt = mezclar(acentoRaw, false, 0.12);

    let tinta = etiquetaSobre([inicio, medio, finSt]);
    // Red de seguridad: cada parada debe cumplir contra la tinta elegida
    inicio = ajustarContraste(inicio, [{ hex: tinta, min: 4.5 }]);
    medio = ajustarContraste(medio, [{ hex: tinta, min: 4.5 }]);
    finSt = ajustarContraste(finSt, [{ hex: tinta, min: 4.5 }]);
    tinta = etiquetaSobre([inicio, medio, finSt]);

    root.style.setProperty('--gradient-btn-start', inicio);
    root.style.setProperty('--gradient-btn-mid', medio);
    root.style.setProperty('--gradient-btn-end', finSt);
    // Relleno de acento para botones/chips: el acento VIVO (no la variante
    // oscurecida que se usa como texto). La tinta --color-on-brand ya esta
    // calculada contra este mismo relleno.
    root.style.setProperty('--accent-fill', medio);
    root.style.setProperty('--accent-hover', inicio);
    root.style.setProperty('--btn-text', tinta);
    root.style.setProperty('--color-on-brand', tinta);
  }

  // Estados semanticos: verde exito, rojo error, amarillo advertencia y azul
  // informacion. El relleno es vivo (cambia entre claro y oscuro) y la tinta
  // se elige para cumplir 4.5:1; el texto usa una variante legible aparte.
  for (const e of ESTADOS) {
    const relleno = claro ? e.fillClaro : e.fillOscuro;
    let tinta = claro ? e.tintaClara : e.tintaOscura;
    // Red de seguridad: si la tinta elegida no alcanza 4.5, se corrige.
    if (ratioContraste(relleno, tinta) < 4.5) {
      tinta = etiquetaSobre([relleno]);
    }
    const texto = ajustarContraste(e.base, fondosTexto);
    const hover = mezclar(relleno, !claro, 0.12);

    root.style.setProperty(e.fill, relleno);
    root.style.setProperty(e.fillHover, hover);
    root.style.setProperty(e.tinta, tinta);
    root.style.setProperty(e.texto, texto);
    // Token legacy: success/error se usan como relleno estable con tinta
    // blanca en botones antiguos; warning/info se usan como texto.
    const legacy = e.token === '--success-color' || e.token === '--error-color' ? relleno : texto;
    root.style.setProperty(e.token, legacy);
  }
  // Texto secundario: legible sobre panel y sobre la pagina
  const secundario = hex(val('--text-secondary'));
  if (secundario) {
    root.style.setProperty(
      '--text-secondary',
      ajustarContraste(secundario, [
        { hex: bgPanel, min: 5.0 },
        { hex: bgSec, min: 5.0 },
        { hex: bgP, min: 5.0 },
      ])
    );
  }
}

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

    // Limpia los ajustes de contraste del render anterior antes de recalcular
    VARIABLES_CONTRASTE.forEach(v => root.style.removeProperty(v));

    // Tema preset. La apariencia guardada en el servidor manda una vez que
    // hay sesion: en el login se respeta la eleccion local del visitante.
    // Antes se omitia cuando existia localStorage.theme, y por eso al pulsar
    // F5 reaparecia el ultimo tema local en vez del asignado.
    const autenticado = localStorage.getItem('isAuth') === 'true';
    const temaLocal = localStorage.getItem('theme');
    const { setTheme } = useTheme();
    if (temaBase && temaBase !== 'custom' && (forzarTema || autenticado || !temaLocal)) {
      setTheme(temaBase as Theme);
    } else if (temaBase === 'custom') {
      // El puente de tokens (--color-*) solo existe para los presets: si no
      // hay un data-theme valido, se usa classic como base.
      const actual = root.getAttribute('data-theme');
      if (!actual || !['classic', 'modern', 'ocean', 'forest'].includes(actual)) {
        setTheme('classic');
      }
    }

    // Fondo propio: superficies, bordes, graficos Y textos derivados de su
    // luminancia, para que nunca queden letras claras sobre fondo claro.
    if (fondo && HEX_RE.test(fondo)) {
      const claro = luminancia(fondo) > UMBRAL_CLARO;
      // Elevacion: en ambos modos las superficies se acercan al blanco. En
      // temas claros esto deja tarjetas casi blancas sobre el fondo (en vez
      // de grises cada vez mas oscuros, que apagaban acentos y estados).
      const superficie = (f: number) => mezclar(fondo, true, f);
      const borde = (f: number) => mezclar(fondo, claro ? false : true, f);

      root.style.setProperty('--bg-primary', fondo);
      root.style.setProperty('--bg-secondary', superficie(claro ? 0.45 : 0.08));
      root.style.setProperty('--bg-panel', superficie(claro ? 0.85 : 0.14));
      root.style.setProperty('--border-color', borde(0.20));
      root.style.setProperty('--gradient-bg-start', superficie(claro ? 0.10 : 0.06));
      root.style.setProperty('--gradient-bg-mid', claro ? mezclar(fondo, false, 0.06) : mezclar(fondo, false, 0.25));
      root.style.setProperty('--gradient-panel-start', superficie(claro ? 0.95 : 0.22));
      root.style.setProperty('--gradient-panel-end', superficie(claro ? 0.60 : 0.10));

      if (claro) {
        // Fondo claro -> texto oscuro en h1..h4, p, body, inputs.
        root.style.setProperty('--text-primary', '#0f172a');
        root.style.setProperty('--text-secondary', '#475569');
        root.style.setProperty('--chart-text', '#0f172a');
        root.style.setProperty('--shadow-color', 'rgba(15, 23, 42, 0.12)');
      } else {
        root.style.setProperty('--text-primary', '#f1f5f9');
        root.style.setProperty('--text-secondary', '#a9b6c7');
        root.style.setProperty('--chart-text', '#f1f5f9');
        root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)');
      }
      root.style.setProperty('--chart-bg', fondo);
      root.style.setProperty('--chart-border', borde(0.25));
      root.style.setProperty('--chart-border-light', borde(0.15));
      root.style.setProperty('--chart-item-bg', rgba(acento && HEX_RE.test(acento) ? acento : '#64748b', 0.12));
      // Controles nativos (selects, date pickers, autofill, scrollbars) acordes al fondo
      root.style.colorScheme = claro ? 'light' : 'dark';
    } else {
      VARIABLES_FONDO.forEach(v => root.style.removeProperty(v));
      root.style.removeProperty('color-scheme');
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

    // Ultimo paso: deriva tokens legibles (texto, iconos y tinta de botones)
    // a partir de lo que acaba de quedar en <html>.
    normalizarContraste(root);
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
