<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from '../composables/useTheme';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'vue-chartjs';
import SalidaEfectivoModal from './modals/SalidaEfectivoModal.vue';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const { currentTheme } = useTheme();

function getZeldaGoldColor(): string {
  const dummy = currentTheme.value; // Force dependency
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue('--zelda-gold').trim() || '#c99234';
}

function getChartBackgroundColor(): string {
  const dummy = currentTheme.value; // Force dependency
  const style = getComputedStyle(document.documentElement);
  const bgValue = style.getPropertyValue('--chart-bg').trim();
  if (bgValue.startsWith('linear-gradient')) {
    const matches = bgValue.match(/#[a-fA-F0-9]{6}/);
    return matches ? matches[0] : '#1a1a2e';
  }
  return bgValue || '#1a1a2e';
}

function getChartTextColor(): string {
  const dummy = currentTheme.value; // Force dependency
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue('--chart-text').trim() || '#f6f2de';
}

function getSuccessColor(): string {
  const dummy = currentTheme.value; // Force dependency
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue('--success-color').trim() || '#28a745';
}

function getAccentColor(): string {
  const dummy = currentTheme.value; // Force dependency
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue('--accent-color').trim() || '#c99234';
}

function getErrorColor(): string {
  const dummy = currentTheme.value; // Force dependency
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue('--error-color').trim() || '#dc3545';
}

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
  idUsuario?: number;
  numeroTicket?: number;
  fechaVenta?: string;
  metodoPago?: string;
  montoTotal?: number;
  estatus?: string;
  usuario?: UsuarioDTO;
  nombreUsuario?: string;
};

type GananciasDTO = {
  cobroTotal?: number;
  gananciaTotal?: number;
  ventas?: VentaDTO[];
  nombreUsuario?: string;
};

type CorteDTO = {
  fechaCorte: string;
  montoInicial: number;
  totalVentas: number;
  totalEgresos: number;
  otrosIngresos: number;
  saldoFinalCalculado: number;
  gananciaTotal: number;
  ventasEfectivo?: number;
  ventasTransferencia?: number;
  totalTickets?: number;
  horasTrabajadas?: string;
};

type EgresoDTO = {
  idCaja: number;
  fechaMovimiento: string;
  tipoMovimiento: string;
  monto: number;
  descripcion: string;
  saldoResultante: number;
  estatus: string;
  usuario?: {
    idUsuario: number;
    nombre: string;
    apellido_p: string;
    usuario: string;
  };
};

type VentaDetalleDTO = {
  idVentaDetalle: number;
  cantidad: number;
  precioUnitarioVenta: number;
  tipoPrecioAplicado?: string;
  Venta: VentaDTO;
  venta?: VentaDTO;
  productoId?: number;
  productoNombre?: string;
  productoPrecioCosto?: number;
  productoIsGramaje?: boolean;
};

type ApartadoDTO = {
  idApartado: number;
  nombreProducto: string;
  montoTotal: number;
  montoPagado: number;
  montoRestante: number;
  frecuenciaPago: string;
  montoPorPeriodo: number;
  montoDiario: number;
  fechaInicio: string;
  fechaFin: string;
  estatus: string;
  idUsuario: number;
  nombreUsuario?: string;
  fechaRegistro: string;
};

type ApartadoPagoDTO = {
  idPago: number;
  idApartado: number;
  nombreProducto: string;
  monto: number;
  fechaPago: string;
  idUsuario: number;
  nombreUsuario?: string;
};

type ReporteAnualDTO = {
  year: number;
  ventasTotales: number;
  gananciaTotal: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  ventasTarjeta: number;
  meses: MesData[];
  ventasPorHorario: HorarioData[];
  productosPorHorario: ProductoHorarioData[];
};

type MesData = {
  mes: number;
  nombreMes: string;
  ventas: number;
  ganancia: number;
  numeroVentas: number;
  porcentajeCambio: number;
};

type HorarioData = {
  horario: string;
  numeroVentas: number;
  totalVentas: number;
};

type ProductoHorarioData = {
  horario: string;
  nombreProducto: string;
  cantidadVendida: number;
  totalVendido: number;
  isGramaje: boolean;
};

const reporteAnualData = ref<ReporteAnualDTO | null>(null);
const cargandoAnual = ref(false);

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';
const AUTH_USER_ID_KEY = 'idUsuario';

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200);

function updateWidth() {
  windowWidth.value = window.innerWidth;
}

onMounted(() => {
  window.addEventListener('resize', updateWidth);
  verificarCajaActiva();
});

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth);
});

const idUsuario = ref<number>(Number(localStorage.getItem(AUTH_USER_ID_KEY) || 0));
const nombreUsuario = ref(localStorage.getItem('nombreUsuario') || 'Usuario');
const tipoUsuario = ref<number>(Number(localStorage.getItem('tipoUsuario') || 2));
const esAdministrador = computed(() => tipoUsuario.value === 1);

const horasTrabajadas = computed(() => {
  if (horaInicioCaja.value && horaFinCaja.value) {
    const inicio = new Date(horaInicioCaja.value);
    const fin = new Date(horaFinCaja.value);
    const diffMs = fin.getTime() - inicio.getTime();
    
    if (diffMs > 0) {
      const horas = Math.floor(diffMs / (1000 * 60 * 60));
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${horas}h ${minutos}m`;
    }
  }
  
  if (horaInicioCaja.value) {
    const inicio = new Date(horaInicioCaja.value);
    const ahora = new Date();
    const diffMs = ahora.getTime() - inicio.getTime();
    
    if (diffMs > 0) {
      const horas = Math.floor(diffMs / (1000 * 60 * 60));
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${horas}h ${minutos}m`;
    }
  }
  
  return 'Sin registro';
});

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
const modalEgresosAbierto = ref(false);
const modalSalidaAbierto = ref(false);
const modalApartadosAbierto = ref(false);
const modalAnualAbierto = ref(false);

const anioReporte = ref(new Date().getFullYear());

async function registrarSalida(payload: { montoEoS: number, descripcion: string }) {
  try {
    const res = await fetch(`${API_BASE}/caja/salida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, idUsuario: idUsuario.value })
    });
    
    if (res.ok) {
      mostrarMensaje("Salida de efectivo registrada correctamente.", "ok");
      modalSalidaAbierto.value = false;
      
      // Si el modal de egresos está abierto, recargar los datos
      if (modalEgresosAbierto.value) {
        await abrirModalEgresos();
      }
      
      // Recargar el corte si está visible
      if (mostrarReporte.value && !modalDiarioAbierto.value) {
        if (reporteTitulo.value === 'Reporte del Corte Actual') {
          await generarCorte();
        } else {
          await generarReporteDiario();
        }
      }
    } else {
      const errorData = await res.json();
      mostrarMensaje(`Error: ${errorData.mensaje || 'No se pudo registrar la salida'}`, "error");
    }
  } catch (e) {
    mostrarMensaje("Error de conexión al registrar la salida.", "error");
  }
}
const tipoGraficaCorte = ref<'unitario' | 'gramaje'>('unitario');
const tipoGraficaDiaria = ref<'unitario' | 'gramaje'>('unitario');
const tipoGraficaMensual = ref<'unitario' | 'gramaje'>('unitario');

const apartadosActivos = ref<ApartadoDTO[]>([]);
const apartadosCompletados = ref<ApartadoDTO[]>([]);
const cargandoApartados = ref(false);
const cargandoApartadosCompletados = ref(false);
const totalApartarDiario = ref(0);
const historialPagos = ref<ApartadoPagoDTO[]>([]);
const cargandoHistorialPagos = ref(false);
const mostrarHistorialApartado = ref(false);
const mostrarHistorialCompletados = ref(false);

const apartadoActivo = computed(() => {
  return apartadosActivos.value.length > 0 ? apartadosActivos.value[0] : null;
});

const nombreApartadoActivo = computed(() => {
  return apartadoActivo.value?.nombreProducto || '';
});

const nuevoApartado = ref({
  nombreProducto: '',
  montoTotal: 0,
  frecuenciaPago: 'mensual',
  plazoMeses: 1,
  fechaInicio: new Date().toISOString().slice(0, 10)
});

const fechaDiaria = ref(new Date().toISOString().slice(0, 10));
const mesMensual = ref(new Date().toISOString().slice(0, 7));
const fechaRangoInicio = ref(new Date().toISOString().slice(0, 10));
const fechaRangoFin = ref(new Date().toISOString().slice(0, 10));

const corteActual = ref<CorteDTO | null>(null);
const montoInicialCajaActiva = ref<number>(0);
const ventasEfectivo = ref(0);
const ventasTransferencia = ref(0);
const totalTicketsDia = ref(0);
const horaInicioCaja = ref<string | null>(null);
const horaFinCaja = ref<string | null>(null);
const reporteTitulo = ref('Reporte del Corte Actual');

const mensualTotalVentas = ref(0);
const mensualTotalTransferencia = ref(0);
const mensualTotalTarjeta = ref(0);
const mensualTotalGanancias = ref(0);
const mensualSemanas = shallowRef<{ semana: number; ventas: number; ganancia: number; dias: string }[]>([]);
const rangoFechasSemanas = ref<{ inicio: Date; fin: Date } | null>(null);

const historialDetalles = shallowRef<VentaDetalleDTO[]>([]);
const filtroMesHistorial = ref('all');
const filtroDiaHistorial = ref('all');
const ventaDetalleSeleccionada = ref<VentaDTO | null>(null);
const ventaDetalleItems = shallowRef<VentaDetalleDTO[]>([]);

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

const egresosDia = ref<EgresoDTO[]>([]);
const cargandoEgresos = ref(false);

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
  let sum = 0;
  for (const x of historialFiltrado.value) {
    sum += Number(x.venta.montoTotal || 0);
  }
  return sum;
});

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor || 0));
}

function formatoMonedaRedondeada(valor: number) {
  const redondeado = Math.round(Number(valor || 0));
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(redondeado);
}

function formatoMonedaRedonda(valor: number) {
  const redondeado = Math.round(Number(valor || 0));
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(redondeado);
}

function getMetodoClase(metodo: string | undefined): string {
  if (!metodo) return 'efectivo';
  const m = metodo.toUpperCase();
  if (m === 'TRANSFERENCIA') return 'transfer';
  if (m === 'TARJETA') return 'tarjeta';
  return 'efectivo';
}

function getMetodoIcono(metodo: string | undefined): string {
  if (!metodo) return '💵';
  const m = metodo.toUpperCase();
  if (m === 'TRANSFERENCIA') return '📱';
  if (m === 'TARJETA') return '💳';
  return '💵';
}

function getMaxVentas() {
  if (!mensualSemanas.value.length) return 0;
  return Math.max(...mensualSemanas.value.map(w => w.ventas), 0);
}

function getMaxGanancias() {
  if (!mensualSemanas.value.length) return 0;
  return Math.max(...mensualSemanas.value.map(w => w.ganancia), 0);
}

function getBarHeightVentas(ventas: number) {
  const max = getMaxVentas();
  if (max === 0) return 0;
  return (ventas / max) * 100;
}

function getBarHeightGanancias(ganancia: number) {
  const max = getMaxVentas();
  if (max === 0) return 0;
  return (ganancia / max) * 100;
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

function calcularSemanasMensual(ventas: Array<{ fechaVenta?: string; totalVenta: number; ganancia: number }>, mes: number, anio: number) {
  const weeks = [1, 2, 3, 4].map((n) => ({ semana: n, ventas: 0, ganancia: 0, dias: '' }));

  const diasPorSemana = [
    { inicio: 1, fin: 7 },
    { inicio: 8, fin: 14 },
    { inicio: 15, fin: 21 },
    { inicio: 22, fin: 28 }
  ];
  
  const ultimoDiaMes = new Date(anio, mes + 1, 0).getDate();
  if (ultimoDiaMes > 28) {
    diasPorSemana[3].fin = ultimoDiaMes;
  }

  for (let i = 0; i < 4; i++) {
    weeks[i].dias = `${diasPorSemana[i].inicio} - ${diasPorSemana[i].fin}`;
  }

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

async function verificarCajaActiva() {
  if (!idUsuario.value) return;
  
  const modoReportes = localStorage.getItem('modoReportes') === 'true';
  
  if (modoReportes) {
    montoInicialCajaActiva.value = 0;
    localStorage.setItem('montoInicialCaja', '0');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/caja/apertura/activa?idUsuario=${idUsuario.value}`);
    const data = await res.json();

    if (res.ok && data.datos !== null) {
      montoInicialCajaActiva.value = Number(data.datos.monto || 0);
      localStorage.setItem('montoInicialCaja', String(data.datos.monto || 0));
    } else {
      montoInicialCajaActiva.value = 0;
    }
  } catch (err) {
    console.error("Error al verificar caja activa:", err);
    montoInicialCajaActiva.value = 0;
  }
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

    const fechaCorte = new Date(corte.fechaCorte);

    // Usar datos del corte directamente en lugar de llamar a obtenerVentas
    ventasEfectivo.value = Number(corte.ventasEfectivo || 0);
    ventasTransferencia.value = Number(corte.ventasTransferencia || 0);
    totalTicketsDia.value = Number(corte.totalTickets || 0);
    corteActual.value = corte;
    reporteTitulo.value = 'Reporte del Corte Actual';
    mostrarReporte.value = true;
    mostrarCerrarTurno.value = true;

    // Calcular productos más vendidos para el corte actual
    try {
      const dataVentas = await fetchApi<GananciasDTO>(`/ventas/obtenerVentaPorDia/${corte.fechaCorte.split('T')[0]}`);
      const ventasUsuario = (dataVentas?.ventas || []).filter(v => 
        v.idUsuario === idUsuario.value && (v.estatus === 'C' || v.estatus === 'F')
      );
      
      if (ventasUsuario.length > 0) {
        const idsVentas = ventasUsuario.map(v => v.idVenta);
        const allDetails = await fetchApi<VentaDetalleDTO[]>('/ventasDetalle/obtenerTodosLosVentasDetalles');
        const detallesCorte = (allDetails || []).filter(d => {
          const idVenta = Number(d?.Venta?.idVenta || 0);
          return idsVentas.includes(idVenta);
        });
        calcularProductosReporte(detallesCorte, 'diario');
      } else {
        productosUnitariosDiario.value = [];
        productosGranelDiario.value = [];
      }
    } catch (e) {
      console.error('Error al calcular productos para el corte:', e);
    }

    if (idUsuario.value) {
      try {
        const totalApartadoData = await fetchApi<number | { datos: number }>(`/apartado/totalDiario?idUsuario=${idUsuario.value}`);
        const totalValue = typeof totalApartadoData === 'number' ? totalApartadoData : (totalApartadoData?.datos || 0);
        totalApartarDiario.value = totalValue;
        
        const apartadosData = await fetchApi<ApartadoDTO[] | { datos: ApartadoDTO[] }>(`/apartado/activos?idUsuario=${idUsuario.value}`);
        apartadosActivos.value = Array.isArray(apartadosData) ? apartadosData : (apartadosData?.datos || []);
      } catch (e) {
        console.error('Error al obtener total apartados:', e);
        totalApartarDiario.value = 0;
        apartadosActivos.value = [];
      }
    }

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

  productosMasVendidos.value = [];
  productosUnitarios.value = [];
  productosGranel.value = [];
  mostrarReporte.value = false;

  try {
    const data = await fetchApi<GananciasDTO>(`/ventas/obtenerVentaPorDia/${fechaDiaria.value}`);
    console.log('Data response:', data);
    const ventas = Array.isArray(data?.ventas) ? data.ventas : [];
    console.log('Ventas:', ventas);

    ventasEfectivo.value = ventas
      .filter((v) => ['EFECTIVO', 'Efectivo'].includes(String(v.metodoPago || '')))
      .reduce((sum, v) => sum + Number(v.montoTotal || 0), 0);

    ventasTransferencia.value = ventas
      .filter((v) => String(v.metodoPago || '').toUpperCase() === 'TRANSFERENCIA')
      .reduce((sum, v) => sum + Number(v.montoTotal || 0), 0);

    // Obtener datos de caja (monto inicial, ingresos, egresos) del día sin importar usuario
    let montoInicial = 0;
    let otrosIngresos = 0;
    let totalEgresos = 0;
    
    try {
      const cajaData = await fetchApi<any>(`/caja/reporteDiario/${fechaDiaria.value}`);
      console.log('Caja data response:', cajaData);
      const datos = cajaData?.datos || cajaData;
      if (datos) {
        montoInicial = Number(datos.montoInicial) || 0;
        otrosIngresos = Number(datos.otrosIngresos) || 0;
        totalEgresos = Number(datos.totalEgresos) || 0;
        horaInicioCaja.value = datos.horaInicio || null;
        horaFinCaja.value = datos.horaFin || null;
        if (datos.nombreUsuario) {
          nombreUsuario.value = datos.nombreUsuario;
        }
      }
    } catch (e) {
      console.error('Error al obtener datos de caja:', e);
    }

    const totalVentas = Number(data?.cobroTotal || 0);
    const saldoFinal = montoInicial + totalVentas + otrosIngresos - totalEgresos;

    if (data?.nombreUsuario && !nombreUsuario.value) {
      nombreUsuario.value = data.nombreUsuario;
    } else {
      const ventasCountMap = new Map<number, { nombre: string; count: number }>();
      for (const v of ventas) {
        const nombre = v.nombreUsuario || v.usuario?.nombre;
        const id = v.idUsuario || v.usuario?.idUsuario;
        if (id && nombre) {
          const current = ventasCountMap.get(id);
          if (current) {
            current.count++;
          } else {
            ventasCountMap.set(id, { nombre, count: 1 });
          }
        }
      }
      let cajeroPrincipal = 'Varios';
      let maxVentas = 0;
      for (const [, dataVenta] of ventasCountMap) {
        if (dataVenta.count > maxVentas) {
          maxVentas = dataVenta.count;
          cajeroPrincipal = dataVenta.nombre;
        }
      }
      if (ventasCountMap.size === 1) {
        cajeroPrincipal = Array.from(ventasCountMap.values())[0]?.nombre || 'Usuario';
      }
      nombreUsuario.value = cajeroPrincipal;
    }

    console.log('Setting corteActual:', {
      montoInicial,
      totalVentas,
      otrosIngresos,
      totalEgresos,
      saldoFinal
    });

    corteActual.value = {
      fechaCorte: `${fechaDiaria.value}T00:00:00`,
      montoInicial: montoInicial,
      totalVentas: totalVentas,
      totalEgresos: totalEgresos,
      otrosIngresos: otrosIngresos,
      saldoFinalCalculado: saldoFinal,
      gananciaTotal: Number(data?.gananciaTotal || 0)
    };

    // Obtener productos más vendidos del día
    try {
      const idsVentasDia = ventas.filter(v => v.estatus === 'C' || v.estatus === 'F').map(v => v.idVenta);
      console.log('IDs ventas dia:', idsVentasDia);
      if (idsVentasDia.length > 0) {
        const allDetails = await fetchApi<VentaDetalleDTO[]>('/ventasDetalle/obtenerTodosLosVentasDetalles');
        console.log('All details:', allDetails);
        const detallesDia = (allDetails || []).filter(d => {
          const idVenta = Number(d?.Venta?.idVenta || 0);
          return idsVentasDia.includes(idVenta);
        });
        console.log('Detalles filtrados:', detallesDia);
        calcularProductosReporte(detallesDia, 'diario');
        console.log('Productos diario:', productosDiario.value);
        console.log('Productos unitarios diario:', productosUnitariosDiario.value);
        console.log('Productos granel diario:', productosGranelDiario.value);
      } else {
        productosDiario.value = [];
        productosUnitariosDiario.value = [];
        productosGranelDiario.value = [];
      }
    } catch (e) {
      console.error('Error al obtener productos más vendidos:', e);
      productosDiario.value = [];
      productosUnitariosDiario.value = [];
      productosGranelDiario.value = [];
    }

    if (idUsuario.value) {
      try {
        const totalApartadoData = await fetchApi<number | { datos: number }>(`/apartado/totalDiario?idUsuario=${idUsuario.value}`);
        const totalValue = typeof totalApartadoData === 'number' ? totalApartadoData : (totalApartadoData?.datos || 0);
        totalApartarDiario.value = totalValue;
      } catch (e) {
        console.error('Error al obtener total apartados:', e);
        totalApartarDiario.value = 0;
      }
    }

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

type ProductoVendido = {
  nombre: string;
  cantidadTotal: number;
  montoTotal: number;
  isGramaje: boolean;
};

const productosMasVendidos = shallowRef<ProductoVendido[]>([]);
const productosUnitarios = shallowRef<ProductoVendido[]>([]);
const productosGranel = shallowRef<ProductoVendido[]>([]);

const productosDiario = shallowRef<ProductoVendido[]>([]);
const productosUnitariosDiario = shallowRef<ProductoVendido[]>([]);
const productosGranelDiario = shallowRef<ProductoVendido[]>([]);

const productosMensual = shallowRef<ProductoVendido[]>([]);
const productosUnitariosMensual = shallowRef<ProductoVendido[]>([]);
const productosGranelMensual = shallowRef<ProductoVendido[]>([]);

function formatearCantidad(cantidad: number, isGramaje: boolean): string {
  if (!isGramaje) {
    return `${cantidad} pzs`;
  }
  if (cantidad >= 1000) {
    const kg = cantidad / 1000;
    return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2)} kg`;
  }
  return `${cantidad} g`;
}

function calcularProductosMasVendidos(detalles: VentaDetalleDTO[]) {
  const productosMap = new Map<string, ProductoVendido>();

  for (const d of detalles) {
    const nombre = d.productoNombre || 'Producto eliminado';
    const cantidad = Number(d.cantidad || 0);
    const importe = Number(d.precioUnitarioVenta || 0) * cantidad;
    const tipoPrecio = String(d.tipoPrecioAplicado || '').trim().toUpperCase();
    const isGramaje = tipoPrecio === 'VENTA_GRAMAJE' || d.productoIsGramaje === true;

    if (!productosMap.has(nombre)) {
      productosMap.set(nombre, { nombre, cantidadTotal: 0, montoTotal: 0, isGramaje });
    }

    const producto = productosMap.get(nombre)!;
    producto.cantidadTotal += cantidad;
    producto.montoTotal += importe;
    if (isGramaje) {
      producto.isGramaje = true;
    }
  }

  const sorted = Array.from(productosMap.values())
    .sort((a, b) => b.cantidadTotal - a.cantidadTotal);

  const unitarios = sorted.filter(p => !p.isGramaje);
  const granel = sorted.filter(p => p.isGramaje);

  productosMasVendidos.value = sorted;
  productosUnitarios.value = unitarios;
  productosGranel.value = granel;
  
  return sorted;
}

function calcularProductosReporte(detalles: VentaDetalleDTO[], tipo: 'diario' | 'mensual') {
  const productosMap = new Map<string, ProductoVendido>();

  for (const d of detalles) {
    const nombre = d.productoNombre || 'Producto eliminado';
    const cantidad = Number(d.cantidad || 0);
    const importe = Number(d.precioUnitarioVenta || 0) * cantidad;
    const tipoPrecio = String(d.tipoPrecioAplicado || '').trim().toUpperCase();
    const isGramaje = tipoPrecio === 'VENTA_GRAMAJE' || d.productoIsGramaje === true;

    if (!productosMap.has(nombre)) {
      productosMap.set(nombre, { nombre, cantidadTotal: 0, montoTotal: 0, isGramaje });
    }

    const producto = productosMap.get(nombre)!;
    producto.cantidadTotal += cantidad;
    producto.montoTotal += importe;
    if (isGramaje) {
      producto.isGramaje = true;
    }
  }

  const unitarios = Array.from(productosMap.values()).filter(p => !p.isGramaje);
  const granel = Array.from(productosMap.values()).filter(p => p.isGramaje);

  if (tipo === 'diario') {
    const sortedUnitarios = unitarios.sort((a, b) => b.montoTotal - a.montoTotal).slice(0, 5);
    const sortedGranel = granel.sort((a, b) => b.montoTotal - a.montoTotal).slice(0, 5);
    productosDiario.value = [...sortedUnitarios, ...sortedGranel];
    productosUnitariosDiario.value = sortedUnitarios;
    productosGranelDiario.value = sortedGranel;
  } else {
    // Obtener los mejores 10 de CADA categoría de forma independiente
    const sortedUnitarios = unitarios.sort((a, b) => b.cantidadTotal - a.cantidadTotal).slice(0, 10);
    const sortedGranel = granel.sort((a, b) => b.cantidadTotal - a.cantidadTotal).slice(0, 10);
    
    productosMensual.value = [...sortedUnitarios, ...sortedGranel];
    productosUnitariosMensual.value = sortedUnitarios;
    productosGranelMensual.value = sortedGranel;
  }
  
  return unitarios;
}

function getChartData(productos: ProductoVendido[]) {
  if (!productos.length) {
    return { labels: [], datasets: [] };
  }

  const labels = productos.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 17) + '...' : p.nombre);
  const data = productos.map(p => p.cantidadTotal);

  return {
    labels,
    datasets: [
      {
        label: 'Cantidad Vendida',
        data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199, 0.8)',
          'rgba(83, 102, 255, 0.8)',
          'rgba(40, 159, 64, 0.8)',
          'rgba(210, 99, 132, 0.8)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 206, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
          'rgb(255, 159, 64)',
          'rgb(199, 199, 199)',
          'rgb(83, 102, 255)',
          'rgb(40, 159, 64)',
          'rgb(210, 99, 132)'
        ],
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }
    ]
  };
}

const chartData = computed(() => getChartData(productosMasVendidos.value));
const chartDataUnitarios = computed(() => getChartData(productosUnitarios.value));
const chartDataGranel = computed(() => getChartData(productosGranel.value));

const chartDataCombinado = computed(() => {
  const unitarios = productosUnitarios.value;
  const granel = productosGranel.value;
  
  if (unitarios.length === 0 && granel.length === 0) {
    return { labels: [], datasets: [] };
  }

  const allProducts = [...unitarios, ...granel];
  const labels = allProducts.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 17) + '...' : p.nombre);
  const data = allProducts.map(p => p.cantidadTotal);
  const isGramaje = allProducts.map(p => p.isGramaje);

  return {
    labels,
    datasets: [{
      label: 'Cantidad Vendida',
      data,
      backgroundColor: isGramaje.map(g => g ? 'rgba(75, 192, 192, 0.8)' : 'rgba(54, 162, 235, 0.8)'),
      borderColor: isGramaje.map(g => g ? 'rgb(75, 192, 192)' : 'rgb(54, 162, 235)'),
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }]
  };
});

const chartOptionsCombinado = computed(() => {
  const allProducts = [...productosUnitarios.value, ...productosGranel.value];
  return getChartOptions(allProducts);
});

const chartDataDiarioCombinado = computed(() => {
  const unitarios = productosUnitariosDiario.value;
  const granel = productosGranelDiario.value;
  
  if (unitarios.length === 0 && granel.length === 0) {
    return { labels: [], datasets: [] };
  }

  const allProducts = [...unitarios, ...granel];
  const labels = allProducts.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 17) + '...' : p.nombre);
  const data = allProducts.map(p => p.montoTotal);
  const isGramaje = allProducts.map(p => p.isGramaje);

  return {
    labels,
    datasets: [{
      label: 'Monto Vendido',
      data,
      backgroundColor: isGramaje.map(g => g ? 'rgba(75, 192, 192, 0.8)' : 'rgba(54, 162, 235, 0.8)'),
      borderColor: isGramaje.map(g => g ? 'rgb(75, 192, 192)' : 'rgb(54, 162, 235)'),
      borderWidth: 2,
    }]
  };
});

const chartDataDiarioUnitarios = computed(() => {
  const productos = productosUnitariosDiario.value;
  if (!productos.length) return { labels: [], datasets: [] };
  const labels = productos.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 17) + '...' : p.nombre);
  return {
    labels,
    datasets: [{
      label: 'Monto Vendido',
      data: productos.map(p => p.montoTotal),
      backgroundColor: [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)'
      ],
      borderColor: [
        'rgb(54, 162, 235)',
        'rgb(255, 99, 132)',
        'rgb(255, 206, 86)',
        'rgb(153, 102, 255)',
        'rgb(255, 159, 64)'
      ],
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }]
  };
});

const chartDataDiarioGranel = computed(() => {
  const productos = productosGranelDiario.value;
  if (!productos.length) return { labels: [], datasets: [] };
  const labels = productos.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 17) + '...' : p.nombre);
  return {
    labels,
    datasets: [{
      label: 'Monto Vendido',
      data: productos.map(p => p.montoTotal),
      backgroundColor: [
        'rgba(75, 192, 192, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)'
      ],
      borderColor: [
        'rgb(75, 192, 192)',
        'rgb(255, 99, 132)',
        'rgb(255, 206, 86)',
        'rgb(153, 102, 255)',
        'rgb(255, 159, 64)'
      ],
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }]
  };
});

const chartOptionsDiarioDoughnut = computed(() => {
  const textColor = getChartTextColor();
  const isSmall = windowWidth.value < 480;
  const fontSize = isSmall ? 10 : 12;
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: textColor,
          font: { size: fontSize },
          padding: 10,
          generateLabels: (chart: any) => {
            const datasets = chart.data.datasets;
            return chart.data.labels.map((label: string, i: number) => ({
              text: label,
              fillStyle: datasets[0].backgroundColor[i],
              strokeStyle: datasets[0].borderColor[i],
              lineWidth: 2,
              index: i
            }));
          }
        }
      },
      tooltip: {
        titleFont: { size: fontSize + 1 },
        bodyFont: { size: fontSize },
        callbacks: {
          label: (context: any) => {
            const producto = productosDiario.value[context.dataIndex];
            return [
              `Monto: ${formatoMonedaRedondeada(producto?.montoTotal || 0)}`,
              `Cantidad: ${formatearCantidad(producto?.cantidadTotal || 0, producto?.isGramaje || false)}`
            ];
          }
        }
      }
    }
  };
});

const chartOptionsDiarioCombinado = computed(() => {
  const allProducts = [...productosUnitariosDiario.value, ...productosGranelDiario.value];
  return getChartOptions(allProducts);
});

const chartOptionsDiarioUnitarios = computed(() => getChartOptions(productosUnitariosDiario.value));
const chartOptionsDiarioGranel = computed(() => getChartOptions(productosGranelDiario.value));

const chartDataMensualCombinado = computed(() => {
  const unitarios = productosUnitariosMensual.value;
  const granel = productosGranelMensual.value;
  
  if (unitarios.length === 0 && granel.length === 0) {
    return { labels: [], datasets: [] };
  }

  const allProducts = [...unitarios, ...granel];
  const labels = allProducts.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 17) + '...' : p.nombre);
  const data = allProducts.map(p => p.cantidadTotal);
  const isGramaje = allProducts.map(p => p.isGramaje);

  return {
    labels,
    datasets: [{
      label: 'Cantidad Vendida',
      data,
      backgroundColor: isGramaje.map(g => g ? 'rgba(75, 192, 192, 0.8)' : 'rgba(54, 162, 235, 0.8)'),
      borderColor: isGramaje.map(g => g ? 'rgb(75, 192, 192)' : 'rgb(54, 162, 235)'),
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }]
  };
});

const chartDataMensualUnitarios = computed(() => {
  const data = getChartData(productosUnitariosMensual.value);
  const accentColor = getAccentColor();
  if (data.datasets.length > 0) {
    data.datasets[0].backgroundColor[0] = colorWithOpacity(accentColor, 0.8);
    data.datasets[0].borderColor[0] = accentColor;
  }
  return data;
});

const chartDataMensualGranel = computed(() => {
  const data = getChartData(productosGranelMensual.value);
  const successColor = getSuccessColor();
  if (data.datasets.length > 0) {
    data.datasets[0].backgroundColor[0] = colorWithOpacity(successColor, 0.8);
    data.datasets[0].borderColor[0] = successColor;
  }
  return data;
});

const chartOptionsMensualCombinado = computed(() => {
  const allProducts = [...productosUnitariosMensual.value, ...productosGranelMensual.value];
  return getChartOptions(allProducts);
});

const chartOptionsMensualUnitarios = computed(() => getChartOptions(productosUnitariosMensual.value));
const chartOptionsMensualGranel = computed(() => getChartOptions(productosGranelMensual.value));

function getChartOptions(productosList: ProductoVendido[]) {
  const isSmall = windowWidth.value < 600;
  const isMedium = windowWidth.value >= 600 && windowWidth.value < 1024;
  
  const fontSize = isSmall ? 9 : isMedium ? 10 : 12;
  const textColor = getChartTextColor();

  return {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: isSmall ? 5 : 10
    },
    plugins: {
      legend: {
        display: !isSmall,
        position: 'top' as const,
        labels: {
          color: textColor,
          font: { size: fontSize }
        }
      },
      tooltip: {
        titleFont: { size: fontSize + 1 },
        bodyFont: { size: fontSize },
        callbacks: {
          label: (context: any) => {
            const producto = productosList[context.dataIndex];
            if (!producto) return '';
            return [
              `Cantidad: ${formatearCantidad(producto.cantidadTotal, producto.isGramaje)}`,
              `Monto: ${formatoMonedaRedondeada(producto.montoTotal)}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: textColor,
          font: { size: fontSize }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: textColor,
          font: { size: fontSize }
        }
      }
    }
  };
}

const chartOptions = computed(() => getChartOptions(productosMasVendidos.value));
const chartOptionsUnitarios = computed(() => getChartOptions(productosUnitarios.value));
const chartOptionsGranel = computed(() => getChartOptions(productosGranel.value));

const weeklyChartData = computed(() => {
  if (!mensualSemanas.value.length) {
    return { labels: [], datasets: [] };
  }

  const labels = mensualSemanas.value.map(w => `Semana ${w.semana}`);
  const ventasData = mensualSemanas.value.map(w => w.ventas);
  const gananciaData = mensualSemanas.value.map(w => w.ganancia);

  const successColor = getSuccessColor();
  const accentColor = getAccentColor();

  return {
    labels,
    datasets: [
      {
        label: 'Ventas',
        data: ventasData,
        backgroundColor: colorWithOpacity(successColor, 0.8),
        borderColor: successColor,
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: 'Ganancias',
        data: gananciaData,
        backgroundColor: colorWithOpacity(accentColor, 0.8),
        borderColor: accentColor,
        borderWidth: 2,
        borderRadius: 6,
      }
    ]
  };
});

function colorWithOpacity(hex: string, opacity: number): string {
  if (hex.startsWith('#')) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return hex;
}

const uniqueHorarios = computed(() => {
  if (!reporteAnualData.value?.productosPorHorario) return [];
  return [...new Set(reporteAnualData.value.productosPorHorario.map(p => p.horario))];
});

function getProductosPorHorario(horario: string) {
  if (!reporteAnualData.value?.productosPorHorario) return [];
  return reporteAnualData.value.productosPorHorario.filter(p => p.horario === horario).slice(0, 5);
}

const annualMonthlyChartData = computed(() => {
  if (!reporteAnualData.value?.meses) return { labels: [], datasets: [] };
  
  const labels = reporteAnualData.value.meses.map(m => m.nombreMes);
  const ventasData = reporteAnualData.value.meses.map(m => m.ventas);
  const gananciaData = reporteAnualData.value.meses.map(m => m.ganancia);
  
  const successColor = getSuccessColor();
  const accentColor = getAccentColor();
  
  return {
    labels,
    datasets: [
      {
        label: 'Ventas',
        data: ventasData,
        backgroundColor: colorWithOpacity(successColor, 0.8),
        borderColor: successColor,
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: 'Ganancia',
        data: gananciaData,
        backgroundColor: colorWithOpacity(accentColor, 0.8),
        borderColor: accentColor,
        borderWidth: 2,
        borderRadius: 6,
      }
    ]
  };
});

const annualMonthlyChartOptions = computed(() => {
  const textColor = getChartTextColor();
  const isSmall = windowWidth.value < 480;
  const fontSize = isSmall ? 9 : 11;
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: textColor,
          font: { size: fontSize },
          boxWidth: isSmall ? 12 : 15,
          padding: isSmall ? 8 : 12
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${formatoMonedaRedondeada(context.raw)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: textColor, font: { size: fontSize - 1 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: {
          callback: (value: any) => formatoMonedaRedondeada(value),
          color: textColor,
          font: { size: fontSize - 1 }
        }
      }
    }
  };
});

const weeklyChartOptions = computed(() => {
  const textColor = getChartTextColor();
  const isSmall = windowWidth.value < 480;
  const isMedium = windowWidth.value >= 480 && windowWidth.value < 768;
  const isLarge = windowWidth.value >= 1200;
  const fontSize = isSmall ? 9 : isMedium ? 10 : isLarge ? 14 : 12;
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: textColor,
          font: { size: fontSize },
          boxWidth: isSmall ? 10 : isMedium ? 12 : 18,
          padding: isSmall ? 5 : isMedium ? 10 : 15
        }
      },
      tooltip: {
        titleFont: { size: fontSize + 1 },
        bodyFont: { size: fontSize },
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${formatoMonedaRedondeada(context.raw)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: textColor,
          font: { size: fontSize }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          callback: (value: any) => formatoMonedaRedondeada(value),
          color: textColor,
          font: { size: fontSize - 1 }
        }
      }
    }
  };
});

const cortePieChartData = computed(() => {
  if (!mostrarReporte.value || !corteActual.value) {
    return { labels: [], datasets: [] };
  }

  const efectivo = Number(ventasEfectivo.value || 0);
  const transferencia = Number(ventasTransferencia.value || 0);
  const egresos = Number(corteActual.value.totalEgresos || 0);

  const successColor = getSuccessColor();
  const errorColor = getErrorColor();

  const labels: string[] = [];
  const data: number[] = [];
  const colors: string[] = [];

  if (efectivo > 0) {
    labels.push('Efectivo');
    data.push(efectivo);
    colors.push(colorWithOpacity(successColor, 0.8));
  }

  if (transferencia > 0) {
    labels.push('Transferencia');
    data.push(transferencia);
    colors.push('rgba(54, 162, 235, 0.8)');
  }

  if (egresos > 0) {
    labels.push('Egresos');
    data.push(egresos);
    colors.push(colorWithOpacity(errorColor, 0.8));
  }

  if (data.length === 0) {
    return { labels: [], datasets: [] };
  }

  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderColor: colors.map(c => c.replace('0.8', '1')),
      borderWidth: 2
    }]
  };
});

const cortePieChartOptions = computed(() => {
  const textColor = getChartTextColor();
  const isSmall = windowWidth.value < 480;
  const isMedium = windowWidth.value >= 480 && windowWidth.value < 768;
  const isLarge = windowWidth.value >= 1200;
  const fontSize = isSmall ? 9 : isMedium ? 10 : isLarge ? 14 : 12;
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: isSmall ? 'bottom' as const : 'right' as const,
        labels: {
          color: textColor,
          padding: isSmall ? 8 : isMedium ? 12 : 18,
          font: { size: fontSize },
          boxWidth: isSmall ? 10 : isMedium ? 12 : 18
        }
      },
      tooltip: {
        titleFont: { size: fontSize + 1 },
        bodyFont: { size: fontSize },
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label}: ${formatoMonedaRedondeada(value)}`;
          }
        }
      }
    }
  };
});

const diarioPieChartData = computed(() => {
  if (!mostrarReporte.value || !corteActual.value) {
    return { labels: [], datasets: [] };
  }

  const efectivo = Number(ventasEfectivo.value || 0);
  const transferencia = Number(ventasTransferencia.value || 0);
  const egresos = Number(corteActual.value.totalEgresos || 0);

  const labels: string[] = [];
  const data: number[] = [];
  const colors: string[] = [];

  if (efectivo > 0) {
    labels.push('Efectivo');
    data.push(efectivo);
    colors.push('rgba(40, 167, 69, 0.8)');
  }

  if (transferencia > 0) {
    labels.push('Transferencia');
    data.push(transferencia);
    colors.push('rgba(54, 162, 235, 0.8)');
  }

  if (egresos > 0) {
    labels.push('Egresos');
    data.push(egresos);
    colors.push('rgba(255, 99, 132, 0.8)');
  }

  if (data.length === 0) {
    return { labels: [], datasets: [] };
  }

  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderColor: colors.map(c => c.replace('0.8', '1')),
      borderWidth: 2
    }]
  };
});

const diarioPieChartOptions = computed(() => {
  const textColor = getChartTextColor();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: windowWidth.value < 600 ? 'bottom' as const : 'right' as const,
        labels: {
          color: textColor,
          padding: windowWidth.value < 600 ? 10 : 15,
          font: { size: windowWidth.value < 600 ? 10 : 12 },
          boxWidth: windowWidth.value < 600 ? 12 : 15
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label}: ${formatoMonedaRedondeada(value)}`;
          }
        }
      }
    }
  };
});

async function generarReporteAnual() {
  cargandoAnual.value = true;
  try {
    const data = await fetchApi<ReporteAnualDTO>(`/ventas/reporteAnual/${anioReporte.value}`);
    reporteAnualData.value = data;
    modalAnualAbierto.value = true;
    mostrarMensaje('Reporte anual cargado.', 'ok');
  } catch (error) {
    reporteAnualData.value = null;
    mostrarMensaje(`Error al cargar reporte anual: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally {
    cargandoAnual.value = false;
  }
}

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
    
    // Calcular primer y último día del mes
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayDate = new Date(year, month, 0);
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

    // Nuevo endpoint por periodo
    const monthlyDetails = await fetchApi<VentaDetalleDTO[]>(`/ventasDetalle/porPeriodo?fechaInicio=${firstDay}&fechaFin=${lastDay}`);

    const salesMap = new Map<number, { fechaVenta?: string; metodoPago?: string; totalVenta: number; totalCosto: number }>();

    for (const d of (monthlyDetails || [])) {
      // Usar d.venta o d.Venta dependiendo de la respuesta (el ejemplo dice d.venta)
      const v = d.venta || (d as any).Venta;
      const idVenta = Number(v?.idVenta || 0);
      if (!idVenta) continue;

      // Solo ventas completadas o facturadas
      if (!['C', 'F'].includes(String(v?.estatus || ''))) continue;

      if (!salesMap.has(idVenta)) {
        salesMap.set(idVenta, {
          fechaVenta: v.fechaVenta,
          metodoPago: v.metodoPago,
          totalVenta: Number(v.montoTotal || 0),
          totalCosto: 0
        });
      }

      const sale = salesMap.get(idVenta);
      if (!sale) continue;

      const costoUnidad = Number(d?.productoPrecioCosto || 0);
      const isGramaje = d?.tipoPrecioAplicado === 'VENTA_GRAMAJE' || d?.productoIsGramaje === true;
      const cantidadCosto = isGramaje ? Number(d.cantidad || 0) / 1000 : Number(d.cantidad || 0);
      sale.totalCosto += cantidadCosto * costoUnidad;
    }

    const monthlySales = Array.from(salesMap.values()).map(sale => ({
      ...sale,
      ganancia: sale.totalVenta - sale.totalCosto
    }));

    mensualTotalVentas.value = monthlySales.reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);
    mensualTotalGanancias.value = monthlySales.reduce((sum, s) => sum + Number(s.ganancia || 0), 0);
    mensualTotalTransferencia.value = monthlySales
      .filter((s) => String(s.metodoPago || '').toUpperCase() === 'TRANSFERENCIA')
      .reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);
    mensualTotalTarjeta.value = monthlySales
      .filter((s) => String(s.metodoPago || '').toUpperCase() === 'TARJETA')
      .reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);

    mensualSemanas.value = calcularSemanasMensual(monthlySales, targetMonth, year);
    calcularProductosReporte(monthlyDetails || [], 'mensual');
    rangoFechasSemanas.value = null;
    mostrarMensaje('Reporte mensual generado.', 'ok');
  } catch (error) {
    mensualTotalVentas.value = 0;
    mensualTotalGanancias.value = 0;
    mensualTotalTransferencia.value = 0;
    mensualTotalTarjeta.value = 0;
    mensualSemanas.value = [];
    productosMensual.value = [];
    productosUnitariosMensual.value = [];
    productosGranelMensual.value = [];
    mostrarMensaje(`Error al generar reporte mensual: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally {
    cargandoMensual.value = false;
  }
}

async function generarReporteRangoFechas() {
  if (!fechaRangoInicio.value || !fechaRangoFin.value) {
    mostrarMensaje('Selecciona fecha inicial y final.', 'error');
    return;
  }

  const fechaIni = new Date(fechaRangoInicio.value);
  const fechaFin = new Date(fechaRangoFin.value);

  if (fechaIni > fechaFin) {
    mostrarMensaje('La fecha inicial no puede ser mayor a la final.', 'error');
    return;
  }

  cargandoMensual.value = true;
  try {
    // Usar el nuevo endpoint por rango de fechas
    const rangeDetails = await fetchApi<VentaDetalleDTO[]>(`/ventasDetalle/porPeriodo?fechaInicio=${fechaRangoInicio.value}&fechaFin=${fechaRangoFin.value}`);

    const salesMap = new Map<number, { fechaVenta?: string; metodoPago?: string; totalVenta: number; totalCosto: number }>();

    for (const d of (rangeDetails || [])) {
      const v = d.venta || (d as any).Venta;
      const idVenta = Number(v?.idVenta || 0);
      if (!idVenta) continue;

      if (!['C', 'F'].includes(String(v?.estatus || ''))) continue;

      if (!salesMap.has(idVenta)) {
        salesMap.set(idVenta, {
          fechaVenta: v.fechaVenta,
          metodoPago: v.metodoPago,
          totalVenta: Number(v.montoTotal || 0),
          totalCosto: 0
        });
      }

      const sale = salesMap.get(idVenta);
      if (!sale) continue;

      const costoUnidad = Number(d?.productoPrecioCosto || 0);
      const isGramaje = d?.tipoPrecioAplicado === 'VENTA_GRAMAJE' || d?.productoIsGramaje === true;
      const cantidadCosto = isGramaje ? Number(d.cantidad || 0) / 1000 : Number(d.cantidad || 0);
      sale.totalCosto += cantidadCosto * costoUnidad;
    }

    const rangeSales = Array.from(salesMap.values()).map(sale => ({
      ...sale,
      ganancia: sale.totalVenta - sale.totalCosto
    }));

    mensualTotalVentas.value = rangeSales.reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);
    mensualTotalGanancias.value = rangeSales.reduce((sum, s) => sum + Number(s.ganancia || 0), 0);
    mensualTotalTransferencia.value = rangeSales
      .filter((s) => String(s.metodoPago || '').toUpperCase() === 'TRANSFERENCIA')
      .reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);
    mensualTotalTarjeta.value = rangeSales
      .filter((s) => String(s.metodoPago || '').toUpperCase() === 'TARJETA')
      .reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);

    const inicio = new Date(fechaIni.getFullYear(), fechaIni.getMonth(), fechaIni.getDate());
    const fin = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate());
    const diasDiff = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const semanas = Math.ceil(diasDiff / 7);
    
    rangoFechasSemanas.value = { inicio, fin };
    
    const semanasMap = new Map<number, { ventas: number; ganancia: number; diasInicio: Date; diasFin: Date }>();
    for (let i = 0; i < semanas; i++) {
      const diasInicioSem = new Date(inicio);
      diasInicioSem.setDate(inicio.getDate() + (i * 7));
      const diasFinSem = new Date(diasInicioSem);
      diasFinSem.setDate(diasInicioSem.getDate() + 6);
      if (diasFinSem > fin) diasFinSem.setTime(fin.getTime());
      semanasMap.set(i + 1, { ventas: 0, ganancia: 0, diasInicio: diasInicioSem, diasFin: diasFinSem });
    }

    for (const sale of rangeSales) {
      const fechaVenta = new Date(sale.fechaVenta || '');
      if (Number.isNaN(fechaVenta.getTime())) continue;
      const diasDesdeInicio = Math.floor((fechaVenta.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      const numSemana = Math.floor(diasDesdeInicio / 7) + 1;
      const semana = semanasMap.get(numSemana);
      if (semana) {
        semana.ventas += Number(sale.totalVenta || 0);
        semana.ganancia += Number(sale.ganancia || 0);
      }
    }

    mensualSemanas.value = Array.from(semanasMap.entries()).map(([semana, data]) => ({
      semana,
      ventas: data.ventas,
      ganancia: data.ganancia,
      dias: `${data.diasInicio.getDate()}/${data.diasInicio.getMonth() + 1} - ${data.diasFin.getDate()}/${data.diasFin.getMonth() + 1}`
    }));

    calcularProductosReporte(rangeDetails || [], 'mensual');

    mostrarMensaje(`Reporte del ${fechaRangoInicio.value} al ${fechaRangoFin.value} generado.`, 'ok');
  } catch (error) {
    mensualTotalVentas.value = 0;
    mensualTotalGanancias.value = 0;
    mensualTotalTransferencia.value = 0;
    mensualTotalTarjeta.value = 0;
    mensualSemanas.value = [];
    productosMensual.value = [];
    productosUnitariosMensual.value = [];
    productosGranelMensual.value = [];
    mostrarMensaje(`Error al generar reporte: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
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

async function abrirModalEgresos() {
  if (!corteActual.value) return;
  
  const fecha = corteActual.value.fechaCorte.split('T')[0];
  cargandoEgresos.value = true;
  modalEgresosAbierto.value = true;
  
  try {
    const url = `/caja/egresos/${fecha}`;
    const data = await fetchApi<EgresoDTO[]>(url);
    egresosDia.value = (data || []).sort((a, b) => 
      new Date(a.fechaMovimiento).getTime() - new Date(b.fechaMovimiento).getTime()
    );
  } catch (error) {
    egresosDia.value = [];
    mostrarMensaje('Error al cargar egresos', 'error');
  } finally {
    cargandoEgresos.value = false;
  }
}

async function abrirModalApartados() {
  if (!idUsuario.value) return;
  
  cargandoApartados.value = true;
  modalApartadosAbierto.value = true;
  
  try {
    const data = await fetchApi<ApartadoDTO[] | { datos: ApartadoDTO[] }>(`/apartado/activos?idUsuario=${idUsuario.value}`);
    apartadosActivos.value = Array.isArray(data) ? data : (data?.datos || []);
    
    const totalData = await fetchApi<number | { datos: number }>(`/apartado/totalDiario?idUsuario=${idUsuario.value}`);
    totalApartarDiario.value = typeof totalData === 'number' ? totalData : (totalData?.datos || 0);
  } catch (error) {
    apartadosActivos.value = [];
    totalApartarDiario.value = 0;
    mostrarMensaje('Error al cargar apartados', 'error');
  } finally {
    cargandoApartados.value = false;
  }
}

async function cargarApartadosCompletados() {
  cargandoApartadosCompletados.value = true;
  try {
    const data = await fetchApi<ApartadoDTO[] | { datos: ApartadoDTO[] }>('/apartado/completados');
    apartadosCompletados.value = Array.isArray(data) ? data : (data?.datos || []);
  } catch (error) {
    apartadosCompletados.value = [];
    console.error('Error al cargar apartados completados:', error);
  } finally {
    cargandoApartadosCompletados.value = false;
  }
}

function toggleHistorialCompletados() {
  cargarApartadosCompletados();
  mostrarHistorialCompletados.value = !mostrarHistorialCompletados.value;
}

async function crearApartado() {
  if (!idUsuario.value) return;
  
  if (apartadosActivos.value.length > 0) {
    mostrarMensaje('Ya tienes un apartado activo. Cancela o completa el actual primero.', 'error');
    return;
  }
  
  if (!nuevoApartado.value.nombreProducto || nuevoApartado.value.montoTotal <= 0) {
    mostrarMensaje('Completa los datos del apartado', 'error');
    return;
  }
  
  try {
    const data = await fetchApi<ApartadoDTO>('/apartado', {
      method: 'POST',
      body: JSON.stringify({
        nombreProducto: nuevoApartado.value.nombreProducto,
        montoTotal: nuevoApartado.value.montoTotal,
        frecuenciaPago: nuevoApartado.value.frecuenciaPago,
        plazoMeses: nuevoApartado.value.plazoMeses,
        fechaInicio: nuevoApartado.value.fechaInicio,
        idUsuario: idUsuario.value
      })
    });
    
    mostrarMensaje('Apartado creado exitosamente', 'ok');
    nuevoApartado.value = {
      nombreProducto: '',
      montoTotal: 0,
      frecuenciaPago: 'mensual',
      plazoMeses: 1,
      fechaInicio: new Date().toISOString().slice(0, 10)
    };
    await abrirModalApartados();
  } catch (error) {
    mostrarMensaje('Error al crear apartado', 'error');
  }
}

async function pagarApartado(id: number, monto: number) {
  try {
    await fetchApi<ApartadoDTO>(`/apartado/pagar/${id}?monto=${monto}&idUsuario=${idUsuario.value}`, { method: 'PUT' });
    mostrarMensaje('Pago registrado', 'ok');
    await abrirModalApartados();
  } catch (error) {
    mostrarMensaje('Error al registrar pago', 'error');
  }
}

async function toggleHistorialPagos(idApartado: number) {
  if (mostrarHistorialApartado.value) {
    mostrarHistorialApartado.value = false;
    return;
  }
  
  cargandoHistorialPagos.value = true;
  try {
    const data = await fetchApi<ApartadoPagoDTO[] | { datos: ApartadoPagoDTO[] }>(`/apartado/historial/${idApartado}`);
    historialPagos.value = Array.isArray(data) ? data : (data?.datos || []);
    mostrarHistorialApartado.value = true;
  } catch (error) {
    mostrarMensaje('Error al cargar historial', 'error');
  } finally {
    cargandoHistorialPagos.value = false;
  }
}

async function cancelarApartado(id: number) {
  if (!confirm('¿Cancelar este apartado?')) return;
  try {
    await fetchApi<ApartadoDTO>(`/apartado/cancelar/${id}`, { method: 'PUT' });
    mostrarMensaje('Apartado cancelado', 'ok');
    await abrirModalApartados();
  } catch (error) {
    mostrarMensaje('Error al cancelar apartado', 'error');
  }
}

onMounted(() => {
  if (idUsuario.value <= 0) {
    mostrarMensaje('No se encontro idUsuario en sesion. Algunas acciones pueden fallar.', 'info');
  }
});
</script>

<template>
  <main class="corte-layout">
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
    <section class="panel panel-main">
      <header class="header-corte">
        <h1> Corte de Caja 💰  </h1>
        <p>Genera reporte del corte, consulta dia, mes e historial de ventas.</p>
      </header>

      <p v-if="mensaje" class="estado" :class="`estado-${mensajeTipo}`">{{ mensaje }}</p>

      <div class="sign-grid" :class="{ 'solo-corte': !esAdministrador }">
        <button class="wood-sign btn-icono-only" :disabled="cargandoCorte" @click="generarCorte">
          <span class="btn-icono">🧾</span>
          <span class="btn-texto">{{ cargandoCorte ? 'Calculando...' : 'Corte de Caja' }}</span>
        </button>
        <button v-if="esAdministrador" class="wood-sign btn-icono-only" @click="modalDiarioAbierto = true">
          <span class="btn-icono">📅</span>
          <span class="btn-texto">Reporte Diario</span>
        </button>
        <button v-if="esAdministrador" class="wood-sign btn-icono-only" @click="modalMensualAbierto = true">
          <span class="btn-icono">🌙</span>
          <span class="btn-texto">Reporte Mensual</span>
        </button>
        <button v-if="esAdministrador" class="wood-sign btn-icono-only" @click="abrirHistorialVentas">
          <span class="btn-icono">📜</span>
          <span class="btn-texto">Historial</span>
        </button>
        <button v-if="esAdministrador" class="wood-sign btn-icono-only" @click="abrirModalApartados">
          <span class="btn-icono">🏦</span>
          <span class="btn-texto">Apartados</span>
        </button>
        <button v-if="esAdministrador" class="wood-sign btn-icono-only" :disabled="cargandoAnual" @click="generarReporteAnual">
          <span class="btn-icono">🧮</span>
          <span class="btn-texto">{{ cargandoAnual ? 'Cargando...' : 'Reporte Anual' }}</span>
        </button>
      </div>

      <section v-if="mostrarReporte && corteActual" class="reporte-wrap">
        <h2>{{ reporteTitulo }}</h2>

        <div class="cards-grid">
          <article class="card-metric"><p>Fecha</p><strong>{{ formatoFecha(corteActual.fechaCorte) }}</strong></article>
          <article class="card-metric"><p>Cajero</p><strong>{{ nombreUsuario }}</strong></article>
          <article class="card-metric"><p>Horas Trabajadas</p><strong>{{ corteActual.horasTrabajadas || horasTrabajadas }}</strong></article>
          <article class="card-metric"><p>Monto Inicial</p><strong>{{ formatoMoneda(corteActual.montoInicial) }}</strong></article>
          <article class="card-metric"><p>Ventas Efectivo</p><strong>{{ formatoMoneda(ventasEfectivo) }}</strong></article>
          <article class="card-metric"><p>Ventas Transferencia</p><strong>{{ formatoMoneda(ventasTransferencia) }}</strong></article>
          <article class="card-metric"><p>Tickets Dia</p><strong>{{ totalTicketsDia }}</strong></article>
          <article class="card-metric"><p>Total Ventas</p><strong>{{ formatoMoneda(corteActual.totalVentas) }}</strong></article>
          <article class="card-metric"><p>Otras Entradas</p><strong>{{ formatoMoneda(corteActual.otrosIngresos) }}</strong></article>
          <article class="card-metric"><p>Total Egresos</p><strong class="clickable" @click="abrirModalEgresos">{{ formatoMoneda(corteActual.totalEgresos) }}</strong></article>
          <article class="card-metric"><p>Apartado ({{ nombreApartadoActivo }})</p><strong class="clickable" @click="abrirModalApartados">{{ formatoMoneda(totalApartarDiario) }}</strong></article>
          <article class="card-metric"><p>Ganancia Total</p><strong>{{ formatoMonedaRedonda(corteActual.gananciaTotal) }}</strong></article>
          <article class="card-metric total"><p>Saldo Final Calculado</p><strong>{{ formatoMoneda(corteActual.saldoFinalCalculado) }}</strong></article>
        </div>

        <div class="corte-pie-chart" v-if="cortePieChartData.labels && cortePieChartData.labels.length > 0">
          <h4>Distribución del Día</h4>
          <div class="pie-chart-container">
            <Pie :data="cortePieChartData" :options="cortePieChartOptions" />
          </div>
        </div>

        <div v-if="productosUnitariosDiario.length > 0 || productosGranelDiario.length > 0" class="top-products-chart">
          <div class="chart-header-toggle">
            <h4>🏆 Top Productos</h4>
            <div class="toggle-buttons-Zelda">
              <button 
                :class="{ active: tipoGraficaDiaria === 'unitario' }" 
                @click="tipoGraficaDiaria = 'unitario'"
              >📦 Unitarios</button>
              <button 
                :class="{ active: tipoGraficaDiaria === 'gramaje' }" 
                @click="tipoGraficaDiaria = 'gramaje'"
              >⚖️ Granel</button>
            </div>
          </div>

          <div v-if="tipoGraficaDiaria === 'unitario'">
            <div v-if="productosUnitariosDiario.length > 0">
              <div class="chart-container">
                <Bar :data="chartDataDiarioUnitarios" :options="chartOptionsDiarioUnitarios" />
              </div>
              <div class="product-summary">
                <div v-for="(producto, index) in productosUnitariosDiario" :key="`diario-u-${producto.nombre}`" class="product-summary-item">
                  <span class="summary-rank">{{ index + 1 }}</span>
                  <span class="summary-name" :title="producto.nombre">{{ producto.nombre }}</span>
                  <span class="summary-qty">{{ formatearCantidad(producto.cantidadTotal, producto.isGramaje) }}</span>
                  <span class="summary-amount">{{ formatoMonedaRedondeada(producto.montoTotal) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty">Sin productos unitarios vendidos en este día.</div>
          </div>

          <div v-if="tipoGraficaDiaria === 'gramaje'">
            <div v-if="productosGranelDiario.length > 0">
              <div class="chart-container">
                <Bar :data="chartDataDiarioGranel" :options="chartOptionsDiarioGranel" />
              </div>
              <div class="product-summary">
                <div v-for="(producto, index) in productosGranelDiario" :key="`diario-g-${producto.nombre}`" class="product-summary-item">
                  <span class="summary-rank">{{ index + 1 }}</span>
                  <span class="summary-name" :title="producto.nombre">{{ producto.nombre }}</span>
                  <span class="summary-qty">{{ formatearCantidad(producto.cantidadTotal, producto.isGramaje) }}</span>
                  <span class="summary-amount">{{ formatoMonedaRedondeada(producto.montoTotal) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty">Sin productos a granel vendidos en este día.</div>
          </div>
        </div>

        <button v-if="mostrarCerrarTurno" class="btn-cerrar" type="button" :disabled="cargandoCerrarTurno" @click="cerrarTurno">
          {{ cargandoCerrarTurno ? 'Cerrando...' : '🔒 Cerrar Turno' }}
        </button>
      </section>
    </section>

    <div v-if="modalDiarioAbierto" class="modal-overlay" @click.self="modalDiarioAbierto = false">
      <section class="modal-card panel daily-modal">
        <div class="modal-corner tl"></div>
        <div class="modal-corner tr"></div>
        <div class="modal-corner bl"></div>
        <div class="modal-corner br"></div>
        <button type="button" class="btn-cerrar-modal" @click="modalDiarioAbierto = false">✕</button>
        <div class="modal-header">
          <span class="modal-icon">📅</span>
          <h3>Reporte por Día</h3>
        </div>
        <div class="modal-body">
          <div class="input-group">
            <label>Selecciona fecha</label>
            <div class="input-wrapper">
              <span class="input-icon">📆</span>
              <input v-model="fechaDiaria" type="date" class="modern-input">
            </div>
          </div>
        </div>
        <div class="modal-actions solo-accion">
          <button type="button" @click="generarReporteDiario" class="btn-generate">
            <span class="btn-icono">📊</span>
            <span class="btn-texto">Generar Reporte</span>
          </button>
        </div>
      </section>
    </div>

    <div v-if="modalMensualAbierto" class="modal-overlay" @click.self="modalMensualAbierto = false">
      <section class="modal-card panel monthly-modal">
        <div class="modal-corner tl"></div>
        <div class="modal-corner tr"></div>
        <div class="modal-corner bl"></div>
        <div class="modal-corner br"></div>
        <button type="button" class="btn-cerrar-modal" @click="modalMensualAbierto = false">✕</button>
        
        <div class="modal-content-scroll">
        <div class="monthly-header">
          <h2>📊 Reporte Mensual</h2>
          <p>Selecciona un mes o rango de fechas para ver el rendimiento</p>
        </div>

        <div class="monthly-selector">
          <div class="selector-section">
            <label>📅 Rango de Fechas</label>
            <div class="date-range">
              <input v-model="fechaRangoInicio" type="date" placeholder="Inicio">
              <span>→</span>
              <input v-model="fechaRangoFin" type="date" placeholder="Fin">
            </div>
            <button type="button" :disabled="cargandoMensual" @click="generarReporteRangoFechas" class="btn-generate-range">
              <span class="btn-text">{{ cargandoMensual ? 'Cargando...' : 'Ver Reporte' }}</span>
              <span class="btn-icon">{{ cargandoMensual ? '⏳' : '📊' }}</span>
            </button>
          </div>

          <div class="selector-divider">ó</div>

          <div class="selector-section">
            <label>📆 Mes Específico</label>
            <div class="month-select">
              <input v-model="mesMensual" type="month">
              <button type="button" :disabled="cargandoMensual" @click="generarReporteMensual" class="btn-generate-range">
                <span class="btn-text">{{ cargandoMensual ? 'Cargando...' : 'Ver Reporte' }}</span>
                <span class="btn-icon">{{ cargandoMensual ? '⏳' : '📊' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="monthly-results" v-if="mensualTotalVentas > 0 || mensualTotalGanancias > 0">
          <div class="results-summary">
            <div class="summary-card total">
              <span class="summary-label">Ventas Totales</span>
              <span class="summary-value">{{ formatoMoneda(mensualTotalVentas) }}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Transferencia</span>
              <span class="summary-value">{{ formatoMoneda(mensualTotalTransferencia) }}</span>
            </div>
            <div class="summary-card tarjeta">
              <span class="summary-label">Tarjeta</span>
              <span class="summary-value">{{ formatoMoneda(mensualTotalTarjeta) }}</span>
            </div>
            <div class="summary-card profit">
              <span class="summary-label">Ganancia</span>
              <span class="summary-value">{{ formatoMonedaRedonda(mensualTotalGanancias) }}</span>
            </div>
          </div>

          <div class="weekly-section" v-if="mensualSemanas.length > 0">
            <h3>📈 Rendimiento Semanal</h3>
            <div class="chart-container-weekly">
              <Bar :data="weeklyChartData" :options="weeklyChartOptions" />
            </div>
            <div class="weekly-cards">
              <div v-for="w in mensualSemanas" :key="`week-${w.semana}`" class="week-card">
                <div class="week-header">Semana {{ w.semana }}</div>
                <div class="week-dates">{{ w.dias }}</div>
                <div class="week-stats">
                  <div class="week-stat">
                    <span>Ventas</span>
                    <strong>{{ formatoMoneda(w.ventas) }}</strong>
                  </div>
                  <div class="week-stat profit">
                    <span>Ganancia</span>
                    <strong>{{ formatoMonedaRedonda(w.ganancia) }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="products-section" v-if="productosUnitariosMensual.length > 0 || productosGranelMensual.length > 0">
            <h3>🏆 Productos Más Vendidos</h3>
            <div class="products-toggle">
              <button :class="{ active: tipoGraficaMensual === 'unitario' }" @click="tipoGraficaMensual = 'unitario'">
                📦 Unitarios
              </button>
              <button :class="{ active: tipoGraficaMensual === 'gramaje' }" @click="tipoGraficaMensual = 'gramaje'">
                ⚖️ Granel
              </button>
            </div>
            
            <div v-if="tipoGraficaMensual === 'unitario' && productosUnitariosMensual.length > 0">
              <div class="chart-container">
                <Bar :data="chartDataMensualUnitarios" :options="chartOptionsMensualUnitarios" />
              </div>
              <div class="products-list">
                <div v-for="(producto, index) in productosUnitariosMensual" :key="`u-${producto.nombre}`" class="product-row">
                  <span class="product-rank">{{ index + 1 }}</span>
                  <span class="product-name">{{ producto.nombre }}</span>
                  <span class="product-qty">{{ formatearCantidad(producto.cantidadTotal, producto.isGramaje) }}</span>
                  <span class="product-amount">{{ formatoMonedaRedondeada(producto.montoTotal) }}</span>
                </div>
              </div>
            </div>

            <div v-if="tipoGraficaMensual === 'gramaje' && productosGranelMensual.length > 0">
              <div class="chart-container">
                <Bar :data="chartDataMensualGranel" :options="chartOptionsMensualGranel" />
              </div>
              <div class="products-list">
                <div v-for="(producto, index) in productosGranelMensual" :key="`g-${producto.nombre}`" class="product-row">
                  <span class="product-rank">{{ index + 1 }}</span>
                  <span class="product-name">{{ producto.nombre }}</span>
                  <span class="product-qty">{{ formatearCantidad(producto.cantidadTotal, producto.isGramaje) }}</span>
                  <span class="product-amount">{{ formatoMonedaRedondeada(producto.montoTotal) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="monthly-empty">
          <p>Selecciona un mes o rango de fechas y genera el reporte para ver los resultados</p>
        </div>
        </div>
      </section>
    </div>

    <div v-if="modalHistorialAbierto" class="modal-overlay" @click.self="modalHistorialAbierto = false">
      <section class="modal-card panel history-modal">
        <div class="modal-corner tl"></div>
        <div class="modal-corner tr"></div>
        <div class="modal-corner bl"></div>
        <div class="modal-corner br"></div>
        <button type="button" class="btn-cerrar-modal" @click="modalHistorialAbierto = false">✕</button>
        <div class="modal-header">
          <span class="modal-icon">📜</span>
          <h3>Historial de Ventas</h3>
        </div>

        <div class="history-filters">
          <div class="filter-group">
            <label>Mes</label>
            <select v-model="filtroMesHistorial" class="modern-select">
              <option value="all">lunas</option>
              <option v-for="m in historialMeses" :key="`m-${m}`" :value="m">Mes {{ Number(m) + 1 }}</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Día</label>
            <select v-model="filtroDiaHistorial" class="modern-select">
              <option value="all">sol</option>
              <option v-for="d in historialDias" :key="`d-${d}`" :value="d">Dia {{ d }}</option>
            </select>
          </div>

          <div class="filter-total">
            <span>Total:</span>
            <strong>{{ formatoMoneda(historialTotalFiltrado) }}</strong>
          </div>
        </div>

        <div class="history-list">
          <p v-if="cargandoHistorial" class="empty loading">📡 Cargando historial...</p>
          <p v-else-if="historialFiltrado.length === 0" class="empty">📭 No hay ventas con el filtro actual.</p>

          <article v-else v-for="(v, index) in historialFiltrado" :key="v.venta.idVenta" class="history-item" @click="abrirDetalleVenta(v.venta.idVenta)">
            <div class="history-item-left">
              <span class="ticket-badge">🎫 #{{ historialFiltrado.length - index }}</span>
              <p class="history-date">{{ formatoFecha(v.venta.fechaVenta) }}</p>
            </div>
            <div class="history-item-right">
              <strong class="history-amount">{{ formatoMoneda(Number(v.venta.montoTotal || 0)) }}</strong>
              <span class="metodo-badge" :class="getMetodoClase(v.venta.metodoPago)">
                {{ getMetodoIcono(v.venta.metodoPago) }} {{ v.venta.metodoPago || 'N/D' }}
              </span>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div v-if="modalDetalleAbierto && ventaDetalleSeleccionada" class="modal-overlay" @click.self="modalDetalleAbierto = false">
      <section class="modal-card panel detail-modal">
        <div class="modal-corner tl"></div>
        <div class="modal-corner tr"></div>
        <div class="modal-corner bl"></div>
        <div class="modal-corner br"></div>
        <button type="button" class="btn-cerrar-modal" @click="modalDetalleAbierto = false">✕</button>
        <div class="modal-header">
          <span class="modal-icon">🔎</span>
          <h3>Detalle Venta #{{ ventaDetalleSeleccionada.numeroTicket || ventaDetalleSeleccionada.idVenta }}</h3>
        </div>

        <div class="detail-summary">
          <div class="summary-item">
            <span class="summary-icon">💳</span>
            <div class="summary-content">
              <span class="summary-label">Método</span>
              <span class="summary-value method-badge" :class="getMetodoClase(ventaDetalleSeleccionada.metodoPago)">
                {{ ventaDetalleSeleccionada.metodoPago || 'N/D' }}
              </span>
            </div>
          </div>
          <div class="summary-item">
            <span class="summary-icon">📅</span>
            <div class="summary-content">
              <span class="summary-label">Fecha</span>
              <span class="summary-value">{{ formatoFecha(ventaDetalleSeleccionada.fechaVenta) }}</span>
            </div>
          </div>
          <div class="summary-item total-item">
            <span class="summary-icon">💰</span>
            <div class="summary-content">
              <span class="summary-label">Total</span>
              <span class="summary-value total-value">{{ formatoMoneda(Number(ventaDetalleSeleccionada.montoTotal || 0)) }}</span>
            </div>
          </div>
        </div>

        <div class="tabla-wrap detail-table-wrap">
          <table>
            <thead>
              <tr>
                <th class="col-producto">🛒 Producto</th>
                <th class="col-cant">📦 Cant</th>
                <th class="col-unit">💵 P.Unit</th>
                <th class="col-importe">💳 Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in ventaDetalleItems" :key="d.idVentaDetalle">
                <td class="col-producto cell-producto" :title="d.productoNombre || 'Producto eliminado'">
                  {{ d.productoNombre || 'Producto eliminado' }}
                </td>
                <td class="col-cant">{{ d.cantidad }}{{ d.tipoPrecioAplicado === 'VENTA_GRAMAJE' ? 'g' : 'pza' }}</td>
                <td class="col-unit">{{ formatoMonedaRedondeada(Number(d.precioUnitarioVenta || 0)) }}</td>
                <td class="col-importe importe">{{ formatoMonedaRedondeada(Number(d.precioUnitarioVenta || 0) * Number(d.cantidad || 0)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div v-if="modalEgresosAbierto" class="modal-overlay" @click.self="modalEgresosAbierto = false">
      <section class="modal-card panel history-modal">
        <button type="button" class="btn-cerrar-modal" @click="modalEgresosAbierto = false">✕</button>
        <div class="modal-header-with-action">
          <h3>📉 Egresos del Día</h3>
          <button v-if="esAdministrador" class="btn-nueva-salida" @click="modalSalidaAbierto = true">➕ Nueva Salida</button>
        </div>

        <div v-if="cargandoEgresos" class="empty">📡 Cargando egresos...</div>
        <div v-else-if="egresosDia.length === 0" class="empty">📭 No hay egresos para este día.</div>
        
        <div v-else class="history-list">
          <article v-for="(egreso, index) in egresosDia" :key="egreso.idCaja" class="history-item">
            <div>
              <h4>📉 Egreso #{{ index + 1 }}</h4>
              <p>{{ formatoFecha(egreso.fechaMovimiento) }}</p>
              <p class="descripcion">{{ egreso.descripcion || 'Sin descripción' }}</p>
              <p class="usuario-egreso" v-if="egreso.usuario">👤 {{ egreso.usuario.nombre }} {{ egreso.usuario.apellido_p }}</p>
            </div>
            <div>
              <strong class="monto-egreso">{{ formatoMoneda(Number(egreso.monto || 0)) }}</strong>
            </div>
          </article>
        </div>

        <div class="egresos-total">
          <span>Total Egresos:</span>
          <strong>{{ formatoMoneda(egresosDia.reduce((sum, e) => sum + Number(e.monto || 0), 0)) }}</strong>
        </div>
      </section>
    </div>

    <SalidaEfectivoModal :open="modalSalidaAbierto" @close="modalSalidaAbierto = false" @submit="registrarSalida" />

    <div v-if="modalApartadosAbierto" class="modal-overlay" @click.self="modalApartadosAbierto = false">
      <section class="modal-card panel history-modal">
        <div class="modal-corner tl"></div>
        <div class="modal-corner tr"></div>
        <div class="modal-corner bl"></div>
        <div class="modal-corner br"></div>
        <button type="button" class="btn-cerrar-modal" @click="modalApartadosAbierto = false">✕</button>
        <div class="modal-header">
          <span class="modal-icon">🏦</span>
          <h3>Apartados para Inversiones</h3>
        </div>
        
        <div v-if="apartadosActivos.length === 0" class="apartado-form">
          <div class="form-header">
            <span class="form-icon">➕</span>
            <h4>Nuevo Apartado</h4>
          </div>
          <div class="form-grid">
            <div class="form-field">
              <label>Producto</label>
              <input v-model="nuevoApartado.nombreProducto" type="text" placeholder="ej: Refrigerador" />
            </div>
            <div class="form-field">
              <label>Monto total</label>
              <input v-model.number="nuevoApartado.montoTotal" type="number" placeholder="0.00" min="1" />
            </div>
            <div class="form-field">
              <label>Frecuencia</label>
              <select v-model="nuevoApartado.frecuenciaPago">
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
            <div class="form-field">
              <label>Meses</label>
              <input v-model.number="nuevoApartado.plazoMeses" type="number" placeholder="1" min="1" />
            </div>
            <div class="form-field full-width">
              <label>Fecha inicio</label>
              <input v-model="nuevoApartado.fechaInicio" type="date" />
            </div>
          </div>
          <button class="btn-crear" @click="crearApartado">Crear Apartado</button>
        </div>

        <div v-if="apartadosActivos.length > 0" class="apartado-aviso">
          <span class="aviso-icon">⚠️</span>
          <p>Ya tienes un apartado activo. Cancela o completa el actual para crear otro.</p>
        </div>

        <div v-if="cargandoApartados" class="empty loading">📡 Cargando apartados...</div>
        <div v-else-if="apartadosActivos.length === 0" class="empty">📭 No hay apartados activos.</div>
        
        <div v-else class="apartados-list">
          <div class="apartado-total">
            <span>💰 Total a apartar diariamente:</span>
            <strong>{{ formatoMoneda(totalApartarDiario) }}</strong>
          </div>
          
          <article v-for="apartado in apartadosActivos" :key="apartado.idApartado" class="apartado-item">
            <div class="apartado-info">
              <h4>🏦 {{ apartado.nombreProducto }}</h4>
              <div class="apartado-dates">
                <span>📅 {{ apartado.fechaInicio?.slice(0,10) }} al {{ apartado.fechaFin?.slice(0,10) }}</span>
              </div>
              <p>💵 Apartar: <strong>{{ formatoMoneda(apartado.montoDiario) }}</strong>/día</p>
              <p>📊 Progreso: {{ formatoMoneda(apartado.montoPagado) }} / {{ formatoMoneda(apartado.montoTotal) }}</p>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: (apartado.montoPagado / apartado.montoTotal * 100) + '%' }"></div>
              </div>
            </div>
            <div class="apartado-actions">
              <button class="btn-pagar" @click="pagarApartado(apartado.idApartado, apartado.montoDiario)">Pagar</button>
              <button class="btn-historial" @click="toggleHistorialPagos(apartado.idApartado)" title="Ver historial">📜</button>
              <button class="btn-cancelar" @click="cancelarApartado(apartado.idApartado)" title="Cancelar">✕</button>
            </div>
          </article>

          <div v-if="mostrarHistorialApartado" class="historial-pagos">
            <div class="historial-header">
              <span class="historial-icon">📜</span>
              <h4>Historial de Pagos</h4>
            </div>
            <div v-if="cargandoHistorialPagos" class="empty loading">📡 Cargando...</div>
            <div v-else-if="historialPagos.length === 0" class="empty">No hay pagos registrados.</div>
            <div v-else class="pagos-list">
              <div v-for="pago in historialPagos" :key="pago.idPago" class="pago-item">
                <span>📅 {{ pago.fechaPago?.slice(0, 10) }}</span>
                <span>💵 {{ formatoMoneda(pago.monto) }}</span>
              </div>
            </div>
            <button class="btn-cerrar-historial" @click="mostrarHistorialApartado = false">Cerrar</button>
          </div>
        </div>

        <div class="apartados-historial-section">
          <button 
            type="button" 
            class="btn-historial-completo" 
            @click="toggleHistorialCompletados"
          >
            📜 Ver Historial de Apartados Completados
          </button>
          
          <div v-if="mostrarHistorialCompletados" class="historial-completados">
            <div class="historial-header">
              <span class="historial-icon">📜</span>
              <h4>Historial de Apartados Completados</h4>
            </div>
            <div v-if="cargandoApartadosCompletados" class="empty loading">📡 Cargando...</div>
            <div v-else-if="apartadosCompletados.length === 0" class="empty">No hay apartados completados.</div>
            <div v-else class="apartados-completados-list">
              <article v-for="apartado in apartadosCompletados" :key="apartado.idApartado" class="apartado-completado-item">
                <div class="apartado-info">
                  <h4>🏦 {{ apartado.nombreProducto }}</h4>
                  <p>📅 {{ apartado.fechaInicio?.slice(0,10) }} al {{ apartado.fechaFin?.slice(0,10) }}</p>
                  <p>💵 Total: <strong>{{ formatoMoneda(apartado.montoTotal) }}</strong></p>
                  <p>📊 Pagado: {{ formatoMoneda(apartado.montoPagado) }}</p>
                  <span class="estatus-badge" :class="apartado.estatus">
                    {{ apartado.estatus === 'PAGADO' ? '✅ Completado' : '❌ Cancelado' }}
                  </span>
                </div>
              </article>
            </div>
            <button class="btn-cerrar-historial" @click="mostrarHistorialCompletados = false">Cerrar</button>
          </div>
        </div>
      </section>
    </div>

    <div v-if="modalAnualAbierto" class="modal-overlay" @click.self="modalAnualAbierto = false">
      <section class="modal-card panel annual-modal">
        <button type="button" class="btn-cerrar-modal" @click="modalAnualAbierto = false">✕</button>
        
        <div class="annual-header-modern">
          <div class="annual-title-block">
            <h2 class="annual-title">📊 Reporte Anual</h2>
            <p class="annual-subtitle">Resumen de métricas y rendimiento del año {{ anioReporte }}</p>
          </div>
          <div class="annual-actions">
            <select v-model="anioReporte" class="annual-year-select">
              <option v-for="year in [2024, 2025, 2026, 2027]" :key="year" :value="year">{{ year }}</option>
            </select>
            <button type="button" @click="generarReporteAnual" class="annual-btn-refresh">🔄</button>
          </div>
        </div>

        <div v-if="reporteAnualData" class="annual-content">
          <div class="annual-kpis">
            <div class="kpi-card kpi-main">
              <div class="kpi-icon-wrapper success">
                <span class="kpi-icon">💰</span>
              </div>
              <div class="kpi-info">
                <p class="kpi-label">Ingresos Totales</p>
                <p class="kpi-value">{{ formatoMoneda(reporteAnualData.ventasTotales) }}</p>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon-wrapper efectivo">
                <span class="kpi-icon">💵</span>
              </div>
              <div class="kpi-info">
                <p class="kpi-label">Efectivo</p>
                <p class="kpi-value">{{ formatoMoneda(reporteAnualData.ventasEfectivo) }}</p>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon-wrapper transferencia">
                <span class="kpi-icon">📱</span>
              </div>
              <div class="kpi-info">
                <p class="kpi-label">Transferencia</p>
                <p class="kpi-value">{{ formatoMoneda(reporteAnualData.ventasTransferencia) }}</p>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon-wrapper tarjeta">
                <span class="kpi-icon">💳</span>
              </div>
              <div class="kpi-info">
                <p class="kpi-label">Tarjeta</p>
                <p class="kpi-value">{{ formatoMoneda(reporteAnualData.ventasTarjeta) }}</p>
              </div>
            </div>

            <div class="kpi-card kpi-gain">
              <div class="kpi-icon-wrapper gain">
                <span class="kpi-icon">📈</span>
              </div>
              <div class="kpi-info">
                <p class="kpi-label">Ganancia Total</p>
                <p class="kpi-value">{{ formatoMonedaRedonda(reporteAnualData.gananciaTotal) }}</p>
              </div>
            </div>
          </div>

          <div class="annual-charts-grid" v-if="reporteAnualData.meses && reporteAnualData.meses.length > 0">
            <div class="chart-card chart-full">
              <div class="chart-header">
                <h3 class="chart-title">📈 Ventas por Mes</h3>
                <p class="chart-subtitle">Evolución de los ingresos generados mes a mes</p>
              </div>
              <div class="chart-body">
                <Bar :data="annualMonthlyChartData" :options="annualMonthlyChartOptions" />
              </div>
            </div>

            <div class="chart-card" v-if="reporteAnualData.ventasPorHorario && reporteAnualData.ventasPorHorario.length > 0">
              <div class="chart-header">
                <h3 class="chart-title">⏰ Horarios Pico</h3>
                <p class="chart-subtitle">Volumen de transacciones por hora</p>
              </div>
              <div class="horario-mini-grid">
                <div v-for="horario in reporteAnualData.ventasPorHorario" :key="horario.horario" class="horario-mini-card">
                  <span class="horario-mini-time">{{ horario.horario }}</span>
                  <span class="horario-mini-sales">{{ formatoMonedaRedondeada(horario.totalVentas) }}</span>
                  <span class="horario-mini-count">{{ horario.numeroVentas }} ventas</span>
                </div>
              </div>
            </div>
          </div>

          <div class="annual-table-section" v-if="reporteAnualData.meses && reporteAnualData.meses.length > 0">
            <div class="table-header">
              <h3 class="table-title">📅 Resumen Mensual</h3>
            </div>
            <div class="months-table-modern">
              <div class="month-row-modern header">
                <span>Mes</span>
                <span>Ventas</span>
                <span>Ganancia</span>
                <span>Cambio</span>
              </div>
              <div v-for="mes in reporteAnualData.meses" :key="mes.mes" class="month-row-modern">
                <span class="month-name">{{ mes.nombreMes }}</span>
                <span class="month-sales">{{ formatoMonedaRedondeada(mes.ventas) }}</span>
                <span class="month-gain">{{ formatoMonedaRedondeada(mes.ganancia) }}</span>
                <span :class="['month-change', mes.porcentajeCambio >= 0 ? 'positive' : 'negative']">
                  <span class="change-icon">{{ mes.porcentajeCambio >= 0 ? '↑' : '↓' }}</span>
                  {{ Math.abs(mes.porcentajeCambio).toFixed(1) }}%
                </span>
              </div>
            </div>
          </div>

          <div class="annual-products-section" v-if="reporteAnualData.productosPorHorario && reporteAnualData.productosPorHorario.length > 0">
            <div class="table-header">
              <h3 class="table-title">🏆 Top Productos por Horario</h3>
            </div>
            <div class="products-grid">
              <div v-for="horario in uniqueHorarios" :key="horario" class="product-group">
                <h4 class="product-group-title">{{ horario }}</h4>
                <div class="product-list-modern">
                  <div v-for="(prod, idx) in getProductosPorHorario(horario)" :key="prod.nombreProducto" class="product-row">
                    <span class="product-rank">{{ idx + 1 }}</span>
                    <span class="product-name">{{ prod.nombreProducto }}</span>
                    <span class="product-qty">{{ formatearCantidad(prod.cantidadVendida, prod.isGramaje) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="annual-loading-modern">
          <div class="loading-spinner"></div>
          <p>Cargando datos del reporte...</p>
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
  background: var(--bg-primary);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

.panel-main {
  flex: 1;
  min-height: 0;
  padding: 1.25rem;
  grid-template-rows: auto auto auto 1fr;
  gap: 1rem;
  overflow: auto;
  position: relative;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: var(--border-width-thick) solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 8px 30px var(--shadow-color);
  animation: fadeSlideIn 400ms ease-out;
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(-15px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-main::before {
  content: "";
  position: absolute;
  inset: 12px;
  border: 2px dashed color-mix(in srgb, var(--accent-color) 25%, transparent);
  pointer-events: none;
  border-radius: 12px;
}

.header-corte {
  position: relative;
  z-index: 1;
  text-align: center;
  padding-bottom: 0.5rem;
}

.header-corte h1 {
  font-size: clamp(1.3rem, 4vw, 1.8rem);
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 900;
  margin: 0 0 0.4rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
}

.header-corte h1::before {
  content: "💰";
  font-size: 1.4rem;
}

.header-corte p {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin: 0;
}

.estado { 
  font-size: 0.8rem; 
  text-transform: uppercase; 
  letter-spacing: 0.05em;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.estado-ok { 
  color: var(--success-color); 
  background: color-mix(in srgb, var(--success-color) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--success-color) 40%, transparent);
}

.estado-error { 
  color: var(--error-color); 
  background: color-mix(in srgb, var(--error-color) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--error-color) 40%, transparent);
}

.estado-info { 
  color: var(--accent-color); 
  background: rgba(201, 146, 52, 0.15);
  border: 1px solid rgba(201, 146, 52, 0.4);
}

.sign-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  position: relative;
  z-index: 1;
  max-width: 600px;
  margin: 0 auto;
}

.sign-grid.solo-corte {
  grid-template-columns: 1fr;
  max-width: 300px;
  margin: 0 auto;
}

.wood-sign {
  border: var(--border-width) solid var(--border-color);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.8rem 0.6rem;
  box-shadow: 0 4px 15px var(--shadow-color);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 12px;
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 50%, var(--gradient-btn-end) 100%);
  color: var(--text-primary);
}

.wood-sign:hover {
  filter: brightness(1.1);
  transform: translateY(-3px);
  box-shadow: 0 6px 20px var(--shadow-color);
}

.wood-sign:active {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px var(--shadow-color);
}

.wood-sign:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.wood-sign .btn-icono {
  font-size: 1.3rem;
}

.wood-sign .btn-texto {
  font-size: 0.7rem;
  font-family: "Courier New", monospace;
}

@media (min-width: 1024px) {
  .wood-sign.btn-icono-only {
    padding: 1.5rem 1.2rem;
    min-height: 120px;
    border-radius: 16px;
  }

  .wood-sign.btn-icono-only .btn-icono {
    font-size: 2.8rem;
  }

  .wood-sign.btn-icono-only .btn-texto {
    font-size: 0.85rem;
    font-weight: 700;
  }

  .wood-sign.btn-icono-only:hover {
    transform: translateY(-5px) scale(1.03);
    box-shadow: 0 10px 30px var(--shadow-color);
  }

  .wood-sign.btn-icono-only:active {
    transform: translateY(-2px) scale(0.98);
  }
}

@media (min-width: 1400px) {
  .wood-sign.btn-icono-only {
    padding: 2rem 1.5rem;
    min-height: 140px;
    border-radius: 20px;
  }

  .wood-sign.btn-icono-only .btn-icono {
    font-size: 3.2rem;
  }

  .wood-sign.btn-icono-only .btn-texto {
    font-size: 0.95rem;
  }
}

@media (max-width: 980px) {
  .sign-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 760px) {
  .sign-grid {
    grid-template-columns: 1fr 1fr;
    max-width: 100%;
    gap: 0.8rem;
    padding: 0 0.5rem;
  }

  .wood-sign {
    width: 100%;
    padding: 1.2rem 1rem;
    min-height: 80px;
    border-radius: 14px;
    flex-direction: row;
    gap: 1rem;
  }

  .wood-sign .btn-icono {
    font-size: 2rem;
  }

  .wood-sign .btn-texto {
    font-size: 1rem;
  }

  .wood-sign.btn-icono-only {
    padding: 1.4rem 1.5rem;
    min-height: 90px;
    flex-direction: row;
  }

  .wood-sign.btn-icono-only .btn-icono {
    font-size: 2.5rem;
  }

  .wood-sign.btn-icono-only .btn-texto {
    font-size: 1.1rem;
    font-weight: 700;
  }
}

.detail-modal {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-panel) 50%, var(--bg-secondary) 100%);
  border: 4px solid var(--accent-color);
  border-radius: 12px;
  width: min(100%, 700px);
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 
    0 0 0 2px var(--border-color),
    0 0 0 4px var(--accent-color),
    0 8px 0 var(--border-color),
    0 12px 0 color-mix(in srgb, var(--border-color) 80%, black),
    0 16px 30px var(--shadow-color),
    inset 0 0 60px color-mix(in srgb, var(--accent-color) 10%, transparent);
  position: relative;
}

.detail-modal::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 2px dashed rgba(201, 146, 52, 0.4);
  border-radius: 6px;
  pointer-events: none;
  z-index: 1;
}

.detail-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
  position: relative;
  z-index: 2;
}

.summary-item {
  flex: 1;
  min-width: 120px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  padding: 1rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.2s;
  box-shadow: 
    inset 0 0 0 2px rgba(201, 146, 52, 0.15),
    0 3px 0 var(--border-color);
}

.summary-item:hover {
  transform: translateY(-2px);
  box-shadow: 
    inset 0 0 0 2px color-mix(in srgb, var(--accent-color) 25%, transparent),
    0 5px 0 var(--border-color),
    0 8px 15px var(--shadow-color);
}

.summary-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  filter: drop-shadow(1px 1px 0 var(--border-color));
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  flex: 1;
}

.summary-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  white-space: nowrap;
}

.summary-value {
  font-size: 0.95rem;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.total-item {
  background: linear-gradient(135deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  border-color: var(--success-color);
  flex: 1.5;
  box-shadow: 
    inset 0 0 0 2px color-mix(in srgb, var(--success-color) 30%, white),
    0 3px 0 color-mix(in srgb, var(--success-color) 50%, black);
}

.total-item .summary-label,
.total-item .summary-value {
  color: var(--text-primary);
}

.total-value {
  font-size: 1.15rem !important;
  text-shadow: 1px 1px 0 color-mix(in srgb, var(--success-color) 50%, black);
}

.method-badge {
  display: inline-block;
  padding: 0.3rem 0.7rem;
  border-radius: 20px;
  font-size: 0.75rem !important;
  font-weight: 800 !important;
  text-transform: uppercase;
  white-space: nowrap;
  letter-spacing: 0.05em;
  box-shadow: 0 2px 0 rgba(0,0,0,0.2);
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

.detail-table-wrap {
  position: relative;
  z-index: 2;
  overflow: auto;
  border: 3px solid var(--accent-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  max-height: calc(90vh - 220px);
  border-radius: 10px;
  box-shadow: inset 0 0 0 2px var(--border-color);
}

.detail-table-wrap table {
  width: 100%;
  border-collapse: collapse;
  min-width: 400px;
}

.detail-table-wrap th,
.detail-table-wrap td {
  padding: 0.7rem 0.6rem;
  border-bottom: 1px solid var(--border-color);
  text-align: left;
  font-size: 0.85rem;
  font-family: "Courier New", monospace;
}

.detail-table-wrap th {
  position: sticky;
  top: 0;
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  color: var(--accent-color);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 800;
  border-bottom: 2px solid var(--accent-color);
}

.col-producto {
  width: auto;
  min-width: 150px;
}

.col-cant,
.col-unit,
.col-importe {
  width: 90px;
  text-align: right !important;
}

.cell-producto {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
}

.importe {
  color: var(--success-color);
  font-weight: 800;
}

@media (max-width: 768px) {
  .detail-modal {
    width: min(100%, 95vw) !important;
    max-height: 92vh;
    border-radius: 10px;
  }
  
  .detail-summary {
    gap: 0.6rem;
  }
  
  .summary-item {
    min-width: 100px;
    padding: 0.8rem 0.6rem;
  }
  
  .summary-icon {
    font-size: 1.3rem;
  }
  
  .summary-label {
    font-size: 0.7rem;
  }
  
  .summary-value {
    font-size: 0.85rem;
  }
  
  .total-item {
    flex-basis: 100%;
  }
  
  .total-value {
    font-size: 1rem !important;
  }
  
  .detail-table-wrap {
    max-height: calc(90vh - 200px);
    font-size: 0.75rem;
  }
  
  .detail-table-wrap th,
  .detail-table-wrap td {
    padding: 0.5rem 0.4rem;
    font-size: 0.75rem;
  }
  
  .col-producto {
    min-width: 120px;
  }
  
  .col-cant,
  .col-unit,
  .col-importe {
    width: 70px;
  }
  
  .method-badge {
    font-size: 0.7rem !important;
    padding: 0.25rem 0.5rem;
  }
}

@media (max-width: 480px) {
  .detail-modal {
    width: 100vw !important;
    max-width: 100vw;
    max-height: 100vh;
    border-radius: 0;
    margin: 0;
    border-width: 3px;
  }
  
  .detail-modal::before {
    display: none;
  }
  
  .detail-summary {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .summary-item {
    flex-basis: 100%;
    padding: 0.75rem;
  }
  
  .total-item {
    flex-basis: 100%;
  }
  
  .detail-table-wrap {
    max-height: calc(100vh - 280px);
    font-size: 0.7rem;
    border-width: 2px;
  }
  
  .detail-table-wrap th,
  .detail-table-wrap td {
    padding: 0.4rem 0.3rem;
    font-size: 0.7rem;
  }
  
  .col-producto {
    min-width: 100px;
  }
  
  .col-cant,
  .col-unit,
  .col-importe {
    width: 60px;
  }
  
  .method-badge {
    font-size: 0.65rem !important;
    padding: 0.2rem 0.4rem;
  }
}

.reporte-wrap {
  border: var(--border-width-thick) solid var(--border-color);
  color: var(--text-primary);
  padding: 0.9rem;
  gap: 0.8rem;
  border-radius: 8px;
  box-shadow: inset 0 0 0 2px var(--bg-panel);
  justify-content: center;
  align-items: center;
  align-content: center;
  text-align: center;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55rem;
}

.card-metric {
  border: var(--border-width) solid var(--border-color);
  background: var(--bg-primary);
  padding: 0.6rem;
  display: grid;
  gap: 0.2rem;
  border-radius: 6px;
}

.card-metric p {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.card-metric strong {
  font-size: 0.9rem;
  color: var(--accent-color);
}

.card-metric strong.clickable {
  cursor: pointer;
  color: var(--error-color);
  text-decoration: underline;
}

.card-metric strong.clickable:hover {
  filter: brightness(1.2);
}

.card-metric.total {
  grid-column: span 4;
  background: var(--zelda-gold);
}

.card-metric.total p,
.card-metric.total strong {
  color: var(--bg-primary);
}

.btn-cerrar {
  justify-self: center;
  min-width: 220px;
  border: var(--border-width-thick) solid var(--border-color);
  padding: 0.75rem 1.2rem;
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  color: var(--text-primary);
  box-shadow: 
    inset 0 0 0 2px color-mix(in srgb, var(--error-color) 30%, white),
    0 4px 0 var(--border-color),
    0 8px 16px var(--shadow-color);
  transition: transform 100ms steps(2), filter 100ms linear;
}

.btn-cerrar:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-cerrar:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 
    inset 0 0 0 2px color-mix(in srgb, var(--error-color) 30%, white),
    0 2px 0 var(--border-color);
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
  background: var(--shadow-color);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 1rem;
  overflow-y: auto;
}

.modal-card {
  width: min(100%, 520px);
  max-height: none;
  background: var(--bg-panel);
  border: var(--border-width-thick) solid var(--accent-color);
  box-shadow:
    0 0 0 4px var(--border-color),
    0 14px 0 var(--border-color),
    0 20px 28px var(--shadow-color);
  padding: 1.5rem;
  gap: 1rem;
  overflow-x: visible;
  overflow-y: visible;
  animation: fadeSlideIn 200ms ease-out;
  position: relative;
  margin: 2rem 0;
}

.modal-corner {
  position: absolute;
  width: 40px;
  height: 40px;
  pointer-events: none;
  z-index: 100;
}

.modal-corner::before,
.modal-corner::after {
  content: '';
  position: absolute;
  background: #f8d667;
}

.modal-corner.tl {
  top: 8px;
  left: 8px;
}

.modal-corner.tl::before {
  width: 25px;
  height: 3px;
  top: 0;
  left: 0;
  border-radius: 2px;
}

.modal-corner.tl::after {
  width: 3px;
  height: 25px;
  top: 0;
  left: 0;
  border-radius: 2px;
}

.modal-corner.tr {
  top: 8px;
  right: 8px;
}

.modal-corner.tr::before {
  width: 25px;
  height: 3px;
  top: 0;
  right: 0;
  border-radius: 2px;
}

.modal-corner.tr::after {
  width: 3px;
  height: 25px;
  top: 0;
  right: 0;
  border-radius: 2px;
}

.modal-corner.bl {
  bottom: 8px;
  left: 8px;
}

.modal-corner.bl::before {
  width: 25px;
  height: 3px;
  bottom: 0;
  left: 0;
  border-radius: 2px;
}

.modal-corner.bl::after {
  width: 3px;
  height: 25px;
  bottom: 0;
  left: 0;
  border-radius: 2px;
}

.modal-corner.br {
  bottom: 8px;
  right: 8px;
}

.modal-corner.br::before {
  width: 25px;
  height: 3px;
  bottom: 0;
  right: 0;
  border-radius: 2px;
}

.modal-corner.br::after {
  width: 3px;
  height: 25px;
  bottom: 0;
  right: 0;
  border-radius: 2px;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border-bottom: 3px solid var(--accent-color);
  border-radius: 8px 8px 0 0;
  position: relative;
  z-index: 2;
  box-shadow: 0 2px 0 color-mix(in srgb, var(--border-color) 50%, transparent);
}

.modal-icon {
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.modal-card .modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 900;
  text-shadow: 2px 2px 0 var(--border-color);
  font-family: "Courier New", monospace;
}

.modal-body {
  padding: 0.5rem 0;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  font-size: 1rem;
  z-index: 1;
}

.modern-input {
  width: 100%;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-size: 1rem;
  outline: none;
  border-radius: 10px;
  transition: all 0.2s;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}

.modern-input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 20%, transparent), inset 0 2px 4px rgba(0,0,0,0.1);
}

.btn-generate {
  width: 100%;
  padding: 0.8rem 1.2rem;
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 45%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
  border: 2px solid var(--border-color);
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 0 var(--border-color), 0 6px 12px rgba(0,0,0,0.2);
  transition: all 0.15s;
}

.btn-generate:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
  box-shadow: 0 6px 0 var(--border-color), 0 8px 16px rgba(0,0,0,0.25);
}

.btn-generate:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--border-color);
}

.btn-generate-small {
  padding: 0.5rem 1rem;
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  box-shadow: 0 3px 0 var(--border-color);
  transition: all 0.15s;
}

.btn-generate-small:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-generate-small:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 var(--border-color);
}

.btn-generate-small:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-card::before {
  content: "";
  position: absolute;
  inset: 10px;
  pointer-events: none;
  border-radius: 8px;
}

.btn-cerrar-modal {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border: 2px solid var(--border-color);
  background: linear-gradient(180deg, var(--accent-color) 0%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
  font-size: 1.2rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms;
  z-index: 10;
  box-shadow: 0 2px 0 var(--border-color);
}

.btn-cerrar-modal:hover {
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  border-color: var(--error-color);
  color: var(--text-primary);
  transform: rotate(90deg) translateY(-2px);
  box-shadow: 0 4px 0 color-mix(in srgb, var(--error-color) 50%, black);
}

.modal-header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-right: 3rem;
}

.btn-nueva-salida {
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  color: var(--text-primary);
  border: var(--border-width) solid var(--border-color);
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: 6px;
  cursor: pointer;
  box-shadow: 0 3px 0 var(--border-color);
  transition: transform 0.1s;
}

.btn-nueva-salida:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-nueva-salida:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 var(--border-color);
}

.modal-card h3 {
  margin: 0;
  font-size: 1.05rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 900;
  text-shadow: 2px 2px 0 var(--border-color);
  font-family: "Courier New", monospace;
  position: relative;
}

.modal-card label {
  font-size: 0.75rem;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
}

.modal-card input,
.modal-card select {
  width: 100%;
  background: var(--bg-primary);
  border: var(--border-width) solid var(--border-color);
  padding: 0.6rem 0.7rem;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-size: 0.9rem;
  outline: none;
  box-shadow: inset 0 0 0 2px var(--bg-secondary);
}

.modal-card input:focus,
.modal-card select:focus {
  border-color: var(--accent-color);
}

.monthly-modal,
.annual-modal,
.detail-modal,
.history-modal {
  width: min(100%, 800px) !important;
  max-height: 85vh !important;
  max-width: 100% !important;
  margin: 1rem auto !important;
  overflow-y: auto !important;
  background: var(--bg-panel) !important;
  box-shadow: 0 8px 32px var(--shadow-color) !important;
}

.annual-modal {
  width: min(100%, 1100px) !important;
  max-height: 90vh !important;
  padding: 1.5rem !important;
}

.detail-modal {
  width: min(100%, 700px) !important;
}

.history-modal {
  width: min(100%, 900px) !important;
}

/* =========================================
   MONTHLY MODAL - ESTILO PAPIRO/PERGAMINO
   ========================================= */
.monthly-modal {
  width: min(100%, 800px) !important;
  max-height: 85vh !important;
  max-width: 100% !important;
  margin: 1rem auto !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: var(--bg-panel) !important;
  border: none !important;
  position: relative !important;
  box-shadow: none !important;
}

/* Marco decorativo exterior */
.monthly-modal::before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  border: 4px solid var(--accent-color) !important;
  border-radius: 16px !important;
  pointer-events: none !important;
  z-index: 1 !important;
  box-shadow: 
    inset 0 0 0 2px var(--border-color),
    inset 0 0 0 6px var(--bg-panel),
    inset 0 0 0 8px color-mix(in srgb, var(--accent-color) 60%, transparent),
    0 8px 32px var(--shadow-color),
    0 0 0 1px var(--border-color) !important;
}

/* Marco decorativo interior */
.monthly-modal::after {
  content: '' !important;
  position: absolute !important;
  inset: 12px !important;
  border: 2px dashed var(--border-color) !important;
  border-radius: 8px !important;
  pointer-events: none !important;
  z-index: 1 !important;
  opacity: 0.5 !important;
}

/* Esquinas decorativas */
.monthly-modal .modal-corner {
  position: absolute !important;
  width: 40px !important;
  height: 40px !important;
  pointer-events: none !important;
  z-index: 10 !important;
}

.monthly-modal .modal-corner::before,
.monthly-modal .modal-corner::after {
  content: '' !important;
  position: absolute !important;
  background: var(--accent-color) !important;
  border-radius: 2px !important;
}

.monthly-modal .modal-corner.tl {
  top: 16px !important;
  left: 16px !important;
}
.monthly-modal .modal-corner.tl::before {
  width: 25px !important;
  height: 3px !important;
  top: 0 !important;
  left: 0 !important;
}
.monthly-modal .modal-corner.tl::after {
  width: 3px !important;
  height: 25px !important;
  top: 0 !important;
  left: 0 !important;
}

.monthly-modal .modal-corner.tr {
  top: 16px !important;
  right: 16px !important;
}
.monthly-modal .modal-corner.tr::before {
  width: 25px !important;
  height: 3px !important;
  top: 0 !important;
  right: 0 !important;
}
.monthly-modal .modal-corner.tr::after {
  width: 3px !important;
  height: 25px !important;
  top: 0 !important;
  right: 0 !important;
}

.monthly-modal .modal-corner.bl {
  bottom: 16px !important;
  left: 16px !important;
}
.monthly-modal .modal-corner.bl::before {
  width: 25px !important;
  height: 3px !important;
  bottom: 0 !important;
  left: 0 !important;
}
.monthly-modal .modal-corner.bl::after {
  width: 3px !important;
  height: 25px !important;
  bottom: 0 !important;
  left: 0 !important;
}

.monthly-modal .modal-corner.br {
  bottom: 16px !important;
  right: 16px !important;
}
.monthly-modal .modal-corner.br::before {
  width: 25px !important;
  height: 3px !important;
  bottom: 0 !important;
  right: 0 !important;
}
.monthly-modal .modal-corner.br::after {
  width: 3px !important;
  height: 25px !important;
  bottom: 0 !important;
  right: 0 !important;
}

.monthly-modal .btn-cerrar-modal {
  position: absolute !important;
  top: 20px !important;
  right: 20px !important;
  z-index: 20 !important;
  width: 36px !important;
  height: 36px !important;
  background: var(--bg-secondary) !important;
  border: 2px solid var(--border-color) !important;
  border-radius: 50% !important;
  color: var(--text-primary) !important;
  font-size: 1.2rem !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.2s !important;
}

.monthly-modal .btn-cerrar-modal:hover {
  background: var(--error-color) !important;
  border-color: var(--error-color) !important;
  color: white !important;
  transform: scale(1.1) !important;
}

/* Contenedor interno scrolleable */
.monthly-modal .modal-content-scroll {
  max-height: calc(85vh - 24px) !important;
  overflow-y: auto !important;
  padding: 24px !important;
  scrollbar-color: var(--accent-color) var(--bg-secondary) !important;
}

.monthly-modal .modal-content-scroll::-webkit-scrollbar {
  width: 8px !important;
}

.monthly-modal .modal-content-scroll::-webkit-scrollbar-track {
  background: var(--bg-secondary) !important;
  border-radius: 4px !important;
}

.monthly-modal .modal-content-scroll::-webkit-scrollbar-thumb {
  background: var(--accent-color) !important;
  border-radius: 4px !important;
}

/* Header del modal */
.monthly-header {
  text-align: center !important;
  margin-bottom: 1.5rem !important;
  padding-bottom: 1rem !important;
  border-bottom: 3px double var(--border-color) !important;
  position: relative !important;
}

.monthly-header::after {
  content: '' !important;
  position: absolute !important;
  bottom: -8px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: 60px !important;
  height: 3px !important;
  background: var(--accent-color) !important;
  border-radius: 2px !important;
}

.monthly-header h2 {
  margin: 0 0 0.5rem 0 !important;
  font-size: 1.6rem !important;
  font-family: var(--font-family) !important;
  color: var(--accent-color) !important;
  text-shadow: 1px 1px 2px var(--shadow-color) !important;
  letter-spacing: 0.05em !important;
}

.monthly-header p {
  margin: 0 !important;
  color: var(--text-secondary) !important;
  font-size: 0.9rem !important;
  font-style: italic !important;
}

/* Selector section */
.monthly-selector {
  display: flex !important;
  flex-direction: column !important;
  gap: 1.5rem !important;
  margin-bottom: 1.5rem !important;
}

.selector-section {
  background: var(--bg-secondary) !important;
  border: 2px solid var(--border-color) !important;
  border-radius: 12px !important;
  padding: 1.25rem !important;
  position: relative !important;
  box-shadow: 
    inset 0 2px 4px rgba(0,0,0,0.1),
    0 2px 8px var(--shadow-color) !important;
}

.selector-section::before {
  content: '' !important;
  position: absolute !important;
  top: 8px !important;
  left: 8px !important;
  right: 8px !important;
  bottom: 8px !important;
  border: 1px dashed var(--border-color) !important;
  border-radius: 8px !important;
  pointer-events: none !important;
  opacity: 0.3 !important;
}

.selector-section label {
  display: block !important;
  font-weight: 700 !important;
  margin-bottom: 0.75rem !important;
  color: var(--accent-color) !important;
  font-size: 1rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
}

/* Date inputs */
.date-range {
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  flex-wrap: wrap !important;
  margin-bottom: 1rem !important;
}

.date-range input {
  flex: 1 !important;
  min-width: 120px !important;
  padding: 0.75rem !important;
  background: var(--bg-primary) !important;
  border: 2px solid var(--border-color) !important;
  border-radius: 8px !important;
  color: var(--text-primary) !important;
  font-size: 0.9rem !important;
  font-family: inherit !important;
  transition: all 0.2s !important;
}

.date-range input:focus {
  outline: none !important;
  border-color: var(--accent-color) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 30%, transparent) !important;
}

.date-range span {
  color: var(--text-secondary) !important;
  font-weight: bold !important;
  font-size: 1.2rem !important;
}

/* Divisor */
.selector-divider {
  text-align: center !important;
  color: var(--text-secondary) !important;
  font-weight: bold !important;
  font-size: 1rem !important;
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  gap: 1rem !important;
}

.selector-divider::before,
.selector-divider::after {
  content: '' !important;
  flex: 1 !important;
  height: 2px !important;
  background: linear-gradient(90deg, transparent, var(--border-color), transparent) !important;
}

/* Month select */
.month-select {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.75rem !important;
}

.month-select input {
  padding: 0.75rem !important;
  background: var(--bg-primary) !important;
  border: 2px solid var(--border-color) !important;
  border-radius: 8px !important;
  color: var(--text-primary) !important;
  font-size: 0.9rem !important;
  font-family: inherit !important;
  transition: all 0.2s !important;
}

.month-select input:focus {
  outline: none !important;
  border-color: var(--accent-color) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 30%, transparent) !important;
}

/* Botón generar */
.btn-generate-range {
  width: 100% !important;
  padding: 1rem 1.5rem !important;
  background: linear-gradient(180deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 70%, black) 100%) !important;
  color: var(--bg-primary) !important;
  border: 3px solid var(--border-color) !important;
  border-radius: 12px !important;
  font-weight: bold !important;
  font-size: 1rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.75rem !important;
  transition: all 0.3s !important;
  box-shadow: 
    0 4px 0 var(--border-color),
    0 6px 12px var(--shadow-color) !important;
  position: relative !important;
  overflow: hidden !important;
}

.btn-generate-range::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: -100% !important;
  width: 100% !important;
  height: 100% !important;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent) !important;
  transition: left 0.5s !important;
}

.btn-generate-range:hover::before {
  left: 100% !important;
}

.btn-generate-range:hover {
  transform: translateY(-2px) !important;
  box-shadow: 
    0 6px 0 var(--border-color),
    0 10px 20px var(--shadow-color) !important;
  filter: brightness(1.1) !important;
}

.btn-generate-range:active {
  transform: translateY(2px) !important;
  box-shadow: 
    0 2px 0 var(--border-color),
    0 4px 8px var(--shadow-color) !important;
}

/* Results section */
.monthly-results {
  margin-top: 1rem !important;
}

.results-summary {
  display: grid !important;
  grid-template-columns: repeat(2, 1fr) !important;
  gap: 1rem !important;
  margin-bottom: 1.5rem !important;
}

.summary-card {
  background: var(--bg-secondary) !important;
  border: 2px solid var(--border-color) !important;
  border-radius: 12px !important;
  padding: 1rem !important;
  text-align: center !important;
  transition: all 0.2s !important;
  position: relative !important;
}

.summary-card:hover {
  transform: translateY(-2px) !important;
  border-color: var(--accent-color) !important;
  box-shadow: 0 4px 12px var(--shadow-color) !important;
}

.summary-card.total {
  grid-column: span 2 !important;
  background: linear-gradient(135deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 70%, black) 100%) !important;
  border-color: var(--border-color) !important;
}

.summary-card.total .summary-label,
.summary-card.total .summary-value {
  color: var(--bg-primary) !important;
}

.summary-card.tarjeta {
  border-color: #ec4899 !important;
}

.summary-card.profit {
  border-color: var(--success-color) !important;
}

.summary-label {
  display: block !important;
  font-size: 0.75rem !important;
  color: var(--text-secondary) !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  margin-bottom: 0.25rem !important;
}

.summary-value {
  display: block !important;
  font-size: 1.25rem !important;
  font-weight: bold !important;
  color: var(--text-primary) !important;
}

/* Weekly section */
.weekly-section h3 {
  text-align: center !important;
  color: var(--accent-color) !important;
  margin: 0 0 1rem 0 !important;
  font-size: 1.2rem !important;
}

.chart-container-weekly {
  max-height: 300px !important;
  margin-bottom: 1rem !important;
  background: var(--bg-secondary) !important;
  border: 2px solid var(--border-color) !important;
  border-radius: 12px !important;
  padding: 1rem !important;
}

.weekly-cards {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
  gap: 1rem !important;
}

.week-card {
  background: var(--bg-secondary) !important;
  border: 2px solid var(--border-color) !important;
  border-radius: 10px !important;
  padding: 1rem !important;
  transition: all 0.2s !important;
}

.week-card:hover {
  transform: scale(1.02) !important;
  border-color: var(--accent-color) !important;
}

.week-header {
  font-weight: bold !important;
  color: var(--accent-color) !important;
  text-align: center !important;
  margin-bottom: 0.25rem !important;
}

.week-dates {
  font-size: 0.8rem !important;
  color: var(--text-secondary) !important;
  text-align: center !important;
  margin-bottom: 0.75rem !important;
  padding-bottom: 0.5rem !important;
  border-bottom: 1px solid var(--border-color) !important;
}

.week-stats {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.5rem !important;
}

.week-stat {
  display: flex !important;
  justify-content: space-between !important;
  font-size: 0.85rem !important;
}

.week-stat span {
  color: var(--text-secondary) !important;
}

.week-stat strong {
  color: var(--text-primary) !important;
}

.week-stat.profit strong {
  color: var(--success-color) !important;
}

/* Products section */
.products-section h3 {
  text-align: center !important;
  color: var(--accent-color) !important;
  margin: 0 0 1rem 0 !important;
  font-size: 1.2rem !important;
}

.products-toggle {
  display: flex !important;
  gap: 0.5rem !important;
  margin-bottom: 1rem !important;
  justify-content: center !important;
}

.products-toggle button {
  padding: 0.75rem 1.5rem !important;
  background: var(--bg-secondary) !important;
  border: 2px solid var(--border-color) !important;
  border-radius: 8px !important;
  color: var(--text-primary) !important;
  cursor: pointer !important;
  transition: all 0.2s !important;
}

.products-toggle button.active {
  background: var(--accent-color) !important;
  border-color: var(--accent-color) !important;
  color: var(--bg-primary) !important;
}

.chart-container {
  max-height: 300px !important;
  margin-bottom: 1rem !important;
  background: var(--bg-secondary) !important;
  border: 2px solid var(--border-color) !important;
  border-radius: 12px !important;
  padding: 1rem !important;
}

.products-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.5rem !important;
  max-height: 250px !important;
  overflow-y: auto !important;
}

.product-row {
  display: grid !important;
  grid-template-columns: 30px 1fr auto auto !important;
  gap: 0.75rem !important;
  padding: 0.75rem !important;
  background: var(--bg-secondary) !important;
  border: 1px solid var(--border-color) !important;
  border-radius: 8px !important;
  align-items: center !important;
}

.product-rank {
  width: 28px !important;
  height: 28px !important;
  background: var(--accent-color) !important;
  color: var(--bg-primary) !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: bold !important;
  font-size: 0.8rem !important;
}

.product-name {
  color: var(--text-primary) !important;
  font-weight: 500 !important;
}

.product-qty {
  color: var(--text-secondary) !important;
  font-size: 0.85rem !important;
}

.product-amount {
  color: var(--success-color) !important;
  font-weight: bold !important;
}

/* Empty state */
.monthly-empty {
  text-align: center !important;
  padding: 2rem !important;
  color: var(--text-secondary) !important;
  font-style: italic !important;
}

.annual-header-modern {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
  flex-wrap: wrap;
  gap: 0.75rem;
}

.annual-title-block {
  flex: 1;
  min-width: 150px;
}

.annual-title {
  margin: 0 0 0.15rem 0;
  font-size: 1.3rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.annual-subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.75rem;
  white-space: nowrap;
}

.annual-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.annual-year-select {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-family: "Courier New", monospace;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.annual-year-select:focus {
  border-color: var(--accent-color);
  outline: none;
}

.annual-btn-refresh {
  background: linear-gradient(180deg, var(--accent-color) 0%, var(--gradient-btn-mid) 50%, var(--gradient-btn-end) 100%);
  border: 2px solid var(--border-color);
  color: var(--btn-text, var(--bg-primary));
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: 0 3px 0 var(--border-color);
  transition: all 0.15s;
}

.annual-btn-refresh:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.annual-btn-refresh:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 var(--border-color);
}

.annual-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.annual-kpis {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
}

.kpi-card {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  transition: all 0.2s;
  box-shadow: 0 4px 6px var(--shadow-color);
  overflow: hidden;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px var(--shadow-color);
}

.kpi-main {
  background: linear-gradient(135deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border-color: var(--success-color);
}

.kpi-gain {
  background: linear-gradient(135deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border-color: var(--accent-color);
}

.kpi-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-icon-wrapper.success {
  background: color-mix(in srgb, var(--success-color) 20%, transparent);
}

.kpi-icon-wrapper.efectivo {
  background: color-mix(in srgb, var(--success-color) 20%, transparent);
}

.kpi-icon-wrapper.transferencia {
  background: color-mix(in srgb, var(--infoBlueColor, #6e96b8) 20%, transparent);
}

.kpi-icon-wrapper.tarjeta {
  background: color-mix(in srgb, #ec4899 20%, transparent);
}

.kpi-icon-wrapper.gain {
  background: color-mix(in srgb, var(--accent-color) 20%, transparent);
}

.kpi-icon {
  font-size: 1.5rem;
}

.kpi-info {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.kpi-label {
  margin: 0 0 0.25rem 0;
  color: var(--text-secondary);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-value {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 800;
  font-family: "Courier New", monospace;
  word-break: break-all;
  hyphens: auto;
  line-height: 1.2;
}

.kpi-main .kpi-value,
.kpi-gain .kpi-value {
  color: var(--accent-color);
  font-size: 0.9rem;
}

.annual-charts-grid {
  gap: 1rem;
}

@media (min-width: 900px) {
  .annual-charts-grid {
    grid-template-columns: 2fr 1fr;
  }
}

.chart-card {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 4px 6px var(--shadow-color);
}

.chart-full {
  grid-column: 1 / -1;
}

.chart-header {
  margin-bottom: 1rem;
}

.chart-title {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.chart-subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.chart-body {
  height: 280px;
  position: relative;
}

.horario-mini-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.horario-mini-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.horario-mini-time {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-color);
  text-transform: uppercase;
}

.horario-mini-sales {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
}

.horario-mini-count {
  font-size: 0.65rem;
  color: var(--text-secondary);
}

.annual-table-section,
.annual-products-section {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px var(--shadow-color);
}

.table-header {
  background: var(--bg-secondary);
  padding: 1rem 1.25rem;
  border-bottom: 2px solid var(--border-color);
}

.table-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.months-table-modern {
  padding: 0;
}

.month-row-modern {
  display: grid;
  grid-template-columns: 1.5fr 1.5fr 1.5fr 100px;
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  align-items: center;
  transition: background 0.15s;
}

.month-row-modern:last-child {
  border-bottom: none;
}

.month-row-modern:hover {
  background: var(--bg-secondary);
}

.month-row-modern.header {
  background: var(--bg-secondary);
  font-weight: 700;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  padding: 0.7rem 1.25rem;
}

.month-name {
  color: var(--text-primary);
  font-weight: 600;
}

.month-sales {
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-weight: 700;
}

.month-gain {
  color: var(--accent-color);
  font-family: "Courier New", monospace;
  font-weight: 600;
  font-size: 0.9rem;
}

.month-change {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 700;
  font-size: 0.85rem;
}

.month-change.positive {
  color: var(--success-color);
}

.month-change.negative {
  color: var(--error-color);
}

.change-icon {
  font-weight: 900;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.product-group {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.product-group-title {
  background: var(--bg-panel);
  margin: 0;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border-color);
}

.product-list-modern {
  padding: 0;
}

.product-row {
  display: grid;
  grid-template-columns: 30px 1fr 80px;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--border-color);
  align-items: center;
  font-size: 0.85rem;
}

.product-row:last-child {
  border-bottom: none;
}

.product-rank {
  width: 24px;
  height: 24px;
  background: var(--bg-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.7rem;
  color: var(--accent-color);
}

.product-name {
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-qty {
  color: var(--success-color);
  font-weight: 700;
  text-align: right;
  font-family: "Courier New", monospace;
}

.annual-loading-modern {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.annual-loading-modern p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

@media (max-width: 1200px) {
  .annual-kpis {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .annual-modal {
    width: min(100%, 95vw);
  }
}

@media (max-width: 900px) {
  .annual-kpis {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.6rem;
  }
  
  .kpi-card {
    padding: 0.75rem;
  }
  
  .kpi-icon-wrapper {
    width: 38px;
    height: 38px;
  }
  
  .kpi-icon {
    font-size: 1.2rem;
  }
  
  .kpi-value {
    font-size: 0.8rem;
  }
  
  .chart-body {
    height: 220px;
  }
  
  .products-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .annual-modal {
    padding: 0.75rem;
    max-height: 95vh;
  }
  
  .annual-header-modern {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .annual-title-block {
    text-align: center;
  }
  
  .annual-title {
    font-size: 1.2rem;
  }
  
  .annual-subtitle {
    font-size: 0.75rem;
  }
  
  .annual-actions {
    justify-content: center;
  }
  
  .annual-kpis {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  
  .kpi-card {
    padding: 0.6rem;
    gap: 0.35rem;
  }
  
  .kpi-icon-wrapper {
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }
  
  .kpi-icon {
    font-size: 1rem;
  }
  
  .kpi-label {
    font-size: 0.55rem;
  }
  
  .kpi-value {
    font-size: 0.7rem;
  }
  
  .kpi-main .kpi-value,
  .kpi-gain .kpi-value {
    font-size: 0.75rem;
  }
  
  .annual-charts-grid {
    gap: 0.75rem;
  }
  
  .chart-card {
    padding: 0.75rem;
  }
  
  .chart-title {
    font-size: 0.85rem;
  }
  
  .chart-subtitle {
    font-size: 0.65rem;
  }
  
  .chart-body {
    height: 180px;
  }
  
  .horario-mini-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  
  .horario-mini-card {
    padding: 0.5rem;
  }
  
  .horario-mini-time {
    font-size: 0.65rem;
  }
  
  .horario-mini-sales {
    font-size: 0.75rem;
  }
  
  .horario-mini-count {
    font-size: 0.55rem;
  }
  
  .month-row-modern {
    grid-template-columns: 1fr 80px 60px;
    font-size: 0.7rem;
    padding: 0.5rem 0.75rem;
    gap: 0.25rem;
  }
  
  .month-row-modern .month-gain {
    display: none;
  }
  
  .month-change {
    font-size: 0.7rem;
  }
  
  .products-grid {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .product-group {
    border-radius: 6px;
  }
  
  .product-group-title {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
  }
  
  .product-row {
    padding: 0.4rem 0.75rem;
    font-size: 0.75rem;
  }
  
  .product-rank {
    width: 20px;
    height: 20px;
    font-size: 0.6rem;
  }
}

@media (max-width: 400px) {
  .annual-kpis {
    grid-template-columns: 1fr 1fr;
  }
  
  .kpi-card {
    padding: 0.5rem;
  }
  
  .kpi-icon-wrapper {
    width: 28px;
    height: 28px;
  }
  
  .kpi-icon {
    font-size: 0.9rem;
  }
  
  .kpi-label {
    font-size: 0.5rem;
  }
  
  .kpi-value {
    font-size: 0.65rem;
  }
  
  .chart-body {
    height: 150px;
  }
}

.range-section {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px dashed color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.section-icon {
  font-size: 1.1rem;
}

.range-section label {
  display: block;
  font-size: 0.85rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
}

.range-inputs {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.range-field {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.range-field span {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.range-field input {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  padding: 0.5rem;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-size: 0.85rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.range-field input:focus {
  border-color: var(--accent-color);
}

.monthly-picker {
  margin-bottom: 1rem;
}

.monthly-picker label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.monthly-head {
  display: flex;
  gap: 0.5rem;
}

.monthly-head .input-wrapper {
  flex: 1;
}

.monthly-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.stat-card {
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 0.8rem;
  border-radius: 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.stat-icon {
  font-size: 1.3rem;
  margin-bottom: 0.2rem;
}

.stat-card p {
  font-size: 0.65rem;
  text-transform: uppercase;
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.stat-card strong {
  font-size: 1rem;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  display: block;
}

.stat-card.accent {
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent-color) 20%, var(--bg-secondary)) 0%, var(--bg-secondary) 100%);
  border-color: var(--accent-color);
}

.stat-card.accent strong {
  color: var(--accent-color);
}

.divider {
  text-align: center;
  color: var(--text-primary);
  opacity: 0.5;
  margin: 0.5rem 0;
  font-size: 0.8rem;
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
  border: var(--border-width) solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 0.7rem;
  box-shadow: var(--shadow-inner) var(--bg-panel), 0 3px 0 var(--border-color);
}

.monthly-stats article strong {
  font-size: 1.1rem;
  color: var(--accent-color);
  font-family: "Courier New", monospace;
  display: block;
  margin-top: 0.2rem;
}

@media (max-width: 600px) {
  .monthly-stats {
    gap: 0.4rem;
  }
  
  .monthly-stats article {
    padding: 0.5rem;
  }
  
  .monthly-stats article strong {
    font-size: 0.95rem;
  }
  
  .monthly-stats p {
    font-size: 0.6rem;
  }
}

.monthly-stats p {
  font-size: 0.7rem;
  text-transform: uppercase;
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.weekly-chart {
  border: var(--border-width-thick) solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 1rem;
  box-shadow: var(--shadow-inner) var(--bg-panel), 0 3px 0 var(--border-color);
  border-radius: 12px;
}

.weekly-chart h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: "Courier New", monospace;
  text-align: center;
  color: var(--accent-color);
}

@media (max-width: 600px) {
  .weekly-chart {
    padding: 0.7rem;
  }
  
  .weekly-chart h4 {
    font-size: 0.85rem;
  }
  
  .weekly-chart .chart-note {
    font-size: 0.65rem;
  }
}

.weekly-chart .chart-note {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 0.5rem;
  font-style: italic;
}

.chart-container-weekly {
  height: 280px;
  margin-bottom: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 0.5rem;
}

@media (max-width: 480px) {
  .chart-container-weekly {
    height: 200px;
    padding: 0.3rem;
  }
}

@media (min-width: 481px) and (max-width: 768px) {
  .chart-container-weekly {
    height: 240px;
  }
}

@media (min-width: 1200px) {
  .chart-container-weekly {
    height: 320px;
  }
}

.weekly-summary {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.weekly-summary-item {
  display: grid;
  grid-template-columns: 80px 1fr 100px 100px;
  gap: 0.5rem;
  align-items: center;
  padding: 0.4rem 0.6rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  border: var(--border-width) solid var(--border-color);
  font-size: 0.75rem;
}

@media (max-width: 600px) {
  .weekly-summary-item {
    grid-template-columns: 60px 1fr 80px;
    font-size: 0.65rem;
  }
  
  .week-profit {
    display: none;
  }
}

.week-label {
  font-weight: bold;
  color: var(--accent-color);
}

.week-dates {
  color: var(--text-secondary);
  font-size: 0.7rem;
}

.week-sales {
  color: var(--success-color);
  font-weight: bold;
}

.week-profit {
  color: var(--accent-color);
  font-weight: bold;
}

.corte-pie-chart {
  border: var(--border-width-thick) solid var(--border-color);
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 12px;
  box-shadow: var(--shadow-inner) var(--bg-panel), 0 3px 0 var(--border-color);
}

.corte-pie-chart h4 {
  margin: 0 0 0.8rem 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: "Courier New", monospace;
  text-align: center;
  color: var(--accent-color);
}

@media (max-width: 600px) {
  .corte-pie-chart {
    padding: 0.7rem;
  }
  
  .corte-pie-chart h4 {
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }
}

.pie-chart-container {
  height: 250px;
  max-width: 400px;
  margin: 0 auto;
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 0.5rem;
}

@media (max-width: 480px) {
  .pie-chart-container {
    height: 180px;
    max-width: 220px;
    padding: 0.3rem;
  }
}

@media (min-width: 481px) and (max-width: 768px) {
  .pie-chart-container {
    height: 220px;
    max-width: 300px;
  }
}

@media (min-width: 1200px) {
  .pie-chart-container {
    height: 300px;
    max-width: 500px;
  }
}

.top-products-chart {
  border: var(--border-width-thick) solid var(--border-color);
  background: var(--bg-secondary);
  padding: 0.9rem;
  border-radius: 8px;
  box-shadow: inset 0 0 0 2px var(--bg-panel);
}

.top-products-chart h4 {
  text-align: center;
  margin-bottom: 0.8rem;
  color: var(--accent-color);
  font-size: 1rem;
}

.chart-header-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.toggle-buttons-Zelda {
  display: flex;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.3rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.toggle-buttons-Zelda button {
  padding: 0.4rem 0.8rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-family: "Courier New", monospace;
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  text-transform: uppercase;
}

.toggle-buttons-Zelda button.active {
  background: var(--accent-color);
  color: var(--bg-primary);
  box-shadow: 0 0 10px rgba(248, 214, 103, 0.3);
}

.toggle-buttons-Zelda button:hover:not(.active) {
  background: rgba(248, 214, 103, 0.1);
  color: var(--text-primary);
}

@media (max-width: 600px) {
  .chart-header-toggle {
    flex-direction: column;
  }
  
  .toggle-buttons-Zelda {
    width: 100%;
  }
  
  .toggle-buttons-Zelda button {
    flex: 1;
    font-size: 0.7rem;
    padding: 0.3rem 0.5rem;
  }
}

.chart-subtitle {
  color: var(--accent-color);
  font-size: 1rem;
  margin: 1rem 0 0.5rem 0;
  padding-left: 0.5rem;
  border-left: 3px solid var(--accent-color);
}

.chart-container {
  height: 300px;
  margin-bottom: 1rem;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem;
}

@media (max-width: 480px) {
  .chart-container {
    height: 220px;
    padding: 0.3rem;
  }
}

@media (min-width: 481px) and (max-width: 768px) {
  .chart-container {
    height: 260px;
  }
}

@media (min-width: 1200px) {
  .chart-container {
    height: 380px;
  }
}

.product-summary {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 200px;
  overflow-y: auto;
}

.product-summary-item {
  display: grid;
  grid-template-columns: 30px 1fr 70px 90px;
  gap: 0.5rem;
  align-items: center;
  padding: 0.4rem 0.6rem;
  background: var(--bg-primary);
  border-radius: 6px;
  border: 2px solid var(--border-color);
  font-size: 0.8rem;
}

@media (max-width: 600px) {
  .product-summary-item {
    grid-template-columns: 25px 1fr 60px;
    font-size: 0.7rem;
    gap: 0.3rem;
    padding: 0.3rem 0.4rem;
  }
  
  .summary-amount {
    display: none;
  }
}

.summary-rank {
  font-weight: bold;
  color: var(--accent-color);
  text-align: center;
}

.summary-name {
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-qty {
  color: var(--text-secondary);
  text-align: center;
}

.summary-amount {
  color: var(--success-color);
  font-weight: bold;
  text-align: right;
}

.history-filters {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.75rem;
  align-items: end;
  padding: 1rem;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border-radius: 12px;
  border: 2px solid var(--border-color);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.filter-group label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.modern-select {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  padding: 0.5rem 0.6rem;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-size: 0.8rem;
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s;
}

.modern-select:focus {
  border-color: var(--accent-color);
}

.filter-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  padding: 0.5rem 0;
}

.filter-total span {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.filter-total strong {
  font-family: "Courier New", monospace;
  color: var(--accent-color);
  font-size: 1.1rem;
}

.history-list {
  border: var(--border-width-thick) solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  min-height: 260px;
  max-height: 420px;
  overflow: auto;
  box-shadow: var(--shadow-inner) var(--bg-panel);
  border-radius: 12px;
}

.history-item {
  padding: 0.8rem 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.history-item:hover {
  background: linear-gradient(90deg, rgba(201, 146, 52, 0.15) 0%, transparent 100%);
}

.history-item:last-child {
  border-bottom: none;
}

.history-item-left {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.ticket-badge {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--accent-color);
}

.history-date {
  font-size: 0.75rem;
  margin: 0;
  color: var(--text-secondary);
}

.history-item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
}

.history-amount {
  color: var(--success-color);
  font-family: "Courier New", monospace;
  font-size: 1rem;
}

.metodo-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
}

.metodo-badge.efectivo {
  background: color-mix(in srgb, var(--success-color) 20%, transparent);
  color: var(--success-color);
}

.metodo-badge.transfer {
  background: color-mix(in srgb, #54a0ff 20%, transparent);
  color: #54a0ff;
}

.metodo-badge.tarjeta {
  background: color-mix(in srgb, #ec4899 20%, transparent);
  color: #ec4899;
}

.empty {
  padding: 1.5rem;
  text-align: center;
  font-family: "Courier New", monospace;
  color: var(--text-secondary);
}


.tabla-wrap {
  overflow: auto;
  border: var(--border-width-thick) solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  height: 100%;
  max-height: calc(100vh - 320px);
  box-shadow: var(--shadow-inner) var(--bg-panel);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.5rem;
  border-bottom: 1px solid var(--bg-panel);
  text-align: left;
  font-size: 0.76rem;
  font-family: "Courier New", monospace;
}

th {
  position: sticky;
  top: 0;
  background: var(--bg-panel);
  color: var(--text-primary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 2px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
  position: relative;
}

.modal-actions button {
  border: var(--border-width) solid var(--border-color);
  padding: 0.55rem 1rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: 0 3px 0 var(--border-color);
  transition: transform 80ms steps(2), filter 80ms linear;
}

.modal-actions button:not(.btn-secondary) {
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 45%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
}

.modal-actions button.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.history-item .descripcion {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
}

.monto-egreso {
  color: var(--error-color) !important;
  font-size: 1rem;
}

.egresos-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem;
  background: var(--bg-primary);
  border: var(--border-width) solid var(--border-color);
  border-radius: 4px;
  margin-top: 0.5rem;
}

.egresos-total span {
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-transform: uppercase;
}

.egresos-total strong {
  color: var(--error-color);
  font-size: 1.1rem;
  font-family: "Courier New", monospace;
}

.apartado-form {
  background: var(--bg-secondary);
  padding: 1.2rem;
  border-radius: 12px;
  margin-bottom: 1rem;
  border: var(--border-width-thick) solid var(--border-color);
  box-shadow: var(--shadow-inner) var(--bg-panel);
}

.apartado-form h4 {
  margin: 0 0 1rem 0;
  color: var(--accent-color);
  font-size: 1.1rem;
  text-align: center;
}

.apartado-form .form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.apartado-form input,
.apartado-form select {
  padding: 0.6rem;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  width: 100%;
  box-sizing: border-box;
}

.btn-crear {
  margin-top: 1rem;
  width: 100%;
  padding: 0.8rem;
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  color: var(--text-primary);
  border: var(--border-width) solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
  box-shadow: 0 4px 0 var(--border-color);
  transition: all 0.1s;
}

.btn-crear:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
  box-shadow: 0 6px 0 var(--border-color);
}

.btn-crear:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--border-color);
}

.apartado-aviso {
  background: var(--bg-secondary);
  color: var(--error-color);
  padding: 1rem;
  border-radius: 10px;
  border: var(--border-width-thick) solid var(--error-color);
  text-align: center;
  margin-bottom: 1rem;
  font-weight: bold;
}

.apartado-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  padding: 1rem;
  border-radius: 10px;
  border: var(--border-width) solid var(--border-color);
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: var(--text-primary);
}

.apartado-total strong {
  color: white;
  font-size: 1.3rem;
}

.apartado-item {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 12px;
  border: var(--border-width-thick) solid var(--border-color);
  box-shadow: var(--shadow-inner) var(--bg-panel);
}

.apartado-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--accent-color);
  font-size: 1.2rem;
  text-align: center;
}

.apartado-info p {
  margin: 0.3rem 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.apartado-info strong {
  color: var(--text-primary);
}

.progress-bar {
  width: 100%;
  height: 14px;
  background: var(--bg-primary);
  border-radius: 7px;
  margin-top: 0.6rem;
  overflow: hidden;
  border: 2px solid var(--border-color);
}

.progress-fill {
  height: 100%;
  background: var(--success-color);
  transition: width 0.3s;
  border-radius: 5px;
}

.btn-pagar {
  flex: 1;
  padding: 0.6rem 1rem;
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  color: var(--text-primary);
  border: var(--border-width) solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 3px 0 var(--border-color);
}

.btn-pagar:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.historial-pagos {
  background: var(--bg-secondary);
  border: var(--border-width-thick) solid var(--border-color);
  border-radius: 12px;
  padding: 1.2rem;
  margin-top: 1rem;
  box-shadow: var(--shadow-inner) var(--bg-panel);
}

.historial-pagos h4 {
  margin: 0 0 1rem 0;
  color: var(--accent-color);
  text-align: center;
  font-size: 1.1rem;
}

.pagos-list {
  max-height: 250px;
  overflow-y: auto;
  background: var(--bg-primary);
  border-radius: 8px;
  border: var(--border-width) solid var(--border-color);
}

.pago-item {
  display: flex;
  justify-content: space-between;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--bg-panel);
}

.pago-item span:first-child {
  color: var(--text-secondary);
  font-weight: bold;
}

.pago-item span:last-child {
  color: var(--success-color);
  font-weight: bold;
  font-size: 1.1rem;
}

.btn-cerrar-historial {
  margin-top: 1rem;
  width: 100%;
  padding: 0.7rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: var(--border-width) solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 3px 0 var(--border-color);
}

.btn-cerrar-historial:hover {
  filter: brightness(1.1);
}

.apartado-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: center;
}

@keyframes swing {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  25% { transform: rotate(-0.8deg) translateY(1px); }
  75% { transform: rotate(0.8deg) translateY(1px); }
}

@media (max-width: 1100px) {
  .cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card-metric.total {
    grid-column: span 2;
  }
}
</style>
