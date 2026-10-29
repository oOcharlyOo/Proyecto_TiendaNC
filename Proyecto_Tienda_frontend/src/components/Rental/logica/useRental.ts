import { ref, computed, onMounted, onUnmounted } from 'vue';
import Swal from 'sweetalert2';

export type ProductoCombo = {
  idProducto: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
};

export type Opcion = {
  id?: number;
  nombre: string;
  minutos: number;
  precio: number;
  productosIncluidos: ProductoCombo[];
};

export type Estacion = {
  id: number;
  idProducto: number;
  nombreProducto: string;
  imagenProducto: string | null;
  tiempoTotal: number;
  inicioTimestamp: number;
  status: 'disponible' | 'activo' | 'terminado';
  ticket: TicketItem[];
  opciones: Opcion[];
  notificado: boolean;
};

export type TicketItem = {
  nombre: string;
  precio: number;
};

export type ProductoDTO = {
  idProducto: number;
  nombre: string;
  stock: number;
  precio_venta: number;
  imagen_url?: string;
  idCategoria?: number;
};

type ApiRespuesta<T> = {
  codigo: number;
  mensaje: string;
  datos: T;
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';
const STORAGE_KEY = 'rental_estaciones';
const TICKER_KEY = 'rental_ticker';

const productosInventario = ref<ProductoDTO[]>([]);
const estaciones = ref<Estacion[]>([]);
const categorias = ref<{ idCategoria: number; nombre: string }[]>([]);

const gamingCategoryId = computed(() => {
  const cat = categorias.value.find(c => c.nombre === 'Gaming' || c.nombre === 'gaming');
  return cat ? cat.idCategoria : null;
});

const productosDisponibles = computed(() => {
  const gamingId = gamingCategoryId.value;
  return productosInventario.value.filter(p => p.idCategoria === gamingId);
});

const ticker = ref(0);

const mostrarModalSeleccionarProducto = ref(false);
const mostrarModalEditarOpciones = ref(false);
const estacionEditando = ref<Estacion | null>(null);
const opcionEditando = ref<Opcion | null>(null);
const mostrarModalAgregarProducto = ref(false);
const opcionProductoSeleccionado = ref<ProductoDTO | null>(null);
const opcionProductoCantidad = ref(1);
const buscarProductoModal = ref('');

const productosFiltradosModal = computed(() => {
  const query = buscarProductoModal.value.toLowerCase().trim();
  if (!query) return productosDisponibles.value;
  return productosDisponibles.value.filter(p =>
    p.nombre.toLowerCase().includes(query)
  );
});

const intervalId = ref<number | null>(null);

function formatTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatoMoneda(valor: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
}

function getStationTotal(station: Estacion): number {
  return station.ticket.reduce((sum, item) => sum + item.precio, 0);
}

function getTiempoRestante(station: Estacion): number {
  if (station.status !== 'activo') return station.tiempoTotal;
  const ahora = Date.now();
  const transcurrido = Math.floor((ahora - station.inicioTimestamp) / 1000);
  return Math.max(0, station.tiempoTotal - transcurrido);
}

function getStationBorderClass(station: Estacion): string {
  if (station.status === 'terminado') return 'station-terminado';
  if (station.status === 'activo') return 'station-activo';
  return 'station-disponible';
}

function getStatusBadgeClass(station: Estacion): string {
  if (station.status === 'activo') return 'status-activo';
  if (station.status === 'terminado') return 'status-terminado';
  return 'status-disponible';
}

function getTimerColorClass(station: Estacion): string {
  if (station.status === 'disponible') return 'timer-disponible';
  if (station.status === 'terminado') return 'timer-terminado';
  if (getTiempoRestante(station) <= 300) return 'timer-warning';
  return 'timer-activo';
}

function getIconoTipo(tipo: string): string {
  const iconos: Record<string, string> = {
    ps3: '🎮', ps4: '🎮', ps5: '🎮', switch: '🎮', xbox: '🎮', arcade: '🕹️'
  };
  return iconos[tipo] || '🎮';
}

function guardarEnStorage() {
  ticker.value++;
  const datos = estaciones.value.map(e => ({
    id: e.id,
    idProducto: e.idProducto,
    nombreProducto: e.nombreProducto,
    imagenProducto: e.imagenProducto,
    tiempoTotal: e.tiempoTotal,
    inicioTimestamp: e.inicioTimestamp,
    status: e.status,
    ticket: e.ticket,
    opciones: e.opciones,
    notificado: e.notificado
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
}

function cargarDesdeStorage(): boolean {
  const datos = localStorage.getItem(STORAGE_KEY);
  if (!datos) return false;

  try {
    const datosGuardados = JSON.parse(datos);
    const ahora = Date.now();
    estaciones.value = datosGuardados.map((saved: any) => {
      let status = saved.status || 'disponible';
      let notificado = saved.notificado || false;
      const tiempoTotal = saved.tiempoTotal || 0;
      const inicioTimestamp = saved.inicioTimestamp || 0;

      if (status === 'activo' && inicioTimestamp > 0) {
        const transcurrido = Math.floor((ahora - inicioTimestamp) / 1000);
        const tiempoRestante = tiempoTotal - transcurrido;
        if (tiempoRestante <= 0) {
          status = 'terminado';
          if (!notificado) {
            notificado = true;
            mostrarNotificacion({
              id: saved.id,
              idProducto: saved.idProducto,
              nombreProducto: saved.nombreProducto,
              imagenProducto: saved.imagenProducto,
              tiempoTotal,
              inicioTimestamp,
              status: 'terminado',
              ticket: saved.ticket || [],
              opciones: saved.opciones || [],
              notificado: true
            });
          }
        }
      }

      return {
        id: saved.id,
        idProducto: saved.idProducto,
        nombreProducto: saved.nombreProducto,
        imagenProducto: saved.imagenProducto,
        tiempoTotal: tiempoTotal,
        inicioTimestamp: inicioTimestamp,
        status: status,
        ticket: saved.ticket || [],
        opciones: saved.opciones || [],
        notificado: notificado
      };
    });
    guardarEnStorage();
    return true;
  } catch (e) {
    console.error('Error al cargar:', e);
    return false;
  }
}

async function cargarProductos() {
  try {
    const response = await fetch(`${API_BASE}/productos/listarProductos`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const res: ApiRespuesta<ProductoDTO[]> = await response.json();
    if (res?.datos) {
      productosInventario.value = res.datos;
    }
  } catch (error) {
    console.error('Error cargando productos:', error);
  }
}

async function cargarCategorias() {
  try {
    const response = await fetch(`${API_BASE}/categorias/listarCategorias`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const res: ApiRespuesta<{ idCategoria: number; nombre: string }[]> = await response.json();
    if (res?.datos) {
      categorias.value = res.datos;
    }
  } catch (error) {
    console.error('Error cargando categorías:', error);
  }
}

async function solicitarPermisoNotificaciones() {
  return true;
}

function mostrarNotificacion(station: Estacion) {
  Swal.fire({
    toast: true,
    position: 'center',
    icon: 'warning',
    title: '⏱️ Tiempo Agotado',
    text: `El tiempo de ${station.nombreProducto} ha terminado`,
    showConfirmButton: true,
    confirmButtonText: 'Aceptar',
    confirmButtonColor: 'var(--border-color)',
    background: 'var(--bg-panel)',
    color: 'var(--text-primary)',
    timer: undefined,
    customClass: {
      popup: 'swal2-popup-papyrus'
    }
  });
}

function iniciarTemporizador() {
  if (intervalId.value !== null) return;

  intervalId.value = window.setInterval(() => {
    let cambio = false;
    const ahora = Date.now();

    for (const station of estaciones.value) {
      if (station.status === 'activo' && station.inicioTimestamp > 0) {
        const transcurrido = Math.floor((ahora - station.inicioTimestamp) / 1000);
        const tiempoRestante = station.tiempoTotal - transcurrido;

        if (tiempoRestante <= 0 && !station.notificado) {
          station.status = 'terminado';
          station.notificado = true;
          cambio = true;
          mostrarNotificacion(station);
        } else if (tiempoRestante > 0) {
          cambio = true;
        }
      }
    }

    if (cambio) guardarEnStorage();
  }, 1000);
}

function agregarTiempo(station: Estacion, minutos: number, precio: number, nombreOpcion: string) {
  const segundosAgregados = minutos * 60;
  const ahora = Date.now();

  if (station.status === 'disponible' || station.status === 'terminado') {
    station.tiempoTotal = segundosAgregados;
    station.inicioTimestamp = ahora;
    station.status = 'activo';
    station.notificado = false;
    station.ticket = [];
    station.ticket.push({ nombre: nombreOpcion, precio });
  } else {
    station.tiempoTotal += segundosAgregados;
    station.ticket.push({ nombre: nombreOpcion, precio });
  }

  iniciarTemporizador();
  guardarEnStorage();
}

async function registrarVentaEnAPI(station: Estacion, metodoPago: string = 'EFECTIVO') {
  const total = getStationTotal(station);
  if (total <= 0) return;

  try {
    const payloadVenta = {
      idUsuario: 1,
      montoTotal: 0,
      estatus: 'P',
      metodoPago: 'EFECTIVO',
      numeroTicket: 0
    };

    const responseVenta = await fetch(`${API_BASE}/ventas/agregarVenta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadVenta)
    });

    if (!responseVenta.ok) {
      const errorText = await responseVenta.text();
      console.error('Error al crear venta:', responseVenta.status, errorText);
      return;
    }

    const dataVenta = await responseVenta.json();

    if (dataVenta?.codigo !== 200 || !dataVenta?.datos) {
      console.error('Error al crear venta:', dataVenta?.mensaje);
      return;
    }

    const idVenta = dataVenta.datos.idVenta;

    for (const item of station.ticket) {
      const payloadDetalle = {
        Venta: { idVenta },
        Producto: { idProducto: station.idProducto, nombre: station.nombreProducto, precio_venta: item.precio, codigoBarras: '' },
        cantidad: 1,
        precioUnitarioVenta: item.precio,
        tipoPrecioAplicado: 'VENTA'
      };

      await fetch(`${API_BASE}/ventasDetalle/agregarVentaDetalle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadDetalle)
      });
    }

    await fetch(`${API_BASE}/ventas/completarVenta/${idVenta}?montoTotal=${total}&metodoPago=${metodoPago}`, {
      method: 'PUT'
    });
  } catch (error) {
    console.error('Error al guardar venta:', error);
  }
}

async function cobrar(station: Estacion, metodoPago: string = 'EFECTIVO') {
  const total = getStationTotal(station);
  if (total > 0) {
    const result = await Swal.fire({
      toast: true,
      position: 'center',
      icon: 'question',
      title: 'Confirmar Cobro',
      text: `¿Confirmar cobro de ${formatoMoneda(total)} para ${station.nombreProducto}?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cobrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--accent-color)',
      cancelButtonColor: 'var(--error-color)',
      background: 'var(--bg-panel)',
      color: 'var(--text-primary)',
      customClass: {
        popup: 'swal2-popup-papyrus'
      }
    });
    if (!result.isConfirmed) return;
    await registrarVentaEnAPI(station, metodoPago);
  }

  if (intervalId.value !== null) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }

  station.tiempoTotal = 0;
  station.inicioTimestamp = 0;
  station.status = 'disponible';
  station.ticket = [];
  station.notificado = false;
  guardarEnStorage();
}

async function cancelarTemporizador(station: Estacion) {
  const result = await Swal.fire({
    toast: true,
    position: 'center',
    icon: 'warning',
    title: 'Cancelar Temporizador',
    text: `¿Cancelar el temporizador de ${station.nombreProducto}? No se registrará ninguna venta.`,
    showCancelButton: true,
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'No',
    confirmButtonColor: 'var(--error-color)',
    cancelButtonColor: 'var(--accent-color)',
    background: 'var(--bg-panel)',
    color: 'var(--text-primary)',
    customClass: {
      popup: 'swal2-popup-papyrus'
    }
  });
  if (!result.isConfirmed) return;

  if (intervalId.value !== null) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }

  station.tiempoTotal = 0;
  station.inicioTimestamp = 0;
  station.status = 'disponible';
  station.ticket = [];
  station.notificado = false;
  guardarEnStorage();
}

function abrirModalSeleccionarProducto() {
  buscarProductoModal.value = '';
  mostrarModalSeleccionarProducto.value = true;
}

function crearEstacionDesdeProducto(producto: ProductoDTO) {
  estaciones.value.push({
    id: Date.now(),
    idProducto: producto.idProducto,
    nombreProducto: producto.nombre,
    imagenProducto: producto.imagen_url || null,
    tiempoTotal: 0,
    inicioTimestamp: 0,
    status: 'disponible',
    ticket: [],
    opciones: [],
    notificado: false
  });

  mostrarModalSeleccionarProducto.value = false;
  guardarEnStorage();
}

function abrirEditarOpciones(station: Estacion) {
  estacionEditando.value = station;
  mostrarModalEditarOpciones.value = true;
}

function guardarOpciones() {
  guardarEnStorage();
  mostrarModalEditarOpciones.value = false;
  estacionEditando.value = null;
}

function agregarOpcion() {
  if (!estacionEditando.value) return;
  estacionEditando.value.opciones.push({
    nombre: '+ 30 Min',
    minutos: 30,
    precio: 20,
    productosIncluidos: []
  });
  guardarEnStorage();
}

function eliminarOpcion(idx: number) {
  if (!estacionEditando.value) return;
  estacionEditando.value.opciones.splice(idx, 1);
  guardarEnStorage();
}

function abrirAgregarProducto(opcion: Opcion) {
  opcionEditando.value = opcion;
  opcionProductoSeleccionado.value = null;
  opcionProductoCantidad.value = 1;
  mostrarModalAgregarProducto.value = true;
}

function agregarProductoAOpcion() {
  if (!opcionEditando.value || !opcionProductoSeleccionado.value) return;

  const existente = opcionEditando.value.productosIncluidos.find(
    p => p.idProducto === opcionProductoSeleccionado.value!.idProducto
  );

  if (existente) {
    existente.cantidad += opcionProductoCantidad.value;
  } else {
    opcionEditando.value.productosIncluidos.push({
      idProducto: opcionProductoSeleccionado.value.idProducto,
      nombre: opcionProductoSeleccionado.value.nombre,
      cantidad: opcionProductoCantidad.value,
      precioUnitario: Number(opcionProductoSeleccionado.value.precio_venta) || 0
    });
  }

  opcionProductoSeleccionado.value = null;
  opcionProductoCantidad.value = 1;
  guardarEnStorage();
}

function eliminarProductoDeOpcion(opcion: Opcion, idx: number) {
  opcion.productosIncluidos.splice(idx, 1);
  guardarEnStorage();
}

function eliminarEstacion(id: number) {
  const idx = estaciones.value.findIndex(e => e.id === id);
  if (idx !== -1) {
    estaciones.value.splice(idx, 1);
    if (estaciones.value.every(e => e.status !== 'activo')) {
      if (intervalId.value !== null) {
        clearInterval(intervalId.value);
        intervalId.value = null;
      }
    }
    guardarEnStorage();
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    ticker.value++;
    cargarDesdeStorage();
  }
}

export function useRental() {

  onMounted(async () => {
    await cargarCategorias();
    await cargarProductos();
    await solicitarPermisoNotificaciones();
    cargarDesdeStorage();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const hayActivas = estaciones.value.some(e => e.status === 'activo');
    if (hayActivas) iniciarTemporizador();
  });

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  return {
    estaciones, ticker, productosDisponibles, categorias,
    mostrarModalSeleccionarProducto, mostrarModalEditarOpciones,
    estacionEditando, opcionEditando,
    mostrarModalAgregarProducto, opcionProductoSeleccionado,
    opcionProductoCantidad, buscarProductoModal, productosFiltradosModal,
    formatTime, formatoMoneda, getStationTotal, getTiempoRestante,
    getStationBorderClass, getStatusBadgeClass, getTimerColorClass, getIconoTipo,
    cargarProductos, cargarCategorias,
    abrirModalSeleccionarProducto, crearEstacionDesdeProducto,
    abrirEditarOpciones, guardarOpciones, agregarOpcion, eliminarOpcion,
    abrirAgregarProducto, agregarProductoAOpcion, eliminarProductoDeOpcion,
    agregarTiempo, cobrar, cancelarTemporizador, eliminarEstacion
  };
}