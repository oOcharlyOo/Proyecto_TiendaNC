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
const expandedGroups = ref<Set<number>>(new Set());
const esAdmin = Number(localStorage.getItem('tipoUsuario') || 2) === 1;
const productoEditandoCajas = ref<Sugerencia | null>(null);
const emit = defineEmits(['pedido-creado']);

async function cargar() {
  cargando.value = true;
  buscarProducto.value = '';
  try {
    const res = await fetch(`${API_BASE}/pedidos-proveedor/sugerido-hoy`);
    const data = await res.json();
    if (data.codigo === 200 && data.datos) {
      grupos.value = data.datos;
      expandedGroups.value = new Set(data.datos.map((g: SugeridoHoy) => g.idProveedor));
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

function toggleGroupExpand(idProveedor: number) {
  const next = new Set(expandedGroups.value);
  if (next.has(idProveedor)) next.delete(idProveedor);
  else next.add(idProveedor);
  expandedGroups.value = next;
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
  if (s.stockActual <= 0) return 'urgencia-alta';
  if (s.diasInventarioRestante <= 1) return 'urgencia-media';
  return 'urgencia-baja';
}

function getTipoBadge(tipo: string) {
  return tipo === 'PREVENTA' ? '📋 Preventa' : '🚚 Directa';
}

function abrirEditarCajas(p: Sugerencia) {
  productoEditandoCajas.value = p;
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
          <div class="sh-grupo-header" @click="toggleGroupExpand(grupo.idProveedor)">
            <div class="sh-grupo-info">
              <span class="sh-chevron">{{ expandedGroups.has(grupo.idProveedor) ? '▼' : '▶' }}</span>
              <button class="sh-check-all" @click.stop="toggleGrupo(grupo)">
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
              <button class="btn-crear-pedido" @click.stop="crearPedidoPorGrupo(grupo)" :disabled="!grupo.productos.some(p => seleccionados.has(p.idProducto))">
                🛒 Crear Pedido
              </button>
            </div>
          </div>

          <div v-if="expandedGroups.has(grupo.idProveedor)" class="sh-productos">
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
                  <span v-if="p.precioCosto && p.precioVenta && p.precioVenta > p.precioCosto" class="stat margin-stat">
                    Margen: <strong class="margin-val">{{ ((p.precioVenta - p.precioCosto) / p.precioCosto * 100).toFixed(0) }}%</strong>
                  </span>
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
                  <span v-if="!p.cajasDisponibles.some(c => c.piezas === p.cajaSugerida)" class="caja-options-label">📦 Caja de {{ p.cajaSugerida }} pzs (no configurada)</span>
                </div>
                <div v-if="esAdmin && !p.isGramaje" class="sh-caja-admin-row">
                  <button class="btn-editar-cajas" @click.stop="abrirEditarCajas(p)" :title="p.cajasDisponibles && p.cajasDisponibles.length > 0 ? 'Editar compra por caja' : 'Configurar compra por caja'">
                    📦✏️ {{ p.cajasDisponibles && p.cajasDisponibles.length > 0 ? 'Editar cajas' : 'Configurar cajas' }}
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
.sugerido-hoy-panel{display:flex;flex-direction:column;gap:.6rem;padding:.6rem;height:100%;overflow:auto;font-family:var(--font-body)}
.sh-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.sh-header-left{display:flex;align-items:center;gap:.5rem}.sh-icon{font-size:1.5rem}.sh-title{margin:0;font-size:1rem;color:var(--color-accent);font-weight:800}.sh-subtitle{font-size:.65rem;color:var(--color-text-secondary);margin:.1rem 0 0}
.btn-refresh{width:32px;height:32px;border:none;border-radius:50%;background:var(--color-bg-panel);color:var(--color-text-secondary);cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,.08);transition:all .15s}.btn-refresh:hover:not(:disabled){color:var(--color-accent);box-shadow:3px 3px 6px rgba(0,0,0,.12)}.btn-refresh:disabled{opacity:.4}.spin{animation:shSpin .7s linear infinite}@keyframes shSpin{to{transform:rotate(360deg)}}
.sh-search-box{position:relative;display:flex;align-items:center}.search-icon{position:absolute;left:.6rem;font-size:.8rem;opacity:.6;pointer-events:none}.sh-search-input{width:100%;padding:.4rem 2rem .4rem 2rem;background:var(--color-bg-primary);border:none;border-radius:7px;color:var(--color-text-primary);font-size:.78rem;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08)}.sh-search-input:focus{outline:none;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08),0 0 0 2px var(--color-accent)}.sh-clear-btn{position:absolute;right:.35rem;background:none;border:none;color:var(--color-text-secondary);cursor:pointer;font-size:.85rem;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center}.sh-clear-btn:hover{background:var(--color-border);color:var(--color-text-primary)}
.sh-loading{display:flex;flex-direction:column;align-items:center;gap:.6rem;padding:3rem;color:var(--color-text-secondary)}.loading-orb{width:36px;height:36px;border:3px solid var(--color-border);border-top-color:var(--color-accent);border-radius:50%;animation:shSpin .8s linear infinite}
.sh-empty{display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:3rem;color:var(--color-text-secondary);text-align:center}.empty-icon{font-size:2.5rem;opacity:.5}.empty-title{font-size:.9rem;font-weight:700;margin:0}.empty-sub{font-size:.75rem;opacity:.7;margin:0}

.sh-total-bar{display:flex;align-items:center;gap:.75rem;padding:.5rem .75rem;background:var(--color-bg-secondary);border:none;border-radius:10px;box-shadow:3px 3px 6px rgba(0,0,0,.08)}.total-label{font-size:.7rem;color:var(--color-text-secondary)}.total-value{font-size:.95rem;font-weight:800;color:var(--color-success);font-family:'Courier New',monospace}.total-ganancia{font-size:.72rem;color:var(--color-accent);font-weight:600}

.sh-caja-bar{padding:.5rem .75rem;background:var(--color-bg-secondary);border:none;border-radius:10px;display:flex;flex-direction:column;gap:.25rem;box-shadow:3px 3px 6px rgba(0,0,0,.08)}.sh-caja-bar.excede{box-shadow:0 0 0 1px color-mix(in srgb,var(--color-error) 40%,transparent),3px 3px 6px rgba(0,0,0,.08)}.sh-caja-bar.ajustado{box-shadow:0 0 0 1px color-mix(in srgb,var(--color-warning) 40%,transparent),3px 3px 6px rgba(0,0,0,.08)}.caja-bar-row{display:flex;justify-content:space-between;font-size:.68rem}.caja-bar-label{color:var(--color-text-secondary)}.caja-bar-value{font-weight:700;color:var(--color-success)}.caja-bar-value.negativo{color:var(--color-error)}.caja-bar-value.egreso{color:var(--color-warning)}.caja-bar-info{font-size:.6rem;color:var(--color-warning);font-weight:600}.caja-bar-alerta{font-size:.6rem;color:var(--color-error);font-weight:600}

.sh-grupos{display:flex;flex-direction:column;gap:.5rem}.sh-grupo{background:var(--color-bg-secondary);border:none;border-radius:12px;overflow:hidden;box-shadow:3px 3px 8px rgba(0,0,0,.08)}.sh-grupo-header{display:flex;align-items:center;justify-content:space-between;padding:.6rem .75rem;cursor:pointer;transition:all .15s}.sh-grupo-header:hover{background:color-mix(in srgb,var(--color-accent) 5%,transparent)}.sh-grupo-info{display:flex;align-items:center;gap:.5rem;flex:1}.sh-chevron{font-size:.7rem;color:var(--color-text-secondary)}.sh-check-all{background:none;border:none;color:var(--color-text-secondary);cursor:pointer;font-size:.9rem;padding:0}.check-all-mark{font-size:.85rem}.sh-grupo-name{margin:0;font-size:.78rem;font-weight:700;color:var(--color-text-primary)}.sh-grupo-badges{display:flex;gap:.25rem;flex-wrap:wrap;margin-top:.15rem}.badge-tipo{font-size:.5rem;padding:.1rem .35rem;border-radius:3px;font-weight:600}.badge-preventa{background:color-mix(in srgb,var(--color-info) 15%,transparent);color:var(--color-info)}.badge-directa{background:color-mix(in srgb,var(--color-success) 15%,transparent);color:var(--color-success)}.badge-pedido-dias,.badge-entrega-dias,.badge-pedido,.badge-dia,.badge-count{font-size:.5rem;padding:.08rem .35rem;border-radius:3px;background:var(--color-bg-primary);color:var(--color-text-secondary);box-shadow:1px 1px 1px rgba(0,0,0,.03)}.sh-grupo-totals{display:flex;align-items:center;gap:.5rem}.grupo-costo{font-weight:700;color:var(--color-accent);font-size:.8rem}.btn-crear-pedido{border:none;padding:.4rem .75rem;border-radius:6px;background:var(--color-accent);color:var(--color-on-brand);font-size:.65rem;font-weight:700;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,.1);transition:all .15s}.btn-crear-pedido:hover:not(:disabled){transform:translateY(-1px)}.btn-crear-pedido:disabled{opacity:.4;cursor:not-allowed}

.sh-productos{display:flex;flex-direction:column;gap:.25rem;padding:.25rem .75rem .6rem}.sh-producto{display:flex;align-items:center;gap:.5rem;padding:.45rem .6rem;background:var(--color-bg-primary);border:none;border-radius:8px;cursor:pointer;transition:all .15s;box-shadow:2px 2px 4px rgba(0,0,0,.05)}.sh-producto:hover{transform:translateY(-1px);box-shadow:4px 4px 8px rgba(0,0,0,.1)}.sh-producto.selected{box-shadow:2px 2px 4px rgba(0,0,0,.05),0 0 0 2px var(--color-accent)}.sh-producto.urgencia-alta{box-shadow:2px 2px 4px rgba(0,0,0,.05),0 0 0 1px color-mix(in srgb,var(--color-error) 30%,transparent)}.sh-producto.urgencia-media{box-shadow:2px 2px 4px rgba(0,0,0,.05),0 0 0 1px color-mix(in srgb,var(--color-warning) 30%,transparent)}.sh-producto.urgencia-baja{box-shadow:2px 2px 4px rgba(0,0,0,.05),0 0 0 1px color-mix(in srgb,var(--color-success) 20%,transparent)}.sh-prod-check{width:20px;height:20px;border:none;border-radius:4px;background:var(--color-bg-secondary);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 1px 1px 2px rgba(0,0,0,.1)}.check-mark{font-size:.7rem;color:var(--color-accent);font-weight:900}.sh-prod-info{flex:1;min-width:0}.sh-prod-name{font-size:.75rem;font-weight:700;color:var(--color-text-primary)}.sh-prod-stats{display:flex;gap:.6rem;margin-top:.15rem;font-size:.6rem;color:var(--color-text-secondary)}.sh-prod-stats strong{color:var(--color-text-primary)}.margin-stat strong.margin-val{color:var(--color-accent)}.sh-prod-suggestion{display:flex;flex-direction:column;align-items:flex-end;gap:.1rem;flex-shrink:0}.sug-cantidad{font-size:.75rem;font-weight:800;color:var(--color-accent)}.sug-costo{font-size:.65rem;color:var(--color-warning);font-weight:600}.sug-ganancia{font-size:.62rem;color:var(--color-success);font-weight:600}

.sh-caja-badge{display:flex;align-items:center;gap:.3rem;margin-top:.25rem;padding:.15rem .4rem;background:color-mix(in srgb,var(--color-info) 10%,transparent);border-radius:4px;font-size:.55rem;color:var(--color-info)}.caja-icon{font-size:.7rem}.caja-dias{margin-left:auto;font-size:.5rem;opacity:.7}.sh-caja-options{display:flex;flex-wrap:wrap;gap:.2rem;margin-top:.2rem}.caja-options-label{font-size:.5rem;color:var(--color-text-secondary)}.caja-option-btn{border:none;padding:.15rem .35rem;border-radius:3px;background:var(--color-bg-secondary);color:var(--color-text-secondary);font-size:.52rem;cursor:pointer;box-shadow:1px 1px 2px rgba(0,0,0,.04)}.caja-option-btn:hover{color:var(--color-text-primary)}.caja-option-btn.recommended{background:color-mix(in srgb,var(--color-accent) 15%,transparent);color:var(--color-accent);box-shadow:0 0 4px color-mix(in srgb,var(--color-accent) 20%,transparent)}.caja-option-ahorro{font-size:.45rem;color:var(--color-success)}.caja-ahorro{font-size:.52rem;color:var(--color-success);font-weight:600}.sh-no-results{padding:1rem;text-align:center;font-size:.7rem;color:var(--color-text-secondary)}
.sh-caja-admin-row{display:flex;justify-content:flex-end;margin-top:.2rem}.btn-editar-cajas{border:none;padding:.18rem .45rem;border-radius:4px;background:color-mix(in srgb,var(--color-warning) 12%,transparent);color:var(--color-warning);font-size:.55rem;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit}.btn-editar-cajas:hover{background:var(--color-warning);color:#fff;transform:translateY(-1px)}

@media(max-width:768px){.sh-grupo-header{flex-direction:column;align-items:stretch;gap:.4rem}.sh-grupo-totals{justify-content:space-between}.sh-producto{flex-wrap:wrap}}
</style>
