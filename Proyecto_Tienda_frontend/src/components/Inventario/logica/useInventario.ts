import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import type { ApiRespuesta, CategoriaDTO, PaginatedResponse, ProductoDTO, ResumenInventarioDTO } from './useInvTipos';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const cargando = ref(false);
const cargandoMas = ref(false);
const mensaje = ref('');
const productos = shallowRef<ProductoDTO[]>([]);
const categorias = shallowRef<CategoriaDTO[]>([]);
const filtroBusqueda = ref('');
const filtroCategoria = ref<number | null>(null);
const ordenarPor = ref('nombre');
const verSoloProblemas = ref(false);
const modalFormOpen = ref(false);
const modalProductoEditando = ref<ProductoDTO | undefined>(undefined);
const guardando = ref(false);
const vistaLista = ref(true);

const pagina = ref(0);
const totalPaginas = ref(0);
const resumen = ref<ResumenInventarioDTO>({ totalItems: 0, bajoStock: 0, productosAgotados: 0, costoTotal: 0, gananciaPot: 0 });

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

function paramsParaFiltros(pag: number): URLSearchParams {
  const p = new URLSearchParams({ page: String(pag), size: '50', ordenarPor: ordenarPor.value });
  if (filtroBusqueda.value.trim()) p.set('q', filtroBusqueda.value.trim());
  if (filtroCategoria.value !== null) p.set('idCategoria', String(filtroCategoria.value));
  return p;
}

async function cargarPrimeraPagina() {
  cargando.value = true;
  pagina.value = 0;
  try {
    const d = await api<ApiRespuesta<PaginatedResponse<ProductoDTO>>>(`${API_BASE}/productos/listarPaginado?${paramsParaFiltros(0)}`);
    if (d?.codigo === 200 && d.datos) {
      productos.value = d.datos.content;
      totalPaginas.value = d.datos.totalPages;
    } else {
      productos.value = [];
      totalPaginas.value = 0;
    }
    mensaje.value = '';
  } catch (e) { productos.value = []; mensaje.value = `Error: ${e instanceof Error ? e.message : 'Desconocido'}`; }
  finally { cargando.value = false; }
}

async function cargarResumen() {
  try {
    const d = await api<ApiRespuesta<ResumenInventarioDTO>>(`${API_BASE}/productos/resumen`);
    if (d?.codigo === 200 && d.datos) resumen.value = d.datos;
  } catch { /* ignore */ }
}

async function cargarMas() {
  if (cargandoMas.value || pagina.value >= totalPaginas.value - 1) return;
  cargandoMas.value = true;
  const sigPagina = pagina.value + 1;
  try {
    const d = await api<ApiRespuesta<PaginatedResponse<ProductoDTO>>>(`${API_BASE}/productos/listarPaginado?${paramsParaFiltros(sigPagina)}`);
    if (d?.codigo === 200 && d.datos) {
      productos.value = [...productos.value, ...d.datos.content];
      pagina.value = sigPagina;
    }
  } catch { /* ignore */ }
  finally { cargandoMas.value = false; }
}

async function cargar() {
  await Promise.all([cargarPrimeraPagina(), cargarResumen()]);
}

async function cargarCats() {
  try { const d = await api<ApiRespuesta<CategoriaDTO[]>>(`${API_BASE}/categorias/listarCategorias`); categorias.value = Array.isArray(d?.datos) ? d.datos : []; }
  catch { categorias.value = []; }
}

let debounceTimer: ReturnType<typeof setTimeout>;
watch(filtroBusqueda, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => cargarPrimeraPagina(), 300);
});
watch(filtroCategoria, () => cargarPrimeraPagina());
watch(ordenarPor, () => cargarPrimeraPagina());

async function guardar(payload: ProductoDTO) {
  if (!payload.nombre.trim()) { mensaje.value = 'Nombre obligatorio.'; return; }
  guardando.value = true;
  try {
    if (payload.idProducto) {
      const d = await api<any>(`${API_BASE}/productos/actualizarProducto/${payload.idProducto}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (d?.codigo !== 200) throw new Error(d?.mensaje);
    }
    await cargar();
    modalFormOpen.value = false;
  } catch (e) { mensaje.value = `Error: ${e instanceof Error ? e.message : 'Desconocido'}`; }
  finally { guardando.value = false; }
}

function editar(p: ProductoDTO) { modalProductoEditando.value = { ...p }; modalFormOpen.value = true; }

const gamingCategoryId = computed(() => categorias.value.find(c => c.nombre.toLowerCase() === 'gaming')?.idCategoria ?? null);

export function esGaming(idCat?: number) { return !!(idCat && gamingCategoryId.value && idCat === gamingCategoryId.value); }

export function stockClass(p: ProductoDTO) {
  const s = Number(p.stock), m = Number(p.cantidad_min);
  if (s === 0) return 'agotado';
  if (s < m) return 'bajo';
  if (s >= m * 3) return 'ok';
  return 'normal';
}

export function stockLabel(p: ProductoDTO) {
  const s = Number(p.stock), m = Number(p.cantidad_min);
  if (s === 0) return 'Agotado';
  if (s < m * 0.5) return 'Crítico';
  if (s < m) return 'Bajo';
  return '';
}

const productosFiltrados = computed(() => {
  let r = productos.value;
  if (verSoloProblemas.value) r = r.filter(p => Number(p.stock) < Number(p.cantidad_min));
  return r;
});

const costoTotal = computed(() => resumen.value.costoTotal);
const gananciaPot = computed(() => resumen.value.gananciaPot);
const totalItems = computed(() => resumen.value.totalItems);
const bajoStock = computed(() => resumen.value.bajoStock);
const productosAgotados = computed(() => resumen.value.productosAgotados);

const catsConTodas = computed(() => [{ idCategoria: null as number | null, nombre: 'Todas' }, ...categorias.value]);
export function catNombre(id?: number) { if (!id) return '—'; return categorias.value.find(c => c.idCategoria === id)?.nombre ?? '—'; }

export function moneda(v: number) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v || 0)); }
export function numero(v: number) { return new Intl.NumberFormat('es-MX').format(Number(v || 0)); }

export function useInventario() {

  onMounted(async () => { await cargar(); await cargarCats(); });

  return {
    cargando, cargandoMas, mensaje, productos, categorias, filtroBusqueda, filtroCategoria,
    ordenarPor, verSoloProblemas, modalFormOpen, modalProductoEditando, guardando, vistaLista,
    pagina, totalPaginas, resumen,
    cargarMas, cargar, guardar, editar, esGaming, stockClass, stockLabel,
    productosFiltrados, bajoStock, productosAgotados, costoTotal, gananciaPot, totalItems,
    catsConTodas, catNombre, moneda, numero, gamingCategoryId
  };
}
