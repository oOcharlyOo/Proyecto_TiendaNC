import { computed, onMounted, ref, shallowRef } from 'vue';
import type { ApiRespuesta, CategoriaDTO, ProductoDTO } from './useInvTipos';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const cargando = ref(false);
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

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

async function cargar() {
  cargando.value = true;
  try {
    const d = await api<ApiRespuesta<ProductoDTO[]>>(`${API_BASE}/productos/listarProductos`);
    productos.value = Array.isArray(d?.datos) ? [...d.datos].sort((a, b) => a.nombre.localeCompare(b.nombre)) : [];
    mensaje.value = '';
  } catch (e) { productos.value = []; mensaje.value = `Error: ${e instanceof Error ? e.message : 'Desconocido'}`; }
  finally { cargando.value = false; }
}

async function cargarCats() {
  try { const d = await api<ApiRespuesta<CategoriaDTO[]>>(`${API_BASE}/categorias/listarCategorias`); categorias.value = Array.isArray(d?.datos) ? d.datos : []; }
  catch { categorias.value = []; }
}

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
  let r = [...productos.value];
  if (verSoloProblemas.value) r = r.filter(p => Number(p.stock) < Number(p.cantidad_min));
  if (filtroBusqueda.value.trim()) { const t = filtroBusqueda.value.toLowerCase(); r = r.filter(p => p.nombre.toLowerCase().includes(t) || String(p.idProducto).includes(t)); }
  if (filtroCategoria.value !== null) r = r.filter(p => p.idCategoria === filtroCategoria.value);
  switch (ordenarPor.value) {
    case 'stock': return r.sort((a, b) => Number(a.stock) - Number(b.stock));
    case 'stock-desc': return r.sort((a, b) => Number(b.stock) - Number(a.stock));
    case 'precio': return r.sort((a, b) => Number(a.precio_venta) - Number(b.precio_venta));
    default: return r.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
});

const bajoStock = computed(() => productosFiltrados.value.filter(p => !esGaming(p.idCategoria) && Number(p.stock) > 0 && Number(p.stock) < Number(p.cantidad_min)));
const productosAgotados = computed(() => productosFiltrados.value.filter(p => !esGaming(p.idCategoria) && Number(p.stock) === 0));

const costoTotal = computed(() => productosFiltrados.value.reduce((s, p) => {
  if (esGaming(p.idCategoria) || Number(p.stock) <= 0) return s;
  const st = Number(p.stock);
  return s + (p.is_gramaje ? (st / 1000) * Number(p.precio_costo) : st * Number(p.precio_costo));
}, 0));

const valorVenta = computed(() => productosFiltrados.value.reduce((s, p) => {
  if (esGaming(p.idCategoria) || Number(p.stock) <= 0) return s;
  const st = Number(p.stock);
  return s + (p.is_gramaje ? (st / 1000) * Number(p.precio_venta) : st * Number(p.precio_venta));
}, 0));

const gananciaPot = computed(() => valorVenta.value - costoTotal.value);
const totalItems = computed(() => productosFiltrados.value.filter(p => !esGaming(p.idCategoria)).length);

const catsConTodas = computed(() => [{ idCategoria: null as number | null, nombre: 'Todas' }, ...categorias.value]);
export function catNombre(id?: number) { if (!id) return '—'; return categorias.value.find(c => c.idCategoria === id)?.nombre ?? '—'; }

export function moneda(v: number) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v || 0)); }
export function numero(v: number) { return new Intl.NumberFormat('es-MX').format(Number(v || 0)); }

export function useInventario() {

  onMounted(async () => { await cargar(); await cargarCats(); });

  return {
    cargando, mensaje, productos, categorias, filtroBusqueda, filtroCategoria,
    ordenarPor, verSoloProblemas, modalFormOpen, modalProductoEditando, guardando, vistaLista,
    cargar, guardar, editar, esGaming, stockClass, stockLabel,
    productosFiltrados, bajoStock, productosAgotados, costoTotal, valorVenta, gananciaPot, totalItems,
    catsConTodas, catNombre, moneda, numero, gamingCategoryId
  };
}