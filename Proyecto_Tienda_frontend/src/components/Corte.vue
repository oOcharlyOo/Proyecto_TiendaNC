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
import SueldoXHoraModal from './modals/SueldoXHoraModal.vue';

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
  tieneDiscrepancia?: boolean;
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
  gananciaNeta: number;
  ventasEfectivo?: number;
  ventasTarjeta?: number;
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
  topProductosGranel: ProductoTopData[];
  topProductosUnitarios: ProductoTopData[];
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

type ProductoTopData = {
  nombreProducto: string;
  cantidadVendida: number;
  totalVendido: number;
  isGramaje: boolean;
  posicion: number;
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
  cargarUsuariosConSueldo();
});

async function cargarUsuariosConSueldo() {
  try {
    const res = await fetch(`${API_BASE}/usuarios/listarUsuarios`);
    const data = await res.json();
    if (data.codigo === 200 && data.datos) {
      usuariosConSueldo.value = data.datos.map((u: any) => ({
        id: u.idUsuario,
        nombre: u.nombre,
        surname: u.apellido_p,
        hora: u.sueldo_hora || 0,
        diasSemana: u.dias_semana || 6,
        horas: u.horas_trabajadas || 8
      }));
      console.log('Usuarios con sueldo cargados:', usuariosConSueldo.value);
    }
  } catch (e) {
    console.error('Error al cargar usuarios con sueldo:', e);
  }
}

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
const modalSueldoHoraAbierto = ref(false);

const diasLaboradosSemana = ref(6);
const usuariosConSueldo = ref<{id: number; nombre: string; surname: string; hora: number; diasSemana: number; horas: number}[]>([]);
const usuariosQueTrabajaronElDia = ref<number[]>([]);

const totalSueldoSemanal = computed(() => {
  const horasDia = obtenerHorasTrabajadas();
  const costoTotal = usuariosConSueldo.value
    .filter(u => usuariosQueTrabajaronElDia.value.includes(u.id))
    .reduce((sum, u) => {
      const dias = u.diasSemana || 6;
      return sum + ((u.hora || 0) * horasDia * dias);
    }, 0);
  return costoTotal;
});

function obtenerHorasTrabajadas(): number {
  const horasStr = corteActual.value?.horasTrabajadas || horasTrabajadas.value || '8h';
  const match = horasStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 8;
}
const dineroApartarDiario = computed(() => {
  const DIAS_PARA_JUNTAR = 7;
  return totalSueldoSemanal.value / DIAS_PARA_JUNTAR;
});

const anioReporte = ref(new Date().getFullYear());

function verificarDiscrepancia(detalles: VentaDetalleDTO[], montoTotal: number): boolean {
  const sumaDetalles = detalles.reduce((sum: number, d) => {
    const precio = Number(d.precioUnitarioVenta || 0);
    const cantidad = Number(d.cantidad || 0);
    return sum + (precio * cantidad);
  }, 0);
  
  return Math.abs(sumaDetalles - montoTotal) > 1;
}

async function registrarSalida(payload: { montoEoS: number, descripcion: string }) {
  try {
    const res = await fetch('/caja/salida', {
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
const ventasTarjeta = ref(0);
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

const historialDetalles = ref<VentaDetalleDTO[]>([]);
const filtroMesHistorial = ref('all');
const filtroDiaHistorial = ref('all');
const filtroDiscrepanciaHistorial = ref(false);
const ventaDetalleSeleccionada = ref<VentaDTO | null>(null);
const ventaDetalleItems = shallowRef<VentaDetalleDTO[]>([]);
const ventaDetalleEditando = ref(false);
const ventaDetalleMontoEditado = ref(0);
const ventaDetalleItemEditando = ref<number | null>(null);
const ventaDetalleCantidadTemp = ref(0);
const ventaDetallePrecioTemp = ref(0);

const historialVentasAgrupadas = computed(() => {
  const map = new Map<number, { venta: VentaDTO; detalles: VentaDetalleDTO[] }>();

  for (const d of historialDetalles.value) {
    const idVenta = Number(d?.Venta?.idVenta || 0);
    if (!idVenta) continue;

    if (!map.has(idVenta)) {
      const montoVenta = Number(d.Venta?.montoTotal ?? 0);
      const tieneDiscrepancia = verificarDiscrepancia([d], montoVenta);
      map.set(idVenta, {
        venta: { ...d.Venta, tieneDiscrepancia },
        detalles: []
      });
    }

    map.get(idVenta)?.detalles.push(d);
  }

  for (const item of map.values()) {
    const montoVenta = Number(item.venta.montoTotal ?? 0);
    item.venta.tieneDiscrepancia = verificarDiscrepancia(item.detalles, montoVenta);
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
    const discrepancyOk = !filtroDiscrepanciaHistorial.value || item.venta.tieneDiscrepancia === true;
    return monthOk && dayOk && discrepancyOk;
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

    // Calcular productos más vendidos para el corte actual (todas las ventas del día)
    try {
      const dataVentas = await fetchApi<GananciasDTO>(`/ventas/obtenerVentaPorDia/${corte.fechaCorte.split('T')[0]}`);
      
      // Usar ganancia total del día (todas las ventas) sin importar el usuario
      const gananciaBrutaCorte = Number(dataVentas?.gananciaTotal || 0);
      const gananciaNetaCorte = Math.max(0, gananciaBrutaCorte - dineroApartarDiario.value);
      
      // Actualizar la ganancia en el corte
      if (corte.gananciaTotal !== gananciaBrutaCorte) {
        corte.gananciaTotal = gananciaBrutaCorte;
        corte.gananciaNeta = gananciaNetaCorte;
        corteActual.value = { ...corte };
      }
      
      // Para productos más vendidos, usar todas las ventas del día
      const ventasDia = (dataVentas?.ventas || []).filter(v => v.estatus === 'C' || v.estatus === 'F');
      
      if (ventasDia.length > 0) {
        const idsVentas = ventasDia.map(v => v.idVenta);
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
    console.log('Primera venta:', ventas[0]);

    const todosDetalles = await fetchApi<VentaDetalleDTO[]>('/ventasDetalle/obtenerTodosLosVentasDetalles');
    const detallesMap = new Map<number, VentaDetalleDTO[]>();
    for (const d of todosDetalles || []) {
      const idVenta = Number(d?.Venta?.idVenta || 0);
      if (!detallesMap.has(idVenta)) {
        detallesMap.set(idVenta, []);
      }
      detallesMap.get(idVenta)?.push(d);
    }
    
    for (const venta of ventas) {
      const detalles = detallesMap.get(venta.idVenta) || [];
      const montoVenta = Number(venta.montoTotal ?? 0);
      venta.tieneDiscrepancia = verificarDiscrepancia(detalles, montoVenta);
    }

    ventasEfectivo.value = ventas
      .filter((v) => ['EFECTIVO', 'Efectivo'].includes(String(v.metodoPago || '')))
      .reduce((sum, v) => sum + Number(v.montoTotal || 0), 0);

    ventasTarjeta.value = ventas
      .filter((v) => String(v.metodoPago || '').toUpperCase() === 'TARJETA')
      .reduce((sum, v) => sum + Number(v.montoTotal || 0), 0);

    ventasTransferencia.value = ventas
      .filter((v) => String(v.metodoPago || '').toUpperCase() === 'TRANSFERENCIA')
      .reduce((sum, v) => sum + Number(v.montoTotal || 0), 0);

    // Obtener usuarios únicos que trabajaron ese día
    const idsUsuariosUnicos = [...new Set(ventas.map(v => v.idUsuario).filter((id): id is number => !!id))];
    usuariosQueTrabajaronElDia.value = idsUsuariosUnicos;

    // Calcular días trabajados en la semana actual
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    
    const diasSemanaMap = new Map<number, Set<string>>();
    for (const v of ventas) {
      if (v.idUsuario && v.fechaVenta) {
        const fecha = v.fechaVenta.split('T')[0];
        if (!diasSemanaMap.has(v.idUsuario)) {
          diasSemanaMap.set(v.idUsuario, new Set());
        }
        diasSemanaMap.get(v.idUsuario)?.add(fecha);
      }
    }
    
    usuariosConSueldo.value = usuariosConSueldo.value.map(u => ({
      ...u,
      diasTrabajados: diasSemanaMap.get(u.id)?.size || 1
    }));

    console.log('Usuarios que trabajaron:', idsUsuariosUnicos);
    console.log('Días trabajados:', Object.fromEntries(diasSemanaMap));
    console.log('Dinero a apartar diario:', dineroApartarDiario.value);

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

    const gananciaBruta = Number(data?.gananciaTotal || 0);
    const gananciaNeta = Math.max(0, gananciaBruta - dineroApartarDiario.value);

    corteActual.value = {
      fechaCorte: `${fechaDiaria.value}T00:00:00`,
      montoInicial: montoInicial,
      totalVentas: totalVentas,
      totalEgresos: totalEgresos,
      otrosIngresos: otrosIngresos,
      saldoFinalCalculado: saldoFinal,
      gananciaTotal: gananciaBruta,
      gananciaNeta: gananciaNeta,
      ventasTarjeta: Number(ventasTarjeta.value || 0),
      ventasEfectivo: Number(ventasEfectivo.value || 0),
      ventasTransferencia: Number(ventasTransferencia.value || 0)
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

function recalcularGananciaNeta() {
  if (corteActual.value && corteActual.value.gananciaTotal) {
    const gananciaNeta = Math.max(0, Number(corteActual.value.gananciaTotal) - dineroApartarDiario.value);
    corteActual.value.gananciaNeta = gananciaNeta;
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
        display: false
      },
      tooltip: {
        titleFont: { size: fontSize + 1 },
        bodyFont: { size: fontSize },
        backgroundColor: 'rgba(30, 30, 40, 0.95)',
        borderColor: 'var(--accent-color)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
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
          color: 'rgba(255, 255, 255, 0.08)'
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
    cutout: '55%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        titleFont: { size: fontSize + 1 },
        bodyFont: { size: fontSize },
        backgroundColor: 'rgba(30, 30, 40, 0.95)',
        borderColor: 'var(--accent-color)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
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
  ventaDetalleItems.value = [...grouped.detalles];
  ventaDetalleMontoEditado.value = Number(grouped.venta.montoTotal ?? 0);
  ventaDetalleEditando.value = false;
  ventaDetalleItemEditando.value = null;
  modalDetalleAbierto.value = true;
}

function iniciarEdicionVentaDetalle() {
  if (!esAdministrador.value) return;
  ventaDetalleEditando.value = true;
}

async function guardarEdicionVentaDetalle() {
  if (!ventaDetalleSeleccionada.value) return;
  
  try {
    for (const detalle of ventaDetalleItems.value) {
      await fetchApi<unknown>(
        `/ventasDetalle/actualizarVentaDetalle/${detalle.idVentaDetalle}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Venta: { idVenta: ventaDetalleSeleccionada.value.idVenta },
            cantidad: Number(detalle.cantidad),
            precioUnitarioVenta: Number(detalle.precioUnitarioVenta)
          })
        }
      );
    }
    
    await fetchApi<unknown>(
      `/ventas/actualizarVenta/${ventaDetalleSeleccionada.value.idVenta}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montoTotal: ventaDetalleMontoEditado.value })
      }
    );
    
    mostrarMensaje('Venta actualizada correctamente', 'ok');
    ventaDetalleEditando.value = false;
    modalDetalleAbierto.value = false;
    
    historialDetalles.value = await fetchApi<VentaDetalleDTO[]>('/ventasDetalle/obtenerTodosLosVentasDetalles');
  } catch (error) {
    mostrarMensaje('Error al guardar cambios', 'error');
  }
}

function cancelarEdicionVentaDetalle() {
  ventaDetalleEditando.value = false;
  ventaDetalleItemEditando.value = null;
}

function iniciarEditarItemDetalle(index: number) {
  const item = ventaDetalleItems.value[index];
  ventaDetalleItemEditando.value = index;
  ventaDetalleCantidadTemp.value = Number(item.cantidad);
  ventaDetallePrecioTemp.value = Number(item.precioUnitarioVenta);
}

function confirmarEditarItemDetalle(index: number) {
  const item = ventaDetalleItems.value[index];
  item.cantidad = ventaDetalleCantidadTemp.value;
  item.precioUnitarioVenta = Number(ventaDetalleCantidadTemp.value.toFixed(2));
  ventaDetalleItemEditando.value = null;
  
  if (!ventaDetalleEditando.value) {
    ventaDetalleMontoEditado.value = ventaDetalleItems.value.reduce((sum, d) => sum + (Number(d.cantidad) * Number(d.precioUnitarioVenta)), 0);
  }
}

function cancelarEditarItemDetalle() {
  ventaDetalleItemEditando.value = null;
}

async function eliminarItemDetalle(index: number) {
  const item = ventaDetalleItems.value[index];
  if (!item?.idVentaDetalle) return;
  
  if (!confirm('¿Eliminar este producto de la venta?')) return;
  
  try {
    await fetchApi<unknown>(`/ventasDetalle/eliminarVentaDetalle/${item.idVentaDetalle}`, { method: 'DELETE' });
    ventaDetalleItems.value.splice(index, 1);
    ventaDetalleMontoEditado.value = ventaDetalleItems.value.reduce((sum, d) => sum + (Number(d.cantidad) * Number(d.precioUnitarioVenta)), 0);
    mostrarMensaje('Producto eliminado', 'ok');
  } catch {
    mostrarMensaje('Error al eliminar producto', 'error');
  }
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

function getRankIcon(index: number): string {
  const icons = ['🥇', '🥈', '🥉', '4', '5', '6', '7', '8', '9', '10'];
  return icons[index] || (index + 1).toString();
}

function getRankClass(index: number): string {
  if (index === 0) return 'gold';
  if (index === 1) return 'silver';
  if (index === 2) return 'bronze';
  return '';
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
    
    <header class="hero-section">
      <div class="hero-decoration left">❧</div>
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="title-icon">💰</span>
          Corte de Caja
          <span class="title-icon">⚔</span>
        </h1>
        <p class="hero-subtitle">Gestión de tesoro y cierre del día</p>
      </div>
      <div class="hero-decoration right">❧</div>
    </header>

    <p v-if="mensaje" class="estado" :class="`estado-${mensajeTipo}`">{{ mensaje }}</p>

    <section class="stats-section">
      <div class="stat-card-wrapper" v-for="(stat, index) in [
        { label: 'Total Ventas', value: corteActual ? formatoMoneda(corteActual.totalVentas) : '$0.00', icon: '💵', clase: 'gold' },
        { label: 'Efectivo', value: formatoMoneda(ventasEfectivo), icon: '💰', clase: 'success' },
        { label: 'Transferencia', value: formatoMoneda(ventasTransferencia), icon: '📱', clase: '' },
        { label: 'Tarjeta', value: formatoMoneda(ventasTarjeta), icon: '💳', clase: '' },
        { label: 'Tickets', value: totalTicketsDia, icon: '🧾', clase: '' }
      ]" :key="index" :class="['stat-card', stat.clase]" :style="{ animationDelay: `${index * 0.1}s` }">
        <div class="stat-glow"></div>
        <div class="stat-icon-wrapper">
          <span class="stat-icon">{{ stat.icon }}</span>
        </div>
        <div class="stat-info">
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-value">{{ stat.value }}</span>
        </div>
        <div class="stat-decoration">✦</div>
      </div>
    </section>

    <section class="actions-section">
      <h2 class="section-title">
        <span>⚔</span> Acciones del Reino <span>⚔</span>
      </h2>
      <div class="actions-grid" :class="{ 'solo-corte': !esAdministrador }">
        <button class="action-btn primary" :disabled="cargandoCorte" @click="generarCorte">
          <span class="action-icon">🧾</span>
          <span class="action-text">{{ cargandoCorte ? 'Calculando...' : 'Corte de Caja' }}</span>
        </button>
        <button v-if="esAdministrador" class="action-btn" @click="modalDiarioAbierto = true">
          <span class="action-icon">📅</span>
          <span class="action-text">Reporte Diario</span>
        </button>
        <button v-if="esAdministrador" class="action-btn" @click="modalMensualAbierto = true">
          <span class="action-icon">🌙</span>
          <span class="action-text">Reporte Mensual</span>
        </button>
        <button v-if="esAdministrador" class="action-btn" @click="abrirHistorialVentas">
          <span class="action-icon">📜</span>
          <span class="action-text">Historial</span>
        </button>
        <button v-if="esAdministrador" class="action-btn" @click="abrirModalApartados">
          <span class="action-icon">🏦</span>
          <span class="action-text">Apartados</span>
        </button>
        <button v-if="esAdministrador" class="action-btn" :disabled="cargandoAnual" @click="generarReporteAnual">
          <span class="action-icon">🧮</span>
          <span class="action-text">{{ cargandoAnual ? 'Cargando...' : 'Reporte Anual' }}</span>
        </button>
      </div>
    </section>

    <section v-if="mostrarReporte && corteActual" class="reporte-section">
      <div class="section-header">
        <h2 class="section-title">
          <span>📊</span> {{ reporteTitulo }} <span>📊</span>
        </h2>
      </div>

      <div class="reporte-grid">
        <div class="reporte-card main-card">
          <div class="card-header">
            <span class="card-icon">💎</span>
            <h3>Ganancia Neta</h3>
          </div>
          <div class="card-value highlight">
            {{ formatoMonedaRedonda(corteActual.gananciaNeta) }}
          </div>
          <div class="card-details">
            <div class="detail-row">
              <span>Ganancia Bruta:</span>
              <strong>{{ formatoMonedaRedonda(corteActual.gananciaTotal) }}</strong>
            </div>
            <div class="detail-row">
              <span>Apartar Sueldo:</span>
              <strong class="warning">{{ formatoMonedaRedonda(dineroApartarDiario) }}</strong>
            </div>
          </div>
        </div>

        <div class="reporte-card">
          <div class="card-header">
            <span class="card-icon">🏦</span>
            <h3>Saldo Final</h3>
          </div>
          <div class="card-value">
            {{ formatoMoneda(corteActual.saldoFinalCalculado) }}
          </div>
          <div class="card-details">
            <div class="detail-row">
              <span>Monto Inicial:</span>
              <strong>{{ formatoMoneda(corteActual.montoInicial) }}</strong>
            </div>
            <div class="detail-row">
              <span>Otras Entradas:</span>
              <strong>{{ formatoMoneda(corteActual.otrosIngresos) }}</strong>
            </div>
          </div>
        </div>

        <div class="reporte-card clickable" @click="abrirModalEgresos">
          <div class="card-header">
            <span class="card-icon">📉</span>
            <h3>Egresos</h3>
          </div>
          <div class="card-value danger">
            {{ formatoMoneda(corteActual.totalEgresos) }}
          </div>
          <div class="card-details">
            <span class="click-hint">Toca para ver detalles</span>
          </div>
        </div>

        <div class="reporte-card" v-if="nombreApartadoActivo" @click="abrirModalApartados">
          <div class="card-header">
            <span class="card-icon">🏪</span>
            <h3>{{ nombreApartadoActivo }}</h3>
          </div>
          <div class="card-value">
            {{ formatoMoneda(totalApartarDiario) }}
          </div>
          <div class="card-details">
            <span class="click-hint">Toca para ver apartados</span>
          </div>
        </div>

        <div class="reporte-card">
          <div class="card-header">
            <span class="card-icon">👤</span>
            <h3>Cajero</h3>
          </div>
          <div class="card-value">
            {{ nombreUsuario }}
          </div>
          <div class="card-details">
            <div class="detail-row">
              <span>Horas:</span>
              <strong>{{ corteActual.horasTrabajadas || horasTrabajadas }}</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-section" v-if="cortePieChartData.labels && cortePieChartData.labels.length > 0">
        <div class="chart-panel">
          <div class="panel-header">
            <div class="panel-ornament left">❧</div>
            <div class="panel-title">
              <span class="panel-icon">📈</span>
              <h3>Distribución del Día</h3>
            </div>
            <div class="panel-ornament right">❧</div>
          </div>
          
          <div class="chart-content">
            <div class="pie-wrapper">
              <div class="pie-chart-container">
                <Pie :data="cortePieChartData" :options="cortePieChartOptions" />
              </div>
              <div class="pie-center">
                <span class="pie-center-icon">💎</span>
                <span class="pie-center-label">Total</span>
                <span class="pie-center-value">{{ formatoMoneda(corteActual?.totalVentas || 0) }}</span>
              </div>
            </div>
            
            <div class="chart-legend">
              <div v-for="(label, index) in cortePieChartData.labels" :key="label" class="legend-item" :style="{ animationDelay: `${index * 0.1}s` }">
                <div class="legend-color" :style="{ background: cortePieChartData.datasets[0].backgroundColor[index] }"></div>
                <span class="legend-label">{{ label }}</span>
                <span class="legend-value">{{ formatoMoneda(cortePieChartData.datasets[0].data[index]) }}</span>
              </div>
            </div>
          </div>
          
          <div class="panel-footer">
            <div class="footer-ornament">⏣</div>
            <span class="footer-text">Datos del tesoro del día</span>
            <div class="footer-ornament">⏣</div>
          </div>
        </div>
      </div>

      <div v-if="productosUnitariosDiario.length > 0 || productosGranelDiario.length > 0" class="products-section">
        <div class="products-panel">
          <div class="panel-header">
            <div class="panel-ornament left">🏆</div>
            <div class="panel-title">
              <h3>Top Productos del Día</h3>
            </div>
            <div class="panel-ornament right">⚔</div>
          </div>
          
          <div class="toggle-buttons">
            <button :class="{ active: tipoGraficaDiaria === 'unitario' }" @click="tipoGraficaDiaria = 'unitario'">
              📦 Unitarios
            </button>
            <button :class="{ active: tipoGraficaDiaria === 'gramaje' }" @click="tipoGraficaDiaria = 'gramaje'">
              ⚖️ Granel
            </button>
          </div>

          <div v-if="tipoGraficaDiaria === 'unitario' && productosUnitariosDiario.length > 0" class="chart-wrapper">
            <div class="bar-chart-container">
              <Bar :data="chartDataDiarioUnitarios" :options="chartOptionsDiarioUnitarios" />
            </div>
          </div>
          <div v-if="tipoGraficaDiaria === 'gramaje' && productosGranelDiario.length > 0" class="chart-wrapper">
            <div class="bar-chart-container">
              <Bar :data="chartDataDiarioGranel" :options="chartOptionsDiarioGranel" />
            </div>
          </div>

          <div class="products-list">
            <div v-for="(producto, index) in (tipoGraficaDiaria === 'unitario' ? productosUnitariosDiario : productosGranelDiario)" :key="`prod-${producto.nombre}`" class="product-item">
              <div class="product-rank" :class="getRankClass(index)">
                {{ getRankIcon(index) }}
              </div>
              <div class="product-info">
                <span class="product-name">{{ producto.nombre }}</span>
                <span class="product-qty">{{ formatearCantidad(producto.cantidadTotal, producto.isGramaje) }}</span>
              </div>
              <div class="product-amount">
                {{ formatoMonedaRedondeada(producto.montoTotal) }}
              </div>
            </div>
          </div>
          
          <div class="panel-footer">
            <div class="footer-ornament">⏣</div>
            <span class="footer-text">Ranking de heroes del día</span>
            <div class="footer-ornament">⏣</div>
          </div>
        </div>
      </div>

      <div class="close-shift-section" v-if="mostrarCerrarTurno">
        <button class="btn-cerrar-turno" type="button" :disabled="cargandoCerrarTurno" @click="cerrarTurno">
          <span class="btn-icon">🔒</span>
          <span class="btn-text">{{ cargandoCerrarTurno ? 'Cerrando...' : 'Cerrar Turno' }}</span>
        </button>
      </div>
    </section>

    <div v-if="modalDiarioAbierto" class="modal-overlay" @click.self="modalDiarioAbierto = false">
      <section class="modal-card panel daily-modal">
        <div class="modal-corner tl"></div>
        <div class="modal-corner tr"></div>
        <div class="modal-corner bl"></div>
        <div class="modal-corner br"></div>
        <button type="button" class="btn-cerrar-modal" @click="modalDiarioAbierto = false">✕</button>
        <div class="modal-content-scroll">
        <div class="modal-header">
          <span class="modal-icon">📅</span>
          <h3>Reporte por Día</h3>
        </div>
        <div class="modal-body">
          <div class="input-group">
            <label>Selecciona fecha</label>
            <div class="input-wrapper">
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
      <div class="pergamino history-pergamino">
        <div class="corner-decor corner-tl"><div class="ornament"></div></div>
        <div class="corner-decor corner-tr"><div class="ornament"></div></div>
        <div class="corner-decor corner-bl"><div class="ornament"></div></div>
        <div class="corner-decor corner-br"><div class="ornament"></div></div>
        
        <div class="pergamino-inner">
          <header class="modal-header">
            <div class="header-emblem">
              <span class="emblem-icon">📜</span>
            </div>
            <h2>Historial de Ventas</h2>
            <div class="header-line"></div>
            <button type="button" class="btn-cerrar-modal pergamino-close" @click="modalHistorialAbierto = false">✕</button>
          </header>

          <div class="modal-body">
            <div class="filter-section">
              <div class="filter-row">
                <div class="filter-select-wrap">
                  <label>Luna</label>
                  <select v-model="filtroMesHistorial" class="papiro-select">
                    <option value="all">Todas</option>
                    <option v-for="m in historialMeses" :key="`m-${m}`" :value="m">Mes {{ Number(m) + 1 }}</option>
                  </select>
                </div>
                <div class="filter-select-wrap">
                  <label>Sol</label>
                  <select v-model="filtroDiaHistorial" class="papiro-select">
                    <option value="all">Todos</option>
                    <option v-for="d in historialDias" :key="`d-${d}`" :value="d">Día {{ d }}</option>
                  </select>
                </div>
              </div>
              <div class="filter-discrepancia">
                <label class="checkbox-scroll">
                  <input type="checkbox" v-model="filtroDiscrepanciaHistorial" />
                  <span>⚠️ Discrepancias</span>
                </label>
              </div>
              <div class="total-scroll-bar">
                <span class="scroll-bar-label">⚜ Total del Período ⚜</span>
                <span class="scroll-bar-amount">{{ formatoMoneda(historialTotalFiltrado) }}</span>
              </div>
            </div>

            <div class="entries-scroll">
              <p v-if="cargandoHistorial" class="empty-text">📡 Cargando pergamino antiguo...</p>
              <p v-else-if="historialFiltrado.length === 0" class="empty-text">📭 No hay ventas con el filtro actual.</p>

              <div v-else class="scroll-entries">
                <div v-for="(v, index) in historialFiltrado" :key="v.venta.idVenta" class="scroll-entry" :class="{ 'entry-discrepancia': v.venta.tieneDiscrepancia }" @click="abrirDetalleVenta(v.venta.idVenta)">
                  <div class="entry-left">
                    <span class="entry-number">
                      <span v-if="v.venta.tieneDiscrepancia" class="discrepancia-icon" title="Discrepancia">⚠️</span>
                      {{ historialFiltrado.length - index }}
                    </span>
                    <div class="entry-info">
                      <span class="entry-date">{{ formatoFecha(v.venta.fechaVenta) }}</span>
                      <span class="metodo-scroll-pill" :class="getMetodoClase(v.venta.metodoPago)">
                        {{ getMetodoIcono(v.venta.metodoPago) }} {{ v.venta.metodoPago || 'N/D' }}
                      </span>
                    </div>
                  </div>
                  <span class="entry-amount">{{ formatoMoneda(Number(v.venta.montoTotal || 0)) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="modalDetalleAbierto && ventaDetalleSeleccionada" class="modal-overlay" @click.self="modalDetalleAbierto = false">
      <div class="pergamino detail-pergamino">
        <div class="corner-decor corner-tl"><div class="ornament"></div></div>
        <div class="corner-decor corner-tr"><div class="ornament"></div></div>
        <div class="corner-decor corner-bl"><div class="ornament"></div></div>
        <div class="corner-decor corner-br"><div class="ornament"></div></div>
        
        <div class="pergamino-inner">
          <header class="modal-header">
            <div class="header-emblem">
              <span class="emblem-icon">🧾</span>
            </div>
            <h2>Venta #{{ ventaDetalleSeleccionada.numeroTicket || ventaDetalleSeleccionada.idVenta }}</h2>
            <div class="header-line"></div>
            <button v-if="esAdministrador && !ventaDetalleEditando" type="button" class="btn-editar-pergamino" @click="iniciarEdicionVentaDetalle">✏️ Editar</button>
            <template v-if="esAdministrador && ventaDetalleEditando">
              <button type="button" class="btn-guardar-pergamino" @click="guardarEdicionVentaDetalle">💾 Guardar</button>
              <button type="button" class="btn-cancelar-pergamino" @click="cancelarEdicionVentaDetalle">Cancelar</button>
            </template>
            <button type="button" class="btn-cerrar-modal pergamino-close" @click="modalDetalleAbierto = false">✕</button>
          </header>

          <div class="modal-body">
            <div class="meta-badges">
              <div class="meta-pill" :class="getMetodoClase(ventaDetalleSeleccionada.metodoPago)">
                <span class="pill-rune">◈</span>
                <span class="pill-icon">💳</span>
                <span class="pill-text">{{ ventaDetalleSeleccionada.metodoPago || 'N/D' }}</span>
              </div>
              <div class="meta-pill date-pill">
                <span class="pill-rune">◈</span>
                <span class="pill-icon">📅</span>
                <span class="pill-text">{{ formatoFecha(ventaDetalleSeleccionada.fechaVenta) }}</span>
              </div>
            </div>

            <div class="section-title">⚜ Detalle de Productos ⚜</div>
            
            <div class="items-scroll">
              <div v-for="(d, index) in ventaDetalleItems" :key="d.idVentaDetalle" class="item-card">
                <div class="item-left">
                  <span class="item-bullet">◆</span>
                  <div class="item-info">
                    <span class="item-name">{{ d.productoNombre || 'Producto eliminado' }}</span>
                    <template v-if="ventaDetalleEditando && ventaDetalleItemEditando === index">
                      <input v-model.number="ventaDetalleCantidadTemp" type="number" min="1" class="edit-input-small" />
                      <input v-model.number="ventaDetallePrecioTemp" type="number" step="0.01" min="0" class="edit-input-small" />
                      <button class="btn-confirm-item" @click="confirmarEditarItemDetalle(index)">✓</button>
                      <button class="btn-cancel-item" @click="cancelarEditarItemDetalle">×</button>
                    </template>
                    <template v-else>
                      <span class="item-calc">
                        {{ d.cantidad }} {{ d.tipoPrecioAplicado === 'VENTA_GRAMAJE' ? 'gramos' : 'pzas' }}
                      </span>
                    </template>
                  </div>
                </div>
                <span class="item-price">
                  {{ formatoMonedaRedondeada(Number(d.precioUnitarioVenta || 0) * Number(d.cantidad || 0)) }}
                  <template v-if="ventaDetalleEditando">
                    <button class="btn-edit-item-pergamino" @click="iniciarEditarItemDetalle(index)" title="Editar">✏️</button>
                    <button class="btn-delete-item-pergamino" @click="eliminarItemDetalle(index)" title="Eliminar">🗑️</button>
                  </template>
                </span>
              </div>
            </div>

            <div class="total-bar">
              <span class="total-bar-label">Total a Pagar</span>
              <template v-if="ventaDetalleEditando">
                <input v-model.number="ventaDetalleMontoEditado" type="number" class="total-input-pergamino" />
              </template>
              <template v-else>
                <span class="total-bar-amount">{{ formatoMoneda(Number(ventaDetalleSeleccionada.montoTotal || 0)) }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="modalEgresosAbierto" class="modal-overlay" @click.self="modalEgresosAbierto = false">
      <div class="pergamino egresos-pergamino">
        <div class="corner-decor corner-tl"><div class="ornament"></div></div>
        <div class="corner-decor corner-tr"><div class="ornament"></div></div>
        <div class="corner-decor corner-bl"><div class="ornament"></div></div>
        <div class="corner-decor corner-br"><div class="ornament"></div></div>
        
        <div class="pergamino-inner">
          <header class="modal-header">
            <div class="header-emblem">
              <span class="emblem-icon">📉</span>
            </div>
            <h2>Egresos del Día</h2>
            <div class="header-line"></div>
            <button v-if="esAdministrador" class="btn-nueva-salida-pergamino" @click="modalSalidaAbierto = true">➕ Nueva Salida</button>
            <button type="button" class="btn-cerrar-modal pergamino-close" @click="modalEgresosAbierto = false">✕</button>
          </header>

          <div class="modal-body">
            <div v-if="cargandoEgresos" class="empty-text">📡 Cargando pergamino...</div>
            <div v-else-if="egresosDia.length === 0" class="empty-text">📭 No hay egresos para este día.</div>

            <div v-else class="egresos-scroll">
              <div v-for="(egreso, index) in egresosDia" :key="egreso.idCaja" class="egreso-card">
                <div class="egreso-left">
                  <span class="egreso-number">{{ index + 1 }}</span>
                  <div class="egreso-info">
                    <span class="egreso-date">{{ formatoFecha(egreso.fechaMovimiento) }}</span>
                    <span class="egreso-desc">{{ egreso.descripcion || 'Sin descripción' }}</span>
                    <span class="egreso-user" v-if="egreso.usuario">👤 {{ egreso.usuario.nombre }} {{ egreso.usuario.apellido_p }}</span>
                  </div>
                </div>
                <span class="egreso-amount">{{ formatoMoneda(Number(egreso.monto || 0)) }}</span>
              </div>
            </div>

            <div class="total-egresos-bar" v-if="egresosDia.length > 0">
              <span class="total-egresos-label">⚜ Total Egresos ⚜</span>
              <span class="total-egresos-amount">{{ formatoMoneda(egresosDia.reduce((sum, e) => sum + Number(e.monto || 0), 0)) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <SalidaEfectivoModal :open="modalSalidaAbierto" @close="modalSalidaAbierto = false" @submit="registrarSalida" />

    <SueldoXHoraModal 
      :open="modalSueldoHoraAbierto" 
      @close="modalSueldoHoraAbierto = false" 
      @save="(usuarios) => { cargarUsuariosConSueldo(); recalcularGananciaNeta(); }"
    />

    <div v-if="modalApartadosAbierto" class="modal-overlay" @click.self="modalApartadosAbierto = false">
      <section class="modal-card panel history-modal">
        <div class="modal-corner tl"></div>
        <div class="modal-corner tr"></div>
        <div class="modal-corner bl"></div>
        <div class="modal-corner br"></div>
        <button type="button" class="btn-cerrar-modal" @click="modalApartadosAbierto = false">✕</button>
        <div class="modal-content-scroll">
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
        </div>
      </section>
    </div>

    <div v-if="modalAnualAbierto" class="modal-overlay" @click.self="modalAnualAbierto = false">
      <div class="pergamino annual-pergamino">
        <div class="corner-decor corner-tl"><div class="ornament"></div></div>
        <div class="corner-decor corner-tr"><div class="ornament"></div></div>
        <div class="corner-decor corner-bl"><div class="ornament"></div></div>
        <div class="corner-decor corner-br"><div class="ornament"></div></div>
        
        <div class="pergamino-inner annual-inner">
          <header class="annual-header">
            <div class="header-emblem">
              <span class="emblem-icon">📜</span>
            </div>
            <h2>Reporte Anual del Año {{ anioReporte }}</h2>
            <div class="header-line"></div>
            <div class="annual-actions-row">
              <select v-model="anioReporte" class="papiro-select">
                <option v-for="year in [2024, 2025, 2026, 2027]" :key="year" :value="year">{{ year }}</option>
              </select>
              <button type="button" @click="generarReporteAnual" class="refresh-btn">🔄</button>
            </div>
            <button type="button" class="btn-cerrar-modal pergamino-close" @click="modalAnualAbierto = false">✕</button>
          </header>

          <div v-if="reporteAnualData" class="annual-content-scroll">
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
              <h3 class="table-title">⚔️ Top Productos por Horario</h3>
            </div>
            <div class="products-grid">
              <div v-for="horario in uniqueHorarios" :key="horario" class="product-group">
                <h4 class="product-group-title">🕐 {{ horario }}</h4>
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

          <div class="annual-top-products-section" v-if="reporteAnualData.topProductosGranel?.length || reporteAnualData.topProductosUnitarios?.length">
            <div class="top-products-header">
              <div class="triforce-divider">⏣</div>
              <h3 class="top-products-title">🏆 Heroes of the Realm - Top 5</h3>
              <div class="triforce-divider">⏣</div>
            </div>
            
            <div class="top-products-grid">
              <div class="top-products-card granel" v-if="reporteAnualData.topProductosGranel?.length">
                <div class="card-emblem">⚖️</div>
                <h4 class="card-title">🥇 Granel Masters</h4>
                <p class="card-subtitle">Los guerreros del peso</p>
                <div class="top-list">
                  <div v-for="(prod, idx) in reporteAnualData.topProductosGranel" :key="prod.nombreProducto" class="top-item">
                    <span class="top-rank" :class="`rank-${idx + 1}`">{{ ['①','②','③','④','⑤'][idx] }}</span>
                    <span class="top-name">{{ prod.nombreProducto }}</span>
                    <span class="top-qty">{{ formatearCantidad(prod.cantidadVendida, true) }}</span>
                  </div>
                </div>
              </div>
              
              <div class="top-products-card unitarios" v-if="reporteAnualData.topProductosUnitarios?.length">
                <div class="card-emblem">🗡️</div>
                <h4 class="card-title">🏹 Unit Heroes</h4>
                <p class="card-subtitle">Los defensores de unidades</p>
                <div class="top-list">
                  <div v-for="(prod, idx) in reporteAnualData.topProductosUnitarios" :key="prod.nombreProducto" class="top-item">
                    <span class="top-rank" :class="`rank-${idx + 1}`">{{ ['①','②','③','④','⑤'][idx] }}</span>
                    <span class="top-name">{{ prod.nombreProducto }}</span>
                    <span class="top-qty">{{ formatearCantidad(prod.cantidadVendida, false) }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="triforce-footer">🛡️ 🗡️ 🛡️</div>
          </div>
        </div>
        <div v-else class="annual-loading-modern">
          <div class="loading-spinner"></div>
          <p>Cargando datos del pergamino...</p>
        </div>
        </div>
      </div>
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
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  z-index: 1;
}

.hero-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  position: relative;
}

.hero-decoration {
  font-size: 2rem;
  color: var(--accent-color);
  text-shadow: 0 0 10px var(--accent-color);
  animation: pulse 2s ease-in-out infinite;
}

.hero-decoration.left {
  transform: rotate(-15deg);
}

.hero-decoration.right {
  transform: rotate(15deg);
}

@keyframes pulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.hero-decoration.left { animation-delay: 0s; }
.hero-decoration.right { animation-delay: 0.5s; }

.hero-content {
  text-align: center;
}

.hero-title {
  font-family: 'HyliaSerifBeta', 'Palatino Linotype', serif;
  font-size: clamp(1.5rem, 5vw, 2.2rem);
  color: var(--accent-color);
  text-shadow: 3px 3px 0 var(--border-color), 0 0 20px var(--accent-color);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.title-icon {
  font-size: 1.5em;
}

.hero-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
  font-style: italic;
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
  text-align: center;
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

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  padding: 0 0.5rem;
}

.stat-card-wrapper {
  animation: fadeSlideIn 400ms ease-out backwards;
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(-15px); }
  to { opacity: 1; transform: translateY(0); }
}

.stat-card {
  position: relative;
  padding: 0.85rem;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  box-shadow: 0 4px 0 var(--border-color), 0 6px 12px var(--shadow-color);
  text-align: center;
  overflow: hidden;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 var(--border-color), 0 8px 16px var(--shadow-color);
}

.stat-card.gold {
  border-color: var(--accent-color);
  background: linear-gradient(135deg, var(--bg-secondary) 0%, color-mix(in srgb, var(--accent-color) 20%, var(--bg-primary)) 100%);
}

.stat-card.success {
  border-color: var(--success-color);
}

.stat-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, var(--accent-color) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.stat-card:hover .stat-glow {
  opacity: 0.05;
}

.stat-icon-wrapper {
  margin-bottom: 0.4rem;
}

.stat-icon {
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px var(--shadow-color));
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.stat-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  font-weight: 600;
}

.stat-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.stat-card.gold .stat-value {
  color: var(--accent-color);
}

.stat-card.success .stat-value {
  color: var(--success-color);
}

.stat-decoration {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.6rem;
  color: var(--accent-color);
  opacity: 0.5;
}

.actions-section {
  padding: 0 0.5rem;
}

.section-title {
  font-family: 'HyliaSerifBeta', 'Palatino Linotype', serif;
  font-size: 1.1rem;
  color: var(--accent-color);
  text-align: center;
  margin: 0 0 0.75rem 0;
  text-shadow: 2px 2px 0 var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.actions-grid.solo-corte {
  grid-template-columns: 1fr;
  max-width: 300px;
  margin: 0 auto;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 1rem 0.5rem;
  border-radius: 12px;
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border: 2px solid var(--border-color);
  box-shadow: 0 4px 0 var(--border-color), 0 6px 12px var(--shadow-color);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 7px 0 var(--border-color), 0 10px 20px var(--shadow-color);
  border-color: var(--accent-color);
}

.action-btn:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--border-color);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.primary {
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 50%, var(--gradient-btn-end) 100%);
  border-color: var(--accent-color);
}

.action-icon {
  font-size: 1.8rem;
}

.action-text {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
}

@media (max-width: 768px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .hero-decoration {
    display: none;
  }
}

@media (max-width: 480px) {
  .actions-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  
  .action-btn {
    padding: 0.75rem 0.5rem;
  }
  
  .action-icon {
    font-size: 1.5rem;
  }
  
  .action-text {
    font-size: 0.65rem;
  }
}

.reporte-section {
  padding: 0 0.5rem 1rem;
}

.section-header {
  text-align: center;
  margin-bottom: 1rem;
}

.reporte-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.reporte-card {
  padding: 1rem;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  box-shadow: 0 4px 0 var(--border-color), 0 6px 12px var(--shadow-color);
  transition: all 0.2s;
}

.reporte-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 var(--border-color), 0 8px 16px var(--shadow-color);
}

.reporte-card.main-card {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, color-mix(in srgb, var(--accent-color) 15%, var(--bg-primary)) 100%);
  border-color: var(--accent-color);
}

.reporte-card.clickable {
  cursor: pointer;
}

.reporte-card.clickable:hover {
  border-color: var(--accent-color);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.card-icon {
  font-size: 1.2rem;
}

.card-header h3 {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
  margin-bottom: 0.5rem;
}

.card-value.highlight {
  color: var(--accent-color);
  font-size: 1.6rem;
  text-shadow: 0 0 10px var(--accent-color);
}

.card-value.danger {
  color: var(--error-color);
}

.card-details {
  font-size: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.2rem 0;
  border-bottom: 1px dashed var(--border-color);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row span {
  color: var(--text-secondary);
}

.detail-row strong {
  color: var(--text-primary);
}

.detail-row strong.warning {
  color: var(--warning-color);
}

.click-hint {
  color: var(--accent-color);
  font-style: italic;
  font-size: 0.7rem;
}

.chart-section {
  margin: 1rem 0;
}

.chart-panel {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-panel) 50%, var(--bg-secondary) 100%);
  border: 3px solid var(--accent-color);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 
    0 0 0 2px var(--border-color),
    0 6px 0 var(--border-color),
    0 10px 20px var(--shadow-color),
    inset 0 0 30px color-mix(in srgb, var(--accent-color) 10%, transparent);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent-color) 20%, var(--bg-secondary)) 0%, var(--bg-secondary) 100%);
  border-bottom: 2px solid var(--accent-color);
}

.panel-ornament {
  font-size: 1.5rem;
  color: var(--accent-color);
  text-shadow: 0 0 10px var(--accent-color);
  animation: pulse 2s ease-in-out infinite;
}

.panel-ornament.left {
  transform: rotate(-15deg);
}

.panel-ornament.right {
  transform: rotate(15deg);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-icon {
  font-size: 1.5rem;
}

.panel-title h3 {
  margin: 0;
  font-family: 'HyliaSerifBeta', 'Palatino Linotype', serif;
  font-size: 1.3rem;
  color: var(--accent-color);
  text-shadow: 2px 2px 0 var(--border-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.chart-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 1.5rem;
}

.pie-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pie-chart-container {
  width: 280px;
  height: 280px;
  position: relative;
  z-index: 1;
}

.pie-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  border: 3px solid var(--accent-color);
  border-radius: 50%;
  box-shadow: 
    0 0 0 3px var(--border-color),
    0 4px 8px var(--shadow-color),
    inset 0 0 15px color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.pie-center-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.pie-center-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin-top: 2px;
}

.pie-center-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-color);
  font-family: 'Courier New', monospace;
  text-align: center;
  line-height: 1.1;
  max-width: 95px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chart-legend {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 180px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.8rem;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  transition: all 0.2s;
  animation: fadeSlideIn 400ms ease-out backwards;
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateX(-15px); }
  to { opacity: 1; transform: translateX(0); }
}

.legend-item:hover {
  transform: translateX(5px);
  border-color: var(--accent-color);
  box-shadow: 0 3px 0 var(--accent-color);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid var(--border-color);
  box-shadow: 0 2px 4px var(--shadow-color);
}

.legend-label {
  flex: 1;
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 500;
}

.legend-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--success-color);
  font-family: 'Courier New', monospace;
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, color-mix(in srgb, var(--accent-color) 10%, var(--bg-secondary)) 100%);
  border-top: 2px dashed var(--border-color);
}

.footer-ornament {
  font-size: 1rem;
  color: var(--accent-color);
}

.footer-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-style: italic;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

@media (max-width: 600px) {
  .chart-content {
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem;
  }
  
  .pie-chart-container {
    width: 240px;
    height: 240px;
  }
  
  .pie-center {
    width: 85px;
    height: 85px;
  }
  
  .pie-center-icon {
    font-size: 1.2rem;
  }
  
  .pie-center-label {
    font-size: 0.5rem;
  }
  
  .pie-center-value {
    font-size: 0.75rem;
    max-width: 80px;
  }
  
  .chart-legend {
    width: 100%;
    min-width: unset;
  }
}

@media (max-width: 400px) {
  .panel-ornament {
    display: none;
  }
  
  .pie-chart-container {
    width: 200px;
    height: 200px;
  }
  
  .pie-center {
    width: 75px;
    height: 75px;
  }
  
  .pie-center-icon {
    font-size: 1rem;
  }
  
  .pie-center-label {
    font-size: 0.5rem;
  }
  
  .pie-center-value {
    font-size: 0.7rem;
    max-width: 70px;
  }
}

.products-section {
  margin: 1rem 0;
}

.products-panel {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-panel) 50%, var(--bg-secondary) 100%);
  border: 3px solid var(--accent-color);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 
    0 0 0 2px var(--border-color),
    0 6px 0 var(--border-color),
    0 10px 20px var(--shadow-color),
    inset 0 0 30px color-mix(in srgb, var(--accent-color) 10%, transparent);
}

.products-panel .panel-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent-color) 20%, var(--bg-secondary)) 0%, var(--bg-secondary) 100%);
  border-bottom: 2px solid var(--accent-color);
}

.products-panel .panel-ornament {
  font-size: 1.5rem;
  color: var(--accent-color);
  text-shadow: 0 0 10px var(--accent-color);
  animation: pulse 2s ease-in-out infinite;
}

.products-panel .panel-title h3 {
  margin: 0;
  font-family: 'HyliaSerifBeta', 'Palatino Linotype', serif;
  font-size: 1.3rem;
  color: var(--accent-color);
  text-shadow: 2px 2px 0 var(--border-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.products-panel .toggle-buttons {
  display: flex;
  gap: 0.75rem;
  margin: 1rem;
  justify-content: center;
}

.products-panel .toggle-buttons button {
  padding: 0.6rem 1.5rem;
  border-radius: 10px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  font-size: 0.85rem;
  box-shadow: 0 3px 0 var(--border-color);
}

.products-panel .toggle-buttons button.active {
  background: linear-gradient(180deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 70%, black) 100%);
  color: var(--bg-primary);
  border-color: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: 0 5px 0 color-mix(in srgb, var(--accent-color) 50%, black);
}

.products-panel .toggle-buttons button:hover:not(.active) {
  border-color: var(--accent-color);
  transform: translateY(-1px);
}

.chart-wrapper {
  padding: 0 1rem;
}

.bar-chart-container {
  height: 220px;
  background: var(--bg-primary);
  border-radius: 12px;
  border: 2px solid var(--border-color);
  padding: 0.75rem;
  box-shadow: inset 0 2px 8px var(--shadow-color);
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  max-height: 350px;
  overflow-y: auto;
}

.products-panel .product-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem;
  background: var(--bg-primary);
  border-radius: 12px;
  border: 2px solid var(--border-color);
  transition: all 0.2s;
}

.products-panel .product-item:hover {
  border-color: var(--accent-color);
  transform: translateX(5px);
  box-shadow: 0 4px 0 var(--accent-color);
}

.products-panel .product-rank {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 1.2rem;
  font-weight: 700;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
}

.products-panel .product-rank.gold {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #1a1a1a;
  border-color: #ffd700;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
}

.products-panel .product-rank.silver {
  background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
  color: #1a1a1a;
  border-color: #c0c0c0;
  box-shadow: 0 0 10px rgba(192, 192, 192, 0.4);
}

.products-panel .product-rank.bronze {
  background: linear-gradient(135deg, #cd7f32, #a0522d);
  color: #1a1a1a;
  border-color: #cd7f32;
  box-shadow: 0 0 8px rgba(205, 127, 50, 0.4);
}

.products-panel .product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.products-panel .product-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.products-panel .product-qty {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.products-panel .product-amount {
  font-size: 1rem;
  font-weight: 700;
  color: var(--success-color);
  font-family: 'Courier New', monospace;
  text-align: right;
}

.products-panel .panel-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, color-mix(in srgb, var(--accent-color) 10%, var(--bg-secondary)) 100%);
  border-top: 2px dashed var(--border-color);
}

@media (max-width: 600px) {
  .products-panel .panel-title h3 {
    font-size: 1.1rem;
  }
  
  .bar-chart-container {
    height: 180px;
  }
  
  .products-list {
    max-height: 280px;
  }
  
  .products-panel .product-item {
    padding: 0.7rem;
    gap: 0.75rem;
  }
  
  .products-panel .product-rank {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
  
  .products-panel .product-name {
    font-size: 0.85rem;
  }
  
  .products-panel .product-amount {
    font-size: 0.9rem;
  }
}

@media (max-width: 400px) {
  .products-panel .toggle-buttons button {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }
  
  .bar-chart-container {
    height: 160px;
  }
}

.close-shift-section {
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 2px dashed var(--border-color);
}

.btn-cerrar-turno {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  border-radius: 12px;
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  border: 3px solid var(--border-color);
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  box-shadow: 0 4px 0 var(--border-color), 0 6px 12px var(--shadow-color);
  transition: all 0.2s;
}

.btn-cerrar-turno:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-3px);
  box-shadow: 0 7px 0 var(--border-color), 0 10px 20px var(--shadow-color);
}

.btn-cerrar-turno:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--border-color);
}

.btn-cerrar-turno:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 1.3rem;
}

@media (max-width: 600px) {
  .reporte-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .card-value {
    font-size: 1.1rem;
  }
  
  .card-value.highlight {
    font-size: 1.3rem;
  }
  
  .product-item {
    grid-template-columns: 24px 1fr 60px 70px;
    font-size: 0.85rem;
  }
  
  .pie-chart-container {
    height: 200px;
  }
}

@media (max-width: 480px) {
  .reporte-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  
  .reporte-card {
    padding: 0.75rem;
  }
  
  .card-header h3 {
    font-size: 0.7rem;
  }
  
  .card-value {
    font-size: 1rem;
  }
  
  .card-value.highlight {
    font-size: 1.2rem;
  }
  
  .chart-container {
    height: 200px;
  }
  
  .products-list {
    max-height: 250px;
  }
  
  .btn-cerrar-turno {
    width: 100%;
    padding: 0.85rem 1.5rem;
    font-size: 0.9rem;
  }
}

.pergamino {
  background: 
    linear-gradient(135deg, 
      color-mix(in srgb, var(--accent-color) 15%, var(--bg-secondary)) 0%, 
      color-mix(in srgb, var(--accent-color) 10%, var(--bg-panel)) 25%, 
      color-mix(in srgb, var(--accent-color) 18%, var(--bg-secondary)) 50%, 
      color-mix(in srgb, var(--accent-color) 8%, var(--bg-panel)) 75%, 
      color-mix(in srgb, var(--accent-color) 12%, var(--bg-secondary)) 100%);
  border-radius: 4px;
  position: relative;
  box-shadow: 
    0 0 0 3px var(--border-color),
    0 0 0 6px var(--bg-panel),
    0 8px 0 var(--border-color),
    0 12px 24px var(--shadow-color),
    inset 0 0 40px color-mix(in srgb, var(--accent-color) 10%, transparent);
}

.pergamino::before {
  content: '';
  position: absolute;
  inset: 14px;
  border: 1px solid var(--border-color);
  border-radius: 1px;
  pointer-events: none;
  opacity: 0.6;
}

.pergamino-inner {
  position: relative;
  padding: 1.75rem;
}

.corner-decor {
  position: absolute;
  width: 50px;
  height: 50px;
  z-index: 100;
  pointer-events: none;
}

.ornament {
  width: 100%;
  height: 100%;
  position: relative;
}

.ornament::before {
  content: '❧';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 28px;
  color: var(--accent-color);
  text-shadow: 0 0 3px var(--border-color);
  opacity: 0.8;
}

.ornament::after {
  display: none;
}

.corner-tl {
  top: -16px;
  left: -16px;
}

.corner-tr {
  top: -16px;
  right: -16px;
}

.corner-bl {
  bottom: -16px;
  left: -16px;
}

.corner-br {
  bottom: -16px;
  right: -16px;
}

.detail-pergamino {
  width: min(100%, 460px);
  max-height: 90vh;
  overflow-y: auto;
}

.detail-pergamino .pergamino-inner {
  padding: 1.25rem;
}

.detail-pergamino .modal-header {
  text-align: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--bg-panel);
  position: relative;
}

.detail-pergamino .header-emblem {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 34px;
  height: 34px;
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border: 3px solid var(--accent-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.detail-pergamino .emblem-icon {
  font-size: 1.1rem;
  filter: drop-shadow(0 1px 1px var(--border-color));
}

.detail-pergamino .modal-header h2 {
  margin: 0;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 1.2rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: bold;
  text-shadow: 2px 2px 0 var(--border-color);
}

.detail-pergamino .header-line {
  margin-top: 0.5rem;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent-color) 20%, var(--accent-color) 80%, transparent);
}

.detail-pergamino .pergamino-close {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 30px;
  height: 30px;
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  border: 2px solid var(--border-color);
  border-radius: 50%;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.detail-pergamino .pergamino-close:hover {
  transform: scale(1.15);
  filter: brightness(1.2);
}

.detail-pergamino .modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.meta-badges {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.7rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 2px solid;
}

.pill-rune {
  font-size: 0.5rem;
  opacity: 0.7;
}

.pill-icon {
  font-size: 0.85rem;
}

.meta-pill.efectivo {
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 60%, black) 100%);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.meta-pill.transfer {
  background: linear-gradient(180deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 60%, black) 100%);
  color: var(--border-color);
  border-color: var(--border-color);
}

.meta-pill.tarjeta {
  background: linear-gradient(180deg, #c71585 0%, #8a1055 100%);
  color: var(--text-primary);
  border-color: #5a0a35;
}

.meta-pill.date-pill {
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.section-title {
  text-align: center;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.8rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  padding: 0.5rem;
  border-top: 1px solid var(--bg-panel);
  border-bottom: 1px solid var(--bg-panel);
}

.items-scroll {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.items-scroll::-webkit-scrollbar {
  width: 6px;
}

.items-scroll::-webkit-scrollbar-track {
  background: #d4c4a8;
  border-radius: 3px;
}

.items-scroll::-webkit-scrollbar-thumb {
  background: var(--bg-panel);
  border-radius: 3px;
}

.item-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.55rem 0.7rem;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: 2px solid var(--bg-panel);
  border-radius: 6px;
  transition: all 0.2s;
}

.item-card:hover {
  border-color: var(--accent-color);
  transform: translateX(3px);
  box-shadow: 3px 3px 0 var(--border-color);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.item-bullet {
  color: var(--accent-color);
  font-size: 0.6rem;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  min-width: 0;
}

.item-name {
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-calc {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: "Courier New", monospace;
}

.item-price {
  font-size: 0.9rem;
  font-weight: bold;
  color: var(--success-color);
  font-family: "Courier New", monospace;
  white-space: nowrap;
  margin-left: 0.75rem;
}

.total-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(180deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 70%, black) 100%);
  border: 3px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 
    inset 0 0 0 2px var(--bg-primary),
    0 4px 0 var(--border-color);
}

.total-bar-label {
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.8rem;
  color: var(--border-color);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: bold;
}

.total-bar-amount {
  font-family: 'Courier New', monospace;
  font-size: 1.4rem;
  font-weight: bold;
  color: var(--border-color);
  text-shadow: 1px 1px 0 var(--bg-primary);
}

@media (max-width: 480px) {
  .detail-pergamino {
    width: min(100%, 95vw);
  }
  
  .items-scroll {
    max-height: 250px;
  }
  
  .total-bar-amount {
    font-size: 1.3rem;
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

.card-metric.highlight {
  background: linear-gradient(135deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 70%, black) 100%);
  border: 2px solid var(--zelda-gold);
}

.card-metric.highlight p,
.card-metric.highlight strong {
  color: var(--text-primary);
}

.salary-config {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.config-header h4 {
  margin: 0;
  color: var(--accent-color);
  font-size: 1rem;
}

.btn-config {
  padding: 0.5rem 1rem;
  background: var(--accent-color);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.btn-config:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.config-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.config-row label {
  font-weight: bold;
  color: var(--text-secondary);
}

.config-row input {
  width: 60px;
  padding: 0.4rem;
  background: var(--bg-panel);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  text-align: center;
}

.config-row input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.config-info {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.debug-info {
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: var(--bg-primary);
  border: 1px dashed var(--border-color);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
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
  overflow-x: hidden;
}

/* =========================================
   MODAL CARD - ESTILO PAPIRO/PERGAMINO
   ========================================= */
.modal-card {
  width: min(100%, 600px);
  max-height: none;
  background: var(--bg-panel) !important;
  border: none !important;
  padding: 0 !important;
  gap: 0 !important;
  overflow: visible;
  animation: fadeSlideIn 200ms ease-out !important;
  position: relative;
  margin: 1rem auto;
  box-shadow: none !important;
}

/* Marco decorativo exterior */
.modal-card::before {
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

/* Marco decorativo interior punteado */
.modal-card::after {
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
.modal-corner {
  position: absolute !important;
  width: 40px !important;
  height: 40px !important;
  pointer-events: none !important;
  z-index: 10 !important;
}

.modal-corner::before,
.modal-corner::after {
  content: '' !important;
  position: absolute !important;
  background: var(--accent-color) !important;
  border-radius: 2px !important;
}

.modal-corner.tl {
  top: 16px !important;
  left: 16px !important;
}
.modal-corner.tl::before {
  width: 25px !important;
  height: 3px !important;
  top: 0 !important;
  left: 0 !important;
}
.modal-corner.tl::after {
  width: 3px !important;
  height: 25px !important;
  top: 0 !important;
  left: 0 !important;
}

.modal-corner.tr {
  top: 16px !important;
  right: 16px !important;
}
.modal-corner.tr::before {
  width: 25px !important;
  height: 3px !important;
  top: 0 !important;
  right: 0 !important;
}
.modal-corner.tr::after {
  width: 3px !important;
  height: 25px !important;
  top: 0 !important;
  right: 0 !important;
}

.modal-corner.bl {
  bottom: 16px !important;
  left: 16px !important;
}
.modal-corner.bl::before {
  width: 25px !important;
  height: 3px !important;
  bottom: 0 !important;
  left: 0 !important;
}
.modal-corner.bl::after {
  width: 3px !important;
  height: 25px !important;
  bottom: 0 !important;
  left: 0 !important;
}

.modal-corner.br {
  bottom: 16px !important;
  right: 16px !important;
}
.modal-corner.br::before {
  width: 25px !important;
  height: 3px !important;
  bottom: 0 !important;
  right: 0 !important;
}
.modal-corner.br::after {
  width: 3px !important;
  height: 25px !important;
  bottom: 0 !important;
  right: 0 !important;
}

/* Botón cerrar */
.btn-cerrar-modal {
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

.btn-cerrar-modal:hover {
  background: var(--error-color) !important;
  border-color: var(--error-color) !important;
  color: white !important;
  transform: scale(1.1) !important;
}

.btn-editar-pergamino,
.btn-guardar-pergamino,
.btn-cancelar-pergamino {
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 0.5rem;
}

.btn-editar-pergamino {
  background: linear-gradient(180deg, #facc15 0%, #eab308 100%);
  color: #1a1a1a;
}

.btn-guardar-pergamino {
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  color: white;
}

.btn-cancelar-pergamino {
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  color: white;
}

.btn-edit-item-pergamino,
.btn-delete-item-pergamino {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  margin-left: 0.25rem;
  padding: 0.1rem;
}

.btn-edit-item-pergamino:hover {
  transform: scale(1.2);
}

.btn-delete-item-pergamino:hover {
  transform: scale(1.2);
}

.edit-input-small {
  width: 50px;
  padding: 0.2rem;
  margin-right: 0.25rem;
  font-size: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 3px;
}

.btn-confirm-item,
.btn-cancel-item {
  padding: 0.1rem 0.3rem;
  font-size: 0.75rem;
  border-radius: 3px;
  cursor: pointer;
  margin-right: 0.25rem;
}

.btn-confirm-item {
  background: var(--success-color);
  color: white;
  border: 1px solid var(--success-color);
}

.btn-cancel-item {
  background: var(--error-color);
  color: white;
  border: 1px solid var(--error-color);
}

.total-input-pergamino {
  padding: 0.3rem;
  font-size: 1rem;
  font-weight: bold;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  width: 100px;
  text-align: right;
}

/* Contenedor scroll interno */
.modal-content-scroll {
  max-height: calc(85vh - 32px) !important;
  overflow-y: auto !important;
  padding: 24px !important;
  position: relative !important;
}

.modal-content-scroll::-webkit-scrollbar {
  width: 10px !important;
}

.modal-content-scroll::-webkit-scrollbar-track {
  background: var(--bg-secondary) !important;
  border-radius: 5px !important;
}

.modal-content-scroll::-webkit-scrollbar-thumb {
  background: var(--accent-color) !important;
  border-radius: 5px !important;
  border: 2px solid var(--bg-secondary) !important;
}

/* Header del modal */
.modal-header {
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  margin-bottom: 1rem !important;
  padding-bottom: 1rem !important;
  border-bottom: 3px double var(--border-color) !important;
  position: relative !important;
}

.modal-header::after {
  content: '' !important;
  position: absolute !important;
  bottom: -10px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: 80px !important;
  height: 4px !important;
  background: var(--accent-color) !important;
  border-radius: 2px !important;
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
.annual-modal {
  width: min(100%, 800px) !important;
  max-height: 85vh !important;
  max-width: 100% !important;
  margin: 1rem auto !important;
  overflow-y: auto !important;
  background: var(--bg-panel) !important;
  box-shadow: 0 8px 32px var(--shadow-color) !important;
}

.annual-pergamino {
  width: min(100%, 1100px);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.annual-pergamino .pergamino-inner {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.annual-pergamino .annual-inner {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

.annual-header {
  text-align: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--bg-panel);
  position: relative;
  flex-shrink: 0;
}

.annual-header .header-emblem {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 34px;
  height: 34px;
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border: 3px solid var(--accent-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.annual-header .emblem-icon {
  font-size: 1.1rem;
  filter: drop-shadow(0 1px 1px var(--border-color));
}

.annual-header h2 {
  margin: 0;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 1.4rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: bold;
  text-shadow: 2px 2px 0 var(--border-color);
}

.annual-header .header-line {
  margin-top: 0.5rem;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent-color) 20%, var(--accent-color) 80%, transparent);
}

.annual-actions-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.annual-pergamino .papiro-select {
  padding: 0.4rem 0.6rem;
  background: var(--bg-primary);
  border: 2px solid var(--bg-panel);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.annual-pergamino .papiro-select:hover {
  border-color: var(--accent-color);
}

.refresh-btn {
  padding: 0.4rem 0.6rem;
  background: linear-gradient(180deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 60%, black) 100%);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.refresh-btn:hover {
  transform: scale(1.1);
}

.annual-pergamino .pergamino-close {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 30px;
  height: 30px;
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  border: 2px solid var(--border-color);
  border-radius: 50%;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.annual-pergamino .pergamino-close:hover {
  transform: scale(1.15);
  filter: brightness(1.2);
}

.annual-content-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-right: 0.25rem;
}

.annual-content-scroll::-webkit-scrollbar {
  width: 8px;
}

.annual-content-scroll::-webkit-scrollbar-track {
  background: var(--bg-primary);
  border-radius: 4px;
}

.annual-content-scroll::-webkit-scrollbar-thumb {
  background: var(--bg-panel);
  border-radius: 4px;
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
  margin-bottom: 1rem;
}

@media (max-width: 900px) {
  .annual-kpis {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 600px) {
  .annual-kpis {
    grid-template-columns: repeat(2, 1fr);
  }
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

@media (max-width: 600px) {
  .annual-charts-grid {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 4px 6px var(--shadow-color);
  margin-bottom: 0.5rem;
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

.annual-top-products-section {
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: 3px solid var(--accent-color);
  border-radius: 16px;
  padding: 1.5rem;
  margin-top: 1rem;
  box-shadow: 
    inset 0 0 0 2px var(--border-color),
    0 6px 0 var(--border-color),
    0 8px 20px var(--shadow-color);
}

.top-products-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.triforce-divider {
  font-size: 1.5rem;
  color: #f8d667;
  text-shadow: 0 0 10px #f8d667;
}

.top-products-title {
  margin: 0;
  font-size: 1.2rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  text-shadow: 2px 2px 0 var(--border-color);
  font-weight: 800;
}

.top-products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.top-products-card {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

.top-products-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
}

.top-products-card.granel::before {
  background: linear-gradient(90deg, var(--accent-color), var(--success-color));
}

.top-products-card.unitarios::before {
  background: linear-gradient(90deg, #c71585, var(--accent-color));
}

.card-emblem {
  font-size: 2rem;
  text-align: center;
  margin-bottom: 0.5rem;
  filter: drop-shadow(0 2px 4px var(--shadow-color));
}

.card-title {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
}

.card-subtitle {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-align: center;
  font-style: italic;
}

.top-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.top-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: var(--bg-secondary);
  border: 1px solid var(--bg-panel);
  border-radius: 6px;
  transition: all 0.15s;
}

.top-item:hover {
  border-color: var(--accent-color);
  transform: translateX(2px);
}

.top-rank {
  font-size: 1rem;
  width: 24px;
  text-align: center;
}

.top-rank.rank-1 {
  color: #ffd700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
  font-size: 1.2rem;
}

.top-rank.rank-2 {
  color: #c0c0c0;
  font-size: 1.1rem;
}

.top-rank.rank-3 {
  color: #cd7f32;
}

.top-name {
  flex: 1;
  font-size: 0.8rem;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-qty {
  font-size: 0.75rem;
  color: var(--success-color);
  font-weight: 700;
  font-family: "Courier New", monospace;
}

.triforce-footer {
  text-align: center;
  font-size: 1.2rem;
  margin-top: 1rem;
  color: var(--accent-color);
  letter-spacing: 0.5em;
  text-shadow: 0 0 10px var(--accent-color);
}

@media (max-width: 768px) {
  .top-products-grid {
    grid-template-columns: 1fr;
  }
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
    padding: 0.5rem;
    max-height: 100vh !important;
    height: 100vh !important;
    overflow: hidden !important;
  }

  .annual-modal .modal-content-scroll {
    max-height: calc(100vh - 60px) !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
  }

  .annual-kpis {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 0.5rem !important;
  }

  .annual-kpis .kpi-card {
    flex: 1 1 calc(50% - 0.25rem) !important;
    min-width: 120px !important;
  }

  .annual-charts-grid {
    overflow-x: hidden !important;
  }

  .chart-card {
    overflow: hidden !important;
    min-width: 0 !important;
  }

  .annual-table-section,
  .annual-products-section {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }

  .months-table-modern {
    min-width: 300px !important;
  }

  .products-grid {
    min-width: 0 !important;
  }
  
  .annual-modal .modal-content-scroll {
    max-height: calc(100vh - 60px) !important;
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

.history-pergamino {
  width: min(100%, 580px);
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.history-pergamino .pergamino-inner {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.history-pergamino .modal-header {
  text-align: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--bg-panel);
  position: relative;
  flex-shrink: 0;
}

.history-pergamino .header-emblem {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 34px;
  height: 34px;
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border: 3px solid var(--accent-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.history-pergamino .emblem-icon {
  font-size: 1.1rem;
  filter: drop-shadow(0 1px 1px var(--border-color));
}

.history-pergamino .modal-header h2 {
  margin: 0;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 1.1rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: bold;
  text-shadow: 2px 2px 0 var(--border-color);
}

.history-pergamino .header-line {
  margin-top: 0.4rem;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent-color) 20%, var(--accent-color) 80%, transparent);
}

.history-pergamino .pergamino-close {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 30px;
  height: 30px;
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  border: 2px solid var(--border-color);
  border-radius: 50%;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.history-pergamino .pergamino-close:hover {
  transform: scale(1.15);
  filter: brightness(1.2);
}

.history-pergamino .modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  min-height: 0;
}

.filter-section {
  flex-shrink: 0;
}

.filter-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
}

.filter-discrepancia {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.checkbox-scroll {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  font-size: 0.75rem;
  color: #991b1b;
  background: #fef2f2;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #ef4444;
}

.checkbox-scroll input {
  width: 12px;
  height: 12px;
  accent-color: #ef4444;
  cursor: pointer;
}

.filter-select-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-select-wrap label {
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}

.papiro-select {
  padding: 0.4rem 0.55rem;
  background: var(--bg-primary);
  border: 2px solid var(--bg-panel);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.papiro-select:hover {
  border-color: var(--accent-color);
}

.papiro-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.total-scroll-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.45rem 0.7rem;
  background: linear-gradient(180deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 70%, black) 100%);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 3px 0 var(--border-color);
}

.scroll-bar-label {
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.7rem;
  color: var(--border-color);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: bold;
}

.scroll-bar-amount {
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  font-weight: bold;
  color: var(--border-color);
  text-shadow: 1px 1px 0 var(--bg-primary);
}

.entries-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-right: 0.25rem;
}

.entries-scroll::-webkit-scrollbar {
  width: 8px;
}

.entries-scroll::-webkit-scrollbar-track {
  background: var(--bg-primary);
  border-radius: 4px;
}

.entries-scroll::-webkit-scrollbar-thumb {
  background: var(--bg-panel);
  border-radius: 4px;
}

.empty-text {
  text-align: center;
  padding: 2rem;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.scroll-entries {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
}

.scroll-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.7rem;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: 2px solid var(--bg-panel);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.scroll-entry:hover {
  border-color: var(--accent-color);
  transform: translateX(4px);
  box-shadow: 3px 3px 0 var(--border-color);
}

.scroll-entry.entry-discrepancia {
  border-color: #ef4444;
}

.scroll-entry.entry-discrepancia:hover {
  border-color: #dc2626;
}

.discrepancia-icon {
  display: inline-flex;
  margin-right: 0.25rem;
  font-size: 0.8rem;
}

.scroll-entry .entry-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.scroll-entry .entry-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 60%, black) 100%);
  border: 2px solid var(--border-color);
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--border-color);
}

.scroll-entry .entry-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.scroll-entry .entry-date {
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.8rem;
  color: var(--text-primary);
}

.metodo-scroll-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  width: fit-content;
}

.metodo-scroll-pill.efectivo {
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 60%, black) 100%);
  color: var(--text-primary);
}

.metodo-scroll-pill.transfer {
  background: linear-gradient(180deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 60%, black) 100%);
  color: var(--border-color);
}

.metodo-scroll-pill.tarjeta {
  background: linear-gradient(180deg, #c71585 0%, #8a1055 100%);
  color: var(--text-primary);
}

.scroll-entry .entry-amount {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  font-weight: bold;
  color: var(--success-color);
}

@media (max-width: 600px) {
  .history-pergamino {
    width: min(100%, 95vw);
    max-height: 90vh;
  }
  
  .filter-row {
    flex-direction: column;
  }
}

.egresos-pergamino {
  width: min(100%, 520px);
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.egresos-pergamino .pergamino-inner {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.egresos-pergamino .modal-header {
  text-align: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--bg-panel);
  position: relative;
  flex-shrink: 0;
}

.egresos-pergamino .header-emblem {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 34px;
  height: 34px;
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 60%, black) 100%);
  border: 3px solid var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.egresos-pergamino .emblem-icon {
  font-size: 1.1rem;
  filter: drop-shadow(0 1px 1px var(--border-color));
}

.egresos-pergamino .modal-header h2 {
  margin: 0;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 1.1rem;
  color: var(--error-color);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: bold;
  text-shadow: 2px 2px 0 var(--border-color);
}

.egresos-pergamino .header-line {
  margin-top: 0.4rem;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--error-color) 20%, var(--error-color) 80%, transparent);
}

.egresos-pergamino .pergamino-close {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 30px;
  height: 30px;
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  border: 2px solid var(--border-color);
  border-radius: 50%;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.egresos-pergamino .pergamino-close:hover {
  transform: scale(1.15);
  filter: brightness(1.2);
}

.btn-nueva-salida-pergamino {
  position: absolute;
  top: 50%;
  right: 45px;
  transform: translateY(-50%);
  padding: 0.3rem 0.7rem;
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 60%, black) 100%);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 3px 0 var(--border-color);
}

.btn-nueva-salida-pergamino:hover {
  filter: brightness(1.15);
  transform: translateY(-50%) scale(1.05);
}

.egresos-pergamino .modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  min-height: 0;
}

.egresos-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-right: 0.25rem;
}

.egresos-scroll::-webkit-scrollbar {
  width: 8px;
}

.egresos-scroll::-webkit-scrollbar-track {
  background: #d4c4a8;
  border-radius: 4px;
}

.egresos-scroll::-webkit-scrollbar-thumb {
  background: var(--bg-panel);
  border-radius: 4px;
}

.egreso-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.7rem;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: 2px solid var(--bg-panel);
  border-radius: 6px;
  transition: all 0.2s;
}

.egreso-card:hover {
  border-color: var(--error-color);
  transform: translateX(4px);
  box-shadow: 3px 3px 0 var(--border-color);
}

.egreso-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
  min-width: 0;
}

.egreso-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 60%, black) 100%);
  border: 2px solid var(--border-color);
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-primary);
  flex-shrink: 0;
}

.egreso-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.egreso-date {
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.75rem;
  color: var(--text-primary);
}

.egreso-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.egreso-user {
  font-size: 0.65rem;
  color: var(--text-secondary);
}

.egreso-amount {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  font-weight: bold;
  color: var(--error-color);
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.total-egresos-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.55rem 0.7rem;
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 60%, black) 100%);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  flex-shrink: 0;
  box-shadow: 0 3px 0 var(--border-color);
}

.total-egresos-label {
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.75rem;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: bold;
}

.total-egresos-amount {
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  font-weight: bold;
  color: var(--text-primary);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

@media (max-width: 520px) {
  .egresos-pergamino {
    width: min(100%, 95vw);
    max-height: 90vh;
  }
  
  .btn-nueva-salida-pergamino {
    position: static;
    transform: none;
    margin-top: 0.5rem;
    width: 100%;
  }
}

.empty {
  padding: 2rem;
  text-align: center;
  font-family: "Courier New", monospace;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .history-modal {
    width: min(100%, 95vw);
    max-height: 90vh;
  }
  
  .history-header {
    padding: 0.85rem 1rem;
  }
  
  .history-title-row h3 {
    font-size: 1rem;
  }
  
  .history-icon {
    font-size: 1.3rem;
  }
  
  .history-filters {
    padding: 0.85rem 1rem;
  }
  
  .filter-row {
    gap: 0.75rem;
  }
  
  .papiro-select {
    padding: 0.45rem 0.6rem;
    font-size: 0.8rem;
  }
  
  .history-scroll {
    padding: 0.75rem 1rem;
    max-height: calc(90vh - 165px);
  }
  
  .history-entry {
    padding: 0.75rem;
  }
  
  .entry-number {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }
  
  .entry-amount {
    font-size: 0.95rem;
  }
}

@media (max-width: 480px) {
  .history-modal {
    width: 100vw;
    max-width: 100vw;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .history-header {
    padding: 0.75rem;
  }
  
  .history-title-row {
    gap: 0.4rem;
  }
  
  .history-icon {
    font-size: 1.2rem;
  }
  
  .history-title-row h3 {
    font-size: 0.95rem;
  }
  
  .history-filters {
    padding: 0.75rem;
  }
  
  .filter-row {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .filter-select-wrap {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }
  
  .filter-select-wrap label {
    min-width: 50px;
    font-size: 0.7rem;
  }
  
  .papiro-select {
    flex: 1;
  }
  
  .filter-total-papiro {
    padding: 0.5rem 0.75rem;
  }
  
  .total-label {
    font-size: 0.75rem;
  }
  
  .total-value {
    font-size: 1rem;
  }
  
  .history-scroll {
    padding: 0.6rem 0.75rem;
    max-height: calc(100vh - 170px);
  }
  
  .history-entry {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.65rem;
  }
  
  .entry-left {
    width: 100%;
    justify-content: space-between;
  }
  
  .entry-amount {
    width: 100%;
    text-align: right;
    font-size: 1rem;
  }
}

@media (max-width: 400px) {
  .history-header {
    padding: 0.6rem 0.75rem;
  }
  
  .history-title-row h3 {
    font-size: 0.85rem;
  }
  
  .filter-total-papiro {
    padding: 0.4rem 0.6rem;
  }
  
  .total-label {
    font-size: 0.7rem;
  }
  
  .total-value {
    font-size: 0.9rem;
  }
  
  .history-entry {
    padding: 0.55rem;
  }
  
  .entry-number {
    width: 26px;
    height: 26px;
    font-size: 0.7rem;
  }
  
  .entry-date {
    font-size: 0.8rem;
  }
  
  .metodo-pill {
    font-size: 0.65rem;
  }
  
  .entry-amount {
    font-size: 0.9rem;
  }
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

/* =========================================
   RESPONSIVE MODALS - MOBILE
   ========================================= */
@media (max-width: 768px) {
  /* Overlay - ensure it doesn't overflow */
  .modal-overlay {
    padding: 0.5rem !important;
    overflow: hidden !important;
    align-content: center !important;
  }

  /* All modals - fully contained */
  .modal-card.panel {
    width: 100% !important;
    max-width: calc(100vw - 1rem) !important;
    max-height: 95vh !important;
    border-radius: 12px !important;
    margin: 0 auto !important;
    overflow: hidden !important;
  }

  .modal-card.panel::before {
    border-radius: 12px !important;
  }

  .modal-card.panel::after {
    inset: 8px !important;
    border-radius: 8px !important;
  }

  .modal-corner {
    width: 30px !important;
    height: 30px !important;
  }

  .modal-corner.tl,
  .modal-corner.tr { top: 10px !important; }
  .modal-corner.bl,
  .modal-corner.br { bottom: 10px !important; }
  .modal-corner.tl,
  .modal-corner.bl { left: 10px !important; }
  .modal-corner.tr,
  .modal-corner.br { right: 10px !important; }

  .modal-corner::before { width: 18px !important; height: 2px !important; }
  .modal-corner::after { width: 2px !important; height: 18px !important; }

  .btn-cerrar-modal {
    width: 32px !important;
    height: 32px !important;
    top: 12px !important;
    right: 12px !important;
    font-size: 1rem !important;
  }

  .modal-content-scroll {
    max-height: calc(95vh - 60px) !important;
    padding: 16px !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
  }

  /* Modal headers */
  .modal-header {
    padding: 0.75rem 0.5rem !important;
    margin-bottom: 0.75rem !important;
  }

  .modal-header h3 {
    font-size: 1.1rem !important;
  }

  .modal-icon {
    font-size: 1.2rem !important;
  }

  /* History Modal */
  .history-modal {
    width: min(100%, 95vw) !important;
  }

  .history-filters {
    grid-template-columns: 1fr !important;
    gap: 0.5rem !important;
    padding: 0.75rem !important;
  }

  .filter-total {
    flex-direction: row !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding: 0.5rem 0 !important;
  }

  .history-list {
    max-height: 50vh !important;
    min-height: 200px !important;
  }

  .history-item {
    flex-direction: column !important;
    gap: 0.5rem !important;
    padding: 0.75rem !important;
  }

  .history-item-left,
  .history-item-right {
    width: 100% !important;
    justify-content: space-between !important;
  }

  .metodo-badge {
    font-size: 0.7rem !important;
  }

  /* Detail Modal */
  .detail-modal {
    width: min(100%, 95vw) !important;
  }

  .detail-summary {
    grid-template-columns: 1fr 1fr !important;
    gap: 0.5rem !important;
  }

  .summary-item {
    min-width: unset !important;
    padding: 0.6rem !important;
  }

  .summary-icon {
    font-size: 1.1rem !important;
  }

  .summary-label {
    font-size: 0.65rem !important;
  }

  .summary-value {
    font-size: 0.8rem !important;
  }

  .total-item {
    grid-column: span 2 !important;
  }

  .detail-table-wrap {
    max-height: 50vh !important;
    overflow-x: auto !important;
  }

  .detail-table-wrap table {
    font-size: 0.8rem !important;
  }

  .detail-table-wrap th,
  .detail-table-wrap td {
    padding: 0.5rem 0.3rem !important;
  }

  .col-producto {
    max-width: 100px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  /* Daily/Monthly Modal */
  .daily-modal,
  .monthly-modal {
    width: min(100%, 95vw) !important;
  }

  .modal-body {
    padding: 0.5rem !important;
  }

  .input-group {
    margin-bottom: 0.75rem !important;
  }

  .btn-generate {
    width: 100% !important;
    padding: 1rem !important;
    font-size: 0.95rem !important;
  }

  .btn-generate .btn-icono {
    font-size: 1.3rem !important;
  }

  .btn-generate .btn-texto {
    font-size: 0.9rem !important;
  }

  /* Monthly Results */
  .results-summary {
    grid-template-columns: 1fr 1fr !important;
    gap: 0.5rem !important;
  }

  .summary-card.total {
    grid-column: span 2 !important;
  }

  .weekly-cards {
    grid-template-columns: 1fr 1fr !important;
  }

  .week-card {
    padding: 0.75rem !important;
  }

  .week-header {
    font-size: 0.85rem !important;
  }

  .week-dates {
    font-size: 0.7rem !important;
  }

  .week-stat {
    font-size: 0.75rem !important;
  }

  .products-toggle {
    flex-wrap: wrap !important;
  }

  .products-toggle button {
    flex: 1 !important;
    min-width: 45% !important;
    padding: 0.5rem !important;
    font-size: 0.8rem !important;
  }

  .product-row {
    padding: 0.5rem !important;
    gap: 0.3rem !important;
  }

  .product-rank {
    width: 22px !important;
    height: 22px !important;
    font-size: 0.7rem !important;
  }

  .product-name {
    font-size: 0.75rem !important;
  }

  .product-qty,
  .product-amount {
    font-size: 0.7rem !important;
  }

  /* Annual Modal */
  .annual-modal {
    width: min(100%, 95vw) !important;
    max-height: 92vh !important;
  }

  .annual-header-modern {
    flex-direction: column !important;
    gap: 0.5rem !important;
  }

  .annual-title-block {
    text-align: center !important;
  }

  .annual-title {
    font-size: 1.1rem !important;
  }

  .annual-subtitle {
    font-size: 0.7rem !important;
  }

  .annual-actions {
    width: 100% !important;
    justify-content: center !important;
  }

  .annual-kpis {
    grid-template-columns: 1fr !important;
    gap: 0.5rem !important;
  }

  .kpi-card {
    padding: 0.75rem !important;
  }

  .kpi-icon-wrapper {
    width: 36px !important;
    height: 36px !important;
  }

  .kpi-icon {
    font-size: 1.1rem !important;
  }

  .kpi-label {
    font-size: 0.7rem !important;
  }

  .kpi-value {
    font-size: 1rem !important;
  }

  .monthly-chart-section {
    padding: 0.75rem !important;
  }

  .horarios-grid {
    grid-template-columns: 1fr !important;
    gap: 0.5rem !important;
  }

  .horario-card {
    padding: 0.75rem !important;
  }
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 0 !important;
  }

  .modal-card.panel {
    width: 100vw !important;
    max-height: 100vh !important;
    border-radius: 0 !important;
    margin: 0 !important;
    max-width: 100vw !important;
  }

  .modal-card.panel::before {
    border-radius: 0 !important;
  }

  .modal-corner {
    display: none !important;
  }

  .btn-cerrar-modal {
    top: 8px !important;
    right: 8px !important;
  }

  .modal-content-scroll {
    padding: 12px !important;
  }

  .modal-header h3 {
    font-size: 1rem !important;
    padding-right: 30px !important;
  }

  .history-filters {
    padding: 0.5rem !important;
  }

  .modern-select {
    font-size: 0.75rem !important;
    padding: 0.4rem 0.5rem !important;
  }

  .filter-total strong {
    font-size: 0.95rem !important;
  }

  .history-item {
    padding: 0.6rem !important;
  }

  .ticket-badge {
    font-size: 0.75rem !important;
  }

  .history-date {
    font-size: 0.7rem !important;
  }

  .history-amount {
    font-size: 0.9rem !important;
  }

  .summary-card {
    padding: 0.5rem !important;
  }

  .summary-value {
    font-size: 0.75rem !important;
  }

  .week-card {
    padding: 0.5rem !important;
  }

  .products-toggle button {
    min-width: 100% !important;
  }

  .chart-container,
  .chart-container-weekly {
    max-height: 200px !important;
    padding: 0.5rem !important;
  }

  .annual-content {
    overflow-y: auto !important;
    overflow-x: hidden !important;
  }

  .annual-table-section,
  .annual-products-section {
    min-width: 0 !important;
    overflow-x: auto !important;
  }

  .months-table-modern {
    overflow-x: auto !important;
    min-width: 280px !important;
  }

  .products-grid {
    overflow-x: hidden !important;
  }
}
</style>
