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
import PedidoSugerido from './modals/PedidoSugerido.vue';
import SugeridoHoy from './modals/SugeridoHoy.vue';
import CrudPromociones from './modals/CrudPromociones.vue';
import CreditosPersonasModal from './modals/CreditosPersonasModal.vue';

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
  idCategoria?: number;
  requiere_envase?: boolean;
  precio_envase?: number;
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
  ganancia?: number | string;
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
  idCategoria?: number;
  idProducto?: number;
  precio_venta?: number;
  requiere_envase?: boolean;
  precio_envase?: number;
};

type TicketItem = Producto & {
  cantidad: number;
  idVentaDetalle?: number;
  is_mayoreo?: false;
  is_promocion?: false;
  promocion?: never;
  productoId?: number;
  requiere_envase?: boolean;
  precio_envase?: number;
  envase_aplicado?: boolean;
  cantidad_envase?: number;
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
  nombreUsuario?: string;
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
    const esAdmin = Number(localStorage.getItem('tipoUsuario') || 2) === 1;
    const modoReportes = localStorage.getItem('modoReportes') === 'true';
    const verTodos = esAdmin && modoReportes;
    const url = verTodos
      ? '/ventas/buscarVentasPendientes'
      : `/ventas/buscarVentasPendientes?idUsuario=${idUsuario}`;
    const response = await getJson<ApiRespuesta<VentaPendienteDTO[]>>(url);

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
  if (creandoTicket.value) return;

  creandoTicket.value = true;

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
const categoriaFiltro = ref<number | null>(null);

let scannerBuffer = '';
let scannerTimer: ReturnType<typeof setTimeout> | null = null;
let lastScannerKeyTime = 0;
const productos = shallowRef<Producto[]>([]);
const categorias = shallowRef<{ idCategoria: number; nombre: string }[]>([]);

const gamingCategoryId = computed(() => {
  const cat = categorias.value.find(c => c.nombre.toLowerCase() === 'gaming');
  return cat ? cat.idCategoria : null;
});

function esCategoriaGaming(idCategoria: number | undefined): boolean {
  if (!idCategoria || !gamingCategoryId.value) return false;
  return idCategoria === gamingCategoryId.value;
}
const tickets = ref<Ticket[]>([]);
const ticketActualId = ref<number | null>(null);
const mensaje = ref('');
const mensajeTipo = ref<'ok' | 'error' | 'info'>('info');
const nombreUsuario = ref(localStorage.getItem('nombreUsuario') || 'Cajero');
const sugerenciasVisibles = ref(false);
const indiceSugerenciaActiva = ref(-1);
const ticketDelDia = ref('1');
const creandoTicket = ref(false);
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
const modalPromocionesAbierto = ref(false);
const modalDescripcionPendiente = ref(false);
const descripcionPendienteTexto = ref('');
const modalCreditosAbierto = ref(false);
const modalCreditosSeleccionar = ref(false);
const creditoPersonaSeleccionada = ref<any>(null);
const totalPersonasCredito = ref(0);
const creditosResumen = ref<any[]>([]);

async function cargarCreditosResumen() {
  try {
    const res = await getJson<{ codigo: number; datos: any[] }>('/credito/venta/activos');
    if (res.codigo === 200) {
      creditosResumen.value = res.datos;
      const personasUnicas = new Set(res.datos.map((v: any) => v.idPersona));
      totalPersonasCredito.value = personasUnicas.size;
    }
  } catch (e) {
    console.error('Error al cargar resumen créditos', e);
  }
}

function abrirCreditos() {
  modalCreditosAbierto.value = true;
  modalCreditosSeleccionar.value = false;
  cargarCreditosResumen();
}
const modalVentasPendientesAbierto = ref(false);
const vpVistaLista = ref(true);
const ventasPendientes = ref<any[]>([]);
const ventaPendienteSeleccionada = ref<any>(null);
const modalCobroPendienteAbierto = ref(false);
const historialCargando = ref(false);
const historialCobroTotal = ref(0);
const historialGananciaTotal = ref(0);
const historialVentas = ref<any[]>([]);
const historialUsuariosUnicos = ref<{ idUsuario: number; nombre: string }[]>([]);
const historialDetalleCargando = ref(false);
const historialVentaDetalle = ref<any[]>([]);
const historialVentaSeleccionada = ref<any>(null);
const historialVentaTieneDiscrepancia = ref(false);
const historialDiscrepanciaMonto = ref(0);
const modalDetalleVentaAbierto = ref(false);
const detalleCreditoInfo = ref<any>(null);
const detalleAbonos = ref<any[]>([]);
const ticketVisibleMobile = ref(false);
const isKeyboardVisible = ref(false);
const modalAgregarPendienteAbierto = ref(false);
const agregarPendienteBusqueda = ref('');
const agregarPendienteInput = ref<HTMLInputElement | null>(null);
const agregarPendienteScannerActivo = ref(false);
const agregarPendienteProductos = ref<any[]>([]);
const modalProveedoresPedidos = ref(false);
const ppVistaListaProv = ref(true);
const ppVistaListaPed = ref(true);
const proveedores = ref<any[]>([]);
const pedidosProveedor = ref<any[]>([]);
const proveedorForm = ref<any>({ nombre: '', contacto: '', telefono: '', email: '', direccion: '', notas: '' });
const pedidoForm = ref<any>({ idProveedor: 0, fechaEntregaEsperada: '', montoTotal: 0, montoApartado: 0, estatus: 'PENDIENTE', notas: '', detalles: [] });
const editingProveedor = ref<any>(null);
const editingPedido = ref<any>(null);
const pedidoProveedorTab = ref<'proveedores' | 'pedidos' | 'sugerido' | 'sugeridoHoy'>('proveedores');
const sugerenciasPedido = ref<any[]>([]);
const sugerenciasSeleccionadas = ref<Set<number>>(new Set());
const sugerenciasPeriodo = ref<'semanal' | 'mensual'>('mensual');
const sugerenciasCargando = ref(false);
const showProveedorForm = ref(false);
const showPedidoForm = ref(false);
const montoManual = ref(false);
const searchProductoPedido = ref('');
const showProductoDropdownPedido = ref(false);
const newDetallePedido = ref<{ idProducto: number; nombre: string; cantidad: number; precioUnitario: number }>({ idProducto: 0, nombre: '', cantidad: 1, precioUnitario: 0 });
const productosDisponibles = ref<{ idProducto: number; nombre: string; precio_costo: number; codigoBarras?: string }[]>([]);
const searchWrapperRef = ref<HTMLElement | null>(null);

const historialEnvases = computed(() => {
  return historialVentaDetalle.value.filter((d) => {
    const cobroEnvaseTotal = Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0);
    return cobroEnvaseTotal > 0;
  });
});

const historialEnvaseTotal = computed(() => {
  return historialEnvases.value.reduce((sum, d) => {
    return sum + Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0);
  }, 0);
});

const provisionSemanalTotal = ref(0);
const provisionSemanalStatus = ref<'ok' | 'warning' | 'danger'>('ok');
const provisionStatusClass = computed(() => {
  return {
    'status-ok': provisionSemanalStatus.value === 'ok',
    'status-warning': provisionSemanalStatus.value === 'warning',
    'status-danger': provisionSemanalStatus.value === 'danger'
  };
});

const promocionesActivas = ref<any[]>([]);

const productosFiltradosBusqueda = computed(() => {
  if (!agregarPendienteBusqueda.value) return [];
  const q = agregarPendienteBusqueda.value.toLowerCase();
  return productos.value.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    (p.codigo_barras || '').toLowerCase().includes(q)
  ).slice(0, 10);
});

function buscarYAgregarPendiente() {
  if (!agregarPendienteBusqueda.value) return;
  const prod = productosFiltradosBusqueda.value[0];
  if (prod) agregarProductoAPendiente(prod);
}

const ventasPendientesAgrupadas = computed(() => {
  return ventasPendientes.value.map(v => {
    if (!v.detalles || v.detalles.length === 0) return v;
    const grouped: Record<string, any> = {};
    for (const d of v.detalles) {
      const key = `${d.productoNombre}_${d.precioUnitarioVenta}_${d.isGramaje}`;
      if (grouped[key]) {
        grouped[key].cantidad += d.cantidad || 1;
        grouped[key].subtotal = Number(grouped[key].cantidad) * Number(d.precioUnitarioVenta || 0);
      } else {
        grouped[key] = { ...d, cantidad: d.cantidad || 1, subtotal: Number(d.cantidad || 1) * Number(d.precioUnitarioVenta || 0) };
      }
    }
    return { ...v, detallesAgrupados: Object.values(grouped) };
  });
});

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
const busquedaEditar = ref('');
const resultadosEditar = ref<Producto[]>([]);
const cargandoBusquedaEditar = ref(false);

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
  
  window.addEventListener('keydown', manejarAtajosTeclado);
  
  cargarVentasPendientes();
  cargarCreditosResumen();
});

onUnmounted(() => {
  document.removeEventListener('mousemove', doResize);
  document.removeEventListener('mouseup', stopResize);
  document.removeEventListener('touchmove', doResize);
  document.removeEventListener('touchend', stopResize);
  window.removeEventListener('keydown', manejarAtajosTeclado);
});

function manejarAtajosTeclado(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (modalDetalleVentaAbierto.value) { cerrarDetalleVenta(); return; }
    if (modalCobroPendienteAbierto.value) { modalCobroPendienteAbierto.value = false; ventaPendienteSeleccionada.value = null; return; }
    if (modalVentasPendientesAbierto.value) { modalVentasPendientesAbierto.value = false; return; }
    if (modalDescripcionPendiente.value) { modalDescripcionPendiente.value = false; return; }
    if (modalCobroAbierto.value) { modalCobroAbierto.value = false; return; }
    if (modalGramajeAbierto.value) { modalGramajeAbierto.value = false; modalProductoGramaje.value = null; gramajeEditandoDesdeHistorial.value = false; gramajeEditandoIndice.value = null; return; }
    if (modalHistorialAbierto.value) { modalHistorialAbierto.value = false; return; }
    if (modalSalidaAbierto.value) { modalSalidaAbierto.value = false; return; }
    if (modalEntradaAbierto.value) { modalEntradaAbierto.value = false; return; }
    if (modalPromocionesAbierto.value) { modalPromocionesAbierto.value = false; return; }
    if (scannerActivo.value) { stopScanner(); return; }
  }

  if (e.key === 'F12') {
    e.preventDefault();
    if (ticket.value.length > 0 && !modalCobroAbierto.value) {
      cobrar();
    }
  }
  
  const target = e.target as HTMLElement;
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
  
  if (e.key === 'Enter' && !isInput && scannerBuffer.length > 0) {
    e.preventDefault();
    procesarEscaneo(scannerBuffer);
    scannerBuffer = '';
    return;
  }
  
  if (!isInput && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const now = Date.now();
    const timeDiff = now - lastScannerKeyTime;
    
    if (lastScannerKeyTime > 0 && timeDiff > 100) {
      scannerBuffer = '';
    }
    
    scannerBuffer += e.key;
    lastScannerKeyTime = now;
    
    if (scannerTimer) clearTimeout(scannerTimer);
    scannerTimer = setTimeout(() => {
      if (scannerBuffer.length > 0) {
        procesarEscaneo(scannerBuffer);
        scannerBuffer = '';
      }
    }, 300);
  }
}

async function procesarEscaneo(codigo: string) {
  const codigoLimpio = codigo.trim();
  if (!codigoLimpio) return;
  
  const producto = await buscarProductoPorCodigoBarras(codigoLimpio);
  if (producto) {
    const stockDisponible = producto.dto?.stock ?? Infinity;
    if (stockDisponible <= 0) {
      mostrarMensaje(`Producto ${producto.nombre} sin stock`, 'error');
      return;
    }
    await agregarProductoATicket(producto);
    mostrarMensaje(`Agregado: ${producto.nombre}`, 'ok');
  } else {
    mostrarMensaje(`Producto no encontrado: ${codigoLimpio}`, 'error');
  }
}

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
    if (esCategoriaGaming(p.idCategoria)) return false;
    const stock = p.dto?.stock;
    return stock === undefined || stock === null || stock > 0;
  });
  
  if (categoriaFiltro.value !== null) {
    resultados = resultados.filter(p => p.idCategoria === categoriaFiltro.value);
  }
  
  if (query) {
    const queryNormalizado = query.replace(/^0+/, '') || '0';
    resultados = resultados.filter(p => 
      p.nombre.toLowerCase().includes(query) ||
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(query)) ||
      ((p.codigo_barras || '').replace(/^0+/, '') || '0') === queryNormalizado
    );
    
    resultados.sort((a, b) => {
      const aExact = (a.codigo_barras || '').toLowerCase() === query || ((a.codigo_barras || '').replace(/^0+/, '') || '0') === queryNormalizado;
      const bExact = (b.codigo_barras || '').toLowerCase() === query || ((b.codigo_barras || '').replace(/^0+/, '') || '0') === queryNormalizado;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.nombre.localeCompare(b.nombre);
    });
  } else {
    resultados.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  
  return resultados;
});

const sugerenciasPorNombre = computed(() => {
  const query = terminoBusqueda.value.trim().toLowerCase();
  if (!query) return [];
  
  const queryNormalizado = query.replace(/^0+/, '') || '0';
  
  return productos.value.filter(p => 
    !esCategoriaGaming(p.idCategoria) && (
      p.nombre.toLowerCase().includes(query) ||
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(query)) ||
      ((p.codigo_barras || '').replace(/^0+/, '') || '0') === queryNormalizado
    )
  ).sort((a, b) => {
    const aExact = (a.codigo_barras || '').toLowerCase() === query || ((a.codigo_barras || '').replace(/^0+/, '') || '0') === queryNormalizado;
    const bExact = (b.codigo_barras || '').toLowerCase() === query || ((b.codigo_barras || '').replace(/^0+/, '') || '0') === queryNormalizado;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return 0;
  }).slice(0, 20);
});

const productosAccesoRapido = computed(() => {
  return productos.value.filter(p => {
    if (esCategoriaGaming(p.idCategoria)) return false;
    const stock = p.dto?.stock;
    if (stock !== undefined && stock !== null && stock <= 0) return false;
    if (!p.codigo_barras) return false;
    const codigoLimpio = p.codigo_barras.replace(/^0+/, '') || '0';
    return codigoLimpio.length >= 1 && codigoLimpio.length <= 2;
  }).sort((a, b) => {
    const aLimpio = (a.codigo_barras || '').replace(/^0+/, '') || '0';
    const bLimpio = (b.codigo_barras || '').replace(/^0+/, '') || '0';
    return Number(aLimpio) - Number(bLimpio);
  });
});

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

async function cargarProvisionSemanal() {
  try {
    const res = await getJson<ApiRespuesta<any>>('/pedidos-proveedor/provision-semanal');
    if (res?.datos) {
      provisionSemanalTotal.value = res.datos.reduce((sum: number, d: any) => sum + (d.montoRequerido || 0), 0);
      const cajaActual = Number(localStorage.getItem('saldoCaja') || 0);
      const transferencias = Number(localStorage.getItem('saldoTransferencias') || 0);
      if (cajaActual >= provisionSemanalTotal.value) {
        provisionSemanalStatus.value = 'ok';
      } else if (cajaActual + transferencias >= provisionSemanalTotal.value) {
        provisionSemanalStatus.value = 'warning';
      } else {
        provisionSemanalStatus.value = 'danger';
      }
    }
  } catch (e) {
    console.error('Error al cargar provision semanal:', e);
  }
}

onMounted(async () => {
  await cargarProductos();
  await cargarCategorias();
  await cargarTicketsDesdeBackend();
  await cargarSiguienteTicket();
  await cargarPromocionesActivas();
  await cargarProvisionSemanal();
  document.addEventListener('click', handleClickOutsideDropdown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutsideDropdown);
});

function handleClickOutsideDropdown(e: MouseEvent) {
  if (searchWrapperRef.value && !searchWrapperRef.value.contains(e.target as Node)) {
    showProductoDropdownPedido.value = false;
  }
}

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
        is_gramaje: item.is_gramaje,
        idCategoria: item.idCategoria,
        requiere_envase: item.requiere_envase,
        precio_envase: item.precio_envase
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

function toggleEnvase(item: TicketItem) {
  if (!item.requiere_envase || !item.precio_envase) {
    mostrarMensaje(`El producto "${item.nombre}" no requiere envase.`, 'error');
    return;
  }
  (item as any).envase_aplicado = !(item as any).envase_aplicado;
  if ((item as any).envase_aplicado && !(item as any).cantidad_envase) {
    (item as any).cantidad_envase = item.cantidad;
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

async function cargarCategorias() {
  try {
    const data = await getJson<ApiRespuesta<{ idCategoria: number; nombre: string }[]>>(`/categorias/listarCategorias`);
    categorias.value = Array.isArray(data?.datos) ? data.datos : [];
  } catch (_error) {
    categorias.value = [];
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
    items.push({ ...producto, cantidad: 1, requiere_envase: producto.requiere_envase, precio_envase: producto.precio_envase, envase_aplicado: false, cantidad_envase: 1 });
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

function obtenerIniciales(nombre?: string): string {
  if (!nombre || nombre === 'Cajero') return 'C';
  const partes = nombre.trim().split(/\s+/);
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  return partes[0][0].toUpperCase();
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
    tipoPrecioAplicado: item.is_gramaje ? 'VENTA_GRAMAJE' : 'VENTA',
    cobroEnvase: item.envase_aplicado === true,
    cantidadEnvase: item.envase_aplicado === true ? (item.cantidad_envase || item.cantidad) : 0
  };
  console.log('crearDetalleVenta payload:', JSON.stringify(payload, null, 2));

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
    console.log('Completando venta:', { ventaId, montoCobrado, metodoPago });
    await completarVenta(ventaId, metodoPago, montoCobrado);
    
    window.dispatchEvent(new CustomEvent('venta-completada', { detail: { ventaId, montoTotal: montoCobrado } }));
    
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
    await cargarSiguienteTicket();
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

function confirmarCobroPendiente() {
  if (ticket.value.length === 0) {
    mostrarMensaje('No hay productos en el ticket.', 'error');
    return;
  }
  modalCobroAbierto.value = false;
  descripcionPendienteTexto.value = '';
  modalDescripcionPendiente.value = true;
}

function confirmarCobroCredito() {
  if (ticket.value.length === 0) {
    mostrarMensaje('No hay productos en el ticket.', 'error');
    return;
  }
  modalCobroAbierto.value = false;
  modalCreditosSeleccionar.value = true;
  modalCreditosAbierto.value = true;
}

function onPersonaCreditoSeleccionada(persona: any) {
  creditoPersonaSeleccionada.value = persona;
  modalCreditosSeleccionar.value = false;
  if (ventaPendienteSeleccionada.value) {
    procesarCobroPendienteCredito(persona);
  } else {
    procesarCobroCredito(persona);
  }
}

async function procesarCobroCredito(persona: any) {
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) {
    mostrarMensaje('No se encontro sesion de usuario.', 'error');
    return;
  }
  if (!ticketActual.value || ticketActual.value.items.length === 0) {
    mostrarMensaje('No hay productos en el ticket.', 'error');
    return;
  }
  try {
    const montoTotal = totalVenta.value;
    const ventaId = ticketActual.value.id;
    const numTicket = ticketActual.value.numero;

    const detallesParaGuardar: any[] = [];
    for (const item of ticketActual.value.items as (TicketItem | TicketItemPromocion)[]) {
      if ((item as any).is_promocion && (item as any).promocion) {
        const promo = (item as any).promocion;
        for (const detalle of promo.detalles) {
          const cantidad = Number(detalle.cantidad) || 0;
          const subtotalDetalle = Number(detalle.subtotal) || 0;
          const precioPromocionTotal = montoTotal;
          const subtotalOriginal = ticketActual.value.items.reduce((sum, i) => {
            if ((i as any).is_promocion) return sum + (i as any).promocion.detalles.reduce((s: number, d: any) => s + (Number(d.subtotal) || 0), 0);
            return sum + (i.precio * i.cantidad);
          }, 0);
          const proporcion = subtotalOriginal > 0 ? subtotalDetalle / subtotalOriginal : 0;
          const precioAjustado = Math.round(precioPromocionTotal * proporcion / cantidad * 100) / 100;
          detallesParaGuardar.push({
            id: detalle.id_producto, nombre: detalle.nombre_producto || '',
            dto: { idProducto: detalle.id_producto, nombre: '', precio_venta: Number(detalle.precio_unitario) || 0, codigoBarras: '' },
            cantidad, precio: precioAjustado, is_gramaje: cantidad < 1000
          });
        }
      } else {
        detallesParaGuardar.push(item);
      }
    }

    await Promise.all(detallesParaGuardar.map((item) => crearDetalleVenta(ventaId, item)));

    await getJson<ApiRespuesta<any>>(`/ventas/completarVenta/${ventaId}?montoTotal=${encodeURIComponent(montoTotal.toString())}&metodoPago=CREDITO`, { method: 'PUT' });

    await getJson<ApiRespuesta<any>>('/credito/venta?idUsuario=' + idUsuario, {
      method: 'POST',
      body: JSON.stringify({ idPersona: persona.idPersona, idVenta: ventaId, montoTotal, notas: '' })
    });

    window.dispatchEvent(new CustomEvent('venta-completada', { detail: { ventaId, montoTotal } }));

    tickets.value = tickets.value.filter(t => t.id !== ticketActual.value!.id);
    if (tickets.value.length === 0) {
      await crearNuevoTicket();
    } else {
      const pendiente = tickets.value.find(t => t.estado === 'pendiente');
      ticketActualId.value = pendiente ? pendiente.id : tickets.value[0].id;
    }

    mostrarMensaje(`Venta a crédito con ${persona.nombre}. Ticket #${numTicket}`, 'ok');
    playSound('cash');
    modalCreditosAbierto.value = false;
    await cargarTicketsDesdeBackend();
    await cargarSiguienteTicket();
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error inesperado.';
    mostrarMensaje(`No se pudo procesar: ${detalle}`, 'error');
  }
}

async function guardarVentaPendiente() {
  if (!descripcionPendienteTexto.value.trim()) {
    mostrarMensaje('Debes escribir una descripción del motivo.', 'error');
    return;
  }

  if (!ticketActual.value || ticketActual.value.items.length === 0) {
    mostrarMensaje('No hay productos en el ticket.', 'error');
    return;
  }

  try {
    const montoTotal = totalVenta.value;
    const ventaId = ticketActual.value.id;
    const numTicket = ticketActual.value.numero;

    await getJson<ApiRespuesta<any>>(`/ventas/actualizarVenta/${ventaId}`, {
      method: 'PUT',
      body: JSON.stringify({ montoTotal }),
    });

    for (const item of ticketActual.value.items as (TicketItem | TicketItemPromocion)[]) {
      if ((item as any).is_promocion && (item as any).promocion) {
        const promo = (item as any).promocion;
        for (const detalle of promo.detalles) {
          const cantidad = Number(detalle.cantidad) || 0;
          const subtotalDetalle = Number(detalle.subtotal) || 0;
          const precioUnitario = cantidad > 0 ? subtotalDetalle / cantidad : 0;
          await crearDetalleVenta(ventaId, {
            id: detalle.id_producto,
            nombre: detalle.nombre_producto || '',
            dto: { idProducto: detalle.id_producto, nombre: '', precio_venta: Number(detalle.precio_unitario) || 0, codigoBarras: '' },
            cantidad: cantidad,
            precio: precioUnitario,
            is_gramaje: cantidad < 1000,
          });
        }
      } else {
        await crearDetalleVenta(ventaId, item);
      }
    }

    await getJson<ApiRespuesta<any>>(`/ventas/marcarPendiente/${ventaId}?descripcion=${encodeURIComponent(descripcionPendienteTexto.value.trim())}`, {
      method: 'PUT',
    });

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

    modalDescripcionPendiente.value = false;
    descripcionPendienteTexto.value = '';
    mostrarMensaje(`Venta guardada como pendiente. Ticket #${numTicket}`, 'ok');
    await cargarVentasPendientes();
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error inesperado.';
    mostrarMensaje(`No se pudo guardar: ${detalle}`, 'error');
  }
}

async function cargarVentasPendientes() {
  try {
    const data = await getJson<ApiRespuesta<any[]>>('/ventas/buscarVentasEnProceso');
    ventasPendientes.value = data?.datos ?? [];
  } catch (_error) {
    ventasPendientes.value = [];
  }
}

function editarDescripcionPendiente(venta: any) {
  ventaPendienteSeleccionada.value = venta;
  descripcionPendienteTexto.value = venta.descripcionPendiente || '';
  modalVentasPendientesAbierto.value = false;
  modalDescripcionPendiente.value = true;
}

async function guardarEdicionDescripcion() {
  if (!ventaPendienteSeleccionada.value) return;
  try {
    await getJson<ApiRespuesta<any>>(`/ventas/marcarPendiente/${ventaPendienteSeleccionada.value.idVenta}?descripcion=${encodeURIComponent(descripcionPendienteTexto.value.trim())}`, {
      method: 'PUT',
    });
    modalDescripcionPendiente.value = false;
    descripcionPendienteTexto.value = '';
    const ventaEditada = ventaPendienteSeleccionada.value;
    ventaPendienteSeleccionada.value = null;
    await cargarVentasPendientes();
    modalVentasPendientesAbierto.value = true;
    mostrarMensaje('Descripción actualizada.', 'ok');
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error inesperado.';
    mostrarMensaje(`No se pudo actualizar: ${detalle}`, 'error');
  }
}

function abrirModalPendientes() {
  modalVentasPendientesAbierto.value = true;
  cargarVentasPendientes();
}

function cobrarVentaPendiente(venta: any) {
  ventaPendienteSeleccionada.value = venta;
  modalVentasPendientesAbierto.value = false;
  modalCobroPendienteAbierto.value = true;
}

function agregarAVentaPendiente(venta: any) {
  ventaPendienteSeleccionada.value = venta;
  agregarPendienteBusqueda.value = '';
  agregarPendienteProductos.value = [];
  agregarPendienteScannerActivo.value = false;
  modalVentasPendientesAbierto.value = false;
  modalAgregarPendienteAbierto.value = true;
  nextTick(() => {
    agregarPendienteInput.value?.focus();
  });
}

async function eliminarVentaPendiente(venta: any) {
  if (!confirm(`¿Eliminar el ticket #${venta.numeroTicket}?`)) return;
  try {
    const response = await getJson<ApiRespuesta<unknown>>(`/ventas/cancelarVenta/${venta.idVenta}`, {
      method: 'PUT'
    });
    if (response?.codigo === 200) {
      await cargarVentasPendientes();
      mostrarMensaje('Venta pendiente eliminada', 'ok');
    } else {
      mostrarMensaje(response?.mensaje || 'Error al eliminar', 'error');
    }
  } catch (e: any) {
    mostrarMensaje('Error de red: ' + e.message, 'error');
  }
}

function agregarProductoAPendiente(prod: any) {
  agregarPendienteProductos.value.push({
    idProducto: prod.idProducto || prod.id,
    productoNombre: prod.nombre,
    cantidad: 1,
    precioUnitarioVenta: prod.precio_venta || prod.precio,
    isGramaje: prod.is_gramaje || false,
    codigoBarras: prod.codigo_barras || '',
    tipoPrecioAplicado: 'NORMAL'
  });
  agregarPendienteBusqueda.value = '';
}

function quitarProductoPendiente(idx: number) {
  agregarPendienteProductos.value.splice(idx, 1);
}

async function confirmarAgregarPendiente() {
  if (!ventaPendienteSeleccionada.value || agregarPendienteProductos.value.length === 0) return;
  try {
    const response = await getJson<ApiRespuesta<any>>(`/ventas/agregarProductosAPendiente/${ventaPendienteSeleccionada.value.idVenta}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agregarPendienteProductos.value)
    });
    if (response.codigo === 200) {
      modalAgregarPendienteAbierto.value = false;
      agregarPendienteProductos.value = [];
      await cargarVentasPendientes();
      mostrarMensaje('Productos agregados a la venta pendiente.', 'ok');
    } else {
      mostrarMensaje(response.mensaje || 'Error al agregar productos', 'error');
    }
  } catch (e: any) {
    mostrarMensaje('Error de red: ' + e.message, 'error');
  }
}

function startScannerPendiente() {
  if (agregarPendienteScannerActivo.value) {
    stopScannerPendiente();
    return;
  }
  agregarPendienteScannerActivo.value = true;
  setTimeout(() => {
    const targetElement = document.querySelector('#scanner-interactive-pendiente');
    if (!targetElement || typeof (window as any).Quagga === 'undefined') return;
    (window as any).Quagga.init(
      {
        inputStream: { name: 'Live', type: 'LiveStream', target: targetElement, constraints: { facingMode: 'environment' } },
        decoder: { readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'upc_reader'] },
        locate: true,
      },
      (err: any) => {
        if (err) { agregarPendienteScannerActivo.value = false; return; }
        (window as any).Quagga.start();
      }
    );
    (window as any).Quagga.onDetected((data: any) => {
      const code = data.codeResult.code;
      const prod = productos.value.find(p => p.codigo_barras === code || p.idProducto?.toString() === code);
      if (prod) {
        agregarProductoAPendiente(prod);
      }
    });
  }, 200);
}

function stopScannerPendiente() {
  if (typeof (window as any).Quagga !== 'undefined') {
    (window as any).Quagga.stop();
    (window as any).Quagga.offDetected(() => {});
  }
  agregarPendienteScannerActivo.value = false;
}

async function confirmarCobroPendienteEfectivo(payload: { montoRecibido: number }) {
  if (payload.montoRecibido < Number(ventaPendienteSeleccionada.value.montoTotal)) {
    mostrarMensaje('El monto recibido es menor al total.', 'error');
    return;
  }
  await procesarCobroPendiente('EFECTIVO');
}

async function confirmarCobroPendienteTransferencia() {
  await procesarCobroPendiente('TRANSFERENCIA');
}

async function confirmarCobroPendienteTarjeta() {
  await procesarCobroPendiente('TARJETA');
}

function confirmarCobroPendienteCredito() {
  if (!ventaPendienteSeleccionada.value) return;
  modalCobroPendienteAbierto.value = false;
  modalCreditosSeleccionar.value = true;
  modalCreditosAbierto.value = true;
}

async function procesarCobroPendienteCredito(persona: any) {
  const venta = ventaPendienteSeleccionada.value;
  if (!venta) return;
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) return;
  try {
    const res1 = await getJson<ApiRespuesta<any>>(
      `/ventas/cobrarVentaPendiente/${venta.idVenta}?idUsuario=${idUsuario}&metodoPago=CREDITO&montoTotal=${Number(venta.montoTotal)}`,
      { method: 'PUT' }
    );
    if (res1.codigo !== 200) { throw new Error(res1.mensaje || 'Error al cobrar venta pendiente'); }

    const res2 = await getJson<ApiRespuesta<any>>('/credito/venta?idUsuario=' + idUsuario, {
      method: 'POST',
      body: JSON.stringify({ idPersona: persona.idPersona, idVenta: venta.idVenta, montoTotal: Number(venta.montoTotal), notas: '' })
    });
    if (res2.codigo !== 200) { throw new Error(res2.mensaje || 'Error al registrar crédito'); }

    const nuevoTicket = res1?.datos?.numeroTicket || venta.numeroTicket;
    mostrarMensaje(`Venta a crédito con ${persona.nombre}. Ticket #${nuevoTicket}`, 'ok');
    playSound('cash');
    modalCobroPendienteAbierto.value = false;
    ventaPendienteSeleccionada.value = null;
    modalCreditosAbierto.value = false;
    await cargarVentasPendientes();
    await cargarCreditosResumen();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al procesar crédito.';
    mostrarMensaje(msg, 'error');
  }
}

async function procesarCobroPendiente(metodoPago: string) {
  if (!ventaPendienteSeleccionada.value) return;
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) {
    mostrarMensaje('No se encontro sesion de usuario.', 'error');
    return;
  }
  try {
    const venta = ventaPendienteSeleccionada.value;
    const res = await getJson<ApiRespuesta<any>>(
      `/ventas/cobrarVentaPendiente/${venta.idVenta}?idUsuario=${idUsuario}&metodoPago=${metodoPago}&montoTotal=${Number(venta.montoTotal)}`,
      { method: 'PUT' }
    );
    const nuevoTicket = res?.datos?.numeroTicket || venta.numeroTicket;
    mostrarMensaje(`Venta cobrada. Ticket #${nuevoTicket} - ${formatoMoneda(Number(venta.montoTotal))} con ${metodoPago}.`, 'ok');
    playSound('cash');
    modalCobroPendienteAbierto.value = false;
    ventaPendienteSeleccionada.value = null;
    await cargarVentasPendientes();
    await cargarTicketsDesdeBackend();
    await cargarSiguienteTicket();
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error inesperado.';
    mostrarMensaje(`No se pudo cobrar: ${detalle}`, 'error');
  }
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
      `/ventas/historialDia/${fechaHoy}`
    );

    const ventas = Array.isArray(data?.datos?.ventas) ? data.datos.ventas : [];
    historialVentas.value = ventas
      .filter(v => !v.metodoPago?.startsWith('ABONO/'))
      .sort((a, b) => {
          const dateA = a.fechaVenta ? new Date(a.fechaVenta).getTime() : 0;
          const dateB = b.fechaVenta ? new Date(b.fechaVenta).getTime() : 0;
          return dateB - dateA;
      });
    historialCobroTotal.value = historialVentas.value.reduce((s, v) => s + Number(v.montoTotal || 0), 0);
    historialGananciaTotal.value = historialVentas.value.reduce((s, v) => s + Number((v as any).ganancia || 0), 0);
    
    const usuariosMap = new Map<number, string>();
    for (const v of historialVentas.value) {
      if (v.idUsuario && v.nombreUsuario && !usuariosMap.has(v.idUsuario)) {
        usuariosMap.set(v.idUsuario, v.nombreUsuario);
      }
    }
    historialUsuariosUnicos.value = Array.from(usuariosMap.entries()).map(([id, nombre]) => ({ idUsuario: id, nombre }));
  } catch (_error) {
    historialCobroTotal.value = 0;
    historialGananciaTotal.value = 0;
    historialVentas.value = [];
    mostrarMensaje('No se pudo cargar el historial de ventas.', 'error');
  } finally {
    historialCargando.value = false;
  }
}

function calcularDiscrepancia(_detalles: VentaDetalleDTO[], _montoTotal: number): number {
  return 0;
}

function verificarDiscrepancia(_detalles: VentaDetalleDTO[], _montoTotal: number): boolean {
  return false;
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
  detalleCreditoInfo.value = null;
  detalleAbonos.value = [];
  
  try {
    const data = await getJson<ApiRespuesta<VentaDetalleDTO[]>>(
      `/ventasDetalle/porVenta/${venta.idVenta}`
    );
    const detalles = Array.isArray(data?.datos) ? data.datos : [];
    historialVentaDetalle.value = detalles;
    
    const tieneDiscrepancia = Boolean((venta as any).tieneDiscrepancia ?? false);
    historialVentaTieneDiscrepancia.value = tieneDiscrepancia;
    
    if (!tieneDiscrepancia) {
      historialDiscrepanciaMonto.value = 0;
    }
    
    const metodoPago = (venta as any).metodoPago || '';
    if (metodoPago.startsWith('ABONO/')) {
      const desc = (venta as any).descripcionPendiente || '';
      const match = desc.match(/Crédito #(\d+)/);
      if (match) {
        const idCreditoVenta = parseInt(match[1]);
        try {
          const resCredito = await fetch(`${API_BASE}/credito/venta`, {
            headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('jwt') ? { 'Authorization': `Bearer ${localStorage.getItem('jwt')}` } : {}) }
          });
          const creditosData = await resCredito.json();
          if (creditosData.codigo === 200) {
            const creditoEncontrado = creditosData.datos.find((cv: any) => cv.idCreditoVenta === idCreditoVenta);
            if (creditoEncontrado) {
              detalleCreditoInfo.value = creditoEncontrado;
            }
          }
          const resAbonos = await getJson<{ codigo: number; datos: any[] }>(`/credito/abono/${idCreditoVenta}`);
          if (resAbonos.codigo === 200) {
            detalleAbonos.value = resAbonos.datos || [];
          }
        } catch (e) {
          console.error('Error al cargar info del crédito:', e);
        }
      }
    }
    
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
  historialVentaTieneDiscrepancia.value = false;
  historialDiscrepanciaMonto.value = 0;
  detalleCreditoInfo.value = null;
  detalleAbonos.value = [];
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
    const precioTotal = Math.round(payload.precioTotal * 100) / 100;
    
    historialVentaDetalle.value[index].cantidad = gramos;
    historialVentaDetalle.value[index].precioUnitarioVenta = precioTotal;
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
  const precioTotal = Math.round(payload.precioTotal * 100) / 100;
  const items = ticketActual.value!.items;

  if (gramajeItemEditando.value) {
    const existente = gramajeItemEditando.value;
    existente.cantidad = gramos;
    existente.precio = precioTotal;
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
    existente.precio = precioTotal;
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
      precio: precioTotal
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
  if (g >= 1000) {
    return (g / 1000).toFixed(2) + ' kg';
  }
  return g + ' g';
}

async function cargarProveedoresPedidos() {
  try {
    const resProv = await fetch(`${API_BASE}/proveedores/listar`);
    const dataProv = await resProv.json();
    proveedores.value = dataProv.datos ?? dataProv;
  } catch (e) { console.error('Error proveedores:', e); }
  try {
    const resPed = await fetch(`${API_BASE}/pedidos-proveedor/listar`);
    const dataPed = await resPed.json();
    pedidosProveedor.value = (dataPed.datos ?? dataPed).filter((p: any) => p.estatus === 'PENDIENTE');
  } catch (e) { console.error('Error pedidos:', e); }
  try {
    const resProd = await fetch(`${API_BASE}/productos/listarProductos`);
    const dataProd = await resProd.json();
    productosDisponibles.value = (dataProd.datos ?? dataProd).map((p: any) => ({
      idProducto: p.idProducto,
      nombre: p.nombre,
      precio_costo: p.precio_costo || 0,
      codigoBarras: p.codigoBarras
    }));
  } catch (e) { console.error('Error productos:', e); }
}

function abrirModalProveedoresPedidos() {
  modalProveedoresPedidos.value = true;
  cargarProveedoresPedidos();
}

async function cargarSugerenciasPedido() {
  sugerenciasCargando.value = true;
  try {
    const res = await fetch(`${API_BASE}/pedidos-proveedor/sugerido?periodo=${sugerenciasPeriodo.value}`);
    const data = await res.json();
    if (data.codigo === 200 && data.datos) {
      sugerenciasPedido.value = data.datos;
      sugerenciasSeleccionadas.value = new Set(data.datos.map((s: any) => s.idProducto));
    } else {
      sugerenciasPedido.value = [];
    }
  } catch (e) {
    console.error('Error cargando sugerencias:', e);
    sugerenciasPedido.value = [];
  } finally {
    sugerenciasCargando.value = false;
  }
}

function toggleSugerencia(id: number) {
  if (sugerenciasSeleccionadas.value.has(id)) {
    sugerenciasSeleccionadas.value.delete(id);
  } else {
    sugerenciasSeleccionadas.value.add(id);
  }
  sugerenciasSeleccionadas.value = new Set(sugerenciasSeleccionadas.value);
}

function seleccionarTodasSugerencias() {
  sugerenciasSeleccionadas.value = new Set(sugerenciasPedido.value.map((s: any) => s.idProducto));
}

function deseleccionarTodasSugerencias() {
  sugerenciasSeleccionadas.value = new Set();
}

async function crearPedidoDesdeSugerencias() {
  const seleccionados = sugerenciasPedido.value.filter((s: any) => sugerenciasSeleccionadas.value.has(s.idProducto));
  if (seleccionados.length === 0) return;

  const idProveedor = prompt('ID del proveedor para este pedido:');
  if (!idProveedor) return;

  const fechaEntrega = prompt('Fecha de entrega esperada (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
  if (!fechaEntrega) return;

  const detalles = seleccionados.map((s: any) => ({
    idProducto: s.idProducto,
    cantidad: s.cantidadSugerida,
    precioUnitario: s.precioCosto,
    subtotal: s.precioCosto * s.cantidadSugerida
  }));

  const montoTotal = detalles.reduce((sum: number, d: any) => sum + d.subtotal, 0);

  try {
    await fetch(`${API_BASE}/pedidos-proveedor/crear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idProveedor: parseInt(idProveedor),
        fechaEntregaEsperada: fechaEntrega,
        montoTotal,
        montoApartado: 0,
        estatus: 'PENDIENTE',
        notas: 'Pedido generado desde sugerencias',
        detalles
      })
    });
    alert('Pedido creado exitosamente');
    await cargarProveedoresPedidos();
    pedidoProveedorTab.value = 'pedidos';
  } catch (e) {
    console.error('Error creando pedido:', e);
    alert('Error al crear el pedido');
  }
}

function openProveedorModal(p?: any) {
  if (p) {
    editingProveedor.value = p;
    proveedorForm.value = { ...p };
  } else {
    editingProveedor.value = null;
    proveedorForm.value = { nombre: '', contacto: '', telefono: '', email: '', direccion: '', notas: '' };
  }
  showProveedorForm.value = true;
}

async function saveProveedor() {
  if (!proveedorForm.value.nombre.trim()) return;
  try {
    if (editingProveedor.value?.idProveedor) {
      await fetch(`${API_BASE}/proveedores/actualizar/${editingProveedor.value.idProveedor}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proveedorForm.value) });
    } else {
      await fetch(`${API_BASE}/proveedores/agregar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proveedorForm.value) });
    }
    showProveedorForm.value = false;
    await cargarProveedoresPedidos();
  } catch (e) { console.error('Error saving proveedor:', e); }
}

async function deleteProveedor(id: number) {
  if (!confirm('¿Eliminar este proveedor?')) return;
  try {
    await fetch(`${API_BASE}/proveedores/eliminar/${id}`, { method: 'DELETE' });
    await cargarProveedoresPedidos();
  } catch (e) { console.error('Error deleting proveedor:', e); }
}

function openPedidoModal(p?: any) {
  if (p) {
    editingPedido.value = p;
    pedidoForm.value = { ...p, detalles: p.detalles || [] };
    montoManual.value = p.detalles?.length === 0 && p.montoTotal > 0;
  } else {
    editingPedido.value = null;
    pedidoForm.value = { idProveedor: 0, fechaEntregaEsperada: '', montoTotal: 0, montoApartado: 0, estatus: 'PENDIENTE', notas: '', detalles: [] };
    montoManual.value = false;
  }
  searchProductoPedido.value = '';
  newDetallePedido.value = { idProducto: 0, nombre: '', cantidad: 1, precioUnitario: 0 };
  showPedidoForm.value = true;
}

function addDetallePedido() {
  if (!newDetallePedido.value.idProducto || !newDetallePedido.value.cantidad || !newDetallePedido.value.precioUnitario) return;
  pedidoForm.value.detalles.push({
    idProducto: newDetallePedido.value.idProducto,
    nombreProducto: newDetallePedido.value.nombre,
    cantidad: newDetallePedido.value.cantidad,
    precioUnitario: newDetallePedido.value.precioUnitario,
    subtotal: newDetallePedido.value.cantidad * newDetallePedido.value.precioUnitario
  });
  recalcTotalPedido();
  newDetallePedido.value = { idProducto: 0, nombre: '', cantidad: 1, precioUnitario: 0 };
  searchProductoPedido.value = '';
  showProductoDropdownPedido.value = false;
}

function removeDetallePedido(idx: number) {
  pedidoForm.value.detalles.splice(idx, 1);
  recalcTotalPedido();
}

function recalcTotalPedido() {
  if (!montoManual.value) {
    pedidoForm.value.montoTotal = pedidoForm.value.detalles.reduce((sum: number, d: any) => sum + d.subtotal, 0);
  }
}

function selectProductoForPedido(prod: { idProducto: number; nombre: string; precio_costo: number }) {
  newDetallePedido.value.idProducto = prod.idProducto;
  newDetallePedido.value.nombre = prod.nombre;
  newDetallePedido.value.precioUnitario = prod.precio_costo;
  searchProductoPedido.value = prod.nombre;
  showProductoDropdownPedido.value = false;
}

const filteredProductosPedido = computed(() => {
  if (!searchProductoPedido.value) return productosDisponibles.value;
  const q = searchProductoPedido.value.toLowerCase();
  return productosDisponibles.value.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    p.codigoBarras?.toLowerCase().includes(q)
  ).slice(0, 10);
});

async function savePedido() {
  if (!pedidoForm.value.idProveedor || !pedidoForm.value.fechaEntregaEsperada) return;
  if (montoManual.value && (!pedidoForm.value.montoTotal || pedidoForm.value.montoTotal <= 0)) return;
  try {
    if (editingPedido.value?.idPedido) {
      await fetch(`${API_BASE}/pedidos-proveedor/actualizar/${editingPedido.value.idPedido}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedidoForm.value) });
    } else {
      await fetch(`${API_BASE}/pedidos-proveedor/crear`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedidoForm.value) });
    }
    showPedidoForm.value = false;
    await cargarProveedoresPedidos();
  } catch (e) { console.error('Error saving pedido:', e); }
}

async function recibirPedido(id: number) {
  if (!confirm('¿Confirmar recepción?')) return;
  try {
    await fetch(`${API_BASE}/pedidos-proveedor/recibir/${id}`, { method: 'PUT' });
    await cargarProveedoresPedidos();
  } catch (e) { console.error('Error receiving pedido:', e); }
}

async function deletePedido(id: number) {
  if (!confirm('¿Cancelar este pedido?')) return;
  try {
    await fetch(`${API_BASE}/pedidos-proveedor/eliminar/${id}`, { method: 'DELETE' });
    await cargarProveedoresPedidos();
  } catch (e) { console.error('Error deleting pedido:', e); }
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
          let precioTotal = 0;
          let esGramaje = isGramaje;
          
          if (comando.tipo === 'PESO') {
            if (producto.is_gramaje) {
              const precioPorKilo = Number(producto.precio_venta) || 0;
              precioTotal = Math.round(((cantidad / 1000) * precioPorKilo) * 100) / 100;
            } else {
              precioTotal = Number(producto.precio_venta);
            }
          } else if (comando.tipo === 'PRECIO') {
            const valorPesos = Number(comando.valor) || 0;
            const precioVentaNum = Number(producto.precio_venta) || 0;
            if (producto.is_gramaje && precioVentaNum > 0) {
              cantidad = Math.floor((valorPesos / precioVentaNum) * 1000);
              cantidad = cantidad > 0 ? cantidad : 1;
              precioTotal = Math.round(valorPesos * 100) / 100;
            } else {
              cantidad = 1;
              precioTotal = valorPesos;
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
            existente.precio += precioTotal;
            if (existente.idVentaDetalle && ticketActual.value) {
              try {
                await crearDetalleVenta(ticketActual.value.id, existente);
              } catch (e) {
                existente.cantidad -= cantidad;
                existente.precio -= precioTotal;
              }
            }
          } else {
            items.push({
              id: producto.idProducto || producto.id,
              nombre: producto.nombre,
              cantidad: cantidad,
              precio: precioTotal,
              is_gramaje: esGramaje || comando.tipo === 'PRECIO',
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

function calcularSubtotal(d: VentaDetalleDTO): number {
  const precio = Number(d.precioUnitarioVenta || 0);
  const cantidad = Number(d.cantidad || 0);
  const cobroEnvaseTotal = Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0);
  if (d.tipoPrecioAplicado === 'VENTA_GRAMAJE') {
    return precio + cobroEnvaseTotal;
  }
  return Math.round((precio * cantidad) + cobroEnvaseTotal);
}

function calcularSubtotalVenta(): number {
  return historialVentaDetalle.value.reduce((sum, d) => sum + calcularSubtotal(d), 0);
}

function calcularNuevoTotal(): number {
  const total = historialVentaDetalle.value.reduce((sum, d) => {
    return sum + calcularSubtotal(d);
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
      precio: prod.precio_venta || 0,
      codigo_barras: prod.codigoBarras || ''
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
    
    window.dispatchEvent(new CustomEvent('venta-completada', { detail: { ventaId: historialVentaSeleccionada.value.idVenta, montoTotal: montoTotalEditado.value } }));
    
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
  busquedaEditar.value = '';
  resultadosEditar.value = [];
}

async function buscarProductoEditar() {
  const termino = busquedaEditar.value.trim();
  if (!termino) {
    resultadosEditar.value = [];
    return;
  }
  cargandoBusquedaEditar.value = true;
  try {
    const producto = await buscarProductoPorCodigoBarras(termino);
    if (producto) {
      resultadosEditar.value = [producto];
    } else {
      const resultado = await buscarProducto(termino);
      resultadosEditar.value = resultado ? [resultado] : [];
    }
  } catch (e) {
    resultadosEditar.value = [];
  } finally {
    cargandoBusquedaEditar.value = false;
  }
}

async function agregarProductoADetalle(producto: Producto) {
  if (!historialVentaSeleccionada.value) return;
  
  try {
    const precioUnitario = producto.precio_venta || 0;
    const resp = await getJson<ApiRespuesta<unknown>>(
      '/ventasDetalle/crearVentaDetalle',
      {
        method: 'POST',
        body: JSON.stringify({
          Venta: { idVenta: historialVentaSeleccionada.value.idVenta },
          Producto: { idProducto: producto.idProducto },
          cantidad: 1,
          precioUnitarioVenta: precioUnitario,
          tipoPrecioAplicado: producto.is_gramaje ? 'VENTA_GRAMAJE' : 'VENTA'
        })
      }
    );
    
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
  } catch (error) {
    mostrarMensaje('Error al agregar producto', 'error');
  }
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
        <button type="button" class="btn-add-ticket" :disabled="creandoTicket" @click="crearNuevoTicket" title="Nuevo Ticket">
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
              {{ formatoMoneda(t.items.reduce((sum, i) => sum + ((i as any).is_gramaje ? i.precio : i.precio * i.cantidad), 0)) }}
            </span>
            <span class="ticket-status" v-else>vacío</span>
            <span class="ticket-initials">{{ obtenerIniciales(t.nombreUsuario) }}</span>
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

      <div class="sidebar-actions">
        <button class="btn-creditos-sidebar" @click="abrirCreditos" title="Créditos">
          <span class="creditos-badge" v-if="totalPersonasCredito > 0">{{ totalPersonasCredito }}</span>
          💳
        </button>
        <button class="btn-pendientes-ticket" @click="abrirModalPendientes" title="Ventas Pendientes">
          <span class="pending-badge" v-if="ventasPendientes.length > 0">{{ ventasPendientes.length }}</span>
          P
        </button>
      </div>
    </aside>

    <!-- PANEL CENTRAL: BUSCADOR Y CATÁLOGO -->
    <section class="pos-center catalog-section">
      
      <!-- BARRA DE TICKETS HORIZONTAL (para tablets y móviles) -->
      <div class="tickets-bar-mobile">
        <div class="tickets-bar-scroll custom-scrollbar">
          <button 
            type="button" 
            class="btn-add-ticket-mini" 
            :disabled="creandoTicket"
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
            <span class="chip-user">{{ obtenerIniciales(t.nombreUsuario) }}</span>
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
            <select 
              v-model="categoriaFiltro" 
              class="category-filter-select"
            >
              <option :value="null">Todas</option>
              <option v-for="cat in categorias" :key="cat.idCategoria" :value="cat.idCategoria">
                {{ cat.nombre }}
              </option>
            </select>
            <div class="action-tools">
              <button class="tool-btn btn-promo" @click="modalPromocionesAbierto = true" title="Gestionar Promociones">⚔</button>
              <button class="tool-btn btn-scan" @click="startScanner" title="Escanear">📷</button>
              <button class="tool-btn btn-mic" :class="{ 'is-recording': isRecording }" @mousedown.prevent="startVoiceCommand">🎤</button>
            </div>
          </div>
        </div>
        <div v-if="provisionSemanalTotal > 0" class="provision-total-badge" :class="provisionStatusClass">
          <span class="provision-label">Total por apartar (7 días)</span>
          <span class="provision-amount">{{ formatoMoneda(provisionSemanalTotal) }}</span>
        </div>
      </header>

        <!-- ÁREA DE PRODUCTOS RÁPIDOS / RESULTADOS -->
      <div class="catalog-grid custom-scrollbar">
        <div class="catalog-items-container">
          <div class="carousel-wrapper" v-if="promocionesActivas.length > 0 && !terminoBusqueda && categoriaFiltro === null">
            <CarruselPromociones
              :promociones="promocionesActivas"
              @agregar="agregarPromocionAlTicket"
            />
          </div>
          
          <!-- Productos de Acceso Rápido (códigos 1-2 dígitos) -->
          <div v-if="productosAccesoRapido.length > 0 && !terminoBusqueda && categoriaFiltro === null" class="acceso-rapido-section">
            <h3 class="acceso-rapido-title">
              <span class="title-icon">⚡</span>
              <span class="title-text">Productos de Acceso Rápido</span>
            </h3>
            <div class="acceso-rapido-grid">
              <button 
                v-for="p in productosAccesoRapido" 
                :key="p.id"
                class="acceso-rapido-btn clickable animate-pop-in"
                @click="agregarProductoATicket(p)"
                :title="`${p.nombre} - Código: ${p.codigo_barras}`"
              >
                <span class="acceso-code">{{ p.codigo_barras }}</span>
                <span class="acceso-name">{{ p.nombre }}</span>
                <span class="acceso-price">{{ formatoMoneda(p.precio) }}</span>
              </button>
            </div>
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
              <div class="stock-badge" :class="esCategoriaGaming(p.dto?.idCategoria) ? 'rentable' : (p.dto?.stock ?? 0) > 5 ? 'in-stock' : 'low-stock'">
                <template v-if="esCategoriaGaming(p.dto?.idCategoria)">🎮 Rentable</template>
                <template v-else>Stock: {{ p.dto?.stock ?? '∞' }}</template>
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
                    <span class="item-name-inner">{{ item.nombre }}</span>
                  </h4>
                  <div class="item-meta" v-if="asAny(item).is_promocion">
                    <span class="promo-contents">{{ asAny(item).promocion.detalles.map((d: any) => `${d.cantidad >= 1000 ? (d.cantidad / 1000) + 'kg' : d.cantidad + 'pza'} ${d.nombre_producto}`).join(', ') }}</span>
                  </div>
                  <div class="item-meta" v-else>
                    <span class="unit-price" v-if="asAny(item).is_gramaje">{{ formatoMoneda(asAny(item).dto?.precio_venta || item.precio) }}/kg</span>
                    <span class="unit-price" v-else>{{ formatoMoneda(item.precio) }}</span>
                    <label v-if="asAny(item).precio_mayoreo && asAny(item).precio_mayoreo > 0" class="mayoreo-toggle">
                      <input type="checkbox" :checked="asAny(item).is_mayoreo" @change="toggleMayoreo(asAny(item))">
                      <span>Mayoreo</span>
                    </label>
                    <label v-if="asAny(item).requiere_envase && asAny(item).precio_envase" class="envase-toggle">
                      <input type="checkbox" :checked="asAny(item).envase_aplicado" @change="toggleEnvase(asAny(item))">
                      <span>Envase</span>
                    </label>
                    <input v-if="asAny(item).envase_aplicado" type="number" min="0" :max="item.cantidad" v-model.number="asAny(item).cantidad_envase" class="envase-qty-input" @change="playSound('add')" title="Cantidad de envases a cobrar">
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
                    {{ formatoMoneda(asAny(item).is_gramaje ? item.precio : item.precio * item.cantidad) }}
                  </div>
                </div>
              </div>
              <button class="btn-remove-item" @click="quitarItem(item.id)" title="Quitar item">×</button>
            </article>
          </TransitionGroup>

          <div v-if="ticket.length === 0" class="empty-ticket-msg">
            <p>No hay productos en esta cuenta</p>
          </div>

          <!-- Zelda sprites dentro del ticket -->
          <div class="zelda-sprites-overlay" aria-hidden="true">
            <div class="link-sprite">
              <div class="link-frame frame1"></div>
              <div class="link-frame frame2"></div>
            </div>

            <div class="octo-sprite">
              <div class="octo-frame frame1"></div>
              <div class="octo-frame frame2"></div>
            </div>
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
                <span class="shortcut-badge">F12</span>
              </button>
              
              <div class="extra-actions">
                <button class="btn-checkout secondary" @click="abrirModalProveedoresPedidos" title="Proveedores y Pedidos">🚚</button>
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
    
    <!-- Detalle de venta modal optimizado -->
    <div v-if="modalDetalleVentaAbierto" class="pos-modal-overlay" @click.self="cerrarDetalleVenta">
      <div class="pos-modal-card detalle-modal animate-pop-in">
        <header class="detalle-header">
          <div class="header-left">
            <span class="ticket-badge">#{{ historialVentaSeleccionada?.numeroTicket }}</span>
            <h3>Detalle de Venta</h3>
          </div>
          <div class="modal-actions">
            <button v-if="historialVentaTieneDiscrepancia" class="btn-discrepancia" :title="`Detalles suman ${formatoMonedaRedondeada(calcularSubtotalVenta())}, registrado: ${formatoMonedaRedondeada(Number(historialVentaSeleccionada?.montoTotal))}, diferencia: ${formatoMonedaRedondeada(Math.abs(historialDiscrepanciaMonto))}`">
              <span class="disc-icon">⚠</span>
              <span class="disc-text">{{ formatoMonedaRedondeada(Math.abs(historialDiscrepanciaMonto)) }}</span>
            </button>
            <button v-if="esAdmin && !modoEdicionDetalle" class="btn-edit" @click="iniciarEdicionDetalle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Editar
            </button>
            <template v-if="modoEdicionDetalle">
              <button class="btn-save" @click="guardarCambiosDetalle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Guardar
              </button>
              <button class="btn-cancel-edit" @click="cancelarEdicionDetalle">Cancelar</button>
            </template>
            <button class="btn-close" @click="cerrarDetalleVenta">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </header>
        
        <div class="detalle-body custom-scrollbar">
          <div class="detalle-summary">
            <div class="summary-row">
              <div class="summary-item">
                <span class="summary-label">Fecha</span>
                <span class="summary-value">{{ historialVentaSeleccionada?.fechaVenta?.slice(0, 10) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Hora</span>
                <span class="summary-value">{{ historialVentaSeleccionada?.fechaVenta?.slice(11, 16) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Cajero</span>
                <span class="summary-value">{{ historialVentaSeleccionada?.nombreUsuario || 'Cajero' }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Método</span>
                <span class="method-badge" :class="getMetodoClase(historialVentaSeleccionada?.metodoPago)">
                  {{ historialVentaSeleccionada?.metodoPago }}
                </span>
              </div>
            </div>
            
            <div class="total-section">
              <template v-if="!modoEdicionDetalle">
                <div class="total-amount">{{ formatoMoneda(Number(historialVentaSeleccionada?.montoTotal)) }}</div>
                <div v-if="historialVentaSeleccionada?.ganancia" class="profit-text">Ganancia: {{ formatoMonedaRedondeada(Number(historialVentaSeleccionada?.ganancia)) }}</div>
              </template>
              <template v-else>
                <div class="total-edit-row">
                  <span class="currency">$</span>
                  <input v-model.number="montoTotalInput" type="number" min="0" step="1" class="total-input" :class="{ 'manual-edited': totalManualEditado }" @input="onTotalManualChange" />
                  <span v-if="totalManualEditado" class="edit-dot" title="Total modificado manualmente">●</span>
                </div>
              </template>
            </div>
          </div>
          
          <div v-if="historialVentaTieneDiscrepancia" class="discrepancia-alert" :class="historialDiscrepanciaMonto > 0 ? 'alert-faltante' : 'alert-sobrante'">
            <div class="alert-icon">⚠</div>
            <div class="alert-content">
              <div class="alert-row">
                <span class="alert-label">Suma detalles:</span>
                <span class="alert-value">{{ formatoMonedaRedondeada(calcularSubtotalVenta()) }}</span>
              </div>
              <div class="alert-row">
                <span class="alert-label">Registrado:</span>
                <span class="alert-value">{{ formatoMonedaRedondeada(Number(historialVentaSeleccionada?.montoTotal)) }}</span>
              </div>
              <div class="alert-diff">
                {{ historialDiscrepanciaMonto > 0 ? 'Faltan' : 'Sobran' }} {{ formatoMonedaRedondeada(Math.abs(historialDiscrepanciaMonto)) }}
              </div>
            </div>
          </div>
          
          <div v-if="detalleCreditoInfo" class="credito-info-panel">
            <div class="credito-info-header">
              <span class="credito-icon">💰</span>
              <h4>Abono a Crédito</h4>
            </div>
            <div class="credito-info-grid">
              <div class="credito-field">
                <span class="field-label">Persona</span>
                <span class="field-value">{{ detalleCreditoInfo.nombrePersona }}</span>
              </div>
              <div class="credito-field">
                <span class="field-label">Teléfono</span>
                <span class="field-value">{{ detalleCreditoInfo.telefonoPersona || 'N/A' }}</span>
              </div>
              <div class="credito-field">
                <span class="field-label">Crédito creado</span>
                <span class="field-value">{{ formatearFecha(detalleCreditoInfo.fechaCreacion) }}</span>
              </div>
              <div class="credito-field">
                <span class="field-label">Monto total</span>
                <span class="field-value">{{ formatoMoneda(detalleCreditoInfo.montoTotal) }}</span>
              </div>
              <div class="credito-field">
                <span class="field-label">Monto pagado</span>
                <span class="field-value pagado">{{ formatoMoneda(detalleCreditoInfo.montoPagado) }}</span>
              </div>
              <div class="credito-field">
                <span class="field-label">Saldo pendiente</span>
                <span class="field-value saldo">{{ formatoMoneda(detalleCreditoInfo.saldoPendiente) }}</span>
              </div>
              <div class="credito-field">
                <span class="field-label">Estatus</span>
                <span class="field-value estatus" :class="detalleCreditoInfo.estatus.toLowerCase()">{{ detalleCreditoInfo.estatus }}</span>
              </div>
              <div v-if="detalleCreditoInfo.notas" class="credito-field full">
                <span class="field-label">Notas</span>
                <span class="field-value">{{ detalleCreditoInfo.notas }}</span>
              </div>
            </div>
            
            <div v-if="detalleAbonos.length > 0" class="abonos-historial">
              <h5>Historial de Abonos</h5>
              <div class="abono-item" v-for="abono in detalleAbonos" :key="abono.idAbono">
                <span class="abono-monto">{{ formatoMoneda(abono.monto) }}</span>
                <span class="abono-fecha">{{ formatearFechaHora(abono.fechaAbono) }}</span>
                <span class="abono-metodo" :class="abono.metodoPago?.toLowerCase()">{{ abono.metodoPago }}</span>
                <span class="abono-user">👤 {{ abono.nombreUsuario }}</span>
              </div>
            </div>
          </div>
          
          <div v-if="historialEnvases.length > 0" class="envase-section-detalle">
            <div class="envase-section-title">Envases</div>
            <div class="envase-list-detalle">
              <div v-for="d in historialEnvases" :key="`env-${d.idVentaDetalle}`" class="envase-row-detalle">
                <span class="envase-name">{{ (d.producto || d.Producto)?.nombre || 'Producto' }}</span>
                <span class="envase-qty">{{ (d as any).cantidadEnvase || d.cantidad }} env.</span>
                <span class="envase-price">{{ formatoMonedaRedondeada(Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0)) }}</span>
              </div>
            </div>
            <div class="envase-total-detalle">
              <span>Total Envases</span>
              <strong>{{ formatoMonedaRedondeada(historialEnvaseTotal) }}</strong>
            </div>
          </div>
          
          <div class="productos-section">
            <div class="productos-header">
              <span class="prod-title">Productos</span>
              <span class="prod-count">{{ historialVentaDetalle.length }}</span>
              <button v-if="esAdmin && modoEdicionDetalle && historialVentaDetalle.length > 0" class="btn-clear-all" @click="eliminarTodosLosDetalles" title="Eliminar todos">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Eliminar todo
              </button>
            </div>
            
            <div v-if="modoEdicionDetalle" class="agregar-producto-section">
              <div class="agregar-input-wrap">
                <svg class="agregar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input v-model="busquedaEditar" @input="buscarProductoEditar" type="text" class="agregar-input" placeholder="Buscar por código o nombre..." />
                <button v-if="busquedaEditar" class="agregar-clear" @click="busquedaEditar = ''; resultadosEditar = []">✕</button>
              </div>
              <div v-if="resultadosEditar.length > 0" class="agregar-resultados">
                <div v-for="p in resultadosEditar" :key="p.idProducto" class="agregar-resultado" @click="agregarProductoADetalle(p)">
                  <span class="agregar-prod-name">{{ p.nombre }}</span>
                  <span class="agregar-prod-info">
                    <span v-if="p.is_gramaje" class="agregar-badge-gramaje">Gramaje</span>
                    <span class="agregar-prod-price">{{ formatoMonedaRedondeada(p.precio_venta || 0) }}</span>
                  </span>
                </div>
              </div>
              <div v-if="busquedaEditar && !cargandoBusquedaEditar && resultadosEditar.length === 0" class="agregar-vacio">
                No se encontraron productos
              </div>
            </div>
            
            <div class="productos-list">
              <div v-for="(d, i) in historialVentaDetalle" :key="i" class="producto-item">
                <div class="prod-info">
                  <span class="prod-name" :title="(d.producto || d.Producto)?.nombre">{{ (d.producto || d.Producto)?.nombre }}</span>
                  <template v-if="detalleEditandoIndex === i">
                    <div class="edit-controls">
                      <label class="edit-label">Cantidad:</label>
                      <input v-model.number="cantidadTemporal" type="number" min="1" class="edit-qty" placeholder="Cant" />
                      <label class="edit-label">Precio:</label>
                      <input v-model.number="precioTemporal" type="number" step="0.01" min="0" class="edit-price" placeholder="$" />
                      <button class="btn-ok" @click="confirmarEdicionItem(i)" title="Guardar cambios">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span class="btn-label">Guardar</span>
                      </button>
                      <button class="btn-x" @click="cancelarEdicionItem" title="Cancelar edición">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        <span class="btn-label">Cancelar</span>
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <div class="prod-meta">
                      <span class="prod-qty" :class="{ editable: esAdmin && modoEdicionDetalle }" @click="esAdmin && modoEdicionDetalle ? iniciarEditarItem(i) : null">
                        {{ d.cantidad }} {{ (d.producto || d.Producto)?.is_gramaje ? 'g' : 'pza' }}
                      </span>
                      <span class="prod-subtotal">{{ formatoMonedaRedondeada(d.tipoPrecioAplicado === 'VENTA_GRAMAJE' ? Number(d.precioUnitarioVenta || 0) : Math.round((Number(d.precioUnitarioVenta || 0) * Number(d.cantidad || 0)) * 100) / 100) }}</span>
                    </div>
                    <div v-if="Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0) > 0" class="prod-envase-line">
                      <span class="envase-label">🧴 {{ (d as any).cantidadEnvase || d.cantidad }} env.</span>
                      <span class="envase-price-line">{{ formatoMonedaRedondeada(Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0)) }}</span>
                    </div>
                    <div v-if="esAdmin && modoEdicionDetalle" class="prod-actions">
                      <button class="btn-action btn-action-edit" @click="iniciarEditarItem(i)" title="Editar cantidad y precio">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        <span>Editar</span>
                      </button>
                      <button class="btn-action btn-action-delete" @click="eliminarDetalleVenta(i)" title="Eliminar producto de la venta">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </template>
                </div>
              </div>
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
    <CobroModal :open="modalCobroAbierto" :total="totalVenta" @close="modalCobroAbierto = false" @confirmar-efectivo="confirmarCobroEfectivo" @confirmar-transferencia="confirmarCobroTransferencia" @confirmar-tarjeta="confirmarCobroTarjeta" @confirmar-pendiente="confirmarCobroPendiente" @confirmar-credito="confirmarCobroCredito" />
    <CreditosPersonasModal :open="modalCreditosAbierto" :seleccionar="modalCreditosSeleccionar" @close="modalCreditosAbierto = false; modalCreditosSeleccionar = false" @persona-seleccionada="onPersonaCreditoSeleccionada" @credito-actualizado="cargarCreditosResumen" />
    <CobroModal :open="modalCobroPendienteAbierto" :total="Number(ventaPendienteSeleccionada?.montoTotal) || 0" @close="modalCobroPendienteAbierto = false; ventaPendienteSeleccionada = null" @confirmar-efectivo="confirmarCobroPendienteEfectivo" @confirmar-transferencia="confirmarCobroPendienteTransferencia" @confirmar-tarjeta="confirmarCobroPendienteTarjeta" @confirmar-credito="confirmarCobroPendienteCredito" />
    <CrudPromociones :open="modalPromocionesAbierto" @close="modalPromocionesAbierto = false; cargarPromocionesActivas()" @updated="cargarPromocionesActivas" />

    <!-- Modal descripción pendiente -->
    <div v-if="modalDescripcionPendiente" class="pos-modal-overlay" @click.self="modalDescripcionPendiente = false">
      <div class="pos-modal-card animate-pop-in">
        <div class="modal-corner tl"></div>
        <div class="modal-corner tr"></div>
        <div class="modal-corner bl"></div>
        <div class="modal-corner br"></div>
        
        <header class="modal-h">
          <h3>⏳ {{ ventaPendienteSeleccionada ? 'Editar Descripción' : 'Venta Pendiente' }}</h3>
          <button class="close-x" @click="modalDescripcionPendiente = false">×</button>
        </header>
        <div class="modal-b">
          <p class="pendiente-hint">{{ ventaPendienteSeleccionada ? 'Modifica la descripción de la venta pendiente:' : 'Escribe la razón por la que esta venta queda pendiente:' }}</p>
          <textarea 
            v-model="descripcionPendienteTexto" 
            class="pendiente-textarea" 
            placeholder="Ej: El cliente regresa en 30 minutos a pagar..."
            rows="4"
          ></textarea>
          <div class="pendiente-actions">
            <button class="btn-cancelar" @click="modalDescripcionPendiente = false">Cancelar</button>
            <button class="btn-guardar" @click="ventaPendienteSeleccionada ? guardarEdicionDescripcion() : guardarVentaPendiente()">💾 {{ ventaPendienteSeleccionada ? 'Actualizar' : 'Guardar' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal ventas pendientes -->
    <div v-if="modalVentasPendientesAbierto" class="pos-modal-overlay" @click.self="modalVentasPendientesAbierto = false">
      <div class="pos-modal-card modal-pendientes animate-pop-in">
        <header class="vp-modal-head">
          <div class="vp-head-left">
            <h3 class="vp-title">📋 Ventas Pendientes</h3>
            <span class="vp-count" v-if="ventasPendientes.length > 0">{{ ventasPendientes.length }} ticket{{ ventasPendientes.length > 1 ? 's' : '' }}</span>
          </div>
          <div class="vp-head-right">
            <div class="vp-views">
              <button :class="['vp-vbtn', { on: vpVistaLista }]" @click="vpVistaLista = true" title="Lista">📋</button>
              <button :class="['vp-vbtn', { on: !vpVistaLista }]" @click="vpVistaLista = false" title="Cuadrícula">🔲</button>
            </div>
            <button class="vp-close" @click="modalVentasPendientesAbierto = false">✕</button>
          </div>
        </header>
        <div class="vp-modal-body custom-scrollbar">
          <div v-if="ventasPendientes.length === 0" class="vp-empty">
            <span class="vp-empty-ico">✅</span>
            <p class="vp-empty-text">No hay ventas pendientes</p>
          </div>
          <!-- VISTA LISTA -->
          <div v-else-if="vpVistaLista" class="vp-list">
            <div v-for="v in ventasPendientesAgrupadas" :key="v.idVenta" class="vp-list-row">
              <div class="vp-list-main" @click="cobrarVentaPendiente(v)">
                <div class="vp-list-left">
                  <span class="vp-list-badge">#{{ v.numeroTicket }}</span>
                  <span class="vp-list-time">{{ v.fechaVenta?.slice(11, 16) }}</span>
                  <span class="vp-list-user">👤 {{ v.nombreUsuario }}</span>
                </div>
                <span class="vp-list-amount">{{ formatoMoneda(Number(v.montoTotal)) }}</span>
              </div>
              <div v-if="v.descripcionPendiente" class="vp-list-desc">
                <span class="vp-list-desc-ico">📝</span>
                <span class="vp-list-desc-text">{{ v.descripcionPendiente }}</span>
                <button class="vp-list-edit-desc" @click.stop="editarDescripcionPendiente(v)" title="Editar">✏️</button>
              </div>
              <div v-if="v.detallesAgrupados && v.detallesAgrupados.length > 0" class="vp-list-details">
                <div v-for="(d, i) in v.detallesAgrupados" :key="i" class="vp-list-detail-row">
                  <span class="vp-list-detail-qty">{{ d.cantidad }}{{ d.isGramaje ? 'g' : 'pz' }}</span>
                  <span class="vp-list-detail-name">{{ d.productoNombre }}</span>
                  <span class="vp-list-detail-price">{{ formatoMoneda(Number(d.precioUnitarioVenta)) }}</span>
                </div>
              </div>
              <div class="vp-list-actions">
                <button class="vp-list-btn-del" @click.stop="eliminarVentaPendiente(v)" title="Eliminar">🗑️</button>
                <button class="vp-list-btn-add" @click.stop="agregarAVentaPendiente(v)" title="Agregar productos">➕</button>
                <button class="vp-list-btn-cobrar" @click.stop="cobrarVentaPendiente(v)">💰 Cobrar</button>
              </div>
            </div>
          </div>
          <!-- VISTA GRID -->
          <div v-else class="vp-grid">
            <article v-for="v in ventasPendientesAgrupadas" :key="v.idVenta" class="vp-card">
              <div class="vp-card-head">
                <div class="vp-ticket-box">
                  <span class="vp-ticket-badge">#{{ v.numeroTicket }}</span>
                  <span class="vp-time">{{ v.fechaVenta?.slice(11, 16) }}</span>
                </div>
                <span class="vp-amount">{{ formatoMoneda(Number(v.montoTotal)) }}</span>
              </div>
              <div class="vp-card-user">
                <span class="vp-user-ico">👤</span>
                <span class="vp-user-name">{{ v.nombreUsuario }}</span>
              </div>
              <div v-if="v.descripcionPendiente" class="vp-desc">
                <span class="vp-desc-ico">📝</span>
                <span class="vp-desc-text">{{ v.descripcionPendiente }}</span>
                <button class="vp-edit-desc" @click.stop="editarDescripcionPendiente(v)" title="Editar">✏️</button>
              </div>
              <div v-if="v.detallesAgrupados && v.detallesAgrupados.length > 0" class="vp-details">
                <div v-for="(d, i) in v.detallesAgrupados" :key="i" class="vp-detail-row">
                  <span class="vp-detail-qty">{{ d.cantidad }}{{ d.isGramaje ? 'g' : 'pz' }}</span>
                  <span class="vp-detail-name">{{ d.productoNombre }}</span>
                  <span class="vp-detail-price">{{ formatoMoneda(Number(d.precioUnitarioVenta)) }}</span>
                </div>
              </div>
              <div class="vp-actions">
                <button class="vp-btn-del" @click.stop="eliminarVentaPendiente(v)" title="Eliminar">🗑️</button>
                <button class="vp-btn-add" @click.stop="agregarAVentaPendiente(v)" title="Agregar productos">➕</button>
                <button class="vp-btn-cobrar" @click.stop="cobrarVentaPendiente(v)">💰 Cobrar</button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal agregar productos a pendiente -->
    <div v-if="modalAgregarPendienteAbierto" class="pos-modal-overlay" @click.self="modalAgregarPendienteAbierto = false">
      <div class="pos-modal-card modal-agregar-pendiente animate-pop-in">
        <header class="modal-header-clean">
          <h3>Agregar a Ticket #{{ ventaPendienteSeleccionada?.numeroTicket }}</h3>
          <button class="close-x" @click="modalAgregarPendienteAbierto = false">×</button>
        </header>
        <div class="modal-body-clean custom-scrollbar">
          <div class="agregar-pendiente-search">
            <input ref="agregarPendienteInput" v-model="agregarPendienteBusqueda" type="text" placeholder="Buscar o escanear producto..." @keyup.enter="buscarYAgregarPendiente">
            <button class="btn-scanner-mini" @click="startScannerPendiente" :class="{ active: agregarPendienteScannerActivo }">📷</button>
          </div>
          <div v-if="agregarPendienteScannerActivo" class="scanner-mini-viewport">
            <div id="scanner-interactive-pendiente"></div>
          </div>
          <div class="agregar-pendiente-results">
            <div v-for="prod in productosFiltradosBusqueda" :key="prod.idProducto" class="result-item" @click="agregarProductoAPendiente(prod)">
              <span class="result-name">{{ prod.nombre }}</span>
              <span class="result-price">{{ formatoMoneda(prod.precio_venta ?? 0) }}</span>
            </div>
          </div>
          <div v-if="agregarPendienteProductos.length > 0" class="agregar-pendiente-ticket">
            <h4>Productos a agregar</h4>
            <div v-for="(p, idx) in agregarPendienteProductos" :key="idx" class="ticket-item">
              <span class="ticket-item-name">{{ p.productoNombre }}</span>
              <span class="ticket-item-qty">{{ p.cantidad }} × {{ formatoMoneda(Number(p.precioUnitarioVenta)) }}</span>
              <button class="btn-remove-mini" @click="quitarProductoPendiente(idx)">✕</button>
            </div>
            <div class="ticket-total">
              <span>Total:</span>
              <strong>{{ formatoMoneda(agregarPendienteProductos.reduce((s, p) => s + Number(p.precioUnitarioVenta) * p.cantidad, 0)) }}</strong>
            </div>
            <button class="btn-confirmar-agregar" @click="confirmarAgregarPendiente">Confirmar</button>
          </div>
        </div>
      </div>
    </div>

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

    <!-- MODAL PROVEEDORES Y PEDIDOS -->
    <div v-if="modalProveedoresPedidos" class="pos-modal-overlay" @click.self="modalProveedoresPedidos = false">
      <div class="pos-modal-card proveedores-pedidos-modal">
        <div class="pp-header">
          <h3>📦 Proveedores y Pedidos</h3>
          <button class="btn-close" @click="modalProveedoresPedidos = false">✕</button>
        </div>
        <div class="pp-tabs">
          <button :class="['pp-tab', { active: pedidoProveedorTab === 'proveedores' }]" @click="pedidoProveedorTab = 'proveedores'">Proveedores</button>
          <button :class="['pp-tab', { active: pedidoProveedorTab === 'pedidos' }]" @click="pedidoProveedorTab = 'pedidos'">Pedidos ({{ pedidosProveedor.length }})</button>
          <button :class="['pp-tab', { active: pedidoProveedorTab === 'sugerido' }]" @click="pedidoProveedorTab = 'sugerido'">🧙 Sugerido</button>
          <button :class="['pp-tab', { active: pedidoProveedorTab === 'sugeridoHoy' }]" @click="pedidoProveedorTab = 'sugeridoHoy'">📅 Sugerido Hoy</button>
        </div>
        <div class="pp-body">
          <!-- PROVEEDORES -->
          <div v-if="pedidoProveedorTab === 'proveedores'" class="pp-section">
            <div class="pp-toolbar">
              <button class="pp-btn-add" @click="openProveedorModal()">+ Proveedor</button>
              <div class="pp-views">
                <button :class="['pp-vbtn', { on: ppVistaListaProv }]" @click="ppVistaListaProv = true" title="Lista">📋</button>
                <button :class="['pp-vbtn', { on: !ppVistaListaProv }]" @click="ppVistaListaProv = false" title="Cuadrícula">🔲</button>
              </div>
            </div>
            <div v-if="proveedores.length === 0" class="pp-empty">No hay proveedores</div>
            <!-- Lista -->
            <div v-else-if="ppVistaListaProv" class="pp-list">
              <div v-for="p in proveedores" :key="p.idProveedor" class="pp-item">
                <div class="pp-item-avatar">{{ p.nombre.charAt(0) }}</div>
                <div class="pp-item-info">
                  <span class="pp-item-name">{{ p.nombre }}</span>
                  <span class="pp-item-detail" v-if="p.telefono">📞 {{ p.telefono }}</span>
                  <span class="pp-item-detail" v-if="p.email">✉️ {{ p.email }}</span>
                </div>
                <div class="pp-item-actions">
                  <button class="pp-btn-sm" @click="openProveedorModal(p)">✏️</button>
                  <button class="pp-btn-sm pp-btn-del" @click="deleteProveedor(p.idProveedor)">🗑️</button>
                </div>
              </div>
            </div>
            <!-- Grid -->
            <div v-else class="pp-grid">
              <div v-for="p in proveedores" :key="p.idProveedor" class="pp-card">
                <div class="pp-card-avatar">{{ p.nombre.charAt(0) }}</div>
                <h4 class="pp-card-name">{{ p.nombre }}</h4>
                <div class="pp-card-details">
                  <span v-if="p.telefono" class="pp-card-detail">📞 {{ p.telefono }}</span>
                  <span v-if="p.email" class="pp-card-detail">✉️ {{ p.email }}</span>
                  <span v-if="p.direccion" class="pp-card-detail">📍 {{ p.direccion }}</span>
                  <span v-if="p.contacto" class="pp-card-detail">👤 {{ p.contacto }}</span>
                </div>
                <div class="pp-card-actions">
                  <button class="pp-card-btn" @click="openProveedorModal(p)" title="Editar">✏️</button>
                  <button class="pp-card-btn pp-card-btn-del" @click="deleteProveedor(p.idProveedor)" title="Eliminar">🗑️</button>
                </div>
              </div>
            </div>
          </div>
          <!-- PEDIDOS -->
          <div v-if="pedidoProveedorTab === 'pedidos'" class="pp-section">
            <div class="pp-toolbar">
              <button class="pp-btn-add" @click="openPedidoModal()">+ Pedido</button>
              <div class="pp-views">
                <button :class="['pp-vbtn', { on: ppVistaListaPed }]" @click="ppVistaListaPed = true" title="Lista">📋</button>
                <button :class="['pp-vbtn', { on: !ppVistaListaPed }]" @click="ppVistaListaPed = false" title="Cuadrícula">🔲</button>
              </div>
            </div>
            <div v-if="pedidosProveedor.length === 0" class="pp-empty">No hay pedidos pendientes</div>
            <!-- Lista -->
            <div v-else-if="ppVistaListaPed" class="pp-list">
              <div v-for="ped in pedidosProveedor" :key="ped.idPedido" class="pp-item pp-pedido">
                <div class="pp-pedido-info">
                  <span class="pp-pedido-prov">{{ ped.nombreProveedor }}</span>
                  <span class="pp-pedido-date">📅 {{ ped.fechaEntregaEsperada }}</span>
                  <span class="pp-pedido-total">{{ formatoMoneda(ped.montoTotal) }}</span>
                </div>
                <div class="pp-item-actions">
                  <button class="pp-btn-sm pp-btn-ok" @click="recibirPedido(ped.idPedido)">✅</button>
                  <button class="pp-btn-sm pp-btn-del" @click="deletePedido(ped.idPedido)">🗑️</button>
                </div>
              </div>
            </div>
            <!-- Grid -->
            <div v-else class="pp-grid">
              <div v-for="ped in pedidosProveedor" :key="ped.idPedido" class="pp-card pp-pedido-card">
                <div class="pp-pedido-card-head">
                  <span class="pp-pedido-card-prov">{{ ped.nombreProveedor }}</span>
                  <span class="pp-pedido-card-total">{{ formatoMoneda(ped.montoTotal) }}</span>
                </div>
                <div class="pp-pedido-card-details">
                  <span class="pp-pedido-card-date">📅 {{ ped.fechaEntregaEsperada }}</span>
                  <span v-if="ped.montoApartado" class="pp-pedido-card-apartado">💰 Apartado: {{ formatoMoneda(ped.montoApartado) }}</span>
                </div>
                <div class="pp-pedido-card-actions">
                  <button class="pp-card-btn pp-card-btn-ok" @click="recibirPedido(ped.idPedido)" title="Recibir">✅</button>
                  <button class="pp-card-btn pp-card-btn-del" @click="deletePedido(ped.idPedido)" title="Eliminar">🗑️</button>
                </div>
              </div>
            </div>
          </div>
          <!-- SUGERIDO -->
          <div v-if="pedidoProveedorTab === 'sugerido'" class="pp-section pp-section-sugerido">
            <PedidoSugerido @pedido-creado="cargarProveedoresPedidos" />
          </div>
          <!-- SUGERIDO HOY -->
          <div v-if="pedidoProveedorTab === 'sugeridoHoy'" class="pp-section pp-section-sugerido">
            <SugeridoHoy @pedido-creado="cargarProveedoresPedidos" />
          </div>
        </div>

        <!-- FORMULARIO PROVEEDOR -->
        <div v-if="showProveedorForm" class="pp-form-overlay">
          <div class="pp-form-card">
            <h4>{{ editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor' }}</h4>
            <div class="pp-form-grid">
              <div class="pp-field">
                <label class="pp-field-label">Nombre del proveedor *</label>
                <input v-model="proveedorForm.nombre" placeholder="Ej: Distribuidora ABC" class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Persona de contacto</label>
                <input v-model="proveedorForm.contacto" placeholder="Nombre del contacto" class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Teléfono</label>
                <input v-model="proveedorForm.telefono" placeholder="(000) 000-0000" class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Email</label>
                <input v-model="proveedorForm.email" type="email" placeholder="correo@ejemplo.com" class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Dirección</label>
                <input v-model="proveedorForm.direccion" placeholder="Calle, número, colonia..." class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Notas</label>
                <textarea v-model="proveedorForm.notas" rows="2" placeholder="Notas adicionales..." class="pp-input pp-textarea"></textarea>
              </div>
            </div>
            <div class="pp-form-actions">
              <button class="pp-btn-cancel" @click="showProveedorForm = false">Cancelar</button>
              <button class="pp-btn-save" @click="saveProveedor">{{ editingProveedor ? 'Actualizar' : 'Guardar' }}</button>
            </div>
          </div>
        </div>

        <!-- FORMULARIO PEDIDO -->
        <div v-if="showPedidoForm" class="pp-form-overlay">
          <div class="pp-form-card pp-form-card-pedido">
            <h4>{{ editingPedido ? 'Editar Pedido' : 'Nuevo Pedido' }}</h4>
            <div class="pp-form-grid">
              <div class="pp-field">
                <label class="pp-field-label">Proveedor *</label>
                <select v-model="pedidoForm.idProveedor" class="pp-input">
                  <option :value="0">Seleccionar proveedor...</option>
                  <option v-for="p in proveedores" :key="p.idProveedor" :value="p.idProveedor">{{ p.nombre }}</option>
                </select>
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Fecha de entrega esperada *</label>
                <input v-model="pedidoForm.fechaEntregaEsperada" type="date" class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Monto apartado</label>
                <input v-model.number="pedidoForm.montoApartado" type="number" step="0.01" min="0" placeholder="0.00" class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-checkbox-label">
                  <input type="checkbox" v-model="montoManual" />
                  Monto total sin productos
                </label>
              </div>
              <div v-if="montoManual" class="pp-field">
                <label class="pp-field-label">Monto total *</label>
                <input v-model.number="pedidoForm.montoTotal" type="number" step="0.01" min="0" placeholder="0.00" class="pp-input" />
              </div>
            </div>

            <!-- PRODUCTOS DEL PEDIDO -->
            <div v-if="!montoManual" class="pp-product-section">
              <h5>📦 Productos del Pedido</h5>
              <div class="pp-product-search-wrap">
                <div ref="searchWrapperRef" class="pp-search-wrapper">
                  <input
                    v-model="searchProductoPedido"
                    type="text"
                    placeholder="Buscar producto..."
                    class="pp-input"
                    @focus="showProductoDropdownPedido = true"
                    @input="showProductoDropdownPedido = true"
                  />
                  <div v-if="showProductoDropdownPedido && filteredProductosPedido.length" class="pp-dropdown">
                    <div
                      v-for="prod in filteredProductosPedido"
                      :key="prod.idProducto"
                      class="pp-dropdown-item"
                      @click="selectProductoForPedido(prod)"
                    >
                      <span class="pp-dropdown-name">{{ prod.nombre }}</span>
                      <span class="pp-dropdown-price">{{ formatoMoneda(prod.precio_costo) }}</span>
                    </div>
                  </div>
                </div>
                <input v-model.number="newDetallePedido.cantidad" type="number" min="1" placeholder="Cant" class="pp-input pp-qty" />
                <input v-model.number="newDetallePedido.precioUnitario" type="number" step="0.01" min="0" placeholder="$" class="pp-input pp-price" />
                <button class="pp-btn-add-prod" @click="addDetallePedido">+</button>
              </div>

              <!-- LISTA DE DETALLES -->
              <div v-if="pedidoForm.detalles.length > 0" class="pp-detalle-list">
                <div v-for="(d, idx) in pedidoForm.detalles" :key="idx" class="pp-detalle-row">
                  <span class="pp-detalle-name">{{ d.nombreProducto }}</span>
                  <span class="pp-detalle-qty">{{ d.cantidad }} × {{ formatoMoneda(d.precioUnitario) }}</span>
                  <span class="pp-detalle-sub">{{ formatoMoneda(d.subtotal) }}</span>
                  <button class="pp-btn-remove" @click="removeDetallePedido(idx)">✕</button>
                </div>
                <div class="pp-detalle-total">
                  <span>Total:</span>
                  <strong>{{ formatoMoneda(pedidoForm.montoTotal) }}</strong>
                </div>
              </div>
            </div>

            <div class="pp-form-actions">
              <button class="pp-btn-cancel" @click="showPedidoForm = false">Cancelar</button>
              <button class="pp-btn-save" @click="savePedido">{{ editingPedido ? 'Actualizar' : 'Crear' }}</button>
            </div>
          </div>
        </div>
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
  color: var(--zelda-gold);
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
  
  .acceso-rapido-section {
    padding: 0.6rem;
    margin-bottom: 0.3rem;
  }
  
  .acceso-rapido-title {
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }
  
  .acceso-rapido-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 0.4rem;
  }
  
  .acceso-rapido-btn {
    padding: 0.5rem 0.3rem;
  }
  
  .acceso-code {
    font-size: 0.75rem;
    padding: 0.1rem 0.3rem;
  }
  
  .acceso-name {
    font-size: 0.6rem;
  }
  
  .acceso-price {
    font-size: 0.65rem;
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
    gap: 0;
  }
  
  .qty-btn {
    width: 24px;
    height: 24px;
    font-size: 0.85rem;
  }
  
  .qty-val {
    width: 26px;
    font-size: 0.7rem;
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
  
  .category-filter-select {
    min-width: 60px;
    max-width: 80px;
    font-size: 0.6rem;
    padding: 0.15rem 1rem 0.15rem 0.3rem;
    border-width: 1px;
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
    width: 26px;
    height: 26px;
    font-size: 0.95rem;
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
    height: auto;
    min-height: 32px;
    font-size: 0.6rem;
    min-width: 80px;
    max-width: 140px;
    border-radius: 5px;
    padding: 0.3rem 0.4rem;
    border-width: 2px;
    box-shadow: 0 2px 0 var(--border-color);
    white-space: normal;
  }
  
  .checkout-actions-scroll .btn-checkout.primary .text {
    text-align: center;
    word-break: break-word;
    line-height: 1.2;
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
    font-size: 0.7rem;
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

/* =========================================
   MÓVILES GRANDES (600px) - iPad Mini, Pixel 7
   ========================================= */
@media (max-width: 600px) {
  .pos-center {
    padding: 0.4rem;
  }
  
  .catalog-header {
    padding: 0.5rem;
  }
  
  .input-wrapper {
    padding: 0.3rem 0.4rem;
    gap: 0.25rem;
  }
  
  .input-wrapper input {
    font-size: 0.8rem;
  }
  
  .category-filter-select {
    min-width: 70px;
    max-width: 90px;
    font-size: 0.65rem;
    padding: 0.2rem 1.2rem 0.2rem 0.35rem;
  }
  
  .tool-btn {
    width: 34px;
    height: 34px;
    font-size: 0.9rem;
  }
  
  .catalog-grid {
    padding: 0.4rem;
  }
  
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.35rem;
  }
  
  .product-card {
    padding: 0.35rem;
    border-radius: 8px;
  }
  
  .product-icon {
    font-size: 1.5rem;
  }
  
.product-name {
  font-size: 0.9rem;
  font-weight: bold;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.2;
  max-height: 2.4rem;
  word-break: break-word;
}
  
  .product-price-tag {
    font-size: 0.7rem;
    padding: 0.18rem 0.4rem;
  }
  
  .stock-badge {
    font-size: 0.5rem;
    padding: 0.1rem 0.25rem;
  }
  
  .acceso-rapido-section {
    padding: 0.5rem;
  }
  
  .acceso-rapido-grid {
    grid-template-columns: repeat(auto-fill, minmax(75px, 1fr));
    gap: 0.35rem;
  }
  
  .acceso-rapido-btn {
    padding: 0.4rem 0.25rem;
  }
  
  .acceso-code {
    font-size: 0.7rem;
  }
  
  .acceso-name {
    font-size: 0.6rem;
  }
  
  .acceso-price {
    font-size: 0.65rem;
  }
  
  .pos-right {
    height: 50dvh;
  }
  
  .mobile-ticket-trigger {
    padding: 0.5rem 0.8rem;
    font-size: 0.85rem;
    min-height: 40px;
  }
  
  .trigger-info .icon {
    font-size: 1rem;
  }
  
  .trigger-total {
    font-size: 1rem;
  }
  
  .checkout-container {
    padding: 0.5rem;
  }
  
  .checkout-header {
    padding: 0.3rem;
    margin-bottom: 0.3rem;
  }
  
  .header-title h3 {
    font-size: 0.85rem;
  }
  
  .btn-clear-all {
    font-size: 0.6rem;
    padding: 0.18rem 0.4rem;
  }
  
  .ticket-items-list {
    gap: 0.35rem;
  }
  
  .ticket-item-row {
    padding: 0.4rem;
  }
  
  .item-name {
    font-size: 0.75rem;
  }
  
  .item-meta {
    font-size: 0.6rem;
  }
  
  .qty-control {
    transform: scale(0.7);
  }
  
  .item-subtotal {
    font-size: 0.75rem;
  }
  
  .btn-remove-item {
    width: 20px;
    height: 20px;
    font-size: 0.85rem;
  }
  
  .summary-row {
    font-size: 0.7rem;
  }
  
  .summary-row.total {
    font-size: 1.05rem;
  }
  
  .checkout-actions-scroll {
    padding: 0.35rem 0.2rem;
  }
  
  .checkout-actions-scroll .btn-checkout.primary {
    height: 38px;
    font-size: 0.75rem;
    min-width: 120px;
    border-radius: 8px;
    padding: 0 0.6rem;
  }
  
  .checkout-actions-scroll .extra-actions {
    gap: 0.35rem;
  }
  
  .checkout-actions-scroll .btn-checkout.secondary {
    width: 38px;
    min-width: 38px;
    height: 38px;
    font-size: 0.9rem;
    border-radius: 8px;
  }
  
  .cashier-badge {
    font-size: 0.55rem;
    padding-top: 0.2rem;
  }
  
  .promo-carousel {
    padding: 0.5rem;
    margin: 0.3rem;
  }
  
  .hero-title {
    font-size: 0.8rem;
  }
  
  .card-image {
    width: 80px;
  }
  
  .promo-name {
    font-size: 0.85rem;
  }
  
  .price-promo {
    font-size: 1rem;
  }
  
  .btn-agregar {
    padding: 0.35rem 0.55rem;
    font-size: 0.65rem;
  }
  
  .carousel-btn {
    width: 30px;
    height: 30px;
  }
}

/* =========================================
   MÓVILES PEQUEÑOS (400px) - iPhone SE, Galaxy A52
   ========================================= */
@media (max-width: 400px) {
  .pos-center {
    padding: 0.3rem;
  }
  
  .tickets-bar-mobile {
    padding: 0.25rem 0.2rem;
    min-height: 38px;
  }
  
  .tickets-bar-scroll {
    gap: 0.25rem;
  }
  
  .btn-add-ticket-mini {
    min-width: 32px;
    height: 32px;
    border-radius: 5px;
    font-size: 0.95rem;
  }
  
  .ticket-chip {
    min-width: 36px;
    height: 32px;
    padding: 0.15rem 0.35rem;
    border-radius: 5px;
  }
  
  .chip-num {
    font-size: 0.6rem;
  }
  
  .chip-total, .chip-status {
    font-size: 0.38rem;
  }
  
  .catalog-header {
    padding: 0.35rem;
  }
  
  .input-wrapper {
    padding: 0.22rem 0.28rem;
    gap: 0.18rem;
    border-radius: 5px;
  }
  
  .input-wrapper input {
    font-size: 0.72rem;
  }
  
  .category-filter-select {
    min-width: 60px;
    max-width: 75px;
    font-size: 0.58rem;
    padding: 0.12rem 0.9rem 0.12rem 0.25rem;
  }
  
  .input-wrapper input::placeholder {
    font-size: 0.55rem;
  }
  
  .search-icon {
    font-size: 0.7rem;
  }
  
  .tool-btn {
    width: 30px;
    height: 30px;
    font-size: 0.8rem;
    border-radius: 4px;
  }
  
  .catalog-grid {
    padding: 0.25rem;
  }
  
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.28rem;
  }
  
  .product-card {
    padding: 0.28rem;
    border-radius: 6px;
    gap: 0.18rem;
    border-width: 1px;
  }
  
  .product-icon {
    font-size: 1.3rem;
  }
  
  .product-name {
    font-size: 0.75rem;
    line-height: 1.2;
  }
  
  .product-price-tag {
    font-size: 0.7rem;
    padding: 0.12rem 0.3rem;
    border-radius: 5px;
    border-width: 1px;
  }
  
  .stock-badge {
    font-size: 0.55rem;
    padding: 0.06rem 0.18rem;
  }
  
  .acceso-rapido-section {
    padding: 0.4rem;
    margin-bottom: 0.25rem;
  }
  
  .acceso-rapido-title {
    font-size: 0.7rem;
    margin-bottom: 0.4rem;
  }
  
  .acceso-rapido-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 0.3rem;
  }
  
  .acceso-rapido-btn {
    padding: 0.35rem 0.2rem;
  }
  
  .acceso-code {
    font-size: 0.65rem;
    padding: 0.08rem 0.25rem;
  }
  
  .acceso-name {
    font-size: 0.55rem;
  }
  
  .acceso-price {
    font-size: 0.6rem;
  }
  
  .pos-right {
    height: 48dvh;
  }
  
  .mobile-ticket-trigger {
    padding: 0.35rem 0.6rem;
    font-size: 0.75rem;
    min-height: 34px;
  }
  
  .trigger-info {
    gap: 0.3rem;
  }
  
  .trigger-info .icon {
    font-size: 0.85rem;
  }
  
  .trigger-total {
    font-size: 0.9rem;
  }
  
  .chevron {
    font-size: 0.75rem;
  }
  
  .checkout-container {
    padding: 0.35rem;
  }
  
  .checkout-header {
    padding: 0.22rem;
    margin-bottom: 0.22rem;
  }
  
  .header-title h3 {
    font-size: 0.72rem;
  }
  
  .header-title .icon {
    font-size: 0.85rem;
  }
  
  .header-title {
    gap: 0.2rem;
  }
  
  .btn-clear-all {
    font-size: 0.52rem;
    padding: 0.12rem 0.3rem;
    border-width: 1px;
  }
  
  .ticket-items-list {
    flex: 1;
    min-height: 45px;
    gap: 0.25rem;
    padding-right: 0.2rem;
  }
  
  .ticket-item-row {
    padding: 0.28rem;
    border-width: 1px;
    border-radius: 6px;
  }
  
  .item-name {
    font-size: 0.8rem;
    padding-right: 1.5rem;
  }
  
  .item-meta {
    font-size: 0.52rem;
    gap: 0.22rem;
  }
  
  .unit-price {
    font-size: 0.52rem;
  }
  
  .mayoreo-toggle {
    font-size: 0.55rem;
    padding: 0.1rem 0.25rem;
    gap: 0.18rem;
  }
  
  .qty-control {
    transform: scale(0.58);
    border-width: 1px;
  }
  
  .qty-btn {
    width: 22px;
    height: 22px;
    font-size: 0.85rem;
  }
  
  .qty-val {
    width: 32px;
    font-size: 0.72rem;
  }
  
  .item-subtotal {
    font-size: 0.62rem;
  }
  
  .btn-remove-item {
    width: 28px;
    height: 28px;
    font-size: 1rem;
    top: 4px;
    right: 4px;
  }
  
  .checkout-footer {
    padding-top: 0.25rem;
    gap: 0.25rem;
  }
  
  .summary-row {
    font-size: 0.58rem;
  }
  
  .summary-row.total {
    font-size: 0.95rem;
    padding-top: 0.18rem;
    margin-top: 0.18rem;
  }
  
  .total-amount {
    font-size: 0.95rem;
  }
  
  .checkout-actions-scroll {
    padding: 0.22rem 0.12rem;
  }
  
  .checkout-actions-scroll .btn-checkout.primary {
    height: auto;
    min-height: 34px;
    font-size: 0.62rem;
    min-width: 90px;
    max-width: 150px;
    border-radius: 5px;
    padding: 0.25rem 0.45rem;
    border-width: 2px;
  }
  
  .checkout-actions-scroll .btn-checkout.primary .icon {
    font-size: 0.72rem;
  }
  
  .checkout-actions-scroll .extra-actions {
    gap: 0.22rem;
  }
  
  .checkout-actions-scroll .btn-checkout.secondary {
    width: 34px;
    min-width: 34px;
    height: 34px;
    font-size: 0.78rem;
    border-radius: 5px;
    border-width: 2px;
  }
  
  .cashier-badge {
    font-size: 0.48rem;
    padding: 0.12rem 0.35rem;
    margin-top: 0.18rem;
  }
  
  .promo-carousel {
    padding: 0.35rem;
    margin: 0.2rem;
    border-width: 2px;
    border-radius: 8px;
  }
  
  .hero-section {
    gap: 0.35rem;
  }
  
  .hero-icon {
    font-size: 0.9rem;
  }
  
  .hero-title {
    font-size: 0.7rem;
  }
  
  .hero-subtitle {
    display: none;
  }
  
  .hero-decor {
    font-size: 0.7rem;
  }
  
  .card-inner {
    padding: 0.4rem;
    gap: 0.4rem;
  }
  
  .card-image {
    width: 65px;
  }
  
  .image-placeholder {
    font-size: 1.3rem;
  }
  
  .placeholder-text {
    display: none;
  }
  
  .promo-name {
    font-size: 0.72rem;
  }
  
  .promo-description {
    display: none;
  }
  
  .products-title {
    font-size: 0.58rem;
  }
  
  .products-list {
    gap: 0.12rem;
  }
  
  .product-item {
    font-size: 0.58rem;
    padding: 0.12rem 0.25rem;
    gap: 0.25rem;
  }
  
  .product-qty {
    min-width: 28px;
    font-size: 0.52rem;
  }
  
  .price-original {
    display: none;
  }
  
  .price-promo-container {
    padding: 0.18rem 0.4rem;
  }
  
  .price-promo {
    font-size: 0.85rem;
  }
  
  .btn-agregar {
    padding: 0.25rem 0.4rem;
    font-size: 0.58rem;
    gap: 0.2rem;
    border-width: 2px;
  }
  
  .btn-icon {
    font-size: 0.75rem;
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
    width: 26px;
    height: 26px;
  }
  
  .carousel-btn.prev {
    left: -3px;
  }
  
  .carousel-btn.next {
    right: -3px;
  }
  
  .card-badge-container {
    top: -5px;
    right: -5px;
  }
  
  .card-badge {
    padding: 0.12rem 0.35rem;
    font-size: 0.5rem;
    border-width: 2px;
  }
  
  .carousel-footer {
    margin-top: 0.4rem;
    padding-top: 0.35rem;
  }
  
  .carousel-dots {
    gap: 0.25rem;
  }
  
  .dot {
    width: 5px;
    height: 5px;
  }
  
  .carousel-counter {
    font-size: 0.55rem;
  }
}

/* =========================================
   MÓVILES MUY PEQUEÑOS (360px) - Pixel 5, Galaxy S20
   ========================================= */
@media (max-width: 360px) {
  .pos-center {
    padding: 0.25rem;
  }
  
  .tickets-bar-mobile {
    padding: 0.2rem 0.15rem;
    min-height: 34px;
  }
  
  .tickets-bar-scroll {
    gap: 0.2rem;
  }
  
  .btn-add-ticket-mini {
    min-width: 28px;
    height: 28px;
    font-size: 0.85rem;
  }
  
  .ticket-chip {
    min-width: 32px;
    height: 28px;
    padding: 0.12rem 0.28rem;
  }
  
  .chip-num {
    font-size: 0.55rem;
  }
  
  .chip-total, .chip-status {
    font-size: 0.35rem;
  }
  
  .catalog-header {
    padding: 0.28rem;
  }
  
  .input-wrapper {
    padding: 0.18rem 0.22rem;
    gap: 0.15rem;
  }
  
  .input-wrapper input {
    font-size: 0.68rem;
  }
  
  .category-filter-select {
    min-width: 55px;
    max-width: 70px;
    font-size: 0.55rem;
    padding: 0.1rem 0.8rem 0.1rem 0.2rem;
  }
  
  .tool-btn {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }
  
  .catalog-grid {
    padding: 0.2rem;
  }
  
  .products-grid {
    gap: 0.22rem;
  }
  
  .product-card {
    padding: 0.22rem;
    gap: 0.15rem;
  }
  
  .product-icon {
    font-size: 1.2rem;
  }
  
  .product-name {
    font-size: 0.7rem;
    line-height: 1.2;
  }
  
  .product-price-tag {
    font-size: 0.55rem;
    padding: 0.1rem 0.25rem;
  }
  
  .stock-badge {
    font-size: 0.38rem;
    padding: 0.05rem 0.15rem;
  }
  
  .acceso-rapido-section {
    padding: 0.35rem;
  }
  
  .acceso-rapido-grid {
    grid-template-columns: repeat(auto-fill, minmax(65px, 1fr));
    gap: 0.25rem;
  }
  
  .acceso-rapido-btn {
    padding: 0.3rem 0.18rem;
  }
  
  .acceso-code {
    font-size: 0.6rem;
  }
  
  .acceso-name {
    font-size: 0.5rem;
  }
  
  .acceso-price {
    font-size: 0.55rem;
  }
  
  .pos-right {
    height: 46dvh;
  }
  
  .mobile-ticket-trigger {
    padding: 0.3rem 0.5rem;
    font-size: 0.7rem;
    min-height: 32px;
  }
  
  .trigger-total {
    font-size: 0.85rem;
  }
  
  .checkout-container {
    padding: 0.3rem;
  }
  
  .checkout-header {
    padding: 0.18rem;
  }
  
  .header-title h3 {
    font-size: 0.68rem;
  }
  
  .btn-clear-all {
    font-size: 0.48rem;
    padding: 0.1rem 0.25rem;
  }
  
  .ticket-items-list {
    gap: 0.2rem;
    min-height: 40px;
  }
  
  .ticket-item-row {
    padding: 0.22rem;
  }
  
  .item-name {
    font-size: 0.75rem;
    padding-right: 1.5rem;
  }
  
  .item-meta {
    font-size: 0.48rem;
  }
  
  .qty-control {
    gap: 0;
  }
  
  .qty-btn {
    width: 26px;
    height: 26px;
    font-size: 0.9rem;
  }
  
  .qty-val {
    width: 28px;
    font-size: 0.75rem;
  }
  
  .item-subtotal {
    font-size: 0.58rem;
  }
  
  .btn-remove-item {
    width: 26px;
    height: 26px;
    font-size: 0.95rem;
    top: 4px;
    right: 4px;
  }
  
  .summary-row {
    font-size: 0.52rem;
  }
  
  .summary-row.total {
    font-size: 0.88rem;
  }
  
  .checkout-actions-scroll {
    padding: 0.18rem 0.1rem;
  }
  
  .checkout-actions-scroll .btn-checkout.primary {
    min-height: 30px;
    font-size: 0.58rem;
    min-width: 80px;
    padding: 0.2rem 0.35rem;
  }
  
  .checkout-actions-scroll .btn-checkout.secondary {
    width: 30px;
    min-width: 30px;
    height: 30px;
    font-size: 0.72rem;
  }
  
  .cashier-badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    margin-top: 0.2rem;
  }
  
  .promo-carousel {
    padding: 0.3rem;
    margin: 0.15rem;
  }
  
  .hero-title {
    font-size: 0.65rem;
  }
  
  .card-image {
    width: 55px;
  }
  
  .promo-name {
    font-size: 0.65rem;
  }
  
  .price-promo {
    font-size: 0.78rem;
  }
  
  .btn-agregar {
    padding: 0.2rem 0.35rem;
    font-size: 0.52rem;
  }
  
  .carousel-btn {
    width: 24px;
    height: 24px;
  }
  
  .dot {
    width: 4px;
    height: 4px;
  }
  
  .carousel-counter {
    font-size: 0.5rem;
  }
}

/* =========================================
   MÓVILES EXTRA PEQUEÑOS (320px) - iPhone 5/SE antiguo
   ========================================= */
@media (max-width: 320px) {
  .pos-center {
    padding: 0.2rem;
  }
  
  .tickets-bar-mobile {
    padding: 0.15rem 0.1rem;
    min-height: 30px;
  }
  
  .tickets-bar-scroll {
    gap: 0.15rem;
  }
  
  .btn-add-ticket-mini {
    min-width: 26px;
    height: 26px;
    font-size: 0.8rem;
  }
  
  .ticket-chip {
    min-width: 28px;
    height: 26px;
    padding: 0.1rem 0.22rem;
  }
  
  .chip-num {
    font-size: 0.5rem;
  }
  
  .chip-total, .chip-status {
    font-size: 0.3rem;
  }
  
  .catalog-header {
    padding: 0.22rem;
  }
  
  .input-wrapper {
    padding: 0.15rem 0.18rem;
    gap: 0.12rem;
  }
  
  .input-wrapper input {
    font-size: 0.62rem;
  }
  
  .category-filter-select {
    min-width: 50px;
    max-width: 65px;
    font-size: 0.5rem;
    padding: 0.08rem 0.7rem 0.08rem 0.18rem;
  }
  
  .tool-btn {
    width: 26px;
    height: 26px;
    font-size: 0.7rem;
  }
  
  .catalog-grid {
    padding: 0.15rem;
  }
  
  .products-grid {
    gap: 0.18rem;
  }
  
  .product-card {
    padding: 0.18rem;
    gap: 0.12rem;
  }
  
  .product-icon {
    font-size: 1.1rem;
  }
  
  .product-name {
    font-size: 0.68rem;
    line-height: 1.15;
  }
  
  .product-price-tag {
    font-size: 0.5rem;
    padding: 0.08rem 0.2rem;
  }
  
  .stock-badge {
    font-size: 0.35rem;
    padding: 0.04rem 0.12rem;
  }
  
  .acceso-rapido-section {
    padding: 0.28rem;
  }
  
  .acceso-rapido-grid {
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 0.2rem;
  }
  
  .acceso-rapido-btn {
    padding: 0.25rem 0.15rem;
  }
  
  .acceso-code {
    font-size: 0.55rem;
  }
  
  .acceso-name {
    font-size: 0.45rem;
  }
  
  .acceso-price {
    font-size: 0.5rem;
  }
  
  .pos-right {
    height: 44dvh;
  }
  
  .mobile-ticket-trigger {
    padding: 0.25rem 0.4rem;
    font-size: 0.65rem;
    min-height: 28px;
  }
  
  .trigger-total {
    font-size: 0.8rem;
  }
  
  .checkout-container {
    padding: 0.25rem;
  }
  
  .checkout-header {
    padding: 0.15rem;
  }
  
  .header-title h3 {
    font-size: 0.62rem;
  }
  
  .btn-clear-all {
    font-size: 0.45rem;
    padding: 0.08rem 0.2rem;
  }
  
  .ticket-items-list {
    gap: 0.15rem;
    min-height: 35px;
  }
  
  .ticket-item-row {
    padding: 0.18rem;
  }
  
  .item-name {
    font-size: 0.72rem;
    padding-right: 1.5rem;
  }
  
  .item-meta {
    font-size: 0.42rem;
  }
  
  .qty-control {
    gap: 0;
  }
  
  .qty-btn {
    width: 24px;
    height: 24px;
    font-size: 0.8rem;
  }
  
  .qty-val {
    width: 24px;
    font-size: 0.68rem;
  }
  
  .item-subtotal {
    font-size: 0.52rem;
  }
  
  .btn-remove-item {
    width: 14px;
    height: 14px;
    font-size: 0.72rem;
  }
  
  .summary-row {
    font-size: 0.48rem;
  }
  
  .summary-row.total {
    font-size: 0.82rem;
  }
  
  .checkout-actions-scroll {
    padding: 0.15rem 0.08rem;
  }
  
  .checkout-actions-scroll .btn-checkout.primary {
    min-height: 28px;
    font-size: 0.52rem;
    min-width: 70px;
    padding: 0.18rem 0.3rem;
  }
  
  .checkout-actions-scroll .btn-checkout.secondary {
    width: 28px;
    min-width: 28px;
    height: 28px;
    font-size: 0.68rem;
  }
  
  .cashier-badge {
    font-size: 0.62rem;
    padding: 0.15rem 0.4rem;
    margin-top: 0.2rem;
  }
  
  .promo-carousel {
    padding: 0.25rem;
    margin: 0.12rem;
  }
  
  .hero-title {
    font-size: 0.58rem;
  }
  
  .card-image {
    width: 48px;
  }
  
  .promo-name {
    font-size: 0.58rem;
  }
  
  .price-promo {
    font-size: 0.72rem;
  }
  
  .btn-agregar {
    padding: 0.18rem 0.3rem;
    font-size: 0.48rem;
  }
  
  .carousel-btn {
    width: 22px;
    height: 22px;
  }
  
  .dot {
    width: 4px;
    height: 4px;
  }
  
  .carousel-counter {
    font-size: 0.45rem;
  }
}

/* Estilos base para barra de tickets (oculta en pantallas grandes) */
.tickets-bar-mobile {
  display: none;
}

/* ACTIVADOR TICKET MÓVIL */
.mobile-ticket-trigger {
  display: none;
  background: var(--bg-secondary);
  border-top: 1px solid var(--accent-color);
  color: var(--accent-color);
  padding: 0.7rem 1.2rem;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  cursor: pointer;
  border-radius: 12px 12px 0 0;
  width: 100%;
  box-sizing: border-box;
}

.trigger-info { display: flex; align-items: center; gap: 0.5rem; }
.trigger-total { font-size: 1.1rem; color: var(--success-color); font-weight: 700; }

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
    min-width: 130px;
    max-width: 200px;
    height: auto;
    min-height: 40px;
    font-size: 0.8rem;
    white-space: normal;
    flex-shrink: 0;
    border-radius: 10px;
    padding: 0.4rem 0.8rem;
  }
  
  .checkout-actions-scroll .btn-checkout.primary .text {
    text-align: center;
    word-break: break-word;
    line-height: 1.2;
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
  border-right: 1px solid var(--border-color);
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
  color: var(--accent-color);
  font-weight: 700;
  letter-spacing: 0.1em;
}

.btn-add-ticket {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: none;
  background: var(--accent-color);
  color: var(--bg-primary);
  font-size: 1.4rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.btn-add-ticket:hover { 
  filter: brightness(1.1);
}

.btn-add-ticket:active {
  transform: scale(0.95);
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
  height: 72px;
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
  font-weight: 600; 
  font-size: 0.8rem; 
  color: var(--accent-color); 
}
.ticket-nav-item .ticket-total {
  display: block;
  font-size: 0.55rem;
  color: var(--success-color);
  font-weight: 600;
  white-space: nowrap;
  padding: 0;
  margin-top: 0;
  border-top: none;
}
.ticket-status { 
  font-size: 0.45rem; 
  color: var(--text-secondary); 
  text-transform: uppercase; 
}
.ticket-initials {
  font-size: 0.45rem;
  color: var(--text-secondary);
  font-weight: 600;
  line-height: 1;
}
.chip-user {
  font-size: 0.45rem;
  color: var(--text-secondary);
  font-weight: 600;
  line-height: 1;
  margin-left: 4px;
  flex-shrink: 0;
}

.btn-delete-ticket {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  background: var(--error-color);
  color: white;
  border-radius: 50%;
  border: none;
  font-size: 10px;
  font-weight: 600;
  display: none;
  align-items: center;
  justify-content: center;
}

.ticket-nav-item:hover .btn-delete-ticket { display: flex; }

.sidebar-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin: 0.5rem auto 0.75rem;
}

.btn-creditos-sidebar {
  width: 44px;
  height: 44px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: #8a6bb4;
  font-size: 1.2rem;
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-creditos-sidebar:hover {
  border-color: #8a6bb4;
  background: color-mix(in srgb, #8a6bb4 10%, var(--bg-primary));
}

.btn-creditos-sidebar .creditos-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #8a6bb4;
  color: white;
  font-size: 0.6rem;
  font-weight: 600;
  min-width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-pendientes-ticket {
  width: 44px;
  height: 44px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--accent-color);
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-pendientes-ticket:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-primary));
}

.btn-pendientes-ticket .pending-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--error-color);
  color: white;
  font-size: 0.6rem;
  font-weight: 600;
  min-width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: badge-pulse 2s infinite;
}

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
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

.search-bar-pos {
  flex: 1;
}

.provision-total-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid;
  min-width: 160px;
  text-align: right;
}

.provision-total-badge.status-ok {
  background: rgba(39, 174, 96, 0.08);
  border-color: var(--success-color, #27ae60);
  color: var(--success-color, #27ae60);
}

.provision-total-badge.status-warning {
  background: rgba(52, 152, 219, 0.08);
  border-color: var(--info-color, #3498db);
  color: var(--info-color, #3498db);
}

.provision-total-badge.status-danger {
  background: rgba(231, 76, 60, 0.08);
  border-color: var(--error-color, #e74c3c);
  color: var(--error-color, #e74c3c);
}

.provision-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  opacity: 0.8;
}

.provision-amount {
  font-size: 1rem;
  font-weight: 700;
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

@keyframes linkWalk {
  0% { left: -100px; opacity: 1; }
  100% { left: calc(100% + 100px); opacity: 1; }
}

@keyframes linkSwing {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes linkSwing2 {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

@keyframes octoWalk {
  0% { left: -100px; }
  100% { left: calc(100% + 100px); }
}

@keyframes octoSwing {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes octoSwing2 {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
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
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.4rem 0.7rem;
  gap: 0.5rem;
  box-sizing: border-box;
}

.category-filter-select {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.35rem 2rem 0.35rem 0.5rem;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23b0a890' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  min-width: 100px;
  max-width: 150px;
  flex-shrink: 0;
}

.category-filter-select:focus {
  outline: none;
  border-color: var(--accent-color);
}

.category-filter-select option {
  background: var(--bg-primary);
  color: var(--text-primary);
}

@media (max-width: 767px) {
  .input-wrapper {
    padding: 0.4rem 0.6rem;
    gap: 0.4rem;
    border-radius: 8px;
    flex-wrap: wrap;
  }
  .input-wrapper input {
    font-size: 1rem;
    flex: 1;
    min-width: 0;
  }
  .category-filter-select {
    min-width: 80px;
    max-width: 120px;
    font-size: 0.75rem;
    padding: 0.3rem 1.5rem 0.3rem 0.5rem;
  }
  .tool-btn {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
  .catalog-header {
    flex-direction: column;
    align-items: stretch;
  }
  .provision-total-badge {
    align-items: center;
    text-align: center;
    min-width: auto;
    width: 100%;
  }
}

.input-wrapper:focus-within { 
  border-color: var(--accent-color); 
}

.input-wrapper input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1rem;
  outline: none;
}

.input-wrapper input::placeholder {
  color: var(--text-secondary);
}

.action-tools { display: flex; gap: 0.5rem; }

.tool-btn {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  width: 38px;
  height: 38px;
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  color: var(--text-primary);
}

.tool-btn:hover { 
  background: var(--bg-secondary); 
  border-color: var(--accent-color); 
}

.btn-mic.is-recording { 
  background: var(--error-color); 
  color: white;
}

.btn-promo:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: var(--bg-primary);
}

/* Sugerencias */
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--accent-color);
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 100;
}

.result-item {
  width: 100%;
  padding: 0.7rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.result-item:last-child {
  border-bottom: none;
  border-radius: 0 0 8px 8px;
}

.result-item:hover, .result-item.is-active { 
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-secondary)); 
}

.res-info { display: flex; flex-direction: column; gap: 2px; }
.res-name { font-weight: 600; font-size: 0.95rem; }
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
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  position: relative;
  transition: all 0.15s;
  cursor: pointer;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
}

@media (max-width: 767px) {
  .product-card {
    padding: 0.6rem;
    border-radius: 8px;
    gap: 0.4rem;
  }
}

.product-card:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 8%, var(--bg-secondary));
}

.product-card:active {
  transform: scale(0.97);
}

.product-icon { 
  font-size: 2.5rem; 
  transition: transform 0.15s;
}

.product-card:hover .product-icon {
  transform: scale(1.05);
}

.product-name { 
  font-size: 0.9rem; 
  font-weight: 600; 
  line-height: 1.2; 
  overflow: hidden;
  color: var(--text-primary);
}

.product-price-tag {
  background: var(--success-color);
  color: white;
  padding: 0.25rem 0.7rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  font-family: "Courier New", monospace;
}

.stock-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
}
.in-stock { background: color-mix(in srgb, var(--success-color) 15%, transparent); color: var(--success-color); }
.low-stock { background: color-mix(in srgb, var(--error-color) 15%, transparent); color: var(--error-color); }
.stock-badge.rentable { background: color-mix(in srgb, #7c3aed 15%, transparent); color: #a78bfa; }

/* =========================================
   RIGHT PANEL: CHECKOUT
   ========================================= */
.pos-right {
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
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
}

.checkout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.header-title { display: flex; align-items: center; gap: 0.4rem; }
.header-title h3 { 
  color: var(--accent-color); 
  font-size: 1.1rem;
  font-weight: 700;
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
  font-weight: 600;
  background: var(--error-color);
  border: none;
  color: white;
  padding: 0.25rem 0.6rem;
  border-radius: 5px;
  cursor: pointer;
  text-transform: uppercase;
  transition: all 0.15s;
}

.btn-clear-all:hover {
  filter: brightness(1.1);
}

.btn-clear-all:active {
  transform: scale(0.97);
}

.ticket-items-list {
  flex: 1;
  min-height: 100px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding-right: 0.5rem;
  box-sizing: border-box;
  position: relative;
}

.ticket-item-row {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.6rem;
  position: relative;
  transition: all 0.15s;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  overflow: hidden;
  flex-shrink: 0;
}

.ticket-item-row:hover {
  border-color: var(--accent-color);
}

.ticket-item-row.is-promo {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 6%, var(--bg-primary));
}

.ticket-item-row.is-promo .item-name {
  color: var(--accent-color);
}

.item-main { 
  display: flex; 
  flex-direction: column; 
  gap: 0.4rem; 
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.item-name { 
  font-size: 0.9rem; 
  font-weight: 600; 
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;
  width: 100%;
}

.item-name-inner {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.item-image {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.promo-placeholder {
  font-size: 1.5rem;
  color: var(--accent-color);
}

.promo-badge {
  margin-right: 0.3rem;
  font-size: 1rem;
}

.promo-contents {
  font-size: 0.7rem;
  color: var(--text-secondary);
  display: block;
  max-width: 100%;
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
  gap: 0.3rem;
  color: var(--accent-color);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.7rem;
  background: color-mix(in srgb, var(--accent-color) 10%, transparent);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--accent-color);
  transition: all 0.15s;
}

.mayoreo-toggle:hover {
  background: color-mix(in srgb, var(--accent-color) 18%, transparent);
}

.mayoreo-toggle input {
  accent-color: var(--accent-color);
}

.envase-toggle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--warning-color);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.7rem;
  background: color-mix(in srgb, var(--warning-color) 10%, transparent);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--warning-color);
  transition: all 0.15s;
}

.envase-toggle:hover {
  background: color-mix(in srgb, var(--warning-color) 18%, transparent);
}

.envase-toggle input {
  accent-color: var(--warning-color);
}

.envase-qty-input {
  width: 42px;
  padding: 0.15rem 0.25rem;
  background: color-mix(in srgb, var(--warning-color) 15%, transparent);
  border: 1px solid var(--warning-color);
  border-radius: 4px;
  color: var(--warning-color);
  font-size: 0.7rem;
  font-weight: 700;
  font-family: "Courier New", monospace;
  text-align: center;
  outline: none;
  transition: all 0.15s;
}

.envase-qty-input:focus {
  background: color-mix(in srgb, var(--warning-color) 25%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--warning-color) 30%, transparent);
}

.envase-qty-input::-webkit-inner-spin-button {
  opacity: 1;
}

.item-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.3rem;
  min-width: 0;
  flex-shrink: 0;
}

.qty-control {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color);
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
  font-weight: 700; 
  color: var(--success-color); 
  font-size: 0.95rem;
  font-family: "Courier New", monospace;
  flex-shrink: 0;
  white-space: nowrap;
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
  top: 4px;
  right: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--error-color);
  font-size: 1.1rem;
  cursor: pointer;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-remove-item:hover,
.btn-remove-item:active { 
  background: var(--error-color);
  color: white;
  border-color: var(--error-color);
}

.checkout-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  flex-shrink: 0;
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
}

.acceso-rapido-section {
  padding: 1rem;
  margin-bottom: 0.5rem;
}

.acceso-rapido-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.6rem 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-color);
  text-transform: uppercase;
}

.acceso-rapido-title .title-icon {
  font-size: 1rem;
}

.acceso-rapido-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.5rem;
}

.acceso-rapido-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.5rem 0.4rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  overflow: hidden;
}

.acceso-rapido-btn:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 8%, var(--bg-secondary));
}

.acceso-rapido-btn:active {
  transform: scale(0.97);
}

.acceso-code {
  display: inline-block;
  padding: 0.1rem 0.35rem;
  background: var(--accent-color);
  color: var(--bg-primary);
  border-radius: 3px;
  font-size: 0.8rem;
  font-weight: 700;
  font-family: monospace;
}

.acceso-name {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  line-height: 1.2;
}

.acceso-price {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--success-color);
  font-family: monospace;
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
  border-top: 1px solid var(--border-color);
  padding-top: 0.4rem;
  margin-top: 0.3rem;
}

.total-amount { 
  font-weight: 700; 
  color: var(--success-color);
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
  align-items: center;
}

.checkout-actions-scroll .btn-checkout.primary {
  width: auto;
  min-width: 140px;
  max-width: 220px;
  height: auto;
  min-height: 42px;
  white-space: normal;
  background: var(--success-color);
  border: none;
  transition: all 0.15s;
  padding: 0.5rem 0.8rem;
}

.checkout-actions-scroll .btn-checkout.primary .text {
  text-align: center;
  word-break: break-word;
  line-height: 1.2;
}

.checkout-actions-scroll .btn-checkout.primary:hover {
  filter: brightness(1.1);
}

.checkout-actions-scroll .btn-checkout.primary:active {
  transform: scale(0.97);
}

.checkout-actions-scroll .btn-checkout.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
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
  border: 1px solid var(--border-color);
  transition: all 0.15s;
}

.checkout-actions-scroll .extra-actions .btn-checkout.secondary:hover {
  border-color: var(--accent-color);
}

.checkout-actions-scroll .extra-actions .btn-checkout.secondary:active {
  transform: scale(0.95);
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
  height: auto;
  min-height: 50px;
  background: var(--success-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.15s;
  transition: all 0.15s;
  padding: 0.7rem 1rem;
}

.btn-checkout.primary .text {
  text-align: center;
  word-break: break-word;
  line-height: 1.2;
  flex: 1;
  min-width: 0;
}

.btn-checkout.primary:hover:not(:disabled) { 
  filter: brightness(1.1); 
}

.btn-checkout.primary:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-checkout.primary:disabled { 
  opacity: 0.5; 
  cursor: not-allowed; 
}

.shortcut-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  font-family: monospace;
}

.btn-checkout.primary:disabled .shortcut-badge {
  opacity: 0.6;
}

.extra-actions { 
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 0.4rem; 
}

.btn-checkout.secondary {
  height: 42px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 1.1rem;
  transition: all 0.15s;
}

.btn-checkout.secondary:hover {
  border-color: var(--accent-color);
}

.btn-checkout.secondary:active {
  transform: scale(0.95);
}

@media (max-width: 991px) {
  .btn-checkout.primary {
    height: 48px;
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
  font-weight: 600;
  background: var(--bg-primary);
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}
.cashier-badge .dot { 
  width: 7px; 
  height: 7px; 
  background: var(--success-color);
  border-radius: 50%;
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
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  width: min(100%, 600px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: visible;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: popIn 200ms ease-out;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.modal-h {
  padding: 1rem 1.25rem;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-h h3 {
  color: var(--accent-color);
  font-size: 1.1rem;
  font-weight: 700;
}

.close-x {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-x:hover {
  background: var(--error-color);
  border-color: var(--error-color);
  color: white;
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
  border-color: var(--accent-color);
}

.meta-box.total {
  background: var(--success-color);
  border-color: var(--success-color);
}

.meta-box.total span,
.meta-box.total strong {
  color: white;
}

.meta-icon {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.meta-box span { 
  font-size: 0.8rem; 
  text-transform: uppercase; 
  color: var(--text-secondary); 
  font-weight: 600;
}

.meta-box strong {
  color: var(--accent-color);
  font-size: 1.1rem;
  font-weight: 700;
  word-break: break-word;
  line-height: 1.3;
}

.meta-box .txt-pos {
  color: white !important;
  font-size: 1.2rem !important;
}

/* =========================================
   MODAL DETALLE DE VENTA OPTIMIZADO
   ========================================= */
.detalle-modal {
  width: min(100%, 520px);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.detalle-modal::before,
.detalle-modal::after {
  display: none;
}

.detalle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ticket-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.6rem;
  background: var(--accent-color);
  color: var(--btn-text, var(--bg-primary));
  font-size: 0.75rem;
  font-weight: 800;
  border-radius: 6px;
  font-family: "Courier New", monospace;
}

.detalle-header h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-discrepancia {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  background: color-mix(in srgb, #f59e0b 15%, var(--bg-primary));
  border: 1px solid #f59e0b;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #f59e0b;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-discrepancia:hover {
  background: color-mix(in srgb, #f59e0b 25%, var(--bg-primary));
}

.disc-icon {
  font-size: 1rem;
}

.disc-text {
  font-family: "Courier New", monospace;
}

.btn-edit,
.btn-save,
.btn-cancel-edit {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.btn-edit:hover {
  background: var(--accent-color);
  color: var(--btn-text, var(--bg-primary));
  border-color: var(--accent-color);
}

.btn-save {
  background: var(--success-color);
  color: white;
  border-color: var(--success-color);
}

.btn-save:hover {
  opacity: 0.9;
}

.btn-cancel-edit {
  background: var(--bg-primary);
  color: var(--text-secondary);
}

.btn-cancel-edit:hover {
  background: var(--error-color);
  color: white;
  border-color: var(--error-color);
}

.btn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #ef4444;
  border: 1px solid #dc2626;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 0 #b91c1c;
}

.btn-close:hover {
  background: #dc2626;
  border-color: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 3px 0 #991b1b;
}

.btn-close:active {
  transform: translateY(1px);
  box-shadow: none;
}

.detalle-body {
  padding: 1.25rem;
  overflow-y: auto;
  max-height: calc(90vh - 60px);
}

.detalle-summary {
  margin-bottom: 1.25rem;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

.total-section {
  background: var(--success-color);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.total-amount {
  font-size: 1.75rem;
  font-weight: 700;
  font-family: "Courier New", monospace;
  color: white;
}

.profit-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 0.25rem;
}

.total-edit-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--bg-primary);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--accent-color);
}

.total-edit-row .currency {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--success-color);
}

.total-edit-row .total-input {
  width: 120px;
  padding: 0.4rem;
  font-size: 1.25rem;
  font-weight: 700;
  font-family: "Courier New", monospace;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  text-align: right;
  background: var(--bg-secondary);
  color: var(--success-color);
}

.total-edit-row .total-input:focus {
  outline: none;
  border-color: var(--success-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--success-color) 20%, transparent);
}

.edit-dot {
  font-size: 0.75rem;
  color: var(--accent-color);
}

.discrepancia-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem;
  border-radius: 8px;
  margin-bottom: 1.25rem;
  border: 1px solid;
}

.alert-faltante {
  background: color-mix(in srgb, #ef4444 8%, var(--bg-primary));
  border-color: #ef4444;
}

.alert-sobrante {
  background: color-mix(in srgb, #f59e0b 8%, var(--bg-primary));
  border-color: #f59e0b;
}

.alert-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.alert-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.alert-label {
  color: var(--text-secondary);
  font-weight: 600;
}

.alert-value {
  font-weight: 700;
  font-family: "Courier New", monospace;
  color: var(--text-primary);
}

.alert-diff {
  font-size: 0.8rem;
  font-weight: 800;
  font-family: "Courier New", monospace;
  margin-top: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px dashed color-mix(in srgb, var(--border-color) 50%, transparent);
}

.alert-faltante .alert-diff {
  color: #ef4444;
}

.alert-sobrante .alert-diff {
  color: #f59e0b;
}

.credito-info-panel {
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(124, 58, 237, 0.05) 100%);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 10px;
}

.credito-info-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(139, 92, 246, 0.2);
}

.credito-info-header h4 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--accent-color);
}

.credito-icon {
  font-size: 1.2rem;
}

.credito-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.credito-field {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.credito-field.full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-value {
  font-size: 0.82rem;
  color: var(--text-primary);
  font-weight: 500;
}

.field-value.pagado {
  color: var(--success-color);
}

.field-value.saldo {
  color: var(--error-color);
  font-weight: 700;
}

.field-value.estatus {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}

.field-value.estatus.pendiente {
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
}

.field-value.estatus.pagado {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
}

.abonos-historial {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(139, 92, 246, 0.2);
}

.abonos-historial h5 {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.abono-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  margin-bottom: 0.3rem;
  font-size: 0.72rem;
}

.abono-monto {
  font-weight: 700;
  color: var(--success-color);
  font-family: 'Courier New', monospace;
  min-width: 70px;
}

.abono-fecha {
  color: var(--text-secondary);
  flex: 1;
}

.abono-metodo {
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
}

.abono-metodo.efectivo {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
}

.abono-metodo.tarjeta {
  background: rgba(236, 72, 153, 0.15);
  color: #be185d;
}

.abono-metodo.transferencia {
  background: rgba(59, 130, 246, 0.15);
  color: #1d4ed8;
}

.abono-user {
  color: var(--text-secondary);
}

.productos-section {
  margin-top: 1rem;
}

.envase-section-detalle {
  margin-top: 1rem;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--warning-color) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning-color) 25%, transparent);
  border-radius: 8px;
}

.envase-section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.envase-list-detalle {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.envase-row-detalle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  background: var(--bg-primary);
  font-size: 0.8rem;
}

.envase-name {
  flex: 1;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.envase-qty {
  color: var(--text-muted);
  margin: 0 0.5rem;
  font-size: 0.75rem;
}

.envase-price {
  font-weight: 600;
  color: var(--warning-color);
  white-space: nowrap;
}

.envase-total-detalle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.5rem;
  border-top: 1px dashed color-mix(in srgb, var(--warning-color) 40%, transparent);
  font-size: 0.85rem;
  color: var(--text-primary);
}

.envase-total-detalle strong {
  color: var(--warning-color);
  font-size: 0.9rem;
}

.productos-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 0.75rem;
}

.prod-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.prod-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 0.4rem;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.btn-clear-all {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  background: transparent;
  border: 1px solid var(--error-color);
  border-radius: 5px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--error-color);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear-all:hover {
  background: var(--error-color);
  color: white;
}

.agregar-producto-section {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border: 1px dashed var(--accent-color);
  border-radius: 8px;
}

.agregar-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  position: relative;
}

.agregar-search-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.agregar-input {
  flex: 1;
  padding: 0.45rem 0.5rem;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s;
}

.agregar-input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 15%, transparent);
}

.agregar-input::placeholder {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.agregar-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 4px;
}

.agregar-clear:hover {
  background: var(--error-color);
  color: white;
}

.agregar-resultados {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 180px;
  overflow-y: auto;
}

.agregar-resultado {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.agregar-resultado:hover {
  border-color: var(--success-color);
  background: color-mix(in srgb, var(--success-color) 8%, var(--bg-primary));
  transform: translateX(2px);
}

.agregar-prod-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agregar-prod-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.agregar-badge-gramaje {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.15rem 0.35rem;
  background: color-mix(in srgb, #8b5cf6 15%, var(--bg-primary));
  color: #8b5cf6;
  border: 1px solid #8b5cf6;
  border-radius: 4px;
  text-transform: uppercase;
}

.agregar-prod-price {
  font-size: 0.78rem;
  font-weight: 800;
  font-family: "Courier New", monospace;
  color: var(--success-color);
}

.agregar-vacio {
  margin-top: 0.5rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-muted);
  font-style: italic;
}

.productos-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.producto-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem;
  transition: all 0.2s;
}

.producto-item:hover {
  border-color: var(--accent-color);
  background: var(--bg-panel);
}

.prod-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.prod-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.prod-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.prod-qty {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-primary);
  padding: 0.3rem 0.6rem;
  border-radius: 5px;
  border: 1px solid var(--border-color);
}

.prod-qty.editable {
  cursor: pointer;
}

.prod-qty.editable:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.prod-subtotal {
  font-size: 0.9rem;
  font-weight: 800;
  font-family: "Courier New", monospace;
  color: var(--success-color);
}

.prod-envase-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.2rem;
  padding: 0.2rem 0.5rem;
  background: color-mix(in srgb, var(--warning-color) 10%, transparent);
  border-radius: 4px;
}

.envase-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.envase-price-line {
  font-size: 0.8rem;
  font-weight: 700;
  font-family: "Courier New", monospace;
  color: var(--warning-color);
}

.prod-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.25rem;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.55rem;
  border: 1px solid;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.68rem;
  font-weight: 600;
  background: transparent;
}

.btn-action svg {
  flex-shrink: 0;
}

.btn-action-edit {
  color: #2563eb;
  border-color: #2563eb;
}

.btn-action-edit:hover {
  background: #2563eb;
  color: white;
}

.btn-action-delete {
  color: #ef4444;
  border-color: #ef4444;
}

.btn-action-delete:hover {
  background: #ef4444;
  color: white;
}

.edit-controls {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
}

.edit-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.edit-qty,
.edit-price {
  width: 70px;
  padding: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.edit-qty:focus,
.edit-price:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 20%, transparent);
}

.btn-ok,
.btn-x {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.7rem;
  font-weight: 600;
}

.btn-ok {
  background: #22c55e;
  color: white;
  border-color: #16a34a;
  box-shadow: 0 2px 0 #15803d;
}

.btn-ok:hover {
  background: #16a34a;
  transform: translateY(-1px);
  box-shadow: 0 3px 0 #15803d;
}

.btn-ok:active {
  transform: translateY(1px);
  box-shadow: none;
}

.btn-x {
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-color: var(--border-color);
}

.btn-x:hover {
  background: #ef4444;
  color: white;
  border-color: #dc2626;
}

.btn-label {
  white-space: nowrap;
}

.prod-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.3rem;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.55rem;
  border: 1px solid;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.68rem;
  font-weight: 600;
  background: transparent;
}

.btn-action svg {
  flex-shrink: 0;
}

.btn-action-edit {
  color: #2563eb;
  border-color: #2563eb;
}

.btn-action-edit:hover {
  background: #2563eb;
  color: white;
}

.btn-action-delete {
  color: #ef4444;
  border-color: #ef4444;
}

.btn-action-delete:hover {
  background: #ef4444;
  color: white;
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

/* Modal descripción pendiente */
.pendiente-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  font-style: italic;
}

.pendiente-textarea {
  width: 100%;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem;
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--text-primary);
  resize: vertical;
  min-height: 80px;
  outline: none;
  transition: border-color 0.2s;
}

.pendiente-textarea:focus {
  border-color: var(--accent-color);
}

.pendiente-textarea::placeholder {
  color: var(--text-muted);
}

.pendiente-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

/* Lista de ventas pendientes - Diseño tarjetas */
.modal-pendientes {
  max-width: 560px;
}

.vp-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-panel);
}

.vp-head-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.vp-head-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.vp-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--accent-color);
  margin: 0;
  font-family: 'HyliaSerif', serif;
}

.vp-count {
  font-size: 0.7rem;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 0.1rem 0.45rem;
  border-radius: 10px;
}

.vp-views {
  display: flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.vp-vbtn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.8rem;
  line-height: 1;
}

.vp-vbtn.on { background: var(--accent-color); color: var(--bg-primary); }
.vp-vbtn:hover:not(.on) { background: var(--bg-panel); }

.vp-close {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.vp-close:hover {
  background: var(--error-color);
  border-color: var(--error-color);
  color: white;
}

.vp-modal-body {
  padding: 0.85rem 1.25rem;
  max-height: 65vh;
  overflow-y: auto;
}

.vp-empty {
  text-align: center;
  padding: 2.5rem 1rem;
}

.vp-empty-ico {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.vp-empty-text {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin: 0;
}

.vp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.6rem;
}

/* VISTA LISTA */
.vp-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.vp-list-row {
  position: relative;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  transition: all 0.15s;
}

.vp-list-row:hover {
  border-color: rgba(255, 215, 0, 0.25);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.vp-list-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.vp-list-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.vp-list-badge {
  font-weight: 700;
  font-size: 0.8rem;
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
  padding: 0.12rem 0.4rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.vp-list-time {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-family: 'Courier New', monospace;
}

.vp-list-user {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.vp-list-amount {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.vp-list-desc {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.4rem;
  background: var(--bg-secondary);
  border-radius: 5px;
}

.vp-list-desc-ico {
  font-size: 0.7rem;
  flex-shrink: 0;
}

.vp-list-desc-text {
  flex: 1;
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vp-list-edit-desc {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  flex-shrink: 0;
  opacity: 0.5;
  transition: all 0.15s;
}

.vp-list-edit-desc:hover {
  opacity: 1;
  background: color-mix(in srgb, var(--accent-color) 15%, transparent);
}

.vp-list-details {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  max-height: 70px;
  overflow-y: auto;
  padding: 0.1rem;
}

.vp-list-details::-webkit-scrollbar { width: 3px; }
.vp-list-details::-webkit-scrollbar-track { background: transparent; }
.vp-list-details::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 2px; }

.vp-list-detail-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.18rem 0.3rem;
  font-size: 0.7rem;
  border-radius: 3px;
  background: var(--bg-secondary);
}

.vp-list-detail-qty {
  background: var(--accent-color);
  color: var(--bg-primary);
  padding: 0.06rem 0.22rem;
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: 600;
  min-width: 28px;
  text-align: center;
  font-family: 'Courier New', monospace;
}

.vp-list-detail-name {
  flex: 1;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vp-list-detail-price {
  color: var(--success-color);
  font-weight: 600;
  font-size: 0.65rem;
  font-family: 'Courier New', monospace;
}

.vp-list-actions {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.1rem;
}

.vp-list-btn-del {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: var(--bg-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  transition: all 0.15s;
  flex-shrink: 0;
}

.vp-list-btn-del:hover {
  border-color: var(--error-color);
  background: color-mix(in srgb, var(--error-color) 15%, transparent);
}

.vp-list-btn-add {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: var(--bg-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  transition: all 0.15s;
  flex-shrink: 0;
}

.vp-list-btn-add:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 15%, transparent);
}

.vp-list-btn-cobrar {
  flex: 1;
  padding: 0.45rem;
  background: var(--success-color);
  border: none;
  border-radius: 5px;
  color: white;
  font-weight: 600;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.vp-list-btn-cobrar:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(34, 197, 94, 0.25);
}

.vp-list-btn-cobrar:active {
  transform: scale(0.98);
}

.vp-card {
  position: relative;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  transition: all 0.2s;
}

.vp-card:hover {
  border-color: rgba(255, 215, 0, 0.25);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.vp-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vp-ticket-box {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.vp-ticket-badge {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.vp-time {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-family: 'Courier New', monospace;
}

.vp-amount {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.vp-card-user {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.vp-user-ico {
  font-size: 0.8rem;
}

.vp-user-name {
  color: var(--text-secondary);
}

.vp-desc {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.45rem;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.vp-desc-ico {
  font-size: 0.75rem;
  flex-shrink: 0;
}

.vp-desc-text {
  flex: 1;
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vp-edit-desc {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  flex-shrink: 0;
  opacity: 0.5;
  transition: all 0.15s;
}

.vp-edit-desc:hover {
  opacity: 1;
  background: color-mix(in srgb, var(--accent-color) 15%, transparent);
}

.vp-details {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  max-height: 80px;
  overflow-y: auto;
  padding: 0.15rem;
}

.vp-details::-webkit-scrollbar { width: 3px; }
.vp-details::-webkit-scrollbar-track { background: transparent; }
.vp-details::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 2px; }

.vp-detail-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.35rem;
  font-size: 0.72rem;
  border-radius: 4px;
  background: var(--bg-secondary);
}

.vp-detail-qty {
  background: var(--accent-color);
  color: var(--bg-primary);
  padding: 0.08rem 0.25rem;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 600;
  min-width: 32px;
  text-align: center;
  font-family: 'Courier New', monospace;
}

.vp-detail-name {
  flex: 1;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vp-detail-price {
  color: var(--success-color);
  font-weight: 600;
  font-size: 0.7rem;
  font-family: 'Courier New', monospace;
}

.vp-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.15rem;
}

.vp-btn-del {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  transition: all 0.15s;
  flex-shrink: 0;
}

.vp-btn-del:hover {
  border-color: var(--error-color);
  background: color-mix(in srgb, var(--error-color) 15%, transparent);
}

.vp-btn-add {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  transition: all 0.15s;
  flex-shrink: 0;
}

.vp-btn-add:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 15%, transparent);
}

.vp-btn-cobrar {
  flex: 1;
  padding: 0.5rem;
  background: var(--success-color);
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.vp-btn-cobrar:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(34, 197, 94, 0.25);
}

.vp-btn-cobrar:active {
  transform: scale(0.98);
}

/* Modal agregar pendiente minimalista */
.modal-agregar-pendiente {
  max-width: 500px;
}

.agregar-pendiente-search {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.agregar-pendiente-search input {
  flex: 1;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.agregar-pendiente-search input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.btn-scanner-mini {
  width: 40px;
  height: 40px;
  border: 1px solid var(--accent-color);
  border-radius: 6px;
  background: transparent;
  color: var(--accent-color);
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-scanner-mini:hover {
  background: var(--accent-color);
  color: white;
}

.btn-scanner-mini.active {
  background: var(--accent-color);
  color: white;
}

.scanner-mini-viewport {
  width: 100%;
  height: 180px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.75rem;
  background: #000;
}

.agregar-pendiente-results {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 180px;
  overflow-y: auto;
  margin-bottom: 0.75rem;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}

.result-item:hover {
  background: var(--bg-secondary);
}

.result-name {
  font-size: 0.85rem;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 0.5rem;
}

.result-price {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--success-color);
}

.agregar-pendiente-ticket {
  border-top: 1px solid var(--border-color);
  padding-top: 0.75rem;
}

.agregar-pendiente-ticket h4 {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ticket-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  font-size: 0.85rem;
}

.ticket-item-name {
  flex: 1;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ticket-item-qty {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.btn-remove-mini {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--error-color);
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s;
}

.btn-remove-mini:hover {
  background: rgba(255, 59, 48, 0.1);
}

.ticket-total {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  margin-top: 0.5rem;
  border-top: 1px solid var(--border-color);
  font-size: 0.9rem;
}

.ticket-total strong {
  color: var(--accent-color);
  font-size: 1rem;
}

.btn-confirmar-agregar {
  width: 100%;
  padding: 0.7rem;
  margin-top: 0.75rem;
  border: none;
  border-radius: 6px;
  background: var(--accent-color);
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-confirmar-agregar:hover {
  opacity: 0.9;
}

.btn-confirmar-agregar:active {
  transform: scale(0.98);
}

@media (max-width: 768px) {
  .pos-modal-card {
    width: min(100%, 95vw) !important;
    max-height: 92vh;
    border-radius: 16px;
  }
  
  .detalle-modal {
    width: min(100%, 95vw);
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
  
  .detalle-header {
    padding: 0.85rem 1rem;
  }
  
  .detalle-header h3 {
    font-size: 0.9rem;
  }
  
  .ticket-badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
  }
  
  .modal-actions {
    gap: 0.4rem;
  }
  
  .btn-discrepancia,
  .btn-edit,
  .btn-save,
  .btn-cancel-edit {
    padding: 0.35rem 0.6rem;
    font-size: 0.75rem;
  }
  
  .btn-close {
    width: 20px;
    height: 20px;
    background: #ef4444;
    border-color: #dc2626;
  }
  
  .btn-close svg {
    width: 12px;
    height: 12px;
  }
  
  .detalle-body {
    padding: 0.55rem;
  }
  
  .btn-close svg {
    width: 16px;
    height: 16px;
  }
  
  .method-badge {
    font-size: 0.8rem !important;
    padding: 0.25rem 0.6rem;
  }
  
  .modal-h {
    padding: 0.75rem 1rem;
  }
  
  .detalle-body {
    padding: 1rem;
  }
  
  .summary-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
  }
  
  .summary-label {
    font-size: 0.6rem;
  }
  
  .summary-value {
    font-size: 0.8rem;
  }
  
  .total-section {
    padding: 0.85rem;
  }
  
  .total-amount {
    font-size: 1.5rem;
  }
  
  .total-edit-row .total-input {
    width: 100px;
    font-size: 1.1rem;
  }
  
  .discrepancia-alert {
    padding: 0.75rem;
    gap: 0.6rem;
  }
  
  .alert-icon {
    font-size: 1.1rem;
  }
  
  .alert-row {
    font-size: 0.7rem;
  }
  
  .alert-diff {
    font-size: 0.75rem;
  }
  
  .credito-info-panel {
    padding: 0.75rem;
  }
  
  .credito-info-grid {
    grid-template-columns: 1fr;
  }
  
  .abono-item {
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  
  .abono-monto {
    min-width: auto;
  }
  
  .productos-header {
    padding-bottom: 0.6rem;
    margin-bottom: 0.6rem;
  }
  
  .prod-title {
    font-size: 0.8rem;
  }
  
  .producto-item {
    padding: 0.65rem;
  }
  
  .prod-name {
    font-size: 0.85rem;
  }
  
  .prod-qty {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }
  
  .prod-subtotal {
    font-size: 0.85rem;
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
  
  /* PP modal responsive */
  .pp-tabs {
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0.6rem 1rem;
  }
  
  .pp-tab {
    font-size: 0.75rem;
    padding: 0.4rem;
  }
  
  .pp-product-search-wrap {
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  
  .pp-search-wrapper {
    flex: 1 1 100%;
  }
  
  .pp-qty, .pp-price {
    flex: 1;
    min-width: 0;
  }
  
  .pp-form-grid {
    gap: 0.6rem;
  }
}

/* Móviles grandes (600px y menos) */
@media (max-width: 600px) {
  .detalle-modal {
    width: min(100%, 96vw);
    border-radius: 12px;
  }
  
  .detalle-header {
    padding: 0.75rem 0.85rem;
  }
  
  .detalle-header h3 {
    font-size: 0.9rem;
  }
  
  .ticket-badge {
    font-size: 0.65rem;
    padding: 0.2rem 0.45rem;
  }
  
  .modal-actions {
    gap: 0.35rem;
  }
  
  .btn-discrepancia {
    padding: 0.35rem 0.55rem;
    font-size: 0.7rem;
  }
  
  .btn-discrepancia .disc-text {
    display: none;
  }
  
  .btn-edit,
  .btn-save,
  .btn-cancel-edit {
    padding: 0.35rem 0.55rem;
    font-size: 0.7rem;
  }
  
  .btn-edit svg,
  .btn-save svg {
    width: 14px;
    height: 14px;
  }
  
  .btn-close {
    width: 28px;
    height: 28px;
    background: #ef4444;
    border-color: #dc2626;
  }
  
  .btn-close svg {
    width: 18px;
    height: 18px;
  }
  
  .detalle-body {
    padding: 0.85rem;
  }
  
  .summary-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  
  .summary-item {
    gap: 0.2rem;
  }
  
  .summary-label {
    font-size: 0.55rem;
  }
  
  .summary-value {
    font-size: 0.75rem;
  }
  
  .total-section {
    padding: 0.75rem;
  }
  
  .total-amount {
    font-size: 1.35rem;
  }
  
  .profit-text {
    font-size: 0.7rem;
  }
  
  .total-edit-row {
    padding: 0.35rem 0.5rem;
    gap: 0.4rem;
  }
  
  .total-edit-row .currency {
    font-size: 1rem;
  }
  
  .total-edit-row .total-input {
    width: 90px;
    font-size: 1rem;
    padding: 0.3rem;
  }
  
  .edit-dot {
    font-size: 0.65rem;
  }
  
  .discrepancia-alert {
    padding: 0.65rem;
    gap: 0.5rem;
    margin-bottom: 0.85rem;
  }
  
  .alert-icon {
    font-size: 1rem;
    margin-top: 0;
  }
  
  .alert-row {
    font-size: 0.65rem;
  }
  
  .alert-label {
    font-size: 0.6rem;
  }
  
  .alert-value {
    font-size: 0.7rem;
  }
  
  .alert-diff {
    font-size: 0.7rem;
    margin-top: 0.2rem;
    padding-top: 0.2rem;
  }
  
  .productos-section {
    margin-top: 0.75rem;
  }
  
  .productos-header {
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .prod-title {
    font-size: 0.75rem;
  }
  
  .prod-count {
    min-width: 16px;
    height: 16px;
    font-size: 0.6rem;
    padding: 0 0.3rem;
  }
  
  .btn-clear-all {
    padding: 0.25rem 0.45rem;
    font-size: 0.65rem;
  }
  
  .btn-clear-all svg {
    width: 12px;
    height: 12px;
  }
  
  .agregar-producto-section {
    padding: 0.6rem;
    margin-bottom: 0.6rem;
  }
  
  .agregar-input {
    font-size: 0.75rem;
    padding: 0.4rem 0.45rem;
  }
  
  .agregar-search-icon {
    width: 14px;
    height: 14px;
  }
  
  .agregar-resultado {
    padding: 0.35rem 0.45rem;
  }
  
  .agregar-prod-name {
    font-size: 0.72rem;
  }
  
  .agregar-prod-price {
    font-size: 0.72rem;
  }
  
  .agregar-badge-gramaje {
    font-size: 0.55rem;
    padding: 0.12rem 0.3rem;
  }
  
  .productos-list {
    gap: 0.4rem;
  }
  
  .producto-item {
    padding: 0.6rem;
    border-radius: 6px;
  }
  
  .prod-info {
    gap: 0.4rem;
  }
  
  .prod-name {
    font-size: 0.8rem;
    line-height: 1.25;
  }
  
  .prod-meta {
    gap: 0.35rem;
  }
  
  .prod-qty {
    font-size: 0.7rem;
    padding: 0.2rem 0.45rem;
    border-radius: 4px;
  }
  
  .prod-subtotal {
    font-size: 0.8rem;
  }
  
  .prod-actions {
    gap: 0.3rem;
    margin-top: 0.2rem;
  }
  
  .btn-action {
    padding: 0.25rem 0.45rem;
    font-size: 0.62rem;
  }
  
  .btn-action svg {
    width: 12px;
    height: 12px;
  }
  
  .edit-controls {
    gap: 0.3rem;
  }
  
  .edit-label {
    font-size: 0.62rem;
  }
  
  .edit-qty,
  .edit-price {
    width: 60px;
    padding: 0.28rem;
    font-size: 0.72rem;
    border-radius: 4px;
  }
  
  .btn-ok,
  .btn-x {
    padding: 0.28rem 0.5rem;
    font-size: 0.62rem;
  }
  
  .btn-ok svg,
  .btn-x svg {
    width: 12px;
    height: 12px;
  }
  
  .btn-label {
    display: none;
  }
  
  .method-badge {
    font-size: 0.8rem !important;
    padding: 0.25rem 0.65rem;
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
  
  .detalle-modal {
    width: 100vw;
    max-width: 100vw;
    border-radius: 0;
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
  
  .detalle-header {
    padding: 0.75rem 0.85rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .header-left {
    width: 100%;
    justify-content: space-between;
  }
  
  .detalle-header h3 {
    font-size: 0.9rem;
  }
  
  .modal-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .btn-discrepancia .disc-text {
    display: none;
  }
  
  .btn-edit span:not(:first-child),
  .btn-save span:not(:first-child) {
    display: none;
  }
  
  .detalle-body {
    padding: 0.85rem;
  }
  
  .summary-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  
  .summary-label {
    font-size: 0.6rem;
  }
  
  .summary-value {
    font-size: 0.75rem;
  }
  
  .total-section {
    padding: 0.75rem;
  }
  
  .total-amount {
    font-size: 1.35rem;
  }
  
  .total-edit-row .total-input {
    width: 90px;
    font-size: 1rem;
  }
  
  .discrepancia-alert {
    padding: 0.65rem;
    gap: 0.5rem;
  }
  
  .alert-icon {
    font-size: 1rem;
  }
  
  .alert-row {
    font-size: 0.65rem;
  }
  
  .alert-diff {
    font-size: 0.7rem;
  }
  
  .productos-header {
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .prod-title {
    font-size: 0.75rem;
  }
  
  .btn-clear-all span:not(:first-child) {
    display: none;
  }
  
  .producto-item {
    padding: 0.6rem;
  }
  
  .prod-name {
    font-size: 0.8rem;
  }
  
  .prod-qty {
    font-size: 0.7rem;
    padding: 0.2rem 0.45rem;
  }
  
  .prod-subtotal {
    font-size: 0.8rem;
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
  
  /* PP modal responsive 480 */
  .pp-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.3rem;
    padding: 0.5rem 0.75rem;
  }
  
  .pp-tab {
    font-size: 0.7rem;
    padding: 0.4rem 0.25rem;
  }
  
  .pp-body {
    padding: 0.75rem;
  }
  
  .pp-toolbar {
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  
  .pp-btn-add {
    flex: 1;
    min-width: 0;
  }
  
  .pp-header {
    padding: 0.75rem;
  }
  
  .pp-header h3 {
    font-size: 0.95rem;
  }
  
  .pp-form-overlay {
    padding: 0.5rem;
  }
  
  .pp-form-card,
  .pp-form-card-pedido {
    max-width: 100%;
    padding: 1rem;
  }
  
  .pp-form-actions {
    flex-direction: column;
  }
  
  .pp-form-actions button {
    width: 100%;
    text-align: center;
  }
  
  .pp-product-search-wrap {
    flex-direction: column;
    gap: 0.3rem;
  }
  
  .pp-product-search-wrap .pp-input {
    width: 100%;
  }
  
  .pp-qty, .pp-price {
    width: 100%;
    flex: 1;
    box-sizing: border-box;
  }
  
  .pp-btn-add-prod {
    width: 100%;
    height: 36px;
  }
  
  .pp-detalle-row {
    flex-wrap: wrap;
    gap: 0.3rem;
    padding: 0.35rem 0.5rem;
  }
  
  .pp-detalle-name {
    width: 100%;
  }
  
  .pp-btn-remove {
    margin-left: auto;
  }
  
  /* Ventas Pendientes responsive 480 */
  .vp-modal-head {
    padding: 0.65rem 0.75rem;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  
  .vp-title {
    font-size: 0.85rem;
  }
  
  .vp-modal-body {
    padding: 0.65rem 0.75rem;
  }
  
  .vp-list-left {
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  
  .vp-list-actions {
    flex-wrap: wrap;
  }
  
  .vp-list-btn-del, .vp-list-btn-add {
    width: 28px;
    height: 28px;
    font-size: 0.7rem;
  }
  
  .vp-list-btn-cobrar {
    flex: 1;
    min-width: 0;
  }
  
  .vp-card {
    padding: 0.6rem;
  }
  
  .vp-card-head {
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  
  .ticket-item {
    flex-wrap: wrap;
    gap: 0.3rem;
    padding: 0.35rem 0;
  }
  
  .ticket-item-name {
    width: 100%;
  }
  
  .modal-header-clean h3 {
    font-size: 0.9rem;
  }
  
  .vp-detail-row {
    flex-wrap: wrap;
    gap: 0.2rem;
  }
  
  .vp-detail-name {
    width: 100%;
  }
  
  /* Descripción pendiente */
  .pendiente-textarea {
    font-size: 0.85rem;
  }
  
  .pendiente-actions {
    flex-direction: column;
    gap: 0.4rem;
  }
  
  .pendiente-actions button {
    width: 100%;
  }
}

/* Móviles pequeños (400px y menos) */
@media (max-width: 400px) {
  .detalle-header {
    padding: 0.6rem 0.65rem;
  }
  
  .detalle-header h3 {
    font-size: 0.8rem;
  }
  
  .ticket-badge {
    font-size: 0.55rem;
    padding: 0.15rem 0.35rem;
  }
  
  .modal-actions {
    gap: 0.25rem;
  }
  
  .btn-discrepancia {
    padding: 0.25rem 0.4rem;
    font-size: 0.6rem;
  }
  
  .btn-edit,
  .btn-save,
  .btn-cancel-edit {
    padding: 0.25rem 0.4rem;
    font-size: 0.6rem;
  }
  
  .btn-edit svg,
  .btn-save svg {
    width: 12px;
    height: 12px;
  }
  
  .btn-close {
    width: 24px;
    height: 24px;
    background: #ef4444;
    border-color: #dc2626;
  }
  
  .btn-close svg {
    width: 14px;
    height: 14px;
  }
  
  .detalle-body {
    padding: 0.65rem;
  }
  
  .summary-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem;
    margin-bottom: 0.55rem;
  }
  
  .summary-label {
    font-size: 0.45rem;
  }
  
  .summary-value {
    font-size: 0.65rem;
  }
  
  .total-section {
    padding: 0.55rem;
  }
  
  .total-amount {
    font-size: 1.15rem;
  }
  
  .profit-text {
    font-size: 0.6rem;
  }
  
  .total-edit-row {
    padding: 0.25rem 0.4rem;
    gap: 0.3rem;
  }
  
  .total-edit-row .currency {
    font-size: 0.9rem;
  }
  
  .total-edit-row .total-input {
    width: 70px;
    font-size: 0.9rem;
    padding: 0.2rem;
  }
  
  .discrepancia-alert {
    padding: 0.5rem;
    gap: 0.4rem;
    margin-bottom: 0.65rem;
  }
  
  .alert-icon {
    font-size: 0.85rem;
  }
  
  .alert-row {
    font-size: 0.55rem;
  }
  
  .alert-label {
    font-size: 0.5rem;
  }
  
  .alert-value {
    font-size: 0.6rem;
  }
  
  .alert-diff {
    font-size: 0.6rem;
  }
  
  .productos-section {
    margin-top: 0.55rem;
  }
  
  .productos-header {
    padding-bottom: 0.4rem;
    margin-bottom: 0.4rem;
  }
  
  .prod-title {
    font-size: 0.65rem;
  }
  
  .prod-count {
    min-width: 14px;
    height: 14px;
    font-size: 0.5rem;
  }
  
  .btn-clear-all {
    padding: 0.18rem 0.35rem;
    font-size: 0.55rem;
  }
  
  .agregar-producto-section {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .agregar-input {
    font-size: 0.7rem;
    padding: 0.35rem 0.4rem;
  }
  
  .agregar-search-icon {
    width: 13px;
    height: 13px;
  }
  
  .agregar-resultado {
    padding: 0.3rem 0.4rem;
  }
  
  .agregar-prod-name {
    font-size: 0.68rem;
  }
  
  .agregar-prod-price {
    font-size: 0.68rem;
  }
  
  .agregar-badge-gramaje {
    font-size: 0.5rem;
    padding: 0.1rem 0.25rem;
  }
  
  .productos-list {
    gap: 0.3rem;
  }
  
  .producto-item {
    padding: 0.5rem;
  }
  
  .prod-info {
    gap: 0.3rem;
  }
  
  .prod-name {
    font-size: 0.7rem;
  }
  
  .prod-meta {
    gap: 0.25rem;
  }
  
  .prod-qty {
    font-size: 0.6rem;
    padding: 0.15rem 0.35rem;
  }
  
  .prod-subtotal {
    font-size: 0.7rem;
  }
  
  .prod-actions {
    gap: 0.2rem;
  }
  
  .btn-action {
    padding: 0.2rem 0.4rem;
    font-size: 0.58rem;
  }
  
  .btn-action svg {
    width: 10px;
    height: 10px;
  }
  
  .edit-controls {
    gap: 0.2rem;
  }
  
  .edit-label {
    font-size: 0.55rem;
  }
  
  .edit-qty,
  .edit-price {
    width: 55px;
    padding: 0.18rem;
    font-size: 0.62rem;
  }
  
  .btn-ok,
  .btn-x {
    padding: 0.2rem 0.45rem;
    font-size: 0.58rem;
  }
  
  .btn-ok svg,
  .btn-x svg {
    width: 10px;
    height: 10px;
  }
  
  .btn-label {
    display: none;
  }
  
  .method-badge {
    font-size: 0.7rem !important;
    padding: 0.18rem 0.5rem;
  }
  
  /* PP modal 400 */
  .pp-tabs {
    gap: 0.2rem;
    padding: 0.4rem 0.5rem;
  }
  
  .pp-tab {
    font-size: 0.65rem;
    padding: 0.35rem 0.2rem;
  }
  
  .pp-header h3 {
    font-size: 0.85rem;
  }
  
  .pp-body {
    padding: 0.5rem;
  }
  
  .pp-form-card,
  .pp-form-card-pedido {
    padding: 0.75rem;
  }
  
  .pp-form-grid {
    gap: 0.5rem;
  }
  
  .pp-field-label {
    font-size: 0.65rem;
  }
  
  .pp-input {
    padding: 0.4rem 0.5rem;
    font-size: 0.78rem;
  }
  
  .vp-list-row {
    padding: 0.5rem;
  }
  
  .vp-list-left {
    gap: 0.2rem;
  }
  
  .vp-list-amount {
    font-size: 0.78rem;
  }
}

/* Móviles muy pequeños (360px y menos) */
@media (max-width: 360px) {
  .detalle-header {
    padding: 0.55rem 0.6rem;
  }
  
  .detalle-header h3 {
    font-size: 0.75rem;
  }
  
  .ticket-badge {
    font-size: 0.5rem;
    padding: 0.12rem 0.3rem;
  }
  
  .modal-actions {
    gap: 0.2rem;
  }
  
  .btn-discrepancia {
    padding: 0.2rem 0.35rem;
    font-size: 0.55rem;
  }
  
  .btn-edit,
  .btn-save,
  .btn-cancel-edit {
    padding: 0.2rem 0.35rem;
    font-size: 0.55rem;
  }
  
  .btn-edit svg,
  .btn-save svg {
    width: 11px;
    height: 11px;
  }
  
  .btn-close {
    width: 22px;
    height: 22px;
    background: #ef4444;
    border-color: #dc2626;
  }
  
  .btn-close svg {
    width: 13px;
    height: 13px;
  }
  
  .detalle-body {
    padding: 0.6rem;
  }
  
  .summary-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.35rem;
    margin-bottom: 0.5rem;
  }
  
  .summary-label {
    font-size: 0.4rem;
  }
  
  .summary-value {
    font-size: 0.6rem;
  }
  
  .total-section {
    padding: 0.5rem;
  }
  
  .total-amount {
    font-size: 1.05rem;
  }
  
  .profit-text {
    font-size: 0.55rem;
  }
  
  .total-edit-row {
    padding: 0.2rem 0.35rem;
    gap: 0.25rem;
  }
  
  .total-edit-row .currency {
    font-size: 0.85rem;
  }
  
  .total-edit-row .total-input {
    width: 65px;
    font-size: 0.85rem;
    padding: 0.18rem;
  }
  
  .discrepancia-alert {
    padding: 0.45rem;
    gap: 0.35rem;
    margin-bottom: 0.55rem;
  }
  
  .alert-icon {
    font-size: 0.8rem;
  }
  
  .alert-row {
    font-size: 0.5rem;
  }
  
  .alert-label {
    font-size: 0.45rem;
  }
  
  .alert-value {
    font-size: 0.55rem;
  }
  
  .alert-diff {
    font-size: 0.55rem;
  }
  
  .productos-header {
    padding-bottom: 0.35rem;
    margin-bottom: 0.35rem;
  }
  
  .prod-title {
    font-size: 0.6rem;
  }
  
  .prod-count {
    min-width: 13px;
    height: 13px;
    font-size: 0.45rem;
  }
  
  .btn-clear-all {
    padding: 0.15rem 0.3rem;
    font-size: 0.5rem;
  }
  
  .agregar-producto-section {
    padding: 0.45rem;
    margin-bottom: 0.45rem;
  }
  
  .agregar-input {
    font-size: 0.65rem;
    padding: 0.3rem 0.35rem;
  }
  
  .agregar-search-icon {
    width: 12px;
    height: 12px;
  }
  
  .agregar-resultado {
    padding: 0.25rem 0.35rem;
  }
  
  .agregar-prod-name {
    font-size: 0.62rem;
  }
  
  .agregar-prod-price {
    font-size: 0.62rem;
  }
  
  .agregar-badge-gramaje {
    font-size: 0.45rem;
    padding: 0.08rem 0.2rem;
  }
  
  .productos-list {
    gap: 0.25rem;
  }
  
  .producto-item {
    padding: 0.45rem;
  }
  
  .prod-info {
    gap: 0.25rem;
  }
  
  .prod-name {
    font-size: 0.65rem;
  }
  
  .prod-meta {
    gap: 0.2rem;
  }
  
  .prod-qty {
    font-size: 0.55rem;
    padding: 0.12rem 0.3rem;
  }
  
  .prod-subtotal {
    font-size: 0.65rem;
  }
  
  .prod-actions {
    gap: 0.15rem;
  }
  
  .btn-action {
    padding: 0.18rem 0.35rem;
    font-size: 0.52rem;
  }
  
  .btn-action svg {
    width: 9px;
    height: 9px;
  }
  
  .edit-controls {
    gap: 0.15rem;
  }
  
  .edit-label {
    font-size: 0.5rem;
  }
  
  .edit-qty,
  .edit-price {
    width: 50px;
    padding: 0.15rem;
    font-size: 0.58rem;
  }
  
  .btn-ok,
  .btn-x {
    padding: 0.18rem 0.4rem;
    font-size: 0.52rem;
  }
  
  .btn-ok svg,
  .btn-x svg {
    width: 9px;
    height: 9px;
  }
  
  .btn-label {
    display: none;
  }
  
  .method-badge {
    font-size: 0.65rem !important;
    padding: 0.15rem 0.4rem;
  }
  
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
}

/* Móviles extra pequeños (320px y menos) */
@media (max-width: 320px) {
  .detalle-header {
    padding: 0.5rem 0.55rem;
  }
  
  .detalle-header h3 {
    font-size: 0.7rem;
  }
  
  .ticket-badge {
    font-size: 0.45rem;
    padding: 0.1rem 0.25rem;
  }
  
  .modal-actions {
    gap: 0.15rem;
  }
  
  .btn-discrepancia {
    padding: 0.18rem 0.3rem;
    font-size: 0.5rem;
  }
  
  .btn-edit,
  .btn-save,
  .btn-cancel-edit {
    padding: 0.18rem 0.3rem;
    font-size: 0.5rem;
  }
  
  .btn-edit svg,
  .btn-save svg {
    width: 10px;
    height: 10px;
  }
  
  .btn-close {
    width: 30px;
    height: 30px;
    background: #ef4444;
    border-color: #dc2626;
  }
  
  .btn-close svg {
    width: 12px;
    height: 12px;
  }
  
  .detalle-body {
    padding: 0.55rem;
  }
  
  .summary-row {
    grid-template-columns: 1fr 1fr;
    gap: 0.3rem;
    margin-bottom: 0.45rem;
  }
  
  .summary-label {
    font-size: 0.38rem;
  }
  
  .summary-value {
    font-size: 0.55rem;
  }
  
  .total-section {
    padding: 0.45rem;
  }
  
  .total-amount {
    font-size: 0.95rem;
  }
  
  .profit-text {
    font-size: 0.5rem;
  }
  
  .total-edit-row {
    padding: 0.18rem 0.3rem;
    gap: 0.2rem;
  }
  
  .total-edit-row .currency {
    font-size: 0.8rem;
  }
  
  .total-edit-row .total-input {
    width: 60px;
    font-size: 0.8rem;
    padding: 0.15rem;
  }
  
  .discrepancia-alert {
    padding: 0.4rem;
    gap: 0.3rem;
    margin-bottom: 0.5rem;
  }
  
  .alert-icon {
    font-size: 0.75rem;
  }
  
  .alert-row {
    font-size: 0.45rem;
  }
  
  .alert-label {
    font-size: 0.4rem;
  }
  
  .alert-value {
    font-size: 0.5rem;
  }
  
  .alert-diff {
    font-size: 0.5rem;
  }
  
  .productos-header {
    padding-bottom: 0.3rem;
    margin-bottom: 0.3rem;
  }
  
  .prod-title {
    font-size: 0.55rem;
  }
  
  .prod-count {
    min-width: 12px;
    height: 12px;
    font-size: 0.4rem;
  }
  
  .btn-clear-all {
    padding: 0.12rem 0.25rem;
    font-size: 0.45rem;
  }
  
  .agregar-producto-section {
    padding: 0.4rem;
    margin-bottom: 0.4rem;
  }
  
  .agregar-input {
    font-size: 0.6rem;
    padding: 0.25rem 0.3rem;
  }
  
  .agregar-search-icon {
    width: 11px;
    height: 11px;
  }
  
  .agregar-resultado {
    padding: 0.2rem 0.3rem;
  }
  
  .agregar-prod-name {
    font-size: 0.58rem;
  }
  
  .agregar-prod-price {
    font-size: 0.58rem;
  }
  
  .agregar-badge-gramaje {
    font-size: 0.4rem;
    padding: 0.06rem 0.18rem;
  }
  
  .productos-list {
    gap: 0.2rem;
  }
  
  .producto-item {
    padding: 0.4rem;
  }
  
  .prod-info {
    gap: 0.2rem;
  }
  
  .prod-name {
    font-size: 0.6rem;
  }
  
  .prod-meta {
    gap: 0.15rem;
  }
  
  .prod-qty {
    font-size: 0.5rem;
    padding: 0.1rem 0.25rem;
  }
  
  .prod-subtotal {
    font-size: 0.6rem;
  }
  
  .prod-actions {
    gap: 0.12rem;
  }
  
  .btn-action {
    padding: 0.15rem 0.3rem;
    font-size: 0.48rem;
  }
  
  .btn-action svg {
    width: 8px;
    height: 8px;
  }
  
  .edit-controls {
    gap: 0.12rem;
  }
  
  .edit-label {
    font-size: 0.45rem;
  }
  
  .edit-qty,
  .edit-price {
    width: 45px;
    padding: 0.12rem;
    font-size: 0.52rem;
  }
  
  .btn-ok,
  .btn-x {
    padding: 0.15rem 0.35rem;
    font-size: 0.48rem;
  }
  
  .btn-ok svg,
  .btn-x svg {
    width: 8px;
    height: 8px;
  }
  
  .btn-label {
    display: none;
  }
  
  .method-badge {
    font-size: 0.6rem !important;
    padding: 0.12rem 0.35rem;
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
  gap: 10px;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  border: 1px solid;
  animation: toastPop 0.3s ease-out;
}

.toast-ok {
  background: #1a4d2e;
  color: #ffffff;
  border-color: #4ade80;
}

.toast-error {
  background: #4d1a1a;
  color: #ffffff;
  border-color: #f87171;
}

.toast-info {
  background: #1a2f4d;
  color: #ffffff;
  border-color: #60a5fa;
}

.toast-icon {
  font-size: 1.1rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.ticket-items-list {
  position: relative;
}

.zelda-sprites-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  overflow: hidden;
}

.link-sprite {
  position: absolute;
  bottom: 8%;
  width: 90px;
  height: 65px;
  animation: linkWalk 12s linear infinite;
  opacity: 0;
  animation-fill-mode: forwards;
  animation-delay: 3s;
}

.link-frame {
  position: absolute;
  inset: 0;
  image-rendering: pixelated;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  animation: linkSwing 0.8s steps(1) infinite;
}

.frame1 {
  background-image: url('@/assets/img/1.png');
  background-size: 90px 65px;
}

.frame2 {
  background-image: url('@/assets/img/2.png');
  background-size: 50px 65px;
  animation: linkSwing2 0.8s steps(1) infinite;
}

.octo-sprite {
  position: absolute;
  bottom: 8%;
  left: -50px;
  width: 50px;
  height: 50px;
  animation: octoWalk 12s linear infinite;
}

.octo-frame {
  position: absolute;
  inset: 0;
  image-rendering: pixelated;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  animation: octoSwing 0.6s steps(1) infinite;
}

.octo-sprite .frame1 {
  background-image: url('@/assets/img/octo1.png');
  background-size: 50px 50px;
}

.octo-sprite .frame2 {
  background-image: url('@/assets/img/octo2.png');
  background-size: 50px 50px;
  animation: octoSwing2 0.6s steps(1) infinite;
}

@media (max-width: 768px) {
  .link-sprite {
    animation-delay: 5s;
  }
}

/* PROVEEDORES Y PEDIDOS MODAL */
.proveedores-pedidos-modal {
  max-width: 600px;
  width: 95%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.pp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.pp-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.pp-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.pp-tab {
  flex: 1;
  padding: 0.5rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.pp-tab.active {
  background: var(--accent-color);
  color: var(--bg-primary);
  border-color: var(--accent-color);
}

.pp-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
  position: relative;
}

.pp-section {
  min-height: 200px;
}

.pp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.pp-views {
  display: flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.pp-vbtn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.8rem;
  line-height: 1;
}

.pp-vbtn.on { background: var(--accent-color); color: var(--bg-primary); }
.pp-vbtn:hover:not(.on) { background: var(--bg-panel); }

.pp-btn-add {
  padding: 0.5rem 1rem;
  background: var(--success-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.85rem;
}

.pp-empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-style: italic;
}

.pp-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pp-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.pp-item-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, black));
  color: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1rem;
  flex-shrink: 0;
}

.pp-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.pp-item-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.pp-item-detail {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.pp-item-actions {
  display: flex;
  gap: 0.3rem;
}

.pp-btn-sm {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-panel);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.pp-btn-sm:hover {
  transform: scale(1.1);
}

.pp-btn-del:hover {
  border-color: var(--error-color);
  background: color-mix(in srgb, var(--error-color) 15%, var(--bg-panel));
}

.pp-btn-ok:hover {
  border-color: var(--success-color);
  background: color-mix(in srgb, var(--success-color) 15%, var(--bg-panel));
}

.pp-pedido {
  flex-wrap: wrap;
}

.pp-pedido-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.pp-pedido-prov {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.pp-pedido-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.pp-pedido-total {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--accent-color);
  font-family: monospace;
}

/* GRID */
.pp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.6rem;
}

.pp-card {
  position: relative;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  transition: all 0.2s;
}

.pp-card:hover {
  border-color: rgba(255, 215, 0, 0.25);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.pp-card-avatar {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, black));
  color: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.2rem;
  align-self: center;
}

.pp-card-name {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  line-height: 1.2;
  min-height: 1.2em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pp-card-details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.3rem;
  background: var(--bg-panel);
  border-radius: 6px;
}

.pp-card-detail {
  font-size: 0.7rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pp-card-actions {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.1rem;
}

.pp-card-btn {
  flex: 1;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-panel);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.pp-card-btn:hover {
  transform: scale(1.05);
}

.pp-card-btn-del:hover {
  border-color: var(--error-color);
  background: color-mix(in srgb, var(--error-color) 15%, var(--bg-panel));
}

.pp-card-btn-ok:hover {
  border-color: var(--success-color);
  background: color-mix(in srgb, var(--success-color) 15%, var(--bg-panel));
}

/* Pedido cards */
.pp-pedido-card .pp-pedido-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pp-pedido-card-prov {
  font-weight: 700;
  font-size: 0.8rem;
  color: var(--text-primary);
}

.pp-pedido-card-total {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-color);
  font-family: monospace;
}

.pp-pedido-card-details {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.pp-pedido-card-date,
.pp-pedido-card-apartado {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.pp-pedido-card-actions {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.1rem;
}

/* SUGERIDO */
.pp-section-sugerido {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sugerido-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  width: 100%;
}

.pp-select-periodo {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.85rem;
}

.sugerido-loading {
  text-align: center;
  padding: 2rem;
  color: var(--accent-color);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.sugerido-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sugerido-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.pp-btn-crear-pedido {
  background: var(--accent-color);
  color: var(--bg-primary);
  padding: 0.4rem 0.75rem;
  width: auto;
  height: auto;
  font-size: 0.8rem;
  border-radius: 6px;
}

.pp-btn-crear-pedido:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sugerido-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 450px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.sugerido-card {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.sugerido-card:hover {
  border-color: var(--accent-color);
  box-shadow: 0 2px 12px rgba(201, 146, 52, 0.15);
}

.sugerido-card.selected {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 8%, var(--bg-secondary));
}

.sugerido-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.sugerido-card-check {
  flex-shrink: 0;
}

.check-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: transparent;
  transition: all 0.15s;
}

.sugerido-card.selected .check-box {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: var(--bg-primary);
}

.sugerido-card-title {
  flex: 1;
  min-width: 0;
}

.sugerido-card-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sugerido-card-badges {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.25rem;
  flex-wrap: wrap;
}

.badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-cat {
  background: color-mix(in srgb, var(--accent-color) 15%, transparent);
  color: var(--accent-color);
}

.badge-sub {
  background: color-mix(in srgb, #6366f1 15%, transparent);
  color: #818cf8;
}

.badge-gramaje {
  background: color-mix(in srgb, #10b981 15%, transparent);
  color: #34d399;
}

.sugerido-card-alert {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
  padding: 0.3rem 0.6rem;
  background: color-mix(in srgb, #e74c3c 12%, transparent);
  border-radius: 6px;
}

.alert-icon {
  font-size: 0.85rem;
}

.alert-text {
  font-size: 0.7rem;
  color: #e74c3c;
  font-weight: 600;
  white-space: nowrap;
}

.sugerido-card-body {
  padding: 0.75rem 1rem;
}

.info-group {
  margin-bottom: 0.5rem;
}

.info-group:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  font-weight: 700;
  margin-bottom: 0.4rem;
}

.info-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 80px;
}

.info-item-label {
  font-size: 0.65rem;
  color: var(--text-secondary);
}

.info-item-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: monospace;
}

.info-item-value.highlight {
  color: var(--accent-color);
}

.info-item-value.critical {
  color: #e74c3c;
}

.info-item-value.low {
  color: #e6a817;
}

.info-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.5rem 0;
}

.suggestion-row {
  gap: 1.25rem;
}

.suggestion-item {
  padding: 0.4rem 0.6rem;
  background: var(--bg-panel);
  border-radius: 8px;
  flex: none;
}

.suggest-qty {
  color: #34d399 !important;
  font-size: 1rem !important;
}

.suggest-cost {
  color: var(--accent-color) !important;
  font-size: 0.95rem !important;
}

.sugerido-total-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-panel);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.sugerido-total-bar strong {
  color: var(--accent-color);
  font-size: 1rem;
  font-family: monospace;
}

/* FORM OVERLAY */
.pp-form-overlay {
  position: absolute;
  inset: 0;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 10;
  border-radius: 16px;
}

.pp-form-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
}

.pp-form-card h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

.pp-form-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pp-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.pp-field-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pp-input {
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.pp-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.pp-textarea {
  resize: vertical;
  min-height: 60px;
}

.pp-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.pp-form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: flex-end;
}

.pp-btn-cancel {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-panel);
  color: var(--text-primary);
  cursor: pointer;
  font-weight: 600;
}

.pp-btn-save {
  padding: 0.5rem 1.2rem;
  background: var(--accent-color);
  color: var(--bg-primary);
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

.pp-form-card-pedido {
  max-width: 500px;
}

.pp-product-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.pp-product-section h5 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.pp-product-search-wrap {
  display: flex;
  gap: 0.4rem;
  align-items: flex-start;
}

.pp-search-wrapper {
  flex: 1;
  position: relative;
}

.pp-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 100;
  margin-top: 4px;
}

.pp-dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
}

.pp-dropdown-item:last-child {
  border-bottom: none;
}

.pp-dropdown-item:hover {
  background: var(--bg-secondary);
}

.pp-dropdown-name {
  font-weight: 500;
  font-size: 0.8rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pp-dropdown-price {
  font-size: 0.8rem;
  color: var(--accent-color);
  font-weight: 600;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.pp-qty {
  width: 55px;
  text-align: center;
}

.pp-price {
  width: 70px;
  text-align: center;
}

.pp-btn-add-prod {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--success-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  flex-shrink: 0;
}

.pp-detalle-list {
  margin-top: 0.75rem;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.pp-detalle-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.8rem;
}

.pp-detalle-row:last-child {
  border-bottom: none;
}

.pp-detalle-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.pp-detalle-qty {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.pp-detalle-sub {
  font-weight: 700;
  color: var(--accent-color);
  font-family: monospace;
  flex-shrink: 0;
}

.pp-btn-remove {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--error-color);
  border-radius: 4px;
  background: transparent;
  color: var(--error-color);
  cursor: pointer;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.pp-btn-remove:hover {
  background: var(--error-color);
  color: white;
}

.pp-detalle-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.6rem;
  background: var(--bg-panel);
  border-radius: 0 0 8px 8px;
  font-size: 0.85rem;
}

.pp-detalle-total strong {
  color: var(--accent-color);
  font-family: monospace;
  font-size: 1rem;
}

@media (max-width: 768px) {
  .proveedores-pedidos-modal {
    max-width: 100%;
    max-height: 95vh;
  }
}
</style>