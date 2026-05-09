<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import ProductoFormModal from './modals/Productos/ProductoFormModal.vue';

type ApiRespuesta<T> = {
  codigo: number;
  mensaje: string;
  datos: T;
};

type CategoriaDTO = {
  idCategoria: number;
  nombre: string;
};

type ProductoDTO = {
  idProducto?: number;
  nombre: string;
  stock: number;
  codigoBarras: string | null;
  precio_costo: number;
  precio_venta: number;
  cantidad_min: number;
  cantidad_max: number;
  precio_mayoreo: number | null;
  is_gramaje: boolean;
  idCategoria?: number;
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const ICONOS = {
  espada: '⚔',
  escudo: '🛡',
  pocion: '🧪',
  moneda: '💰',
  cofre: '📦',
  runa: '🔮',
  gema: '💎',
  pergamino: '📜',
  llave: '🗝',
  corona: '👑',
  martillo: '🔨',
  flecha: '🏹',
  fuego: '🔥',
  hielo: '❄️',
  rayo: '⚡',
  corazon: '❤️',
};

function obtenerIcono(id: number | undefined): string {
  const iconKeys = Object.keys(ICONOS);
  const indice = (id ?? 0) % iconKeys.length;
  return ICONOS[iconKeys[indice] as keyof typeof ICONOS] || '📦';
}

function obtenerClaseStock(producto: ProductoDTO): string {
  const stock = Number(producto.stock || 0);
  const min = Number(producto.cantidad_min || 0);
  if (stock === 0) return 'agotado';
  if (stock < min) return 'bajo';
  if (stock >= min * 3) return 'abundante';
  return 'normal';
}

function obtenerMensajeStock(producto: ProductoDTO): string {
  const stock = Number(producto.stock || 0);
  const min = Number(producto.cantidad_min || 0);
  if (stock === 0) return 'AGOTADO';
  if (stock < min * 0.5) return 'CRÍTICO';
  if (stock < min) return 'BAJO';
  return '';
}

const cargando = ref(false);
const mensaje = ref('');
const productos = shallowRef<ProductoDTO[]>([]);
const categorias = shallowRef<CategoriaDTO[]>([]);

const gamingCategoryId = computed(() => {
  const cat = categorias.value.find(c => c.nombre.toLowerCase() === 'gaming');
  return cat ? cat.idCategoria : null;
});

function esCategoriaGaming(idCategoria: number | undefined): boolean {
  if (!idCategoria || !gamingCategoryId.value) return false;
  return idCategoria === gamingCategoryId.value;
}

const filtroBusqueda = ref('');
const filtroCategoria = ref<number | null>(null);
const ordenarPor = ref('nombre');
const verSoloProblemas = ref(false);

const modalFormOpen = ref(false);
const modalProductoEditando = ref<ProductoDTO | undefined>(undefined);
const guardando = ref(false);

const categoriasLista = computed(() => {
  return [{ idCategoria: null, nombre: 'Todas' }, ...categorias.value];
});

function obtenerNombreCategoria(idCategoria: number | undefined): string {
  if (!idCategoria) return 'Sin asignar';
  const cat = categorias.value.find(c => c.idCategoria === idCategoria);
  return cat ? cat.nombre : 'Sin asignar';
}

const productosFiltrados = computed(() => {
  let result = [...productos.value];
  
  if (verSoloProblemas.value) {
    result = result.filter(p => {
      const stock = Number(p.stock || 0);
      const min = Number(p.cantidad_min || 0);
      return stock < min;
    });
  }
  
  if (filtroBusqueda.value.trim()) {
    const term = filtroBusqueda.value.toLowerCase();
    result = result.filter(p => 
      p.nombre.toLowerCase().includes(term) ||
      String(p.idProducto).includes(term)
    );
  }
  
  if (filtroCategoria.value !== null) {
    result = result.filter(p => p.idCategoria === filtroCategoria.value);
  }
  
  switch (ordenarPor.value) {
    case 'stock':
      return result.sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
    case 'stock-desc':
      return result.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    case 'precio':
      return result.sort((a, b) => Number(a.precio_venta || 0) - Number(b.precio_venta || 0));
    case 'nombre':
    default:
      return result.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
});

const bajoStock = computed(() => {
  return productosFiltrados.value.filter((p) => {
    if (esCategoriaGaming(p.idCategoria)) return false;
    const stock = Number(p.stock || 0);
    const min = Number(p.cantidad_min || 0);
    return stock > 0 && stock < min;
  });
});

const productosAgotados = computed(() => {
  return productosFiltrados.value.filter((p) => {
    if (esCategoriaGaming(p.idCategoria)) return false;
    return Number(p.stock || 0) === 0;
  });
});

const costoTotalInventario = computed(() => {
  let sum = 0;
  for (const p of productosFiltrados.value) {
    if (esCategoriaGaming(p.idCategoria)) continue;
    const stock = Number(p.stock || 0);
    if (stock <= 0) continue;
    const costo = Number(p.precio_costo || 0);
    if (p.is_gramaje) {
      sum += (stock / 1000) * costo;
    } else {
      sum += stock * costo;
    }
  }
  return sum;
});

const valorTotalVenta = computed(() => {
  let sum = 0;
  for (const p of productosFiltrados.value) {
    if (esCategoriaGaming(p.idCategoria)) continue;
    const stock = Number(p.stock || 0);
    if (stock <= 0) continue;
    const venta = Number(p.precio_venta || 0);
    if (p.is_gramaje) {
      sum += (stock / 1000) * venta;
    } else {
      sum += stock * venta;
    }
  }
  return sum;
});

const gananciaReal = computed(() => {
  return valorTotalVenta.value - costoTotalInventario.value;
});

const productosInventario = computed(() => {
  return productosFiltrados.value.filter(p => !esCategoriaGaming(p.idCategoria));
});

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor || 0));
}

function formatoNumero(valor: number) {
  return new Intl.NumberFormat('es-MX').format(Number(valor || 0));
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function abrirModalEditarProducto(producto: ProductoDTO) {
  modalProductoEditando.value = { ...producto } as ProductoDTO;
  modalFormOpen.value = true;
}

async function handleSubmitProducto(payload: ProductoDTO) {
  if (!payload.nombre.trim()) {
    mensaje.value = 'El nombre del producto es obligatorio.';
    return;
  }

  guardando.value = true;
  try {
    if (payload.idProducto) {
      const data = await fetchApi<ApiRespuesta<ProductoDTO>>(
        `${API_BASE}/productos/actualizarProducto/${payload.idProducto}`,
        { method: 'PUT', body: JSON.stringify(payload) }
      );
      if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo actualizar.');
      mensaje.value = 'Producto actualizado correctamente.';
    }

    await cargarInventario();
    modalFormOpen.value = false;
  } catch (error) {
    mensaje.value = `Error al guardar: ${error instanceof Error ? error.message : 'Error inesperado.'}`;
  } finally {
    guardando.value = false;
  }
}

function handleCloseModal() {
  modalFormOpen.value = false;
  modalProductoEditando.value = undefined;
}

async function cargarInventario() {
  cargando.value = true;
  try {
    const data = await getJson<ApiRespuesta<ProductoDTO[]>>(`${API_BASE}/productos/listarProductos`);
    productos.value = Array.isArray(data?.datos)
      ? [...data.datos].sort((a, b) => a.nombre.localeCompare(b.nombre))
      : [];
    mensaje.value = '';
  } catch (error) {
    productos.value = [];
    mensaje.value = `Error al cargar inventario: ${error instanceof Error ? error.message : 'Error inesperado.'}`;
  } finally {
    cargando.value = false;
  }
}

async function cargarCategorias() {
  try {
    const data = await fetchApi<ApiRespuesta<CategoriaDTO[]>>(`${API_BASE}/categorias/listarCategorias`);
    categorias.value = Array.isArray(data?.datos) ? data.datos : [];
  } catch (_error) {
    categorias.value = [];
  }
}

onMounted(async () => {
  await cargarInventario();
  await cargarCategorias();
});
</script>

<template>
  <main class="inventario-layout">
    <div class="bg-fog"></div>
    <div class="bg-scanlines"></div>
    
    <header class="hero-section">
      <div class="hero-decoration left">❧</div>
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="title-icon">⚔</span>
          Inventario del Reino
          <span class="title-icon">⚔</span>
        </h1>
        <p class="hero-subtitle">Gestión de treasures y provisiones</p>
      </div>
      <div class="hero-decoration right">❧</div>
    </header>

    <section class="stats-section">
      <div class="stat-card-wrapper" v-for="(stat, index) in [
        { label: 'Total Items', value: productosInventario.length, icon: '📦', clase: '' },
        { label: 'Bajo Stock', value: bajoStock.length, icon: '⚠️', clase: 'warning' },
        { label: 'Agotados', value: productosAgotados.length, icon: '💀', clase: 'danger' },
        { label: 'Valor Inventario', value: formatoMoneda(costoTotalInventario), icon: '💰', clase: 'gold' },
        { label: 'Ganancia Real', value: formatoMoneda(gananciaReal), icon: '📈', clase: 'success' }
      ]" :key="index" :class="['stat-card', stat.clase]" :style="{ animationDelay: `${index * 0.1}s` }">
        <div class="stat-glow"></div>
        <div class="stat-icon-wrapper">
          <span class="stat-icon">{{ stat.icon }}</span>
        </div>
        <div class="stat-info">
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-value">{{ stat.value }}</span>
        </div>
        <div class="stat-decoration">✦</div>
      </div>
    </section>

    <div class="main-content">
      <aside class="sidebar-alerts">
        <div class="alert-panel" v-if="productosAgotados.length > 0">
          <header class="alert-header danger">
            <span class="alert-icon">💀</span>
            <h3>Items Agotados</h3>
          </header>
          <ul class="alert-list">
            <li v-for="p in productosAgotados.slice(0, 5)" :key="`ag-${p.idProducto}`" class="alert-item agotado">
              <span class="item-icon">{{ obtenerIcono(p.idProducto) }}</span>
              <span class="item-name">{{ p.nombre }}</span>
              <span class="item-badge danger">AGOTADO</span>
            </li>
          </ul>
          <p v-if="productosAgotados.length > 5" class="alert-more">
            +{{ productosAgotados.length - 5 }} más...
          </p>
        </div>

        <div class="alert-panel" v-if="bajoStock.length > 0">
          <header class="alert-header warning">
            <span class="alert-icon">⚠️</span>
            <h3>Stock Bajo</h3>
          </header>
          <ul class="alert-list">
            <li v-for="p in bajoStock.slice(0, 5)" :key="`low-${p.idProducto}`" class="alert-item bajo">
              <span class="item-icon">{{ obtenerIcono(p.idProducto) }}</span>
              <span class="item-name">{{ p.nombre }}</span>
              <span class="item-stock">{{ p.stock }}{{ p.is_gramaje ? 'g' : 'u' }}</span>
            </li>
          </ul>
          <p v-if="bajoStock.length > 5" class="alert-more">
            +{{ bajoStock.length - 5 }} más...
          </p>
        </div>

        <div class="info-panel" v-if="bajoStock.length === 0 && productosAgotados.length === 0 && !cargando">
          <div class="info-icon">✨</div>
          <p>Inventario en equilibrio perfecto</p>
          <p class="info-detail">No hay alertas pendientes</p>
        </div>
      </aside>

      <section class="catalog-section">
        <header class="catalog-header">
          <div class="catalog-title-row">
            <h2 class="catalog-title">
              <span class="title-icon">📜</span>
              Catálogo de Items
              <span class="item-count">({{ productosFiltrados.length }})</span>
            </h2>
            <button class="btn-refresh" @click="cargarInventario" :disabled="cargando">
              <span>{{ cargando ? '⏳' : '🔄' }}</span>
            </button>
          </div>

          <div class="catalog-filters">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input 
                type="text" 
                v-model="filtroBusqueda" 
                placeholder="Buscar item..."
                class="search-input"
              />
              <button v-if="filtroBusqueda" @click="filtroBusqueda = ''" class="search-clear">×</button>
            </div>

            <div class="filter-controls">
              <select v-model="filtroCategoria" class="filter-select">
                <option :value="null">🏷️ Todas</option>
                <option v-for="cat in categorias" :key="cat.idCategoria" :value="cat.idCategoria">
                  {{ cat.nombre }}
                </option>
              </select>

              <select v-model="ordenarPor" class="filter-select">
                <option value="nombre">Ordenar: Nombre</option>
                <option value="stock">Ordenar: Stock ↑</option>
                <option value="stock-desc">Ordenar: Stock ↓</option>
                <option value="precio">Ordenar: Precio</option>
              </select>

              <label class="filter-toggle">
                <input type="checkbox" v-model="verSoloProblemas" />
                <span class="toggle-slider"></span>
                <span class="toggle-label">Solo problemas</span>
              </label>
            </div>
          </div>
        </header>

        <div class="catalog-content">
          <div v-if="cargando" class="loading-state">
            <div class="loading-orb"></div>
            <p>Cargando inventario del reino...</p>
          </div>

          <p v-else-if="mensaje" class="error-state">
            <span class="error-icon">⚠️</span>
            {{ mensaje }}
          </p>

          <p v-else-if="productosFiltrados.length === 0" class="empty-state">
            <span class="empty-icon">📭</span>
            <span v-if="verSoloProblemas">No hay items con problemas</span>
            <span v-else>No se encontraron items</span>
          </p>

          <div v-else class="items-grid">
            <article 
              v-for="producto in productosFiltrados" 
              :key="producto.idProducto"
              :class="['item-card', esCategoriaGaming(producto.idCategoria) ? 'rentable' : obtenerClaseStock(producto)]"
              @click="abrirModalEditarProducto(producto)"
            >
              <div class="item-card-header">
                <div class="item-id">#{{ producto.idProducto }}</div>
                <span v-if="!esCategoriaGaming(producto.idCategoria) && obtenerMensajeStock(producto)" :class="['status-badge', obtenerClaseStock(producto)]">
                  {{ obtenerMensajeStock(producto) }}
                </span>
                <span v-if="esCategoriaGaming(producto.idCategoria)" class="rentable-badge-header">🎮 Rentable</span>
                <span v-if="producto.is_gramaje" class="gramaje-badge">⚖️</span>
                <button class="btn-edit-card" @click.stop="abrirModalEditarProducto(producto)" title="Editar producto">
                  ✏️
                </button>
              </div>
              
              <div class="item-icon-large">{{ obtenerIcono(producto.idProducto) }}</div>
              
              <h3 class="item-name" :title="producto.nombre">{{ producto.nombre }}</h3>
              
              <div class="item-stats">
                <div class="stat-row">
                  <span class="stat-label">Costo</span>
                  <span class="stat-value costo">{{ formatoMoneda(Number(producto.precio_costo || 0)) }}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Venta</span>
                  <span class="stat-value venta">{{ formatoMoneda(Number(producto.precio_venta || 0)) }}</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-row stock-row">
                  <span class="stat-label">Stock</span>
                  <span class="stat-value stock" :class="esCategoriaGaming(producto.idCategoria) ? 'rentable' : obtenerClaseStock(producto)">
                    <span v-if="esCategoriaGaming(producto.idCategoria)" class="rentable-badge">🎮 Rentable</span>
                    <span v-else>{{ formatoNumero(producto.stock) }}{{ producto.is_gramaje ? 'g' : 'u' }}</span>
                  </span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Mínimo</span>
                  <span class="stat-value min">{{ formatoNumero(producto.cantidad_min) }}{{ producto.is_gramaje ? 'g' : 'u' }}</span>
                </div>
              </div>

              <div class="item-progress" v-if="!esCategoriaGaming(producto.idCategoria)">
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    :style="{ width: `${Math.min(100, (producto.stock / (producto.cantidad_min * 3 || 1)) * 100)}%` }"
                    :class="obtenerClaseStock(producto)"
                  ></div>
                </div>
                <span class="progress-label">
                  {{ Math.round((producto.stock / (producto.cantidad_min * 3 || 1)) * 100) }}%
                </span>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>

    <ProductoFormModal
      :open="modalFormOpen"
      :data="modalProductoEditando"
      :loading="guardando"
      :categorias="categorias"
      @close="handleCloseModal"
      @submit="handleSubmitProducto"
    />
  </main>
</template>

<style>
.inventario-layout {
  background: var(--bg-primary) !important;
  color: var(--text-primar y) !important;
}

.stat-card {
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%) !important;
  border-color: var(--border-color) !important;
}

.stat-card.warning { border-color: var(--warning-color) !important; }
.stat-card.danger { border-color: var(--error-color) !important; }
.stat-card.gold { border-color: var(--accent-color) !important; }
.stat-card.success { border-color: var(--success-color) !important; }

.stat-value { color: var(--accent-color) !important; }
.stat-card.warning .stat-value { color: var(--warning-color) !important; }
.stat-card.danger .stat-value { color: var(--error-color) !important; }
.stat-card.success .stat-value { color: var(--success-color) !important; }

.hero-section {
  background: linear-gradient(135deg, var(--bg-panel) 0%, var(--bg-secondary) 100%) !important;
  border-color: var(--border-color) !important;
}

.hero-title, .hero-decoration { color: var(--accent-color) !important; }
.hero-subtitle { color: var(--text-secondary) !important; }

.alert-panel {
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%) !important;
  border-color: var(--border-color) !important;
}

.alert-header.danger {
  background: linear-gradient(90deg, var(--error-color) 0%, var(--bg-panel) 100%) !important;
  border-color: var(--error-color) !important;
}
.alert-header.danger h3 { color: var(--error-color) !important; }

.alert-header.warning {
  background: linear-gradient(90deg, var(--warning-color) 0%, var(--bg-panel) 100%) !important;
  border-color: var(--warning-color) !important;
}
.alert-header.warning h3 { color: var(--warning-color) !important; }

.alert-item.agotado {
  background: color-mix(in srgb, var(--error-color) 15%, transparent) !important;
}
.alert-item.agotado .item-name { color: var(--error-color) !important; }

.alert-item.bajo {
  background: color-mix(in srgb, var(--warning-color) 12%, transparent) !important;
}
.alert-item.bajo .item-name { color: var(--warning-color) !important; }

.item-stock { color: var(--warning-color) !important; }

.catalog-section {
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%) !important;
  border-color: var(--border-color) !important;
}

.catalog-header { background: var(--bg-primary) !important; border-color: var(--border-color) !important; }
.catalog-title { color: var(--accent-color) !important; }
.item-count { color: var(--text-secondary) !important; }

.search-input {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}
.search-input:focus { border-color: var(--accent-color) !important; box-shadow: 0 0 10px var(--accent-color) !important; }
.search-input::placeholder { color: var(--text-secondary) !important; }

.filter-select {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

.item-card {
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%) !important;
  border-color: var(--border-color) !important;
}

.item-card.bajo { border-color: var(--warning-color) !important; }
.item-card.agotado { border-color: var(--error-color) !important; }
.item-card.abundante { border-color: var(--success-color) !important; }
.item-card.rentable { border-color: #7c3aed !important; }

.item-card::before {
  background: linear-gradient(90deg, transparent, var(--accent-color), transparent) !important;
}

.item-card.bajo::before {
  background: linear-gradient(90deg, transparent, var(--warning-color), transparent) !important;
}
.item-card.agotado::before {
  background: linear-gradient(90deg, transparent, var(--error-color), transparent) !important;
}
.item-card.abundante::before {
  background: linear-gradient(90deg, transparent, var(--success-color), transparent) !important;
}
.item-card.rentable::before {
  background: linear-gradient(90deg, transparent, #7c3aed, transparent) !important;
}

.item-id { background: var(--bg-primary) !important; color: var(--text-secondary) !important; }
.item-icon-large { background: transparent !important; }
.item-name { color: var(--accent-color) !important; }
.item-stats { background: transparent !important;}

.stat-value.costo { color: var(--accent-color) !important; }
.stat-value.venta { color: var(--success-color) !important; }
.stat-value.stock.bajo { color: var(--warning-color) !important; }
.stat-value.stock.agotado { color: var(--error-color) !important; }
.stat-value.stock.normal, .stat-value.stock.abundante { color: var(--success-color) !important; }
.stat-label, .stat-value.min { color: var(--text-secondary) !important; }

.progress-bar { background: var(--bg-primary) !important; border-color: var(--border-color) !important; }
.progress-fill {
  background: linear-gradient(90deg, var(--warning-color), var(--accent-color)) !important;
}
.progress-fill.bajo { background: linear-gradient(90deg, var(--error-color), var(--accent-color)) !important; }
.progress-fill.agotado { background: var(--error-color) !important; }
.progress-fill.abundante { background: linear-gradient(90deg, var(--success-color), var(--accent-color)) !important; }
.progress-label { color: var(--text-secondary) !important; }

.status-badge.bajo { background: var(--warning-color) !important; color: var(--btn-text, var(--bg-primary)) !important; }
.status-badge.agotado { background: var(--error-color) !important; color: var(--text-primary) !important; }

.btn-edit-card { background: var(--accent-color) !important; color: var(--btn-text, var(--bg-primary)) !important; }
.btn-edit-card:hover { background: var(--accent-hover) !important; }

.loading-state, .error-state, .empty-state { color: var(--text-secondary) !important; }
.loading-orb {
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%) !important;
  box-shadow: 0 0 30px var(--accent-color) !important;
}

.info-panel {
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%) !important;
  border-color: var(--border-color) !important;
}
.info-panel p { color: var(--text-primary) !important; }
.info-detail { color: var(--text-secondary) !important; }

.alert-more { color: var(--text-secondary) !important; border-color: var(--border-color) !important; }
</style>

<style scoped>
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px var(--accent-color); opacity: 0.3; }
  50% { box-shadow: 0 0 20px var(--accent-color); opacity: 0.6; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.inventario-layout {
  height: 96vh;
  width: 100%;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  overflow: hidden;
}

@media (max-width: 768px) {
  .inventario-layout {
    height: 100dvh;
    padding: 0.4rem;
    gap: 0.4rem;
  }
  
  .hero-section {
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
    flex-shrink: 0;
  }
  
  .hero-title {
    font-size: 0.85rem;
    gap: 0.4rem;
  }
  
  .hero-decoration {
    font-size: 1.1rem;
  }
  
  .hero-subtitle {
    display: none;
  }
  
  .stats-section {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
    flex-shrink: 0;
  }
  
  .stat-card {
    padding: 0.4rem;
    gap: 0.25rem;
    border-radius: 8px;
    flex-direction: column;
    text-align: center;
    border-width: 2px;
  }
  
  .stat-icon-wrapper {
    width: 28px;
    height: 28px;
  }
  
  .stat-icon {
    font-size: 1rem;
  }
  
  .stat-label {
    font-size: 0.45rem;
  }
  
  .stat-value {
    font-size: 0.8rem;
  }
  
  .stat-info {
    align-items: center;
  }
  
  .stat-decoration {
    display: none;
  }
  
  .main-content {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  
  .sidebar-alerts {
    flex-direction: row;
    overflow-x: auto;
    gap: 0.4rem;
    flex-shrink: 0;
    max-height: 70px;
  }
  
  .alert-panel {
    min-width: 200px;
    flex-shrink: 0;
    border-radius: 8px;
    border-width: 2px;
  }
  
  .alert-header {
    padding: 0.3rem 0.5rem;
  }
  
  .alert-header h3 {
    font-size: 0.6rem;
  }
  
  .alert-icon {
    font-size: 0.75rem;
  }
  
  .alert-item {
    padding: 0.25rem 0.35rem;
    font-size: 0.6rem;
  }
  
  .item-icon {
    font-size: 0.7rem;
  }
  
  .catalog-section {
    flex: 1;
    overflow: hidden;
    min-height: 0;
    border-radius: 8px;
    border-width: 2px;
  }
  
  .catalog-header {
    padding: 0.4rem 0.5rem;
    flex-shrink: 0;
  }
  
  .catalog-title {
    font-size: 0.8rem;
  }
  
  .catalog-title-row {
    margin-bottom: 0.3rem;
  }
  
  .catalog-filters {
    gap: 0.3rem;
  }
  
  .search-box {
    min-width: 100%;
  }
  
  .search-input {
    padding: 0.35rem 2rem 0.35rem 2rem;
    font-size: 0.75rem;
    border-width: 2px;
  }
  
  .search-icon {
    left: 0.6rem;
    font-size: 0.8rem;
  }
  
  .catalog-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.4rem;
    min-height: 0;
  }
  
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.4rem;
  }
  
  .item-card {
    padding: 0.4rem;
    border-radius: 8px;
    border-width: 2px;
  }
  
  .item-card-header {
    margin-bottom: 0.15rem;
  }
  
  .item-id {
    font-size: 0.5rem;
    padding: 0.1rem 0.25rem;
  }
  
  .status-badge {
    font-size: 0.45rem;
    padding: 0.1rem 0.25rem;
  }
  
  .gramaje-badge {
    font-size: 0.6rem;
  }
  
  .btn-edit-card {
    width: 20px;
    height: 20px;
    font-size: 0.6rem;
    opacity: 1;
  }
  
  .item-icon-large {
    font-size: 1.8rem;
    padding: 0.25rem;
    margin-bottom: 0.15rem;
  }
  
  .item-name {
    font-size: 0.7rem;
    min-height: auto;
    margin-bottom: 0.15rem;
    line-height: 1.2;
  }
  
  .item-stats {
    padding: 0.25rem;
    gap: 0.15rem;
  }
  
  .stat-row {
    font-size: 0.55rem;
  }
  
  .stat-label {
    font-size: 0.5rem;
  }
  
  .stat-value {
    font-size: 0.6rem;
  }
  
  .item-progress {
    display: flex;
    gap: 0.2rem;
  }
  
  .progress-bar {
    height: 5px;
  }
  
  .btn-refresh {
    width: 28px;
    height: 28px;
    font-size: 1rem;
  }
  
  .filter-select {
    padding: 0.35rem 0.6rem;
    font-size: 0.7rem;
    border-width: 2px;
  }
  
  .toggle-slider {
    width: 32px;
    height: 18px;
  }
  
  .toggle-slider::after {
    width: 12px;
    height: 12px;
  }
  
  .filter-toggle input:checked + .toggle-slider::after {
    left: 16px;
  }
  
  .toggle-label {
    font-size: 0.6rem;
  }
}

@media (max-width: 576px) {
  .hero-title {
    font-size: 0.8rem;
    gap: 0.3rem;
  }
  
  .hero-decoration {
    font-size: 1rem;
  }
  
  .stat-card {
    padding: 0.35rem;
  }
  
  .stat-icon-wrapper {
    width: 26px;
    height: 26px;
  }
  
  .stat-icon {
    font-size: 0.9rem;
  }
  
  .stat-label {
    font-size: 0.4rem;
  }
  
  .stat-value {
    font-size: 0.75rem;
  }
  
  .sidebar-alerts {
    max-height: 60px;
  }
  
  .alert-panel {
    min-width: 180px;
  }
  
  .catalog-title {
    font-size: 0.75rem;
  }
  
  .search-input {
    padding: 0.3rem 1.8rem 0.3rem 1.8rem;
    font-size: 0.7rem;
  }
  
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 0.35rem;
  }
  
  .item-card {
    padding: 0.35rem;
  }
  
  .item-icon-large {
    font-size: 1.6rem;
  }
  
  .item-name {
    font-size: 0.65rem;
  }
  
  .item-stats {
    padding: 0.2rem;
  }
  
  .stat-row {
    font-size: 0.5rem;
  }
  
  .stat-label {
    font-size: 0.45rem;
  }
  
  .stat-value {
    font-size: 0.55rem;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 0.7rem;
    gap: 0.25rem;
  }
  
  .hero-decoration {
    font-size: 0.9rem;
  }
  
  .stats-section {
    gap: 0.3rem;
  }
  
  .stat-card {
    padding: 0.3rem;
    gap: 0.15rem;
  }
  
  .stat-icon-wrapper {
    width: 24px;
    height: 24px;
  }
  
  .stat-icon {
    font-size: 0.85rem;
  }
  
  .stat-label {
    font-size: 0.38rem;
  }
  
  .stat-value {
    font-size: 0.7rem;
  }
  
  .sidebar-alerts {
    max-height: 55px;
    gap: 0.3rem;
  }
  
  .alert-panel {
    min-width: 160px;
  }
  
  .alert-header h3 {
    font-size: 0.55rem;
  }
  
  .catalog-title {
    font-size: 0.7rem;
  }
  
  .search-input {
    padding: 0.25rem 1.5rem 0.25rem 1.5rem;
    font-size: 0.65rem;
  }
  
  .filter-select {
    padding: 0.3rem 0.5rem;
    font-size: 0.65rem;
  }
  
  .items-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.3rem;
  }
  
  .item-card {
    padding: 0.3rem;
  }
  
  .item-card-header {
    flex-wrap: wrap;
  }
  
  .item-id {
    font-size: 0.45rem;
  }
  
  .status-badge {
    font-size: 0.4rem;
  }
  
  .gramaje-badge {
    font-size: 0.55rem;
  }
  
  .btn-edit-card {
    width: 18px;
    height: 18px;
    font-size: 0.55rem;
  }
  
  .item-icon-large {
    font-size: 1.4rem;
  }
  
  .item-name {
    font-size: 0.6rem;
  }
  
  .item-stats {
    display: none;
  }
  
  .item-progress {
    display: none;
  }
  
  .btn-refresh {
    width: 26px;
    height: 26px;
  }
}

@media (max-width: 400px) {
  .inventario-layout {
    height: 145dvh;
    padding: 0.3rem;
    gap: 0.25rem;
    overflow-y: auto;
  }
  
  .hero-section {
    padding: 0.25rem 0.4rem;
  }
  
  .hero-title {
    font-size: 0.65rem;
  }
  
  .hero-decoration {
    font-size: 0.8rem;
  }
  
  .stats-section {
    gap: 0.2rem;
  }
  
  .stat-card {
    padding: 0.25rem;
    gap: 0.1rem;
  }
  
  .stat-icon-wrapper {
    width: 22px;
    height: 22px;
  }
  
  .stat-icon {
    font-size: 0.8rem;
  }
  
  .stat-label {
    font-size: 0.35rem;
  }
  
  .stat-value {
    font-size: 0.65rem;
  }
  
  .sidebar-alerts {
    max-height: 50px;
    gap: 0.2rem;
  }
  
  .alert-panel {
    min-width: 150px;
  }
  
  .catalog-header {
    padding: 0.3rem 0.4rem;
  }
  
  .catalog-title {
    font-size: 0.65rem;
  }
  
  .catalog-title-row {
    margin-bottom: 0.2rem;
  }
  
  .search-input {
    padding: 0.2rem 1.3rem 0.2rem 1.3rem;
    font-size: 0.6rem;
  }
  
  .search-icon {
    left: 0.4rem;
  }
  
  .filter-select {
    padding: 0.25rem 0.4rem;
    font-size: 0.6rem;
  }
  
  .catalog-content {
    padding: 0.3rem;
  }
  
  .items-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.25rem;
  }
  
  .item-card {
    padding: 0.25rem;
  }
  
  .item-icon-large {
    font-size: 1.2rem;
  }
  
  .item-name {
    font-size: 0.55rem;
  }
  
  .btn-refresh {
    width: 24px;
    height: 24px;
    font-size: 0.85rem;
  }
  
  .toggle-slider {
    width: 28px;
    height: 16px;
  }
  
  .toggle-slider::after {
    width: 10px;
    height: 10px;
  }
  
  .toggle-label {
    font-size: 0.55rem;
  }
}

.hero-subtitle {
  margin: 0.25rem 0 0;
  font-family: 'HyliaSerif', 'Palatino Linotype', serif;
  font-size: 0.75rem;
  color: var(--text-secondary);
  letter-spacing: 0.2em;
  font-style: italic;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  animation: fadeSlideUp 500ms ease-out 200ms both;
  flex-shrink: 0;
}

.stat-card {
  position: relative;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  animation: fadeSlideUp 400ms ease-out both;
}

.stat-card:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 10px 30px var(--shadow-color);
}

.stat-card.warning {
  border-color: var(--warning-color);
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
}

.stat-card.danger {
  border-color: var(--error-color);
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
}

.stat-card.gold {
  border-color: var(--accent-color);
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
}

.stat-card.success {
  border-color: var(--success-color);
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
}

.stat-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, var(--accent-color) 0%, transparent 70%);
  opacity: 0.1;
  pointer-events: none;
}

.stat-icon-wrapper {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border-radius: 10px;
  flex-shrink: 0;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.stat-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--accent-color);
  font-family: 'HyliaSerif', 'Palatino Linotype', serif;
  text-shadow: 1px 1px 0 var(--shadow-color);
}

.stat-card.warning .stat-value { color: var(--warning-color); }
.stat-card.danger .stat-value { color: var(--error-color); }
.stat-card.gold .stat-value { color: var(--accent-color); }
.stat-card.success .stat-value { color: var(--success-color); }

.stat-decoration {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.6rem;
  color: var(--accent-color);
  opacity: 0.3;
}

.main-content {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 0.75rem;
  flex: 1;
  min-height: 0;
  animation: fadeSlideUp 500ms ease-out 400ms both;
  overflow: hidden;
}

.sidebar-alerts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
}

.alert-panel {
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 2px solid;
}

.alert-header.danger {
  background: linear-gradient(90deg, color-mix(in srgb, var(--error-color) 40%, var(--bg-panel)) 0%, var(--bg-panel) 100%);
  border-color: var(--error-color);
}

.alert-header.warning {
  background: linear-gradient(90deg, color-mix(in srgb, var(--warning-color) 40%, var(--bg-panel)) 0%, var(--bg-panel) 100%);
  border-color: var(--warning-color);
}

.alert-header h3 {
  margin: 0;
  font-family: 'HyliaSerif', 'Palatino Linotype', serif;
  font-size: 0.85rem;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.alert-header.danger h3 {
  color: var(--error-color);
}

.alert-header.warning h3 {
  color: var(--warning-color);
}

.alert-icon {
  font-size: 1rem;
}

.alert-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.75rem;
  transition: background 0.2s;
}

.alert-item:hover {
  background: var(--accent-color);
  opacity: 0.15;
}

.alert-item:last-child {
  border-bottom: none;
}

.alert-item.agotado {
  background: color-mix(in srgb, var(--error-color) 20%, transparent);
}

.alert-item.agotado .item-name {
  color: var(--error-color);
}

.alert-item.bajo {
  background: color-mix(in srgb, var(--warning-color) 15%, transparent);
}

.alert-item.bajo .item-name {
  color: var(--warning-color);
}

.item-icon {
  font-size: 0.9rem;
}

.item-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'HyliaSerif', 'Palatino Linotype', serif;
}

.item-badge {
  font-size: 0.55rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.item-badge.danger {
  background: var(--error-color);
  color: var(--bg-primary);
}

.item-stock {
  font-weight: 700;
  color: var(--warning-color);
  font-family: 'Courier New', monospace;
}

.alert-more {
  padding: 0.5rem 1rem;
  margin: 0;
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-align: center;
  font-style: italic;
  border-top: 1px solid var(--border-color);
  opacity: 0.5;
}

.info-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  text-align: center;
  gap: 0.5rem;
}

.info-icon {
  font-size: 2rem;
  animation: float 3s ease-in-out infinite;
}

.info-panel p {
  margin: 0;
  font-family: 'HyliaSerif', 'Palatino Linotype', serif;
  color: var(--text-primary);
}

.info-detail {
  font-size: 0.75rem !important;
  color: var(--text-secondary) !important;
  font-style: italic;
}

.catalog-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.catalog-header {
  padding: 0.75rem 1rem;
  background: var(--bg-primary);
  border-bottom: 2px solid var(--border-color);
  flex-shrink: 0;
}

.catalog-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.catalog-title {
  margin: 0;
  font-family: 'HyliaSerif', 'Palatino Linotype', serif;
  font-size: 1.2rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-count {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.btn-refresh {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-end) 100%);
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  transform: rotate(180deg);
  filter: brightness(1.2);
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.catalog-filters {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 200px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.8rem;
  font-size: 0.9rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.6rem 2.5rem 0.6rem 2.5rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'HyliaSerif', 'Palatino Linotype', serif;
  font-size: 0.85rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 10px var(--accent-color);
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.search-clear {
  position: absolute;
  right: 0.5rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  border-radius: 50%;
}

.search-clear:hover {
  background: var(--error-color);
  color: var(--text-primary);
}

.filter-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-select {
  padding: 0.6rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'HyliaSerif', 'Palatino Linotype', serif;
  font-size: 0.8rem;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: var(--accent-color);
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.filter-toggle input {
  display: none;
}

.toggle-slider {
  width: 36px;
  height: 20px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  position: relative;
  transition: all 0.3s;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  background: var(--text-secondary);
  border-radius: 50%;
  transition: all 0.3s;
}

.filter-toggle input:checked + .toggle-slider {
  background: var(--accent-color);
  border-color: var(--accent-color);
}

.filter-toggle input:checked + .toggle-slider::after {
  left: 18px;
  background: var(--bg-primary);
}

.toggle-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: 'HyliaSerif', 'Palatino Linotype', serif;
}

.catalog-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  min-height: 0;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem;
  color: var(--text-secondary);
  font-family: 'HyliaSerif', 'Palatino Linotype', serif;
}

.loading-orb {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%);
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 30px var(--accent-color);
}

.error-icon,
.empty-icon {
  font-size: 3rem;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.item-card {
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border: 3px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.item-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.item-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px var(--shadow-color);
}

.item-card:hover::before {
  opacity: 1;
}

.item-card.bajo {
  border-color: var(--warning-color, #daa520);
}

.item-card.bajo::before {
  background: linear-gradient(90deg, transparent, var(--warning-color, #daa520), transparent);
}

.item-card.agotado {
  border-color: var(--error-color);
}

.item-card.agotado::before {
  background: linear-gradient(90deg, transparent, var(--error-color), transparent);
}

.item-card.abundante {
  border-color: var(--success-color);
}

.item-card.abundante::before {
  background: linear-gradient(90deg, transparent, var(--success-color), transparent);
}

.item-card.rentable {
  border-color: #7c3aed;
}

.item-card.rentable::before {
  background: linear-gradient(90deg, transparent, #7c3aed, transparent);
}

.item-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.item-id {
  font-size: 0.65rem;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
  background: var(--bg-primary);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.status-badge {
  font-size: 0.55rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.bajo {
  background: var(--warning-color, #daa520);
  color: var(--bg-primary);
}

.status-badge.agotado {
  background: var(--error-color);
  color: var(--text-primary);
}

.gramaje-badge {
  font-size: 0.8rem;
}

.rentable-badge-header {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.rentable-badge {
  color: #7c3aed;
  font-weight: 700;
  font-size: 0.85rem;
}

.stat-value.stock.rentable {
  color: #7c3aed !important;
}

.btn-edit-card {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--accent-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
  opacity: 0;
  color: var(--btn-text, var(--bg-primary));
}

.item-card:hover .btn-edit-card {
  opacity: 1;
}

.btn-edit-card:hover {
  background: var(--accent-hover);
  transform: scale(1.1);
}

.item-icon-large {
  text-align: center;
  font-size: 2.5rem;
  padding: 0.5rem;
  background: var(--bg-primary);
  border-radius: 8px;
  line-height: 1;
}

.item-name {
  margin: 0;
  font-family: 'HyliaSerif', 'Palatino Linotype', serif;
  font-size: 0.85rem;
  color: var(--accent-color);
  text-align: center;
  line-height: 1.4;
  word-break: normal;
  overflow-wrap: break-word;
  white-space: normal;
  display: block;
  min-height: 2.8em;
}

.item-stats {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.5rem;
  background: var(--bg-primary);
  border-radius: 6px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
}

.stat-label {
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.stat-value.costo {
  color: var(--accent-color);
}

.stat-value.venta {
  color: var(--success-color);
}

.stat-value.stock {
  font-size: 0.85rem;
}

.stat-value.stock.bajo {
  color: var(--warning-color, #daa520);
}

.stat-value.stock.agotado {
  color: var(--error-color);
}

.stat-value.stock.normal,
.stat-value.stock.abundante {
  color: var(--success-color);
}

.stat-value.min {
  color: var(--text-secondary);
}

.stat-divider {
  height: 1px;
  background: var(--border-color);
  opacity: 0.3;
  margin: 0.2rem 0;
}

.stock-row {
  margin-top: 0.2rem;
  padding-top: 0.2rem;
  border-top: 1px dashed var(--border-color);
}

.item-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  opacity: 0.3;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
  background: linear-gradient(90deg, var(--warning-color, #daa520), var(--accent-color));
}

.progress-fill.bajo {
  background: linear-gradient(90deg, var(--error-color), var(--accent-hover, var(--accent-color)));
}

.progress-fill.agotado {
  background: var(--error-color);
}

.progress-fill.abundante {
  background: linear-gradient(90deg, var(--success-color), var(--accent-color));
}

.progress-label {
  font-size: 0.6rem;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
  min-width: 35px;
  text-align: right;
}

.inventario-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(90deg, transparent, var(--bg-secondary), transparent);
  animation: fadeSlideUp 500ms ease-out 600ms both;
}

@media (max-width: 1200px) {
  .stats-section {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .sidebar-alerts {
    flex-direction: row;
    overflow-x: auto;
    gap: 0.5rem;
  }
  
  .alert-panel {
    min-width: 280px;
    flex-shrink: 0;
  }
}

@media (max-width: 992px) {
  .inventario-layout {
    padding: 0.5rem;
    gap: 0.75rem;
  }

  .hero-section {
    padding: 1rem;
  }

  .hero-title {
    font-size: clamp(1.2rem, 4vw, 1.8rem);
  }

  .stats-section {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .stat-card {
    padding: 0.8rem;
    gap: 0.6rem;
  }

  .stat-icon-wrapper {
    width: 40px;
    height: 40px;
  }

  .stat-icon {
    font-size: 1.2rem;
  }

  .stat-value {
    font-size: 0.95rem;
  }

  .stat-label {
    font-size: 0.55rem;
  }

  .catalog-section {
    border-radius: 8px;
  }

  .catalog-header {
    padding: 0.75rem 1rem;
  }

  .catalog-title {
    font-size: 1rem;
  }

  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
  }

  .item-card {
    padding: 0.75rem;
  }

  .item-icon-large {
    font-size: 2rem;
  }

  .item-name {
    font-size: 0.8rem;
  }
}

@media (max-width: 768px) {
  .inventario-layout {
    min-height: auto;
    padding: 0.5rem;
  }

  .hero-section {
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
  }

  .hero-decoration {
    display: none;
  }

  .hero-title {
    font-size: 1.1rem;
    gap: 0.4rem;
  }

  .hero-subtitle {
    font-size: 0.75rem;
  }

  .stats-section {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
  }

  .stat-card {
    padding: 0.6rem;
    gap: 0.4rem;
    flex-direction: column;
    text-align: center;
    border-radius: 8px;
  }

  .stat-icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .stat-info {
    align-items: center;
  }

  .main-content {
    gap: 0.5rem;
  }

  .sidebar-alerts {
    display: none;
  }

  .catalog-header {
    padding: 0.5rem;
  }

  .catalog-title-row {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .catalog-title {
    font-size: 0.9rem;
  }

  .catalog-filters {
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-box {
    min-width: 100%;
  }

  .filter-controls {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .filter-select {
    flex: 1;
    min-width: 120px;
  }

  .filter-toggle {
    flex: 1;
  }

  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  .item-card {
    padding: 0.5rem;
  }

  .item-card-header {
    flex-wrap: wrap;
  }

  .item-icon-large {
    font-size: 1.8rem;
    padding: 0.3rem;
  }

  .item-name {
    font-size: 0.75rem;
    min-height: 2.2em;
  }

  .item-stats {
    padding: 0.35rem;
    gap: 0.2rem;
  }

  .stat-row {
    font-size: 0.65rem;
  }

  .stat-label {
    font-size: 0.55rem;
  }

  .stat-value {
    font-size: 0.7rem;
  }

  .item-progress {
    display: flex;
    gap: 0.3rem;
  }

  .progress-bar {
    height: 6px;
    flex: 1;
  }

  .progress-label {
    font-size: 0.55rem;
    min-width: 30px;
  }

  .btn-edit-card {
    opacity: 1;
    width: 24px;
    height: 24px;
    font-size: 0.7rem;
  }
}
</style>
