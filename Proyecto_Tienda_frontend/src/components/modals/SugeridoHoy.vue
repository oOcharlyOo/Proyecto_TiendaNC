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
  ventasDiariasPromedio: number;
  diasInventarioRestante: number;
  cantidadSugerida: number;
  costoEstimado: number;
  isGramaje: boolean;
  motivo: string;
  // Campos para sugerencia inteligente de cajas
  presentacionCaja?: string;
  cajasDisponibles?: CajaInfo[];
  cajaSugerida?: number;
  cajasSugeridas?: number;
  costoCajaTotal?: number;
  ahorroEstimado?: number;
  sugerirCaja?: boolean;
  diasStockConCaja?: number;
};

type SugeridoHoy = {
  idProveedor: number;
  nombreProveedor: string;
  tipoProveedor: string;
  diasEntrega: string;
  diasPedido?: string;
  diaPedido: string;
  diaEntrega: string;
  productos: Sugerencia[];
  costoTotal: number;
  gananciaTotal: number;
  totalProductos: number;
  saldoCajaActual: number;
  totalPedidosEntregarHoy: number;
  presupuestoDisponible: number;
  sugeridoExcedePresupuesto: boolean;
  presupuestoAjustado: boolean;
};

const grupos = ref<SugeridoHoy[]>([]);
const seleccionados = ref<Set<number>>(new Set());
const cargando = ref(false);
const buscarProducto = ref('');
const emit = defineEmits(['pedido-creado']);

async function cargar() {
  cargando.value = true;
  buscarProducto.value = '';
  try {
    const res = await fetch(`${API_BASE}/pedidos-proveedor/sugerido-hoy`);
    const data = await res.json();
    if (data.codigo === 200 && data.datos) {
      grupos.value = data.datos;
      const allIds = data.datos.flatMap((g: SugeridoHoy) => g.productos.map((p: Sugerencia) => p.idProducto));
      seleccionados.value = new Set(allIds);
    } else {
      grupos.value = [];
    }
  } catch (e) {
    console.error('Error cargando sugerido hoy:', e);
    grupos.value = [];
  } finally {
    cargando.value = false;
  }
}

function toggle(id: number) {
  const next = new Set(seleccionados.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  seleccionados.value = next;
}

function toggleGrupo(grupo: SugeridoHoy) {
  const ids = filteredProductos(grupo).map(p => p.idProducto);
  if (ids.length === 0) return;
  const allSelected = ids.every(id => seleccionados.value.has(id));
  const next = new Set(seleccionados.value);
  if (allSelected) {
    ids.forEach(id => next.delete(id));
  } else {
    ids.forEach(id => next.add(id));
  }
  seleccionados.value = next;
}

function filteredProductos(grupo: SugeridoHoy): Sugerencia[] {
  let list = [...grupo.productos];
  if (buscarProducto.value) {
    const q = buscarProducto.value.toLowerCase();
    list = list.filter(p => p.nombreProducto.toLowerCase().includes(q));
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
}

const totalSeleccionado = computed(() => {
  let total = 0;
  for (const g of grupos.value) {
    for (const p of g.productos) {
      if (seleccionados.value.has(p.idProducto)) {
        total += p.costoEstimado || 0;
      }
    }
  }
  return total;
});

const gananciaSeleccionada = computed(() => {
  let total = 0;
  for (const g of grupos.value) {
    for (const p of g.productos) {
      if (seleccionados.value.has(p.idProducto)) {
        total += p.gananciaEstimada || 0;
      }
    }
  }
  return total;
});

const infoCaja = computed(() => {
  if (grupos.value.length === 0) return null;
  return grupos.value[0];
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

function getUrgencyClass(s: Sugerencia) {
  if (s.stockActual <= 0) return 'urgency-critical';
  if (s.diasInventarioRestante <= 1) return 'urgency-high';
  return 'urgency-low';
}

function getTipoBadge(tipo: string) {
  return tipo === 'PREVENTA' ? '📋 Preventa' : '🚚 Directa';
}

async function crearPedidoPorGrupo(grupo: SugeridoHoy) {
  const productos = grupo.productos.filter(p => seleccionados.value.has(p.idProducto));
  if (productos.length === 0) return;

  const hoy = new Date();
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  const diaHoy = diasSemana[hoy.getDay()];
  
  let fechaEntrega = '';
  
  if (grupo.diasEntrega) {
    const diasEntrega = grupo.diasEntrega.split(',');
    const proximoDiaEntrega = encontrarProximoDia(diasEntrega, hoy);
    if (proximoDiaEntrega) {
      fechaEntrega = proximoDiaEntrega.toISOString().split('T')[0];
    }
  }
  
  if (!fechaEntrega) {
    fechaEntrega = prompt('Fecha de entrega esperada (YYYY-MM-DD):', new Date().toISOString().split('T')[0]) || '';
    if (!fechaEntrega) return;
  }

  const detalles = productos.map(s => ({
    idProducto: s.idProducto,
    cantidad: s.cantidadSugerida,
    precioUnitario: s.precioCosto,
    subtotal: s.precioCosto * s.cantidadSugerida
  }));

  const montoTotal = detalles.reduce((sum, d) => sum + d.subtotal, 0);

  const notasPartes = [`Pedido sugerido para ${grupo.diaEntrega}`];
  if (grupo.diasPedido) notasPartes.push(`Días pedido: ${grupo.diasPedido}`);
  if (grupo.diasEntrega) notasPartes.push(`Días entrega: ${grupo.diasEntrega}`);
  notasPartes.push(`Generado: ${diaHoy}`);

  try {
    await fetch(`${API_BASE}/pedidos-proveedor/crear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idProveedor: grupo.idProveedor,
        fechaEntregaEsperada: fechaEntrega,
        montoTotal,
        montoApartado: 0,
        estatus: 'PENDIENTE',
        notas: notasPartes.join(' | '),
        detalles
      })
    });
    alert(`Pedido creado para ${grupo.nombreProveedor}`);
    emit('pedido-creado');
    cargar();
  } catch (e) {
    console.error('Error creando pedido:', e);
    alert('Error al crear el pedido');
  }
}

function encontrarProximoDia(dias: string[], desde: Date): Date | null {
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  const diaActual = desde.getDay();
  
  for (let i = 0; i <= 7; i++) {
    const fecha = new Date(desde);
    fecha.setDate(desde.getDate() + i);
    const nombreDia = diasSemana[fecha.getDay()];
    if (dias.includes(nombreDia)) {
      return fecha;
    }
  }
  return null;
}

onMounted(() => cargar());
defineExpose({ cargar });
</script>

<template>
  <div class="sugerido-hoy-panel">
    <div class="sh-header">
      <div class="sh-header-left">
        <span class="sh-icon">📅</span>
        <div>
          <h3 class="sh-title">Pedido Sugerido para Hoy</h3>
          <p class="sh-subtitle">Basado en ventas de los últimos 4 mismos días</p>
        </div>
      </div>
      <button class="btn-refresh" @click="cargar" :disabled="cargando">
        <span :class="{ spin: cargando }">🔄</span>
      </button>
    </div>

    <div class="sh-search-box">
      <span class="search-icon">🔍</span>
      <input v-model="buscarProducto" placeholder="Buscar producto por nombre..." class="sh-search-input">
      <button v-if="buscarProducto" class="sh-clear-btn" @click="buscarProducto = ''">✕</button>
    </div>

    <div v-if="cargando" class="sh-loading">
      <div class="loading-orb"></div>
      <p>Calculando necesidades...</p>
    </div>

    <div v-else-if="grupos.length === 0" class="sh-empty">
      <div class="empty-icon">📭</div>
      <p class="empty-title">Sin proveedores programados</p>
      <p class="empty-sub">No hay proveedores con entrega programada para este día</p>
    </div>

    <template v-else>
      <div class="sh-total-bar">
        <span class="total-label">Total estimado:</span>
        <span class="total-value">{{ formatoMoneda(totalSeleccionado) }}</span>
        <span class="total-ganancia">Ganancia: {{ formatoMoneda(gananciaSeleccionada) }}</span>
      </div>

      <div v-if="infoCaja" class="sh-caja-bar" :class="{ 'excede': infoCaja.sugeridoExcedePresupuesto, 'ajustado': infoCaja.presupuestoAjustado }">
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
          ⚠️ No hay presupuesto disponible. Revisa la caja antes de crear pedidos.
        </div>
      </div>

      <div class="sh-grupos">
        <div v-for="grupo in grupos" :key="grupo.idProveedor" class="sh-grupo">
          <div class="sh-grupo-header">
            <div class="sh-grupo-info">
              <button class="sh-check-all" @click="toggleGrupo(grupo)">
                <span v-if="filteredProductos(grupo).length > 0 && filteredProductos(grupo).every(p => seleccionados.has(p.idProducto))" class="check-all-mark">☑</span>
                <span v-else class="check-all-mark">☐</span>
              </button>
              <div>
                <h4 class="sh-grupo-name">{{ grupo.nombreProveedor }}</h4>
                <div class="sh-grupo-badges">
                  <span class="badge-tipo" :class="grupo.tipoProveedor === 'PREVENTA' ? 'badge-preventa' : 'badge-directa'">
                    {{ getTipoBadge(grupo.tipoProveedor) }}
                  </span>
                  <span v-if="grupo.diasPedido" class="badge-pedido-dias">📋 Pedido: {{ grupo.diasPedido }}</span>
                  <span v-if="grupo.diasEntrega" class="badge-entrega-dias">🚚 Entrega: {{ grupo.diasEntrega }}</span>
                  <span v-if="!grupo.diasPedido && grupo.tipoProveedor === 'PREVENTA'" class="badge-pedido">📝 Pedido: {{ grupo.diaPedido }}</span>
                  <span v-if="!grupo.diasEntrega" class="badge-dia">🚚 Entrega: {{ grupo.diaEntrega }}</span>
                  <span class="badge-count">{{ filteredProductos(grupo).length }} producto{{ filteredProductos(grupo).length !== 1 ? 's' : '' }}</span>
                </div>
              </div>
            </div>
            <div class="sh-grupo-totals">
              <span class="grupo-costo">{{ formatoMoneda(grupo.costoTotal) }}</span>
              <button class="btn-crear-pedido" @click="crearPedidoPorGrupo(grupo)" :disabled="!grupo.productos.some(p => seleccionados.has(p.idProducto))">
                🛒 Crear Pedido
              </button>
            </div>
          </div>

          <div class="sh-productos">
            <div
              v-for="p in filteredProductos(grupo)"
              :key="p.idProducto"
              class="sh-producto"
              :class="[getUrgencyClass(p), { selected: seleccionados.has(p.idProducto) }]"
              @click="toggle(p.idProducto)"
            >
              <div class="sh-prod-check">
                <span v-if="seleccionados.has(p.idProducto)" class="check-mark">✓</span>
              </div>
              <div class="sh-prod-info">
                <span class="sh-prod-name">{{ p.nombreProducto }}</span>
                <div class="sh-prod-stats">
                  <span class="stat">Stock: <strong>{{ formatoStock(p) }}</strong></span>
                  <span class="stat">Venta/día: <strong>{{ p.ventasDiariasPromedio.toFixed(1) }}</strong></span>
                  <span class="stat">Duración: <strong v-if="p.diasInventarioRestante === -1">Sin ventas</strong><strong v-else>~{{ p.diasInventarioRestante }}d</strong></span>
                </div>
                <div v-if="p.sugerirCaja && p.cajaSugerida" class="sh-caja-badge">
                  <span class="caja-icon">📦</span>
                  <span class="caja-text">Sugerido: Caja de {{ p.cajaSugerida }} pzs × {{ p.cajasSugeridas }} = {{ p.cantidadSugerida }} pzs</span>
                  <span v-if="p.ahorroEstimado && p.ahorroEstimado > 0" class="caja-ahorro">Ahorro: {{ formatoMoneda(p.ahorroEstimado) }}</span>
                  <span v-if="p.diasStockConCaja" class="caja-dias">Duración: ~{{ p.diasStockConCaja }}d</span>
                </div>
                <div v-if="p.cajasDisponibles && p.cajasDisponibles.length > 0" class="sh-caja-options">
                  <span class="caja-options-label">Opciones:</span>
                  <button 
                    v-for="caja in p.cajasDisponibles" 
                    :key="caja.piezas"
                    class="caja-option-btn"
                    :class="{ recommended: caja.piezas === p.cajaSugerida }"
                    @click.stop
                  >
                    📦 {{ caja.piezas }}pzs - {{ formatoMoneda(caja.precioCaja) }}
                    <span v-if="caja.ahorroVsIndividual > 0" class="caja-option-ahorro">(-{{ formatoMoneda(caja.ahorroVsIndividual) }}/pza)</span>
                  </button>
                </div>
              </div>
              <div class="sh-prod-suggestion">
                <span class="sug-cantidad">{{ formatoCantidad(p) }}</span>
                <span class="sug-costo">{{ formatoMoneda(p.costoEstimado) }}</span>
                <span class="sug-ganancia">+{{ formatoMoneda(p.gananciaEstimada) }}</span>
              </div>
            </div>
            <div v-if="filteredProductos(grupo).length === 0" class="sh-no-results">
              No se encontraron productos
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sugerido-hoy-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  min-height: 800px;
  overflow: hidden;
}

.sh-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(201, 146, 52, 0.15), rgba(201, 146, 52, 0.05));
  border: 1px solid rgba(201, 146, 52, 0.3);
  border-radius: 12px;
}

.sh-header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.sh-icon {
  font-size: 1.5rem;
}

.sh-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #f6f2de);
}

.sh-subtitle {
  margin: 0;
  font-size: 0.7rem;
  color: var(--text-secondary, #888);
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

.spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sh-search-box {
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

.sh-search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary, #f6f2de);
  font-size: 0.8rem;
  outline: none;
}

.sh-clear-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #888);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  transition: all 0.15s;
}

.sh-clear-btn:hover {
  color: var(--text-primary, #f6f2de);
  background: rgba(255, 255, 255, 0.1);
}

.sh-loading {
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

.sh-empty {
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

.sh-total-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  background: linear-gradient(135deg, rgba(201, 146, 52, 0.1), rgba(201, 146, 52, 0.05));
  border: 1px solid rgba(201, 146, 52, 0.3);
  border-radius: 8px;
  position: sticky;
  top: 0;
  z-index: 10;
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

.total-ganancia {
  font-size: 0.8rem;
  font-weight: 700;
  color: #34d399;
  font-family: monospace;
}

.sh-caja-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.08), rgba(52, 211, 153, 0.03));
  border: 1px solid rgba(52, 211, 153, 0.25);
  border-radius: 8px;
  font-size: 0.75rem;
}

.sh-caja-bar.excede {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.05));
  border-color: rgba(239, 68, 68, 0.35);
}

.sh-caja-bar.ajustado {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(251, 191, 36, 0.04));
  border-color: rgba(251, 191, 36, 0.3);
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

.sh-grupos {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  flex: 1;
  padding-right: 0.25rem;
  min-height: 0;
}

.sh-grupos::-webkit-scrollbar {
  width: 6px;
}

.sh-grupos::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.sh-grupos::-webkit-scrollbar-thumb {
  background: var(--accent-color, #c99234);
  border-radius: 3px;
}

.sh-grupos::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--accent-color, #c99234) 70%, white);
}

.sh-grupo {
  background: var(--bg-secondary, #2a2a3e);
  border: 1px solid var(--border-color, #333);
  border-radius: 12px;
}

.sh-grupo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(201, 146, 52, 0.08), rgba(201, 146, 52, 0.02));
  border-bottom: 1px solid var(--border-color, #333);
}

.sh-grupo-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.sh-check-all {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 2px solid var(--border-color, #444);
  border-radius: 5px;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s;
}

.check-all-mark {
  font-size: 0.85rem;
  color: var(--text-secondary, #888);
}

.sh-grupo-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary, #f6f2de);
}

.sh-grupo-badges {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.2rem;
  flex-wrap: wrap;
}

.badge-tipo {
  font-size: 0.6rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
}

.badge-preventa {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.badge-directa {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.badge-dia {
  font-size: 0.6rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.badge-pedido {
  font-size: 0.6rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.badge-pedido-dias {
  font-size: 0.6rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.badge-entrega-dias {
  font-size: 0.6rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.badge-count {
  font-size: 0.6rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary, #888);
}

.sh-grupo-totals {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.grupo-costo {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--accent-color, #c99234);
  font-family: monospace;
}

.btn-crear-pedido {
  padding: 0.4rem 0.75rem;
  background: var(--accent-color, #c99234);
  border: none;
  border-radius: 6px;
  color: var(--bg-primary, #1a1a2e);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-crear-pedido:hover:not(:disabled) {
  filter: brightness(1.15);
}

.btn-crear-pedido:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sh-productos {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 350px;
  overflow-y: auto;
}

.sh-productos::-webkit-scrollbar {
  width: 5px;
}

.sh-productos::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
}

.sh-productos::-webkit-scrollbar-thumb {
  background: rgba(201, 146, 52, 0.5);
  border-radius: 3px;
}

.sh-productos::-webkit-scrollbar-thumb:hover {
  background: rgba(201, 146, 52, 0.8);
}

.sh-producto {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: all 0.15s;
  min-height: 48px;
}

.sh-producto:last-child {
  border-bottom: none;
}

.sh-producto:hover {
  background: rgba(201, 146, 52, 0.05);
}

.sh-producto.selected {
  background: rgba(201, 146, 52, 0.08);
}

.sh-producto.urgency-critical {
  border-left: 3px solid #e74c3c;
}

.sh-producto.urgency-high {
  border-left: 3px solid #e67e22;
}

.sh-producto.urgency-low {
  border-left: 3px solid #3498db;
}

.sh-prod-check {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color, #444);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.sh-producto.selected .sh-prod-check {
  background: var(--accent-color, #c99234);
  border-color: var(--accent-color, #c99234);
}

.check-mark {
  color: var(--bg-primary, #1a1a2e);
  font-size: 0.7rem;
  font-weight: 700;
}

.sh-prod-info {
  flex: 1;
  min-width: 0;
}

.sh-prod-name {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--text-primary, #f6f2de);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.sh-prod-stats {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.2rem;
  flex-wrap: wrap;
}

.stat {
  font-size: 0.65rem;
  color: var(--text-secondary, #888);
}

.stat strong {
  color: var(--text-primary, #f6f2de);
  font-family: monospace;
}

/* Badge de sugerencia de caja */
.sh-caja-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.3rem;
  padding: 0.3rem 0.5rem;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 6px;
  flex-wrap: wrap;
}

.caja-icon {
  font-size: 0.85rem;
}

.caja-text {
  font-size: 0.6rem;
  color: #818cf8;
  font-weight: 600;
}

.caja-ahorro {
  font-size: 0.6rem;
  color: #34d399;
  font-weight: 700;
  font-family: monospace;
}

.caja-dias {
  font-size: 0.6rem;
  color: var(--text-secondary, #888);
}

/* Opciones de caja */
.sh-caja-options {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.3rem;
  flex-wrap: wrap;
}

.caja-options-label {
  font-size: 0.6rem;
  color: var(--text-secondary, #888);
  font-weight: 600;
}

.caja-option-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.2rem 0.4rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color, #444);
  border-radius: 4px;
  color: var(--text-secondary, #888);
  font-size: 0.55rem;
  cursor: default;
  transition: all 0.15s;
}

.caja-option-btn.recommended {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.4);
  color: #818cf8;
  font-weight: 600;
}

.caja-option-ahorro {
  font-size: 0.5rem;
  color: #34d399;
  font-weight: 600;
}

.sh-prod-suggestion {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
  flex-shrink: 0;
}

.sug-cantidad {
  font-size: 0.85rem;
  font-weight: 700;
  color: #34d399;
  font-family: monospace;
}

.sug-costo {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-color, #c99234);
  font-family: monospace;
}

.sug-ganancia {
  font-size: 0.65rem;
  font-weight: 600;
  color: #34d399;
  font-family: monospace;
}

.sh-no-results {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-secondary, #888);
}

@media (max-width: 900px) {
  .sugerido-hoy-panel {
    min-height: auto;
  }
}

@media (max-width: 768px) {
  .sh-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
    padding: 0.6rem 0.75rem;
  }

  .sh-header-left {
    gap: 0.5rem;
  }

  .sh-icon {
    font-size: 1.2rem;
  }

  .sh-title {
    font-size: 0.9rem;
  }

  .sh-subtitle {
    font-size: 0.65rem;
  }

  .btn-refresh {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
  }

  .sh-total-bar {
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

  .total-ganancia {
    font-size: 0.7rem;
  }

  .sh-grupo-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
    padding: 0.6rem 0.75rem;
  }

  .sh-grupo-totals {
    width: 100%;
    justify-content: space-between;
    padding-top: 0.4rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .sh-grupo-name {
    font-size: 0.85rem;
  }

  .sh-producto {
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
  }

  .sh-prod-name {
    font-size: 0.75rem;
  }

  .sh-prod-stats {
    gap: 0.4rem;
    flex-direction: column;
    flex-wrap: nowrap;
  }

  .stat {
    font-size: 0.6rem;
  }

  .sh-prod-suggestion {
    gap: 0.05rem;
  }

  .sug-cantidad {
    font-size: 0.75rem;
  }

  .sug-costo {
    font-size: 0.65rem;
  }

  .sug-ganancia {
    font-size: 0.6rem;
  }

  .btn-crear-pedido {
    padding: 0.35rem 0.6rem;
    font-size: 0.7rem;
    width: 100%;
    text-align: center;
  }

  .grupo-costo {
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .sugerido-hoy-panel {
    gap: 0.5rem;
  }

  .sh-header {
    padding: 0.5rem;
  }

  .sh-search-box {
    padding: 0.4rem 0.6rem;
  }

  .sh-search-input {
    font-size: 0.75rem;
  }

  .sh-total-bar {
    padding: 0.4rem 0.5rem;
  }

  .sh-caja-bar {
    padding: 0.35rem 0.5rem;
    gap: 0.15rem;
  }

  .caja-bar-row {
    font-size: 0.65rem;
    flex-wrap: wrap;
    gap: 0.2rem;
  }

  .sh-grupo-header {
    padding: 0.5rem;
    gap: 0.4rem;
  }

  .sh-grupo-badges {
    gap: 0.2rem;
  }

  .sh-grupo-name {
    font-size: 0.8rem;
  }

  .sh-producto {
    padding: 0.4rem 0.5rem;
    min-height: 48px;
  }

  .sh-prod-name {
    font-size: 0.7rem;
  }

  .sh-prod-stats {
    gap: 0.35rem;
    flex-wrap: nowrap;
  }

  .stat {
    font-size: 0.55rem;
  }

  .sh-prod-suggestion {
    flex-direction: row;
    justify-content: flex-end;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .sug-cantidad, .sug-costo, .sug-ganancia {
    font-size: 0.65rem;
  }

  .sh-productos {
    max-height: 250px;
  }

  .sh-check-all {
    width: 20px;
    height: 20px;
  }

  .btn-crear-pedido {
    font-size: 0.65rem;
    padding: 0.3rem 0.5rem;
  }

  .sh-caja-badge {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
  }

  .sh-caja-badge .caja-dias {
    margin-left: 0;
  }
}
</style>
