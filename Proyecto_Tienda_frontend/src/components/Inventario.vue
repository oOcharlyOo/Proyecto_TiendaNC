<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';

type ApiRespuesta<T> = {
  codigo: number;
  mensaje: string;
  datos: T;
};

type ProductoDTO = {
  idProducto: number;
  nombre: string;
  precio_costo: number;
  precio_venta: number;
  cantidad_min: number;
  stock: number;
  is_gramaje?: boolean;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const EMOJIS_INVENTARIO = ['📦', '🎒', '🎰', '🗝️', '💎', '🛡️', '⚔️', '🧪', '📜', '🎴'];

function obtenerEmojiInventario(id: number | undefined): string {
  const indice = (id ?? 0) % EMOJIS_INVENTARIO.length;
  return EMOJIS_INVENTARIO[indice];
}

const cargando = ref(false);
const mensaje = ref('');
const productos = shallowRef<ProductoDTO[]>([]);

const bajoStock = computed(() => {
  return productos.value.filter((p) => Number(p.stock || 0) < Number(p.cantidad_min || 0));
});

const costoTotalInventario = computed(() => {
  let sum = 0;
  for (const p of productos.value) {
    const stock = Number(p.stock || 0);
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
  for (const p of productos.value) {
    const stock = Number(p.stock || 0);
    const venta = Number(p.precio_venta || 0);
    if (p.is_gramaje) {
      sum += (stock / 1000) * venta;
    } else {
      sum += stock * venta;
    }
  }
  return sum;
});

const productosAgotados = computed(() => {
  return productos.value.filter((p) => Number(p.stock || 0) === 0);
});

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor || 0));
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function cargarInventario() {
  cargando.value = true;
  try {
    const data = await getJson<ApiRespuesta<ProductoDTO[]>>(`${API_BASE}/productos/listarProductos`);
    productos.value = Array.isArray(data?.datos)
      ? [...data.datos].sort((a, b) => Number(a.idProducto || 0) - Number(b.idProducto || 0))
      : [];
    mensaje.value = '';
  } catch (error) {
    productos.value = [];
    mensaje.value = `Error al cargar inventario: ${error instanceof Error ? error.message : 'Error inesperado.'}`;
  } finally {
    cargando.value = false;
  }
}

onMounted(async () => {
  await cargarInventario();
});
</script>

<template>
  <main class="inventario-layout">
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
    <div class="stats-row" style="grid-area: stats;">
      <div class="stat-card">
        <span class="stat-icon">📦</span>
        <div class="stat-info">
          <p>Total Productos</p>
          <strong>{{ productos.length }}</strong>
        </div>
      </div>
      <div class="stat-card warning">
        <span class="stat-icon">⚠️</span>
        <div class="stat-info">
          <p>Bajo Stock</p>
          <strong>{{ bajoStock.length }}</strong>
        </div>
      </div>
      <div class="stat-card danger">
        <span class="stat-icon">❌</span>
        <div class="stat-info">
          <p>Agotados</p>
          <strong>{{ productosAgotados.length }}</strong>
        </div>
      </div>
      <div class="stat-card gold">
        <span class="stat-icon">💰</span>
        <div class="stat-info">
          <p>Costo Total</p>
          <strong>{{ formatoMoneda(costoTotalInventario) }}</strong>
        </div>
      </div>
      <div class="stat-card success">
        <span class="stat-icon">💎</span>
        <div class="stat-info">
          <p>Valor Venta</p>
          <strong>{{ formatoMoneda(valorTotalVenta) }}</strong>
        </div>
      </div>
    </div>

    <section class="panel panel-bajo-stock" style="grid-area: bajo;">
      <header class="panel-header danger">
        <h2>⚠️ Aviso: Bajo Stock ({{ bajoStock.length }})</h2>
      </header>

      <div class="tabla-wrap">
        <p v-if="cargando" class="estado">🔄 Cargando datos...</p>
        <p v-else-if="bajoStock.length === 0" class="estado ok">✨ Inventario OK. No hay productos debajo del mínimo.</p>

        <table v-else>
          <thead>
            <tr>
              <th>🆔 ID</th>
              <th>📝 Producto</th>
              <th>📉 Mín</th>
              <th>📊 Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in bajoStock" :key="`low-${p.idProducto}`" class="row-danger">
              <td><span class="id-badge">{{ p.idProducto }}</span></td>
              <td><span class="emoji-item">{{ obtenerEmojiInventario(p.idProducto) }}</span> {{ p.nombre }}</td>
              <td>{{ p.cantidad_min }}{{ p.is_gramaje ? 'g' : '' }}</td>
              <td class="stock-cell">{{ p.stock }}{{ p.is_gramaje ? 'g' : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel panel-catalogo" style="grid-area: catalog;">
      <header class="panel-header">
        <h2>📦 Catálogo de Inventario ({{ productos.length }})</h2>
        <button class="btn-refresh" @click="cargarInventario" :disabled="cargando">
          {{ cargando ? '⏳' : '🔄' }} Actualizar
        </button>
      </header>

      <p v-if="mensaje" class="estado error">⚠️ {{ mensaje }}</p>

      <div class="tabla-wrap">
        <p v-if="cargando" class="estado">🔄 Cargando productos del servidor...</p>
        <p v-else-if="productos.length === 0" class="estado">📭 No hay productos en el catálogo.</p>

        <table v-else>
          <thead>
            <tr>
              <th>🆔 ID</th>
              <th>📝 Producto</th>
              <th>💵 Costo</th>
              <th>💰 Venta</th>
              <th>📉 Mín</th>
              <th>📊 Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in productos"
              :key="p.idProducto"
              :class="{ low: Number(p.stock || 0) < Number(p.cantidad_min || 0), empty: Number(p.stock || 0) === 0 }"
            >
              <td><span class="id-badge">{{ p.idProducto }}</span></td>
              <td><span class="emoji-item">{{ obtenerEmojiInventario(p.idProducto) }}</span> {{ p.nombre }}</td>
              <td>{{ formatoMoneda(Number(p.precio_costo || 0)) }}</td>
              <td class="venta-cell">{{ formatoMoneda(Number(p.precio_venta || 0)) }}</td>
              <td>{{ p.cantidad_min }}{{ p.is_gramaje ? 'g' : '' }}</td>
              <td class="stock-cell">{{ p.stock }}{{ p.is_gramaje ? 'g' : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<style scoped>
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulseWarning {
  0%, 100% { box-shadow: inset 0 0 0 3px var(--accent-hover), 0 4px 0 var(--border-color); }
  50% { box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--accent-color) 80%, white), 0 4px 0 var(--border-color), 0 0 15px color-mix(in srgb, var(--accent-color) 40%, transparent); }
}

@keyframes blinkDanger {
  0%, 100% { background: color-mix(in srgb, var(--error-color) 16%, transparent); }
  50% { background: color-mix(in srgb, var(--error-color) 32%, transparent); }
}

.inventario-layout {
  height: 90vh;
  min-height: 0;
  width: 100%;
  margin: 0;
  padding: 1rem;
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  grid-template-rows: auto 1fr;
  gap: 1rem;
  grid-template-areas:
    "stats stats"
    "bajo catalog";
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.6rem;
  animation: fadeSlideIn 300ms ease-out;
  grid-area: stats;
  z-index: 1;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-info p {
  margin: 0;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: "Courier New", monospace;
}

.stat-info strong {
  font-size: 0.95rem;
  font-family: "Courier New", monospace;
  color: var(--pixel-forest);
}

.panel {
  min-height: 0;
  padding: 0.8rem;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.7rem;
  position: relative;
  overflow: hidden;
  background: var(--bg-secondary);
  border: var(--border-width-thick) solid var(--border-color);
  border-radius: 8px;
}

.panel::before {
  content: "";
  position: absolute;
  inset: 8px;
  pointer-events: none;
  border-radius: 6px;
  border: 2px dashed color-mix(in srgb, var(--accent-color) 20%, transparent);
}

.panel-catalogo {
  grid-template-rows: auto auto 1fr;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.7rem;
  padding: 0.4rem 0.6rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  position: relative;
  z-index: 1;
}

.panel-header h2 {
  margin: 0;
  font-size: clamp(0.9rem, 2.4vw, 1.1rem);
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 800;
  text-shadow: 1px 1px 0 var(--border-color);
  font-family: "Courier New", monospace;
}

.panel-header.danger h2 {
  color: var(--error-color);
}

.btn-refresh {
  border: 2px solid var(--border-color);
  padding: 0.4rem 0.7rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 45%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent-color) 30%, white), 0 2px 0 var(--border-color);
  transition: transform 80ms steps(2), filter 80ms linear;
}

.btn-refresh:hover:not(:disabled) {
  filter: brightness(1.08);
}

.btn-refresh:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent-color) 30%, white);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tabla-wrap {
  overflow: auto;
  border: var(--border-width) solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 6px;
  box-shadow: var(--shadow-inner) var(--bg-panel);
  position: relative;
  height: 100%;
  max-height: calc(100vh - 250px);
}

.estado {
  padding: 1rem;
  font-size: 0.85rem;
  text-align: center;
  font-family: "Courier New", monospace;
  color: var(--text-secondary);
}

.estado.error {
  color: var(--error-color);
}

.estado.ok {
  color: var(--success-color);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--bg-panel);
  text-align: left;
  font-size: 0.76rem;
  font-family: "Courier New", monospace;
  color: var(--text-primary);
  background: transparent;
}

th {
  position: sticky;
  top: 0;
  background: var(--bg-panel);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  z-index: 1;
}

.id-badge {
  background: var(--border-color);
  color: var(--accent-color);
  padding: 0.15rem 0.4rem;
  border-radius: 2px;
  font-size: 0.7rem;
  font-weight: 700;
}

.emoji-item {
  font-size: 1rem;
  margin-right: 0.2rem;
}

.venta-cell {
  color: var(--success-color);
  font-weight: 700;
}

.stock-cell {
  font-weight: 700;
  color: var(--accent-color);
}

.row-danger td {
  background: color-mix(in srgb, var(--error-color) 10%, transparent);
}

.row-danger .stock-cell {
  color: var(--error-color);
}

tr.low td {
  background: color-mix(in srgb, var(--accent-color) 5%, transparent);
}

tr.empty td {
  background: color-mix(in srgb, var(--error-color) 15%, transparent);
}

tbody tr:hover td {
  background: color-mix(in srgb, var(--accent-color) 10%, transparent);
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

@media (max-width: 768px) {
  .inventario-layout {
    grid-template-columns: 1fr;
    grid-template-areas: 
      "stats"
      "bajo"
      "catalog";
    height: auto;
    overflow: auto;
  }
  
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
