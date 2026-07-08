import { ref } from 'vue';
import type { TicketItem } from './usePosTipos';
import { ticketActual, crearNuevoTicket, crearDetalleVenta, mostrarMensaje } from './usePosTicket';
import { playSound } from './usePosSonido';

const modalGramajeAbierto = ref(false);
const modalProductoGramaje = ref<any>(null);
const gramajeItemEditando = ref<TicketItem | null>(null);
const gramajeEditandoDesdeHistorial = ref(false);
const gramajeEditandoIndice = ref<number | null>(null);
const gramajeEditandoCantidad = ref<number>(0);
const gramajeEditandoPrecio = ref<number>(0);

async function agregarProductoGramaje(payload: { gramos: number; precioTotal: number }) {
  const producto = modalProductoGramaje.value;
  if (!producto) { mostrarMensaje('No se encontro el producto de gramaje.', 'error'); return; }

  if (gramajeEditandoDesdeHistorial.value && gramajeEditandoIndice.value !== null) {
    const index = gramajeEditandoIndice.value;
    const gramos = Math.max(1, Math.round(payload.gramos));
    const precioTotal = Math.round(payload.precioTotal * 100) / 100;
    const { historialVentaDetalle, totalManualEditado, montoTotalEditado, montoTotalInput, calcularNuevoTotal } = await import('./usePosEdicionDetalle');
    historialVentaDetalle.value[index].cantidad = gramos;
    historialVentaDetalle.value[index].precioUnitarioVenta = precioTotal;
    historialVentaDetalle.value[index].tipoPrecioAplicado = 'VENTA_GRAMAJE';
    if (!totalManualEditado.value) { montoTotalEditado.value = calcularNuevoTotal(); montoTotalInput.value = montoTotalEditado.value; }
    gramajeItemEditando.value = null;
    gramajeEditandoDesdeHistorial.value = false;
    gramajeEditandoIndice.value = null;
    modalGramajeAbierto.value = false;
    modalProductoGramaje.value = null;
    mostrarMensaje(`Actualizado ${gramos}g de ${producto.nombre}.`, 'ok');
    return;
  }

  if (!ticketActual.value) {
    await crearNuevoTicket();
    if (!ticketActual.value) { mostrarMensaje('No se pudo crear el ticket', 'error'); return; }
  }

  const gramos = Math.max(1, Math.round(payload.gramos));
  const precioTotal = Math.round(payload.precioTotal * 100) / 100;
  const items = ticketActual.value!.items;

  if (gramajeItemEditando.value) {
    const existente = gramajeItemEditando.value;
    existente.cantidad = gramos;
    existente.precio = precioTotal;
    try { await crearDetalleVenta(ticketActual.value.id, existente); }
    catch (e) { throw e; }
    gramajeItemEditando.value = null;
    modalGramajeAbierto.value = false;
    modalProductoGramaje.value = null;
    mostrarMensaje(`Actualizado ${gramos}g de ${producto.nombre}.`, 'ok');
    playSound('add');
    return;
  }

  const existente = items.find((item) => item.id === producto.id);
  if (existente) {
    existente.cantidad += gramos;
    existente.precio = precioTotal;
    try { await crearDetalleVenta(ticketActual.value.id, existente); }
    catch (e) { existente.cantidad -= gramos; throw e; }
  } else {
    items.push({ ...producto, cantidad: gramos, precio: precioTotal });
    try { const nuevoItem = items[items.length - 1]; await crearDetalleVenta(ticketActual.value.id, nuevoItem); }
    catch (e) { items.pop(); throw e; }
  }

  modalGramajeAbierto.value = false;
  modalProductoGramaje.value = null;
  mostrarMensaje(`Agregado ${gramos}g de ${producto.nombre}.`, 'ok');
  playSound('add');
}

function editarGramajeItem(item: TicketItem) {
  gramajeItemEditando.value = item;
  modalProductoGramaje.value = {
    id: item.id, nombre: item.nombre, precio: item.precio * 1000,
    codigo_barras: item.codigo_barras ?? null, dto: item.dto, is_gramaje: item.is_gramaje
  };
  modalGramajeAbierto.value = true;
}

export {
  modalGramajeAbierto, modalProductoGramaje, gramajeItemEditando,
  gramajeEditandoDesdeHistorial, gramajeEditandoIndice,
  gramajeEditandoCantidad, gramajeEditandoPrecio,
  agregarProductoGramaje, editarGramajeItem
};
