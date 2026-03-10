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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
        <div>
          <h2>🍬 Catálogo de Productos</h2>
          <p>Administra altas, cambios y bajas del catálogo.</p>
        </div>
        <div class="toolbar-actions">
          <input v-model="terminoBusqueda" type="text" placeholder="Buscar por nombre o código">
          <button type="button" class="btn-secondary" @click="abrirModalNuevoProducto">
            <span class="btn-icono">➕</span>
            <span class="btn-texto">Nuevo Producto</span>
          </button>
        </div>
      </header>

      <p v-if="mensaje" class="estado" :class="`estado-${mensajeTipo}`">{{ mensaje }}</p>

        <div class="product-grid">
          <p v-if="cargando" class="estado-tabla">Cargando productos...</p>
          <p v-else-if="productosFiltrados.length === 0" class="estado-tabla">No hay productos para mostrar.</p>
          <div v-else class="grid-layout">
            <article
              v-for="producto in productosFiltrados"
              :key="producto.idProducto"
              class="product-card"
              :class="{ low: Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) }"
            >
              <div class="card-banner">
                <span>#{{ producto.idProducto }}</span>
                <span>{{ producto.codigoBarras || 'Sin código' }}</span>
              </div>
              <h3><span class="product-emoji">{{ obtenerEmojiDulce(producto.idProducto) }}</span> {{ producto.nombre }}</h3>
              <p class="price">{{ formatoMoneda(Number(producto.precio_venta || 0)) }}</p>
              <p class="meta">Mayoreo: {{ producto.precio_mayoreo ? formatoMoneda(Number(producto.precio_mayoreo)) : '-' }}</p>
              <p class="meta">Stock: {{ producto.stock || 0 }}{{ producto.is_gramaje ? 'g' : '' }}</p>
              <div class="card-actions">
                <button type="button" class="btn-secondary btn-sm" @click="abrirModalEditarProducto(producto)">
                  <span class="btn-icono">✏️</span>
                  <span class="btn-texto">Editar</span>
                </button>
                <button type="button" class="btn-danger btn-sm" @click="handleDeleteProducto(producto)">
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
  background: var(--bg-primary);
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
  background: var(--bg-secondary);
  border: var(--border-width-thick) solid var(--border-color);
  border-radius: 8px;
}

.productos-panel::before {
  content: "";
  position: absolute;
  inset: 10px;
  border: 2px dashed color-mix(in srgb, var(--accent-color) 28%, transparent);
  pointer-events: none;
  border-radius: 8px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.9rem;
  position: relative;
  z-index: 1;
}

.toolbar h2 {
  font-size: clamp(1.1rem, 2.8vw, 1.5rem);
  letter-spacing: 0.06em;
  color: var(--accent-color);
  text-transform: uppercase;
  font-weight: 900;
  text-shadow: 2px 2px 0 var(--border-color);
}

.toolbar p {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.toolbar-actions {
  display: flex;
  gap: 0.55rem;
  align-items: center;
}

.toolbar-actions input {
  background: var(--bg-primary);
  border: var(--border-width) solid var(--border-color);
  padding: 0.5rem 0.8rem;
  color: var(--text-primary);
  border-radius: 4px;
}

.toolbar-actions button {
  border: var(--border-width) solid var(--border-color);
  padding: 0.5rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
  color: var(--btn-text, var(--bg-primary));
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 45%, var(--gradient-btn-end) 100%);
  cursor: pointer;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent-color) 30%, white), 0 3px 0 var(--border-color);
  transition: transform 80ms steps(2), filter 80ms linear;
}

.estado {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.product-grid {
  padding: 1rem;
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 250px);
  overflow-y: auto;
  border: var(--border-width) solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 6px;
  box-shadow: var(--shadow-inner) var(--bg-panel);
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.8rem;
}

.product-card {
  background: var(--bg-secondary);
  border: var(--border-width) solid var(--border-color);
  padding: 0.7rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 160px;
  box-shadow: 0 4px 0 var(--border-color);
  transition: transform 100ms steps(2);
}

.product-card.low {
  border-color: var(--error-color);
  box-shadow: 0 4px 0 color-mix(in srgb, var(--error-color) 70%, black);
}

.card-banner {
  display: flex;
  justify-content: space-between;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 0.35rem;
  font-family: "Courier New", monospace;
}

.product-card h3 {
  margin: 0;
  font-size: 0.92rem;
  color: var(--text-primary);
  font-weight: 800;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.price {
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--success-color);
  margin: 0.25rem 0;
  font-family: "Courier New", monospace;
}

.meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin: 0;
  font-family: "Courier New", monospace;
}

.card-actions {
  margin-top: 0.6rem;
  display: flex;
  gap: 0.4rem;
}

.card-actions button {
  flex: 1;
  border: 1px solid var(--border-color);
  padding: 0.35rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
}

.card-actions button:first-child {
  background: var(--success-color);
  color: var(--bg-primary);
}

.card-actions button:last-child {
  background: var(--error-color);
  color: var(--text-primary);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: var(--shadow-color);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.bg-fog {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: 
    radial-gradient(ellipse 90% 60% at 10% 50%, rgba(31, 91, 53, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse 70% 50% at 90% 40%, rgba(31, 91, 53, 0.1) 0%, transparent 50%);
  animation: bgFogDrift 10s ease-in-out infinite;
}

@keyframes bgFogDrift {
  0% { transform: translateX(-2%) translateY(0); }
  50% { transform: translateX(2%) translateY(-5px); }
  100% { transform: translateX(-2%) translateY(0); }
}

@media (max-width: 600px) {
  .toolbar { flex-direction: column; }
  .toolbar-actions { width: 100%; flex-direction: column; }
  .toolbar-actions input { width: 100%; }
  .toolbar-actions button { width: 100%; }
  .grid-layout { grid-template-columns: 1fr; }
}
</style>
