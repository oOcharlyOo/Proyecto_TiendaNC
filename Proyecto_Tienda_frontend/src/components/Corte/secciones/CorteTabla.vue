<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

/**
 * Tabla de detalle de los reportes del Corte.
 * - Escritorio: tabla con encabezado fijo y scroll propio.
 * - Celular (<= 640px): cada fila es una tarjeta (la 1ª columna es el título y el resto
 *   lleva su etiqueta), sin scroll horizontal.
 */
export type Columna = {
  key: string;
  label: string;
  tipo?: 'texto' | 'moneda' | 'numero' | 'pct' | 'margen' | 'variacion';
  align?: 'left' | 'right' | 'center';
  /** Color fijo para la celda: 'ok' | 'costo' | 'info'. */
  tono?: 'ok' | 'costo' | 'info';
  /** Texto pequeño debajo del valor (por ejemplo, el rango de días). */
  subKey?: string;
};

const props = withDefaults(defineProps<{
  columnas: Columna[];
  filas: Record<string, any>[];
  pie?: Record<string, any> | null;
  limite?: number;
  /** Límite inicial solo en celular (si no se indica, usa `limite`). */
  limiteMovil?: number;
  vacio?: string;
  formatoMoneda: (v: number) => string;
  maxAltoDesktop?: string;
}>(), { pie: null, limite: 0, limiteMovil: 0, vacio: 'Sin datos para este periodo.', maxAltoDesktop: '26rem' });

const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
const esMovil = ref(!!mq?.matches);
const alCambiar = (e: MediaQueryListEvent) => { esMovil.value = e.matches; };
mq?.addEventListener('change', alCambiar);
onBeforeUnmount(() => mq?.removeEventListener('change', alCambiar));
const tope = computed(() => (esMovil.value && props.limiteMovil > 0 ? props.limiteMovil : props.limite));

const expandida = ref(false);
watch(() => props.filas, () => { expandida.value = false; });
const visibles = computed(() => (tope.value > 0 && !expandida.value ? props.filas.slice(0, tope.value) : props.filas));
const restantes = computed(() => props.filas.length - visibles.value.length);

function texto(col: Columna, fila: Record<string, any>): string {
  const v = fila[col.key];
  if (v === null || v === undefined || v === '') return '—';
  switch (col.tipo) {
    case 'moneda': return props.formatoMoneda(Number(v));
    case 'numero': return Number(v).toLocaleString('es-MX');
    case 'pct':
    case 'margen': return `${Number(v).toFixed(1)}%`;
    case 'variacion': { const x = Number(v); return `${x > 0 ? '▲ +' : x < 0 ? '▼ ' : ''}${x.toFixed(1)}%`; }
    default: return String(v);
  }
}

function clase(col: Columna, fila: Record<string, any>): string[] {
  const c: string[] = [];
  const v = Number(fila[col.key]);
  if (col.tono) c.push(`t-${col.tono}`);
  if (col.tipo === 'margen' && Number.isFinite(v)) c.push(v >= 30 ? 't-ok' : v > 0 ? 't-warn' : 't-costo');
  if (col.tipo === 'variacion' && fila[col.key] != null) c.push(v > 0 ? 't-ok' : v < 0 ? 't-costo' : 't-muted');
  if (col.tipo && col.tipo !== 'texto') c.push('num');
  return c;
}
const alineacion = (col: Columna) => col.align || (col.tipo && col.tipo !== 'texto' ? 'right' : 'left');
</script>

<template>
  <div class="ct">
    <p v-if="!filas.length" class="ct-vacio">{{ vacio }}</p>
    <template v-else>
      <div class="ct-scroll" :style="{ maxHeight: maxAltoDesktop }">
        <table class="ct-tabla">
          <thead>
            <tr>
              <th v-for="col in columnas" :key="col.key" :style="{ textAlign: alineacion(col) }">{{ col.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(fila, i) in visibles" :key="i">
              <td
                v-for="(col, ci) in columnas" :key="col.key"
                :data-label="ci === 0 ? undefined : col.label"
                :class="[ci === 0 ? 'ct-titulo' : '', ...clase(col, fila)]"
                :style="{ textAlign: alineacion(col) }"
              >
                <span class="ct-valor">{{ texto(col, fila) }}</span>
                <small v-if="col.subKey && fila[col.subKey]" class="ct-sub">{{ fila[col.subKey] }}</small>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="pie">
            <tr>
              <td
                v-for="(col, ci) in columnas" :key="col.key"
                :data-label="ci === 0 ? undefined : col.label"
                :class="[ci === 0 ? 'ct-titulo' : '', ...clase(col, pie)]"
                :style="{ textAlign: alineacion(col) }"
              >
                <span class="ct-valor">{{ ci === 0 ? (pie[col.key] ?? 'Total') : texto(col, pie) }}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button v-if="tope > 0 && filas.length > tope" type="button" class="ct-mas" @click="expandida = !expandida">
        {{ expandida ? 'Ver menos' : `Ver más (${restantes} restantes)` }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.ct { min-width: 0; }
.ct-vacio { margin: 0.5rem 0; text-align: center; font-size: 0.85rem; color: var(--color-text-secondary); }

.ct-scroll { overflow: auto; border-radius: 10px; background: color-mix(in srgb, var(--color-bg-primary) 55%, transparent); overscroll-behavior: contain; }
.ct-tabla { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.ct-tabla th {
  position: sticky; top: 0; z-index: 2; padding: 0.55rem 0.75rem; background: var(--color-bg-secondary);
  color: var(--color-text-secondary); font-size: 0.66rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.05em; white-space: nowrap; box-shadow: 0 1px 0 var(--color-border);
}
.ct-tabla td { padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(255, 255, 255, 0.04); color: var(--color-text-primary); vertical-align: middle; }
.ct-tabla tbody tr:nth-child(even) td { background: rgba(255, 255, 255, 0.015); }
.ct-tabla tbody tr:hover td { background: color-mix(in srgb, var(--color-accent) 7%, transparent); }
.ct-titulo { font-weight: 700; }
.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.ct-sub { display: block; font-size: 0.66rem; font-weight: 400; color: var(--color-text-secondary); }
.t-ok { color: var(--color-success) !important; font-weight: 700; }
.t-costo { color: var(--color-error) !important; }
.t-warn { color: #c99234 !important; font-weight: 700; }
.t-info { color: var(--color-accent) !important; font-weight: 700; }
.t-muted { color: var(--color-text-secondary) !important; }
.ct-tabla tfoot td {
  position: sticky; bottom: 0; z-index: 2; background: var(--color-bg-secondary); font-weight: 800;
  border-top: 2px solid var(--color-border); border-bottom: none;
}

.ct-mas {
  width: 100%; min-height: 2.5rem; margin-top: 0.5rem; border: 1px dashed var(--color-border); border-radius: 10px;
  background: transparent; color: var(--color-accent); font-weight: 700; font-size: 0.82rem; cursor: pointer; font-family: inherit;
}
.ct-mas:hover { border-color: var(--color-accent); }

/* ---- Celular: cada fila es una tarjeta ---- */
@media (max-width: 640px) {
  .ct-scroll { max-height: none !important; overflow: visible; background: transparent; }
  .ct-tabla, .ct-tabla tbody, .ct-tabla tfoot { display: block; }
  .ct-tabla thead { display: none; }
  .ct-tabla tbody { display: flex; flex-direction: column; gap: 0.4rem; }
  .ct-tabla tr {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.1rem 0.75rem;
    padding: 0.55rem 0.7rem; background: var(--color-bg-primary); border-radius: 10px; box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.08);
  }
  .ct-tabla tbody tr:nth-child(even) td, .ct-tabla tbody tr:hover td { background: transparent; }
  .ct-tabla td {
    display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; padding: 0.12rem 0;
    border: none; text-align: right !important; min-width: 0; position: static;
  }
  .ct-tabla td::before {
    content: attr(data-label); font-size: 0.58rem; font-weight: 800; color: var(--color-text-secondary);
    text-transform: uppercase; letter-spacing: 0.03em; text-align: left; flex-shrink: 0;
  }
  .ct-tabla td.ct-titulo {
    grid-column: 1 / -1; justify-content: flex-start; text-align: left !important; font-size: 0.9rem;
    padding-bottom: 0.3rem; margin-bottom: 0.15rem; border-bottom: 1px solid var(--color-border); overflow-wrap: anywhere;
  }
  .ct-tabla td.ct-titulo::before { display: none; }
  .ct-sub { display: inline; margin-left: 0.35rem; }
  .ct-tabla tfoot { margin-top: 0.4rem; }
  .ct-tabla tfoot tr { background: var(--color-bg-secondary); box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.15); }
}
</style>
