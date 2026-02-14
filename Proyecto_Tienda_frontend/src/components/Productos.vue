<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
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

const productos = ref<ProductoDTO[]>([]);
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
  return productos.value.filter((producto) => {
    const nombre = (producto.nombre || '').toLowerCase();
    const codigo = (producto.codigoBarras || '').toLowerCase();
    return nombre.includes(termino) || codigo.includes(termino);
  });
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
  --pixel-gold: #f8d667;
  --pixel-amber: #c79634;
  --pixel-forest: #1f5b35;
  --pixel-forest-dark: #133523;
  --pixel-bg: #07150d;
  --pixel-ink: #1a1401;
  --pixel-paper: #f6f2de;
  --pixel-rupee: #67e0a8;
  --pixel-rupee-dark: #2a9d5c;
  height: 100%;
  min-height: 0;
  width: 100%;
  padding: 1rem;
  background:
    linear-gradient(180deg, #0a1912 0%, var(--pixel-bg) 100%),
    radial-gradient(circle at 12% 18%, rgba(248, 214, 103, 0.12) 0 6px, transparent 7px),
    radial-gradient(circle at 86% 84%, rgba(248, 214, 103, 0.08) 0 6px, transparent 7px);
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

.productos-panel::before {
  content: "";
  position: absolute;
  inset: 10px;
  border: 2px dashed rgba(248, 214, 103, 0.28);
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
  color: var(--pixel-gold);
  text-transform: uppercase;
  font-weight: 900;
  text-shadow: 2px 2px 0 #000, -1px -1px 0 #000;
}

.toolbar-actions {
  display: flex;
  gap: 0.55rem;
  align-items: center;
}

.toolbar-actions button {
  border: 3px solid #2a1807;
  padding: 0.5rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
  color: var(--pixel-ink);
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  cursor: pointer;
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 3px 0 #6f4b1c, 0 5px 8px rgba(0, 0, 0, 0.3);
  transition: transform 80ms steps(2), filter 80ms linear;
}

.toolbar-actions button:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.toolbar-actions button:active {
  transform: translateY(2px);
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 1px 0 #6f4b1c;
}

.estado {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--pixel-paper);
  letter-spacing: 0.05em;
}

.tabla-wrap {
  overflow: auto;
  border: 4px solid #2a1807;
  background: var(--pixel-paper);
  color: var(--pixel-ink);
  box-shadow: 
    inset 0 0 0 3px #d4c27e,
    0 8px 0 #271c0f,
    0 12px 20px rgba(0, 0, 0, 0.4);
  min-height: 300px;
  max-height: 70vh;
  display: flex;
  align-items: stretch;
  position: relative;
}

.product-grid {
  padding: 1rem;
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
  border: 3px solid #2a1807;
  background: var(--pixel-paper);
  border-radius: 6px;
  box-shadow: inset 0 0 0 3px #d4c27e;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.8rem;
}

.product-card {
  background: linear-gradient(180deg, #fdfbf3 0%, #e8d9a8 100%);
  border: 3px solid #2a1807;
  padding: 0.7rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 160px;
  box-shadow: 
    inset 0 0 0 2px rgba(255, 255, 255, 0.5),
    0 4px 0 #1a1005,
    0 6px 10px rgba(0, 0, 0, 0.25);
  transition: transform 100ms steps(2);
}

.product-card:hover {
  transform: translateY(-2px);
}

.product-card.low {
  border-color: #b7393f;
  box-shadow: 
    inset 0 0 0 2px rgba(255, 109, 109, 0.3),
    0 4px 0 #6f2025,
    0 6px 10px rgba(0, 0, 0, 0.25);
}

.card-banner {
  display: flex;
  justify-content: space-between;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: #6f4b1c;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
  font-family: "Courier New", monospace;
}

.product-card h3 {
  margin: 0;
  font-size: 0.92rem;
  color: #0f1f0c;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1.2;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.product-emoji {
  font-size: 1.1rem;
  line-height: 1;
}

.price {
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--pixel-forest);
  margin: 0.25rem 0;
  font-family: "Courier New", monospace;
}

.price::before {
  content: "💰 ";
}

.meta {
  font-size: 0.7rem;
  color: #6f4b1c;
  margin: 0;
  font-family: "Courier New", monospace;
}

.card-actions {
  margin: 0.6rem auto auto auto;
  display: flex;
  gap: 0.4rem;
}

.card-actions button {
  border: 2px solid #2a1807;
  padding: 0.35rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: 0 2px 0 #6f4b1c;
}

.card-actions button:first-child {
  background: linear-gradient(180deg, #9fd98a 0%, #5ab848 50%, #3d8a2f 100%);
  color: #0a2008;
}

.card-actions button:last-child {
  background: linear-gradient(180deg, #e88b8b 0%, #c94f4f 50%, #a32d2d 100%);
  color: #fff;
}

.card-actions button:hover {
  filter: brightness(1.1);
}

.card-actions button:active {
  transform: translateY(2px);
  box-shadow: none;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(2, 4, 2, 0.92);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.modal-card {
  width: min(100%, 760px);
  background: linear-gradient(180deg, var(--pixel-forest) 0%, var(--pixel-forest-dark) 100%);
  border: 4px solid var(--pixel-gold);
  box-shadow: 
    0 0 0 4px #2f1f09,
    0 14px 0 #271c0f,
    0 20px 28px rgba(0, 0, 0, 0.5);
  padding: 1.2rem;
  display: grid;
  gap: 0.8rem;
  max-height: 85vh;
  overflow: auto;
}

.modal-card::before {
  content: "";
  position: absolute;
  inset: 16px;
  border: 2px dashed rgba(248, 214, 103, 0.4);
  pointer-events: none;
}

.modal-header {
  position: relative;
  border-bottom: 2px solid rgba(248, 214, 103, 0.3);
  padding-bottom: 0.6rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--pixel-gold);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 900;
  text-shadow: 2px 2px 0 #000;
}

.modal-header p {
  margin: 0.3rem 0 0;
  color: var(--pixel-paper);
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  opacity: 0.8;
}

.modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  position: relative;
}

.modal-grid label {
  grid-column: span 2;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: var(--pixel-paper);
  letter-spacing: 0.1em;
  font-family: "Courier New", monospace;
}

.modal-grid input[type="text"],
.modal-grid input[type="number"] {
  grid-column: span 2;
  background: #f2e8bf;
  border: 3px solid #2a1807;
  padding: 0.55rem 0.65rem;
  color: #1d1606;
  font-family: "Courier New", monospace;
  font-size: 0.9rem;
  outline: none;
  box-shadow: inset 0 0 0 2px #d4c27e;
}

.modal-grid input:focus {
  box-shadow: inset 0 0 0 2px #e1cc80, 0 0 0 2px var(--pixel-gold);
}

.barcode-row {
  grid-column: span 2;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
}

.barcode-row button {
  border: 2px solid #2a1807;
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  color: var(--pixel-ink);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 2px 0 #6f4b1c;
}

.check-row {
  grid-column: span 2;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--pixel-paper);
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
}

.check-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--pixel-gold);
}

.modal-actions {
  grid-column: span 2;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  position: relative;
  padding-top: 0.5rem;
  border-top: 2px solid rgba(248, 214, 103, 0.3);
}

.modal-actions button {
  border: 3px solid #2a1807;
  padding: 0.6rem 1rem;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 3px 0 #6f4b1c, 0 5px 8px rgba(0, 0, 0, 0.3);
}

.modal-actions button:first-child {
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  color: var(--pixel-ink);
}

.modal-actions button.btn-danger {
  background: linear-gradient(180deg, #e88b8b 0%, #c94f4f 50%, #a32d2d 100%);
  color: #fff;
  box-shadow: inset 0 0 0 2px #ffb4b4, 0 3px 0 #6f2025, 0 5px 8px rgba(0, 0, 0, 0.3);
}

.modal-actions button.btn-secondary {
  background: linear-gradient(180deg, #e2deca 0%, #bdb696 100%);
  color: var(--pixel-ink);
}

.modal-actions button:hover {
  filter: brightness(1.08);
}

.modal-actions button:active {
  transform: translateY(2px);
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 1px 0 #6f4b1c;
}

.scanner-modal {
  width: min(100%, 420px);
  background: linear-gradient(180deg, var(--pixel-forest) 0%, var(--pixel-forest-dark) 100%);
  border: 4px solid var(--pixel-gold);
  box-shadow: 
    0 0 0 4px #2f1f09,
    0 14px 0 #271c0f,
    0 20px 28px rgba(0, 0, 0, 0.5);
  padding: 1.2rem;
  position: relative;
}

.scanner-modal input {
  width: 100%;
  background: #f2e8bf;
  border: 3px solid #2a1807;
  padding: 0.6rem 0.7rem;
  color: #1d1606;
  font-family: "Courier New", monospace;
  font-size: 0.95rem;
  outline: none;
  box-shadow: inset 0 0 0 2px #d4c27e;
  margin-bottom: 0.8rem;
}

.scanner-modal input:focus {
  box-shadow: inset 0 0 0 2px #e1cc80, 0 0 0 2px var(--pixel-gold);
}

@media (max-width: 600px) {
  .modal-grid {
    grid-template-columns: 1fr;
  }
  .modal-grid label,
  .modal-grid input,
  .barcode-row {
    grid-column: span 1;
  }
  .grid-layout {
    grid-template-columns: 1fr;
  }
}

@keyframes bgGradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes bgFogDrift {
  0% { transform: translateX(-5%) translateY(0) scale(1); }
  50% { transform: translateX(5%) translateY(-5px) scale(1.02); }
  100% { transform: translateX(-5%) translateY(0) scale(1); }
}

@keyframes bgPulse {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.25; }
}

@keyframes bgRupeeGlow {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(248, 214, 103, 0.6)) brightness(1); transform: scale(1); }
  50% { filter: drop-shadow(0 0 12px rgba(248, 214, 103, 1)) brightness(1.3); transform: scale(1.15); }
}

@keyframes bgStarFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
  50% { transform: translateY(-12px) rotate(180deg); opacity: 1; }
}

.bg-fog {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: 
    radial-gradient(ellipse 90% 60% at 10% 50%, rgba(31, 91, 53, 0.25) 0%, transparent 50%),
    radial-gradient(ellipse 70% 50% at 90% 40%, rgba(31, 91, 53, 0.2) 0%, transparent 50%),
    radial-gradient(ellipse 50% 30% at 50% 90%, rgba(19, 53, 35, 0.3) 0%, transparent 50%);
  animation: bgFogDrift 10s ease-in-out infinite;
}

.bg-scanlines {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.1;
  background-image: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0 2px, rgba(0, 0, 0, 0.03) 2px 4px);
  animation: bgPulse 0.1s ease-in-out infinite;
}

.bg-stars {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.bg-star {
  position: absolute;
  width: 6px;
  height: 6px;
  background: radial-gradient(circle, #f8d667 0%, #c79634 50%, #8b6914 80%, transparent 100%);
  border-radius: 50%;
  animation: bgRupeeGlow 2.5s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(248, 214, 103, 0.8);
}

.bg-star:nth-child(1) { top: 8%; left: 15%; animation-delay: 0s; }
.bg-star:nth-child(2) { top: 5%; left: 85%; animation-delay: 0.3s; width: 5px; height: 5px; }
.bg-star:nth-child(3) { top: 20%; left: 8%; animation-delay: 0.6s; }
.bg-star:nth-child(4) { top: 12%; left: 70%; animation-delay: 0.9s; width: 4px; height: 4px; }
.bg-star:nth-child(5) { top: 75%; left: 5%; animation-delay: 1.2s; }
.bg-star:nth-child(6) { top: 88%; left: 20%; animation-delay: 1.5s; width: 5px; height: 5px; }

.bg-particles {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.bg-particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: linear-gradient(135deg, #f8d667, #fff8e0);
  border-radius: 50%;
  animation: bgStarFloat 5s ease-in-out infinite;
  box-shadow: 0 0 6px rgba(248, 214, 103, 0.8);
}

.bg-particle:nth-child(1) { left: 10%; animation-delay: 0s; animation-duration: 6s; }
.bg-particle:nth-child(2) { left: 25%; animation-delay: 1s; animation-duration: 5s; }
.bg-particle:nth-child(3) { left: 40%; animation-delay: 2s; animation-duration: 7s; }
.bg-particle:nth-child(4) { left: 55%; animation-delay: 0.5s; animation-duration: 5.5s; }

.productos-layout {
  position: relative;
  z-index: 1;
}
</style>
