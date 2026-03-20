<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import ProductoFormModal from './modals/Productos/ProductoFormModal.vue';
import ProductoScannerModal from './modals/Productos/ProductoScannerModal.vue';

type ApiRespuesta<T> = {
  codigo: number;
  mensaje: string;
  datos: T;
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
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const productos = shallowRef<ProductoDTO[]>([]);
const cargando = ref(false);
const guardando = ref(false);
const terminoBusqueda = ref('');
const mensaje = ref('');
const mensajeTipo = ref<'ok' | 'error' | 'info'>('info');

const modalFormOpen = ref(false);
const modalScannerOpen = ref(false);
const selectedProduct = ref<ProductoDTO | null>(null);
const scannerCode = ref('');

const productosFiltrados = computed(() => {
  const termino = terminoBusqueda.value.trim().toLowerCase();
  if (!termino) return productos.value;
  
  const results: ProductoDTO[] = [];
  for (const producto of productos.value) {
    const nombre = (producto.nombre || '').toLowerCase();
    const codigo = (producto.codigoBarras || '').toLowerCase();
    if (nombre.includes(termino) || codigo.includes(termino)) {
      results.push(producto);
    }
  }
  return results;
});

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor || 0));
}

const EMOJIS_DULCES = ['🍬', '🍭', '🍫', '🍩', '🍪', '🧁', '🍰', '🎂', '🍮', '🍯', '🥤', '🍦', '🍧', '🍨', '🥧', '🥐', '🥨', '🥞', '🧇', '🥖'];

function obtenerEmojiDulce(id: number | undefined): string {
  const indice = (id ?? 0) % EMOJIS_DULCES.length;
  return EMOJIS_DULCES[indice];
}

function mostrarMensaje(texto: string, tipo: 'ok' | 'error' | 'info') {
  mensaje.value = texto;
  mensajeTipo.value = tipo;
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

async function cargarProductos() {
  cargando.value = true;
  try {
    const data = await fetchApi<ApiRespuesta<ProductoDTO[]>>(`${API_BASE}/productos/listarProductos`);
    productos.value = Array.isArray(data?.datos)
      ? [...data.datos].sort((a, b) => Number(a.idProducto || 0) - Number(b.idProducto || 0))
      : [];
  } catch (error) {
    productos.value = [];
    mostrarMensaje(`Error al cargar productos: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally {
    cargando.value = false;
  }
}

function abrirModalNuevoProducto() {
  selectedProduct.value = null;
  scannerCode.value = '';
  modalFormOpen.value = true;
}

function abrirModalEditarProducto(producto: ProductoDTO) {
  selectedProduct.value = producto;
  scannerCode.value = '';
  modalFormOpen.value = true;
}

async function handleSubmitProducto(payload: ProductoDTO) {
  if (!payload.nombre.trim()) {
    mostrarMensaje('El nombre del producto es obligatorio.', 'error');
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
      mostrarMensaje('Producto actualizado correctamente.', 'ok');
    } else {
      const data = await fetchApi<ApiRespuesta<ProductoDTO>>(
        `${API_BASE}/productos/agregarProducto`,
        { method: 'POST', body: JSON.stringify(payload) }
      );
      if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo agregar.');
      mostrarMensaje('Producto agregado correctamente.', 'ok');
    }

    await cargarProductos();
    modalFormOpen.value = false;
  } catch (error) {
    mostrarMensaje(`Error al guardar: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally {
    guardando.value = false;
  }
}

async function handleDeleteProducto(product?: ProductoDTO) {
  const target = product ?? selectedProduct.value;
  if (!target?.idProducto) return;
  selectedProduct.value = target;
  const id = selectedProduct.value?.idProducto;
  if (!id) return;
  const confirmacion = window.confirm(`Se eliminara el producto #${id}. Esta accion no se puede deshacer.`);
  if (!confirmacion) return;

  try {
    const data = await fetchApi<ApiRespuesta<unknown>>(`${API_BASE}/productos/eliminarProducto/${id}`, {
      method: 'DELETE'
    });
    if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo eliminar.');
    mostrarMensaje('Producto eliminado correctamente.', 'ok');
    modalFormOpen.value = false;
    await cargarProductos();
  } catch (error) {
    mostrarMensaje(`Error al eliminar: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  }
}

function handleScannerApply(code: string) {
  scannerCode.value = code;
  modalScannerOpen.value = false;
}

onMounted(() => cargarProductos());
</script>

<template>
  <main class="productos-layout">
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
<section class="panel productos-panel">
      <header class="toolbar">
        <div class="toolbar-title">
          <h2>🍬 Catálogo de Productos</h2>
          <p class="toolbar-subtitle">Administra altas, cambios y bajas del catálogo.</p>
          <span class="product-count" v-if="!cargando && productosFiltrados.length > 0">
            {{ productosFiltrados.length }} producto{{ productosFiltrados.length !== 1 ? 's' : '' }}
            <span v-if="terminoBusqueda.trim()" class="search-active">(filtrado)</span>
          </span>
        </div>
        <div class="toolbar-actions">
          <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              v-model="terminoBusqueda" 
              type="text" 
              placeholder="Buscar por nombre o código..."
              class="search-input"
            >
            <button 
              v-if="terminoBusqueda" 
              type="button" 
              class="search-clear"
              @click="terminoBusqueda = ''"
            >✕</button>
          </div>
          <button type="button" class="btn-primary" @click="abrirModalNuevoProducto">
            <span class="btn-icono">➕</span>
            <span class="btn-texto">Nuevo Producto</span>
          </button>
        </div>
      </header>

      <div v-if="mensaje" class="estado" :class="`estado-${mensajeTipo}`">
        <span class="estado-icono">{{ mensajeTipo === 'ok' ? '✓' : mensajeTipo === 'error' ? '⚠' : 'ℹ' }}</span>
        {{ mensaje }}
      </div>

        <div class="product-grid" :class="{ 'has-results': productosFiltrados.length > 0 && !cargando }">
          <div v-if="cargando" class="estado-tabla loading">
            <div class="loading-spinner"></div>
            <span>Cargando productos...</span>
          </div>
          <div v-else-if="productosFiltrados.length === 0" class="estado-tabla empty">
            <span class="empty-icon">{{ terminoBusqueda.trim() ? '🔍' : '📦' }}</span>
            <span>{{ terminoBusqueda.trim() ? 'No se encontraron productos' : 'No hay productos registrados' }}</span>
            <button v-if="!terminoBusqueda.trim()" type="button" class="btn-primary btn-sm" @click="abrirModalNuevoProducto">
              Agregar primer producto
            </button>
          </div>
          <div v-else class="grid-layout">
            <article
              v-for="producto in productosFiltrados"
              :key="producto.idProducto"
              class="product-card"
              :class="{ 
                'low-stock': Number(producto.stock || 0) <= Number(producto.cantidad_min || 0),
                'out-of-stock': Number(producto.stock || 0) === 0,
                'is-gramaje': producto.is_gramaje
              }"
            >
              <div class="card-header">
                <div class="card-badge" v-if="producto.is_gramaje">⚖️ Gramaje</div>
                <div class="card-id">#{{ producto.idProducto }}</div>
              </div>
              
              <div class="card-body">
                <h3 class="product-name">
                  <span class="product-emoji">{{ obtenerEmojiDulce(producto.idProducto) }}</span>
                  <span class="name-text">{{ producto.nombre }}</span>
                </h3>
                
                <p class="product-code" v-if="producto.codigoBarras">
                  📋 {{ producto.codigoBarras }}
                </p>
                <p class="product-code empty" v-else>📋 Sin código</p>
                
                <div class="price-section">
                  <div class="price-main">
                    <span class="price-label">Venta</span>
                    <span class="price-value">{{ formatoMoneda(Number(producto.precio_venta || 0)) }}</span>
                  </div>
                  <div class="price-secondary" v-if="producto.precio_mayoreo">
                    <span class="price-label">Mayoreo</span>
                    <span class="price-value">{{ formatoMoneda(Number(producto.precio_mayoreo)) }}</span>
                  </div>
                  <div class="price-secondary cost">
                    <span class="price-label">Costo</span>
                    <span class="price-value">{{ formatoMoneda(Number(producto.precio_costo || 0)) }}</span>
                  </div>
                </div>
                
                <div class="stock-section">
                  <div class="stock-info" :class="{ 'critical': Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) }">
                    <span class="stock-icon">{{ Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) ? '⚠️' : '📦' }}</span>
                    <span class="stock-current">{{ producto.stock || 0 }}{{ producto.is_gramaje ? 'g' : 'u' }}</span>
                  </div>
                  <div class="stock-range">
                    <span class="stock-min">Min: {{ producto.cantidad_min || 0 }}</span>
                    <span class="stock-divider">|</span>
                    <span class="stock-max">Max: {{ producto.cantidad_max || 0 }}</span>
                  </div>
                </div>
              </div>
              
              <div class="card-actions">
                <button type="button" class="btn-action btn-edit" @click="abrirModalEditarProducto(producto)">
                  <span class="btn-icono">✏️</span>
                  <span class="btn-texto">Editar</span>
                </button>
                <button type="button" class="btn-action btn-delete" @click="handleDeleteProducto(producto)">
                  <span class="btn-icono">🗑️</span>
                  <span class="btn-texto">Eliminar</span>
                </button>
              </div>
            </article>
          </div>
        </div>
    </section>

    <ProductoFormModal
      :open="modalFormOpen"
      :data="selectedProduct ?? undefined"
      :loading="guardando"
      :prefill-code="scannerCode"
      @submit="handleSubmitProducto"
      @delete="handleDeleteProducto"
      @close="modalFormOpen = false"
      @scan="modalScannerOpen = true"
    />

    <ProductoScannerModal
      :open="modalScannerOpen"
      @apply="handleScannerApply"
      @close="modalScannerOpen = false"
    />
  </main>
</template>

<style scoped>
.productos-layout {
  height: 100%;
  min-height: 0;
  width: 100%;
  padding: 1rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  position: relative;
  z-index: 1;
}

.productos-panel {
  flex: 1;
  min-height: 0;
  padding: 1rem;
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 0.8rem;
  position: relative;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: var(--border-width-thick) solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
}

.toolbar-title {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.toolbar h2 {
  font-size: clamp(1.2rem, 2.5vw, 1.5rem);
  letter-spacing: 0.04em;
  color: var(--accent-color);
  text-transform: uppercase;
  font-weight: 900;
  margin: 0;
}

.toolbar-subtitle {
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin: 0;
}

.product-count {
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: var(--bg-primary);
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  width: fit-content;
}

.search-active {
  color: var(--accent-color);
}

.toolbar-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  font-size: 0.9rem;
  pointer-events: none;
}

.search-input {
  background: var(--bg-primary);
  border: var(--border-width) solid var(--border-color);
  padding: 0.6rem 2rem 0.6rem 2rem;
  color: var(--text-primary);
  border-radius: 10px;
  font-size: 0.85rem;
  width: min(220px, 45vw);
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 25%, transparent);
}

.search-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.search-clear {
  position: absolute;
  right: 0.6rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.3rem;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.search-clear:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.btn-primary {
  border: var(--border-width) solid var(--border-color);
  padding: 0.6rem 1.1rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: "Courier New", monospace;
  color: var(--btn-text, var(--bg-primary));
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 50%, var(--gradient-btn-end) 100%);
  cursor: pointer;
  box-shadow: 0 4px 15px var(--shadow-color);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 10px;
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: translateY(0);
}

.estado {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.estado-icono {
  font-size: 1.1rem;
}

.estado-ok {
  background: color-mix(in srgb, var(--success-color) 15%, transparent);
  color: var(--success-color);
  border: 2px solid color-mix(in srgb, var(--success-color) 40%, transparent);
}

.estado-error {
  background: color-mix(in srgb, var(--error-color) 15%, transparent);
  color: var(--error-color);
  border: 2px solid color-mix(in srgb, var(--error-color) 40%, transparent);
}

.estado-info {
  background: color-mix(in srgb, var(--infoBlueColor) 15%, transparent);
  color: var(--infoBlueColor);
  border: 2px solid color-mix(in srgb, var(--infoBlueColor) 40%, transparent);
}

.product-grid {
  padding: 1rem;
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 250px);
  overflow-y: auto;
  border: var(--border-width) solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 10px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}

.product-grid.has-results {
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
}

.estado-tabla.loading,
.estado-tabla.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.6;
}

.empty button {
  margin-top: 0.5rem;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.8rem;
}

.product-card {
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: var(--border-width) solid var(--border-color);
  border-radius: 12px;
  padding: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
  box-sizing: border-box;
}

.card-glow {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: radial-gradient(circle at center, var(--accent-color), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.product-card:hover {
  transform: translateY(-5px);
  border-color: var(--accent-color);
  box-shadow: 0 8px 20px var(--shadow-color), inset 0 0 0 2px color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.product-card:hover .card-glow {
  opacity: 0.08;
}

.product-card.low-stock {
  border-color: var(--error-color);
}

.product-card.low-stock:hover {
  box-shadow: 0 8px 20px var(--shadow-color), inset 0 0 0 2px color-mix(in srgb, var(--error-color) 30%, transparent);
}

.product-card.out-of-stock {
  border-color: var(--error-color);
  background: color-mix(in srgb, var(--error-color) 10%, var(--bg-secondary));
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.8rem;
  background: var(--bg-primary);
  border-bottom: 2px solid var(--border-color);
}

.card-badge {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 20%, transparent);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.card-id {
  font-size: 0.7rem;
  font-family: "Courier New", monospace;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.card-body {
  padding: 0.8rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  text-align: center;
}

.product-name {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 800;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  line-height: 1.3;
}

.product-emoji {
  font-size: 1.8rem;
}

.name-text {
  word-break: break-word;
}

.product-code {
  font-size: 0.7rem;
  font-family: "Courier New", monospace;
  color: var(--text-secondary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.product-code.empty {
  opacity: 0.6;
  font-style: italic;
}

.price-section {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  justify-content: center;
}

.price-main,
.price-secondary {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.price-label {
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}

.price-value {
  font-size: 0.9rem;
  font-weight: 900;
  font-family: "Courier New", monospace;
}

.price-main .price-value {
  color: var(--success-color);
}

.price-secondary .price-value {
  color: var(--accent-color);
}

.price-secondary.cost .price-value {
  color: var(--text-secondary);
}

.stock-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.6rem;
  background: var(--bg-primary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
  width: 100%;
  box-sizing: border-box;
}

.stock-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.stock-info.critical {
  color: var(--error-color);
}

.stock-icon {
  font-size: 1rem;
}

.stock-current {
  font-size: 1rem;
  font-weight: 900;
  font-family: "Courier New", monospace;
}

.stock-range {
  font-size: 0.6rem;
  font-family: "Courier New", monospace;
  color: var(--text-secondary);
  display: flex;
  gap: 0.3rem;
}

.stock-divider {
  opacity: 0.5;
}

.card-actions {
  margin-top: auto;
  display: flex;
  gap: 0.5rem;
  padding: 0.6rem;
  background: var(--bg-primary);
  border-top: 2px solid var(--border-color);
}

.btn-action {
  flex: 1;
  border: var(--border-width) solid var(--border-color);
  padding: 0.5rem 0.4rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  transition: all 0.2s;
  border-radius: 8px;
}

.btn-edit {
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  color: var(--text-primary);
}

.btn-edit:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-delete {
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  color: var(--text-primary);
}

.btn-delete:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .toolbar { 
    flex-direction: column; 
    align-items: stretch;
  }
  .toolbar-title {
    text-align: center;
  }
  .product-count {
    margin: 0 auto;
  }
  .toolbar-actions { 
    width: 100%; 
    justify-content: center;
  }
  .search-wrapper {
    flex: 1;
  }
  .search-input { 
    width: 100%;
    min-width: unset;
  }
  .toolbar-actions button { 
    white-space: nowrap;
  }
  .grid-layout { 
    grid-template-columns: 1fr; 
  }
  .product-card {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .toolbar-actions {
    flex-direction: column;
  }
  .search-wrapper {
    width: 100%;
  }
  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>
