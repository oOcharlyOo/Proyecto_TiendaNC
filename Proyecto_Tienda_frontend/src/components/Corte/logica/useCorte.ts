import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export type ApiRespuesta<T> = { codigo: number; mensaje: string; datos: T };
export type UsuarioDTO = { idUsuario: number; nombre?: string };
export type VentaDTO = {
  idVenta: number; idUsuario?: number; numeroTicket?: number;
  fechaVenta?: string; metodoPago?: string; montoTotal?: number;
  estatus?: string; usuario?: UsuarioDTO; nombreUsuario?: string;
  tieneDiscrepancia?: boolean; detalles?: VentaDetalleDTO[];
};
export type GananciasDTO = { cobroTotal?: number; gananciaTotal?: number; ventas?: VentaDTO[]; nombreUsuario?: string };
export type ReporteDiarioCompletoDTO = {
  ventas: VentaDTO[]; cobroTotal: number; gananciaTotal: number;
  ventasEfectivo: number; ventasTarjeta: number; ventasTransferencia: number;
  totalTickets: number; montoInicial: number; otrosIngresos: number;
  totalEgresos: number; horaInicio: string | null; horaFin: string | null;
  nombreUsuario: string | null; todosDetalles: VentaDetalleDTO[];
};
export type CorteDTO = {
  fechaCorte: string; montoInicial: number; totalVentas: number;
  totalEgresos: number; otrosIngresos: number; saldoFinalCalculado: number;
  saldoFinalEfectivo: number; gananciaTotal: number; gananciaNeta: number;
  ventasEfectivo?: number; ventasTarjeta?: number; ventasTransferencia?: number;
  totalTickets?: number; horasTrabajadas?: string;
};
export type EgresoDTO = {
  idCaja: number; fechaMovimiento: string; tipoMovimiento: string;
  monto: number; descripcion: string; saldoResultante: number;
  estatus: string; usuario?: { idUsuario: number; nombre: string; apellido_p: string; usuario: string };
};
export type VentaDetalleDTO = {
  idVentaDetalle: number; cantidad: number; precioUnitarioVenta: number;
  tipoPrecioAplicado?: string; Venta: VentaDTO; venta?: VentaDTO;
  productoId?: number; productoNombre?: string; productoPrecioCosto?: number;
  productoIsGramaje?: boolean;
  producto?: { idProducto?: number; nombre?: string; precio_venta?: number; is_gramaje?: boolean; codigoBarras?: string; codigo_barras?: string };
  Producto?: { idProducto?: number; nombre?: string; precio_venta?: number; is_gramaje?: boolean; codigoBarras?: string; codigo_barras?: string };
  idProducto?: number; cobro_envase?: number; cobroEnvase?: boolean;
  cobroEnvaseTotal?: number; cantidadEnvase?: number;
};
export type ApartadoDTO = {
  idApartado: number; nombreProducto: string; montoTotal: number;
  montoPagado: number; montoRestante: number; frecuenciaPago: string;
  montoPorPeriodo: number; montoDiario: number; fechaInicio: string;
  fechaFin: string; estatus: string; idUsuario: number;
  nombreUsuario?: string; fechaRegistro: string;
};
export type ApartadoPagoDTO = {
  idPago: number; idApartado: number; nombreProducto: string;
  monto: number; fechaPago: string; idUsuario: number; nombreUsuario?: string;
};
export type ReporteAnualDTO = {
  year: number; ventasTotales: number; gananciaTotal: number;
  ventasEfectivo: number; ventasTransferencia: number; ventasTarjeta: number;
  meses: MesData[]; ventasPorHorario: HorarioData[];
  productosPorHorario: ProductoHorarioData[];
  topProductosGranel: ProductoTopData[]; topProductosUnitarios: ProductoTopData[];
};
export type MesData = { mes: number; nombreMes: string; ventas: number; ganancia: number; numeroVentas: number; porcentajeCambio: number };
export type HorarioData = { horario: string; numeroVentas: number; totalVentas: number };
export type ProductoHorarioData = { horario: string; nombreProducto: string; cantidadVendida: number; totalVendido: number; isGramaje: boolean };
export type ProductoTopData = { nombreProducto: string; cantidadVendida: number; totalVendido: number; isGramaje: boolean; posicion: number };
export type ProductoVendido = { nombre: string; cantidadTotal: number; montoTotal: number; isGramaje: boolean };

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';
let router: ReturnType<typeof useRouter>;

// --- Auth ---
const idUsuario = ref<number>(Number(localStorage.getItem('idUsuario') || 0));
const nombreUsuario = ref(localStorage.getItem('nombreUsuario') || 'Usuario');
const tipoUsuario = ref<number>(Number(localStorage.getItem('tipoUsuario') || 2));
const esAdministrador = computed(() => tipoUsuario.value === 1);

// --- Window ---
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200);
function updateWidth() { windowWidth.value = window.innerWidth; }

export function useCorte() {
  router = useRouter();

  onMounted(() => {
    window.addEventListener('resize', updateWidth);
    verificarCajaActiva();
    cargarUsuariosConSueldo();
    if (idUsuario.value <= 0) {
      mostrarMensaje('No se encontro idUsuario en sesion. Algunas acciones pueden fallar.', 'info');
    }
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateWidth);
  });
}

// --- Theme helpers ---
function getCSSVar(name: string, fallback: string): string {
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue(name).trim() || fallback;
}
const currentTheme = ref(localStorage.getItem('theme') || 'zelda');
function getZeldaGoldColor() { currentTheme.value; return getCSSVar('--zelda-gold', '#c99234'); }
function getChartBackgroundColor() {
  currentTheme.value; const bg = getCSSVar('--chart-bg', '#1a1a2e');
  if (bg.startsWith('linear-gradient')) { const m = bg.match(/#[a-fA-F0-9]{6}/); return m ? m[0] : '#1a1a2e'; }
  return bg;
}
function getChartTextColor() { currentTheme.value; return getCSSVar('--chart-text', '#f6f2de'); }
function getSuccessColor() { currentTheme.value; return getCSSVar('--success-color', '#28a745'); }
function getAccentColor() { currentTheme.value; return getCSSVar('--accent-color', '#c99234'); }
function getErrorColor() { currentTheme.value; return getCSSVar('--error-color', '#dc3545'); }

// --- Message toast ---
const mensaje = ref('');
const mensajeTipo = ref<'ok' | 'error' | 'info'>('info');
function mostrarMensaje(texto: string, tipo: 'ok' | 'error' | 'info') {
  mensaje.value = texto;
  mensajeTipo.value = tipo;
}

// --- Loading states ---
const cargandoCorte = ref(false);
const cargandoMensual = ref(false);
const cargandoHistorial = ref(false);
const cargandoCerrarTurno = ref(false);
const cargandoAnual = ref(false);
const cargandoBackup = ref(false);

const mostrarReporte = ref(false);
const mostrarCerrarTurno = ref(false);

// --- Modal states ---
const modalDiarioAbierto = ref(false);
const modalMensualAbierto = ref(false);
const modalHistorialAbierto = ref(false);
const modalDetalleAbierto = ref(false);
const modalEgresosAbierto = ref(false);
const modalSalidaAbierto = ref(false);
const modalEntradasAbierto = ref(false);
const modalApartadosAbierto = ref(false);
const modalAnualAbierto = ref(false);
const modalSueldoHoraAbierto = ref(false);
const modalGramajeAbierto = ref(false);

// --- Date filters ---
const fechaDiaria = ref(new Date().toISOString().slice(0, 10));
const mesMensual = ref(new Date().toISOString().slice(0, 7));
const fechaRangoInicio = ref(new Date().toISOString().slice(0, 10));
const fechaRangoFin = ref(new Date().toISOString().slice(0, 10));
const anioReporte = ref(new Date().getFullYear());

// --- Corte/report data ---
const corteActual = ref<CorteDTO | null>(null);
const montoInicialCajaActiva = ref(0);
const ventasEfectivo = ref(0);
const ventasTarjeta = ref(0);
const ventasTransferencia = ref(0);
const abonoTotalDia = ref(0);
const totalEnvase = ref(0);
const totalTicketsDia = ref(0);
const horaInicioCaja = ref<string | null>(null);
const horaFinCaja = ref<string | null>(null);
const reporteTitulo = ref('Reporte del Corte Actual');

// --- Salary ---
const diasLaboradosSemana = ref(6);
const usuariosConSueldo = ref<{ id: number; nombre: string; surname: string; hora: number; diasSemana: number; horas: number }[]>([]);
const usuariosQueTrabajaronElDia = ref<number[]>([]);

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

const totalSueldoSemanal = computed(() => {
  const horasDia = obtenerHorasTrabajadas();
  return usuariosConSueldo.value
    .filter(u => usuariosQueTrabajaronElDia.value.includes(u.id))
    .reduce((sum, u) => {
      const dias = u.diasSemana || 6;
      return sum + ((u.hora || 0) * horasDia * dias);
    }, 0);
});

function obtenerHorasTrabajadas(): number {
  const horasStr = corteActual.value?.horasTrabajadas || horasTrabajadas.value || '8h';
  const match = horasStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 8;
}

const dineroApartarDiario = computed(() => {
  return totalSueldoSemanal.value / 7;
});

// --- Modal states for apartados ---
const apartadosActivos = ref<ApartadoDTO[]>([]);
const apartadosCompletados = ref<ApartadoDTO[]>([]);
const cargandoApartados = ref(false);
const cargandoApartadosCompletados = ref(false);
const totalApartarDiario = ref(0);
const historialPagos = ref<ApartadoPagoDTO[]>([]);
const cargandoHistorialPagos = ref(false);
const mostrarHistorialApartado = ref(false);
const mostrarHistorialCompletados = ref(false);
const mostrarModalPago = ref(false);
const apartadoParaPago = ref<ApartadoDTO | null>(null);
const montoPagoCustom = ref(0);
const errorMontoPago = ref('');

const nuevoApartado = ref({
  nombreProducto: '', montoTotal: 0, frecuenciaPago: 'mensual',
  plazoMeses: 1, fechaInicio: new Date().toISOString().slice(0, 10)
});

// --- Chart toggle ---
const tipoGraficaCorte = ref<'unitario' | 'gramaje' | 'combinado'>('unitario');
const tipoGraficaDiaria = ref<'unitario' | 'gramaje'>('unitario');
const tipoGraficaMensual = ref<'unitario' | 'gramaje'>('unitario');

// --- Monthly ---
const mensualTotalVentas = ref(0);
const mensualTotalTransferencia = ref(0);
const mensualTotalTarjeta = ref(0);
const mensualTotalGanancias = ref(0);
const mensualSemanas = shallowRef<{ semana: number; ventas: number; ganancia: number; dias: string }[]>([]);
const rangoFechasSemanas = ref<{ inicio: Date; fin: Date } | null>(null);

// --- Products ---
const productosMasVendidos = shallowRef<ProductoVendido[]>([]);
const productosUnitarios = shallowRef<ProductoVendido[]>([]);
const productosGranel = shallowRef<ProductoVendido[]>([]);
const productosDiario = shallowRef<ProductoVendido[]>([]);
const productosUnitariosDiario = shallowRef<ProductoVendido[]>([]);
const productosGranelDiario = shallowRef<ProductoVendido[]>([]);
const detallesDiario = shallowRef<VentaDetalleDTO[]>([]);
const productosMensual = shallowRef<ProductoVendido[]>([]);
const productosUnitariosMensual = shallowRef<ProductoVendido[]>([]);
const productosGranelMensual = shallowRef<ProductoVendido[]>([]);
const detallesMensual = shallowRef<VentaDetalleDTO[]>([]);

// --- History ---
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
const modalProductoGramaje = ref<any>(null);
const gramajeEditandoIndice = ref<number | null>(null);
const gramajeEditandoCantidad = ref(0);
const gramajeEditandoPrecio = ref(0);
const ventasHistorialSeleccionadas = ref<Set<number>>(new Set());
const corrigiendoHistorial = ref(false);
const correccionHistorialMsg = ref('');

// --- Expenses/Entries ---
const egresosDia = ref<EgresoDTO[]>([]);
const entradasDia = ref<EgresoDTO[]>([]);
const cargandoEntradas = ref(false);
const cargandoEgresos = ref(false);

// --- Backup ---
const mostrarBackupManager = ref(false);
const mostrarImportModal = ref(false);
const backupLog = ref<string[]>([]);
const selectedFiles = ref<File[]>([]);
const dragOver = ref(false);

// --- Annual ---
const reporteAnualData = ref<ReporteAnualDTO | null>(null);

// ===== COMPUTED =====

const ventaDetalleEnvases = computed(() => {
  return ventaDetalleItems.value.filter((d) => {
    return Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0) > 0;
  });
});
const ventaDetalleEnvaseTotal = computed(() => {
  return ventaDetalleEnvases.value.reduce((sum, d) => {
    return sum + Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0);
  }, 0);
});

const historialVentasAgrupadas = computed(() => {
  const map = new Map<number, { venta: VentaDTO; detalles: VentaDetalleDTO[] }>();
  for (const d of historialDetalles.value) {
    const idVenta = Number(d?.Venta?.idVenta || 0);
    if (!idVenta) continue;
    if (!map.has(idVenta)) {
      const montoVenta = Number(d.Venta?.montoTotal ?? 0);
      map.set(idVenta, { venta: { ...d.Venta, tieneDiscrepancia: verificarDiscrepancia([d], montoVenta) }, detalles: [] });
    }
    map.get(idVenta)?.detalles.push(d);
  }
  for (const item of map.values()) {
    item.venta.tieneDiscrepancia = verificarDiscrepancia(item.detalles, Number(item.venta.montoTotal ?? 0));
  }
  return Array.from(map.values()).sort((a, b) => {
    return new Date(b.venta.fechaVenta || '').getTime() - new Date(a.venta.fechaVenta || '').getTime();
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
    const discrepancyOk = !filtroDiscrepanciaHistorial.value || item.venta.tieneDiscrepancia === true;
    return monthOk && dayOk && discrepancyOk;
  });
});

const historialTotalFiltrado = computed(() => {
  return historialFiltrado.value.reduce((sum, x) => sum + Number(x.venta.montoTotal || 0), 0);
});

// ===== FORMATTING =====

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor || 0));
}
function formatoMonedaRedondeada(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Math.round(Number(valor || 0)));
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
function formatoFecha(fecha?: string) {
  if (!fecha) return 'N/D';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return 'N/D';
  return d.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
}
function formatearCantidad(cantidad: number, isGramaje: boolean): string {
  if (!isGramaje) return `${cantidad} pzs`;
  if (cantidad >= 1000) {
    const kg = cantidad / 1000;
    return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2)} kg`;
  }
  return `${cantidad} g`;
}

// ===== API =====

async function fetchApi<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
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

// ===== SALARY =====

async function cargarUsuariosConSueldo() {
  try {
    const res = await fetch(`${API_BASE}/usuarios/listarUsuarios`);
    const data = await res.json();
    if (data.codigo === 200 && data.datos) {
      usuariosConSueldo.value = data.datos.map((u: any) => ({
        id: u.idUsuario, nombre: u.nombre, surname: u.apellido_p,
        hora: u.sueldo_hora || 0, diasSemana: u.dias_semana || 6, horas: u.horas_trabajadas || 8
      }));
    }
  } catch (e) { console.error('Error al cargar usuarios con sueldo:', e); }
}

// ===== CORTE / DAILY REPORT =====

async function verificarCajaActiva() {
  if (!idUsuario.value) return;
  const modoReportes = localStorage.getItem('modoReportes') === 'true';
  if (modoReportes) { montoInicialCajaActiva.value = 0; localStorage.setItem('montoInicialCaja', '0'); return; }
  try {
    const res = await fetch(`${API_BASE}/caja/apertura/activa?idUsuario=${idUsuario.value}`);
    const data = await res.json();
    if (res.ok && data.datos !== null) {
      montoInicialCajaActiva.value = Number(data.datos.monto || 0);
      localStorage.setItem('montoInicialCaja', String(data.datos.monto || 0));
    } else { montoInicialCajaActiva.value = 0; }
  } catch (err) { console.error("Error al verificar caja activa:", err); montoInicialCajaActiva.value = 0; }
}

async function generarCorte() {
  if (!idUsuario.value) { mostrarMensaje('No se encontro idUsuario en sesion.', 'error'); return; }
  cargandoCorte.value = true;
  try {
    const corte = await fetchApi<CorteDTO | null>(`/caja/corte/consulta?idUsuario=${idUsuario.value}`);
    if (!corte) {
      mostrarMensaje('No hay una caja abierta. Inicia sesion para abrir caja.', 'error');
      return;
    }
    const fechaCorte = new Date(corte.fechaCorte);
    ventasEfectivo.value = Number(corte.ventasEfectivo || 0);
    ventasTransferencia.value = Number(corte.ventasTransferencia || 0);
    totalTicketsDia.value = Number(corte.totalTickets || 0);
    const montoInicialCorte = Number(corte.montoInicial || 0);
    const otrosIngresosCorte = Number(corte.otrosIngresos || 0);
    const totalEgresosCorte = Number(corte.totalEgresos || 0);
    const saldoFinalEfectivo = montoInicialCorte + Number(ventasEfectivo.value || 0) + otrosIngresosCorte - totalEgresosCorte;
    corteActual.value = { ...corte, saldoFinalEfectivo };
    reporteTitulo.value = 'Reporte del Corte Actual';
    mostrarReporte.value = true;
    mostrarCerrarTurno.value = true;
    const hoy = fechaCorte.toISOString().slice(0, 10);
    await Promise.all([
      (async () => {
        try {
          const reporteDiario = await fetchApi<ReporteDiarioCompletoDTO>(`/ventas/reporteDiarioCompleto/${hoy}`);
          const detallesCorte = reporteDiario.todosDetalles || [];
          totalEnvase.value = detallesCorte.reduce((sum, d) => sum + Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0), 0);
        } catch (e) { console.error('Error al calcular total envases:', e); totalEnvase.value = 0; }
      })(),
      (async () => {
        if (idUsuario.value) {
          try {
            const [totalApartadoData, apartadosData] = await Promise.all([
              fetchApi<number | { datos: number }>(`/apartado/totalDiario?idUsuario=${idUsuario.value}`),
              fetchApi<ApartadoDTO[] | { datos: ApartadoDTO[] }>(`/apartado/activos?idUsuario=${idUsuario.value}`)
            ]);
            totalApartarDiario.value = typeof totalApartadoData === 'number' ? totalApartadoData : (totalApartadoData?.datos || 0);
            apartadosActivos.value = Array.isArray(apartadosData) ? apartadosData : (apartadosData?.datos || []);
          } catch (e) { totalApartarDiario.value = 0; apartadosActivos.value = []; }
        }
      })()
    ]);
    mostrarMensaje('Corte de caja generado con exito.', 'ok');
  } catch (error) {
    mostrarMensaje(`Error al generar corte: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally { cargandoCorte.value = false; }
}

async function generarReporteDiario() {
  if (!fechaDiaria.value) { mostrarMensaje('Selecciona una fecha para reporte diario.', 'error'); return; }
  productosMasVendidos.value = []; productosUnitarios.value = []; productosGranel.value = [];
  mostrarReporte.value = false;
  try {
    const reporte = await fetchApi<ReporteDiarioCompletoDTO>(`/ventas/reporteDiarioCompleto/${fechaDiaria.value}`);
    const ventas = reporte.ventas || [];
    for (const venta of ventas) {
      const detalles = venta.detalles || [];
      venta.tieneDiscrepancia = verificarDiscrepancia(detalles as any, Number(venta.montoTotal ?? 0));
    }
    ventasEfectivo.value = Number(reporte.ventasEfectivo || 0);
    ventasTarjeta.value = Number(reporte.ventasTarjeta || 0);
    ventasTransferencia.value = Number(reporte.ventasTransferencia || 0);
    abonoTotalDia.value = Number((reporte as any).abonoTotal || 0);
    const idsUsuariosUnicos = [...new Set(ventas.map(v => v.idUsuario).filter((id): id is number => !!id))];
    usuariosQueTrabajaronElDia.value = idsUsuariosUnicos;
    const montoInicial = Number(reporte.montoInicial || 0);
    const otrosIngresos = Number(reporte.otrosIngresos || 0);
    const totalEgresos = Number(reporte.totalEgresos || 0);
    horaInicioCaja.value = reporte.horaInicio || null;
    horaFinCaja.value = reporte.horaFin || null;
    if (reporte.nombreUsuario) nombreUsuario.value = reporte.nombreUsuario;
    const totalVentas = Number(reporte.cobroTotal || 0);
    const saldoFinal = montoInicial + totalVentas + otrosIngresos - totalEgresos;
    const saldoFinalEfectivo = montoInicial + Number(ventasEfectivo.value || 0) + otrosIngresos - totalEgresos;
    const gananciaBruta = Number(reporte.gananciaTotal || 0);
    corteActual.value = {
      fechaCorte: `${fechaDiaria.value}T00:00:00`, montoInicial, totalVentas, totalEgresos, otrosIngresos,
      saldoFinalCalculado: saldoFinal, saldoFinalEfectivo, gananciaTotal: gananciaBruta,
      gananciaNeta: Math.max(0, gananciaBruta - dineroApartarDiario.value),
      ventasTarjeta: Number(ventasTarjeta.value || 0), ventasEfectivo: Number(ventasEfectivo.value || 0),
      ventasTransferencia: Number(ventasTransferencia.value || 0)
    };
    const todosDetalles = reporte.todosDetalles || [];
    detallesDiario.value = todosDetalles;
    totalEnvase.value = todosDetalles.reduce((sum, d) => sum + Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0), 0);
    calcularProductosReporte(todosDetalles, 'diario');
    if (idUsuario.value) {
      try {
        const [totalApartadoData, apartadosData] = await Promise.all([
          fetchApi<number | { datos: number }>(`/apartado/totalDiario?idUsuario=${idUsuario.value}`),
          fetchApi<ApartadoDTO[] | { datos: ApartadoDTO[] }>(`/apartado/activos?idUsuario=${idUsuario.value}`)
        ]);
        totalApartarDiario.value = typeof totalApartadoData === 'number' ? totalApartadoData : (totalApartadoData?.datos || 0);
        apartadosActivos.value = Array.isArray(apartadosData) ? apartadosData : (apartadosData?.datos || []);
      } catch (e) { totalApartarDiario.value = 0; apartadosActivos.value = []; }
    }
    totalTicketsDia.value = reporte.totalTickets ?? ventas.length;
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
    corteActual.value.gananciaNeta = Math.max(0, Number(corteActual.value.gananciaTotal) - dineroApartarDiario.value);
  }
}

function verificarDiscrepancia(detalles: VentaDetalleDTO[], montoTotal: number): boolean {
  const sumaDetalles = detalles.reduce((sum: number, d) => {
    const precio = Number(d.precioUnitarioVenta || 0);
    const cantidad = Number(d.cantidad || 0);
    let cobroEnvaseTotal = Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0);
    if (cobroEnvaseTotal === 0 && (d as any).requiere_envase && Number((d as any).precio_envase || 0) > 0) {
      const precioEnvase = Number((d as any).precio_envase || 0);
      const posibleEnvase = precioEnvase * cantidad;
      cobroEnvaseTotal = posibleEnvase;
    }
    let subtotal = d.tipoPrecioAplicado === 'VENTA_GRAMAJE' ? precio : precio * cantidad;
    return sum + subtotal + cobroEnvaseTotal;
  }, 0);
  return Math.abs(Math.round(sumaDetalles * 100) / 100 - Math.round(montoTotal * 100) / 100) > 2;
}

// ===== PRODUCTS =====

function calcularProductosMasVendidos(detalles: VentaDetalleDTO[]) {
  const productosMap = new Map<string, ProductoVendido>();
  for (const d of detalles) {
    const nombre = d.productoNombre || 'Producto eliminado';
    const cantidad = Number(d.cantidad || 0);
    const tipoPrecio = String(d.tipoPrecioAplicado || '').trim().toUpperCase();
    const isGramaje = tipoPrecio === 'VENTA_GRAMAJE' || d.productoIsGramaje === true;
    let importe = isGramaje ? Number(d.precioUnitarioVenta || 0) : Number(d.precioUnitarioVenta || 0) * cantidad;
    if (isGramaje) importe = Math.round(importe * 100) / 100;
    if (!productosMap.has(nombre)) productosMap.set(nombre, { nombre, cantidadTotal: 0, montoTotal: 0, isGramaje });
    const producto = productosMap.get(nombre)!;
    producto.cantidadTotal += cantidad;
    producto.montoTotal += importe;
    if (isGramaje) producto.isGramaje = true;
  }
  const sorted = Array.from(productosMap.values()).sort((a, b) => b.cantidadTotal - a.cantidadTotal);
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
    const tipoPrecio = String(d.tipoPrecioAplicado || '').trim().toUpperCase();
    const isGramaje = tipoPrecio === 'VENTA_GRAMAJE' || d.productoIsGramaje === true;
    const importe = isGramaje ? Number(d.precioUnitarioVenta || 0) : Number(d.precioUnitarioVenta || 0) * cantidad;
    if (!productosMap.has(nombre)) productosMap.set(nombre, { nombre, cantidadTotal: 0, montoTotal: 0, isGramaje });
    const producto = productosMap.get(nombre)!;
    producto.cantidadTotal += cantidad;
    producto.montoTotal += importe;
    if (isGramaje) producto.isGramaje = true;
  }
  const unitarios = Array.from(productosMap.values()).filter(p => !p.isGramaje);
  const granel = Array.from(productosMap.values()).filter(p => p.isGramaje);
  if (tipo === 'diario') {
    productosDiario.value = [...unitarios.sort((a, b) => b.montoTotal - a.montoTotal).slice(0, 5), ...granel.sort((a, b) => b.montoTotal - a.montoTotal).slice(0, 5)];
    productosUnitariosDiario.value = unitarios.sort((a, b) => b.montoTotal - a.montoTotal).slice(0, 5);
    productosGranelDiario.value = granel.sort((a, b) => b.montoTotal - a.montoTotal).slice(0, 5);
  } else {
    productosMensual.value = [...unitarios.sort((a, b) => b.cantidadTotal - a.cantidadTotal).slice(0, 10), ...granel.sort((a, b) => b.cantidadTotal - a.cantidadTotal).slice(0, 10)];
    productosUnitariosMensual.value = unitarios.sort((a, b) => b.cantidadTotal - a.cantidadTotal).slice(0, 10);
    productosGranelMensual.value = granel.sort((a, b) => b.cantidadTotal - a.cantidadTotal).slice(0, 10);
    detallesMensual.value = detalles;
  }
}

function getChartData(productos: ProductoVendido[]) {
  if (!productos.length) return { labels: [], datasets: [] };
  const labels = productos.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 17) + '...' : p.nombre);
  const data = productos.map(p => p.cantidadTotal);
  const colors = ['rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)', 'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)', 'rgba(199, 199, 199, 0.8)', 'rgba(83, 102, 255, 0.8)', 'rgba(40, 159, 64, 0.8)', 'rgba(210, 99, 132, 0.8)'];
  const borders = colors.map(c => c.replace('0.8', '1'));
  return { labels, datasets: [{ label: 'Cantidad Vendida', data, backgroundColor: colors, borderColor: borders, borderWidth: 2, borderRadius: 6, borderSkipped: false }] };
}

function getChartOptions(productosList: ProductoVendido[]) {
  const isSmall = windowWidth.value < 600;
  const isMedium = windowWidth.value >= 600 && windowWidth.value < 1024;
  const fontSize = isSmall ? 9 : isMedium ? 10 : 12;
  const textColor = getChartTextColor();
  return {
    indexAxis: 'y' as const, responsive: true, maintainAspectRatio: false,
    layout: { padding: isSmall ? 5 : 10 },
    plugins: {
      legend: { display: false },
      tooltip: {
        titleFont: { size: fontSize + 1 }, bodyFont: { size: fontSize },
        backgroundColor: 'rgba(30, 30, 40, 0.95)', borderColor: 'var(--accent-color)',
        borderWidth: 1, padding: 10, cornerRadius: 8,
        callbacks: { label: (context: any) => {
          const producto = productosList[context.dataIndex];
          if (!producto) return '';
          return [`Cantidad: ${formatearCantidad(producto.cantidadTotal, producto.isGramaje)}`, `Monto: ${formatoMonedaRedondeada(producto.montoTotal)}`];
        }}
      }
    },
    scales: {
      x: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.08)' }, ticks: { color: textColor, font: { size: fontSize } } },
      y: { grid: { display: false }, ticks: { color: textColor, font: { size: fontSize } } }
    }
  };
}

function colorWithOpacity(hex: string, opacity: number): string {
  if (hex.startsWith('#')) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return hex;
}

function getHorarioSlot(hora: number): string {
  if (hora >= 6 && hora < 9) return '06:00 - 09:00';
  if (hora >= 9 && hora < 12) return '09:00 - 12:00';
  if (hora >= 12 && hora < 15) return '12:00 - 15:00';
  if (hora >= 15 && hora < 18) return '15:00 - 18:00';
  if (hora >= 18 && hora < 21) return '18:00 - 21:00';
  return '';
}

// ===== CHARTS: Corte =====

const chartData = computed(() => getChartData(productosMasVendidos.value));
const chartDataUnitarios = computed(() => getChartData(productosUnitarios.value));
const chartDataGranel = computed(() => getChartData(productosGranel.value));

const chartDataCombinado = computed(() => {
  const all = [...productosUnitarios.value, ...productosGranel.value];
  if (!all.length) return { labels: [], datasets: [] };
  const isGramaje = all.map(p => p.isGramaje);
  return { labels: all.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 17) + '...' : p.nombre), datasets: [{ label: 'Cantidad Vendida', data: all.map(p => p.cantidadTotal), backgroundColor: isGramaje.map(g => g ? 'rgba(75, 192, 192, 0.8)' : 'rgba(54, 162, 235, 0.8)'), borderColor: isGramaje.map(g => g ? 'rgb(75, 192, 192)' : 'rgb(54, 162, 235)'), borderWidth: 2, borderRadius: 6, borderSkipped: false }] };
});
const chartOptionsCombinado = computed(() => getChartOptions([...productosUnitarios.value, ...productosGranel.value]));
const chartOptions = computed(() => getChartOptions(productosMasVendidos.value));
const chartOptionsUnitarios = computed(() => getChartOptions(productosUnitarios.value));
const chartOptionsGranel = computed(() => getChartOptions(productosGranel.value));

const cortePieChartData = computed(() => {
  if (!mostrarReporte.value || !corteActual.value) return { labels: [], datasets: [] };
  const efectivo = Number(ventasEfectivo.value || 0);
  const transferencia = Number(ventasTransferencia.value || 0);
  const egresos = Number(corteActual.value.totalEgresos || 0);
  const labels: string[] = []; const data: number[] = []; const colors: string[] = [];
  if (efectivo > 0) { labels.push('Efectivo'); data.push(efectivo); colors.push(colorWithOpacity(getSuccessColor(), 0.8)); }
  if (transferencia > 0) { labels.push('Transferencia'); data.push(transferencia); colors.push('rgba(54, 162, 235, 0.8)'); }
  if (egresos > 0) { labels.push('Egresos'); data.push(egresos); colors.push(colorWithOpacity(getErrorColor(), 0.8)); }
  if (!data.length) return { labels: [], datasets: [] };
  return { labels, datasets: [{ data, backgroundColor: colors, borderColor: colors.map(c => c.replace('0.8', '1')), borderWidth: 2 }] };
});

const cortePieChartOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false, cutout: '55%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(30, 30, 40, 0.95)', borderColor: 'var(--accent-color)', borderWidth: 1, padding: 10, cornerRadius: 8,
      callbacks: { label: (context: any) => `${context.label}: ${formatoMonedaRedondeada(context.raw)}` }
    }
  }
}));

// ===== CHARTS: Daily =====

const chartDataDiarioCombinado = computed(() => {
  const all = [...productosUnitariosDiario.value, ...productosGranelDiario.value];
  if (!all.length) return { labels: [], datasets: [] };
  const isGramaje = all.map(p => p.isGramaje);
  return { labels: all.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 17) + '...' : p.nombre), datasets: [{ label: 'Monto Vendido', data: all.map(p => p.montoTotal), backgroundColor: isGramaje.map(g => g ? 'rgba(75, 192, 192, 0.8)' : 'rgba(54, 162, 235, 0.8)'), borderColor: isGramaje.map(g => g ? 'rgb(75, 192, 192)' : 'rgb(54, 162, 235)'), borderWidth: 2 }] };
});

const chartDataDiarioUnitarios = computed(() => {
  const productos = productosUnitariosDiario.value;
  if (!productos.length) return { labels: [], datasets: [] };
  return { labels: productos.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 17) + '...' : p.nombre), datasets: [{ label: 'Monto Vendido', data: productos.map(p => p.montoTotal), backgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(255, 99, 132, 0.8)', 'rgba(255, 206, 86, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)'], borderColor: ['rgb(54, 162, 235)', 'rgb(255, 99, 132)', 'rgb(255, 206, 86)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)'], borderWidth: 2, borderRadius: 6, borderSkipped: false }] };
});

const chartDataDiarioGranel = computed(() => {
  const productos = productosGranelDiario.value;
  if (!productos.length) return { labels: [], datasets: [] };
  return { labels: productos.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 17) + '...' : p.nombre), datasets: [{ label: 'Monto Vendido', data: productos.map(p => p.montoTotal), backgroundColor: ['rgba(75, 192, 192, 0.8)', 'rgba(255, 99, 132, 0.8)', 'rgba(255, 206, 86, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)'], borderColor: ['rgb(75, 192, 192)', 'rgb(255, 99, 132)', 'rgb(255, 206, 86)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)'], borderWidth: 2, borderRadius: 6, borderSkipped: false }] };
});

const chartOptionsDiarioCombinado = computed(() => getChartOptions([...productosUnitariosDiario.value, ...productosGranelDiario.value]));
const chartOptionsDiarioUnitarios = computed(() => getChartOptions(productosUnitariosDiario.value));
const chartOptionsDiarioGranel = computed(() => getChartOptions(productosGranelDiario.value));
const chartOptionsDiarioDoughnut = computed(() => {
  const textColor = getChartTextColor();
  const isSmall = windowWidth.value < 480;
  const fontSize = isSmall ? 10 : 12;
  return { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' as const, labels: { color: textColor, font: { size: fontSize }, padding: 10 } }, tooltip: { titleFont: { size: fontSize + 1 }, bodyFont: { size: fontSize }, callbacks: { label: (context: any) => { const p = productosDiario.value[context.dataIndex]; return [`Monto: ${formatoMonedaRedondeada(p?.montoTotal || 0)}`, `Cantidad: ${formatearCantidad(p?.cantidadTotal || 0, p?.isGramaje || false)}`]; } } } } };
});

const diarioPieChartData = computed(() => {
  if (!mostrarReporte.value || !corteActual.value) return { labels: [], datasets: [] };
  const efectivo = Number(ventasEfectivo.value || 0);
  const transferencia = Number(ventasTransferencia.value || 0);
  const egresos = Number(corteActual.value.totalEgresos || 0);
  const labels: string[] = []; const data: number[] = []; const colors: string[] = [];
  if (efectivo > 0) { labels.push('Efectivo'); data.push(efectivo); colors.push('rgba(40, 167, 69, 0.8)'); }
  if (transferencia > 0) { labels.push('Transferencia'); data.push(transferencia); colors.push('rgba(54, 162, 235, 0.8)'); }
  if (egresos > 0) { labels.push('Egresos'); data.push(egresos); colors.push('rgba(255, 99, 132, 0.8)'); }
  if (!data.length) return { labels: [], datasets: [] };
  return { labels, datasets: [{ data, backgroundColor: colors, borderColor: colors.map(c => c.replace('0.8', '1')), borderWidth: 2 }] };
});

const diarioPieChartOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: windowWidth.value < 600 ? 'bottom' as const : 'right' as const, labels: { color: getChartTextColor(), padding: windowWidth.value < 600 ? 10 : 15, font: { size: windowWidth.value < 600 ? 10 : 12 }, boxWidth: windowWidth.value < 600 ? 12 : 15 } }, tooltip: { callbacks: { label: (context: any) => `${context.label}: ${formatoMonedaRedondeada(context.raw)}` } } }
}));

const uniqueHorariosDiario = computed(() => {
  if (!detallesDiario.value.length) return [];
  const horarios = new Set<string>();
  for (const d of detallesDiario.value) {
    const v = d.venta || (d as any).Venta;
    if (v?.fechaVenta) { const slot = getHorarioSlot(new Date(v.fechaVenta).getHours()); if (slot) horarios.add(slot); }
  }
  const order = ['06:00 - 09:00', '09:00 - 12:00', '12:00 - 15:00', '15:00 - 18:00', '18:00 - 21:00'];
  return Array.from(horarios).sort((a, b) => order.indexOf(a) - order.indexOf(b));
});

function getDailyProductosPorHorario(horario: string, isGramaje: boolean) {
  const map = new Map<string, { cantidad: number; monto: number }>();
  for (const d of detallesDiario.value) {
    const v = d.venta || (d as any).Venta;
    if (!v?.fechaVenta) continue;
    if (getHorarioSlot(new Date(v.fechaVenta).getHours()) !== horario) continue;
    const tipoPrecio = String(d.tipoPrecioAplicado || '').trim().toUpperCase();
    const prodIsGramaje = tipoPrecio === 'VENTA_GRAMAJE' || d.productoIsGramaje === true;
    if (prodIsGramaje !== isGramaje) continue;
    const nombre = d.productoNombre || 'Producto eliminado';
    const entry = map.get(nombre) || { cantidad: 0, monto: 0 };
    entry.cantidad += Number(d.cantidad || 0);
    entry.monto += prodIsGramaje ? Number(d.precioUnitarioVenta || 0) : Number(d.precioUnitarioVenta || 0) * Number(d.cantidad || 0);
    map.set(nombre, entry);
  }
  return Array.from(map.entries()).map(([nombre, data]) => ({ nombreProducto: nombre, cantidadVendida: data.cantidad, totalVendido: data.monto, isGramaje })).sort((a, b) => b.cantidadVendida - a.cantidadVendida).slice(0, 5);
}

function buildDiarioTimelineChart(isGramaje: boolean) {
  if (uniqueHorariosDiario.value.length === 0) return { labels: [], datasets: [] };
  const topNamesSet = new Set<string>();
  for (const horario of uniqueHorariosDiario.value) { getDailyProductosPorHorario(horario, isGramaje).forEach(p => topNamesSet.add(p.nombreProducto)); }
  const topNames = Array.from(topNamesSet).slice(0, 5);
  if (!topNames.length) return { labels: [], datasets: [] };
  const palette = ['#c99234', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
  return { labels: uniqueHorariosDiario.value, datasets: topNames.map((nombre, idx) => ({ label: nombre.length > 20 ? nombre.slice(0, 17) + '...' : nombre, data: uniqueHorariosDiario.value.map(horario => getDailyProductosPorHorario(horario, isGramaje).find(p => p.nombreProducto === nombre)?.cantidadVendida || 0), backgroundColor: colorWithOpacity(palette[idx % palette.length], 0.8), borderColor: palette[idx % palette.length], borderWidth: 1, borderRadius: 4, borderSkipped: false })) };
}

function getDiarioTimelineOptions(isGramaje: boolean) {
  const isSmall = windowWidth.value < 600;
  const isMedium = windowWidth.value >= 600 && windowWidth.value < 1024;
  const fontSize = isSmall ? 9 : isMedium ? 10 : 12;
  const textColor = getChartTextColor();
  return { responsive: true, maintainAspectRatio: false, layout: { padding: isSmall ? 4 : 8 }, plugins: { legend: { display: true, position: 'bottom' as const, labels: { color: textColor, font: { size: fontSize }, boxWidth: 12, padding: 8 } }, tooltip: { titleFont: { size: fontSize + 1 }, bodyFont: { size: fontSize }, backgroundColor: 'rgba(30, 30, 40, 0.95)', borderColor: 'var(--accent-color)', borderWidth: 1, padding: 10, cornerRadius: 8, callbacks: { label: (context: any) => isGramaje ? ` ${formatearCantidad(context.raw, true)}` : ` ${context.raw} pzs` } } }, scales: { x: { ticks: { color: textColor, font: { size: fontSize } }, grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: !isSmall, text: 'Horario', color: textColor, font: { size: fontSize } } }, y: { beginAtZero: true, ticks: { color: textColor, font: { size: fontSize }, callback: (value: string | number) => isGramaje ? formatearCantidad(Number(value), true) : value }, grid: { color: 'rgba(255,255,255,0.08)' }, title: { display: !isSmall, text: isGramaje ? 'Gramos (g)' : 'Piezas (pzs)', color: textColor, font: { size: fontSize } } } } };
}

// ===== MONTHLY REPORT =====

function calcularSemanasMensual(ventas: Array<{ fechaVenta?: string; totalVenta: number; ganancia: number }>, mes: number, anio: number) {
  const weeks = [1, 2, 3, 4].map((n) => ({ semana: n, ventas: 0, ganancia: 0, dias: '' }));
  const diasPorSemana = [{ inicio: 1, fin: 7 }, { inicio: 8, fin: 14 }, { inicio: 15, fin: 21 }, { inicio: 22, fin: 28 }];
  const ultimoDiaMes = new Date(anio, mes + 1, 0).getDate();
  if (ultimoDiaMes > 28) diasPorSemana[3].fin = ultimoDiaMes;
  for (let i = 0; i < 4; i++) weeks[i].dias = `${diasPorSemana[i].inicio} - ${diasPorSemana[i].fin}`;
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

async function generarReporteMensual() {
  if (!mesMensual.value) { mostrarMensaje('Selecciona un mes para generar el reporte.', 'error'); return; }
  cargandoMensual.value = true;
  try {
    const [year, month] = mesMensual.value.split('-').map(Number);
    const targetMonth = month - 1;
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayDate = new Date(year, month, 0);
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
    const monthlyDetails = await fetchApi<VentaDetalleDTO[]>(`/ventasDetalle/porPeriodo?fechaInicio=${firstDay}&fechaFin=${lastDay}`);
    const salesMap = new Map<number, { fechaVenta?: string; metodoPago?: string; totalVenta: number; totalCosto: number }>();
    for (const d of (monthlyDetails || [])) {
      const v = d.venta || (d as any).Venta;
      const idVenta = Number(v?.idVenta || 0);
      if (!idVenta) continue;
      if (!['C', 'F'].includes(String(v?.estatus || ''))) continue;
      if (!salesMap.has(idVenta)) salesMap.set(idVenta, { fechaVenta: v.fechaVenta, metodoPago: v.metodoPago, totalVenta: Number(v.montoTotal || 0), totalCosto: 0 });
      const sale = salesMap.get(idVenta);
      if (!sale) continue;
      const costoUnidad = Number(d?.productoPrecioCosto || 0);
      const isGramaje = d?.tipoPrecioAplicado === 'VENTA_GRAMAJE' || d?.productoIsGramaje === true;
      const cantidadCosto = isGramaje ? Number(d.cantidad || 0) / 1000 : Number(d.cantidad || 0);
      sale.totalCosto += cantidadCosto * costoUnidad;
    }
    const monthlySales = Array.from(salesMap.values()).map(sale => ({ ...sale, ganancia: sale.totalVenta - sale.totalCosto }));
    mensualTotalVentas.value = monthlySales.reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);
    mensualTotalGanancias.value = monthlySales.reduce((sum, s) => sum + Number(s.ganancia || 0), 0);
    mensualTotalTransferencia.value = monthlySales.filter(s => String(s.metodoPago || '').toUpperCase() === 'TRANSFERENCIA').reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);
    mensualTotalTarjeta.value = monthlySales.filter(s => String(s.metodoPago || '').toUpperCase() === 'TARJETA').reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);
    mensualSemanas.value = calcularSemanasMensual(monthlySales, targetMonth, year);
    calcularProductosReporte(monthlyDetails || [], 'mensual');
    rangoFechasSemanas.value = null;
    mostrarMensaje('Reporte mensual generado.', 'ok');
  } catch (error) {
    mensualTotalVentas.value = 0; mensualTotalGanancias.value = 0; mensualTotalTransferencia.value = 0; mensualTotalTarjeta.value = 0;
    mensualSemanas.value = []; productosMensual.value = []; productosUnitariosMensual.value = []; productosGranelMensual.value = []; detallesMensual.value = [];
    mostrarMensaje(`Error: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally { cargandoMensual.value = false; }
}

async function generarReporteRangoFechas() {
  if (!fechaRangoInicio.value || !fechaRangoFin.value) { mostrarMensaje('Selecciona fecha inicial y final.', 'error'); return; }
  if (new Date(fechaRangoInicio.value) > new Date(fechaRangoFin.value)) { mostrarMensaje('La fecha inicial no puede ser mayor a la final.', 'error'); return; }
  cargandoMensual.value = true;
  try {
    const rangeDetails = await fetchApi<VentaDetalleDTO[]>(`/ventasDetalle/porPeriodo?fechaInicio=${fechaRangoInicio.value}&fechaFin=${fechaRangoFin.value}`);
    const salesMap = new Map<number, { fechaVenta?: string; metodoPago?: string; totalVenta: number; totalCosto: number }>();
    for (const d of (rangeDetails || [])) {
      const v = d.venta || (d as any).Venta;
      const idVenta = Number(v?.idVenta || 0);
      if (!idVenta || !['C', 'F'].includes(String(v?.estatus || ''))) continue;
      if (!salesMap.has(idVenta)) salesMap.set(idVenta, { fechaVenta: v.fechaVenta, metodoPago: v.metodoPago, totalVenta: Number(v.montoTotal || 0), totalCosto: 0 });
      const sale = salesMap.get(idVenta);
      if (!sale) continue;
      const costoUnidad = Number(d?.productoPrecioCosto || 0);
      const isGramaje = d?.tipoPrecioAplicado === 'VENTA_GRAMAJE' || d?.productoIsGramaje === true;
      sale.totalCosto += (isGramaje ? Number(d.cantidad || 0) / 1000 : Number(d.cantidad || 0)) * costoUnidad;
    }
    const rangeSales = Array.from(salesMap.values()).map(sale => ({ ...sale, ganancia: sale.totalVenta - sale.totalCosto }));
    mensualTotalVentas.value = rangeSales.reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);
    mensualTotalGanancias.value = rangeSales.reduce((sum, s) => sum + Number(s.ganancia || 0), 0);
    mensualTotalTransferencia.value = rangeSales.filter(s => String(s.metodoPago || '').toUpperCase() === 'TRANSFERENCIA').reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);
    mensualTotalTarjeta.value = rangeSales.filter(s => String(s.metodoPago || '').toUpperCase() === 'TARJETA').reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);
    const inicio = new Date(fechaRangoInicio.value);
    const fin = new Date(fechaRangoFin.value);
    const diasDiff = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const semanas = Math.ceil(diasDiff / 7);
    rangoFechasSemanas.value = { inicio, fin };
    const semanasMap = new Map<number, { ventas: number; ganancia: number }>();
    for (let i = 0; i < semanas; i++) semanasMap.set(i + 1, { ventas: 0, ganancia: 0 });
    for (const sale of rangeSales) {
      const fechaVenta = new Date(sale.fechaVenta || '');
      if (Number.isNaN(fechaVenta.getTime())) continue;
      const numSemana = Math.floor((fechaVenta.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24) / 7) + 1;
      const semana = semanasMap.get(numSemana);
      if (semana) { semana.ventas += Number(sale.totalVenta || 0); semana.ganancia += Number(sale.ganancia || 0); }
    }
    mensualSemanas.value = Array.from(semanasMap.entries()).map(([num, data]) => ({ semana: num, ventas: data.ventas, ganancia: data.ganancia, dias: '' }));
    calcularProductosReporte(rangeDetails || [], 'mensual');
    mostrarMensaje('Reporte generado.', 'ok');
  } catch (error) {
    mensualTotalVentas.value = 0; mensualTotalGanancias.value = 0; mensualTotalTransferencia.value = 0; mensualTotalTarjeta.value = 0;
    mensualSemanas.value = []; productosMensual.value = []; productosUnitariosMensual.value = []; productosGranelMensual.value = []; detallesMensual.value = [];
    mostrarMensaje(`Error: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally { cargandoMensual.value = false; }
}

const weeklyChartData = computed(() => {
  if (!mensualSemanas.value.length) return { labels: [], datasets: [] };
  const labels = mensualSemanas.value.map(w => `Semana ${w.semana}`);
  const successColor = getSuccessColor();
  const accentColor = getAccentColor();
  return { labels, datasets: [{ label: 'Ventas', data: mensualSemanas.value.map(w => w.ventas), backgroundColor: colorWithOpacity(successColor, 0.8), borderColor: successColor, borderWidth: 2, borderRadius: 6 }, { label: 'Ganancias', data: mensualSemanas.value.map(w => w.ganancia), backgroundColor: colorWithOpacity(accentColor, 0.8), borderColor: accentColor, borderWidth: 2, borderRadius: 6 }] };
});

const weeklyChartOptions = computed(() => {
  const textColor = getChartTextColor();
  const isSmall = windowWidth.value < 480;
  const isMedium = windowWidth.value >= 480 && windowWidth.value < 768;
  const fontSize = isSmall ? 9 : isMedium ? 10 : 12;
  return { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' as const, labels: { color: textColor, font: { size: fontSize }, boxWidth: isSmall ? 10 : isMedium ? 12 : 18, padding: isSmall ? 5 : isMedium ? 10 : 15 } }, tooltip: { titleFont: { size: fontSize + 1 }, bodyFont: { size: fontSize }, callbacks: { label: (context: any) => `${context.dataset.label}: ${formatoMonedaRedondeada(context.raw)}` } } }, scales: { x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: textColor, font: { size: fontSize } } }, y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { callback: (value: any) => formatoMonedaRedondeada(value), color: textColor, font: { size: fontSize - 1 } } } } };
});

// ===== MONTHLY CHARTS =====

const chartDataMensualCombinado = computed(() => {
  const all = [...productosUnitariosMensual.value, ...productosGranelMensual.value];
  if (!all.length) return { labels: [], datasets: [] };
  const isGramaje = all.map(p => p.isGramaje);
  return { labels: all.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 17) + '...' : p.nombre), datasets: [{ label: 'Cantidad Vendida', data: all.map(p => p.cantidadTotal), backgroundColor: isGramaje.map(g => g ? 'rgba(75, 192, 192, 0.8)' : 'rgba(54, 162, 235, 0.8)'), borderColor: isGramaje.map(g => g ? 'rgb(75, 192, 192)' : 'rgb(54, 162, 235)'), borderWidth: 2, borderRadius: 6, borderSkipped: false }] };
});

const chartDataMensualUnitarios = computed(() => {
  const data = getChartData(productosUnitariosMensual.value);
  if (data.datasets.length > 0) { data.datasets[0].backgroundColor[0] = colorWithOpacity(getAccentColor(), 0.8); data.datasets[0].borderColor[0] = getAccentColor(); }
  return data;
});

const chartDataMensualGranel = computed(() => {
  const data = getChartData(productosGranelMensual.value);
  if (data.datasets.length > 0) { data.datasets[0].backgroundColor[0] = colorWithOpacity(getSuccessColor(), 0.8); data.datasets[0].borderColor[0] = getSuccessColor(); }
  return data;
});

const chartOptionsMensualCombinado = computed(() => getChartOptions([...productosUnitariosMensual.value, ...productosGranelMensual.value]));
const chartOptionsMensualUnitarios = computed(() => getChartOptions(productosUnitariosMensual.value));
const chartOptionsMensualGranel = computed(() => getChartOptions(productosGranelMensual.value));

const uniqueHorariosMensual = computed(() => {
  if (!detallesMensual.value.length) return [];
  const horarios = new Set<string>();
  for (const d of detallesMensual.value) {
    const v = d.venta || (d as any).Venta;
    if (v?.fechaVenta) horarios.add(getHorarioSlot(new Date(v.fechaVenta).getHours()));
  }
  const order = ['06:00 - 09:00', '09:00 - 12:00', '12:00 - 15:00', '15:00 - 18:00', '18:00 - 21:00'];
  return Array.from(horarios).sort((a, b) => order.indexOf(a) - order.indexOf(b));
});

function getMonthlyProductosPorHorario(horario: string, isGramaje: boolean) {
  const map = new Map<string, { cantidad: number; monto: number }>();
  for (const d of detallesMensual.value) {
    const v = d.venta || (d as any).Venta;
    if (!v?.fechaVenta || getHorarioSlot(new Date(v.fechaVenta).getHours()) !== horario) continue;
    const tipoPrecio = String(d.tipoPrecioAplicado || '').trim().toUpperCase();
    const prodIsGramaje = tipoPrecio === 'VENTA_GRAMAJE' || d.productoIsGramaje === true;
    if (prodIsGramaje !== isGramaje) continue;
    const nombre = d.productoNombre || 'Producto eliminado';
    const entry = map.get(nombre) || { cantidad: 0, monto: 0 };
    entry.cantidad += Number(d.cantidad || 0);
    entry.monto += prodIsGramaje ? Number(d.precioUnitarioVenta || 0) : Number(d.precioUnitarioVenta || 0) * Number(d.cantidad || 0);
    map.set(nombre, entry);
  }
  return Array.from(map.entries()).map(([nombre, data]) => ({ nombreProducto: nombre, cantidadVendida: data.cantidad, totalVendido: data.monto, isGramaje })).sort((a, b) => b.cantidadVendida - a.cantidadVendida).slice(0, 5);
}

function buildMensualTimelineChart(isGramaje: boolean) {
  if (!uniqueHorariosMensual.value.length) return { labels: [], datasets: [] };
  const topNamesSet = new Set<string>();
  for (const horario of uniqueHorariosMensual.value) { getMonthlyProductosPorHorario(horario, isGramaje).forEach(p => topNamesSet.add(p.nombreProducto)); }
  const topNames = Array.from(topNamesSet).slice(0, 5);
  if (!topNames.length) return { labels: [], datasets: [] };
  const palette = ['#c99234', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
  return { labels: uniqueHorariosMensual.value, datasets: topNames.map((nombre, idx) => ({ label: nombre.length > 20 ? nombre.slice(0, 17) + '...' : nombre, data: uniqueHorariosMensual.value.map(horario => getMonthlyProductosPorHorario(horario, isGramaje).find(p => p.nombreProducto === nombre)?.cantidadVendida || 0), backgroundColor: colorWithOpacity(palette[idx % palette.length], 0.8), borderColor: palette[idx % palette.length], borderWidth: 1, borderRadius: 4, borderSkipped: false })) };
}

function getMensualTimelineOptions(isGramaje: boolean) {
  const isSmall = windowWidth.value < 600;
  const isMedium = windowWidth.value >= 600 && windowWidth.value < 1024;
  const fontSize = isSmall ? 9 : isMedium ? 10 : 12;
  const textColor = getChartTextColor();
  return { responsive: true, maintainAspectRatio: false, layout: { padding: isSmall ? 4 : 8 }, plugins: { legend: { display: true, position: 'bottom' as const, labels: { color: textColor, font: { size: fontSize }, boxWidth: 12, padding: 8 } }, tooltip: { titleFont: { size: fontSize + 1 }, bodyFont: { size: fontSize }, backgroundColor: 'rgba(30, 30, 40, 0.95)', borderColor: 'var(--accent-color)', borderWidth: 1, padding: 10, cornerRadius: 8, callbacks: { label: (context: any) => isGramaje ? ` ${formatearCantidad(context.raw, true)}` : ` ${context.raw} pzs` } } }, scales: { x: { ticks: { color: textColor, font: { size: fontSize } }, grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: !isSmall, text: 'Horario', color: textColor, font: { size: fontSize } } }, y: { beginAtZero: true, ticks: { color: textColor, font: { size: fontSize }, callback: (value: string | number) => isGramaje ? formatearCantidad(Number(value), true) : value }, grid: { color: 'rgba(255,255,255,0.08)' }, title: { display: !isSmall, text: isGramaje ? 'Gramos (g)' : 'Piezas (pzs)', color: textColor, font: { size: fontSize } } } } };
}

// ===== ANNUAL REPORT =====

async function generarReporteAnual() {
  cargandoAnual.value = true;
  try {
    reporteAnualData.value = await fetchApi<ReporteAnualDTO>(`/ventas/reporteAnual/${anioReporte.value}`);
    modalAnualAbierto.value = true;
    mostrarMensaje('Reporte anual cargado.', 'ok');
  } catch (error) {
    reporteAnualData.value = null;
    mostrarMensaje(`Error: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally { cargandoAnual.value = false; }
}

const uniqueHorarios = computed(() => {
  if (!reporteAnualData.value?.productosPorHorario) return [];
  return [...new Set(reporteAnualData.value.productosPorHorario.map(p => p.horario))];
});

function getProductosPorHorario(horario: string, isGramaje: boolean) {
  if (!reporteAnualData.value?.productosPorHorario) return [];
  return reporteAnualData.value.productosPorHorario.filter(p => p.horario === horario && p.isGramaje === isGramaje).sort((a, b) => b.cantidadVendida - a.cantidadVendida).slice(0, 5);
}

function buildHorarioTimelineChart(isGramaje: boolean) {
  if (!reporteAnualData.value?.productosPorHorario || !uniqueHorarios.value.length) return { labels: [], datasets: [] };
  if (!reporteAnualData.value.productosPorHorario.filter(p => p.isGramaje === isGramaje).length) return { labels: [], datasets: [] };
  const topNamesSet = new Set<string>();
  for (const horario of uniqueHorarios.value) { getProductosPorHorario(horario, isGramaje).forEach(p => topNamesSet.add(p.nombreProducto)); }
  const topNames = Array.from(topNamesSet).slice(0, 5);
  if (!topNames.length) return { labels: [], datasets: [] };
  const palette = ['#c99234', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
  return { labels: uniqueHorarios.value, datasets: topNames.map((nombre, idx) => ({ label: nombre.length > 20 ? nombre.slice(0, 17) + '...' : nombre, data: uniqueHorarios.value.map(horario => getProductosPorHorario(horario, isGramaje).find(p => p.nombreProducto === nombre)?.cantidadVendida || 0), backgroundColor: colorWithOpacity(palette[idx % palette.length], 0.8), borderColor: palette[idx % palette.length], borderWidth: 1, borderRadius: 4, borderSkipped: false })) };
}

function getHorarioTimelineOptions(isGramaje: boolean) {
  const isSmall = windowWidth.value < 600;
  const isMedium = windowWidth.value >= 600 && windowWidth.value < 1024;
  const fontSize = isSmall ? 9 : isMedium ? 10 : 12;
  const textColor = getChartTextColor();
  return { responsive: true, maintainAspectRatio: false, layout: { padding: isSmall ? 4 : 8 }, plugins: { legend: { display: true, position: 'bottom' as const, labels: { color: textColor, font: { size: fontSize }, boxWidth: 12, padding: 8 } }, tooltip: { titleFont: { size: fontSize + 1 }, bodyFont: { size: fontSize }, backgroundColor: 'rgba(30, 30, 40, 0.95)', borderColor: 'var(--accent-color)', borderWidth: 1, padding: 10, cornerRadius: 8, callbacks: { label: (context: any) => isGramaje ? ` ${formatearCantidad(context.raw, true)}` : ` ${context.raw} pzs` } } }, scales: { x: { ticks: { color: textColor, font: { size: fontSize } }, grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: !isSmall, text: 'Horario', color: textColor, font: { size: fontSize } } }, y: { beginAtZero: true, ticks: { color: textColor, font: { size: fontSize }, callback: (value: string | number) => isGramaje ? formatearCantidad(Number(value), true) : value }, grid: { color: 'rgba(255,255,255,0.08)' }, title: { display: !isSmall, text: isGramaje ? 'Gramos (g)' : 'Piezas (pzs)', color: textColor, font: { size: fontSize } } } } };
}

const annualMonthlyChartData = computed(() => {
  if (!reporteAnualData.value?.meses) return { labels: [], datasets: [] };
  const labels = reporteAnualData.value.meses.map(m => m.nombreMes);
  const successColor = getSuccessColor();
  const accentColor = getAccentColor();
  return { labels, datasets: [{ label: 'Ventas', data: reporteAnualData.value.meses.map(m => m.ventas), backgroundColor: colorWithOpacity(successColor, 0.8), borderColor: successColor, borderWidth: 2, borderRadius: 6 }, { label: 'Ganancia', data: reporteAnualData.value.meses.map(m => m.ganancia), backgroundColor: colorWithOpacity(accentColor, 0.8), borderColor: accentColor, borderWidth: 2, borderRadius: 6 }] };
});

const annualMonthlyChartOptions = computed(() => {
  const textColor = getChartTextColor();
  const isSmall = windowWidth.value < 480;
  const fontSize = isSmall ? 9 : 11;
  return { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' as const, labels: { color: textColor, font: { size: fontSize }, boxWidth: isSmall ? 12 : 15, padding: isSmall ? 8 : 12 } }, tooltip: { callbacks: { label: (context: any) => `${context.dataset.label}: ${formatoMonedaRedondeada(context.raw)}` } } }, scales: { x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: textColor, font: { size: fontSize - 1 } } }, y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { callback: (value: any) => formatoMonedaRedondeada(value), color: textColor, font: { size: fontSize - 1 } } } } };
});

// ===== CLOSE SHIFT =====

async function cerrarTurno() {
  if (!corteActual.value || !idUsuario.value) { mostrarMensaje('Genera primero un corte de caja.', 'error'); return; }
  cargandoCerrarTurno.value = true;
  try {
    const montoInicialCorte = Number(corteActual.value.montoInicial || 0);
    await fetchApi<CorteDTO>(`/caja/corte?idUsuario=${idUsuario.value}&montoInicial=${montoInicialCorte}`, { method: 'POST' });
    await fetchApi<unknown>('/caja/ventas/status', { method: 'PUT', body: JSON.stringify({ idUsuario: idUsuario.value, startDate: new Date(new Date(corteActual.value.fechaCorte).setHours(0, 0, 0, 0)).toISOString(), endDate: new Date(corteActual.value.fechaCorte).toISOString() }) });
    try { await fetchApi<string>('/corte/cierreTurno', { method: 'POST' }); } catch (e) { console.warn('Backup warning:', e); }
    mostrarMensaje('Turno cerrado con exito. Cerrando sesion...', 'ok');
    localStorage.removeItem('isAuth'); localStorage.removeItem('idUsuario'); localStorage.removeItem('montoInicialCaja'); sessionStorage.clear();
    setTimeout(() => router.push('/'), 1500);
  } catch (error) { mostrarMensaje(`Error al cerrar turno: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error'); }
  finally { cargandoCerrarTurno.value = false; }
}

// ===== HISTORY =====

async function abrirHistorialVentas() {
  modalHistorialAbierto.value = true;
  cargandoHistorial.value = true;
  try {
    historialDetalles.value = await fetchApi<VentaDetalleDTO[]>('/ventasDetalle/obtenerTodosLosVentasDetalles');
    filtroMesHistorial.value = 'all'; filtroDiaHistorial.value = 'all';
  } catch (error) {
    historialDetalles.value = [];
    mostrarMensaje(`Error: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally { cargandoHistorial.value = false; }
}

function abrirDetalleVenta(idVenta: number) {
  const grouped = historialVentasAgrupadas.value.find(x => Number(x.venta.idVenta) === Number(idVenta));
  if (!grouped) return;
  ventaDetalleSeleccionada.value = grouped.venta;
  ventaDetalleItems.value = [...grouped.detalles];
  ventaDetalleMontoEditado.value = Number(grouped.venta.montoTotal ?? 0);
  ventaDetalleEditando.value = false;
  ventaDetalleItemEditando.value = null;
  modalDetalleAbierto.value = true;
}

function iniciarEdicionVentaDetalle() { if (esAdministrador.value) ventaDetalleEditando.value = true; }
function iniciarEdicionSoloTotal() { if (esAdministrador.value) ventaDetalleEditando.value = true; }

async function guardarEdicionVentaDetalle() {
  if (!ventaDetalleSeleccionada.value) return;
  try {
    for (const detalle of ventaDetalleItems.value) {
      const prod = detalle.producto || detalle.Producto;
      await fetchApi<unknown>(`/ventasDetalle/actualizarVentaDetalle/${detalle.idVentaDetalle}`, { method: 'PUT', body: JSON.stringify({ Venta: { idVenta: ventaDetalleSeleccionada.value.idVenta }, Producto: prod ? { idProducto: prod.idProducto } : null, cantidad: Number(detalle.cantidad), precioUnitarioVenta: Number(detalle.precioUnitarioVenta), tipoPrecioAplicado: detalle.tipoPrecioAplicado || 'VENTA' }) });
    }
    await fetchApi<unknown>(`/ventas/actualizarVenta/${ventaDetalleSeleccionada.value.idVenta}`, { method: 'PUT', body: JSON.stringify({ montoTotal: ventaDetalleMontoEditado.value }) });
    mostrarMensaje('Venta actualizada correctamente', 'ok');
    ventaDetalleEditando.value = false;
    modalDetalleAbierto.value = false;
    historialDetalles.value = await fetchApi<VentaDetalleDTO[]>('/ventasDetalle/obtenerTodosLosVentasDetalles');
  } catch (error) { mostrarMensaje('Error al guardar cambios', 'error'); }
}

function cancelarEdicionVentaDetalle() { ventaDetalleEditando.value = false; ventaDetalleItemEditando.value = null; }

function iniciarEditarItemDetalle(index: number) {
  const item = ventaDetalleItems.value[index];
  const prod = item.producto || item.Producto;
  const isGramaje = item.tipoPrecioAplicado === 'VENTA_GRAMAJE' || prod?.is_gramaje === true;
  if (isGramaje) {
    modalProductoGramaje.value = { id: prod?.idProducto || item.idProducto || 0, nombre: prod?.nombre || item.productoNombre || 'Producto de gramaje', precio: prod?.precio_venta || 0, codigo_barras: prod?.codigoBarras || '' };
    gramajeEditandoIndice.value = index;
    gramajeEditandoCantidad.value = Number(item.cantidad);
    gramajeEditandoPrecio.value = Number(item.precioUnitarioVenta);
    modalGramajeAbierto.value = true;
  } else {
    ventaDetalleItemEditando.value = index;
    ventaDetalleCantidadTemp.value = Number(item.cantidad);
    ventaDetallePrecioTemp.value = Number(item.precioUnitarioVenta);
  }
}

function confirmarEdicionGramaje(payload: { gramos: number; precioTotal: number }) {
  if (gramajeEditandoIndice.value === null) return;
  const index = gramajeEditandoIndice.value;
  const item = ventaDetalleItems.value[index];
  item.cantidad = Math.max(1, Math.round(payload.gramos));
  item.precioUnitarioVenta = Math.round(payload.precioTotal * 100) / 100;
  item.tipoPrecioAplicado = 'VENTA_GRAMAJE';
  recalcularTotalDetalle();
  modalGramajeAbierto.value = false;
  modalProductoGramaje.value = null;
  gramajeEditandoIndice.value = null;
  mostrarMensaje(`Actualizado.`, 'ok');
}

function recalcularTotalDetalle() {
  ventaDetalleMontoEditado.value = ventaDetalleItems.value.reduce((sum, d) => {
    return sum + (d.tipoPrecioAplicado === 'VENTA_GRAMAJE' ? Number(d.precioUnitarioVenta) : Math.round(Number(d.cantidad) * Number(d.precioUnitarioVenta) * 100) / 100);
  }, 0);
}

function confirmarEditarItemDetalle(index: number) {
  const item = ventaDetalleItems.value[index];
  item.cantidad = ventaDetalleCantidadTemp.value;
  item.precioUnitarioVenta = Number(ventaDetallePrecioTemp.value.toFixed(2));
  ventaDetalleItemEditando.value = null;
  recalcularTotalDetalle();
}

function cancelarEditarItemDetalle() { ventaDetalleItemEditando.value = null; }

async function eliminarItemDetalle(index: number) {
  const item = ventaDetalleItems.value[index];
  if (!item?.idVentaDetalle) return;
  if (!confirm('¿Eliminar este producto de la venta?')) return;
  try {
    await fetchApi<unknown>(`/ventasDetalle/eliminarVentaDetalle/${item.idVentaDetalle}`, { method: 'DELETE' });
    ventaDetalleItems.value.splice(index, 1);
    recalcularTotalDetalle();
    mostrarMensaje('Producto eliminado', 'ok');
  } catch { mostrarMensaje('Error al eliminar producto', 'error'); }
}

async function corregirVentasHistorial(ids: number[]) {
  if (!ids.length) return;
  corrigiendoHistorial.value = true;
  correccionHistorialMsg.value = '';
  try {
    const res = await fetch(`${API_BASE}/ventasDetalle/corregirDiscrepancias`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idVentas: ids }) });
    const raw = await res.text();
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { correccionHistorialMsg.value = '❌ Respuesta inválida'; return; }
    if (parsed?.codigo === 200) {
      const corregidos = parsed.datos?.filter((r: any) => r.corregido)?.length || 0;
      const fallidos = parsed.datos?.filter((r: any) => !r.corregido)?.length || 0;
      correccionHistorialMsg.value = `✅ ${corregidos} corregidas${fallidos > 0 ? `, ${fallidos} sin cambios` : ''}`;
      ventasHistorialSeleccionadas.value.clear();
      await abrirHistorialVentas();
    } else { correccionHistorialMsg.value = `❌ Error: ${parsed?.mensaje || 'Error desconocido'}`; }
  } catch (e) { correccionHistorialMsg.value = `❌ Error: ${e instanceof Error ? e.message : 'Desconocido'}`; }
  finally { corrigiendoHistorial.value = false; setTimeout(() => { correccionHistorialMsg.value = ''; }, 5000); }
}

function toggleSeleccionHistorial(idVenta: number) {
  if (ventasHistorialSeleccionadas.value.has(idVenta)) ventasHistorialSeleccionadas.value.delete(idVenta);
  else ventasHistorialSeleccionadas.value.add(idVenta);
}

function seleccionarTodasHistorial() {
  const discrepancias = historialFiltrado.value.filter(v => v.venta.tieneDiscrepancia);
  const todasSel = discrepancias.length > 0 && discrepancias.every(v => ventasHistorialSeleccionadas.value.has(v.venta.idVenta));
  if (todasSel) ventasHistorialSeleccionadas.value.clear();
  else discrepancias.forEach(v => ventasHistorialSeleccionadas.value.add(v.venta.idVenta));
}

// ===== EXPENSES / ENTRIES =====

async function abrirModalEgresos() {
  if (!corteActual.value) return;
  const fecha = corteActual.value.fechaCorte.split('T')[0];
  cargandoEgresos.value = true;
  modalEgresosAbierto.value = true;
  try {
    egresosDia.value = (await fetchApi<EgresoDTO[]>(`/caja/egresos/${fecha}`) || []).sort((a, b) => new Date(a.fechaMovimiento).getTime() - new Date(b.fechaMovimiento).getTime());
  } catch { egresosDia.value = []; mostrarMensaje('Error al cargar egresos', 'error'); }
  finally { cargandoEgresos.value = false; }
}

async function abrirModalEntradas() {
  if (!corteActual.value) return;
  const fecha = corteActual.value.fechaCorte.split('T')[0];
  cargandoEntradas.value = true;
  modalEntradasAbierto.value = true;
  try {
    entradasDia.value = (await fetchApi<EgresoDTO[]>(`/caja/entradas/${fecha}`) || []).sort((a, b) => new Date(a.fechaMovimiento).getTime() - new Date(b.fechaMovimiento).getTime());
  } catch { entradasDia.value = []; mostrarMensaje('Error al cargar entradas', 'error'); }
  finally { cargandoEntradas.value = false; }
}

async function registrarSalida(payload: { montoEoS: number; descripcion: string }) {
  try {
    const res = await fetch('/caja/salida', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, idUsuario: idUsuario.value }) });
    if (res.ok) {
      mostrarMensaje("Salida de efectivo registrada correctamente.", "ok");
      modalSalidaAbierto.value = false;
      if (modalEgresosAbierto.value) await abrirModalEgresos();
      if (mostrarReporte.value && !modalDiarioAbierto.value) {
        if (reporteTitulo.value === 'Reporte del Corte Actual') await generarCorte();
        else await generarReporteDiario();
      }
    } else { const err = await res.json(); mostrarMensaje(`Error: ${err.mensaje || 'Error'}`, "error"); }
  } catch { mostrarMensaje("Error de conexión.", "error"); }
}

// ===== APARTADOS =====

async function abrirModalApartados() {
  if (!idUsuario.value) return;
  cargandoApartados.value = true;
  modalApartadosAbierto.value = true;
  try {
    const data = await fetchApi<ApartadoDTO[] | { datos: ApartadoDTO[] }>(`/apartado/activos?idUsuario=${idUsuario.value}`);
    apartadosActivos.value = Array.isArray(data) ? data : (data?.datos || []);
    const totalData = await fetchApi<number | { datos: number }>(`/apartado/totalDiario?idUsuario=${idUsuario.value}`);
    totalApartarDiario.value = typeof totalData === 'number' ? totalData : (totalData?.datos || 0);
  } catch { apartadosActivos.value = []; totalApartarDiario.value = 0; mostrarMensaje('Error al cargar apartados', 'error'); }
  finally { cargandoApartados.value = false; }
}

async function cargarApartadosCompletados() {
  cargandoApartadosCompletados.value = true;
  try {
    const data = await fetchApi<ApartadoDTO[] | { datos: ApartadoDTO[] }>('/apartado/completados');
    apartadosCompletados.value = Array.isArray(data) ? data : (data?.datos || []);
  } catch { apartadosCompletados.value = []; }
  finally { cargandoApartadosCompletados.value = false; }
}

function toggleHistorialCompletados() { cargarApartadosCompletados(); mostrarHistorialCompletados.value = !mostrarHistorialCompletados.value; }

async function crearApartado() {
  if (!idUsuario.value) return;
  if (apartadosActivos.value.length > 0) { mostrarMensaje('Ya tienes un apartado activo.', 'error'); return; }
  if (!nuevoApartado.value.nombreProducto || nuevoApartado.value.montoTotal <= 0) { mostrarMensaje('Completa los datos del apartado', 'error'); return; }
  try {
    await fetchApi<ApartadoDTO>('/apartado', { method: 'POST', body: JSON.stringify({ ...nuevoApartado.value, idUsuario: idUsuario.value }) });
    mostrarMensaje('Apartado creado exitosamente', 'ok');
    nuevoApartado.value = { nombreProducto: '', montoTotal: 0, frecuenciaPago: 'mensual', plazoMeses: 1, fechaInicio: new Date().toISOString().slice(0, 10) };
    await abrirModalApartados();
  } catch { mostrarMensaje('Error al crear apartado', 'error'); }
}

async function pagarApartado(id: number, monto: number) {
  try {
    await fetchApi<ApartadoDTO>(`/apartado/pagar/${id}?monto=${monto}&idUsuario=${idUsuario.value}`, { method: 'PUT' });
    mostrarMensaje('Pago registrado', 'ok');
    await abrirModalApartados();
  } catch { mostrarMensaje('Error al registrar pago', 'error'); }
}

function abrirModalPago(apartado: ApartadoDTO) {
  apartadoParaPago.value = apartado;
  montoPagoCustom.value = apartado.montoDiario;
  errorMontoPago.value = '';
  mostrarModalPago.value = true;
}

function cerrarModalPago() {
  mostrarModalPago.value = false;
  apartadoParaPago.value = null;
  montoPagoCustom.value = 0;
  errorMontoPago.value = '';
}

function validarMontoPago(): boolean {
  if (!apartadoParaPago.value) return false;
  if (montoPagoCustom.value < apartadoParaPago.value.montoDiario) { errorMontoPago.value = `Mínimo: ${formatoMoneda(apartadoParaPago.value.montoDiario)}`; return false; }
  if (montoPagoCustom.value > apartadoParaPago.value.montoRestante) { errorMontoPago.value = `Máximo: ${formatoMoneda(apartadoParaPago.value.montoRestante)}`; return false; }
  errorMontoPago.value = '';
  return true;
}

async function confirmarPagoCustom() {
  if (!apartadoParaPago.value || !validarMontoPago()) return;
  await pagarApartado(apartadoParaPago.value.idApartado, montoPagoCustom.value);
  cerrarModalPago();
}

async function toggleHistorialPagos(idApartado: number) {
  if (mostrarHistorialApartado.value) { mostrarHistorialApartado.value = false; return; }
  cargandoHistorialPagos.value = true;
  try {
    const data = await fetchApi<ApartadoPagoDTO[] | { datos: ApartadoPagoDTO[] }>(`/apartado/historial/${idApartado}`);
    historialPagos.value = Array.isArray(data) ? data : (data?.datos || []);
    mostrarHistorialApartado.value = true;
  } catch { mostrarMensaje('Error al cargar historial', 'error'); }
  finally { cargandoHistorialPagos.value = false; }
}

async function cancelarApartado(id: number) {
  if (!confirm('¿Cancelar este apartado?')) return;
  try {
    await fetchApi<ApartadoDTO>(`/apartado/cancelar/${id}`, { method: 'PUT' });
    mostrarMensaje('Apartado cancelado', 'ok');
    await abrirModalApartados();
  } catch { mostrarMensaje('Error al cancelar apartado', 'error'); }
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

// ===== BACKUP =====

function descargarArchivo(file: string) {
  const link = document.createElement('a');
  link.href = `${API_BASE}/backup/descargar?file=${encodeURIComponent(file)}`;
  link.download = file;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function descargarBackups() {
  try {
    let resp = await fetch(`${API_BASE}/backup/listar`);
    if (!resp.ok) throw new Error('Error al listar backups');
    let data = await resp.json();
    if (data?.datos?.length) {
      const dumpFiles = data.datos.filter((f: string) => f.startsWith('dump-'));
      const minioFiles = data.datos.filter((f: string) => f.startsWith('minio-'));
      if (dumpFiles.length) { descargarArchivo(dumpFiles[0]); await new Promise(r => setTimeout(r, 300)); }
      if (minioFiles.length) descargarArchivo(minioFiles[0]);
      mostrarMensaje(dumpFiles.length ? `Backup descargado: ${dumpFiles[0]}${minioFiles.length ? ' + MinIO' : ''}` : 'Backup MinIO descargado', 'ok');
      return;
    }
    cargandoBackup.value = true;
    mostrarMensaje('No hay backups. Generando uno...', 'info');
    resp = await fetch(`${API_BASE}/backup/generar`, { method: 'POST' });
    if (!resp.ok) throw new Error('Error al generar backup');
    let backupFile: string | null = null;
    const inicio = Date.now();
    while (!backupFile && Date.now() - inicio < 60000) {
      await new Promise(r => setTimeout(r, 3000));
      resp = await fetch(`${API_BASE}/backup/listar`);
      if (resp.ok) { data = await resp.json(); if (data?.datos?.length) backupFile = data.datos[0]; }
    }
    if (backupFile) { descargarArchivo(backupFile); mostrarMensaje(`Backup generado y descargado: ${backupFile}`, 'ok'); }
    else mostrarMensaje('El backup está en proceso. Intenta descargar en unos minutos.', 'info');
  } catch (e) { mostrarMensaje(`Error: ${e instanceof Error ? e.message : 'Error'}`, 'error'); }
  finally { cargandoBackup.value = false; }
}

const MAX_BACKUP_SIZE = 500 * 1024 * 1024; // 500 MB

function validarExtensionBackup(file: File): boolean {
  return file.name.endsWith('.sql') || file.name.endsWith('.dump') || file.name.endsWith('.bak') || file.name.endsWith('.tar.gz') || file.name.endsWith('.tgz');
}

function handleFileSelect(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files || []);
  if (files.length === 0) return;
  const invalid = files.filter(f => !validarExtensionBackup(f));
  if (invalid.length) { mostrarMensaje(`Archivo no válido: ${invalid.map(f => f.name).join(', ')}`, 'error'); return; }
  const big = files.filter(f => f.size > MAX_BACKUP_SIZE);
  if (big.length) { mostrarMensaje(`Archivo excede ${(MAX_BACKUP_SIZE / 1024 / 1024).toFixed(0)} MB: ${big.map(f => f.name).join(', ')}`, 'error'); return; }
  selectedFiles.value = files;
}

function handleFileDrop(event: DragEvent) {
  dragOver.value = false;
  const files = Array.from(event.dataTransfer?.files || []);
  if (files.length === 0) return;
  const invalid = files.filter(f => !validarExtensionBackup(f));
  if (invalid.length) { mostrarMensaje(`Archivo no válido: ${invalid.map(f => f.name).join(', ')}`, 'error'); return; }
  const big = files.filter(f => f.size > MAX_BACKUP_SIZE);
  if (big.length) { mostrarMensaje(`Archivo excede ${(MAX_BACKUP_SIZE / 1024 / 1024).toFixed(0)} MB: ${big.map(f => f.name).join(', ')}`, 'error'); return; }
  selectedFiles.value = files;
}

async function importarBackup() {
  if (selectedFiles.value.length === 0) return;
  cargandoBackup.value = true;
  backupLog.value = [];
  let errors = 0;
  for (const file of selectedFiles.value) {
    const fileName = file.name;
    backupLog.value.push(`Subiendo ${fileName} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', fileName);
      const resp = await fetch(`${API_BASE}/backup/restaurar`, { method: 'POST', body: formData });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        backupLog.value.push(`❌ Servidor respondió ${resp.status}${text ? ': ' + text.slice(0, 300) : ''}`);
        errors++;
        continue;
      }
      const data = await resp.json();
      if (data?.datos) { backupLog.value.push(...data.datos.split('\n').filter((l: string) => l.trim())); }
      if (data?.codigo === 200) {
        backupLog.value.push(`✅ ${fileName} restaurado`);
      } else {
        backupLog.value.push(`❌ ${fileName}: ${data?.mensaje || 'Error'}`);
        errors++;
      }
    } catch (e) {
      backupLog.value.push(`❌ ${fileName}: ${e instanceof Error ? e.message : 'Error'}`);
      errors++;
    }
  }
  if (errors === 0) {
    backupLog.value.push('✅ Todos los archivos restaurados. Recargando...');
    mostrarMensaje('Backups importados correctamente. Recargando...', 'ok');
    setTimeout(() => location.reload(), 3000);
  } else {
    mostrarMensaje(`${errors} de ${selectedFiles.value.length} archivos fallaron. Revisa el log.`, 'error');
  }
  cargandoBackup.value = false;
  selectedFiles.value = [];
}

export {
  idUsuario, nombreUsuario, tipoUsuario, esAdministrador, currentTheme,
  mensaje, mensajeTipo, mostrarMensaje,
  cargandoCorte, cargandoMensual, cargandoHistorial, cargandoCerrarTurno, cargandoAnual,
  mostrarReporte, mostrarCerrarTurno, cargandoBackup, backupLog,
  modalDiarioAbierto, modalMensualAbierto, modalHistorialAbierto, modalDetalleAbierto,
  modalEgresosAbierto, modalSalidaAbierto, modalEntradasAbierto,
  modalApartadosAbierto, modalAnualAbierto, modalSueldoHoraAbierto, modalGramajeAbierto,
  fechaDiaria, mesMensual, fechaRangoInicio, fechaRangoFin, anioReporte,
  corteActual, montoInicialCajaActiva,
  ventasEfectivo, ventasTarjeta, ventasTransferencia, abonoTotalDia,
  totalEnvase, totalTicketsDia, horaInicioCaja, horaFinCaja, reporteTitulo,
  horasTrabajadas, totalSueldoSemanal, dineroApartarDiario,
  usuariosConSueldo, usuariosQueTrabajaronElDia,
  tipoGraficaCorte, tipoGraficaDiaria, tipoGraficaMensual,
  apartadosActivos, apartadosCompletados, cargandoApartados, cargandoApartadosCompletados,
  totalApartarDiario, historialPagos, cargandoHistorialPagos,
  mostrarHistorialApartado, mostrarHistorialCompletados,
  mostrarModalPago, apartadoParaPago, montoPagoCustom, errorMontoPago,
  nuevoApartado,
  mensualTotalVentas, mensualTotalTransferencia, mensualTotalTarjeta,
  mensualTotalGanancias, mensualSemanas, rangoFechasSemanas,
  productosMasVendidos, productosUnitarios, productosGranel,
  productosDiario, productosUnitariosDiario, productosGranelDiario, detallesDiario,
  productosMensual, productosUnitariosMensual, productosGranelMensual, detallesMensual,
  historialDetalles, filtroMesHistorial, filtroDiaHistorial, filtroDiscrepanciaHistorial,
  ventaDetalleSeleccionada, ventaDetalleItems, ventaDetalleEditando, ventaDetalleMontoEditado,
  ventaDetalleItemEditando, ventaDetalleCantidadTemp, ventaDetallePrecioTemp,
  modalProductoGramaje, gramajeEditandoIndice, gramajeEditandoCantidad, gramajeEditandoPrecio,
  ventasHistorialSeleccionadas, corrigiendoHistorial, correccionHistorialMsg,
  ventaDetalleEnvases, ventaDetalleEnvaseTotal,
  egresosDia, entradasDia, cargandoEntradas, cargandoEgresos,
  reporteAnualData, mostrarBackupManager, mostrarImportModal,
  selectedFile, dragOver,
  historialVentasAgrupadas, historialMeses, historialDias, historialFiltrado, historialTotalFiltrado,
  chartData, chartDataUnitarios, chartDataGranel, chartDataCombinado, chartOptionsCombinado,
  chartOptions, chartOptionsUnitarios, chartOptionsGranel,
  cortePieChartData, cortePieChartOptions,
  chartDataDiarioCombinado, chartDataDiarioUnitarios, chartDataDiarioGranel,
  chartOptionsDiarioCombinado, chartOptionsDiarioUnitarios, chartOptionsDiarioGranel,
  chartOptionsDiarioDoughnut, diarioPieChartData, diarioPieChartOptions,
  uniqueHorariosDiario, buildDiarioTimelineChart, getDiarioTimelineOptions,
  chartDataMensualCombinado, chartDataMensualUnitarios, chartDataMensualGranel,
  chartOptionsMensualCombinado, chartOptionsMensualUnitarios, chartOptionsMensualGranel,
  uniqueHorariosMensual, buildMensualTimelineChart, getMensualTimelineOptions,
  weeklyChartData, weeklyChartOptions,
  annualMonthlyChartData, annualMonthlyChartOptions,
  uniqueHorarios, buildHorarioTimelineChart, getHorarioTimelineOptions,
  getZeldaGoldColor, getChartBackgroundColor, getChartTextColor,
  getSuccessColor, getAccentColor, getErrorColor,
  formatoMoneda, formatoMonedaRedondeada, getMetodoClase, getMetodoIcono, formatoFecha, formatearCantidad,
  verificarCajaActiva, generarCorte, generarReporteDiario, recalcularGananciaNeta,
  verificarDiscrepancia, calcularProductosMasVendidos, calcularProductosReporte,
  getChartData, getChartOptions, colorWithOpacity, getHorarioSlot,
  getDailyProductosPorHorario, getMonthlyProductosPorHorario,
  getProductosPorHorario,
  generarReporteMensual, generarReporteRangoFechas,
  generarReporteAnual, cerrarTurno,
  abrirHistorialVentas, abrirDetalleVenta,
  iniciarEdicionVentaDetalle, iniciarEdicionSoloTotal, guardarEdicionVentaDetalle,
  cancelarEdicionVentaDetalle, iniciarEditarItemDetalle, confirmarEdicionGramaje,
  recalcularTotalDetalle, confirmarEditarItemDetalle, cancelarEditarItemDetalle,
  eliminarItemDetalle, corregirVentasHistorial,
  toggleSeleccionHistorial, seleccionarTodasHistorial,
  abrirModalEgresos, abrirModalEntradas, registrarSalida,
  abrirModalApartados, crearApartado, pagarApartado,
  abrirModalPago, cerrarModalPago, validarMontoPago, confirmarPagoCustom,
  toggleHistorialPagos, cancelarApartado, toggleHistorialCompletados,
  getRankIcon, getRankClass,
  descargarBackups, handleFileSelect, handleFileDrop, importarBackup, selectedFiles
};
