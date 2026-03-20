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

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

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
        <div class="stat-icon-wrap">
          <span class="stat-icon">📦</span>
        </div>
        <div class="stat-info">
          <p>Total Productos</p>
          <strong>{{ productos.length }}</strong>
        </div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon-wrap">
          <span class="stat-icon">⚠️</span>
        </div>
        <div class="stat-info">
          <p>Bajo Stock</p>
          <strong>{{ bajoStock.length }}</strong>
        </div>
      </div>
      <div class="stat-card danger">
        <div class="stat-icon-wrap">
          <span class="stat-icon">❌</span>
        </div>
        <div class="stat-info">
          <p>Agotados</p>
          <strong>{{ productosAgotados.length }}</strong>
        </div>
      </div>
      <div class="stat-card gold">
        <div class="stat-icon-wrap">
          <span class="stat-icon">💰</span>
        </div>
        <div class="stat-info">
          <p>Costo Total</p>
          <strong>{{ formatoMoneda(costoTotalInventario) }}</strong>
        </div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon-wrap">
          <span class="stat-icon">💎</span>
        </div>
        <div class="stat-info">
          <p>Valor Venta</p>
          <strong>{{ formatoMoneda(valorTotalVenta) }}</strong>
        </div>
      </div>
    </div>

    <section class="panel panel-bajo-stock" style="grid-area: bajo;">
      <header class="panel-header danger">
        <div class="header-content">
          <h2>⚠️ Bajo Stock ({{ bajoStock.length }})</h2>
        </div>
      </header>

      <div class="tabla-wrap">
        <div v-if="cargando" class="estado loading">
          <div class="loading-spinner"></div>
          <span>Cargando datos...</span>
        </div>
        <p v-else-if="bajoStock.length === 0" class="estado ok">
          <span class="estado-icon">✨</span>
          Inventario OK. No hay productos debajo del mínimo.
        </p>

        <table v-else>
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Mín</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in bajoStock" :key="`low-${p.idProducto}`" class="row-danger">
              <td><span class="id-badge">{{ p.idProducto }}</span></td>
              <td>
                <span class="emoji-item">{{ obtenerEmojiInventario(p.idProducto) }}</span>
                <span class="product-name">{{ p.nombre }}</span>
              </td>
              <td class="min-cell">{{ p.cantidad_min }}{{ p.is_gramaje ? 'g' : '' }}</td>
              <td class="stock-cell">{{ p.stock }}{{ p.is_gramaje ? 'g' : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel panel-catalogo" style="grid-area: catalog;">
      <header class="panel-header">
        <div class="header-content">
          <h2>📦 Catálogo de Inventario ({{ productos.length }})</h2>
        </div>
        <button class="btn-refresh" @click="cargarInventario" :disabled="cargando">
          <span>{{ cargando ? '⏳' : '🔄' }}</span>
          <span>Actualizar</span>
        </button>
      </header>

      <p v-if="mensaje" class="estado error">
        <span class="estado-icon">⚠️</span>
        {{ mensaje }}
      </p>

      <div class="tabla-wrap">
        <div v-if="cargando" class="estado loading">
          <div class="loading-spinner"></div>
          <span>Cargando productos del servidor...</span>
        </div>
        <p v-else-if="productos.length === 0" class="estado">
          <span class="estado-icon">📭</span>
          No hay productos en el catálogo.
        </p>

        <table v-else>
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Costo</th>
              <th>Venta</th>
              <th>Mín</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in productos"
              :key="p.idProducto"
              :class="{ low: Number(p.stock || 0) < Number(p.cantidad_min || 0), empty: Number(p.stock || 0) === 0 }"
            >
              <td><span class="id-badge">{{ p.idProducto }}</span></td>
              <td>
                <span class="emoji-item">{{ obtenerEmojiInventario(p.idProducto) }}</span>
                <span class="product-name">{{ p.nombre }}</span>
              </td>
              <td class="costo-cell">{{ formatoMoneda(Number(p.precio_costo || 0)) }}</td>
              <td class="venta-cell">{{ formatoMoneda(Number(p.precio_venta || 0)) }}</td>
              <td class="min-cell">{{ p.cantidad_min }}{{ p.is_gramaje ? 'g' : '' }}</td>
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

@keyframes spin {
  to { transform: rotate(360deg); }
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
  box-sizing: border-box;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.8rem;
  animation: fadeSlideIn 300ms ease-out;
  grid-area: stats;
  z-index: 1;
}

.stat-card {
  background: linear-gradient(180deg, #1f5b35 0%, #133523 100%);
  border: var(--border-width) solid #2a1807;
  border-radius: 12px;
  padding: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px var(--shadow-color);
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  flex-shrink: 0;
}

.stat-icon {
  font-size: 1.6rem;
}


.stat-card.warning .stat-icon {
  font-size: 1.4rem;
}

.stat-card.danger .stat-icon {
  font-size: 1.4rem;
}


.stat-card.gold .stat-icon {
  font-size: 1.4rem;
}

.stat-card.success .stat-icon {
  font-size: 1.4rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.stat-info p {
  margin: 0;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: "Courier New", monospace;
  color: #f6f2de;
  text-shadow: 1px 1px 0 var(--border-color);
  opacity: 0.8;
}

.stat-info strong {
  font-size: 1rem;
  font-family: "Courier New", monospace;
  color: var(--accent-color);
  text-shadow: 1px 1px 0 var(--border-color);
  font-weight: 800;
}

.stat-card.warning strong {
  color: var(--accent-color);
  text-shadow: 1px 1px 0 var(--border-color);
}

.stat-card.danger strong {
  color: var(--error-color);
  text-shadow: 1px 1px 0 var(--border-color);
}

.stat-card.gold strong {
  color: var(--accent-color);
  text-shadow: 1px 1px 0 var(--border-color);
}

.stat-card.success strong {
  color: var(--success-color);
  text-shadow: 1px 1px 0 var(--border-color);
}

.panel {
  min-height: 0;
  padding: 1rem;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.8rem;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: var(--border-width-thick) solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
}

.panel-catalogo {
  grid-template-rows: auto auto 1fr;
}

.panel-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem 0.8rem;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  position: relative;
  z-index: 1;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-header h2 {
  margin: 0;
  font-size: clamp(0.9rem, 2vw, 1.1rem);
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 900;
  font-family: "Courier New", monospace;
}

.panel-header.danger h2 {
  color: var(--error-color);
}

.btn-refresh {
  border: var(--border-width) solid var(--border-color);
  padding: 0.5rem 0.9rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 50%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
  box-shadow: 0 4px 15px var(--shadow-color);
  transition: all 0.2s;
  display: none;
  align-items: center;
  gap: 0.4rem;
  border-radius: 10px;
}

.btn-refresh:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-refresh:active:not(:disabled) {
  transform: translateY(0);
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
  border-radius: 10px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
  position: relative;
  height: 100%;
  max-height: calc(100vh - 250px);
}

.tabla-wrap::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.tabla-wrap::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.1);
  border-radius: 4px;
}

.tabla-wrap::-webkit-scrollbar-thumb {
  background: var(--accent-color);
  border-radius: 4px;
}

.estado {
  padding: 1.5rem;
  font-size: 0.85rem;
  text-align: center;
  font-family: "Courier New", monospace;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
}

.estado.loading {
  flex-direction: column;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.estado-icon {
  font-size: 1.5rem;
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
  padding: 0.6rem 0.7rem;
  border-bottom: 1px solid var(--bg-panel);
  text-align: left;
  font-size: 0.75rem;
  font-family: "Courier New", monospace;
  color: var(--text-primary);
  background: transparent;
}

th {
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  z-index: 2;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.id-badge {
  background: var(--bg-secondary);
  color: var(--accent-color);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  display: inline-block;
}

.emoji-item {
  font-size: 1.1rem;
  margin-right: 0.25rem;
}

.product-name {
  font-weight: 500;
}

.costo-cell {
  color: var(--text-secondary);
  font-weight: 500;
}

.venta-cell {
  color: var(--success-color);
  font-weight: 700;
}

.min-cell {
  color: var(--text-secondary);
}

.stock-cell {
  font-weight: 700;
  color: var(--accent-color);
}

.row-danger td {
  background: color-mix(in srgb, var(--error-color) 10%, transparent);
}

.row-danger:hover td {
  background: color-mix(in srgb, var(--error-color) 18%, transparent);
}

.row-danger .stock-cell {
  color: var(--error-color);
  font-weight: 800;
}

tr.low td {
  background: color-mix(in srgb, var(--accent-color) 5%, transparent);
}

tr.low:hover td {
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
}

tr.empty td {
  background: color-mix(in srgb, var(--error-color) 12%, transparent);
}

tr.empty:hover td {
  background: color-mix(in srgb, var(--error-color) 20%, transparent);
}

tbody tr:hover td {
  background: color-mix(in srgb, var(--accent-color) 8%, transparent);
}

@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
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
    padding: 0.8rem;
  }
  
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
  }
  
  .stat-card {
    padding: 0.6rem;
    gap: 0.5rem;
  }
  
  .stat-icon-wrap {
    width: 40px;
    height: 40px;
  }
  
  .stat-icon {
    font-size: 1.3rem;
  }
  
  .stat-info strong {
    font-size: 0.9rem;
  }
  
  .panel {
    padding: 0.8rem;
  }
  
  .panel-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
  }
  
  .btn-refresh {
    justify-content: center;
  }
  
  th, td {
    padding: 0.5rem;
    font-size: 0.7rem;
  }
}

@media (max-width: 480px) {
  .stats-row {
    grid-template-columns: 1fr 1fr;
  }
  
  .stat-card:last-child {
    grid-column: span 2;
  }
}
</style>
