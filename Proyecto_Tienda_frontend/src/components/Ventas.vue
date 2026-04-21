<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, markRaw } from 'vue';
import Quagga from '@ericblade/quagga2';
import { useProductosCache } from '@/composables/useProductCache';
import EntradaEfectivoModal from './modals/EntradaEfectivoModal.vue';
import SalidaEfectivoModal from './modals/SalidaEfectivoModal.vue';
import HistorialVentasModal from './modals/HistorialVentasModal.vue';
import CalculadoraGramajeModal from './modals/CalculadoraGramajeModal.vue';
import CobroModal from './modals/CobroModal.vue';
import CarruselPromociones from './modals/CarruselPromociones.vue';
import CrudPromociones from './modals/CrudPromociones.vue';

let isResizing = false;
let startY = 0;
let startHeight = 0;

function startResize(e: MouseEvent | TouchEvent) {
  isResizing = true;
  startY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
  const container = document.querySelector('.pos-right');
  if (container) {
    startHeight = parseFloat(getComputedStyle(container).height);
  }
  document.documentElement.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
}

function doResize(e: MouseEvent | TouchEvent) {
  if (!isResizing) return;
  const currentY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
  const diff = currentY - startY;
  let newHeight = startHeight - diff;
  const maxHeight = window.innerHeight * 0.9;
  const minHeight = 200;
  if (newHeight > maxHeight) newHeight = maxHeight;
  if (newHeight < minHeight) newHeight = minHeight;
  const container = document.querySelector('.pos-right');
  if (container) {
    (container as HTMLElement).style.height = newHeight + 'px';
  }
  e.preventDefault();
}

function stopResize() {
  isResizing = false;
  document.documentElement.style.cursor = '';
  document.body.style.userSelect = '';
}

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
  idUsuario?: number;
  usuario: UsuarioDTO;
  nombreUsuario?: string;
  montoTotal?: number | string;
  estatus?: string;
  numeroTicket?: number;
  metodoPago?: string;
  fechaVenta?: string;
  tieneDiscrepancia?: boolean;
};

type VentaDetalleDTO = {
  idVentaDetalle?: number;
  cantidad: number;
  precioUnitarioVenta: number;
  producto?: ProductoDTO;
  Producto?: ProductoDTO;
  idProducto?: number;
  tipoPrecioAplicado?: string;
  Venta?: {
    idVenta: number;
  };
  Producto?: any;
  producto?: any;
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
  is_promocion?: false;
  promocion?: never;
  productoId?: number;
};

type TicketItemPromocion = {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  is_promocion: true;
  promocion: PromocionDTO;
  idVentaDetalle?: number;
};

type Ticket = {
  id: number;
  numero: number;
  items: (TicketItem | TicketItemPromocion)[];
  estado: 'pendiente' | 'completado';
  creadoEn: number;
  desdeBackend?: boolean;
};

type PromocionDetalleDTO = {
  id_detalle: number;
  id_producto: number;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

type PromocionDTO = {
  id_promocion: number;
  nombre: string;
  descripcion: string;
  precio_original: number;
  precio_promocion: number;
  imagen_url: string | null;
  detalles: PromocionDetalleDTO[];
  activa: boolean;
};

type CrearPromocionDTO = {
  nombre: string;
  descripcion: string;
  precio_promocion: number;
  imagen_url: string | null;
  activa: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  productos: { id_producto: number; cantidad: number }[];
};

function asAny(item: TicketItem | TicketItemPromocion): any {
  return item;
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';
const AUTH_USER_ID_KEY = 'idUsuario';

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

async function cargarTicketsDesdeBackend() {
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) {
    ticketDelDia.value = 'N/D';
    return;
  }

  try {
    const response = await getJson<ApiRespuesta<VentaPendienteDTO[]>>(`/ventas/buscarVentasPendientes`);

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

    const data = await getJson<ApiRespuesta<VentaPendienteDTO>>(`/ventas/agregarVenta`, {
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
    const response = await getJson<ApiRespuesta<unknown>>(`/ventas/eliminarVenta/${id}`, {
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
const modalProductoGramaje = ref<any>(null);
const gramajeItemEditando = ref<TicketItem | null>(null);
const gramajeEditandoDesdeHistorial = ref(false);
const gramajeEditandoIndice = ref<number | null>(null);
const gramajeEditandoCantidad = ref<number>(0);
const gramajeEditandoPrecio = ref<number>(0);
const modalCobroAbierto = ref(false);
const historialCargando = ref(false);
const historialCobroTotal = ref(0);
const historialGananciaTotal = ref(0);
const historialVentas = ref<VentaDTO[]>([]);
const historialUsuariosUnicos = ref<{ idUsuario: number; nombre: string }[]>([]);
const historialDetalleCargando = ref(false);
const historialVentaDetalle = ref<VentaDetalleDTO[]>([]);
const historialVentaSeleccionada = ref<VentaDTO | { idVenta: number; numeroTicket?: number; fechaVenta?: string; montoTotal?: number | string; metodoPago?: string; estatus?: string; nombreUsuario?: string } | null>(null);
const historialVentaTieneDiscrepancia = ref(false);
const modalDetalleVentaAbierto = ref(false);
const ticketVisibleMobile = ref(false); 
const isKeyboardVisible = ref(false);
const promocionesActivas = ref<PromocionDTO[]>([]);
const modalPromocionesAbierto = ref(false);

const esAdmin = computed(() => {
  return Number(localStorage.getItem('tipoUsuario') || 2) === 1;
});

const modoEdicionDetalle = ref(false);
const montoTotalEditado = ref(0);
const detalleEditandoIndex = ref<number | null>(null);
const cantidadTemporal = ref(0);
const precioTemporal = ref(0);
const totalManualEditado = ref(false);
const montoTotalInput = ref(0);

async function cargarPromocionesActivas() {
  try {
    promocionesActivas.value = await apiListarPromocionesActivas();
  } catch (e) {
    console.error('Error al cargar promociones activas:', e);
  }
}

function agregarPromocionAlTicket(promocion: PromocionDTO) {
  if (!ticketActual.value) {
    crearNuevoTicket();
  }

  if (!ticketActual.value) {
    mostrarMensaje('No se pudo crear el ticket', 'error');
    return;
  }

  const items = ticketActual.value.items;

  const promoItem: TicketItemPromocion = {
    id: -(promocion.id_promocion || Date.now()),
    nombre: promocion.nombre,
    precio: Number(promocion.precio_promocion) || 0,
    cantidad: 1,
    is_promocion: true,
    promocion: promocion
  };

  const existente = items.find(item => (item as any).is_promocion && item.id === promoItem.id);
  if (existente) {
    existente.cantidad += 1;
    mostrarMensaje(`Combo "${promocion.nombre}" agregado al ticket`, 'ok');
  } else {
    items.push(promoItem);
    mostrarMensaje(`Combo "${promocion.nombre}" agregado al ticket`, 'ok');
  }
  playSound('add');
}

function handleResize() {
  isKeyboardVisible.value = window.innerWidth < 768 && window.innerHeight < 500;
}

onMounted(() => {
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
  
  window.addEventListener('focusout', () => {
    isKeyboardVisible.value = false;
  });
});

onUnmounted(() => {
  document.removeEventListener('mousemove', doResize);
  document.removeEventListener('mouseup', stopResize);
  document.removeEventListener('touchmove', doResize);
  document.removeEventListener('touchend', stopResize);
});

const ticketActual = computed(() => {
  if (ticketActualId.value === null) return null;
  return tickets.value.find(t => t.id === ticketActualId.value) ?? null;
});

const ticket = computed(() => {
  return (ticketActual.value?.items ?? []) as (TicketItem | TicketItemPromocion)[];
});

const totalVenta = computed(() => {
  return ticket.value.reduce((acumulado, item) => acumulado + item.precio * item.cantidad, 0);
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
  await cargarPromocionesActivas();
});

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(`${API_BASE}${url}`, {
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

async function apiListarPromociones(): Promise<PromocionDTO[]> {
  const response = await getJson<ApiRespuesta<PromocionDTO[]>>(`/promociones/listarPromociones`);
  return response?.datos ?? [];
}

async function apiListarPromocionesActivas(): Promise<PromocionDTO[]> {
  const response = await getJson<ApiRespuesta<any[]>>(`/promociones/listarActivas`);
  const datos = response?.datos ?? [];
  return datos.map((p: any) => ({
    id_promocion: p.idPromocion,
    nombre: p.nombre || '',
    descripcion: p.descripcion || '',
    precio_original: Number(p['precio_original']) || 0,
    precio_promocion: Number(p['precio_promocion']) || 0,
    imagen_url: p['imagen_url'] || null,
    activa: p.activa ?? true,
    fecha_inicio: p.fechaInicio,
    fecha_fin: p.fechaFin,
    detalles: (p.detalles || []).map((d: any) => ({
      id_detalle: d.idDetalle,
      id_producto: d['id_producto'],
      nombre_producto: d.nombreProducto || '',
      cantidad: Number(d.cantidad) || 0,
      precio_unitario: Number(d.precioUnitario) || 0,
      subtotal: Number(d.subtotal) || 0
    }))
  }));
}

async function apiCrearPromocion(dto: CrearPromocionDTO): Promise<PromocionDTO | null> {
  const response = await getJson<ApiRespuesta<PromocionDTO>>(`/promociones/crear`, {
    method: 'POST',
    body: JSON.stringify(dto)
  });
  return response?.datos ?? null;
}

async function apiActualizarPromocion(id: number, dto: CrearPromocionDTO): Promise<PromocionDTO | null> {
  const response = await getJson<ApiRespuesta<PromocionDTO>>(`/promociones/actualizar/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto)
  });
  return response?.datos ?? null;
}

async function apiEliminarPromocion(id: number): Promise<boolean> {
  const response = await getJson<ApiRespuesta<null>>(`/promociones/eliminar/${id}`, {
    method: 'DELETE'
  });
  return response?.codigo === 200;
}

async function apiTogglePromocionActiva(id: number): Promise<PromocionDTO | null> {
  const response = await getJson<ApiRespuesta<PromocionDTO>>(`/promociones/toggleActiva/${id}`, {
    method: 'PATCH'
  });
  return response?.datos ?? null;
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
    const data = await getJson<ApiRespuesta<ProductoDTO[]>>(`/productos/listarProductos`);
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
      `/productos/buscarPorCodigoBarras/${encodeURIComponent(codigo)}`
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
    getJson<ApiRespuesta<unknown>>(`/ventasDetalle/eliminarVentaDetalle/${idVentaDetalle}`, {
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
    getJson<ApiRespuesta<unknown>>(`/ventasDetalle/eliminarVentaDetalle/${id}`, {
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

  const data = await getJson<ApiRespuesta<VentaDTO>>(`/ventas/agregarVenta`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (data?.codigo !== 200 || !data?.datos) {
    throw new Error(data?.mensaje || 'No se pudo crear la venta.');
  }

  return data.datos;
}

async function crearDetalleVenta(ventaId: number, item: any) {
  const payload = {
    Venta: { idVenta: ventaId },
    Producto: item.dto,
    cantidad: item.cantidad,
    precioUnitarioVenta: item.precio,
    tipoPrecioAplicado: item.is_gramaje ? 'VENTA_GRAMAJE' : 'VENTA'
  };

  let data;
  
  if (item.idVentaDetalle) {
    data = await getJson<ApiRespuesta<unknown>>(`/ventasDetalle/actualizarVentaDetalle/${item.idVentaDetalle}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  } else {
    data = await getJson<ApiRespuesta<unknown>>(`/ventasDetalle/agregarVentaDetalle`, {
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
    `/ventas/completarVenta/${idVenta}?montoTotal=${encodeURIComponent(montoTotal.toString())}&metodoPago=${metodoPago}`,
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
    const precioPromocionTotal = montoCobrado;
    const subtotalOriginal = ticketActual.value.items.reduce((sum, item) => {
      if (item.is_promocion) {
        return sum + item.promocion.detalles.reduce((s, d) => s + (Number(d.subtotal) || 0), 0);
      }
      return sum + (item.precio * item.cantidad);
    }, 0);
    
    const detallesParaGuardar: any[] = [];
    
    for (const item of ticketActual.value.items as (TicketItem | TicketItemPromocion)[]) {
      if ((item as any).is_promocion && (item as any).promocion) {
        const promo = (item as any).promocion;
        for (const detalle of promo.detalles) {
          const cantidad = Number(detalle.cantidad) || 0;
          const subtotalDetalle = Number(detalle.subtotal) || 0;
          const precioUnitario = cantidad > 0 ? subtotalDetalle / cantidad : 0;
          const proporcion = subtotalOriginal > 0 ? subtotalDetalle / subtotalOriginal : 0;
          const precioAjustado = Math.round((precioPromocionTotal * proporcion / cantidad) * 100) / 100;
          
          detallesParaGuardar.push({
            id: detalle.id_producto,
            nombre: detalle.nombre_producto || '',
            dto: { idProducto: detalle.id_producto, nombre: '', precio_venta: Number(detalle.precio_unitario) || 0, codigoBarras: '' },
            cantidad: cantidad,
            precio: precioAjustado,
            is_gramaje: cantidad < 1000
          });
        }
      } else {
        detallesParaGuardar.push(item);
      }
    }
    
    await Promise.all(detallesParaGuardar.map((item) => crearDetalleVenta(ventaId, item)));
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
    const data = await getJson<ApiRespuesta<unknown>>(`/caja/entrada`, {
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
    const data = await getJson<ApiRespuesta<unknown>>(`/caja/salida`, {
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

async function onVentasCorregidas() {
  await cargarHistorialVentasDia();
  if (historialVentaSeleccionada.value) {
    await verDetalleVenta(historialVentaSeleccionada.value);
  }
}

async function cargarHistorialVentasDia() {
  historialCargando.value = true;
  try {
    const fechaHoy = getFechaHoy();
    const data = await getJson<ApiRespuesta<{ cobroTotal?: number | string; gananciaTotal?: number | string; ventas?: VentaDTO[] }>>(
      `/ventas/obtenerVentaPorDia/${fechaHoy}`
    );

    historialCobroTotal.value = Number(data?.datos?.cobroTotal ?? 0);
    historialGananciaTotal.value = Number(data?.datos?.gananciaTotal ?? 0);
    historialVentas.value = Array.isArray(data?.datos?.ventas) 
      ? data.datos.ventas.sort((a, b) => (b.idVenta ?? 0) - (a.idVenta ?? 0))
      : [];
    
    const usuariosMap = new Map<number, string>();
    for (const v of historialVentas.value) {
      if (v.idUsuario && v.nombreUsuario && !usuariosMap.has(v.idUsuario)) {
        usuariosMap.set(v.idUsuario, v.nombreUsuario);
      }
    }
    historialUsuariosUnicos.value = Array.from(usuariosMap.entries()).map(([id, nombre]) => ({ idUsuario: id, nombre }));
    
    const idsVentas = historialVentas.value.map(v => v.idVenta);
    const todosDetalles = await getJson<ApiRespuesta<VentaDetalleDTO[]>>(
      `/ventasDetalle/obtenerTodosLosVentasDetalles`
    );
    
    const detallesMap = new Map<number, VentaDetalleDTO[]>();
    for (const d of todosDetalles?.datos || []) {
      const idVenta = Number(d?.Venta?.idVenta || 0);
      if (!detallesMap.has(idVenta)) {
        detallesMap.set(idVenta, []);
      }
      detallesMap.get(idVenta)?.push(d);
    }
    
    for (const venta of historialVentas.value) {
      const detalles = detallesMap.get(venta.idVenta) || [];
      const montoVenta = Number(venta.montoTotal ?? 0);
      venta.tieneDiscrepancia = verificarDiscrepancia(detalles, montoVenta);
    }
  } catch (_error) {
    historialCobroTotal.value = 0;
    historialGananciaTotal.value = 0;
    historialVentas.value = [];
    mostrarMensaje('No se pudo cargar el historial de ventas.', 'error');
  } finally {
    historialCargando.value = false;
  }
}

function verificarDiscrepancia(detalles: VentaDetalleDTO[], montoTotal: number): boolean {
  const sumaDetalles = detalles.reduce((sum, d) => {
    const precio = Number(d.precioUnitarioVenta || 0);
    const cantidad = Number(d.cantidad || 0);
    const subtotal = d.tipoPrecioAplicado === 'VENTA_GRAMAJE' ? precio : precio * cantidad;
    return sum + subtotal;
  }, 0);
  
  const discrepancia = Math.abs(Math.round(sumaDetalles * 100) / 100 - Math.round(montoTotal * 100) / 100) > 2;
  return discrepancia;
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

async function verDetalleVenta(venta: VentaDTO | { idVenta: number; numeroTicket?: number; montoTotal?: number | string; nombreUsuario?: string }) {
  historialVentaSeleccionada.value = venta;
  historialDetalleCargando.value = true;
  historialVentaTieneDiscrepancia.value = false;
  modalDetalleVentaAbierto.value = true;
  
  try {
    const data = await getJson<ApiRespuesta<VentaDetalleDTO[]>>(
      `/ventasDetalle/porVenta/${venta.idVenta}`
    );
    const detalles = Array.isArray(data?.datos) ? data.datos : [];
    historialVentaDetalle.value = detalles;
    
    const montoVenta = Number(venta.montoTotal ?? 0);
    const tieneDiscrepancia = verificarDiscrepancia(detalles, montoVenta);
    historialVentaTieneDiscrepancia.value = tieneDiscrepancia;
    
    const idx = historialVentas.value.findIndex(v => v.idVenta === venta.idVenta);
    if (idx !== -1) {
      historialVentas.value[idx] = { ...historialVentas.value[idx], tieneDiscrepancia };
    }
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
      `/ventas/cancelarVenta/${venta.idVenta}`,
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

  if (gramajeEditandoDesdeHistorial.value && gramajeEditandoIndice.value !== null) {
    const index = gramajeEditandoIndice.value;
    const gramos = Math.max(1, Math.round(payload.gramos));
    const precioUnitario = payload.precioTotal / gramos;
    
    historialVentaDetalle.value[index].cantidad = gramos;
    historialVentaDetalle.value[index].precioUnitarioVenta = Number.isFinite(precioUnitario) ? precioUnitario : historialVentaDetalle.value[index].precioUnitarioVenta;
    historialVentaDetalle.value[index].tipoPrecioAplicado = 'VENTA_GRAMAJE';
    
    if (!totalManualEditado.value) {
      montoTotalEditado.value = calcularNuevoTotal();
      montoTotalInput.value = montoTotalEditado.value;
    }
    
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
    if (!ticketActual.value) {
      mostrarMensaje('No se pudo crear el ticket', 'error');
      return;
    }
  }

  const gramos = Math.max(1, Math.round(payload.gramos));
  const precioUnitario = payload.precioTotal / gramos;
  const items = ticketActual.value!.items;

  if (gramajeItemEditando.value) {
    const existente = gramajeItemEditando.value;
    existente.cantidad = gramos;
    existente.precio = Number.isFinite(precioUnitario) ? precioUnitario : existente.precio;
    try {
      await crearDetalleVenta(ticketActual.value.id, existente);
    } catch (e) {
      throw e;
    }
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

function editarGramajeItem(item: TicketItem) {
  gramajeItemEditando.value = item;
  modalProductoGramaje.value = {
    id: item.id,
    nombre: item.nombre,
    precio: item.precio * 1000,
    codigo_barras: item.codigo_barras ?? null,
    dto: item.dto,
    is_gramaje: item.is_gramaje
  };
  modalGramajeAbierto.value = true;
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
  setTimeout(() => {
    mensaje.value = '';
  }, 1000);
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
    
    const response = await getJson<ApiRespuesta<any[]>>(`/ventas/comando-texto`, {
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

function iniciarEdicionDetalle() {
  montoTotalEditado.value = Number(historialVentaSeleccionada.value?.montoTotal ?? 0);
  montoTotalInput.value = Math.round(Number(historialVentaSeleccionada.value?.montoTotal ?? 0));
  totalManualEditado.value = false;
  modoEdicionDetalle.value = true;
}

function calcularSubtotal(cantidad: number, precioUnitario: number): number {
  const subtotal = cantidad * precioUnitario;
  return Math.round(subtotal);
}

function calcularNuevoTotal(): number {
  const total = historialVentaDetalle.value.reduce((sum, d) => {
    return sum + calcularSubtotal(Number(d.cantidad), Number(d.precioUnitarioVenta));
  }, 0);
  return total;
}

function iniciarEditarItem(index: number) {
  const item = historialVentaDetalle.value[index];
  const prod = item.producto || item.Producto;
  const isGramaje = item.tipoPrecioAplicado === 'VENTA_GRAMAJE' || prod?.is_gramaje === true;
  
  console.log('iniciarEditarItem:', { index, item, prod, isGramaje, tipoPrecioAplicado: item.tipoPrecioAplicado, is_gramaje: prod?.is_gramaje });
  
  if (isGramaje && prod) {
    const productoModal = {
      id: prod.idProducto,
      nombre: prod.nombre,
      precio: prod.precio_venta || prod.precioVenta || 0,
      codigo_barras: prod.codigoBarras || prod.codigo_barras || ''
    };
    gramajeItemEditando.value = {
      id: Number(item.idVentaDetalle) || Date.now(),
      cantidad: item.cantidad,
      precio: Number(item.precioUnitarioVenta),
      nombre: prod.nombre || '',
      is_gramaje: true
    } as any;
    gramajeEditandoDesdeHistorial.value = true;
    gramajeEditandoIndice.value = index;
    modalProductoGramaje.value = productoModal;
    gramajeEditandoCantidad.value = item.cantidad;
    gramajeEditandoPrecio.value = Number(item.precioUnitarioVenta);
    setTimeout(() => {
      modalGramajeAbierto.value = true;
    }, 100);
  } else {
    detalleEditandoIndex.value = index;
    cantidadTemporal.value = item.cantidad;
    precioTemporal.value = Number(item.precioUnitarioVenta);
  }
}

function confirmarEdicionItem(index: number) {
  historialVentaDetalle.value[index].cantidad = cantidadTemporal.value;
  historialVentaDetalle.value[index].precioUnitarioVenta = Math.round(precioTemporal.value * 100) / 100;
  if (!totalManualEditado.value) {
    montoTotalEditado.value = calcularNuevoTotal();
    montoTotalInput.value = montoTotalEditado.value;
  }
  detalleEditandoIndex.value = null;
}

function cancelarEdicionItem() {
  detalleEditandoIndex.value = null;
}

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
      
      await getJson<ApiRespuesta<unknown>>(
        `/ventasDetalle/actualizarVentaDetalle/${detalle.idVentaDetalle}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            Venta: { idVenta: historialVentaSeleccionada.value.idVenta },
            Producto: prod ? { idProducto: prod.idProducto } : null,
            cantidad: detalle.cantidad,
            precioUnitarioVenta: precioRedondeado,
            tipoPrecioAplicado: detalle.tipoPrecioAplicado || 'VENTA'
          })
        }
      );
    }
    
    const payload = {
      idVenta: historialVentaSeleccionada.value.idVenta,
      montoTotal: montoTotalEditado.value
    };
    
    await getJson<ApiRespuesta<VentaDTO>>(
      `/ventas/actualizarVenta/${historialVentaSeleccionada.value.idVenta}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      }
    );
    
    mostrarMensaje('Detalles actualizados correctamente', 'ok');
    modoEdicionDetalle.value = false;
    await cargarHistorialVentasDia();
    cerrarDetalleVenta();
  } catch (error) {
    mostrarMensaje('Error al guardar cambios', 'error');
  }
}

function cancelarEdicionDetalle() {
  modoEdicionDetalle.value = false;
  detalleEditandoIndex.value = null;
  totalManualEditado.value = false;
}

async function eliminarDetalleVenta(index: number) {
  const detalle = historialVentaDetalle.value[index];
  if (!detalle?.idVentaDetalle) return;
  
  if (!confirm(`¿Eliminar "${(detalle.producto || detalle.Producto)?.nombre}" de esta venta?`)) {
    return;
  }
  
  try {
    const response = await getJson<ApiRespuesta<unknown>>(
      `/ventasDetalle/eliminarVentaDetalle/${detalle.idVentaDetalle}`,
      { method: 'DELETE' }
    );
    
    if (response?.codigo === 200) {
      historialVentaDetalle.value.splice(index, 1);
      if (!totalManualEditado.value) {
        montoTotalEditado.value = calcularNuevoTotal();
        montoTotalInput.value = montoTotalEditado.value;
      }
      mostrarMensaje('Producto eliminado de la venta', 'ok');
    } else {
      mostrarMensaje(response?.mensaje || 'Error al eliminar producto', 'error');
    }
  } catch (error) {
    mostrarMensaje('Error al eliminar producto', 'error');
  }
}

async function eliminarTodosLosDetalles() {
  if (historialVentaDetalle.value.length === 0) {
    mostrarMensaje('No hay productos para eliminar', 'info');
    return;
  }
  
  if (!confirm(`¿Eliminar todos los productos de esta venta? Esta acción no se puede deshacer.`)) {
    return;
  }
  
  try {
    for (const detalle of historialVentaDetalle.value) {
      if (detalle.idVentaDetalle) {
        await getJson<ApiRespuesta<unknown>>(
          `/ventasDetalle/eliminarVentaDetalle/${detalle.idVentaDetalle}`,
          { method: 'DELETE' }
        );
      }
    }
    
    historialVentaDetalle.value = [];
    if (!totalManualEditado.value) {
      montoTotalEditado.value = 0;
      montoTotalInput.value = 0;
    }
    mostrarMensaje('Todos los productos han sido eliminados', 'ok');
  } catch (error) {
    mostrarMensaje('Error al eliminar productos', 'error');
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
            <button 
              v-if="t.items.length === 0 && tickets.length > 1" 
              type="button" 
              class="btn-delete-ticket-chip"
              @click.stop="eliminarTicket(t.id)"
            >
              ×
            </button>
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
              <button class="tool-btn btn-promo" @click="modalPromocionesAbierto = true" title="Gestionar Promociones">⚔</button>
              <button class="tool-btn btn-scan" @click="startScanner" title="Escanear">📷</button>
              <button class="tool-btn btn-mic" :class="{ 'is-recording': isRecording }" @mousedown.prevent="startVoiceCommand">🎤</button>
            </div>
          </div>
        </div>
      </header>

        <!-- ÁREA DE PRODUCTOS RÁPIDOS / RESULTADOS -->
      <div class="catalog-grid custom-scrollbar">
        <div class="catalog-items-container">
          <div class="carousel-wrapper" v-if="promocionesActivas.length > 0 && !terminoBusqueda">
            <CarruselPromociones
              :promociones="promocionesActivas"
              @agregar="agregarPromocionAlTicket"
            />
          </div>
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
    <aside class="pos-right checkout-section animate-slide-in-right resize-trigger-active" :class="{ 'is-open': ticketVisibleMobile }">
      <!-- Activador para móviles con resize handle -->
      <div class="mobile-ticket-trigger" @click="ticketVisibleMobile = !ticketVisibleMobile">
        <div class="resize-handle-trigger" @mousedown.stop="startResize" @touchstart.stop="startResize">
          <span class="resize-dots">⋮⋮</span>
        </div>
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
            <article v-for="item in ticket" :key="item.id" class="ticket-item-row" :class="{ 'is-promo': asAny(item).is_promocion }">
              <div class="item-main">
                <div v-if="asAny(item).is_promocion" class="item-image">
                  <img 
                    v-if="asAny(item).promocion?.imagen_url" 
                    :src="formatImagenUrl(asAny(item).promocion.imagen_url)" 
                    :alt="item.nombre" 
                  />
                  <span v-else class="promo-placeholder">🎁</span>
                </div>
                <div class="item-info">
                  <h4 class="item-name">
                    <span v-if="asAny(item).is_promocion" class="promo-badge">❧</span>
                    {{ item.nombre }}
                  </h4>
                  <div class="item-meta" v-if="asAny(item).is_promocion">
                    <span class="promo-contents">{{ asAny(item).promocion.detalles.map((d: any) => `${d.cantidad >= 1000 ? (d.cantidad / 1000) + 'kg' : d.cantidad + 'pza'} ${d.nombre_producto}`).join(', ') }}</span>
                  </div>
                  <div class="item-meta" v-else>
                    <span class="unit-price">{{ formatoMoneda(item.precio) }}</span>
                    <label v-if="asAny(item).precio_mayoreo && asAny(item).precio_mayoreo > 0" class="mayoreo-toggle">
                      <input type="checkbox" :checked="asAny(item).is_mayoreo" @change="toggleMayoreo(asAny(item))">
                      <span>Mayoreo</span>
                    </label>
                  </div>
                </div>
                
                <div class="item-actions">
                  <div class="qty-control" v-if="asAny(item).is_gramaje">
                    <button class="qty-btn calc-btn" @click="editarGramajeItem(asAny(item))" title="Editar cantidad">⚖️</button>
                    <span class="qty-val">{{ item.cantidad }}g</span>
                  </div>
                  <div class="qty-control" v-else-if="!asAny(item).is_promocion">
                    <button class="qty-btn" @click="disminuirCantidad(asAny(item))">-</button>
                    <span class="qty-val">{{ item.cantidad }}</span>
                    <button class="qty-btn" @click="aumentarCantidad(asAny(item))">+</button>
                  </div>
                  <div v-else class="qty-control promo-qty">
                    <button class="qty-btn" @click="disminuirCantidad(asAny(item))">-</button>
                    <span class="qty-val">{{ item.cantidad }}</span>
                    <button class="qty-btn" @click="aumentarCantidad(asAny(item))">+</button>
                  </div>
                  <div class="item-subtotal" :class="{ 'promo-price': asAny(item).is_promocion }">
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
    <HistorialVentasModal :open="modalHistorialAbierto" :loading="historialCargando" :cobro-total="historialCobroTotal" :ganancia-total="historialGananciaTotal" :ventas="historialVentas" :usuarios-unicos="historialUsuariosUnicos" :es-admin="esAdmin" @close="modalHistorialAbierto = false" @ver-detalle="verDetalleVenta" @cancelar="cancelarVentaDesdeHistorial" @ventas-corregidas="onVentasCorregidas" />
    
    <!-- Detalle de venta modal custom -->
    <div v-if="modalDetalleVentaAbierto" class="pos-modal-overlay" @click.self="cerrarDetalleVenta">
      <div class="pos-modal-card animate-pop-in">
        <div class="modal-corner tl"></div>
        <div class="modal-corner tr"></div>
        <div class="modal-corner bl"></div>
        <div class="modal-corner br"></div>
        
        <header class="modal-h">
          <h3>🔍 Detalle de Venta #{{ historialVentaSeleccionada?.numeroTicket }}</h3>
          <div class="modal-actions">
            <button v-if="historialVentaTieneDiscrepancia" class="btn-warning" title="La suma de detalles no coincide con el total">⚠️ Discrepancia</button>
            <button v-if="esAdmin && !modoEdicionDetalle" class="btn-editar" @click="iniciarEdicionDetalle">✏️ Editar</button>
            <template v-if="modoEdicionDetalle">
              <button class="btn-guardar" @click="guardarCambiosDetalle">💾 Guardar</button>
              <button class="btn-cancelar" @click="cancelarEdicionDetalle">Cancelar</button>
            </template>
            <button class="close-x" @click="cerrarDetalleVenta">×</button>
          </div>
        </header>
        <div class="modal-b custom-scrollbar">
          <div class="venta-info-grid">
            <div class="info-card fecha-card">
              <div class="info-icon">📅</div>
              <div class="info-content">
                <span class="info-label">Fecha</span>
                <span class="info-value">{{ historialVentaSeleccionada?.fechaVenta?.slice(0, 10) }}</span>
              </div>
            </div>
            <div class="info-card hora-card">
              <div class="info-icon">🕐</div>
              <div class="info-content">
                <span class="info-label">Hora</span>
                <span class="info-value">{{ historialVentaSeleccionada?.fechaVenta?.slice(11, 16) }}</span>
              </div>
            </div>
            <div class="info-card cajero-card">
              <div class="info-icon">👤</div>
              <div class="info-content">
                <span class="info-label">Cajero</span>
                <span class="info-value">{{ historialVentaSeleccionada?.nombreUsuario || 'Cajero' }}</span>
              </div>
            </div>
            <div class="info-card">
              <div class="info-icon">💳</div>
              <div class="info-content">
                <span class="info-label">Método</span>
                <span class="info-value method-badge" :class="getMetodoClase(historialVentaSeleccionada?.metodoPago)">
                  {{ historialVentaSeleccionada?.metodoPago }}
                </span>
              </div>
            </div>
          </div>
          <div class="total-card">
            <div class="total-label">
              <span class="total-icon">💰</span>
              <span>Total de la Venta</span>
            </div>
            <template v-if="!modoEdicionDetalle">
              <div class="total-value">{{ formatoMoneda(Number(historialVentaSeleccionada?.montoTotal)) }}</div>
            </template>
            <template v-else>
              <div class="total-edit-wrapper">
                <span class="currency-prefix">$</span>
                <input 
                  v-model.number="montoTotalInput" 
                  type="number" 
                  min="0" 
                  step="1" 
                  class="total-input"
                  :class="{ 'manual-edited': totalManualEditado }"
                  @input="onTotalManualChange"
                />
                <span v-if="totalManualEditado" class="edit-indicator" title="Total modificado manualmente">✏️</span>
              </div>
            </template>
          </div>
          <div class="items-header">
            <span>🛒 Productos ({{ historialVentaDetalle.length }})</span>
            <button v-if="esAdmin && modoEdicionDetalle && historialVentaDetalle.length > 0" class="btn-eliminar-todos" @click="eliminarTodosLosDetalles" title="Eliminar todos los productos">
              🗑️ Eliminar todo
            </button>
          </div>
          <div class="detalle-items-list">
            <div v-for="(d, i) in historialVentaDetalle" :key="i" class="d-item">
              <span class="d-name" :title="(d.producto || d.Producto)?.nombre">{{ (d.producto || d.Producto)?.nombre }}</span>
              
              <template v-if="detalleEditandoIndex === i">
                <input v-model.number="cantidadTemporal" type="number" min="1" class="edit-input" />
                <input v-model.number="precioTemporal" type="number" step="0.01" min="0" class="edit-input" />
                <button class="btn-confirm" @click="confirmarEdicionItem(i)">✓</button>
                <button class="btn-cancel" @click="cancelarEdicionItem">×</button>
              </template>
              <template v-else>
                <span class="d-qty" :class="{ editable: esAdmin && modoEdicionDetalle }" @click="esAdmin && modoEdicionDetalle ? iniciarEditarItem(i) : null">
                  {{ d.cantidad }} {{ (d.producto || d.Producto)?.is_gramaje ? 'g' : 'pza' }}
                </span>
                <strong class="d-sub">{{ formatoMonedaRedondeada(calcularSubtotal(d.cantidad, Number(d.precioUnitarioVenta))) }}</strong>
                <div class="d-actions">
                  <button v-if="esAdmin && modoEdicionDetalle" class="btn-edit-item" @click="iniciarEditarItem(i)" title="Editar">✏️</button>
                  <button v-if="esAdmin && modoEdicionDetalle" class="btn-delete-item" @click="eliminarDetalleVenta(i)" title="Eliminar">🗑️</button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CalculadoraGramajeModal 
      :open="modalGramajeAbierto" 
      :producto="modalProductoGramaje ? { ...modalProductoGramaje, codigo_barras: modalProductoGramaje.codigo_barras ?? '' } : null"
      :is-editing="gramajeEditandoDesdeHistorial"
      :cantidad-inicial="gramajeEditandoCantidad"
      :precio-inicial="gramajeEditandoPrecio"
      @close="modalGramajeAbierto = false; modalProductoGramaje = null; gramajeEditandoDesdeHistorial = false; gramajeEditandoIndice = null" 
      @add="agregarProductoGramaje" 
    />
    <CobroModal :open="modalCobroAbierto" :total="totalVenta" @close="modalCobroAbierto = false" @confirmar-efectivo="confirmarCobroEfectivo" @confirmar-transferencia="confirmarCobroTransferencia" @confirmar-tarjeta="confirmarCobroTarjeta" />
    <CrudPromociones :open="modalPromocionesAbierto" @close="modalPromocionesAbierto = false; cargarPromocionesActivas()" @updated="cargarPromocionesActivas" />

    <Transition name="toast">
      <div v-if="mensaje" class="toast-overlay">
        <div class="toast-card" :class="`toast-${mensajeTipo}`">
          <span class="toast-icon">{{ mensajeTipo === 'ok' ? '✓' : mensajeTipo === 'error' ? '✕' : 'ℹ' }}</span>
          <span class="toast-text">{{ mensaje }}</span>
        </div>
      </div>
    </Transition>

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
  
  .btn-delete-ticket-chip {
    width: 12px !important;
    height: 12px !important;
    min-width: 12px !important;
    min-height: 12px !important;
    padding: 0 !important;
    background: var(--error-color) !important;
    color: var(--text-primary) !important;
    border-radius: 50% !important;
    border: 1px solid var(--border-color) !important;
    font-size: 8px !important;
    line-height: 1 !important;
    font-weight: bold !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin-left: 2px;
    flex-shrink: 0;
  }
  
  .btn-delete-ticket-chip:active {
    transform: scale(0.9);
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
    display: flex;
    flex-direction: column;
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
    padding: 0.25rem 0.35rem;
    gap: 0.2rem;
    border-radius: 6px;
    flex-wrap: nowrap;
    overflow: hidden;
  }
  
  .input-wrapper input {
    font-size: 0.75rem;
    min-width: 0;
    flex: 1;
  }
  
  .search-icon {
    font-size: 0.75rem;
    flex-shrink: 0;
  }
  
  .action-tools {
    display: flex;
    gap: 0.15rem;
    flex-shrink: 0;
  }
  
  .tool-btn {
    width: 32px;
    height: 32px;
    font-size: 0.85rem;
    border-radius: 5px;
    border-width: 1px;
    flex-shrink: 0;
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
    min-height: 50px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
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

/* =========================================
   PANTALLAS MUY PEQUEÑAS (iPhone SE - 375x667)
   ========================================= */
@media (max-width: 375px) {
  .pos-container {
    max-height: 100dvh;
    overflow: hidden;
  }
   
  /* Barra de tickets compacta */
  .tickets-bar-mobile {
    padding: 0.2rem 0.15rem;
    min-height: 36px;
  }
  
  .tickets-bar-scroll {
    gap: 0.2rem;
  }
  
  .btn-add-ticket-mini {
    min-width: 30px;
    height: 30px;
    border-radius: 5px;
    font-size: 0.9rem;
  }
  
  .ticket-chip {
    min-width: 32px;
    height: 30px;
    padding: 0.15rem 0.3rem;
    border-radius: 5px;
  }
  
  .chip-num {
    font-size: 0.55rem;
  }
  
  .chip-total, .chip-status {
    font-size: 0.35rem;
  }
  
  /* Catalog header ultra pequeño */
  .catalog-header {
    padding: 0.3rem;
  }
  
  .input-wrapper {
    padding: 0.2rem 0.3rem;
    gap: 0.15rem;
    border-radius: 6px;
    border-width: 1px;
    flex-wrap: nowrap;
    overflow: hidden;
  }
  
  .input-wrapper input {
    font-size: 0.7rem;
    min-width: 0;
    flex: 1;
  }
  
  .input-wrapper input::placeholder {
    font-size: 0.55rem;
  }
  
  .search-icon {
    font-size: 0.7rem;
    flex-shrink: 0;
  }
  
  .action-tools {
    display: flex;
    gap: 0.1rem;
    flex-shrink: 0;
  }
  
  .tool-btn {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
    border-radius: 4px;
    border-width: 1px;
    flex-shrink: 0;
  }
  
  /* Grid de productos - columnas compactas */
  .catalog-grid {
    padding: 0.3rem;
  }
  
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.25rem;
  }
  
  .product-card {
    padding: 0.25rem;
    border-radius: 6px;
    gap: 0.15rem;
    border-width: 1px;
  }
  
  .product-icon {
    font-size: 1.2rem;
  }
  
  .product-name {
    font-size: 0.55rem;
    height: auto;
    line-height: 1.1;
  }
  
  .product-price-tag {
    font-size: 0.55rem;
    padding: 0.1rem 0.3rem;
    border-radius: 6px;
    border-width: 1px;
  }
  
  .stock-badge {
    font-size: 0.4rem;
    padding: 0.05rem 0.15rem;
  }
  
  /* Panel derecho ultra compacto */
  .pos-right {
    height: 50dvh;
  }
  
  .mobile-ticket-trigger {
    padding: 0.3rem 0.5rem;
    font-size: 0.7rem;
    min-height: 32px;
  }
  
  .trigger-info {
    gap: 0.25rem;
  }
  
  .trigger-info .icon {
    font-size: 0.75rem;
  }
  
  .trigger-total {
    font-size: 0.85rem;
  }
  
  .chevron {
    font-size: 0.7rem;
  }
  
  /* Checkout container */
  .checkout-container {
    padding: 0.4rem;
  }
  
  .checkout-header {
    padding: 0.2rem;
    margin-bottom: 0.2rem;
  }
  
  .header-title h3 {
    font-size: 0.7rem;
  }
  
  .header-title .icon {
    font-size: 0.8rem;
  }
  
  .header-title {
    gap: 0.2rem;
  }
  
  .btn-clear-all {
    font-size: 0.5rem;
    padding: 0.1rem 0.3rem;
    border-width: 1px;
  }
  
  /* Ticket items ultra compactos */
  .ticket-items-list {
    flex: 1;
    min-height: 40px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    gap: 0.2rem;
    padding-right: 0.2rem;
  }
  
  .ticket-item-row {
    padding: 0.25rem;
    border-width: 1px;
    border-radius: 6px;
  }
  
  .item-name {
    font-size: 0.6rem;
    padding-right: 1.2rem;
  }
  
  .item-meta {
    font-size: 0.5rem;
    gap: 0.2rem;
  }
  
  .unit-price {
    font-size: 0.5rem;
  }
  
  .mayoreo-toggle {
    font-size: 0.55rem;
    padding: 0.1rem 0.3rem;
    gap: 0.2rem;
  }
  
  .qty-control {
    transform: scale(0.55);
    border-width: 1px;
  }
  
  .qty-btn {
    width: 20px;
    height: 20px;
    font-size: 0.8rem;
  }
  
  .qty-val {
    width: 30px;
    font-size: 0.7rem;
  }
  
  .item-subtotal {
    font-size: 0.6rem;
  }
  
  .btn-remove-item {
    width: 16px;
    height: 16px;
    font-size: 0.8rem;
    top: 4px;
    right: 4px;
  }
  
  .promo-contents {
    font-size: 0.5rem;
    max-width: 120px;
  }
  
  /* Checkout footer */
  .checkout-footer {
    padding-top: 0.3rem;
    gap: 0.3rem;
  }
  
  .summary-row {
    font-size: 0.55rem;
  }
  
  .summary-row.total {
    font-size: 0.9rem;
    padding-top: 0.2rem;
    margin-top: 0.2rem;
  }
  
  .total-amount {
    font-size: 0.9rem;
  }
  
  .checkout-actions-scroll {
    padding: 0.2rem 0.1rem;
  }
  
  .checkout-actions-scroll .btn-checkout.primary {
    height: 32px;
    font-size: 0.6rem;
    min-width: 90px;
    border-radius: 5px;
    padding: 0 0.4rem;
    border-width: 2px;
    box-shadow: 0 2px 0 var(--border-color);
  }
  
  .checkout-actions-scroll .btn-checkout.primary .icon {
    font-size: 0.7rem;
  }
  
  .checkout-actions-scroll .btn-checkout.primary .text {
    display: none;
  }
  
  .checkout-actions-scroll .btn-checkout.primary::after {
    content: 'Cobrar';
    font-size: 0.6rem;
  }
  
  .checkout-actions-scroll .extra-actions {
    gap: 0.2rem;
  }
  
  .checkout-actions-scroll .btn-checkout.secondary {
    width: 32px;
    min-width: 32px;
    height: 32px;
    font-size: 0.75rem;
    border-radius: 5px;
    border-width: 2px;
    box-shadow: 0 2px 0 var(--border-color);
  }
  
  .cashier-badge {
    font-size: 0.45rem;
    padding: 0.15rem 0.4rem;
    margin-top: 0.2rem;
  }
  
  /* Carrusel de promociones ultra compacto */
  .promo-carousel {
    padding: 0.4rem;
    margin: 0.25rem;
    border-width: 2px;
    border-radius: 10px;
  }
  
  .hero-section {
    gap: 0.4rem;
  }
  
  .hero-icon {
    font-size: 1rem;
  }
  
  .hero-title {
    font-size: 0.75rem;
  }
  
  .hero-subtitle {
    display: none;
  }
  
  .hero-decor {
    font-size: 0.8rem;
  }
  
  .card-inner {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .card-image {
    width: 70px;
  }
  
  .image-placeholder {
    font-size: 1.5rem;
  }
  
  .placeholder-text {
    display: none;
  }
  
  .promo-name {
    font-size: 0.8rem;
  }
  
  .promo-description {
    display: none;
  }
  
  .products-title {
    font-size: 0.6rem;
  }
  
  .products-list {
    gap: 0.15rem;
  }
  
  .product-item {
    font-size: 0.6rem;
    padding: 0.15rem 0.3rem;
    gap: 0.3rem;
  }
  
  .product-qty {
    min-width: 30px;
    font-size: 0.55rem;
  }
  
  .price-original {
    display: none;
  }
  
  .price-promo-container {
    padding: 0.2rem 0.5rem;
  }
  
  .price-promo {
    font-size: 0.9rem;
  }
  
  .btn-agregar {
    padding: 0.3rem 0.5rem;
    font-size: 0.6rem;
    gap: 0.25rem;
    border-width: 2px;
    box-shadow: 0 2px 0 var(--border-color);
  }
  
  .btn-icon {
    font-size: 0.8rem;
  }
  
  .btn-text {
    display: none;
  }
  
  .btn-agregar::after {
    content: 'Agregar';
  }
  
  .btn-decor {
    display: none;
  }
  
  .carousel-btn {
    width: 28px;
    height: 28px;
  }
  
  .carousel-btn.prev {
    left: -4px;
  }
  
  .carousel-btn.next {
    right: -4px;
  }
  
  .card-badge-container {
    top: -6px;
    right: -6px;
  }
  
  .card-badge {
    padding: 0.15rem 0.4rem;
    font-size: 0.55rem;
    border-width: 2px;
  }
  
  .carousel-footer {
    margin-top: 0.5rem;
    padding-top: 0.4rem;
  }
  
  .carousel-dots {
    gap: 0.3rem;
  }
  
  .dot {
    width: 6px;
    height: 6px;
  }
  
  .carousel-counter {
    font-size: 0.6rem;
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
  position: relative;
}

.sidebar-header::before {
  content: '❧';
  position: absolute;
  top: -10px;
  font-size: 1.2rem;
  color: var(--accent-color);
  opacity: 0.4;
  animation: float 3s ease-in-out infinite;
}

.sidebar-header h3 { 
  font-size: 0.7rem; 
  text-transform: uppercase; 
  color: var(--accent-color);
  font-family: 'HyliaSerifBeta', serif;
  letter-spacing: 0.1em;
  text-shadow: 1px 1px 0 var(--shadow-color);
}

.btn-add-ticket {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  border: 3px solid var(--accent-color);
  background: linear-gradient(180deg, var(--accent-color) 0%, #92400e 100%);
  color: var(--bg-primary);
  font-size: 1.6rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 4px 0 var(--border-color);
  position: relative;
  overflow: hidden;
}

.btn-add-ticket::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.5s;
}

.btn-add-ticket:hover::before {
  left: 100%;
}

.btn-add-ticket:hover { 
  transform: translateY(-3px);
  box-shadow: 0 7px 0 var(--border-color);
  filter: brightness(1.1);
}

.btn-add-ticket:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--border-color);
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
  padding: 1rem 1.5rem;
  background: linear-gradient(to bottom, var(--bg-secondary), var(--bg-primary));
  border-bottom: var(--border-width) solid var(--border-color);
}

.pos-hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.pos-hero-section::after {
  content: '❧';
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.2rem;
  color: var(--accent-color);
  opacity: 0.3;
}

.hero-decorations {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.deco-left, .deco-right {
  font-size: 1.5rem;
  color: var(--accent-color);
  opacity: 0.5;
  animation: sparkle 2s ease-in-out infinite;
}

.deco-center {
  font-size: 2rem;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

@keyframes pulse-glow {
  0%, 100% { filter: drop-shadow(0 0 5px var(--accent-color)); transform: scale(1); }
  50% { filter: drop-shadow(0 0 15px var(--accent-color)); transform: scale(1.05); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.catalog-header {
  padding: 1rem 1.5rem;
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

.btn-promo:hover {
  background: linear-gradient(135deg, var(--accent-color) 0%, #92400e 100%);
  border-color: var(--accent-color);
  color: var(--bg-primary);
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
  border: 2px solid var(--border-color);
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
  box-shadow: 
    0 8px 20px var(--shadow-color),
    0 0 30px color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.product-card:active {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px var(--shadow-color);
}

.card-glow {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: radial-gradient(circle at center, var(--accent-color), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.product-card:hover .card-glow { opacity: 0.15; }

.product-icon { 
  font-size: 2.5rem; 
  filter: drop-shadow(2px 2px 0 var(--shadow-color));
  transition: transform 0.2s;
}

.product-card:hover .product-icon {
  transform: scale(1.1);
  animation: bounce-icon 0.5s ease;
}

@keyframes bounce-icon {
  0%, 100% { transform: scale(1.1) translateY(0); }
  50% { transform: scale(1.1) translateY(-5px); }
}

.product-name { 
  font-size: 0.9rem; 
  font-weight: bold; 
  line-height: 1.2; 
  height: 2.2rem; 
  overflow: hidden;
  color: var(--text-primary);
  text-shadow: 1px 1px 0 var(--shadow-color);
}

.product-price-tag {
  background: linear-gradient(135deg, var(--success-color) 0%, #166534 100%);
  color: white;
  padding: 0.3rem 0.9rem;
  border-radius: 20px;
  font-weight: bold;
  font-size: 1rem;
  border: 2px solid #4ade80;
  box-shadow: 0 3px 10px rgba(34, 197, 94, 0.3);
  font-family: "Courier New", monospace;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
}

.stock-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
}
.in-stock { background: color-mix(in srgb, var(--success-color) 20%, transparent); color: var(--text-primary); border: 1px solid var(--success-color); }
.low-stock { background: color-mix(in srgb, var(--e rror-color) 20%, transparent); color: var(--error-color); border: 1px solid var(--error-color); }

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
  position: relative;
}

.checkout-header::before {
  content: '❧';
  position: absolute;
  left: 50%;
  bottom: -12px;
  transform: translateX(-50%);
  font-size: 1rem;
  color: var(--accent-color);
  opacity: 0.4;
  background: var(--bg-secondary);
  padding: 0 0.5rem;
}

.header-title { display: flex; align-items: center; gap: 0.4rem; }
.header-title h3 { 
  font-family: 'HyliaSerifBeta', serif; 
  color: var(--accent-color); 
  font-size: 1.1rem;
  text-shadow: 2px 2px 0 var(--border-color);
  letter-spacing: 0.05em;
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
  background: linear-gradient(180deg, var(--error-color) 0%, #991b1b 100%);
  border: 2px solid var(--border-color);
  color: white;
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  cursor: pointer;
  text-transform: uppercase;
  box-shadow: 0 3px 0 var(--border-color);
  transition: all 0.2s;
}

.btn-clear-all:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 0 var(--border-color);
  filter: brightness(1.1);
}

.btn-clear-all:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 var(--border-color);
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
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  padding: 0.7rem;
  position: relative;
  transition: all 0.2s;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.item-image {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  min-width: 50px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--accent-color);
  box-shadow: 0 2px 8px var(--shadow-color);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.promo-placeholder {
  font-size: 1.8rem;
  color: var(--accent-color);
}

.ticket-item-row:hover { 
  border-color: var(--accent-color); 
  box-shadow: 0 4px 15px color-mix(in srgb, var(--accent-color) 20%, transparent);
  transform: translateX(3px);
}

.ticket-item-row.is-promo {
  background: linear-gradient(135deg, var(--bg-primary) 0%, color-mix(in srgb, var(--accent-color) 10%, var(--bg-secondary)) 100%);
  border-color: var(--accent-color);
  border-width: 2px;
}

.ticket-item-row.is-promo .item-name {
  color: var(--accent-color);
}

.promo-badge {
  margin-right: 0.3rem;
  font-size: 1rem;
  animation: pulse-glow 2s ease-in-out infinite;
}

.promo-contents {
  font-size: 0.7rem;
  color: var(--text-secondary);
  display: block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
}

.promo-qty {
  opacity: 0.7;
}

.promo-price {
  color: var(--success-color);
  font-weight: bold;
  font-family: "Courier New", monospace;
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
  text-shadow: 1px 1px 0 var(--shadow-color);
}
.item-meta { 
  display: flex; 
  align-items: center; 
  gap: 0.8rem; 
  font-size: 0.75rem; 
  flex-wrap: wrap;
}
.unit-price { color: var(--text-secondary); font-size: 0.7rem; font-family: "Courier New", monospace; }

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
  border: 1px solid var(--accent-color);
  transition: all 0.2s;
}

.mayoreo-toggle:hover {
  background: color-mix(in srgb, var(--accent-color) 25%, transparent);
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
  box-shadow: 0 2px 5px var(--shadow-color);
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
  color: var(--bg-primary);
  transform: scale(0.95);
}

.calc-btn {
  font-size: 1.1rem;
  width: 36px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

@media (max-width: 480px) {
  .calc-btn {
    font-size: 1rem;
    width: 32px;
    height: 28px;
  }
}

.calc-btn:hover {
  background: color-mix(in srgb, var(--success-color) 25%, transparent);
  color: var(--success-color);
}

.qty-val { 
  width: 45px; 
  text-align: center; 
  font-size: 0.85rem; 
  font-weight: bold;
  font-family: "Courier New", monospace;
}

.item-subtotal { 
  font-weight: 900; 
  color: var(--success-color); 
  font-size: 0.95rem;
  font-family: "Courier New", monospace;
  text-shadow: 1px 1px 0 var(--shadow-color);
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
  position: relative;
}

.checkout-footer::before {
  content: '⚔';
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.9rem;
  color: var(--accent-color);
  opacity: 0.4;
  background: var(--bg-secondary);
  padding: 0 0.75rem;
}

.empty-ticket-msg {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.empty-ticket-msg p {
  margin: 0;
  font-style: italic;
  font-size: 0.9rem;
}

.empty-ticket-icon {
  font-size: 3rem;
  opacity: 0.4;
  animation: float 3s ease-in-out infinite;
}

.empty-catalog {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.empty-catalog p {
  margin: 0;
  font-style: italic;
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.3;
  animation: float 3s ease-in-out infinite;
}

.summary-table { display: flex; flex-direction: column; gap: 0.3rem; }
.summary-row { 
  display: flex; 
  justify-content: space-between; 
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.summary-row.total {
  font-size: 1.4rem;
  color: var(--accent-color);
  border-top: 2px solid var(--border-color);
  padding-top: 0.4rem;
  margin-top: 0.3rem;
  position: relative;
}

.summary-row.total::before {
  content: '❧';
  position: absolute;
  left: 50%;
  top: -10px;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: var(--accent-color);
  opacity: 0.5;
  background: var(--bg-secondary);
  padding: 0 0.5rem;
}

.total-amount { 
  font-family: 'HyliaSerifBeta', serif; 
  font-weight: 900; 
  color: var(--success-color);
  text-shadow: 2px 2px 0 var(--border-color);
  letter-spacing: 0.02em;
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
  background: linear-gradient(180deg, var(--success-color) 0%, #166534 100%);
  border: 3px solid #4ade80;
  box-shadow: 0 4px 0 var(--border-color);
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.checkout-actions-scroll .btn-checkout.primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.5s;
}

.checkout-actions-scroll .btn-checkout.primary:hover::before {
  left: 100%;
}

.checkout-actions-scroll .btn-checkout.primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 7px 0 var(--border-color);
  filter: brightness(1.1);
}

.checkout-actions-scroll .btn-checkout.primary:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--border-color);
}

.checkout-actions-scroll .btn-checkout.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.checkout-actions-scroll .extra-actions {
  display: flex;
  gap: 0.4rem;
}
.extra-actions {
  justify-content: center;
}

.checkout-actions-scroll .extra-actions .btn-checkout.secondary {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  box-shadow: 0 3px 0 var(--border-color);
  transition: all 0.2s;
}

.checkout-actions-scroll .extra-actions .btn-checkout.secondary:hover {
  border-color: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: 0 5px 0 var(--border-color);
}

.checkout-actions-scroll .extra-actions .btn-checkout.secondary:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 var(--border-color);
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
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  font-weight: bold;
  background: var(--bg-primary);
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  border: 1px solid var(--border-color);
}
.cashier-badge .dot { 
  width: 8px; 
  height: 8px; 
  background: var(--success-color);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--success-color);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
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

.venta-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
}

.info-card.fecha-card {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-primary));
}

.info-card.hora-card {
  border-color: #8b5cf6;
  background: color-mix(in srgb, #8b5cf6 10%, var(--bg-primary));
}

.info-card.cajero-card {
  border-color: #06b6d4;
  background: color-mix(in srgb, #06b6d4 10%, var(--bg-primary));
}

.info-icon {
  font-size: 1.5rem;
}

.info-content {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}

.total-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  margin-bottom: 1rem;
}

.total-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: color-mix(in srgb, white 80%, transparent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.total-icon {
  font-size: 1.25rem;
}

.total-value {
  font-size: 2rem;
  font-weight: 900;
  font-family: "Courier New", monospace;
  color: white;
  text-shadow: 2px 2px 0 color-mix(in srgb, black 30%, transparent);
}

.total-edit-wrapper {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: white;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}

.total-input {
  width: 100px;
  padding: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  font-family: "Courier New", monospace;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  text-align: right;
}

.total-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.currency-prefix {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.edit-indicator {
  font-size: 1rem;
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
  
  .venta-info-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .info-card {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .info-icon {
    font-size: 1.25rem;
  }
  
  .info-label {
    font-size: 0.6rem;
  }
  
  .info-value {
    font-size: 0.8rem;
  }
  
  .total-card {
    padding: 1rem;
  }
  
  .total-value {
    font-size: 1.5rem;
  }
  
  .total-input {
    width: 80px;
    font-size: 1rem;
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

/* Resizable ticket panel */
.resize-vertical {
  overflow: hidden;
  position: relative;
}

.resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: row-resize;
  z-index: 10;
  user-select: none;
}

.resize-dots {
  color: var(--border-color);
  font-size: 14px;
  letter-spacing: 2px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.resize-handle-trigger {
  display: none;
}

.resize-trigger-active .resize-handle-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  cursor: row-resize;
  flex-shrink: 0;
}

.resize-trigger-active .resize-handle-trigger .resize-dots {
  font-size: 18px;
  color: var(--text-secondary);
  opacity: 0.8;
}

.resize-trigger-active .resize-handle-trigger:active .resize-dots {
  opacity: 1;
  color: var(--accent-color);
}

.toast-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  pointer-events: none;
}

.toast-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 28px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 2px solid;
  animation: toastPop 0.3s ease-out;
}

.toast-ok {
  background: linear-gradient(135deg, #1a4d2e 0%, #2d7a46 100%);
  color: #ffffff;
  border-color: #4ade80;
}

.toast-error {
  background: linear-gradient(135deg, #4d1a1a 0%, #7a2d2d 100%);
  color: #ffffff;
  border-color: #f87171;
}

.toast-info {
  background: linear-gradient(135deg, #1a2f4d 0%, #2d4a7a 100%);
  color: #ffffff;
  border-color: #60a5fa;
}

.toast-icon {
  font-size: 1.2rem;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.toast-text {
  max-width: 300px;
  text-align: center;
}

@keyframes toastPop {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.toast-enter-active {
  animation: toastPop 0.3s ease-out;
}

.toast-leave-active {
  animation: toastPop 0.2s ease-in reverse;
}

/* =========================================
   ESTILOS PARA EDICIÓN DE DETALLE DE VENTA
   ========================================= */
.modal-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-editar, .btn-guardar, .btn-cancelar {
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-editar {
  background: linear-gradient(180deg, #facc15 0%, #eab308 100%);
  color: #1a1a1a;
}

.btn-warning {
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
  color: white;
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  border: 2px solid #dc2626;
  border-radius: 6px;
  cursor: help;
}

.btn-editar:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-guardar {
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  color: white;
}

.btn-guardar:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-cancelar {
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  color: white;
}

.btn-cancelar:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.d-item .editable {
  cursor: pointer;
  border-bottom: 1px dashed var(--accent-color);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.d-item .editable:hover {
  background: color-mix(in srgb, var(--accent-color) 20%, transparent);
}

.edit-input {
  width: 60px;
  padding: 0.25rem;
  font-size: 0.75rem;
  border: 2px solid var(--accent-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  text-align: center;
  font-family: 'Courier New', monospace;
}

.edit-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 40%, transparent);
}

.btn-confirm, .btn-cancel, .btn-edit-item {
  padding: 0.2rem 0.4rem;
  font-size: 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  background: var(--bg-secondary);
  transition: all 0.2s;
}

.btn-confirm {
  background: var(--success-color);
  color: white;
  border-color: var(--success-color);
}

.btn-confirm:hover {
  filter: brightness(1.1);
}

.btn-cancel {
  background: var(--error-color);
  color: white;
  border-color: var(--error-color);
}

.btn-cancel:hover {
  filter: brightness(1.1);
}

.btn-edit-item {
  font-size: 0.7rem;
  padding: 0.15rem 0.3rem;
}

.btn-edit-item:hover {
  background: color-mix(in srgb, var(--accent-color) 30%, transparent);
  transform: scale(1.1);
}

.d-actions {
  display: flex;
  gap: 0.3rem;
  align-items: center;
}

.btn-delete-item {
  font-size: 0.7rem;
  padding: 0.15rem 0.3rem;
  background: transparent;
  border: 1px solid var(--error-color);
  color: var(--error-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete-item:hover {
  background: var(--error-color);
  color: white;
  transform: scale(1.1);
}

.btn-eliminar-todos {
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  color: white;
  border: 2px solid var(--error-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-eliminar-todos:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--error-color) 40%, transparent);
}

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0;
}

.txt-pos.editing {
  color: var(--success-color);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.total-edit-wrapper {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.currency-prefix {
  font-size: 0.9rem;
  color: var(--success-color);
  font-weight: bold;
}

.total-input {
  width: 80px;
  padding: 0.25rem 0.4rem;
  font-size: 0.9rem;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--success-color);
  text-align: left;
  transition: all 0.2s;
}

.total-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 40%, transparent);
}

.total-input.manual-edited {
  border-color: var(--success-color);
  background: color-mix(in srgb, var(--success-color) 10%, var(--bg-primary));
}

.edit-indicator {
  font-size: 0.8rem;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>