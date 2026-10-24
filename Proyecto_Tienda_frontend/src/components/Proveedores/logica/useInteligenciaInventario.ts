import { ref, computed } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type Clasificacion =
  | 'RAPIDO'
  | 'MEDIO'
  | 'LENTO'
  | 'ATORADO'
  | 'AGOTADO'
  | 'SIN_DATOS'
  | 'INACTIVO';

export type Abc = 'A' | 'B' | 'C' | 'SIN_VENTAS';

export type EstadoRevision = 'PENDIENTE' | 'EN_REVISION' | 'RESUELTO';

export type MotivoRevision =
  | 'ESTACIONAL'
  | 'SIN_DEMANDA'
  | 'STOCK_FISICO'
  | 'PROVEEDOR'
  | 'DESCONTINUADO'
  | 'OTRO';

export type Regla = {
  codigo: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  formula?: string | null;
  umbral?: string | null;
};

export type ProductoInteligencia = {
  idProducto: number;
  nombre: string;
  categoria?: string | null;
  proveedor?: string | null;
  estatus: 'A' | 'I';
  inactivo: boolean;
  gramaje: boolean;
  stock: number;
  precioCosto: number;
  precioVenta: number;
  cantidadMin: number;
  cantidadMax: number;
  valorInmovilizado: number;
  valorVentaPotencial: number;
  ventas7d: number;
  ventas30d: number;
  ventas84d: number;
  diasConVenta: number;
  ultimaSalida?: string | null;
  diasSinMovimiento?: number | null;
  consumoDiario: number;
  consumoDiarioSimple: number;
  diasCobertura: number;
  coeficienteVariacion: number;
  estable: boolean;
  clasificacion: Clasificacion;
  clasificacionLabel: string;
  motivo: string;
  recomendacion: string;
  abc: Abc;
  ventasValor: number;
  participacionVentas: number;
  participacionAcumulada: number;
  enRevision: boolean;
  grupoRevision?: 'CON_STOCK' | 'SIN_STOCK' | 'INACTIVO' | null;
  revisionEstado: EstadoRevision;
  revisionMotivo?: MotivoRevision | null;
  revisionNota?: string | null;
  revisionActualizada?: string | null;
  usaFallback: boolean;
  diasHistorial: number;
};

export type ResumenInteligencia = {
  totalProductos: number;
  activos: number;
  inactivos: number;
  conStock: number;
  sinStock: number;
  valorInventario: number;
  valorVentaPotencial: number;
  ventasValorVentana: number;
  productosConVentas: number;
  productosSinVentas: number;
  rapidos: number;
  medios: number;
  lentos: number;
  atorados: number;
  agotados: number;
  sinDatos: number;
  revisionTotal: number;
  revisionConStock: number;
  revisionSinStock: number;
  revisionInactivos: number;
  revisionPendientes: number;
  valorEnRiesgo: number;
  productosSinCosto: number;
  productosSinPrecioVenta: number;
  productosSinCategoria: number;
  productosSinProveedor: number;
  productosStockNegativo: number;
  inactivosConStock: number;
  coberturaPromedio: number;
  totalEventos: number;
  totalSalidas: number;
  totalEntradas: number;
};

export type CalidadItem = {
  codigo: string;
  titulo: string;
  descripcion: string;
  cantidad: number;
  severidad: 'ALTA' | 'MEDIA' | 'BAJA';
  ejemplos: string[];
};

export type MovimientoTipo = {
  tipo: string;
  etiqueta: string;
  descripcion: string;
  total: number;
  salidas: number;
  entradas: number;
  primeraFecha?: string | null;
  ultimaFecha?: string | null;
};

export type Recomendacion = {
  codigo: string;
  titulo: string;
  detalle: string;
  accion: string;
  severidad: 'ALTA' | 'MEDIA' | 'BAJA';
  impacto: number;
  productos: number;
};

export type InteligenciaInventario = {
  generadoEn: string;
  ventanaDias: number;
  diasHistorial: number;
  diasMinimos: number;
  historialSuficiente: boolean;
  diasRevision: number;
  resumen: ResumenInteligencia;
  reglas: Regla[];
  productos: ProductoInteligencia[];
  calidad: CalidadItem[];
  movimientos: MovimientoTipo[];
  recomendaciones: Recomendacion[];
};

/* ------------------------------------------------------------------ */
/* Estado compartido (la pantalla vive en 3 lugares)                   */
/* ------------------------------------------------------------------ */

const CACHE_MS = 60_000;

const cargando = ref(false);
const error = ref('');
const reporte = ref<InteligenciaInventario | null>(null);
const ultimaActualizacion = ref('');
const diasRevision = ref(60);

let ultimaCarga = 0;
let cargaEnCurso: Promise<void> | null = null;

const resumenVacio = (): ResumenInteligencia => ({
  totalProductos: 0,
  activos: 0,
  inactivos: 0,
  conStock: 0,
  sinStock: 0,
  valorInventario: 0,
  valorVentaPotencial: 0,
  ventasValorVentana: 0,
  productosConVentas: 0,
  productosSinVentas: 0,
  rapidos: 0,
  medios: 0,
  lentos: 0,
  atorados: 0,
  agotados: 0,
  sinDatos: 0,
  revisionTotal: 0,
  revisionConStock: 0,
  revisionSinStock: 0,
  revisionInactivos: 0,
  revisionPendientes: 0,
  valorEnRiesgo: 0,
  productosSinCosto: 0,
  productosSinPrecioVenta: 0,
  productosSinCategoria: 0,
  productosSinProveedor: 0,
  productosStockNegativo: 0,
  inactivosConStock: 0,
  coberturaPromedio: 0,
  totalEventos: 0,
  totalSalidas: 0,
  totalEntradas: 0,
});

const productos = computed<ProductoInteligencia[]>(() => reporte.value?.productos ?? []);
const resumen = computed<ResumenInteligencia>(() => reporte.value?.resumen ?? resumenVacio());
const reglas = computed<Regla[]>(() => reporte.value?.reglas ?? []);
const calidad = computed<CalidadItem[]>(() => reporte.value?.calidad ?? []);
const movimientos = computed<MovimientoTipo[]>(() => reporte.value?.movimientos ?? []);
const recomendaciones = computed<Recomendacion[]>(() => reporte.value?.recomendaciones ?? []);

const revisionItems = computed(() => productos.value.filter(p => p.enRevision));
const revisionConStock = computed(() =>
  revisionItems.value.filter(p => p.grupoRevision === 'CON_STOCK')
);
const revisionSinStock = computed(() =>
  revisionItems.value.filter(p => p.grupoRevision === 'SIN_STOCK')
);
const revisionInactivos = computed(() =>
  revisionItems.value.filter(p => p.grupoRevision === 'INACTIVO')
);

/* ------------------------------------------------------------------ */
/* Carga                                                               */
/* ------------------------------------------------------------------ */

async function cargar(dias = 60, forzar = false): Promise<void> {
  const limite = Number.isFinite(dias) && dias > 0 ? Math.round(dias) : 60;

  if (
    !forzar &&
    reporte.value &&
    reporte.value.diasRevision === limite &&
    Date.now() - ultimaCarga < CACHE_MS
  ) {
    return;
  }
  if (cargaEnCurso) return cargaEnCurso;

  cargando.value = true;
  error.value = '';
  cargaEnCurso = (async () => {
    try {
      const res = await fetch(`${API_BASE}/inteligencia/inventario?dias=${limite}`);
      const data = await res.json();
      if (data?.codigo === 200 && data?.datos) {
        reporte.value = data.datos as InteligenciaInventario;
        diasRevision.value = Number(data.datos.diasRevision || limite);
        ultimaCarga = Date.now();
        ultimaActualizacion.value = new Date().toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        });
      } else {
        error.value = data?.mensaje || 'No se pudo cargar la inteligencia de inventario';
      }
    } catch (e) {
      console.error('Error cargando inteligencia:', e);
      error.value = 'Error al cargar la inteligencia de inventario';
    } finally {
      cargando.value = false;
      cargaEnCurso = null;
    }
  })();

  return cargaEnCurso;
}

/* ------------------------------------------------------------------ */
/* Decisiones de revisión                                              */
/* ------------------------------------------------------------------ */

async function guardarRevision(item: ProductoInteligencia): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/inteligencia/revision/${item.idProducto}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado: item.revisionEstado,
        motivo: item.revisionMotivo ?? null,
        nota: item.revisionNota ?? null,
      }),
    });
    const data = await res.json();
    if (data?.codigo !== 200) return false;
    if (data.datos) {
      item.revisionEstado = (data.datos.estado || item.revisionEstado) as EstadoRevision;
      item.revisionMotivo = (data.datos.motivo ?? item.revisionMotivo) as MotivoRevision | null;
      item.revisionNota = data.datos.nota ?? item.revisionNota;
      item.revisionActualizada = data.datos.fechaActualizacion ?? item.revisionActualizada;
    }
    return true;
  } catch (e) {
    console.error('Error guardando revisión:', e);
    return false;
  }
}

async function reiniciarRevision(item: ProductoInteligencia): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/inteligencia/revision/${item.idProducto}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data?.codigo !== 200) return false;
    item.revisionEstado = 'PENDIENTE';
    item.revisionMotivo = null;
    item.revisionNota = null;
    item.revisionActualizada = null;
    return true;
  } catch (e) {
    console.error('Error reiniciando revisión:', e);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Formato                                                             */
/* ------------------------------------------------------------------ */

function formatoMoneda(valor: number | null | undefined): string {
  const numero = Number(valor ?? 0);
  if (!Number.isFinite(numero)) return '$0.00';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(numero);
}

function formatoNumero(valor: number | null | undefined, decimales = 2): string {
  const numero = Number(valor ?? 0);
  if (!Number.isFinite(numero)) return '0';
  return new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: decimales,
    minimumFractionDigits: 0,
  }).format(numero);
}

function formatoPorcentaje(valor: number | null | undefined): string {
  const numero = Number(valor ?? 0);
  if (!Number.isFinite(numero)) return '0%';
  return `${formatoNumero(numero, 2)}%`;
}

/**
 * Formatea una cantidad con su unidad real.
 *
 * En gramaje el stock y las ventas vienen en gramos, pero el precio está por
 * kilogramo. Para que la pantalla no mezcle unidades, mostramos g o kg según
 * el tamaño; para productos normales mostramos piezas.
 */
function formatoCantidad(
  valor: number | null | undefined,
  gramaje = false,
  decimales = 0,
): string {
  const numero = Number(valor ?? 0);
  if (!Number.isFinite(numero)) return gramaje ? '0 g' : '0 u';
  if (!gramaje) return `${formatoNumero(numero, decimales)} u`;
  if (Math.abs(numero) >= 1000) {
    return `${formatoNumero(numero / 1000, Math.max(2, decimales))} kg`;
  }
  return `${formatoNumero(numero, decimales)} g`;
}

/** Precio con la unidad en la que está capturado: por kg o por pieza. */
function formatoPrecioUnitario(
  valor: number | null | undefined,
  gramaje = false,
): string {
  return `${formatoMoneda(valor)}/${gramaje ? 'kg' : 'ud'}`;
}

function formatoFecha(valor?: string | null): string {
  if (!valor) return '—';
  const texto = valor.length <= 10 ? `${valor}T00:00:00` : valor;
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

export function useInteligenciaInventario() {
  return {
    cargando,
    error,
    reporte,
    ultimaActualizacion,
    diasRevision,
    productos,
    resumen,
    reglas,
    calidad,
    movimientos,
    recomendaciones,
    revisionItems,
    revisionConStock,
    revisionSinStock,
    revisionInactivos,
    cargar,
    guardarRevision,
    reiniciarRevision,
    formatoMoneda,
    formatoNumero,
    formatoPorcentaje,
    formatoCantidad,
    formatoPrecioUnitario,
    formatoFecha,
  };
}
