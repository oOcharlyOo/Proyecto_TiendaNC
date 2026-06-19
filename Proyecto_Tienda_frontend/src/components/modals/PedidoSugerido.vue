<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

type CajaInfo = {
  piezas: number;
  precioCaja: number;
  costoPorPieza: number;
  ahorroVsIndividual: number;
};

type Sugerencia = {
  idProducto: number;
  nombreProducto: string;
  codigoBarras: string | null;
  categoria: string | null;
  subcategoria: string | null;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  precioCosto: number;
  precioVenta: number;
  gananciaEstimada: number;
  ventasUltimos7Dias: number;
  ventasUltimos30Dias: number;
  ventasDiariasPromedio: number;
  diasInventarioRestante: number;
  cantidadSugerida: number;
  costoEstimado: number;
  isGramaje: boolean;
  motivo: string;
  presentacionCaja?: string;
  cajasDisponibles?: CajaInfo[];
  cajaSugerida?: number;
  cajasSugeridas?: number;
  costoCajaTotal?: number;
  ahorroEstimado?: number;
  sugerirCaja?: boolean;
  diasStockConCaja?: number;
  saldoCajaActual?: number;
  totalPedidosEntregarHoy?: number;
  presupuestoDisponible?: number;
  sugeridoExcedePresupuesto?: boolean;
  presupuestoAjustado?: boolean;
};

const sugerencias = ref<Sugerencia[]>([]);
const seleccionadas = ref<Set<number>>(new Set());
const periodo = ref<'mensual' | 'semanal'>('mensual');
const presupuesto = ref<'alto' | 'medio' | 'bajo'>('medio');
const modoPresupuesto = ref<'tier' | 'custom'>('tier');
const montoCustom = ref<string>('');
const cargando = ref(false);
const buscarProducto = ref('');
const emit = defineEmits(['pedido-creado']);

async function cargar() {
  cargando.value = true;
  buscarProducto.value = '';
  try {
    let url: string;
    if (modoPresupuesto.value === 'custom' && montoCustom.value) {
      const monto = parseFloat(montoCustom.value);
      if (isNaN(monto) || monto <= 0) {
        sugerencias.value = [];
        seleccionadas.value = new Set();
        cargando.value = false;
        return;
      }
      url = `${API_BASE}/pedidos-proveedor/sugerido-por-monto?periodo=${periodo.value}&monto=${monto}`;
    } else {
      url = `${API_BASE}/pedidos-proveedor/sugerido?periodo=${periodo.value}&presupuesto=${presupuesto.value}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    if (data.codigo === 200 && data.datos) {
      sugerencias.value = data.datos;
      seleccionadas.value = new Set(data.datos.map((s: Sugerencia) => s.idProducto));
    } else {
      sugerencias.value = [];
    }
  } catch (e) {
    console.error('Error cargando sugerencias:', e);
    sugerencias.value = [];
  } finally {
    cargando.value = false;
  }
}

function toggle(id: number) {
  const next = new Set(seleccionadas.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  seleccionadas.value = next;
}

function seleccionarTodas() {
  seleccionadas.value = new Set(sugerenciasFiltradas.value.map(s => s.idProducto));
}

function deseleccionarTodas() {
  const ids = sugerenciasFiltradas.value.map(s => s.idProducto);
  const next = new Set(seleccionadas.value);
  ids.forEach(id => next.delete(id));
  seleccionadas.value = next;
}

const sugerenciasFiltradas = computed(() => {
  let list = [...sugerencias.value];
  if (buscarProducto.value) {
    const q = buscarProducto.value.toLowerCase();
    list = list.filter(s => s.nombreProducto.toLowerCase().includes(q));
  }
  list.sort((a, b) => {
    const aSinStock = a.stockActual <= 0;
    const bSinStock = b.stockActual <= 0;
    if (aSinStock && !bSinStock) return -1;
    if (!aSinStock && bSinStock) return 1;
    if (aSinStock && bSinStock) {
      return (b.ventasDiariasPromedio || 0) - (a.ventasDiariasPromedio || 0);
    }
    if (a.stockActual <= a.stockMinimo && b.stockActual > b.stockMinimo) return -1;
    if (a.stockActual > a.stockMinimo && b.stockActual <= b.stockMinimo) return 1;
    return (b.ventasDiariasPromedio || 0) - (a.ventasDiariasPromedio || 0);
  });
  return list;
});

const totalSeleccionado = computed(() =>
  sugerencias.value
    .filter(s => seleccionadas.value.has(s.idProducto))
    .reduce((sum, s) => sum + (s.costoEstimado || 0), 0)
);

const infoCaja = computed(() => {
  const first = sugerencias.value[0];
  if (!first || first.saldoCajaActual == null) return null;
  return {
    saldoCajaActual: first.saldoCajaActual,
    totalPedidosEntregarHoy: first.totalPedidosEntregarHoy ?? 0,
    presupuestoDisponible: first.presupuestoDisponible ?? 0,
    sugeridoExcedePresupuesto: first.sugeridoExcedePresupuesto ?? false,
    presupuestoAjustado: first.presupuestoAjustado ?? false,
  };
});

function formatoMoneda(v: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
}

function formatoGramaje(g: number) {
  const val = Math.max(0, Math.round(g || 0));
  if (val >= 1000) return (val / 1000).toFixed(2) + ' kg';
  return val + ' g';
}

function formatoCantidad(s: Sugerencia) {
  return s.isGramaje ? formatoGramaje(s.cantidadSugerida) : s.cantidadSugerida + ' uds';
}

function formatoStock(s: Sugerencia) {
  return s.isGramaje ? formatoGramaje(s.stockActual) : Math.max(0, s.stockActual) + ' uds';
}

function formatoVentaDia(s: Sugerencia) {
  return s.isGramaje ? formatoGramaje(s.ventasDiariasPromedio) : s.ventasDiariasPromedio + '/día';
}

function getMotivoIcon(motivo: string) {
  if (motivo.includes('Sin stock')) return '💀';
  if (motivo.includes('mínimo')) return '⚠️';
  return '⏳';
}

function getUrgencyClass(s: Sugerencia) {
  if (s.stockActual <= 0) return 'urgency-critical';
  if (s.diasInventarioRestante <= 3) return 'urgency-high';
  if (s.diasInventarioRestante <= 7) return 'urgency-medium';
  return 'urgency-low';
}

async function crearPedido() {
  const seleccionados = sugerencias.value.filter(s => seleccionadas.value.has(s.idProducto));
  if (seleccionados.length === 0) return;

  const idProveedor = prompt('ID del proveedor para este pedido:');
  if (!idProveedor) return;

  const fechaEntrega = prompt('Fecha de entrega esperada (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
  if (!fechaEntrega) return;

  const detalles = seleccionados.map(s => ({
    idProducto: s.idProducto,
    cantidad: s.cantidadSugerida,
    precioUnitario: s.precioCosto,
    subtotal: s.precioCosto * s.cantidadSugerida
  }));

  const montoTotal = detalles.reduce((sum, d) => sum + d.subtotal, 0);

  try {
    await fetch(`${API_BASE}/pedidos-proveedor/crear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idProveedor: parseInt(idProveedor),
        fechaEntregaEsperada: fechaEntrega,
        montoTotal,
        montoApartado: 0,
        estatus: 'PENDIENTE',
        notas: 'Pedido generado desde sugerencias',
        detalles
      })
    });
    alert('Pedido creado exitosamente');
    emit('pedido-creado');
  } catch (e) {
    console.error('Error creando pedido:', e);
    alert('Error al crear el pedido');
  }
}

onMounted(() => cargar());

defineExpose({ cargar });
</script>

<template>
  <div class="sugerido-panel">
    <!-- HEADER -->
    <div class="sugerido-header">
      <div class="header-left">
        <span class="header-icon">🧙</span>
        <div>
          <h3 class="header-title">Pedido Sugerido</h3>
          <p class="header-subtitle">Ventas de los últimos {{ periodo === 'mensual' ? '30' : '7' }} días</p>
        </div>
      </div>
      <div class="header-right">
        <select v-model="periodo" @change="cargar" class="periodo-select">
          <option value="mensual">30 días</option>
          <option value="semanal">7 días</option>
        </select>
        <div class="budget-mode-toggle">
          <button :class="['mode-btn', { active: modoPresupuesto === 'tier' }]" @click="modoPresupuesto = 'tier'; cargar()">📊 Niveles</button>
          <button :class="['mode-btn', { active: modoPresupuesto === 'custom' }]" @click="modoPresupuesto = 'custom'; cargar()">💰 Monto</button>
        </div>
        <template v-if="modoPresupuesto === 'tier'">
          <div class="budget-selector">
            <button :class="['budget-btn', { active: presupuesto === 'bajo' }]" @click="presupuesto = 'bajo'; cargar()">💚 Bajo</button>
            <button :class="['budget-btn', { active: presupuesto === 'medio' }]" @click="presupuesto = 'medio'; cargar()">💛 Medio</button>
            <button :class="['budget-btn', { active: presupuesto === 'alto' }]" @click="presupuesto = 'alto'; cargar()">❤️ Alto</button>
          </div>
        </template>
        <template v-else>
          <div class="custom-budget">
            <span class="currency-symbol">$</span>
            <input
              v-model="montoCustom"
              @keyup.enter="cargar"
              @blur="cargar"
              type="number"
              min="1"
              step="100"
              placeholder="3000"
              class="monto-input"
            />
          </div>
        </template>
        <button class="btn-refresh" @click="cargar" :disabled="cargando">
          <span :class="{ spin: cargando }">🔄</span>
        </button>
      </div>
    </div>

    <!-- SEARCH -->
    <div class="s-search-box">
      <span class="search-icon">🔍</span>
      <input v-model="buscarProducto" placeholder="Buscar producto por nombre..." class="s-search-input">
      <button v-if="buscarProducto" class="s-clear-btn" @click="buscarProducto = ''">✕</button>
    </div>

    <!-- LOADING -->
    <div v-if="cargando" class="sugerido-loading">
      <div class="loading-orb"></div>
      <p>Analizando el inventario...</p>
    </div>

    <!-- EMPTY -->
    <div v-else-if="sugerencias.length === 0" class="sugerido-empty">
      <div class="empty-icon">✨</div>
      <p class="empty-title">Todo en orden</p>
      <p class="empty-sub">No hay productos que necesiten reabastecimiento</p>
    </div>

    <!-- CONTENT -->
    <template v-else>
      <!-- TOTAL BAR (top, always visible) -->
      <div class="s-total-bar s-total-bar-top">
        <span class="total-label">Total estimado:</span>
        <span class="total-value">{{ formatoMoneda(totalSeleccionado) }}</span>
        <span class="total-items">{{ seleccionadas.size }} producto{{ seleccionadas.size !== 1 ? 's' : '' }}</span>
      </div>

      <!-- CAJA / PRESUPUESTO BAR -->
      <div v-if="infoCaja" class="ps-caja-bar" :class="{ 'excede': infoCaja.sugeridoExcedePresupuesto, 'ajustado': infoCaja.presupuestoAjustado }">
        <div class="caja-bar-row">
          <span class="caja-bar-label">💰 Saldo en caja:</span>
          <span class="caja-bar-value">{{ formatoMoneda(infoCaja.saldoCajaActual) }}</span>
        </div>
        <div class="caja-bar-row">
          <span class="caja-bar-label">📦 Pedidos por entregar hoy:</span>
          <span class="caja-bar-value egreso">-{{ formatoMoneda(infoCaja.totalPedidosEntregarHoy) }}</span>
        </div>
        <div class="caja-bar-row">
          <span class="caja-bar-label">🎯 Presupuesto disponible:</span>
          <span class="caja-bar-value" :class="{ 'negativo': infoCaja.presupuestoDisponible < 0 }">{{ formatoMoneda(infoCaja.presupuestoDisponible) }}</span>
        </div>
        <div v-if="infoCaja.presupuestoAjustado" class="caja-bar-info">
          ✂️ Cantidades ajustadas automáticamente al presupuesto disponible
        </div>
        <div v-else-if="infoCaja.sugeridoExcedePresupuesto" class="caja-bar-alerta">
          ⚠️ El total sugerido excede el presupuesto disponible. Revisa la caja antes de crear pedidos.
        </div>
      </div>

      <!-- TOOLBAR -->
      <div class="sugerido-toolbar">
        <div class="toolbar-info">
          <span class="sel-count">{{ seleccionadas.size }}/{{ sugerenciasFiltradas.length }} seleccionados</span>
        </div>
        <div class="toolbar-actions">
          <button class="btn-tool" @click="seleccionarTodas">☑ Todos</button>
          <button class="btn-tool" @click="deseleccionarTodas">☐ Ninguno</button>
          <button class="btn-create" @click="crearPedido" :disabled="seleccionadas.size === 0">
            🛒 Crear Pedido
          </button>
        </div>
      </div>

      <!-- CARDS -->
      <div class="sugerido-cards">
        <div
          v-for="s in sugerenciasFiltradas"
          :key="s.idProducto"
          class="s-card"
          :class="[getUrgencyClass(s), { selected: seleccionadas.has(s.idProducto) }]"
          @click="toggle(s.idProducto)"
        >
          <!-- Card top bar -->
          <div class="s-card-bar">
            <div class="s-check">
              <span v-if="seleccionadas.has(s.idProducto)" class="check-mark">✓</span>
            </div>
            <div class="s-title-area">
              <span class="s-name">{{ s.nombreProducto }}</span>
              <div class="s-badges">
                <span v-if="s.categoria" class="badge badge-cat">{{ s.categoria }}</span>
                <span v-if="s.subcategoria && s.subcategoria !== 'Sin subcategoría'" class="badge badge-sub">{{ s.subcategoria }}</span>
                <span v-if="s.isGramaje" class="badge badge-gram">⚖️</span>
              </div>
            </div>
            <div class="s-alert">
              <span class="alert-icon">{{ getMotivoIcon(s.motivo) }}</span>
              <span class="alert-text">{{ s.motivo }}</span>
            </div>
          </div>

          <!-- Card body -->
          <div class="s-card-body">
            <div class="s-section">
              <div class="s-section-label">Situación actual</div>
              <div class="s-stats">
                <div class="s-stat">
                  <span class="s-stat-label">Stock</span>
                  <span class="s-stat-value" :class="{ critical: s.stockActual <= 0, low: s.stockActual > 0 && s.stockActual <= s.stockMinimo }">
                    {{ formatoStock(s) }}
                  </span>
                </div>
                <div class="s-stat">
                  <span class="s-stat-label">Venta/día</span>
                  <span class="s-stat-value accent">{{ formatoVentaDia(s) }}</span>
                </div>
                <div class="s-stat">
                  <span class="s-stat-label">Duración</span>
                  <span class="s-stat-value" :class="{ critical: s.diasInventarioRestante <= 3, low: s.diasInventarioRestante > 3 && s.diasInventarioRestante <= 7 }">
                    {{ s.diasInventarioRestante === -1 ? 'Sin ventas' : '~' + s.diasInventarioRestante + (s.diasInventarioRestante === 1 ? ' día' : ' días') }}
                  </span>
                </div>
              </div>
            </div>

            <div class="s-divider"></div>

            <div class="s-section">
              <div class="s-section-label">Sugerencia</div>
              <div class="s-suggestion">
                <div class="s-sug-item">
                  <span class="s-sug-label">Pedir</span>
                  <span class="s-sug-value qty">{{ formatoCantidad(s) }}</span>
                </div>
                <div class="s-sug-item">
                  <span class="s-sug-label">Costo</span>
                  <span class="s-sug-value cost">{{ formatoMoneda(s.costoEstimado) }}</span>
                </div>
                <div class="s-sug-item">
                  <span class="s-sug-label">Ganancia</span>
                  <span class="s-sug-value profit">{{ formatoMoneda(s.gananciaEstimada || 0) }}</span>
                </div>
              </div>
              <div class="s-suggestion s-prices">
                <div class="s-sug-item">
                  <span class="s-sug-label">P. costo</span>
                  <span class="s-sug-value">{{ formatoMoneda(s.precioCosto) }}{{ s.isGramaje ? '/kg' : '/ud' }}</span>
                </div>
                <div class="s-sug-item">
                  <span class="s-sug-label">P. venta</span>
                  <span class="s-sug-value">{{ formatoMoneda(s.precioVenta || 0) }}{{ s.isGramaje ? '/kg' : '/ud' }}</span>
                </div>
              </div>
            </div>

            <!-- Caja badge -->
            <div v-if="s.sugerirCaja && s.cajaSugerida" class="ps-caja-badge">
              <span class="caja-icon">📦</span>
              <span class="caja-text">Sugerido: Caja de {{ s.cajaSugerida }} pzs × {{ s.cajasSugeridas }} = {{ s.cantidadSugerida }} pzs</span>
              <span v-if="s.diasStockConCaja" class="caja-dias">Duración: ~{{ s.diasStockConCaja }}d</span>
            </div>
            <div v-if="s.cajasDisponibles && s.cajasDisponibles.length > 0" class="ps-caja-options">
              <span class="caja-options-label">Opciones:</span>
              <button
                v-for="caja in s.cajasDisponibles"
                :key="caja.piezas"
                class="caja-option-btn"
                :class="{ recommended: caja.piezas === s.cajaSugerida }"
                @click.stop
              >
                📦 {{ caja.piezas }}pzs - {{ formatoMoneda(caja.precioCaja) }}
              </button>
            </div>
          </div>
        </div>
        <div v-if="sugerenciasFiltradas.length === 0" class="s-no-results">
          No se encontraron productos
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sugerido-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  overflow: hidden;
}

/* HEADER */
.sugerido-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(201, 146, 52, 0.15), rgba(201, 146, 52, 0.05));
  border: 1px solid rgba(201, 146, 52, 0.3);
  border-radius: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.header-icon {
  font-size: 1.5rem;
}

.header-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #f6f2de);
}

.header-subtitle {
  margin: 0;
  font-size: 0.7rem;
  color: var(--text-secondary, #888);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.periodo-select {
  padding: 0.35rem 0.6rem;
  background: var(--bg-secondary, #2a2a3e);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  color: var(--text-primary, #f6f2de);
  font-size: 0.75rem;
}

.btn-refresh {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary, #2a2a3e);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-refresh:hover {
  border-color: var(--accent-color, #c99234);
}

.budget-mode-toggle {
  display: flex;
  gap: 0.2rem;
  background: var(--bg-secondary, #2a2a3e);
  border: 1px solid var(--border-color, #333);
  border-radius: 8px;
  padding: 0.2rem;
}

.mode-btn {
  padding: 0.3rem 0.5rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary, #888);
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.mode-btn:hover {
  color: var(--text-primary, #f6f2de);
}

.mode-btn.active {
  background: var(--accent-color, #c99234);
  color: var(--bg-primary, #1a1a2e);
  font-weight: 700;
}

.custom-budget {
  display: flex;
  align-items: center;
  background: var(--bg-secondary, #2a2a3e);
  border: 1px solid var(--border-color, #333);
  border-radius: 8px;
  padding: 0.2rem 0.5rem;
  gap: 0.2rem;
}

.currency-symbol {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-color, #c99234);
}

.monto-input {
  width: 70px;
  padding: 0.3rem 0.4rem;
  background: transparent;
  border: none;
  color: var(--text-primary, #f6f2de);
  font-size: 0.8rem;
  font-weight: 700;
  font-family: monospace;
  outline: none;
}

.monto-input::-webkit-inner-spin-button,
.monto-input::-webkit-outer-spin-button {
  opacity: 0.5;
}

.monto-input::placeholder {
  color: var(--text-secondary, #888);
  font-weight: 400;
}

.budget-btn {
  padding: 0.3rem 0.5rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary, #888);
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.budget-btn:hover {
  color: var(--text-primary, #f6f2de);
}

.budget-btn.active {
  color: var(--bg-primary, #1a1a2e);
  font-weight: 700;
}

.budget-btn.active:nth-child(1) {
  background: #34d399;
}

.budget-btn.active:nth-child(2) {
  background: #fbbf24;
}

.budget-btn.active:nth-child(3) {
  background: #f87171;
}

.spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* SEARCH */
.s-search-box {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary, #2a2a3e);
  border: 1px solid var(--border-color, #333);
  border-radius: 10px;
}

.search-icon {
  font-size: 0.85rem;
  opacity: 0.5;
}

.s-search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary, #f6f2de);
  font-size: 0.8rem;
  outline: none;
}

.s-clear-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #888);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  transition: all 0.15s;
}

.s-clear-btn:hover {
  color: var(--text-primary, #f6f2de);
  background: rgba(255, 255, 255, 0.1);
}

/* LOADING */
.sugerido-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  color: var(--accent-color, #c99234);
}

.loading-orb {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color, #333);
  border-top-color: var(--accent-color, #c99234);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* EMPTY */
.sugerido-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  gap: 0.5rem;
}

.empty-icon {
  font-size: 2.5rem;
}

.empty-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #f6f2de);
}

.empty-sub {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary, #888);
}

/* TOOLBAR */
.sugerido-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary, #2a2a3e);
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sel-count {
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
}

.toolbar-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.btn-tool {
  padding: 0.3rem 0.6rem;
  background: var(--bg-panel, #252538);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  color: var(--text-secondary, #888);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-tool:hover {
  border-color: var(--accent-color, #c99234);
  color: var(--text-primary, #f6f2de);
}

.btn-create {
  padding: 0.35rem 0.75rem;
  background: var(--accent-color, #c99234);
  border: none;
  border-radius: 6px;
  color: var(--bg-primary, #1a1a2e);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-create:hover:not(:disabled) {
  filter: brightness(1.15);
}

.btn-create:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* CARDS */
.sugerido-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  flex: 1;
  padding-right: 0.25rem;
}

.s-card {
  background: var(--bg-secondary, #2a2a3e);
  border: 2px solid var(--border-color, #333);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.s-card:hover {
  border-color: rgba(201, 146, 52, 0.5);
}

.s-card.selected {
  border-color: var(--accent-color, #c99234);
  background: rgba(201, 146, 52, 0.08);
}

/* Urgency borders */
.s-card.urgency-critical { border-left: 4px solid #e74c3c; }
.s-card.urgency-high { border-left: 4px solid #e67e22; }
.s-card.urgency-medium { border-left: 4px solid #f1c40f; }
.s-card.urgency-low { border-left: 4px solid #3498db; }

.s-card-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border-color, #333);
}

.s-check {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border-color, #444);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.s-card.selected .s-check {
  background: var(--accent-color, #c99234);
  border-color: var(--accent-color, #c99234);
}

.check-mark {
  color: var(--bg-primary, #1a1a2e);
  font-size: 0.75rem;
  font-weight: 700;
}

.s-title-area {
  flex: 1;
  min-width: 0;
}

.s-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-primary, #f6f2de);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.s-badges {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.2rem;
  flex-wrap: wrap;
}

.badge {
  font-size: 0.6rem;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.badge-cat {
  background: rgba(201, 146, 52, 0.15);
  color: var(--accent-color, #c99234);
}

.badge-sub {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.badge-gram {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.s-alert {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(231, 76, 60, 0.1);
  border-radius: 5px;
  flex-shrink: 0;
}

.alert-icon {
  font-size: 0.8rem;
}

.alert-text {
  font-size: 0.65rem;
  color: #e74c3c;
  font-weight: 600;
  white-space: nowrap;
}

/* CARD BODY */
.s-card-body {
  padding: 0.6rem 0.75rem;
}

.s-section {
  margin-bottom: 0.4rem;
}

.s-section:last-child {
  margin-bottom: 0;
}

.s-section-label {
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary, #888);
  font-weight: 700;
  margin-bottom: 0.3rem;
}

.s-stats {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.s-stat {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  min-width: 70px;
}

.s-stat-label {
  font-size: 0.6rem;
  color: var(--text-secondary, #888);
}

.s-stat-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary, #f6f2de);
  font-family: monospace;
}

.s-stat-value.accent {
  color: var(--accent-color, #c99234);
}

.s-stat-value.critical {
  color: #e74c3c;
}

.s-stat-value.low {
  color: #e6a817;
}

.s-divider {
  height: 1px;
  background: var(--border-color, #333);
  margin: 0.4rem 0;
}

.s-suggestion {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.s-sug-item {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.3rem 0.5rem;
  background: var(--bg-panel, #252538);
  border-radius: 6px;
  flex: none;
}

.s-sug-label {
  font-size: 0.55rem;
  color: var(--text-secondary, #888);
  text-transform: uppercase;
}

.s-sug-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary, #f6f2de);
  font-family: monospace;
}

.s-sug-value.qty {
  color: #34d399;
  font-size: 0.95rem;
}

.s-sug-value.cost {
  color: var(--accent-color, #c99234);
}

.s-sug-value.profit {
  color: #34d399;
}

.s-prices {
  margin-top: 0.3rem;
}

/* TOTAL BAR */
.s-total-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  background: linear-gradient(135deg, rgba(201, 146, 52, 0.1), rgba(201, 146, 52, 0.05));
  border: 1px solid rgba(201, 146, 52, 0.3);
  border-radius: 8px;
}

.s-total-bar-top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(135deg, rgba(201, 146, 52, 0.15), rgba(201, 146, 52, 0.08));
  backdrop-filter: blur(8px);
}

.ps-caja-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.08), rgba(52, 211, 153, 0.03));
  border: 1px solid rgba(52, 211, 153, 0.25);
  border-radius: 8px;
  font-size: 0.75rem;
}

.ps-caja-bar.excede {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.05));
  border-color: rgba(239, 68, 68, 0.35);
}

.ps-caja-bar.ajustado {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(251, 191, 36, 0.04));
  border-color: rgba(251, 191, 36, 0.3);
}

.total-items {
  font-size: 0.7rem;
  color: var(--text-secondary, #888);
  padding: 0.15rem 0.5rem;
  background: var(--bg-secondary, #2a2a3e);
  border-radius: 4px;
}

.total-label {
  font-size: 0.8rem;
  color: var(--text-secondary, #888);
}

.total-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--accent-color, #c99234);
  font-family: monospace;
}

/* Caja badge */
.ps-caja-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.5rem;
  padding: 0.35rem 0.5rem;
  background: rgba(52, 211, 153, 0.08);
  border: 1px solid rgba(52, 211, 153, 0.2);
  border-radius: 6px;
  font-size: 0.7rem;
}

.caja-icon {
  font-size: 0.85rem;
}

.caja-text {
  color: var(--accent-color, #c99234);
  font-weight: 600;
}

.caja-dias {
  margin-left: auto;
  color: var(--text-secondary, #888);
  font-size: 0.65rem;
}

.ps-caja-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.35rem;
  padding: 0.3rem 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.caja-options-label {
  font-size: 0.6rem;
  color: var(--text-secondary, #888);
  font-weight: 600;
  margin-right: 0.2rem;
}

.caja-option-btn {
  padding: 0.15rem 0.4rem;
  border: 1px solid rgba(201, 146, 52, 0.2);
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary, #888);
  font-size: 0.6rem;
  font-weight: 600;
  cursor: default;
  transition: all 0.15s;
}

.caja-option-btn.recommended {
  border-color: rgba(82, 196, 26, 0.6);
  background: rgba(82, 196, 26, 0.08);
  color: #a0d911;
}

.s-no-results {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-secondary, #888);
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .sugerido-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
    padding: 0.6rem 0.75rem;
  }

  .header-left {
    gap: 0.5rem;
  }

  .header-icon {
    font-size: 1.2rem;
  }

  .header-title {
    font-size: 0.9rem;
  }

  .header-subtitle {
    font-size: 0.65rem;
  }

  .header-right {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .btn-refresh {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
  }

  .budget-mode-toggle {
    order: -2;
    width: 100%;
    justify-content: center;
  }

  .custom-budget {
    flex: 1;
    min-width: 100px;
  }

  .monto-input {
    width: 100%;
  }

  .budget-selector {
    order: -1;
    width: 100%;
    justify-content: center;
  }

  .s-total-bar {
    flex-wrap: wrap;
    gap: 0.3rem;
    padding: 0.5rem 0.6rem;
  }

  .total-label {
    font-size: 0.7rem;
    width: 100%;
  }

  .total-value {
    font-size: 1rem;
  }

  .total-items {
    font-size: 0.65rem;
  }

  .sugerido-toolbar {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.4rem 0.6rem;
  }

  .toolbar-actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .btn-tool {
    padding: 0.25rem 0.5rem;
    font-size: 0.65rem;
  }

  .btn-create {
    padding: 0.3rem 0.6rem;
    font-size: 0.7rem;
  }

  .s-card-bar {
    padding: 0.5rem 0.6rem;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .s-alert {
    width: 100%;
    justify-content: flex-start;
    padding: 0.2rem 0.4rem;
  }

  .s-card-body {
    padding: 0.5rem 0.6rem;
  }

  .s-stats {
    gap: 0.5rem;
  }

  .s-stat {
    min-width: 60px;
  }

  .s-stat-label {
    font-size: 0.55rem;
  }

  .s-stat-value {
    font-size: 0.8rem;
  }

  .s-suggestion {
    gap: 0.5rem;
  }

  .s-sug-item {
    padding: 0.25rem 0.4rem;
  }

  .s-sug-label {
    font-size: 0.5rem;
  }

  .s-sug-value {
    font-size: 0.8rem;
  }

  .s-sug-value.qty {
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .sugerido-header {
    padding: 0.5rem;
  }

  .s-search-box {
    padding: 0.4rem 0.6rem;
  }

  .s-search-input {
    font-size: 0.75rem;
  }

  .s-total-bar {
    padding: 0.4rem 0.5rem;
  }

  .sugerido-toolbar {
    padding: 0.3rem 0.5rem;
  }

  .toolbar-actions {
    width: 100%;
    justify-content: space-between;
  }

  .btn-create {
    flex: 1;
    text-align: center;
  }

  .s-card-bar {
    padding: 0.4rem 0.5rem;
    gap: 0.4rem;
  }

  .s-name {
    font-size: 0.8rem;
  }

  .alert-text {
    font-size: 0.6rem;
  }

  .s-card-body {
    padding: 0.4rem 0.5rem;
  }

  .s-stats {
    flex-direction: column;
    gap: 0.3rem;
  }

  .s-suggestion {
    flex-direction: column;
    gap: 0.3rem;
  }

  .s-sug-item {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0.2rem 0.4rem;
  }

  .s-sug-label {
    font-size: 0.55rem;
  }

  .s-sug-value {
    font-size: 0.75rem;
  }

  .s-sug-value.qty {
    font-size: 0.8rem;
  }

  .s-prices {
    margin-top: 0.2rem;
  }
}

.caja-bar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.caja-bar-label {
  color: var(--text-secondary, #888);
}

.caja-bar-value {
  font-weight: 700;
  font-family: monospace;
  color: var(--accent-color, #c99234);
}

.caja-bar-value.egreso {
  color: #ef4444;
}

.caja-bar-value.negativo {
  color: #ef4444;
}

.caja-bar-alerta {
  margin-top: 0.25rem;
  padding: 0.35rem 0.5rem;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 5px;
  color: #fca5a5;
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
}

.caja-bar-info {
  margin-top: 0.25rem;
  padding: 0.35rem 0.5rem;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: 5px;
  color: #fbbf24;
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
}
</style>
