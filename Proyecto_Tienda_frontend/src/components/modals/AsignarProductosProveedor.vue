<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

type Proveedor = {
  idProveedor: number;
  nombre: string;
  tipoProveedor?: string;
  diasPedido?: string;
  diasEntrega?: string;
};

type Producto = {
  idProducto: number;
  nombre: string;
  codigoBarras?: string;
  precioCosto?: number;
  precioVenta?: number;
  isGramaje?: boolean;
  presentacionCaja?: string;
};

type Asignacion = {
  id: number;
  idProducto: number;
  idProveedor: number;
  nombreProducto?: string;
  nombreProveedor?: string;
  precioAcordado?: number;
};

const proveedores = ref<Proveedor[]>([]);
const proveedorSeleccionado = ref<Proveedor | null>(null);
const asignaciones = ref<Asignacion[]>([]);
const productosDisponibles = ref<Producto[]>([]);
const cargando = ref(false);
const showAgregar = ref(false);
const buscarProducto = ref('');
const buscarProveedor = ref('');
const precioAcordado = ref<number | null>(null);
const showDropdown = ref(false);
const dropdownIndex = ref(0);
const inputFocused = ref(false);
const modoLote = ref(false);
const productosSeleccionados = ref<Set<number>>(new Set());
const asignandoLote = ref(false);
const buscarLote = ref('');

let scannerBuffer = '';
let lastScannerKeyTime = 0;

const proveedoresFiltrados = computed(() => {
  if (!buscarProveedor.value) return proveedores.value;
  const q = buscarProveedor.value.toLowerCase();
  return proveedores.value.filter(p => p.nombre.toLowerCase().includes(q));
});

const productosFiltrados = computed(() => {
  if (!buscarProducto.value) return [];
  const q = buscarProducto.value.toLowerCase();
  return productosDisponibles.value.filter(
    p => p.nombre.toLowerCase().includes(q) || (p.codigoBarras || '').includes(q)
  ).slice(0, 15);
});

const idsAsignados = computed(() => new Set(asignaciones.value.map(a => a.idProducto)));

const productosLote = computed(() => {
  let list = productosDisponibles.value.filter(p => !idsAsignados.value.has(p.idProducto));
  if (buscarLote.value) {
    const q = buscarLote.value.toLowerCase();
    list = list.filter(p => 
      p.nombre.toLowerCase().includes(q) || 
      (p.codigoBarras || '').toLowerCase().includes(q)
    );
  }
  return list.slice(0, 100);
});

const todosSeleccionados = computed(() => {
  return productosLote.value.length > 0 && 
    productosLote.value.every(p => productosSeleccionados.value.has(p.idProducto));
});

function toggleSeleccionProducto(id: number) {
  const next = new Set(productosSeleccionados.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  productosSeleccionados.value = next;
}

function toggleSeleccionTodos() {
  const next = new Set(productosSeleccionados.value);
  if (todosSeleccionados.value) {
    productosLote.value.forEach(p => next.delete(p.idProducto));
  } else {
    productosLote.value.forEach(p => next.add(p.idProducto));
  }
  productosSeleccionados.value = next;
}

async function asignarLote() {
  if (!proveedorSeleccionado.value || productosSeleccionados.value.size === 0) return;
  
  asignandoLote.value = true;
  let exitosos = 0;
  let fallidos = 0;
  
  for (const idProducto of productosSeleccionados.value) {
    try {
      const body: any = {
        idProducto,
        idProveedor: proveedorSeleccionado.value.idProveedor
      };
      if (precioAcordado.value != null) body.precioAcordado = precioAcordado.value;
      
      const res = await fetch(`${API_BASE}/producto-proveedor/asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.codigo === 200 || data.codigo === 201) {
        exitosos++;
      } else {
        fallidos++;
      }
    } catch (e) {
      fallidos++;
    }
  }
  
  productosSeleccionados.value = new Set();
  buscarLote.value = '';
  await cargarAsignaciones(proveedorSeleccionado.value.idProveedor);
  
  if (fallidos === 0) {
    alert(`✅ ${exitosos} producto(s) asignados correctamente`);
  } else {
    alert(`✅ ${exitosos} asignados | ❌ ${fallidos} fallidos`);
  }
  
  asignandoLote.value = false;
}

function getProductInfo(idProducto: number) {
  return productosDisponibles.value.find(p => p.idProducto === idProducto);
}

async function cargarProveedores() {
  try {
    const res = await fetch(`${API_BASE}/proveedores/listar`);
    const data = await res.json();
    if (data.codigo === 200) proveedores.value = data.datos;
  } catch (e) {
    console.error('Error cargando proveedores:', e);
  }
}

async function cargarProductos() {
  try {
    const res = await fetch(`${API_BASE}/productos/listarProductos`);
    const data = await res.json();
    if (data.codigo === 200) {
      productosDisponibles.value = data.datos.map((p: any) => ({
        idProducto: p.idProducto,
        nombre: p.nombre,
        codigoBarras: p.codigoBarras,
        precioCosto: p.precio_costo,
        precioVenta: p.precio_venta,
        isGramaje: p.is_gramaje,
        presentacionCaja: p.presentacion_caja || ''
      }));
    }
  } catch (e) {
    console.error('Error cargando productos:', e);
  }
}

async function cargarAsignaciones(idProveedor: number) {
  cargando.value = true;
  try {
    const res = await fetch(`${API_BASE}/producto-proveedor/por-proveedor/${idProveedor}`);
    const data = await res.json();
    if (data.codigo === 200) asignaciones.value = data.datos;
  } catch (e) {
    console.error('Error cargando asignaciones:', e);
  } finally {
    cargando.value = false;
  }
}

function seleccionarProveedor(prov: Proveedor) {
  proveedorSeleccionado.value = prov;
  cargarAsignaciones(prov.idProveedor);
}

async function asignarProducto(producto: Producto) {
  if (!proveedorSeleccionado.value) return;
  try {
    const body: any = {
      idProducto: producto.idProducto,
      idProveedor: proveedorSeleccionado.value.idProveedor
    };
    if (precioAcordado.value != null) body.precioAcordado = precioAcordado.value;

    const res = await fetch(`${API_BASE}/producto-proveedor/asignar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.codigo === 200 || data.codigo === 201) {
      cargarAsignaciones(proveedorSeleccionado.value.idProveedor);
      buscarProducto.value = '';
      precioAcordado.value = null;
      showDropdown.value = false;
    } else {
      alert(data.mensaje || 'Error al asignar');
    }
  } catch (e) {
    console.error('Error asignando:', e);
    alert('Error al asignar producto');
  }
}

async function eliminarAsignacion(id: number) {
  if (!confirm('¿Eliminar esta asignación?')) return;
  try {
    const res = await fetch(`${API_BASE}/producto-proveedor/eliminar/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.codigo === 200 && proveedorSeleccionado.value) {
      cargarAsignaciones(proveedorSeleccionado.value.idProveedor);
    }
  } catch (e) {
    console.error('Error eliminando:', e);
  }
}

watch(buscarProducto, (val) => {
  dropdownIndex.value = 0;
  showDropdown.value = val.length > 0;
});

function handleBarcodeInput(e: KeyboardEvent) {
  const key = e.key;
  const now = Date.now();
  const gap = now - lastScannerKeyTime;
  lastScannerKeyTime = now;

  if (gap > 50) {
    scannerBuffer = '';
  }

  if (key === 'Enter' && scannerBuffer.length > 3) {
    e.preventDefault();
    const code = scannerBuffer.trim();
    scannerBuffer = '';
    const match = productosDisponibles.value.find(
      p => p.codigoBarras === code
    );
    if (match) {
      if (idsAsignados.value.has(match.idProducto)) {
        alert('Este producto ya está asignado a este proveedor');
      } else {
        asignarProducto(match);
      }
    } else {
      alert(`Producto con código "${code}" no encontrado`);
    }
    return;
  }

  if (key.length === 1) {
    scannerBuffer += key;
  }
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (!showAgregar.value || !inputFocused.value) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    dropdownIndex.value = Math.min(dropdownIndex.value + 1, productosFiltrados.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    dropdownIndex.value = Math.max(dropdownIndex.value - 1, 0);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (productosFiltrados.value.length > 0 && dropdownIndex.value >= 0) {
      const prod = productosFiltrados.value[dropdownIndex.value];
      if (!idsAsignados.value.has(prod.idProducto)) {
        asignarProducto(prod);
      }
    }
  } else if (e.key === 'Escape') {
    showDropdown.value = false;
  }
}

function formatoMoneda(v?: number) {
  if (v == null) return '-';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
}

onMounted(() => {
  cargarProveedores();
  cargarProductos();
  window.addEventListener('keydown', onGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
});
</script>

<template>
  <div class="asignar-productos-panel">
    <div class="ap-header">
      <span class="ap-icon">🔗</span>
      <div>
        <h3 class="ap-title">Asignar Productos a Proveedor</h3>
        <p class="ap-subtitle">Vincula productos con sus proveedores habituales</p>
      </div>
    </div>

    <div class="ap-layout">
      <!-- Sidebar: Lista de proveedores -->
      <div class="ap-sidebar">
        <div class="ap-search-box">
          <span class="search-icon">🔍</span>
          <input v-model="buscarProveedor" placeholder="Buscar proveedor..." class="ap-input">
        </div>
        <div class="ap-proveedores-list">
          <div
            v-for="prov in proveedoresFiltrados"
            :key="prov.idProveedor"
            class="ap-proveedor-item"
            :class="{ active: proveedorSeleccionado?.idProveedor === prov.idProveedor }"
            @click="seleccionarProveedor(prov)"
          >
            <div class="ap-prov-info">
              <span class="ap-prov-name">{{ prov.nombre }}</span>
              <div class="ap-prov-badges">
                <span class="ap-prov-type" :class="prov.tipoProveedor === 'PREVENTA' ? 'type-preventa' : 'type-directa'">
                  {{ prov.tipoProveedor === 'PREVENTA' ? '📋' : '🚚' }}
                </span>
                <span v-if="prov.diasPedido" class="ap-prov-dias" title="Pedido: {{ prov.diasPedido }}">📋</span>
                <span v-if="prov.diasEntrega" class="ap-prov-dias" title="Entrega: {{ prov.diasEntrega }}">🚚</span>
              </div>
            </div>
          </div>
          <div v-if="proveedoresFiltrados.length === 0" class="ap-empty-small">
            No hay proveedores
          </div>
        </div>
      </div>

      <!-- Main: Productos asignados -->
      <div class="ap-main">
        <div v-if="!proveedorSeleccionado" class="ap-empty-state">
          <div class="empty-icon">👈</div>
          <p class="empty-title">Selecciona un proveedor</p>
          <p class="empty-sub">Elige un proveedor de la lista para ver y gestionar sus productos</p>
        </div>

        <template v-else>
          <div class="ap-main-header">
            <div>
              <h4 class="ap-main-title">{{ proveedorSeleccionado.nombre }}</h4>
              <span class="ap-count">{{ asignaciones.length }} producto{{ asignaciones.length !== 1 ? 's' : '' }}</span>
            </div>
            <div class="ap-header-actions">
              <button class="btn-add btn-lote" :class="{ active: modoLote }" @click="modoLote = !modoLote; showAgregar = false">
                <span v-if="modoLote">✕ Individual</span>
                <span v-else>📦 Lote</span>
              </button>
              <button class="btn-add" @click="showAgregar = !showAgregar; modoLote = false">
                <span v-if="showAgregar">✕ Cerrar</span>
                <span v-else>+ Agregar</span>
              </button>
            </div>
          </div>

          <!-- Panel modo lote -->
          <div v-if="modoLote" class="ap-lote-panel">
            <div class="ap-lote-header">
              <h5>📦 Asignar Lote de Productos</h5>
              <div class="ap-lote-actions">
                <button 
                  class="btn-select-all" 
                  @click="toggleSeleccionTodos"
                  :disabled="productosLote.length === 0"
                >
                  {{ todosSeleccionados ? '☑ Deseleccionar todos' : '☐ Seleccionar todos' }}
                </button>
                <button 
                  class="btn-asignar-lote" 
                  @click="asignarLote"
                  :disabled="productosSeleccionados.size === 0 || asignandoLote"
                >
                  <span v-if="asignandoLote">⏳ Asignando...</span>
                  <span v-else>📦 Asignar {{ productosSeleccionados.size }} seleccionado(s)</span>
                </button>
              </div>
            </div>
            <div class="ap-lote-search">
              <span class="search-icon">🔍</span>
              <input 
                v-model="buscarLote" 
                placeholder="Filtrar productos disponibles..." 
                class="ap-input"
              >
            </div>
            <div class="ap-lote-list">
              <div 
                v-for="prod in productosLote" 
                :key="prod.idProducto"
                class="ap-lote-item"
                :class="{ selected: productosSeleccionados.has(prod.idProducto) }"
                @click="toggleSeleccionProducto(prod.idProducto)"
              >
                <div class="ap-lote-check">
                  <span v-if="productosSeleccionados.has(prod.idProducto)" class="check-mark">✓</span>
                </div>
                <div class="ap-lote-info">
                  <span class="ap-lote-name">{{ prod.nombre }}</span>
                  <div class="ap-lote-meta">
                    <span v-if="prod.codigoBarras" class="ap-barcode">🏷️ {{ prod.codigoBarras }}</span>
                    <span v-if="prod.isGramaje" class="ap-gramaje">⚖️ Gramaje</span>
                    <span class="ap-lote-price">{{ formatoMoneda(prod.precioCosto) }}</span>
                  </div>
                </div>
              </div>
              <div v-if="productosLote.length === 0" class="ap-lote-empty">
                <span v-if="buscarLote">No se encontraron productos</span>
                <span v-else>Todos los productos ya están asignados</span>
              </div>
            </div>
          </div>

          <!-- Panel para agregar -->
          <div v-if="showAgregar" class="ap-add-panel">
            <div class="ap-add-header">
              <h5>Agregar Producto</h5>
              <div class="ap-precio-group">
                <label>Precio acordado (opcional):</label>
                <input v-model.number="precioAcordado" type="number" step="0.01" placeholder="0.00" class="ap-precio-input">
              </div>
            </div>
            <div class="ap-search-wrapper">
              <div class="ap-search-box">
                <span class="search-icon">🔍</span>
                <input
                  v-model="buscarProducto"
                  placeholder="Buscar o escanear código de barras..."
                  class="ap-input"
                  @focus="inputFocused = true"
                  @blur="inputFocused = false"
                  @keydown="handleBarcodeInput($event.key)"
                  autofocus
                >
              </div>
              <div v-show="showDropdown && productosFiltrados.length > 0" class="ap-dropdown">
                <div
                  v-for="(prod, idx) in productosFiltrados"
                  :key="prod.idProducto"
                  class="ap-dropdown-item"
                  :class="{
                    active: idx === dropdownIndex,
                    assigned: idsAsignados.has(prod.idProducto)
                  }"
                  @click="!idsAsignados.has(prod.idProducto) && asignarProducto(prod)"
                >
                  <div class="ap-drop-info">
                    <span class="ap-drop-name">{{ prod.nombre }}</span>
                    <div class="ap-drop-meta">
                      <span v-if="prod.codigoBarras" class="ap-barcode">🏷️ {{ prod.codigoBarras }}</span>
                      <span v-if="prod.isGramaje" class="ap-gramaje">⚖️ Gramaje</span>
                    </div>
                  </div>
                  <span v-if="idsAsignados.has(prod.idProducto)" class="ap-assigned-badge">✓</span>
                  <span v-else class="ap-drop-price">{{ formatoMoneda(prod.precioCosto) }}</span>
                </div>
              </div>
            </div>
            <div class="ap-hint">
              💡 Escribe para buscar o escanea un código de barras con el lector
            </div>
          </div>

          <!-- Lista de asignaciones -->
          <div v-if="cargando" class="ap-loading">
            <div class="loading-spinner"></div>
            <p>Cargando...</p>
          </div>
          <div v-else-if="asignaciones.length === 0" class="ap-empty-state">
            <div class="empty-icon">📦</div>
            <p class="empty-title">Sin productos asignados</p>
            <p class="empty-sub">Agrega productos que este proveedor surte</p>
          </div>
          <div v-else class="ap-asignaciones-list">
            <div
              v-for="asig in asignaciones"
              :key="asig.id"
              class="ap-asignacion-item"
            >
              <div class="ap-asig-info">
                <span class="ap-asig-name">{{ asig.nombreProducto || 'Producto' }}</span>
                <div class="ap-asig-meta">
                  <span v-if="getProductInfo(asig.idProducto)?.codigoBarras" class="ap-barcode">🏷️ {{ getProductInfo(asig.idProducto)?.codigoBarras }}</span>
                  <span v-if="getProductInfo(asig.idProducto)?.isGramaje" class="ap-gramaje">⚖️ Gramaje</span>
                  <span v-if="asig.precioAcordado" class="ap-agreed-price">Precio acordado: {{ formatoMoneda(asig.precioAcordado) }}</span>
                </div>
              </div>
              <button class="btn-remove" @click="eliminarAsignacion(asig.id)">🗑️</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.asignar-productos-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  overflow: hidden;
}

.ap-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05));
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 12px;
}

.ap-icon {
  font-size: 1.5rem;
}

.ap-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #f6f2de);
}

.ap-subtitle {
  margin: 0;
  font-size: 0.7rem;
  color: var(--text-secondary, #888);
}

.ap-layout {
  display: flex;
  gap: 0.75rem;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.ap-sidebar {
  width: 250px;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary, #2a2a3e);
  border: 1px solid var(--border-color, #333);
  border-radius: 12px;
  overflow: hidden;
}

.ap-search-box {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--border-color, #333);
}

.search-icon {
  font-size: 0.8rem;
  opacity: 0.5;
}

.ap-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary, #f6f2de);
  font-size: 0.75rem;
  outline: none;
}

.ap-proveedores-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.25rem;
}

.ap-proveedor-item {
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 0.15rem;
}

.ap-proveedor-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.ap-proveedor-item.active {
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.4);
}

.ap-prov-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ap-prov-badges {
  display: flex;
  gap: 0.2rem;
  align-items: center;
  flex-shrink: 0;
}

.ap-prov-dias {
  font-size: 0.65rem;
  padding: 0.1rem 0.2rem;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
}

.ap-prov-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary, #f6f2de);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ap-prov-type {
  font-size: 0.6rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  flex-shrink: 0;
}

.type-preventa {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.type-directa {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.ap-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary, #2a2a3e);
  border: 1px solid var(--border-color, #333);
  border-radius: 12px;
  overflow: visible;
}

.ap-main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color, #333);
}

.ap-header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-lote {
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.btn-lote.active {
  background: rgba(99, 102, 241, 0.4);
  color: #fff;
  border-color: #818cf8;
}

.btn-lote:hover {
  filter: brightness(1.1);
}

/* Lote panel */
.ap-lote-panel {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border-color, #333);
  background: rgba(99, 102, 241, 0.05);
}

.ap-lote-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ap-lote-header h5 {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-primary, #f6f2de);
}

.ap-lote-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.btn-select-all {
  padding: 0.35rem 0.6rem;
  background: var(--bg-panel, #252538);
  border: 1px solid var(--border-color, #444);
  border-radius: 4px;
  color: var(--text-secondary, #888);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-select-all:hover:not(:disabled) {
  border-color: var(--accent-color, #c99234);
  color: var(--text-primary, #f6f2de);
}

.btn-select-all:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-asignar-lote {
  padding: 0.35rem 0.75rem;
  background: linear-gradient(180deg, var(--accent-color, #c99234) 0%, color-mix(in srgb, var(--accent-color, #c99234) 70%, black) 100%);
  border: none;
  border-radius: 4px;
  color: var(--bg-primary, #1a1a2e);
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-asignar-lote:hover:not(:disabled) {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

.btn-asignar-lote:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ap-lote-search {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-color, #333);
}

.ap-lote-list {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  padding: 0.25rem;
}

.ap-lote-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: all 0.15s;
  border-radius: 4px;
  margin-bottom: 0.15rem;
}

.ap-lote-item:hover {
  background: rgba(99, 102, 241, 0.1);
}

.ap-lote-item.selected {
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.ap-lote-check {
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

.ap-lote-item.selected .ap-lote-check {
  background: var(--accent-color, #c99234);
  border-color: var(--accent-color, #c99234);
}

.check-mark {
  color: var(--bg-primary, #1a1a2e);
  font-size: 0.7rem;
  font-weight: 700;
}

.ap-lote-info {
  flex: 1;
  min-width: 0;
}

.ap-lote-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary, #f6f2de);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ap-lote-meta {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.15rem;
  align-items: center;
}

.ap-lote-price {
  font-size: 0.65rem;
  color: var(--accent-color, #c99234);
  font-family: monospace;
  font-weight: 600;
}

.ap-lote-empty {
  padding: 2rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
}

.ap-main-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary, #f6f2de);
}

.ap-count {
  font-size: 0.7rem;
  color: var(--text-secondary, #888);
}

.btn-add {
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

.btn-add:hover {
  filter: brightness(1.15);
}

.ap-add-panel {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color, #333);
  background: rgba(255, 255, 255, 0.02);
  overflow: visible;
  position: relative;
  z-index: 50;
}

.ap-add-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.ap-add-header h5 {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-primary, #f6f2de);
}

.ap-precio-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.ap-precio-group label {
  font-size: 0.7rem;
  color: var(--text-secondary, #888);
}

.ap-precio-input {
  width: 80px;
  padding: 0.25rem 0.4rem;
  background: var(--bg-panel, #252538);
  border: 1px solid var(--border-color, #444);
  border-radius: 4px;
  color: var(--text-primary, #f6f2de);
  font-size: 0.75rem;
  font-family: monospace;
}

.ap-search-wrapper {
  position: relative;
  z-index: 100;
}

.ap-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 250px;
  overflow-y: auto;
  background: var(--bg-panel, #252538);
  border: 1px solid var(--border-color, #444);
  border-radius: 8px;
  z-index: 10000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.ap-dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: all 0.1s;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.ap-dropdown-item:last-child {
  border-bottom: none;
}

.ap-dropdown-item:hover,
.ap-dropdown-item.active {
  background: rgba(99, 102, 241, 0.15);
}

.ap-dropdown-item.assigned {
  opacity: 0.4;
  cursor: not-allowed;
}

.ap-drop-info {
  flex: 1;
  min-width: 0;
}

.ap-drop-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary, #f6f2de);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ap-drop-meta {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.15rem;
}

.ap-drop-price {
  font-size: 0.75rem;
  color: var(--accent-color, #c99234);
  font-family: monospace;
  font-weight: 600;
  flex-shrink: 0;
}

.ap-assigned-badge {
  font-size: 0.8rem;
  color: #34d399;
  font-weight: 700;
  flex-shrink: 0;
}

.ap-hint {
  margin-top: 0.5rem;
  font-size: 0.65rem;
  color: var(--text-secondary, #888);
  text-align: center;
}

.ap-barcode {
  font-size: 0.6rem;
  color: var(--text-secondary, #888);
}

.ap-gramaje {
  font-size: 0.6rem;
  color: #f39c12;
}

.ap-asignaciones-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.25rem;
}

.ap-asignacion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.ap-asignacion-item:hover {
  background: rgba(255, 255, 255, 0.02);
}

.ap-asig-info {
  flex: 1;
  min-width: 0;
}

.ap-asig-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary, #f6f2de);
  display: block;
}

.ap-asig-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.15rem;
}

.ap-agreed-price {
  font-size: 0.65rem;
  color: var(--accent-color, #c99234);
  font-weight: 600;
  font-family: monospace;
}

.btn-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.25rem;
  opacity: 0.5;
  transition: all 0.15s;
}

.btn-remove:hover {
  opacity: 1;
}

.ap-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 0.5rem;
  flex: 1;
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

.ap-empty-small {
  padding: 1rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-secondary, #888);
}

.ap-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 0.75rem;
  color: var(--accent-color, #c99234);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color, #333);
  border-top-color: var(--accent-color, #c99234);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .ap-layout {
    flex-direction: column;
  }

  .ap-sidebar {
    width: 100%;
    max-height: 150px;
  }
  
  .ap-main-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
  
  .ap-header-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .ap-lote-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .ap-lote-actions {
    width: 100%;
    flex-direction: column;
  }
  
  .btn-select-all,
  .btn-asignar-lote {
    width: 100%;
    text-align: center;
    padding: 0.5rem;
  }
  
  .ap-lote-list {
    max-height: 300px;
  }
}
</style>
