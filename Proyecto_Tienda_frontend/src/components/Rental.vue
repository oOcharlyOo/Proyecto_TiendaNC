<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Swal from 'sweetalert2';
import { useTheme } from '@/composables/useTheme';

const { currentTheme } = useTheme();

type ProductoCombo = {
  idProducto: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
};

type Opcion = {
  id?: number;
  nombre: string;
  minutos: number;
  precio: number;
  productosIncluidos: ProductoCombo[];
};

type Estacion = {
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

type TicketItem = {
  nombre: string;
  precio: number;
};

type ProductoDTO = {
  idProducto: number;
  nombre: string;
  stock: number;
  precio_venta: number;
  imagen_url?: string;
  idCategoria?: number;
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';
const STORAGE_KEY = 'rental_estaciones';
const TICKER_KEY = 'rental_ticker';

type ApiRespuesta<T> = {
  codigo: number;
  mensaje: string;
  datos: T;
};

const productosInventario = ref<ProductoDTO[]>([]);
const estaciones = ref<Estacion[]>([]);
const productosDisponibles = computed(() => productosInventario.value.filter(p => Number(p.stock) > 0 && Number(p.idCategoria) === 7));
const ticker = ref(0);

const formatTime = (seconds: number): string => {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatoMoneda = (valor: number): string => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
};

const getStationTotal = (station: Estacion): number => {
  return station.ticket.reduce((sum, item) => sum + item.precio, 0);
};

const getTiempoRestante = (station: Estacion): number => {
  if (station.status !== 'activo') return station.tiempoTotal;
  const ahora = Date.now();
  const transcurrido = Math.floor((ahora - station.inicioTimestamp) / 1000);
  return Math.max(0, station.tiempoTotal - transcurrido);
};

const guardarEnStorage = () => {
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
};

const cargarDesdeStorage = () => {
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
};

const cargarProductos = async () => {
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
};

const solicitarPermisoNotificaciones = async () => {
  return true;
};

const mostrarNotificacion = (station: Estacion) => {
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
};

const intervalId = ref<number | null>(null);

const iniciarTemporizador = () => {
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
};

const agregarTiempo = (station: Estacion, minutos: number, precio: number, nombreOpcion: string) => {
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
};

const registrarVentaEnAPI = async (station: Estacion, metodoPago: string = 'EFECTIVO') => {
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
};

const cobrar = async (station: Estacion, metodoPago: string = 'EFECTIVO') => {
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
};

const cancelarTemporizador = async (station: Estacion) => {
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
};

const getStationBorderClass = (station: Estacion): string => {
  if (station.status === 'terminado') return 'station-terminado';
  if (station.status === 'activo') return 'station-activo';
  return 'station-disponible';
};

const getStatusBadgeClass = (station: Estacion): string => {
  if (station.status === 'activo') return 'status-activo';
  if (station.status === 'terminado') return 'status-terminado';
  return 'status-disponible';
};

const getTimerColorClass = (station: Estacion): string => {
  if (station.status === 'disponible') return 'timer-disponible';
  if (station.status === 'terminado') return 'timer-terminado';
  if (getTiempoRestante(station) <= 300) return 'timer-warning';
  return 'timer-activo';
};

const getIconoTipo = (tipo: string): string => {
  const iconos: Record<string, string> = {
    ps3: '🎮', ps4: '🎮', ps5: '🎮', switch: '🎮', xbox: '🎮', arcade: '🕹️'
  };
  return iconos[tipo] || '🎮';
};

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

const abrirModalSeleccionarProducto = () => {
  buscarProductoModal.value = '';
  mostrarModalSeleccionarProducto.value = true;
};

const crearEstacionDesdeProducto = (producto: ProductoDTO) => {
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
};

const abrirEditarOpciones = (station: Estacion) => {
  estacionEditando.value = station;
  mostrarModalEditarOpciones.value = true;
};

const guardarOpciones = () => {
  guardarEnStorage();
  mostrarModalEditarOpciones.value = false;
  estacionEditando.value = null;
};

const agregarOpcion = () => {
  if (!estacionEditando.value) return;
  estacionEditando.value.opciones.push({
    nombre: '+ 30 Min',
    minutos: 30,
    precio: 20,
    productosIncluidos: []
  });
  guardarEnStorage();
};

const eliminarOpcion = (idx: number) => {
  if (!estacionEditando.value) return;
  estacionEditando.value.opciones.splice(idx, 1);
  guardarEnStorage();
};

const abrirAgregarProducto = (opcion: Opcion) => {
  opcionEditando.value = opcion;
  opcionProductoSeleccionado.value = null;
  opcionProductoCantidad.value = 1;
  mostrarModalAgregarProducto.value = true;
};

const agregarProductoAOpcion = () => {
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
};

const eliminarProductoDeOpcion = (opcion: Opcion, idx: number) => {
  opcion.productosIncluidos.splice(idx, 1);
  guardarEnStorage();
};

const eliminarEstacion = (id: number) => {
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
};

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    ticker.value++;
    cargarDesdeStorage();
  }
};

onMounted(async () => {
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
</script>

<template>
  <div class="rental-container">
    <header class="rental-header">
      <div class="header-content">
        <h1 class="zelda-title">⏱️ SALA DEL TIEMPO</h1>
        <p class="zelda-subtitle">Alquila tu destino</p>
      </div>
    </header>

    <main class="rental-main">
      <section class="crear-estacion-section">
        <button class="btn-grande-crear" @click="abrirModalSeleccionarProducto">
          <span class="btn-icono">➕</span>
          <span class="btn-texto">Crear Estación</span>
        </button>
      </section>

      <section v-if="estaciones.length > 0" class="estaciones-section">
        <h2 class="section-title">🎮 Estaciones Activas</h2>
        <div class="estaciones-grid">
          <div 
            v-for="station in estaciones" 
            :key="`${station.id}-${ticker}`"
            class="station-card"
            :class="getStationBorderClass(station)"
          >
            <div class="card-papiro">
              <div class="station-header">
                <div class="station-title">
                  <span class="station-icon">🎮</span>
                  <h2>{{ station.nombreProducto }}</h2>
                </div>
                <div class="station-actions">
                  <span class="status-badge" :class="getStatusBadgeClass(station)">
                    {{ station.status.toUpperCase() }}
                  </span>
                  <button class="btn-config" @click="abrirEditarOpciones(station)" title="Configurar">⚙️</button>
                  <button v-if="station.status === 'disponible'" class="btn-delete" @click="eliminarEstacion(station.id)" title="Eliminar">🗑️</button>
                </div>
              </div>

              <div class="station-timer">
                <div class="timer-display" :class="getTimerColorClass(station)">
                  {{ formatTime(getTiempoRestante(station)) }}
                </div>
                <p v-if="station.status === 'activo' && getTiempoRestante(station) <= 300" class="timer-warning">
                  ¡Tiempo por terminar!
                </p>
              </div>

              <div class="station-options">
                <button 
                  v-for="opt in station.opciones"
                  :key="opt.id || opt.nombre"
                  class="option-btn"
                  @click="agregarTiempo(station, opt.minutos, opt.precio, opt.nombre)"
                >
                  <span class="option-nombre">{{ opt.nombre }}</span>
                  <span class="option-precio">{{ formatoMoneda(opt.precio) }}</span>
                  <span v-if="opt.productosIncluidos.length > 0" class="option-combo-badge">+{{ opt.productosIncluidos.length }}</span>
                </button>
                <p v-if="station.opciones.length === 0" class="no-opciones">
                  Sin opciones configuradas
                </p>
              </div>

              <div class="ticket-panel">
                <h3 class="ticket-title">📜 Ticket</h3>
                <div v-if="station.ticket.length === 0" class="ticket-empty">
                  Sin cargos
                </div>
                <ul v-else class="ticket-list">
                  <li v-for="(item, idx) in station.ticket" :key="idx" class="ticket-item">
                    <span>⚔️ {{ item.nombre }}</span>
                    <span class="ticket-price">{{ formatoMoneda(item.precio) }}</span>
                  </li>
                </ul>
              </div>

              <div class="station-footer">
                <div class="station-total">
                  Total: <span class="total-value">{{ formatoMoneda(getStationTotal(station)) }}</span>
                </div>
                <div class="station-footer-buttons">
                  <button 
                    v-if="station.status === 'activo' || station.status === 'terminado'"
                    class="btn-cancelar-timer"
                    @click="cancelarTemporizador(station)"
                  >
                    ✕ Cancelar
                  </button>
                  <button 
                    class="btn-cobrar"
                    :disabled="station.ticket.length === 0"
                    @click="cobrar(station)"
                  >
                    💰 Cobrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Modal Seleccionar Producto -->
    <div v-if="mostrarModalSeleccionarProducto" class="modal-overlay" @click.self="mostrarModalSeleccionarProducto = false">
      <div class="modal-content modal-seleccionar-producto">
        <h2 class="modal-title">🎮 Seleccionar Producto</h2>
        <p class="modal-subtitle">Elige un producto para crear la estación</p>
        
        <div class="buscador-modal">
          <span class="buscador-icono">🔍</span>
          <input 
            v-model="buscarProductoModal"
            type="text"
            placeholder="Buscar producto..."
            class="buscador-input"
          />
          <button 
            v-if="buscarProductoModal" 
            class="buscador-limpiar"
            @click="buscarProductoModal = ''"
          >
            ✕
          </button>
        </div>
        
        <div class="productos-lista-modal">
          <div 
            v-for="producto in productosFiltradosModal" 
            :key="producto.idProducto"
            class="producto-item-modal"
            @click="crearEstacionDesdeProducto(producto)"
          >
            <div class="producto-imagen-modal">
              <img v-if="producto.imagen_url" :src="producto.imagen_url" :alt="producto.nombre" />
              <span v-else>📦</span>
            </div>
            <div class="producto-datos-modal">
              <span class="producto-nombre-modal">{{ producto.nombre }}</span>
              <span class="producto-stock-modal">🎮 Rentable</span>
            </div>
            <span class="producto-seleccionar-icon">→</span>
          </div>
          <div v-if="productosFiltradosModal.length === 0" class="no-resultados">
            No se encontraron productos
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancelar" @click="mostrarModalSeleccionarProducto = false">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal Editar Opciones -->
    <div v-if="mostrarModalEditarOpciones && estacionEditando" class="modal-overlay" @click.self="mostrarModalEditarOpciones = false">
      <div class="modal-content modal-opciones">
        <h2 class="modal-title">⚙️ Configurar - {{ estacionEditando.nombreProducto }}</h2>
        
        <div class="opciones-config">
          <div class="opciones-list">
            <div v-for="(opt, idx) in estacionEditando.opciones" :key="idx" class="opcion-item">
              <div class="opcion-header">
                <input v-model="opt.nombre" type="text" placeholder="Nombre opción" class="input-nombre" />
                <button class="btn-delete-opcion" @click="eliminarOpcion(idx)">🗑️</button>
              </div>
              <div class="opcion-detalles">
                <div class="input-group">
                  <label>Minutos</label>
                  <input v-model.number="opt.minutos" type="number" min="1" class="input-mini" />
                </div>
                <div class="input-group">
                  <label>Precio Total</label>
                  <input v-model.number="opt.precio" type="number" min="0" class="input-mini" />
                </div>
              </div>
              <div class="opcion-productos">
                <div class="productos-header">
                  <span>Productos incluidos:</span>
                  <button class="btn-agregar-producto" @click="abrirAgregarProducto(opt)">➕</button>
                </div>
                <ul class="productos-list">
                  <li v-for="(prod, pIdx) in opt.productosIncluidos" :key="pIdx">
                    <span>{{ prod.cantidad }}x {{ prod.nombre }}</span>
                    <button class="btn-quitar" @click="eliminarProductoDeOpcion(opt, pIdx)">✕</button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <button class="btn-agregar-opcion" @click="agregarOpcion">
            ➕ Agregar Opción de Tiempo
          </button>
        </div>

        <div class="modal-actions">
          <button class="btn-cancelar" @click="mostrarModalEditarOpciones = false">Cancelar</button>
          <button class="btn-confirmar" @click="guardarOpciones">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal Agregar Producto a Opción -->
    <div v-if="mostrarModalAgregarProducto" class="modal-overlay" @click.self="mostrarModalAgregarProducto = false">
      <div class="modal-content">
        <h2 class="modal-title">➕ Agregar Producto al Combo</h2>
        
        <div class="form-group">
          <label>Producto</label>
          <select v-model="opcionProductoSeleccionado">
            <option :value="null">-- Seleccionar --</option>
            <option v-for="p in productosDisponibles" :key="p.idProducto" :value="p">
              {{ p.nombre }} - {{ formatoMoneda(p.precio_venta) }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Cantidad</label>
          <input v-model.number="opcionProductoCantidad" type="number" min="1" />
        </div>

        <div class="modal-actions">
          <button class="btn-cancelar" @click="mostrarModalAgregarProducto = false">Cancelar</button>
          <button class="btn-confirmar" @click="agregarProductoAOpcion">Agregar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rental-container {
  min-height: 100vh;
  color: var(--text-primary);
  background: linear-gradient(180deg, var(--gradient-bg-start, var(--bg-secondary)) 0%, var(--gradient-bg-mid, var(--bg-primary)) 100%);
}

.rental-header {
  text-align: center;
  padding: 40px 20px 30px;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, transparent 100%);
  border-bottom: 3px solid var(--accent-color);
  position: relative;
}

.rental-header::before,
.rental-header::after {
  content: '✦';
  position: absolute;
  top: 20px;
  font-size: 1.5rem;
  color: var(--accent-color);
}

.rental-header::before { left: 30px; }
.rental-header::after { right: 30px; }

.header-content {
  max-width: 600px;
  margin: 0 auto;
}

.zelda-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--accent-color);
  text-shadow: 2px 2px 0 var(--border-color);
  margin: 0 0 8px;
  letter-spacing: 0.1em;
}

.zelda-subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0;
  font-style: italic;
}

.rental-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 20px;
}

.section-title {
  font-size: 1.5rem;
  color: var(--accent-color);
  text-align: center;
  margin-bottom: 8px;
}

.section-desc {
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 24px;
  font-style: italic;
}

.crear-estacion-section {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
}

.btn-grande-crear {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 80px;
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--bg-secondary) 100%);
  color: var(--text-primary);
  border: 4px solid var(--accent-color);
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
  box-shadow: 6px 6px 0 var(--border-color);
}

.btn-grande-crear:hover {
  transform: translateY(-4px);
  box-shadow: 8px 10px 0 var(--border-color);
  filter: brightness(1.1);
}

.btn-grande-crear:active {
  transform: translateY(0);
  box-shadow: 4px 4px 0 var(--border-color);
}

.btn-icono {
  font-size: 3rem;
  margin-bottom: 10px;
}

.btn-texto {
  font-size: 1.5rem;
  letter-spacing: 0.05em;
}

.productos-section {
  margin-bottom: 50px;
}

.productos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.producto-card {
  background: var(--bg-panel);
  border: 3px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 4px 4px 0 var(--shadow-color);
}

.producto-card:hover {
  transform: translateY(-4px);
  box-shadow: 6px 8px 0 var(--shadow-color);
  border-color: var(--accent-color);
}

.producto-imagen {
  width: 80px;
  height: 80px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  overflow: hidden;
}

.producto-imagen img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.producto-info h3 {
  font-size: 1rem;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.producto-stock {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.btn-crear {
  margin-top: 12px;
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--bg-secondary) 100%);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-crear:hover {
  transform: scale(1.05);
  filter: brightness(1.1);
}

.productos-lista {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.producto-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-panel);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
  transition: all 0.2s;
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.producto-item:hover {
  border-color: var(--accent-color);
  box-shadow: 4px 4px 0 var(--shadow-color);
}

.producto-info-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.producto-imagen-small {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  overflow: hidden;
  flex-shrink: 0;
}

.producto-imagen-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.producto-datos {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.producto-nombre {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--text-primary);
}

.btn-crear-estacion {
  padding: 10px 20px;
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--bg-secondary) 100%);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.9rem;
  transition: all 0.2s;
  box-shadow: 3px 3px 0 var(--border-color);
  white-space: nowrap;
}

.btn-crear-estacion:hover {
  transform: translateY(-2px);
  box-shadow: 4px 5px 0 var(--border-color);
  filter: brightness(1.1);
}

.estaciones-section {
  margin-bottom: 40px;
}

.estaciones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 30px;
}

.station-card {
  perspective: 1000px;
}

.card-papiro {
  background: var(--bg-panel);
  border: 2px solid var(--zelda-gold);
  border-radius: 8px;
  padding: 20px;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.card-papiro::before {
  display: none;
}

.station-header {
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px dashed var(--border-color);
  position: relative;
  z-index: 1;
}

.station-title {
  align-items: center;
  gap: 10px;
}

.station-icon {
  font-size: 1.8rem;
}

.station-title h2 {
  font-size: 1.3rem;
  color: var(--text-primary);
  margin: 0;
  text-shadow: 1px 1px 0 var(--accent-color);
}

.station-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: bold;
  letter-spacing: 0.05em;
}

.status-badge.status-activo {
  background: linear-gradient(135deg, #2d5016 0%, #1a3009 100%);
  color: #90ee90;
  border: 2px solid var(--accent-color);
}

.status-badge.status-terminado {
  background: linear-gradient(135deg, var(--warning-color) 0%, var(--bg-secondary) 100%);
  color: #ffb0b0;
  border: 2px solid #a03030;
  animation: pulse 1s infinite;
}

.status-badge.status-disponible {
  background: linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 100%);
  color: #c0c0c0;
  border: 2px solid #606060;
}

.btn-config, .btn-delete {
  background: var(--bg-panel);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-config:hover, .btn-delete:hover {
  background: var(--bg-panel);
  transform: scale(1.1);
  border-color: var(--zelda-gold);
}

.station-timer {
  text-align: center;
  margin: 24px 0;
  position: relative;
  z-index: 1;
}

.timer-display {
  font-size: 3.5rem;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  text-shadow: 2px 2px 0 var(--accent-color);
}

.timer-disponible { color: #a0a0a0; }
.timer-activo { color: #2d5016; }
.timer-warning { color: var(--warning-color); animation: glow 0.5s infinite; }
.timer-terminado { color: var(--warning-color); }

@keyframes glow {
  50% { text-shadow: 2px 2px 0 var(--accent-color), 0 0 20px var(--warning-color); }
}

.timer-warning {
  color: var(--warning-color);
  font-weight: bold;
  margin-top: 8px;
  font-size: 0.9rem;
}

.station-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.option-btn {
  background: linear-gradient(135deg, var(--text-primary)9f0 0%, var(--bg-panel) 100%);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
  box-shadow: 3px 3px 0 var(--shadow-color);
}

.option-btn:hover {
  transform: translateY(-2px);
  box-shadow: 5px 5px 0 var(--shadow-color);
  border-color: var(--zelda-gold);
}

.option-btn:active {
  transform: translateY(0);
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.option-nombre {
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--text-primary);
  text-align: center;
}

.option-precio {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--success-color);
}

.option-combo-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--warning-color);
  color: var(--text-primary);
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 10px;
  border: 2px solid var(--border-color);
}

.no-opciones {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--text-primary);
  font-style: italic;
  padding: 20px;
}

.ticket-panel {
  background: var(--bg-panel);
  border: 2px solid var(--accent-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.ticket-title {
  font-size: 0.9rem;
  color: var(--text-primary);
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--accent-color);
}

.ticket-empty {
  text-align: center;
  color: var(--shadow-color);
  font-style: italic;
  padding: 12px;
}

.ticket-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ticket-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dotted var(--accent-color);
  font-size: 0.9rem;
}

.ticket-item:last-child {
  border-bottom: none;
}

.ticket-price {
  font-weight: bold;
  color: #2d5016;
}

.station-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 2px dashed var(--border-color);
  position: relative;
  z-index: 1;
}

.station-total {
  font-size: 1.2rem;
  color: var(--text-primary);
}

.total-value {
  font-weight: bold;
  color: var(--success-color);
  font-size: 1.4rem;
}

.btn-cobrar {
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--accent-color) 0%, #3d6530 100%);
  color: var(--text-primary);
  border: 3px solid #2d5016;
  border-radius: 12px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 3px 3px 0 #2d5016;
}

.btn-cobrar:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 5px 5px 0 #2d5016;
}

.btn-cobrar:disabled {
  background: #a0a0a0;
  border-color: #808080;
  box-shadow: 2px 2px 0 #606060;
  cursor: not-allowed;
}

.station-footer-buttons {
  display: flex;
  gap: 10px;
}

.btn-cancelar-timer {
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--warning-color) 0%, var(--bg-secondary) 100%);
  color: var(--text-primary);
  border: 3px solid #3d0a0a;
  border-radius: 12px;
  font-weight: bold;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 3px 3px 0 #3d0a0a;
}

.btn-cancelar-timer:hover {
  transform: translateY(-2px);
  box-shadow: 5px 5px 0 #3d0a0a;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--bg-panel);
  border: 3px solid var(--accent-color);
  border-radius: 12px;
  padding: 28px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 6px 20px var(--shadow-color);
}

.modal-opciones {
  max-width: 650px;
}

.modal-seleccionar-producto {
  max-width: 600px;
}

.modal-subtitle {
  text-align: center;
  color: var(--text-primary);
  margin-bottom: 20px;
  font-style: italic;
}

.buscador-modal {
  display: flex;
  align-items: center;
  background: var(--bg-panel);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  padding: 8px 16px;
  margin-bottom: 20px;
  gap: 10px;
}

.buscador-icono {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.buscador-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1rem;
  color: var(--text-primary);
  outline: none;
}

.buscador-input::placeholder {
  color: var(--shadow-color);
}

.buscador-limpiar {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 50%;
  transition: all 0.2s;
}

.buscador-limpiar:hover {
  background: var(--bg-panel);
  color: var(--text-primary);
}

.no-resultados {
  text-align: center;
  color: var(--text-primary);
  font-style: italic;
  padding: 30px;
}

.productos-lista-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding-right: 8px;
}

.producto-item-modal {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-panel);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 3px 3px 0 var(--accent-color);
}

.producto-item-modal:hover {
  border-color: var(--accent-color);
  background: #e8f5e9;
  box-shadow: 4px 4px 0 #c4b090;
  transform: translateX(4px);
}

.producto-imagen-modal {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--bg-panel);
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  overflow: hidden;
  flex-shrink: 0;
}

.producto-imagen-modal img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.producto-datos-modal {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.producto-nombre-modal {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--text-primary);
}

.producto-stock-modal {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.producto-seleccionar-icon {
  font-size: 1.5rem;
  color: var(--accent-color);
  font-weight: bold;
}

.modal-title {
  font-size: 1.5rem;
  color: var(--accent-color);
  text-align: center;
  margin-bottom: 24px;
  text-shadow: 1px 1px 0 var(--shadow-color);
}

.producto-seleccionado {
  text-align: center;
  margin-bottom: 24px;
  padding: 20px;
  background: var(--bg-panel);
  border: 2px solid var(--border-color);
  border-radius: 12px;
}

.producto-imagen-grande {
  width: 100px;
  height: 100px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: var(--bg-panel);
  border: 3px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  overflow: hidden;
}

.producto-imagen-grande img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.producto-seleccionado h3 {
  color: var(--text-primary);
  margin: 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-panel);
  color: var(--text-primary);
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--text-primary);
}

.modal-actions {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.btn-cancelar, .btn-confirmar {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancelar {
  background: var(--bg-panel);
  border: 3px solid var(--border-color);
  color: var(--text-primary);
}

.btn-cancelar:hover {
  background: var(--bg-panel);
}

.btn-confirmar {
  background: linear-gradient(135deg, var(--border-color) 0%, var(--text-primary) 100%);
  border: 3px solid var(--text-primary);
  color: var(--text-primary)9f0;
  box-shadow: 3px 3px 0 #3d2510;
}

.btn-confirmar:hover {
  transform: translateY(-2px);
  box-shadow: 5px 5px 0 #3d2510;
}

/* Opciones Config */
.opciones-config {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding-right: 8px;
}

.opciones-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.opcion-item {
  background: var(--bg-panel);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
}

.opcion-header {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.input-nombre {
  flex: 1;
  padding: 10px 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-panel);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: bold;
}

.btn-delete-opcion {
  background: #ffebee;
  border: 2px solid #c47f7f;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-delete-opcion:hover {
  background: #ffcdd2;
}

.opcion-detalles {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.input-group {
  flex: 1;
}

.input-group label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.input-mini {
  width: 100%;
  padding: 8px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-panel);
  color: var(--text-primary);
  text-align: center;
}

.opcion-productos {
  background: var(--bg-panel);
  border-radius: 8px;
  padding: 12px;
}

.productos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.btn-agregar-producto {
  background: #e8f5e9;
  border: 2px solid var(--accent-color);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-agregar-producto:hover {
  background: #c8e6c9;
}

.productos-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.productos-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 0.85rem;
  border-bottom: 1px dotted var(--accent-color);
}

.productos-list li:last-child {
  border-bottom: none;
}

.btn-quitar {
  background: transparent;
  border: none;
  color: #c47f7f;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-quitar:hover {
  color: var(--error-color);
}

.btn-agregar-opcion {
  width: 100%;
  padding: 14px;
  background: transparent;
  border: 3px dashed var(--border-color);
  border-radius: 12px;
  color: var(--text-primary);
  font-weight: bold;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-agregar-opcion:hover {
  background: var(--bg-panel);
  border-color: var(--text-primary);
  color: var(--text-primary);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@media (max-width: 768px) {
  .btn-grande-crear {
    padding: 30px 50px;
  }
  
  .btn-icono {
    font-size: 2.5rem;
  }
  
  .btn-texto {
    font-size: 1.2rem;
  }
  
  .productos-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
  
  .producto-item {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .producto-info-row {
    flex-direction: column;
    width: 100%;
  }
  
  .btn-crear-estacion {
    width: 100%;
  }
  
  .estaciones-grid {
    grid-template-columns: 1fr;
  }
  
  .zelda-title {
    font-size: 1.8rem;
  }
  
  .station-options {
    grid-template-columns: 1fr;
  }
  
  .station-footer {
    flex-direction: column;
    gap: 16px;
  }
  
  .btn-cobrar {
    width: 100%;
  }
  
  .opcion-detalles {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .rental-header {
    padding: 20px 16px;
  }
  
  .rental-main {
    padding: 20px 12px;
  }
  
  .productos-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .producto-card {
    padding: 12px;
  }
  
  .producto-imagen {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }
  
  .timer-display {
    font-size: 2.5rem;
  }
}
</style>

<style>
.swal2-popup-papyrus {
  background: var(--bg-panel) !important;
  border: 4px solid var(--border-color) !important;
  border-radius: 16px !important;
  box-shadow: 6px 6px 0 var(--shadow-color) !important;
}

.swal2-title {
  color: var(--zelda-gold) !important;
  font-family: inherit !important;
}

.swal2-html-container {
  color: var(--text-primary) !important;
}

.swal2-confirm {
  background: linear-gradient(135deg, var(--border-color) 0%, var(--text-primary) 100%) !important;
  border: 3px solid var(--text-primary) !important;
  border-radius: 10px !important;
  box-shadow: 3px 3px 0 #3d2510 !important;
}

.swal2-confirm:hover {
  transform: translateY(-2px) !important;
  box-shadow: 5px 5px 0 #3d2510 !important;
}
</style>