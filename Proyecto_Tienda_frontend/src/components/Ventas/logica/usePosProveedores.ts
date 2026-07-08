import { ref, computed } from 'vue';
import type { ApiRespuesta } from './usePosTipos';
import { getJson } from './usePosTicket';

const modalProveedoresPedidos = ref(false);
const ppVistaListaProv = ref(true);
const ppVistaListaPed = ref(true);
const proveedores = ref<any[]>([]);
const pedidosProveedor = ref<any[]>([]);
const proveedorForm = ref<any>({ nombre: '', contacto: '', telefono: '', email: '', direccion: '', notas: '' });
const pedidoForm = ref<any>({ idProveedor: 0, fechaEntregaEsperada: '', montoTotal: 0, montoApartado: 0, estatus: 'PENDIENTE', notas: '', detalles: [] });
const editingProveedor = ref<any>(null);
const editingPedido = ref<any>(null);
const pedidoProveedorTab = ref<'proveedores' | 'pedidos' | 'sugerido' | 'sugeridoHoy'>('proveedores');
const sugerenciasPedido = ref<any[]>([]);
const sugerenciasSeleccionadas = ref<Set<number>>(new Set());
const sugerenciasPeriodo = ref<'semanal' | 'mensual'>('mensual');
const sugerenciasCargando = ref(false);
const showProveedorForm = ref(false);
const showPedidoForm = ref(false);
const montoManual = ref(false);
const searchProductoPedido = ref('');
const showProductoDropdownPedido = ref(false);
const newDetallePedido = ref<{ idProducto: number; nombre: string; cantidad: number; precioUnitario: number }>({ idProducto: 0, nombre: '', cantidad: 1, precioUnitario: 0 });
const productosDisponibles = ref<{ idProducto: number; nombre: string; precio_costo: number; codigoBarras?: string }[]>([]);
const searchWrapperRef = ref<HTMLElement | null>(null);

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

async function cargarProveedoresPedidos() {
  try {
    const resProv = await fetch(`${API_BASE}/proveedores/listar`);
    const dataProv = await resProv.json();
    proveedores.value = dataProv.datos ?? dataProv;
  } catch (e) { console.error('Error proveedores:', e); }
  try {
    const resPed = await fetch(`${API_BASE}/pedidos-proveedor/listar`);
    const dataPed = await resPed.json();
    pedidosProveedor.value = (dataPed.datos ?? dataPed).filter((p: any) => p.estatus === 'PENDIENTE');
  } catch (e) { console.error('Error pedidos:', e); }
  try {
    const resProd = await fetch(`${API_BASE}/productos/listarProductos`);
    const dataProd = await resProd.json();
    productosDisponibles.value = (dataProd.datos ?? dataProd).map((p: any) => ({
      idProducto: p.idProducto, nombre: p.nombre, precio_costo: p.precio_costo || 0, codigoBarras: p.codigoBarras
    }));
  } catch (e) { console.error('Error productos:', e); }
}

function abrirModalProveedoresPedidos() {
  modalProveedoresPedidos.value = true;
  cargarProveedoresPedidos();
}

function openProveedorModal(p?: any) {
  if (p) { editingProveedor.value = p; proveedorForm.value = { ...p }; }
  else { editingProveedor.value = null; proveedorForm.value = { nombre: '', contacto: '', telefono: '', email: '', direccion: '', notas: '' }; }
  showProveedorForm.value = true;
}

async function saveProveedor() {
  if (!proveedorForm.value.nombre.trim()) return;
  try {
    if (editingProveedor.value?.idProveedor) {
      await fetch(`${API_BASE}/proveedores/actualizar/${editingProveedor.value.idProveedor}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proveedorForm.value) });
    } else {
      await fetch(`${API_BASE}/proveedores/agregar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proveedorForm.value) });
    }
    showProveedorForm.value = false;
    await cargarProveedoresPedidos();
  } catch (e) { console.error('Error saving proveedor:', e); }
}

async function deleteProveedor(id: number) {
  if (!confirm('¿Eliminar este proveedor?')) return;
  try { await fetch(`${API_BASE}/proveedores/eliminar/${id}`, { method: 'DELETE' }); await cargarProveedoresPedidos(); }
  catch (e) { console.error('Error deleting proveedor:', e); }
}

function openPedidoModal(p?: any) {
  if (p) {
    editingPedido.value = p; pedidoForm.value = { ...p, detalles: p.detalles || [] };
    montoManual.value = p.detalles?.length === 0 && p.montoTotal > 0;
  } else {
    editingPedido.value = null;
    pedidoForm.value = { idProveedor: 0, fechaEntregaEsperada: '', montoTotal: 0, montoApartado: 0, estatus: 'PENDIENTE', notas: '', detalles: [] };
    montoManual.value = false;
  }
  searchProductoPedido.value = '';
  newDetallePedido.value = { idProducto: 0, nombre: '', cantidad: 1, precioUnitario: 0 };
  showPedidoForm.value = true;
}

function addDetallePedido() {
  if (!newDetallePedido.value.idProducto || !newDetallePedido.value.cantidad || !newDetallePedido.value.precioUnitario) return;
  pedidoForm.value.detalles.push({
    idProducto: newDetallePedido.value.idProducto, nombreProducto: newDetallePedido.value.nombre,
    cantidad: newDetallePedido.value.cantidad, precioUnitario: newDetallePedido.value.precioUnitario,
    subtotal: newDetallePedido.value.cantidad * newDetallePedido.value.precioUnitario
  });
  recalcTotalPedido();
  newDetallePedido.value = { idProducto: 0, nombre: '', cantidad: 1, precioUnitario: 0 };
  searchProductoPedido.value = '';
  showProductoDropdownPedido.value = false;
}

function removeDetallePedido(idx: number) { pedidoForm.value.detalles.splice(idx, 1); recalcTotalPedido(); }

function recalcTotalPedido() {
  if (!montoManual.value) pedidoForm.value.montoTotal = pedidoForm.value.detalles.reduce((sum: number, d: any) => sum + d.subtotal, 0);
}

function selectProductoForPedido(prod: { idProducto: number; nombre: string; precio_costo: number }) {
  newDetallePedido.value.idProducto = prod.idProducto;
  newDetallePedido.value.nombre = prod.nombre;
  newDetallePedido.value.precioUnitario = prod.precio_costo;
  searchProductoPedido.value = prod.nombre;
  showProductoDropdownPedido.value = false;
}

const filteredProductosPedido = computed(() => {
  if (!searchProductoPedido.value) return productosDisponibles.value;
  const q = searchProductoPedido.value.toLowerCase();
  return productosDisponibles.value.filter(p => p.nombre.toLowerCase().includes(q) || p.codigoBarras?.toLowerCase().includes(q)).slice(0, 10);
});

async function savePedido() {
  if (!pedidoForm.value.idProveedor || !pedidoForm.value.fechaEntregaEsperada) return;
  if (montoManual.value && (!pedidoForm.value.montoTotal || pedidoForm.value.montoTotal <= 0)) return;
  try {
    if (editingPedido.value?.idPedido) {
      await fetch(`${API_BASE}/pedidos-proveedor/actualizar/${editingPedido.value.idPedido}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedidoForm.value) });
    } else {
      await fetch(`${API_BASE}/pedidos-proveedor/crear`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedidoForm.value) });
    }
    showPedidoForm.value = false;
    await cargarProveedoresPedidos();
  } catch (e) { console.error('Error saving pedido:', e); }
}

async function recibirPedido(id: number) {
  if (!confirm('¿Confirmar recepción?')) return;
  try { await fetch(`${API_BASE}/pedidos-proveedor/recibir/${id}`, { method: 'PUT' }); await cargarProveedoresPedidos(); }
  catch (e) { console.error('Error receiving pedido:', e); }
}

async function deletePedido(id: number) {
  if (!confirm('¿Cancelar este pedido?')) return;
  try { await fetch(`${API_BASE}/pedidos-proveedor/eliminar/${id}`, { method: 'DELETE' }); await cargarProveedoresPedidos(); }
  catch (e) { console.error('Error deleting pedido:', e); }
}

function handleClickOutsideDropdown(e: MouseEvent) {
  if (searchWrapperRef.value && !searchWrapperRef.value.contains(e.target as Node)) showProductoDropdownPedido.value = false;
}

export {
  modalProveedoresPedidos, ppVistaListaProv, ppVistaListaPed,
  proveedores, pedidosProveedor, proveedorForm, pedidoForm,
  editingProveedor, editingPedido, pedidoProveedorTab,
  sugerenciasPedido, sugerenciasSeleccionadas, sugerenciasPeriodo,
  sugerenciasCargando, showProveedorForm, showPedidoForm,
  montoManual, searchProductoPedido, showProductoDropdownPedido,
  newDetallePedido, productosDisponibles, filteredProductosPedido,
  searchWrapperRef,
  cargarProveedoresPedidos, abrirModalProveedoresPedidos,
  openProveedorModal, saveProveedor, deleteProveedor,
  openPedidoModal, addDetallePedido, removeDetallePedido,
  recalcTotalPedido, selectProductoForPedido, savePedido,
  recibirPedido, deletePedido, handleClickOutsideDropdown
};
