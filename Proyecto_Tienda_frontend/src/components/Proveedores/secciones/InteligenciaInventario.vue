<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  useInteligenciaInventario,
  type ProductoInteligencia,
  type Clasificacion,
} from '../logica/useInteligenciaInventario';

const {
  cargando,
  error,
  reporte,
  ultimaActualizacion,
  diasRevision,
  productos,
  resumen,
  reglas,
  calidad,
  movimientos,
  recomendaciones,
  salidasEfectivo,
  revisionConStock,
  revisionSinStock,
  revisionInactivos,
  cargar,
  guardarRevision,
  reiniciarRevision,
  formatoMoneda,
  formatoNumero,
  formatoPorcentaje,
  formatoCantidad,
  formatoPrecioUnitario,
  formatoDia,
  formatoFecha,
} = useInteligenciaInventario();

onMounted(() => cargar(diasRevision.value));

/* ------------------------------------------------------------------ */
/* Estado de la interfaz                                              */
/* ------------------------------------------------------------------ */

type ClasificacionFiltro = Clasificacion | 'TODAS';
type AbcFiltro = 'TODOS' | 'A' | 'B' | 'C' | 'SIN_VENTAS';
type EstadoFiltro = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';
type RevisionTab = 'CON_STOCK' | 'SIN_STOCK' | 'INACTIVO';

const reglasAbiertas = ref(true);
const busqueda = ref('');
const filtroClasificacion = ref<ClasificacionFiltro>('TODAS');
const filtroAbc = ref<AbcFiltro>('TODOS');
const filtroEstado = ref<EstadoFiltro>('TODOS');
const detalleAbierto = ref<number | null>(null);
const revisionTab = ref<RevisionTab>('CON_STOCK');
const guardandoRevision = ref<number | null>(null);
const mensajeRevision = ref('');

/* Salidas de efectivo */
const cashSoloRepetidas = ref(false);
const cashSoloProveedores = ref(false);
const cashBusqueda = ref('');

/* ------------------------------------------------------------------ */
/* Derivados                                                          */
/* ------------------------------------------------------------------ */

const meta = computed(() => ({
  ventanaDias: reporte.value?.ventanaDias ?? 84,
  diasHistorial: reporte.value?.diasHistorial ?? 0,
  diasMinimos: reporte.value?.diasMinimos ?? 14,
  historialSuficiente: reporte.value?.historialSuficiente ?? false,
  diasRevision: reporte.value?.diasRevision ?? diasRevision.value,
}));

const hayGramaje = computed(() => productos.value.some(p => p.gramaje));

type ClaseCard = {
  key: Clasificacion;
  label: string;
  icon: string;
  count: number;
  definicion: string;
  tone: string;
  valor: number;
};

const clasificaciones = computed<ClaseCard[]>(() => {
  const r = resumen.value;
  const items: Omit<ClaseCard, 'valor'>[] = [
    { key: 'RAPIDO', label: 'Rápido', icon: '⚡', count: r.rapidos, tone: 'rapido', definicion: 'Cobertura ≤ 21 días o top seller' },
    { key: 'MEDIO', label: 'Medio', icon: '🟡', count: r.medios, tone: 'medio', definicion: 'Cobertura 22–60 días' },
    { key: 'LENTO', label: 'Lento', icon: '🐢', count: r.lentos, tone: 'lento', definicion: 'Cobertura > 60 días o 45+ días sin moverse' },
    { key: 'ATORADO', label: 'Atorado', icon: '🧱', count: r.atorados, tone: 'atorado', definicion: 'Con stock y 90+ días sin moverse' },
    { key: 'AGOTADO', label: 'Agotado', icon: '📦', count: r.agotados, tone: 'agotado', definicion: 'Sin stock, pero con ventas' },
    { key: 'SIN_DATOS', label: 'Sin datos', icon: '❔', count: r.sinDatos, tone: 'sindatos', definicion: 'Historial insuficiente o nunca vendido sin stock' },
    { key: 'INACTIVO', label: 'Inactivo', icon: '⏸️', count: r.inactivos, tone: 'inactivo', definicion: 'Producto dado de baja' },
  ];
  return items.map(item => ({
    ...item,
    valor: valorClase(item.key),
  }));
});

const kpis = computed(() => {
  const r = resumen.value;
  return [
    {
      key: 'valor',
      icon: '💰',
      label: 'Valor del inventario',
      value: formatoMoneda(r.valorInventario),
      sub: `${r.conStock} productos con stock · costo${hayGramaje.value ? ' (gramaje en kg)' : ''}`,
      tone: 'accent',
    },
    {
      key: 'riesgo',
      icon: '⚠️',
      label: 'Valor en riesgo',
      value: formatoMoneda(r.valorEnRiesgo),
      sub: `${r.revisionConStock + r.revisionInactivos} con stock y > ${meta.value.diasRevision} días`,
      tone: 'danger',
    },
    {
      key: 'atorados',
      icon: '🧱',
      label: 'Atorados',
      value: String(r.atorados),
      sub: `${formatoMoneda(valorClase('ATORADO'))} inmovilizado`,
      tone: 'danger',
    },
    {
      key: 'agotados',
      icon: '📦',
      label: 'Agotados con demanda',
      value: String(r.agotados),
      sub: 'Sin stock, pero con ventas',
      tone: 'warning',
    },
    {
      key: 'revision',
      icon: '🔎',
      label: 'En revisión',
      value: String(r.revisionTotal),
      sub: `${pendientesRevision.value} pendientes de decisión`,
      tone: 'warning',
    },
    {
      key: 'ventas',
      icon: '📈',
      label: 'Ventas en la ventana',
      value: formatoMoneda(r.ventasValorVentana),
      sub: `${r.productosConVentas} productos con salida`,
      tone: 'success',
    },
  ];
});

const resumenFrase = computed(() => {
  const r = resumen.value;
  if (!r.totalProductos) return 'Todavía no hay productos para analizar en esta sucursal.';
  const partes: string[] = [];
  if (r.atorados) partes.push(`${r.atorados} atorados`);
  if (r.lentos) partes.push(`${r.lentos} lentos`);
  if (r.agotados) partes.push(`${r.agotados} agotados`);
  if (r.sinDatos) partes.push(`${r.sinDatos} sin datos`);
  const detalle = partes.length ? partes.join(', ') : 'sin alertas de rotación';
  return `De ${r.totalProductos} productos, hay ${detalle}. El costo detenido en la cola de revisión es ${formatoMoneda(r.valorEnRiesgo)}.`;
});

const productosFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  const orden: Record<Clasificacion, number> = {
    ATORADO: 0,
    LENTO: 1,
    AGOTADO: 2,
    SIN_DATOS: 3,
    MEDIO: 4,
    RAPIDO: 5,
    INACTIVO: 6,
  };

  return productos.value
    .filter(p => {
      if (filtroClasificacion.value !== 'TODAS' && p.clasificacion !== filtroClasificacion.value) return false;
      if (filtroAbc.value !== 'TODOS' && p.abc !== filtroAbc.value) return false;
      if (filtroEstado.value === 'ACTIVOS' && p.inactivo) return false;
      if (filtroEstado.value === 'INACTIVOS' && !p.inactivo) return false;
      if (!q) return true;
      return [p.nombre, p.categoria, p.proveedor]
        .some(v => (v || '').toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const oa = orden[a.clasificacion] ?? 9;
      const ob = orden[b.clasificacion] ?? 9;
      if (oa !== ob) return oa - ob;
      return (b.valorInmovilizado || 0) - (a.valorInmovilizado || 0);
    });
});

const revisionFiltrada = computed(() => {
  if (revisionTab.value === 'CON_STOCK') return revisionConStock.value;
  if (revisionTab.value === 'SIN_STOCK') return revisionSinStock.value;
  return revisionInactivos.value;
});

const pendientesRevision = computed(() =>
  productos.value.filter(p => p.enRevision && p.revisionEstado === 'PENDIENTE').length
);

/* ------------------------------------------------------------------ */
/* Salidas de efectivo (bitácora de egresos de caja)                   */
/* ------------------------------------------------------------------ */

const ETIQUETAS_TIPO_CASH: Record<string, string> = {
  PROVEEDOR: '🚚 Posible proveedor',
  SERVICIO: '🧾 Servicio',
  INSUMO: '🥬 Insumo',
  PRODUCTO: '🍬 Producto',
  NOMINA: '👤 Nómina',
  MOVIMIENTO_INTERNO: '🔁 Movimiento interno',
  OTRO: 'Otro',
};

function etiquetaTipoCash(tipo: string): string {
  return ETIQUETAS_TIPO_CASH[tipo] || tipo;
}

const salidasFiltradas = computed(() => {
  const q = cashBusqueda.value.trim().toLowerCase();
  return salidasEfectivo.value.items.filter(s => {
    if (cashSoloRepetidas.value && s.ocurrencias < 2) return false;
    if (cashSoloProveedores.value && !s.posibleProveedor) return false;
    if (!q) return true;
    return [s.descripcion, s.clave, s.tipo, ...s.productosRelacionados]
      .some(v => (v || '').toLowerCase().includes(q));
  });
});

const ayudaRevision = computed(() => {
  if (revisionTab.value === 'CON_STOCK') {
    return 'Dinero detenido que todavía se puede recuperar con promoción, ajuste de precio o devolución.';
  }
  if (revisionTab.value === 'SIN_STOCK') {
    return 'No reponer hasta validar si la demanda sigue existiendo.';
  }
  return 'Productos dados de baja. Se muestran aparte para que no se confundan con los activos sin stock.';
});

/* ------------------------------------------------------------------ */
/* Acciones                                                           */
/* ------------------------------------------------------------------ */

function valorClase(key: Clasificacion): number {
  return productos.value
    .filter(p => p.clasificacion === key)
    .reduce((suma, p) => suma + (p.valorInmovilizado || 0), 0);
}

function toggleClasificacion(key: Clasificacion) {
  filtroClasificacion.value = filtroClasificacion.value === key ? 'TODAS' : key;
}

function toggleDetalle(id: number) {
  detalleAbierto.value = detalleAbierto.value === id ? null : id;
}

function limpiarFiltros() {
  busqueda.value = '';
  filtroClasificacion.value = 'TODAS';
  filtroAbc.value = 'TODOS';
  filtroEstado.value = 'TODOS';
}

function cambiarDiasRevision(evento: Event) {
  const valor = Number((evento.target as HTMLSelectElement).value);
  cargar(valor, true);
}

async function guardar(item: ProductoInteligencia) {
  guardandoRevision.value = item.idProducto;
  mensajeRevision.value = '';
  const ok = await guardarRevision(item);
  if (!ok) mensajeRevision.value = 'No se pudo guardar la decisión. Intenta de nuevo.';
  guardandoRevision.value = null;
}

async function reiniciar(item: ProductoInteligencia) {
  guardandoRevision.value = item.idProducto;
  mensajeRevision.value = '';
  const ok = await reiniciarRevision(item);
  if (!ok) mensajeRevision.value = 'No se pudo reiniciar la revisión. Intenta de nuevo.';
  guardandoRevision.value = null;
}

function labelClasificacion(clasificacion: string): string {
  const etiquetas: Record<string, string> = {
    RAPIDO: 'Rápido',
    MEDIO: 'Medio',
    LENTO: 'Lento',
    ATORADO: 'Atorado',
    AGOTADO: 'Agotado',
    SIN_DATOS: 'Sin datos',
    INACTIVO: 'Inactivo',
  };
  return etiquetas[clasificacion] || clasificacion;
}

function cobertura(dias: number | null | undefined): string {
  if (dias == null || dias < 0) return '—';
  if (dias > 365) return '365+ d';
  return `${dias} d`;
}

function diasSinMovimiento(dias: number | null | undefined): string {
  if (dias == null) return 'Nunca';
  return `${dias} d`;
}

/**
 * Explica el valor con las unidades correctas. En gramaje el stock se
 * convierte a kg para poder multiplicarlo por el costo/precio por kg.
 */
function formulaValor(p: ProductoInteligencia, tipo: 'costo' | 'venta'): string {
  const precio = tipo === 'costo' ? p.precioCosto : p.precioVenta;
  const total = tipo === 'costo' ? p.valorInmovilizado : p.valorVentaPotencial;
  if (p.gramaje) {
    // En la fórmula siempre mostramos kg, aunque el stock sea menor a 1000 g,
    // para que la multiplicación por el precio/kg sea coherente.
    return `${formatoNumero(p.stock / 1000, 3)} kg × ${formatoMoneda(precio)}/kg = ${formatoMoneda(total)}`;
  }
  return `${formatoCantidad(p.stock, false)} × ${formatoMoneda(precio)}/ud = ${formatoMoneda(total)}`;
}

function formulaCobertura(p: ProductoInteligencia): string {
  if (!p.consumoDiario || p.consumoDiario <= 0) {
    return `Sin consumo: hay ${formatoCantidad(p.stock, p.gramaje)} en stock y no se puede calcular cobertura`;
  }
  // En gramaje el stock y el consumo están en gramos: no se convierte a kg
  // para dividir, solo se usa kg al mostrar dinero.
  const unidad = p.gramaje ? 'g' : 'u';
  const dias = p.stock / p.consumoDiario;
  return `${formatoNumero(p.stock, 0)} ${unidad} ÷ ${formatoNumero(p.consumoDiario, 3)} ${unidad}/día = ${formatoNumero(dias, 0)} d (se muestra ${cobertura(p.diasCobertura)})`;
}

function exportarCsv() {
  const filas = productosFiltrados.value;
  const encabezados = [
    'Producto', 'Categoría', 'Proveedor', 'Estatus', 'Unidad stock', 'Unidad precio',
    'Stock', 'Costo', 'Precio venta', 'Valor inmovilizado', 'Ventas 7d', 'Ventas 30d',
    'Ventas 84d', 'Consumo diario', 'Cobertura (días)', 'Días sin movimiento',
    'Clasificación', 'ABC', 'Motivo', 'Recomendación', 'Revisión',
  ];
  const escapar = (valor: unknown) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
  const lineas = [encabezados.join(',')];

  for (const p of filas) {
    lineas.push([
      p.nombre,
      p.categoria,
      p.proveedor,
      p.estatus,
      p.gramaje ? 'g' : 'ud',
      p.gramaje ? 'kg' : 'ud',
      p.stock,
      p.precioCosto,
      p.precioVenta,
      p.valorInmovilizado,
      p.ventas7d,
      p.ventas30d,
      p.ventas84d,
      p.consumoDiario,
      p.diasCobertura,
      p.diasSinMovimiento ?? 'Nunca',
      labelClasificacion(p.clasificacion),
      p.abc === 'SIN_VENTAS' ? '' : p.abc,
      p.motivo,
      p.recomendacion,
      p.revisionEstado,
    ].map(escapar).join(','));
  }

  const blob = new Blob(['\uFEFF' + lineas.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `inteligencia-inventario-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<template>
  <div class="ii-panel">
    <!-- ============================================================ -->
    <!-- ENCABEZADO                                                    -->
    <!-- ============================================================ -->
    <header class="ii-header">
      <div class="ii-header-left">
        <div class="ii-icon">🧠</div>
        <div class="ii-header-text">
          <h3 class="ii-title">Inteligencia de Inventario</h3>
          <p class="ii-subtitle">
            Todo se calcula con la bitácora de movimientos. Cada número tiene una regla visible.
          </p>
          <div class="ii-meta">
            <span class="ii-chip">📅 Ventana {{ meta.ventanaDias }} días</span>
            <span class="ii-chip">📚 Historial {{ meta.diasHistorial }} días</span>
            <span :class="['ii-chip', meta.historialSuficiente ? 'chip-ok' : 'chip-warn']">
              {{ meta.historialSuficiente ? '✅ Datos suficientes' : '⚠️ Historial insuficiente' }}
            </span>
            <span class="ii-chip">🔎 Revisión &gt; {{ meta.diasRevision }} días</span>
            <span v-if="hayGramaje" class="ii-chip">⚖️ Gramaje: stock en g, precio por kg</span>
            <span class="ii-chip">🕒 {{ ultimaActualizacion || 'Sin actualizar' }}</span>
          </div>
        </div>
      </div>
      <div class="ii-header-actions">
        <label class="ii-dias">
          <span>Revisión</span>
          <select :value="meta.diasRevision" @change="cambiarDiasRevision" :disabled="cargando">
            <option :value="30">30 días</option>
            <option :value="60">60 días</option>
            <option :value="90">90 días</option>
          </select>
        </label>
        <button class="ii-refresh" type="button" @click="cargar(diasRevision, true)" :disabled="cargando">
          {{ cargando ? '…' : '↻' }}
        </button>
      </div>
    </header>

    <!-- ============================================================ -->
    <!-- ESTADOS GLOBALES                                              -->
    <!-- ============================================================ -->
    <div v-if="error" class="ii-alert ii-alert-error">
      <strong>No se pudo cargar el reporte.</strong>
      <span>{{ error }}</span>
      <button type="button" @click="cargar(diasRevision, true)">Reintentar</button>
    </div>

    <div v-if="cargando && !reporte" class="ii-loading">
      <div class="ii-spinner"></div>
      <span>Calculando inteligencia de inventario…</span>
    </div>

    <template v-if="reporte">
      <div class="ii-summary-sentence">{{ resumenFrase }}</div>

      <div v-if="!meta.historialSuficiente" class="ii-alert ii-alert-warn">
        <strong>Historial insuficiente:</strong>
        <span>
          la bitácora tiene {{ meta.diasHistorial }} días y se necesitan al menos {{ meta.diasMinimos }}.
          Los productos sin datos suficientes se muestran como «Sin datos» en lugar de inventar una clasificación.
        </span>
      </div>

      <!-- ========================================================== -->
      <!-- KPIs                                                       -->
      <!-- ========================================================== -->
      <section class="ii-kpis">
        <article v-for="k in kpis" :key="k.key" :class="['ii-kpi', 'kpi-' + k.tone]">
          <span class="ii-kpi-icon">{{ k.icon }}</span>
          <div class="ii-kpi-body">
            <span class="ii-kpi-label">{{ k.label }}</span>
            <strong class="ii-kpi-value">{{ k.value }}</strong>
            <small class="ii-kpi-sub">{{ k.sub }}</small>
          </div>
        </article>
      </section>

      <!-- ========================================================== -->
      <!-- REGLAS                                                     -->
      <!-- ========================================================== -->
      <section class="ii-card">
        <button class="ii-card-toggle" type="button" @click="reglasAbiertas = !reglasAbiertas">
          <span class="ii-card-title">📐 ¿Cómo se calcula? Reglas del sistema</span>
          <span class="ii-card-hint">{{ reglasAbiertas ? 'Ocultar' : `Ver las ${reglas.length} reglas` }}</span>
        </button>
        <div v-if="reglasAbiertas" class="ii-rules">
          <p class="ii-rules-intro">
            Estas son las reglas que el motor aplicó a <strong>esta</strong> sucursal. No son documentación
            aparte: si un número cambia, cambia porque una de estas reglas lo movió.
          </p>
          <div class="ii-rules-grid">
            <article
              v-for="r in reglas"
              :key="r.codigo"
              :class="['ii-rule', 'tipo-' + r.tipo.toLowerCase()]"
            >
              <div class="ii-rule-top">
                <span class="ii-rule-code">{{ r.codigo }}</span>
                <span class="ii-rule-type">{{ r.tipo }}</span>
              </div>
              <h4>{{ r.nombre }}</h4>
              <p>{{ r.descripcion }}</p>
              <div v-if="r.formula" class="ii-formula"><code>{{ r.formula }}</code></div>
              <div v-if="r.umbral" class="ii-threshold"><strong>Umbral:</strong> {{ r.umbral }}</div>
            </article>
          </div>
        </div>
      </section>

      <!-- ========================================================== -->
      <!-- CLASIFICACIÓN                                              -->
      <!-- ========================================================== -->
      <section class="ii-card">
        <header class="ii-card-head">
          <div>
            <h4>Clasificación de rotación</h4>
            <p>Haz clic en una tarjeta para filtrar la tabla. El valor es el costo inmovilizado de esa clase.</p>
          </div>
          <span class="ii-count-pill">{{ productos.length }} productos</span>
        </header>
        <div class="ii-class-grid">
          <button
            v-for="c in clasificaciones"
            :key="c.key"
            type="button"
            :class="['ii-class-card', c.tone, { active: filtroClasificacion === c.key }]"
            @click="toggleClasificacion(c.key)"
          >
            <span class="ii-class-icon">{{ c.icon }}</span>
            <span class="ii-class-body">
              <span class="ii-class-name">{{ c.label }}</span>
              <strong class="ii-class-count">{{ c.count }}</strong>
              <small class="ii-class-value">{{ formatoMoneda(c.valor) }}</small>
            </span>
            <span class="ii-class-def">{{ c.definicion }}</span>
          </button>
        </div>
      </section>

      <!-- ========================================================== -->
      <!-- TABLA DETALLE                                              -->
      <!-- ========================================================== -->
      <section class="ii-card">
        <header class="ii-card-head">
          <div>
            <h4>Detalle por producto</h4>
            <p>Haz clic en una fila para ver la fórmula completa y los datos que la alimentaron.</p>
          </div>
          <button class="ii-btn-ghost" type="button" @click="exportarCsv">⬇ Exportar CSV</button>
        </header>

        <div class="ii-filters">
          <input
            v-model="busqueda"
            class="ii-search"
            type="search"
            placeholder="Buscar producto, categoría o proveedor…"
          />
          <select v-model="filtroAbc" class="ii-select">
            <option value="TODOS">ABC: todos</option>
            <option value="A">ABC: A</option>
            <option value="B">ABC: B</option>
            <option value="C">ABC: C</option>
            <option value="SIN_VENTAS">ABC: sin ventas</option>
          </select>
          <select v-model="filtroEstado" class="ii-select">
            <option value="TODOS">Estatus: todos</option>
            <option value="ACTIVOS">Solo activos</option>
            <option value="INACTIVOS">Solo inactivos</option>
          </select>
          <button
            v-if="filtroClasificacion !== 'TODAS' || filtroAbc !== 'TODOS' || filtroEstado !== 'TODOS' || busqueda"
            class="ii-btn-ghost"
            type="button"
            @click="limpiarFiltros"
          >
            Limpiar
          </button>
          <span class="ii-count">{{ productosFiltrados.length }} de {{ productos.length }}</span>
        </div>

        <p v-if="hayGramaje" class="ii-unit-note ii-unit-note-table">
          ⚖️ <strong>Gramaje:</strong> el stock y las ventas se manejan en gramos y aquí se muestran
          en g o kg; el costo y el precio de venta son por kilogramo. La columna Valor ya está
          convertida a dinero con <code>gramos ÷ 1000 × precio/kg</code>.
        </p>

        <div class="ii-table-wrap">
          <table class="ii-table">
            <thead>
              <tr>
                <th class="ii-expand"></th>
                <th>Producto</th>
                <th class="ii-col-opt">Categoría</th>
                <th class="num">Stock</th>
                <th class="num ii-col-opt">Costo</th>
                <th class="num">Valor</th>
                <th class="num ii-col-opt">Ventas 30d</th>
                <th class="num ii-col-opt">Consumo/día</th>
                <th class="num">Cobertura</th>
                <th class="num">Sin mover</th>
                <th>Rotación</th>
                <th class="ii-col-opt">ABC</th>
                <th>Recomendación</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="p in productosFiltrados" :key="p.idProducto">
                <tr
                  :class="['ii-row', { 'ii-row-open': detalleAbierto === p.idProducto }]"
                  @click="toggleDetalle(p.idProducto)"
                >
                  <td class="ii-expand">{{ detalleAbierto === p.idProducto ? '▾' : '▸' }}</td>
                  <td class="ii-prod">
                    <strong>
                      {{ p.nombre }}
                      <span v-if="p.gramaje" class="ii-gramaje-badge" title="Stock y ventas en gramos; costo y venta por kilogramo">⚖️ kg</span>
                    </strong>
                    <small>{{ p.proveedor || 'Sin proveedor' }}</small>
                    <small class="ii-prod-price">{{ formatoPrecioUnitario(p.precioCosto, p.gramaje) }}</small>
                  </td>
                  <td class="ii-col-opt">{{ p.categoria || 'Sin categoría' }}</td>
                  <td class="num">{{ formatoCantidad(p.stock, p.gramaje) }}</td>
                  <td class="num ii-col-opt" :title="p.gramaje ? 'Costo por kilogramo' : 'Costo por unidad'">
                    {{ formatoPrecioUnitario(p.precioCosto, p.gramaje) }}
                  </td>
                  <td class="num">{{ formatoMoneda(p.valorInmovilizado) }}</td>
                  <td class="num ii-col-opt">{{ formatoCantidad(p.ventas30d, p.gramaje) }}</td>
                  <td class="num ii-col-opt">{{ formatoCantidad(p.consumoDiario, p.gramaje, 3) }}/d</td>
                  <td class="num">{{ cobertura(p.diasCobertura) }}</td>
                  <td class="num">{{ diasSinMovimiento(p.diasSinMovimiento) }}</td>
                  <td>
                    <span :class="['ii-badge', p.clasificacion.toLowerCase()]">
                      {{ labelClasificacion(p.clasificacion) }}
                    </span>
                    <span v-if="p.topSeller" class="ii-fire" title="Top seller: demanda alta y reciente en la tienda">🔥</span>
                  </td>
                  <td class="ii-col-opt">
                    <span :class="['ii-abc', p.abc.toLowerCase()]">
                      {{ p.abc === 'SIN_VENTAS' ? '—' : p.abc }}
                    </span>
                  </td>
                  <td class="ii-rec">{{ p.recomendacion }}</td>
                </tr>

                <tr v-if="detalleAbierto === p.idProducto" class="ii-detail-row">
                  <td colspan="13">
                    <div class="ii-detail">
                      <div class="ii-detail-grid">
                        <div><span>Ventas 7d</span><strong>{{ formatoCantidad(p.ventas7d, p.gramaje) }}</strong></div>
                        <div><span>Ventas 30d</span><strong>{{ formatoCantidad(p.ventas30d, p.gramaje) }}</strong></div>
                        <div><span>Ventas 84d</span><strong>{{ formatoCantidad(p.ventas84d, p.gramaje) }}</strong></div>
                        <div><span>Días con venta</span><strong>{{ p.diasConVenta }}</strong></div>
                        <div><span>Última salida</span><strong>{{ formatoFecha(p.ultimaSalida) }}</strong></div>
                        <div><span>Días sin mover</span><strong>{{ diasSinMovimiento(p.diasSinMovimiento) }}</strong></div>
                        <div><span>Consumo ponderado</span><strong>{{ formatoCantidad(p.consumoDiario, p.gramaje, 3) }}/d</strong></div>
                        <div><span>Consumo simple</span><strong>{{ formatoCantidad(p.consumoDiarioSimple, p.gramaje, 3) }}/d</strong></div>
                        <div><span>Cobertura</span><strong>{{ cobertura(p.diasCobertura) }}</strong></div>
                        <div><span>Estabilidad (CV)</span><strong>{{ formatoNumero(p.coeficienteVariacion, 2) }}</strong></div>
                        <div><span>ABC</span><strong>{{ p.abc === 'SIN_VENTAS' ? 'Sin ventas' : p.abc }}</strong></div>
                        <div><span>Participación</span><strong>{{ formatoPorcentaje(p.participacionVentas) }}</strong></div>
                      </div>

                      <div class="ii-detail-explain">
                        <div>
                          <h5>¿Cómo se obtuvo la clasificación?</h5>
                          <p><strong>{{ labelClasificacion(p.clasificacion) }}:</strong> {{ p.motivo }}</p>
                          <p>
                            <strong>Cobertura:</strong> {{ formulaCobertura(p) }}.
                          </p>
                          <p>
                            <strong>Última salida:</strong> {{ formatoFecha(p.ultimaSalida) }}
                            ({{ diasSinMovimiento(p.diasSinMovimiento) }} sin moverse).
                          </p>
                          <p>
                            <strong>ABC:</strong>
                            {{ p.abc === 'SIN_VENTAS'
                              ? 'Sin ventas en la ventana.'
                              : `participa con ${formatoPorcentaje(p.participacionVentas)} del valor de venta; acumulado ${formatoPorcentaje(p.participacionAcumulada)}.` }}
                          </p>
                        </div>
                        <div>
                          <h5>Datos del producto</h5>
                          <p><strong>Costo:</strong> {{ formatoPrecioUnitario(p.precioCosto, p.gramaje) }} · <strong>Venta:</strong> {{ formatoPrecioUnitario(p.precioVenta, p.gramaje) }}</p>
                          <p><strong>Mínimo:</strong> {{ formatoCantidad(p.cantidadMin, p.gramaje) }} · <strong>Máximo:</strong> {{ formatoCantidad(p.cantidadMax, p.gramaje) }}</p>
                          <p><strong>Valor inmovilizado:</strong> {{ formatoMoneda(p.valorInmovilizado) }}</p>
                          <p class="ii-formula-line">{{ formulaValor(p, 'costo') }}</p>
                          <p><strong>Valor de venta potencial:</strong> {{ formatoMoneda(p.valorVentaPotencial) }}</p>
                          <p class="ii-formula-line">{{ formulaValor(p, 'venta') }}</p>
                          <p><strong>Estatus:</strong> {{ p.inactivo ? 'Inactivo' : 'Activo' }} · <strong>Gramaje:</strong> {{ p.gramaje ? 'Sí (stock en g, precio por kg)' : 'No (piezas)' }}</p>
                          <p><strong>Historial usado:</strong> {{ p.diasHistorial }} días{{ p.usaFallback ? ' (insuficiente)' : '' }}</p>
                          <p v-if="p.gramaje" class="ii-unit-note">
                            ⚖️ El stock y las ventas están en gramos; el costo y la venta son por
                            kilogramo. El dinero se calcula con <code>gramos ÷ 1000 × precio/kg</code>.
                          </p>
                        </div>
                      </div>

                      <div class="ii-detail-action">
                        <strong>Recomendación:</strong> {{ p.recomendacion }}
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div v-if="productosFiltrados.length === 0" class="ii-empty">
          No hay productos con esos filtros.
        </div>
      </section>

      <!-- ========================================================== -->
      <!-- COLA DE REVISIÓN                                           -->
      <!-- ========================================================== -->
      <section class="ii-card">
        <header class="ii-card-head">
          <div>
            <h4>Cola de revisión: más de {{ meta.diasRevision }} días sin movimiento</h4>
            <p>
              Entra si nunca se vendió o si la última salida fue hace más de {{ meta.diasRevision }} días.
              Aquí se guarda la decisión para que el producto salga de «pendiente».
            </p>
          </div>
        </header>

        <div class="ii-tabs">
          <button
            type="button"
            :class="['ii-tab', { active: revisionTab === 'CON_STOCK' }]"
            @click="revisionTab = 'CON_STOCK'"
          >
            Con stock <span>{{ revisionConStock.length }}</span>
          </button>
          <button
            type="button"
            :class="['ii-tab', { active: revisionTab === 'SIN_STOCK' }]"
            @click="revisionTab = 'SIN_STOCK'"
          >
            Sin stock <span>{{ revisionSinStock.length }}</span>
          </button>
          <button
            type="button"
            :class="['ii-tab', { active: revisionTab === 'INACTIVO' }]"
            @click="revisionTab = 'INACTIVO'"
          >
            Inactivos <span>{{ revisionInactivos.length }}</span>
          </button>
        </div>

        <p class="ii-tab-help">{{ ayudaRevision }}</p>
        <div v-if="mensajeRevision" class="ii-alert ii-alert-error">{{ mensajeRevision }}</div>

        <div v-if="revisionFiltrada.length === 0" class="ii-empty">
          No hay productos en este grupo. 🎉
        </div>

        <div class="ii-review-list">
          <article v-for="item in revisionFiltrada" :key="item.idProducto" class="ii-review-item">
            <div class="ii-review-main">
              <div class="ii-review-name">
                <strong>
                  {{ item.nombre }}
                  <span v-if="item.gramaje" class="ii-gramaje-badge" title="Stock y ventas en gramos; costo y venta por kilogramo">⚖️ kg</span>
                </strong>
                <span class="ii-review-meta">
                  {{ item.categoria || 'Sin categoría' }} · {{ item.proveedor || 'Sin proveedor' }}
                </span>
              </div>
              <div class="ii-review-numbers">
                <span><b>{{ formatoCantidad(item.stock, item.gramaje) }}</b> stock</span>
                <span><b>{{ formatoMoneda(item.valorInmovilizado) }}</b> inmovilizado</span>
                <span><b>{{ diasSinMovimiento(item.diasSinMovimiento) }}</b> sin mover</span>
                <span><b>{{ formatoFecha(item.ultimaSalida) }}</b> última salida</span>
                <span :class="['ii-badge', item.clasificacion.toLowerCase()]">
                  {{ labelClasificacion(item.clasificacion) }}
                </span>
              </div>
              <p class="ii-review-suggestion">{{ item.motivo }}</p>
              <p class="ii-review-suggestion ii-review-action-text">{{ item.recomendacion }}</p>
              <span v-if="item.revisionActualizada" class="ii-review-updated">
                Última decisión: {{ formatoFecha(item.revisionActualizada) }}
              </span>
            </div>

            <div class="ii-review-controls">
              <label>
                <span>Estado</span>
                <select
                  v-model="item.revisionEstado"
                  :disabled="guardandoRevision === item.idProducto"
                  @change="guardar(item)"
                >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_REVISION">En revisión</option>
                  <option value="RESUELTO">Resuelto</option>
                </select>
              </label>
              <label>
                <span>Motivo</span>
                <select
                  v-model="item.revisionMotivo"
                  :disabled="guardandoRevision === item.idProducto"
                  @change="guardar(item)"
                >
                  <option :value="null">Sin motivo</option>
                  <option value="ESTACIONAL">Estacional</option>
                  <option value="SIN_DEMANDA">Sin demanda</option>
                  <option value="STOCK_FISICO">Stock físico</option>
                  <option value="PROVEEDOR">Proveedor</option>
                  <option value="DESCONTINUADO">Descontinuado</option>
                  <option value="OTRO">Otro</option>
                </select>
              </label>
              <label class="ii-review-note">
                <span>Nota</span>
                <input
                  v-model="item.revisionNota"
                  :disabled="guardandoRevision === item.idProducto"
                  maxlength="500"
                  placeholder="Ej: se pidió al proveedor…"
                  @change="guardar(item)"
                />
              </label>
              <button
                class="ii-btn-ghost"
                type="button"
                :disabled="guardandoRevision === item.idProducto"
                @click="reiniciar(item)"
              >
                Reiniciar
              </button>
              <span v-if="guardandoRevision === item.idProducto" class="ii-saving">Guardando…</span>
            </div>
          </article>
        </div>
      </section>

      <!-- ========================================================== -->
      <!-- CALIDAD DE DATOS                                           -->
      <!-- ========================================================== -->
      <section class="ii-card">
        <header class="ii-card-head">
          <div>
            <h4>Calidad de datos</h4>
            <p>
              Estos problemas hacen que el análisis quede incompleto. La cantidad es el número de
              productos afectados y los ejemplos son los primeros de la lista.
            </p>
          </div>
        </header>
        <div v-if="calidad.length === 0" class="ii-empty">Sin problemas de calidad detectados. 🎉</div>
        <div class="ii-quality-grid">
          <article
            v-for="q in calidad"
            :key="q.codigo"
            :class="['ii-quality', 'sev-' + q.severidad.toLowerCase()]"
          >
            <div class="ii-quality-head">
              <span class="ii-quality-count">{{ q.cantidad }}</span>
              <span :class="['ii-sev', q.severidad.toLowerCase()]">{{ q.severidad }}</span>
            </div>
            <h5>{{ q.titulo }}</h5>
            <p>{{ q.descripcion }}</p>
            <small v-if="q.ejemplos.length">Ejemplos: {{ q.ejemplos.join(', ') }}</small>
          </article>
        </div>
      </section>

      <!-- ========================================================== -->
      <!-- MOVIMIENTOS                                                -->
      <!-- ========================================================== -->
      <section class="ii-card">
        <header class="ii-card-head">
          <div>
            <h4>Movimientos de la bitácora</h4>
            <p>
              La bitácora registra cada cambio de stock. Las salidas son ventas, ambulante e historial;
              las entradas son pedidos, devoluciones y ajustes positivos.
            </p>
          </div>
        </header>
        <div v-if="movimientos.length === 0" class="ii-empty">La bitácora todavía no tiene movimientos.</div>
        <div class="ii-table-wrap">
          <table class="ii-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Qué significa</th>
                <th class="num">Total</th>
                <th class="num">Salidas</th>
                <th class="num">Entradas</th>
                <th>Primera</th>
                <th>Última</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in movimientos" :key="m.tipo">
                <td><strong>{{ m.etiqueta }}</strong><br /><small>{{ m.tipo }}</small></td>
                <td>{{ m.descripcion }}</td>
                <td class="num">{{ m.total }}</td>
                <td class="num">{{ m.salidas }}</td>
                <td class="num">{{ m.entradas }}</td>
                <td>{{ formatoFecha(m.primeraFecha) }}</td>
                <td>{{ formatoFecha(m.ultimaFecha) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ========================================================== -->
      <!-- SALIDAS DE EFECTIVO                                        -->
      <!-- ========================================================== -->
      <section class="ii-card">
        <header class="ii-card-head">
          <div>
            <h4>💵 Salidas de efectivo</h4>
            <p>
              Bitácora de egresos de caja (últimos {{ salidasEfectivo.ventanaDias }} días). Las
              descripciones que se repiten se agrupan: si parecen de un proveedor se marcan,
              se calcula el día que suelen caer y qué productos se vendieron esos días.
            </p>
          </div>
        </header>

        <div v-if="salidasEfectivo.totalEgresos === 0" class="ii-empty">
          Todavía no hay egresos de caja registrados en la ventana analizada.
        </div>

        <template v-else>
          <div class="ii-cash-chips">
            <div class="ii-cash-chip">
              <span class="ii-cash-chip-label">Egresos</span>
              <strong>{{ salidasEfectivo.totalEgresos }}</strong>
            </div>
            <div class="ii-cash-chip">
              <span class="ii-cash-chip-label">Monto total</span>
              <strong>{{ formatoMoneda(salidasEfectivo.totalMonto) }}</strong>
            </div>
            <div class="ii-cash-chip">
              <span class="ii-cash-chip-label">Patrones repetidos</span>
              <strong>{{ salidasEfectivo.descripcionesRepetidas }}</strong>
            </div>
            <div class="ii-cash-chip ii-cash-chip-proveedor">
              <span class="ii-cash-chip-label">Posibles proveedores</span>
              <strong>{{ salidasEfectivo.posiblesProveedores }}</strong>
            </div>
          </div>

          <div class="ii-filters">
            <input
              v-model="cashBusqueda"
              class="ii-search"
              type="search"
              placeholder="Buscar descripción, tipo o producto…"
            />
            <label class="ii-cash-toggle">
              <input v-model="cashSoloRepetidas" type="checkbox" /> Solo repetidas
            </label>
            <label class="ii-cash-toggle">
              <input v-model="cashSoloProveedores" type="checkbox" /> Posibles proveedores
            </label>
            <button
              v-if="cashSoloRepetidas || cashSoloProveedores || cashBusqueda"
              class="ii-btn-ghost"
              type="button"
              @click="cashSoloRepetidas = false; cashSoloProveedores = false; cashBusqueda = ''"
            >
              Limpiar
            </button>
            <span class="ii-count">{{ salidasFiltradas.length }} de {{ salidasEfectivo.items.length }}</span>
          </div>

          <div v-if="salidasFiltradas.length === 0" class="ii-empty">Ningún egreso coincide con el filtro.</div>
          <div v-else class="ii-table-wrap ii-cash-table-wrap">
            <table class="ii-table ii-cash-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th class="num">Veces</th>
                  <th class="num">Total</th>
                  <th class="num ii-col-opt">Promedio</th>
                  <th>Último</th>
                  <th class="ii-col-opt">Días</th>
                  <th>Suele caer</th>
                  <th class="ii-col-opt">Productos ese día</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in salidasFiltradas" :key="`${s.clave}-${i}`" class="ii-cash-row">
                  <td class="ii-prod">
                    <strong>{{ s.descripcion }}</strong>
                    <small :class="['ii-cash-tipo', 'tipo-' + s.tipo.toLowerCase()]">
                      {{ etiquetaTipoCash(s.tipo) }}
                    </small>
                  </td>
                  <td class="num">
                    <span :class="['ii-cash-ocurrencias', { rep: s.ocurrencias >= 2 }]">{{ s.ocurrencias }}</span>
                  </td>
                  <td class="num">{{ formatoMoneda(s.total) }}</td>
                  <td class="num ii-col-opt">{{ formatoMoneda(s.promedio) }}</td>
                  <td class="ii-cash-ultimo">
                    {{ formatoMoneda(s.ultimoMonto) }}
                    <small>{{ formatoFecha(s.ultimaFecha) }}</small>
                  </td>
                  <td class="ii-col-opt">
                    <span v-for="d in s.diasSemana" :key="d" class="ii-cash-dia">{{ formatoDia(d) }}</span>
                  </td>
                  <td class="ii-cash-probable">
                    <template v-if="s.diaProbable">
                      <strong>{{ formatoDia(s.diaProbable) }}</strong>
                      <span class="ii-cash-confianza">{{ formatoNumero(s.confianzaDia, 0) }}%</span>
                      <small v-if="s.proximaFechaProbable">próximo {{ formatoFecha(s.proximaFechaProbable) }}</small>
                    </template>
                    <span v-else>—</span>
                  </td>
                  <td class="ii-col-opt ii-cash-prod">
                    <span v-if="s.productosRelacionados.length === 0">—</span>
                    <span v-for="pr in s.productosRelacionados" :key="pr" class="ii-cash-pill">{{ pr }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="ii-cash-note">
            ⚠️ Es una lectura operativa de la caja: sirve para detectar a quién se le paga
            seguido, qué día suele llegar la mercancía y qué productos se mueven ese mismo
            día. Confirma con el proveedor antes de ajustar el pedido sugerido.
          </p>
        </template>
      </section>

      <!-- ========================================================== -->
      <!-- RECOMENDACIONES                                            -->
      <!-- ========================================================== -->
      <section class="ii-card">
        <header class="ii-card-head">
          <div>
            <h4>Recomendaciones</h4>
            <p>
              Acciones ordenadas por severidad e impacto económico. Se generan solo cuando el reporte
              encuentra el problema.
            </p>
          </div>
        </header>
        <div v-if="recomendaciones.length === 0" class="ii-empty">No hay recomendaciones pendientes. 🎉</div>
        <div class="ii-rec-list">
          <article
            v-for="r in recomendaciones"
            :key="r.codigo"
            :class="['ii-rec-card', 'sev-' + r.severidad.toLowerCase()]"
          >
            <div class="ii-rec-head">
              <span :class="['ii-sev', r.severidad.toLowerCase()]">{{ r.severidad }}</span>
              <h5>{{ r.titulo }}</h5>
              <span v-if="r.impacto > 0" class="ii-rec-impact">{{ formatoMoneda(r.impacto) }}</span>
            </div>
            <p>{{ r.detalle }}</p>
            <p class="ii-rec-action"><strong>Acción:</strong> {{ r.accion }}</p>
            <small>{{ r.productos }} producto(s) involucrado(s)</small>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* ================================================================== */
/* BASE                                                               */
/* ================================================================== */

.ii-panel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.25rem;
  color: var(--color-text-primary);
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-accent) 45%, transparent) transparent;
}

/*
 * Sin esto, los hijos directos del flex column se encogen para caber en el
 * alto del panel (flex-shrink: 1 por defecto). Las tarjetas terminaban con
 * ~2px de alto, sin scroll y con todo pegado. El panel debe desbordar y
 * desplazarse; las secciones conservan su altura natural.
 */
.ii-panel > * {
  flex: 0 0 auto;
}

.ii-panel::-webkit-scrollbar,
.ii-review-list::-webkit-scrollbar,
.ii-table-wrap::-webkit-scrollbar {
  width: 8px;
  height: 8px;
  display: block;
}

.ii-panel::-webkit-scrollbar-track,
.ii-review-list::-webkit-scrollbar-track,
.ii-table-wrap::-webkit-scrollbar-track {
  background: transparent;
}

.ii-panel::-webkit-scrollbar-thumb,
.ii-review-list::-webkit-scrollbar-thumb,
.ii-table-wrap::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--color-accent) 38%, transparent);
  border-radius: 999px;
}

.ii-panel::-webkit-scrollbar-thumb:hover,
.ii-review-list::-webkit-scrollbar-thumb:hover,
.ii-table-wrap::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--color-accent) 60%, transparent);
}

/* ================================================================== */
/* HEADER                                                             */
/* ================================================================== */

.ii-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-accent) 16%, transparent),
    color-mix(in srgb, var(--color-accent) 4%, transparent)
  );
  box-shadow: 3px 3px 10px var(--color-shadow);
}

.ii-header-left {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  min-width: 0;
}

.ii-icon {
  font-size: 1.8rem;
  line-height: 1;
  flex-shrink: 0;
}

.ii-header-text { min-width: 0; }

.ii-title {
  margin: 0;
  font-family: var(--font-title);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-accent);
  letter-spacing: 0.02em;
}

.ii-subtitle {
  margin: 0.2rem 0 0.45rem;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  line-height: 1.35;
}

.ii-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.ii-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.16rem 0.45rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
  background: color-mix(in srgb, var(--color-bg-secondary) 55%, transparent);
  color: var(--color-text-secondary);
  font-size: 0.62rem;
  white-space: nowrap;
}

.ii-chip.chip-ok {
  border-color: color-mix(in srgb, var(--color-success) 55%, transparent);
  color: var(--color-success);
}

.ii-chip.chip-warn {
  border-color: color-mix(in srgb, var(--color-warning) 55%, transparent);
  color: var(--color-warning);
}

.ii-header-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
}

.ii-dias {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.58rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.ii-dias select {
  padding: 0.32rem 0.45rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 0.7rem;
  cursor: pointer;
}

.ii-refresh {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-accent);
  font-size: 1rem;
  line-height: 1;
  transition: transform var(--transition-fast), background var(--transition-fast);
}

.ii-refresh:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-accent) 24%, transparent);
  transform: rotate(45deg);
}

.ii-refresh:disabled { opacity: 0.5; cursor: wait; }

/* ================================================================== */
/* ALERTAS / CARGA                                                    */
/* ================================================================== */

.ii-alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-md);
  font-size: 0.7rem;
  line-height: 1.4;
}

.ii-alert strong { font-weight: 700; }

.ii-alert button {
  margin-left: auto;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-sm);
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font-size: 0.65rem;
}

.ii-alert-error {
  border: 1px solid color-mix(in srgb, var(--color-error) 50%, transparent);
  background: color-mix(in srgb, var(--color-error) 12%, transparent);
  color: var(--color-error);
}

.ii-alert-warn {
  border: 1px solid color-mix(in srgb, var(--color-warning) 50%, transparent);
  background: color-mix(in srgb, var(--color-warning) 12%, transparent);
  color: var(--color-warning);
}

.ii-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 2.5rem 1rem;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

.ii-spinner {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
  border-top-color: var(--color-accent);
  animation: ii-spin 0.8s linear infinite;
}

@keyframes ii-spin { to { transform: rotate(360deg); } }

.ii-summary-sentence {
  padding: 0.6rem 0.85rem;
  border-left: 3px solid var(--color-accent);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  background: color-mix(in srgb, var(--color-accent) 7%, transparent);
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  line-height: 1.45;
}

/* ================================================================== */
/* KPIs                                                               */
/* ================================================================== */

.ii-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
  gap: 0.55rem;
}

.ii-kpi {
  --kpi-tone: var(--color-accent);
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.6rem 0.7rem;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--kpi-tone) 30%, transparent);
  background: color-mix(in srgb, var(--kpi-tone) 7%, var(--color-bg-secondary));
}

.ii-kpi.kpi-danger { --kpi-tone: var(--color-error); }
.ii-kpi.kpi-warning { --kpi-tone: var(--color-warning); }
.ii-kpi.kpi-success { --kpi-tone: var(--color-success); }
.ii-kpi.kpi-accent { --kpi-tone: var(--color-accent); }

.ii-kpi-icon { font-size: 1.15rem; line-height: 1.2; }

.ii-kpi-body { display: flex; flex-direction: column; min-width: 0; }

.ii-kpi-label {
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.ii-kpi-value {
  font-family: var(--font-title);
  font-size: 1.05rem;
  line-height: 1.2;
  color: var(--kpi-tone);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ii-kpi-sub {
  font-size: 0.6rem;
  color: var(--color-text-secondary);
  line-height: 1.3;
}

/* ================================================================== */
/* TARJETAS                                                           */
/* ================================================================== */

.ii-card {
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--color-border) 55%, transparent);
  background: color-mix(in srgb, var(--color-bg-secondary) 72%, transparent);
  box-shadow: 2px 2px 8px color-mix(in srgb, var(--color-shadow) 55%, transparent);
  overflow: hidden;
}

.ii-card-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  width: 100%;
  padding: 0.7rem 0.85rem;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  text-align: left;
}

.ii-card-title {
  font-family: var(--font-title);
  font-size: 0.9rem;
  color: var(--color-accent);
}

.ii-card-hint {
  font-size: 0.62rem;
  color: var(--color-text-muted);
}

.ii-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.75rem 0.85rem 0.55rem;
}

.ii-card-head h4 {
  margin: 0;
  font-family: var(--font-title);
  font-size: 0.92rem;
  color: var(--color-accent);
}

.ii-card-head p {
  margin: 0.18rem 0 0;
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.ii-count-pill {
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-accent);
  font-size: 0.6rem;
  white-space: nowrap;
}

.ii-btn-ghost {
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
  background: transparent;
  color: var(--color-accent);
  font-size: 0.65rem;
  white-space: nowrap;
  transition: background var(--transition-fast);
}

.ii-btn-ghost:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
}

.ii-btn-ghost:disabled { opacity: 0.45; cursor: not-allowed; }

/* ================================================================== */
/* REGLAS                                                             */
/* ================================================================== */

.ii-rules { padding: 0 0.85rem 0.85rem; }

.ii-rules-intro {
  margin: 0 0 0.6rem;
  font-size: 0.66rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.ii-rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(235px, 1fr));
  gap: 0.5rem;
}

.ii-rule {
  --rule-tone: var(--color-accent);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.55rem 0.6rem;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--rule-tone) 28%, transparent);
  background: color-mix(in srgb, var(--rule-tone) 5%, var(--color-bg-primary));
}

.ii-rule.tipo-calculo { --rule-tone: var(--color-info); }
.ii-rule.tipo-clasificacion { --rule-tone: var(--color-warning); }
.ii-rule.tipo-revision { --rule-tone: var(--color-error); }
.ii-rule.tipo-calidad { --rule-tone: var(--color-success); }
.ii-rule.tipo-pedido { --rule-tone: #b98cff; }

.ii-rule-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.ii-rule-code {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--rule-tone);
}

.ii-rule-type {
  font-size: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.ii-rule h4 {
  margin: 0;
  font-size: 0.74rem;
  color: var(--color-text-primary);
}

.ii-rule p {
  margin: 0;
  font-size: 0.62rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.ii-formula {
  padding: 0.3rem 0.4rem;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-bg-primary) 75%, transparent);
  overflow-x: auto;
}

.ii-formula code {
  font-size: 0.58rem;
  color: var(--rule-tone);
  white-space: nowrap;
}

.ii-threshold {
  font-size: 0.58rem;
  color: var(--color-text-muted);
}

.ii-threshold strong { color: var(--rule-tone); }

/* ================================================================== */
/* CLASIFICACIÓN                                                      */
/* ================================================================== */

.ii-class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  padding: 0 0.85rem 0.85rem;
}

.ii-class-card {
  --class-tone: var(--color-accent);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.55rem 0.6rem;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--class-tone) 30%, transparent);
  background: color-mix(in srgb, var(--class-tone) 6%, var(--color-bg-primary));
  text-align: left;
  transition: transform var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
}

.ii-class-card:hover { transform: translateY(-1px); }

.ii-class-card.active {
  border-color: var(--class-tone);
  background: color-mix(in srgb, var(--class-tone) 16%, var(--color-bg-primary));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--class-tone) 45%, transparent);
}

.ii-class-card.rapido { --class-tone: var(--color-success); }
.ii-class-card.medio { --class-tone: var(--color-info); }
.ii-class-card.lento { --class-tone: var(--color-warning); }
.ii-class-card.atorado { --class-tone: var(--color-error); }
.ii-class-card.agotado { --class-tone: #7fb2ff; }
.ii-class-card.sindatos { --class-tone: var(--color-text-muted); }
.ii-class-card.inactivo { --class-tone: #9a8fb0; }

.ii-class-icon { font-size: 1.05rem; line-height: 1; }

.ii-class-body {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.ii-class-name {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--class-tone);
}

.ii-class-count {
  font-family: var(--font-title);
  font-size: 1.1rem;
  line-height: 1;
  color: var(--color-text-primary);
}

.ii-class-value {
  font-size: 0.58rem;
  color: var(--color-text-secondary);
}

.ii-class-def {
  font-size: 0.56rem;
  color: var(--color-text-muted);
  line-height: 1.3;
}

/* ================================================================== */
/* FILTROS Y TABLA                                                    */
/* ================================================================== */

.ii-filters {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  padding: 0 0.85rem 0.55rem;
}

.ii-search {
  flex: 1 1 220px;
  min-width: 160px;
  padding: 0.4rem 0.55rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.68rem;
}

.ii-search::placeholder { color: var(--color-text-muted); }

.ii-select {
  padding: 0.4rem 0.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.65rem;
  cursor: pointer;
}

.ii-count {
  margin-left: auto;
  font-size: 0.6rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.ii-table-wrap {
  width: 100%;
  /* La tabla crece con el número de productos y empujaba el resto del panel
     fuera de la vista. Con alto máximo y scroll propio se ven ~15 filas y el
     encabezado queda fijo. El scroll general del panel sigue funcionando. */
  max-height: min(62vh, 620px);
  overflow: auto;
  overscroll-behavior: contain;
  padding: 0 0.35rem 0.35rem;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-accent) 45%, transparent) transparent;
}

.ii-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.64rem;
  min-width: 900px;
}

.ii-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0.4rem 0.45rem;
  background: color-mix(in srgb, var(--color-bg-panel) 85%, transparent);
  color: var(--color-text-muted);
  font-size: 0.56rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
}

.ii-table tbody td {
  padding: 0.4rem 0.45rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 30%, transparent);
  vertical-align: middle;
}

.ii-table .num { text-align: right; white-space: nowrap; }

.ii-row { cursor: pointer; transition: background var(--transition-fast); }

.ii-row:hover { background: color-mix(in srgb, var(--color-accent) 6%, transparent); }

.ii-row-open { background: color-mix(in srgb, var(--color-accent) 9%, transparent); }

.ii-expand {
  width: 1.1rem;
  color: var(--color-text-muted);
  text-align: center;
  font-size: 0.65rem;
}

.ii-prod { min-width: 150px; }

.ii-prod strong {
  display: block;
  font-size: 0.67rem;
  color: var(--color-text-primary);
}

.ii-prod small {
  display: block;
  font-size: 0.55rem;
  color: var(--color-text-muted);
}

/* En pantallas donde se oculta la columna de costo, mostramos el precio
   debajo del nombre para que el gramaje ($/kg) siga siendo visible. */
.ii-prod small.ii-prod-price {
  display: none;
  color: var(--color-accent);
  font-weight: 600;
}

@media (max-width: 900px) {
  .ii-prod small.ii-prod-price { display: block; }
}

/* Indicador de top seller junto al badge de rotación. */
.ii-fire {
  margin-left: 0.2rem;
  font-size: 0.6rem;
  vertical-align: middle;
}

/* Etiqueta de gramaje: deja claro que el stock va en gramos y el precio en kg. */
.ii-gramaje-badge {
  display: inline-block;
  margin-left: 0.2rem;
  padding: 0.02rem 0.3rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-info) 45%, transparent);
  background: color-mix(in srgb, var(--color-info) 12%, transparent);
  color: var(--color-info);
  font-size: 0.5rem;
  font-weight: 600;
  white-space: nowrap;
  vertical-align: middle;
}

.ii-unit-note,
.ii-detail-explain p.ii-unit-note {
  margin: 0.35rem 0 0;
  padding: 0.35rem 0.5rem;
  border-left: 2px solid var(--color-info);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: color-mix(in srgb, var(--color-info) 7%, transparent);
  color: var(--color-text-secondary);
  font-size: 0.58rem;
  line-height: 1.4;
}

.ii-unit-note code {
  font-size: 0.56rem;
  color: var(--color-info);
}

.ii-unit-note-table {
  margin: 0 0.85rem 0.5rem;
}

.ii-detail-explain p.ii-formula-line {
  margin-top: 0.05rem;
  font-size: 0.55rem;
  color: var(--color-text-muted);
}

.ii-rec {
  min-width: 150px;
  color: var(--color-text-secondary);
  font-size: 0.6rem;
  line-height: 1.3;
}

/* Badges de clasificación */
.ii-badge {
  --badge-tone: var(--color-accent);
  display: inline-block;
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--badge-tone) 45%, transparent);
  background: color-mix(in srgb, var(--badge-tone) 14%, transparent);
  color: var(--badge-tone);
  font-size: 0.55rem;
  font-weight: 700;
  white-space: nowrap;
}

.ii-badge.rapido { --badge-tone: var(--color-success); }
.ii-badge.medio { --badge-tone: var(--color-info); }
.ii-badge.lento { --badge-tone: var(--color-warning); }
.ii-badge.atorado { --badge-tone: var(--color-error); }
.ii-badge.agotado { --badge-tone: #7fb2ff; }
.ii-badge.sin_datos { --badge-tone: var(--color-text-muted); }
.ii-badge.inactivo { --badge-tone: #9a8fb0; }

/* ABC */
.ii-abc {
  display: inline-block;
  width: 1.25rem;
  height: 1.25rem;
  line-height: 1.25rem;
  text-align: center;
  border-radius: 50%;
  font-size: 0.58rem;
  font-weight: 700;
}

.ii-abc.a {
  background: color-mix(in srgb, var(--color-success) 18%, transparent);
  color: var(--color-success);
}

.ii-abc.b {
  background: color-mix(in srgb, var(--color-warning) 18%, transparent);
  color: var(--color-warning);
}

.ii-abc.c {
  background: color-mix(in srgb, var(--color-info) 18%, transparent);
  color: var(--color-info);
}

.ii-abc.sin_ventas { color: var(--color-text-muted); }

/* Detalle expandido */
.ii-detail-row td {
  padding: 0 !important;
  background: color-mix(in srgb, var(--color-bg-primary) 70%, transparent);
}

.ii-detail {
  padding: 0.7rem 0.8rem;
  border-left: 2px solid var(--color-accent);
}

.ii-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.4rem;
  margin-bottom: 0.6rem;
}

.ii-detail-grid > div {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.35rem 0.45rem;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-bg-secondary) 65%, transparent);
}

.ii-detail-grid span {
  font-size: 0.53rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.ii-detail-grid strong {
  font-size: 0.7rem;
  color: var(--color-text-primary);
}

.ii-detail-explain {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.7rem;
}

.ii-detail-explain h5 {
  margin: 0 0 0.25rem;
  font-size: 0.66rem;
  color: var(--color-accent);
}

.ii-detail-explain p {
  margin: 0.15rem 0;
  font-size: 0.61rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.ii-detail-action {
  margin-top: 0.55rem;
  padding: 0.4rem 0.55rem;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  color: var(--color-text-primary);
  font-size: 0.64rem;
}

.ii-empty {
  padding: 1.2rem 0.85rem;
  text-align: center;
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

/* ================================================================== */
/* REVISIÓN                                                           */
/* ================================================================== */

.ii-tabs {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  padding: 0 0.85rem;
}

.ii-tab {
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.64rem;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.ii-tab span {
  display: inline-block;
  margin-left: 0.2rem;
  padding: 0.02rem 0.35rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-bg-primary) 70%, transparent);
  font-size: 0.55rem;
}

.ii-tab.active {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  color: var(--color-accent);
}

.ii-tab-help {
  margin: 0.45rem 0.85rem 0.55rem;
  font-size: 0.62rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.ii-review-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 0.85rem 0.85rem;
  max-height: 520px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-accent) 45%, transparent) transparent;
}

.ii-review-item {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) minmax(280px, 1.6fr);
  gap: 0.7rem;
  padding: 0.6rem 0.65rem;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
  background: color-mix(in srgb, var(--color-bg-primary) 45%, transparent);
}

.ii-review-main { min-width: 0; }

.ii-review-name {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin-bottom: 0.3rem;
}

.ii-review-name strong {
  font-size: 0.72rem;
  color: var(--color-text-primary);
}

.ii-review-meta {
  font-size: 0.56rem;
  color: var(--color-text-muted);
}

.ii-review-numbers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.6rem;
  align-items: center;
  font-size: 0.58rem;
  color: var(--color-text-secondary);
}

.ii-review-numbers b { color: var(--color-text-primary); }

.ii-review-suggestion {
  margin: 0.35rem 0 0;
  font-size: 0.6rem;
  line-height: 1.35;
  color: var(--color-text-secondary);
}

.ii-review-action-text {
  color: var(--color-accent);
}

.ii-review-updated {
  display: inline-block;
  margin-top: 0.25rem;
  font-size: 0.55rem;
  color: var(--color-text-muted);
}

.ii-review-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.4rem;
}

.ii-review-controls label {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.53rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.ii-review-controls select,
.ii-review-controls input {
  min-width: 105px;
  padding: 0.3rem 0.4rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.62rem;
}

.ii-review-note { flex: 1 1 150px; }

.ii-review-note input { width: 100%; }

.ii-saving {
  font-size: 0.58rem;
  color: var(--color-accent);
  align-self: center;
}

/* ================================================================== */
/* CALIDAD / RECOMENDACIONES                                          */
/* ================================================================== */

.ii-quality-grid,
.ii-rec-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.5rem;
  padding: 0 0.85rem 0.85rem;
}

.ii-quality,
.ii-rec-card {
  --sev-tone: var(--color-text-muted);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.55rem 0.6rem;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--sev-tone) 30%, transparent);
  background: color-mix(in srgb, var(--sev-tone) 5%, var(--color-bg-primary));
}

.sev-alta { --sev-tone: var(--color-error); }
.sev-media { --sev-tone: var(--color-warning); }
.sev-baja { --sev-tone: var(--color-info); }

.ii-quality-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.ii-quality-count {
  font-family: var(--font-title);
  font-size: 1.1rem;
  line-height: 1;
  color: var(--sev-tone);
}

.ii-sev {
  padding: 0.08rem 0.35rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sev-tone) 16%, transparent);
  color: var(--sev-tone);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.ii-quality h5,
.ii-rec-card h5 {
  margin: 0;
  font-size: 0.7rem;
  color: var(--color-text-primary);
}

.ii-quality p,
.ii-rec-card p {
  margin: 0;
  font-size: 0.6rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.ii-quality small,
.ii-rec-card small {
  font-size: 0.55rem;
  color: var(--color-text-muted);
  line-height: 1.3;
}

.ii-rec-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.ii-rec-impact {
  margin-left: auto;
  font-family: var(--font-title);
  font-size: 0.72rem;
  color: var(--sev-tone);
}

.ii-rec-action {
  padding: 0.3rem 0.4rem;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--sev-tone) 8%, transparent);
  color: var(--color-text-primary) !important;
}

/* ================================================================== */
/* SALIDAS DE EFECTIVO                                                */
/* ================================================================== */

.ii-cash-chips {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  padding: 0 0.85rem;
}

.ii-cash-chip {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-bg-secondary) 70%, transparent);
}

.ii-cash-chip-label {
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.ii-cash-chip strong {
  font-size: 0.95rem;
  color: var(--color-text-primary);
}

.ii-cash-chip-proveedor strong {
  color: var(--color-success);
}

.ii-cash-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.6rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.ii-cash-toggle input {
  accent-color: var(--color-accent);
}

.ii-cash-table {
  min-width: 720px;
}

.ii-cash-row td small {
  display: block;
  font-size: 0.52rem;
  color: var(--color-text-muted);
}

.ii-cash-tipo {
  font-weight: 600;
}

.ii-cash-tipo.tipo-proveedor {
  color: var(--color-success);
}

.ii-cash-tipo.tipo-servicio,
.ii-cash-tipo.tipo-movimiento_interno {
  color: var(--color-info);
}

.ii-cash-tipo.tipo-insumo,
.ii-cash-tipo.tipo-producto {
  color: var(--color-warning);
}

.ii-cash-ocurrencias {
  display: inline-block;
  min-width: 1.6rem;
  padding: 0.05rem 0.25rem;
  text-align: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-text-muted) 15%, transparent);
  font-weight: 700;
}

.ii-cash-ocurrencias.rep {
  background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  color: var(--color-accent);
}

.ii-cash-ultimo small {
  display: block;
}

.ii-cash-dia {
  display: inline-block;
  margin-right: 0.2rem;
  padding: 0.05rem 0.3rem;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-info) 12%, transparent);
  color: var(--color-info);
  font-size: 0.55rem;
  font-weight: 600;
}

.ii-cash-confianza {
  margin-left: 0.3rem;
  font-size: 0.55rem;
  color: var(--color-text-muted);
}

.ii-cash-probable small {
  display: block;
  font-size: 0.52rem;
  color: var(--color-text-muted);
}

.ii-cash-prod .ii-cash-pill {
  display: inline-block;
  margin: 0.1rem 0.25rem 0.1rem 0;
  padding: 0.05rem 0.35rem;
  border: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-bg-secondary) 60%, transparent);
  font-size: 0.55rem;
  color: var(--color-text-secondary);
}

.ii-cash-note {
  margin: 0 0.85rem 0.35rem;
  font-size: 0.58rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}

/* ================================================================== */
/* RESPONSIVE                                                         */
/* ================================================================== */

@media (max-width: 900px) {
  .ii-panel {
    gap: 0.65rem;
  }

  .ii-col-opt {
    display: none;
  }

  .ii-table {
    min-width: 620px;
  }

  .ii-table-wrap {
    max-height: 55vh;
  }

  .ii-review-item {
    grid-template-columns: 1fr;
  }

  .ii-review-list {
    max-height: 60vh;
  }
}

@media (max-width: 620px) {
  .ii-panel {
    gap: 0.55rem;
    padding: 0.1rem;
  }

  .ii-header {
    flex-direction: column;
    padding: 0.7rem 0.75rem;
  }

  .ii-header-actions {
    align-self: flex-end;
  }

  .ii-kpis {
    grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
  }

  .ii-class-grid {
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  }

  .ii-card-head {
    flex-direction: column;
  }

  .ii-count {
    margin-left: 0;
  }

  .ii-review-list {
    max-height: 55vh;
  }
}

@media (max-width: 420px) {
  .ii-kpis {
    grid-template-columns: 1fr;
  }

  .ii-class-grid {
    grid-template-columns: 1fr 1fr;
  }

  .ii-review-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .ii-review-controls label,
  .ii-review-controls select,
  .ii-review-controls input,
  .ii-review-controls button {
    width: 100%;
  }

  .ii-review-controls button {
    min-height: 2rem;
  }

  .ii-table {
    min-width: 560px;
  }
}
</style>
