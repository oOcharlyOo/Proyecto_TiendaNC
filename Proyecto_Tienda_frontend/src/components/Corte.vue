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
};

type EgresoDTO = {
  idCaja: number;
  fechaMovimiento: string;
  tipoMovimiento: string;
  monto: number;
  descripcion: string;
  saldoResultante: number;
  estatus: string;
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
const nombreUsuario = ref('Usuario');
const tipoUsuario = ref<number>(Number(localStorage.getItem('tipoUsuario') || 2));
const esAdministrador = computed(() => tipoUsuario.value === 1);
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
const reporteTitulo = ref('Reporte del Corte Actual');

const mensualTotalVentas = ref(0);
const mensualTotalTransferencia = ref(0);
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
      }
    } catch (e) {
      console.error('Error al obtener datos de caja:', e);
    }

    const totalVentas = Number(data?.cobroTotal || 0);
    const saldoFinal = montoInicial + totalVentas + otrosIngresos - totalEgresos;

    if (data?.nombreUsuario) {
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
      .filter((s) => ['TRANSFERENCIA', 'TARJETA'].includes(String(s.metodoPago || '').toUpperCase()))
      .reduce((sum, s) => sum + Number(s.totalVenta || 0), 0);

    mensualSemanas.value = calcularSemanasMensual(monthlySales, targetMonth, year);
    calcularProductosReporte(monthlyDetails || [], 'mensual');
    rangoFechasSemanas.value = null;
    mostrarMensaje('Reporte mensual generado.', 'ok');
  } catch (error) {
    mensualTotalVentas.value = 0;
    mensualTotalGanancias.value = 0;
    mensualTotalTransferencia.value = 0;
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
      .filter((s) => ['TRANSFERENCIA', 'TARJETA'].includes(String(s.metodoPago || '').toUpperCase()))
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
  if (!corteActual.value || !idUsuario.value) return;
  
  const fecha = corteActual.value.fechaCorte.split('T')[0];
  cargandoEgresos.value = true;
  modalEgresosAbierto.value = true;
  
  try {
    const data = await fetchApi<EgresoDTO[]>(`/caja/egresos/${fecha}?idUsuario=${idUsuario.value}`);
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
        <h1>💰 Corte de Caja</h1>
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
      <section class="modal-card panel">
        <button type="button" class="btn-cerrar-modal" @click="modalDiarioAbierto = false">✕</button>
        <h3>📅 Reporte por Día</h3>
        <label>Selecciona fecha</label>
        <input v-model="fechaDiaria" type="date">
        <div class="modal-actions solo-accion">
          <button type="button" @click="generarReporteDiario">
            <span class="btn-icono">📊</span>
            <span class="btn-texto">Generar Reporte</span>
          </button>
        </div>
      </section>
    </div>

    <div v-if="modalMensualAbierto" class="modal-overlay" @click.self="modalMensualAbierto = false">
      <section class="modal-card panel monthly-modal">
        <button type="button" class="btn-cerrar-modal" @click="modalMensualAbierto = false">✕</button>
        <h3>🌙 Reporte Mensual</h3>
        
        <div class="range-section">
          <label>📅 Por Rango de Fechas</label>
          <div class="range-inputs">
            <div class="range-field">
              <span>Desde:</span>
              <input v-model="fechaRangoInicio" type="date">
            </div>
            <div class="range-field">
              <span>Hasta:</span>
              <input v-model="fechaRangoFin" type="date">
            </div>
            <button type="button" :disabled="cargandoMensual" @click="generarReporteRangoFechas">
              <span class="btn-icono">📊</span>
              <span class="btn-texto">{{ cargandoMensual ? 'Generando...' : 'Generar' }}</span>
            </button>
          </div>
        </div>

        <div class="divider">ó</div>

        <label>Selecciona mes</label>
        <div class="monthly-head">
          <input v-model="mesMensual" type="month">
          <button type="button" :disabled="cargandoMensual" @click="generarReporteMensual">
            <span class="btn-icono">📊</span>
            <span class="btn-texto">{{ cargandoMensual ? 'Generando...' : 'Generar' }}</span>
          </button>
        </div>

        <div class="monthly-stats">
          <article><p>Ventas Totales</p><strong>{{ formatoMoneda(mensualTotalVentas) }}</strong></article>
          <article><p>Transferencia</p><strong>{{ formatoMoneda(mensualTotalTransferencia) }}</strong></article>
          <article><p>Ganancias</p><strong>{{ formatoMonedaRedonda(mensualTotalGanancias) }}</strong></article>
        </div>

        <div class="weekly-chart">
          <h4>Rendimiento Semanal</h4>
          <p class="chart-note">Las semanas se cuentan del día 1 al 7 = Semana 1, 8 al 14 = Semana 2, etc.</p>
          <div v-if="mensualSemanas.length === 0" class="empty">Sin datos para el mes seleccionado.</div>
          <div v-else class="chart-container-weekly">
            <Bar :data="weeklyChartData" :options="weeklyChartOptions" />
          </div>
          <div v-if="mensualSemanas.length > 0" class="weekly-summary">
            <div v-for="w in mensualSemanas" :key="`week-${w.semana}`" class="weekly-summary-item">
              <span class="week-label">Semana {{ w.semana }}</span>
              <span class="week-dates">{{ w.dias }}</span>
              <span class="week-sales">Ventas: {{ formatoMoneda(w.ventas) }}</span>
              <span class="week-profit">Ganancia: {{ formatoMonedaRedonda(w.ganancia) }}</span>
            </div>
          </div>
        </div>

        <div v-if="productosUnitariosMensual.length > 0 || productosGranelMensual.length > 0" class="top-products-chart">
          <div class="chart-header-toggle">
            <h4>🏆 Top Productos</h4>
            <div class="toggle-buttons-Zelda">
              <button 
                :class="{ active: tipoGraficaMensual === 'unitario' }" 
                @click="tipoGraficaMensual = 'unitario'"
              >📦 Unitarios</button>
              <button 
                :class="{ active: tipoGraficaMensual === 'gramaje' }" 
                @click="tipoGraficaMensual = 'gramaje'"
              >⚖️ Granel</button>
            </div>
          </div>
          
          <div v-if="tipoGraficaMensual === 'unitario'">
            <div v-if="productosUnitariosMensual.length > 0">
              <div class="chart-container">
                <Bar :data="chartDataMensualUnitarios" :options="chartOptionsMensualUnitarios" />
              </div>
              <div class="product-summary">
                <div v-for="(producto, index) in productosUnitariosMensual" :key="`summary-u-${producto.nombre}`" class="product-summary-item">
                  <span class="summary-rank">{{ index + 1 }}</span>
                  <span class="summary-name" :title="producto.nombre">{{ producto.nombre }}</span>
                  <span class="summary-qty">{{ formatearCantidad(producto.cantidadTotal, producto.isGramaje) }}</span>
                  <span class="summary-amount">{{ formatoMonedaRedondeada(producto.montoTotal) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty">Sin productos unitarios vendidos en este periodo.</div>
          </div>

          <div v-if="tipoGraficaMensual === 'gramaje'">
            <div v-if="productosGranelMensual.length > 0">
              <div class="chart-container">
                <Bar :data="chartDataMensualGranel" :options="chartOptionsMensualGranel" />
              </div>
              <div class="product-summary">
                <div v-for="(producto, index) in productosGranelMensual" :key="`summary-g-${producto.nombre}`" class="product-summary-item">
                  <span class="summary-rank">{{ index + 1 }}</span>
                  <span class="summary-name" :title="producto.nombre">{{ producto.nombre }}</span>
                  <span class="summary-qty">{{ formatearCantidad(producto.cantidadTotal, producto.isGramaje) }}</span>
                  <span class="summary-amount">{{ formatoMonedaRedondeada(producto.montoTotal) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty">Sin productos a granel vendidos en este periodo.</div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="modalHistorialAbierto" class="modal-overlay" @click.self="modalHistorialAbierto = false">
      <section class="modal-card panel history-modal">
        <button type="button" class="btn-cerrar-modal" @click="modalHistorialAbierto = false">✕</button>
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
          <p v-if="cargandoHistorial" class="empty">📡 Cargando historial...</p>
          <p v-else-if="historialFiltrado.length === 0" class="empty">📭 No hay ventas con el filtro actual.</p>

          <article v-else v-for="(v, index) in historialFiltrado" :key="v.venta.idVenta" class="history-item" @click="abrirDetalleVenta(v.venta.idVenta)">
            <div>
              <h4>🎫 #{{ historialFiltrado.length - index }}</h4>
              <p>{{ formatoFecha(v.venta.fechaVenta) }}</p>
            </div>
            <div>
              <strong>{{ formatoMoneda(Number(v.venta.montoTotal || 0)) }}</strong>
              <p class="metodo">{{ v.venta.metodoPago === 'TRANSFERENCIA' ? '📱' : '💵' }} {{ v.venta.metodoPago || 'N/D' }}</p>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div v-if="modalDetalleAbierto && ventaDetalleSeleccionada" class="modal-overlay" @click.self="modalDetalleAbierto = false">
      <section class="modal-card panel detail-modal">
        <button type="button" class="btn-cerrar-modal" @click="modalDetalleAbierto = false">✕</button>
        <h3>🔎 Detalle Venta #{{ ventaDetalleSeleccionada.numeroTicket || ventaDetalleSeleccionada.idVenta }}</h3>

        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">💳 Método</span>
            <span class="value">{{ ventaDetalleSeleccionada.metodoPago || 'N/D' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">📅 Fecha</span>
            <span class="value">{{ formatoFecha(ventaDetalleSeleccionada.fechaVenta) }}</span>
          </div>
          <div class="detail-item total">
            <span class="label">💰 Total</span>
            <span class="value">{{ formatoMoneda(Number(ventaDetalleSeleccionada.montoTotal || 0)) }}</span>
          </div>
        </div>

        <div class="tabla-wrap">
          <table>
            <thead>
              <tr>
                <th>🛒 Producto</th>
                <th>📦 Cant</th>
                <th>💵 P.Unit</th>
                <th>💳 Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in ventaDetalleItems" :key="d.idVentaDetalle">
                <td>{{ d.productoNombre || 'Producto eliminado' }}</td>
                <td>{{ d.cantidad }}{{ d.tipoPrecioAplicado === 'VENTA_GRAMAJE' ? 'g' : 'pza' }}</td>
                <td>{{ formatoMonedaRedondeada(Number(d.precioUnitarioVenta || 0)) }}</td>
                <td class="importe">{{ formatoMonedaRedondeada(Number(d.precioUnitarioVenta || 0) * Number(d.cantidad || 0)) }}</td>
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
          <button class="btn-nueva-salida" @click="modalSalidaAbierto = true">➕ Nueva Salida</button>
        </div>

        <div v-if="cargandoEgresos" class="empty">📡 Cargando egresos...</div>
        <div v-else-if="egresosDia.length === 0" class="empty">📭 No hay egresos para este día.</div>
        
        <div v-else class="history-list">
          <article v-for="(egreso, index) in egresosDia" :key="egreso.idCaja" class="history-item">
            <div>
              <h4>📉 Egreso #{{ index + 1 }}</h4>
              <p>{{ formatoFecha(egreso.fechaMovimiento) }}</p>
              <p class="descripcion">{{ egreso.descripcion || 'Sin descripción' }}</p>
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
        <button type="button" class="btn-cerrar-modal" @click="modalApartadosAbierto = false">✕</button>
        <h3>🏦 Apartados para Inversiones</h3>
        
        <div v-if="apartadosActivos.length === 0" class="apartado-form">
          <h4>➕ Nuevo Apartado</h4>
          <div class="form-grid">
            <input v-model="nuevoApartado.nombreProducto" type="text" placeholder="Producto (ej: Refrigerador)" />
            <input v-model.number="nuevoApartado.montoTotal" type="number" placeholder="Monto total" min="1" />
            <select v-model="nuevoApartado.frecuenciaPago">
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
            </select>
            <input v-model.number="nuevoApartado.plazoMeses" type="number" placeholder="Meses" min="1" />
            <input v-model="nuevoApartado.fechaInicio" type="date" />
          </div>
          <button class="btn-crear" @click="crearApartado">Crear Apartado</button>
        </div>

        <div v-if="apartadosActivos.length > 0" class="apartado-aviso">
          <p>⚠️ Ya tienes un apartado activo. Cancela o completa el actual para crear otro.</p>
        </div>

        <div v-if="cargandoApartados" class="empty">📡 Cargando apartados...</div>
        <div v-else-if="apartadosActivos.length === 0" class="empty">📭 No hay apartados activos.</div>
        
        <div v-else class="apartados-list">
          <div class="apartado-total">
            <span>💰 Total a apartar diariamente:</span>
            <strong>{{ formatoMoneda(totalApartarDiario) }}</strong>
          </div>
          
          <article v-for="apartado in apartadosActivos" :key="apartado.idApartado" class="apartado-item">
            <div class="apartado-info">
              <h4>🏦 {{ apartado.nombreProducto }}</h4>
              <p>📅 {{ apartado.fechaInicio?.slice(0,10) }} al {{ apartado.fechaFin?.slice(0,10) }}</p>
              <p>💵 Apartar: <strong>{{ formatoMoneda(apartado.montoDiario) }}</strong>/día</p>
              <p>📊 Progreso: {{ formatoMoneda(apartado.montoPagado) }} / {{ formatoMoneda(apartado.montoTotal) }}</p>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: (apartado.montoPagado / apartado.montoTotal * 100) + '%' }"></div>
              </div>
            </div>
            <div class="apartado-actions">
              <button class="btn-pagar" @click="pagarApartado(apartado.idApartado, apartado.montoDiario)">Pagar</button>
              <button class="btn-historial" @click="toggleHistorialPagos(apartado.idApartado)">📜</button>
              <button class="btn-cancelar" @click="cancelarApartado(apartado.idApartado)">✕</button>
            </div>
          </article>

          <div v-if="mostrarHistorialApartado" class="historial-pagos">
            <h4>📜 Historial de Pagos</h4>
            <div v-if="cargandoHistorialPagos" class="empty">📡 Cargando...</div>
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
            <h4>📜 Historial de Apartados Completados</h4>
            <div v-if="cargandoApartadosCompletados" class="empty">📡 Cargando...</div>
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
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.estado { font-size: 0.82rem; text-transform: uppercase; }
.estado-ok { color: var(--success-color); }
.estado-error { color: var(--error-color); }
.estado-info { color: var(--accent-color); }

.sign-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.7rem;
}

.sign-grid.solo-corte {
  grid-template-columns: 1fr;
  max-width: 300px;
  margin: 0 auto;
}

.wood-sign {
  border: var(--border-width-thick) solid var(--border-color);
  color: var(--text-primary);
  text-shadow: 1px 1px 0 var(--border-color);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.8rem 0.6rem;
  box-shadow: 0 6px 0 var(--border-color);
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

.wood-sign.btn-icono-only .btn-texto {
  display: inline;
}

.wood-sign.btn-icono-only .btn-icono {
  display: none;
}

.detail-item {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

@media (max-width: 600px) {
  .wood-sign.btn-icono-only .btn-texto {
    display: none;
  }
  
  .wood-sign.btn-icono-only .btn-icono {
    display: inline;
    font-size: 1.5rem;
  }
  
  .wood-sign.btn-icono-only {
    padding: 0.5rem;
    min-width: 50px;
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
}

.modal-card {
  width: min(100%, 520px);
  max-height: 90vh;
  background: var(--bg-panel);
  border: var(--border-width-thick) solid var(--accent-color);
  box-shadow:
    0 0 0 4px var(--border-color),
    0 14px 0 var(--border-color),
    0 20px 28px var(--shadow-color);
  padding: 1.2rem;
  gap: 0.8rem;
  overflow: auto;
  animation: fadeSlideIn 200ms ease-out;
  position: relative;
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
  border: none;
  background: rgba(0, 0, 0, 0.4);
  color: var(--accent-color);
  font-size: 1.2rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms;
  z-index: 10;
}

.btn-cerrar-modal:hover {
  background: var(--error-color);
  color: var(--text-primary);
  transform: rotate(90deg);
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
.history-modal,
.detail-modal {
  width: min(100%, 960px);
  max-height: 88vh;
}

.range-section {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px dashed color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.range-section label {
  display: block;
  font-size: 0.8rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
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
  color: var(--text-primary);
}

.range-field input {
  background: var(--bg-secondary);
  border: var(--border-width) solid var(--border-color);
  padding: 0.4rem;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-size: 0.85rem;
}

.range-inputs button {
  border: var(--border-width) solid var(--border-color);
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  color: var(--text-primary);
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
}

.range-inputs button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

.history-filters select {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  padding: 0.4rem 0.5rem;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-size: 0.8rem;
}

.history-filters strong {
  justify-self: end;
  font-family: "Courier New", monospace;
  color: var(--accent-color);
}

.history-list {
  border: var(--border-width-thick) solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  min-height: 260px;
  max-height: 420px;
  overflow: auto;
  box-shadow: var(--shadow-inner) var(--bg-panel);
}

.history-item {
  padding: 0.7rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  cursor: pointer;
  transition: background 80ms steps(2);
}

.history-item:hover {
  background: color-mix(in srgb, var(--accent-color) 20%, transparent);
}

.history-item h4 {
  font-size: 0.82rem;
  margin: 0;
  color: var(--accent-color);
}

.history-item p {
  font-size: 0.73rem;
  margin: 0;
  color: var(--text-secondary);
}

.history-item strong {
  color: var(--success-color);
  font-family: "Courier New", monospace;
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

.bg-fog {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: 
    radial-gradient(ellipse 90% 60% at 10% 50%, rgba(31, 91, 53, 0.25) 0%, transparent 50%),
    radial-gradient(ellipse 70% 50% at 90% 40%, rgba(31, 91, 53, 0.2) 0%, transparent 50%),
    radial-gradient(ellipse 50% 30% at 50% 90%, rgba(19, 53, 35, 0.3) 0%, transparent 50%);
  animation: bgFogDrift 10s ease-in-out infinite;
}

@keyframes bgFogDrift {
  0% { transform: translateX(-5%) translateY(0) scale(1); }
  50% { transform: translateX(5%) translateY(-5px) scale(1.02); }
  100% { transform: translateX(-5%) translateY(0) scale(1); }
}

.bg-scanlines {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.1;
  background-image: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0 2px, rgba(0, 0, 0, 0.03) 2px 4px);
  animation: bgPulse 0.1s ease-in-out infinite;
}

@keyframes bgPulse {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.25; }
}

.bg-stars {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.bg-star {
  position: absolute;
  width: 6px;
  height: 6px;
  background: radial-gradient(circle, #f8d667 0%, #c79634 50%, #8b6914 80%, transparent 100%);
  border-radius: 50%;
  animation: bgRupeeGlow 2.5s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(248, 214, 103, 0.8);
}

@keyframes bgRupeeGlow {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(248, 214, 103, 0.6)) brightness(1); transform: scale(1); }
  50% { filter: drop-shadow(0 0 12px rgba(248, 214, 103, 1)) brightness(1.3); transform: scale(1.15); }
}

.bg-star:nth-child(1) { top: 8%; left: 15%; animation-delay: 0s; }
.bg-star:nth-child(2) { top: 5%; left: 85%; animation-delay: 0.3s; width: 5px; height: 5px; }
.bg-star:nth-child(3) { top: 20%; left: 8%; animation-delay: 0.6s; }
.bg-star:nth-child(4) { top: 12%; left: 70%; animation-delay: 0.9s; width: 4px; height: 4px; }
.bg-star:nth-child(5) { top: 75%; left: 5%; animation-delay: 1.2s; }
.bg-star:nth-child(6) { top: 88%; left: 20%; animation-delay: 1.5s; width: 5px; height: 5px; }

.bg-particles {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.bg-particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: linear-gradient(135deg, #f8d667, #fff8e0);
  border-radius: 50%;
  animation: bgStarFloat 5s ease-in-out infinite;
  box-shadow: 0 0 6px rgba(248, 214, 103, 0.8);
}

@keyframes bgStarFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
  50% { transform: translateY(-12px) rotate(180deg); opacity: 1; }
}

.bg-particle:nth-child(1) { left: 10%; animation-delay: 0s; animation-duration: 6s; }
.bg-particle:nth-child(2) { left: 25%; animation-delay: 1s; animation-duration: 5s; }
.bg-particle:nth-child(3) { left: 40%; animation-delay: 2s; animation-duration: 7s; }
.bg-particle:nth-child(4) { left: 55%; animation-delay: 0.5s; animation-duration: 5.5s; }

@media (max-width: 600px) {
  .btn-cerrar-modal {
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
  
  .modal-card {
    padding: 1rem;
    max-height: 95vh;
  }
  
  .modal-card h3 {
    font-size: 0.9rem;
    padding-right: 2rem;
  }
  
  .modal-actions {
    display: flex;
    gap: 0.5rem;
  }

  .modal-actions.solo-accion {
    justify-content: center;
  }
  
  .modal-actions button {
    width: 100%;
    justify-content: center;
  }
  
  .history-filters {
    grid-template-columns: 1fr;
  }
  
  .history-list {
    max-height: 50vh;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .tabla-wrap {
    max-height: 50vh;
  }
  
  th, td {
    padding: 0.4rem;
    font-size: 0.7rem;
  }
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

.apartado-aviso p {
  margin: 0;
}

.apartados-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.apartado-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: center;
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

.pago-item:last-child {
  border-bottom: none;
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
</style>
