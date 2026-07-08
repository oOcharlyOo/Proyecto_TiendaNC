import { ref } from 'vue';
import type { ApiRespuesta, VentaDTO, VentaDetalleDTO } from './usePosTipos';
import { getJson, mostrarMensaje, ticket, ticketActual, ticketActualId, tickets, totalVenta, crearNuevoTicket, cargarTicketsDesdeBackend, cargarSiguienteTicket, crearDetalleVenta, formatoMoneda, getFechaHoy, formatoMonedaRedondeada } from './usePosTicket';
import { playSound } from './usePosSonido';

const modalCobroAbierto = ref(false);
const modalCreditosAbierto = ref(false);
const modalCreditosSeleccionar = ref(false);
const creditoPersonaSeleccionada = ref<any>(null);
const totalPersonasCredito = ref(0);
const creditosResumen = ref<any[]>([]);
const modalEntradaAbierto = ref(false);
const modalSalidaAbierto = ref(false);
const modalHistorialAbierto = ref(false);
const modalDetalleVentaAbierto = ref(false);
const modalDescripcionPendiente = ref(false);
const descripcionPendienteTexto = ref('');
const modalVentasPendientesAbierto = ref(false);
const ventasPendientes = ref<any[]>([]);
const ventaPendienteSeleccionada = ref<any>(null);
const modalCobroPendienteAbierto = ref(false);
const modalAgregarPendienteAbierto = ref(false);
const agregarPendienteBusqueda = ref('');
const agregarPendienteInput = ref<HTMLInputElement | null>(null);
const agregarPendienteScannerActivo = ref(false);
const agregarPendienteProductos = ref<any[]>([]);
const historialCargando = ref(false);
const historialCobroTotal = ref(0);
const historialGananciaTotal = ref(0);
const historialVentas = ref<any[]>([]);
const historialUsuariosUnicos = ref<{ idUsuario: number; nombre: string }[]>([]);
const historialDetalleCargando = ref(false);
const historialVentaDetalle = ref<any[]>([]);
const historialVentaSeleccionada = ref<any>(null);
const detalleCreditoInfo = ref<any>(null);
const detalleAbonos = ref<any[]>([]);
const historialVentaTieneDiscrepancia = ref(false);
const historialDiscrepanciaMonto = ref(0);

function cobrar() {
  if (ticket.value.length === 0) { mostrarMensaje('No hay productos en el ticket.', 'error'); return; }
  modalCobroAbierto.value = true;
}

async function completarVenta(idVenta: number, metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA', montoTotal: number) {
  const data = await getJson<ApiRespuesta<unknown>>(`/ventas/completarVenta/${idVenta}?montoTotal=${encodeURIComponent(montoTotal.toString())}&metodoPago=${metodoPago}`, { method: 'PUT' });
  if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo completar la venta.');
}

function getPromoDetalles() {
  const montoCobrado = totalVenta.value;
  const subtotalOriginal = ticketActual.value!.items.reduce((sum, item) => {
    if ((item as any).is_promocion) return sum + ((item as any).promocion.detalles.reduce((s: number, d: any) => s + (Number(d.subtotal) || 0), 0) ?? 0);
    return sum + (item.precio * item.cantidad);
  }, 0);
  const detallesParaGuardar: any[] = [];
  for (const item of ticketActual.value!.items as any[]) {
    if (item.is_promocion && item.promocion) {
      const promo = item.promocion;
      for (const detalle of promo.detalles) {
        const cantidad = Number(detalle.cantidad) || 0;
        const subtotalDetalle = Number(detalle.subtotal) || 0;
        const proporcion = subtotalOriginal > 0 ? subtotalDetalle / subtotalOriginal : 0;
        const precioAjustado = Math.round((montoCobrado * proporcion / cantidad) * 100) / 100;
        detallesParaGuardar.push({ id: detalle.id_producto, nombre: detalle.nombre_producto || '', dto: { idProducto: detalle.id_producto, nombre: '', precio_venta: Number(detalle.precio_unitario) || 0, codigoBarras: '' }, cantidad, precio: precioAjustado, is_gramaje: cantidad < 1000 });
      }
    } else { detallesParaGuardar.push(item); }
  }
  return detallesParaGuardar;
}

async function cleanTicketAfterSale() {
  tickets.value = tickets.value.filter(t => t.id !== ticketActual.value!.id);
  if (tickets.value.length === 0) await crearNuevoTicket();
  else { const pendiente = tickets.value.find(t => t.estado === 'pendiente'); ticketActualId.value = pendiente ? pendiente.id : tickets.value[0].id; }
}

async function procesarCobro(metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA') {
  const { obtenerIdUsuarioSesion } = await import('./usePosTicket');
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) { mostrarMensaje('No se encontro sesion de usuario.', 'error'); return; }
  if (!ticketActual.value || ticketActual.value.items.length === 0) { mostrarMensaje('No hay productos en el ticket.', 'error'); return; }
  try {
    const montoCobrado = totalVenta.value;
    const ventaId = ticketActual.value.id;
    const numeroTicket = ticketActual.value.numero;
    const detallesParaGuardar = getPromoDetalles();
    await Promise.all(detallesParaGuardar.map((item: any) => crearDetalleVenta(ventaId, item)));
    await completarVenta(ventaId, metodoPago, montoCobrado);
    window.dispatchEvent(new CustomEvent('venta-completada', { detail: { ventaId, montoTotal: montoCobrado } }));
    const numeroTicketVenta = numeroTicket ? ` Ticket #${numeroTicket}.` : '';
    await cleanTicketAfterSale();
    mostrarMensaje(`Venta cobrada por ${formatoMoneda(montoCobrado)} con ${metodoPago}.${numeroTicketVenta}`, 'ok');
    playSound('cash');
    modalCobroAbierto.value = false;
    await cargarTicketsDesdeBackend();
    await cargarSiguienteTicket();
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error inesperado.';
    mostrarMensaje(`No se pudo cobrar: ${detalle}`, 'error');
  }
}

async function confirmarCobroEfectivo(payload: { montoRecibido: number }) {
  if (payload.montoRecibido < totalVenta.value) { mostrarMensaje('El monto recibido es menor al total.', 'error'); return; }
  await procesarCobro('EFECTIVO');
}
async function confirmarCobroTransferencia() { await procesarCobro('TRANSFERENCIA'); }
async function confirmarCobroTarjeta() { await procesarCobro('TARJETA'); }

function confirmarCobroPendiente() {
  if (ticket.value.length === 0) { mostrarMensaje('No hay productos en el ticket.', 'error'); return; }
  modalCobroAbierto.value = false;
  descripcionPendienteTexto.value = '';
  modalDescripcionPendiente.value = true;
}

async function cargarCreditosResumen() {
  try {
    const res = await getJson<{ codigo: number; datos: any[] }>('/credito/venta/activos');
    if (res.codigo === 200) { creditosResumen.value = res.datos; totalPersonasCredito.value = new Set(res.datos.map((v: any) => v.idPersona)).size; }
  } catch (e) { console.error('Error al cargar resumen créditos', e); }
}

function confirmarCobroCredito() {
  if (ticket.value.length === 0) { mostrarMensaje('No hay productos en el ticket.', 'error'); return; }
  modalCobroAbierto.value = false;
  modalCreditosSeleccionar.value = true;
  modalCreditosAbierto.value = true;
}

async function procesarCobroCredito(persona: any) {
  const { obtenerIdUsuarioSesion } = await import('./usePosTicket');
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) { mostrarMensaje('No se encontro sesion de usuario.', 'error'); return; }
  if (!ticketActual.value || ticketActual.value.items.length === 0) { mostrarMensaje('No hay productos en el ticket.', 'error'); return; }
  try {
    const montoTotal = totalVenta.value;
    const ventaId = ticketActual.value.id;
    const numTicket = ticketActual.value.numero;
    const detallesParaGuardar = getPromoDetalles();
    await Promise.all(detallesParaGuardar.map((item: any) => crearDetalleVenta(ventaId, item)));
    await getJson<ApiRespuesta<any>>(`/ventas/completarVenta/${ventaId}?montoTotal=${encodeURIComponent(montoTotal.toString())}&metodoPago=CREDITO`, { method: 'PUT' });
    await getJson<ApiRespuesta<any>>('/credito/venta?idUsuario=' + idUsuario, { method: 'POST', body: JSON.stringify({ idPersona: persona.idPersona, idVenta: ventaId, montoTotal, notas: '' }) });
    window.dispatchEvent(new CustomEvent('venta-completada', { detail: { ventaId, montoTotal } }));
    await cleanTicketAfterSale();
    mostrarMensaje(`Venta a crédito con ${persona.nombre}. Ticket #${numTicket}`, 'ok');
    playSound('cash');
    modalCreditosAbierto.value = false;
    await cargarTicketsDesdeBackend();
    await cargarSiguienteTicket();
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error inesperado.'; mostrarMensaje(`No se pudo procesar: ${detalle}`, 'error');
  }
}

function onPersonaCreditoSeleccionada(persona: any) {
  creditoPersonaSeleccionada.value = persona;
  modalCreditosSeleccionar.value = false;
  if (ventaPendienteSeleccionada.value) procesarCobroPendienteCredito(persona);
  else procesarCobroCredito(persona);
}

async function procesarCobroPendienteCredito(persona: any) {
  const { obtenerIdUsuarioSesion } = await import('./usePosTicket');
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) return;
  const venta = ventaPendienteSeleccionada.value;
  if (!venta) return;
  try {
    const res1 = await getJson<ApiRespuesta<any>>(`/ventas/cobrarVentaPendiente/${venta.idVenta}?idUsuario=${idUsuario}&metodoPago=CREDITO&montoTotal=${Number(venta.montoTotal)}`, { method: 'PUT' });
    if (res1.codigo !== 200) throw new Error(res1.mensaje || 'Error al cobrar venta pendiente');
    await getJson<ApiRespuesta<any>>('/credito/venta?idUsuario=' + idUsuario, { method: 'POST', body: JSON.stringify({ idPersona: persona.idPersona, idVenta: venta.idVenta, montoTotal: Number(venta.montoTotal), notas: '' }) });
    const nuevoTicket = res1?.datos?.numeroTicket || venta.numeroTicket;
    mostrarMensaje(`Venta a crédito con ${persona.nombre}. Ticket #${nuevoTicket}`, 'ok');
    playSound('cash');
    modalCobroPendienteAbierto.value = false;
    ventaPendienteSeleccionada.value = null;
    modalCreditosAbierto.value = false;
    await cargarVentasPendientesFn();
    await cargarCreditosResumen();
  } catch (e) { const msg = e instanceof Error ? e.message : 'Error al procesar crédito.'; mostrarMensaje(msg, 'error'); }
}

async function procesarCobroPendiente(metodoPago: string) {
  if (!ventaPendienteSeleccionada.value) return;
  const { obtenerIdUsuarioSesion } = await import('./usePosTicket');
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) { mostrarMensaje('No se encontro sesion de usuario.', 'error'); return; }
  try {
    const venta = ventaPendienteSeleccionada.value;
    const res = await getJson<ApiRespuesta<any>>(`/ventas/cobrarVentaPendiente/${venta.idVenta}?idUsuario=${idUsuario}&metodoPago=${metodoPago}&montoTotal=${Number(venta.montoTotal)}`, { method: 'PUT' });
    const nuevoTicket = res?.datos?.numeroTicket || venta.numeroTicket;
    mostrarMensaje(`Venta cobrada. Ticket #${nuevoTicket} - ${formatoMoneda(Number(venta.montoTotal))} con ${metodoPago}.`, 'ok');
    playSound('cash');
    modalCobroPendienteAbierto.value = false;
    ventaPendienteSeleccionada.value = null;
    await cargarVentasPendientesFn();
    await cargarTicketsDesdeBackend();
    await cargarSiguienteTicket();
  } catch (error) { const detalle = error instanceof Error ? error.message : 'Error inesperado.'; mostrarMensaje(`No se pudo cobrar: ${detalle}`, 'error'); }
}

async function confirmarCobroPendienteEfectivo(payload: { montoRecibido: number }) {
  if (payload.montoRecibido < Number(ventaPendienteSeleccionada.value.montoTotal)) { mostrarMensaje('El monto recibido es menor al total.', 'error'); return; }
  await procesarCobroPendiente('EFECTIVO');
}
async function confirmarCobroPendienteTransferencia() { await procesarCobroPendiente('TRANSFERENCIA'); }
async function confirmarCobroPendienteTarjeta() { await procesarCobroPendiente('TARJETA'); }
function confirmarCobroPendienteCredito() {
  if (!ventaPendienteSeleccionada.value) return;
  modalCobroPendienteAbierto.value = false;
  modalCreditosSeleccionar.value = true;
  modalCreditosAbierto.value = true;
}

// Pending sales
async function cargarVentasPendientesFn() {
  try { const data = await getJson<ApiRespuesta<any[]>>('/ventas/buscarVentasEnProceso'); ventasPendientes.value = data?.datos ?? []; }
  catch (_error) { ventasPendientes.value = []; }
}

function abrirModalPendientes() { modalVentasPendientesAbierto.value = true; cargarVentasPendientesFn(); }

function cobrarVentaPendiente(venta: any) { ventaPendienteSeleccionada.value = venta; modalVentasPendientesAbierto.value = false; modalCobroPendienteAbierto.value = true; }

async function guardarVentaPendiente() {
  if (!descripcionPendienteTexto.value.trim()) { mostrarMensaje('Debes escribir una descripción del motivo.', 'error'); return; }
  if (!ticketActual.value || ticketActual.value.items.length === 0) { mostrarMensaje('No hay productos en el ticket.', 'error'); return; }
  try {
    const montoTotal = totalVenta.value, ventaId = ticketActual.value.id, numTicket = ticketActual.value.numero;
    await getJson<ApiRespuesta<any>>(`/ventas/actualizarVenta/${ventaId}`, { method: 'PUT', body: JSON.stringify({ montoTotal }) });
    for (const item of ticketActual.value.items as any[]) {
      if (item.is_promocion && item.promocion) {
        for (const detalle of item.promocion.detalles) {
          const cantidad = Number(detalle.cantidad) || 0, subtotalDetalle = Number(detalle.subtotal) || 0;
          const precioUnitario = cantidad > 0 ? subtotalDetalle / cantidad : 0;
          await crearDetalleVenta(ventaId, { id: detalle.id_producto, nombre: detalle.nombre_producto || '', dto: { idProducto: detalle.id_producto, nombre: '', precio_venta: Number(detalle.precio_unitario) || 0, codigoBarras: '' }, cantidad, precio: precioUnitario, is_gramaje: cantidad < 1000 });
        }
      } else { await crearDetalleVenta(ventaId, item); }
    }
    await getJson<ApiRespuesta<any>>(`/ventas/marcarPendiente/${ventaId}?descripcion=${encodeURIComponent(descripcionPendienteTexto.value.trim())}`, { method: 'PUT' });
    await cleanTicketAfterSale();
    modalDescripcionPendiente.value = false; descripcionPendienteTexto.value = '';
    mostrarMensaje(`Venta guardada como pendiente. Ticket #${numTicket}`, 'ok');
    await cargarVentasPendientesFn();
  } catch (error) { const detalle = error instanceof Error ? error.message : 'Error inesperado.'; mostrarMensaje(`No se pudo guardar: ${detalle}`, 'error'); }
}

function editarDescripcionPendiente(venta: any) { ventaPendienteSeleccionada.value = venta; descripcionPendienteTexto.value = venta.descripcionPendiente || ''; modalVentasPendientesAbierto.value = false; modalDescripcionPendiente.value = true; }

async function guardarEdicionDescripcion() {
  if (!ventaPendienteSeleccionada.value) return;
  try {
    await getJson<ApiRespuesta<any>>(`/ventas/marcarPendiente/${ventaPendienteSeleccionada.value.idVenta}?descripcion=${encodeURIComponent(descripcionPendienteTexto.value.trim())}`, { method: 'PUT' });
    modalDescripcionPendiente.value = false; descripcionPendienteTexto.value = '';
    ventaPendienteSeleccionada.value = null;
    await cargarVentasPendientesFn(); modalVentasPendientesAbierto.value = true;
    mostrarMensaje('Descripción actualizada.', 'ok');
  } catch (error) { const detalle = error instanceof Error ? error.message : 'Error inesperado.'; mostrarMensaje(`No se pudo actualizar: ${detalle}`, 'error'); }
}

async function eliminarVentaPendiente(venta: any) {
  if (!confirm(`¿Eliminar el ticket #${venta.numeroTicket}?`)) return;
  try {
    const response = await getJson<ApiRespuesta<unknown>>(`/ventas/cancelarVenta/${venta.idVenta}`, { method: 'PUT' });
    if (response?.codigo === 200) { await cargarVentasPendientesFn(); mostrarMensaje('Venta pendiente eliminada', 'ok'); }
    else { mostrarMensaje(response?.mensaje || 'Error al eliminar', 'error'); }
  } catch (e: any) { mostrarMensaje('Error de red: ' + e.message, 'error'); }
}

function agregarAVentaPendiente(venta: any) {
  ventaPendienteSeleccionada.value = venta; agregarPendienteBusqueda.value = ''; agregarPendienteProductos.value = [];
  agregarPendienteScannerActivo.value = false; modalVentasPendientesAbierto.value = false; modalAgregarPendienteAbierto.value = true;
  import('vue').then(({ nextTick }) => { nextTick(() => { agregarPendienteInput.value?.focus(); }); });
}

function agregarProductoAPendiente(prod: any) {
  agregarPendienteProductos.value.push({ idProducto: prod.idProducto || prod.id, productoNombre: prod.nombre, cantidad: 1, precioUnitarioVenta: prod.precio_venta || prod.precio, isGramaje: prod.is_gramaje || false, codigoBarras: prod.codigo_barras || '', tipoPrecioAplicado: 'NORMAL' });
  agregarPendienteBusqueda.value = '';
}

function quitarProductoPendiente(idx: number) { agregarPendienteProductos.value.splice(idx, 1); }

async function confirmarAgregarPendiente() {
  if (!ventaPendienteSeleccionada.value || agregarPendienteProductos.value.length === 0) return;
  try {
    const response = await getJson<ApiRespuesta<any>>(`/ventas/agregarProductosAPendiente/${ventaPendienteSeleccionada.value.idVenta}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(agregarPendienteProductos.value) });
    if (response.codigo === 200) { modalAgregarPendienteAbierto.value = false; agregarPendienteProductos.value = []; await cargarVentasPendientesFn(); mostrarMensaje('Productos agregados a la venta pendiente.', 'ok'); }
    else { mostrarMensaje(response.mensaje || 'Error al agregar productos', 'error'); }
  } catch (e: any) { mostrarMensaje('Error de red: ' + e.message, 'error'); }
}

// Sales history
async function cargarHistorialVentasDia() {
  historialCargando.value = true;
  try {
    const fechaHoy = getFechaHoy();
    const data = await getJson<ApiRespuesta<{ cobroTotal?: number | string; gananciaTotal?: number | string; ventas?: VentaDTO[] }>>(`/ventas/historialDia/${fechaHoy}`);
    const ventas = Array.isArray(data?.datos?.ventas) ? data.datos.ventas : [];
    historialVentas.value = ventas.filter((v: VentaDTO) => !v.metodoPago?.startsWith('ABONO/')).sort((a: VentaDTO, b: VentaDTO) => {
      const dateA = a.fechaVenta ? new Date(a.fechaVenta).getTime() : 0;
      const dateB = b.fechaVenta ? new Date(b.fechaVenta).getTime() : 0;
      return dateB - dateA;
    });
    historialCobroTotal.value = historialVentas.value.reduce((s: number, v: any) => s + Number(v.montoTotal || 0), 0);
    historialGananciaTotal.value = historialVentas.value.reduce((s: number, v: any) => s + Number((v as any).ganancia || 0), 0);
    const usuariosMap = new Map<number, string>();
    for (const v of historialVentas.value) { if (v.idUsuario && v.nombreUsuario && !usuariosMap.has(v.idUsuario)) usuariosMap.set(v.idUsuario, v.nombreUsuario); }
    historialUsuariosUnicos.value = Array.from(usuariosMap.entries()).map(([id, nombre]) => ({ idUsuario: id, nombre }));
  } catch (_error) { historialCobroTotal.value = 0; historialGananciaTotal.value = 0; historialVentas.value = []; mostrarMensaje('No se pudo cargar el historial de ventas.', 'error'); }
  finally { historialCargando.value = false; }
}

async function verDetalleVenta(venta: any) {
  historialVentaSeleccionada.value = venta; historialDetalleCargando.value = true;
  historialVentaTieneDiscrepancia.value = false; modalDetalleVentaAbierto.value = true;
  detalleCreditoInfo.value = null; detalleAbonos.value = [];
  try {
    const data = await getJson<ApiRespuesta<VentaDetalleDTO[]>>(`/ventasDetalle/porVenta/${venta.idVenta}`);
    const detalles = Array.isArray(data?.datos) ? data.datos : [];
    historialVentaDetalle.value = detalles;
    const tieneDiscrepancia = Boolean((venta as any).tieneDiscrepancia ?? false);
    historialVentaTieneDiscrepancia.value = tieneDiscrepancia;
    if (!tieneDiscrepancia) historialDiscrepanciaMonto.value = 0;
    const metodoPago = (venta as any).metodoPago || '';
    if (metodoPago.startsWith('ABONO/')) {
      const desc = (venta as any).descripcionPendiente || '';
      const match = desc.match(/Crédito #(\d+)/);
      if (match) {
        const idCreditoVenta = parseInt(match[1]);
        try {
          const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';
          const resCredito = await fetch(`${API_BASE}/credito/venta`, { headers: { 'Content-Type': 'application/json' } });
          const creditosData = await resCredito.json();
          if (creditosData.codigo === 200) { const creditoEncontrado = creditosData.datos.find((cv: any) => cv.idCreditoVenta === idCreditoVenta); if (creditoEncontrado) detalleCreditoInfo.value = creditoEncontrado; }
          const resAbonos = await getJson<{ codigo: number; datos: any[] }>(`/credito/abono/${idCreditoVenta}`);
          if (resAbonos.codigo === 200) detalleAbonos.value = resAbonos.datos || [];
        } catch (e) { console.error('Error al cargar info del crédito:', e); }
      }
    }
    const idx = historialVentas.value.findIndex((v: any) => v.idVenta === venta.idVenta);
    if (idx !== -1) historialVentas.value[idx] = { ...historialVentas.value[idx], tieneDiscrepancia };
  } catch (_error) { historialVentaDetalle.value = []; mostrarMensaje('No se pudieron cargar los detalles de la venta.', 'error'); }
  finally { historialDetalleCargando.value = false; }
}

async function cancelarVentaDesdeHistorial(venta: any) {
  if (!confirm(`¿Estás seguro de cancelar la venta #${venta.numeroTicket}?`)) return;
  try {
    const data = await getJson<ApiRespuesta<VentaDTO>>(`/ventas/cancelarVenta/${venta.idVenta}`, { method: 'PUT' });
    if (data?.codigo === 200) { mostrarMensaje(`Venta #${venta.numeroTicket} cancelada correctamente.`, 'ok'); await cargarHistorialVentasDia(); }
    else { mostrarMensaje(data?.mensaje || 'No se pudo cancelar la venta.', 'error'); }
  } catch (_error) { mostrarMensaje('Error al cancelar la venta.', 'error'); }
}

function historialVentasAbrir() { modalHistorialAbierto.value = true; cargarHistorialVentasDia(); }

async function onVentasCorregidas() { await cargarHistorialVentasDia(); if (historialVentaSeleccionada.value) await verDetalleVenta(historialVentaSeleccionada.value); }

async function registrarEntradaEfectivo(payload: { montoEoS: number; descripcion: string }) {
  const { obtenerIdUsuarioSesion } = await import('./usePosTicket');
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) { mostrarMensaje('No se encontro sesion de usuario.', 'error'); return; }
  try {
    const data = await getJson<ApiRespuesta<unknown>>('/caja/entrada', { method: 'POST', body: JSON.stringify({ montoEoS: payload.montoEoS, descripcion: payload.descripcion, idUsuario }) });
    if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo registrar la entrada.');
    modalEntradaAbierto.value = false; mostrarMensaje('Entrada de efectivo registrada.', 'ok');
  } catch (error) { const detalle = error instanceof Error ? error.message : 'Error inesperado.'; mostrarMensaje(`Error al registrar entrada: ${detalle}`, 'error'); }
}

async function registrarSalidaEfectivo(payload: { montoEoS: number; descripcion: string }) {
  const { obtenerIdUsuarioSesion } = await import('./usePosTicket');
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) { mostrarMensaje('No se encontro sesion de usuario.', 'error'); return; }
  try {
    const data = await getJson<ApiRespuesta<unknown>>('/caja/salida', { method: 'POST', body: JSON.stringify({ montoEoS: payload.montoEoS, descripcion: payload.descripcion, idUsuario }) });
    if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo registrar la salida.');
    modalSalidaAbierto.value = false; mostrarMensaje('Salida de efectivo registrada.', 'ok');
  } catch (error) { const detalle = error instanceof Error ? error.message : 'Error inesperado.'; mostrarMensaje(`Error al registrar salida: ${detalle}`, 'error'); }
}

function entradaEfectivo() { modalEntradaAbierto.value = true; }
function salidaEfectivo() { modalSalidaAbierto.value = true; }

export {
  modalCobroAbierto, modalCreditosAbierto, modalCreditosSeleccionar,
  creditoPersonaSeleccionada, totalPersonasCredito, creditosResumen,
  modalEntradaAbierto, modalSalidaAbierto, modalHistorialAbierto,
  modalDetalleVentaAbierto, modalDescripcionPendiente, descripcionPendienteTexto,
  modalVentasPendientesAbierto, ventasPendientes, ventaPendienteSeleccionada,
  modalCobroPendienteAbierto, modalAgregarPendienteAbierto,
  agregarPendienteBusqueda, agregarPendienteInput, agregarPendienteScannerActivo,
  agregarPendienteProductos, historialCargando, historialCobroTotal,
  historialGananciaTotal, historialVentas, historialUsuariosUnicos,
  historialDetalleCargando, historialVentaDetalle, historialVentaSeleccionada,
  detalleCreditoInfo, detalleAbonos, historialVentaTieneDiscrepancia,
  historialDiscrepanciaMonto,
  cobrar, procesarCobro, confirmarCobroEfectivo, confirmarCobroTransferencia,
  confirmarCobroTarjeta, confirmarCobroPendiente, confirmarCobroCredito,
  onPersonaCreditoSeleccionada, procesarCobroCredito, procesarCobroPendienteCredito,
  procesarCobroPendiente, confirmarCobroPendienteEfectivo,
  confirmarCobroPendienteTransferencia, confirmarCobroPendienteTarjeta,
  confirmarCobroPendienteCredito, cargarCreditosResumen,
  cargarVentasPendientesFn as cargarVentasPendientes, abrirModalPendientes,
  cobrarVentaPendiente, guardarVentaPendiente, editarDescripcionPendiente,
  guardarEdicionDescripcion, eliminarVentaPendiente,
  agregarAVentaPendiente, agregarProductoAPendiente, quitarProductoPendiente,
  confirmarAgregarPendiente, cargarHistorialVentasDia, verDetalleVenta,
  cancelarVentaDesdeHistorial, historialVentasAbrir, onVentasCorregidas,
  registrarEntradaEfectivo, registrarSalidaEfectivo, entradaEfectivo, salidaEfectivo
};
