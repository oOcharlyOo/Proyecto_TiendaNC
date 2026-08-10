<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useProveedoresInteligencia } from '../logica/useProveedoresInteligencia';
import type { ProductoRank } from '../logica/useProveedoresInteligencia';

const {
  cargando, error,
  topVentasGranel, topVentasUnitarios,
  totalVentasGranel, totalVentasUnitario,
  bajaRotacion, mayorUtilidad, sinMovimiento,
  alertas, resumenInventario, ultimaActualizacion,
  cargarAnalytics, eliminarProducto, eliminarProductosLote, vaciarStock, vaciarStocksLote, formatoMoneda,
  kpiValorInventario, valorRetenidoSinMov
} = useProveedoresInteligencia();

onMounted(() => cargarAnalytics());

/* ---------- helpers ---------- */
function getSeveridadClass(s: string) {
  if (s === 'alta') return 'sev-alta';
  if (s === 'media') return 'sev-media';
  return 'sev-baja';
}

function getMargenClass(margen: number) {
  if (margen >= 40) return 'margen-alta';
  if (margen >= 20) return 'margen-media';
  return 'margen-baja';
}

function valorItem(item: ProductoRank) {
  return (item.stock || 0) * (item.precioCosto || 0);
}

function margenItem(item: ProductoRank) {
  if (!item.precioCosto || item.precioCosto <= 0) return 0;
  return ((item.precioVenta || 0) - item.precioCosto) / item.precioCosto * 100;
}

function categoriaItem(item: ProductoRank) {
  const cat = item.categoria;
  if (cat && cat !== '0' && cat !== '' && cat !== 'Sin categoría') return cat;
  return 'Sin categoría';
}

/* ---------- sin movimiento state ---------- */
const smFilter = ref<'todos' | 'eliminar' | 'promocionar' | 'revisar'>('todos');
const selectedIds = ref<Set<number>>(new Set());
const expandedCats = ref<Record<string, boolean>>({});
const pendingDelete = ref<Set<number>>(new Set());
const pendingVaciar = ref<Set<number>>(new Set());
const eliminandoLote = ref(false);
const vaciandoLote = ref(false);
const confirmarLote = ref(false);
const confirmarVaciarLote = ref(false);

/* ---------- sin movimiento computed ---------- */
const sinMovimientoFiltrado = computed(() => {
  let items = sinMovimiento.value;
  if (smFilter.value === 'todos') return items;
  return items.filter(item => {
    const v = valorItem(item);
    const m = margenItem(item);
    const stock = item.stock || 0;
    
    if (smFilter.value === 'eliminar') {
      // Productos con poco valor retenido Y poco stock
      return v < 500 && stock < 10;
    }
    if (smFilter.value === 'promocionar') {
      // Productos con valor significativo Y margen decente
      return v >= 500 && m >= 15;
    }
    if (smFilter.value === 'revisar') {
      // Productos con valor significativo Y margen bajo
      return v >= 500 && m < 15;
    }
    return true;
  });
});

// Debug: watch para ver cuándo cambia sinMovimientoFiltrado
const sinMovimientoAgrupado = computed(() => {
  const map = new Map<string, ProductoRank[]>();
  for (const item of sinMovimientoFiltrado.value) {
    const cat = categoriaItem(item);
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  const result: { cat: string; items: ProductoRank[] }[] = [];
  for (const [key, value] of map) {
    result.push({ cat: key, items: value });
  }
  return result;
});

const categoriasAfectadas = computed(() => sinMovimientoAgrupado.value.length);

const smSelectAll = computed(() => {
  const ids = sinMovimientoFiltrado.value.map(i => i.idProducto).filter(Boolean) as number[];
  return ids.length > 0 && ids.every(id => selectedIds.value.has(id));
});

const smSeleccionadosValor = computed(() => {
  let total = 0;
  for (const item of sinMovimientoFiltrado.value) {
    if (item.idProducto && selectedIds.value.has(item.idProducto)) {
      total += valorItem(item);
    }
  }
  return total;
});

function countByFilter(filter: 'todos' | 'eliminar' | 'promocionar' | 'revisar') {
  if (filter === 'todos') return sinMovimiento.value.length;
  return sinMovimiento.value.filter(item => {
    const v = valorItem(item);
    const m = margenItem(item);
    const stock = item.stock || 0;
    
    if (filter === 'eliminar') {
      return v < 500 && stock < 10;
    }
    if (filter === 'promocionar') {
      return v >= 500 && m >= 15;
    }
    if (filter === 'revisar') {
      return v >= 500 && m < 15;
    }
    return true;
  }).length;
}

/* ---------- sin movimiento actions ---------- */
function toggleSelect(id: number) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  selectedIds.value = next;
}

function toggleSelectAll() {
  const ids = sinMovimientoFiltrado.value.map(i => i.idProducto).filter(Boolean) as number[];
  if (smSelectAll.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(ids);
  }
}

function toggleCategoria(cat: string) {
  expandedCats.value = { ...expandedCats.value, [cat]: !expandedCats.value[cat] };
}

function expandirTodo() {
  const nuevo: Record<string, boolean> = {};
  for (const entry of sinMovimientoAgrupado.value) {
    nuevo[entry.cat] = true;
  }
  expandedCats.value = nuevo;
}

function colapsarTodo() {
  expandedCats.value = {};
}

const todasExpandidas = computed(() => {
  const cats = sinMovimientoAgrupado.value.map(e => e.cat);
  return cats.length > 0 && cats.every(cat => expandedCats.value[cat]);
});

function iniciarEliminar(id: number) {
  const next = new Set(pendingDelete.value);
  next.add(id);
  pendingDelete.value = next;
}

function cancelDelete(id: number) {
  const next = new Set(pendingDelete.value);
  next.delete(id);
  pendingDelete.value = next;
}

async function ejecutarEliminar(item: ProductoRank) {
  if (!item.idProducto) return;
  const exito = await eliminarProducto(item.idProducto);
  cancelDelete(item.idProducto);
  if (!exito) alert('Error al eliminar ' + (item.nombre || '(sin nombre)'));
}

async function ejecutarEliminarLote() {
  const ids = Array.from(selectedIds.value);
  if (ids.length === 0) return;
  eliminandoLote.value = true;
  const { exitosos, fallidos } = await eliminarProductosLote(ids);
  eliminandoLote.value = false;
  confirmarLote.value = false;
  selectedIds.value = new Set();
  const msg = exitosos > 0 ? '✅ ' + exitosos + ' eliminado(s)' : '';
  const err = fallidos > 0 ? ' ❌ ' + fallidos + ' fallido(s)' : '';
  alert(msg + err);
}

/* ---------- vaciar stock actions ---------- */
function iniciarVaciar(id: number) {
  const next = new Set(pendingVaciar.value);
  next.add(id);
  pendingVaciar.value = next;
}

function cancelVaciar(id: number) {
  const next = new Set(pendingVaciar.value);
  next.delete(id);
  pendingVaciar.value = next;
}

async function ejecutarVaciar(item: ProductoRank) {
  if (!item.idProducto) return;
  const exito = await vaciarStock(item.idProducto);
  cancelVaciar(item.idProducto);
  if (!exito) alert('Error al vaciar stock de ' + (item.nombre || '(sin nombre)'));
}

async function ejecutarVaciarLote() {
  const ids = Array.from(selectedIds.value);
  if (ids.length === 0) return;
  vaciandoLote.value = true;
  const { exitosos, fallidos } = await vaciarStocksLote(ids);
  vaciandoLote.value = false;
  confirmarVaciarLote.value = false;
  selectedIds.value = new Set();
  const msg = exitosos > 0 ? '✅ ' + exitosos + ' con stock en 0' : '';
  const err = fallidos > 0 ? ' ❌ ' + fallidos + ' fallido(s)' : '';
  alert(msg + err);
}
</script>

<template>
  <div class="ia-panel">
    <!-- HEADER -->
    <div class="ia-header">
      <div class="ia-header-left">
        <span class="ia-icon">📊</span>
        <div>
          <h3 class="ia-title">Inteligencia de Inventario</h3>
          <p class="ia-desc">Análisis completo del inventario: productos más vendidos, rentabilidad, rotación y productos sin movimiento. Usa esta información para tomar mejores decisiones de compra y catálogo.</p>
          <p class="ia-subtitle" v-if="ultimaActualizacion">Última actualización: {{ ultimaActualizacion }}</p>
        </div>
      </div>
      <button class="btn-refresh" @click="cargarAnalytics" :disabled="cargando" title="Actualizar datos">
        <span :class="{ spin: cargando }">🔄</span>
      </button>
    </div>

    <!-- LOADING -->
    <div v-if="cargando" class="ia-loading">
      <div class="loading-orb"></div>
      <p>Analizando inventario...</p>
    </div>

    <!-- ERROR -->
    <div v-else-if="error" class="ia-error">
      <span>⚠️ {{ error }}</span>
      <button @click="cargarAnalytics">Reintentar</button>
    </div>

    <template v-else>
      <!-- KPI CARDS -->
      <div class="ia-kpis">
        <div class="kpi-card">
          <span class="kpi-icon">📦</span>
          <div class="kpi-body">
            <span class="kpi-label">Total productos</span>
            <span class="kpi-value">{{ resumenInventario?.totalItems ?? resumenInventario?.totalProductos ?? '-' }}</span>
          </div>
        </div>
        <div class="kpi-card kpi-warn">
          <span class="kpi-icon">⚠️</span>
          <div class="kpi-body">
            <span class="kpi-label">Stock bajo</span>
            <span class="kpi-value">{{ resumenInventario?.bajoStock ?? '-' }}</span>
          </div>
          <span class="info-tip" data-tip="Productos con stock por debajo de su cantidad mínima. Requieren pedido urgente.">?</span>
        </div>
        <div class="kpi-card kpi-danger">
          <span class="kpi-icon">🚫</span>
          <div class="kpi-body">
            <span class="kpi-label">Agotados</span>
            <span class="kpi-value">{{ resumenInventario?.productosAgotados ?? resumenInventario?.agotados ?? '-' }}</span>
          </div>
          <span class="info-tip" data-tip="Productos sin stock. Se están perdiendo ventas de estos artículos.">?</span>
        </div>
        <div class="kpi-card kpi-accent">
          <span class="kpi-icon">🔔</span>
          <div class="kpi-body">
            <span class="kpi-label">Alertas activas</span>
            <span class="kpi-value">{{ alertas.length }}</span>
          </div>
        </div>
        <div class="kpi-card kpi-info">
          <span class="kpi-icon">💰</span>
          <div class="kpi-body">
            <span class="kpi-label">Valor inventario</span>
            <span class="kpi-value">{{ formatoMoneda(kpiValorInventario) }}</span>
          </div>
          <span class="info-tip" data-tip="Costo total del inventario actual (stock × precio de costo). Dinero invertido en productos.">?</span>
        </div>
        <div class="kpi-card" :class="sinMovimiento.length > 0 ? 'kpi-warn' : ''">
          <span class="kpi-icon">💤</span>
          <div class="kpi-body">
            <span class="kpi-label">Sin movimiento</span>
            <span class="kpi-value">{{ sinMovimiento.length }}</span>
            <span class="kpi-sub">Valor retenido: {{ formatoMoneda(valorRetenidoSinMov) }}</span>
          </div>
          <span class="info-tip" data-tip="Productos con stock que no se han vendido en más de 30 días. Tienen su valor atorado sin generar ganancia.">?</span>
        </div>
      </div>

      <!-- ALERTS -->
      <div v-if="alertas.length > 0" class="ia-alerts">
        <div class="ia-section-header">
          <h4 class="ia-section-title">🔔 Alertas activas</h4>
          <span class="info-tip" data-tip="Alertas generadas automáticamente según el estado del inventario. Revisa las de prioridad alta primero.">?</span>
        </div>
        <div class="ia-alerts-list">
          <div v-for="(a, i) in alertas" :key="i" class="ia-alert-item" :class="getSeveridadClass(a.severidad)">
            <span class="ia-alert-icon">{{ a.severidad === 'alta' ? '🔴' : a.severidad === 'media' ? '🟡' : '🟢' }}</span>
            <span class="ia-alert-msg">{{ a.mensaje }}</span>
            <span class="ia-alert-tag" :title="'Tipo: ' + a.tipo">{{ a.tipo }}</span>
          </div>
        </div>
      </div>

      <!-- ANALYTICS GRID -->
      <div class="ia-grid">
        <!-- TOP VENTAS GRANEL -->
        <div class="ia-section">
          <div class="ia-section-header">
            <h4 class="ia-section-title">🏆 Top Ventas Granel</h4>
            <span class="info-tip" data-tip="Productos a granel (kg) más vendidos del año, ordenados por cantidad. Representan {{ totalVentasGranel > 0 ? '$' + totalVentasGranel.toLocaleString('es-MX') : '...' }} en ventas totales.">?</span>
          </div>
          <p class="ia-section-desc">Productos a granel más vendidos del año — ordenados por cantidad vendida</p>
          <div v-if="topVentasGranel.length === 0" class="ia-empty">Sin datos de ventas a granel</div>
          <div v-else class="ia-table-wrap">
            <table class="ia-table">
              <thead>
                <tr><th>#</th><th>Producto</th><th title="Cantidad total vendida en kilogramos">Vendido (kg)</th><th title="Ingreso total generado por este producto">Total vendido</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in topVentasGranel" :key="i">
                  <td class="ia-rank">{{ i + 1 }}</td>
                  <td class="ia-name">{{ item.nombre }}</td>
                  <td class="ia-num">{{ item.cantidadVendida.toLocaleString('es-MX') }} kg</td>
                  <td class="ia-monto">{{ formatoMoneda(item.totalVendido) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TOP VENTAS UNITARIO -->
        <div class="ia-section">
          <div class="ia-section-header">
            <h4 class="ia-section-title">🏆 Top Ventas Unitario</h4>
            <span class="info-tip" data-tip="Productos unitarios (piezas) más vendidos del año, ordenados por cantidad. Representan {{ totalVentasUnitario > 0 ? '$' + totalVentasUnitario.toLocaleString('es-MX') : '...' }} en ventas totales.">?</span>
          </div>
          <p class="ia-section-desc">Productos unitarios más vendidos del año — ordenados por cantidad vendida</p>
          <div v-if="topVentasUnitarios.length === 0" class="ia-empty">Sin datos de ventas unitarias</div>
          <div v-else class="ia-table-wrap">
            <table class="ia-table">
              <thead>
                <tr><th>#</th><th>Producto</th><th title="Cantidad total vendida en piezas">Vendido (uds)</th><th title="Ingreso total generado">Total vendido</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in topVentasUnitarios" :key="i">
                  <td class="ia-rank">{{ i + 1 }}</td>
                  <td class="ia-name">{{ item.nombre }}</td>
                  <td class="ia-num">{{ item.cantidadVendida.toLocaleString('es-MX') }} uds</td>
                  <td class="ia-monto">{{ formatoMoneda(item.totalVendido) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- MAYOR UTILIDAD -->
        <div class="ia-section">
          <div class="ia-section-header">
            <h4 class="ia-section-title">💰 Mayor Utilidad</h4>
            <span class="info-tip" data-tip="Utilidad por unidad = Precio de venta − Precio de costo. Margen = (Utilidad / Precio de costo) × 100. Un margen saludable es de 40% o más.">?</span>
          </div>
          <p class="ia-section-desc">Productos con mayor margen de ganancia — priorízalos en tu catálogo</p>
          <div v-if="mayorUtilidad.length === 0" class="ia-empty">Sin datos de utilidad</div>
          <div v-else class="ia-table-wrap">
            <table class="ia-table">
              <thead>
                <tr><th>#</th><th>Producto</th><th title="Precio que pagas por cada unidad">P. costo</th><th title="Precio al que vendes cada unidad">P. venta</th><th title="Utilidad = Precio venta − Precio costo por cada unidad">Utilidad/ud</th><th title="Margen = (Utilidad / Costo) × 100. Verde = alto, Amarillo = medio, Rojo = bajo">Margen</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in mayorUtilidad" :key="i">
                  <td class="ia-rank">{{ i + 1 }}</td>
                  <td class="ia-name">{{ item.nombre }}</td>
                  <td class="ia-num">{{ formatoMoneda(item.precioCosto || 0) }}</td>
                  <td class="ia-num">{{ formatoMoneda(item.precioVenta || 0) }}</td>
                  <td class="ia-monto">{{ formatoMoneda(item.ganancia || 0) }}</td>
                  <td class="ia-num"><span class="margen-badge" :class="getMargenClass(item.margen || 0)">{{ (item.margen || 0).toFixed(0) }}%</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- BAJA ROTACIÓN -->
        <div class="ia-section">
          <div class="ia-section-header">
            <h4 class="ia-section-title">🐢 Baja Rotación</h4>
            <span class="info-tip" data-tip="Productos con inventario calculado para más de 60 días al ritmo de venta actual. Tener demasiado stock inmoviliza tu dinero. Considera reducir pedidos o hacer promociones.">?</span>
          </div>
          <p class="ia-section-desc">Productos con inventario para más de 60 días — evalúa reducir pedidos futuros</p>
          <div v-if="bajaRotacion.length === 0" class="ia-empty">Sin productos con baja rotación</div>
          <div v-else class="ia-table-wrap">
            <table class="ia-table">
              <thead>
                <tr><th>#</th><th>Producto</th><th title="Unidades actuales en inventario">Stock</th><th title="Promedio de unidades vendidas por día">Venta/día</th><th title="Días que durará el stock al ritmo actual de venta">Días inventario</th><th title="Costo total del stock actual de este producto (stock × precio costo)">Costo en stock</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in bajaRotacion" :key="i">
                  <td class="ia-rank">{{ i + 1 }}</td>
                  <td class="ia-name">{{ item.nombre }}</td>
                  <td class="ia-num">{{ item.stock }} {{ item.isGramaje ? 'kg' : 'uds' }}</td>
                  <td class="ia-num">{{ (item.ventaDiaria || 0).toFixed(2) }}</td>
                  <td class="ia-num ia-warn">~{{ item.rotacion }} días</td>
                  <td class="ia-monto">{{ formatoMoneda((item.stock || 0) * (item.precioCosto || 0)) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- SIN MOVIMIENTO (FULL WIDTH) -->
      <div class="ia-section ia-section-full" v-if="sinMovimiento.length > 0">
        <div class="ia-section-header">
          <h4 class="ia-section-title">💤 Productos Sin Movimiento</h4>
          <span class="info-tip" data-tip="Productos con stock que no registran ventas en más de 30 días. Cada día retenido es dinero que no está generando ganancia. Revisa si deben permanecer en el catálogo o si puedes hacer promociones para sacarlos.">?</span>
        </div>
        <p class="ia-section-desc">
          {{ sinMovimiento.length }} producto(s) · {{ categoriasAfectadas }} categoría(s) afectadas
          <span class="ia-section-highlight">Valor retenido: {{ formatoMoneda(valorRetenidoSinMov) }}</span>
        </p>

        <!-- Filter tabs -->
        <div class="sm-tabs">
          <button :class="['sm-tab', { active: smFilter === 'todos' }]" @click="smFilter = 'todos'" title="Mostrar todos los productos sin movimiento">
            Todos <span class="sm-tab-count">{{ sinMovimiento.length }}</span>
          </button>
          <button :class="['sm-tab', { active: smFilter === 'eliminar' }]" @click="smFilter = 'eliminar'" title="Productos con valor retenido < $500 y stock < 10 unidades. Candidatos a eliminar del catálogo.">
            🗑️ Para eliminar <span class="sm-tab-count">{{ countByFilter('eliminar') }}</span>
          </button>
          <button :class="['sm-tab', { active: smFilter === 'promocionar' }]" @click="smFilter = 'promocionar'" title="Productos con valor retenido ≥ $500 y margen ≥ 15%. Hacer promociones para moverlos.">
            🏷️ Para promocionar <span class="sm-tab-count">{{ countByFilter('promocionar') }}</span>
          </button>
          <button :class="['sm-tab', { active: smFilter === 'revisar' }]" @click="smFilter = 'revisar'" title="Productos con valor retenido ≥ $500 y margen < 15%. Revisar si el precio es competitivo.">
            🔍 Revisar precio <span class="sm-tab-count">{{ countByFilter('revisar') }}</span>
          </button>
        </div>

        <!-- Expand/Collapse controls -->
        <div class="sm-controls" v-if="sinMovimientoFiltrado.length > 0">
          <button class="sm-control-btn" @click="expandirTodo" :disabled="todasExpandidas">
            📂 Expandir todo
          </button>
          <button class="sm-control-btn" @click="colapsarTodo" :disabled="!todasExpandidas">
            📁 Colapsar todo
          </button>
          <span class="sm-controls-info">
            {{ sinMovimientoFiltrado.length }} producto(s) en {{ categoriasAfectadas }} categoría(s)
          </span>
        </div>

        <!-- Batch action bar -->
        <div class="sm-bar" v-if="sinMovimientoFiltrado.length > 0">
          <label class="sm-bar-selectall">
            <input type="checkbox" :checked="smSelectAll" @change="toggleSelectAll">
            <span>Seleccionar todos ({{ sinMovimientoFiltrado.length }})</span>
          </label>
          <span v-if="selectedIds.size > 0" class="sm-bar-info">
            {{ selectedIds.size }} seleccionados · {{ formatoMoneda(smSeleccionadosValor) }}
          </span>
          <div class="sm-bar-actions">
            <button v-if="confirmarVaciarLote" class="sm-btn sm-btn-confirm" @click="ejecutarVaciarLote" :disabled="vaciandoLote">
              <span v-if="vaciandoLote">⏳ Vaciando...</span>
              <span v-else>✅ Confirmar vaciar {{ selectedIds.size }}</span>
            </button>
            <button v-if="confirmarVaciarLote" class="sm-btn sm-btn-cancel" @click="confirmarVaciarLote = false">❌ Cancelar</button>
            <button v-else class="sm-btn sm-btn-vaciar" :disabled="selectedIds.size === 0" @click="confirmarVaciarLote = true">
              🧹 Vaciar stock
            </button>
            <button v-if="confirmarLote" class="sm-btn sm-btn-confirm" @click="ejecutarEliminarLote" :disabled="eliminandoLote">
              <span v-if="eliminandoLote">⏳ Eliminando...</span>
              <span v-else>✅ Confirmar eliminación de {{ selectedIds.size }}</span>
            </button>
            <button v-if="confirmarLote" class="sm-btn sm-btn-cancel" @click="confirmarLote = false">❌ Cancelar</button>
            <button v-else class="sm-btn sm-btn-delete" :disabled="selectedIds.size === 0" @click="confirmarLote = true">
              🗑️ Eliminar {{ selectedIds.size > 0 ? selectedIds.size : '' }}
            </button>
          </div>
        </div>

        <!-- Warning banner when batch confirm is active -->
        <div v-if="confirmarLote" class="sm-warning">
          ⚠️ Esta acción eliminará permanentemente <strong>{{ selectedIds.size }} producto(s)</strong>
          con un valor retenido de <strong>{{ formatoMoneda(smSeleccionadosValor) }}</strong>.
          No se puede deshacer.
        </div>

        <!-- Categories accordion -->
        <div class="sm-categorias">
          <div v-for="entry in sinMovimientoAgrupado" :key="entry.cat" class="sm-cat">
            <div class="sm-cat-header" @click="toggleCategoria(entry.cat)">
              <span class="sm-cat-chevron">{{ expandedCats[entry.cat] ? '▼' : '▶' }}</span>
              <span class="sm-cat-icon">📁</span>
              <span class="sm-cat-name">{{ entry.cat }}</span>
              <span class="sm-cat-count">{{ entry.items.length }} producto(s)</span>
              <span class="sm-cat-valor">{{ formatoMoneda(entry.items.reduce((s, i) => s + valorItem(i), 0)) }}</span>
              <span class="sm-cat-margen" :class="getMargenClass(entry.items.reduce((s, i) => s + margenItem(i), 0) / entry.items.length)">
                {{ (entry.items.reduce((s, i) => s + margenItem(i), 0) / entry.items.length).toFixed(0) }}% margen
              </span>
            </div>
            <div v-if="expandedCats[entry.cat]" class="sm-cat-body">
              <div v-for="(item, i) in entry.items" :key="item.idProducto || i" class="sm-item" :class="{ 'sm-item-pending': pendingDelete.has(item.idProducto!), 'sm-item-vaciando': item.idProducto ? pendingVaciar.has(item.idProducto) : false }">
                <input type="checkbox" class="sm-item-cb" :checked="item.idProducto ? selectedIds.has(item.idProducto) : false" @change="item.idProducto && toggleSelect(item.idProducto)">
                <span class="sm-item-name" :title="item.nombre || 'Producto sin nombre'">{{ item.nombre || '(sin nombre)' }}</span>
                <span class="sm-item-stock">{{ (item.stock ?? 0) }} {{ item.isGramaje ? 'kg' : 'uds' }}</span>
                <span class="sm-item-costo">{{ formatoMoneda(item.precioCosto || 0) }}</span>
                <span class="sm-item-valor sm-item-valor-warn">{{ formatoMoneda(valorItem(item)) }}</span>
                <span class="sm-item-dias">30+ días</span>
                <span v-if="item.precioCosto && item.precioCosto > 0" class="sm-item-margen" :class="getMargenClass(margenItem(item))">{{ margenItem(item).toFixed(0) }}%</span>
                <span v-else class="sm-item-margen">—</span>

                <!-- Inline confirmation -->
                <template v-if="item.idProducto && pendingDelete.has(item.idProducto)">
                  <span class="sm-item-confirm-msg">¿Eliminar?</span>
                  <button class="sm-item-confirm-yes" @click="ejecutarEliminar(item)" title="Sí, eliminar permanentemente">✅</button>
                  <button class="sm-item-confirm-no" @click="cancelDelete(item.idProducto!)" title="Cancelar">❌</button>
                </template>
                <template v-else-if="item.idProducto && pendingVaciar.has(item.idProducto)">
                  <span class="sm-item-confirm-msg">¿Vaciar stock?</span>
                  <button class="sm-item-confirm-yes" @click="ejecutarVaciar(item)" title="Sí, poner stock en 0">🧹</button>
                  <button class="sm-item-confirm-no" @click="cancelVaciar(item.idProducto!)" title="Cancelar">❌</button>
                </template>
                <button v-else class="sm-item-vaciar" @click="item.idProducto && iniciarVaciar(item.idProducto)" title="Poner stock en 0">🧹</button>
                <button class="sm-item-delete" @click="item.idProducto && iniciarEliminar(item.idProducto)" title="Eliminar este producto">🗑️</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="sinMovimientoFiltrado.length === 0" class="ia-empty">
          No hay productos en este filtro
        </div>
      </div>

      <!-- EMPTY STATE cuando todo esta bien -->
      <div v-if="!cargando && topVentasGranel.length === 0 && topVentasUnitarios.length === 0 && sinMovimiento.length === 0 && bajaRotacion.length === 0 && mayorUtilidad.length === 0" class="ia-empty-full">
        <div class="empty-icon">✅</div>
        <p class="empty-title">No hay datos disponibles</p>
        <p class="empty-sub">Carga los datos usando el botón de actualizar. Si el problema persiste, verifica la conexión con el servidor.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ia-panel{display:flex;flex-direction:column;gap:.75rem;height:100%;overflow-y:auto;overflow-x:hidden;padding:.25rem}

/* ---------- HEADER ---------- */
.ia-header{display:flex;align-items:flex-start;justify-content:space-between;padding:.75rem 1rem;background:linear-gradient(135deg,color-mix(in srgb,var(--color-accent) 15%,transparent),color-mix(in srgb,var(--color-accent) 5%,transparent));border:none;border-radius:12px;box-shadow:3px 3px 8px rgba(0,0,0,.08)}
.ia-header-left{display:flex;align-items:flex-start;gap:.6rem}
.ia-icon{font-size:1.5rem;flex-shrink:0}
.ia-title{margin:0;font-size:1rem;font-weight:700;color:var(--color-accent)}
.ia-desc{margin:.2rem 0 0;font-size:.68rem;color:var(--color-text-secondary);max-width:600px;line-height:1.4}
.ia-subtitle{margin:.15rem 0 0;font-size:.62rem;color:var(--color-text-secondary);opacity:.7}
.btn-refresh{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:var(--color-bg-panel);border:1px solid var(--color-border);border-radius:8px;cursor:pointer;font-size:.95rem;transition:all .15s;flex-shrink:0}
.btn-refresh:hover:not(:disabled){border-color:var(--color-accent)}
.btn-refresh:disabled{opacity:.4}
.spin{animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}

/* ---------- LOADING / ERROR ---------- */
.ia-loading{display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:3rem;color:var(--color-accent)}
.loading-orb{width:40px;height:40px;border:3px solid var(--color-border);border-top-color:var(--color-accent);border-radius:50%;animation:spin .8s linear infinite}
.ia-error{display:flex;align-items:center;gap:.5rem;padding:.75rem 1rem;background:color-mix(in srgb,var(--color-error) 12%,transparent);border:1px solid color-mix(in srgb,var(--color-error) 30%,transparent);border-radius:8px;color:var(--color-error);font-size:.82rem}
.ia-error button{padding:.3rem .6rem;border:none;border-radius:4px;background:var(--color-error);color:#fff;cursor:pointer;font-size:.7rem;font-weight:600;margin-left:auto}

/* ---------- KPI CARDS ---------- */
.ia-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:.5rem}
.kpi-card{display:flex;align-items:center;gap:.5rem;padding:.6rem .65rem;background:var(--color-bg-secondary);border:none;border-radius:10px;box-shadow:2px 2px 5px rgba(0,0,0,.06);position:relative}
.kpi-icon{font-size:1.1rem;flex-shrink:0}
.kpi-body{display:flex;flex-direction:column;gap:.05rem;flex:1;min-width:0}
.kpi-label{font-size:.55rem;color:var(--color-text-secondary);text-transform:uppercase;font-weight:600}
.kpi-value{font-size:.88rem;font-weight:800;color:var(--color-text-primary);line-height:1.2}
.kpi-sub{font-size:.55rem;color:var(--color-text-secondary);margin-top:.05rem}
.kpi-warn .kpi-value{color:var(--color-warning)}
.kpi-danger .kpi-value{color:var(--color-error)}
.kpi-accent .kpi-value{color:var(--color-accent)}
.kpi-info .kpi-value{color:var(--color-success)}

/* ---------- TOOLTIP ---------- */
.info-tip{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:var(--color-text-secondary);color:var(--color-bg-primary);font-size:9px;font-weight:700;cursor:help;position:relative;flex-shrink:0;transition:all .15s}
.info-tip:hover{background:var(--color-accent)}
.info-tip::after{content:attr(data-tip);position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);padding:6px 10px;background:var(--color-bg-panel,#1e1e32);border:1px solid var(--color-border,#444);border-radius:6px;font-size:11px;font-weight:400;line-height:1.4;white-space:normal;width:260px;color:var(--color-text-primary);box-shadow:0 6px 20px rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .15s;z-index:100;text-align:left}
.info-tip:hover::after{opacity:1}

/* ---------- ALERTS ---------- */
.ia-alerts{display:flex;flex-direction:column;gap:.35rem}
.ia-alerts-list{display:flex;flex-direction:column;gap:.25rem}
.ia-alert-item{display:flex;align-items:center;gap:.5rem;padding:.4rem .6rem;border-radius:6px;font-size:.7rem;box-shadow:1px 1px 3px rgba(0,0,0,.04)}
.ia-alert-item.sev-alta{background:color-mix(in srgb,var(--color-error) 10%,transparent);border:1px solid color-mix(in srgb,var(--color-error) 20%,transparent)}
.ia-alert-item.sev-media{background:color-mix(in srgb,var(--color-warning) 10%,transparent);border:1px solid color-mix(in srgb,var(--color-warning) 20%,transparent)}
.ia-alert-item.sev-baja{background:color-mix(in srgb,var(--color-info) 10%,transparent);border:1px solid color-mix(in srgb,var(--color-info) 20%,transparent)}
.ia-alert-icon{font-size:.75rem;flex-shrink:0}
.ia-alert-msg{flex:1;color:var(--color-text-primary);font-weight:500}
.ia-alert-tag{font-size:.5rem;padding:.1rem .3rem;border-radius:3px;background:color-mix(in srgb,var(--color-text-primary) 10%,transparent);color:var(--color-text-secondary);text-transform:uppercase;font-weight:600;cursor:help}

/* ---------- SECTION HEADERS ---------- */
.ia-section-header{display:flex;align-items:center;gap:.3rem}
.ia-section-title{margin:0;font-size:.72rem;font-weight:700;color:var(--color-accent);display:flex;align-items:center;gap:.3rem}
.ia-section-desc{font-size:.6rem;color:var(--color-text-secondary);margin:.1rem 0 0;line-height:1.3}
.ia-section-highlight{display:inline-block;margin-left:.5rem;padding:.05rem .4rem;background:color-mix(in srgb,var(--color-warning) 15%,transparent);color:var(--color-warning);border-radius:3px;font-weight:600}

/* ---------- EMPTY ---------- */
.ia-empty{padding:1.2rem;text-align:center;color:var(--color-text-secondary);font-size:.7rem}
.ia-empty-full{display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:3rem;color:var(--color-text-secondary);text-align:center}
.ia-empty-full .empty-icon{font-size:2.5rem;opacity:.5}
.ia-empty-full .empty-title{font-size:.9rem;font-weight:700;margin:0;color:var(--color-text-primary)}
.ia-empty-full .empty-sub{font-size:.7rem;opacity:.7;margin:0}

/* ---------- GRID ---------- */
.ia-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.6rem}
.ia-section{background:var(--color-bg-secondary);border:none;border-radius:10px;padding:.65rem .7rem;display:flex;flex-direction:column;gap:.35rem;box-shadow:2px 2px 5px rgba(0,0,0,.06)}
.ia-section-full{grid-column:1 / -1}

/* ---------- TABLE ---------- */
.ia-table-wrap{overflow-x:auto;margin-top:.1rem}
.ia-table{width:100%;border-collapse:collapse;font-size:.65rem}
.ia-table th{text-align:left;padding:.3rem .35rem;color:var(--color-text-secondary);font-size:.58rem;text-transform:uppercase;font-weight:600;border-bottom:1px solid var(--color-border);cursor:help}
.ia-table td{padding:.28rem .35rem;color:var(--color-text-primary);border-bottom:1px solid color-mix(in srgb,var(--color-border) 30%,transparent)}
.ia-table tr:last-child td{border-bottom:none}
.ia-rank{font-weight:700;color:var(--color-accent);width:22px;text-align:center;font-size:.6rem}
.ia-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px}
.ia-num{font-family:monospace;font-weight:600;text-align:right;white-space:nowrap}
.ia-monto{font-family:monospace;font-weight:700;color:var(--color-success);text-align:right;white-space:nowrap}
.ia-warn{color:var(--color-warning)}
.ia-action{text-align:center;width:36px}

/* ---------- MARGEN BADGE ---------- */
.margen-badge{display:inline-block;padding:.05rem .35rem;border-radius:3px;font-weight:700;font-size:.6rem}
.margen-badge.margen-alta{background:rgba(16,185,129,.15);color:#34d399}
.margen-badge.margen-media{background:rgba(251,191,36,.15);color:#fbbf24}
.margen-badge.margen-baja{background:rgba(239,68,68,.15);color:#ef4444}

/* ---------- SIN MOVIMIENTO: TABS ---------- */
.sm-tabs{display:flex;gap:.25rem;flex-wrap:wrap}
.sm-tab{padding:.3rem .5rem;border:1px solid var(--color-border);border-radius:6px;background:transparent;color:var(--color-text-secondary);font-size:.62rem;font-weight:600;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:.25rem}
.sm-tab:hover{border-color:var(--color-accent);color:var(--color-accent)}
.sm-tab.active{background:color-mix(in srgb,var(--color-accent) 15%,transparent);border-color:var(--color-accent);color:var(--color-accent)}
.sm-tab-count{font-size:.52rem;padding:.05rem .3rem;border-radius:4px;background:color-mix(in srgb,var(--color-text-primary) 10%,transparent);font-weight:700}
.sm-tab.active .sm-tab-count{background:color-mix(in srgb,var(--color-accent) 20%,transparent)}

/* ---------- SIN MOVIMIENTO: CONTROLS ---------- */
.sm-controls{display:flex;align-items:center;gap:.5rem;padding:.35rem .5rem;background:var(--color-bg-secondary);border-radius:6px;margin-top:.25rem}
.sm-control-btn{padding:.25rem .5rem;border:1px solid var(--color-border);border-radius:4px;background:transparent;color:var(--color-text-secondary);font-size:.58rem;font-weight:600;cursor:pointer;transition:all .15s}
.sm-control-btn:hover:not(:disabled){border-color:var(--color-accent);color:var(--color-accent);background:color-mix(in srgb,var(--color-accent) 5%,transparent)}
.sm-control-btn:disabled{opacity:.4;cursor:not-allowed}
.sm-controls-info{margin-left:auto;font-size:.58rem;color:var(--color-text-secondary);font-weight:600}

/* ---------- SIN MOVIMIENTO: ACTION BAR ---------- */
.sm-bar{display:flex;align-items:center;gap:.5rem;padding:.35rem .5rem;background:var(--color-bg-primary);border:none;border-radius:6px;flex-wrap:wrap}
.sm-bar-selectall{display:flex;align-items:center;gap:.3rem;font-size:.62rem;color:var(--color-text-secondary);cursor:pointer;user-select:none}
.sm-bar-selectall input{cursor:pointer}
.sm-bar-info{font-size:.6rem;color:var(--color-accent);font-weight:600;padding:.1rem .35rem;background:color-mix(in srgb,var(--color-accent) 10%,transparent);border-radius:4px}
.sm-bar-actions{display:flex;gap:.3rem;margin-left:auto}
.sm-btn{padding:.25rem .5rem;border:none;border-radius:4px;font-size:.6rem;font-weight:600;cursor:pointer;transition:all .15s}
.sm-btn-delete{background:color-mix(in srgb,var(--color-error) 15%,transparent);color:var(--color-error)}
.sm-btn-delete:hover:not(:disabled){background:color-mix(in srgb,var(--color-error) 30%,transparent)}
.sm-btn-delete:disabled{opacity:.4;cursor:not-allowed}
.sm-btn-confirm{background:color-mix(in srgb,var(--color-success) 20%,transparent);color:var(--color-success)}
.sm-btn-confirm:hover:not(:disabled){background:color-mix(in srgb,var(--color-success) 35%,transparent)}
.sm-btn-confirm:disabled{opacity:.4;cursor:not-allowed}
.sm-btn-cancel{background:color-mix(in srgb,var(--color-text-secondary) 15%,transparent);color:var(--color-text-secondary)}
.sm-btn-cancel:hover{background:color-mix(in srgb,var(--color-text-secondary) 30%,transparent)}
.sm-btn-vaciar{background:color-mix(in srgb,var(--color-info) 18%,transparent);color:var(--color-info)}
.sm-btn-vaciar:hover:not(:disabled){background:color-mix(in srgb,var(--color-info) 32%,transparent)}
.sm-btn-vaciar:disabled{opacity:.4;cursor:not-allowed}

/* ---------- SIN MOVIMIENTO: WARNING ---------- */
.sm-warning{padding:.35rem .5rem;background:color-mix(in srgb,var(--color-error) 12%,transparent);border:1px solid color-mix(in srgb,var(--color-error) 25%,transparent);border-radius:6px;font-size:.65rem;color:var(--color-error)}
.sm-warning strong{font-weight:800}

/* ---------- SIN MOVIMIENTO: CATEGORIES ---------- */
.sm-categorias{display:flex;flex-direction:column;gap:.35rem}
.sm-cat{background:var(--color-bg-primary);border:1px solid var(--color-border);border-radius:8px;overflow:hidden}
.sm-cat-header{display:flex;align-items:center;gap:.4rem;padding:.4rem .5rem;cursor:pointer;transition:all .1s;user-select:none}
.sm-cat-header:hover{background:color-mix(in srgb,var(--color-accent) 5%,transparent)}
.sm-cat-chevron{font-size:.55rem;color:var(--color-text-secondary);width:12px;flex-shrink:0}
.sm-cat-icon{font-size:.8rem;flex-shrink:0}
.sm-cat-name{font-size:.7rem;font-weight:600;color:var(--color-text-primary);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sm-cat-count{font-size:.55rem;color:var(--color-text-secondary);background:var(--color-bg-secondary);padding:.05rem .35rem;border-radius:4px}
.sm-cat-valor{font-size:.6rem;font-weight:700;color:var(--color-warning);font-family:monospace;text-align:right}
.sm-cat-margen{font-size:.55rem;font-weight:700;padding:.05rem .3rem;border-radius:4px;font-family:monospace}
.sm-cat-margen.margen-alta{background:rgba(16,185,129,.15);color:#34d399}
.sm-cat-margen.margen-media{background:rgba(251,191,36,.15);color:#fbbf24}
.sm-cat-margen.margen-baja{background:rgba(239,68,68,.15);color:#ef4444}

/* ---------- SIN MOVIMIENTO: ITEMS ---------- */
.sm-cat-body{display:flex;flex-direction:column;border-top:1px solid var(--color-border)}
.sm-item{display:flex;align-items:center;gap:.35rem;padding:.3rem .5rem;border-bottom:1px solid color-mix(in srgb,var(--color-border) 30%,transparent);transition:background .1s;font-size:.62rem}
.sm-item:last-child{border-bottom:none}
.sm-item:hover{background:color-mix(in srgb,var(--color-accent) 3%,transparent)}
.sm-item-pending{background:color-mix(in srgb,var(--color-error) 10%,transparent)!important}
.sm-item-vaciando{background:color-mix(in srgb,var(--color-info) 10%,transparent)!important}
.sm-item-cb{cursor:pointer;flex-shrink:0}
.sm-item-name{flex:1;min-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;color:var(--color-text-primary)}
.sm-item-stock{font-family:monospace;font-weight:600;text-align:right;width:55px;flex-shrink:0;color:var(--color-text-primary)}
.sm-item-costo{font-family:monospace;text-align:right;width:55px;flex-shrink:0;color:var(--color-text-secondary)}
.sm-item-valor{font-family:monospace;font-weight:700;text-align:right;width:70px;flex-shrink:0}
.sm-item-valor-warn{color:var(--color-warning)}
.sm-item-dias{font-size:.55rem;color:var(--color-text-secondary);width:50px;flex-shrink:0;text-align:center}
.sm-item-margen{font-family:monospace;font-weight:700;font-size:.58rem;width:40px;flex-shrink:0;text-align:center}
.sm-item-confirm-msg{font-size:.55rem;color:var(--color-error);font-weight:600;white-space:nowrap}
.sm-item-confirm-yes,.sm-item-confirm-no{background:none;border:none;cursor:pointer;font-size:.7rem;padding:.1rem;border-radius:3px;line-height:1}
.sm-item-confirm-yes:hover{background:color-mix(in srgb,var(--color-success) 20%,transparent)}
.sm-item-confirm-no:hover{background:color-mix(in srgb,var(--color-error) 20%,transparent)}
.sm-item-delete{background:none;border:none;cursor:pointer;font-size:.75rem;padding:.1rem;opacity:.4;transition:all .15s;border-radius:3px;line-height:1}
.sm-item-delete:hover{opacity:1;background:color-mix(in srgb,var(--color-error) 15%,transparent)}
.sm-item-vaciar{background:none;border:none;cursor:pointer;font-size:.75rem;padding:.1rem;opacity:.4;transition:all .15s;border-radius:3px;line-height:1}
.sm-item-vaciar:hover{opacity:1;background:color-mix(in srgb,var(--color-info) 15%,transparent)}

/* ---------- RESPONSIVE: TABLET (1024px) ---------- */
@media(max-width:1024px){
  .ia-kpis{grid-template-columns:repeat(3,1fr)}
  .ia-desc{font-size:.62rem}
}

/* ---------- RESPONSIVE: SMALL TABLET (768px) ---------- */
@media(max-width:768px){
  .ia-panel{gap:.5rem}
  .ia-header{padding:.5rem .65rem;flex-wrap:wrap;gap:.4rem}
  .ia-header-left{gap:.4rem}
  .ia-icon{font-size:1.2rem}
  .ia-title{font-size:.85rem}
  .ia-desc{font-size:.58rem;max-width:100%}
  .ia-kpis{grid-template-columns:repeat(2,1fr);gap:.35rem}
  .kpi-card{padding:.4rem .5rem;gap:.35rem}
  .kpi-icon{font-size:.95rem}
  .kpi-value{font-size:.78rem}
  .kpi-label{font-size:.5rem}
  .kpi-sub{font-size:.5rem}
  .ia-grid{grid-template-columns:1fr;gap:.45rem}
  .ia-section{padding:.5rem .55rem}
  .ia-section-title{font-size:.65rem}
  .ia-section-desc{font-size:.55rem}
  .info-tip::after{width:200px;font-size:10px;left:auto;right:0;transform:none}
  .ia-table{font-size:.6rem}
  .ia-table th{padding:.2rem .25rem;font-size:.52rem}
  .ia-table td{padding:.2rem .25rem}
  .ia-rank{width:18px;font-size:.52rem}
  .ia-name{max-width:100px}
  .margen-badge{font-size:.52rem;padding:.02rem .25rem}
  .btn-delete{font-size:.78rem}

  /* Sin Movimiento: compact items */
  .sm-item{padding:.25rem .35rem;font-size:.58rem;gap:.25rem}
  .sm-item-stock{width:40px;font-size:.55rem}
  .sm-item-costo{display:none}
  .sm-item-valor{width:55px;font-size:.55rem}
  .sm-item-dias{width:40px;font-size:.5rem}
  .sm-item-margen{display:none}
  .sm-cat-header{padding:.3rem .4rem}
  .sm-cat-name{font-size:.62rem}
  .sm-cat-valor{font-size:.55rem}
  .sm-tab{font-size:.55rem;padding:.2rem .4rem}
  .sm-bar{padding:.25rem .35rem;gap:.3rem}
  .sm-bar-selectall{font-size:.55rem}
  .sm-bar-info{font-size:.52rem}
  .sm-btn{font-size:.55rem;padding:.2rem .4rem}
}

/* ---------- RESPONSIVE: MOBILE (480px) ---------- */
@media(max-width:480px){
  .ia-panel{gap:.4rem;padding:.15rem}
  .ia-header{padding:.4rem .5rem}
  .ia-icon{font-size:1rem}
  .ia-title{font-size:.75rem}
  .ia-desc{display:none}
  .ia-subtitle{font-size:.55rem}
  .btn-refresh{width:28px;height:28px;font-size:.8rem}
  .ia-kpis{grid-template-columns:1fr 1fr;gap:.25rem}
  .kpi-card{padding:.35rem .4rem;gap:.25rem}
  .kpi-icon{font-size:.85rem}
  .kpi-value{font-size:.7rem}
  .kpi-label{font-size:.45rem}
  .kpi-sub{font-size:.45rem}
  .ia-section{padding:.4rem .45rem;gap:.25rem}
  .ia-section-title{font-size:.6rem}
  .ia-section-desc{font-size:.5rem}
  .ia-section-highlight{display:block;margin:.15rem 0 0}

  /* Grid children: 1=TopGranel(4col), 2=TopUnit(4col), 3=MayorUtil(6col), 4=BajaRot(6col) */

  /* Grid child 3 (Mayor Utilidad): hide P.costo(col3) and P.venta(col4) */
  .ia-grid > .ia-section:nth-child(3) .ia-table th:nth-child(3),
  .ia-grid > .ia-section:nth-child(3) .ia-table td:nth-child(3),
  .ia-grid > .ia-section:nth-child(3) .ia-table th:nth-child(4),
  .ia-grid > .ia-section:nth-child(3) .ia-table td:nth-child(4) { display:none }

  /* Grid child 4 (Baja Rotación): hide Costo en stock(col6) */
  .ia-grid > .ia-section:nth-child(4) .ia-table th:nth-child(6),
  .ia-grid > .ia-section:nth-child(4) .ia-table td:nth-child(6) { display:none }

  /* Sin Movimiento: compact */
  .sm-item{padding:.2rem .3rem;font-size:.55rem;gap:.2rem}
  .sm-item-stock{width:35px;font-size:.5rem}
  .sm-item-valor{width:48px;font-size:.5rem}
  .sm-item-dias{font-size:.45rem;width:35px}
  .sm-item-delete{font-size:.65rem}
  .sm-item-confirm-msg{font-size:.5rem}
  .sm-item-confirm-yes,.sm-item-confirm-no{font-size:.6rem}
  .sm-cat-header{padding:.25rem .35rem;gap:.25rem}
  .sm-cat-name{font-size:.58rem}
  .sm-cat-icon{font-size:.7rem}
  .sm-cat-count{font-size:.5rem}
  .sm-cat-valor{font-size:.5rem}
  .sm-tabs{gap:.2rem}
  .sm-tab{font-size:.5rem;padding:.15rem .3rem}
  .sm-tab-count{font-size:.45rem}
  .sm-bar{padding:.2rem .3rem;gap:.2rem;flex-direction:column;align-items:stretch}
  .sm-bar-selectall{font-size:.5rem}
  .sm-bar-info{font-size:.48rem;text-align:center}
  .sm-bar-actions{margin-left:0;justify-content:center}
  .sm-btn{font-size:.52rem;padding:.2rem .35rem}
  .sm-warning{font-size:.55rem;padding:.25rem .35rem}

  .ia-table{font-size:.55rem}
  .ia-table th{padding:.15rem .2rem;font-size:.48rem}
  .ia-table td{padding:.15rem .2rem}
  .ia-rank{width:16px;font-size:.48rem;min-width:16px}
  .ia-name{max-width:80px;font-size:.55rem}
  .ia-num{font-size:.52rem}
  .ia-monto{font-size:.52rem}
  .ia-action{width:28px}
  .margen-badge{font-size:.48rem}
  .btn-delete{font-size:.7rem;padding:.1rem}
  .ia-alert-item{padding:.3rem .4rem;font-size:.62rem;flex-wrap:wrap;gap:.25rem}
  .ia-alert-tag{font-size:.45rem}
  .ia-empty-full{padding:2rem 1rem}
  .ia-loading{padding:2rem;font-size:.8rem}
  .loading-orb{width:30px;height:30px}
  .ia-alert-msg{width:100%;order:1}
  .ia-alert-tag{order:2;margin-left:auto}
  .ia-alert-icon{order:0}
  .info-tip::after{width:160px;font-size:9px;right:-8px;left:auto;transform:none}
}

/* ---------- RESPONSIVE: TINY MOBILE (360px) ---------- */
@media(max-width:360px){
  .ia-kpis{grid-template-columns:1fr 1fr}
  .kpi-card{padding:.3rem .35rem}
  .kpi-value{font-size:.62rem}
  .kpi-label{font-size:.42rem}
  .ia-title{font-size:.68rem}
  .ia-section{padding:.35rem .4rem}
  .ia-section-title{font-size:.55rem}
  .ia-table{font-size:.5rem}
  .ia-name{max-width:60px;font-size:.5rem}
  .ia-rank{width:14px;font-size:.42rem;min-width:14px}
  .ia-num{font-size:.48rem}
  .ia-monto{font-size:.48rem}
  .ia-action{width:24px}
  .btn-delete{font-size:.6rem}

  /* Sin Movimiento: hide costo column */
  .sm-item-costo{display:none}

  /* Grid child 4 (Baja Rotación): also hide Venta/dia(col4) */
  .ia-grid > .ia-section:nth-child(4) .ia-table th:nth-child(4),
  .ia-grid > .ia-section:nth-child(4) .ia-table td:nth-child(4) { display:none }

  .info-tip::after{width:140px;font-size:8px;right:-4px}
}
</style>
