<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import {
  tickets, ticketActualId, ticketActual, ticket, creandoTicket, ticketDelDia,
  totalVenta, ticketInfoText, nombreUsuario, mensaje, mensajeTipo,
  obtenerIniciales, getJson, mostrarMensaje,
  cargarSiguienteTicket, crearNuevoTicket, cargarTicketsDesdeBackend,
  seleccionarTicket, eliminarTicket, aumentarCantidad, disminuirCantidad,
  quitarItem, limpiarTicket, getFechaHoy
} from './logica/usePosTicket';

import {
  terminoBusqueda, categoriaFiltro, productos, categorias,
  sugerenciasVisibles, indiceSugerenciaActiva,
  provisionSemanalTotal, provisionStatusClass,
  esCategoriaGaming, cargarProductos, cargarCategorias,
  productosParaMostrar, sugerenciasPorNombre, productosAccesoRapido,
  buscarProductoPorCodigoBarras, manejarFocusBusqueda,
  manejarInputBusqueda, ocultarSugerencias, manejarTeclasSugerencias,
  agregarDesdeBuscador, seleccionarSugerencia, agregarProductoATicket,
  toggleMayoreo, toggleEnvase, cargarProvisionSemanal
} from './logica/usePosProductos';

import {
  modalGramajeAbierto, modalProductoGramaje,
  gramajeEditandoDesdeHistorial, gramajeEditandoIndice,
  gramajeEditandoCantidad, gramajeEditandoPrecio,
  editarGramajeItem, agregarProductoGramaje
} from './logica/usePosGramaje';

import {
  modalCobroAbierto, modalCreditosAbierto, modalCreditosSeleccionar,
  totalPersonasCredito, modalEntradaAbierto, modalSalidaAbierto,
  modalHistorialAbierto, modalDetalleVentaAbierto,
  modalDescripcionPendiente, descripcionPendienteTexto,
  modalVentasPendientesAbierto, ventasPendientes, ventaPendienteSeleccionada,
  modalCobroPendienteAbierto, modalAgregarPendienteAbierto,
  agregarPendienteBusqueda, agregarPendienteInput, agregarPendienteScannerActivo,
  agregarPendienteProductos, historialCargando, historialCobroTotal,
  historialGananciaTotal, historialVentas, historialUsuariosUnicos,
  historialVentaDetalle, historialVentaSeleccionada, detalleCreditoInfo,
  detalleAbonos, historialVentaTieneDiscrepancia, historialDiscrepanciaMonto,
  cobrar, confirmarCobroEfectivo, confirmarCobroTransferencia,
  confirmarCobroTarjeta, confirmarCobroPendiente, confirmarCobroCredito,
  onPersonaCreditoSeleccionada,
  confirmarCobroPendienteEfectivo, confirmarCobroPendienteTransferencia,
  confirmarCobroPendienteTarjeta, confirmarCobroPendienteCredito,
  cargarCreditosResumen, cargarVentasPendientes as cargarVentasPendientesFn,
  abrirModalPendientes, cobrarVentaPendiente, guardarVentaPendiente,
  editarDescripcionPendiente, guardarEdicionDescripcion,
  eliminarVentaPendiente, agregarAVentaPendiente, agregarProductoAPendiente,
  quitarProductoPendiente, confirmarAgregarPendiente, eliminarProductoPendiente,
  cargarHistorialVentasDia, verDetalleVenta, cancelarVentaDesdeHistorial,
  historialVentasAbrir, onVentasCorregidas,
  registrarEntradaEfectivo, registrarSalidaEfectivo,
  entradaEfectivo, salidaEfectivo
} from './logica/usePosCobro';

import {
  promocionesActivas, agregarPromocionAlTicket, cargarPromocionesActivas
} from './logica/usePosPromociones';

import {
  scannerActivo, startScanner, stopScanner
} from './logica/usePosScanner';

import {
  modalProveedoresPedidos, ppVistaListaProv, ppVistaListaPed,
  proveedores, pedidosProveedor, proveedorForm, pedidoForm,
  editingProveedor, editingPedido, pedidoProveedorTab,
  showProveedorForm, showPedidoForm, montoManual,
  searchProductoPedido, showProductoDropdownPedido,
  newDetallePedido, productosDisponibles, filteredProductosPedido,
  searchWrapperRef,
  abrirModalProveedoresPedidos, cargarProveedoresPedidos, openProveedorModal, saveProveedor,
  deleteProveedor, openPedidoModal, addDetallePedido,
  removeDetallePedido, selectProductoForPedido, savePedido,
  recibirPedido, deletePedido, handleClickOutsideDropdown
} from './logica/usePosProveedores';

import {
  modoEdicionDetalle, montoTotalEditado, detalleEditandoIndex,
  cantidadTemporal, precioTemporal, totalManualEditado, montoTotalInput,
  busquedaEditar, resultadosEditar, cargandoBusquedaEditar,
  iniciarEdicionDetalle, iniciarEditarItem, confirmarEdicionItem,
  cancelarEdicionItem, onTotalManualChange, guardarCambiosDetalle,
  cancelarEdicionDetalle, buscarProductoEditar, agregarProductoADetalle,
  eliminarDetalleVenta, eliminarTodosLosDetalles, cerrarDetalleVenta
} from './logica/usePosEdicionDetalle';

import PosSidebar from './secciones/PosSidebar.vue';
import PosCatalogo from './secciones/PosCatalogo.vue';
import PosPanelTicket from './secciones/PosPanelTicket.vue';

import EntradaEfectivoModal from '../modals/EntradaEfectivoModal.vue';
import SalidaEfectivoModal from '../modals/SalidaEfectivoModal.vue';
import CalculadoraGramajeModal from '../modals/CalculadoraGramajeModal.vue';
import CobroModal from './modales/CobroModal.vue';
import CreditosPersonasModal from './modales/CreditosPersonasModal.vue';
import HistorialVentasModal from './modales/HistorialVentasModal.vue';
import CrudPromociones from './modales/CrudPromociones.vue';
import PosDetalleVentaModal from './modales/PosDetalleVentaModal.vue';
import PosDescripcionPendienteModal from './modales/PosDescripcionPendienteModal.vue';
import PosVentasPendientesModal from './modales/PosVentasPendientesModal.vue';
import PosAgregarPendienteModal from './modales/PosAgregarPendienteModal.vue';
import PosProveedoresPedidosModal from './modales/PosProveedoresPedidosModal.vue';
import PosToastNotification from './modales/PosToastNotification.vue';
import PosScannerOverlay from './modales/PosScannerOverlay.vue';
import OllamaModelManager from './modales/OllamaModelManager.vue';
import VoiceStockConfirmModal from './modales/VoiceStockConfirmModal.vue';
import VoiceOpcionesVentaModal from './modales/VoiceOpcionesVentaModal.vue';


// --- Orchestration state ---
const isRecording = ref(false);
const ticketVisibleMobile = ref(false);
const isKeyboardVisible = ref(false);
watch(isKeyboardVisible, (v) => { if (v) ticketVisibleMobile.value = false; });
const modalPromocionesAbierto = ref(false);
const modalModelosIaAbierto = ref(false);
const modalStockVozAbierto = ref(false);
const stockData = ref<any>(null);
const modalOpcionesVozAbierto = ref(false);
const voiceOpcionesVenta = ref<any>(null);
const vpVistaLista = ref(true);

const recognition = ref<any>(null);

let isResizing = false;
let startY = 0;
let startHeight = 0;

let scannerBuffer = '';
let scannerTimer: ReturnType<typeof setTimeout> | null = null;
let lastScannerKeyTime = 0;

// --- Composites ---
const productosFiltradosBusqueda = computed(() => {
  if (!agregarPendienteBusqueda.value) return [];
  const q = agregarPendienteBusqueda.value.toLowerCase();
  return productos.value.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    (p.codigo_barras || '').toLowerCase().includes(q)
  ).slice(0, 10);
});

const agregarPendienteGramajeActivo = ref(false);

const ventasPendientesAgrupadas = computed(() => {
  return ventasPendientes.value.map((v: any) => {
    if (!v.detalles || v.detalles.length === 0) return v;
    const grouped: Record<string, any> = {};
    for (const d of v.detalles) {
      const key = `${d.productoNombre}_${d.precioUnitarioVenta}_${d.isGramaje}`;
      if (grouped[key]) {
        grouped[key].cantidad += d.cantidad || 1;
        grouped[key].subtotal = Number(grouped[key].cantidad) * Number(d.precioUnitarioVenta || 0);
        if (d.idVentaDetalle != null) grouped[key].idsVentaDetalle.push(d.idVentaDetalle);
      } else {
        grouped[key] = { ...d, cantidad: d.cantidad || 1, subtotal: Number(d.cantidad || 1) * Number(d.precioUnitarioVenta || 0), idsVentaDetalle: d.idVentaDetalle != null ? [d.idVentaDetalle] : [] };
      }
    }
    return { ...v, detallesAgrupados: Object.values(grouped) };
  });
});

const esAdmin = computed(() => Number(localStorage.getItem('tipoUsuario') || 2) === 1);

const historialEnvases = computed(() => {
  return historialVentaDetalle.value.filter((d: any) => {
    const cobroEnvaseTotal = Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0);
    return cobroEnvaseTotal > 0;
  });
});

const historialEnvaseTotal = computed(() => {
  return historialEnvases.value.reduce((sum: number, d: any) => {
    return sum + Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0);
  }, 0);
});

// --- Resize handlers ---
function startResize(e: MouseEvent | TouchEvent) {
  isResizing = true;
  startY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
  const container = document.querySelector('.pos-right');
  if (container) startHeight = parseFloat(getComputedStyle(container).height);
  document.documentElement.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
}

function doResize(e: MouseEvent | TouchEvent) {
  if (!isResizing) return;
  const currentY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
  let newHeight = startHeight - (currentY - startY);
  const maxHeight = window.innerHeight * 0.9;
  const minHeight = 200;
  if (newHeight > maxHeight) newHeight = maxHeight;
  if (newHeight < minHeight) newHeight = minHeight;
  const container = document.querySelector('.pos-right');
  if (container) (container as HTMLElement).style.height = newHeight + 'px';
  e.preventDefault();
}

function stopResize() {
  isResizing = false;
  document.documentElement.style.cursor = '';
  document.body.style.userSelect = '';
}

// --- Keyboard / Scanner ---
function manejarAtajosTeclado(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (modalDetalleVentaAbierto.value) { cerrarDetalleVenta(); return; }
    if (modalCobroPendienteAbierto.value) { modalCobroPendienteAbierto.value = false; ventaPendienteSeleccionada.value = null; return; }
    if (modalVentasPendientesAbierto.value) { modalVentasPendientesAbierto.value = false; return; }
    if (modalDescripcionPendiente.value) { modalDescripcionPendiente.value = false; return; }
    if (modalCobroAbierto.value) { modalCobroAbierto.value = false; return; }
    if (modalGramajeAbierto.value) { modalGramajeAbierto.value = false; modalProductoGramaje.value = null; gramajeEditandoDesdeHistorial.value = false; gramajeEditandoIndice.value = null; agregarPendienteGramajeActivo.value = false; return; }
    if (modalHistorialAbierto.value) { modalHistorialAbierto.value = false; return; }
    if (modalSalidaAbierto.value) { modalSalidaAbierto.value = false; return; }
    if (modalEntradaAbierto.value) { modalEntradaAbierto.value = false; return; }
    if (modalPromocionesAbierto.value) { modalPromocionesAbierto.value = false; return; }
    if (scannerActivo.value) { stopScanner(); return; }
  }
  if (e.key === 'F12') { e.preventDefault(); if (ticket.value.length > 0 && !modalCobroAbierto.value) cobrar(); }
  const target = e.target as HTMLElement;
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
  if (e.key === 'Enter' && !isInput && scannerBuffer.length > 0) {
    e.preventDefault(); procesarEscaneo(scannerBuffer); scannerBuffer = ''; return;
  }
  if (!isInput && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const now = Date.now();
    const timeDiff = now - lastScannerKeyTime;
    if (lastScannerKeyTime > 0 && timeDiff > 100) scannerBuffer = '';
    scannerBuffer += e.key;
    lastScannerKeyTime = now;
    if (scannerTimer) clearTimeout(scannerTimer);
    scannerTimer = setTimeout(() => {
      if (scannerBuffer.length > 0) { procesarEscaneo(scannerBuffer); scannerBuffer = ''; }
    }, 300);
  }
}

async function procesarEscaneo(codigo: string) {
  const codigoLimpio = codigo.trim();
  if (!codigoLimpio) return;
  const producto = await buscarProductoPorCodigoBarras(codigoLimpio);
  if (producto) {
    const stockDisponible = producto.dto?.stock ?? Infinity;
    if (stockDisponible <= 0) { mostrarMensaje(`Producto ${producto.nombre} sin stock`, 'error'); return; }
    await agregarProductoATicket(producto);
    mostrarMensaje(`Agregado: ${producto.nombre}`, 'ok');
  } else {
    mostrarMensaje(`Producto no encontrado: ${codigoLimpio}`, 'error');
  }
}

// --- Voice ---
async function startVoiceCommand() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) { mostrarMensaje('Reconocimiento de voz no soportado', 'error'); return; }
  if (isRecording.value) { isRecording.value = false; recognition.value?.stop(); return; }
  isRecording.value = true;
  reconocerVoz();
}

async function reconocerVoz() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
  } catch { }
  recognition.value = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)();
  recognition.value.lang = 'es-MX';
  recognition.value.interimResults = false;
  recognition.value.onresult = async (event: any) => {
    if (modalOpcionesVozAbierto.value || modalStockVozAbierto.value) {
      recognition.value?.stop();
      isRecording.value = false;
      return;
    }
    const transcriptRaw = event.results[0][0].transcript.toLowerCase().trim();
    mostrarMensaje(`Procesando: "${transcriptRaw}"...`, 'ok');

    const stockKeywords = /\b(stock|inventario|existencia|actualiza)\b/i;
    if (stockKeywords.test(transcriptRaw)) {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);
        const resp = await fetch(`${API_BASE}/voice/stock/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: transcriptRaw }),
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (resp.ok) {
          const data = await resp.json();
          if (data.accion && data.accion !== 'ERROR') {
            stockData.value = data;
            modalStockVozAbierto.value = true;
            recognition.value?.stop();
            isRecording.value = false;
            return;
          }
        }
        mostrarMensaje('No se pudo interpretar el comando de stock', 'error');
      } catch {
        mostrarMensaje('Error al procesar comando de stock', 'error');
      }
      isRecording.value = false;
      return;
    }

    try {
      const { buscarProducto, agregarProductoATicket } = await import('./logica/usePosProductos');
      const { agregarProductoGramaje } = await import('./logica/usePosGramaje');
      const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const resp = await fetch(`${API_BASE}/voice/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptRaw }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (resp.ok) {
        const data = await resp.json();
        if (data.opciones && data.opciones.length > 1) {
          voiceOpcionesVenta.value = data;
          modalOpcionesVozAbierto.value = true;
          recognition.value?.stop();
          isRecording.value = false;
          return;
        }
        if (data.productoId && data.confianza >= 0.5) {
          const producto = productos.value.find((p: any) => p.id === data.productoId);
          if (producto) {
            await agregarPorIA(producto, data);
            recognition.value?.stop();
            isRecording.value = false;
            return;
          }
        }
      }
    } catch { }
    await fallbackVoiceCommand(transcriptRaw);
    isRecording.value = false;
  };
  recognition.value.onerror = () => { isRecording.value = false; mostrarMensaje('Error en reconocimiento de voz', 'error'); };
  recognition.value.onend = () => { isRecording.value = false; };
  recognition.value.start();
}

async function agregarOpcionVoz(opcion: any) {
  const data = voiceOpcionesVenta.value;
  const producto = productos.value.find((p: any) => p.id === opcion.productoId);
  if (producto && data) {
    await agregarPorIA(producto, data);
  }
  modalOpcionesVozAbierto.value = false;
  voiceOpcionesVenta.value = null;
}

async function agregarPorIA(producto: any, data: any) {
  const { agregarProductoGramaje } = await import('./logica/usePosGramaje');
  const { agregarProductoATicket } = await import('./logica/usePosProductos');
  if (data.tipo === 'PRECIO' && producto.is_gramaje && data.monto > 0) {
    const gramos = Math.round((data.monto / (producto.precio || Number(producto.dto?.precio_venta || 1))) * 1000);
    await agregarProductoGramaje({ gramos, precioTotal: data.monto });
    mostrarMensaje(`Agregado ${gramos}g de ${producto.nombre} por ${formatoMoneda(data.monto)}`, 'ok');
  } else if (data.tipo === 'PESO' && producto.is_gramaje && data.monto > 0) {
    const precioTotal = Math.round((data.monto / 1000) * (producto.precio || Number(producto.dto?.precio_venta || 1)) * 100) / 100;
    await agregarProductoGramaje({ gramos: data.monto, precioTotal });
    mostrarMensaje(`Agregado ${data.monto}g de ${producto.nombre} por ${formatoMoneda(precioTotal)}`, 'ok');
  } else if (data.tipo === 'UNIDAD' && data.monto > 1) {
    for (let i = 0; i < Math.min(data.monto, 50); i++) {
      await agregarProductoATicket(producto);
    }
    mostrarMensaje(`Agregado ${data.monto}x ${producto.nombre}`, 'ok');
  } else {
    await agregarProductoATicket(producto);
    mostrarMensaje(`Agregado: ${producto.nombre}`, 'ok');
  }
}

async function fallbackVoiceCommand(transcriptRaw: string) {
  let transcript = transcriptRaw.toLowerCase().trim();
  const articulos = /\b(un|una|unos|unas|el|la|los|las|del|de|y|o|a|con|en|por|para|se)\b/g;
  transcript = transcript.replace(articulos, '').replace(/\s+/g, ' ').trim();
  let monto = 0;
  let nombreProducto = transcript;
  const precioMatch = transcript.match(/(?:\$?\s*(\d+(?:\.\d+)?)\s*(?:\$|pesos|dolares|peso|dolar|)|(\d+(?:\.\d+)?)\s*(?:\$|pesos|dolares|peso|dolar))\s*(?:de)?\s*/i);
  if (precioMatch) {
    monto = parseFloat(precioMatch[1] || precioMatch[2] || '0');
    nombreProducto = transcript.replace(precioMatch[0], '').trim();
  }
  if (nombreProducto.includes('buscar')) {
    const q = nombreProducto.replace('buscar', '').trim();
    if (q) { terminoBusqueda.value = q; }
  } else if (nombreProducto) {
    const { buscarProducto, agregarProductoATicket } = await import('./logica/usePosProductos');
    const producto = await buscarProducto(nombreProducto);
    if (producto) {
      if (producto.is_gramaje && monto > 0) {
        const gramos = Math.round((monto / (producto.precio || Number(producto.dto?.precio_venta || 1))) * 1000);
        const { agregarProductoGramaje } = await import('./logica/usePosGramaje');
        await agregarProductoGramaje({ gramos, precioTotal: monto });
        mostrarMensaje(`Agregado ${gramos}g de ${producto.nombre} por ${formatoMoneda(monto)}`, 'ok');
      } else {
        await agregarProductoATicket(producto);
      }
    } else {
      mostrarMensaje(`"${nombreProducto}" no encontrado`, 'error');
    }
  }
}

function buscarYAgregarPendiente() {
  if (!agregarPendienteBusqueda.value) return;
  const prod = productosFiltradosBusqueda.value[0];
  if (prod) onAgregarPendiente(prod);
}

function onAgregarPendiente(prod: any) {
  if (prod.is_gramaje) {
    modalProductoGramaje.value = prod;
    agregarPendienteGramajeActivo.value = true;
    modalGramajeAbierto.value = true;
    return;
  }
  agregarProductoAPendiente(prod);
}

function onGramajeModalAdd(payload: { gramos: number; precioTotal: number }) {
  if (agregarPendienteGramajeActivo.value) {
    const prod = modalProductoGramaje.value;
    if (!prod) return;
    const gramos = Math.max(1, Math.round(payload.gramos));
    const precioTotal = Math.round(payload.precioTotal * 100) / 100;
    agregarPendienteProductos.value.push({
      idProducto: prod.idProducto || prod.id,
      productoNombre: prod.nombre,
      cantidad: gramos,
      precioUnitarioVenta: precioTotal,
      isGramaje: true,
      codigoBarras: prod.codigo_barras || '',
      tipoPrecioAplicado: 'VENTA_GRAMAJE'
    });
    modalGramajeAbierto.value = false;
    modalProductoGramaje.value = null;
    agregarPendienteGramajeActivo.value = false;
    mostrarMensaje(`Agregado ${gramos}g de ${prod.nombre}.`, 'ok');
    return;
  }
  agregarProductoGramaje(payload);
}

function handleResize() {
  isKeyboardVisible.value = window.innerWidth < 768 && window.innerHeight < 500;
}

function buscarYAgregarProducto(codigo: string) {
  procesarEscaneo(codigo);
}

// --- Lifecycle ---
onMounted(async () => {
  window.addEventListener('resize', handleResize);
  document.addEventListener('mousemove', doResize);
  document.addEventListener('mouseup', stopResize);
  document.addEventListener('touchmove', doResize, { passive: false });
  document.addEventListener('touchend', stopResize);
  window.addEventListener('focusin', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      isKeyboardVisible.value = true;
      ticketVisibleMobile.value = false;
    }
  });
  window.addEventListener('focusout', () => { isKeyboardVisible.value = false; });
  window.addEventListener('keydown', manejarAtajosTeclado);
  document.addEventListener('click', handleClickOutsideDropdown);

  await cargarProductos();
  await cargarCategorias();
  await cargarTicketsDesdeBackend();
  await cargarSiguienteTicket();
  await cargarPromocionesActivas();
  await cargarProvisionSemanal();
  await cargarVentasPendientesFn();
  await cargarCreditosResumen();
});

onUnmounted(() => {
  document.removeEventListener('mousemove', doResize);
  document.removeEventListener('mouseup', stopResize);
  document.removeEventListener('touchmove', doResize);
  document.removeEventListener('touchend', stopResize);
  window.removeEventListener('keydown', manejarAtajosTeclado);
});
</script>

<template>
  <main class="pos-container">
    <PosSidebar
      :tickets="tickets"
      :ticket-actual-id="ticketActualId"
      :creando-ticket="creandoTicket"
      :total-personas-credito="totalPersonasCredito"
      :ventas-pendientes-count="ventasPendientes.length"
      :es-admin="esAdmin"
      @crear-nuevo-ticket="crearNuevoTicket"
      @seleccionar-ticket="seleccionarTicket"
      @eliminar-ticket="eliminarTicket"
      @abrir-creditos="cargarCreditosResumen(); modalCreditosAbierto = true; modalCreditosSeleccionar = false"
      @abrir-pendientes="abrirModalPendientes"
      @abrir-modelos-ia="modalModelosIaAbierto = true"
      @abrir-stock-voz="modalStockVozAbierto = true"
    />

    <PosCatalogo
      :productos-acceso-rapido="productosAccesoRapido"
      :productos-para-mostrar="productosParaMostrar"
      :promociones-activas="promocionesActivas"
      :termino-busqueda="terminoBusqueda"
      :categoria-filtro="categoriaFiltro"
      :categorias="categorias"
      :provision-semanal-total="provisionSemanalTotal"
      :provision-status-class="provisionStatusClass"
      :sugerencias-por-nombre="sugerenciasPorNombre"
      :sugerencias-visibles="sugerenciasVisibles"
      :indice-sugerencia-activa="indiceSugerenciaActiva"
      :is-recording="isRecording"
      :ticket-info-text="ticketInfoText"
      :total-venta="totalVenta"
      @update:termino-busqueda="terminoBusqueda = $event"
      @update:categoria-filtro="categoriaFiltro = $event"
      @focus-busqueda="manejarFocusBusqueda"
      @input-busqueda="manejarInputBusqueda"
      @ocultar-sugerencias="ocultarSugerencias"
      @keydown-sugerencias="manejarTeclasSugerencias($event)"
      @agregar-desde-buscador="agregarDesdeBuscador"
      @seleccionar-sugerencia="seleccionarSugerencia"
      @agregar-producto="agregarProductoATicket"
      @agregar-promocion="agregarPromocionAlTicket"
      @abrir-promociones="modalPromocionesAbierto = true"
      @start-scanner="startScanner"
      @start-voice-command="startVoiceCommand"
      @nuevo-ticket="crearNuevoTicket"
      @abrir-pendientes="modalVentasPendientesAbierto = true"
      @abrir-creditos="modalCreditosAbierto = true"
      @toggle-ticket-mobile="ticketVisibleMobile = !ticketVisibleMobile"
    />

    <PosPanelTicket
      :ticket="ticket"
      :ticket-actual="ticketActual"
      :total-venta="totalVenta"
      :nombre-usuario="nombreUsuario"
      :ticket-visible-mobile="ticketVisibleMobile"
      @update:ticket-visible-mobile="ticketVisibleMobile = $event"
      @start-resize="startResize($event)"
      @limpiar-ticket="limpiarTicket"
      @toggle-mayoreo="toggleMayoreo($event)"
      @toggle-envase="toggleEnvase($event)"
      @editar-gramaje="editarGramajeItem($event)"
      @disminuir-cantidad="disminuirCantidad($event)"
      @aumentar-cantidad="aumentarCantidad($event)"
      @quitar-item="quitarItem($event)"
      @cobrar="cobrar"
      @abrir-proveedores-pedidos="abrirModalProveedoresPedidos"
      @historial-ventas-abrir="historialVentasAbrir"
      @entrada-efectivo="entradaEfectivo"
      @salida-efectivo="salidaEfectivo"
    />

    <EntradaEfectivoModal :open="modalEntradaAbierto" @close="modalEntradaAbierto = false" @submit="registrarEntradaEfectivo" />
    <SalidaEfectivoModal :open="modalSalidaAbierto" @close="modalSalidaAbierto = false" @submit="registrarSalidaEfectivo" />
    <HistorialVentasModal
      :open="modalHistorialAbierto"
      :loading="historialCargando"
      :cobro-total="historialCobroTotal"
      :ganancia-total="historialGananciaTotal"
      :ventas="historialVentas"
      :usuarios-unicos="historialUsuariosUnicos"
      :es-admin="esAdmin"
      @close="modalHistorialAbierto = false"
      @ver-detalle="verDetalleVenta"
      @cancelar="cancelarVentaDesdeHistorial"
      @ventas-corregidas="onVentasCorregidas"
    />

    <PosDetalleVentaModal
      :open="modalDetalleVentaAbierto"
      :historial-venta-seleccionada="historialVentaSeleccionada"
      :modo-edicion-detalle="modoEdicionDetalle"
      :historial-venta-detalle="historialVentaDetalle"
      :historial-venta-tiene-discrepancia="historialVentaTieneDiscrepancia"
      :historial-discrepancia-monto="historialDiscrepanciaMonto"
      :busqueda-editar="busquedaEditar"
      :resultados-editar="resultadosEditar"
      :cargando-busqueda-editar="cargandoBusquedaEditar"
      :detalle-editando-index="detalleEditandoIndex"
      :cantidad-temporal="cantidadTemporal"
      :precio-temporal="precioTemporal"
      :detalle-credito-info="detalleCreditoInfo"
      :detalle-abonos="detalleAbonos"
      :historial-envases="historialEnvases"
      :historial-envase-total="historialEnvaseTotal"
      :es-admin="esAdmin"
      :monto-total-input="montoTotalInput"
      :total-manual-editado="totalManualEditado"
      @cerrar-detalle-venta="cerrarDetalleVenta"
      @iniciar-edicion-detalle="iniciarEdicionDetalle"
      @cancelar-edicion-detalle="cancelarEdicionDetalle"
      @guardar-cambios-detalle="guardarCambiosDetalle"
      @eliminar-todos-detalles="eliminarTodosLosDetalles"
      @update:busqueda-editar="busquedaEditar = $event"
      @buscar-producto-editar="buscarProductoEditar"
      @agregar-producto-detalle="agregarProductoADetalle"
      @iniciar-editar-item="iniciarEditarItem"
      @confirmar-edicion-item="confirmarEdicionItem"
      @cancelar-edicion-item="cancelarEdicionItem"
      @eliminar-detalle-venta="eliminarDetalleVenta"
      @update:monto-total-input="montoTotalInput = $event"
      @total-manual-change="onTotalManualChange"
      @clear-busqueda-editar="busquedaEditar = ''; resultadosEditar = []"
    />

    <CalculadoraGramajeModal
      :open="modalGramajeAbierto"
      :producto="modalProductoGramaje ? { ...modalProductoGramaje, codigo_barras: modalProductoGramaje.codigo_barras ?? '' } : null"
      :is-editing="gramajeEditandoDesdeHistorial"
      :cantidad-inicial="gramajeEditandoCantidad"
      :precio-inicial="gramajeEditandoPrecio"
      @close="modalGramajeAbierto = false; modalProductoGramaje = null; gramajeEditandoDesdeHistorial = false; gramajeEditandoIndice = null; agregarPendienteGramajeActivo = false"
      @add="onGramajeModalAdd"
    />

    <CobroModal
      :open="modalCobroAbierto"
      :total="totalVenta"
      @close="modalCobroAbierto = false"
      @confirmar-efectivo="confirmarCobroEfectivo"
      @confirmar-transferencia="confirmarCobroTransferencia"
      @confirmar-tarjeta="confirmarCobroTarjeta"
      @confirmar-pendiente="confirmarCobroPendiente"
      @confirmar-credito="confirmarCobroCredito"
    />

    <CreditosPersonasModal
      :open="modalCreditosAbierto"
      :seleccionar="modalCreditosSeleccionar"
      @close="modalCreditosAbierto = false; modalCreditosSeleccionar = false"
      @persona-seleccionada="onPersonaCreditoSeleccionada"
      @credito-actualizado="cargarCreditosResumen"
    />

    <CobroModal
      :open="modalCobroPendienteAbierto"
      :total="Number(ventaPendienteSeleccionada?.montoTotal) || 0"
      @close="modalCobroPendienteAbierto = false; ventaPendienteSeleccionada = null"
      @confirmar-efectivo="confirmarCobroPendienteEfectivo"
      @confirmar-transferencia="confirmarCobroPendienteTransferencia"
      @confirmar-tarjeta="confirmarCobroPendienteTarjeta"
      @confirmar-credito="confirmarCobroPendienteCredito"
    />

    <CrudPromociones :open="modalPromocionesAbierto" @close="modalPromocionesAbierto = false; cargarPromocionesActivas()" @updated="cargarPromocionesActivas" />

    <PosDescripcionPendienteModal
      :open="modalDescripcionPendiente"
      :venta-pendiente-seleccionada="ventaPendienteSeleccionada"
      :descripcion-pendiente-texto="descripcionPendienteTexto"
      @close="modalDescripcionPendiente = false"
      @update:descripcion-pendiente-texto="descripcionPendienteTexto = $event"
      @guardar="ventaPendienteSeleccionada ? guardarEdicionDescripcion() : guardarVentaPendiente()"
    />

    <PosVentasPendientesModal
      :open="modalVentasPendientesAbierto"
      :ventas-pendientes="ventasPendientes"
      :ventas-pendientes-agrupadas="ventasPendientesAgrupadas"
      :vp-vista-lista="vpVistaLista"
      @close="modalVentasPendientesAbierto = false"
      @update:vp-vista-lista="vpVistaLista = $event"
      @cobrar="cobrarVentaPendiente"
      @editar-descripcion="editarDescripcionPendiente"
      @eliminar="eliminarVentaPendiente"
      @eliminar-producto="eliminarProductoPendiente"
      @agregar-productos="agregarAVentaPendiente"
    />

    <PosAgregarPendienteModal
      :open="modalAgregarPendienteAbierto"
      :venta-pendiente-seleccionada="ventaPendienteSeleccionada"
      :agregar-pendiente-busqueda="agregarPendienteBusqueda"
      :agregar-pendiente-scanner-activo="agregarPendienteScannerActivo"
      :productos-filtrados-busqueda="productosFiltradosBusqueda"
      :agregar-pendiente-productos="agregarPendienteProductos"
      @close="modalAgregarPendienteAbierto = false"
      @update:agregar-pendiente-busqueda="agregarPendienteBusqueda = $event"
      @buscar-y-agregar="buscarYAgregarPendiente"
      @start-scanner-pendiente="agregarPendienteScannerActivo = !agregarPendienteScannerActivo"
      @agregar-producto="onAgregarPendiente"
      @quitar-producto="quitarProductoPendiente"
      @confirmar-agregar="confirmarAgregarPendiente"
    />

    <PosProveedoresPedidosModal
      :open="modalProveedoresPedidos"
      :pedido-proveedor-tab="pedidoProveedorTab"
      :pp-vista-lista-prov="ppVistaListaProv"
      :pp-vista-lista-ped="ppVistaListaPed"
      :proveedores="proveedores"
      :pedidos-proveedor="pedidosProveedor"
      :show-proveedor-form="showProveedorForm"
      :show-pedido-form="showPedidoForm"
      :editing-proveedor="editingProveedor"
      :editing-pedido="editingPedido"
      :proveedor-form="proveedorForm"
      :pedido-form="pedidoForm"
      :monto-manual="montoManual"
      :search-producto-pedido="searchProductoPedido"
      :show-producto-dropdown-pedido="showProductoDropdownPedido"
      :filtered-productos-pedido="filteredProductosPedido"
      :new-detalle-pedido="newDetallePedido"
      :search-wrapper-ref="searchWrapperRef"
      @close="modalProveedoresPedidos = false"
      @update:pedido-proveedor-tab="pedidoProveedorTab = $event as 'proveedores' | 'pedidos' | 'sugerido' | 'sugeridoHoy'"
      @update:pp-vista-lista-prov="ppVistaListaProv = $event"
      @update:pp-vista-lista-ped="ppVistaListaPed = $event"
      @update:show-proveedor-form="showProveedorForm = $event"
      @update:show-pedido-form="showPedidoForm = $event"
      @update:proveedor-form="proveedorForm = $event"
      @update:pedido-form="pedidoForm = $event"
      @update:monto-manual="montoManual = $event"
      @update:search-producto-pedido="searchProductoPedido = $event"
      @update:show-producto-dropdown-pedido="showProductoDropdownPedido = $event"
      @update:new-detalle-pedido="newDetallePedido = $event"
      @open-proveedor-modal="openProveedorModal"
      @delete-proveedor="deleteProveedor"
      @save-proveedor="saveProveedor"
      @open-pedido-modal="openPedidoModal"
      @recibir-pedido="recibirPedido"
      @delete-pedido="deletePedido"
      @save-pedido="savePedido"
      @add-detalle-pedido="addDetallePedido"
      @remove-detalle-pedido="removeDetallePedido"
      @select-producto-pedido="selectProductoForPedido"
      @pedido-creado="cargarProveedoresPedidos"
    />

    <OllamaModelManager
      :open="modalModelosIaAbierto"
      @close="modalModelosIaAbierto = false"
    />
    <VoiceStockConfirmModal
      :open="modalStockVozAbierto"
      :stock-data="stockData"
      @close="modalStockVozAbierto = false; stockData = null"
      @done="modalStockVozAbierto = false; stockData = null; cargarProductos()"
    />
    <VoiceOpcionesVentaModal
      :open="modalOpcionesVozAbierto"
      :data="voiceOpcionesVenta"
      @seleccionar="agregarOpcionVoz"
      @cancelar="modalOpcionesVozAbierto = false; voiceOpcionesVenta = null"
    />
    <PosToastNotification :mensaje="mensaje" :mensaje-tipo="mensajeTipo" />
    <PosScannerOverlay :scanner-activo="scannerActivo" @stop-scanner="stopScanner" />
  </main>
</template>

<style scoped>
.pos-container {
  display: grid;
  grid-template-columns: 70px 1fr 360px;
  grid-template-rows: 1fr;
  height: calc(98vh - 64px);
  background-color: var(--bg-primary);
  color: var(--zelda-gold);
  overflow: hidden;
  position: relative;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

@media (min-width: 1400px) {
  .pos-container {
    grid-template-columns: 70px 1fr 400px;
  }
}

@media (max-width: 1199px) {
  .pos-container {
    grid-template-columns: 60px 1fr 320px;
  }
}

@media (max-width: 991px) {
  .pos-container {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }
}

@media (min-width: 768px) and (max-width: 991px) {
  .pos-container {
    gap: 0.4rem;
    padding: 0.5rem;
  }
}

@media (max-width: 767px) {
  .pos-container {
    grid-template-columns: 1fr;
    max-height: 100dvh;
    overflow: hidden;
  }
}

@media (max-width: 480px) {
  .pos-container {
    max-height: 100dvh;
    overflow: hidden;
  }
}

.pos-modal-overlay { z-index: 200;
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--perg-bg) 85%, var(--bg-primary));
  backdrop-filter: blur(5px);
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 1rem;
}
</style>


