<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, markRaw } from 'vue';
import Quagga from '@ericblade/quagga2';
import { useProductosCache } from '@/composables/useProductCache';
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
  precio_mayoreo?: number | string | null;
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
  idVentaDetalle?: number;
  cantidad: number;
  precioUnitarioVenta: number;
  producto?: ProductoDTO;
  Producto?: ProductoDTO;
  idProducto?: number;
};

type VentaPendienteDTO = VentaDTO;

type Producto = {
  id: number;
  nombre: string;
  codigo_barras: string | null;
  precio: number;
  precio_mayoreo?: number | null;
  dto: ProductoDTO;
  is_gramaje?: boolean;
};

type TicketItem = Producto & {
  cantidad: number;
  idVentaDetalle?: number;
  is_mayoreo?: boolean;
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
                  id: producto.idProducto || producto.id,
                  nombre: producto.nombre,
                  cantidad,
                  precio,
                  precio_mayoreo: producto.precio_mayoreo != null ? Number(producto.precio_mayoreo) : null,
                  is_gramaje: producto.is_gramaje,
                  is_mayoreo: (producto.precio_mayoreo != null && Number(producto.precio_mayoreo) > 0 && precio === Number(producto.precio_mayoreo)),
                  dto: producto,
                  idVentaDetalle: detalle.idVentaDetalle,
                  codigo_barras: producto.codigoBarras || producto.codigo_barras || null
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
      idUsuario,
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
  const ticketIndex = tickets.value.findIndex(t => t.id === id);
  if (ticketIndex === -1) return;
  
  const tempTicketActual = ticketActualId.value;
  const ticketsBackup = [...tickets.value];
  
  tickets.value.splice(ticketIndex, 1);
  
  if (tickets.value.length === 0) {
    await crearNuevoTicket();
  } else if (tempTicketActual === id) {
    const pendiente = tickets.value.find(t => t.estado === 'pendiente');
    ticketActualId.value = pendiente?.id || tickets.value[0].id;
  }

  try {
    const response = await getJson<ApiRespuesta<unknown>>(`${API_BASE}/ventas/eliminarVenta/${id}`, {
      method: 'DELETE'
    });
    
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
const historialVentaSeleccionada = ref<VentaDTO | { idVenta: number; numeroTicket?: number; fechaVenta?: string; montoTotal?: number | string; metodoPago?: string; estatus?: string } | null>(null);
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
  let resultados = productos.value.filter(p => {
    const stock = p.dto?.stock;
    return stock === undefined || stock === null || stock > 0;
  });
  
  if (query) {
    resultados = resultados.filter(p => 
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
      const precioMayoreo = item?.precio_mayoreo != null ? Number(item.precio_mayoreo) : null;

      return {
        id,
        nombre,
        codigo_barras: codigo.length ? codigo : null,
        precio,
        precio_mayoreo: (precioMayoreo != null && precioMayoreo > 0) ? precioMayoreo : null,
        dto: markRaw(item),
        is_gramaje: item.is_gramaje
      };
    })
    .filter((p) => p.id > 0 && p.nombre.length > 0 && Number.isFinite(p.precio));
}

async function toggleMayoreo(item: TicketItem) {
  if (!item.precio_mayoreo || item.precio_mayoreo <= 0) {
    mostrarMensaje(`El producto "${item.nombre}" no tiene precio de mayoreo.`, 'error');
    return;
  }

  const nuevoMayoreo = !item.is_mayoreo;
  const precioAnterior = item.precio;
  
  item.is_mayoreo = nuevoMayoreo;
  item.precio = nuevoMayoreo ? item.precio_mayoreo : (item.dto?.precio_venta ? Number(item.dto.precio_venta) : item.precio);

  if (item.idVentaDetalle && ticketActual.value) {
    try {
      await crearDetalleVenta(ticketActual.value.id, item);
    } catch (e) {
      item.is_mayoreo = !nuevoMayoreo;
      item.precio = precioAnterior;
      mostrarMensaje('Error al actualizar precio.', 'error');
    }
  }
}

const { getProductosCache, setProductosCache } = useProductosCache();

async function cargarProductos() {
  const cached = getProductosCache<ProductoDTO[]>();
  if (cached) {
    productos.value = normalizarProductos(cached);
    mostrarMensaje('Catalogo cargado desde caché.', 'ok');
  }

  try {
    const data = await getJson<ApiRespuesta<ProductoDTO[]>>(`${API_BASE}/productos/listarProductos`);
    if (data?.datos) {
      productos.value = normalizarProductos(data.datos);
      setProductosCache(data.datos);
    }
    mostrarMensaje(data?.mensaje || 'Catalogo cargado.', 'ok');
  } catch (_error) {
    if (productos.value.length === 0) {
      productos.value = [];
      mostrarMensaje('No se pudo cargar el catalogo de productos.', 'error');
    }
  }
}

function getFechaHoy() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function buscarProductoPorCodigoBarras(codigo: string): Promise<Producto | undefined> {
  try {
    const data = await getJson<ApiRespuesta<ProductoDTO>>(
      `${API_BASE}/productos/buscarPorCodigoBarras/${encodeURIComponent(codigo)}`
    );
    const normalizados = normalizarProductos(data?.datos ? [data.datos] : []);
    return normalizados[0] ?? undefined;
  } catch (_error) {
    return undefined;
  }
}

async function buscarProducto(termino: string): Promise<Producto | undefined> {
  const query = termino.trim().toLowerCase();
  if (!query) return undefined;

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
    if (!ticketActual.value) {
      mostrarMensaje('No se pudo crear el ticket', 'error');
      return;
    }
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
    idUsuario,
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
    
    const responseData = data?.datos as { idVentaDetalle?: number } | null;
    if (data?.codigo === 200 && responseData?.idVentaDetalle) {
      item.idVentaDetalle = responseData.idVentaDetalle;
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
      idUsuario
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
      idUsuario
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

async function verDetalleVenta(venta: VentaDTO | { idVenta: number; numeroTicket?: number }) {
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

async function cancelarVentaDesdeHistorial(venta: VentaDTO | { idVenta: number; numeroTicket?: number }) {
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
    if (!ticketActual.value) {
      mostrarMensaje('No se pudo crear el ticket', 'error');
      return;
    }
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
  playSound('add');
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
  console.log('Starting scanner with bundled Quagga');
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
      } as any,
      function (err: any) {
        if (err) {
          console.error('Quagga init error:', err);
          mostrarMensaje('Error al iniciar la cámara: ' + err.message, 'error');
          stopScanner();
          resolve();
          return;
        }
        Quagga.start();
        resolve();
      }
    );
  });

  Quagga.onDetected(handleScannerDetection);
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
  if (Quagga) {
    Quagga.stop();
    Quagga.offDetected(handleScannerDetection);
  }
  scannerActivo.value = false;
}

async function buscarYAgregarProducto(codigo: string) {
  console.log('Buscando código:', codigo);
  
  let producto = productos.value.find(
    (p) => String(p.codigo_barras) === codigo || String(p.id) === codigo
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
            size: 1;
            if (producto.is_gramaje && precioUnitario > 0) {
              precioUnitario = precioUnitario / 1000;
            }
          } else if (comando.tipo === 'PRECIO') {
            const valorPesos = Number(comando.valor) || 0;
            const precioVentaNum = Number(producto.precio_venta) || 0;
            if (producto.is_gramaje && precioVentaNum > 0) {
              cantidad = Math.floor((valorPesos / precioVentaNum) * 1000);
              cantidad = cantidad > 0 ? cantidad : 1;
              const precioRedondeado = Math.round(valorPesos);
              precioUnitario = precioRedondeado / cantidad;
            } else {
              cantidad = 1;
              precioUnitario = valorPesos;
            }
          }
          
          if (!ticketActual.value) {
            await crearNuevoTicket();
            if (!ticketActual.value) continue;
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
              id: producto.idProducto || producto.id,
              nombre: producto.nombre,
              cantidad: cantidad,
              precio: precioUnitario,
              is_gramaje: isGramaje || comando.tipo === 'PRECIO',
              dto: producto,
              codigo_barras: producto.codigoBarras || producto.codigo_barras || null
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
              <small>{{ formatoMoneda(producto.precio) }}</small>
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
          <div class="item-info">
            <h3>{{ item.nombre }}</h3>
            <p>Codigo: {{ item.codigo_barras || 'Sin codigo' }}</p>
            <p>Precio: {{ formatoMoneda(item.precio) }}</p>
            <p v-if="item.precio_mayoreo && item.precio_mayoreo > 0">
              <label class="mayoreo-label">
                <input
                  type="checkbox"
                  :checked="item.is_mayoreo"
                  @change="toggleMayoreo(item)"
                >
                Mayoreo ({{ formatoMoneda(item.precio_mayoreo) }})
              </label>
            </p>
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

        <div v-if="ticket.length === 0" class="ticket-vacio">
          Aun no hay productos en el ticket.
        </div>
      </div>

      <footer class="ticket-actions">
        <button type="button" class="btn-secondary btn-limpiar" @click="limpiarTicket">
          <span class="icono">🗑️</span>
          <span class="texto">Limpiar Ticket</span>
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
              {{ historialVentaSeleccionada?.estatus === 'C' ? '✅ Completada' : historialVentaSeleccionada?.estatus === 'F' ? '✅ Finalizada' : historialVentaSeleccionada?.estatus === 'P' ? '⏳ Pendiente' : '❌ Inactiva' }}
            </span>
          </div>
        </div>

        <div class="detalle-content">
          <h4 class="titulo-productos">🛒 Productos</h4>
          <p v-if="historialDetalleCargando" class="estado">Cargando detalles...</p>
          <p v-else-if="historialVentaDetalle.length === 0" class="estado">No hay detalles para esta venta.</p>
          
          <div v-else class="detalle-lista">
            <div v-for="(detalle, index) in historialVentaDetalle" :key="detalle.idVentaDetalle || index" class="detalle-item" :style="{ animationDelay: `${index * 50}ms` }">
              <div class="detalle-info">
                <span class="numero-item">{{ index + 1 }}.</span>
                <strong>{{ (detalle.producto || detalle.Producto)?.nombre || 'Producto' }}</strong>
              </div>
              <div class="detalle-cantidad">
                {{ detalle.cantidad }}{{ (detalle.producto || detalle.Producto)?.is_gramaje ? 'g' : 'pza' }}
              </div>
              <div class="detalle-precio">
                <span class="precio-unit">{{ formatoMoneda(Number(detalle.precioUnitarioVenta)) }}/{{ (detalle.producto || detalle.Producto)?.is_gramaje ? 'g' : 'pza' }}</span>
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
.ventas-layout {
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
  background: var(--bg-primary);
  color: var(--text-primary);
  position: relative;
}

.ventas-col {
  padding: 0.75rem;
  margin-bottom: var(--ventas-space);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
  background: var(--bg-secondary);
    border-radius: 8px;
}

.ventas-col::before {
  content: "";
  position: absolute;
  inset: 8px;
  border: 2px dashed color-mix(in srgb, var(--accent-color) 30%, transparent);
  pointer-events: none;
  border-radius: 8px;
}

.panel-header {
  position: relative;
}

.panel-header h2 {
  font-size: clamp(1.1rem, 2.8vw, 1.4rem);
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 900;
  text-shadow: 2px 2px 0 var(--border-color);
  margin: 0;
}

.panel-header p {
  color: var(--text-secondary);
  font-size: clamp(0.72rem, 1.9vw, 0.85rem);
  margin: 0.3rem 0 0;
  opacity: 0.85;
  letter-spacing: 0.03em;
}

.ticket-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tickets-tabs {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  position: relative;
}

.ticket-tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.4rem 0.6rem;
  border: 2px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: 0 2px 0 var(--border-color);
  min-width: 50px;
}

.ticket-tab.active {
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 45%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
  box-shadow: 0 2px 0 var(--border-color), 0 0 8px color-mix(in srgb, var(--accent-color) 40%, transparent);
}

.ticket-tab.completed {
  background: var(--success-color);
  color: var(--bg-primary);
}

.tab-close {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  background: var(--error-color);
  color: white;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.buscador-wrap {
  position: relative;
  z-index: 30;
  display: flex;
  gap: 0.5rem;
}

.buscador-wrap input {
  flex: 1;
  background: var(--bg-primary);
  border: var(--border-width) solid var(--border-color);
  padding: 0.7rem 0.8rem;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-size: 0.95rem;
  outline: none;
}

.buscador-wrap input::placeholder {
  color: var(--text-secondary);
}

.btn-microphone, .btn-scanner {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--border-width) solid var(--border-color);
  background: var(--bg-primary);
  color: var(--accent-color);
  cursor: pointer;
}

.sugerencias-lista {
  list-style: none;
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  border: var(--border-width) solid var(--border-color);
  background: var(--bg-secondary);
  z-index: 100;
  max-height: 280px;
  height: auto;
  overflow-y: scroll;
  box-shadow: 0 6px 0 var(--border-color), 0 10px 16px var(--shadow-color);
}

.sugerencia-item {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  padding: 0.6rem 0.7rem;
  display: flex;
  justify-content: space-between;
  font-family: "Courier New", monospace;
  cursor: pointer;
}

.ticket-lista {
  overflow-y: auto;
  display: grid;
  gap: 0.4rem;
  padding-right: 0.3rem;
  position: relative;
  pointer-events: none;
}

.ticket-etiqueta {
  height: max-content;
  border: 2px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  padding: 0.4rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.4rem;
  align-items: center;
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-color) 40%, transparent), inset 0 0 8px color-mix(in srgb, var(--accent-color) 15%, transparent), 0 2px 0 var(--border-color), 0 3px 6px rgba(0, 0, 0, 0.3);
  animation: popIn 150ms steps(4), zeldaGlow 3s ease-in-out infinite alternate;
  transition: transform 150ms ease, box-shadow 150ms ease;
  pointer-events: auto;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes zeldaGlow {
  from { box-shadow: 0 0 8px color-mix(in srgb, var(--accent-color) 30%, transparent), inset 0 0 5px color-mix(in srgb, var(--accent-color) 10%, transparent), 0 2px 0 var(--border-color), 0 3px 6px rgba(0, 0, 0, 0.3); }
  to { box-shadow: 0 0 16px color-mix(in srgb, var(--accent-color) 50%, transparent), inset 0 0 10px color-mix(in srgb, var(--accent-color) 20%, transparent), 0 2px 0 var(--border-color), 0 3px 6px rgba(0, 0, 0, 0.3); }
}

.ticket-etiqueta:hover {
  transform: translateX(4px) scale(1.02);
  box-shadow: 0 0 20px color-mix(in srgb, var(--accent-color) 60%, transparent), inset 0 0 12px color-mix(in srgb, var(--accent-color) 25%, transparent), 0 4px 0 var(--border-color), 0 6px 10px rgba(0, 0, 0, 0.4);
}

.ticket-etiqueta h3 {
  margin: 0;
  color: var(--accent-color);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-shadow: 0 0 10px color-mix(in srgb, var(--accent-color) 80%, transparent), 2px 2px 0 var(--border-color);
}

.ticket-etiqueta p {
  font-size: 0.65rem;
  color: var(--text-secondary);
  margin: 0;
  font-family: "Courier New", monospace;
  text-shadow: 1px 1px 0 var(--border-color);
}

.etiqueta-controles {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.etiqueta-controles button {
  min-width: 24px;
  padding: 0.2rem 0.25rem;
  border: 2px solid var(--border-color);
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 45%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 0 2px 0 var(--border-color);
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
  color: var(--bg-primary);
  background: rgba(255, 255, 255, 0.5);
  padding: 0.15rem 0.3rem;
  border: 1px solid var(--border-color);
}

.etiqueta-total {
  grid-column: 1 / -1;
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--success-color);
  font-family: "Courier New", monospace;
  text-align: right;
  border-top: 1px dashed var(--border-color);
  padding-top: 0.3rem;
  margin-top: 0.15rem;
}

.btn-danger {
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  color: #fff;
  border: 2px solid var(--border-color);
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
}

.ticket-vacio {
  text-align: center;
  color: var(--text-primary);
  opacity: 0.85;
  font-size: 0.95rem;
  padding: 2rem;
  border: 2px dashed color-mix(in srgb, var(--accent-color) 30%, transparent);
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

.resumen-col {
  justify-content: flex-start;
}

.resumen-card {
  border: 3px solid var(--border-color);
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  color: var(--text-primary);
  padding: 0.85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5), 0 4px 0 var(--border-color);
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
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--accent-color) 50%, var(--gradient-btn-end) 100%);
  box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--accent-color) 30%, white), 0 4px 0 var(--border-color);
  animation: pulseGold 2s ease-in-out infinite;
}

@keyframes pulseGold {
  0%, 100% { box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--accent-color) 30%, white), 0 4px 0 var(--border-color); }
  50% { box-shadow: inset 0 0 0 3px white, 0 4px 0 var(--border-color), 0 0 12px color-mix(in srgb, var(--accent-color) 30%, transparent); }
}

.resumen-card.total strong {
  font-size: 1.3rem;
  color: var(--btn-text, var(--bg-primary));
}

.acciones-grid {
  margin-top: 0.5rem;
  gap: 0.6rem;
  z-index: 1;
}

.btn-accion {
  width: 100%;
  height: 70px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  border: var(--border-width) solid var(--border-color);
  font-family: "Courier New", monospace;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent-color) 20%, white), 0 3px 0 var(--border-color);
  transition: all 150ms;
}

.btn-accion .icono { font-size: 1.4rem; }
.btn-accion .texto { font-size: 0.75rem; letter-spacing: 0.05em; }

.btn-cobrar {
  grid-column: span 2;
  height: 85px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--success-color) 80%, white) 0%, var(--success-color) 50%, color-mix(in srgb, var(--success-color) 70%, black) 100%) !important;
  color: var(--bg-primary) !important;
  font-size: 1.1rem;
}

.btn-salida {
  background: linear-gradient(180deg, color-mix(in srgb, var(--error-color) 80%, white) 0%, var(--error-color) 50%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  color: #fff;
}

.btn-entrada {
  background: linear-gradient(180deg, color-mix(in srgb, var(--infoBlueColor) 80%, white) 0%, var(--infoBlueColor) 50%, color-mix(in srgb, var(--infoBlueColor) 70%, black) 100%);
  color: #fff;
}

.btn-historial {
  background: linear-gradient(180deg, color-mix(in srgb, var(--hystorybtn) 80%, white) 0%, var(--hystorybtn) 50%, color-mix(in srgb, var(--hystorybtn) 70%, black) 100%);
  color: #fff;
}

.detalle-venta-modal {
  width: min(100%, 650px) !important;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 1.8rem !important;
}

.info-venta-detalle {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 1.2rem;
  background: var(--bg-primary);
  border: 2px solid color-mix(in srgb, var(--accent-color) 20%, transparent);
  border-radius: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.info-item .label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.info-item .value {
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 700;
}

.info-item .value.total {
  font-size: 1.4rem;
  color: var(--success-color);
}

.detalle-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.detalle-lista {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.detalle-item {
  display: grid;
  grid-template-columns: 1fr auto 120px;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.detalle-info {
  flex-direction: column;
  gap: 0.2rem;
}

.detalle-info strong {
  font-size: 0.95rem;
  color: var(--accent-color);
}

.detalle-cantidad {
  font-weight: 700;
  color: var(--text-primary);
  background: var(--bg-secondary);
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  min-width: 60px;
  text-align: center;
  font-family: "Courier New", monospace;
}

.detalle-precio {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.detalle-subtotal {
  font-weight: 900;
  color: var(--success-color);
  font-size: 1.05rem;
}

.precio-unit {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.modal-header-detalle h3 {
  font-size: 1.3rem;
  text-align: center;
  color: var(--accent-color);
  text-shadow: 2px 2px 0 var(--border-color);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--shadow-color);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.modal-card {
  width: min(100%, 500px);
  background: var(--bg-panel);
  border: var(--border-width-thick) solid var(--accent-color);
  padding: 1.5rem;
  position: relative;
}

.ticket-actions {
  z-index: 1;
  position: relative;
}

.btn-limpiar {
  width: 100%;
  border: 2px solid var(--border-color);
  padding: 0.5rem 0.8rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  background: linear-gradient(180deg, var(--error-color) 0%, var(--zelda-gold) 100%);
  color: var(--text-primary);
  box-shadow: 0 2px 0 var(--border-color);
}

@media (max-width: 980px) {
  .ventas-layout { grid-template-columns: 1fr; }
  .ticket-lista { max-height: 35vh; }
}

.mayoreo-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--accent-color) !important;
  font-size: 0.85rem;
  cursor: pointer;
  margin-top: 0.25rem;
}

.mayoreo-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
  accent-color: var(--accent-color);
}
</style>
