import { ref, computed } from 'vue';
import type { ApiRespuesta, VentaDTO, VentaDetalleDTO, Producto } from './usePosTipos';
import { getJson, mostrarMensaje, formatoMoneda, formatoMonedaRedondeada } from './usePosTicket';
import { cargarHistorialVentasDia, modalDetalleVentaAbierto, detalleCreditoInfo, detalleAbonos, historialVentaTieneDiscrepancia, historialDiscrepanciaMonto, historialVentaDetalle, historialVentaSeleccionada } from './usePosCobro';
import { modalGramajeAbierto, modalProductoGramaje, gramajeItemEditando, gramajeEditandoDesdeHistorial, gramajeEditandoIndice, gramajeEditandoCantidad, gramajeEditandoPrecio } from './usePosGramaje';

const modoEdicionDetalle = ref(false);
const montoTotalEditado = ref(0);
const detalleEditandoIndex = ref<number | null>(null);
const cantidadTemporal = ref(0);
const precioTemporal = ref(0);
const totalManualEditado = ref(false);
const montoTotalInput = ref(0);
const busquedaEditar = ref('');
const resultadosEditar = ref<Producto[]>([]);
const cargandoBusquedaEditar = ref(false);
const metodoPagoEditado = ref('');
const mixtoSplitsEdicion = ref<Array<{ metodo: string; monto: number }>>([]);

function parsearMetodoPago(mp?: string | null): { metodo: string; splits: Array<{ metodo: string; monto: number }> } {
  if (!mp) return { metodo: 'EFECTIVO', splits: [] };
  if (mp.startsWith('MIXTO:')) {
    const splits = mp.substring(6).split(',')
      .map(parte => {
        const idx = parte.indexOf('-');
        if (idx === -1) return { metodo: parte, monto: 0 };
        return { metodo: parte.substring(0, idx), monto: Number(parte.substring(idx + 1)) || 0 };
      })
      .filter(s => s.metodo);
    return { metodo: 'MIXTO', splits };
  }
  return { metodo: mp, splits: [] };
}

function serializarMetodoPago(): string {
  if (metodoPagoEditado.value === 'MIXTO') {
    const partes = mixtoSplitsEdicion.value
      .filter(s => s.metodo && Number(s.monto) > 0)
      .map(s => `${s.metodo}-${Number(s.monto).toFixed(2)}`);
    return 'MIXTO:' + partes.join(',');
  }
  return metodoPagoEditado.value || 'EFECTIVO';
}

function agregarSplitMixtoEdicion() {
  if (mixtoSplitsEdicion.value.length >= 4) { mostrarMensaje('Máximo 4 métodos en pago mixto', 'info'); return; }
  const total = Number(historialVentaSeleccionada.value?.montoTotal ?? 0);
  const suma = mixtoSplitsEdicion.value.reduce((s, x) => s + Number(x.monto || 0), 0);
  mixtoSplitsEdicion.value.push({ metodo: 'EFECTIVO', monto: Math.max(0, Math.round((total - suma) * 100) / 100) });
}

function eliminarSplitMixtoEdicion(index: number) { mixtoSplitsEdicion.value.splice(index, 1); }

function calcularSubtotal(d: VentaDetalleDTO): number {
  const precio = Number(d.precioUnitarioVenta || 0);
  const cantidad = Number(d.cantidad || 0);
  const cobroEnvaseTotal = Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0);
  if (d.tipoPrecioAplicado === 'VENTA_GRAMAJE') return precio + cobroEnvaseTotal;
  return Math.round((precio * cantidad) + cobroEnvaseTotal);
}

function calcularSubtotalVenta(): number {
  return historialVentaDetalle.value.reduce((sum, d) => sum + calcularSubtotal(d), 0);
}

function calcularNuevoTotal(): number {
  return historialVentaDetalle.value.reduce((sum, d) => sum + calcularSubtotal(d), 0);
}

function iniciarEdicionDetalle() {
  montoTotalEditado.value = Number(historialVentaSeleccionada.value?.montoTotal ?? 0);
  montoTotalInput.value = Math.round(Number(historialVentaSeleccionada.value?.montoTotal ?? 0));
  totalManualEditado.value = false;
  const { metodo, splits } = parsearMetodoPago(historialVentaSeleccionada.value?.metodoPago);
  metodoPagoEditado.value = metodo;
  mixtoSplitsEdicion.value = splits;
  modoEdicionDetalle.value = true;
}

function iniciarEditarItem(index: number) {
  const item = historialVentaDetalle.value[index];
  const prod = item.producto || item.Producto;
  const isGramaje = item.tipoPrecioAplicado === 'VENTA_GRAMAJE' || prod?.is_gramaje === true;
  if (isGramaje && prod) {
    const productoModal = {
      id: prod.idProducto, nombre: prod.nombre, precio: prod.precio_venta || 0, codigo_barras: prod.codigoBarras || ''
    };
    gramajeItemEditando.value = {
      id: Number(item.idVentaDetalle) || Date.now(), cantidad: item.cantidad,
      precio: Number(item.precioUnitarioVenta), nombre: prod.nombre || '', is_gramaje: true
    } as any;
    gramajeEditandoDesdeHistorial.value = true;
    gramajeEditandoIndice.value = index;
    modalProductoGramaje.value = productoModal;
    gramajeEditandoCantidad.value = item.cantidad;
    gramajeEditandoPrecio.value = Number(item.precioUnitarioVenta);
    setTimeout(() => { modalGramajeAbierto.value = true; }, 100);
  } else {
    detalleEditandoIndex.value = index;
    cantidadTemporal.value = item.cantidad;
    precioTemporal.value = Number(item.precioUnitarioVenta);
  }
}

function confirmarEdicionItem(index: number) {
  historialVentaDetalle.value[index].cantidad = cantidadTemporal.value;
  historialVentaDetalle.value[index].precioUnitarioVenta = Math.round(precioTemporal.value * 100) / 100;
  if (!totalManualEditado.value) { montoTotalEditado.value = calcularNuevoTotal(); montoTotalInput.value = montoTotalEditado.value; }
  detalleEditandoIndex.value = null;
}

function cancelarEdicionItem() { detalleEditandoIndex.value = null; }

function onTotalManualChange() {
  montoTotalEditado.value = montoTotalInput.value;
  totalManualEditado.value = true;
}

async function guardarCambiosDetalle() {
  if (!historialVentaSeleccionada.value) return;
  try {
    if (historialVentaDetalle.value.length === 0) { mostrarMensaje('La venta debe tener al menos un producto', 'error'); return; }

    if (metodoPagoEditado.value === 'MIXTO') {
      const suma = mixtoSplitsEdicion.value.reduce((s, x) => s + Number(x.monto || 0), 0);
      const totalVenta = Number(historialVentaSeleccionada.value?.montoTotal ?? 0);
      if (Math.round(suma * 100) / 100 !== Math.round(totalVenta * 100) / 100) {
        mostrarMensaje(`El desglose mixto debe sumar el total (${formatoMoneda(totalVenta)})`, 'error');
        return;
      }
    }

    const totalFinal = totalManualEditado.value
      ? Number(montoTotalInput.value || 0)
      : Math.round(calcularNuevoTotal());
    const metodoFinal = serializarMetodoPago();

    const detallesPayload = historialVentaDetalle.value.map(d => {
      const prod = d.producto || d.Producto;
      const cobraEnvase = Number(d.cobroEnvaseTotal ?? d.cobro_envase_total ?? 0) > 0;
      return {
        idVentaDetalle: d.idVentaDetalle,
        Producto: prod ? { idProducto: prod.idProducto } : null,
        cantidad: d.cantidad,
        precioUnitarioVenta: Math.round(Number(d.precioUnitarioVenta) * 100) / 100,
        tipoPrecioAplicado: d.tipoPrecioAplicado || 'VENTA',
        cobroEnvase: cobraEnvase,
        cantidadEnvase: cobraEnvase ? (d.cantidadEnvase ?? d.cantidad ?? 0) : 0
      };
    });

    await getJson<ApiRespuesta<VentaDTO>>(`/ventas/actualizarVentaCompleta/${historialVentaSeleccionada.value.idVenta}`, {
      method: 'PUT',
      body: JSON.stringify({
        venta: { idVenta: historialVentaSeleccionada.value.idVenta, montoTotal: totalFinal, metodoPago: metodoFinal },
        detalles: detallesPayload
      })
    });
    window.dispatchEvent(new CustomEvent('venta-completada', { detail: { ventaId: historialVentaSeleccionada.value.idVenta, montoTotal: totalFinal } }));
    mostrarMensaje('Venta actualizada correctamente', 'ok');
    modoEdicionDetalle.value = false;
    montoTotalInput.value = totalFinal;
    await cargarHistorialVentasDia();
    cerrarDetalleVenta();
  } catch (error) { mostrarMensaje('Error al guardar cambios', 'error'); }
}

function cancelarEdicionDetalle() {
  modoEdicionDetalle.value = false;
  detalleEditandoIndex.value = null;
  totalManualEditado.value = false;
  busquedaEditar.value = '';
  resultadosEditar.value = [];
  metodoPagoEditado.value = '';
  mixtoSplitsEdicion.value = [];
}

async function buscarProductoEditar() {
  const termino = busquedaEditar.value.trim();
  if (!termino) { resultadosEditar.value = []; return; }
  cargandoBusquedaEditar.value = true;
  try {
    const { buscarProductoPorCodigoBarras, buscarProducto } = await import('./usePosProductos');
    const producto = await buscarProductoPorCodigoBarras(termino);
    if (producto) resultadosEditar.value = [producto];
    else { const resultado = await buscarProducto(termino); resultadosEditar.value = resultado ? [resultado] : []; }
  } catch (e) { resultadosEditar.value = []; }
  finally { cargandoBusquedaEditar.value = false; }
}

async function agregarProductoADetalle(producto: Producto) {
  if (!historialVentaSeleccionada.value) return;
  try {
    const { verDetalleVenta } = await import('./usePosCobro');
    const precioUnitario = producto.precio_venta || 0;
    await getJson<ApiRespuesta<unknown>>('/ventasDetalle/agregarVentaDetalle', {
      method: 'POST',
      body: JSON.stringify({
        Venta: { idVenta: historialVentaSeleccionada.value.idVenta },
        Producto: { idProducto: producto.idProducto },
        cantidad: 1, precioUnitarioVenta: precioUnitario,
        tipoPrecioAplicado: producto.is_gramaje ? 'VENTA_GRAMAJE' : 'VENTA',
        cobroEnvase: Boolean(producto.requiere_envase),
        cantidadEnvase: producto.requiere_envase ? 1 : 0
      })
    });
    if (producto.is_gramaje) {
      modalProductoGramaje.value = producto;
      gramajeEditandoDesdeHistorial.value = true;
      gramajeEditandoIndice.value = historialVentaDetalle.value.length;
      setTimeout(() => { modalGramajeAbierto.value = true; }, 100);
    }
    mostrarMensaje(`Agregado: ${producto.nombre}`, 'ok');
    busquedaEditar.value = '';
    resultadosEditar.value = [];
    await verDetalleVenta(historialVentaSeleccionada.value);
    if (!totalManualEditado.value) {
      montoTotalEditado.value = calcularNuevoTotal();
      montoTotalInput.value = Math.round(montoTotalEditado.value);
    }
  } catch (error) { mostrarMensaje('Error al agregar producto', 'error'); }
}

async function eliminarDetalleVenta(index: number) {
  const detalle = historialVentaDetalle.value[index];
  if (!detalle?.idVentaDetalle) return;
  if (!confirm(`¿Eliminar "${(detalle.producto || detalle.Producto)?.nombre}" de esta venta?`)) return;
  try {
    const response = await getJson<ApiRespuesta<unknown>>(`/ventasDetalle/eliminarVentaDetalle/${detalle.idVentaDetalle}`, { method: 'DELETE' });
    if (response?.codigo === 200) {
      historialVentaDetalle.value.splice(index, 1);
      if (!totalManualEditado.value) { montoTotalEditado.value = calcularNuevoTotal(); montoTotalInput.value = montoTotalEditado.value; }
      mostrarMensaje('Producto eliminado de la venta', 'ok');
    } else { mostrarMensaje(response?.mensaje || 'Error al eliminar producto', 'error'); }
  } catch (error) { mostrarMensaje('Error al eliminar producto', 'error'); }
}

async function eliminarTodosLosDetalles() {
  if (historialVentaDetalle.value.length === 0) { mostrarMensaje('No hay productos para eliminar', 'info'); return; }
  if (!confirm('¿Eliminar todos los productos de esta venta? Esta acción no se puede deshacer.')) return;
  try {
    for (const detalle of historialVentaDetalle.value) {
      if (detalle.idVentaDetalle) {
        await getJson<ApiRespuesta<unknown>>(`/ventasDetalle/eliminarVentaDetalle/${detalle.idVentaDetalle}`, { method: 'DELETE' });
      }
    }
    historialVentaDetalle.value = [];
    if (!totalManualEditado.value) { montoTotalEditado.value = 0; montoTotalInput.value = 0; }
    mostrarMensaje('Todos los productos han sido eliminados', 'ok');
  } catch (error) { mostrarMensaje('Error al eliminar productos', 'error'); }
}

function cerrarDetalleVenta() {
  modalDetalleVentaAbierto.value = false;
  historialVentaSeleccionada.value = null;
  historialVentaDetalle.value = [];
  historialVentaTieneDiscrepancia.value = false;
  historialDiscrepanciaMonto.value = 0;
  detalleCreditoInfo.value = null;
  detalleAbonos.value = [];
}

export {
  modoEdicionDetalle, montoTotalEditado, detalleEditandoIndex,
  cantidadTemporal, precioTemporal, totalManualEditado, montoTotalInput,
  busquedaEditar, resultadosEditar, cargandoBusquedaEditar,
  historialVentaDetalle, historialVentaSeleccionada,
  metodoPagoEditado, mixtoSplitsEdicion,
  calcularSubtotal, calcularSubtotalVenta, calcularNuevoTotal,
  iniciarEdicionDetalle, iniciarEditarItem, confirmarEdicionItem,
  cancelarEdicionItem, onTotalManualChange, guardarCambiosDetalle,
  cancelarEdicionDetalle, buscarProductoEditar, agregarProductoADetalle,
  eliminarDetalleVenta, eliminarTodosLosDetalles, cerrarDetalleVenta,
  agregarSplitMixtoEdicion, eliminarSplitMixtoEdicion
};
