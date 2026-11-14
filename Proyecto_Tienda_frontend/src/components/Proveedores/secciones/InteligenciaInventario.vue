<script setup lang="ts">
/**
 * Inteligencia de inventario — versión simplificada.
 *
 * Orden de lectura pensado para el día a día:
 *   1. ¿Qué hago hoy?  → 4 tarjetas (Reponer, Mover, Revisar, Van bien).
 *   2. Lista de productos con lenguaje sencillo (clic = detalle).
 *   3. Cola de revisión (decisiones que se guardan en el backend).
 *   4. "Más información": reglas, calidad de datos, avisos, salidas de efectivo y bitácora (plegados).
 */
import { ref, computed, onMounted, watch } from 'vue';
import {
  useInteligenciaInventario,
  type ProductoInteligencia,
  type Clasificacion,
} from '../logica/useInteligenciaInventario';

const {
  cargando, error, reporte, ultimaActualizacion, diasRevision,
  productos, resumen, reglas, calidad, movimientos, recomendaciones, salidasEfectivo,
  revisionConStock, revisionSinStock, revisionInactivos,
  cargar, guardarRevision, reiniciarRevision,
  formatoMoneda, formatoNumero, formatoCantidad, formatoPrecioUnitario, formatoDia, formatoFecha,
} = useInteligenciaInventario();

onMounted(() => cargar(diasRevision.value));

/* ------------------------------------------------------------------ */
/* Grupos de acción                                                    */
/* ------------------------------------------------------------------ */

type Grupo = 'reponer' | 'mover' | 'bien' | 'sindatos' | 'baja';
type Vista = 'todos' | Grupo;

/** Días de cobertura a partir de los cuales un producto rápido ya se debe pedir. */
const COBERTURA_REPONER = 7;

function grupoDe(p: ProductoInteligencia): Grupo {
  if (p.inactivo || p.clasificacion === 'INACTIVO') return 'baja';
  if (p.clasificacion === 'AGOTADO') return 'reponer';
  if (p.clasificacion === 'RAPIDO' && p.diasCobertura >= 0 && p.diasCobertura <= COBERTURA_REPONER) return 'reponer';
  if (p.clasificacion === 'ATORADO' || (p.clasificacion === 'LENTO' && p.stock > 0)) return 'mover';
  if (p.clasificacion === 'SIN_DATOS') return 'sindatos';
  return 'bien';
}

const ESTADO: Record<Clasificacion, { label: string; tone: string }> = {
  RAPIDO: { label: 'Se vende rápido', tone: 'ok' },
  MEDIO: { label: 'Venta normal', tone: 'ok' },
  LENTO: { label: 'Se vende lento', tone: 'warn' },
  ATORADO: { label: 'Atorado', tone: 'bad' },
  AGOTADO: { label: 'Agotado', tone: 'bad' },
  SIN_DATOS: { label: 'Sin datos', tone: 'muted' },
  INACTIVO: { label: 'Dado de baja', tone: 'muted' },
};

/* ------------------------------------------------------------------ */
/* Temperatura: qué tan seguido se vende                               */
/* ------------------------------------------------------------------ */

type Temp = 'caliente' | 'tibio' | 'frio' | 'congelado';

const TEMP: Record<Temp, { ico: string; label: string; orden: number }> = {
  caliente: { ico: '🔥', label: 'Caliente', orden: 0 },
  tibio: { ico: '🌡️', label: 'Tibio', orden: 1 },
  frio: { ico: '❄️', label: 'Frío', orden: 2 },
  congelado: { ico: '🧊', label: 'Congelado', orden: 3 },
};

/** Días que realmente se pueden medir (ventana o historial disponible, lo que sea menor). */
const diasMedidos = computed(() =>
  Math.max(1, Math.min(reporte.value?.ventanaDias ?? 84, reporte.value?.diasHistorial || (reporte.value?.ventanaDias ?? 84)))
);

/** Fracción de días en los que hubo al menos una venta (0–1). No depende de piezas o gramos. */
function frecuencia(p: ProductoInteligencia): number {
  return Math.min(1, (p.diasConVenta || 0) / diasMedidos.value);
}

function temperatura(p: ProductoInteligencia): Temp {
  if (!p.diasConVenta || p.ventas84d <= 0) return 'congelado';
  const f = frecuencia(p);
  const reciente = p.diasSinMovimiento != null && p.diasSinMovimiento <= 7;
  // Si lleva más de un mes sin venderse, aunque antes se vendiera, ya está frío.
  if (p.diasSinMovimiento == null || p.diasSinMovimiento > 30) return f > 0 ? 'frio' : 'congelado';
  if ((f >= 0.5 || p.topSeller) && reciente) return 'caliente';
  if (f >= 0.2) return 'tibio';
  return 'frio';
}

/** "Se vende 5 de cada 7 días" */
function frecuenciaTexto(p: ProductoInteligencia): string {
  if (!p.diasConVenta) return 'Sin ventas en el periodo';
  const de7 = Math.round(frecuencia(p) * 7);
  if (de7 >= 7) return 'Se vende todos los días';
  if (de7 >= 1) return `Se vende ${de7} de cada 7 días`;
  const cada = Math.round(diasMedidos.value / p.diasConVenta);
  return `Se vende 1 vez cada ${cada} días`;
}

/* ------------------------------------------------------------------ */
/* ¿Qué relleno con mi dinero?                                         */
/* ------------------------------------------------------------------ */

const presupuesto = ref<number | null>(null);
const diasObjetivo = ref(15);
const incluirTibios = ref(true);

/** Cuánto pedir para que alcance `diasObjetivo` días. Piezas enteras; granel redondeado a 100 g. */
function cantidadSugerida(p: ProductoInteligencia): number {
  const falta = p.consumoDiario * diasObjetivo.value - Math.max(0, p.stock);
  if (falta <= 0) return 0;
  return p.gramaje ? Math.ceil(falta / 100) * 100 : Math.ceil(falta);
}

/** Costo de una cantidad (granel: gramos ÷ 1000 × costo por kg). */
function costoDe(p: ProductoInteligencia, cantidad: number): number {
  return (p.gramaje ? cantidad / 1000 : cantidad) * (p.precioCosto || 0);
}

const candidatosRelleno = computed(() =>
  productos.value
    .filter(p => !p.inactivo && p.consumoDiario > 0)
    .map(p => ({ p, t: temperatura(p), cantidad: cantidadSugerida(p) }))
    .filter(x => x.cantidad > 0 && (x.t === 'caliente' || (incluirTibios.value && x.t === 'tibio')))
    // Primero lo más caliente; entre iguales, lo que se acaba antes.
    .sort((a, b) => TEMP[a.t].orden - TEMP[b.t].orden || cobOrden(a.p) - cobOrden(b.p))
);

const totalNecesario = computed(() =>
  candidatosRelleno.value.reduce((s, x) => s + costoDe(x.p, x.cantidad), 0)
);

/** Reparte el presupuesto: llena primero lo más caliente/urgente; si no alcanza, pide lo que se pueda. */
const planRelleno = computed(() => {
  const tope = presupuesto.value && presupuesto.value > 0 ? presupuesto.value : Infinity;
  let restante = tope;
  const filas: { p: ProductoInteligencia; t: Temp; pedir: number; costo: number; completo: boolean }[] = [];
  for (const x of candidatosRelleno.value) {
    const costoTotal = costoDe(x.p, x.cantidad);
    if (costoTotal <= restante) {
      filas.push({ ...x, pedir: x.cantidad, costo: costoTotal, completo: true });
      restante -= costoTotal;
      continue;
    }
    const paso = x.p.gramaje ? 100 : 1;
    const costoPaso = costoDe(x.p, paso);
    const pasos = costoPaso > 0 ? Math.floor(restante / costoPaso) : 0;
    if (pasos > 0) {
      filas.push({ ...x, pedir: pasos * paso, costo: pasos * costoPaso, completo: false });
      restante -= pasos * costoPaso;
    }
  }
  const gastado = filas.reduce((s, f) => s + f.costo, 0);
  return { filas, gastado, sobra: Number.isFinite(tope) ? tope - gastado : 0, quedanFuera: candidatosRelleno.value.length - filas.length };
});

const conGrupo = computed(() => productos.value.map(p => ({ p, g: grupoDe(p) })));

const conteo = computed(() => {
  const c: Record<Grupo, number> = { reponer: 0, mover: 0, bien: 0, sindatos: 0, baja: 0 };
  let dineroDetenido = 0;
  for (const { p, g } of conGrupo.value) {
    c[g]++;
    if (g === 'mover') dineroDetenido += p.valorInmovilizado || 0;
  }
  return { ...c, dineroDetenido };
});

const pendientesRevision = computed(() =>
  productos.value.filter(p => p.enRevision && p.revisionEstado === 'PENDIENTE').length
);

/* ------------------------------------------------------------------ */
/* Lista                                                               */
/* ------------------------------------------------------------------ */

const vista = ref<Vista>('todos');
const busqueda = ref('');
const orden = ref<'prioridad' | 'temperatura' | 'dinero' | 'nombre' | 'proveedor'>('prioridad');
const abierto = ref<number | null>(null);
const POR_PAGINA = 60;
const limite = ref(POR_PAGINA);

watch([vista, busqueda, orden], () => { limite.value = POR_PAGINA; abierto.value = null; });

const PRIORIDAD: Record<Grupo, number> = { reponer: 0, mover: 1, sindatos: 2, bien: 3, baja: 4 };
const cobOrden = (p: ProductoInteligencia) => (p.diasCobertura >= 0 ? p.diasCobertura : Number.MAX_SAFE_INTEGER);

const lista = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  const filtrados = conGrupo.value.filter(({ p, g }) => {
    if (vista.value !== 'todos' && g !== vista.value) return false;
    if (!q) return true;
    return [p.nombre, p.categoria, p.proveedor].some(v => (v || '').toLowerCase().includes(q));
  });
  const texto = (v?: string | null) => (v || '').trim().toLowerCase();
  filtrados.sort((a, b) => {
    switch (orden.value) {
      case 'temperatura':
        return TEMP[temperatura(a.p)].orden - TEMP[temperatura(b.p)].orden || frecuencia(b.p) - frecuencia(a.p);
      case 'dinero': return (b.p.valorInmovilizado || 0) - (a.p.valorInmovilizado || 0);
      case 'nombre': return texto(a.p.nombre).localeCompare(texto(b.p.nombre), 'es');
      case 'proveedor': {
        const pa = texto(a.p.proveedor), pb = texto(b.p.proveedor);
        if (!pa !== !pb) return pa ? -1 : 1;
        return pa.localeCompare(pb, 'es') || texto(a.p.nombre).localeCompare(texto(b.p.nombre), 'es');
      }
      default: {
        const d = PRIORIDAD[a.g] - PRIORIDAD[b.g];
        if (d) return d;
        if (a.g === 'reponer') return cobOrden(a.p) - cobOrden(b.p) || b.p.ventas30d - a.p.ventas30d;
        return (b.p.valorInmovilizado || 0) - (a.p.valorInmovilizado || 0);
      }
    }
  });
  return filtrados.map(x => x.p);
});

const visibles = computed(() => lista.value.slice(0, limite.value));

function elegirVista(v: Vista) {
  vista.value = vista.value === v ? 'todos' : v;
}

/* ------------------------------------------------------------------ */
/* Textos sencillos                                                    */
/* ------------------------------------------------------------------ */

function alcanza(p: ProductoInteligencia): string {
  if (p.stock <= 0) return 'Sin stock';
  if (p.diasCobertura == null || p.diasCobertura < 0) return 'No se vende';
  if (p.diasCobertura > 365) return 'Más de 1 año';
  if (p.diasCobertura === 1) return '1 día';
  return `${p.diasCobertura} días`;
}

function ultimaVenta(p: ProductoInteligencia): string {
  if (p.diasSinMovimiento == null) return 'Nunca se ha vendido';
  if (p.diasSinMovimiento === 0) return 'Hoy';
  if (p.diasSinMovimiento === 1) return 'Ayer';
  return `Hace ${p.diasSinMovimiento} días`;
}

function importancia(p: ProductoInteligencia): string {
  if (p.abc === 'A') return 'Alta (de los que más dinero dejan)';
  if (p.abc === 'B') return 'Media';
  if (p.abc === 'C') return 'Baja';
  return 'Sin ventas en el periodo';
}

function dineroDetenido(p: ProductoInteligencia): string {
  if (p.gramaje) return `${formatoNumero(p.stock / 1000, 3)} kg × ${formatoPrecioUnitario(p.precioCosto, true)}`;
  return `${formatoCantidad(p.stock)} × ${formatoPrecioUnitario(p.precioCosto, false)}`;
}

/* ------------------------------------------------------------------ */
/* Revisión                                                            */
/* ------------------------------------------------------------------ */

type RevisionTab = 'CON_STOCK' | 'SIN_STOCK' | 'INACTIVO';
const revisionTab = ref<RevisionTab>('CON_STOCK');
const guardando = ref<number | null>(null);
const mensajeRevision = ref('');

const revisionLista = computed(() =>
  revisionTab.value === 'CON_STOCK' ? revisionConStock.value
    : revisionTab.value === 'SIN_STOCK' ? revisionSinStock.value
      : revisionInactivos.value
);

const AYUDA_REVISION: Record<RevisionTab, string> = {
  CON_STOCK: 'Tienen mercancía parada: ofrécelos en promoción, ajusta el precio o devuélvelos al proveedor.',
  SIN_STOCK: 'No hay piezas y casi no se venden: confirma que sí se piden antes de volver a comprarlos.',
  INACTIVO: 'Productos dados de baja; aparecen aquí solo para que no se mezclen con los activos.',
};

async function guardar(item: ProductoInteligencia) {
  guardando.value = item.idProducto;
  mensajeRevision.value = '';
  if (!(await guardarRevision(item))) mensajeRevision.value = 'No se pudo guardar la decisión. Intenta de nuevo.';
  guardando.value = null;
}

async function reiniciar(item: ProductoInteligencia) {
  guardando.value = item.idProducto;
  mensajeRevision.value = '';
  if (!(await reiniciarRevision(item))) mensajeRevision.value = 'No se pudo reiniciar. Intenta de nuevo.';
  guardando.value = null;
}

/* ------------------------------------------------------------------ */
/* Otros                                                               */
/* ------------------------------------------------------------------ */

const TIPO_SALIDA: Record<string, string> = {
  PROVEEDOR: '🚚 Proveedor', SERVICIO: '🧾 Servicio', INSUMO: '🥬 Insumo', PRODUCTO: '🍬 Producto',
  NOMINA: '👤 Nómina', MOVIMIENTO_INTERNO: '🔁 Interno', OTRO: 'Otro',
};

function cambiarDias(e: Event) {
  cargar(Number((e.target as HTMLSelectElement).value), true);
}

function exportarCsv() {
  const enc = ['Producto', 'Categoría', 'Proveedor', 'Temperatura', 'Frecuencia', 'Estado', 'Qué hacer', 'Stock', 'Unidad', 'Vendido 30 días',
    'Le alcanza (días)', 'Última venta (días)', 'Costo', 'Precio venta', 'Dinero detenido', 'Importancia (ABC)', 'Motivo', 'Revisión'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = lista.value.map(p => [
    p.nombre, p.categoria, p.proveedor, TEMP[temperatura(p)].label, frecuenciaTexto(p), ESTADO[p.clasificacion]?.label ?? p.clasificacion, p.recomendacion,
    p.stock, p.gramaje ? 'g' : 'pz', p.ventas30d, p.diasCobertura, p.diasSinMovimiento ?? 'Nunca',
    p.precioCosto, p.precioVenta, p.valorInmovilizado, p.abc === 'SIN_VENTAS' ? '' : p.abc, p.motivo, p.revisionEstado,
  ].map(esc).join(','));
  const blob = new Blob(['﻿' + [enc.join(','), ...filas].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inteligencia-inventario-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<template>
  <div class="ii">
    <!-- Encabezado -->
    <header class="ii-head">
      <div>
        <h3>🧠 Inteligencia de inventario</h3>
        <p>Qué reponer, qué mover y qué revisar, según las ventas de los últimos {{ reporte?.ventanaDias ?? 84 }} días.</p>
      </div>
      <div class="ii-head-actions">
        <label class="ii-field" title="Un producto entra a revisión si lleva más de estos días sin venderse">
          <span>Revisar si no se vende en</span>
          <select :value="reporte?.diasRevision ?? diasRevision" :disabled="cargando" @change="cambiarDias">
            <option :value="30">30 días</option>
            <option :value="60">60 días</option>
            <option :value="90">90 días</option>
          </select>
        </label>
        <button class="ii-btn" type="button" :disabled="cargando" @click="cargar(diasRevision, true)">
          {{ cargando ? 'Actualizando…' : '↻ Actualizar' }}
        </button>
        <small v-if="ultimaActualizacion" class="ii-muted">Actualizado {{ ultimaActualizacion }}</small>
      </div>
    </header>

    <div v-if="error" class="ii-alert bad">
      {{ error }} <button class="ii-btn" type="button" @click="cargar(diasRevision, true)">Reintentar</button>
    </div>
    <div v-if="cargando && !reporte" class="ii-loading"><span class="ii-spinner"></span>Calculando…</div>

    <template v-if="reporte">
      <div v-if="!reporte.historialSuficiente" class="ii-alert warn">
        ⚠️ Todavía hay poco historial ({{ reporte.diasHistorial }} de {{ reporte.diasMinimos }} días mínimos).
        Los productos sin suficientes ventas aparecen como «Sin datos».
      </div>

      <!-- 1. ¿Qué hago hoy? -->
      <section class="ii-today">
        <button type="button" :class="['ii-action', 'bad', { on: vista === 'reponer' }]" @click="elegirVista('reponer')">
          <span class="ii-action-ico">🛒</span>
          <span class="ii-action-num">{{ conteo.reponer }}</span>
          <span class="ii-action-title">Reponer</span>
          <span class="ii-action-sub">Agotados o que se acaban en ≤ {{ COBERTURA_REPONER }} días</span>
        </button>
        <button type="button" :class="['ii-action', 'warn', { on: vista === 'mover' }]" @click="elegirVista('mover')">
          <span class="ii-action-ico">🏷️</span>
          <span class="ii-action-num">{{ conteo.mover }}</span>
          <span class="ii-action-title">Mover / promocionar</span>
          <span class="ii-action-sub">{{ formatoMoneda(conteo.dineroDetenido) }} en mercancía que casi no se vende</span>
        </button>
        <a href="#ii-revision" class="ii-action info">
          <span class="ii-action-ico">🔎</span>
          <span class="ii-action-num">{{ pendientesRevision }}</span>
          <span class="ii-action-title">Por decidir</span>
          <span class="ii-action-sub">Más de {{ reporte.diasRevision }} días sin venderse</span>
        </a>
        <button type="button" :class="['ii-action', 'ok', { on: vista === 'bien' }]" @click="elegirVista('bien')">
          <span class="ii-action-ico">✅</span>
          <span class="ii-action-num">{{ conteo.bien }}</span>
          <span class="ii-action-title">Van bien</span>
          <span class="ii-action-sub">Inventario total: {{ formatoMoneda(resumen.valorInventario) }}</span>
        </button>
      </section>

      <!-- ¿Qué relleno con mi dinero? -->
      <section class="ii-card ii-refill">
        <h4>🛒 ¿Qué relleno con lo que tengo?</h4>
        <p class="ii-muted">
          Escribe cuánto dinero tienes para surtir. Se llena primero lo 🔥 caliente y lo que se acaba antes,
          con la cantidad justa para que alcance los días que elijas.
        </p>
        <div class="ii-toolbar">
          <label class="ii-field">
            <span>Tengo $</span>
            <input v-model.number="presupuesto" type="number" min="0" step="50" placeholder="Ej. 2000" class="ii-money" />
          </label>
          <label class="ii-field">
            <span>Que alcance para</span>
            <select v-model.number="diasObjetivo">
              <option :value="7">7 días</option>
              <option :value="15">15 días</option>
              <option :value="30">30 días</option>
            </select>
          </label>
          <label class="ii-field ii-check"><input v-model="incluirTibios" type="checkbox" /> Incluir 🌡️ tibios</label>
        </div>

        <div class="ii-refill-sum">
          <div><span>Para surtir todo necesitas</span><strong>{{ formatoMoneda(totalNecesario) }}</strong></div>
          <div v-if="presupuesto"><span>Con tu dinero cubres</span><strong>{{ formatoMoneda(planRelleno.gastado) }}</strong></div>
          <div v-if="presupuesto"><span>Te sobra</span><strong>{{ formatoMoneda(planRelleno.sobra) }}</strong></div>
          <div v-if="presupuesto && planRelleno.quedanFuera > 0" class="warn"><span>No alcanzan</span><strong>{{ planRelleno.quedanFuera }} productos</strong></div>
        </div>

        <div v-if="planRelleno.filas.length === 0" class="ii-empty">
          {{ candidatosRelleno.length === 0 ? 'Nada que rellenar: lo que se vende tiene stock suficiente 🎉' : 'Con ese dinero no alcanza ni para una pieza del primer producto.' }}
        </div>
        <div v-else class="ii-table-wrap">
          <table class="ii-table">
            <thead>
              <tr>
                <th>#</th><th>Producto</th><th>Temperatura</th><th class="num">Tienes</th>
                <th class="num opt">Le alcanza</th><th class="num">Pedir</th><th class="num">Costo</th><th class="opt">Proveedor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(f, i) in planRelleno.filas" :key="f.p.idProducto">
                <td class="ii-muted">{{ i + 1 }}</td>
                <td><strong>{{ f.p.nombre }}</strong><small v-if="!f.p.precioCosto" class="ii-muted">⚠️ sin costo capturado</small></td>
                <td><span :class="['ii-temp', f.t]">{{ TEMP[f.t].ico }} {{ TEMP[f.t].label }}</span></td>
                <td class="num">{{ formatoCantidad(f.p.stock, f.p.gramaje) }}</td>
                <td class="num opt">{{ alcanza(f.p) }}</td>
                <td class="num"><strong>{{ formatoCantidad(f.pedir, f.p.gramaje) }}</strong><small v-if="!f.completo" class="ii-muted">parcial</small></td>
                <td class="num">{{ formatoMoneda(f.costo) }}</td>
                <td class="opt">{{ f.p.proveedor || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 2. Lista de productos -->
      <section class="ii-card">
        <div class="ii-toolbar">
          <input v-model="busqueda" class="ii-search" type="search" placeholder="Buscar producto, categoría o proveedor…" />
          <select v-model="vista" class="ii-select">
            <option value="todos">Todos ({{ productos.length }})</option>
            <option value="reponer">🛒 Reponer ({{ conteo.reponer }})</option>
            <option value="mover">🏷️ Mover ({{ conteo.mover }})</option>
            <option value="bien">✅ Van bien ({{ conteo.bien }})</option>
            <option value="sindatos">❔ Sin datos ({{ conteo.sindatos }})</option>
            <option value="baja">⏸️ Dados de baja ({{ conteo.baja }})</option>
          </select>
          <select v-model="orden" class="ii-select">
            <option value="prioridad">Ordenar: lo urgente primero</option>
            <option value="temperatura">Ordenar: 🔥 más caliente primero</option>
            <option value="dinero">Ordenar: más dinero detenido</option>
            <option value="nombre">Ordenar: nombre</option>
            <option value="proveedor">Ordenar: proveedor</option>
          </select>
          <button class="ii-btn" type="button" @click="exportarCsv">⬇ CSV</button>
        </div>

        <div class="ii-table-wrap">
          <table class="ii-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th title="Qué tan seguido se vende: 🔥 casi diario · 🌡️ varias veces por semana · ❄️ de vez en cuando · 🧊 no se vende">Temperatura</th>
                <th class="num">Stock</th>
                <th class="num opt">Vendido 30 días</th>
                <th class="num">Le alcanza</th>
                <th class="opt">Última venta</th>
                <th>Estado</th>
                <th class="opt">Qué hacer</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="p in visibles" :key="p.idProducto">
                <tr class="ii-row" :class="{ open: abierto === p.idProducto }" @click="abierto = abierto === p.idProducto ? null : p.idProducto">
                  <td>
                    <strong>{{ p.nombre }}</strong><span v-if="p.topSeller" title="De los más vendidos"> 🔥</span>
                    <small class="ii-muted">{{ p.categoria || 'Sin categoría' }} · {{ p.proveedor || 'Sin proveedor' }}</small>
                  </td>
                  <td>
                    <span :class="['ii-temp', temperatura(p)]">{{ TEMP[temperatura(p)].ico }} {{ TEMP[temperatura(p)].label }}</span>
                    <small class="ii-muted">{{ frecuenciaTexto(p) }}</small>
                  </td>
                  <td class="num">{{ formatoCantidad(p.stock, p.gramaje) }}</td>
                  <td class="num opt">{{ formatoCantidad(p.ventas30d, p.gramaje) }}</td>
                  <td class="num">{{ alcanza(p) }}</td>
                  <td class="opt">{{ ultimaVenta(p) }}</td>
                  <td><span :class="['ii-badge', ESTADO[p.clasificacion]?.tone]">{{ ESTADO[p.clasificacion]?.label ?? p.clasificacion }}</span></td>
                  <td class="opt ii-todo">{{ p.recomendacion }}</td>
                </tr>
                <tr v-if="abierto === p.idProducto" class="ii-detail-row">
                  <td colspan="8">
                    <div class="ii-detail">
                      <p class="ii-why"><strong>¿Por qué «{{ ESTADO[p.clasificacion]?.label }}»?</strong> {{ p.motivo }}</p>
                      <p class="ii-why"><strong>Qué hacer:</strong> {{ p.recomendacion }}</p>
                      <dl class="ii-facts">
                        <div><dt>Temperatura</dt><dd>{{ TEMP[temperatura(p)].ico }} {{ TEMP[temperatura(p)].label }} · {{ frecuenciaTexto(p).toLowerCase() }}</dd></div>
                        <div><dt>Se vende al día</dt><dd>{{ formatoCantidad(p.consumoDiario, p.gramaje, 2) }}</dd></div>
                        <div><dt>Vendido 7 / 30 días</dt><dd>{{ formatoCantidad(p.ventas7d, p.gramaje) }} / {{ formatoCantidad(p.ventas30d, p.gramaje) }}</dd></div>
                        <div><dt>Le alcanza para</dt><dd>{{ alcanza(p) }}</dd></div>
                        <div><dt>Última venta</dt><dd>{{ ultimaVenta(p) }}<template v-if="p.ultimaSalida"> ({{ formatoFecha(p.ultimaSalida) }})</template></dd></div>
                        <div><dt>Costo / venta</dt><dd>{{ formatoPrecioUnitario(p.precioCosto, p.gramaje) }} / {{ formatoPrecioUnitario(p.precioVenta, p.gramaje) }}</dd></div>
                        <div><dt>Dinero detenido</dt><dd>{{ formatoMoneda(p.valorInmovilizado) }} <small class="ii-muted">({{ dineroDetenido(p) }})</small></dd></div>
                        <div><dt>Mínimo / máximo</dt><dd>{{ formatoCantidad(p.cantidadMin, p.gramaje) }} / {{ formatoCantidad(p.cantidadMax, p.gramaje) }}</dd></div>
                        <div><dt>Importancia en ventas</dt><dd>{{ importancia(p) }}</dd></div>
                      </dl>
                      <div v-if="p.listaProveedores?.length" class="ii-provs">
                        <strong>Proveedores:</strong>
                        <span v-for="pr in p.listaProveedores" :key="pr.idProveedor ?? pr.nombre" :class="['ii-chip', { best: pr.elMasBarato }]">
                          {{ pr.nombre }} · {{ pr.precio != null ? formatoPrecioUnitario(pr.precio, p.gramaje) : 'sin precio' }}<template v-if="pr.elMasBarato"> ✓ más barato</template>
                        </span>
                      </div>
                      <p v-if="p.gramaje" class="ii-muted">⚖️ Producto a granel: stock y ventas en gramos, precios por kilo.</p>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div v-if="lista.length === 0" class="ii-empty">No hay productos con ese filtro.</div>
        <div class="ii-foot">
          <span class="ii-muted">Mostrando {{ visibles.length }} de {{ lista.length }} · toca un producto para ver el detalle</span>
          <button v-if="visibles.length < lista.length" class="ii-btn" type="button" @click="limite += POR_PAGINA">Ver más</button>
        </div>
      </section>

      <!-- 3. Revisión -->
      <section id="ii-revision" class="ii-card">
        <h4>🔎 Productos por decidir</h4>
        <p class="ii-muted">Llevan más de {{ reporte.diasRevision }} días sin venderse. Elige qué pasó con cada uno y deja de aparecer como pendiente.</p>
        <div v-submenu class="ii-tabs">
          <button type="button" :class="['ii-tab', { active: revisionTab === 'CON_STOCK' }]" @click="revisionTab = 'CON_STOCK'">Con mercancía <b>{{ revisionConStock.length }}</b></button>
          <button type="button" :class="['ii-tab', { active: revisionTab === 'SIN_STOCK' }]" @click="revisionTab = 'SIN_STOCK'">Sin mercancía <b>{{ revisionSinStock.length }}</b></button>
          <button type="button" :class="['ii-tab', { active: revisionTab === 'INACTIVO' }]" @click="revisionTab = 'INACTIVO'">Dados de baja <b>{{ revisionInactivos.length }}</b></button>
        </div>
        <p class="ii-help">{{ AYUDA_REVISION[revisionTab] }}</p>
        <div v-if="mensajeRevision" class="ii-alert bad">{{ mensajeRevision }}</div>
        <div v-if="revisionLista.length === 0" class="ii-empty">Nada pendiente aquí 🎉</div>
        <div class="ii-review">
          <article v-for="item in revisionLista" :key="item.idProducto" :class="['ii-review-item', { done: item.revisionEstado === 'RESUELTO' }]">
            <div class="ii-review-info">
              <strong>{{ item.nombre }}</strong>
              <small class="ii-muted">
                {{ formatoCantidad(item.stock, item.gramaje) }} · {{ formatoMoneda(item.valorInmovilizado) }} detenido · última venta: {{ ultimaVenta(item).toLowerCase() }}
              </small>
            </div>
            <div class="ii-review-ctrl">
              <select v-model="item.revisionEstado" :disabled="guardando === item.idProducto" @change="guardar(item)" title="Estado">
                <option value="PENDIENTE">⏳ Pendiente</option>
                <option value="EN_REVISION">👀 Revisando</option>
                <option value="RESUELTO">✅ Resuelto</option>
              </select>
              <select v-model="item.revisionMotivo" :disabled="guardando === item.idProducto" @change="guardar(item)" title="Motivo">
                <option :value="null">Motivo…</option>
                <option value="ESTACIONAL">Es de temporada</option>
                <option value="SIN_DEMANDA">Ya no se pide</option>
                <option value="STOCK_FISICO">El stock no cuadra</option>
                <option value="PROVEEDOR">Tema del proveedor</option>
                <option value="DESCONTINUADO">Descontinuado</option>
                <option value="OTRO">Otro</option>
              </select>
              <input v-model="item.revisionNota" :disabled="guardando === item.idProducto" maxlength="500" placeholder="Nota (opcional)" @change="guardar(item)" />
              <button class="ii-btn ghost" type="button" :disabled="guardando === item.idProducto" title="Volver a pendiente y borrar motivo/nota" @click="reiniciar(item)">↺</button>
            </div>
          </article>
        </div>
      </section>

      <!-- 4. Más información (plegado) -->
      <details v-if="recomendaciones.length" class="ii-card ii-more">
        <summary>💡 Avisos del sistema <b>{{ recomendaciones.length }}</b></summary>
        <ul class="ii-list">
          <li v-for="r in recomendaciones" :key="r.codigo" :class="'sev-' + r.severidad.toLowerCase()">
            <strong>{{ r.titulo }}</strong><span v-if="r.impacto > 0"> · {{ formatoMoneda(r.impacto) }}</span>
            <p>{{ r.detalle }} <em>{{ r.accion }}</em></p>
          </li>
        </ul>
      </details>

      <details v-if="calidad.length" class="ii-card ii-more">
        <summary>🧹 Datos por corregir <b>{{ calidad.reduce((s, q) => s + q.cantidad, 0) }}</b></summary>
        <ul class="ii-list">
          <li v-for="q in calidad" :key="q.codigo" :class="'sev-' + q.severidad.toLowerCase()">
            <strong>{{ q.titulo }} ({{ q.cantidad }})</strong>
            <p>{{ q.descripcion }}<template v-if="q.ejemplos.length"> Ej.: {{ q.ejemplos.join(', ') }}</template></p>
          </li>
        </ul>
      </details>

      <details v-if="salidasEfectivo.totalEgresos > 0" class="ii-card ii-more">
        <summary>💵 Salidas de efectivo frecuentes <b>{{ formatoMoneda(salidasEfectivo.totalMonto) }}</b></summary>
        <p class="ii-muted">Pagos de caja de los últimos {{ salidasEfectivo.ventanaDias }} días, agrupados por descripción. Sirve para ver a quién se le paga seguido y qué día suele caer.</p>
        <div class="ii-table-wrap">
          <table class="ii-table">
            <thead><tr><th>Concepto</th><th class="num">Veces</th><th class="num">Total</th><th>Suele caer</th><th class="opt">Se vendió ese día</th></tr></thead>
            <tbody>
              <tr v-for="(s, i) in salidasEfectivo.items" :key="`${s.clave}-${i}`">
                <td><strong>{{ s.descripcion }}</strong><small class="ii-muted">{{ TIPO_SALIDA[s.tipo] || s.tipo }}</small></td>
                <td class="num">{{ s.ocurrencias }}</td>
                <td class="num">{{ formatoMoneda(s.total) }}</td>
                <td>{{ s.diaProbable ? `${formatoDia(s.diaProbable)} (${formatoNumero(s.confianzaDia, 0)}%)` : '—' }}</td>
                <td class="opt">{{ s.productosRelacionados.join(', ') || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      <details class="ii-card ii-more">
        <summary>📐 ¿Cómo se calcula?</summary>
        <ul class="ii-list ii-glossary">
          <li><strong>Temperatura:</strong> de los días medidos, en cuántos hubo venta. 🔥 Caliente = la mitad o más de los días (o top seller) y vendido esta semana · 🌡️ Tibio = 1 a 3 días por semana · ❄️ Frío = de vez en cuando o más de 30 días sin venderse · 🧊 Congelado = sin ventas.</li>
          <li><strong>Qué rellenar:</strong> lo que se vende al día × días elegidos − lo que tienes; se pide primero lo más caliente y lo que se acaba antes, hasta donde alcance el dinero (costo × cantidad; granel en kg).</li>
          <li><strong>Le alcanza:</strong> stock ÷ lo que se vende al día (promedio que pesa más las ventas recientes).</li>
          <li><strong>Se vende rápido:</strong> le alcanza para 21 días o menos, o es de los más vendidos 🔥.</li>
          <li><strong>Venta normal:</strong> le alcanza para 22 a 60 días.</li>
          <li><strong>Se vende lento:</strong> le alcanza para más de 60 días o lleva 45+ días sin venderse.</li>
          <li><strong>Atorado:</strong> tiene mercancía y lleva 90+ días sin venderse.</li>
          <li><strong>Agotado:</strong> no hay stock, pero sí se vendía.</li>
          <li><strong>Dinero detenido:</strong> stock × costo (en granel: kg × costo por kg).</li>
          <li><strong>Importancia (ABC):</strong> A = los que juntos dejan el 80% de las ventas, B = el siguiente 15%, C = el resto.</li>
        </ul>
        <details class="ii-sub">
          <summary>Reglas técnicas del motor ({{ reglas.length }})</summary>
          <ul class="ii-list">
            <li v-for="r in reglas" :key="r.codigo">
              <strong>{{ r.nombre }}</strong>
              <p>{{ r.descripcion }}<template v-if="r.umbral"> Umbral: {{ r.umbral }}.</template></p>
              <code v-if="r.formula">{{ r.formula }}</code>
            </li>
          </ul>
        </details>
        <details v-if="movimientos.length" class="ii-sub">
          <summary>Movimientos registrados en la bitácora</summary>
          <ul class="ii-list">
            <li v-for="m in movimientos" :key="m.tipo">
              <strong>{{ m.etiqueta }}</strong> · {{ m.total }} ({{ m.salidas }} salidas, {{ m.entradas }} entradas)
              <p>{{ m.descripcion }} {{ formatoFecha(m.primeraFecha) }} – {{ formatoFecha(m.ultimaFecha) }}</p>
            </li>
          </ul>
        </details>
      </details>
    </template>
  </div>
</template>

<style scoped>
.ii {
  display: flex; flex-direction: column; gap: .85rem;
  height: 100%; min-height: 0; overflow-y: auto; overflow-x: hidden;
  padding: .25rem; color: var(--color-text-primary); overscroll-behavior: contain;
}
.ii > * { flex: 0 0 auto; }
.ii h3, .ii h4, .ii p { margin: 0; }
.ii-muted { color: var(--color-text-secondary); font-size: .78rem; }
small.ii-muted { display: block; }

/* Encabezado */
.ii-head {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem;
  padding: .9rem 1rem; border-radius: var(--radius-lg);
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 14%, transparent), color-mix(in srgb, var(--color-accent) 3%, transparent));
}
.ii-head h3 { font-size: 1.1rem; }
.ii-head p { font-size: .82rem; color: var(--color-text-secondary); margin-top: .2rem; }
.ii-head-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.ii-field { display: flex; align-items: center; gap: .4rem; font-size: .78rem; color: var(--color-text-secondary); }

.ii select, .ii input:not([type=checkbox]) {
  padding: .45rem .6rem; border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg-primary); color: var(--color-text-primary); font-size: .8rem; min-width: 0;
}
.ii-btn {
  padding: .45rem .8rem; border: none; border-radius: var(--radius-md); cursor: pointer;
  background: var(--color-accent); color: var(--color-on-brand, #fff); font-size: .8rem; font-weight: 600; white-space: nowrap;
}
.ii-btn.ghost { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border); }
.ii-btn:disabled { opacity: .55; cursor: default; }

.ii-alert { padding: .65rem .9rem; border-radius: var(--radius-md); font-size: .82rem; }
.ii-alert.bad { background: color-mix(in srgb, var(--color-error) 12%, transparent); color: var(--color-error); }
.ii-alert.warn { background: color-mix(in srgb, var(--color-warning) 14%, transparent); }
.ii-loading { display: flex; align-items: center; justify-content: center; gap: .6rem; padding: 2.5rem; color: var(--color-text-secondary); }
.ii-spinner { width: 1.4rem; height: 1.4rem; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: ii-spin .8s linear infinite; }
@keyframes ii-spin { to { transform: rotate(360deg); } }

/* ¿Qué hago hoy? */
.ii-today { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: .65rem; }
.ii-action {
  --tone: var(--color-accent);
  display: grid; grid-template-columns: auto 1fr; grid-template-areas: "ico num" "title title" "sub sub";
  align-items: center; gap: .15rem .5rem; text-align: left; text-decoration: none; color: inherit; cursor: pointer;
  padding: .85rem 1rem; border-radius: var(--radius-lg); border: 2px solid transparent;
  background: color-mix(in srgb, var(--tone) 9%, var(--color-bg-secondary, transparent));
  border-left: 4px solid var(--tone); transition: transform .12s, border-color .12s; font: inherit;
}
.ii-action:hover { transform: translateY(-1px); }
.ii-action.on { border-color: var(--tone); }
.ii-action.bad { --tone: var(--color-error); }
.ii-action.warn { --tone: var(--color-warning); }
.ii-action.ok { --tone: var(--color-success); }
.ii-action.info { --tone: var(--color-info, var(--color-accent)); }
.ii-action-ico { grid-area: ico; font-size: 1.3rem; }
.ii-action-num { grid-area: num; font-size: 1.6rem; font-weight: 800; color: var(--tone); }
.ii-action-title { grid-area: title; font-weight: 700; font-size: .92rem; }
.ii-action-sub { grid-area: sub; font-size: .75rem; color: var(--color-text-secondary); }

/* Tarjetas */
.ii-card { padding: .9rem 1rem; border-radius: var(--radius-lg); background: var(--color-bg-secondary, var(--color-bg-panel)); box-shadow: 2px 2px 8px var(--color-shadow); display: flex; flex-direction: column; gap: .6rem; }
.ii-card h4 { font-size: .98rem; }
.ii-toolbar { display: flex; flex-wrap: wrap; gap: .5rem; }
.ii-search { flex: 1 1 14rem; }
.ii-select { flex: 0 1 auto; }

/* Tabla */
.ii-table-wrap { overflow-x: auto; border-radius: var(--radius-md); }
.ii-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
.ii-table th { text-align: left; padding: .5rem .6rem; font-size: .72rem; text-transform: uppercase; letter-spacing: .03em; color: var(--color-text-secondary); border-bottom: 2px solid var(--color-border); white-space: nowrap; }
.ii-table td { padding: .55rem .6rem; border-bottom: 1px solid var(--color-border); vertical-align: middle; }
.ii-table .num { text-align: right; white-space: nowrap; }
.ii-row { cursor: pointer; }
.ii-row:hover, .ii-row.open { background: color-mix(in srgb, var(--color-accent) 7%, transparent); }
.ii-todo { font-size: .78rem; color: var(--color-text-secondary); max-width: 22rem; }
.ii-badge { display: inline-block; padding: .2rem .55rem; border-radius: 999px; font-size: .72rem; font-weight: 700; white-space: nowrap; }
.ii-badge.ok { background: color-mix(in srgb, var(--color-success) 16%, transparent); color: var(--color-success); }
.ii-badge.warn { background: color-mix(in srgb, var(--color-warning) 18%, transparent); color: var(--color-warning); }
.ii-badge.bad { background: color-mix(in srgb, var(--color-error) 15%, transparent); color: var(--color-error); }
.ii-badge.muted { background: color-mix(in srgb, var(--color-text-secondary) 14%, transparent); color: var(--color-text-secondary); }

.ii-detail-row > td { background: color-mix(in srgb, var(--color-accent) 4%, transparent); }
.ii-detail { display: flex; flex-direction: column; gap: .55rem; padding: .3rem 0; }
.ii-why { font-size: .84rem; }
.ii-facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 13rem), 1fr)); gap: .45rem .9rem; margin: 0; }
.ii-facts dt { font-size: .7rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: .03em; }
.ii-facts dd { margin: 0; font-weight: 600; font-size: .85rem; }
.ii-provs { display: flex; flex-wrap: wrap; align-items: center; gap: .35rem; font-size: .8rem; }
.ii-chip { padding: .2rem .55rem; border-radius: 999px; border: 1px solid var(--color-border); font-size: .75rem; }
.ii-chip.best { border-color: var(--color-success); color: var(--color-success); font-weight: 600; }

.ii-empty { text-align: center; padding: 1.4rem; color: var(--color-text-secondary); font-size: .85rem; }
.ii-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem; }

/* Revisión */
.ii-tabs { display: flex; gap: .35rem; border-bottom: 1px solid var(--color-border); }
.ii-tab { padding: .5rem .8rem; border: none; background: none; cursor: pointer; color: var(--color-text-secondary); font: inherit; font-size: .82rem; border-bottom: 2px solid transparent; white-space: nowrap; }
.ii-tab b { margin-left: .25rem; padding: 0 .4rem; border-radius: 999px; background: var(--color-border); font-size: .72rem; }
.ii-tab.active { color: var(--color-accent); border-bottom-color: var(--color-accent); font-weight: 600; }
.ii-help { font-size: .8rem; color: var(--color-text-secondary); }
.ii-review { display: flex; flex-direction: column; gap: .45rem; max-height: 32rem; overflow-y: auto; }
.ii-review-item { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem .9rem; padding: .6rem .75rem; border-radius: var(--radius-md); border: 1px solid var(--color-border); }
.ii-review-item.done { opacity: .6; }
.ii-review-info { min-width: 0; flex: 1 1 14rem; }
.ii-review-ctrl { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
.ii-review-ctrl input { width: 12rem; max-width: 100%; }

/* Más información */
.ii-more > summary, .ii-sub > summary { cursor: pointer; font-weight: 600; font-size: .9rem; list-style-position: inside; }
.ii-more > summary b { margin-left: .35rem; padding: .05rem .5rem; border-radius: 999px; background: var(--color-border); font-size: .75rem; }
.ii-sub { margin-top: .4rem; }
.ii-sub > summary { font-size: .82rem; color: var(--color-text-secondary); }
.ii-list { margin: .3rem 0 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: .45rem; font-size: .82rem; }
.ii-list p { color: var(--color-text-secondary); font-size: .78rem; margin-top: .1rem; }
.ii-list code { font-size: .72rem; }
.ii-list .sev-alta::marker { color: var(--color-error); }
.ii-list .sev-media::marker { color: var(--color-warning); }

.ii-temp { display: inline-block; padding: .2rem .55rem; border-radius: 999px; font-size: .75rem; font-weight: 700; white-space: nowrap; }
.ii-temp.caliente { background: color-mix(in srgb, #ef4444 16%, transparent); color: #dc2626; }
.ii-temp.tibio { background: color-mix(in srgb, #f59e0b 18%, transparent); color: #d97706; }
.ii-temp.frio { background: color-mix(in srgb, #3b82f6 15%, transparent); color: #2563eb; }
.ii-temp.congelado { background: color-mix(in srgb, #64748b 16%, transparent); color: #64748b; }
.ii-money { width: 8rem; }
.ii-check { cursor: pointer; }
.ii-refill-sum { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr)); gap: .5rem; }
.ii-refill-sum > div { padding: .55rem .75rem; border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-accent) 8%, transparent); display: flex; flex-direction: column; }
.ii-refill-sum > div.warn { background: color-mix(in srgb, var(--color-warning) 16%, transparent); }
.ii-refill-sum span { font-size: .72rem; color: var(--color-text-secondary); }
.ii-refill-sum strong { font-size: 1.05rem; }
.ii-refill .ii-table-wrap { max-height: 26rem; overflow-y: auto; }

@media (max-width: 760px) {
  .ii .opt { display: none; }
  .ii-head { padding: .75rem; }
  .ii-select, .ii-btn { flex: 1 1 auto; }
}
</style>
