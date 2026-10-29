import { ref, computed } from 'vue';
import type { ApiRespuesta, Ticket, TicketItem, TicketItemPromocion, VentaPendienteDTO, Producto } from './usePosTipos';
import { playSound } from './usePosSonido';
import { useProductosCache } from '@/composables/useProductCache';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';
const AUTH_USER_ID_KEY = 'idUsuario';

const tickets = ref<Ticket[]>([]);
const ticketActualId = ref<number | null>(null);
const creandoTicket = ref(false);
const ticketDelDia = ref('1');
const mensaje = ref('');
const mensajeTipo = ref<'ok' | 'error' | 'info'>('info');

const ticketActual = computed(() => {
  if (ticketActualId.value === null) return null;
  return tickets.value.find(t => t.id === ticketActualId.value) ?? null;
});

const ticket = computed(() => {
  return (ticketActual.value?.items ?? []) as (TicketItem | TicketItemPromocion)[];
});

const totalVenta = computed(() => {
  return ticket.value.reduce((acumulado, item) => {
    if ((item as any).is_gramaje) {
      return acumulado + item.precio;
    }
    let subtotal = item.precio * item.cantidad;
    if ((item as any).envase_aplicado && (item as any).precio_envase) {
      const cantEnvase = (item as any).cantidad_envase || item.cantidad;
      subtotal += (item as any).precio_envase * cantEnvase;
    }
    return acumulado + subtotal;
  }, 0);
});

const totalArticulos = computed(() => {
  return ticket.value.reduce((acumulado, item) => acumulado + item.cantidad, 0);
});

const tieneProductosGranel = computed(() => {
  return ticket.value.some(item => (item as any).is_gramaje || item.cantidad > 100);
});

const tieneProductosUnitarios = computed(() => {
  return ticket.value.some(item => !(item as any).is_gramaje && item.cantidad <= 100);
});

const totalGramos = computed(() => {
  if (!tieneProductosGranel.value) return 0;
  return ticket.value.reduce((acumulado, item) => {
    if ((item as any).is_gramaje || item.cantidad > 100) {
      return acumulado + item.cantidad;
    }
    return acumulado;
  }, 0);
});

const totalUnitarios = computed(() => {
  if (!tieneProductosUnitarios.value) return 0;
  return ticket.value.reduce((acumulado, item) => {
    if (!(item as any).is_gramaje && item.cantidad <= 100) {
      return acumulado + item.cantidad;
    }
    return acumulado;
  }, 0);
});

const ticketInfoText = computed(() => {
  if (ticket.value.length === 0) return '0 items';
  const unitarios = totalUnitarios.value;
  const gramos = totalGramos.value;
  if (unitarios > 0 && gramos > 0) return `${unitarios} items, ${gramos}g`;
  if (gramos > 0) return `${gramos}g`;
  return `${unitarios} ${unitarios === 1 ? 'item' : 'items'}`;
});

const nombreUsuario = ref(localStorage.getItem('nombreUsuario') || 'Cajero');

function obtenerIdUsuarioSesion() {
  const id = Number(localStorage.getItem(AUTH_USER_ID_KEY) || '0');
  return Number.isFinite(id) && id > 0 ? id : null;
}

function obtenerIniciales(nombre?: string): string {
  if (!nombre || nombre === 'Cajero') return 'C';
  const partes = nombre.trim().split(/\s+/);
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  return partes[0][0].toUpperCase();
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(`${API_BASE}${url}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  return respuesta.json() as Promise<T>;
}

function mostrarMensaje(texto: string, tipo: 'ok' | 'error' | 'info') {
  mensaje.value = texto;
  mensajeTipo.value = tipo;
  setTimeout(() => { mensaje.value = ''; }, 3000);
}

async function cargarSiguienteTicket() {
  try {
    const res = await getJson<ApiRespuesta<number>>('/ventas/siguienteNumeroTicket');
    if (res?.datos !== undefined && res.datos !== null) {
      ticketDelDia.value = String(res.datos);
    }
  } catch (e) {
    console.error('Error al cargar siguiente ticket:', e);
  }
}

async function crearVentaPendienteEnBackend() {
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) return;
  if (creandoTicket.value) return;
  creandoTicket.value = true;
  try {
    const payload = { idUsuario, montoTotal: 0, estatus: 'P', metodoPago: 'EFECTIVO', numeroTicket: 0 };
    const data = await getJson<ApiRespuesta<VentaPendienteDTO>>(`/ventas/agregarVenta`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (data?.codigo === 200 && data?.datos) {
      const venta = data.datos;
      const ticketExistente = tickets.value.find(t => t.id === venta.idVenta);
      if (ticketExistente) { ticketActualId.value = venta.idVenta; return; }
      ticketDelDia.value = String(venta.numeroTicket);
      const nuevoTicket: Ticket = {
        id: venta.idVenta,
        numero: Number(venta.numeroTicket ?? 0),
        items: [],
        estado: 'pendiente',
        creadoEn: Date.now(),
        desdeBackend: true,
        nombreUsuario: venta.nombreUsuario || venta.usuario?.nombre || nombreUsuario.value
      };
      tickets.value.push(nuevoTicket);
      ticketActualId.value = nuevoTicket.id;
      mostrarMensaje(`Creado ticket #${venta.numeroTicket}`, 'info');
    }
  } catch (_error) {
    console.error('Error al crear venta pendiente:', _error);
    mostrarMensaje('Error al crear ticket. Reintenta.', 'error');
  } finally {
    creandoTicket.value = false;
  }
}

async function crearNuevoTicket() {
  await crearVentaPendienteEnBackend();
}

async function cargarTicketsDesdeBackend() {
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) { ticketDelDia.value = 'N/D'; return; }
  try {
    const esAdmin = Number(localStorage.getItem('tipoUsuario') || 2) === 1;
    const modoReportes = localStorage.getItem('modoReportes') === 'true';
    const verTodos = esAdmin && modoReportes;
    const url = verTodos ? '/ventas/buscarVentasPendientes' : `/ventas/buscarVentasPendientes?idUsuario=${idUsuario}`;
    const response = await getJson<ApiRespuesta<VentaPendienteDTO[]>>(url);
    if (response?.codigo === 200 && response?.datos) {
      const ventasPendientes = response.datos;
      if (ventasPendientes.length > 0) {
        tickets.value = [];
        ticketActualId.value = null;
        for (const venta of ventasPendientes) {
          const nuevoTicket: Ticket = {
            id: venta.idVenta,
            numero: Number(venta.numeroTicket ?? 0),
            items: [],
            estado: 'pendiente',
            creadoEn: Date.now(),
            desdeBackend: true,
            nombreUsuario: venta.nombreUsuario || venta.usuario?.nombre
          };
          tickets.value.push(nuevoTicket);
          try {
            const detallesResponse = await getJson<ApiRespuesta<any[]>>(`/ventasDetalle/porVenta/${venta.idVenta}`);
            if (detallesResponse?.codigo === 200 && detallesResponse?.datos) {
              for (const detalle of detallesResponse.datos) {
                const producto = detalle.Producto || detalle.producto;
                if (!producto) continue;
                let precio = Number(detalle.precioUnitarioVenta);
                const cantidad = detalle.cantidad;
                if (producto.is_gramaje && cantidad > 0) {
                  const precioTotal = precio * cantidad;
                  const precioRedondeado = Math.round(precioTotal);
                  precio = precioRedondeado / cantidad;
                }
                const cobroEnvaseFlag = Boolean((detalle as any).cobroEnvase ?? false);
                const cobroEnvaseTotal = Number((detalle as any).cobroEnvaseTotal ?? (detalle as any).cobro_envase_total ?? 0);
                const requiereEnvase = producto.requiere_envase ?? (producto as any).requiereEnvase ?? false;
                const precioEnvase = Number(producto.precio_envase ?? (producto as any).precioEnvase ?? 0);
                const cantidadEnvase = Number((detalle as any).cantidadEnvase ?? (detalle as any).cantidad_envase ?? 0);
                const item: TicketItem = {
                  id: producto.idProducto || producto.id,
                  nombre: producto.nombre,
                  cantidad,
                  precio,
                  precio_mayoreo: producto.precio_mayoreo != null ? Number(producto.precio_mayoreo) : null,
                  is_gramaje: producto.is_gramaje,
                  is_mayoreo: (producto.precio_mayoreo != null && Number(producto.precio_mayoreo) > 0 && precio === Number(producto.precio_mayoreo)),
                  dto: producto,
                  idVentaDetalle: detalle.idVentaDetalle,
                  codigo_barras: producto.codigoBarras || producto.codigo_barras || null,
                  requiere_envase: requiereEnvase,
                  precio_envase: precioEnvase,
                  envase_aplicado: cobroEnvaseFlag || cobroEnvaseTotal > 0,
                  cantidad_envase: cantidadEnvase > 0 ? cantidadEnvase : cantidad
                };
                nuevoTicket.items.push(item);
              }
            }
          } catch (e) {
            console.error('Error al cargar detalles del ticket', venta.idVenta, e);
          }
        }
        tickets.value.sort((a, b) => a.numero - b.numero);
        if (ticketActualId.value === null || !tickets.value.find(t => t.id === ticketActualId.value)) {
          const pendiente = tickets.value.find(t => t.estado === 'pendiente');
          if (pendiente) ticketActualId.value = pendiente.id;
          else if (tickets.value.length > 0) ticketActualId.value = tickets.value[0].id;
        }
        return;
      }
      tickets.value = [];
      ticketActualId.value = null;
    }
    if (tickets.value.length === 0) await crearVentaPendienteEnBackend();
  } catch (_error) {
    ticketDelDia.value = 'N/D';
    if (tickets.value.length === 0) await crearVentaPendienteEnBackend();
  }
}

function seleccionarTicket(id: number) {
  ticketActualId.value = id;
}

async function eliminarTicket(id: number) {
  const ticketIndex = tickets.value.findIndex(t => t.id === id);
  if (ticketIndex === -1) return;
  const tempTicketActual = ticketActualId.value;
  const ticketsBackup = [...tickets.value];
  tickets.value.splice(ticketIndex, 1);
  if (tickets.value.length === 0) await crearNuevoTicket();
  else if (tempTicketActual === id) {
    const pendiente = tickets.value.find(t => t.estado === 'pendiente');
    ticketActualId.value = pendiente?.id || tickets.value[0].id;
  }
  try {
    const response = await getJson<ApiRespuesta<unknown>>(`/ventas/eliminarVenta/${id}`, { method: 'DELETE' });
    if (response?.codigo !== 200) {
      tickets.value = ticketsBackup;
      ticketActualId.value = tempTicketActual;
      mostrarMensaje(response?.mensaje || 'Error al eliminar ticket', 'error');
      return;
    }
    mostrarMensaje('Ticket eliminado', 'ok');
  } catch (_error) {
    tickets.value = ticketsBackup;
    ticketActualId.value = tempTicketActual;
    console.error('Error al eliminar ticket del backend');
    mostrarMensaje('Error al eliminar ticket', 'error');
  }
}

async function crearDetalleVenta(ventaId: number, item: any) {
  const payload = {
    Venta: { idVenta: ventaId },
    Producto: item.dto,
    cantidad: item.cantidad,
    precioUnitarioVenta: item.precio,
    tipoPrecioAplicado: item.is_gramaje ? 'VENTA_GRAMAJE' : 'VENTA',
    cobroEnvase: item.envase_aplicado === true,
    cantidadEnvase: item.envase_aplicado === true ? (item.cantidad_envase || item.cantidad) : 0
  };
  let data;
  if (item.idVentaDetalle) {
    data = await getJson<ApiRespuesta<unknown>>(`/ventasDetalle/actualizarVentaDetalle/${item.idVentaDetalle}`, {
      method: 'PUT', body: JSON.stringify(payload)
    });
  } else {
    data = await getJson<ApiRespuesta<unknown>>(`/ventasDetalle/agregarVentaDetalle`, {
      method: 'POST', body: JSON.stringify(payload)
    });
    const responseData = data?.datos as { idVentaDetalle?: number } | null;
    if (data?.codigo === 200 && responseData?.idVentaDetalle) {
      item.idVentaDetalle = responseData.idVentaDetalle;
    }
  }
  if (data?.codigo !== 200) throw new Error(data?.mensaje || `No se pudo registrar detalle para ${item.nombre}.`);
}

async function aumentarCantidad(item: TicketItem) {
  const stockDisponible = item.dto?.stock ?? Infinity;
  if (stockDisponible <= 0) {
    mostrarMensaje(`Sin stock: ${item.nombre}`, 'error');
    return;
  }
  if (item.cantidad >= stockDisponible) {
    mostrarMensaje(`Stock maximo alcanzado: ${item.nombre} (${stockDisponible} unidades)`, 'error');
    return;
  }
  const cantidadAnterior = item.cantidad;
  item.cantidad += 1;
  if (item.idVentaDetalle && ticketActual.value) {
    try { await crearDetalleVenta(ticketActual.value.id, item); }
    catch (e) { item.cantidad = cantidadAnterior; }
  }
}

async function disminuirCantidad(item: TicketItem) {
  if (item.cantidad > 1) {
    const cantidadAnterior = item.cantidad;
    item.cantidad -= 1;
    if (item.idVentaDetalle && ticketActual.value) {
      try { await crearDetalleVenta(ticketActual.value.id, item); }
      catch (e) { item.cantidad = cantidadAnterior; }
    }
    return;
  }
  quitarItem(item.id);
}

async function quitarItem(id: number) {
  if (!ticketActual.value) return;
  const item = ticketActual.value.items.find(i => i.id === id);
  const idVentaDetalle = item?.idVentaDetalle;
  ticketActual.value.items = ticketActual.value.items.filter((item) => item.id !== id);
  playSound('remove');
  if (idVentaDetalle) {
    getJson<ApiRespuesta<unknown>>(`/ventasDetalle/eliminarVentaDetalle/${idVentaDetalle}`, { method: 'DELETE' }).catch(() => {});
  }
}

async function limpiarTicket() {
  if (!ticketActual.value) return;
  const items = ticketActual.value.items;
  const idsParaEliminar = items.filter(item => item.idVentaDetalle).map(item => item.idVentaDetalle);
  ticketActual.value.items = [];
  for (const id of idsParaEliminar) {
    getJson<ApiRespuesta<unknown>>(`/ventasDetalle/eliminarVentaDetalle/${id}`, { method: 'DELETE' }).catch(() => {});
  }
  mostrarMensaje('Ticket reiniciado.', 'info');
  playSound('clear');
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
}

function formatoMonedaRedondeada(valor: number) {
  const redondeado = Math.round(Number(valor || 0));
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(redondeado);
}

function formatearFecha(fecha?: string) {
  if (!fecha) return 'N/A';
  return fecha.slice(0, 10);
}

function formatearFechaHora(fecha?: string) {
  if (!fecha) return 'N/A';
  const d = new Date(fecha);
  return d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatoGramaje(gramos: number) {
  const g = Math.max(0, Math.round(gramos || 0));
  if (g >= 1000) return (g / 1000).toFixed(2) + ' kg';
  return g + ' g';
}

function getFechaHoy() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getMetodoClase(metodo: string | undefined): string {
  if (!metodo) return '';
  const m = metodo.toUpperCase();
  if (m.includes('TARJETA')) return 'tarjeta';
  if (m.includes('TRANSFERENCIA')) return 'transferencia';
  if (m.includes('EFECTIVO')) return 'efectivo';
  return '';
}

function formatImagenUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  if (url.startsWith('http')) {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const fileName = path.split('/').pop();
    const folder = path.split('/').slice(-2, -1)[0];
    if (fileName && folder) {
      return `${API_BASE}/imagenes/obtener/${folder}/${fileName}`;
    }
    return url;
  }
  return url;
}

export {
  tickets, ticketActualId, ticketActual, ticket, creandoTicket, ticketDelDia,
  totalVenta, totalArticulos, tieneProductosGranel, tieneProductosUnitarios,
  totalGramos, totalUnitarios, ticketInfoText, nombreUsuario, mensaje, mensajeTipo,
  obtenerIdUsuarioSesion, obtenerIniciales, getJson, mostrarMensaje,
  cargarSiguienteTicket, crearVentaPendienteEnBackend, crearNuevoTicket,
  cargarTicketsDesdeBackend, seleccionarTicket, eliminarTicket,
  crearDetalleVenta, aumentarCantidad, disminuirCantidad, quitarItem, limpiarTicket,
  formatoMoneda, formatoMonedaRedondeada, formatearFecha, formatearFechaHora,
  formatoGramaje, getFechaHoy, getMetodoClase, formatImagenUrl
};
