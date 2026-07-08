import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useTheme } from '../../../composables/useTheme';
import Quagga from '@ericblade/quagga2';

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
const vistaTarjetas = ref(false);

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

export function useProveedores() {
  const { currentTheme } = useTheme();

  onMounted(() => {
    window.addEventListener('keydown', handleScannerKey);
  });

  onMounted(loadAll);

  onUnmounted(() => {
    window.removeEventListener('keydown', handleScannerKey);
    stopScanner();
  });

  return {
    currentTheme,
    proveedores,
    pedidos,
    provisionSemanal,
    productosDisponibles,
    categorias,
    activeTab,
    showProveedorModal,
    editingProveedor,
    proveedorForm,
    showPedidoModal,
    editingPedido,
    pedidoForm,
    newDetalle,
    barcodeInput,
    searchProducto,
    showProductoDropdown,
    scannerActivo,
    montoManual,
    searchProveedor,
    showHistorial,
    vistaTarjetas,
    filteredProveedores,
    filteredPedidos,
    historialPedidos,
    filteredProductosPedido,
    totalPendienteSemana,
    totalPendientes,
    totalRecibidos,
    totalCancelados,
    formatoMoneda,
    formatDate,
    formatDateTime,
    diasParaEntrega,
    loadAll,
    openProveedorModal,
    saveProveedor,
    toggleDia,
    toggleDiaPedido,
    deleteProveedor,
    openPedidoModal,
    addDetalle,
    removeDetalle,
    recalcTotal,
    updateDetallePrecio,
    updateDetalleCantidad,
    selectProductoForDetalle,
    handleSearchProductoFocus,
    handleSearchProductoBlur,
    handleScannerKey,
    procesarEscaneoPedido,
    startScanner,
    stopScanner,
    savePedido,
    deletePedido,
    recibirPedido,
    handleEstatusChange,
    estatusBadge,
    getProveedorNombre,
    getProveedorInfo
  };
}