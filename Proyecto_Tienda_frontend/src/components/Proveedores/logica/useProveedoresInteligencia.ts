import { ref, computed } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

export type ClasificacionRotacion = 'RAPIDO' | 'MEDIO' | 'LENTO' | 'ATORADO';

export type ProductoRank = {
  idProducto?: number;
  nombre: string;
  cantidadVendida: number;
  totalVendido: number;
  isGramaje: boolean;
  ganancia?: number;
  margen?: number;
  diasSinVenta?: number;
  stock?: number;
  ventaDiaria?: number;
  rotacion?: number;
  categoria?: string;
  proveedor?: string;
  tendencia?: 'up' | 'down' | 'stable';
  precioCosto?: number;
  precioVenta?: number;
  diasInventario?: number;
  clasificacion?: ClasificacionRotacion | null;
  diasCobertura?: number;
  valorInmovilizado?: number;
  motivo?: string;
};

export type RotacionProducto = {
  idProducto: number;
  nombre: string;
  categoria?: string;
  stock: number;
  isGramaje: boolean;
  precioCosto?: number;
  clasificacion?: ClasificacionRotacion | null;
  consumoDiario: number;
  diasCobertura: number;
  diasSinMovimiento: number;
  valorInmovilizado: number;
  coeficienteVariacion: number;
  estable: boolean;
  sinMovimiento: boolean;
  usaFallback: boolean;
  diasHistorial: number;
};

export type EstadoRevision = 'PENDIENTE' | 'EN_REVISION' | 'RESUELTO';

export type MotivoRevision =
  | 'ESTACIONAL'
  | 'SIN_DEMANDA'
  | 'STOCK_FISICO'
  | 'PROVEEDOR'
  | 'DESCONTINUADO'
  | 'OTRO';

export type ItemRevision = {
  idProducto: number;
  nombre: string;
  categoria?: string | null;
  proveedor?: string | null;
  estatus: 'A' | 'I';
  inactivo: boolean;
  stock: number;
  gramaje: boolean;
  /** null = nunca se vendió. */
  diasSinMovimiento: number | null;
  ultimaVenta?: string | null;
  precioCosto?: number;
  valorInmovilizado?: number;
  clasificacion?: ClasificacionRotacion | null;
  sugerencia: string;
  revisionEstado: EstadoRevision;
  revisionMotivo?: MotivoRevision | null;
  revisionNota?: string | null;
  revisionActualizada?: string | null;
};

export type RevisionMeta = {
  diasLimite: number;
  total: number;
  conStock: number;
  sinStock: number;
  inactivos: number;
  pendientes: number;
  valorEnRiesgo: number;
};

const cargando = ref(false);
const error = ref('');
const topVentasGranel = ref<ProductoRank[]>([]);
const topVentasUnitarios = ref<ProductoRank[]>([]);
const bajaRotacion = ref<ProductoRank[]>([]);
const mayorUtilidad = ref<ProductoRank[]>([]);
const sinMovimiento = ref<ProductoRank[]>([]);
const porValidarStock = ref<ProductoRank[]>([]);
const alertas = ref<{ tipo: string; mensaje: string; severidad: 'alta' | 'media' | 'baja' }[]>([]);
const resumenInventario = ref<any>(null);
const ultimaActualizacion = ref('');
const totalVentasGranel = ref(0);
const totalVentasUnitario = ref(0);
const valorRetenidoSinMov = ref(0);
const rotacionProductos = ref<RotacionProducto[]>([]);
const rotacionMeta = ref<{ usaFallback: boolean; diasHistorial: number; diasMinimos: number }>({
  usaFallback: true,
  diasHistorial: 0,
  diasMinimos: 14,
});

/* ---------- revisión de inventario (productos con >60 días sin venta) ---------- */

const revisionItems = ref<ItemRevision[]>([]);
const revisionMeta = ref<RevisionMeta>({
  diasLimite: 60,
  total: 0,
  conStock: 0,
  sinStock: 0,
  inactivos: 0,
  pendientes: 0,
  valorEnRiesgo: 0,
});
const cargandoRevision = ref(false);
const errorRevision = ref('');

const kpiValorInventario = computed(() => {
  return resumenInventario.value?.costoTotal ?? 0;
});

const kpiValorVentaPotencial = computed(() => {
  return resumenInventario.value?.gananciaPot ?? 0;
});

/* ---------- rotación (motor con bitácora) ---------- */

const hayDatosRotacion = computed(() =>
  !rotacionMeta.value.usaFallback && rotacionProductos.value.length > 0
);

const rotacionPorClase = computed(() => {
  const grupos: Record<ClasificacionRotacion, RotacionProducto[]> = {
    RAPIDO: [], MEDIO: [], LENTO: [], ATORADO: [],
  };
  for (const p of rotacionProductos.value) {
    const c = p.clasificacion;
    if (c && grupos[c]) grupos[c].push(p);
  }
  return grupos;
});

const kpiProductosAtorados = computed(() => rotacionPorClase.value.ATORADO.length);

const valorInmovilizadoAtorado = computed(() =>
  rotacionPorClase.value.ATORADO.reduce((s, p) => s + (p.valorInmovilizado || 0), 0)
);

const valorInmovilizadoLento = computed(() =>
  rotacionPorClase.value.LENTO.reduce((s, p) => s + (p.valorInmovilizado || 0), 0)
);

const topVelocidadVenta = computed(() =>
  [...rotacionPorClase.value.RAPIDO, ...rotacionPorClase.value.MEDIO]
    .sort((a, b) => (b.consumoDiario || 0) - (a.consumoDiario || 0))
    .slice(0, 10)
);

/* ---------- grupos de la cola de revisión ---------- */

/** Activos con stock: dinero detenido que todavía se puede recuperar. */
const revisionConStock = computed(() =>
  revisionItems.value.filter(i => !i.inactivo && (i.stock || 0) > 0)
);

/**
 * Activos sin stock. Los inactivos NUNCA entran aquí: tienen su propio grupo
 * para que la notificación de "productos sin stock" no los muestre.
 */
const revisionSinStock = computed(() =>
  revisionItems.value.filter(i => !i.inactivo && (i.stock || 0) <= 0)
);

/** Inactivos (con o sin stock), separados del resto. */
const revisionInactivos = computed(() =>
  revisionItems.value.filter(i => i.inactivo)
);

const revisionPendientes = computed(() =>
  revisionItems.value.filter(i => i.revisionEstado === 'PENDIENTE')
);

function recalcularRevisionMeta() {
  const items = revisionItems.value;
  revisionMeta.value = {
    ...revisionMeta.value,
    total: items.length,
    conStock: revisionConStock.value.length,
    sinStock: revisionSinStock.value.length,
    inactivos: revisionInactivos.value.length,
    pendientes: revisionPendientes.value.length,
    valorEnRiesgo: items.reduce((s, i) => s + (i.valorInmovilizado || 0), 0),
  };
}

function normalizarItemRevision(raw: any): ItemRevision | null {
  const id = Number(raw?.idProducto);
  if (!id || isNaN(id) || !raw?.nombre) return null;
  const estado = String(raw?.revisionEstado || 'PENDIENTE').toUpperCase();
  return {
    idProducto: id,
    nombre: raw.nombre,
    categoria: raw.categoria ?? null,
    proveedor: raw.proveedor ?? null,
    estatus: raw.estatus === 'I' ? 'I' : 'A',
    inactivo: raw.inactivo === true || raw.estatus === 'I',
    stock: Math.max(0, Number(raw.stock || 0)),
    gramaje: raw.gramaje === true,
    diasSinMovimiento: raw.diasSinMovimiento == null ? null : Number(raw.diasSinMovimiento),
    ultimaVenta: raw.ultimaVenta ?? null,
    precioCosto: raw.precioCosto != null ? Number(raw.precioCosto) : 0,
    valorInmovilizado: raw.valorInmovilizado != null ? Number(raw.valorInmovilizado) : 0,
    clasificacion: raw.clasificacion ?? null,
    sugerencia: raw.sugerencia || '',
    revisionEstado: (['PENDIENTE', 'EN_REVISION', 'RESUELTO'].includes(estado) ? estado : 'PENDIENTE') as EstadoRevision,
    revisionMotivo: raw.revisionMotivo ?? null,
    revisionNota: raw.revisionNota ?? null,
    revisionActualizada: raw.revisionActualizada ?? null,
  };
}

function procesarRevision(payload: any) {
  const items = Array.isArray(payload?.items)
    ? (payload.items.map(normalizarItemRevision).filter(Boolean) as ItemRevision[])
    : [];
  revisionItems.value = items;
  revisionMeta.value = {
    diasLimite: Number(payload?.diasLimite || 60),
    total: Number(payload?.total ?? items.length),
    conStock: Number(payload?.conStock ?? items.filter(i => !i.inactivo && i.stock > 0).length),
    sinStock: Number(payload?.sinStock ?? items.filter(i => !i.inactivo && i.stock <= 0).length),
    inactivos: Number(payload?.inactivos ?? items.filter(i => i.inactivo).length),
    pendientes: Number(payload?.pendientes ?? items.filter(i => i.revisionEstado === 'PENDIENTE').length),
    valorEnRiesgo: Number(payload?.valorEnRiesgo || 0),
  };
}

async function cargarRevision(dias = 60) {
  cargandoRevision.value = true;
  errorRevision.value = '';
  try {
    const res = await fetch(`${API_BASE}/inteligencia/revision?dias=${dias}`);
    const data = await res.json();
    if (data?.codigo === 200) {
      procesarRevision(data.datos);
    } else {
      revisionItems.value = [];
      errorRevision.value = data?.mensaje || 'No se pudo cargar la revisión';
    }
  } catch (e) {
    console.error('Error cargando revisión:', e);
    errorRevision.value = 'Error al cargar la revisión de inventario';
  } finally {
    cargandoRevision.value = false;
  }
}

async function actualizarRevision(
  idProducto: number,
  estado: EstadoRevision,
  motivo?: MotivoRevision | null,
  nota?: string | null
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/inteligencia/revision/${idProducto}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, motivo: motivo ?? null, nota: nota ?? null }),
    });
    const data = await res.json();
    if (data?.codigo !== 200) return false;
    const item = revisionItems.value.find(i => i.idProducto === idProducto);
    if (item) {
      item.revisionEstado = (data.datos?.estado || estado) as EstadoRevision;
      item.revisionMotivo = data.datos?.motivo ?? motivo ?? null;
      item.revisionNota = data.datos?.nota ?? nota ?? null;
      item.revisionActualizada = data.datos?.fechaActualizacion ?? null;
      recalcularRevisionMeta();
    }
    return true;
  } catch (e) {
    console.error('Error actualizando revisión:', e);
    return false;
  }
}

async function reiniciarRevision(idProducto: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/inteligencia/revision/${idProducto}`, { method: 'DELETE' });
    const data = await res.json();
    if (data?.codigo !== 200) return false;
    const item = revisionItems.value.find(i => i.idProducto === idProducto);
    if (item) {
      item.revisionEstado = 'PENDIENTE';
      item.revisionMotivo = null;
      item.revisionNota = null;
      item.revisionActualizada = null;
      recalcularRevisionMeta();
    }
    return true;
  } catch (e) {
    console.error('Error reiniciando revisión:', e);
    return false;
  }
}

function formatoMoneda(v: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
}

async function eliminarProducto(idProducto: number): Promise<boolean> {
  try {
    const res = await fetch(API_BASE + '/productos/eliminarProducto/' + idProducto, { method: 'DELETE' });
    const data = await res.json();
    if (data.codigo === 200) {
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error eliminando producto:', e);
    return false;
  }
}

async function vaciarStock(idProducto: number): Promise<boolean> {
  try {
    const res = await fetch(API_BASE + '/productos/vaciarStock/' + idProducto, { method: 'PUT' });
    const data = await res.json();
    if (data.codigo === 200) {
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error vaciando stock:', e);
    return false;
  }
}

async function vaciarStocksLote(ids: number[]): Promise<{ exitosos: number; fallidos: number }> {
  let exitosos = 0;
  let fallidos = 0;
  for (const id of ids) {
    try {
      const ok = await vaciarStock(id);
      if (ok) exitosos++; else fallidos++;
    } catch {
      fallidos++;
    }
  }
  await cargarAnalytics();
  return { exitosos, fallidos };
}

async function eliminarProductosLote(ids: number[]): Promise<{ exitosos: number; fallidos: number }> {
  let exitosos = 0;
  let fallidos = 0;
  for (const id of ids) {
    try {
      const ok = await eliminarProducto(id);
      if (ok) exitosos++; else fallidos++;
    } catch {
      fallidos++;
    }
  }
  await cargarAnalytics();
  return { exitosos, fallidos };
}

const CACHE_TTL = 10 * 60 * 1000;
let cacheReporteAnual: { year: number; ts: number; data: any } | null = null;
let cacheSugerido: { ts: number; data: any } | null = null;

async function cargarAnalytics() {
  cargando.value = true;
  error.value = '';
  ultimaActualizacion.value = new Date().toLocaleTimeString('es-MX');
  try {
    const year = new Date().getFullYear();
    const now = Date.now();

    const reporteAnual = cacheReporteAnual && cacheReporteAnual.year === year && now - cacheReporteAnual.ts < CACHE_TTL
      ? cacheReporteAnual.data
      : await fetch(API_BASE + '/ventas/reporteAnual/' + year).then(r => r.json()).catch(() => ({ datos: null }));
    if (reporteAnual && reporteAnual.codigo === 200) {
      cacheReporteAnual = { year, ts: now, data: reporteAnual };
    }

    const sugerencias = cacheSugerido && now - cacheSugerido.ts < CACHE_TTL
      ? cacheSugerido.data
      : await fetch(API_BASE + '/pedidos-proveedor/sugerido?periodo=mensual&presupuesto=medio').then(r => r.json()).catch(() => ({ datos: [] }));
    if (sugerencias && Array.isArray(sugerencias.datos)) {
      cacheSugerido = { ts: now, data: sugerencias };
    }

    const [resumen, productos, categoriasResp, rotacionResp, revisionResp] = await Promise.all([
      fetch(API_BASE + '/productos/resumen').then(r => r.json()).catch(() => ({ datos: null })),
      fetch(API_BASE + '/productos/listarProductos').then(r => r.json()).catch(() => ({ datos: [] })),
      fetch(API_BASE + '/categorias/listarCategorias').then(r => r.json()).catch(() => ({ datos: [] })),
      fetch(API_BASE + '/inteligencia/rotacion').then(r => r.json()).catch(() => ({ datos: null })),
      fetch(API_BASE + '/inteligencia/revision?dias=60').then(r => r.json()).catch(() => ({ datos: null }))
    ]);

    // --- Cola de revisión (productos con >60 días sin venta) ---
    procesarRevision(revisionResp?.datos ?? null);

    // --- Motor de rotación (puede no estar disponible si el backend aún no se despliega) ---
    const datosRotacion = rotacionResp?.datos ?? null;
    if (datosRotacion && Array.isArray(datosRotacion.productos) && datosRotacion.productos.length > 0) {
      rotacionProductos.value = datosRotacion.productos as RotacionProducto[];
      rotacionMeta.value = {
        usaFallback: !!datosRotacion.usaFallback,
        diasHistorial: Number(datosRotacion.diasHistorial || 0),
        diasMinimos: Number(datosRotacion.diasMinimos || 14),
      };
    } else {
      rotacionProductos.value = [];
      rotacionMeta.value = { usaFallback: true, diasHistorial: 0, diasMinimos: 14 };
    }
    const rotacionMap = new Map<number, RotacionProducto>();
    for (const r of rotacionProductos.value) {
      if (r && r.idProducto) rotacionMap.set(Number(r.idProducto), r);
    }

    const datosAnual = reporteAnual.datos ?? reporteAnual;
    const datosResumen = resumen.datos ?? resumen;
    const datosProductos = (productos.datos ?? productos) as any[];
    const datosSugerencia = (sugerencias.datos ?? sugerencias) as any[];
    const categoriasList = (categoriasResp.datos ?? categoriasResp) as any[];
    const categoriaMap = new Map<number, string>();
    for (const c of categoriasList) {
      const id = Number(c.idCategoria);
      if (!isNaN(id) && id > 0 && c.nombre) {
        categoriaMap.set(id, c.nombre);
      }
    }

    resumenInventario.value = datosResumen;

    // --- Top Ventas Granel ---
    const granel: ProductoRank[] = [];
    const unitario: ProductoRank[] = [];
    const pushItem = (item: any, target: ProductoRank[]) => {
      if (!item || !item.nombreProducto) return;
      target.push({
        nombre: item.nombreProducto,
        cantidadVendida: item.cantidadVendida || 0,
        totalVendido: Number(item.totalVendido || 0),
        isGramaje: item.isGramaje || false,
      });
    };
    if (datosAnual) {
      (datosAnual.topProductosGranel || []).forEach((i: any) => pushItem(i, granel));
      (datosAnual.topProductosUnitarios || []).forEach((i: any) => pushItem(i, unitario));
    }
    granel.sort((a, b) => b.cantidadVendida - a.cantidadVendida);
    unitario.sort((a, b) => b.cantidadVendida - a.cantidadVendida);
    topVentasGranel.value = granel.slice(0, 10);
    topVentasUnitarios.value = unitario.slice(0, 10);
    totalVentasGranel.value = granel.reduce((s, i) => s + i.totalVendido, 0);
    totalVentasUnitario.value = unitario.reduce((s, i) => s + i.totalVendido, 0);

    // --- Mayor Utilidad ---
    const profitList: ProductoRank[] = [];
    for (const p of datosProductos) {
      const costo = Number(p.precio_costo || 0);
      const venta = Number(p.precio_venta || 0);
      const stock = Number(p.stock || 0);
      if (costo > 0 && venta > 0) {
        const margen = ((venta - costo) / costo) * 100;
        profitList.push({
          idProducto: p.idProducto,
          nombre: p.nombre,
          cantidadVendida: 0,
          totalVendido: 0,
          isGramaje: p.is_gramaje || false,
          ganancia: venta - costo,
          margen,
          stock,
          precioCosto: costo,
          precioVenta: venta,
        });
      }
    }
    profitList.sort((a, b) => (b.margen || 0) - (a.margen || 0));
    mayorUtilidad.value = profitList.slice(0, 10);

    // --- Baja Rotación y Sin Movimiento ---
    const slow: ProductoRank[] = [];
    const noMov: ProductoRank[] = [];
    const sugerenciaMap = new Map<number, any>();
    const idProductosVistos = new Set<number>();

    if (datosSugerencia.length > 0 && !('nombreProducto' in datosSugerencia[0])) {
      console.warn('[Inteligencia] sugerencia data missing "nombreProducto". Sample:', datosSugerencia[0]);
    }

    for (const s of datosSugerencia) {
      const sid = Number(s.idProducto);
      if (!isNaN(sid)) sugerenciaMap.set(sid, s);
      const diasRestante = s.diasInventarioRestante;
      const ventaDiaria = s.ventasDiariasPromedio || 0;
      const stock = s.stockActual || 0;
      const rot = rotacionMap.get(sid);

      if ((diasRestante === -1 || diasRestante == null) && stock > 0 && sid > 0) {
        noMov.push({
          idProducto: sid,
          nombre: s.nombreProducto,
          cantidadVendida: 0,
          totalVendido: 0,
          isGramaje: s.isGramaje || false,
          diasSinVenta: 999,
          stock,
          categoria: s.categoria || categoriaMap.get(Number(s.idCategoria)) || '',
          proveedor: s.nombreProveedor,
          ventaDiaria: 0,
          precioCosto: s.precioCosto || 0,
          precioVenta: s.precioVenta || 0,
          clasificacion: rot?.clasificacion ?? null,
          diasCobertura: rot?.diasCobertura,
          valorInmovilizado: rot?.valorInmovilizado,
          motivo: s.motivo,
        });
        idProductosVistos.add(sid);
      }

      if (stock > 0 && ventaDiaria > 0 && stock / ventaDiaria > 60) {
        slow.push({
          idProducto: isNaN(sid) ? undefined : sid,
          nombre: s.nombreProducto,
          cantidadVendida: s.ventasUltimos30Dias || 0,
          totalVendido: 0,
          isGramaje: s.isGramaje || false,
          stock,
          ventaDiaria,
          rotacion: rot?.diasCobertura && rot.diasCobertura >= 0 ? rot.diasCobertura : Math.round(stock / ventaDiaria),
          categoria: s.categoria,
          proveedor: s.nombreProveedor,
          precioCosto: s.precioCosto || 0,
          clasificacion: rot?.clasificacion ?? null,
          diasCobertura: rot?.diasCobertura,
          valorInmovilizado: rot?.valorInmovilizado,
          motivo: s.motivo,
        });
      }
    }

    // Buscar productos con stock que no esten en sugerencia (sin ventas nunca)
    for (const p of datosProductos) {
      const id = Number(p.idProducto);
      if (isNaN(id) || id <= 0 || sugerenciaMap.has(id)) continue;
      const stock = Number(p.stock || 0);
      if (stock > 0) {
        let categoriaNombre = '';
        const idCategoria = Number(p.idCategoria);
        if (!isNaN(idCategoria) && idCategoria > 0) {
          categoriaNombre = categoriaMap.get(idCategoria) || '';
        }

        const precioCosto = Number(p.precio_costo || 0);
        const precioVenta = Number(p.precio_venta || 0);
        const rot = rotacionMap.get(id);

        const item: ProductoRank = {
          idProducto: id,
          nombre: p.nombre,
          cantidadVendida: 0,
          totalVendido: 0,
          isGramaje: p.is_gramaje || false,
          diasSinVenta: rot?.diasSinMovimiento != null && rot.diasSinMovimiento >= 0 ? rot.diasSinMovimiento : 999,
          stock,
          categoria: categoriaNombre,
          precioCosto: precioCosto,
          precioVenta: precioVenta,
          clasificacion: rot?.clasificacion ?? null,
          diasCobertura: rot?.diasCobertura,
          valorInmovilizado: rot?.valorInmovilizado,
        };
        noMov.push(item);
        idProductosVistos.add(id);
      }
    }

    // Filtrar items sin identificador valido
    const noMovValidos = noMov.filter(i => i.idProducto != null && i.idProducto > 0 && !isNaN(i.idProducto as number) && i.nombre);

    slow.sort((a, b) => (b.rotacion || 0) - (a.rotacion || 0));
    bajaRotacion.value = slow.slice(0, 10);
    sinMovimiento.value = noMovValidos.slice(0, 50);
    valorRetenidoSinMov.value = noMovValidos.reduce(
      (s, i) => s + (i.valorInmovilizado ?? (i.stock || 0) * (i.precioCosto || 0)),
      0
    );

    // --- Productos por validar stock: >30 días sin movimiento (o nunca movidos) y con stock ---
    const validarStock = datosProductos.filter((p: any) => {
      const stock = Number(p.stock || 0);
      if (stock <= 0) return false;
      const dias = p.dias_sin_movimiento;
      return dias === null || (typeof dias === 'number' && dias > 30);
    });
    porValidarStock.value = validarStock.map((p: any) => ({
      idProducto: Number(p.idProducto),
      nombre: p.nombre,
      cantidadVendida: 0,
      totalVendido: 0,
      isGramaje: p.is_gramaje || false,
      stock: Number(p.stock || 0),
      diasSinVenta: p.dias_sin_movimiento ?? 999,
      categoria: categoriaMap.get(Number(p.idCategoria)) || '',
      precioCosto: Number(p.precio_costo || 0),
      precioVenta: Number(p.precio_venta || 0),
    }));

    // --- Alertas ---
    const alerts: typeof alertas.value = [];
    if (datosResumen) {
      if (datosResumen.bajoStock > 0) alerts.push({ tipo: 'stock-bajo', mensaje: datosResumen.bajoStock + ' producto(s) con stock por debajo del mínimo', severidad: 'alta' });
      if (datosResumen.productosAgotados > 0 || datosResumen.agotados > 0) {
        const count = datosResumen.productosAgotados || datosResumen.agotados || 0;
        alerts.push({ tipo: 'agotado', mensaje: count + ' producto(s) agotados — considera reordenar urgente', severidad: 'alta' });
      }
    }
    if (porValidarStock.value.length > 0) alerts.push({ tipo: 'validar-stock', mensaje: porValidarStock.value.length + ' producto(s) con más de 30 días sin movimiento pero con stock — valida si el stock es real', severidad: 'media' });
    if (sinMovimiento.value.length > 0) alerts.push({ tipo: 'sin-movimiento', mensaje: sinMovimiento.value.length + ' producto(s) sin ventas en más de 30 días — revisa si deben permanecer en catálogo', severidad: 'media' });
    if (slow.length > 0) alerts.push({ tipo: 'baja-rotacion', mensaje: slow.length + ' producto(s) con más de 60 días de inventario — reduce pedidos futuros', severidad: 'media' });

    // Alertas del motor de rotación
    if (rotacionMeta.value.usaFallback) {
      alerts.push({
        tipo: 'motor-aprendiendo',
        mensaje: 'Motor de rotación en aprendizaje (' + rotacionMeta.value.diasHistorial + '/' + rotacionMeta.value.diasMinimos + ' días de historial) — se usa el cálculo anterior',
        severidad: 'baja',
      });
    } else {
      const atorados = kpiProductosAtorados.value;
      if (atorados > 0) {
        alerts.push({
          tipo: 'atorados',
          mensaje: atorados + ' producto(s) atorados con ' + formatoMoneda(valorInmovilizadoAtorado.value) + ' inmovilizado — el pedido sugerido ya no los incluye',
          severidad: 'media',
        });
      }
      const rapidos = rotacionPorClase.value.RAPIDO.length;
      if (rapidos > 0) {
        alerts.push({
          tipo: 'rotacion-rapida',
          mensaje: rapidos + ' producto(s) de rotación rápida — asegura su reabasto',
          severidad: 'baja',
        });
      }
    }

    try {
      const prov = await fetch(API_BASE + '/pedidos-proveedor/provision-semanal').then(r => r.json());
      const datosProv = prov.datos ?? prov;
      if (Array.isArray(datosProv)) {
        const hoy = datosProv.find((d: any) => (d.fecha || '') === new Date().toISOString().split('T')[0]);
        if (hoy && hoy.montoRequerido > 0) alerts.push({ tipo: 'pago', mensaje: 'Hoy hay ' + formatoMoneda(hoy.montoRequerido) + ' en pedidos por entregar — revisa la caja', severidad: 'media' });
      }
    } catch {}

    alertas.value = alerts;
  } catch (e) {
    console.error('Error cargando analytics:', e);
    error.value = 'Error al cargar datos de inteligencia';
  } finally {
    cargando.value = false;
  }
}

export function useProveedoresInteligencia() {
  return {
    cargando,
    error,
    topVentasGranel,
    topVentasUnitarios,
    totalVentasGranel,
    totalVentasUnitario,
    bajaRotacion,
    mayorUtilidad,
    sinMovimiento,
    porValidarStock,
    alertas,
    resumenInventario,
    ultimaActualizacion,
    cargarAnalytics,
    eliminarProducto,
    eliminarProductosLote,
    vaciarStock,
    vaciarStocksLote,
    formatoMoneda,
    kpiValorInventario,
    kpiValorVentaPotencial,
    valorRetenidoSinMov,
    rotacionProductos,
    rotacionMeta,
    hayDatosRotacion,
    rotacionPorClase,
    topVelocidadVenta,
    kpiProductosAtorados,
    valorInmovilizadoAtorado,
    valorInmovilizadoLento,
    // Revisión de inventario
    revisionItems,
    revisionMeta,
    cargandoRevision,
    errorRevision,
    revisionConStock,
    revisionSinStock,
    revisionInactivos,
    revisionPendientes,
    cargarRevision,
    actualizarRevision,
    reiniciarRevision,
  };
}
