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
  0%, 100% { box-shadow: inset 0 0 0 3px #ffeeb4, 0 4px 0 #6f4b1c; }
  50% { box-shadow: inset 0 0 0 3px #fff4c4, 0 4px 0 #8a6a3a, 0 0 15px rgba(248, 214, 103, 0.4); }
}

@keyframes blinkDanger {
  0%, 100% { background: rgba(183, 57, 63, 0.16); }
  50% { background: rgba(183, 57, 63, 0.32); }
}

.inventario-layout {
  --pixel-gold: #f8d667;
  --pixel-amber: #c79634;
  --pixel-forest: #1f5b35;
  --pixel-forest-dark: #133523;
  --pixel-bg: #07150d;
  --pixel-ink: #1a1401;
  --pixel-paper: #f6f2de;
  height: 100vh;
  min-height: 0;
  width: 100%;
  margin: 0;
  padding: 1rem;
  padding-bottom: 1rem;
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  grid-template-rows: auto 1fr;
  gap: 1rem;
  grid-template-areas: 
    "stats stats"
    "bajo catalog";
  background: 
    linear-gradient(180deg, #0a1912 0%, var(--pixel-bg) 100%),
    radial-gradient(circle at 8% 12%, rgba(248, 214, 103, 0.1) 0 8px, transparent 9px),
    radial-gradient(circle at 92% 88%, rgba(248, 214, 103, 0.08) 0 8px, transparent 9px);
  overflow: hidden;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.6rem;
  animation: fadeSlideIn 300ms ease-out;
  grid-area: stats;
}

.stat-card {
  border: 3px solid #2a1807;
  background: linear-gradient(180deg, #1f5b35 0%, #133523 100%);
  padding: 0.7rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.1), 0 4px 0 #1a1005;
}

.stat-card.warning {
  background: linear-gradient(180deg, #8b6914 0%, #5c4a12 100%);
}

.stat-card.danger {
  background: linear-gradient(180deg, #8b2020 0%, #5c1515 100%);
}

.stat-card.gold {
  background: linear-gradient(180deg, #f8d667 0%, #c79634 100%);
  color: #1a1401;
}

.stat-card.gold .stat-info p {
  color: #5c4a12;
}

.stat-card.success {
  background: linear-gradient(180deg, #48d308 0%, #2a8a05 100%);
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-info p {
  margin: 0;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--pixel-paper);
  font-family: "Courier New", monospace;
}

.stat-info strong {
  font-size: 0.95rem;
  font-family: "Courier New", monospace;
}

.panel {
  min-height: 0;
  padding: 0.8rem;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.7rem;
  position: relative;
  overflow: hidden;
}

.panel-catalogo {
  grid-template-rows: auto auto 1fr;
}

.panel::before {
  content: "";
  position: absolute;
  inset: 8px;
  border: 2px dashed rgba(248, 214, 103, 0.25);
  pointer-events: none;
  border-radius: 6px;
}

.panel-bajo-stock {
  background: linear-gradient(180deg, #5c1515 0%, #3d0d0d 100%);
  border: 3px solid #8b2020;
  box-shadow: 0 4px 0 #2a0a0a;
}

.panel-catalogo {
  background: linear-gradient(180deg, #1f5b35 0%, #133523 100%);
  border: 3px solid #2a7d32;
  box-shadow: 0 4px 0 #1a3d20;
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
  color: var(--pixel-gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 800;
  text-shadow: 1px 1px 0 #000;
  font-family: "Courier New", monospace;
}

.panel-header.danger h2 {
  color: #ff9ea8;
  animation: pulseWarning 2s ease-in-out infinite;
}

.btn-refresh {
  border: 2px solid #2a1807;
  padding: 0.4rem 0.7rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  color: #1a1401;
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 2px 0 #6f4b1c;
  transition: transform 80ms steps(2), filter 80ms linear;
}

.btn-refresh:hover:not(:disabled) {
  filter: brightness(1.08);
}

.btn-refresh:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 1px 0 #6f4b1c;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tabla-wrap {
  overflow: auto;
  border: 3px solid #2a1807;
  background: var(--pixel-paper);
  color: #1d1606;
  border-radius: 6px;
  box-shadow: inset 0 0 0 3px #d4c27e, 0 4px 0 #1a1005;
  position: relative;
  height: 100%;
  max-height: calc(100vh - 200px);
}

.estado {
  padding: 1rem;
  font-size: 0.85rem;
  text-align: center;
  font-family: "Courier New", monospace;
}

.estado.error {
  color: #b7393f;
  background: rgba(183, 57, 63, 0.1);
}

.estado.ok {
  color: #1a8f52;
  background: rgba(40, 160, 80, 0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid #baa15c;
  text-align: left;
  font-size: 0.76rem;
  font-family: "Courier New", monospace;
}

th {
  position: sticky;
  top: 0;
  background: linear-gradient(180deg, #e8d790 0%, #d4c27e 100%);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: #1a1401;
  z-index: 1;
}

.id-badge {
  background: #2a1807;
  color: var(--pixel-gold);
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
  color: #18661a;
  font-weight: 700;
}

.stock-cell {
  font-weight: 700;
}

.row-danger {
  animation: blinkDanger 1.2s ease-in-out infinite;
}

.row-danger .stock-cell {
  color: #b7393f;
  font-weight: 800;
}

tr.low {
  background: rgba(183, 57, 63, 0.08);
}

tr.low .stock-cell {
  color: #8b2020;
}

tr.empty {
  background: rgba(183, 57, 63, 0.15);
}

tr.empty .stock-cell {
  color: #b7393f;
  font-weight: 800;
}

tbody tr:hover td {
  background: rgba(248, 214, 103, 0.25);
}

@media (max-width: 1100px) {
  .stats-row {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 768px) {
  .inventario-layout {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr;
    grid-template-areas: 
      "stats stats"
      "bajo catalog";
  }
  
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  th, td {
    font-size: 0.7rem;
    padding: 0.4rem;
  }
}

@media (max-width: 520px) {
  .inventario-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr 1fr;
    grid-template-areas: 
      "stats"
      "bajo"
      "catalog";
  }
  
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stat-card {
    padding: 0.5rem;
  }
  
  .stat-icon {
    font-size: 1.2rem;
  }
  
  .stat-info strong {
    font-size: 0.8rem;
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

.inventario-layout {
  position: relative;
  z-index: 1;
}
</style>
