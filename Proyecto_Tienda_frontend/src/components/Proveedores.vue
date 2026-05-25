<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useTheme } from '../composables/useTheme';
import Quagga from '@ericblade/quagga2';

const { currentTheme } = useTheme();

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.datos ?? json;
}

// Types
type Proveedor = {
  idProveedor?: number;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  notas?: string;
};

type PedidoDetalle = {
  idDetalle?: number;
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  codigoBarras?: string;
  precioCostoActual?: number;
};

type Pedido = {
  idPedido?: number;
  idProveedor: number;
  nombreProveedor?: string;
  fechaCreacion?: string;
  fechaEntregaEsperada: string;
  montoTotal: number;
  montoApartado: number;
  estatus: string;
  notas?: string;
  detalles: PedidoDetalle[];
};

type ProvisionDia = {
  fecha: string;
  montoRequerido: number;
  pedidos: { idPedido: number; nombreProveedor: string; montoTotal: number; montoApartado: number; montoPendiente: number }[];
};

// State
const proveedores = ref<Proveedor[]>([]);
const pedidos = ref<Pedido[]>([]);
const provisionSemanal = ref<ProvisionDia[]>([]);
const productosDisponibles = ref<{ idProducto: number; nombre: string; precio_costo: number; codigoBarras?: string }[]>([]);
const categorias = ref<{ idCategoria: number; nombre: string }[]>([]);

const activeTab = ref<'proveedores' | 'pedidos' | 'provision'>('provision');

// Proveedor form
const showProveedorModal = ref(false);
const editingProveedor = ref<Proveedor | null>(null);
const proveedorForm = ref<Proveedor>({ nombre: '', contacto: '', telefono: '', email: '', direccion: '', notas: '' });

// Pedido form
const showPedidoModal = ref(false);
const editingPedido = ref<Pedido | null>(null);
const pedidoForm = ref<Pedido>({ idProveedor: 0, fechaEntregaEsperada: '', montoTotal: 0, montoApartado: 0, estatus: 'PENDIENTE', notas: '', detalles: [] });
const newDetalle = ref<{ idProducto: number; cantidad: number; precioUnitario: number }>({ idProducto: 0, cantidad: 1, precioUnitario: 0 });
const barcodeInput = ref('');
const searchProducto = ref('');
const showProductoDropdown = ref(false);
let scannerBuffer = '';
let scannerTimer: ReturnType<typeof setTimeout> | null = null;
let lastScannerKeyTime = 0;
const scannerActivo = ref(false);

// Filters
const searchProveedor = ref('');
const filterEstatus = ref('all');

const filteredProveedores = computed(() => {
  let result = proveedores.value;
  if (searchProveedor.value) {
    const q = searchProveedor.value.toLowerCase();
    result = result.filter(p => p.nombre.toLowerCase().includes(q) || (p.contacto || '').toLowerCase().includes(q));
  }
  return result;
});

const filteredPedidos = computed(() => {
  let result = pedidos.value;
  if (filterEstatus.value !== 'all') {
    result = result.filter(p => p.estatus === filterEstatus.value);
  }
  return result.sort((a, b) => new Date(a.fechaEntregaEsperada).getTime() - new Date(b.fechaEntregaEsperada).getTime());
});

const filteredProductosPedido = computed(() => {
  if (!searchProducto.value) return productosDisponibles.value;
  const q = searchProducto.value.toLowerCase();
  return productosDisponibles.value.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    p.codigoBarras?.toLowerCase().includes(q)
  ).slice(0, 15);
});

const totalPendienteSemana = computed(() => {
  return provisionSemanal.value.reduce((sum, d) => sum + d.montoRequerido, 0);
});

function formatoMoneda(n: number): string {
  return `$${(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function loadAll() {
  try {
    proveedores.value = await fetchApi<Proveedor[]>('/proveedores/listar');
    pedidos.value = await fetchApi<Pedido[]>('/pedidos-proveedor/listar');
    provisionSemanal.value = await fetchApi<ProvisionDia[]>('/pedidos-proveedor/provision-semanal');
    productosDisponibles.value = await fetchApi<{ idProducto: number; nombre: string; precio_costo: number; codigoBarras?: string }[]>('/productos/listarProductos');
    categorias.value = await fetchApi<{ idCategoria: number; nombre: string }[]>('/categorias/listarCategorias');
  } catch (e) {
    console.error('Error loading data:', e);
  }
}

// Proveedor CRUD
function openProveedorModal(p?: Proveedor) {
  if (p) {
    editingProveedor.value = p;
    proveedorForm.value = { ...p };
  } else {
    editingProveedor.value = null;
    proveedorForm.value = { nombre: '', contacto: '', telefono: '', email: '', direccion: '', notas: '' };
  }
  showProveedorModal.value = true;
}

async function saveProveedor() {
  if (!proveedorForm.value.nombre.trim()) return;
  try {
    if (editingProveedor.value?.idProveedor) {
      await fetchApi(`/proveedores/actualizar/${editingProveedor.value.idProveedor}`, { method: 'PUT', body: JSON.stringify(proveedorForm.value) });
    } else {
      await fetchApi('/proveedores/agregar', { method: 'POST', body: JSON.stringify(proveedorForm.value) });
    }
    showProveedorModal.value = false;
    await loadAll();
  } catch (e) {
    console.error('Error saving proveedor:', e);
  }
}

async function deleteProveedor(id: number) {
  if (!confirm('¿Eliminar este proveedor?')) return;
  try {
    await fetchApi(`/proveedores/eliminar/${id}`, { method: 'DELETE' });
    await loadAll();
  } catch (e) {
    console.error('Error deleting proveedor:', e);
  }
}

// Pedido CRUD
function openPedidoModal(p?: Pedido) {
  if (p) {
    editingPedido.value = p;
    const detallesConPrecioActual = p.detalles.map(d => {
      const prod = productosDisponibles.value.find(pr => pr.idProducto === d.idProducto);
      return { ...d, precioCostoActual: prod?.precio_costo || 0 };
    });
    pedidoForm.value = { ...p, detalles: detallesConPrecioActual };
  } else {
    editingPedido.value = null;
    pedidoForm.value = { idProveedor: 0, fechaEntregaEsperada: '', montoTotal: 0, montoApartado: 0, estatus: 'PENDIENTE', notas: '', detalles: [] };
  }
  barcodeInput.value = '';
  searchProducto.value = '';
  showProductoDropdown.value = false;
  showPedidoModal.value = true;
}

function addDetalle() {
  if (!newDetalle.value.idProducto || !newDetalle.value.cantidad || !newDetalle.value.precioUnitario) return;
  const prod = productosDisponibles.value.find(p => p.idProducto === newDetalle.value.idProducto);
  pedidoForm.value.detalles.push({
    idProducto: newDetalle.value.idProducto,
    nombreProducto: prod?.nombre || '',
    cantidad: newDetalle.value.cantidad,
    precioUnitario: newDetalle.value.precioUnitario,
    subtotal: newDetalle.value.cantidad * newDetalle.value.precioUnitario,
    codigoBarras: prod?.codigoBarras,
    precioCostoActual: prod?.precio_costo || 0
  });
  recalcTotal();
  newDetalle.value = { idProducto: 0, cantidad: 1, precioUnitario: 0 };
  barcodeInput.value = '';
  searchProducto.value = '';
  showProductoDropdown.value = false;
}

function removeDetalle(idx: number) {
  pedidoForm.value.detalles.splice(idx, 1);
  recalcTotal();
}

function recalcTotal() {
  pedidoForm.value.montoTotal = pedidoForm.value.detalles.reduce((sum, d) => sum + d.subtotal, 0);
}

function updateDetallePrecio(idx: number, nuevoPrecio: number) {
  pedidoForm.value.detalles[idx].precioUnitario = nuevoPrecio;
  pedidoForm.value.detalles[idx].subtotal = pedidoForm.value.detalles[idx].cantidad * nuevoPrecio;
  recalcTotal();
}

function updateDetalleCantidad(idx: number, nuevaCantidad: number) {
  pedidoForm.value.detalles[idx].cantidad = nuevaCantidad;
  pedidoForm.value.detalles[idx].subtotal = nuevaCantidad * pedidoForm.value.detalles[idx].precioUnitario;
  recalcTotal();
}

function selectProductoForDetalle(prod: { idProducto: number; nombre: string; precio_costo: number; codigoBarras?: string }) {
  newDetalle.value.idProducto = prod.idProducto;
  newDetalle.value.precioUnitario = prod.precio_costo;
  searchProducto.value = prod.nombre;
  showProductoDropdown.value = false;
}

function handleSearchProductoFocus() {
  showProductoDropdown.value = true;
}

function handleSearchProductoBlur() {
  setTimeout(() => { showProductoDropdown.value = false; }, 200);
}

function handleScannerKey(e: KeyboardEvent) {
  if (!showPedidoModal.value) return;
  const target = e.target as HTMLElement;
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
  if (isInput && target.id !== 'barcode-input-pedido') return;

  if (e.key === 'Enter' && scannerBuffer.length > 0) {
    e.preventDefault();
    procesarEscaneoPedido(scannerBuffer);
    scannerBuffer = '';
    return;
  }

  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const now = Date.now();
    const timeDiff = now - lastScannerKeyTime;
    if (lastScannerKeyTime > 0 && timeDiff > 100) {
      scannerBuffer = '';
    }
    scannerBuffer += e.key;
    lastScannerKeyTime = now;
    if (scannerTimer) clearTimeout(scannerTimer);
    scannerTimer = setTimeout(() => {
      if (scannerBuffer.length > 0) {
        procesarEscaneoPedido(scannerBuffer);
        scannerBuffer = '';
      }
    }, 300);
  }
}

function procesarEscaneoPedido(codigo: string) {
  const codigoLimpio = codigo.trim();
  if (!codigoLimpio) return;
  const prod = productosDisponibles.value.find(p =>
    p.idProducto.toString() === codigoLimpio ||
    p.codigoBarras?.toString() === codigoLimpio
  );
  if (prod) {
    newDetalle.value.idProducto = prod.idProducto;
    newDetalle.value.precioUnitario = prod.precio_costo;
    addDetalle();
  }
  barcodeInput.value = '';
}

function startScanner() {
  if (scannerActivo.value) { stopScanner(); return; }
  scannerActivo.value = true;
  setTimeout(() => {
    const targetElement = document.querySelector('#scanner-interactive-pedido');
    if (!targetElement) return;
    Quagga.init(
      {
        inputStream: { name: 'Live', type: 'LiveStream', target: targetElement, constraints: { facingMode: 'environment' } } as any,
        decoder: { readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'upc_reader'] },
        locate: true,
      },
      (err: any) => {
        if (err) { scannerActivo.value = false; return; }
        Quagga.start();
      }
    );
    Quagga.onDetected((data: any) => {
      const code = data.codeResult.code;
      procesarEscaneoPedido(code);
    });
  }, 200);
}

function stopScanner() {
  if (Quagga) {
    Quagga.stop();
    Quagga.offDetected(() => {});
  }
  scannerActivo.value = false;
}

onMounted(() => {
  window.addEventListener('keydown', handleScannerKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleScannerKey);
  stopScanner();
});

async function savePedido() {
  if (!pedidoForm.value.idProveedor || !pedidoForm.value.fechaEntregaEsperada) return;
  try {
    if (editingPedido.value?.idPedido) {
      await fetchApi(`/pedidos-proveedor/actualizar/${editingPedido.value.idPedido}`, { method: 'PUT', body: JSON.stringify(pedidoForm.value) });
    } else {
      await fetchApi('/pedidos-proveedor/crear', { method: 'POST', body: JSON.stringify(pedidoForm.value) });
    }
    showPedidoModal.value = false;
    await loadAll();
  } catch (e) {
    console.error('Error saving pedido:', e);
  }
}

async function deletePedido(id: number) {
  if (!confirm('¿Eliminar este pedido?')) return;
  try {
    await fetchApi(`/pedidos-proveedor/eliminar/${id}`, { method: 'DELETE' });
    await loadAll();
  } catch (e) {
    console.error('Error deleting pedido:', e);
  }
}

async function recibirPedido(id: number) {
  if (!confirm('¿Confirmar recepción? Se agregará el stock de todos los productos del pedido.')) return;
  try {
    const res = await fetchApi<{ mensaje: string }>(`/pedidos-proveedor/recibir/${id}`, { method: 'PUT' });
    alert(res.mensaje || 'Pedido recibido y stock actualizado');
    await loadAll();
  } catch (e) {
    console.error('Error receiving pedido:', e);
    alert('Error al recibir el pedido');
  }
}

function handleEstatusChange() {
  if (pedidoForm.value.estatus === 'RECIBIDO' && editingPedido.value?.idPedido) {
    recibirPedido(editingPedido.value.idPedido);
    showPedidoModal.value = false;
  }
}

function estatusBadge(estatus: string): string {
  switch (estatus) {
    case 'PENDIENTE': return 'badge-pending';
    case 'RECIBIDO': return 'badge-received';
    case 'CANCELADO': return 'badge-cancelled';
    default: return 'badge-pending';
  }
}

onMounted(loadAll);
</script>

<template>
  <div class="proveedores-container">
    <div class="proveedores-header">
      <h2>📦 Gestión de Proveedores y Pedidos</h2>
    </div>

    <div class="tab-bar">
      <button :class="{ active: activeTab === 'provision' }" @click="activeTab = 'provision'">📋 Provision Semanal</button>
      <button :class="{ active: activeTab === 'proveedores' }" @click="activeTab = 'proveedores'">🏢 Proveedores</button>
      <button :class="{ active: activeTab === 'pedidos' }" @click="activeTab = 'pedidos'">📦 Pedidos</button>
    </div>

    <!-- PROVISION SEMANAL -->
    <div v-if="activeTab === 'provision'" class="provision-section">
      <div class="provision-summary">
        <div class="summary-card">
          <span class="summary-icon">💰</span>
          <div class="summary-info">
            <span class="summary-label">Total por apartar (7 días)</span>
            <span class="summary-value">{{ formatoMoneda(totalPendienteSemana) }}</span>
          </div>
        </div>
      </div>

      <div v-if="provisionSemanal.length === 0" class="empty-state">
        <p>No hay pedidos pendientes para esta semana</p>
      </div>

      <div v-for="dia in provisionSemanal" :key="dia.fecha" class="provision-day-card">
        <div class="day-header">
          <h3>{{ formatDate(dia.fecha) }}</h3>
          <span class="day-total">{{ formatoMoneda(dia.montoRequerido) }}</span>
        </div>
        <div class="day-pedidos">
          <div v-for="pedido in dia.pedidos" :key="pedido.idPedido" class="pedido-mini-card">
            <span class="pedido-proveedor">{{ pedido.nombreProveedor }}</span>
            <span class="pedido-amount">{{ formatoMoneda(pedido.montoPendiente) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- PROVEEDORES -->
    <div v-if="activeTab === 'proveedores'" class="proveedores-section">
      <div class="section-toolbar">
        <input v-model="searchProveedor" placeholder="🔍 Buscar proveedor..." class="search-input">
        <button class="btn-add" @click="openProveedorModal()">+ Nuevo Proveedor</button>
      </div>

      <div class="proveedores-grid">
        <div v-for="p in filteredProveedores" :key="p.idProveedor" class="proveedor-card">
          <div class="proveedor-info">
            <h3>{{ p.nombre }}</h3>
            <p v-if="p.contacto">👤 {{ p.contacto }}</p>
            <p v-if="p.telefono">📞 {{ p.telefono }}</p>
            <p v-if="p.email">✉️ {{ p.email }}</p>
          </div>
          <div class="proveedor-actions">
            <button class="btn-edit" @click="openProveedorModal(p)">✏️</button>
            <button class="btn-delete" @click="deleteProveedor(p.idProveedor!)">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- PEDIDOS -->
    <div v-if="activeTab === 'pedidos'" class="pedidos-section">
      <div class="section-toolbar">
        <select v-model="filterEstatus" class="filter-select">
          <option value="all">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="RECIBIDO">Recibido</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
        <button class="btn-add" @click="openPedidoModal()">+ Nuevo Pedido</button>
      </div>

      <div class="pedidos-list">
        <div v-for="pedido in filteredPedidos" :key="pedido.idPedido" class="pedido-card">
          <div class="pedido-header-row">
            <div class="pedido-main-info">
              <span class="pedido-supplier">{{ pedido.nombreProveedor }}</span>
              <span :class="['estatus-badge', estatusBadge(pedido.estatus)]">{{ pedido.estatus }}</span>
            </div>
            <div class="pedido-dates">
              <span class="delivery-date">📅 Entrega: {{ formatDate(pedido.fechaEntregaEsperada) }}</span>
            </div>
          </div>
          <div class="pedido-details-row">
            <span class="pedido-total">Total: {{ formatoMoneda(pedido.montoTotal) }}</span>
            <span class="pedido-apartado">Apartado: {{ formatoMoneda(pedido.montoApartado) }}</span>
            <span class="pedido-pendiente">Pendiente: {{ formatoMoneda(pedido.montoTotal - pedido.montoApartado) }}</span>
          </div>
          <div class="pedido-items-preview">
            <span v-for="d in pedido.detalles.slice(0, 3)" :key="d.idDetalle" class="item-tag">{{ d.nombreProducto }} ×{{ d.cantidad }}</span>
            <span v-if="pedido.detalles.length > 3" class="item-more">+{{ pedido.detalles.length - 3 }} más</span>
          </div>
          <div class="pedido-actions-row">
            <button class="btn-edit" @click="openPedidoModal(pedido)">✏️ Editar</button>
            <button v-if="pedido.estatus === 'PENDIENTE'" class="btn-receive" @click="recibirPedido(pedido.idPedido!)">✅ Recibido</button>
            <button class="btn-delete" @click="deletePedido(pedido.idPedido!)">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL PROVEEDOR -->
    <div v-if="showProveedorModal" class="modal-overlay" @click.self="showProveedorModal = false">
      <div class="modal-card">
        <h3>{{ editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor' }}</h3>
        <div class="form-grid">
          <div class="form-group full">
            <label>Nombre *</label>
            <input v-model="proveedorForm.nombre" placeholder="Nombre del proveedor">
          </div>
          <div class="form-group">
            <label>Contacto</label>
            <input v-model="proveedorForm.contacto" placeholder="Persona de contacto">
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input v-model="proveedorForm.telefono" placeholder="Teléfono">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input v-model="proveedorForm.email" type="email" placeholder="Email">
          </div>
          <div class="form-group">
            <label>Dirección</label>
            <input v-model="proveedorForm.direccion" placeholder="Dirección">
          </div>
          <div class="form-group full">
            <label>Notas</label>
            <textarea v-model="proveedorForm.notas" rows="2" placeholder="Notas adicionales"></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showProveedorModal = false">Cancelar</button>
          <button class="btn-save" @click="saveProveedor">Guardar</button>
        </div>
      </div>
    </div>

    <!-- MODAL PEDIDO -->
    <div v-if="showPedidoModal" class="modal-overlay" @click.self="showPedidoModal = false">
      <div class="modal-card modal-lg">
        <h3>{{ editingPedido ? 'Editar Pedido' : 'Nuevo Pedido' }}</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Proveedor *</label>
            <select v-model="pedidoForm.idProveedor">
              <option :value="0">Seleccionar...</option>
              <option v-for="p in proveedores" :key="p.idProveedor" :value="p.idProveedor">{{ p.nombre }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Fecha de entrega *</label>
            <input v-model="pedidoForm.fechaEntregaEsperada" type="date">
          </div>
          <div class="form-group">
            <label>Monto apartado</label>
            <input v-model.number="pedidoForm.montoApartado" type="number" step="0.01" min="0">
          </div>
          <div class="form-group">
            <label>Estatus</label>
            <select v-model="pedidoForm.estatus" @change="handleEstatusChange">
              <option value="PENDIENTE">Pendiente</option>
              <option value="RECIBIDO">Recibido</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
        </div>

        <div class="detalle-section">
          <h4>Productos del Pedido</h4>
          <div class="barcode-scanner-row">
            <input id="barcode-input-pedido" v-model="barcodeInput" type="text" placeholder="Escanear o escribir código de barras" class="barcode-input">
            <button class="btn-scanner-pedido" @click="startScanner" :class="{ active: scannerActivo }">
              <svg v-if="!scannerActivo" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
              {{ scannerActivo ? 'Detener' : 'Escanear' }}
            </button>
          </div>
          <div v-if="scannerActivo" class="scanner-viewport-pedido">
            <div id="scanner-interactive-pedido"></div>
            <div class="scanner-overlay-pedido">
              <div class="scanner-corner tl"></div>
              <div class="scanner-corner tr"></div>
              <div class="scanner-corner bl"></div>
              <div class="scanner-corner br"></div>
            </div>
          </div>
          <div class="detalle-add-row">
            <div class="producto-search-wrapper">
              <input
                v-model="searchProducto"
                type="text"
                placeholder="Buscar producto por nombre..."
                class="producto-search-input"
                @focus="handleSearchProductoFocus"
                @input="showProductoDropdown = true"
              >
              <div v-if="showProductoDropdown && filteredProductosPedido.length" class="producto-dropdown">
                <div
                  v-for="prod in filteredProductosPedido"
                  :key="prod.idProducto"
                  class="producto-dropdown-item"
                  @click="selectProductoForDetalle(prod)"
                >
                  <span class="producto-dropdown-name">{{ prod.nombre }}</span>
                  <span class="producto-dropdown-info">
                    <span v-if="prod.codigoBarras" class="producto-dropdown-barcode">{{ prod.codigoBarras }}</span>
                    <span class="producto-dropdown-price">{{ formatoMoneda(prod.precio_costo) }}</span>
                  </span>
                </div>
              </div>
            </div>
            <input v-model.number="newDetalle.cantidad" type="number" min="1" placeholder="Cant" class="detalle-input-sm">
            <input v-model.number="newDetalle.precioUnitario" type="number" step="0.01" min="0" placeholder="Precio unit" class="detalle-input-md">
            <button class="btn-add-detalle" @click="addDetalle">+ Agregar</button>
          </div>

          <div class="detalle-list">
            <div class="detalle-header-row">
              <span class="detalle-header-name">Producto</span>
              <span class="detalle-header-current">Precio Actual</span>
              <span class="detalle-header-pedido">Precio Pedido</span>
              <span class="detalle-header-cantidad">Cant</span>
              <span class="detalle-header-subtotal">Subtotal</span>
              <span class="detalle-header-action"></span>
            </div>
            <div v-for="(d, idx) in pedidoForm.detalles" :key="idx" class="detalle-item">
              <span class="detalle-name">
                {{ d.nombreProducto }}
                <span v-if="d.codigoBarras" class="detalle-barcode">({{ d.codigoBarras }})</span>
              </span>
              <span class="detalle-current-price">
                {{ formatoMoneda(d.precioCostoActual || 0) }}
              </span>
              <span class="detalle-pedido-price-wrapper">
                <input
                  v-model.number="d.precioUnitario"
                  type="number"
                  step="0.01"
                  min="0"
                  class="detalle-pedido-price-input"
                  :class="{ 'price-changed': d.precioUnitario !== d.precioCostoActual }"
                  @change="updateDetallePrecio(idx, d.precioUnitario)"
                >
                <span v-if="d.precioUnitario !== d.precioCostoActual" class="price-change-indicator">↕</span>
              </span>
              <input
                v-model.number="d.cantidad"
                type="number"
                min="1"
                class="detalle-cantidad-input"
                @change="updateDetalleCantidad(idx, d.cantidad)"
              >
              <span class="detalle-subtotal">{{ formatoMoneda(d.subtotal) }}</span>
              <button class="btn-remove" @click="removeDetalle(idx)">✕</button>
            </div>
          </div>

          <div class="detalle-total">
            <span>Total del Pedido:</span>
            <strong>{{ formatoMoneda(pedidoForm.montoTotal) }}</strong>
          </div>
        </div>

        <div class="form-group full">
          <label>Notas</label>
          <textarea v-model="pedidoForm.notas" rows="2" placeholder="Notas del pedido"></textarea>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="showPedidoModal = false">Cancelar</button>
          <button class="btn-save" @click="savePedido">Guardar Pedido</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.proveedores-container {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.proveedores-header h2 {
  margin: 0 0 1rem 0;
  font-size: 1.4rem;
  color: var(--text-primary);
}

.tab-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.tab-bar button {
  padding: 0.6rem 1.2rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
}

.tab-bar button.active {
  background: var(--accent-color);
  color: var(--bg-primary);
  border-color: var(--accent-color);
}

/* Provision */
.provision-summary {
  margin-bottom: 1rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, black));
  border-radius: 12px;
  color: var(--bg-primary);
}

.summary-icon {
  font-size: 2rem;
}

.summary-info {
  display: flex;
  flex-direction: column;
}

.summary-label {
  font-size: 0.85rem;
  opacity: 0.9;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 800;
}

.provision-day-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  margin-bottom: 0.75rem;
  overflow: hidden;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-color);
}

.day-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--accent-color);
}

.day-total {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.day-pedidos {
  padding: 0.5rem 1rem;
}

.pedido-mini-card {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border-color);
}

.pedido-mini-card:last-child {
  border-bottom: none;
}

.pedido-proveedor {
  color: var(--text-primary);
  font-weight: 500;
}

.pedido-amount {
  color: var(--error-color);
  font-weight: 700;
}

/* Proveedores */
.section-toolbar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search-input, .filter-select {
  flex: 1;
  min-width: 200px;
  padding: 0.6rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.btn-add {
  padding: 0.6rem 1.2rem;
  background: var(--accent-color);
  color: var(--bg-primary);
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.9rem;
}

.proveedores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}

.proveedor-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.proveedor-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.05rem;
  color: var(--text-primary);
}

.proveedor-info p {
  margin: 0.2rem 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.proveedor-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-edit, .btn-delete, .btn-receive {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-panel);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-delete {
  border-color: var(--error-color);
  color: var(--error-color);
}

.btn-receive {
  border-color: var(--success-color);
  color: var(--success-color);
}

/* Pedidos */
.pedidos-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pedido-card {
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.pedido-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pedido-main-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pedido-supplier {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.estatus-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.badge-pending {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.badge-received {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
}

.badge-cancelled {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.pedido-dates {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.pedido-details-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.pedido-total {
  font-weight: 700;
  color: var(--text-primary);
}

.pedido-apartado {
  color: var(--success-color);
}

.pedido-pendiente {
  color: var(--error-color);
  font-weight: 600;
}

.pedido-items-preview {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.item-tag {
  padding: 0.2rem 0.5rem;
  background: var(--bg-panel);
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.item-more {
  font-size: 0.8rem;
  color: var(--accent-color);
}

.pedido-actions-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-card {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-card.modal-lg {
  max-width: 700px;
}

.modal-card h3 {
  margin: 0 0 1rem 0;
  color: var(--accent-color);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-group.full {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-group input, .form-group select, .form-group textarea {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
}

.btn-save {
  padding: 0.5rem 1.5rem;
  background: var(--accent-color);
  color: var(--bg-primary);
  border: none;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
}

/* Detalle section */
.detalle-section {
  margin: 1rem 0;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.detalle-section h4 {
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.barcode-scanner-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.barcode-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--accent-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.barcode-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.btn-scanner-pedido {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: 2px solid var(--accent-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--accent-color);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-scanner-pedido:hover {
  background: var(--accent-color);
  color: white;
}

.btn-scanner-pedido.active {
  background: var(--danger-color, #e74c3c);
  border-color: var(--danger-color, #e74c3c);
  color: white;
}

.scanner-viewport-pedido {
  position: relative;
  width: 100%;
  height: 200px;
  margin-bottom: 0.75rem;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
}

.scanner-viewport-pedido #scanner-interactive-pedido {
  width: 100%;
  height: 100%;
}

.scanner-viewport-pedido #scanner-interactive-pedido video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scanner-overlay-pedido {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scanner-corner {
  position: absolute;
  width: 30px;
  height: 30px;
  border-color: var(--accent-color);
  border-style: solid;
  border-width: 0;
}

.scanner-corner.tl { top: 20%; left: 20%; border-top-width: 3px; border-left-width: 3px; }
.scanner-corner.tr { top: 20%; right: 20%; border-top-width: 3px; border-right-width: 3px; }
.scanner-corner.bl { bottom: 20%; left: 20%; border-bottom-width: 3px; border-left-width: 3px; }
.scanner-corner.br { bottom: 20%; right: 20%; border-bottom-width: 3px; border-right-width: 3px; }

.detalle-add-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.producto-search-wrapper {
  flex: 1;
  min-width: 150px;
  position: relative;
}

.producto-search-input {
  width: 100%;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.producto-search-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.producto-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 250px;
  overflow-y: auto;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  margin-top: 2px;
}

.producto-dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
}

.producto-dropdown-item:last-child {
  border-bottom: none;
}

.producto-dropdown-item:hover {
  background: var(--bg-secondary);
}

.producto-dropdown-name {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.85rem;
}

.producto-dropdown-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.producto-dropdown-barcode {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: monospace;
}

.producto-dropdown-price {
  font-size: 0.8rem;
  color: var(--accent-color);
  font-weight: 600;
}

.detalle-select {
  flex: 1;
  min-width: 150px;
  padding: 0.4rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.detalle-input-sm {
  width: 60px;
  padding: 0.4rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.detalle-input-md {
  width: 100px;
  padding: 0.4rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.btn-add-detalle {
  padding: 0.4rem 0.8rem;
  background: var(--success-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.detalle-list {
  max-height: 300px;
  overflow-y: auto;
}

.detalle-header-row {
  display: grid;
  grid-template-columns: 2fr 0.8fr 1fr 0.5fr 0.8fr 0.3fr;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 2px solid var(--border-color);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detalle-header-name { min-width: 0; }
.detalle-header-current { text-align: center; }
.detalle-header-pedido { text-align: center; }
.detalle-header-cantidad { text-align: center; }
.detalle-header-subtotal { text-align: right; }

.detalle-item {
  display: grid;
  grid-template-columns: 2fr 0.8fr 1fr 0.5fr 0.8fr 0.3fr;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.85rem;
}

.detalle-name {
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detalle-barcode {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: monospace;
  margin-left: 0.3rem;
}

.detalle-current-price {
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.8rem;
}

.detalle-pedido-price-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
}

.detalle-pedido-price-input {
  width: 100%;
  max-width: 90px;
  padding: 0.3rem 0.4rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  text-align: center;
  font-size: 0.85rem;
}

.detalle-pedido-price-input.price-changed {
  border-color: var(--warning-color, #f39c12);
  background: rgba(243, 156, 18, 0.1);
}

.price-change-indicator {
  color: var(--warning-color, #f39c12);
  font-size: 0.9rem;
  font-weight: bold;
}

.detalle-cantidad-input {
  width: 100%;
  max-width: 50px;
  padding: 0.3rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  text-align: center;
  font-size: 0.85rem;
}

.detalle-subtotal {
  font-weight: 700;
  color: var(--accent-color);
  text-align: right;
}

.btn-remove {
  padding: 0.2rem 0.4rem;
  background: transparent;
  border: 1px solid var(--error-color);
  border-radius: 4px;
  color: var(--error-color);
  cursor: pointer;
  font-size: 0.8rem;
}

.detalle-total {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0 0 0;
  margin-top: 0.5rem;
  border-top: 2px solid var(--accent-color);
  font-size: 1rem;
  color: var(--text-primary);
}

.detalle-total strong {
  color: var(--accent-color);
  font-size: 1.1rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .proveedores-container {
    padding: 0.75rem;
  }

  .proveedores-header h2 {
    font-size: 1.2rem;
  }

  .tab-bar {
    gap: 0.35rem;
  }

  .tab-bar button {
    padding: 0.5rem 0.8rem;
    font-size: 0.8rem;
    flex: 1;
    text-align: center;
    min-width: 0;
  }

  .summary-card {
    padding: 0.75rem 1rem;
  }

  .summary-icon {
    font-size: 1.5rem;
  }

  .summary-value {
    font-size: 1.2rem;
  }

  .summary-label {
    font-size: 0.75rem;
  }

  .day-header {
    padding: 0.6rem 0.75rem;
  }

  .day-header h3 {
    font-size: 0.9rem;
  }

  .day-total {
    font-size: 0.95rem;
  }

  .day-pedidos {
    padding: 0.4rem 0.75rem;
  }

  .section-toolbar {
    flex-direction: column;
  }

  .search-input, .filter-select {
    min-width: 0;
    width: 100%;
  }

  .btn-add {
    width: 100%;
    text-align: center;
  }

  .proveedores-grid {
    grid-template-columns: 1fr;
  }

  .proveedor-card {
    flex-direction: column;
    gap: 0.75rem;
  }

  .proveedor-actions {
    align-self: flex-end;
  }

  .pedido-header-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .pedido-supplier {
    font-size: 1rem;
  }

  .pedido-details-row {
    flex-direction: column;
    gap: 0.3rem;
  }

  .pedido-actions-row {
    flex-wrap: wrap;
  }

  .pedido-actions-row button {
    flex: 1;
    min-width: 0;
    text-align: center;
    font-size: 0.8rem;
    padding: 0.5rem;
  }

  .modal-card {
    padding: 1rem;
    max-height: 95vh;
  }

  .modal-card.modal-lg {
    max-width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .detalle-add-row {
    flex-direction: column;
  }

  .barcode-scanner-row {
    flex-direction: column;
  }

  .btn-scanner-pedido {
    width: 100%;
    justify-content: center;
  }

  .scanner-viewport-pedido {
    height: 180px;
  }

  .detalle-add-row {
    flex-direction: column;
  }

  .producto-search-wrapper {
    width: 100%;
  }

  .producto-dropdown {
    max-height: 200px;
  }

  .detalle-input-sm, .detalle-input-md {
    width: 100%;
  }

  .btn-add-detalle {
    width: 100%;
  }

  .btn-add-detalle {
    width: 100%;
  }

  .detalle-item {
    grid-template-columns: 1fr;
    gap: 0.3rem;
    padding: 0.75rem 0.5rem;
  }

  .detalle-header-row {
    display: none;
  }

  .detalle-name {
    font-size: 0.9rem;
    margin-bottom: 0.3rem;
  }

  .detalle-current-price,
  .detalle-pedido-price-wrapper,
  .detalle-cantidad-input,
  .detalle-subtotal {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
  }

  .detalle-current-price::before {
    content: 'Actual:';
    color: var(--text-secondary);
    font-weight: 500;
  }

  .detalle-pedido-price-wrapper::before {
    content: 'Pedido:';
    color: var(--text-secondary);
    font-weight: 500;
  }

  .detalle-cantidad-input::before {
    content: 'Cantidad:';
    color: var(--text-secondary);
    font-weight: 500;
  }

  .detalle-subtotal::before {
    content: 'Subtotal:';
    color: var(--text-secondary);
    font-weight: 500;
  }

  .detalle-subtotal {
    text-align: left;
    font-size: 0.95rem;
  }

  .detalle-pedido-price-input {
    max-width: 100px;
  }

  .btn-remove {
    align-self: flex-end;
    width: 100%;
    margin-top: 0.3rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-actions button {
    width: 100%;
  }
}

@media (max-width: 400px) {
  .proveedores-container {
    padding: 0.5rem;
  }

  .tab-bar button {
    padding: 0.45rem 0.5rem;
    font-size: 0.72rem;
  }

  .summary-card {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }

  .pedido-mini-card {
    flex-direction: column;
    gap: 0.2rem;
  }

  .pedido-amount {
    font-size: 0.85rem;
  }

  .item-tag {
    font-size: 0.7rem;
    padding: 0.15rem 0.4rem;
  }
}
</style>
