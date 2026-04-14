<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

type Estacion = {
  id: number;
  nombre: string;
  tipo: 'ps3' | 'ps4' | 'ps5' | 'arcade' | 'switch' | 'xbox';
  icono: string;
  tiempoRestante: number;
  status: 'disponible' | 'activo' | 'terminado';
  ticket: TicketItem[];
  opciones: Opcion[];
  notificado: boolean;
};

type TicketItem = {
  nombre: string;
  precio: number;
};

type Opcion = {
  id?: number;
  nombre: string;
  minutos: number;
  precio: number;
  costo: number;
  productosIncluidos: { idProducto: number; nombre: string; cantidad: number }[];
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';
const STORAGE_KEY = 'rental_estaciones';
const intervaloGlobal = ref<number | undefined>();

type ApiRespuesta<T> = {
  codigo: number;
  mensaje: string;
  datos: T;
};

type ProductoDTO = {
  idProducto?: number;
  nombre: string;
  stock: number;
  precio_venta: number;
};

const productosInventario = ref<ProductoDTO[]>([]);

const cargarProductos = async () => {
  try {
    const data = await fetch(`${API_BASE}/productos/listarProductos`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const res: ApiRespuesta<ProductoDTO[]> = await data.json();
    if (res?.datos) {
      productosInventario.value = res.datos;
    }
  } catch (error) {
    console.error('Error cargando productos:', error);
  }
};

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

const guardarEnStorage = () => {
  const datos = estaciones.value.map(e => ({
    id: e.id,
    nombre: e.nombre,
    tipo: e.tipo,
    icono: e.icono,
    tiempoRestante: e.tiempoRestante,
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
    for (const saved of datosGuardados) {
      const index = estaciones.value.findIndex(e => e.id === saved.id);
      if (index !== -1) {
        estaciones.value[index].tiempoRestante = saved.tiempoRestante || 0;
        estaciones.value[index].status = saved.status || 'disponible';
        estaciones.value[index].ticket = saved.ticket || [];
        estaciones.value[index].notificado = saved.notificado || false;
        
        if (estaciones.value[index].tiempoRestante <= 0 && estaciones.value[index].status === 'activo') {
          estaciones.value[index].status = 'terminado';
        }
      }
    }
    return true;
  } catch (e) {
    console.error('Error al cargar:', e);
    return false;
  }
};

const solicitarPermisoNotificaciones = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

const mostrarNotificacion = (station: Estacion) => {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  
  new Notification('⏱️ Tiempo Agotado', {
    body: `El tiempo de ${station.nombre} ha terminado`,
    icon: '/favicon.ico',
    tag: station.id.toString()
  });
};

const iniciarTemporizador = () => {
  if (intervaloGlobal.value) clearInterval(intervaloGlobal.value);
  
  intervaloGlobal.value = window.setInterval(() => {
    let cambio = false;
    
    for (const station of estaciones.value) {
      if (station.status === 'activo' && station.tiempoRestante > 0) {
        station.tiempoRestante--;
        cambio = true;
        
        if (station.tiempoRestante <= 0) {
          station.tiempoRestante = 0;
          station.status = 'terminado';
          
          if (!station.notificado) {
            mostrarNotificacion(station);
            station.notificado = true;
          }
        }
      }
    }
    
    if (cambio) {
      guardarEnStorage();
    }
  }, 1000);
};

const agregarTiempo = (station: Estacion, minutos: number, precio: number, nombreOpcion: string) => {
  const segundosAgregados = minutos * 60;
  
  if (station.status === 'disponible' || station.status === 'terminado') {
    station.tiempoRestante = segundosAgregados;
    station.status = 'activo';
    station.notificado = false;
    station.ticket = [];
    station.ticket.push({ nombre: nombreOpcion, precio: precio });
  } else {
    station.tiempoRestante += segundosAgregados;
    station.ticket.push({ nombre: nombreOpcion, precio: precio });
  }
  
  if (!intervaloGlobal.value) {
    iniciarTemporizador();
  }
  
  guardarEnStorage();
};

const PRODUCTO_RENTAL_ID = 1;

const registrarVentaEnAPI = async (station: Estacion, metodoPago: string = 'EFECTIVO') => {
  const total = getStationTotal(station);
  if (total <= 0) return;
  
  try {
    const payloadVenta = {
      idUsuario: 1,
      montoTotal: total,
      estatus: 'C',
      metodoPago: metodoPago,
      numeroTicket: station.id
    };
    
    const responseVenta = await fetch(`${API_BASE}/ventas/agregarVenta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadVenta)
    });
    
    const dataVenta = await responseVenta.json();
    
    if (dataVenta?.codigo !== 200 || !dataVenta?.datos) {
      console.error('Error al crear venta:', dataVenta?.mensaje);
      alert('Error al registrar venta. Ver consola para detalles.');
      return;
    }
    
    const idVenta = dataVenta.datos.idVenta;
    
    for (const item of station.ticket) {
      const payloadDetalle = {
        venta: { idVenta },
        producto: { idProducto: PRODUCTO_RENTAL_ID, nombre: `Rental: ${station.nombre}`, precio_venta: item.precio, codigoBarras: '' },
        cantidad: 1,
        precioUnitarioVenta: item.precio,
        tipoPrecioAplicado: 'VENTA'
      };
      
      await fetch(`${API_BASE}/ventas/agregarDetalleVenta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadDetalle)
      });
    }
    
  } catch (error) {
    console.error('Error al guardar venta:', error);
    alert('Error al conectar con el servidor.');
  }
};

const cobrar = async (station: Estacion, metodoPago: string = 'EFECTIVO') => {
  const total = getStationTotal(station);
  if (total > 0) {
    const confirmado = confirm(`¿Confirmar cobro de ${formatoMoneda(total)} para ${station.nombre}?`);
    if (!confirmado) return;
    
    await registrarVentaEnAPI(station, metodoPago);
  }
  
  if (intervaloGlobal.value) {
    clearInterval(intervaloGlobal.value);
    intervaloGlobal.value = undefined;
  }
  
  station.tiempoRestante = 0;
  station.status = 'disponible';
  station.ticket = [];
  station.notificado = false;
  
  guardarEnStorage();
}; 

const editarOpcion = (station: Estacion, opcion: Opcion, nuevoNombre: string, nuevosMinutos: number, nuevoPrecio: number, nuevoCosto: number) => {
  const idx = station.opciones.findIndex(o => o.nombre === opcion.nombre && o.minutos === opcion.minutos);
  if (idx !== -1) {
    station.opciones[idx] = { nombre: nuevoNombre, minutos: nuevosMinutos, precio: nuevoPrecio, costo: nuevoCosto, productosIncluidos: opcion.productosIncluidos || [] };
    guardarEnStorage();
  }
};

const eliminarOpcion = (station: Estacion, opcion: Opcion) => {
  const idx = station.opciones.findIndex(o => o.nombre === opcion.nombre && o.minutos === opcion.minutos);
  if (idx !== -1) {
    station.opciones.splice(idx, 1);
    guardarEnStorage();
  }
};

const agregarNuevaOpcion = (station: Estacion, nombre: string, minutos: number, precio: number, costo: number) => {
  station.opciones.push({ nombre, minutos, precio, costo, productosIncluidos: [] });
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
  if (station.tiempoRestante <= 300) return 'timer-warning';
  return 'timer-activo';
};

const getIconoTipo = (tipo: string): string => {
  const iconos: Record<string, string> = {
    ps3: '🎮',
    ps4: '🎮',
    ps5: '🎮',
    switch: '🎮',
    xbox: '🎮',
    arcade: '🕹️'
  };
  return iconos[tipo] || '🎮';
};

const estaciones = ref<Estacion[]>([
  {
    id: 1,
    nombre: 'PlayStation 3',
    tipo: 'ps3',
    icono: '🎮',
    tiempoRestante: 0,
    status: 'disponible',
    ticket: [],
    opciones: [
      { nombre: '+ Media Hora', minutos: 30, precio: 12, costo: 0, productosIncluidos: [] },
      { nombre: '+ 1 Hora', minutos: 60, precio: 20, costo: 0, productosIncluidos: [] },
      { nombre: 'Combo Link (1h + Agua)', minutos: 60, precio: 28, costo: 0, productosIncluidos: [] },
      { nombre: 'Combo Leyenda (1h+Papas+Agua)', minutos: 60, precio: 40, costo: 0, productosIncluidos: [] }
    ],
    notificado: false
  },
  {
    id: 2,
    nombre: 'PlayStation 4',
    tipo: 'ps4',
    icono: '🎮',
    tiempoRestante: 0,
    status: 'disponible',
    ticket: [],
    opciones: [
      { nombre: '+ Media Hora', minutos: 30, precio: 15, costo: 0, productosIncluidos: [] },
      { nombre: '+ 1 Hora', minutos: 60, precio: 25, costo: 0, productosIncluidos: [] },
      { nombre: 'Combo Heroe (1h+Refresco)', minutos: 60, precio: 35, costo: 0, productosIncluidos: [] },
      { nombre: 'Combo Master (2h+Todo)', minutos: 120, precio: 60, costo: 0, productosIncluidos: [] }
    ],
    notificado: false
  },
  {
    id: 3,
    nombre: 'Maquinita Arcade',
    tipo: 'arcade',
    icono: '🕹️',
    tiempoRestante: 0,
    status: 'disponible',
    ticket: [],
    opciones: [
      { nombre: '+ 15 Minutos', minutos: 15, precio: 10, costo: 0, productosIncluidos: [] },
      { nombre: '+ 30 Minutos', minutos: 30, precio: 15, costo: 0, productosIncluidos: [] },
      { nombre: 'Combo Retro (15m + Banderilla)', minutos: 15, precio: 18, costo: 0, productosIncluidos: [] }
    ],
    notificado: false
  },
  {
    id: 4,
    nombre: 'Nintendo Switch',
    tipo: 'switch',
    icono: '🎮',
    tiempoRestante: 0,
    status: 'disponible',
    ticket: [],
    opciones: [
      { nombre: '+ Media Hora', minutos: 30, precio: 15, costo: 0, productosIncluidos: [] },
      { nombre: '+ 1 Hora', minutos: 60, precio: 25, costo: 0, productosIncluidos: [] },
      { nombre: 'Combo Familia (1h + Snacks)', minutos: 60, precio: 35, costo: 0, productosIncluidos: [] }
    ],
    notificado: false
  }
]);

const mostrarModalAgregar = ref(false);
const mostrarModalEditarOpciones = ref(false);
const estacionEditando = ref<Estacion | null>(null);

const abrirEditarOpciones = (station: Estacion) => {
  estacionEditando.value = station;
  mostrarModalEditarOpciones.value = true;
};

const guardarOpciones = () => {
  guardarEnStorage();
  mostrarModalEditarOpciones.value = false;
  estacionEditando.value = null;
};
const nuevaEstacion = ref({
  nombre: '',
  tipo: 'ps4' as const,
  opciones: [] as Opcion[]
});

const agregarEstacion = () => {
  if (!nuevaEstacion.value.nombre.trim()) return;
  
  const nuevasOpciones = nuevaEstacion.value.opciones.length > 0 
    ? nuevaEstacion.value.opciones 
    : [
        { nombre: '+ 30 Min', minutos: 30, precio: 20, costo: 0, productosIncluidos: [] },
        { nombre: '+ 1 Hora', minutos: 60, precio: 35, costo: 0, productosIncluidos: [] }
      ];
  
  estaciones.value.push({
    id: Date.now(),
    nombre: nuevaEstacion.value.nombre,
    tipo: nuevaEstacion.value.tipo,
    icono: getIconoTipo(nuevaEstacion.value.tipo),
    tiempoRestante: 0,
    status: 'disponible',
    ticket: [],
    opciones: nuevasOpciones,
    notificado: false
  });
  
  mostrarModalAgregar.value = false;
  nuevaEstacion.value = { nombre: '', tipo: 'ps4', opciones: [] };
};

const agregarOpcionDefault = () => {
  nuevaEstacion.value.opciones.push({
    nombre: '+ 30 Min',
    minutos: 30,
    precio: 20,
    costo: 0,
    productosIncluidos: []
  });
};

const eliminarEstacion = (id: number) => {
  const idx = estaciones.value.findIndex(e => e.id === id);
  if (idx !== -1) {
    if (estaciones.value[idx].status === 'activo') {
      clearInterval(intervaloGlobal.value);
      intervaloGlobal.value = undefined;
    }
    estaciones.value.splice(idx, 1);
    guardarEnStorage();
  }
};

onMounted(async () => {
  await cargarProductos();
  await solicitarPermisoNotificaciones();
  cargarDesdeStorage();
  
  const hayActivas = estaciones.value.some(e => e.status === 'activo' && e.tiempoRestante > 0);
  if (hayActivas) {
    iniciarTemporizador();
  }
});

onUnmounted(() => {
  if (intervaloGlobal.value) {
    clearInterval(intervaloGlobal.value);
  }
});
</script>

<template>
  <div class="rental-container">
    <header class="rental-header">
      <div class="zelda-header-content">
        <div class="triforce">
          <svg width="50" height="50" viewBox="0 0 100 100" fill="#fcd34d">
            <polygon points="50,10 25,50 75,50" />
            <polygon points="25,50 0,90 50,90" />
            <polygon points="75,50 50,90 100,90" />
          </svg>
        </div>
        <h1 class="zelda-title">ZONA GAMER</h1>
        <p class="zelda-subtitle">LA LEYENDA DEL DULCE</p>
      </div>
      
      <div class="header-actions">
        <button class="btn-agregar-estacion" @click="mostrarModalAgregar = true">
          ➕ Agregar Estación
        </button>
      </div>
    </header>

    <main class="stations-grid">
      <div 
        v-for="station in estaciones" 
        :key="station.id"
        class="station-card"
        :class="getStationBorderClass(station)"
      >
        <div class="station-header">
          <div class="station-title">
            <span class="station-icon" v-html="station.icono"></span>
            <h2>{{ station.nombre }}</h2>
          </div>
          <div class="station-actions">
            <span class="status-badge" :class="getStatusBadgeClass(station)">
              {{ station.status.toUpperCase() }}
            </span>
            <button 
              class="btn-editar-opciones"
              @click="abrirEditarOpciones(station)"
              title="Editar opciones de tiempo"
            >
              ⚙️
            </button>
            <button 
              v-if="station.status === 'disponible'" 
              class="btn-eliminar"
              @click="eliminarEstacion(station.id)"
              title="Eliminar estación"
            >
              🗑️
            </button>
          </div>
        </div>

        <div class="station-timer">
          <div class="timer-display" :class="getTimerColorClass(station)">
            {{ formatTime(station.tiempoRestante) }}
          </div>
          <p v-if="station.status === 'activo' && station.tiempoRestante <= 300" class="timer-warning">
            ¡El tiempo se agota!
          </p>
        </div>

        <div class="station-options">
          <button 
            v-for="opt in station.opciones"
            :key="opt.nombre"
            class="option-btn"
            @click="agregarTiempo(station, opt.minutos, opt.precio, opt.nombre)"
          >
            <span>{{ opt.nombre }}</span>
            <span class="option-price">{{ formatoMoneda(opt.precio) }}</span>
          </button>
        </div>

        <div class="ticket-panel">
          <h3 class="ticket-title">Ticket Actual</h3>
          <div v-if="station.ticket.length === 0" class="ticket-empty">
            Sin cargos.
          </div>
          <ul v-else class="ticket-list">
            <li v-for="(item, index) in station.ticket" :key="index" class="ticket-item">
              <span>⚔️ {{ item.nombre }}</span>
              <span class="ticket-price">{{ formatoMoneda(item.precio) }}</span>
            </li>
          </ul>
        </div>

        <div class="station-footer">
          <div class="station-total">
            Total: <span class="total-value">{{ formatoMoneda(getStationTotal(station)) }}</span>
          </div>
          <button 
            class="btn-cobrar"
            :disabled="station.ticket.length === 0"
            @click="cobrar(station)"
          >
            Cobrar y Liberar
          </button>
        </div>
      </div>
    </main>

    <!-- Modal Editar Opciones -->
    <div v-if="mostrarModalEditarOpciones && estacionEditando" class="modal-overlay" @click.self="mostrarModalEditarOpciones = false">
      <div class="modal-content modal-opciones">
        <h2 class="modal-title">⚙️ Opciones - {{ estacionEditando.nombre }}</h2>
        
        <div class="opciones-header">
          <span class="col-nombre">Nombre</span>
          <span class="col-minutos">Minutos</span>
          <span class="col-precio">Precio</span>
          <span class="col-costo">Costo</span>
          <span class="col-productos">Productos</span>
          <span class="col-acciones"></span>
        </div>
        
        <div class="opciones-list">
          <div v-for="(opt, idx) in estacionEditando.opciones" :key="idx" class="opcion-item">
            <input 
              v-model="opt.nombre" 
              type="text" 
              placeholder="Nombre"
              class="input-nombre"
            />
            <input 
              v-model.number="opt.minutos" 
              type="number" 
              placeholder="Min"
              class="input-mini"
            />
            <input 
              v-model.number="opt.precio" 
              type="number" 
              placeholder="$$$"
              class="input-mini"
            />
            <input 
              v-model.number="opt.costo" 
              type="number" 
              placeholder="$"
              class="input-mini"
            />
            <div class="input-productos">
              <span class="productos-count">{{ opt.productosIncluidos?.length || 0 }} productos</span>
            </div>
            <button class="btn-eliminar-opcion" @click="eliminarOpcion(estacionEditando, opt)">🗑️</button>
          </div>
        </div>
        
        <button class="btn-agregar-opcion" @click="agregarNuevaOpcion(estacionEditando, 'Nueva Opcion', 30, 20, 0)">
          ➕ Agregar Opción
        </button>

        <div class="modal-actions">
          <button class="btn-cancelar" @click="mostrarModalEditarOpciones = false">✖ Cancelar</button>
          <button class="btn-confirmar" @click="guardarOpciones">💾 Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal Agregar Estación -->
    <div v-if="mostrarModalAgregar" class="modal-overlay" @click.self="mostrarModalAgregar = false">
      <div class="modal-content">
        <h2 class="modal-title">➕ Nueva Estación</h2>
        
        <div class="form-group">
          <label>Nombre de la Estación</label>
          <input 
            v-model="nuevaEstacion.nombre" 
            type="text" 
            placeholder="Ej: PlayStation 5" 
          />
        </div>
        
        <div class="form-group">
          <label>Tipo de Consola</label>
          <select v-model="nuevaEstacion.tipo">
            <option value="ps3">PlayStation 3</option>
            <option value="ps4">PlayStation 4</option>
            <option value="ps5">PlayStation 5</option>
            <option value="switch">Nintendo Switch</option>
            <option value="xbox">Xbox</option>
            <option value="arcade">Arcade</option>
          </select>
        </div>

        <div class="modal-actions">
          <button class="btn-cancelar" @click="mostrarModalAgregar = false">✖ Cancelar</button>
          <button class="btn-confirmar" @click="agregarEstacion">💾 Guardar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.rental-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  color: #d4af37;
  background-color: #120b08;
  background-image: radial-gradient(#2c1a0d 1px, transparent 1px);
  background-size: 20px 20px;
}

.rental-container *, .rental-container *::before, .rental-container *::after {
  box-sizing: border-box;
}

.rental-header {
  text-align: center;
  margin-bottom: 32px;
}

.zelda-header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.triforce svg {
  filter: drop-shadow(0 0 10px rgba(252, 211, 77, 0.5));
}

.zelda-title {
  font-size: 2.5rem;
  font-weight: bold;
  letter-spacing: 0.2em;
  color: #fcd34d;
  text-shadow: 2px 2px 0 #000;
}

.zelda-subtitle {
  font-size: 1.25rem;
  letter-spacing: 0.2em;
  color: #8b5a2b;
}

.header-actions {
  margin-top: 16px;
}

.btn-agregar-estacion {
  padding: 12px 24px;
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  color: #fff;
  border: 2px solid #4ade80;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.btn-agregar-estacion:hover {
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(74, 222, 128, 0.4);
}

.stations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
  justify-content: center;
}

.station-card {
  background: linear-gradient(145deg, #2c1a0d, #1a100c);
  border: 2px solid #8b5a2b;
  border-radius: 16px;
  padding: 24px;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.8), 0 0 15px rgba(212, 175, 55, 0.1);
  transition: all 0.3s;
}

.station-card.station-activo {
  border-color: #d4af37;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(212, 175, 55, 0.3);
}

.station-card.station-terminado {
  border-color: #ef4444;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(239, 68, 68, 0.3);
}

.station-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #8b5a2b;
  padding-bottom: 12px;
  margin-bottom: 16px;
  gap: 8px;
  overflow: hidden;
}

.station-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-shrink: 1;
}

.station-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.station-title h2 {
  font-size: 1.1rem;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.station-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: bold;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.status-badge.status-activo {
  background: #14532d;
  color: #4ade80;
  border: 1px solid #4ade80;
}

.status-badge.status-terminado {
  background: #7f1d1d;
  color: #ef4444;
  border: 1px solid #ef4444;
  animation: pulse 1s infinite;
}

.status-badge.status-disponible {
  background: #1f2937;
  color: #9ca3af;
  border: 1px solid #4b5563;
}

.btn-eliminar {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.btn-eliminar:hover {
  opacity: 1;
}

.btn-editar-opciones {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.btn-editar-opciones:hover {
  opacity: 1;
}

.btn-eliminar-opcion {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  opacity: 0.6;
  padding: 4px;
}

.btn-eliminar-opcion:hover {
  opacity: 1;
}

.modal-opciones {
  max-width: 500px;
}

.opciones-header {
  display: grid;
  grid-template-columns: 2fr 60px 60px 50px 1fr 40px;
  gap: 8px;
  padding: 8px 4px;
  font-size: 0.7rem;
  font-weight: bold;
  color: #8b5a2b;
  text-transform: uppercase;
  border-bottom: 1px solid #8b5a2b;
  margin-bottom: 8px;
}

.opciones-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.opcion-item {
  display: grid;
  grid-template-columns: 2fr 60px 60px 50px 1fr 40px;
  gap: 8px;
  align-items: center;
}

.input-nombre {
  padding: 8px;
  border: 1px solid #8b5a2b;
  border-radius: 4px;
  background: #1a100c;
  color: #d4af37;
  font-size: 0.85rem;
}

.input-mini {
  width: 100%;
  padding: 8px;
  border: 1px solid #8b5a2b;
  border-radius: 4px;
  background: #1a100c;
  color: #d4af37;
  text-align: center;
}

.input-productos {
  padding: 8px;
  font-size: 0.75rem;
  color: #8b5a2b;
  text-align: center;
  background: #1a100c;
  border-radius: 4px;
  border: 1px solid #3e2723;
}

.productos-count {
  color: #d4af37;
  font-size: 0.85rem;
  text-align: center;
}

.btn-agregar-opcion {
  width: 100%;
  padding: 10px;
  background: transparent;
  border: 2px dashed #8b5a2b;
  border-radius: 8px;
  color: #8b5a2b;
  cursor: pointer;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.btn-agregar-opcion:hover {
  border-color: #d4af37;
  color: #d4af37;
}

.station-timer {
  text-align: center;
  margin: 24px 0;
}

.timer-display {
  font-size: 4rem;
  font-weight: bold;
  letter-spacing: 0.1em;
  font-family: 'Courier New', monospace;
  text-shadow: 0 0 8px currentColor;
}

.timer-display.timer-disponible {
  color: #4b5563;
}

.timer-display.timer-activo {
  color: #4ade80;
}

.timer-display.timer-warning {
  color: #fbbf24;
}

.timer-display.timer-terminado {
  color: #ef4444;
  animation: pulse 1s infinite;
}

.timer-warning {
  color: #ef4444;
  font-weight: bold;
  margin-top: 8px;
  animation: pulse 1s infinite;
}

.station-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
  width: 100%;
}

.option-btn {
  background: #3e2723;
  border: 1px solid #8b5a2b;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  align-content: space-between;
  color: #d4af37;
  font-size: 0.8rem;
  line-height: 1.2;
  min-height: 44px;
  max-height: 60px;
  overflow: hidden;
  text-align: left;
  width: 100%;
}

.option-btn:hover {
  background: #5d4037;
  border-color: #d4af37;
}

.option-btn:active {
  transform: scale(0.98);
}

.option-price {
  color: #fcd34d;
  font-weight: bold;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 6px;
}

.ticket-panel {
  background: #1a100c;
  border: 1px solid #8b5a2b;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  min-height: 100px;
  max-height: 150px;
  overflow-y: auto;
}

.ticket-title {
  color: #8b5a2b;
  font-size: 0.85rem;
  margin-bottom: 8px;
  border-bottom: 1px solid #3e2723;
  padding-bottom: 4px;
}

.ticket-empty {
  color: #6b7280;
  font-style: italic;
  text-align: center;
  margin-top: 20px;
  font-size: 0.9rem;
}

.ticket-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ticket-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  color: #d1d5db;
  font-size: 0.9rem;
}

.ticket-price {
  color: #fcd34d;
}

.station-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 2px solid #8b5a2b;
  padding-top: 16px;
}

.station-total {
  font-size: 1.25rem;
}

.total-value {
  color: #fcd34d;
  font-weight: bold;
}

.btn-cobrar {
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #fff;
  border: 2px solid #4ade80;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.3);
}

.btn-cobrar:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.5);
}

.btn-cobrar:disabled {
  background: #374151;
  border-color: #4b5563;
  color: #6b7280;
  cursor: not-allowed;
  box-shadow: none;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: linear-gradient(145deg, #2c1a0d, #1a100c);
  border: 2px solid #d4af37;
  border-radius: 16px;
  padding: 32px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
}

.modal-title {
  font-size: 1.5rem;
  color: #fcd34d;
  text-align: center;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  color: #8b5a2b;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 2px solid #8b5a2b;
  border-radius: 8px;
  background: #1a100c;
  color: #d4af37;
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #d4af37;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancelar, .btn-confirmar {
  flex: 1;
  padding: 14px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  border: none;
  font-size: 0.9rem;
  text-transform: uppercase;
  transition: all 0.3s;
}

.btn-cancelar {
  background: transparent;
  border: 2px solid #8b5a2b;
  color: #8b5a2b;
}

.btn-cancelar:hover {
  background: rgba(139, 90, 43, 0.1);
}

.btn-confirmar {
  background: linear-gradient(135deg, #d4af37, #b8962e);
  color: #1a100c;
}

.btn-confirmar:hover {
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(212, 175, 55, 0.5);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 1200px) {
  .stations-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

@media (max-width: 768px) {
  .rental-container {
    padding: 12px;
  }
  
  .stations-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  
  .station-card {
    padding: 16px;
    border-radius: 12px;
  }
  
  .zelda-header-content {
    margin-bottom: 12px;
  }
  
  .triforce svg {
    width: 40px;
    height: 40px;
  }
  
  .zelda-title {
    font-size: 1.5rem;
  }
  
  .zelda-subtitle {
    font-size: 0.9rem;
  }
  
  .btn-agregar-estacion {
    padding: 10px 16px;
    font-size: 0.8rem;
  }
  
  .station-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding-bottom: 12px;
  }
  
  .station-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .station-title {
    gap: 8px;
  }
  
  .station-icon {
    font-size: 1.25rem;
  }
  
  .station-title h2 {
    font-size: 1.25rem;
  }
  
  .status-badge {
    font-size: 0.65rem;
    padding: 4px 8px;
  }
  
  .timer-display {
    font-size: 2.5rem;
  }
  
  .station-timer {
    margin: 16px 0;
  }
  
  .timer-warning {
    font-size: 0.85rem;
  }
  
  .station-options {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }
  
  .option-btn {
    padding: 8px 10px;
    font-size: 0.75rem;
    min-height: 46px;
    flex-wrap: wrap;
  }
  
  .option-btn span:first-child {
    flex: 1;
    word-break: break-word;
  }
  
  .option-price {
    font-size: 0.75rem;
    margin-left: 4px;
  }
  
  .ticket-panel {
    padding: 10px;
    min-height: 80px;
    max-height: 120px;
  }
  
  .ticket-title {
    font-size: 0.75rem;
  }
  
  .ticket-item {
    font-size: 0.8rem;
    padding: 3px 0;
  }
  
  .ticket-price {
    font-size: 0.8rem;
  }
  
  .station-footer {
    flex-direction: column;
    gap: 12px;
    padding-top: 12px;
  }
  
  .station-total {
    font-size: 1rem;
    width: 100%;
    text-align: center;
  }
  
  .btn-cobrar {
    width: 100%;
    padding: 12px 16px;
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .rental-container {
    padding: 8px;
  }
  
  .stations-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .station-card {
    padding: 12px;
  }
  
  .triforce svg {
    width: 32px;
    height: 32px;
  }
  
  .zelda-title {
    font-size: 1.25rem;
    letter-spacing: 0.1em;
  }
  
  .zelda-subtitle {
    font-size: 0.75rem;
  }
  
  .btn-agregar-estacion {
    padding: 8px 12px;
    font-size: 0.75rem;
    width: 100%;
  }
  
  .station-header {
    padding-bottom: 10px;
    margin-bottom: 10px;
  }
  
  .station-title h2 {
    font-size: 1.1rem;
  }
  
  .station-icon {
    font-size: 1.1rem;
  }
  
  .timer-display {
    font-size: 2rem;
  }
  
  .station-options {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  
  .option-btn {
    padding: 8px 10px;
    font-size: 0.75rem;
    min-height: 44px;
    flex-wrap: wrap;
  }
  
  .option-btn span:first-child {
    flex: 1;
    word-break: break-word;
  }
  
  .option-price {
    font-size: 0.75rem;
    margin-left: 4px;
  }
  
  .ticket-panel {
    min-height: 70px;
    max-height: 100px;
  }
  
  .ticket-title {
    font-size: 0.7rem;
  }
  
  .ticket-item {
    font-size: 0.75rem;
  }
  
  .ticket-price {
    font-size: 0.7rem;
  }
  
  .station-total {
    font-size: 0.9rem;
  }
  
  .btn-cobrar {
    padding: 10px 12px;
    font-size: 0.8rem;
  }
  
  .status-badge {
    font-size: 0.6rem;
  }
}

@media (max-width: 360px) {
  .zelda-title {
    font-size: 1.1rem;
  }
  
  .station-title h2 {
    font-size: 1rem;
  }
  
  .timer-display {
    font-size: 1.75rem;
  }
  
  .station-options {
    gap: 5px;
  }
  
  .option-btn {
    padding: 6px 8px;
    font-size: 0.7rem;
    min-height: 40px;
  }
  
  .option-price {
    font-size: 0.7rem;
  }
  
  .station-timer {
    margin: 12px 0;
  }
  
  .timer-warning {
    font-size: 0.75rem;
  }
}
</style>