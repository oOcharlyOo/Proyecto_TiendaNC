<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const AUTH_USER_ID_KEY = 'idUsuario';

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
const modalApartadosAbierto = ref(false);

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

  try {
    const data = await fetchApi<GananciasDTO>(`/ventas/obtenerVentaPorDia/${fechaDiaria.value}`);
    const ventas = Array.isArray(data?.ventas) ? data.ventas : [];

    ventasEfectivo.value = ventas
      .filter((v) => ['EFECTIVO', 'Efectivo'].includes(String(v.metodoPago || '')))
      .reduce((sum, v) => sum + Number(v.montoTotal || 0), 0);

    ventasTransferencia.value = ventas
      .filter((v) => String(v.metodoPago || '').toUpperCase() === 'TRANSFERENCIA')
      .reduce((sum, v) => sum + Number(v.montoTotal || 0), 0);

    // Obtener datos de caja (monto inicial, ingresos, egresos)
    let montoInicial = 0;
    let otrosIngresos = 0;
    let totalEgresos = 0;
    
    if (idUsuario.value) {
      try {
        const cajaData = await fetchApi<any>(`/caja/reporteDiario/${fechaDiaria.value}?idUsuario=${idUsuario.value}`);
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
    }

    const totalVentas = Number(data?.cobroTotal || 0);
    const saldoFinal = montoInicial + totalVentas + otrosIngresos - totalEgresos;

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

    const salesMap = new Map<number, { fechaVenta?: string; metodoPago?: string; totalVenta: number; totalCosto: number }>();

    for (const d of monthlyDetails) {
      const idVenta = Number(d?.Venta?.idVenta || 0);
      if (!idVenta) continue;

      if (!salesMap.has(idVenta)) {
        salesMap.set(idVenta, {
          fechaVenta: d.Venta.fechaVenta,
          metodoPago: d.Venta.metodoPago,
          totalVenta: Number(d.Venta.montoTotal || 0),
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

    mensualSemanas.value = calcularSemanasMensual(monthlySales, targetMonth, year);
    rangoFechasSemanas.value = null;
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
    const allDetails = await fetchApi<VentaDetalleDTO[]>('/ventasDetalle/obtenerTodosLosVentasDetalles');

    const rangeDetails = (allDetails || []).filter((d) => {
      const date = new Date(d?.Venta?.fechaVenta || '');
      if (Number.isNaN(date.getTime())) return false;
      const fechaOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const iniOnly = new Date(fechaIni.getFullYear(), fechaIni.getMonth(), fechaIni.getDate());
      const finOnly = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate());
      return fechaOnly >= iniOnly && fechaOnly <= finOnly && ['C', 'F'].includes(String(d?.Venta?.estatus || ''));
    });

    const salesMap = new Map<number, { fechaVenta?: string; metodoPago?: string; totalVenta: number; totalCosto: number }>();

    for (const d of rangeDetails) {
      const idVenta = Number(d?.Venta?.idVenta || 0);
      if (!idVenta) continue;

      if (!salesMap.has(idVenta)) {
        salesMap.set(idVenta, {
          fechaVenta: d.Venta.fechaVenta,
          metodoPago: d.Venta.metodoPago,
          totalVenta: Number(d.Venta.montoTotal || 0),
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

    mostrarMensaje(`Reporte del ${fechaRangoInicio.value} al ${fechaRangoFin.value} generado.`, 'ok');
  } catch (error) {
    mensualTotalVentas.value = 0;
    mensualTotalGanancias.value = 0;
    mensualTotalTransferencia.value = 0;
    mensualSemanas.value = [];
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
          <article><p>Ganancias</p><strong>{{ formatoMoneda(mensualTotalGanancias) }}</strong></article>
        </div>

        <div class="weekly-chart">
          <h4>Rendimiento Semanal</h4>
          <p class="chart-note">Las semanas se cuentan del día 1 al 7 = Semana 1, 8 al 14 = Semana 2, etc.</p>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-color sales"></span> Ventas</span>
            <span class="legend-item"><span class="legend-color profit"></span> Ganancias</span>
          </div>
          <div v-if="mensualSemanas.length === 0" class="empty">Sin datos para el mes seleccionado.</div>
          <div v-else class="bars-vertical">
            <div v-for="w in mensualSemanas" :key="w.semana" class="bar-column">
              <div class="bar-values">
                <div class="bar-container-indep">
                  <div class="bar-sales-v" :style="{ height: `${getBarHeightVentas(w.ventas)}%` }">
                    <span class="bar-tooltip">{{ formatoMoneda(w.ventas) }}</span>
                  </div>
                </div>
                <div class="bar-container-indep">
                  <div class="bar-profit-v" :style="{ height: `${getBarHeightGanancias(w.ganancia)}%` }">
                    <span class="bar-tooltip">{{ formatoMoneda(w.ganancia) }}</span>
                  </div>
                </div>
              </div>
              <span class="bar-label">S{{ w.semana }}</span>
              <span class="bar-days">{{ w.dias }}</span>
            </div>
          </div>
        </div>

        <div class="modal-actions solo-accion">
          <button type="button" :disabled="cargandoMensual" @click="generarReporteMensual">
            <span class="btn-icono">📊</span>
            <span class="btn-texto">{{ cargandoMensual ? 'Generando...' : 'Generar Reporte' }}</span>
          </button>
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
                <td>{{ formatoMoneda(Number(d.precioUnitarioVenta || 0)) }}</td>
                <td class="importe">{{ formatoMoneda(Number(d.precioUnitarioVenta || 0) * Number(d.cantidad || 0)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div v-if="modalEgresosAbierto" class="modal-overlay" @click.self="modalEgresosAbierto = false">
      <section class="modal-card panel history-modal">
        <button type="button" class="btn-cerrar-modal" @click="modalEgresosAbierto = false">✕</button>
        <h3>📉 Egresos del Día</h3>

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

.sign-grid.solo-corte {
  grid-template-columns: 1fr;
  max-width: 300px;
  margin: 0 auto;
}

.wood-sign {
  border: 3px solid #2a1807;
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

.wood-sign.btn-icono-only .btn-texto {
  display: inline;
}

.wood-sign.btn-icono-only .btn-icono {
  display: none;
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

.card-metric strong.clickable {
  cursor: pointer;
  color: #c94f4f;
  text-decoration: underline;
}

.card-metric strong.clickable:hover {
  color: #e88b8b;
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
  color: #f8d667;
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
  background: #ef4444;
  color: white;
  transform: rotate(90deg);
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

.range-section {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px dashed rgba(248, 214, 103, 0.3);
}

.range-section label {
  display: block;
  font-size: 0.8rem;
  color: var(--pixel-gold);
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
  color: var(--pixel-paper);
}

.range-field input {
  background: #f2e8bf;
  border: 2px solid #2a1807;
  padding: 0.4rem;
  color: #1d1606;
  font-family: "Courier New", monospace;
  font-size: 0.85rem;
}

.range-inputs button {
  border: 2px solid #2a1807;
  background: linear-gradient(180deg, #9fd98a 0%, #5ab848 50%, #3d8a2f 100%);
  color: #0a2008;
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0 0 0 2px #c4e8bc, 0 2px 0 #1a4a12;
}

.range-inputs button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.divider {
  text-align: center;
  color: var(--pixel-paper);
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
  padding: 1rem;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5), 0 3px 0 #1a1005;
  border-radius: 12px;
}

.weekly-chart h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: "Courier New", monospace;
  text-align: center;
  color: #2a1807;
}

.weekly-chart .chart-note {
  font-size: 0.75rem;
  color: #5a4a30;
  text-align: center;
  margin-bottom: 0.5rem;
  font-style: italic;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 0.8rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #2a1807;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 2px solid #2a1807;
}

.legend-color.sales {
  background: linear-gradient(180deg, #28a745 0%, #34ce57 100%);
}

.legend-color.profit {
  background: linear-gradient(180deg, #d4a84b 0%, #e0b85a 100%);
}

.bars-vertical {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 220px;
  padding: 1rem 0.5rem;
  background: rgba(255,255,255,0.5);
  border-radius: 8px;
  border: 2px solid #2a1807;
  overflow: hidden;
}

.bar-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  height: 100%;
}

.bar-values {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 170px;
  width: 100%;
}

.bar-container-indep {
  display: flex;
  align-items: flex-end;
  height: 100%;
}

.bar-sales-v,
.bar-profit-v {
  width: 24px;
  border-radius: 4px 4px 0 0;
  border: 2px solid #2a1807;
  position: relative;
  transition: height 0.3s;
  min-height: 4px;
  bottom: 0;
}

.bar-sales-v {
  background: linear-gradient(180deg, #28a745 0%, #34ce57 100%);
}

.bar-profit-v {
  background: linear-gradient(180deg, #d4a84b 0%, #e0b85a 100%);
}

.bar-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.65rem;
  white-space: nowrap;
  background: #2a1807;
  color: #fff;
  padding: 2px 4px;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.bar-sales-v:hover .bar-tooltip,
.bar-profit-v:hover .bar-tooltip {
  opacity: 1;
}

.bar-label {
  font-size: 0.8rem;
  font-weight: bold;
  color: #2a1807;
}

.bar-days {
  font-size: 0.65rem;
  color: #5a4a30;
  white-space: nowrap;
}

.bars {
  display: grid;
  gap: 0.8rem;
}

.bar-row {
  display: grid;
  grid-template-columns: 50px 1fr auto;
  gap: 0.6rem;
  align-items: center;
  padding: 0.5rem;
  background: rgba(255,255,255,0.5);
  border-radius: 8px;
  border: 2px solid #2a1807;
}

.bar-track {
  position: relative;
  height: 22px;
  background: #e7d897;
  border: 2px solid #bda867;
  overflow: hidden;
  border-radius: 4px;
}

.bar-sales {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, #28a745 0%, #34ce57 100%);
}

.bar-profit {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, #d4a84b 0%, #e0b85a 100%);
  opacity: 0.85;
}

.bar-row small {
  font-size: 0.7rem;
  color: #5a4a30;
  white-space: nowrap;
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

@keyframes bgGradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes bgFogDrift {
  0% { transform: translateX(-5%) translateY(0) scale(1); }
  50% { transform: translateX(5%) translateY(-5px) scale(1.02); }
  100% { transform: translateX(-5%) translateY(0) scale(1); }
}

@keyframes bgPulse {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.25; }
}

@keyframes bgRupeeGlow {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(248, 214, 103, 0.6)) brightness(1); transform: scale(1); }
  50% { filter: drop-shadow(0 0 12px rgba(248, 214, 103, 1)) brightness(1.3); transform: scale(1.15); }
}

@keyframes bgStarFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
  50% { transform: translateY(-12px) rotate(180deg); opacity: 1; }
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

.bg-scanlines {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.1;
  background-image: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0 2px, rgba(0, 0, 0, 0.03) 2px 4px);
  animation: bgPulse 0.1s ease-in-out infinite;
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

.bg-particle:nth-child(1) { left: 10%; animation-delay: 0s; animation-duration: 6s; }
.bg-particle:nth-child(2) { left: 25%; animation-delay: 1s; animation-duration: 5s; }
.bg-particle:nth-child(3) { left: 40%; animation-delay: 2s; animation-duration: 7s; }
.bg-particle:nth-child(4) { left: 55%; animation-delay: 0.5s; animation-duration: 5.5s; }

.corte-layout {
  position: relative;
  z-index: 1;
}

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
  color: #5a4a2a;
  margin-top: 0.2rem;
}

.monto-egreso {
  color: #c94f4f !important;
  font-size: 1rem;
}

.egresos-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  margin-top: 0.5rem;
}

.egresos-total span {
  color: #f6f2de;
  font-size: 0.85rem;
  text-transform: uppercase;
}

.egresos-total strong {
  color: #ffb3b8;
  font-size: 1.1rem;
  font-family: "Courier New", monospace;
}

.apartado-form {
  background: #fdf6e3;
  padding: 1.2rem;
  border-radius: 12px;
  margin-bottom: 1rem;
  border: 3px solid #2a1807;
  box-shadow: inset 0 0 0 2px #d8c37c;
}

.apartado-form h4 {
  margin: 0 0 1rem 0;
  color: #2a1807;
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
  border: 2px solid #2a1807;
  border-radius: 6px;
  background: #fff;
  font-size: 0.9rem;
  width: 100%;
  box-sizing: border-box;
}

.btn-crear {
  margin-top: 1rem;
  width: 100%;
  padding: 0.8rem;
  color: #1d1606;
  border: 2px solid #2a1807;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
  box-shadow: 0 4px 0 #5a4a30;
  transition: all 0.1s;
}

.btn-crear:hover {
  background: linear-gradient(180deg, #e0b85a 0%, #b68a35 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #5a4a30;
}

.btn-crear:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #5a4a30;
}

.apartado-aviso {
  background: linear-gradient(180deg, #fdf6e3 0%, #f5e6c8 100%);
  color: #5a4a30;
  padding: 1rem;
  border-radius: 10px;
  border: 3px solid #2a1807;
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
  background: linear-gradient(180deg, #1e5631 0%, #145224 100%);
  padding: 1rem;
  border-radius: 10px;
  border: 3px solid #28a745;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #fff;
}

.apartado-total strong {
  color: #4ade80;
  font-size: 1.3rem;
}

.apartado-item {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #fdf6e3 0%, #f5e6c8 100%);
  padding: 1rem;
  border-radius: 12px;
  border: 3px solid #2a1807;
  box-shadow: inset 0 0 0 2px #d8c37c;
}

.apartado-info h4 {
  margin: 0 0 0.5rem 0;
  color: #2a1807;
  font-size: 1.2rem;
  text-align: center;
}

.apartado-info p {
  margin: 0.3rem 0;
  font-size: 0.9rem;
  color: #5a4a30;
}

.apartado-info strong {
  color: #2a1807;
}

.progress-bar {
  width: 100%;
  height: 14px;
  background: #ddd;
  border-radius: 7px;
  margin-top: 0.6rem;
  overflow: hidden;
  border: 2px solid #2a1807;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745 0%, #34ce57 100%);
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
  background: linear-gradient(180deg, #28a745 0%, #1e7e34 100%);
  color: white;
  border: 2px solid #2a1807;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 3px 0 #155724;
}

.btn-pagar:hover {
  background: linear-gradient(180deg, #34ce57 0%, #28a745 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 0 #155724;
}

.historial-pagos {
  background: linear-gradient(180deg, #fdf6e3 0%, #f5e6c8 100%);
  border: 3px solid #2a1807;
  border-radius: 12px;
  padding: 1.2rem;
  margin-top: 1rem;
  box-shadow: inset 0 0 0 2px #d8c37c;
}

.historial-pagos h4 {
  margin: 0 0 1rem 0;
  color: #2a1807;
  text-align: center;
  font-size: 1.1rem;
}

.pagos-list {
  max-height: 250px;
  overflow-y: auto;
  background: #fff;
  border-radius: 8px;
  border: 2px solid #2a1807;
}

.pago-item {
  display: flex;
  justify-content: space-between;
  padding: 0.7rem 1rem;
  border-bottom: 2px solid #d8c37c;
}

.pago-item:last-child {
  border-bottom: none;
}

.pago-item span:first-child {
  color: #5a4a30;
  font-weight: bold;
}

.pago-item span:last-child {
  color: #28a745;
  font-weight: bold;
  font-size: 1.1rem;
}

.btn-cerrar-historial {
  margin-top: 1rem;
  width: 100%;
  padding: 0.7rem;
  color: white;
  border: 2px solid #2a1807;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 3px 0 #1d1606;
}

.btn-cerrar-historial:hover {
  background: linear-gradient(180deg, #7c858d 0%, #6c757d 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 0 #1d1606;
}
</style>
