<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import EntradaEfectivoModal from './modals/EntradaEfectivoModal.vue';
import SalidaEfectivoModal from './modals/SalidaEfectivoModal.vue';
import HistorialVentasModal from './modals/HistorialVentasModal.vue';
import CalculadoraGramajeModal from './modals/CalculadoraGramajeModal.vue';
import CobroModal from './modals/CobroModal.vue';

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

type Producto = {
  id: number;
  nombre: string;
  codigo_barras: string | null;
  precio: number;
  dto: ProductoDTO;
};

type TicketItem = Producto & {
  cantidad: number;
};

const API_BASE = 'http://localhost:8080';
const AUTH_USER_ID_KEY = 'idUsuario';

const terminoBusqueda = ref('');
const productos = ref<Producto[]>([]);
const ticket = ref<TicketItem[]>([]);
const mensaje = ref('');
const mensajeTipo = ref<'ok' | 'error' | 'info'>('info');
const sugerenciasVisibles = ref(false);
const indiceSugerenciaActiva = ref(-1);
const cargandoBusqueda = ref(false);
const ticketDelDia = ref('Cargando...');
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

let temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;

const totalVenta = computed(() => {
  return ticket.value.reduce((acumulado, item) => acumulado + item.precio * item.cantidad, 0);
});

const totalArticulos = computed(() => {
  return ticket.value.reduce((acumulado, item) => acumulado + item.cantidad, 0);
});

const sugerenciasPorNombre = computed(() => {
  return productos.value.slice(0, 6);
});

onMounted(async () => {
  await cargarProductos();
  await cargarTicketDelDia();
});

onBeforeUnmount(() => {
  if (temporizadorBusqueda) {
    clearTimeout(temporizadorBusqueda);
  }
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
        dto: item
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

async function cargarTicketDelDia() {
  const idUsuario = obtenerIdUsuarioSesion();
  if (!idUsuario) {
    ticketDelDia.value = 'N/D';
    return;
  }

  try {
    const response = await getJson<ApiRespuesta<VentaDTO>>(`${API_BASE}/ventas/buscarVentaPendiente`);

    if (response?.codigo === 200 && response?.datos) {
      const venta = response.datos;
      const numeroTicketActual = Number(venta?.numeroTicket ?? 0);
      const mensajeServidor = String(response?.mensaje ?? '');

      if (mensajeServidor === 'Se encontro la ultima venta ya completada') {
        ticketDelDia.value = String(numeroTicketActual + 1);
        return;
      }

      if (mensajeServidor.includes('venta pendiente')) {
        ticketDelDia.value = String(numeroTicketActual || 1);
        return;
      }

      ticketDelDia.value = String(numeroTicketActual || 1);
      return;
    }

    ticketDelDia.value = '1';
  } catch (_error) {
    ticketDelDia.value = 'N/D';
  }
}

function getFechaHoy() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function buscarProductosPorNombre(nombre: string) {
  const query = nombre.trim();
  if (!query) {
    await cargarProductos();
    return;
  }

  try {
    cargandoBusqueda.value = true;
    const data = await getJson<ApiRespuesta<ProductoDTO[]>>(
      `${API_BASE}/productos/buscar?nombre=${encodeURIComponent(query)}`
    );
    productos.value = normalizarProductos(data?.datos);
  } catch (_error) {
    productos.value = [];
  } finally {
    cargandoBusqueda.value = false;
  }
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
  if (desdeCodigo) return desdeCodigo;

  await buscarProductosPorNombre(query);
  return productos.value[0] ?? null;
}

function manejarFocusBusqueda() {
  sugerenciasVisibles.value = true;
}

function manejarInputBusqueda() {
  sugerenciasVisibles.value = true;
  indiceSugerenciaActiva.value = -1;

  if (temporizadorBusqueda) {
    clearTimeout(temporizadorBusqueda);
  }

  temporizadorBusqueda = setTimeout(async () => {
    await buscarProductosPorNombre(terminoBusqueda.value);
  }, 250);
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

function agregarProductoATicket(producto: Producto) {
  if (Boolean(producto.dto?.is_gramaje)) {
    modalProductoGramaje.value = producto;
    modalGramajeAbierto.value = true;
    return;
  }

  const existente = ticket.value.find((item) => item.id === producto.id);

  if (existente) {
    existente.cantidad += 1;
  } else {
    ticket.value.push({ ...producto, cantidad: 1 });
  }

  mostrarMensaje(`Agregado: ${producto.nombre}`, 'ok');
}

function aumentarCantidad(item: TicketItem) {
  item.cantidad += 1;
}

function disminuirCantidad(item: TicketItem) {
  if (item.cantidad > 1) {
    item.cantidad -= 1;
    return;
  }

  quitarItem(item.id);
}

function quitarItem(id: number) {
  ticket.value = ticket.value.filter((item) => item.id !== id);
}

function limpiarTicket() {
  ticket.value = [];
  mostrarMensaje('Ticket reiniciado.', 'info');
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
    numeroTicket: 0
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

async function crearDetalleVenta(venta: VentaDTO, item: TicketItem) {
  const payload = {
    Venta: venta,
    Producto: item.dto,
    cantidad: item.cantidad,
    precioUnitarioVenta: item.precio,
    tipoPrecioAplicado: 'VENTA'
  };

  const data = await getJson<ApiRespuesta<unknown>>(`${API_BASE}/ventasDetalle/agregarVentaDetalle`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

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

  try {
    const montoCobrado = totalVenta.value;
    const venta = await crearVenta(idUsuario);
    await Promise.all(ticket.value.map((item) => crearDetalleVenta(venta, item)));
    await completarVenta(venta.idVenta, metodoPago, montoCobrado);
    const numeroTicket = venta.numeroTicket ? ` Ticket #${venta.numeroTicket}.` : '';
    limpiarTicket();
    mostrarMensaje(`Venta cobrada por ${formatoMoneda(montoCobrado)} con ${metodoPago}.${numeroTicket}`, 'ok');
    modalCobroAbierto.value = false;
    await cargarTicketDelDia();
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
    historialVentas.value = Array.isArray(data?.datos?.ventas) ? data.datos.ventas : [];
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

function agregarProductoGramaje(payload: { gramos: number; precioTotal: number }) {
  const producto = modalProductoGramaje.value;
  if (!producto) {
    mostrarMensaje('No se encontro el producto de gramaje.', 'error');
    return;
  }

  const gramos = Math.max(1, Math.round(payload.gramos));
  const precioUnitario = payload.precioTotal / gramos;
  const existente = ticket.value.find((item) => item.id === producto.id);

  if (existente) {
    existente.cantidad += gramos;
    existente.precio = Number.isFinite(precioUnitario) ? precioUnitario : existente.precio;
  } else {
    ticket.value.push({
      ...producto,
      cantidad: gramos,
      precio: Number.isFinite(precioUnitario) ? precioUnitario : producto.precio
    });
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
</script>

<template>
  <main class="ventas-layout">
    <section class="ventas-col ticket-col panel">
      <header class="panel-header">
        <h2>Ticket del dia #{{ ticketDelDia }}</h2>
        <p>Busca por nombre o codigo de barras y presiona Enter.</p>
      </header>

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
            <span>{{ item.cantidad }}</span>
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
        <button type="button" class="btn-secondary" @click="limpiarTicket">
          Limpiar ticket
        </button>
      </footer>
    </section>

    <aside class="ventas-col resumen-col panel">
      <header class="panel-header">
        <h2>Resumen de Venta</h2>
      </header>

      <div class="resumen-card">
        <p>Articulos:</p>
        <strong>{{ totalArticulos }}</strong>
      </div>

      <div class="resumen-card total">
        <p>Total:</p>
        <strong>{{ formatoMoneda(totalVenta) }}</strong>
      </div>

      <div class="acciones-grid">
        <button type="button" @click="cobrar">Cobrar</button>
        <button type="button" @click="salidaEfectivo">Salida de efectivo</button>
        <button type="button" @click="entradaEfectivo">Entrada de efectivo</button>
        <button type="button" @click="historialVentasAbrir">Historial de ventas</button>
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
    />

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
  </main>
</template>

<style scoped>
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
  height: 100%;
  min-height: 0;
  width: 100%;
  padding: var(--ventas-space);
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
  overflow: hidden;
  background: 
    linear-gradient(180deg, #0a1912 0%, var(--pixel-bg) 100%),
    radial-gradient(circle at 8% 12%, rgba(248, 214, 103, 0.1) 0 8px, transparent 9px),
    radial-gradient(circle at 92% 88%, rgba(248, 214, 103, 0.08) 0 8px, transparent 9px);
}

.ventas-col {
  padding: 1rem;
  margin-bottom: var(--ventas-space);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  position: relative;
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
}

.buscador-wrap input {
  width: 100%;
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
  max-height: 240px;
  overflow: auto;
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
  max-height: calc(100vh - 280px);
  display: grid;
  gap: 0.7rem;
  padding-right: 0.3rem;
  z-index: 1;
  position: relative;
  pointer-events: none;
}

.ticket-etiqueta {
  border: 3px solid #2a1807;
  background: linear-gradient(180deg, #fdfbf3 0%, #e8d9a8 100%);
  color: #1d1606;
  padding: 0.75rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.6rem;
  align-items: center;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5), 0 4px 0 #1a1005, 0 5px 10px rgba(0, 0, 0, 0.2);
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
  margin: 0 0 0.2rem 0;
  color: #0f1f0c;
  font-size: 0.88rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-shadow: none;
}

.ticket-etiqueta p {
  font-size: 0.75rem;
  color: #5a4a2a;
  margin: 0;
  font-family: "Courier New", monospace;
}

.etiqueta-controles {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.etiqueta-controles button {
  min-width: 30px;
  padding: 0.3rem 0.35rem;
  border: 2px solid #2a1807;
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  color: #1a1401;
  font-weight: 700;
  font-size: 1rem;
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
  min-width: 28px;
  text-align: center;
  font-weight: 800;
  font-size: 0.95rem;
  font-family: "Courier New", monospace;
  color: #1a1401;
  background: rgba(255, 255, 255, 0.5);
  padding: 0.15rem 0.3rem;
  border: 1px solid #c4b078;
}

.etiqueta-total {
  grid-column: 1 / -1;
  font-weight: 800;
  font-size: 1rem;
  color: var(--pixel-forest-dark);
  font-family: "Courier New", monospace;
  text-align: right;
  border-top: 1px dashed #c4b078;
  padding-top: 0.4rem;
  margin-top: 0.2rem;
}

.etiqueta-total::before {
  content: "💰 ";
}

.btn-danger {
  background: linear-gradient(180deg, #e88b8b 0%, #c94f4f 50%, #a32d2d 100%);
  color: #fff;
  border: 2px solid #2a1807;
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

  .ticket-lista {
    max-height: 45vh;
  }
}

@media (max-width: 520px) {
  .ventas-layout {
    --ventas-space: 0.85rem;
    padding: var(--ventas-space);
  }

  .ventas-col {
    padding: 0.8rem;
  }

  .ticket-etiqueta {
    grid-template-columns: 1fr;
  }

  .etiqueta-controles {
    justify-content: flex-start;
  }

  .acciones-grid button {
    font-size: 0.72rem;
    padding: 0.6rem 0.7rem;
  }
}
</style>
