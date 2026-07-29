import { ref, computed } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

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
};

const cargando = ref(false);
const error = ref('');
const topVentasGranel = ref<ProductoRank[]>([]);
const topVentasUnitarios = ref<ProductoRank[]>([]);
const bajaRotacion = ref<ProductoRank[]>([]);
const mayorUtilidad = ref<ProductoRank[]>([]);
const sinMovimiento = ref<ProductoRank[]>([]);
const alertas = ref<{ tipo: string; mensaje: string; severidad: 'alta' | 'media' | 'baja' }[]>([]);
const resumenInventario = ref<any>(null);
const ultimaActualizacion = ref('');
const totalVentasGranel = ref(0);
const totalVentasUnitario = ref(0);
const valorRetenidoSinMov = ref(0);

const kpiValorInventario = computed(() => {
  return resumenInventario.value?.costoTotal ?? 0;
});

const kpiValorVentaPotencial = computed(() => {
  return resumenInventario.value?.gananciaPot ?? 0;
});

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

async function cargarAnalytics() {
  cargando.value = true;
  error.value = '';
  ultimaActualizacion.value = new Date().toLocaleTimeString('es-MX');
  try {
    const year = new Date().getFullYear();

    const [reporteAnual, resumen, productos, sugerencias, categoriasResp] = await Promise.all([
      fetch(API_BASE + '/ventas/reporteAnual/' + year).then(r => r.json()).catch(() => ({ datos: null })),
      fetch(API_BASE + '/productos/resumen').then(r => r.json()).catch(() => ({ datos: null })),
      fetch(API_BASE + '/productos/listarProductos').then(r => r.json()).catch(() => ({ datos: [] })),
      fetch(API_BASE + '/pedidos-proveedor/sugerido?periodo=mensual&presupuesto=medio').then(r => r.json()).catch(() => ({ datos: [] })),
      fetch(API_BASE + '/categorias/listarCategorias').then(r => r.json()).catch(() => ({ datos: [] }))
    ]);

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
    
    // Debug: log de categorías cargadas
    console.log('[Inteligencia] Respuesta categorías:', categoriasResp);
    console.log('[Inteligencia] Lista categorías:', categoriasList);
    console.log('[Inteligencia] Tamaño categoriaMap:', categoriaMap.size);
    if (categoriaMap.size === 0) {
      console.warn('[Inteligencia] No se cargaron categorías. Respuesta:', categoriasResp);
    } else {
      console.log('[Inteligencia] Categorías cargadas:', categoriaMap.size, Array.from(categoriaMap.entries()).slice(0, 5));
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
          rotacion: Math.round(stock / ventaDiaria),
          categoria: s.categoria,
          proveedor: s.nombreProveedor,
          precioCosto: s.precioCosto || 0,
        });
      }
    }

    // Buscar productos con stock que no esten en sugerencia (sin ventas nunca)
    let productosSinCategoria = 0;
    let productosSinPrecio = 0;
    let productosProcesados = 0;
    
    for (const p of datosProductos) {
      const id = Number(p.idProducto);
      if (isNaN(id) || id <= 0 || sugerenciaMap.has(id)) continue;
      const stock = Number(p.stock || 0);
      if (stock > 0) {
        productosProcesados++;
        // Resolver categoría con fallback inteligente
        let categoriaNombre = '';
        const idCategoria = Number(p.idCategoria);
        if (!isNaN(idCategoria) && idCategoria > 0) {
          categoriaNombre = categoriaMap.get(idCategoria) || '';
          if (!categoriaNombre) {
            productosSinCategoria++;
            if (productosSinCategoria <= 3) {
              console.warn(`[Inteligencia] Producto ${p.nombre} (ID: ${id}) tiene idCategoria=${idCategoria} pero no se encontró en categoriaMap`);
            }
          }
        } else {
          productosSinCategoria++;
          if (productosSinCategoria <= 3) {
            console.warn(`[Inteligencia] Producto ${p.nombre} (ID: ${id}) tiene idCategoria inválido: ${p.idCategoria}`);
          }
        }
        
        // Log de ejemplo para los primeros 3 productos
        if (productosProcesados <= 3) {
          console.log(`[Inteligencia] Producto ${productosProcesados}: ${p.nombre}, idCategoria=${idCategoria}, categoriaNombre="${categoriaNombre}"`);
        }
        
        // Validar precios
        const precioCosto = Number(p.precio_costo || 0);
        const precioVenta = Number(p.precio_venta || 0);
        if (precioCosto === 0 && precioVenta === 0) {
          productosSinPrecio++;
        }
        
        const item: ProductoRank = {
          idProducto: id,
          nombre: p.nombre,
          cantidadVendida: 0,
          totalVendido: 0,
          isGramaje: p.is_gramaje || false,
          diasSinVenta: 999,
          stock,
          categoria: categoriaNombre,
          precioCosto: precioCosto,
          precioVenta: precioVenta,
        };
        noMov.push(item);
        idProductosVistos.add(id);
      }
    }
    
    // Logs de depuración
    if (productosSinCategoria > 0) {
      console.warn(`[Inteligencia] ${productosSinCategoria} producto(s) sin categoría válida`);
    }
    if (productosSinPrecio > 0) {
      console.warn(`[Inteligencia] ${productosSinPrecio} producto(s) sin precio de costo ni venta`);
    }
    console.log('[Inteligencia] Productos sin movimiento encontrados:', noMov.length);
    
    // Debug: mostrar primeros 3 items de noMov
    if (noMov.length > 0) {
      console.log('[Inteligencia] Primeros 3 items de noMov:', noMov.slice(0, 3).map(i => ({
        id: i.idProducto,
        nombre: i.nombre,
        stock: i.stock,
        categoria: i.categoria
      })));
    }

    // Filtrar items sin identificador valido
    const noMovValidos = noMov.filter(i => i.idProducto != null && i.idProducto > 0 && !isNaN(i.idProducto as number) && i.nombre);
    const noMovDescartados = noMov.length - noMovValidos.length;
    if (noMovDescartados > 0) {
      console.warn(`[Inteligencia] Se descartaron ${noMovDescartados} producto(s) sin idProducto valido en Sin Movimiento.`, noMov.filter(i => !i.idProducto || isNaN(i.idProducto as number)));
    }
    
    // Debug: mostrar primeros 3 items de noMovValidos
    if (noMovValidos.length > 0) {
      console.log('[Inteligencia] Primeros 3 items de noMovValidos:', noMovValidos.slice(0, 3).map(i => ({
        id: i.idProducto,
        nombre: i.nombre,
        stock: i.stock,
        categoria: i.categoria
      })));
    }

    slow.sort((a, b) => (b.rotacion || 0) - (a.rotacion || 0));
    bajaRotacion.value = slow.slice(0, 10);
    sinMovimiento.value = noMovValidos.slice(0, 50);
    valorRetenidoSinMov.value = noMovValidos.reduce((s, i) => s + (i.stock || 0) * (i.precioCosto || 0), 0);

    // --- Alertas ---
    const alerts: typeof alertas.value = [];
    if (datosResumen) {
      if (datosResumen.bajoStock > 0) alerts.push({ tipo: 'stock-bajo', mensaje: datosResumen.bajoStock + ' producto(s) con stock por debajo del mínimo', severidad: 'alta' });
      if (datosResumen.productosAgotados > 0 || datosResumen.agotados > 0) {
        const count = datosResumen.productosAgotados || datosResumen.agotados || 0;
        alerts.push({ tipo: 'agotado', mensaje: count + ' producto(s) agotados — considera reordenar urgente', severidad: 'alta' });
      }
    }
    if (sinMovimiento.value.length > 0) alerts.push({ tipo: 'sin-movimiento', mensaje: sinMovimiento.value.length + ' producto(s) sin ventas en más de 30 días — revisa si deben permanecer en catálogo', severidad: 'media' });
    if (slow.length > 0) alerts.push({ tipo: 'baja-rotacion', mensaje: slow.length + ' producto(s) con más de 60 días de inventario — reduce pedidos futuros', severidad: 'media' });

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
    alertas,
    resumenInventario,
    ultimaActualizacion,
    cargarAnalytics,
    eliminarProducto,
    eliminarProductosLote,
    formatoMoneda,
    kpiValorInventario,
    kpiValorVentaPotencial,
    valorRetenidoSinMov,
  };
}
