<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import EditarCajasProductoModal from './Productos/EditarCajasProductoModal.vue';

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
  idProveedor?: number;
  nombreProveedor?: string;
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
const vistaAgrupada = ref(true);
const provExpandidos = ref<Set<number>>(new Set());
const esAdmin = Number(localStorage.getItem('tipoUsuario') || 2) === 1;
const productoEditandoCajas = ref<Sugerencia | null>(null);
const emit = defineEmits(['pedido-creado']);

type GrupoDepartamento = {
  nombre: string;
  productos: Sugerencia[];
  costoTotal: number;
  gananciaTotal: number;
};

type GrupoProveedor = {
  idProveedor: number;
  nombre: string;
  departamentos: GrupoDepartamento[];
  costoTotal: number;
  gananciaTotal: number;
  totalProductos: number;
};

const gruposPorProveedor = computed(() => {
  const mapa = new Map<number, GrupoProveedor>();
  for (const s of sugerenciasFiltradas.value) {
    const idProv = s.idProveedor || 0;
    const nomProv = s.nombreProveedor || 'Sin proveedor';
    if (!mapa.has(idProv)) {
      mapa.set(idProv, { idProveedor: idProv, nombre: nomProv, departamentos: [], costoTotal: 0, gananciaTotal: 0, totalProductos: 0 });
    }
    const grupo = mapa.get(idProv)!;
    const nomDepto = s.categoria || 'Sin departamento';
    let depto = grupo.departamentos.find(d => d.nombre === nomDepto);
    if (!depto) {
      depto = { nombre: nomDepto, productos: [], costoTotal: 0, gananciaTotal: 0 };
      grupo.departamentos.push(depto);
    }
    depto.productos.push(s);
    depto.costoTotal += s.costoEstimado || 0;
    depto.gananciaTotal += s.gananciaEstimada || 0;
    grupo.costoTotal += s.costoEstimado || 0;
    grupo.gananciaTotal += s.gananciaEstimada || 0;
    grupo.totalProductos++;
  }
  const sorted = Array.from(mapa.values());
  sorted.sort((a, b) => {
    if (a.idProveedor === 0) return 1;
    if (b.idProveedor === 0) return -1;
    return b.totalProductos - a.totalProductos || b.costoTotal - a.costoTotal;
  });
  for (const g of sorted) {
    g.departamentos.sort((a, b) => b.costoTotal - a.costoTotal);
  }
  return sorted;
});

function toggleProvExpand(id: number) {
  const next = new Set(provExpandidos.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  provExpandidos.value = next;
}

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

function abrirEditarCajas(s: Sugerencia) {
  productoEditandoCajas.value = s;
}

async function onCajasGuardadas(cajas: number[]) {
  const prod = productoEditandoCajas.value;
  if (prod) {
    prod.presentacionCaja = cajas.join(',');
    prod.cajasDisponibles = cajas.map(piezas => ({
      piezas,
      precioCaja: prod.precioCosto * piezas,
      costoPorPieza: prod.precioCosto,
      ahorroVsIndividual: 0
    }));
  }
  productoEditandoCajas.value = null;
  await cargar();
}

async function crearPedidoPorProveedor(idProveedor: number, nombreProveedor: string) {
  const seleccionados = sugerencias.value.filter(
    s => s.idProveedor === idProveedor && seleccionadas.value.has(s.idProducto)
  );
  if (seleccionados.length === 0) {
    alert(`No hay productos seleccionados de ${nombreProveedor}`);
    return;
  }

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
    const res = await fetch(`${API_BASE}/pedidos-proveedor/crear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idProveedor,
        fechaEntregaEsperada: fechaEntrega,
        montoTotal,
        montoApartado: 0,
        estatus: 'PENDIENTE',
        notas: `Pedido generado desde sugerencias - ${nombreProveedor}`,
        detalles
      })
    });
    const data = await res.json();
    if (data.codigo === 200) {
      alert(`✅ Pedido a ${nombreProveedor} creado exitosamente`);
      emit('pedido-creado');
    } else {
      alert(`Error: ${data.mensaje || 'No se pudo crear el pedido'}`);
    }
  } catch (e) {
    console.error('Error creando pedido:', e);
    alert('Error al crear el pedido');
  }
}

async function crearPedido() {
  const seleccionados = sugerencias.value.filter(s => seleccionadas.value.has(s.idProducto));
  if (seleccionados.length === 0) return;

  const idProveedor = prompt('ID del proveedor para este pedido:');
  if (!idProveedor) return;
  await crearPedidoPorProveedor(parseInt(idProveedor), 'Proveedor #' + idProveedor);
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

      <!-- VIEW TOGGLE -->
      <div class="s-view-toggle">
        <button :class="['view-btn', { active: !vistaAgrupada }]" @click="vistaAgrupada = false">📋 Lista</button>
        <button :class="['view-btn', { active: vistaAgrupada }]" @click="vistaAgrupada = true">🗂️ Por Proveedor</button>
      </div>

      <!-- TOOLBAR -->
      <div class="sugerido-toolbar">
        <div class="toolbar-info">
          <span class="sel-count">{{ seleccionadas.size }}/{{ sugerenciasFiltradas.length }} seleccionados</span>
        </div>
        <div class="toolbar-actions">
          <button class="btn-tool" @click="seleccionarTodas">☑ Todos</button>
          <button class="btn-tool" @click="deseleccionarTodas">☐ Ninguno</button>
          <template v-if="!vistaAgrupada">
            <button class="btn-create" @click="crearPedido" :disabled="seleccionadas.size === 0">
              🛒 Crear Pedido
            </button>
          </template>
        </div>
      </div>

      <!-- GROUPED VIEW: Proveedor > Departamento -->
      <div v-if="vistaAgrupada" class="ps-grupos">
        <div v-for="gp in gruposPorProveedor" :key="gp.idProveedor" class="ps-grupo-prov">
          <div class="ps-prov-header" :class="{ expandido: provExpandidos.has(gp.idProveedor) }" @click="toggleProvExpand(gp.idProveedor)">
            <div class="ps-prov-info">
              <span class="ps-prov-icon">{{ gp.idProveedor === 0 ? '🏢' : '🧙' }}</span>
              <span class="ps-prov-name">{{ gp.nombre }}</span>
              <span class="ps-prov-count">{{ gp.totalProductos }} prod.</span>
            </div>
            <div class="ps-prov-totals">
              <span class="ps-prov-total">{{ formatoMoneda(gp.costoTotal) }}</span>
              <span class="ps-prov-toggle">{{ provExpandidos.has(gp.idProveedor) ? '▼' : '▶' }}</span>
            </div>
          </div>
          <div v-if="provExpandidos.has(gp.idProveedor)" class="ps-prov-body">
            <div v-for="depto in gp.departamentos" :key="depto.nombre" class="ps-grupo-depto">
              <div class="ps-depto-header">
                <span class="ps-depto-icon">{{ depto.nombre === 'Sin departamento' ? '📂' : '🍬' }}</span>
                <span class="ps-depto-name">{{ depto.nombre }}</span>
                <span class="ps-depto-total">{{ formatoMoneda(depto.costoTotal) }}</span>
              </div>
              <div class="ps-depto-productos">
                <div
                  v-for="s in depto.productos"
                  :key="s.idProducto"
                  class="s-card"
                  :class="[getUrgencyClass(s), { selected: seleccionadas.has(s.idProducto) }]"
                  @click="toggle(s.idProducto)"
                >
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
                <span v-if="s.precioCosto && s.precioVenta && s.precioVenta > s.precioCosto" class="badge badge-margin">
                  {{ ((s.precioVenta - s.precioCosto) / s.precioCosto * 100).toFixed(0) }}%
                </span>
                      </div>
                    </div>
                    <div class="s-alert">
                      <span class="alert-icon">{{ getMotivoIcon(s.motivo) }}</span>
                      <span class="alert-text">{{ s.motivo }}</span>
                    </div>
                  </div>
                  <div class="s-card-body">
                    <div class="s-section">
                      <div class="s-section-label">Situación actual</div>
                      <div class="s-stats">
                        <div class="s-stat">
                          <span class="s-stat-label">Stock</span>
                          <span class="s-stat-value" :class="{ critical: s.stockActual <= 0, low: s.stockActual > 0 && s.stockActual <= s.stockMinimo }">{{ formatoStock(s) }}</span>
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
                    <div v-if="s.sugerirCaja && s.cajaSugerida" class="ps-caja-badge">
                      <span class="caja-icon">📦</span>
                      <span class="caja-text">Sugerido: Caja de {{ s.cajaSugerida }} pzs × {{ s.cajasSugeridas }} = {{ s.cantidadSugerida }} pzs</span>
                      <span v-if="s.diasStockConCaja" class="caja-dias">Duración: ~{{ s.diasStockConCaja }}d</span>
                    </div>
                    <div v-if="s.cajasDisponibles && s.cajasDisponibles.length > 0" class="ps-caja-options">
                      <span class="caja-options-label">Opciones:</span>
                      <button v-for="caja in s.cajasDisponibles" :key="caja.piezas" class="caja-option-btn" :class="{ recommended: caja.piezas === s.cajaSugerida }" @click.stop>
                        📦 {{ caja.piezas }}pzs - {{ formatoMoneda(caja.precioCaja) }}
                      </button>
                      <span v-if="!s.cajasDisponibles.some(c => c.piezas === s.cajaSugerida)" class="caja-options-label">📦 Caja de {{ s.cajaSugerida }} pzs (no configurada)</span>
                    </div>
                    <div v-if="esAdmin && !s.isGramaje" class="ps-caja-admin-row">
                      <button class="btn-editar-cajas" @click.stop="abrirEditarCajas(s)" :title="s.cajasDisponibles && s.cajasDisponibles.length > 0 ? 'Editar compra por caja' : 'Configurar compra por caja'">
                        📦✏️ {{ s.cajasDisponibles && s.cajasDisponibles.length > 0 ? 'Editar cajas' : 'Configurar cajas' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Crear pedido para este proveedor -->
            <div class="ps-prov-footer">
              <button class="btn-create" :disabled="seleccionadas.size === 0 || !sugerencias.some(s => s.idProveedor === gp.idProveedor && seleccionadas.has(s.idProducto))" @click="crearPedidoPorProveedor(gp.idProveedor, gp.nombre)">
                🛒 Crear Pedido a {{ gp.nombre }}
              </button>
            </div>
          </div>
        </div>
        <div v-if="gruposPorProveedor.length === 0" class="s-no-results">
          No se encontraron productos
        </div>
      </div>

      <!-- FLAT VIEW: cards list -->
      <div v-else class="sugerido-cards">
        <div
          v-for="s in sugerenciasFiltradas"
          :key="s.idProducto"
          class="s-card"
          :class="[getUrgencyClass(s), { selected: seleccionadas.has(s.idProducto) }]"
          @click="toggle(s.idProducto)"
        >
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
                <span v-if="s.nombreProveedor" class="badge badge-prov">{{ s.nombreProveedor }}</span>
                <span v-if="s.precioCosto && s.precioVenta && s.precioVenta > s.precioCosto" class="badge badge-margin">
                  {{ ((s.precioVenta - s.precioCosto) / s.precioCosto * 100).toFixed(0) }}%
                </span>
              </div>
            </div>
            <div class="s-alert">
              <span class="alert-icon">{{ getMotivoIcon(s.motivo) }}</span>
              <span class="alert-text">{{ s.motivo }}</span>
            </div>
          </div>
          <div class="s-card-body">
            <div class="s-section">
              <div class="s-section-label">Situación actual</div>
              <div class="s-stats">
                <div class="s-stat">
                  <span class="s-stat-label">Stock</span>
                  <span class="s-stat-value" :class="{ critical: s.stockActual <= 0, low: s.stockActual > 0 && s.stockActual <= s.stockMinimo }">{{ formatoStock(s) }}</span>
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
            <div v-if="s.sugerirCaja && s.cajaSugerida" class="ps-caja-badge">
              <span class="caja-icon">📦</span>
              <span class="caja-text">Sugerido: Caja de {{ s.cajaSugerida }} pzs × {{ s.cajasSugeridas }} = {{ s.cantidadSugerida }} pzs</span>
              <span v-if="s.diasStockConCaja" class="caja-dias">Duración: ~{{ s.diasStockConCaja }}d</span>
            </div>
            <div v-if="s.cajasDisponibles && s.cajasDisponibles.length > 0" class="ps-caja-options">
              <span class="caja-options-label">Opciones:</span>
              <button v-for="caja in s.cajasDisponibles" :key="caja.piezas" class="caja-option-btn" :class="{ recommended: caja.piezas === s.cajaSugerida }" @click.stop>
                📦 {{ caja.piezas }}pzs - {{ formatoMoneda(caja.precioCaja) }}
              </button>
              <span v-if="!s.cajasDisponibles.some(c => c.piezas === s.cajaSugerida)" class="caja-options-label">📦 Caja de {{ s.cajaSugerida }} pzs (no configurada)</span>
            </div>
            <div v-if="esAdmin && !s.isGramaje" class="ps-caja-admin-row">
              <button class="btn-editar-cajas" @click.stop="abrirEditarCajas(s)" :title="s.cajasDisponibles && s.cajasDisponibles.length > 0 ? 'Editar compra por caja' : 'Configurar compra por caja'">
                📦✏️ {{ s.cajasDisponibles && s.cajasDisponibles.length > 0 ? 'Editar cajas' : 'Configurar cajas' }}
              </button>
            </div>
          </div>
        </div>
        <div v-if="sugerenciasFiltradas.length === 0" class="s-no-results">
          No se encontraron productos
        </div>
      </div>
    </template>

    <EditarCajasProductoModal
      :open="!!productoEditandoCajas"
      :id-producto="productoEditandoCajas?.idProducto"
      :nombre-producto="productoEditandoCajas?.nombreProducto"
      :precio-costo="productoEditandoCajas?.precioCosto"
      :presentacion-caja="productoEditandoCajas?.presentacionCaja"
      @close="productoEditandoCajas = null"
      @saved="onCajasGuardadas"
    />
  </div>
</template>

<style scoped>
.sugerido-panel {
  --perg-bg:var(--color-bg-primary);--perg-bg-panel:var(--color-bg-panel);--perg-text:var(--color-text-primary);--perg-text-secondary:var(--color-text-secondary);--perg-title:var(--color-accent);--perg-border:var(--color-border);--perg-accent:var(--color-accent);--perg-shadow:var(--color-shadow);--perg-success:var(--color-success);--perg-error:var(--color-error);--perg-warning:var(--color-warning);
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
  background: linear-gradient(135deg,color-mix(in srgb,var(--color-accent) 15%,transparent),color-mix(in srgb,var(--color-accent) 5%,transparent));
  border:none;
  border-radius:12px;
  box-shadow:3px 3px 8px rgba(0,0,0,.08);
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
  color: var(--color-accent);
}

.header-subtitle {
  margin: 0;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.periodo-select {
  padding: 0.35rem 0.6rem;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 0.75rem;
}

.btn-refresh {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-refresh:hover {
  border-color: var(--color-accent);
}

.budget-mode-toggle {
  display: flex;
  gap: 0.2rem;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.2rem;
}

.mode-btn {
  padding: 0.3rem 0.5rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.mode-btn:hover {
  color: var(--color-text-primary);
}

.mode-btn.active {
  background: var(--color-accent);
  color: var(--color-text-primary);
  font-weight: 700;
}

.custom-budget {
  display: flex;
  align-items: center;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.2rem 0.5rem;
  gap: 0.2rem;
}

.currency-symbol {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-accent);
}

.monto-input {
  width: 70px;
  padding: 0.3rem 0.4rem;
  background: transparent;
  border: none;
  color: var(--color-text-primary);
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
  color: var(--color-text-secondary);
  font-weight: 400;
}

.budget-btn {
  padding: 0.3rem 0.5rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.budget-btn:hover {
  color: var(--color-text-primary);
}

.budget-btn.active {
  color: var(--color-text-primary);
  font-weight: 700;
}

.budget-btn.active:nth-child(1) {
  background: #34d399;
}

.budget-btn.active:nth-child(2) {
  background: var(--color-accent);
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
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
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
  color: var(--color-text-primary);
  font-size: 0.8rem;
  outline: none;
}

.s-clear-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  transition: all 0.15s;
}

.s-clear-btn:hover {
  color: var(--color-text-primary);
  background: color-mix(in srgb, var(--color-text-primary) 6%, transparent);
}

/* LOADING */
.sugerido-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  color: var(--color-accent);
}

.loading-orb {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
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
  color: var(--color-text-primary);
}

.empty-sub {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

/* TOOLBAR */
.sugerido-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-panel);
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sel-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.toolbar-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.btn-tool {
  padding: 0.3rem 0.6rem;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-tool:hover {
  border-color: var(--color-accent);
  color: var(--color-text-primary);
}

.btn-create {
  padding: 0.35rem 0.75rem;
  background: var(--color-accent);
  border: none;
  border-radius: 6px;
  color: var(--color-text-primary);
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
  background: var(--color-bg-panel);
  border: 2px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.s-card:hover {
  border-color: color-mix(in srgb,var(--color-accent) 50%,transparent);
}

.s-card.selected {
  border-color: var(--color-accent);
  background: color-mix(in srgb,var(--color-accent) 8%,transparent);
}

/* Urgency borders */
.s-card.urgency-critical{border-left:4px solid var(--color-error)}.s-card.urgency-high{border-left:4px solid var(--color-warning)}.s-card.urgency-low{border-left:4px solid var(--color-info)}

.s-card-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.s-check {
  width: 22px;
  height: 22px;
  border: 2px solid var(--color-border);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.s-card.selected .s-check {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.check-mark {
  color: var(--color-text-primary);
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
  color: var(--color-text-primary);
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
  background: color-mix(in srgb,var(--color-accent) 15%,transparent);
  color: var(--color-accent);
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
  color: var(--color-text-secondary);
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
  color: var(--color-text-secondary);
}

.s-stat-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-primary);
  font-family: monospace;
}

.s-stat-value.accent {
  color: var(--color-accent);
}

.s-stat-value.critical {
  color: #e74c3c;
}

.s-stat-value.low {
  color: #e6a817;
}

.s-divider {
  height: 1px;
  background: var(--color-border);
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
  background: var(--color-bg-panel);
  border-radius: 6px;
  flex: none;
}

.s-sug-label {
  font-size: 0.55rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.s-sug-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-primary);
  font-family: monospace;
}

.s-sug-value.qty {
  color: #34d399;
  font-size: 0.95rem;
}

.s-sug-value.cost {
  color: var(--color-accent);
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
  background: linear-gradient(135deg, rgba(var(--color-accent-rgb, 212, 168, 75), 0.1), color-mix(in srgb,var(--color-accent) 5%,transparent));
  border: 1px solid color-mix(in srgb,var(--color-accent) 30%,transparent);
  border-radius: 8px;
}

.s-total-bar-top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(135deg, color-mix(in srgb,var(--color-accent) 15%,transparent), color-mix(in srgb,var(--color-accent) 8%,transparent));
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
  color: var(--color-text-secondary);
  padding: 0.15rem 0.5rem;
  background: var(--color-bg-panel);
  border-radius: 4px;
}

.total-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.total-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--color-accent);
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
  color: var(--color-accent);
  font-weight: 600;
}

.caja-dias {
  margin-left: auto;
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}

.ps-caja-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.35rem;
  padding: 0.3rem 0.5rem;
  background: color-mix(in srgb, var(--color-text-primary) 3%, transparent);
  border-radius: 6px;
}

.caja-options-label {
  font-size: 0.6rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  margin-right: 0.2rem;
}

.caja-option-btn {
  padding: 0.15rem 0.4rem;
  border: 1px solid color-mix(in srgb,var(--color-accent) 20%,transparent);
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-secondary);
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

.ps-caja-admin-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.35rem;
}

.btn-editar-cajas {
  border: none;
  padding: 0.25rem 0.55rem;
  border-radius: 5px;
  background: color-mix(in srgb, var(--color-warning) 12%, transparent);
  color: var(--color-warning);
  font-size: 0.62rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.btn-editar-cajas:hover {
  background: var(--color-warning);
  color: #fff;
  transform: translateY(-1px);
}

.badge-prov {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}
.badge-margin {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

/* VIEW TOGGLE */
.s-view-toggle {
  display: flex;
  gap: 0.2rem;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.2rem;
  align-self: flex-start;
}

.view-btn {
  padding: 0.3rem 0.6rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  overflow: hidden;
}

.view-btn:hover {
  color: var(--color-text-primary);
}

.view-btn.active {
  background: var(--color-accent);
  color: var(--color-text-primary);
}

/* GROUPED VIEW */
.ps-grupos{display:flex;flex-direction:column;gap:.5rem;overflow-y:auto;flex:1;min-height:0;max-height:calc(100vh - 420px);padding-right:.25rem}
.ps-grupo-prov{background:var(--color-bg-panel);border:none;border-radius:10px;overflow:hidden;box-shadow:2px 2px 5px rgba(0,0,0,.06);flex-shrink:0}

.ps-prov-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
}

.ps-prov-header:hover{background:color-mix(in srgb,var(--color-accent) 8%,transparent)}
.ps-prov-header.expandido{border-bottom:1px solid var(--color-border)}

.ps-prov-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ps-prov-icon {
  font-size: 1.2rem;
}

.ps-prov-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--color-text-primary);
}

.ps-prov-count {
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  background: var(--color-bg-panel);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.ps-prov-totals {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ps-prov-total {
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--color-accent);
  font-family: monospace;
}

.ps-prov-toggle {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  width: 16px;
  text-align: center;
}

.ps-prov-body {
  padding: 0;
}

.ps-grupo-depto {
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 25%, transparent);
}

.ps-grupo-depto:last-child {
  border-bottom: none;
}

.ps-depto-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  background: color-mix(in srgb, var(--color-text-primary) 2%, transparent);
  position: sticky;
  top: 0;
  z-index: 2;
}

.ps-depto-icon {
  font-size: 0.85rem;
}

.ps-depto-name {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex: 1;
}

.ps-depto-total {
  font-size: 0.75rem;
  font-weight: 700;

  color: var(--color-accent);
  font-family: monospace;
}

.ps-depto-productos {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
}

.ps-depto-productos .s-card {
  border-width: 1px;
  margin: 0;
}

.ps-depto-productos .s-card-bar {
  padding: 0.4rem 0.5rem;
}

.ps-depto-productos .s-card-body {
  padding: 0.4rem 0.5rem;
}

.ps-prov-footer {
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}

.s-no-results {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
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

  .s-stat {
    min-width: auto;
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

  /* PS-1: caja-bar responsive */
  .ps-caja-bar {
    padding: 0.35rem 0.5rem;
    gap: 0.15rem;
    font-size: 0.65rem;
  }

  .ps-caja-bar .caja-bar-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
  }

  .caja-bar-alerta,
  .caja-bar-info {
    font-size: 0.6rem;
    padding: 0.25rem 0.4rem;
  }

  /* PS-2: caja badge */
  .ps-caja-badge {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
  }

  .ps-caja-badge .caja-dias {
    margin-left: 0;
  }

  /* Grouped view responsive */
  .ps-prov-header {
    padding: 0.5rem;
  }

  .ps-prov-name {
    font-size: 0.78rem;
  }

  .ps-prov-total {
    font-size: 0.8rem;
  }

  .ps-depto-header {
    padding: 0.3rem 0.5rem;
    flex-wrap: wrap;
    gap: 0.2rem;
  }

  .ps-depto-name {
    font-size: 0.65rem;
  }

  .ps-depto-total {
    font-size: 0.7rem;
  }

  .ps-depto-productos {
    padding: 0.25rem 0.35rem;
    gap: 0.25rem;
  }

  .ps-depto-productos .s-card-bar {
    padding: 0.3rem 0.4rem;
  }

  .ps-depto-productos .s-card-body {
    padding: 0.3rem 0.4rem;
  }

  .ps-prov-footer {
    padding: 0.4rem 0.5rem;
  }

  .s-view-toggle {
    width: 100%;
  }

  .view-btn {
    flex: 1;
    text-align: center;
    font-size: 0.65rem;
    padding: 0.25rem 0.4rem;
  }
}

@media (max-width: 400px) {
  .sugerido-header {
    padding: 0.4rem;
  }

  .header-title {
    font-size: 0.82rem;
  }

  .header-subtitle {
    font-size: 0.6rem;
  }

  .periodo-select {
    font-size: 0.65rem;
    padding: 0.25rem 0.4rem;
  }

  .budget-btn {
    font-size: 0.6rem;
    padding: 0.2rem 0.35rem;
  }

  .mode-btn {
    font-size: 0.6rem;
    padding: 0.2rem 0.35rem;
  }

  .monto-input {
    font-size: 0.7rem;
  }

  .s-card-bar {
    padding: 0.3rem 0.4rem;
    gap: 0.3rem;
  }

  .s-name {
    font-size: 0.75rem;
  }

  .badge {
    font-size: 0.55rem;
    padding: 0.05rem 0.3rem;
  }

  .s-card-body {
    padding: 0.3rem 0.4rem;
  }

  .s-stat-value {
    font-size: 0.75rem;
  }

  .s-sug-value {
    font-size: 0.7rem;
  }

  .s-sug-value.qty {
    font-size: 0.75rem;
  }

  .s-total-bar {
    padding: 0.3rem 0.4rem;
  }

  .total-value {
    font-size: 0.85rem;
  }

  .total-label {
    font-size: 0.65rem;
  }

  .total-items {
    font-size: 0.6rem;
  }

  .btn-tool {
    font-size: 0.6rem;
    padding: 0.2rem 0.4rem;
  }

  .btn-create {
    font-size: 0.65rem;
    padding: 0.25rem 0.5rem;
  }

  .ps-prov-header {
    padding: 0.4rem;
  }

  .ps-prov-name {
    font-size: 0.72rem;
  }

  .ps-prov-total {
    font-size: 0.75rem;
  }

  .ps-depto-name {
    font-size: 0.6rem;
  }

  .ps-caja-bar {
    padding: 0.25rem 0.4rem;
    font-size: 0.6rem;
  }

  .sugerido-toolbar {
    padding: 0.25rem 0.4rem;
  }

  .sel-count {
    font-size: 0.65rem;
  }
}

.caja-bar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.caja-bar-label {
  color: var(--color-text-secondary);
}

.caja-bar-value {
  font-weight: 700;
  font-family: monospace;
  color: var(--color-accent);
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
  background: color-mix(in srgb, var(--color-error) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-error) 40%, transparent);
  border-radius: 5px;
  color: var(--color-error);
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
}

.caja-bar-info {
  margin-top: 0.25rem;
  padding: 0.35rem 0.5rem;
  background: color-mix(in srgb, var(--color-text-primary) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
  border-radius: 5px;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
}

/* === PERGAMINO-MODAL === */

/* Todos los h2 y h3 dentro de modales pergamino usan café oscuro */

/* Overlay */

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Pergamino container */
@keyframes popIn {
  from { opacity: 0; transform: scale(0.93); }
  to { opacity: 1; transform: scale(1); }
}

/* Rollo edges (top / bottom) */
/* Reveal content (vertical unroll) */
/* Pergamino inner content */

.pos-container .close-btn {
  background: none;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  padding: 0;
  text-shadow: 0 1px 2px rgba(40, 20, 10, 0.2);
}

.pos-container .close-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}

/* Responsive */

</style>

