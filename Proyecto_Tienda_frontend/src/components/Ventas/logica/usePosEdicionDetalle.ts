import { ref, computed } from 'vue';
import type { ApiRespuesta, VentaDTO, VentaDetalleDTO, Producto } from './usePosTipos';
import { getJson, mostrarMensaje, formatoMoneda, formatoMonedaRedondeada } from './usePosTicket';
import { cargarHistorialVentasDia } from './usePosCobro';

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
const historialVentaDetalle = ref<any[]>([]);
const historialVentaSeleccionada = ref<any>(null);

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
  modoEdicionDetalle.value = true;
}

function iniciarEditarItem(index: number) {
  const item = historialVentaDetalle.value[index];
  const prod = item.producto || item.Producto;
  const isGramaje = item.tipoPrecioAplicado === 'VENTA_GRAMAJE' || prod?.is_gramaje === true;
  if (isGramaje && prod) {
    const { modalGramajeAbierto, modalProductoGramaje, gramajeItemEditando, gramajeEditandoDesdeHistorial, gramajeEditandoIndice, gramajeEditandoCantidad, gramajeEditandoPrecio } = require('./usePosGramaje');
    const productoModal = {
      id: prod.idProducto, nombre: prod.nombre, precio: prod.precio_venta || 0, codigo_barras: prod.codigoBarras || ''
    };
    gramajeItemEditando.value = {
      id: Number(item.idVentaDetalle) || Date.now(), cantidad: item.cantidad,
      precio: Number(item.precioUnitarioVenta), nombre: prod.nombre || '', is_gramaje: true
    };
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
    for (const detalle of historialVentaDetalle.value) {
      const precioRedondeado = Math.round(Number(detalle.precioUnitarioVenta) * 100) / 100;
      const prod = detalle.producto || detalle.Producto;
      await getJson<ApiRespuesta<unknown>>(`/ventasDetalle/actualizarVentaDetalle/${detalle.idVentaDetalle}`, {
        method: 'PUT',
        body: JSON.stringify({
          Venta: { idVenta: historialVentaSeleccionada.value.idVenta },
          Producto: prod ? { idProducto: prod.idProducto } : null,
          cantidad: detalle.cantidad, precioUnitarioVenta: precioRedondeado,
          tipoPrecioAplicado: detalle.tipoPrecioAplicado || 'VENTA'
        })
      });
    }
    await getJson<ApiRespuesta<VentaDTO>>(`/ventas/actualizarVenta/${historialVentaSeleccionada.value.idVenta}`, {
      method: 'PUT',
      body: JSON.stringify({ idVenta: historialVentaSeleccionada.value.idVenta, montoTotal: montoTotalEditado.value })
    });
    window.dispatchEvent(new CustomEvent('venta-completada', { detail: { ventaId: historialVentaSeleccionada.value.idVenta, montoTotal: montoTotalEditado.value } }));
    mostrarMensaje('Detalles actualizados correctamente', 'ok');
    modoEdicionDetalle.value = false;
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
    const { modalGramajeAbierto, modalProductoGramaje, gramajeEditandoDesdeHistorial, gramajeEditandoIndice } = await import('./usePosGramaje');
    const precioUnitario = producto.precio_venta || 0;
    await getJson<ApiRespuesta<unknown>>('/ventasDetalle/crearVentaDetalle', {
      method: 'POST',
      body: JSON.stringify({
        Venta: { idVenta: historialVentaSeleccionada.value.idVenta },
        Producto: { idProducto: producto.idProducto },
        cantidad: 1, precioUnitarioVenta: precioUnitario,
        tipoPrecioAplicado: producto.is_gramaje ? 'VENTA_GRAMAJE' : 'VENTA'
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
  const { modalDetalleVentaAbierto, detalleCreditoInfo, detalleAbonos, historialVentaTieneDiscrepancia, historialDiscrepanciaMonto } = require('./usePosCobro');
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
  calcularSubtotal, calcularSubtotalVenta, calcularNuevoTotal,
  iniciarEdicionDetalle, iniciarEditarItem, confirmarEdicionItem,
  cancelarEdicionItem, onTotalManualChange, guardarCambiosDetalle,
  cancelarEdicionDetalle, buscarProductoEditar, agregarProductoADetalle,
  eliminarDetalleVenta, eliminarTodosLosDetalles, cerrarDetalleVenta
};
