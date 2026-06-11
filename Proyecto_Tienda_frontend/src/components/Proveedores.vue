<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useTheme } from '../composables/useTheme';
import Quagga from '@ericblade/quagga2';
import PedidoSugerido from './modals/PedidoSugerido.vue';
import SugeridoHoy from './modals/SugeridoHoy.vue';
import AsignarProductosProveedor from './modals/AsignarProductosProveedor.vue';

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

type Proveedor = {
  idProveedor?: number;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  notas?: string;
  tipoProveedor?: string;
  diasEntrega?: string;
  diasPedido?: string;
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

const proveedores = ref<Proveedor[]>([]);
const pedidos = ref<Pedido[]>([]);
const provisionSemanal = ref<ProvisionDia[]>([]);
const productosDisponibles = ref<{ idProducto: number; nombre: string; precio_costo: number; codigoBarras?: string }[]>([]);
const categorias = ref<{ idCategoria: number; nombre: string }[]>([]);

const activeTab = ref<'proveedores' | 'pedidos' | 'provision' | 'sugerido' | 'sugeridoHoy' | 'asignar'>('proveedores');

const showProveedorModal = ref(false);
const editingProveedor = ref<Proveedor | null>(null);
const proveedorForm = ref<Proveedor>({ nombre: '', contacto: '', telefono: '', email: '', direccion: '', notas: '', tipoProveedor: 'DIRECTA', diasEntrega: '', diasPedido: '' });

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
const montoManual = ref(false);

const searchProveedor = ref('');
const showHistorial = ref(false);

const filteredProveedores = computed(() => {
  let result = proveedores.value;
  if (searchProveedor.value) {
    const q = searchProveedor.value.toLowerCase();
    result = result.filter(p => p.nombre.toLowerCase().includes(q) || (p.contacto || '').toLowerCase().includes(q) || (p.telefono || '').includes(q));
  }
  return result;
});

const filteredPedidos = computed(() => {
  return pedidos.value
    .filter(p => p.estatus === 'PENDIENTE')
    .sort((a, b) => new Date(a.fechaEntregaEsperada).getTime() - new Date(b.fechaEntregaEsperada).getTime());
});

const historialPedidos = computed(() => {
  return pedidos.value
    .filter(p => p.estatus === 'RECIBIDO' || p.estatus === 'CANCELADO')
    .sort((a, b) => new Date(b.fechaCreacion || '').getTime() - new Date(a.fechaCreacion || '').getTime());
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

const totalPendientes = computed(() => pedidos.value.filter(p => p.estatus === 'PENDIENTE').length);
const totalRecibidos = computed(() => pedidos.value.filter(p => p.estatus === 'RECIBIDO').length);
const totalCancelados = computed(() => pedidos.value.filter(p => p.estatus === 'CANCELADO').length);

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

function diasParaEntrega(dateStr: string): string {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T12:00:00');
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Vencido hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? 's' : ''}`;
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  return `En ${diff} días`;
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

function openProveedorModal(p?: Proveedor) {
  if (p) {
    editingProveedor.value = p;
    proveedorForm.value = { ...p };
  } else {
    editingProveedor.value = null;
    proveedorForm.value = { nombre: '', contacto: '', telefono: '', email: '', direccion: '', notas: '', tipoProveedor: 'DIRECTA', diasEntrega: '', diasPedido: '' };
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

function toggleDia(dia: string) {
  const current = (proveedorForm.value.diasEntrega || '').split(',').filter(Boolean);
  const idx = current.indexOf(dia);
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(dia);
  }
  proveedorForm.value.diasEntrega = current.join(',');
}

function toggleDiaPedido(dia: string) {
  const current = (proveedorForm.value.diasPedido || '').split(',').filter(Boolean);
  const idx = current.indexOf(dia);
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(dia);
  }
  proveedorForm.value.diasPedido = current.join(',');
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

function openPedidoModal(p?: Pedido) {
  if (p) {
    editingPedido.value = p;
    const detallesConPrecioActual = p.detalles.map(d => {
      const prod = productosDisponibles.value.find(pr => pr.idProducto === d.idProducto);
      return { ...d, precioCostoActual: prod?.precio_costo || 0 };
    });
    pedidoForm.value = { ...p, detalles: detallesConPrecioActual };
    montoManual.value = p.detalles.length === 0 && p.montoTotal > 0;
  } else {
    editingPedido.value = null;
    pedidoForm.value = { idProveedor: 0, fechaEntregaEsperada: '', montoTotal: 0, montoApartado: 0, estatus: 'PENDIENTE', notas: '', detalles: [] };
    montoManual.value = false;
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
  if (!montoManual.value) {
    pedidoForm.value.montoTotal = pedidoForm.value.detalles.reduce((sum, d) => sum + d.subtotal, 0);
  }
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
  if (montoManual.value && (!pedidoForm.value.montoTotal || pedidoForm.value.montoTotal <= 0)) return;
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
  if (!confirm('¿Cancelar este pedido?')) return;
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

function getProveedorNombre(id: number): string {
  const p = proveedores.value.find(pr => pr.idProveedor === id);
  return p ? p.nombre : 'Sin proveedor';
}

function getProveedorInfo(id: number): Proveedor | undefined {
  return proveedores.value.find(pr => pr.idProveedor === id);
}

onMounted(loadAll);
</script>

<template>
  <div class="proveedores-container">
    <div class="proveedores-header">
      <h2>📦 Proveedores y Pedidos</h2>
    </div>

    <div class="tab-bar">
      <button :class="['tab-btn', { active: activeTab === 'proveedores' }]" @click="activeTab = 'proveedores'">
        <span class="tab-icon">🏢</span>
        <span class="tab-label">Proveedores</span>
        <span class="tab-count">{{ proveedores.length }}</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'pedidos' }]" @click="activeTab = 'pedidos'">
        <span class="tab-icon">📋</span>
        <span class="tab-label">Pedidos</span>
        <span class="tab-count badge-pending-pill">{{ totalPendientes }}</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'provision' }]" @click="activeTab = 'provision'">
        <span class="tab-icon">💰</span>
        <span class="tab-label">Provisión</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'sugerido' }]" @click="activeTab = 'sugerido'">
        <span class="tab-icon">🧙</span>
        <span class="tab-label">Sugerido</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'sugeridoHoy' }]" @click="activeTab = 'sugeridoHoy'">
        <span class="tab-icon">📅</span>
        <span class="tab-label">Sugerido Hoy</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'asignar' }]" @click="activeTab = 'asignar'">
        <span class="tab-icon">🔗</span>
        <span class="tab-label">Asignar Productos</span>
      </button>
    </div>

    <!-- PROVEEDORES -->
    <div v-if="activeTab === 'proveedores'" class="tab-content">
      <div class="content-toolbar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model="searchProveedor" placeholder="Buscar por nombre, contacto o teléfono..." class="search-input-modern">
        </div>
        <button class="btn-primary" @click="openProveedorModal()">
          <span class="btn-icon">+</span> Nuevo Proveedor
        </button>
      </div>

      <div v-if="filteredProveedores.length === 0" class="empty-state-modern">
        <div class="empty-icon">🏢</div>
        <p class="empty-title">No hay proveedores</p>
        <p class="empty-subtitle">Agrega tu primer proveedor para comenzar a crear pedidos</p>
        <button class="btn-primary" @click="openProveedorModal()">+ Agregar Proveedor</button>
      </div>

      <div class="proveedores-list-compact">
        <div v-for="p in filteredProveedores" :key="p.idProveedor" class="proveedor-row-compact">
          <div class="proveedor-row-main">
            <div class="proveedor-avatar-sm">
              {{ p.nombre.charAt(0).toUpperCase() }}
            </div>
            <div class="proveedor-row-info">
              <h3 class="proveedor-name">{{ p.nombre }}</h3>
              <div class="proveedor-badges">
                <span class="badge-tipo-prov" :class="p.tipoProveedor === 'PREVENTA' ? 'badge-preventa-prov' : 'badge-directa-prov'">
                  {{ p.tipoProveedor === 'PREVENTA' ? '📋 Preventa' : '🚚 Directa' }}
                </span>
                <span v-if="p.diasPedido" class="badge-dias-prov badge-pedido-prov">📋 {{ p.diasPedido }}</span>
                <span v-if="p.diasEntrega" class="badge-dias-prov badge-entrega-prov">🚚 {{ p.diasEntrega }}</span>
              </div>
              <div class="proveedor-quick-info">
                <span v-if="p.telefono" class="quick-info-item">📞 {{ p.telefono }}</span>
                <span v-if="p.email" class="quick-info-item">✉️ {{ p.email }}</span>
                <span v-if="p.contacto" class="quick-info-item">👤 {{ p.contacto }}</span>
              </div>
            </div>
          </div>
          <div class="proveedor-row-actions">
            <button class="btn-icon-sm btn-edit-sm" @click="openProveedorModal(p)" title="Editar">✏️</button>
            <button class="btn-icon-sm btn-delete-sm" @click="deleteProveedor(p.idProveedor!)" title="Eliminar">🗑️</button>
          </div>
          <div v-if="p.direccion || p.notas" class="proveedor-row-details">
            <span v-if="p.direccion" class="detail-line">📍 {{ p.direccion }}</span>
            <span v-if="p.notas" class="detail-line notas-line">📝 {{ p.notas }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- PEDIDOS -->
    <div v-if="activeTab === 'pedidos'" class="tab-content">
      <div class="content-toolbar">
        <div class="pedidos-stats">
          <span class="stat-item stat-pending">
            <span class="stat-dot dot-pending"></span>
            {{ totalPendientes }} pendientes
          </span>
          <span class="stat-item stat-received">
            <span class="stat-dot dot-received"></span>
            {{ totalRecibidos }} recibidos
          </span>
          <span class="stat-item stat-cancelled">
            <span class="stat-dot dot-cancelled"></span>
            {{ totalCancelados }} cancelados
          </span>
        </div>
        <div class="toolbar-actions">
          <button class="btn-secondary" :class="{ active: showHistorial }" @click="showHistorial = !showHistorial">
            📜 Historial
          </button>
          <button class="btn-primary" @click="openPedidoModal()">
            <span class="btn-icon">+</span> Nuevo Pedido
          </button>
        </div>
      </div>

      <!-- Pedidos Pendientes -->
      <div v-if="filteredPedidos.length === 0 && !showHistorial" class="empty-state-modern">
        <div class="empty-icon">📋</div>
        <p class="empty-title">No hay pedidos pendientes</p>
        <p class="empty-subtitle">Crea un nuevo pedido para comenzar</p>
        <button class="btn-primary" @click="openPedidoModal()">+ Crear Pedido</button>
      </div>

      <div class="pedidos-grid">
        <div v-for="pedido in filteredPedidos" :key="pedido.idPedido" class="pedido-card-modern">
          <div class="pedido-card-top">
            <div class="pedido-supplier-info">
              <div class="pedido-supplier-avatar">{{ (pedido.nombreProveedor || '?').charAt(0) }}</div>
              <div>
                <h4 class="pedido-supplier-name">{{ pedido.nombreProveedor }}</h4>
                <span class="pedido-date">📅 {{ formatDate(pedido.fechaEntregaEsperada) }}</span>
              </div>
            </div>
            <span :class="['estatus-badge-modern', estatusBadge(pedido.estatus)]">{{ pedido.estatus }}</span>
          </div>

          <div class="pedido-card-amounts">
            <div class="amount-item amount-total">
              <span class="amount-label">Total</span>
              <span class="amount-value">{{ formatoMoneda(pedido.montoTotal) }}</span>
            </div>
            <div class="amount-item amount-apartado">
              <span class="amount-label">Apartado</span>
              <span class="amount-value">{{ formatoMoneda(pedido.montoApartado) }}</span>
            </div>
            <div class="amount-item amount-pendiente">
              <span class="amount-label">Pendiente</span>
              <span class="amount-value">{{ formatoMoneda(pedido.montoTotal - pedido.montoApartado) }}</span>
            </div>
          </div>

          <div v-if="pedido.detalles.length > 0" class="pedido-items-preview">
            <span v-for="d in pedido.detalles.slice(0, 4)" :key="d.idDetalle" class="item-chip">
              {{ d.nombreProducto }} <strong>×{{ d.cantidad }}</strong>
            </span>
            <span v-if="pedido.detalles.length > 4" class="item-chip item-more">+{{ pedido.detalles.length - 4 }} más</span>
          </div>
          <div v-else class="pedido-manual-tag">
            <span class="manual-icon">💲</span> Monto asignado manualmente
          </div>

          <div class="pedido-card-actions">
            <button class="btn-action-modern btn-view" @click="openPedidoModal(pedido)">✏️ Editar</button>
            <button class="btn-action-modern btn-receive-modern" @click="recibirPedido(pedido.idPedido!)">✅ Recibir</button>
            <button class="btn-action-modern btn-cancel-modern" @click="deletePedido(pedido.idPedido!)">🗑️ Cancelar</button>
          </div>
        </div>
      </div>

      <!-- Historial -->
      <div v-if="showHistorial" class="historial-section-modern">
        <div class="historial-header">
          <h3>📜 Historial de Pedidos</h3>
          <span class="historial-count">{{ historialPedidos.length }} pedido{{ historialPedidos.length !== 1 ? 's' : '' }}</span>
        </div>

        <div v-if="historialPedidos.length === 0" class="empty-state-modern small">
          <p>No hay pedidos en el historial</p>
        </div>

        <div class="pedidos-grid">
          <div v-for="pedido in historialPedidos" :key="pedido.idPedido" class="pedido-card-modern pedido-card-historial">
            <div class="pedido-card-top">
              <div class="pedido-supplier-info">
                <div class="pedido-supplier-avatar">{{ (pedido.nombreProveedor || '?').charAt(0) }}</div>
                <div>
                  <h4 class="pedido-supplier-name">{{ pedido.nombreProveedor }}</h4>
                  <span class="pedido-date">Creado: {{ formatDateTime(pedido.fechaCreacion || '') }}</span>
                </div>
              </div>
              <span :class="['estatus-badge-modern', estatusBadge(pedido.estatus)]">{{ pedido.estatus }}</span>
            </div>

            <div class="pedido-card-amounts">
              <div class="amount-item amount-total">
                <span class="amount-label">Total</span>
                <span class="amount-value">{{ formatoMoneda(pedido.montoTotal) }}</span>
              </div>
              <div class="amount-item amount-apartado">
                <span class="amount-label">Apartado</span>
                <span class="amount-value">{{ formatoMoneda(pedido.montoApartado) }}</span>
              </div>
              <div class="amount-item amount-pendiente">
                <span class="amount-label">Pendiente</span>
                <span class="amount-value">{{ formatoMoneda(pedido.montoTotal - pedido.montoApartado) }}</span>
              </div>
            </div>

            <div v-if="pedido.detalles.length > 0" class="pedido-items-preview">
              <span v-for="d in pedido.detalles.slice(0, 4)" :key="d.idDetalle" class="item-chip">
                {{ d.nombreProducto }} <strong>×{{ d.cantidad }}</strong>
              </span>
              <span v-if="pedido.detalles.length > 4" class="item-chip item-more">+{{ pedido.detalles.length - 4 }} más</span>
            </div>
            <div v-else class="pedido-manual-tag">
              <span class="manual-icon">💲</span> Monto asignado manualmente
            </div>

            <div class="pedido-card-actions">
              <button class="btn-action-modern btn-view" @click="openPedidoModal(pedido)">👁️ Ver detalle</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PROVISION SEMANAL -->
    <div v-if="activeTab === 'provision'" class="tab-content">
      <div class="provision-summary-modern">
        <div class="summary-card-modern">
          <div class="summary-icon-modern">💰</div>
          <div class="summary-info-modern">
            <span class="summary-label">Total por apartar (7 días)</span>
            <span class="summary-value">{{ formatoMoneda(totalPendienteSemana) }}</span>
          </div>
        </div>
      </div>

      <div v-if="provisionSemanal.length === 0" class="empty-state-modern">
        <div class="empty-icon">📋</div>
        <p class="empty-title">No hay provisiones pendientes</p>
        <p class="empty-subtitle">Los pedidos con fecha de entrega esta semana aparecerán aquí</p>
      </div>

      <div v-for="dia in provisionSemanal" :key="dia.fecha" class="provision-day-card-modern">
        <div class="day-header-modern">
          <div class="day-info">
            <h3>{{ formatDate(dia.fecha) }}</h3>
            <span class="day-pedidos-count">{{ dia.pedidos.length }} pedido{{ dia.pedidos.length !== 1 ? 's' : '' }}</span>
          </div>
          <span class="day-total-modern">{{ formatoMoneda(dia.montoRequerido) }}</span>
        </div>
        <div class="day-pedidos-modern">
          <div v-for="pedido in dia.pedidos" :key="pedido.idPedido" class="pedido-mini-card-modern">
            <div class="mini-pedido-info">
              <span class="mini-pedido-name">{{ pedido.nombreProveedor }}</span>
              <span class="mini-pedido-total">{{ formatoMoneda(pedido.montoTotal) }}</span>
            </div>
            <span class="mini-pedido-pendiente">{{ formatoMoneda(pedido.montoPendiente) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- SUGERIDO -->
    <div v-if="activeTab === 'sugerido'" class="tab-content tab-sugerido">
      <PedidoSugerido @pedido-creado="loadAll" />
    </div>

    <!-- SUGERIDO HOY -->
    <div v-if="activeTab === 'sugeridoHoy'" class="tab-content tab-sugerido-hoy">
      <SugeridoHoy @pedido-creado="loadAll" />
    </div>

    <!-- ASIGNAR PRODUCTOS -->
    <div v-if="activeTab === 'asignar'" class="tab-content tab-asignar">
      <AsignarProductosProveedor />
    </div>

    <!-- MODAL PROVEEDOR -->
    <div v-if="showProveedorModal" class="modal-overlay" @click.self="showProveedorModal = false">
      <div class="modal-card-modern">
        <div class="modal-header">
          <h3>{{ editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor' }}</h3>
          <button class="modal-close" @click="showProveedorModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group-modern">
            <label>Nombre del proveedor *</label>
            <input v-model="proveedorForm.nombre" placeholder="Ej: Distribuidora ABC" class="input-modern" autofocus>
          </div>
          <div class="form-row">
            <div class="form-group-modern">
              <label>Contacto</label>
              <input v-model="proveedorForm.contacto" placeholder="Persona de contacto" class="input-modern">
            </div>
            <div class="form-group-modern">
              <label>Teléfono</label>
              <input v-model="proveedorForm.telefono" placeholder="(000) 000-0000" class="input-modern">
            </div>
          </div>
          <div class="form-group-modern">
            <label>Email</label>
            <input v-model="proveedorForm.email" type="email" placeholder="correo@ejemplo.com" class="input-modern">
          </div>
          <div class="form-group-modern">
            <label>Dirección</label>
            <input v-model="proveedorForm.direccion" placeholder="Calle, número, colonia..." class="input-modern">
          </div>
          <div class="form-group-modern">
            <label>Notas</label>
            <textarea v-model="proveedorForm.notas" rows="2" placeholder="Notas adicionales..." class="input-modern textarea-modern"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group-modern">
              <label>Tipo de proveedor</label>
              <select v-model="proveedorForm.tipoProveedor" class="input-modern">
                <option value="DIRECTA">Venta directa (mismo día)</option>
                <option value="PREVENTA">Preventa (entrega siguiente día)</option>
              </select>
            </div>
            <div class="form-group-modern">
              <label>Días de entrega</label>
              <div class="dias-checkboxes">
                <label v-for="dia in ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo']" :key="dia" class="dia-check">
                  <input type="checkbox" :value="dia" :checked="(proveedorForm.diasEntrega || '').split(',').includes(dia)" @change="toggleDia(dia)">
                  <span>{{ dia.substring(0, 3) }}</span>
                </label>
              </div>
            </div>
          </div>
          <div class="form-group-modern">
            <label>📋 Días de pedido (Preventa)</label>
            <div class="dias-checkboxes">
              <label v-for="dia in ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo']" :key="dia" class="dia-check">
                <input type="checkbox" :value="dia" :checked="(proveedorForm.diasPedido || '').split(',').includes(dia)" @change="toggleDiaPedido(dia)">
                <span>{{ dia.substring(0, 3) }}</span>
              </label>
            </div>
            <span class="field-hint">Días en que se le puede hacer pedido (ej: Miércoles)</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" @click="showProveedorModal = false">Cancelar</button>
          <button class="btn-modal-save" @click="saveProveedor">{{ editingProveedor ? 'Actualizar' : 'Guardar' }}</button>
        </div>
      </div>
    </div>

    <!-- MODAL PEDIDO -->
    <div v-if="showPedidoModal" class="modal-overlay" @click.self="showPedidoModal = false">
      <div class="modal-card-modern modal-xl">
        <div class="modal-header">
          <h3>{{ editingPedido ? 'Editar Pedido' : 'Nuevo Pedido' }}</h3>
          <button class="modal-close" @click="showPedidoModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="pedido-form-section">
            <h4 class="section-title">📋 Datos del Pedido</h4>
            <div class="form-row">
              <div class="form-group-modern form-lg">
                <label>Proveedor *</label>
                <select v-model="pedidoForm.idProveedor" class="input-modern select-modern">
                  <option :value="0">Seleccionar proveedor...</option>
                  <option v-for="p in proveedores" :key="p.idProveedor" :value="p.idProveedor">{{ p.nombre }}</option>
                </select>
              </div>
              <div class="form-group-modern">
                <label>Fecha de entrega *</label>
                <input v-model="pedidoForm.fechaEntregaEsperada" type="date" class="input-modern">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group-modern">
                <label>Monto apartado</label>
                <input v-model.number="pedidoForm.montoApartado" type="number" step="0.01" min="0" placeholder="0.00" class="input-modern">
              </div>
              <div class="form-group-modern" v-if="editingPedido">
                <label>Estatus</label>
                <select v-model="pedidoForm.estatus" @change="handleEstatusChange" class="input-modern select-modern">
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="RECIBIDO">Recibido</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          <div class="monto-manual-section">
            <label class="monto-toggle">
              <input type="checkbox" v-model="montoManual">
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
              <span class="toggle-label">Monto total sin productos</span>
            </label>
            <div v-if="montoManual" class="monto-input-wrapper">
              <span class="currency-symbol">$</span>
              <input v-model.number="pedidoForm.montoTotal" type="number" step="0.01" min="0" placeholder="0.00" class="monto-input-big">
            </div>
          </div>

          <div class="detalle-section-modern">
            <h4 class="section-title">📦 Productos del Pedido</h4>
            <p class="section-hint">Agrega los productos que llegarán en este pedido. Si aún no los conoces, usa el toggle de arriba para colocar solo el monto total.</p>

            <div class="barcode-row">
              <div class="barcode-input-wrapper">
                <span class="barcode-icon">📷</span>
                <input id="barcode-input-pedido" v-model="barcodeInput" type="text" placeholder="Escanear código de barras" class="input-modern barcode-input">
              </div>
              <button class="btn-scanner" @click="startScanner" :class="{ active: scannerActivo }">
                {{ scannerActivo ? '⏹ Detener' : '📷 Escanear' }}
              </button>
            </div>
            <div v-if="scannerActivo" class="scanner-viewport">
              <div id="scanner-interactive-pedido"></div>
              <div class="scanner-overlay">
                <div class="scanner-corner tl"></div>
                <div class="scanner-corner tr"></div>
                <div class="scanner-corner bl"></div>
                <div class="scanner-corner br"></div>
              </div>
            </div>

            <div class="add-product-row">
              <div class="producto-search-wrapper">
                <input
                  v-model="searchProducto"
                  type="text"
                  placeholder="Buscar producto..."
                  class="input-modern search-product-input"
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
              <input v-model.number="newDetalle.cantidad" type="number" min="1" placeholder="Cant" class="input-modern input-qty">
              <input v-model.number="newDetalle.precioUnitario" type="number" step="0.01" min="0" placeholder="$ Precio" class="input-modern input-price">
              <button class="btn-add-product" @click="addDetalle">+ Agregar</button>
            </div>

            <div v-if="pedidoForm.detalles.length > 0" class="detalle-list-modern">
              <div class="detalle-header-modern">
                <span>Producto</span>
                <span>Precio</span>
                <span>Cant</span>
                <span>Subtotal</span>
                <span></span>
              </div>
              <div v-for="(d, idx) in pedidoForm.detalles" :key="idx" class="detalle-row-modern">
                <div class="detalle-product-cell">
                  <span class="detalle-product-name">{{ d.nombreProducto }}</span>
                  <span v-if="d.codigoBarras" class="detalle-barcode">{{ d.codigoBarras }}</span>
                </div>
                <div class="detalle-price-cell">
                  <div class="price-comparison">
                    <span class="price-current">{{ formatoMoneda(d.precioCostoActual || 0) }}</span>
                    <input
                      v-model.number="d.precioUnitario"
                      type="number"
                      step="0.01"
                      min="0"
                      class="input-modern input-price-small"
                      :class="{ 'price-changed': d.precioUnitario !== d.precioCostoActual }"
                      @change="updateDetallePrecio(idx, d.precioUnitario)"
                    >
                  </div>
                </div>
                <input
                  v-model.number="d.cantidad"
                  type="number"
                  min="1"
                  class="input-modern input-qty-small"
                  @change="updateDetalleCantidad(idx, d.cantidad)"
                >
                <span class="detalle-subtotal-cell">{{ formatoMoneda(d.subtotal) }}</span>
                <button class="btn-remove-modern" @click="removeDetalle(idx)">✕</button>
              </div>
            </div>

            <div v-if="pedidoForm.detalles.length > 0" class="detalle-total-modern">
              <span>Total del Pedido</span>
              <strong class="total-amount">{{ formatoMoneda(pedidoForm.montoTotal) }}</strong>
            </div>
          </div>

          <div class="form-group-modern">
            <label>Notas del pedido</label>
            <textarea v-model="pedidoForm.notas" rows="2" placeholder="Observaciones..." class="input-modern textarea-modern"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" @click="showPedidoModal = false">Cancelar</button>
          <button class="btn-modal-save" @click="savePedido">{{ editingPedido ? 'Actualizar' : 'Crear Pedido' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.proveedores-container {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.proveedores-header h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  color: var(--text-primary);
  font-weight: 700;
}

/* Tabs */
.tab-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  background: var(--bg-secondary);
  padding: 0.35rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.2rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
  flex: 1;
  justify-content: center;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: var(--bg-panel);
}

.tab-btn.active {
  background: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-icon {
  font-size: 1.1rem;
}

.tab-count {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  background: var(--bg-panel);
  color: var(--text-secondary);
  font-weight: 700;
}

.badge-pending-pill {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

/* Tab Sugerido */
.tab-sugerido {
  min-height: 500px;
}

.tab-sugerido-hoy {
  min-height: 500px;
  height: 800px;
}

.tab-asignar {
  min-height: 500px;
  height: 600px;
}

/* Toolbar */
.content-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 400px;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  transition: border-color 0.2s;
}

.search-box:focus-within {
  border-color: var(--accent-color);
}

.search-icon {
  font-size: 1rem;
}

.search-input-modern {
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.9rem;
  width: 100%;
  outline: none;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.4rem;
  background: var(--accent-color);
  color: var(--bg-primary);
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.2rem;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-secondary:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.btn-secondary.active {
  background: var(--accent-color);
  color: var(--bg-primary);
  border-color: var(--accent-color);
}

.toolbar-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* Pedidos stats */
.pedidos-stats {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-pending { background: #ffc107; }
.dot-received { background: #28a745; }
.dot-cancelled { background: #dc3545; }

/* Empty state */
.empty-state-modern {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-color);
  border-radius: 16px;
  margin-bottom: 1.5rem;
}

.empty-state-modern.small {
  padding: 1.5rem;
  margin-bottom: 0;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.empty-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 1.5rem 0;
}

/* Proveedores compact list */
.proveedores-list-compact {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.proveedor-row-compact {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  transition: all 0.15s;
}

.proveedor-row-compact:hover {
  border-color: var(--accent-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.proveedor-row-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.proveedor-avatar-sm {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, black));
  color: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 800;
  flex-shrink: 0;
}

.proveedor-row-info {
  flex: 1;
  min-width: 0;
}

.proveedor-name {
  margin: 0 0 0.25rem 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.proveedor-quick-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.quick-info-item {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.proveedor-badges {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.35rem;
  flex-wrap: wrap;
  align-items: center;
}

.badge-tipo-prov {
  font-size: 0.65rem;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-preventa-prov {
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.badge-directa-prov {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.badge-dias-prov {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  font-weight: 600;
}

.badge-pedido-prov {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.25);
}

.badge-entrega-prov {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.proveedor-row-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.btn-icon-sm {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-panel);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s;
}

.btn-icon-sm:hover {
  transform: scale(1.05);
}

.btn-edit-sm:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-panel));
}

.btn-delete-sm:hover {
  border-color: var(--error-color);
  background: color-mix(in srgb, var(--error-color) 10%, var(--bg-panel));
}

.proveedor-row-details {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-line {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.notas-line {
  font-style: italic;
  opacity: 0.8;
}

.fechas-line {
  font-weight: 600;
  color: var(--accent-color);
}

/* Pedidos grid */
.pedidos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1rem;
}

.pedido-card-modern {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.2s;
}

.pedido-card-modern:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.pedido-card-historial {
  opacity: 0.7;
  background: var(--bg-panel);
}

.pedido-card-historial:hover {
  opacity: 1;
}

.pedido-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.pedido-supplier-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pedido-supplier-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--success-color), color-mix(in srgb, var(--success-color) 70%, black));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 800;
  flex-shrink: 0;
}

.pedido-supplier-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.pedido-date {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.estatus-badge-modern {
  padding: 0.25rem 0.7rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.badge-pending {
  background: rgba(255, 193, 7, 0.15);
  color: #ffc107;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.badge-received {
  background: rgba(40, 167, 69, 0.15);
  color: #28a745;
  border: 1px solid rgba(40, 167, 69, 0.3);
}

.badge-cancelled {
  background: rgba(220, 53, 69, 0.15);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.3);
}

.pedido-card-amounts {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-panel);
  border-radius: 10px;
}

.amount-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.2rem;
}

.amount-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.amount-value {
  font-size: 0.95rem;
  font-weight: 700;
  font-family: "Courier New", monospace;
}

.amount-total .amount-value { color: var(--text-primary); }
.amount-apartado .amount-value { color: var(--success-color); }
.amount-pendiente .amount-value { color: var(--error-color); }

.pedido-items-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.item-chip {
  padding: 0.25rem 0.6rem;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.item-chip strong {
  color: var(--text-primary);
}

.item-more {
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-panel));
  color: var(--accent-color);
  border-color: color-mix(in srgb, var(--accent-color) 20%, var(--border-color));
}

.pedido-manual-tag {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  background: color-mix(in srgb, var(--warning-color, #f39c12) 10%, var(--bg-panel));
  border: 1px solid color-mix(in srgb, var(--warning-color, #f39c12) 20%, var(--border-color));
  border-radius: 8px;
  font-size: 0.8rem;
  color: var(--warning-color, #f39c12);
  font-style: italic;
}

.manual-icon {
  font-size: 1rem;
  font-style: normal;
}

.pedido-card-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.btn-action-modern {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-panel);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.15s;
  text-align: center;
}

.btn-view:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-panel));
  color: var(--accent-color);
}

.btn-receive-modern:hover {
  border-color: var(--success-color);
  background: color-mix(in srgb, var(--success-color) 10%, var(--bg-panel));
  color: var(--success-color);
}

.btn-cancel-modern:hover {
  border-color: var(--error-color);
  background: color-mix(in srgb, var(--error-color) 10%, var(--bg-panel));
  color: var(--error-color);
}

/* Historial */
.historial-section-modern {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px dashed var(--border-color);
}

.historial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.historial-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-secondary);
}

.historial-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
  padding: 0.25rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 20px;
  border: 1px solid var(--border-color);
}

/* Provision */
.provision-summary-modern {
  margin-bottom: 1.5rem;
}

.summary-card-modern {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, black));
  border-radius: 14px;
  color: var(--bg-primary);
}

.summary-icon-modern {
  font-size: 2.5rem;
}

.summary-info-modern {
  display: flex;
  flex-direction: column;
}

.summary-label {
  font-size: 0.85rem;
  opacity: 0.9;
}

.summary-value {
  font-size: 1.8rem;
  font-weight: 800;
}

.provision-day-card-modern {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.day-header-modern {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-color);
}

.day-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: var(--accent-color);
}

.day-pedidos-count {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.day-total-modern {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
}

.day-pedidos-modern {
  padding: 0.75rem 1.25rem;
}

.pedido-mini-card-modern {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.pedido-mini-card-modern:last-child {
  border-bottom: none;
}

.mini-pedido-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.mini-pedido-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.mini-pedido-total {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.mini-pedido-pendiente {
  font-weight: 700;
  color: var(--error-color);
  font-family: "Courier New", monospace;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-card-modern {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  width: 100%;
  max-width: 550px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-card-modern.modal-xl {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--text-primary);
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.15s;
}

.modal-close:hover {
  background: var(--error-color);
  color: white;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

/* Forms */
.form-group-modern {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.form-group-modern.form-lg {
  flex: 1;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group-modern label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.input-modern {
  padding: 0.6rem 0.85rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.input-modern:focus {
  outline: none;
  border-color: var(--accent-color);
}

.select-modern {
  cursor: pointer;
}

.textarea-modern {
  resize: vertical;
  min-height: 60px;
}

.field-hint {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-style: italic;
  opacity: 0.8;
}

.dias-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.3rem;
}

.dia-check {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.5rem;
  background: var(--bg-panel, #252538);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary, #888);
  transition: all 0.15s;
  user-select: none;
}

.dia-check:hover {
  border-color: var(--accent-color, #c99234);
  color: var(--text-primary, #f6f2de);
}

.dia-check input[type="checkbox"] {
  display: none;
}

.dia-check:has(input:checked) {
  background: var(--accent-color, #c99234);
  border-color: var(--accent-color, #c99234);
  color: var(--bg-primary, #1a1a2e);
}

/* Section titles */
.section-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.section-hint {
  margin: 0 0 1rem 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Monto manual toggle */
.monto-manual-section {
  margin: 1rem 0;
  padding: 1rem;
  background: color-mix(in srgb, var(--warning-color, #f39c12) 8%, var(--bg-secondary));
  border: 1px solid color-mix(in srgb, var(--warning-color, #f39c12) 20%, var(--border-color));
  border-radius: 12px;
}

.monto-toggle {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--warning-color, #f39c12);
}

.monto-toggle input {
  display: none;
}

.toggle-track {
  width: 40px;
  height: 22px;
  background: var(--border-color);
  border-radius: 11px;
  position: relative;
  transition: background 0.2s;
}

.monto-toggle input:checked + .toggle-track {
  background: var(--warning-color, #f39c12);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.monto-toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(18px);
}

.monto-input-wrapper {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.currency-symbol {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--warning-color, #f39c12);
}

.monto-input-big {
  flex: 1;
  max-width: 200px;
  padding: 0.6rem 0.85rem;
  border: 2px solid var(--warning-color, #f39c12);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--warning-color, #f39c12);
  font-size: 1.3rem;
  font-weight: 700;
  font-family: "Courier New", monospace;
}

.monto-input-big:focus {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--warning-color, #f39c12) 25%, transparent);
}

/* Detalle section */
.detalle-section-modern {
  margin: 1.5rem 0;
  padding: 1.25rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.barcode-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.barcode-input-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 0.5rem;
  padding: 0 0.85rem;
  border: 2px solid var(--accent-color);
  border-radius: 8px;
  background: var(--bg-primary);
}

.barcode-icon {
  font-size: 1.1rem;
}

.barcode-input {
  border: none;
  background: transparent;
  flex: 1;
}

.barcode-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.btn-scanner {
  padding: 0.6rem 1rem;
  border: 2px solid var(--accent-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--accent-color);
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-scanner:hover {
  background: var(--accent-color);
  color: white;
}

.btn-scanner.active {
  background: var(--error-color);
  border-color: var(--error-color);
  color: white;
}

.scanner-viewport {
  position: relative;
  width: 100%;
  height: 180px;
  margin-bottom: 0.75rem;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
}

.scanner-viewport #scanner-interactive-pedido {
  width: 100%;
  height: 100%;
}

.scanner-viewport #scanner-interactive-pedido video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scanner-overlay {
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

.add-product-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.producto-search-wrapper {
  flex: 1;
  min-width: 150px;
  position: relative;
}

.search-product-input {
  width: 100%;
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
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 100;
  margin-top: 4px;
}

.producto-dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.85rem;
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

.input-qty {
  width: 70px;
  text-align: center;
}

.input-price {
  width: 110px;
}

.btn-add-product {
  padding: 0.6rem 1.2rem;
  background: var(--success-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-add-product:hover {
  filter: brightness(1.1);
}

/* Detalle list */
.detalle-list-modern {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.detalle-header-modern {
  display: grid;
  grid-template-columns: 2fr 1.2fr 0.6fr 0.8fr 0.3fr;
  gap: 0.5rem;
  padding: 0.6rem 0.85rem;
  background: var(--bg-panel);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid var(--border-color);
}

.detalle-row-modern {
  display: grid;
  grid-template-columns: 2fr 1.2fr 0.6fr 0.8fr 0.3fr;
  gap: 0.5rem;
  align-items: center;
  padding: 0.6rem 0.85rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.85rem;
  transition: background 0.15s;
}

.detalle-row-modern:last-child {
  border-bottom: none;
}

.detalle-row-modern:hover {
  background: var(--bg-panel);
}

.detalle-product-cell {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.detalle-product-name {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detalle-barcode {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: monospace;
}

.detalle-price-cell {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.price-comparison {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.price-current {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.input-price-small {
  width: 100%;
  max-width: 90px;
  padding: 0.3rem 0.4rem;
  text-align: center;
  font-size: 0.85rem;
}

.input-price-small.price-changed {
  border-color: var(--warning-color, #f39c12);
  background: rgba(243, 156, 18, 0.1);
}

.input-qty-small {
  width: 100%;
  max-width: 55px;
  padding: 0.3rem;
  text-align: center;
  font-size: 0.85rem;
}

.detalle-subtotal-cell {
  font-weight: 700;
  color: var(--accent-color);
  text-align: right;
  font-family: "Courier New", monospace;
}

.btn-remove-modern {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--error-color);
  border-radius: 6px;
  background: transparent;
  color: var(--error-color);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.15s;
}

.btn-remove-modern:hover {
  background: var(--error-color);
  color: white;
}

.detalle-total-modern {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 0 0 0;
  margin-top: 0.75rem;
  border-top: 2px solid var(--accent-color);
  font-size: 1rem;
  color: var(--text-primary);
}

.total-amount {
  font-size: 1.3rem;
  color: var(--accent-color);
  font-family: "Courier New", monospace;
}

/* Modal buttons */
.btn-modal-cancel {
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.15s;
}

.btn-modal-cancel:hover {
  background: var(--bg-panel);
}

.btn-modal-save {
  padding: 0.6rem 1.5rem;
  background: var(--accent-color);
  color: var(--bg-primary);
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-modal-save:hover {
  filter: brightness(1.1);
}

/* Responsive */
@media (max-width: 768px) {
  .proveedores-container {
    padding: 1rem;
  }

  .proveedores-header h2 {
    font-size: 1.3rem;
  }

  .tab-bar {
    gap: 0.25rem;
    padding: 0.25rem;
  }

  .tab-btn {
    padding: 0.5rem 0.6rem;
    font-size: 0.8rem;
  }

  .tab-label {
    display: none;
  }

  .tab-icon {
    font-size: 1.2rem;
  }

  .content-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }

  .pedidos-stats {
    justify-content: center;
  }

  .toolbar-actions {
    flex-direction: column;
  }

  .toolbar-actions button {
    width: 100%;
    justify-content: center;
  }

  .proveedor-quick-info {
    flex-direction: column;
    gap: 0.25rem;
  }

  .proveedores-list-compact {
    gap: 0.4rem;
  }

  .proveedor-row-compact {
    padding: 0.65rem 0.75rem;
  }

  .pedidos-grid {
    grid-template-columns: 1fr;
  }

  .pedido-card-amounts {
    grid-template-columns: 1fr 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .add-product-row {
    flex-direction: column;
  }

  .input-qty, .input-price {
    width: 100%;
  }

  .btn-add-product {
    width: 100%;
  }

  .barcode-row {
    flex-direction: column;
  }

  .btn-scanner {
    width: 100%;
    justify-content: center;
  }

  .detalle-row-modern {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .detalle-header-modern {
    display: none;
  }

  .detalle-product-cell::before { content: 'Producto: '; color: var(--text-secondary); font-weight: 600; }
  .detalle-price-cell::before { content: 'Precio: '; color: var(--text-secondary); font-weight: 600; }
  .input-qty-small::before { content: 'Cantidad: '; }
  .detalle-subtotal-cell::before { content: 'Subtotal: '; color: var(--text-secondary); font-weight: 600; }

  .modal-card-modern {
    max-height: 95vh;
  }

  .modal-card-modern.modal-xl {
    max-width: 100%;
  }

  .modal-footer {
    flex-direction: column;
  }

  .modal-footer button {
    width: 100%;
  }

  .summary-card-modern {
    padding: 1rem;
  }

  .summary-icon-modern {
    font-size: 2rem;
  }

  .summary-value {
    font-size: 1.4rem;
  }

  .monto-input-big {
    max-width: none;
  }
}

@media (max-width: 400px) {
  .proveedores-container {
    padding: 0.75rem;
  }

  .proveedores-header h2 {
    font-size: 1.1rem;
  }

  .pedido-card-amounts {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .amount-item {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>
