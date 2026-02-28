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
    <section class="panel productos-panel">
      <header class="toolbar productos-toolbar">
        <div>
          <h2>Catálogo de Productos</h2>
          <p>Administra altas, cambios y bajas del catálogo.</p>
        </div>
        <div class="toolbar-actions">
          <input v-model="terminoBusqueda" type="text" placeholder="Buscar por nombre o código">
          <button type="button" class="btn-secondary" @click="abrirModalNuevoProducto">
            <span class="btn-icono">+</span>
            <span class="btn-texto">Nuevo</span>
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
              <h3>{{ producto.nombre }}</h3>
              <p class="price">{{ formatoMoneda(Number(producto.precio_venta || 0)) }}</p>
              <p class="meta">Mayoreo: {{ producto.precio_mayoreo ? formatoMoneda(Number(producto.precio_mayoreo)) : '-' }}</p>
              <p class="meta">Stock: {{ producto.stock || 0 }}{{ producto.is_gramaje ? 'g' : '' }}</p>
              <div class="card-actions">
                <button type="button" class="btn-secondary btn-sm" @click="abrirModalEditarProducto(producto)">
                  <span class="btn-icono">✎</span>
                  <span class="btn-texto">Editar</span>
                </button>
                <button type="button" class="btn-danger btn-sm" @click="handleDeleteProducto(producto)">
                  <span class="btn-icono">✕</span>
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
}

.productos-panel {
  flex: 1;
  min-height: 0;
  padding: 1rem;
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 0.8rem;
  position: relative;
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
  font-weight: 600;
  margin: 0;
}

.toolbar-actions {
  display: flex;
  gap: 0.55rem;
  align-items: center;
}

.toolbar-actions input {
  padding: 0.5rem 0.8rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.estado {
  font-size: 0.8rem;
  text-transform: uppercase;
}

.product-grid {
  padding: 1rem;
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.8rem;
}

.product-card {
  padding: 0.7rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 160px;
  transition: transform 100ms ease;
  border-radius: 8px;
}

.product-card:hover {
  transform: translateY(-2px);
}

.card-banner {
  display: flex;
  justify-content: space-between;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
}

.product-card h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
}

.price {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0.25rem 0;
}

.meta {
  font-size: 0.75rem;
  margin: 0;
}

.card-actions {
  margin: 0.6rem auto auto auto;
  display: flex;
  gap: 0.4rem;
}

.card-actions button {
  padding: 0.35rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: filter 100ms ease;
}

.card-actions button:first-child {
  background: var(--accent-color);
  color: #fff;
}

.card-actions button:last-child {
  background: var(--error-color);
  color: #fff;
}

.card-actions button:hover {
  filter: brightness(1.1);
}

.card-actions button:active {
  transform: translateY(1px);
}

.estado-tabla {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

@media (max-width: 600px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .toolbar-actions {
    flex-wrap: wrap;
  }
  .grid-layout {
    grid-template-columns: 1fr;
  }
}
</style>
