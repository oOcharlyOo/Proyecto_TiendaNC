<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import ProductoFormModal from './modals/Productos/ProductoFormModal.vue';

type ApiRespuesta<T> = { codigo: number; mensaje: string; datos: T };
type CategoriaDTO = { idCategoria: number; nombre: string };
type ProductoDTO = {
  idProducto?: number; nombre: string; stock: number; codigoBarras: string | null;
  precio_costo: number; precio_venta: number; cantidad_min: number; cantidad_max: number;
  precio_mayoreo: number | null; is_gramaje: boolean; idCategoria?: number;
};

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

const gamingCategoryId = computed(() => categorias.value.find(c => c.nombre.toLowerCase() === 'gaming')?.idCategoria ?? null);
function esGaming(idCat?: number) { return !!(idCat && gamingCategoryId.value && idCat === gamingCategoryId.value); }

function stockClass(p: ProductoDTO) {
  const s = Number(p.stock), m = Number(p.cantidad_min);
  if (s === 0) return 'agotado';
  if (s < m) return 'bajo';
  if (s >= m * 3) return 'ok';
  return 'normal';
}

function stockLabel(p: ProductoDTO) {
  const s = Number(p.stock), m = Number(p.cantidad_min);
  if (s === 0) return 'Agotado';
  if (s < m * 0.5) return 'Crítico';
  if (s < m) return 'Bajo';
  return '';
}

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

function moneda(v: number) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v || 0)); }
function numero(v: number) { return new Intl.NumberFormat('es-MX').format(Number(v || 0)); }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

function editar(p: ProductoDTO) { modalProductoEditando.value = { ...p }; modalFormOpen.value = true; }

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

onMounted(async () => { await cargar(); await cargarCats(); });

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

const catsConTodas = computed(() => [{ idCategoria: null as number | null, nombre: 'Todas' }, ...categorias.value]);
function catNombre(id?: number) { if (!id) return '—'; return categorias.value.find(c => c.idCategoria === id)?.nombre ?? '—'; }
</script>

<template>
  <div class="inv">
    <header class="inv__head">
      <div class="inv__head-left">
        <h1 class="inv__title">Inventario</h1>
        <span class="inv__badge">{{ totalItems }} artículos</span>
      </div>
      <div class="inv__head-right">
        <div class="inv__views">
          <button :class="['inv__vbtn', { on: vistaLista }]" @click="vistaLista = true" title="Lista">📋</button>
          <button :class="['inv__vbtn', { on: !vistaLista }]" @click="vistaLista = false" title="Cuadrícula">🔲</button>
        </div>
        <button class="inv__reload" @click="cargar" :disabled="cargando" :class="{ spin: cargando }" title="Recargar">🔄</button>
      </div>
    </header>

    <div class="inv__kpis">
      <div class="inv__kpi">
        <div class="inv__kpi-ico ico-blue">📦</div>
        <div class="inv__kpi-txt"><span class="inv__kpi-l">Total</span><span class="inv__kpi-v">{{ totalItems }}</span></div>
      </div>
      <div class="inv__kpi">
        <div class="inv__kpi-ico ico-amber">⚠️</div>
        <div class="inv__kpi-txt"><span class="inv__kpi-l">Bajo Stock</span><span class="inv__kpi-v">{{ bajoStock.length }}</span></div>
      </div>
      <div class="inv__kpi">
        <div class="inv__kpi-ico ico-red">💀</div>
        <div class="inv__kpi-txt"><span class="inv__kpi-l">Agotados</span><span class="inv__kpi-v">{{ productosAgotados.length }}</span></div>
      </div>
      <div class="inv__kpi">
        <div class="inv__kpi-ico ico-gold">💰</div>
        <div class="inv__kpi-txt"><span class="inv__kpi-l">Costo Total</span><span class="inv__kpi-v">{{ moneda(costoTotal) }}</span></div>
      </div>
      <div class="inv__kpi">
        <div class="inv__kpi-ico ico-green">💎</div>
        <div class="inv__kpi-txt"><span class="inv__kpi-l">Ganancia Pot.</span><span class="inv__kpi-v">{{ moneda(gananciaPot) }}</span></div>
      </div>
    </div>

    <div class="inv__bar">
      <div class="inv__src">
        <span class="inv__src-ico">🔍</span>
        <input v-model="filtroBusqueda" placeholder="Buscar..." />
        <button v-if="filtroBusqueda" @click="filtroBusqueda = ''" class="inv__x">×</button>
      </div>
      <div class="inv__ctrls">
        <select v-model="filtroCategoria">
          <option v-for="c in catsConTodas" :key="c.idCategoria ?? 'a'" :value="c.idCategoria">{{ c.nombre }}</option>
        </select>
        <select v-model="ordenarPor">
          <option value="nombre">Nombre</option>
          <option value="stock">Stock ↑</option>
          <option value="stock-desc">Stock ↓</option>
          <option value="precio">Precio</option>
        </select>
        <label class="inv__tog">
          <input type="checkbox" v-model="verSoloProblemas" />
          <span class="inv__tog-t"><span class="inv__tog-d"></span></span>
          <span>Alertas</span>
        </label>
      </div>
    </div>

    <div class="inv__body">
      <div v-if="cargando" class="inv__wait"><div class="inv__spin"></div><p>Cargando inventario...</p></div>
      <p v-else-if="mensaje" class="inv__err">⚠️ {{ mensaje }}</p>
      <p v-else-if="productosFiltrados.length === 0" class="inv__nil">📭 {{ verSoloProblemas ? 'Sin alertas' : 'Sin resultados' }}</p>

      <div v-else-if="vistaLista" class="inv__tbl-wrap">
        <table class="inv__tbl">
          <thead><tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th class="tc">Stock</th>
            <th class="tc">Estado</th>
            <th class="tr">Costo</th>
            <th class="tr">Venta</th>
            <th class="tr">Ganancia/u</th>
            <th class="tr">Valor Total</th>
            <th style="width:36px"></th>
          </tr></thead>
          <tbody>
            <tr v-for="p in productosFiltrados" :key="p.idProducto" :class="['inv__row', `r-${stockClass(p)}`, esGaming(p.idCategoria) ? 'r-gaming' : '']" @click="editar(p)">
              <td class="inv__cell inv__name-cell">
                <span class="inv__emoji">{{ p.is_gramaje ? '⚖️' : '📦' }}</span>
                <div class="inv__ni"><span class="inv__nn">{{ p.nombre }}</span><span class="inv__nid">#{{ p.idProducto }}</span></div>
              </td>
              <td class="inv__cell cat">{{ catNombre(p.idCategoria) }}</td>
              <td class="inv__cell tc stock">{{ numero(p.stock) }}<small>{{ p.is_gramaje ? 'g' : 'u' }}</small></td>
              <td class="inv__cell tc">
                <span v-if="esGaming(p.idCategoria)" class="inv__tag t-gaming">Rentable</span>
                <span v-else-if="stockLabel(p)" :class="['inv__tag', `t-${stockClass(p)}`]">{{ stockLabel(p) }}</span>
                <span v-else class="inv__tag t-ok">OK</span>
              </td>
              <td class="inv__cell tr costo">{{ moneda(p.precio_costo) }}</td>
              <td class="inv__cell tr venta">{{ moneda(p.precio_venta) }}</td>
              <td class="inv__cell tr gain">{{ moneda(Number(p.precio_venta) - Number(p.precio_costo)) }}</td>
              <td class="inv__cell tr total">{{ moneda(p.is_gramaje ? (Number(p.stock) / 1000) * Number(p.precio_venta) : Number(p.stock) * Number(p.precio_venta)) }}</td>
              <td class="inv__cell ac"><button class="inv__eb" @click.stop="editar(p)" title="Editar">✏️</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="inv__grid">
        <article v-for="p in productosFiltrados" :key="p.idProducto" :class="['inv__cd', `c-${stockClass(p)}`, esGaming(p.idCategoria) ? 'c-gaming' : '']" @click="editar(p)">
          <div class="inv__cd-head">
            <span class="inv__cd-id">#{{ p.idProducto }}</span>
            <span :class="['inv__cd-dot', `d-${stockClass(p)}`]" :title="stockLabel(p) || 'OK'"></span>
          </div>
          <div class="inv__cd-ico-wrap">
            <span class="inv__cd-ico">{{ p.is_gramaje ? '⚖️' : '📦' }}</span>
          </div>
          <h3 class="inv__cd-nm">{{ p.nombre }}</h3>
          <span class="inv__cd-cat">{{ catNombre(p.idCategoria) }}</span>
          <div class="inv__cd-stats">
            <div class="inv__cs">
              <span class="inv__cs-ico">📊</span>
              <div class="inv__cs-body">
                <span class="inv__cs-l">Stock</span>
                <span :class="['inv__cs-v', `v-${stockClass(p)}`]">{{ numero(p.stock) }}<small>{{ p.is_gramaje ? 'g' : 'u' }}</small></span>
              </div>
            </div>
            <div class="inv__cs">
              <span class="inv__cs-ico">💲</span>
              <div class="inv__cs-body">
                <span class="inv__cs-l">Venta</span>
                <span class="inv__cs-v v-venta">{{ moneda(p.precio_venta) }}</span>
              </div>
            </div>
            <div class="inv__cs">
              <span class="inv__cs-ico">💎</span>
              <div class="inv__cs-body">
                <span class="inv__cs-l">Ganancia</span>
                <span class="inv__cs-v v-gain">{{ moneda(Number(p.precio_venta) - Number(p.precio_costo)) }}</span>
              </div>
            </div>
          </div>
          <div class="inv__cd-bar-wrap">
            <div class="inv__cd-bar-bg">
              <div class="inv__cd-bar-fill" :style="{ width: `${Math.min(100, (p.stock / (p.cantidad_min * 3 || 1)) * 100)}%` }" :class="`bf-${stockClass(p)}`"></div>
            </div>
            <span class="inv__cd-bar-pct">{{ Math.round((p.stock / (p.cantidad_min * 3 || 1)) * 100) }}%</span>
          </div>
          <button class="inv__cd-ed" @click.stop="editar(p)" title="Editar">✏️</button>
        </article>
      </div>
    </div>

    <ProductoFormModal :open="modalFormOpen" :data="modalProductoEditando" :loading="guardando" :categorias="categorias" @close="modalFormOpen = false; modalProductoEditando = undefined" @submit="guardar" />
  </div>
</template>

<style scoped>
.inv {
  height: 96vh;
  display: flex;
  flex-direction: column;
  gap: clamp(0.35rem, 0.6vw, 0.6rem);
  padding: clamp(0.35rem, 0.6vw, 0.6rem);
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

/* HEADER */
.inv__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(0.15rem, 0.3vw, 0.3rem) 0;
  flex-shrink: 0;
}

.inv__head-left { display: flex; align-items: baseline; gap: clamp(0.35rem, 0.6vw, 0.6rem); }

.inv__title {
  margin: 0;
  font-size: clamp(0.9rem, 1.3vw, 1.3rem);
  font-weight: 700;
  color: var(--accent-color);
  font-family: 'HyliaSerif', serif;
}

.inv__badge {
  font-size: clamp(0.55rem, 0.7vw, 0.7rem);
  color: var(--text-secondary);
  padding: clamp(0.08rem, 0.15vw, 0.15rem) clamp(0.35rem, 0.5vw, 0.6rem);
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.inv__head-right { display: flex; align-items: center; gap: clamp(0.25rem, 0.4vw, 0.4rem); }

.inv__views {
  display: flex;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.inv__vbtn {
  width: clamp(24px, 2.5vw, 30px);
  height: clamp(24px, 2.5vw, 30px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  font-size: clamp(0.75rem, 1.2vw, 0.95rem);
  line-height: 1;
}

.inv__vbtn.on { background: var(--accent-color); color: var(--bg-primary); }
.inv__vbtn:hover:not(.on) { background: var(--bg-secondary); }

.inv__reload {
  width: clamp(24px, 2.5vw, 30px);
  height: clamp(24px, 2.5vw, 30px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-panel);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  font-size: clamp(0.75rem, 1.2vw, 0.95rem);
  line-height: 1;
}

.inv__reload:hover:not(:disabled) { border-color: var(--accent-color); color: var(--accent-color); }
.inv__reload:disabled { opacity: 0.4; }
.inv__reload.spin { animation: spin 0.7s linear infinite; }

/* KPIs */
.inv__kpis {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: clamp(0.3rem, 0.5vw, 0.5rem);
  flex-shrink: 0;
}

.inv__kpi {
  display: flex;
  align-items: center;
  gap: clamp(0.35rem, 0.6vw, 0.6rem);
  padding: clamp(0.3rem, 0.5vw, 0.5rem) clamp(0.45rem, 0.7vw, 0.75rem);
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.2s;
}

.inv__kpi:hover { transform: translateY(-1px); box-shadow: 0 4px 12px var(--shadow-color); }

.inv__kpi-ico {
  width: clamp(28px, 3.2vw, 38px);
  height: clamp(28px, 3.2vw, 38px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  flex-shrink: 0;
  font-size: clamp(1rem, 1.6vw, 1.4rem);
  line-height: 1;
}

.ico-blue { background: rgba(59, 130, 246, 0.12); }
.ico-amber { background: rgba(245, 158, 11, 0.12); }
.ico-red { background: rgba(239, 68, 68, 0.12); }
.ico-gold { background: rgba(201, 146, 52, 0.12); }
.ico-green { background: rgba(34, 197, 94, 0.12); }

.inv__kpi-txt { display: flex; flex-direction: column; gap: 0; min-width: 0; }

.inv__kpi-l {
  font-size: clamp(0.48rem, 0.65vw, 0.62rem);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  line-height: 1;
}

.inv__kpi-v {
  font-size: clamp(0.72rem, 1vw, 0.95rem);
  font-weight: 700;
  font-family: 'Courier New', monospace;
  white-space: nowrap;
  line-height: 1.2;
}

/* BAR */
.inv__bar {
  display: flex;
  gap: clamp(0.3rem, 0.5vw, 0.5rem);
  flex-wrap: wrap;
  flex-shrink: 0;
  align-items: center;
}

.inv__src {
  flex: 1;
  min-width: 150px;
  position: relative;
  display: flex;
  align-items: center;
}

.inv__src-ico {
  position: absolute;
  left: clamp(0.5rem, 0.7vw, 0.7rem);
  font-size: clamp(0.7rem, 1vw, 0.9rem);
  pointer-events: none;
  line-height: 1;
}

.inv__src input {
  width: 100%;
  padding: clamp(0.3rem, 0.45vw, 0.45rem) clamp(1.5rem, 2vw, 2rem) clamp(0.3rem, 0.45vw, 0.45rem) clamp(1.7rem, 2.2vw, 2.2rem);
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: clamp(0.65rem, 0.8vw, 0.8rem);
  transition: border-color 0.15s;
}

.inv__src input:focus { outline: none; border-color: var(--accent-color); }
.inv__src input::placeholder { color: var(--text-secondary); opacity: 0.4; }

.inv__x {
  position: absolute;
  right: clamp(0.3rem, 0.5vw, 0.5rem);
  width: clamp(16px, 2vw, 20px);
  height: clamp(16px, 2vw, 20px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: clamp(0.8rem, 1vw, 1rem);
  cursor: pointer;
  border-radius: 50%;
}

.inv__x:hover { background: var(--error-color); color: var(--text-primary); }

.inv__ctrls { display: flex; gap: clamp(0.25rem, 0.4vw, 0.4rem); align-items: center; }

.inv__ctrls select {
  padding: clamp(0.3rem, 0.45vw, 0.45rem) clamp(0.45rem, 0.7vw, 0.7rem);
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: clamp(0.6rem, 0.75vw, 0.75rem);
  cursor: pointer;
}

.inv__ctrls select:focus { outline: none; border-color: var(--accent-color); }

.inv__tog {
  display: flex;
  align-items: center;
  gap: clamp(0.2rem, 0.35vw, 0.35rem);
  cursor: pointer;
  font-size: clamp(0.55rem, 0.7vw, 0.7rem);
  color: var(--text-secondary);
  user-select: none;
}

.inv__tog input { display: none; }

.inv__tog-t {
  width: clamp(26px, 3vw, 32px);
  height: clamp(14px, 2vw, 18px);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  position: relative;
  transition: all 0.2s;
}

.inv__tog-d {
  position: absolute;
  top: 2px;
  left: 2px;
  width: clamp(8px, 1.2vw, 12px);
  height: clamp(8px, 1.2vw, 12px);
  background: var(--text-secondary);
  border-radius: 50%;
  transition: all 0.2s;
}

.inv__tog input:checked + .inv__tog-t { background: var(--accent-color); border-color: var(--accent-color); }
.inv__tog input:checked + .inv__tog-t .inv__tog-d { left: clamp(14px, 2vw, 18px); background: var(--bg-primary); }

/* BODY */
.inv__body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.inv__wait, .inv__err, .inv__nil {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(0.35rem, 0.5vw, 0.6rem);
  padding: clamp(2rem, 4vw, 4rem);
  color: var(--text-secondary);
  font-size: clamp(0.7rem, 0.85vw, 0.85rem);
  flex: 1;
}

.inv__err { color: var(--error-color); }

.inv__spin {
  width: clamp(20px, 2.5vw, 28px);
  height: clamp(20px, 2.5vw, 28px);
  border: 2px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* TABLE */
.inv__tbl-wrap {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.inv__tbl-wrap::-webkit-scrollbar { width: 5px; height: 5px; }
.inv__tbl-wrap::-webkit-scrollbar-track { background: transparent; }
.inv__tbl-wrap::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
.inv__tbl-wrap::-webkit-scrollbar-thumb:hover { background: var(--accent-color); }

.inv__tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: clamp(0.65rem, 0.85vw, 0.82rem);
}

.inv__tbl th {
  text-align: left;
  padding: clamp(0.3rem, 0.5vw, 0.5rem) clamp(0.45rem, 0.7vw, 0.75rem);
  font-size: clamp(0.52rem, 0.7vw, 0.68rem);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-panel);
  position: sticky;
  top: 0;
  z-index: 2;
  white-space: nowrap;
  font-weight: 600;
}

.tc { text-align: center; }
.tr { text-align: right; }

.inv__row {
  border-bottom: 1px solid var(--border-color);
  transition: background 0.1s;
  cursor: pointer;
}

.inv__row:hover { background: var(--bg-panel); }

.inv__row.r-agotado { border-left: 2px solid var(--error-color); }
.inv__row.r-bajo { border-left: 2px solid var(--warning-color); }
.inv__row.r-ok { border-left: 2px solid var(--success-color); }
.inv__row.r-normal { border-left: 2px solid var(--success-color); }
.inv__row.r-gaming { border-left: 2px solid #8b5cf6; }

.inv__cell {
  padding: clamp(0.25rem, 0.45vw, 0.45rem) clamp(0.45rem, 0.7vw, 0.75rem);
  vertical-align: middle;
  white-space: nowrap;
}

.inv__name-cell { display: flex; align-items: center; gap: clamp(0.3rem, 0.5vw, 0.5rem); padding-left: clamp(0.5rem, 0.8vw, 0.85rem); }

.inv__emoji { font-size: clamp(0.8rem, 1.1vw, 1.1rem); flex-shrink: 0; }

.inv__ni { display: flex; flex-direction: column; gap: 0; min-width: 0; }

.inv__nn {
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: clamp(120px, 20vw, 280px);
  line-height: 1.2;
}

.inv__nid { font-size: clamp(0.45rem, 0.6vw, 0.58rem); color: var(--text-secondary); font-family: 'Courier New', monospace; }

.cat { color: var(--text-secondary); font-size: clamp(0.58rem, 0.75vw, 0.72rem); }

.stock { font-weight: 700; font-family: 'Courier New', monospace; }
.stock small { font-size: clamp(0.48rem, 0.65vw, 0.62rem); color: var(--text-secondary); margin-left: 0.1rem; font-weight: 400; }

.inv__tag {
  display: inline-block;
  padding: clamp(0.08rem, 0.15vw, 0.15rem) clamp(0.3rem, 0.5vw, 0.5rem);
  border-radius: 3px;
  font-size: clamp(0.48rem, 0.65vw, 0.62rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.t-agotado { background: rgba(239, 68, 68, 0.12); color: var(--error-color); }
.t-bajo { background: rgba(245, 158, 11, 0.12); color: var(--warning-color); }
.t-ok { background: rgba(34, 197, 94, 0.12); color: var(--success-color); }
.t-gaming { background: rgba(139, 92, 246, 0.12); color: #8b5cf6; }

.costo { color: var(--accent-color); }
.venta { color: var(--success-color); }
.gain { color: var(--accent-color); }
.total { font-weight: 700; }

.ac { text-align: center; padding: clamp(0.25rem, 0.45vw, 0.45rem) clamp(0.3rem, 0.5vw, 0.5rem); }

.inv__eb {
  width: clamp(22px, 2.5vw, 28px);
  height: clamp(22px, 2.5vw, 28px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;
  font-size: clamp(0.65rem, 0.9vw, 0.8rem);
  line-height: 1;
}

.inv__row:hover .inv__eb { opacity: 1; }
.inv__eb:hover { border-color: var(--accent-color); background: var(--bg-secondary); }

/* GRID */
.inv__grid {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-auto-rows: min-content;
  gap: 0.6rem;
  min-height: 0;
  align-content: start;
}

.inv__grid::-webkit-scrollbar { width: 5px; }
.inv__grid::-webkit-scrollbar-track { background: transparent; }
.inv__grid::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }

.inv__cd {
  position: relative;
  background: var(--bg-panel, #1e1e2e);
  border: 1px solid var(--border-color, #444);
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  transition: all 0.2s ease;
  cursor: pointer;
  color: var(--text-primary, #e0e0e0);
  min-width: 0;
  height: auto;
}

.inv__cd:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3); }

.inv__cd.c-bajo { border-color: rgba(245, 158, 11, 0.4); }
.inv__cd.c-bajo:hover { border-color: rgba(245, 158, 11, 0.6); box-shadow: 0 6px 16px rgba(245, 158, 11, 0.1); }
.inv__cd.c-agotado { border-color: rgba(239, 68, 68, 0.4); }
.inv__cd.c-agotado:hover { border-color: rgba(239, 68, 68, 0.6); box-shadow: 0 6px 16px rgba(239, 68, 68, 0.1); }
.inv__cd.c-ok { border-color: rgba(34, 197, 94, 0.3); }
.inv__cd.c-ok:hover { border-color: rgba(34, 197, 94, 0.5); box-shadow: 0 6px 16px rgba(34, 197, 94, 0.08); }
.inv__cd.c-normal { border-color: rgba(34, 197, 94, 0.2); }
.inv__cd.c-normal:hover { border-color: rgba(34, 197, 94, 0.35); }
.inv__cd.c-gaming { border-color: rgba(139, 92, 246, 0.35); }
.inv__cd.c-gaming:hover { border-color: rgba(139, 92, 246, 0.55); box-shadow: 0 6px 16px rgba(139, 92, 246, 0.1); }

.inv__cd-head { display: flex; align-items: center; justify-content: space-between; }

.inv__cd-id { font-size: 0.55rem; color: var(--text-secondary, #aaa); font-family: 'Courier New', monospace; letter-spacing: 0.02em; }

.inv__cd-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.d-agotado { background: #ef4444; box-shadow: 0 0 4px #ef4444; }
.d-bajo { background: #f59e0b; box-shadow: 0 0 4px #f59e0b; }
.d-ok, .d-normal { background: #22c55e; box-shadow: 0 0 4px #22c55e; }
.d-gaming { background: #8b5cf6; box-shadow: 0 0 4px #8b5cf6; }

.inv__cd-ico-wrap { display: flex; justify-content: center; padding: 0.25rem 0; }

.inv__cd-ico {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: var(--bg-secondary, #2a2a3a);
  border-radius: 50%;
  font-size: 1.2rem;
  border: 1px solid var(--border-color, #444);
  flex-shrink: 0;
}

.inv__cd-nm {
  margin: 0;
  font-size: 0.75rem;
  color: var(--accent-color, #ffd700);
  text-align: center;
  line-height: 1.25;
  font-family: 'HyliaSerif', serif;
}

.inv__cd-cat {
  text-align: center;
  font-size: 0.55rem;
  color: var(--text-secondary, #aaa);
  padding: 0.15rem 0.5rem;
  background: var(--bg-secondary, #2a2a3a);
  border-radius: 8px;
  align-self: center;
  margin-bottom: 0.1rem;
}

.inv__cd-stats { display: flex; flex-direction: column; gap: 0.3rem; }

.inv__cs {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.25rem 0.4rem;
  background: var(--bg-secondary, #2a2a3a);
  border-radius: 6px;
  transition: background 0.15s;
}

.inv__cs:hover { background: var(--border-color, #444); }

.inv__cs-ico { font-size: 0.85rem; flex-shrink: 0; width: 16px; text-align: center; }

.inv__cs-body { display: flex; justify-content: space-between; align-items: center; flex: 1; min-width: 0; }

.inv__cs-l { font-size: 0.55rem; color: var(--text-secondary, #aaa); }

.inv__cs-v {
  font-size: 0.65rem;
  font-family: 'Courier New', monospace;
  font-weight: 600;
  white-space: nowrap;
  color: var(--text-primary, #e0e0e0);
}

.inv__cs-v small { font-size: 0.5rem; font-weight: 400; color: var(--text-secondary, #aaa); margin-left: 0.05rem; }

.v-venta { color: #22c55e !important; }
.v-gain { color: #ffd700 !important; }
.v-agotado { color: #ef4444 !important; }
.v-bajo { color: #f59e0b !important; }
.v-ok { color: #22c55e !important; }
.v-normal { color: #22c55e !important; }

.inv__cd-bar-wrap { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.1rem; }

.inv__cd-bar-bg { flex: 1; height: 5px; background: var(--bg-secondary, #2a2a3a); border-radius: 3px; overflow: hidden; }

.inv__cd-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.bf-ok { background: #22c55e; }
.bf-normal { background: #22c55e; }
.bf-bajo { background: #f59e0b; }
.bf-agotado { background: #ef4444; }

.inv__cd-bar-pct { font-size: 0.55rem; color: var(--text-secondary, #aaa); font-family: 'Courier New', monospace; min-width: 26px; text-align: right; }

.inv__cd-ed {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--bg-secondary, #2a2a3a);
  cursor: pointer;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.15s;
  font-size: 0.7rem;
  line-height: 1;
  border: 1px solid var(--border-color, #444);
}

.inv__cd:hover .inv__cd-ed { opacity: 1; }
.inv__cd-ed:hover { background: #ffd700; border-color: #ffd700; }

@keyframes spin { to { transform: rotate(360deg); } }

/* RESPONSIVE */
@media (max-width: 1200px) {
  .inv__kpis { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .inv { height: auto; min-height: 100dvh; }
  .inv__kpis { grid-template-columns: repeat(2, 1fr); gap: 0.3rem; }
  .inv__kpi { padding: 0.3rem 0.45rem; gap: 0.4rem; }
  .inv__kpi-ico { width: 26px; height: 26px; font-size: 1rem; }
  .inv__kpi-l { font-size: 0.45rem; }
  .inv__kpi-v { font-size: 0.7rem; }
  .inv__bar { gap: 0.3rem; }
  .inv__ctrls select { padding: 0.3rem 0.45rem; font-size: 0.6rem; }
  .inv__tbl { font-size: 0.6rem; }
  .inv__tbl th { padding: 0.3rem 0.4rem; font-size: 0.5rem; }
  .inv__cell { padding: 0.3rem 0.4rem; }
  .inv__nn { max-width: 120px; }
  .inv__grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.35rem; }
  .inv__cd { padding: 0.45rem; }
  .inv__cd-ico { width: 32px; height: 32px; font-size: 1rem; }
  .inv__cd-nm { font-size: 0.58rem; }
  .inv__cd-ed { opacity: 1; }
}

@media (max-width: 480px) {
  .inv__kpis { grid-template-columns: repeat(2, 1fr); }
  .inv__head { flex-wrap: wrap; gap: 0.3rem; }
  .inv__title { font-size: 0.85rem; }
  .inv__grid { grid-template-columns: repeat(2, 1fr); gap: 0.3rem; }
  .inv__cd { padding: 0.4rem; gap: 0.25rem; }
  .inv__cd-ico { width: 28px; height: 28px; font-size: 0.9rem; }
  .inv__cd-nm { font-size: 0.52rem; min-height: 1.2em; }
  .inv__cd-stats { gap: 0.15rem; }
  .inv__cs { padding: 0.15rem 0.2rem; gap: 0.2rem; }
  .inv__cs-ico { display: none; }
  .inv__tbl th, .inv__cell { padding: 0.25rem 0.3rem; font-size: 0.55rem; }
  .inv__nn { max-width: 80px; }
}
</style>
