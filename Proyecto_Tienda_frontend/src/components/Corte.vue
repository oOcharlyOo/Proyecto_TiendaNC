<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

type ApiRespuesta<T> = {
  codigo: number;
  mensaje: string;
  datos: T;
};

type UsuarioDTO = {
  idUsuario: number;
  nombre?: string;
};

type VentaDTO = {
  idVenta: number;
  numeroTicket?: number;
  fechaVenta?: string;
  metodoPago?: string;
  montoTotal?: number;
  estatus?: string;
  usuario?: UsuarioDTO;
};

type GananciasDTO = {
  cobroTotal?: number;
  gananciaTotal?: number;
  ventas?: VentaDTO[];
};

type CorteDTO = {
  fechaCorte: string;
  montoInicial: number;
  totalVentas: number;
  totalEgresos: number;
  otrosIngresos: number;
  saldoFinalCalculado: number;
  gananciaTotal: number;
};

type VentaDetalleDTO = {
  idVentaDetalle: number;
  cantidad: number;
  precioUnitarioVenta: number;
  tipoPrecioAplicado?: string;
  Venta: VentaDTO;
  Producto: {
    nombre: string;
    precio_costo?: number;
  };
};

const API_BASE = 'http://localhost:8080';
const AUTH_USER_ID_KEY = 'idUsuario';

const idUsuario = ref<number>(Number(localStorage.getItem(AUTH_USER_ID_KEY) || 0));
const nombreUsuario = ref('Usuario');
const router = useRouter();

const mensaje = ref('');
const mensajeTipo = ref<'ok' | 'error' | 'info'>('info');

const cargandoCorte = ref(false);
const cargandoMensual = ref(false);
const cargandoHistorial = ref(false);

const mostrarReporte = ref(false);
const mostrarCerrarTurno = ref(false);

const modalDiarioAbierto = ref(false);
const modalMensualAbierto = ref(false);
const modalHistorialAbierto = ref(false);
const modalDetalleAbierto = ref(false);

const fechaDiaria = ref(new Date().toISOString().slice(0, 10));
const mesMensual = ref(new Date().toISOString().slice(0, 7));

const corteActual = ref<CorteDTO | null>(null);
const ventasEfectivo = ref(0);
const ventasTransferencia = ref(0);
const totalTicketsDia = ref(0);
const reporteTitulo = ref('Reporte del Corte Actual');

const mensualTotalVentas = ref(0);
const mensualTotalTransferencia = ref(0);
const mensualTotalGanancias = ref(0);
const mensualSemanas = ref<{ semana: number; ventas: number; ganancia: number }[]>([]);

const historialDetalles = ref<VentaDetalleDTO[]>([]);
const filtroMesHistorial = ref('all');
const filtroDiaHistorial = ref('all');
const ventaDetalleSeleccionada = ref<VentaDTO | null>(null);
const ventaDetalleItems = ref<VentaDetalleDTO[]>([]);

const historialVentasAgrupadas = computed(() => {
  const map = new Map<number, { venta: VentaDTO; detalles: VentaDetalleDTO[] }>();

  for (const d of historialDetalles.value) {
    const idVenta = Number(d?.Venta?.idVenta || 0);
    if (!idVenta) continue;

    if (!map.has(idVenta)) {
      map.set(idVenta, {
        venta: d.Venta,
        detalles: []
      });
    }

    map.get(idVenta)?.detalles.push(d);
  }

  return Array.from(map.values()).sort((a, b) => {
    const fa = new Date(a.venta.fechaVenta || '').getTime();
    const fb = new Date(b.venta.fechaVenta || '').getTime();
    return fb - fa;
  });
});

const historialMeses = computed(() => {
  const meses = new Set<string>();
  for (const item of historialVentasAgrupadas.value) {
    const date = new Date(item.venta.fechaVenta || '');
    if (Number.isNaN(date.getTime())) continue;
    meses.add(String(date.getMonth()));
  }
  return [...meses].sort((a, b) => Number(a) - Number(b));
});

const historialDias = computed(() => {
  const dias = new Set<string>();
  for (const item of historialVentasAgrupadas.value) {
    const date = new Date(item.venta.fechaVenta || '');
    if (Number.isNaN(date.getTime())) continue;
    dias.add(String(date.getDate()));
  }
  return [...dias].sort((a, b) => Number(a) - Number(b));
});

const historialFiltrado = computed(() => {
  return historialVentasAgrupadas.value.filter((item) => {
    const date = new Date(item.venta.fechaVenta || '');
    if (Number.isNaN(date.getTime())) return false;

    const monthOk = filtroMesHistorial.value === 'all' || String(date.getMonth()) === filtroMesHistorial.value;
    const dayOk = filtroDiaHistorial.value === 'all' || String(date.getDate()) === filtroDiaHistorial.value;
    return monthOk && dayOk;
  });
});

const historialTotalFiltrado = computed(() => {
  return historialFiltrado.value.reduce((sum, x) => sum + Number(x.venta.montoTotal || 0), 0);
});

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor || 0));
}

function formatoFecha(fecha?: string) {
  if (!fecha) return 'N/D';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return 'N/D';
  return d.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
}

function mostrarMensaje(texto: string, tipo: 'ok' | 'error' | 'info') {
  mensaje.value = texto;
  mensajeTipo.value = tipo;
}

async function fetchApi<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = (await response.json()) as unknown;

  if (data && typeof data === 'object' && 'codigo' in (data as Record<string, unknown>)) {
    const wrapped = data as ApiRespuesta<T>;
    if (wrapped.codigo !== 200) throw new Error(wrapped.mensaje || 'Error de API');
    return wrapped.datos;
  }

  return data as T;
}

function calcularSemanasMensual(ventas: Array<{ fechaVenta?: string; totalVenta: number; ganancia: number }>) {
  const weeks = [1, 2, 3, 4].map((n) => ({ semana: n, ventas: 0, ganancia: 0 }));

  for (const sale of ventas) {
    const date = new Date(sale.fechaVenta || '');
    if (Number.isNaN(date.getTime())) continue;
    const day = date.getDate();
    const semana = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4;
    weeks[semana - 1].ventas += Number(sale.totalVenta || 0);
    weeks[semana - 1].ganancia += Number(sale.ganancia || 0);
  }

  return weeks;
}

async function generarCorte() {
  if (!idUsuario.value) {
    mostrarMensaje('No se encontro idUsuario en sesion.', 'error');
    return;
  }

  cargandoCorte.value = true;
  try {
    const cajaActiva = await fetchApi<{ monto?: number }>(`/caja/apertura/activa?idUsuario=${idUsuario.value}`);
    const montoInicial = Number(cajaActiva?.monto || 0);

    const corte = await fetchApi<CorteDTO>(`/caja/corte?idUsuario=${idUsuario.value}&montoInicial=${montoInicial}`, {
      method: 'POST'
    });

    const ventas = await fetchApi<VentaDTO[]>(`/ventas/obtenerVentas`);
    const fechaCorte = new Date(corte.fechaCorte);

    const ventasDia = (ventas || []).filter((v) => {
      const date = new Date(v.fechaVenta || '');
      if (Number.isNaN(date.getTime())) return false;
      return date.getFullYear() === fechaCorte.getFullYear() &&
        date.getMonth() === fechaCorte.getMonth() &&
        date.getDate() === fechaCorte.getDate() &&
        v.estatus === 'C';
    });

    ventasEfectivo.value = ventasDia
      .filter((v) => String(v.metodoPago || '').toUpperCase() === 'EFECTIVO')
      .reduce((sum, v) => sum + Number(v.montoTotal || 0), 0);

    ventasTransferencia.value = ventasDia
      .filter((v) => String(v.metodoPago || '').toUpperCase() === 'TRANSFERENCIA')
      .reduce((sum, v) => sum + Number(v.montoTotal || 0), 0);

    totalTicketsDia.value = ventasDia.length;
    corteActual.value = corte;
    reporteTitulo.value = 'Reporte del Corte Actual';
    mostrarReporte.value = true;
    mostrarCerrarTurno.value = true;
    mostrarMensaje('Corte de caja generado con exito.', 'ok');
  } catch (error) {
    mostrarMensaje(`Error al generar corte: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally {
    cargandoCorte.value = false;
  }
}

async function generarReporteDiario() {
  if (!fechaDiaria.value) {
    mostrarMensaje('Selecciona una fecha para reporte diario.', 'error');
    return;
  }

  try {
    const data = await fetchApi<GananciasDTO>(`/ventas/obtenerVentaPorDia/${fechaDiaria.value}`);
    const ventas = Array.isArray(data?.ventas) ? data.ventas : [];

    ventasEfectivo.value = ventas
      .filter((v) => ['EFECTIVO', 'Efectivo'].includes(String(v.metodoPago || '')))
      .reduce((sum, v) => sum + Number(v.montoTotal || 0), 0);

    ventasTransferencia.value = ventas
      .filter((v) => String(v.metodoPago || '').toUpperCase() === 'TRANSFERENCIA')
      .reduce((sum, v) => sum + Number(v.montoTotal || 0), 0);

    corteActual.value = {
      fechaCorte: `${fechaDiaria.value}T00:00:00`,
      montoInicial: 0,
      totalVentas: Number(data?.cobroTotal || 0),
      totalEgresos: 0,
      otrosIngresos: 0,
      saldoFinalCalculado: Number(data?.cobroTotal || 0),
      gananciaTotal: Number(data?.gananciaTotal || 0)
    };

    totalTicketsDia.value = ventas.length;
    reporteTitulo.value = `Reporte del Dia: ${fechaDiaria.value}`;
    mostrarReporte.value = true;
    mostrarCerrarTurno.value = false;
    modalDiarioAbierto.value = false;
    mostrarMensaje('Reporte diario generado con exito.', 'ok');
  } catch (error) {
    mostrarMensaje(`Error al generar reporte diario: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  }
}

const cargandoCerrarTurno = ref(false);

async function cerrarTurno() {
  if (!corteActual.value || !idUsuario.value) {
    mostrarMensaje('Genera primero un corte de caja.', 'error');
    return;
  }

  cargandoCerrarTurno.value = true;

  try {
    const endDate = new Date(corteActual.value.fechaCorte);
    const startDate = new Date(endDate);
    startDate.setHours(0, 0, 0, 0);

    await fetchApi<unknown>('/caja/ventas/status', {
      method: 'PUT',
      body: JSON.stringify({
        idUsuario: idUsuario.value,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    });

    mostrarMensaje('Turno cerrado con exito. Cerrando sesion...', 'ok');
    
    localStorage.removeItem('isAuth');
    localStorage.removeItem('idUsuario');
    localStorage.removeItem('montoInicialCaja');
    sessionStorage.clear();

    setTimeout(() => {
      router.push('/');
    }, 1500);
  } catch (error) {
    mostrarMensaje(`Error al cerrar turno: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally {
    cargandoCerrarTurno.value = false;
  }
}

async function generarReporteMensual() {
  if (!mesMensual.value) {
    mostrarMensaje('Selecciona un mes para generar el reporte.', 'error');
    return;
  }

  cargandoMensual.value = true;
  try {
    const [year, month] = mesMensual.value.split('-').map(Number);
    const targetMonth = month - 1;

    const allDetails = await fetchApi<VentaDetalleDTO[]>('/ventasDetalle/obtenerTodosLosVentasDetalles');

    const monthlyDetails = (allDetails || []).filter((d) => {
      const date = new Date(d?.Venta?.fechaVenta || '');
      if (Number.isNaN(date.getTime())) return false;
      return date.getFullYear() === year && date.getMonth() === targetMonth && ['C', 'F'].includes(String(d?.Venta?.estatus || ''));
    });

    const salesMap = new Map<number, { fechaVenta?: string; metodoPago?: string; totalVenta: number; ganancia: number }>();

    for (const d of monthlyDetails) {
      const idVenta = Number(d?.Venta?.idVenta || 0);
      if (!idVenta) continue;

      if (!salesMap.has(idVenta)) {
        salesMap.set(idVenta, {
          fechaVenta: d.Venta.fechaVenta,
          metodoPago: d.Venta.metodoPago,
          totalVenta: Number(d.Venta.montoTotal || 0),
          ganancia: 0
        });
      }

      const sale = salesMap.get(idVenta);
      if (!sale) continue;

      const costoUnidad = Number(d?.Producto?.precio_costo || 0);
      const isGramaje = d?.tipoPrecioAplicado === 'VENTA_GRAMAJE';
      const cantidadCosto = isGramaje ? Number(d.cantidad || 0) / 1000 : Number(d.cantidad || 0);
      sale.ganancia += Number(d.Venta.montoTotal || 0) - (cantidadCosto * costoUnidad);
    }

    const monthlySales = Array.from(salesMap.values());

    mensualTotalVentas.value = monthlySales.reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);
    mensualTotalGanancias.value = monthlySales.reduce((sum, s) => sum + Number(s.ganancia || 0), 0);
    mensualTotalTransferencia.value = monthlySales
      .filter((s) => String(s.metodoPago || '').toUpperCase() === 'TRANSFERENCIA')
      .reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);

    mensualSemanas.value = calcularSemanasMensual(monthlySales);
    mostrarMensaje('Reporte mensual generado.', 'ok');
  } catch (error) {
    mensualTotalVentas.value = 0;
    mensualTotalGanancias.value = 0;
    mensualTotalTransferencia.value = 0;
    mensualSemanas.value = [];
    mostrarMensaje(`Error al generar reporte mensual: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally {
    cargandoMensual.value = false;
  }
}

async function abrirHistorialVentas() {
  modalHistorialAbierto.value = true;
  cargandoHistorial.value = true;

  try {
    historialDetalles.value = await fetchApi<VentaDetalleDTO[]>('/ventasDetalle/obtenerTodosLosVentasDetalles');
    filtroMesHistorial.value = 'all';
    filtroDiaHistorial.value = 'all';
  } catch (error) {
    historialDetalles.value = [];
    mostrarMensaje(`Error al cargar historial: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally {
    cargandoHistorial.value = false;
  }
}

function abrirDetalleVenta(idVenta: number) {
  const grouped = historialVentasAgrupadas.value.find((x) => Number(x.venta.idVenta) === Number(idVenta));
  if (!grouped) return;

  ventaDetalleSeleccionada.value = grouped.venta;
  ventaDetalleItems.value = grouped.detalles;
  modalDetalleAbierto.value = true;
}

onMounted(() => {
  if (idUsuario.value <= 0) {
    mostrarMensaje('No se encontro idUsuario en sesion. Algunas acciones pueden fallar.', 'info');
  }
});
</script>

<template>
  <main class="corte-layout">
    <section class="panel panel-main">
      <header class="header-corte">
        <h1>💰 Corte de Caja</h1>
        <p>Genera reporte del corte, consulta dia, mes e historial de ventas.</p>
      </header>

      <p v-if="mensaje" class="estado" :class="`estado-${mensajeTipo}`">{{ mensaje }}</p>

      <div class="sign-grid">
        <button class="wood-sign" :disabled="cargandoCorte" @click="generarCorte">
          {{ cargandoCorte ? 'Calculando...' : '🧾 Generar Corte de Caja' }}
        </button>
        <button class="wood-sign" @click="modalDiarioAbierto = true">📅 Reporte por Dia</button>
        <button class="wood-sign" @click="modalMensualAbierto = true">🌙 Reporte Mensual</button>
        <button class="wood-sign" @click="abrirHistorialVentas">📜 Historial de Ventas</button>
      </div>

      <section v-if="mostrarReporte && corteActual" class="reporte-wrap">
        <h2>{{ reporteTitulo }}</h2>

        <div class="cards-grid">
          <article class="card-metric"><p>Fecha</p><strong>{{ formatoFecha(corteActual.fechaCorte) }}</strong></article>
          <article class="card-metric"><p>Cajero</p><strong>{{ nombreUsuario }}</strong></article>
          <article class="card-metric"><p>Monto Inicial</p><strong>{{ formatoMoneda(corteActual.montoInicial) }}</strong></article>
          <article class="card-metric"><p>Ventas Efectivo</p><strong>{{ formatoMoneda(ventasEfectivo) }}</strong></article>
          <article class="card-metric"><p>Ventas Transferencia</p><strong>{{ formatoMoneda(ventasTransferencia) }}</strong></article>
          <article class="card-metric"><p>Tickets Dia</p><strong>{{ totalTicketsDia }}</strong></article>
          <article class="card-metric"><p>Total Ventas</p><strong>{{ formatoMoneda(corteActual.totalVentas) }}</strong></article>
          <article class="card-metric"><p>Otras Entradas</p><strong>{{ formatoMoneda(corteActual.otrosIngresos) }}</strong></article>
          <article class="card-metric"><p>Total Egresos</p><strong>{{ formatoMoneda(corteActual.totalEgresos) }}</strong></article>
          <article class="card-metric"><p>Ganancia Total</p><strong>{{ formatoMoneda(corteActual.gananciaTotal) }}</strong></article>
          <article class="card-metric total"><p>Saldo Final Calculado</p><strong>{{ formatoMoneda(corteActual.saldoFinalCalculado) }}</strong></article>
        </div>

        <button v-if="mostrarCerrarTurno" class="btn-cerrar" type="button" :disabled="cargandoCerrarTurno" @click="cerrarTurno">
          {{ cargandoCerrarTurno ? 'Cerrando...' : '🔒 Cerrar Turno' }}
        </button>
      </section>
    </section>

    <div v-if="modalDiarioAbierto" class="modal-overlay" @click.self="modalDiarioAbierto = false">
      <section class="modal-card panel">
        <h3>📅 Reporte por Dia</h3>
        <label>Selecciona fecha</label>
        <input v-model="fechaDiaria" type="date">
        <div class="modal-actions">
          <button type="button" @click="generarReporteDiario">Generar</button>
          <button type="button" class="btn-secondary" @click="modalDiarioAbierto = false">Cancelar</button>
        </div>
      </section>
    </div>

    <div v-if="modalMensualAbierto" class="modal-overlay" @click.self="modalMensualAbierto = false">
      <section class="modal-card panel monthly-modal">
        <h3>🌙 Reporte Mensual</h3>
        <label>Selecciona mes</label>
        <div class="monthly-head">
          <input v-model="mesMensual" type="month">
          <button type="button" :disabled="cargandoMensual" @click="generarReporteMensual">{{ cargandoMensual ? 'Generando...' : 'Generar' }}</button>
        </div>

        <div class="monthly-stats">
          <article><p>Ventas Totales</p><strong>{{ formatoMoneda(mensualTotalVentas) }}</strong></article>
          <article><p>Transferencia</p><strong>{{ formatoMoneda(mensualTotalTransferencia) }}</strong></article>
          <article><p>Ganancias</p><strong>{{ formatoMoneda(mensualTotalGanancias) }}</strong></article>
        </div>

        <div class="weekly-chart">
          <h4>Rendimiento Semanal</h4>
          <div v-if="mensualSemanas.length === 0" class="empty">Sin datos para el mes seleccionado.</div>
          <div v-else class="bars">
            <div v-for="w in mensualSemanas" :key="w.semana" class="bar-row">
              <span>S{{ w.semana }}</span>
              <div class="bar-track">
                <div class="bar-sales" :style="{ width: `${mensualTotalVentas > 0 ? (w.ventas / mensualTotalVentas) * 100 : 0}%` }" />
                <div class="bar-profit" :style="{ width: `${mensualTotalGanancias > 0 ? (w.ganancia / mensualTotalGanancias) * 100 : 0}%` }" />
              </div>
              <small>{{ formatoMoneda(w.ventas) }} / {{ formatoMoneda(w.ganancia) }}</small>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="modalMensualAbierto = false">Cerrar</button>
        </div>
      </section>
    </div>

    <div v-if="modalHistorialAbierto" class="modal-overlay" @click.self="modalHistorialAbierto = false">
      <section class="modal-card panel history-modal">
        <h3>📜 Historial de Ventas</h3>

        <div class="history-filters">
          <select v-model="filtroMesHistorial">
            <option value="all">Todas las lunas</option>
            <option v-for="m in historialMeses" :key="`m-${m}`" :value="m">Mes {{ Number(m) + 1 }}</option>
          </select>

          <select v-model="filtroDiaHistorial">
            <option value="all">Cualquier sol</option>
            <option v-for="d in historialDias" :key="`d-${d}`" :value="d">Dia {{ d }}</option>
          </select>

          <strong>Total: {{ formatoMoneda(historialTotalFiltrado) }}</strong>
        </div>

        <div class="history-list">
          <p v-if="cargandoHistorial" class="empty">Cargando historial...</p>
          <p v-else-if="historialFiltrado.length === 0" class="empty">No hay ventas con el filtro actual.</p>

          <article v-else v-for="(v, index) in historialFiltrado" :key="v.venta.idVenta" class="history-item" @click="abrirDetalleVenta(v.venta.idVenta)">
            <div>
              <h4>Venta #{{ historialFiltrado.length - index }}</h4>
              <p>{{ formatoFecha(v.venta.fechaVenta) }}</p>
            </div>
            <div>
              <strong>{{ formatoMoneda(Number(v.venta.montoTotal || 0)) }}</strong>
              <p>{{ v.venta.metodoPago || 'N/D' }}</p>
            </div>
          </article>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="modalHistorialAbierto = false">Cerrar</button>
        </div>
      </section>
    </div>

    <div v-if="modalDetalleAbierto && ventaDetalleSeleccionada" class="modal-overlay" @click.self="modalDetalleAbierto = false">
      <section class="modal-card panel detail-modal">
        <h3>🔎 Detalle Venta #{{ ventaDetalleSeleccionada.numeroTicket || ventaDetalleSeleccionada.idVenta }}</h3>

        <div class="detail-grid">
          <p><strong>Metodo:</strong> {{ ventaDetalleSeleccionada.metodoPago || 'N/D' }}</p>
          <p><strong>Fecha:</strong> {{ formatoFecha(ventaDetalleSeleccionada.fechaVenta) }}</p>
          <p><strong>Total:</strong> {{ formatoMoneda(Number(ventaDetalleSeleccionada.montoTotal || 0)) }}</p>
        </div>

        <div class="tabla-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>P.Unit</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in ventaDetalleItems" :key="d.idVentaDetalle">
                <td>{{ d.Producto.nombre }}</td>
                <td>{{ d.cantidad }}{{ d.tipoPrecioAplicado === 'VENTA_GRAMAJE' ? 'g' : '' }}</td>
                <td>{{ formatoMoneda(Number(d.precioUnitarioVenta || 0)) }}</td>
                <td>{{ formatoMoneda(Number(d.precioUnitarioVenta || 0) * Number(d.cantidad || 0)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="modalDetalleAbierto = false">Cerrar</button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.corte-layout {
  height: 100%;
  min-height: 0;
  width: 100%;
  padding: 1rem;
  background:
    radial-gradient(circle at 10% 18%, rgba(248, 214, 103, 0.08) 0 5px, transparent 6px),
    radial-gradient(circle at 88% 82%, rgba(248, 214, 103, 0.07) 0 5px, transparent 6px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-main {
  flex: 1;
  min-height: 0;
  padding: 1rem;
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  gap: 0.9rem;
  overflow: auto;
  position: relative;
}

.panel-main::before {
  content: "";
  position: absolute;
  inset: 10px;
  border: 2px dashed rgba(248, 214, 103, 0.3);
  pointer-events: none;
}

.header-corte h1 {
  font-size: clamp(1.15rem, 3vw, 1.5rem);
}

.header-corte p {
  color: #f6f2de;
  font-size: 0.82rem;
}

.estado { font-size: 0.82rem; text-transform: uppercase; }
.estado-ok { color: #9ff0b6; }
.estado-error { color: #ffb3b8; }
.estado-info { color: #f8d667; }

.sign-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.7rem;
}

.wood-sign {
  border: 3px solid #2a1807;
  background: linear-gradient(180deg, #b37b39 0%, #8d5e28 45%, #6b4420 100%);
  color: #f5e9c2;
  text-shadow: 1px 1px 0 #2f1f09;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.8rem 0.6rem;
  box-shadow: 0 6px 0 #402812;
  animation: swing 4.2s ease-in-out infinite;
  transition: transform 140ms steps(2), filter 140ms linear;
}

.wood-sign:hover {
  filter: brightness(1.07);
  transform: translateY(-2px);
}

.wood-sign:nth-child(2) { animation-delay: -0.4s; }
.wood-sign:nth-child(3) { animation-delay: -0.8s; }
.wood-sign:nth-child(4) { animation-delay: -1.2s; }

.reporte-wrap {
  border: 3px solid #2a1807;
  background: #f2e8bf;
  color: #1d1606;
  padding: 0.9rem;
  display: grid;
  gap: 0.8rem;
  border-radius: 8px;
  box-shadow: inset 0 0 0 2px #d8c37c;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55rem;
}

.card-metric {
  border: 2px solid #2a1807;
  background: #f7efc9;
  padding: 0.6rem;
  display: grid;
  gap: 0.2rem;
  border-radius: 6px;
}

.card-metric p {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #5a4722;
}

.card-metric strong {
  font-size: 0.9rem;
}

.card-metric.total {
  grid-column: span 2;
  background: #f8d667;
}

.btn-cerrar {
  justify-self: center;
  min-width: 220px;
  border: 3px solid #2a1807;
  padding: 0.75rem 1.2rem;
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  background: linear-gradient(180deg, #e88b8b 0%, #c94f4f 50%, #a32d2d 100%);
  color: #fff;
  box-shadow: 
    inset 0 0 0 2px #ffb4b4,
    0 4px 0 #6f2025,
    0 8px 16px rgba(0, 0, 0, 0.4);
  transition: transform 100ms steps(2), filter 100ms linear;
}

.btn-cerrar:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-cerrar:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 
    inset 0 0 0 2px #ffb4b4,
    0 2px 0 #6f2025;
}

.btn-cerrar:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(-10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(2, 4, 2, 0.92);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.modal-card {
  width: min(100%, 520px);
  max-height: 90vh;
  background: linear-gradient(180deg, #1f5b35 0%, #133523 100%);
  border: 4px solid #f8d667;
  box-shadow: 
    0 0 0 4px #2f1f09,
    0 14px 0 #271c0f,
    0 20px 28px rgba(0, 0, 0, 0.5);
  padding: 1.2rem;
  display: grid;
  gap: 0.8rem;
  overflow: auto;
  animation: fadeSlideIn 200ms ease-out;
  position: relative;
}

.modal-card::before {
  content: "";
  position: absolute;
  inset: 10px;
  border: 2px dashed rgba(248, 214, 103, 0.4);
  pointer-events: none;
}

.modal-card h3 {
  margin: 0;
  font-size: 1.05rem;
  color: #f8d667;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 900;
  text-shadow: 2px 2px 0 #000;
  font-family: "Courier New", monospace;
  position: relative;
}

.modal-card label {
  font-size: 0.75rem;
  color: #f6f2de;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
}

.modal-card input,
.modal-card select {
  width: 100%;
  background: #f2e8bf;
  border: 3px solid #2a1807;
  padding: 0.6rem 0.7rem;
  color: #1d1606;
  font-family: "Courier New", monospace;
  font-size: 0.9rem;
  outline: none;
  box-shadow: inset 0 0 0 2px #d4c27e;
}

.modal-card input:focus,
.modal-card select:focus {
  box-shadow: inset 0 0 0 2px #e1cc80, 0 0 0 3px #f8d667;
}

.monthly-modal,
.history-modal,
.detail-modal {
  width: min(100%, 960px);
  max-height: 88vh;
}

.monthly-head {
  display: flex;
  gap: 0.5rem;
}

.monthly-head input {
  flex: 1;
}

.monthly-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.monthly-stats article {
  border: 3px solid #2a1807;
  background: linear-gradient(180deg, #fdfbf3 0%, #e8d9a8 100%);
  color: #1d1606;
  padding: 0.7rem;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5), 0 3px 0 #1a1005;
}

.monthly-stats article strong {
  font-size: 1.1rem;
  font-family: "Courier New", monospace;
  display: block;
  margin-top: 0.2rem;
}

.monthly-stats p {
  font-size: 0.7rem;
  text-transform: uppercase;
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.weekly-chart {
  border: 3px solid #2a1807;
  background: linear-gradient(180deg, #fdfbf3 0%, #e8d9a8 100%);
  color: #1d1606;
  padding: 0.7rem;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5), 0 3px 0 #1a1005;
}

.weekly-chart h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: "Courier New", monospace;
}

.bars {
  display: grid;
  gap: 0.55rem;
}

.bar-row {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  gap: 0.45rem;
  align-items: center;
}

.bar-track {
  position: relative;
  height: 14px;
  background: #e7d897;
  border: 1px solid #bda867;
  overflow: hidden;
}

.bar-sales {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: #48d308;
}

.bar-profit {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: rgba(248, 214, 103, 0.75);
}

.history-filters {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

.history-filters select {
  background: #f2e8bf;
  border: 2px solid #2a1807;
  padding: 0.4rem 0.5rem;
  color: #1d1606;
  font-family: "Courier New", monospace;
  font-size: 0.8rem;
}

.history-filters strong {
  justify-self: end;
  font-family: "Courier New", monospace;
  color: #f8d667;
}

.history-list {
  border: 3px solid #2a1807;
  background: linear-gradient(180deg, #fdfbf3 0%, #e8d9a8 100%);
  color: #1d1606;
  min-height: 260px;
  max-height: 420px;
  overflow: auto;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5);
}

.history-item {
  padding: 0.7rem;
  border-bottom: 1px solid #baa15c;
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  cursor: pointer;
  transition: background 80ms steps(2);
}

.history-item:hover {
  background: rgba(248, 214, 103, 0.3);
}

.history-item h4 {
  font-size: 0.82rem;
  margin: 0;
}

.history-item p {
  font-size: 0.73rem;
  margin: 0;
}

.history-item strong {
  color: #18661a;
  font-family: "Courier New", monospace;
}

.empty {
  padding: 1.5rem;
  text-align: center;
  color: #5a4a2a;
  font-family: "Courier New", monospace;
}

.detail-grid {
  border: 3px solid #2a1807;
  background: linear-gradient(180deg, #fdfbf3 0%, #e8d9a8 100%);
  color: #1d1606;
  padding: 0.8rem;
  display: grid;
  gap: 0.5rem;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5), 0 3px 0 #1a1005;
}

.detail-grid p {
  margin: 0;
  font-size: 0.82rem;
  font-family: "Courier New", monospace;
}

.detail-grid strong {
  color: #18661a;
}

.tabla-wrap {
  overflow: auto;
  border: 3px solid #2a1807;
  background: linear-gradient(180deg, #fdfbf3 0%, #e8d9a8 100%);
  color: #1d1606;
  height: 100%;
  max-height: calc(100vh - 320px);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.5rem;
  border-bottom: 1px solid #baa15c;
  text-align: left;
  font-size: 0.76rem;
  font-family: "Courier New", monospace;
}

.history-item:hover {
  background: #e8d791;
}

.history-item h4 {
  font-size: 0.82rem;
}

.history-item p {
  font-size: 0.73rem;
}

.empty {
  padding: 0.9rem;
}

.detail-grid {
  border: 2px solid #2a1807;
  background: #f2e8bf;
  color: #1d1606;
  padding: 0.7rem;
  display: grid;
  gap: 0.4rem;
}

.tabla-wrap {
  overflow: auto;
  border: 2px solid #2a1807;
  background: #f2e8bf;
  color: #1d1606;
  height: 100%;
  max-height: calc(100vh - 320px);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.55rem;
  border-bottom: 1px solid #baa15c;
  text-align: left;
  font-size: 0.76rem;
}

th {
  position: sticky;
  top: 0;
  background: #e8d790;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 2px solid rgba(248, 214, 103, 0.3);
  position: relative;
}

.modal-actions button {
  border: 3px solid #2a1807;
  padding: 0.55rem 1rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 3px 0 #6f4b1c, 0 5px 8px rgba(0, 0, 0, 0.3);
  transition: transform 80ms steps(2), filter 80ms linear;
}

.modal-actions button:first-child {
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  color: #1a1401;
}

.modal-actions button.btn-secondary {
  background: linear-gradient(180deg, #e2deca 0%, #bdb696 100%);
  color: #1a1401;
}

.modal-actions button:hover {
  filter: brightness(1.08);
  transform: translateY(-2px);
}

.modal-actions button:active {
  transform: translateY(2px);
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 1px 0 #6f4b1c;
}

@keyframes swing {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  25% { transform: rotate(-0.8deg) translateY(1px); }
  75% { transform: rotate(0.8deg) translateY(1px); }
}

@keyframes popIn {
  0% { transform: translateY(10px) scale(0.98); opacity: 0.45; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@media (max-width: 1100px) {
  .cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card-metric.total {
    grid-column: span 2;
  }
}

@media (max-width: 980px) {
  .sign-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .sign-grid {
    grid-template-columns: 1fr;
  }

  .cards-grid,
  .monthly-stats {
    grid-template-columns: 1fr;
  }

  .card-metric.total {
    grid-column: span 1;
  }

  .history-filters {
    grid-template-columns: 1fr;
  }

  .history-filters strong {
    justify-self: start;
  }

  .modal-actions {
    flex-direction: column;
  }
}
</style>
