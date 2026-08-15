import { ref, shallowRef, computed, markRaw } from 'vue';
import type { ApiRespuesta, ProductoDTO, Producto, TicketItem } from './usePosTipos';
import { getJson, mostrarMensaje, crearNuevoTicket, ticketActual, crearDetalleVenta } from './usePosTicket';
import { playSound } from './usePosSonido';
import { useProductosCache } from '@/composables/useProductCache';
import { montoHoy, cargarAjustes } from '@/composables/useAjustePrecio';

const terminoBusqueda = ref('');
const categoriaFiltro = ref<number | null>(null);
const productos = shallowRef<Producto[]>([]);
const categorias = shallowRef<{ idCategoria: number; nombre: string }[]>([]);
const sugerenciasVisibles = ref(false);
const indiceSugerenciaActiva = ref(-1);

const gamingCategoryId = computed(() => {
  const cat = categorias.value.find(c => c.nombre.toLowerCase() === 'gaming');
  return cat ? cat.idCategoria : null;
});

function normalizarTexto(s: string): string {
  return (s || '').toLowerCase().replace(/[-\s–—]/g, '');
}

function esCategoriaGaming(idCategoria: number | undefined): boolean {
  if (!idCategoria || !gamingCategoryId.value) return false;
  return idCategoria === gamingCategoryId.value;
}

const provisionSemanalTotal = ref(0);
const provisionSemanalStatus = ref<'ok' | 'warning' | 'danger'>('ok');
const provisionStatusClass = computed(() => ({
  'status-ok': provisionSemanalStatus.value === 'ok',
  'status-warning': provisionSemanalStatus.value === 'warning',
  'status-danger': provisionSemanalStatus.value === 'danger'
}));

function normalizarProductos(data: ProductoDTO[] | null | undefined): Producto[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const id = Number(item?.idProducto ?? 0);
      const nombre = String(item?.nombre ?? '').trim();
      const codigo = String(item?.codigoBarras ?? '').trim();
      const precio = Number(item?.precio_venta ?? 0) + montoHoy.value;
      const precioMayoreo = item?.precio_mayoreo != null ? Number(item.precio_mayoreo) : null;
      return {
        id, nombre,
        codigo_barras: codigo.length ? codigo : null,
        precio,
        precio_mayoreo: (precioMayoreo != null && precioMayoreo > 0) ? precioMayoreo : null,
        dto: markRaw(item),
        is_gramaje: item.is_gramaje,
        idCategoria: item.idCategoria,
        requiere_envase: item.requiere_envase,
        precio_envase: item.precio_envase
      };
    })
    .filter((p) => p.id > 0 && p.nombre.length > 0 && Number.isFinite(p.precio));
}

async function cargarProductos() {
  await cargarAjustes();
  const { getProductosCache, setProductosCache } = useProductosCache();
  const cached = getProductosCache<ProductoDTO[]>();
  if (cached) {
    productos.value = normalizarProductos(cached);
    mostrarMensaje('Catalogo cargado desde caché.', 'ok');
  }
  try {
    const data = await getJson<ApiRespuesta<ProductoDTO[]>>('/productos/listarProductos');
    if (data?.datos) {
      productos.value = normalizarProductos(data.datos);
      setProductosCache(data.datos);
    }
    mostrarMensaje(data?.mensaje || 'Catalogo cargado.', 'ok');
  } catch (_error) {
    if (productos.value.length === 0) {
      productos.value = [];
      mostrarMensaje('No se pudo cargar el catalogo de productos.', 'error');
    }
  }
}

async function cargarCategorias() {
  try {
    const data = await getJson<ApiRespuesta<{ idCategoria: number; nombre: string }[]>>('/categorias/listarCategorias');
    categorias.value = Array.isArray(data?.datos) ? data.datos : [];
  } catch (_error) {
    categorias.value = [];
  }
}

const productosParaMostrar = computed(() => {
  const query = terminoBusqueda.value.trim().toLowerCase();
  let resultados = productos.value.filter(p => {
    if (esCategoriaGaming(p.idCategoria)) return false;
    const stock = p.dto?.stock;
    return stock === undefined || stock === null || stock > 0;
  });
  if (categoriaFiltro.value !== null) {
    resultados = resultados.filter(p => p.idCategoria === categoriaFiltro.value);
  }
  if (query) {
    const queryNormalizado = query.replace(/^0+/, '') || '0';
    const queryNorm = normalizarTexto(query);
    resultados = resultados.filter(p =>
      normalizarTexto(p.nombre).includes(queryNorm) ||
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(query)) ||
      ((p.codigo_barras || '').replace(/^0+/, '') || '0') === queryNormalizado
    );
    resultados.sort((a, b) => {
      const aExact = (a.codigo_barras || '').toLowerCase() === query || ((a.codigo_barras || '').replace(/^0+/, '') || '0') === queryNormalizado;
      const bExact = (b.codigo_barras || '').toLowerCase() === query || ((b.codigo_barras || '').replace(/^0+/, '') || '0') === queryNormalizado;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.nombre.localeCompare(b.nombre);
    });
  } else {
    resultados.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  return resultados;
});

const sugerenciasPorNombre = computed(() => {
  const query = terminoBusqueda.value.trim().toLowerCase();
  if (!query) return [];
  const queryNormalizado = query.replace(/^0+/, '') || '0';
  const queryNorm = normalizarTexto(query);
  return productos.value.filter(p =>
    !esCategoriaGaming(p.idCategoria) && (
      normalizarTexto(p.nombre).includes(queryNorm) ||
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(query)) ||
      ((p.codigo_barras || '').replace(/^0+/, '') || '0') === queryNormalizado
    )
  ).sort((a, b) => {
    const aExact = (a.codigo_barras || '').toLowerCase() === query || ((a.codigo_barras || '').replace(/^0+/, '') || '0') === queryNormalizado;
    const bExact = (b.codigo_barras || '').toLowerCase() === query || ((b.codigo_barras || '').replace(/^0+/, '') || '0') === queryNormalizado;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return 0;
  }).slice(0, 20);
});

const productosAccesoRapido = computed(() => {
  return productos.value.filter(p => {
    if (esCategoriaGaming(p.idCategoria)) return false;
    const stock = p.dto?.stock;
    if (stock !== undefined && stock !== null && stock <= 0) return false;
    if (!p.codigo_barras) return false;
    const codigoLimpio = p.codigo_barras.replace(/^0+/, '') || '0';
    return codigoLimpio.length >= 1 && codigoLimpio.length <= 2;
  }).sort((a, b) => {
    const aLimpio = (a.codigo_barras || '').replace(/^0+/, '') || '0';
    const bLimpio = (b.codigo_barras || '').replace(/^0+/, '') || '0';
    return Number(aLimpio) - Number(bLimpio);
  });
});

async function buscarProductoPorCodigoBarras(codigo: string): Promise<Producto | undefined> {
  try {
    const data = await getJson<ApiRespuesta<ProductoDTO>>(`/productos/buscarPorCodigoBarras/${encodeURIComponent(codigo)}`);
    const normalizados = normalizarProductos(data?.datos ? [data.datos] : []);
    return normalizados[0] ?? undefined;
  } catch (_error) { return undefined; }
}

async function buscarProducto(termino: string): Promise<Producto | undefined> {
  const query = termino.trim().toLowerCase();
  if (!query) return undefined;
  const queryNorm = normalizarTexto(query);
  const porCodigo = productos.value.find((p) => (p.codigo_barras || '').toLowerCase() === query);
  if (porCodigo) return porCodigo;
  const porNombreExacto = productos.value.find((p) => normalizarTexto(p.nombre) === queryNorm);
  if (porNombreExacto) return porNombreExacto;
  const words = query.split(/\s+/);
  const porPalabras = productos.value.find((p) => {
    const nombreNorm = normalizarTexto(p.nombre);
    return words.every((w) => w.length > 0 && nombreNorm.includes(normalizarTexto(w)));
  });
  if (porPalabras) return porPalabras;
  const porNombreParcial = productos.value.find((p) => normalizarTexto(p.nombre).includes(queryNorm));
  if (porNombreParcial) return porNombreParcial;
  const porApiNombre = await buscarPorNombreApi(query);
  if (porApiNombre) return porApiNombre;
  const stopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'y', 'o', 'a', 'con', 'en', 'por', 'para', 'se', 'su', 'que', 'es', 'no', 'lo', 'como', 'mas', 'pero', 'sus', 'le', 'ya', 'este', 'entre', 'porque', 'ese', 'esa']);
  for (const word of words) {
    if (word.length > 2 && !stopWords.has(word)) {
      const porWord = await buscarPorNombreApi(word);
      if (porWord) return porWord;
    }
  }
  return await buscarProductoPorCodigoBarras(query);
}

async function buscarPorNombreApi(query: string): Promise<Producto | undefined> {
  try {
    const data = await getJson<ApiRespuesta<ProductoDTO[]>>(`/productos/buscarPorNombre?nombre=${encodeURIComponent(query)}`);
    if (data?.datos && data.datos.length > 0) {
      const normalizados = normalizarProductos(data.datos);
      return normalizados[0];
    }
    return undefined;
  } catch { return undefined; }
}

function manejarFocusBusqueda() { sugerenciasVisibles.value = true; }

function manejarInputBusqueda() {
  sugerenciasVisibles.value = true;
  indiceSugerenciaActiva.value = -1;
}

function ocultarSugerencias() {
  setTimeout(() => {
    sugerenciasVisibles.value = false;
    indiceSugerenciaActiva.value = -1;
  }, 120);
}

function manejarTeclasSugerencias(event: KeyboardEvent) {
  if (!sugerenciasPorNombre.value.length) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    sugerenciasVisibles.value = true;
    indiceSugerenciaActiva.value = indiceSugerenciaActiva.value < sugerenciasPorNombre.value.length - 1 ? indiceSugerenciaActiva.value + 1 : 0;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    sugerenciasVisibles.value = true;
    indiceSugerenciaActiva.value = indiceSugerenciaActiva.value > 0 ? indiceSugerenciaActiva.value - 1 : sugerenciasPorNombre.value.length - 1;
  }
  if (event.key === 'Escape') {
    sugerenciasVisibles.value = false;
    indiceSugerenciaActiva.value = -1;
  }
}

async function agregarDesdeBuscador() {
  if (sugerenciasVisibles.value && indiceSugerenciaActiva.value >= 0) {
    const seleccion = sugerenciasPorNombre.value[indiceSugerenciaActiva.value];
    if (seleccion) { seleccionarSugerencia(seleccion); return; }
  }
  const producto = await buscarProducto(terminoBusqueda.value);
  if (!producto) { mostrarMensaje('Producto no encontrado.', 'error'); return; }
  agregarProductoATicket(producto);
  terminoBusqueda.value = '';
  sugerenciasVisibles.value = false;
  indiceSugerenciaActiva.value = -1;
}

function seleccionarSugerencia(producto: Producto) {
  agregarProductoATicket(producto);
  terminoBusqueda.value = '';
  sugerenciasVisibles.value = false;
  indiceSugerenciaActiva.value = -1;
}

async function agregarProductoATicket(producto: Producto) {
  if (!ticketActual.value) {
    await crearNuevoTicket();
    if (!ticketActual.value) { mostrarMensaje('No se pudo crear el ticket', 'error'); return; }
  }
  const stockDisponible = producto.dto?.stock ?? Infinity;
  if (stockDisponible <= 0) { mostrarMensaje(`Sin stock: ${producto.nombre}`, 'error'); return; }
  if (producto.is_gramaje) {
    const { modalGramajeAbierto, modalProductoGramaje } = await import('./usePosGramaje');
    modalProductoGramaje.value = producto;
    modalGramajeAbierto.value = true;
    return;
  }
  const items = ticketActual.value!.items;
  const existente = items.find((item) => item.id === producto.id);
  if (existente) {
    const cantidadActual = existente.cantidad;
    if (cantidadActual >= stockDisponible) { mostrarMensaje(`Stock maximo alcanzado: ${producto.nombre} (${stockDisponible} unidades)`, 'error'); return; }
    existente.cantidad += 1;
    try { await crearDetalleVenta(ticketActual.value.id, existente); }
    catch (e) { existente.cantidad -= 1; throw e; }
  } else {
    items.push({ ...producto, cantidad: 1, requiere_envase: producto.requiere_envase, precio_envase: producto.precio_envase, envase_aplicado: false, cantidad_envase: 1 });
    try { const nuevoItem = items[items.length - 1]; await crearDetalleVenta(ticketActual.value.id, nuevoItem); }
    catch (e) { items.pop(); throw e; }
  }
  mostrarMensaje(`Agregado: ${producto.nombre}`, 'ok');
  playSound('add');
}

async function toggleMayoreo(item: TicketItem) {
  if (!item.precio_mayoreo || item.precio_mayoreo <= 0) { mostrarMensaje(`El producto "${item.nombre}" no tiene precio de mayoreo.`, 'error'); return; }
  const nuevoMayoreo = !item.is_mayoreo;
  const precioAnterior = item.precio;
  item.is_mayoreo = nuevoMayoreo;
  item.precio = nuevoMayoreo ? item.precio_mayoreo : (item.dto?.precio_venta ? Number(item.dto.precio_venta) + montoHoy.value : item.precio);
  if (item.idVentaDetalle && ticketActual.value) {
    try { await crearDetalleVenta(ticketActual.value.id, item); }
    catch (e) { item.is_mayoreo = !nuevoMayoreo; item.precio = precioAnterior; mostrarMensaje('Error al actualizar precio.', 'error'); }
  }
}

function toggleEnvase(item: TicketItem) {
  if (!item.requiere_envase || !item.precio_envase) { mostrarMensaje(`El producto "${item.nombre}" no requiere envase.`, 'error'); return; }
  (item as any).envase_aplicado = !(item as any).envase_aplicado;
  if ((item as any).envase_aplicado && !(item as any).cantidad_envase) {
    (item as any).cantidad_envase = item.cantidad;
  }
}

async function cargarProvisionSemanal() {
  try {
    const res = await getJson<ApiRespuesta<any>>('/pedidos-proveedor/provision-semanal');
    if (res?.datos) {
      provisionSemanalTotal.value = res.datos.reduce((sum: number, d: any) => sum + (d.montoRequerido || 0), 0);
      const cajaActual = Number(localStorage.getItem('saldoCaja') || 0);
      const transferencias = Number(localStorage.getItem('saldoTransferencias') || 0);
      if (cajaActual >= provisionSemanalTotal.value) provisionSemanalStatus.value = 'ok';
      else if (cajaActual + transferencias >= provisionSemanalTotal.value) provisionSemanalStatus.value = 'warning';
      else provisionSemanalStatus.value = 'danger';
    }
  } catch (e) { console.error('Error al cargar provision semanal:', e); }
}

export {
  terminoBusqueda, categoriaFiltro, productos, categorias,
  sugerenciasVisibles, indiceSugerenciaActiva,
  provisionSemanalTotal, provisionSemanalStatus, provisionStatusClass,
  gamingCategoryId, esCategoriaGaming,
  cargarProductos, cargarCategorias, productosParaMostrar,
  sugerenciasPorNombre, productosAccesoRapido,
  buscarProductoPorCodigoBarras, buscarProducto,
  manejarFocusBusqueda, manejarInputBusqueda, ocultarSugerencias,
  manejarTeclasSugerencias, agregarDesdeBuscador, seleccionarSugerencia,
  agregarProductoATicket, toggleMayoreo, toggleEnvase,
  cargarProvisionSemanal
};
