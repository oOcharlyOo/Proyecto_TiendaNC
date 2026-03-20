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

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';
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
const ticketVisibleMobile = ref(false); 
const isKeyboardVisible = ref(false);

function handleResize() {
  isKeyboardVisible.value = window.innerWidth < 768 && window.innerHeight < 500;
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
  
  window.addEventListener('focusin', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      isKeyboardVisible.value = true;
      ticketVisibleMobile.value = false;
    }
  });
  
  window.addEventListener('focusout', () => {
    isKeyboardVisible.value = false;
  });
});

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

const tieneProductosGranel = computed(() => {
  return ticket.value.some(item => item.is_gramaje || item.cantidad > 100);
});

const tieneProductosUnitarios = computed(() => {
  return ticket.value.some(item => !item.is_gramaje && item.cantidad <= 100);
});

const totalGramos = computed(() => {
  if (!tieneProductosGranel.value) return 0;
  return ticket.value.reduce((acumulado, item) => {
    if (item.is_gramaje || item.cantidad > 100) {
      return acumulado + item.cantidad;
    }
    return acumulado;
  }, 0);
});

const totalUnitarios = computed(() => {
  if (!tieneProductosUnitarios.value) return 0;
  return ticket.value.reduce((acumulado, item) => {
    if (!item.is_gramaje && item.cantidad <= 100) {
      return acumulado + item.cantidad;
    }
    return acumulado;
  }, 0);
});

const ticketInfoText = computed(() => {
  if (ticket.value.length === 0) return '0 items';
  
  const unitarios = totalUnitarios.value;
  const gramos = totalGramos.value;
  
  if (unitarios > 0 && gramos > 0) {
    return `${unitarios} items, ${gramos}g`;
  }
  
  if (gramos > 0) {
    return `${gramos}g`;
  }
  
  return `${unitarios} ${unitarios === 1 ? 'item' : 'items'}`;
});

const productosParaMostrar = computed(() => {
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
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
});

const sugerenciasPorNombre = computed(() => {
  const query = terminoBusqueda.value.trim().toLowerCase();
  if (!query) return [];
  
  return productos.value.filter(p => 
    p.nombre.toLowerCase().includes(query) ||
    (p.codigo_barras && p.codigo_barras.includes(query))
  ).slice(0, 20);
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

async function completarVenta(idVenta: number, metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA', montoTotal: number) {
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

async function procesarCobro(metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA') {
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

async function confirmarCobroTarjeta() {
  await procesarCobro('TARJETA');
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

function formatoMonedaRedondeada(valor: number) {
  const redondeado = Math.round(Number(valor || 0));
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(redondeado);
}

function getMetodoClase(metodo: string | undefined): string {
  if (!metodo) return '';
  const m = metodo.toUpperCase();
  if (m.includes('TARJETA')) return 'tarjeta';
  if (m.includes('TRANSFERENCIA')) return 'transferencia';
  if (m.includes('EFECTIVO')) return 'efectivo';
  return '';
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
  <main class="pos-container">
    <!-- SIDEBAR: LISTA DE TICKETS/MESAS -->
    <aside class="pos-sidebar tickets-nav animate-slide-in-left">
      <div class="sidebar-header">
        <span class="icon">🎫</span>
        <h3>Tickets</h3>
        <button type="button" class="btn-add-ticket" @click="crearNuevoTicket" title="Nuevo Ticket">
          <span class="plus">+</span>
        </button>
      </div>
      
      <nav class="tickets-list custom-scrollbar">
        <div
          v-for="t in tickets"
          :key="t.id"
          class="ticket-nav-item"
          :class="{ 
            'is-active': t.id === ticketActualId, 
            'is-completed': t.estado === 'completado',
            'is-empty': t.items.length === 0
          }"
          @click="seleccionarTicket(t.id)"
        >
          <div class="ticket-info">
            <span class="ticket-num">#{{ t.numero }}</span>
            <span class="ticket-total" v-if="t.items.length > 0">
              {{ formatoMoneda(t.items.reduce((sum, i) => sum + i.precio * i.cantidad, 0)) }}
            </span>
            <span class="ticket-status" v-else>vacío</span>
          </div>
          <button 
            v-if="t.items.length === 0 && tickets.length > 1" 
            type="button" 
            class="btn-delete-ticket"
            @click.stop="eliminarTicket(t.id)"
          >
            ×
          </button>
        </div>
      </nav>
    </aside>

    <!-- PANEL CENTRAL: BUSCADOR Y CATÁLOGO -->
    <section class="pos-center catalog-section">
      
      <!-- BARRA DE TICKETS HORIZONTAL (para tablets y móviles) -->
      <div class="tickets-bar-mobile">
        <div class="tickets-bar-scroll custom-scrollbar">
          <button 
            type="button" 
            class="btn-add-ticket-mini" 
            @click="crearNuevoTicket" 
            title="Nuevo Ticket"
          >
            +
          </button>
          <div
            v-for="t in tickets"
            :key="t.id"
            class="ticket-chip"
            :class="{ 
              'is-active': t.id === ticketActualId, 
              'is-empty': t.items.length === 0
            }"
            @click="seleccionarTicket(t.id)"
          >
            <span class="chip-num">#{{ t.numero }}</span>
            <span class="chip-total" v-if="t.items.length > 0">
              {{ formatoMoneda(t.items.reduce((sum, i) => sum + i.precio * i.cantidad, 0)) }}
            </span>
            <span class="chip-status" v-else>vacío</span>
          </div>
        </div>
      </div>

      <header class="catalog-header">
        <div class="search-bar-pos">
          <div class="input-wrapper">
            <span class="search-icon">🔍</span>
            <input
              v-model="terminoBusqueda"
              type="text"
              placeholder="Buscar por nombre o código..."
              @focus="manejarFocusBusqueda"
              @input="manejarInputBusqueda"
              @blur="ocultarSugerencias"
              @keydown="manejarTeclasSugerencias"
              @keydown.enter.prevent="agregarDesdeBuscador"
            >
            <div class="action-tools">
              <button class="tool-btn btn-scan" @click="startScanner" title="Escanear">📷</button>
              <button class="tool-btn btn-mic" :class="{ 'is-recording': isRecording }" @mousedown.prevent="startVoiceCommand">🎤</button>
            </div>
          </div>
        </div>
      </header>

        <!-- ÁREA DE PRODUCTOS RÁPIDOS / RESULTADOS -->
      <div class="catalog-grid custom-scrollbar">
        <div v-if="mensaje" class="pos-alert" :class="`alert-${mensajeTipo}`">
          {{ mensaje }}
        </div>

        <div class="catalog-items-container">
          <!-- Mostrar todos los productos disponibles -->
          <div v-if="productosParaMostrar.length > 0" class="products-grid">
            <article 
              v-for="p in productosParaMostrar" 
              :key="p.id" 
              class="product-card clickable animate-pop-in"
              @click="agregarProductoATicket(p)"
            >
              <div class="card-glow"></div>
              <div class="product-icon">📦</div>
              <div class="product-details">
                <h4 class="product-name">{{ p.nombre }}</h4>
                <div class="product-price-tag">{{ formatoMoneda(p.precio) }}</div>
              </div>
              <div class="stock-badge" :class="(p.dto?.stock ?? 0) > 5 ? 'in-stock' : 'low-stock'">
                Stock: {{ p.dto?.stock ?? '∞' }}
              </div>
            </article>
          </div>
          
          <div v-else class="empty-catalog">
            <span class="empty-icon">🏺</span>
            <p>No hay productos disponibles</p>
          </div>
        </div>
      </div>
    </section>

    <!-- PANEL DERECHO: TICKET Y COBRO -->
    <aside class="pos-right checkout-section animate-slide-in-right" :class="{ 'is-open': ticketVisibleMobile }">
      <!-- Activador para móviles -->
      <div class="mobile-ticket-trigger" @click="ticketVisibleMobile = !ticketVisibleMobile">
        <div class="trigger-info">
          <span class="icon">🛒</span>
          <span class="count">{{ ticketInfoText }}</span>
        </div>
        <div class="trigger-total">{{ formatoMoneda(totalVenta) }}</div>
        <span class="chevron">{{ ticketVisibleMobile ? '▼' : '▲' }}</span>
      </div>

      <div class="checkout-container parchment-bg">
        <header class="checkout-header">
          <div class="header-title">
            <span class="icon">📜</span>
            <h3>Cuenta #{{ ticketActual?.numero ?? '-' }}</h3>
          </div>
          <button class="btn-clear-all" @click="limpiarTicket" v-if="ticket.length > 0">Limpiar</button>
        </header>

        <!-- LISTA DE ITEMS EN EL TICKET -->
        <div class="ticket-items-list custom-scrollbar">
          <TransitionGroup name="list">
            <article v-for="item in ticket" :key="item.id" class="ticket-item-row">
              <div class="item-main">
                <div class="item-info">
                  <h4 class="item-name">{{ item.nombre }}</h4>
                  <div class="item-meta">
                    <span class="unit-price">{{ formatoMoneda(item.precio) }}</span>
                    <label v-if="item.precio_mayoreo && item.precio_mayoreo > 0" class="mayoreo-toggle">
                      <input type="checkbox" :checked="item.is_mayoreo" @change="toggleMayoreo(item)">
                      <span>Mayoreo</span>
                    </label>
                  </div>
                </div>
                
                <div class="item-actions">
                  <div class="qty-control">
                    <button class="qty-btn" @click="disminuirCantidad(item)">-</button>
                    <span class="qty-val">{{ item.cantidad }}{{ item.is_gramaje ? 'g' : '' }}</span>
                    <button class="qty-btn" @click="aumentarCantidad(item)">+</button>
                  </div>
                  <div class="item-subtotal">
                    {{ formatoMoneda(item.precio * item.cantidad) }}
                  </div>
                </div>
              </div>
              <button class="btn-remove-item" @click="quitarItem(item.id)" title="Quitar item">×</button>
            </article>
          </TransitionGroup>

          <div v-if="ticket.length === 0" class="empty-ticket-msg">
            <p>No hay productos en esta cuenta</p>
          </div>
        </div>

        <!-- RESUMEN FINAL -->
        <footer class="checkout-footer">
          <div class="summary-table">
            <div class="summary-row">
              <span>Artículos:</span>
              <strong>{{ ticketInfoText }}</strong>
            </div>
            <div class="summary-row total">
              <span>TOTAL</span>
              <strong class="total-amount">{{ formatoMoneda(totalVenta) }}</strong>
            </div>
          </div>

          <div class="checkout-actions-scroll">
            <div class="checkout-actions">
              <button class="btn-checkout primary" @click="cobrar" :disabled="ticket.length === 0">
                <span class="icon">💰</span>
                <span class="text">COBRAR AHORA</span>
              </button>
              
              <div class="extra-actions">
                <button class="btn-checkout secondary" @click="historialVentasAbrir" title="Historial">📜</button>
                <button class="btn-checkout secondary" @click="entradaEfectivo" title="Entrada Cash">📥</button>
                <button class="btn-checkout secondary" @click="salidaEfectivo" title="Salida Cash">📤</button>
              </div>
            </div>
          </div>
          
          <div class="cashier-badge">
            <span class="dot"></span> Cajero: {{ nombreUsuario }}
          </div>
        </footer>
      </div>
    </aside>

    <!-- COMPONENTES ADICIONALES (MODALES, ESCÁNER) -->
    <EntradaEfectivoModal :open="modalEntradaAbierto" @close="modalEntradaAbierto = false" @submit="registrarEntradaEfectivo" />
    <SalidaEfectivoModal :open="modalSalidaAbierto" @close="modalSalidaAbierto = false" @submit="registrarSalidaEfectivo" />
    <HistorialVentasModal :open="modalHistorialAbierto" :loading="historialCargando" :cobro-total="historialCobroTotal" :ganancia-total="historialGananciaTotal" :ventas="historialVentas" @close="modalHistorialAbierto = false" @ver-detalle="verDetalleVenta" @cancelar="cancelarVentaDesdeHistorial" />
    
    <!-- Detalle de venta modal custom -->
    <div v-if="modalDetalleVentaAbierto" class="pos-modal-overlay" @click.self="cerrarDetalleVenta">
      <div class="pos-modal-card animate-pop-in">
        <div class="modal-corner tl"></div>
        <div class="modal-corner tr"></div>
        <div class="modal-corner bl"></div>
        <div class="modal-corner br"></div>
        
        <header class="modal-h">
          <h3>🔍 Detalle de Venta #{{ historialVentaSeleccionada?.numeroTicket }}</h3>
          <button class="close-x" @click="cerrarDetalleVenta">×</button>
        </header>
        <div class="modal-b custom-scrollbar">
          <div class="venta-meta-grid">
            <div class="meta-box">
              <span class="meta-icon">📅</span>
              <span>Fecha</span>
              <strong>{{ historialVentaSeleccionada?.fechaVenta?.slice(0, 10) }}</strong>
            </div>
            <div class="meta-box">
              <span class="meta-icon">💳</span>
              <span>Método</span>
              <strong class="method-badge" :class="getMetodoClase(historialVentaSeleccionada?.metodoPago)">
                {{ historialVentaSeleccionada?.metodoPago }}
              </strong>
            </div>
            <div class="meta-box total">
              <span class="meta-icon">💰</span>
              <span>Total</span>
              <strong class="txt-pos">{{ formatoMoneda(Number(historialVentaSeleccionada?.montoTotal)) }}</strong>
            </div>
          </div>
          <div class="items-header">
            <span>🛒 Productos</span>
          </div>
          <div class="detalle-items-list">
            <div v-for="(d, i) in historialVentaDetalle" :key="i" class="d-item">
              <span class="d-name" :title="(d.producto || d.Producto)?.nombre">{{ (d.producto || d.Producto)?.nombre }}</span>
              <span class="d-qty">{{ d.cantidad }} {{ (d.producto || d.Producto)?.is_gramaje ? 'g' : 'pza' }}</span>
              <strong class="d-sub">{{ formatoMonedaRedondeada(d.precioUnitarioVenta * d.cantidad) }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CalculadoraGramajeModal :open="modalGramajeAbierto" :producto="modalProductoGramaje ? { ...modalProductoGramaje, codigo_barras: modalProductoGramaje.codigo_barras ?? '' } : null" @close="modalGramajeAbierto = false; modalProductoGramaje = null" @add="agregarProductoGramaje" />
    <CobroModal :open="modalCobroAbierto" :total="totalVenta" @close="modalCobroAbierto = false" @confirmar-efectivo="confirmarCobroEfectivo" @confirmar-transferencia="confirmarCobroTransferencia" @confirmar-tarjeta="confirmarCobroTarjeta" />

    <div v-if="scannerActivo" class="scanner-full-overlay">
      <div class="scanner-frame">
        <div id="scanner-interactive"></div>
        <div class="scan-laser"></div>
        <button class="btn-stop-scan" @click="stopScanner">Detener</button>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* =========================================
   POS LAYOUT & CONTAINERS
   ========================================= */
.pos-container {
  display: grid;
  grid-template-columns: 70px 1fr 360px;
  grid-template-rows: 1fr;
  height: calc(98vh - 64px);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  position: relative;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.products-grid {
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem !important;
  padding: 1rem;
}

/* Pantallas grandes (>1400px) */
@media (min-width: 1400px) {
  .pos-container {
    grid-template-columns: 70px 1fr 400px;
  }
}

/* Pantallas medianas-grandes (1200px-1399px) */
@media (max-width: 1199px) {
  .pos-container {
    grid-template-columns: 60px 1fr 320px;
  }
}

/* Pantallas medianas (992px-1199px) */
@media (max-width: 991px) {
  .pos-container {
    grid-template-columns: 1fr 300px;
    grid-template-rows: 1fr;
  }
  .tickets-bar-mobile {
    display: flex;
    background: var(--bg-secondary);
    border-bottom: var(--border-width) solid var(--border-color);
    padding: 0.6rem;
  }
  .tickets-bar-scroll {
    display: flex;
    gap: 0.6rem;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.2rem;
  }
  .btn-add-ticket-mini {
    min-width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }
  .ticket-chip {
    min-width: 55px;
    height: 50px;
    padding: 0.4rem 0.7rem;
  }
  .chip-num { font-size: 0.85rem; }
  .chip-total { font-size: 0.6rem; }
  .chip-status { font-size: 0.55rem; }
}

/* Pantallas entre 768px y 991px - ajusta checkout */
@media (min-width: 768px) and (max-width: 991px) {
  .pos-container {
    grid-template-columns: 1fr 290px !important;
    gap: 0.4rem !important;
    padding: 0.5rem !important;
  }
  
  .pos-center {
    padding: 0.5rem !important;
    min-width: 0 !important;
  }
  
  .catalog-header {
    padding: 0.8rem 1rem !important;
  }
  
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem !important;
  }
  
  .product-card {
    padding: 0.5rem !important;
    gap: 0.3rem !important;
  }
  
  .product-icon {
    font-size: 1.8rem !important;
  }
  
  .product-name {
    font-size: 0.75rem !important;
    height: auto !important;
  }
  
  .product-price-tag {
    padding: 0.2rem 0.5rem !important;
    font-size: 0.8rem !important;
  }
  
  .pos-right {
    position: relative !important;
    width: 290px !important;
    min-width: 290px !important;
    max-width: 290px !important;
    height: 100% !important;
    transform: none !important;
    border-radius: 0 !important;
    border-left: var(--border-width-thick) solid var(--border-color) !important;
  }
  
  .checkout-container {
    padding: 0.6rem !important;
    height: 100% !important;
  }
  
  .parchment-bg {
    background-size: 100% 100%, 14px 14px !important;
  }
  
  .ticket-header {
    padding: 0.5rem !important;
  }
  
  .ticket-items {
    max-height: 200px !important;
  }
  
  .checkout-summary {
    padding: 0.6rem !important;
    gap: 0.4rem !important;
  }
  
  .checkout-total {
    font-size: 1.2rem !important;
  }
  
  .checkout-actions {
    padding: 0.5rem !important;
    gap: 0.4rem !important;
  }
}

/* Pantallas pequeñas y móviles (768px-991px) */
@media (max-width: 767px) {
  .pos-container {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
    max-height: 100dvh;
    overflow: hidden;
  }
  
  .pos-center {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .tickets-bar-mobile {
    display: flex !important;
    background: var(--bg-secondary) !important;
    border-bottom: var(--border-width) solid var(--border-color);
    padding: 0.6rem 0.5rem;
    overflow: visible;
    flex-shrink: 0;
    z-index: 40;
    min-height: 60px;
    position: relative;
  }
  
  .tickets-bar-scroll {
    display: flex !important;
    flex-direction: row !important;
    gap: 0.6rem;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    padding: 0.2rem;
    -webkit-overflow-scrolling: touch;
    align-items: center;
    width: 100%;
  }
  
  .btn-add-ticket-mini {
    min-width: 50px;
    height: 50px;
    border: var(--border-width) solid var(--accent-color);
    border-radius: 10px;
    background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 50%, var(--gradient-btn-end) 100%);
    color: var(--border-color);
    font-size: 1.5rem;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .ticket-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 55px;
    height: 50px;
    padding: 0.4rem 0.7rem;
    border: var(--border-width) solid var(--border-color);
    border-radius: 10px;
    background: var(--bg-primary);
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  
  .ticket-chip.is-active {
    border-color: var(--accent-color);
    background: color-mix(in srgb, var(--accent-color) 15%, var(--bg-primary));
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent-color) 30%, transparent);
  }
  
  .ticket-chip.is-empty {
    opacity: 0.6;
  }
  
  .chip-num {
    font-weight: bold;
    font-size: 0.8rem;
    color: var(--accent-color);
  }
  
  .chip-total {
    font-size: 0.55rem;
    color: var(--success-color);
    font-weight: bold;
    white-space: nowrap;
  }
  
  .chip-status {
    font-size: 0.5rem;
    color: var(--text-secondary);
    text-transform: uppercase;
  }
  
  .pos-right {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100% !important;
    min-width: 100% !important;
    max-width: 100% !important;
    height: 55vh;
    z-index: 50;
    transform: translateY(calc(100% - 60px));
    transition: transform 0.3s ease;
    border-radius: 20px 20px 0 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .pos-right.is-open {
    transform: translateY(0);
  }
  
  /* Cuando el teclado está activo - ocultar panel de cobro */
  .pos-right.keyboard-active {
    display: none !important;
  }
  
  .pos-right .checkout-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }
  
  .mobile-ticket-trigger {
    display: flex !important;
  }
}

/* Pantallas muy pequeñas (iPhone XR, etc - menos de 480px) */
@media (max-width: 480px) {
  .pos-container {
    max-height: 100dvh;
    overflow: hidden;
  }
  
  /* Barra de tickets ultra compacta */
  .tickets-bar-mobile {
    padding: 0.3rem 0.25rem;
    min-height: 42px;
  }
  
  .tickets-bar-scroll {
    gap: 0.3rem;
  }
  
  .btn-add-ticket-mini {
    min-width: 36px;
    height: 36px;
    border-radius: 6px;
    font-size: 1rem;
  }
  
  .ticket-chip {
    min-width: 40px;
    height: 36px;
    padding: 0.2rem 0.4rem;
    border-radius: 6px;
  }
  
  .chip-num {
    font-size: 0.65rem;
  }
  
  .chip-total, .chip-status {
    font-size: 0.4rem;
  }
  
  /* Buscador ultra pequeño */
  .catalog-header {
    padding: 0.4rem;
  }
  
  .input-wrapper {
    padding: 0.25rem 0.4rem;
    gap: 0.25rem;
    border-radius: 6px;
  }
  
  .input-wrapper input {
    font-size: 0.8rem;
  }
  
  .search-icon {
    font-size: 0.8rem;
  }
  
  .tool-btn {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
    border-radius: 5px;
  }
  
  /* Grid de productos - 2 columnas compactas */
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.3rem;
  }
  
  .product-card {
    padding: 0.3rem;
    border-radius: 6px;
    gap: 0.2rem;
  }
  
  .product-icon {
    font-size: 1.4rem;
  }
  
  .product-name {
    font-size: 0.6rem;
    height: auto;
    line-height: 1.2;
  }
  
  .product-price-tag {
    font-size: 0.65rem;
    padding: 0.15rem 0.35rem;
    border-radius: 8px;
  }
  
  .stock-badge {
    font-size: 0.45rem;
    padding: 0.08rem 0.2rem;
  }
  
  /* Panel de cobro - más pequeño */
  .pos-right {
    height: 45dvh;
  }
  
  .mobile-ticket-trigger {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    min-height: 36px;
  }
  
  .trigger-info .icon {
    font-size: 0.9rem;
  }
  
  .trigger-total {
    font-size: 0.9rem;
  }
  
  .checkout-header {
    padding: 0.3rem;
    margin-bottom: 0.3rem;
    flex-shrink: 0;
  }
  
  .header-title h3 {
    font-size: 0.8rem;
  }
  
  .header-title .icon {
    font-size: 0.9rem;
  }
  
  .btn-clear-all {
    font-size: 0.55rem;
    padding: 0.15rem 0.4rem;
  }
  
  .ticket-items-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    min-height: 30px;
    max-height: 100px;
    gap: 0.3rem;
  }
  
  .checkout-footer {
    flex-shrink: 0;
    padding-top: 0.4rem;
    gap: 0.4rem;
  }
  
  .ticket-item-row {
    padding: 0.35rem;
  }
  
  .item-name {
    font-size: 0.7rem;
  }
  
  .item-meta {
    font-size: 0.55rem;
    gap: 0.3rem;
  }
  
  .qty-control {
    transform: scale(0.65);
  }
  
  .item-subtotal {
    font-size: 0.7rem;
  }
  
  .btn-remove-item {
    width: 18px;
    height: 18px;
    font-size: 0.9rem;
  }
  
  .summary-row {
    font-size: 0.65rem;
  }
  
  .summary-row.total {
    font-size: 1rem;
  }
  
  .checkout-actions-scroll {
    padding: 0.3rem 0.2rem;
  }
  
  .checkout-actions-scroll .btn-checkout.primary {
    height: 36px;
    font-size: 0.7rem;
    min-width: 110px;
    border-radius: 6px;
    padding: 0 0.6rem;
  }
  
  .checkout-actions-scroll .btn-checkout.primary .icon {
    font-size: 0.8rem;
  }
  
  .checkout-actions-scroll .extra-actions {
    gap: 0.3rem;
  }
  
  .checkout-actions-scroll .btn-checkout.secondary {
    width: 36px;
    min-width: 36px;
    height: 36px;
    font-size: 0.85rem;
    border-radius: 6px;
  }
  
  .cashier-badge {
    font-size: 0.5rem;
    padding-top: 0.2rem;
  }
}

/* Estilos base para barra de tickets (oculta en pantallas grandes) */
.tickets-bar-mobile {
  display: none;
}

/* ACTIVADOR TICKET MÓVIL */
.mobile-ticket-trigger {
  display: none;
  background: linear-gradient(180deg, var(--gradient-panel-start) 0%, var(--gradient-panel-end) 100%);
  border-top: var(--border-width) solid var(--accent-color);
  color: var(--accent-color);
  padding: 0.9rem 1.5rem;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 -4px 15px var(--shadow-color), inset 0 1px 0 color-mix(in srgb, var(--accent-color) 30%, transparent);
  border-radius: 16px 16px 0 0;
  width: 100%;
  box-sizing: border-box;
}

.trigger-info { display: flex; align-items: center; gap: 0.5rem; }
.trigger-total { font-size: 1.2rem; font-family: 'HyliaSerif', monospace; color: var(--success-color); text-shadow: 1px 1px 0 var(--border-color); }

@media (max-width: 480px) {
  .mobile-ticket-trigger {
    padding: 0.7rem 1rem;
  }
  .trigger-total {
    font-size: 1rem;
  }
  
  /* Contenedor de acciones con scroll horizontal */
  .checkout-actions-scroll {
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 0.5rem 0.3rem;
    margin: 0 -0.3rem;
    background: var(--bg-primary);
    border-top: 1px solid var(--border-color);
  }
  
  .checkout-actions-scroll .checkout-actions {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.6rem;
    min-width: min-content;
  }
  
  /* Botón principal COBRAR más visible */
  .checkout-actions-scroll .btn-checkout.primary {
    width: auto;
    min-width: 150px;
    height: 44px;
    font-size: 0.85rem;
    white-space: nowrap;
    flex-shrink: 0;
    border-radius: 10px;
    padding: 0 1rem;
  }
  
  .checkout-actions-scroll .btn-checkout.primary .icon {
    font-size: 1.1rem;
  }
  
  /* Botones secundarios más grandes y visibles */
  .checkout-actions-scroll .extra-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .checkout-actions-scroll .btn-checkout.secondary {
    width: 44px;
    min-width: 44px;
    height: 44px;
    font-size: 1.1rem;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 10px;
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    position: relative;
  }
  
  /* Tooltips simples */
  .checkout-actions-scroll .btn-checkout.secondary::after {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    font-size: 0.65rem;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    margin-bottom: 5px;
  }
}

/* =========================================
   SIDEBAR: TICKETS NAV
   ========================================= */
.pos-sidebar {
  background: var(--bg-secondary);
  border-right: var(--border-width) solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 0.8rem 0.4rem;
  z-index: 20;
  width: 70px;
  min-width: 70px;
  max-width: 70px;
  overflow: hidden;
  box-sizing: border-box;
}

@media (min-width: 1400px) {
  .pos-sidebar {
    width: 70px;
    min-width: 70px;
    max-width: 70px;
  }
}

@media (max-width: 1199px) {
  .pos-sidebar {
    width: 60px;
    min-width: 60px;
    max-width: 60px;
    padding: 0.6rem 0.3rem;
  }
}

@media (max-width: 991px) {
  .pos-sidebar {
    display: none !important;
  }
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.sidebar-header h3 { 
  font-size: 0.7rem; 
  text-transform: uppercase; 
  color: var(--text-secondary); 
}

.btn-add-ticket {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  border: var(--border-width) solid var(--accent-color);
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 50%, var(--gradient-btn-end) 100%);
  color: var(--border-color);
  font-size: 1.6rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: var(--shadow-outer) var(--border-color);
}

.btn-add-ticket:hover { 
  transform: scale(1.1); 
  filter: brightness(1.1);
}

.tickets-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.2rem;
}

.ticket-nav-item {
  width: 100%;
  max-width: 56px;
  height: 60px;
  margin: 0 auto;
  border: var(--border-width) solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  box-sizing: border-box;
}

.ticket-nav-item:hover {
  border-color: var(--accent-color);
  transform: translateX(3px);
}

.ticket-nav-item.is-active {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 15%, var(--bg-primary));
  box-shadow: 0 0 15px color-mix(in srgb, var(--accent-color) 40%, transparent);
  transform: translateX(5px);
}

.ticket-nav-item.is-empty {
  opacity: 0.6;
}

.ticket-info { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  gap: 2px;
}
.ticket-num { 
  font-weight: bold; 
  font-size: 0.85rem; 
  color: var(--accent-color); 
}
.ticket-total { 
  font-size: 0.6rem; 
  color: var(--success-color); 
  font-weight: bold; 
  white-space: nowrap;
}
.ticket-status { 
  font-size: 0.45rem; 
  color: var(--text-secondary); 
  text-transform: uppercase; 
}

.btn-delete-ticket {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 18px;
  height: 18px;
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  color: var(--text-primary);
  border-radius: 50%;
  border: 2px solid var(--border-color);
  font-size: 11px;
  font-weight: bold;
  display: none;
  align-items: center;
  justify-content: center;
}

.ticket-nav-item:hover .btn-delete-ticket { display: flex; }

/* Media queries para tickets */
@media (max-width: 1199px) {
  .ticket-nav-item {
    max-width: 48px;
    height: 54px;
  }
  .ticket-num { font-size: 0.75rem; }
  .ticket-total { font-size: 0.5rem; }
}

@media (max-width: 991px) {
  .pos-sidebar {
  }
}

/* =========================================
   CENTER PANEL: CATALOG
   ========================================= */
.pos-center {
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
}

/* Estilos base barra tickets (oculta en desktop) */
.tickets-bar-mobile {
  display: none;
}

.catalog-header {
  padding: 1.5rem;
  background: linear-gradient(to bottom, var(--bg-secondary), var(--bg-primary));
  border-bottom: var(--border-width) solid var(--border-color);
}

.search-bar-pos {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border: var(--border-width-thick) solid var(--border-color);
  border-radius: 12px;
  padding: 0.5rem 1rem;
  gap: 0.8rem;
  box-shadow: 0 4px 15px var(--shadow-color);
  box-sizing: border-box;
}

@media (max-width: 767px) {
  .input-wrapper {
    padding: 0.4rem 0.6rem;
    gap: 0.4rem;
    border-radius: 10px;
  }
  .input-wrapper input {
    font-size: 1rem;
  }
  .tool-btn {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
}

.input-wrapper:focus-within { 
  border-color: var(--accent-color); 
  box-shadow: 0 0 20px color-mix(in srgb, var(--accent-color) 30%, var(--shadow-color));
}

.input-wrapper input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1.1rem;
  outline: none;
}

.input-wrapper input::placeholder {
  color: var(--text-secondary);
}

.action-tools { display: flex; gap: 0.5rem; }

.tool-btn {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  width: 42px;
  height: 42px;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: var(--text-primary);
}

.tool-btn:hover { 
  background: var(--bg-secondary); 
  border-color: var(--accent-color); 
}

.btn-mic.is-recording { 
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%); 
  color: var(--text-primary);
  animation: pulse 1.5s infinite; 
}

@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 color-mix(in srgb, var(--error-color) 70%, transparent); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 10px color-mix(in srgb, var(--error-color) 70%, transparent); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 color-mix(in srgb, var(--error-color) 70%, transparent); }
}

/* Sugerencias */
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border: var(--border-width-thick) solid var(--accent-color);
  border-top: none;
  border-radius: 0 0 12px 12px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 10px 25px var(--shadow-color);
}

.result-item {
  width: 100%;
  padding: 0.9rem 1.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 40%, transparent);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.result-item:last-child {
  border-bottom: none;
  border-radius: 0 0 10px 10px;
}

.result-item:hover, .result-item.is-active { 
  background: color-mix(in srgb, var(--accent-color) 20%, var(--bg-secondary)); 
}

.res-info { display: flex; flex-direction: column; gap: 2px; }
.res-name { font-weight: bold; font-size: 1rem; }
.res-code { font-size: 0.75rem; color: var(--text-secondary); }
.res-price { 
  color: var(--success-color); 
  font-weight: bold; 
  font-size: 1rem;
}

/* GRID DE PRODUCTOS */
.catalog-grid {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-height: 0;
}

@media (min-width: 1600px) {
  .catalog-grid {
    max-width: 1400px;
    margin: 0 auto;
  }
}

@media (max-width: 991px) {
  .catalog-grid {
    padding: 1rem;
  }
}

@media (max-width: 767px) {
  .catalog-grid {
    padding: 0.75rem;
    min-height: 0;
    flex: 1;
  }
  .catalog-items-container {
    padding: 0;
    min-height: 0;
  }
}

.catalog-items-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.8rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

@media (max-width: 1199px) {
  .products-grid {
  }
}

@media (max-width: 991px) {
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Pantallas entre 700px y 767px */
@media (min-width: 700px) and (max-width: 767px) {
  .pos-container {
    grid-template-columns: 1fr 260px !important;
    gap: 0.4rem !important;
    padding: 0.4rem !important;
  }
  
  .pos-center {
    padding: 0.4rem !important;
    min-width: 0 !important;
  }
  
  .catalog-header {
    padding: 0.6rem 0.8rem !important;
  }
  
  .search-bar-pos {
    max-width: 100% !important;
  }
  
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem !important;
  }
  
  .product-card {
    padding: 0.4rem !important;
    gap: 0.25rem !important;
  }
  
  .product-icon {
    font-size: 1.6rem !important;
  }
  
  .product-name {
    font-size: 0.7rem !important;
    height: auto !important;
  }
  
  .product-price-tag {
    padding: 0.15rem 0.4rem !important;
    font-size: 0.75rem !important;
  }
  
  .pos-right {
    position: relative !important;
    width: 260px !important;
    min-width: 260px !important;
    max-width: 260px !important;
    height: 100% !important;
    padding: 0.4rem !important;
    border-left: var(--border-width-thick) solid var(--border-color) !important;
    transform: none !important;
    border-radius: 0 !important;
  }
  
  .checkout-container {
    padding: 0.4rem !important;
    height: 100% !important;
  }
  
  .parchment-bg {
    background-size: 100% 100%, 10px 10px !important;
  }
  
  .ticket-header {
    padding: 0.4rem !important;
  }
  
  .ticket-items {
    max-height: 150px !important;
  }
  
  .checkout-summary {
    padding: 0.5rem !important;
    gap: 0.3rem !important;
  }
  
  .checkout-total {
    font-size: 1.1rem !important;
  }
  
  .checkout-actions {
    padding: 0.4rem !important;
    gap: 0.3rem !important;
  }
}

@media (max-width: 767px) {
  .products-grid {
    gap: 0.6rem;
  }
}

.product-card {
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: var(--border-width) solid var(--border-color);
  border-radius: 12px;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  position: relative;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  box-sizing: border-box;
}

@media (max-width: 767px) {
  .product-card {
    padding: 0.6rem;
    border-radius: 10px;
    gap: 0.4rem;
  }
}

.product-card:hover {
  transform: translateY(-5px);
  border-color: var(--accent-color);
  box-shadow: 0 8px 20px var(--shadow-color), var(--shadow-inner) var(--accent-color);
}

.product-card:active {
  transform: translateY(-2px);
}

.card-glow {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: radial-gradient(circle at center, var(--accent-color), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.product-card:hover .card-glow { opacity: 0.08; }

.product-icon { font-size: 2.5rem; }

.product-name { 
  font-size: 0.9rem; 
  font-weight: bold; 
  line-height: 1.2; 
  height: 2.2rem; 
  overflow: hidden;
}

.product-price-tag {
  background: color-mix(in srgb, var(--success-color) 20%, transparent);
  color: var(--success-color);
  padding: 0.3rem 0.9rem;
  border-radius: 20px;
  font-weight: bold;
  font-size: 1rem;
  border: 2px solid var(--success-color);
}

.stock-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
}
.in-stock { background: color-mix(in srgb, var(--success-color) 20%, transparent); color: var(--success-color); }
.low-stock { background: color-mix(in srgb, var(--error-color) 20%, transparent); color: var(--error-color); }

/* =========================================
   RIGHT PANEL: CHECKOUT
   ========================================= */
.pos-right {
  background: var(--bg-secondary);
  border-left: var(--border-width-thick) solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 30;
  height: 100%;
  min-height: 0;
  width: 360px;
  min-width: 360px;
  max-width: 360px;
  box-sizing: border-box;
  overflow: hidden;
}

@media (min-width: 1400px) {
  .pos-right {
    width: 400px;
    min-width: 400px;
    max-width: 400px;
  }
}

@media (max-width: 1199px) {
  .pos-right {
    width: 320px;
    min-width: 320px;
    max-width: 320px;
  }
}

@media (max-width: 991px) {
  .pos-right {
    background: var(--bg-secondary);
    border-left: var(--border-width-thick) solid var(--border-color);
    display: flex;
    flex-direction: column;
    position: absolute;
    z-index: 30;
    height: 55%;
    min-height: 0;
    width: 360px;
    min-width: 360px;
    max-width: 360px;
    box-sizing: border-box;
    overflow: hidden;
  }
}

.checkout-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.parchment-bg {
  background-color: var(--bg-secondary);
  background-image: 
    linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.02) 100%),
    radial-gradient(circle at 2px 2px, var(--border-color) 1px, transparent 0);
  background-size: 100% 100%, 20px 20px;
}

.checkout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
  padding-bottom: 0.6rem;
  border-bottom: 2px dashed var(--border-color);
  flex-shrink: 0;
}

.header-title { display: flex; align-items: center; gap: 0.4rem; }
.header-title h3 { 
  font-family: 'HyliaSerif', serif; 
  color: var(--accent-color); 
  font-size: 1.1rem;
  text-shadow: 2px 2px 0 var(--border-color);
}

@media (max-width: 991px) {
  .checkout-header {
    padding-bottom: 0.5rem;
    margin-bottom: 0.6rem;
  }
  .header-title h3 {
    font-size: 1rem;
  }
}

.btn-clear-all {
  font-size: 0.7rem;
  font-weight: bold;
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  border: 2px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  cursor: pointer;
  text-transform: uppercase;
}

.btn-clear-all:hover {
  filter: brightness(1.1);
}

.ticket-items-list {
  flex: 1;
  min-height: 100px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding-right: 0.5rem;
  box-sizing: border-box;
}

.ticket-item-row {
  background: var(--bg-primary);
  border: var(--border-width) solid var(--border-color);
  border-radius: 10px;
  padding: 0.7rem;
  position: relative;
  transition: all 0.2s;
  box-sizing: border-box;
}

.ticket-item-row:hover { 
  border-color: var(--accent-color); 
  box-shadow: var(--shadow-inner) color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.item-main { 
  display: flex; 
  flex-direction: column; 
  gap: 0.4rem; 
}
.item-name { 
  font-size: 0.9rem; 
  font-weight: bold; 
  color: var(--text-primary);
  padding-right: 1.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.item-meta { 
  display: flex; 
  align-items: center; 
  gap: 0.8rem; 
  font-size: 0.75rem; 
  flex-wrap: wrap;
}
.unit-price { color: var(--text-secondary); font-size: 0.7rem; }

.mayoreo-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent-color);
  cursor: pointer;
  font-weight: bold;
  font-size: 0.75rem;
  background: color-mix(in srgb, var(--accent-color) 15%, transparent);
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
}

.mayoreo-toggle input {
  accent-color: var(--accent-color);
}

.item-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.3rem;
}

.qty-control {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid var(--border-color);
}

.qty-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
  transition: all 0.15s;
}

.qty-btn:hover { 
  background: color-mix(in srgb, var(--accent-color) 25%, transparent);
  color: var(--accent-color);
}

.qty-btn:active {
  background: var(--accent-color);
  color: var(--border-color);
}

.qty-val { 
  width: 45px; 
  text-align: center; 
  font-size: 0.85rem; 
  font-weight: bold; 
}

.item-subtotal { 
  font-weight: 900; 
  color: var(--success-color); 
  font-size: 0.95rem; 
}

/* Media queries para items del ticket en panel derecho */
@media (max-width: 1199px) {
  .ticket-item-row {
    padding: 0.6rem;
  }
  .item-name {
    font-size: 0.85rem;
  }
  .qty-control {
    transform: scale(0.9);
  }
  .item-subtotal {
    font-size: 0.9rem;
  }
}

@media (max-width: 991px) {
  .ticket-item-row {
    padding: 0.5rem;
  }
  .item-name {
    font-size: 0.8rem;
  }
  .qty-control {
    transform: scale(0.8);
  }
  .qty-val {
    width: 35px;
    font-size: 0.8rem;
  }
  .item-subtotal {
    font-size: 0.85rem;
  }
}

@media (max-width: 767px) {
  .ticket-item-row {
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .item-main {
    gap: 0.3rem;
  }
  .item-name {
    font-size: 0.85rem;
    padding-right: 1rem;
  }
  .item-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .qty-control {
    transform: scale(0.85);
  }
  .item-subtotal {
    font-size: 0.9rem;
  }
}

.btn-remove-item {
  position: absolute;
  top: 6px;
  right: 6px;
  background: transparent;
  border: none;
  color: var(--error-color);
  font-size: 1.3rem;
  cursor: pointer;
  opacity: 0.6;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-remove-item:hover { 
  opacity: 1;
  background: color-mix(in srgb, var(--error-color) 20%, transparent);
  border-radius: 4px;
}

.checkout-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 3px double var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  flex-shrink: 0;
}

.summary-table { display: flex; flex-direction: column; gap: 0.3rem; }
.summary-row { 
  display: flex; 
  justify-content: space-between; 
  font-size: 0.85rem;
}
.summary-row.total {
  font-size: 1.4rem;
  color: var(--accent-color);
  border-top: 2px solid var(--border-color);
  padding-top: 0.4rem;
  margin-top: 0.3rem;
}
.total-amount { 
  font-family: 'HyliaSerif', monospace; 
  font-weight: 900; 
  color: var(--success-color);
  text-shadow: 1px 1px 0 var(--border-color);
}

@media (max-width: 991px) {
  .summary-row {
    font-size: 0.8rem;
  }
  .summary-row.total {
    font-size: 1.2rem;
  }
}

.checkout-actions-scroll {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.3rem;
}

.checkout-actions-scroll .checkout-actions {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  min-width: min-content;
}

.checkout-actions-scroll .btn-checkout.primary {
  width: auto;
  min-width: 140px;
  height: 42px;
  white-space: nowrap;
}

.checkout-actions-scroll .extra-actions {
  display: flex;
  gap: 0.4rem;
}

.checkout-actions-scroll .btn-checkout.secondary {
  width: 42px;
  min-width: 42px;
  height: 42px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkout-actions { display: flex; flex-direction: column; gap: 0.6rem; }

.btn-checkout.primary {
  width: 100%;
  height: 55px;
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  color: var(--text-primary);
  border: var(--border-width-thick) solid var(--border-color);
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: 1px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  box-shadow: 0 4px 15px var(--shadow-color);
  transition: all 0.2s;
  text-transform: uppercase;
}

.btn-checkout.primary:hover:not(:disabled) { 
  transform: translateY(-2px); 
  filter: brightness(1.1); 
  box-shadow: 0 6px 20px var(--shadow-color);
}

.btn-checkout.primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 10px var(--shadow-color);
}

.btn-checkout.primary:disabled { 
  opacity: 0.5; 
  cursor: not-allowed; 
}

.extra-actions { 
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 0.4rem; 
}

.btn-checkout.secondary {
  height: 42px;
  background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  border: var(--border-width) solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 1.1rem;
}

@media (max-width: 991px) {
  .btn-checkout.primary {
    height: 50px;
    font-size: 1rem;
  }
  .btn-checkout.secondary {
    height: 38px;
    font-size: 1rem;
  }
}

@media (max-width: 767px) {
  .btn-checkout.primary {
    height: 48px;
    font-size: 0.95rem;
  }
  .extra-actions {
    gap: 0.3rem;
  }
  .btn-checkout.secondary {
    height: 36px;
    font-size: 0.95rem;
  }
}

.btn-checkout.secondary:hover { 
  border-color: var(--accent-color); 
  background: var(--bg-secondary);
  filter: brightness(1.1);
}

.cashier-badge {
  font-size: 0.7rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  font-weight: bold;
}
.cashier-badge .dot { 
  width: 8px; 
  height: 8px; 
  background: var(--success-color);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--success-color);
}

/* =========================================
   MODALES Y OVERLAYS CUSTOM
   ========================================= */
.pos-modal-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--bg-primary) 85%, black);
  backdrop-filter: blur(5px);
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.pos-modal-card {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-panel) 50%, var(--bg-secondary) 100%);
  border: 4px solid var(--accent-color);
  border-radius: 8px;
  width: min(100%, 600px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: visible;
  box-shadow: 
    0 0 0 2px var(--border-color),
    0 0 0 4px var(--accent-color),
    0 8px 0 var(--border-color),
    0 12px 0 color-mix(in srgb, var(--border-color) 80%, black),
    0 16px 30px var(--shadow-color),
    inset 0 0 60px color-mix(in srgb, var(--accent-color) 10%, transparent);
  position: relative;
  animation: popIn 200ms ease-out;
}

.pos-modal-card::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 2px dashed color-mix(in srgb, var(--accent-color) 40%, transparent);
  border-radius: 4px;
  pointer-events: none;
}

.pos-modal-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      color-mix(in srgb, var(--accent-color) 3%, transparent) 2px,
      color-mix(in srgb, var(--accent-color) 3%, transparent) 4px
    );
  pointer-events: none;
  border-radius: 8px;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95) translateY(-10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-corner {
  position: absolute;
  width: 40px;
  height: 40px;
  pointer-events: none;
  z-index: 10;
}

.modal-corner::before,
.modal-corner::after {
  content: '';
  position: absolute;
  background: var(--accent-color);
  border-radius: 2px;
  box-shadow: 1px 1px 0 var(--border-color);
}

.modal-corner.tl { top: 10px; left: 10px; }
.modal-corner.tl::before { width: 25px; height: 4px; top: 0; left: 0; }
.modal-corner.tl::after { width: 4px; height: 25px; top: 0; left: 0; }

.modal-corner.tr { top: 10px; right: 10px; }
.modal-corner.tr::before { width: 25px; height: 4px; top: 0; right: 0; }
.modal-corner.tr::after { width: 4px; height: 25px; top: 0; right: 0; }

.modal-corner.bl { bottom: 10px; left: 10px; }
.modal-corner.bl::before { width: 25px; height: 4px; bottom: 0; left: 0; }
.modal-corner.bl::after { width: 4px; height: 25px; bottom: 0; left: 0; }

.modal-corner.br { bottom: 10px; right: 10px; }
.modal-corner.br::before { width: 25px; height: 4px; bottom: 0; right: 0; }
.modal-corner.br::after { width: 4px; height: 25px; bottom: 0; right: 0; }

.modal-h {
  padding: 1.25rem 1.5rem;
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border-bottom: 3px solid var(--accent-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 0 color-mix(in srgb, var(--border-color) 50%, transparent);
}

.modal-h h3 {
  color: var(--accent-color);
  text-shadow: 2px 2px 0 var(--border-color);
  font-size: 1.2rem;
  font-weight: 800;
}

.close-x {
  background: linear-gradient(180deg, var(--accent-color) 0%, var(--gradient-btn-end) 100%);
  border: 2px solid var(--border-color);
  color: var(--btn-text, var(--bg-primary));
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 0 var(--border-color);
}

.close-x:hover {
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  border-color: var(--error-color);
  transform: translateY(-1px);
}

.modal-b { 
  padding: 1.5rem; 
  overflow-y: auto; 
  overflow-x: hidden;
  flex: 1;
}

.venta-meta-grid {
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 1rem; 
  margin-bottom: 1.5rem;
}

.meta-box {
  background: var(--bg-primary);
  padding: 1.25rem 1rem;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  border: 2px solid var(--border-color);
  box-shadow: 
    inset 0 0 0 2px color-mix(in srgb, var(--accent-color) 20%, transparent),
    0 3px 0 var(--border-color);
  transition: transform 0.2s, box-shadow 0.2s;
  text-align: center;
}

.meta-box:hover {
  transform: translateY(-2px);
  box-shadow: 
    inset 0 0 0 2px color-mix(in srgb, var(--accent-color) 30%, transparent),
    0 5px 0 var(--border-color),
    0 8px 15px var(--shadow-color);
}

.meta-box.total {
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  border-color: var(--success-color);
  box-shadow: 
    inset 0 0 0 2px color-mix(in srgb, var(--success-color) 30%, white),
    0 3px 0 color-mix(in srgb, var(--success-color) 50%, black);
}

.meta-box.total span,
.meta-box.total strong {
  color: var(--text-primary);
}

.meta-icon {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
  filter: drop-shadow(1px 1px 0 var(--border-color));
}

.meta-box span { 
  font-size: 0.8rem; 
  text-transform: uppercase; 
  color: var(--text-secondary); 
  font-weight: 700;
  letter-spacing: 0.05em;
}

.meta-box strong {
  color: var(--accent-color);
  font-size: 1.1rem;
  font-weight: 800;
  word-break: break-word;
  line-height: 1.3;
}

.meta-box .txt-pos {
  color: var(--text-primary) !important;
  text-shadow: 1px 1px 0 color-mix(in srgb, var(--success-color) 50%, black);
  font-size: 1.25rem !important;
}

.items-header {
  margin-bottom: 1rem;
  padding: 0.75rem 0;
  border-bottom: 3px solid var(--border-color);
  font-size: 1rem;
  font-weight: 800;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-shadow: 2px 2px 0 var(--border-color);
}

.detalle-items-list { 
  display: flex; 
  flex-direction: column; 
  gap: 0.6rem; 
}

.d-item {
  display: grid; 
  grid-template-columns: 1fr auto 120px;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  align-items: center;
  transition: all 0.2s;
  border-radius: 8px;
  background: var(--bg-secondary);
}

.d-item:hover {
  background: var(--bg-panel);
  transform: translateX(4px);
}

.d-item:last-child {
  border-bottom: none;
}

.d-name { 
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.4;
  color: var(--text-primary);
}

.d-item:hover .d-name {
  color: var(--accent-color);
}

.d-qty { 
  color: var(--text-primary); 
  font-size: 0.9rem;
  background: var(--bg-primary);
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 2px solid var(--border-color);
  font-weight: 600;
  white-space: nowrap;
}

.d-sub { 
  text-align: right; 
  font-weight: 800;
  color: var(--success-color);
  font-family: "Courier New", monospace;
  font-size: 1rem;
}

/* =========================================
   BADGES MÉTODO DE PAGO
   ========================================= */
.method-badge {
  display: inline-block;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem !important;
  font-weight: 800 !important;
  text-transform: uppercase;
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.05em;
  box-shadow: 0 2px 0 var(--border-color);
}

.method-badge.efectivo {
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  color: var(--text-primary) !important;
  border: 2px solid color-mix(in srgb, var(--success-color) 60%, black);
}

.method-badge.transferencia {
  background: linear-gradient(180deg, var(--accent-color) 0%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary)) !important;
  border: 2px solid color-mix(in srgb, var(--accent-color) 60%, black);
}

.method-badge.tarjeta {
  background: linear-gradient(180deg, #ec4899 0%, #db2777 100%);
  color: #ffffff !important;
  border: 2px solid #be185d;
}

/* =========================================
   MODAL DETALLE RESPONSIVE
   ========================================= */
@media (max-width: 768px) {
  .pos-modal-card {
    width: min(100%, 95vw) !important;
    max-height: 92vh;
    border-radius: 16px;
  }
  
  .modal-h {
    padding: 1rem 1.25rem;
  }
  
  .modal-h h3 {
    font-size: 1.1rem;
  }
  
  .modal-b {
    padding: 1rem 1.25rem;
  }
  
  .venta-meta-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .meta-box {
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    text-align: left;
  }
  
  .meta-icon {
    font-size: 1.5rem;
    margin-right: 0;
    margin-bottom: 0;
    flex-shrink: 0;
  }
  
  .meta-box span {
    font-size: 0.85rem;
    margin-right: auto;
  }
  
  .meta-box strong {
    font-size: 1rem;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .meta-box.total {
    justify-content: flex-start;
  }
  
  .meta-box.total strong {
    max-width: none;
    font-size: 1.15rem;
  }
  
  .method-badge {
    font-size: 0.85rem !important;
    padding: 0.3rem 0.8rem;
  }
  
  .d-item {
    grid-template-columns: 1fr auto;
    gap: 0.75rem;
    padding: 0.9rem 1rem;
  }
  
  .d-name {
    font-size: 0.95rem;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .d-qty {
    font-size: 0.85rem;
    padding: 0.35rem 0.7rem;
    order: 3;
    grid-column: span 2;
    justify-self: start;
    margin-top: 0.25rem;
  }
  
  .d-sub {
    font-size: 0.95rem;
  }
}

@media (max-width: 480px) {
  .pos-modal-card {
    width: 100vw !important;
    max-width: 100vw;
    max-height: 100vh;
    border-radius: 0;
    margin: 0;
  }
  
  .pos-modal-overlay {
    padding: 0;
  }
  
  .modal-corner {
    display: none;
  }
  
  .modal-h {
    padding: 0.75rem 1rem;
  }
  
  .modal-h h3 {
    font-size: 1rem;
  }
  
  .close-x {
    width: 32px;
    height: 32px;
    font-size: 1.1rem;
  }
  
  .modal-b {
    padding: 0.75rem 1rem;
  }
  
  .venta-meta-grid {
    gap: 0.6rem;
  }
  
  .meta-box {
    padding: 0.85rem;
    gap: 0.75rem;
  }
  
  .meta-icon {
    font-size: 1.3rem;
  }
  
  .meta-box span {
    font-size: 0.8rem;
  }
  
  .meta-box strong {
    font-size: 0.9rem;
    max-width: 130px;
  }
  
  .meta-box.total strong {
    font-size: 1rem;
    max-width: none;
  }
  
  .method-badge {
    font-size: 0.8rem !important;
    padding: 0.25rem 0.6rem;
  }
  
  .d-item {
    padding: 0.75rem 0.85rem;
    gap: 0.6rem;
  }
  
  .d-name {
    font-size: 0.9rem;
    max-width: 160px;
  }
  
  .d-qty {
    font-size: 0.8rem;
    padding: 0.3rem 0.6rem;
  }
  
  .d-sub {
    font-size: 0.9rem;
  }
  
  .items-header {
    font-size: 0.9rem;
    padding: 0.6rem 0;
  }
}

@media (max-width: 360px) {
  .venta-meta-grid {
    gap: 0.5rem;
  }
  
  .meta-box {
    padding: 0.75rem;
  }
  
  .meta-icon {
    font-size: 1.2rem;
  }
  
  .meta-box span {
    font-size: 0.75rem;
  }
  
  .meta-box strong {
    font-size: 0.85rem;
    max-width: 110px;
  }
  
  .method-badge {
    font-size: 0.75rem !important;
    padding: 0.2rem 0.5rem;
  }
  
  .d-item {
    padding: 0.65rem 0.75rem;
  }
  
  .d-name {
    max-width: 110px;
    font-size: 0.85rem;
  }
  
  .d-qty {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }
  
  .d-sub {
    font-size: 0.85rem;
  }
  
  .items-header {
    font-size: 0.85rem;
    padding: 0.5rem 0;
  }
}
</style>