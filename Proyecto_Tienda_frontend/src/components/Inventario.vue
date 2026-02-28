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
    <div class="stats-row">
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
        <span class="stat-icon">$</span>
        <div class="stat-info">
          <p>Costo Total</p>
          <strong>{{ formatoMoneda(costoTotalInventario) }}</strong>
        </div>
      </div>
      <div class="stat-card success">
        <span class="stat-icon">$</span>
        <div class="stat-info">
          <p>Valor Venta</p>
          <strong>{{ formatoMoneda(valorTotalVenta) }}</strong>
        </div>
      </div>
    </div>

    <section class="panel panel-bajo-stock">
      <header class="panel-header danger">
        <h2>Aviso: Bajo Stock ({{ bajoStock.length }})</h2>
      </header>

      <div class="tabla-wrap">
        <p v-if="cargando" class="estado">Cargando datos...</p>
        <p v-else-if="bajoStock.length === 0" class="estado ok">Inventario OK. No hay productos debajo del minimo.</p>

        <table v-else>
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Min</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in bajoStock" :key="`low-${p.idProducto}`" class="row-danger">
              <td><span class="id-badge">{{ p.idProducto }}</span></td>
              <td>{{ p.nombre }}</td>
              <td>{{ p.cantidad_min }}{{ p.is_gramaje ? 'g' : '' }}</td>
              <td class="stock-cell">{{ p.stock }}{{ p.is_gramaje ? 'g' : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel panel-catalogo">
      <header class="panel-header">
        <h2>Catalogo de Inventario ({{ productos.length }})</h2>
        <button class="btn-refresh" @click="cargarInventario" :disabled="cargando">
          {{ cargando ? '...' : 'Actualizar' }}
        </button>
      </header>

      <p v-if="mensaje" class="estado error">{{ mensaje }}</p>

      <div class="tabla-wrap">
        <p v-if="cargando" class="estado">Cargando productos del servidor...</p>
        <p v-else-if="productos.length === 0" class="estado">No hay productos en el catalogo.</p>

        <table v-else>
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Costo</th>
              <th>Venta</th>
              <th>Min</th>
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
              <td>{{ p.nombre }}</td>
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
  overflow: hidden;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.6rem;
  grid-area: stats;
}

.stat-card {
  padding: 0.7rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-radius: 8px;
}

.stat-icon {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
}

.stat-info p {
  margin: 0;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-info strong {
  font-size: 0.95rem;
}

.panel {
  min-height: 0;
  padding: 0.8rem;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.7rem;
  overflow: hidden;
  border-radius: 8px;
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
  border-radius: 6px;
}

.panel-header h2 {
  margin: 0;
  font-size: clamp(0.9rem, 2.4vw, 1.1rem);
  font-weight: 600;
}

.panel-header.danger h2 {
  color: var(--error-color);
}

.btn-refresh {
  padding: 0.4rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  border: none;
}

.btn-refresh:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tabla-wrap {
  overflow: auto;
  border-radius: 8px;
  height: 98%;
  max-height: calc(100vh - 200px);
}

.estado {
  padding: 1rem;
  font-size: 0.85rem;
  text-align: center;
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
  border-bottom: 1px solid var(--border-color);
  text-align: left;
  font-size: 0.76rem;
}

th {
  position: sticky;
  top: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  z-index: 1;
}

.id-badge {
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.venta-cell {
  font-weight: 600;
}

.stock-cell {
  font-weight: 600;
}

tbody tr:hover td {
  filter: brightness(0.95);
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
  .tabla-wrap {
    height: 200vh;
  }
  .inventario-layout {
    height: auto;
  }

  .stat-icon {
    font-size: 1.2rem;
  }
  
  .stat-info strong {
    font-size: 0.8rem;
  }
}
</style>
