<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, markRaw } from 'vue';
import EntradaEfectivoModal from './modals/EntradaEfectivoModal.vue';
import SalidaEfectivoModal from './modals/SalidaEfectivoModal.vue';
import HistorialVentasModal from './modals/HistorialVentasModal.vue';
import CalculadoraGramajeModal from './modals/CalculadoraGramajeModal.vue';
import CobroModal from './modals/CobroModal.vue';

const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playSound(type: 'add' | 'remove' | 'clear' | 'cash') {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  switch (type) {
    case 'add':
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      break;
    case 'remove':
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      break;
    case 'clear':
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      break;
    case 'cash':
      for (let i = 0; i < 3; i++) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(523, audioContext.currentTime + i * 0.15);
        osc.frequency.setValueAtTime(659, audioContext.currentTime + i * 0.15 + 0.1);
        gain.gain.setValueAtTime(0.3, audioContext.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.15 + 0.2);
        osc.start(audioContext.currentTime + i * 0.15);
        osc.stop(audioContext.currentTime + i * 0.15 + 0.2);
      }
      break;
  }
}

type ApiRespuesta<T> = {
  codigo: number;
  mensaje: string;
  datos: T;
};

type ProductoDTO = {
  idProducto: number;
  nombre: string;
  precio_venta: number | string;
  codigoBarras: string;
  stock?: number;
  is_gramaje?: boolean;
};

type UsuarioDTO = {
  idUsuario: number;
  nombre?: string;
};

type VentaDTO = {
  idVenta: number;
  usuario: UsuarioDTO;
  montoTotal?: number | string;
  estatus?: string;
  numeroTicket?: number;
  metodoPago?: string;
  fechaVenta?: string;
};

type VentaDetalleDTO = {
  cantidad: number;
  precioUnitarioVenta: number;
  producto?: ProductoDTO;
};

type VentaPendienteDTO = VentaDTO;

type Producto = {
  id: number;
  nombre: string;
  codigo_barras: string | null;
  precio: number;
  dto: ProductoDTO;
  is_gramaje?: boolean;
};

type TicketItem = Producto & {
  cantidad: number;
  idVentaDetalle?: number;
};

type Ticket = {
  id: number;
  numero: number;
  items: TicketItem[];
  estado: 'pendiente' | 'completado';
  creadoEn: number;
  desdeBackend?: boolean;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const AUTH_USER_ID_KEY = 'idUsuario';

async function cargarTicketsDesdeBackend() {
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) {
    ticketDelDia.value = 'N/D';
    return;
  }

  try {
    const response = await getJson<ApiRespuesta<VentaPendienteDTO[]>>(`${API_BASE}/ventas/buscarVentasPendientes`);

    if (response?.codigo === 200 && response?.datos) {
      const ventasPendientes = response.datos;
      
      if (ventasPendientes.length > 0) {
        tickets.value = [];
        
        for (const venta of ventasPendientes) {
          const nuevoTicket: Ticket = {
            id: venta.idVenta,
            numero: Number(venta.numeroTicket ?? 0),
            items: [],
            estado: 'pendiente',
            creadoEn: Date.now(),
            desdeBackend: true
          };
          tickets.value.push(nuevoTicket);
          
          try {
            const detallesResponse = await getJson<ApiRespuesta<any[]>>(`${API_BASE}/ventasDetalle/porVenta/${venta.idVenta}`);
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
                
                const item: TicketItem = {
                  id: producto.idProducto,
                  nombre: producto.nombre,
                  cantidad,
                  precio,
                  is_gramaje: producto.is_gramaje,
                  dto: producto,
                  idVentaDetalle: detalle.idVentaDetalle
                };
                nuevoTicket.items.push(item);
              }
            }
          } catch (e) {
            console.error('Error al cargar detalles del ticket', venta.idVenta, e);
          }
        }
        
        tickets.value.sort((a, b) => a.numero - b.numero);
        
        const maxTicket = Math.max(...ventasPendientes.map(v => Number(v.numeroTicket ?? 0)));
        ticketDelDia.value = String(maxTicket);
        
        if (ticketActualId.value === null || !tickets.value.find(t => t.id === ticketActualId.value)) {
          const pendiente = tickets.value.find(t => t.estado === 'pendiente');
          if (pendiente) {
            ticketActualId.value = pendiente.id;
          } else if (tickets.value.length > 0) {
            ticketActualId.value = tickets.value[0].id;
          }
        }
        return;
      }
    }
    
    if (tickets.value.length === 0) {
      await crearVentaPendienteEnBackend();
    }
  } catch (_error) {
    ticketDelDia.value = 'N/D';
    if (tickets.value.length === 0) {
      await crearVentaPendienteEnBackend();
    }
  }
}

async function crearVentaPendienteEnBackend() {
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) return;

  try {
    const payload = {
      usuario: { idUsuario },
      montoTotal: 0,
      estatus: 'P',
      metodoPago: 'EFECTIVO',
      numeroTicket: 0
    };

    const data = await getJson<ApiRespuesta<VentaPendienteDTO>>(`${API_BASE}/ventas/agregarVenta`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (data?.codigo === 200 && data?.datos) {
      const venta = data.datos;
      
      const ticketExistente = tickets.value.find(t => t.id === venta.idVenta);
      if (ticketExistente) {
        ticketActualId.value = venta.idVenta;
        return;
      }
      
      ticketDelDia.value = String(venta.numeroTicket);
      
      const nuevoTicket: Ticket = {
        id: venta.idVenta,
        numero: Number(venta.numeroTicket ?? 0),
        items: [],
        estado: 'pendiente',
        creadoEn: Date.now(),
        desdeBackend: true
      };
      
      tickets.value.push(nuevoTicket);
      ticketActualId.value = nuevoTicket.id;
      mostrarMensaje(`Creado ticket #${venta.numeroTicket}`, 'info');
    }
  } catch (_error) {
    console.error('Error al crear venta pendiente:', _error);
  }
}

async function crearNuevoTicket() {
  await crearVentaPendienteEnBackend();
}

function seleccionarTicket(id: number) {
  ticketActualId.value = id;

}

async function eliminarTicket(id: number) {
  if (!confirm('¿Eliminar este ticket?')) return;
  
  try {
    const response = await getJson<ApiRespuesta<unknown>>(`${API_BASE}/ventas/eliminarVenta/${id}`, {
      method: 'DELETE'
    });
    
    if (response?.codigo !== 200) {
      mostrarMensaje(response?.mensaje || 'Error al eliminar ticket', 'error');
      return;
    }
    
    mostrarMensaje('Ticket eliminado', 'ok');
  } catch (_error) {
    console.error('Error al eliminar ticket del backend');
    mostrarMensaje('Error al eliminar ticket', 'error');
    return;
  }
  
  const ticketIndex = tickets.value.findIndex(t => t.id === id);
  if (ticketIndex === -1) return;
  
  tickets.value.splice(ticketIndex, 1);
  
  if (tickets.value.length === 0) {
    await crearNuevoTicket();
  } else if (ticketActualId.value === id) {
    const pendiente = tickets.value.find(t => t.estado === 'pendiente');
    if (pendiente) {
      ticketActualId.value = pendiente.id;
    } else {
      ticketActualId.value = tickets.value[0].id;
    }
  }
}

const terminoBusqueda = ref('');
const productos = shallowRef<Producto[]>([]);
const tickets = ref<Ticket[]>([]);
const ticketActualId = ref<number | null>(null);
const mensaje = ref('');
const mensajeTipo = ref<'ok' | 'error' | 'info'>('info');
const nombreUsuario = ref(localStorage.getItem('nombreUsuario') || 'Cajero');
const sugerenciasVisibles = ref(false);
const indiceSugerenciaActiva = ref(-1);
const ticketDelDia = ref('1');
const isRecording = ref(false);
const scannerActivo = ref(false);
const recognition = ref<any>(null);
const modalEntradaAbierto = ref(false);
const modalSalidaAbierto = ref(false);
const modalHistorialAbierto = ref(false);
const modalGramajeAbierto = ref(false);
const modalProductoGramaje = ref<Producto | null>(null);
const modalCobroAbierto = ref(false);
const historialCargando = ref(false);
const historialCobroTotal = ref(0);
const historialGananciaTotal = ref(0);
const historialVentas = ref<VentaDTO[]>([]);
const historialDetalleCargando = ref(false);
const historialVentaDetalle = ref<VentaDetalleDTO[]>([]);
const historialVentaSeleccionada = ref<VentaDTO | null>(null);
const modalDetalleVentaAbierto = ref(false);

const ticketActual = computed(() => {
  if (ticketActualId.value === null) return null;
  return tickets.value.find(t => t.id === ticketActualId.value) ?? null;
});

const ticket = computed(() => {
  return ticketActual.value?.items ?? [];
});

const totalVenta = computed(() => {
  return ticket.value.reduce((acumulado, item) => acumulado + item.precio * item.cantidad, 0);
});

const totalArticulos = computed(() => {
  return ticket.value.reduce((acumulado, item) => acumulado + item.cantidad, 0);
});

const sugerenciasPorNombre = computed(() => {
  const query = terminoBusqueda.value.trim().toLowerCase();
  let resultados = productos.value;
  
  if (query) {
    resultados = productos.value.filter(p => 
      p.nombre.toLowerCase().includes(query) ||
      (p.codigo_barras && p.codigo_barras.includes(query))
    );
  }
  
  return resultados
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .slice(0, 50);
});

onMounted(async () => {
  await cargarProductos();
  await cargarTicketsDesdeBackend();
});

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!respuesta.ok) {
    throw new Error(`HTTP ${respuesta.status}`);
  }

  return respuesta.json() as Promise<T>;
}

function normalizarProductos(data: ProductoDTO[] | null | undefined): Producto[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      const id = Number(item?.idProducto ?? 0);
      const nombre = String(item?.nombre ?? '').trim();
      const codigo = String(item?.codigoBarras ?? '').trim();
      const precio = Number(item?.precio_venta ?? 0);

      return {
        id,
        nombre,
        codigo_barras: codigo.length ? codigo : null,
        precio,
        dto: markRaw(item),
        is_gramaje: item.is_gramaje
      };
    })
    .filter((p) => p.id > 0 && p.nombre.length > 0 && Number.isFinite(p.precio));
}

async function cargarProductos() {
  try {
    const data = await getJson<ApiRespuesta<ProductoDTO[]>>(`${API_BASE}/productos/listarProductos`);
    productos.value = normalizarProductos(data?.datos);
    mostrarMensaje(data?.mensaje || 'Catalogo cargado.', 'ok');
  } catch (_error) {
    productos.value = [];
    mostrarMensaje('No se pudo cargar el catalogo de productos.', 'error');
  }
}

function getFechaHoy() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function buscarProductoPorCodigoBarras(codigo: string): Promise<Producto | null> {
  try {
    const data = await getJson<ApiRespuesta<ProductoDTO>>(
      `${API_BASE}/productos/buscarPorCodigoBarras/${encodeURIComponent(codigo)}`
    );
    const normalizados = normalizarProductos(data?.datos ? [data.datos] : []);
    return normalizados[0] ?? null;
  } catch (_error) {
    return null;
  }
}

async function buscarProducto(termino: string): Promise<Producto | null> {
  const query = termino.trim().toLowerCase();
  if (!query) return null;

  const porCodigo = productos.value.find((p) => (p.codigo_barras || '').toLowerCase() === query);
  if (porCodigo) return porCodigo;

  const porNombreExacto = productos.value.find((p) => p.nombre.toLowerCase() === query);
  if (porNombreExacto) return porNombreExacto;

  const porNombreParcial = productos.value.find((p) => p.nombre.toLowerCase().includes(query));
  if (porNombreParcial) return porNombreParcial;

  const desdeCodigo = await buscarProductoPorCodigoBarras(query);
  return desdeCodigo;
}

function manejarFocusBusqueda() {
  sugerenciasVisibles.value = true;
}

function manejarInputBusqueda() {
  sugerenciasVisibles.value = true;
  indiceSugerenciaActiva.value = -1;
}

async function agregarDesdeBuscador() {
  if (sugerenciasVisibles.value && indiceSugerenciaActiva.value >= 0) {
    const seleccion = sugerenciasPorNombre.value[indiceSugerenciaActiva.value];
    if (seleccion) {
      seleccionarSugerencia(seleccion);
      return;
    }
  }

  const producto = await buscarProducto(terminoBusqueda.value);

  if (!producto) {
    mostrarMensaje('Producto no encontrado.', 'error');
    return;
  }

  agregarProductoATicket(producto);
  terminoBusqueda.value = '';
  sugerenciasVisibles.value = false;
  indiceSugerenciaActiva.value = -1;
}

async function agregarProductoATicket(producto: Producto) {
  if (!ticketActual.value) {
    await crearNuevoTicket();
  }

  const stockDisponible = producto.dto?.stock ?? Infinity;

  if (stockDisponible <= 0) {
    mostrarMensaje(`Sin stock: ${producto.nombre}`, 'error');
    return;
  }

  if (producto.is_gramaje) {
    modalProductoGramaje.value = producto;
    modalGramajeAbierto.value = true;
    return;
  }

  const items = ticketActual.value!.items;
  const existente = items.find((item) => item.id === producto.id);

  if (existente) {
    const cantidadActual = existente.cantidad;
    if (cantidadActual >= stockDisponible) {
      mostrarMensaje(`Stock maximo alcanzado: ${producto.nombre} (${stockDisponible} unidades)`, 'error');
      return;
    }
    existente.cantidad += 1;
    try {
      await crearDetalleVenta(ticketActual.value.id, existente);
    } catch (e) {
      existente.cantidad -= 1;
      throw e;
    }
  } else {
    items.push({ ...producto, cantidad: 1 });
    try {
      const nuevoItem = items[items.length - 1];
      await crearDetalleVenta(ticketActual.value.id, nuevoItem);
    } catch (e) {
      items.pop();
      throw e;
    }
  }


  mostrarMensaje(`Agregado: ${producto.nombre}`, 'ok');
  playSound('add');
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
    try {
      await crearDetalleVenta(ticketActual.value.id, item);
    } catch (e) {
      item.cantidad = cantidadAnterior;
    }
  }
}

async function disminuirCantidad(item: TicketItem) {
  if (item.cantidad > 1) {
    const cantidadAnterior = item.cantidad;
    item.cantidad -= 1;
    
    if (item.idVentaDetalle && ticketActual.value) {
      try {
        await crearDetalleVenta(ticketActual.value.id, item);
      } catch (e) {
        item.cantidad = cantidadAnterior;
      }
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
    getJson<ApiRespuesta<unknown>>(`${API_BASE}/ventasDetalle/eliminarVentaDetalle/${idVentaDetalle}`, {
      method: 'DELETE'
    }).catch(() => {});
  }
}

async function limpiarTicket() {
  if (!ticketActual.value) return;
  
  const items = ticketActual.value.items;
  const idsParaEliminar = items
    .filter(item => item.idVentaDetalle)
    .map(item => item.idVentaDetalle);
  
  ticketActual.value.items = [];

  for (const id of idsParaEliminar) {
    getJson<ApiRespuesta<unknown>>(`${API_BASE}/ventasDetalle/eliminarVentaDetalle/${id}`, {
      method: 'DELETE'
    }).catch(() => {});
  }
  
  mostrarMensaje('Ticket reiniciado.', 'info');
  playSound('clear');
}

function obtenerIdUsuarioSesion() {
  const id = Number(localStorage.getItem(AUTH_USER_ID_KEY) || '0');
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function crearVenta(idUsuario: number): Promise<VentaDTO> {
  const payload = {
    usuario: { idUsuario },
    montoTotal: totalVenta.value,
    estatus: 'P',
    metodoPago: 'EFECTIVO',
    numeroTicket: ticketActual.value?.numero ?? 1
  };

  const data = await getJson<ApiRespuesta<VentaDTO>>(`${API_BASE}/ventas/agregarVenta`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (data?.codigo !== 200 || !data?.datos) {
    throw new Error(data?.mensaje || 'No se pudo crear la venta.');
  }

  return data.datos;
}

async function crearDetalleVenta(ventaId: number, item: TicketItem) {
  const payload = {
    Venta: { idVenta: ventaId },
    Producto: item.dto,
    cantidad: item.cantidad,
    precioUnitarioVenta: item.precio,
    tipoPrecioAplicado: item.is_gramaje ? 'VENTA_GRAMAJE' : 'VENTA'
  };

  let data;
  
  if (item.idVentaDetalle) {
    data = await getJson<ApiRespuesta<unknown>>(`${API_BASE}/ventasDetalle/actualizarVentaDetalle/${item.idVentaDetalle}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  } else {
    data = await getJson<ApiRespuesta<unknown>>(`${API_BASE}/ventasDetalle/agregarVentaDetalle`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    if (data?.codigo === 200 && data?.datos?.idVentaDetalle) {
      item.idVentaDetalle = data.datos.idVentaDetalle;
    }
  }

  if (data?.codigo !== 200) {
    throw new Error(data?.mensaje || `No se pudo registrar detalle para ${item.nombre}.`);
  }
}

async function completarVenta(idVenta: number, metodoPago: 'EFECTIVO' | 'TRANSFERENCIA', montoTotal: number) {
  const data = await getJson<ApiRespuesta<unknown>>(
    `${API_BASE}/ventas/completarVenta/${idVenta}?montoTotal=${encodeURIComponent(montoTotal.toString())}&metodoPago=${metodoPago}`,
    { method: 'PUT' }
  );

  if (data?.codigo !== 200) {
    throw new Error(data?.mensaje || 'No se pudo completar la venta.');
  }
}

function cobrar() {
  if (ticket.value.length === 0) {
    mostrarMensaje('No hay productos en el ticket.', 'error');
    return;
  }
  modalCobroAbierto.value = true;
}

async function procesarCobro(metodoPago: 'EFECTIVO' | 'TRANSFERENCIA') {
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) {
    mostrarMensaje('No se encontro sesion de usuario. Cierra sesion y vuelve a iniciar.', 'error');
    return;
  }

  if (!ticketActual.value || ticketActual.value.items.length === 0) {
    mostrarMensaje('No hay productos en el ticket.', 'error');
    return;
  }

  try {
    const montoCobrado = totalVenta.value;
    const ventaId = ticketActual.value.id;
    const numeroTicket = ticketActual.value.numero;
    
    await Promise.all(ticketActual.value.items.map((item) => crearDetalleVenta(ventaId, item)));
    await completarVenta(ventaId, metodoPago, montoCobrado);
    const numeroTicketVenta = numeroTicket ? ` Ticket #${numeroTicket}.` : '';
    
    tickets.value = tickets.value.filter(t => t.id !== ticketActual.value!.id);
    
    if (tickets.value.length === 0) {
      await crearNuevoTicket();
    } else {
      const pendiente = tickets.value.find(t => t.estado === 'pendiente');
      if (pendiente) {
        ticketActualId.value = pendiente.id;
      } else {
        ticketActualId.value = tickets.value[0].id;
      }
    }
    
  
    mostrarMensaje(`Venta cobrada por ${formatoMoneda(montoCobrado)} con ${metodoPago}.${numeroTicketVenta}`, 'ok');
    playSound('cash');
    modalCobroAbierto.value = false;
    await cargarTicketsDesdeBackend();
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error inesperado.';
    mostrarMensaje(`No se pudo cobrar: ${detalle}`, 'error');
  }
}

async function confirmarCobroEfectivo(payload: { montoRecibido: number }) {
  if (payload.montoRecibido < totalVenta.value) {
    mostrarMensaje('El monto recibido es menor al total.', 'error');
    return;
  }
  await procesarCobro('EFECTIVO');
}

async function confirmarCobroTransferencia() {
  await procesarCobro('TRANSFERENCIA');
}

async function registrarEntradaEfectivo(payload: { montoEoS: number; descripcion: string }) {
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) {
    mostrarMensaje('No se encontro sesion de usuario.', 'error');
    return;
  }

  try {
    const body = {
      montoEoS: payload.montoEoS,
      descripcion: payload.descripcion,
      usuario: { idUsuario }
    };
    const data = await getJson<ApiRespuesta<unknown>>(`${API_BASE}/caja/entrada`, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (data?.codigo !== 200) {
      throw new Error(data?.mensaje || 'No se pudo registrar la entrada.');
    }

    modalEntradaAbierto.value = false;
    mostrarMensaje('Entrada de efectivo registrada.', 'ok');
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error inesperado.';
    mostrarMensaje(`Error al registrar entrada: ${detalle}`, 'error');
  }
}

async function registrarSalidaEfectivo(payload: { montoEoS: number; descripcion: string }) {
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) {
    mostrarMensaje('No se encontro sesion de usuario.', 'error');
    return;
  }

  try {
    const body = {
      montoEoS: payload.montoEoS,
      descripcion: payload.descripcion,
      usuario: { idUsuario }
    };
    const data = await getJson<ApiRespuesta<unknown>>(`${API_BASE}/caja/salida`, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (data?.codigo !== 200) {
      throw new Error(data?.mensaje || 'No se pudo registrar la salida.');
    }

    modalSalidaAbierto.value = false;
    mostrarMensaje('Salida de efectivo registrada.', 'ok');
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error inesperado.';
    mostrarMensaje(`Error al registrar salida: ${detalle}`, 'error');
  }
}

async function cargarHistorialVentasDia() {
  historialCargando.value = true;
  try {
    const fechaHoy = getFechaHoy();
    const data = await getJson<ApiRespuesta<{ cobroTotal?: number | string; gananciaTotal?: number | string; ventas?: VentaDTO[] }>>(
      `${API_BASE}/ventas/obtenerVentaPorDia/${fechaHoy}`
    );

    historialCobroTotal.value = Number(data?.datos?.cobroTotal ?? 0);
    historialGananciaTotal.value = Number(data?.datos?.gananciaTotal ?? 0);
    historialVentas.value = Array.isArray(data?.datos?.ventas) 
      ? data.datos.ventas.sort((a, b) => (b.idVenta ?? 0) - (a.idVenta ?? 0))
      : [];
  } catch (_error) {
    historialCobroTotal.value = 0;
    historialGananciaTotal.value = 0;
    historialVentas.value = [];
    mostrarMensaje('No se pudo cargar el historial de ventas.', 'error');
  } finally {
    historialCargando.value = false;
  }
}

function salidaEfectivo() {
  modalSalidaAbierto.value = true;
}

function entradaEfectivo() {
  modalEntradaAbierto.value = true;
}

async function historialVentasAbrir() {
  modalHistorialAbierto.value = true;
  await cargarHistorialVentasDia();
}

async function verDetalleVenta(venta: VentaDTO) {
  historialVentaSeleccionada.value = venta;
  historialDetalleCargando.value = true;
  modalDetalleVentaAbierto.value = true;
  
  try {
    const data = await getJson<ApiRespuesta<VentaDetalleDTO[]>>(
      `${API_BASE}/ventasDetalle/porVenta/${venta.idVenta}`
    );
    historialVentaDetalle.value = Array.isArray(data?.datos) ? data.datos : [];
  } catch (_error) {
    historialVentaDetalle.value = [];
    mostrarMensaje('No se pudieron cargar los detalles de la venta.', 'error');
  } finally {
    historialDetalleCargando.value = false;
  }
}

async function cancelarVentaDesdeHistorial(venta: VentaDTO) {
  if (!confirm(`¿Estás seguro de cancelar la venta #${venta.numeroTicket}?`)) {
    return;
  }

  try {
    const data = await getJson<ApiRespuesta<VentaDTO>>(
      `${API_BASE}/ventas/cancelarVenta/${venta.idVenta}`,
      { method: 'PUT' }
    );

    if (data?.codigo === 200) {
      mostrarMensaje(`Venta #${venta.numeroTicket} cancelada correctamente.`, 'ok');
      await cargarHistorialVentasDia();
    } else {
      mostrarMensaje(data?.mensaje || 'No se pudo cancelar la venta.', 'error');
    }
  } catch (_error) {
    mostrarMensaje('Error al cancelar la venta.', 'error');
  }
}

function cerrarDetalleVenta() {
  modalDetalleVentaAbierto.value = false;
  historialVentaSeleccionada.value = null;
  historialVentaDetalle.value = [];
}

async function agregarProductoGramaje(payload: { gramos: number; precioTotal: number }) {
  const producto = modalProductoGramaje.value;
  if (!producto) {
    mostrarMensaje('No se encontro el producto de gramaje.', 'error');
    return;
  }

  if (!ticketActual.value) {
    await crearNuevoTicket();
  }

  const gramos = Math.max(1, Math.round(payload.gramos));
  const precioUnitario = payload.precioTotal / gramos;
  const items = ticketActual.value!.items;
  const existente = items.find((item) => item.id === producto.id);

  if (existente) {
    existente.cantidad += gramos;
    existente.precio = Number.isFinite(precioUnitario) ? precioUnitario : existente.precio;
    try {
      await crearDetalleVenta(ticketActual.value.id, existente);
    } catch (e) {
      existente.cantidad -= gramos;
      throw e;
    }
  } else {
    items.push({
      ...producto,
      cantidad: gramos,
      precio: Number.isFinite(precioUnitario) ? precioUnitario : producto.precio
    });
    try {
      const nuevoItem = items[items.length - 1];
      await crearDetalleVenta(ticketActual.value.id, nuevoItem);
    } catch (e) {
      items.pop();
      throw e;
    }
  }


  modalGramajeAbierto.value = false;
  modalProductoGramaje.value = null;
  mostrarMensaje(`Agregado ${gramos}g de ${producto.nombre}.`, 'ok');
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(valor);
}

function mostrarMensaje(texto: string, tipo: 'ok' | 'error' | 'info') {
  mensaje.value = texto;
  mensajeTipo.value = tipo;
}

function ocultarSugerencias() {
  setTimeout(() => {
    sugerenciasVisibles.value = false;
    indiceSugerenciaActiva.value = -1;
  }, 120);
}

function seleccionarSugerencia(producto: Producto) {
  agregarProductoATicket(producto);
  terminoBusqueda.value = '';
  sugerenciasVisibles.value = false;
  indiceSugerenciaActiva.value = -1;
}

function manejarTeclasSugerencias(event: KeyboardEvent) {
  if (!sugerenciasPorNombre.value.length) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    sugerenciasVisibles.value = true;
    indiceSugerenciaActiva.value =
      indiceSugerenciaActiva.value < sugerenciasPorNombre.value.length - 1
        ? indiceSugerenciaActiva.value + 1
        : 0;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    sugerenciasVisibles.value = true;
    indiceSugerenciaActiva.value =
      indiceSugerenciaActiva.value > 0
        ? indiceSugerenciaActiva.value - 1
        : sugerenciasPorNombre.value.length - 1;
  }

  if (event.key === 'Escape') {
    sugerenciasVisibles.value = false;
    indiceSugerenciaActiva.value = -1;
  }
}

function initSpeechRecognition() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    mostrarMensaje('Tu navegador no soporta reconocimiento de voz.', 'error');
    return null;
  }
  const rec = new SpeechRecognition();
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = 'es-ES';
  return rec;
}

async function startVoiceCommand() {
  if (isRecording.value) {
    if (recognition.value) {
      recognition.value.stop();
    }
    return;
  }

  if (!recognition.value) {
    recognition.value = initSpeechRecognition();
    if (!recognition.value) return;

    recognition.value.onstart = () => {
      isRecording.value = true;
      mostrarMensaje('Escuchando tu pedido...', 'info');
    };

    recognition.value.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      terminoBusqueda.value = transcript;
      await processVoiceCommand(transcript);
    };

    recognition.value.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      isRecording.value = false;
      mostrarMensaje(`Error en reconocimiento de voz: ${event.error}`, 'error');
    };

    recognition.value.onend = () => {
      isRecording.value = false;
    };
  }

  terminoBusqueda.value = '';
  recognition.value.start();
}

let scannerProcessing = false;

async function startScanner() {
  console.log('Starting scanner, Quagga available:', typeof (window as any).Quagga !== 'undefined');
  
  if (typeof (window as any).Quagga === 'undefined') {
    mostrarMensaje('Cargando escáner...', 'info');
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.8.4/dist/quagga.min.js';
    script.onload = () => {
      console.log('Quagga loaded, starting scanner');
      initScanner();
    };
    script.onerror = () => {
      mostrarMensaje('Error al cargar librería de escáner', 'error');
    };
    document.head.appendChild(script);
    return;
  }
  
  await initScanner();
}

async function initScanner() {
  scannerActivo.value = true;
  scannerProcessing = false;
  
  await nextTick();
  
  const targetElement = document.querySelector('#scanner-interactive');
  console.log('Scanner target element:', targetElement);
  
  if (!targetElement) {
    mostrarMensaje('Error: Contenedor de escáner no encontrado', 'error');
    stopScanner();
    return;
  }

  const Quagga = (window as any).Quagga;
  
  await new Promise<void>((resolve) => {
    Quagga.init(
      {
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: targetElement,
          constraints: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        decoder: {
          readers: [
            'code_128_reader',
            'ean_reader',
            'ean_8_reader',
            'code_39_reader',
            'upc_reader',
          ],
        },
        locate: true,
      },
      function (err: any) {
        if (err) {
          console.error('Quagga init error:', err);
          mostrarMensaje('Error al iniciar la cámara: ' + err.message, 'error');
          stopScanner();
          resolve();
          return;
        }
        (window as any).Quagga.start();
        resolve();
      }
    );
  });

  (window as any).Quagga.onDetected(handleScannerDetection);
}

function handleScannerDetection(data: any) {
  if (scannerProcessing) return;

  const code = data.codeResult.code;
  if (code) {
    scannerProcessing = true;
    stopScanner();
    buscarYAgregarProducto(code);
  }
}

function stopScanner() {
  if (typeof (window as any).Quagga !== 'undefined') {
    (window as any).Quagga.stop();
    (window as any).Quagga.offDetected(handleScannerDetection);
  }
  scannerActivo.value = false;
}

async function buscarYAgregarProducto(codigo: string) {
  console.log('Buscando código:', codigo);
  
  let producto = productos.value.find(
    (p) => String(p.codigo_barras) === codigo || String(p.idProducto) === codigo
  );

  if (!producto) {
    console.log('Producto no encontrado localmente, buscando en backend...');
    producto = await buscarProductoPorCodigoBarras(codigo);
  }

  if (producto) {
    console.log('Producto encontrado:', producto.nombre);
    await agregarProductoATicket(producto);
    mostrarMensaje(`Escaneado: ${producto.nombre}`, 'ok');
  } else {
    console.log('Producto no encontrado en backend');
    mostrarMensaje(`Producto no encontrado: ${codigo}`, 'error');
  }
}

async function processVoiceCommand(comando: string) {
  if (!comando.trim()) {
    mostrarMensaje('No se detectó ningún comando de voz.', 'error');
    return;
  }

  try {
    mostrarMensaje('Procesando comando de voz...', 'info');
    
    const response = await getJson<ApiRespuesta<any[]>>(`${API_BASE}/ventas/comando-texto`, {
      method: 'POST',
      body: JSON.stringify({ comando })
    });

    if (response?.codigo === 200 && response?.datos && response.datos.length > 0) {
      let productsAddedCount = 0;
      
      for (const item of response.datos) {
        if (item.producto && item.comando) {
          const producto = item.producto;
          const comando = item.comando;
          const isGramaje = producto.is_gramaje || comando.tipo === 'PESO' || comando.unidad === 'g' || comando.unidad === 'gramos';
          let cantidad = Number(comando.valor) || 1;
          let precioUnitario = Number(producto.precio_venta);
          
          if (comando.tipo === 'PESO') {
            cantidad = Number(comando.valor) || 1;
          } else if (comando.tipo === 'PRECIO') {
            const valorPesos = Number(comando.valor) || 0;
            const precioVentaNum = Number(producto.precio_venta) || 0;
            if (producto.is_gramaje && precioVentaNum > 0) {
              cantidad = Math.round((valorPesos / precioVentaNum) * 1000);
              precioUnitario = precioVentaNum / 1000;
            } else {
              cantidad = 1;
              precioUnitario = valorPesos;
            }
          }
          
          if (!ticketActual.value) {
            await crearNuevoTicket();
          }
          
          const items = ticketActual.value!.items;
          const existente = items.find(i => i.id === producto.idProducto);
          
          if (existente) {
            existente.cantidad += cantidad;
            existente.precio = precioUnitario;
            if (existente.idVentaDetalle && ticketActual.value) {
              try {
                await crearDetalleVenta(ticketActual.value.id, existente);
              } catch (e) {
                existente.cantidad -= cantidad;
              }
            }
          } else {
            items.push({
              id: producto.idProducto,
              nombre: producto.nombre,
              cantidad: cantidad,
              precio: precioUnitario,
              is_gramaje: isGramaje || comando.tipo === 'PRECIO',
              dto: producto
            });
            try {
              await crearDetalleVenta(ticketActual.value.id, items[items.length - 1]);
            } catch (e) {
              items.pop();
            }
          }
          productsAddedCount++;
        }
      }
      
      if (productsAddedCount > 0) {
        mostrarMensaje(`Se añadieron ${productsAddedCount} productos al ticket.`, 'ok');
      } else {
        mostrarMensaje('No se pudieron interpretar productos del comando.', 'error');
      }
    } else {
      mostrarMensaje('No se encontraron productos en el comando de voz.', 'error');
    }
  } catch (error) {
    console.error('Error processing voice command:', error);
    mostrarMensaje('Error al procesar el comando de voz.', 'error');
  }
}
</script>

<template>
  <main class="ventas-layout">
    <div class="bg-fog"></div>
    <div class="bg-scanlines"></div>
    <div class="bg-stars" aria-hidden="true">
      <span class="bg-star"></span>
      <span class="bg-star"></span>
      <span class="bg-star"></span>
      <span class="bg-star"></span>
      <span class="bg-star"></span>
      <span class="bg-star"></span>
    </div>
    <div class="bg-particles" aria-hidden="true">
      <span class="bg-particle"></span>
      <span class="bg-particle"></span>
      <span class="bg-particle"></span>
      <span class="bg-particle"></span>
    </div>
    <section class="ventas-col ticket-col panel">
      <header class="panel-header">
        <div class="ticket-header-row">
          <h2>Ticket #{{ ticketActual?.numero ?? '-' }}</h2>
          <button type="button" class="btn-new-ticket" @click="crearNuevoTicket" title="Nuevo ticket">
            + Nuevo
          </button>
        </div>
        <p>Busca por nombre o codigo de barras y presiona Enter.</p>
      </header>

      <div class="tickets-tabs">
        <button
          v-for="t in tickets"
          :key="t.id"
          type="button"
          class="ticket-tab"
          :class="{ 
            active: t.id === ticketActualId, 
            completed: t.estado === 'completado',
            empty: t.items.length === 0
          }"
          @click="seleccionarTicket(t.id)"
        >
          <span class="tab-num">#{{ t.numero }}</span>
          <span class="tab-total" v-if="t.items.length > 0">{{ formatoMoneda(t.items.reduce((sum, i) => sum + i.precio * i.cantidad, 0)) }}</span>
          <span class="tab-empty" v-else>vacío</span>
          <button 
            v-if="t.items.length === 0 && tickets.length > 1" 
            type="button" 
            class="tab-close"
            @click.stop="eliminarTicket(t.id)"
            title="Eliminar ticket"
          >
            ×
          </button>
        </button>
      </div>

      <div class="buscador-wrap">
        <input
          v-model="terminoBusqueda"
          type="text"
          placeholder="Ej: 750000000002 o pocion azul"
          @focus="manejarFocusBusqueda"
          @input="manejarInputBusqueda"
          @blur="ocultarSugerencias"
          @keydown="manejarTeclasSugerencias"
          @keydown.enter.prevent="agregarDesdeBuscador"
        >
        <button
          type="button"
          class="btn-scanner"
          @click="startScanner"
          title="Escanear código de barras"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </button>
        <button
          type="button"
          class="btn-microphone"
          :class="{ 'recording': isRecording }"
          @mousedown.prevent="startVoiceCommand"
          title="Comando por voz"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>

        <ul
          v-if="sugerenciasVisibles && sugerenciasPorNombre.length > 0"
          class="sugerencias-lista"
        >
          <li
            v-for="(producto, indice) in sugerenciasPorNombre"
            :key="`${producto.id}-${producto.codigo_barras}`"
          >
            <button
              type="button"
              class="sugerencia-item"
              :class="{ activa: indice === indiceSugerenciaActiva }"
              @mousedown.prevent="seleccionarSugerencia(producto)"
            >
              <span>{{ producto.nombre }}</span>
              <small>{{ producto.codigo_barras || 'Sin codigo' }} - {{ formatoMoneda(producto.precio) }}</small>
            </button>
          </li>
        </ul>
      </div>

      <p v-if="mensaje" class="estado" :class="`estado-${mensajeTipo}`">
        {{ mensaje }}
      </p>

      <div class="ticket-lista">
        <article
          v-for="item in ticket"
          :key="item.id"
          class="ticket-etiqueta"
        >
          <div>
            <h3>{{ item.nombre }}</h3>
            <p>Codigo: {{ item.codigo_barras || 'Sin codigo' }}</p>
            <p>Precio: {{ formatoMoneda(item.precio) }}</p>
          </div>

          <div class="etiqueta-controles">
            <button type="button" @click="disminuirCantidad(item)">-</button>
            <span>{{ item.cantidad }}{{ item.is_gramaje ? 'g' : '' }}</span>
            <button type="button" @click="aumentarCantidad(item)">+</button>
          </div>

          <div class="etiqueta-total">
            {{ formatoMoneda(item.precio * item.cantidad) }}
          </div>

          <button type="button" class="btn-danger" @click="quitarItem(item.id)">
            Quitar
          </button>
        </article>

        <p v-if="ticket.length === 0" class="ticket-vacio">
          Aun no hay productos en el ticket.
        </p>
      </div>

      <footer class="ticket-actions">
        <button type="button" class="btn-secondary btn-limpiar" @click="limpiarTicket">
          <span class="icono">🗑️</span>
          <span class="texto">Limpiar</span>
        </button>
      </footer>
    </section>

    <aside class="ventas-col resumen-col panel">
      <header class="panel-header">
        <h2>Resumen de Venta</h2>
      </header>

      <div class="resumen-card">
        <p>Cajero:</p>
        <strong>{{ nombreUsuario }}</strong>
      </div>

      <div class="resumen-card total">
        <p>Total:</p>
        <strong>{{ formatoMoneda(totalVenta) }}</strong>
      </div>

      <div class="acciones-grid">
        <button type="button" class="btn-accion btn-cobrar" @click="cobrar">
          <span class="icono">💰</span>
          <span class="texto">Cobrar</span>
        </button>
        <button type="button" class="btn-accion btn-salida" @click="salidaEfectivo">
          <span class="icono">📤</span>
          <span class="texto">Salida</span>
        </button>
        <button type="button" class="btn-accion btn-entrada" @click="entradaEfectivo">
          <span class="icono">📥</span>
          <span class="texto">Entrada</span>
        </button>
        <button type="button" class="btn-accion btn-historial" @click="historialVentasAbrir">
          <span class="icono">📜</span>
          <span class="texto">Historial</span>
        </button>
      </div>
    </aside>

    <EntradaEfectivoModal
      :open="modalEntradaAbierto"
      @close="modalEntradaAbierto = false"
      @submit="registrarEntradaEfectivo"
    />

    <SalidaEfectivoModal
      :open="modalSalidaAbierto"
      @close="modalSalidaAbierto = false"
      @submit="registrarSalidaEfectivo"
    />

    <HistorialVentasModal
      :open="modalHistorialAbierto"
      :loading="historialCargando"
      :cobro-total="historialCobroTotal"
      :ganancia-total="historialGananciaTotal"
      :ventas="historialVentas"
      @close="modalHistorialAbierto = false"
      @ver-detalle="verDetalleVenta"
      @cancelar="cancelarVentaDesdeHistorial"
    />

    <div v-if="modalDetalleVentaAbierto" class="modal-overlay" @click.self="cerrarDetalleVenta">
      <section class="modal-card panel detalle-venta-modal">
        <button type="button" class="btn-cerrar-modal" @click="cerrarDetalleVenta" title="Cerrar">
          ✕
        </button>
        
        <header class="modal-header-detalle">
          <div class="titulo-detalle">
            <span class="emoji-ticket">🎫</span>
            <h3>Detalle de Venta #{{ historialVentaSeleccionada?.numeroTicket }}</h3>
          </div>
        </header>

        <div class="info-venta-detalle">
          <div class="info-item">
            <span class="label">📅 Fecha:</span>
            <span class="value">{{ historialVentaSeleccionada?.fechaVenta?.slice(0, 10) || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">💰 Total:</span>
            <span class="value total">{{ formatoMoneda(Number(historialVentaSeleccionada?.montoTotal)) }}</span>
          </div>
          <div class="info-item">
            <span class="label">💳 Método:</span>
            <span class="value">{{ historialVentaSeleccionada?.metodoPago || 'EFECTIVO' }}</span>
          </div>
          <div class="info-item">
            <span class="label">📊 Estatus:</span>
            <span class="value estatus" :class="historialVentaSeleccionada?.estatus">
              {{ historialVentaSeleccionada?.estatus === 'C' ? '✅ Completada' : historialVentaSeleccionada?.estatus === 'P' ? '⏳ Pendiente' : '❌ Cancelada' }}
            </span>
          </div>
        </div>

        <div class="detalle-content">
          <h4 class="titulo-productos">🛒 Productos</h4>
          <p v-if="historialDetalleCargando" class="estado">Cargando detalles...</p>
          <p v-else-if="historialVentaDetalle.length === 0" class="estado">No hay detalles para esta venta.</p>
          
          <div v-else class="detalle-lista">
            <div v-for="(detalle, index) in historialVentaDetalle" :key="detalle.idVentaDetalle" class="detalle-item" :style="{ animationDelay: `${index * 50}ms` }">
              <div class="detalle-info">
                <span class="numero-item">{{ index + 1 }}.</span>
                <strong>{{ (detalle.Producto || detalle.producto)?.nombre || 'Producto' }}</strong>
              </div>
              <div class="detalle-cantidad">
                {{ detalle.cantidad }}{{ (detalle.Producto || detalle.producto)?.is_gramaje ? 'g' : 'pza' }}
              </div>
              <div class="detalle-precio">
                <span class="precio-unit">{{ formatoMoneda(Number(detalle.precioUnitarioVenta)) }}/{{ (detalle.Producto || detalle.producto)?.is_gramaje ? 'g' : 'pza' }}</span>
                <span class="detalle-subtotal">
                  = {{ formatoMoneda(Number(detalle.precioUnitarioVenta) * Number(detalle.cantidad)) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-actions">
          <button type="button" class="btn-cerrar" @click="cerrarDetalleVenta">
            👋 Cerrar
          </button>
        </footer>
      </section>
    </div>

    <CalculadoraGramajeModal
      :open="modalGramajeAbierto"
      :producto="modalProductoGramaje ? { ...modalProductoGramaje, codigo_barras: modalProductoGramaje.codigo_barras ?? '' } : null"
      @close="modalGramajeAbierto = false; modalProductoGramaje = null"
      @add="agregarProductoGramaje"
    />

    <CobroModal
      :open="modalCobroAbierto"
      :total="totalVenta"
      @close="modalCobroAbierto = false"
      @confirmar-efectivo="confirmarCobroEfectivo"
      @confirmar-transferencia="confirmarCobroTransferencia"
    />

    <div v-if="scannerActivo" class="scanner-container">
      <div class="scanner-viewport">
        <div id="scanner-interactive"></div>
        <div class="scanner-laser"></div>
      </div>
      <button type="button" class="scanner-cancel-btn" @click="stopScanner">
        Cancelar Escaneo
      </button>
    </div>
  </main>
</template>

<style scoped>
.ventas-layout .modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(2, 4, 2, 0.92);
  display: grid;
  place-items: center;
  padding: 1rem;
  animation: fadeIn 150ms ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.ventas-layout .modal-card {
  width: min(100%, 520px);
  max-height: 90vh;
  background: linear-gradient(180deg, #1f5b35 0%, #133523 100%);
  border: 4px solid #f8d667;
  box-shadow: 
    0 0 0 4px #2f1f09,
    0 14px 0 #271c0f,
    0 20px 28px rgba(0, 0, 0, 0.5);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  animation: popIn 200ms ease-out;
  overflow: hidden;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.ventas-layout .modal-card::before {
  content: "";
  position: absolute;
  inset: 12px;
  border: 2px dashed rgba(248, 214, 103, 0.3);
  pointer-events: none;
  border-radius: 8px;
}

.btn-cerrar-modal {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0, 0, 0, 0.4);
  color: #f8d667;
  font-size: 1.2rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms;
  z-index: 10;
}

.btn-cerrar-modal:hover {
  background: #ef4444;
  color: white;
  transform: rotate(90deg);
}

.modal-header-detalle {
  text-align: center;
}

.titulo-detalle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.emoji-ticket {
  font-size: 1.8rem;
}

.modal-header-detalle h3 {
  font-size: 1.4rem;
  color: #f8d667;
  text-shadow: 2px 2px 0 #1a1401;
  margin: 0;
}

.info-venta-detalle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 2px solid rgba(248, 214, 103, 0.2);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item .label {
  font-size: 0.75rem;
  color: #a3a380;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item .value {
  font-size: 1rem;
  color: #f6f2de;
  font-weight: 600;
}

.info-item .value.total {
  font-size: 1.3rem;
  color: #67e0a8;
  text-shadow: 0 0 10px rgba(103, 224, 168, 0.5);
}

.info-item .value.estatus {
  font-size: 0.9rem;
}

.titulo-productos {
  font-size: 1rem;
  color: #a3a380;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed rgba(248, 214, 103, 0.3);
}

.detalle-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.detalle-content::-webkit-scrollbar {
  width: 6px;
}

.detalle-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.detalle-content::-webkit-scrollbar-thumb {
  background: #f8d667;
  border-radius: 3px;
}

.detalle-lista {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detalle-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(248, 214, 103, 0.15);
  animation: slideIn 200ms ease-out backwards;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.detalle-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.numero-item {
  color: #67e0a8;
  font-weight: bold;
  font-size: 0.9rem;
}

.detalle-info strong {
  color: #f6f2de;
  font-size: 0.95rem;
}

.detalle-cantidad {
  background: #2a1807;
  color: #f8d667;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  min-width: 50px;
  text-align: center;
}

.detalle-precio {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
}

.precio-unit {
  font-size: 0.75rem;
  color: #a3a380;
}

.detalle-subtotal {
  font-size: 1rem;
  color: #67e0a8;
  font-weight: 700;
}

.modal-actions {
  display: flex;
  justify-content: center;
  padding-top: 0.5rem;
}

.btn-cerrar {
  background: linear-gradient(180deg, #f8d667 0%, #c79634 100%);
  color: #1a1401;
  border: none;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms;
  box-shadow: 0 4px 0 #8b6914;
}

.btn-cerrar:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #8b6914;
}

.btn-cerrar:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #8b6914;
}

@media (max-width: 600px) {
  .ventas-layout .modal-card {
    width: min(100%, 95vw);
    max-height: 95vh;
    padding: 1rem;
  }
  
  .ventas-layout .modal-card::before {
    inset: 8px;
  }
  
  .btn-cerrar-modal {
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
  
  .modal-header-detalle h3 {
    font-size: 1.1rem;
  }
  
  .emoji-ticket {
    font-size: 1.4rem;
  }
  
  .info-venta-detalle {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    padding: 0.75rem;
  }
  
  .info-item .value.total {
    font-size: 1.1rem;
  }
  
  .titulo-productos {
    font-size: 0.9rem;
  }
  
  .detalle-item {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 0.6rem;
  }
  
  .detalle-info {
    order: 1;
  }
  
  .detalle-cantidad {
    order: 2;
    justify-self: start;
  }
  
  .detalle-precio {
    order: 3;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    padding-top: 0.5rem;
    border-top: 1px dashed rgba(248, 214, 103, 0.2);
  }
  
  .precio-unit {
    font-size: 0.7rem;
  }
  
  .detalle-subtotal {
    font-size: 1rem;
  }
  
  .btn-cerrar {
    width: 100%;
    padding: 0.75rem;
  }
}

.ventas-layout .btn-accion {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  font-weight: 600;
  border-radius: 8px;
  border: 2px solid #2a1807;
  transition: all 150ms;
}

.ventas-layout .btn-accion .icono {
  font-size: 1.2rem;
}

.ventas-layout .btn-accion .texto {
  font-size: 0.85rem;
}

.ventas-layout .btn-cobrar {
  background: linear-gradient(180deg, #67e0a8 0%, #2a9d5c 100%);
  color: #1a1401;
}

.ventas-layout .btn-salida {
  background: linear-gradient(180deg, #fca5a5 0%, #ef4444 100%);
  color: #fff;
}

.ventas-layout .btn-entrada {
  background: linear-gradient(180deg, #86efac 0%, #22c55e 100%);
  color: #1a1401;
}

.ventas-layout .btn-historial {
  background: linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%);
  color: #fff;
}

.ventas-layout .btn-limpiar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.6rem 1rem;
  font-weight: 600;
  border-radius: 8px;
  border: 2px solid #2a1807;
  transition: all 150ms;
}

.ventas-layout .btn-limpiar .icono {
  font-size: 1rem;
}

.ventas-layout .btn-limpiar .texto {
  font-size: 0.85rem;
}

@media (max-width: 600px) {
  .ventas-layout .btn-accion {
    padding: 0.5rem;
  }
  
  .ventas-layout .btn-accion .texto {
    display: none;
  }
  
  .ventas-layout .btn-accion .icono {
    font-size: 1.5rem;
  }
  
  .ventas-layout .btn-limpiar .texto {
    display: none;
  }
  
  .ventas-layout .btn-limpiar .icono {
    font-size: 1.3rem;
  }

  .ticket-tab {
    padding: 0.25rem 0.4rem;
    min-width: 35px;
  }

  .tab-num {
    font-size: 0.65rem;
  }

  .tab-total {
    font-size: 0.5rem;
  }

  .tab-empty {
    font-size: 0.45rem;
  }

  .tab-close {
    transform: scale(0.5) !important;
    top: -6px !important;
    right: -6px !important;
  }
}

.ventas-layout {
  --pixel-gold: #f8d667;
  --pixel-amber: #c79634;
  --pixel-forest: #1f5b35;
  --pixel-forest-dark: #133523;
  --pixel-bg: #07150d;
  --pixel-ink: #1a1401;
  --pixel-paper: #f6f2de;
  --pixel-rupee: #67e0a8;
  --pixel-rupee-dark: #2a9d5c;
  --ventas-space: 1.2rem;
  height: 90vh;
  min-height: 0;
  width: 100%;
  margin: auto;
  padding: var(--ventas-space);
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
  overflow: auto;
  background: 
    linear-gradient(180deg, #0a1912 0%, var(--pixel-bg) 100%),
    radial-gradient(circle at 8% 12%, rgba(248, 214, 103, 0.1) 0 8px, transparent 9px),
    radial-gradient(circle at 92% 88%, rgba(248, 214, 103, 0.08) 0 8px, transparent 9px);
}

.ventas-col {
  padding: 0.75rem;
  margin-bottom: var(--ventas-space);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
}

.ventas-col::before {
  content: "";
  position: absolute;
  inset: 8px;
  border: 2px dashed rgba(248, 214, 103, 0.25);
  pointer-events: none;
  border-radius: 8px;
}

.panel-header {
  position: relative;
  z-index: 1;
}

.panel-header h2 {
  font-size: clamp(1.1rem, 2.8vw, 1.4rem);
  color: var(--pixel-gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 900;
  text-shadow: 2px 2px 0 #000, -1px -1px 0 #000;
  margin: 0;
}

.panel-header p {
  color: var(--pixel-paper);
  font-size: clamp(0.72rem, 1.9vw, 0.85rem);
  margin: 0.3rem 0 0;
  opacity: 0.85;
  letter-spacing: 0.03em;
}

.buscador-wrap {
  position: relative;
  z-index: 30;
  display: flex;
  gap: 0.5rem;
}

.buscador-wrap input {
  flex: 1;
  background: #f2e8bf;
  border: 3px solid #2a1807;
  padding: 0.7rem 0.8rem;
  color: #1d1606;
  font-family: "Courier New", monospace;
  font-size: 0.95rem;
  outline: none;
  box-shadow: inset 0 0 0 3px #d4c27e;
  transition: box-shadow 120ms linear;
}

.btn-microphone {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms;
}

.btn-microphone:hover {
  background: #4b5563;
}

.btn-microphone.recording {
  background: #ef4444;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.buscador-wrap input::placeholder {
  color: #8a7a4a;
}

.buscador-wrap input:focus {
  box-shadow: inset 0 0 0 2px #e1cc80, 0 0 0 3px var(--pixel-gold);
}

.sugerencias-lista {
  list-style: none;
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  border: 3px solid #2a1807;
  background: var(--pixel-paper);
  z-index: 100;
  max-height: 280px;
  height: auto;
  overflow-y: scroll;
  box-shadow: 0 6px 0 #1a1005, 0 10px 16px rgba(0, 0, 0, 0.35);
  animation: slideDown 120ms steps(4);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.sugerencia-item {
  width: 100%;
  border: none;
  border-bottom: 1px solid #c4b078;
  box-shadow: none;
  background: transparent;
  color: #1d1606;
  text-transform: none;
  letter-spacing: 0.02em;
  padding: 0.6rem 0.7rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.6rem;
  font-family: "Courier New", monospace;
  cursor: pointer;
  transition: background 80ms steps(2);
}

.sugerencia-item:hover,
.sugerencia-item.activa {
  background: #e6d490;
}

.sugerencia-item small {
  font-size: 0.68rem;
  color: #5a4a2a;
  font-family: "Courier New", monospace;
}

.estado {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  z-index: 1;
  position: relative;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  animation: fadeIn 200ms steps(4);
  pointer-events: none;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.estado-ok {
  color: #8affa8;
  background: rgba(40, 160, 80, 0.25);
  border: 1px solid rgba(40, 160, 80, 0.4);
}

.estado-error {
  color: #ff9ea8;
  background: rgba(180, 60, 70, 0.3);
  border: 1px solid rgba(180, 60, 70, 0.5);
}

.estado-info {
  color: var(--pixel-gold);
  background: rgba(200, 160, 50, 0.2);
  border: 1px solid rgba(200, 160, 50, 0.35);
}

.ticket-lista {
  flex: 1;
  overflow: auto;
  height: 100%;
  max-height: 90%;
  display: grid;
  gap: 0.4rem;
  padding-right: 0.3rem;
  z-index: 1;
  position: relative;
  pointer-events: none;
}

.ticket-etiqueta {
  border: 2px solid #2a1807;
  background: linear-gradient(180deg, #fdfbf3 0%, #e8d9a8 100%);
  color: #1d1606;
  padding: 0.4rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.4rem;
  align-items: center;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5), 0 2px 0 #1a1005, 0 3px 6px rgba(0, 0, 0, 0.2);
  animation: popIn 150ms steps(4);
  transition: transform 100ms steps(2);
  pointer-events: auto;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.ticket-etiqueta:hover {
  transform: translateX(4px);
}

.ticket-etiqueta h3 {
  margin: 0;
  color: #0f1f0c;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-shadow: none;
}

.ticket-etiqueta p {
  font-size: 0.65rem;
  color: #5a4a2a;
  margin: 0;
  font-family: "Courier New", monospace;
}

.etiqueta-controles {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.etiqueta-controles button {
  min-width: 24px;
  padding: 0.2rem 0.25rem;
  border: 2px solid #2a1807;
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  color: #1a1401;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 0 2px 0 #6f4b1c;
  transition: transform 60ms steps(2), filter 60ms linear;
}

.etiqueta-controles button:hover {
  filter: brightness(1.1);
}

.etiqueta-controles button:active {
  transform: translateY(2px);
  box-shadow: none;
}

.etiqueta-controles span {
  min-width: 24px;
  text-align: center;
  font-weight: 800;
  font-size: 0.8rem;
  font-family: "Courier New", monospace;
  color: #1a1401;
  background: rgba(255, 255, 255, 0.5);
  padding: 0.15rem 0.3rem;
  border: 1px solid #c4b078;
}

.etiqueta-total {
  grid-column: 1 / -1;
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--pixel-forest-dark);
  font-family: "Courier New", monospace;
  text-align: right;
  border-top: 1px dashed #c4b078;
  padding-top: 0.3rem;
  margin-top: 0.15rem;
}

.etiqueta-total::before {
  content: "💰 ";
}

.btn-danger {
  background: linear-gradient(180deg, #e88b8b 0%, #c94f4f 50%, #a32d2d 100%);
  color: #fff;
  border: 2px solid #2a1807;
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
}

.btn-secondary {
  background: linear-gradient(180deg, #e2deca 0%, #bdb696 100%);
  color: #1a1401;
  border: 2px solid #2a1807;
}

.ticket-vacio {
  text-align: center;
  color: var(--pixel-paper);
  opacity: 0.85;
  font-size: 0.95rem;
  padding: 2rem;
  border: 2px dashed rgba(248, 214, 103, 0.3);
  border-radius: 8px;
  font-family: "Courier New", monospace;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: none;
}

.ticket-vacio::before {
  content: "🛒 ";
  font-size: 1.5rem;
}

.resumen-col {
  justify-content: flex-start;
}

.resumen-card {
  border: 3px solid #2a1807;
  background: linear-gradient(180deg, #fdfbf3 0%, #e8d9a8 100%);
  color: #1d1606;
  padding: 0.85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5), 0 4px 0 #1a1005;
  position: relative;
  z-index: 1;
}

.resumen-card p {
  margin: 0;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.resumen-card strong {
  font-size: 1.05rem;
  font-family: "Courier New", monospace;
}

.resumen-card.total {
  background: linear-gradient(180deg, #ffe48b 0%, #f8d667 50%, #e2b84f 100%);
  box-shadow: inset 0 0 0 3px #ffeeb4, 0 4px 0 #6f4b1c;
  animation: pulseGold 2s ease-in-out infinite;
}

@keyframes pulseGold {
  0%, 100% {
    box-shadow: inset 0 0 0 3px #ffeeb4, 0 4px 0 #6f4b1c;
  }
  50% {
    box-shadow: inset 0 0 0 3px #fff4c4, 0 4px 0 #8a6a3a, 0 0 12px rgba(248, 214, 103, 0.3);
  }
}

.resumen-card.total p {
  font-size: 0.9rem;
}

.resumen-card.total strong {
  font-size: 1.3rem;
  color: #1a1401;
}

.resumen-card.total strong::before {
  content: "💎 ";
}

.acciones-grid {
  margin-top: 0.4rem;
  display: grid;
  gap: 0.5rem;
  position: relative;
  z-index: 1;
}

.acciones-grid button {
  width: 100%;
  border: 3px solid #2a1807;
  padding: 0.7rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 3px 0 #6f4b1c, 0 5px 8px rgba(0, 0, 0, 0.3);
  transition: transform 80ms steps(2), filter 80ms linear;
}

.acciones-grid button:first-child {
  background: linear-gradient(180deg, #9fd98a 0%, #5ab848 50%, #3d8a2f 100%);
  color: #0a2008;
}

.acciones-grid button:nth-child(2) {
  background: linear-gradient(180deg, #e88b8b 0%, #c94f4f 50%, #a32d2d 100%);
  color: #fff;
}

.acciones-grid button:nth-child(3) {
  background: linear-gradient(180deg, #8bcfff 0%, #4a9ed4 50%, #2d7aa8 100%);
  color: #fff;
}

.acciones-grid button:nth-child(4) {
  background: linear-gradient(180deg, #c4a3ff 0%, #8a5cd4 50%, #5d2ea8 100%);
  color: #fff;
}

.acciones-grid button:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.acciones-grid button:active {
  transform: translateY(2px);
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 1px 0 #6f4b1c;
}

.ticket-actions {
  z-index: 1;
  position: relative;
}

.ticket-actions button {
  border: 2px solid #2a1807;
  padding: 0.5rem 0.8rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  background: linear-gradient(180deg, #e2deca 0%, #bdb696 100%);
  color: #1a1401;
  box-shadow: 0 2px 0 #8a7a5a;
}

.ticket-actions button:hover {
  filter: brightness(1.05);
}

@media (max-width: 980px) {
  .ventas-layout {
    grid-template-columns: 1fr;
  }

  .ventas-col {
    overflow: visible;
  }

  .ticket-lista {
    max-height: 35vh;
    min-height: 120px;
    gap: 0.4rem;
  }

  .resumen-col .ventas-col {
    overflow: auto;
    max-height: 25vh;
  }
}

@media (max-width: 520px) {
  .ventas-layout {
    --ventas-space: 0.6rem;
    padding: var(--ventas-space);
  }

  .ventas-col {
    padding: 0.6rem;
    gap: 0.4rem;
  }

  .ticket-etiqueta {
    grid-template-columns: 1fr;
    gap: 0.3rem;
    padding: 0.3rem;
  }

  .etiqueta-controles {
    justify-content: flex-start;
  }

  .acciones-grid button {
    font-size: 0.72rem;
    padding: 0.6rem 0.7rem;
  }
}

@keyframes bgGradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes bgFogDrift {
  0% { transform: translateX(-5%) translateY(0) scale(1); }
  50% { transform: translateX(5%) translateY(-5px) scale(1.02); }
  100% { transform: translateX(-5%) translateY(0) scale(1); }
}

@keyframes bgPulse {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.25; }
}

@keyframes bgRupeeGlow {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(248, 214, 103, 0.6)) brightness(1); transform: scale(1); }
  50% { filter: drop-shadow(0 0 12px rgba(248, 214, 103, 1)) brightness(1.3); transform: scale(1.15); }
}

@keyframes bgStarFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
  50% { transform: translateY(-12px) rotate(180deg); opacity: 1; }
}

.bg-fog {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: 
    radial-gradient(ellipse 90% 60% at 10% 50%, rgba(31, 91, 53, 0.25) 0%, transparent 50%),
    radial-gradient(ellipse 70% 50% at 90% 40%, rgba(31, 91, 53, 0.2) 0%, transparent 50%),
    radial-gradient(ellipse 50% 30% at 50% 90%, rgba(19, 53, 35, 0.3) 0%, transparent 50%);
  animation: bgFogDrift 10s ease-in-out infinite;
}

.bg-scanlines {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.1;
  background-image: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0 2px, rgba(0, 0, 0, 0.03) 2px 4px);
  animation: bgPulse 0.1s ease-in-out infinite;
}

.bg-stars {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.bg-star {
  position: absolute;
  width: 6px;
  height: 6px;
  background: radial-gradient(circle, #f8d667 0%, #c79634 50%, #8b6914 80%, transparent 100%);
  border-radius: 50%;
  animation: bgRupeeGlow 2.5s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(248, 214, 103, 0.8);
}

.bg-star:nth-child(1) { top: 8%; left: 15%; animation-delay: 0s; }
.bg-star:nth-child(2) { top: 5%; left: 85%; animation-delay: 0.3s; width: 5px; height: 5px; }
.bg-star:nth-child(3) { top: 20%; left: 8%; animation-delay: 0.6s; }
.bg-star:nth-child(4) { top: 12%; left: 70%; animation-delay: 0.9s; width: 4px; height: 4px; }
.bg-star:nth-child(5) { top: 75%; left: 5%; animation-delay: 1.2s; }
.bg-star:nth-child(6) { top: 88%; left: 20%; animation-delay: 1.5s; width: 5px; height: 5px; }

.bg-particles {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.bg-particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: linear-gradient(135deg, #f8d667, #fff8e0);
  border-radius: 50%;
  animation: bgStarFloat 5s ease-in-out infinite;
  box-shadow: 0 0 6px rgba(248, 214, 103, 0.8);
}

.bg-particle:nth-child(1) { left: 10%; animation-delay: 0s; animation-duration: 6s; }
.bg-particle:nth-child(2) { left: 25%; animation-delay: 1s; animation-duration: 5s; }
.bg-particle:nth-child(3) { left: 40%; animation-delay: 2s; animation-duration: 7s; }
.bg-particle:nth-child(4) { left: 55%; animation-delay: 0.5s; animation-duration: 5.5s; }

.ventas-layout {
  position: relative;
  z-index: 1;
}

.ticket-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.ticket-header-row h2 {
  margin: 0;
}

.btn-new-ticket {
  border: 2px solid #2a1807;
  padding: 0.3rem 0.6rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  font-family: "Courier New", monospace;
  cursor: pointer;
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  color: #1a1401;
  box-shadow: 0 2px 0 #6f4b1c;
}

.btn-new-ticket:hover {
  filter: brightness(1.1);
}

.btn-new-ticket:active {
  transform: translateY(2px);
  box-shadow: none;
}

.tickets-tabs {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.8rem;
}

.ticket-tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.4rem 0.6rem;
  border: 2px solid #2a1807;
  background: linear-gradient(180deg, #e2deca 0%, #bdb696 100%);
  color: #1a1401;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: 0 2px 0 #8a7a5a;
  min-width: 50px;
}

.ticket-tab:hover {
  filter: brightness(1.05);
}

.ticket-tab.active {
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  box-shadow: 0 2px 0 #6f4b1c, 0 0 8px rgba(248, 214, 103, 0.4);
}

.ticket-tab.completed {
  background: linear-gradient(180deg, #9fd98a 0%, #5ab848 50%, #3d8a2f 100%);
  color: #0a2008;
}

.ticket-tab.empty {
  opacity: 0.6;
}

.tab-num {
  font-size: 0.75rem;
  font-weight: 700;
}

.tab-total {
  font-size: 0.6rem;
  font-weight: 600;
}

.tab-empty {
  font-size: 0.55rem;
  font-style: italic;
}

.tab-close {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 1px solid #2a1807;
  background: #c94f4f;
  color: #fff;
  font-size: 0.7rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-close:hover {
  background: #a32d2d;
}

.detalle-content {
  max-height: 400px;
  overflow-y: auto;
  border: 3px solid #2a1807;
  background: #f2e8bf;
  padding: 0.5rem;
}

.detalle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem;
  border-bottom: 1px dashed #baa15c;
  background: #fff;
  margin-bottom: 0.3rem;
}

.detalle-item:last-child {
  border-bottom: none;
}

.detalle-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.detalle-info strong {
  font-size: 0.85rem;
  color: #1d1606;
}

.detalle-cantidad {
  font-size: 0.75rem;
  color: #5a4a2a;
  font-family: "Courier New", monospace;
}

.detalle-precio {
  text-align: right;
  font-size: 0.75rem;
  color: #5a4a2a;
  font-family: "Courier New", monospace;
}

.detalle-subtotal {
  display: block;
  font-weight: 700;
  color: #1f5b35;
  font-size: 0.85rem;
}

.btn-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  color: #f8d667;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

.btn-close:hover {
  color: #fff;
}

.modal-header {
  position: relative;
}
</style>
