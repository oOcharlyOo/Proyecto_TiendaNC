<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'vue-chartjs';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

type VentasDetalleListDTO = {
  idVentaDetalle: number;
  idVenta: number;
  idProducto: number;
  productoNombre: string;
  productoPrecioCosto: number;
  productoIsGramaje: boolean;
  cantidad: number;
  precioUnitarioVenta: number;
  tipoPrecioAplicado: string;
  Venta: {
    idVenta?: number;
    fechaVenta: string;
    metodoPago: string;
    montoTotal: number;
    estatus: string;
  };
};

type ProductoDTO = {
  idProducto?: number;
  nombre: string;
  idCategoria?: number;
  is_gramaje: boolean;
};

type CategoriaDTO = {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
};

type CategoriaStats = {
  idCategoria: number | null;
  nombre: string;
  cantidadTotal: number;
  montoTotal: number;
  costoTotal: number;
  gananciaTotal: number;
  ventasCount: number;
  productosVendidos: Set<number>;
};

const periodo = ref<'dia' | 'semana' | 'mes' | 'anio'>('mes');
const fechaSeleccionada = ref('');
const detalles = ref<VentasDetalleListDTO[]>([]);
const productos = ref<ProductoDTO[]>([]);
const categorias = ref<CategoriaDTO[]>([]);
const cargando = ref(false);

const productoCategoriaMap = computed(() => {
  const map = new Map<number, { categoriaId: number | null; categoriaNombre: string }>();
  for (const p of productos.value) {
    const catId = p.idCategoria || null;
    const cat = categorias.value.find(c => c.idCategoria === catId);
    map.set(p.idProducto!, {
      categoriaId: catId,
      categoriaNombre: cat?.nombre || 'Sin categoría'
    });
  }
  return map;
});

const categoriasStats = computed<CategoriaStats[]>(() => {
  const map = new Map<number | null, CategoriaStats>();
  
  for (const d of detalles.value) {
    if (!d.Venta || !['C', 'F'].includes(d.Venta.estatus)) continue;
    
    const catInfo = productoCategoriaMap.value.get(d.idProducto) || { categoriaId: null, categoriaNombre: 'Sin categoría' };
    const cantidad = Number(d.cantidad || 0);
    const precioVenta = Number(d.precioUnitarioVenta || 0);
    const precioCostoKg = Number(d.productoPrecioCosto || 0);
    
    let monto: number;
    let costo: number;
    
    if (d.tipoPrecioAplicado === 'VENTA_GRAMAJE') {
      monto = precioVenta;
      costo = (precioCostoKg / 1000) * cantidad;
    } else {
      monto = precioVenta * cantidad;
      costo = precioCostoKg * cantidad;
    }
    
    const ganancia = monto - costo;
    
    const existing = map.get(catInfo.categoriaId);
    if (existing) {
      existing.cantidadTotal += cantidad;
      existing.montoTotal += monto;
      existing.costoTotal += costo;
      existing.gananciaTotal += ganancia;
      existing.ventasCount += 1;
      existing.productosVendidos.add(d.idProducto);
    } else {
      map.set(catInfo.categoriaId, {
        idCategoria: catInfo.categoriaId,
        nombre: catInfo.categoriaNombre,
        cantidadTotal: cantidad,
        montoTotal: monto,
        costoTotal: costo,
        gananciaTotal: ganancia,
        ventasCount: 1,
        productosVendidos: new Set([d.idProducto])
      });
    }
  }
  
  return Array.from(map.values()).sort((a, b) => b.montoTotal - a.montoTotal);
});

const chartColors = ['#c99234', '#28a745', '#17a2b8', '#dc3545', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c', '#007bff', '#ffc107', '#6610f2', '#e83e8c'];

const chartCategoriasMonto = computed(() => ({
  labels: categoriasStats.value.map(c => c.nombre),
  datasets: [{
    label: 'Monto ($)',
    data: categoriasStats.value.map(c => Math.round(c.montoTotal * 100) / 100),
    backgroundColor: chartColors.slice(0, categoriasStats.value.length),
    borderRadius: 6,
    borderSkipped: false
  }]
}));

const chartCategoriasVentas = computed(() => ({
  labels: categoriasStats.value.map(c => c.nombre),
  datasets: [{
    label: 'Cantidad de Ventas',
    data: categoriasStats.value.map(c => c.ventasCount),
    backgroundColor: chartColors.slice(0, categoriasStats.value.length).map(c => c + '99'),
    borderColor: chartColors.slice(0, categoriasStats.value.length),
    borderWidth: 2,
    borderRadius: 6,
    borderSkipped: false
  }]
}));

const chartCategoriasPie = computed(() => ({
  labels: categoriasStats.value.map(c => c.nombre),
  datasets: [{
    data: categoriasStats.value.map(c => Math.round(c.montoTotal * 100) / 100),
    backgroundColor: chartColors.slice(0, categoriasStats.value.length),
    borderWidth: 0
  }]
}));

const ventasMap = computed(() => {
  const map = new Map<number, { idVenta: number; fecha: string; metodoPago: string; montoTotal: number }>();
  for (const d of detalles.value) {
    if (!d.Venta || !['C', 'F'].includes(d.Venta.estatus)) continue;
    const ventaId = d.Venta.idVenta || d.idVenta;
    if (!ventaId) continue;
    if (!map.has(ventaId)) {
      map.set(ventaId, {
        idVenta: ventaId,
        fecha: d.Venta.fechaVenta || '',
        metodoPago: d.Venta.metodoPago || 'N/D',
        montoTotal: Number(d.Venta.montoTotal || 0)
      });
    }
  }
  return map;
});

const totalVentas = computed(() => ventasMap.value.size);
const totalMonto = computed(() => {
  let sum = 0;
  for (const v of ventasMap.value.values()) {
    sum += v.montoTotal;
  }
  return sum;
});
const totalCosto = computed(() => {
  let sum = 0;
  for (const d of detalles.value) {
    if (!d.Venta || !['C', 'F'].includes(d.Venta.estatus)) continue;
    const cantidad = Number(d.cantidad || 0);
    const precioCostoKg = Number(d.productoPrecioCosto || 0);
    if (d.tipoPrecioAplicado === 'VENTA_GRAMAJE') {
      sum += (precioCostoKg / 1000) * cantidad;
    } else {
      sum += precioCostoKg * cantidad;
    }
  }
  return sum;
});
const totalGanancia = computed(() => totalMonto.value - totalCosto.value);
const categoriasConVentas = computed(() => categoriasStats.value.length);
const categoriaTop = computed(() => categoriasStats.value[0] || null);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#f6f2de', font: { size: 12 } } },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#c99234',
      bodyColor: '#f6f2de',
      borderColor: '#c99234',
      borderWidth: 1,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      ticks: { color: '#888', maxRotation: 45, font: { size: 11 } },
      grid: { color: '#33333344' }
    },
    y: {
      ticks: { color: '#888', font: { size: 11 } },
      grid: { color: '#33333344' }
    }
  }
};

const chartPieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' as const, labels: { color: '#f6f2de', font: { size: 12 }, padding: 12 } },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#c99234',
      bodyColor: '#f6f2de',
      borderColor: '#c99234',
      borderWidth: 1,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: any) => ` ${ctx.label}: $${ctx.parsed.toLocaleString('es-MX')}`
      }
    }
  }
};

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function inicializarFecha() {
  const now = new Date();
  if (periodo.value === 'dia') {
    fechaSeleccionada.value = now.toISOString().slice(0, 10);
  } else if (periodo.value === 'semana') {
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(now.getDate() - daysToMonday);
    fechaSeleccionada.value = startOfWeek.toISOString().slice(0, 10);
  } else if (periodo.value === 'mes') {
    fechaSeleccionada.value = now.toISOString().slice(0, 7);
  } else {
    fechaSeleccionada.value = now.getFullYear().toString();
  }
}

async function cargarDatos() {
  cargando.value = true;
  try {
    let fechaInicio: string;
    let fechaFin: string;
    const now = new Date();
    
    if (periodo.value === 'dia') {
      fechaInicio = fechaSeleccionada.value || now.toISOString().slice(0, 10);
      fechaFin = fechaInicio;
    } else if (periodo.value === 'semana') {
      const start = fechaSeleccionada.value ? parseLocalDate(fechaSeleccionada.value) : new Date(now);
      const dayOfWeek = start.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - daysToMonday);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      fechaInicio = start.toISOString().slice(0, 10);
      fechaFin = end.toISOString().slice(0, 10);
    } else if (periodo.value === 'mes') {
      const mesStr = fechaSeleccionada.value || now.toISOString().slice(0, 7);
      fechaInicio = `${mesStr}-01`;
      const [y, m] = mesStr.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      fechaFin = `${mesStr}-${lastDay}`;
    } else {
      const anio = fechaSeleccionada.value || now.getFullYear().toString();
      fechaInicio = `${anio}-01-01`;
      fechaFin = `${anio}-12-31`;
    }
    
    const [detallesRes, productosRes, categoriasRes] = await Promise.all([
      fetch(`${API_BASE}/ventasDetalle/porPeriodo?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`),
      fetch(`${API_BASE}/productos/listarProductos`),
      fetch(`${API_BASE}/categorias/listarCategorias`)
    ]);
    
    const detallesData = await detallesRes.json();
    const productosData = await productosRes.json();
    const categoriasData = await categoriasRes.json();
    
    if (detallesData.codigo === 200) {
      detalles.value = detallesData.datos || [];
    }
    if (productosData.codigo === 200) {
      productos.value = productosData.datos || [];
    }
    if (categoriasData.codigo === 200) {
      categorias.value = categoriasData.datos || [];
    }
  } catch (e) {
    console.error('Error al cargar reporte:', e);
  } finally {
    cargando.value = false;
  }
}

watch(periodo, () => {
  inicializarFecha();
  cargarDatos();
});

onMounted(() => {
  inicializarFecha();
  cargarDatos();
});

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
}

function formatoCantidad(cantidad: number, isGramaje: boolean) {
  if (!isGramaje) return `${cantidad} pza`;
  if (cantidad >= 1000) {
    const kg = cantidad / 1000;
    return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2)} kg`;
  }
  return `${cantidad} g`;
}
</script>

<template>
  <div class="ventas-categoria">
    <header class="reporte-header">
      <h2 class="reporte-title">
        <span class="title-icon">🏷️</span>
        Ventas por Categoría
      </h2>
      <div class="reporte-controls">
        <div class="periodo-selector">
          <button 
            v-for="p in ['dia', 'semana', 'mes', 'anio']" 
            :key="p"
            :class="['periodo-btn', { active: periodo === p }]"
            @click="periodo = p as any"
          >
            {{ p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Año' }}
          </button>
        </div>
        <div class="fecha-selector">
          <input 
            v-if="periodo === 'dia'" 
            v-model="fechaSeleccionada" 
            type="date" 
            @change="cargarDatos"
          />
          <input 
            v-else-if="periodo === 'semana'" 
            v-model="fechaSeleccionada" 
            type="date" 
            @change="cargarDatos"
          />
          <input 
            v-else-if="periodo === 'mes'" 
            v-model="fechaSeleccionada" 
            type="month" 
            @change="cargarDatos"
          />
          <input 
            v-else 
            v-model="fechaSeleccionada" 
            type="number" 
            min="2020" 
            max="2030" 
            @change="cargarDatos"
          />
          <button class="btn-cargar" @click="cargarDatos" :disabled="cargando">
            {{ cargando ? '...' : 'Cargar' }}
          </button>
        </div>
      </div>
    </header>

    <div v-if="cargando" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Cargando reporte...</span>
    </div>

    <template v-else>
      <div class="summary-cards">
        <div class="summary-card">
          <span class="summary-icon">🧾</span>
          <div class="summary-info">
            <span class="summary-label">Total Ventas</span>
            <span class="summary-value">{{ totalVentas }}</span>
          </div>
        </div>
        <div class="summary-card highlight">
          <span class="summary-icon">💰</span>
          <div class="summary-info">
            <span class="summary-label">Total Cobrado</span>
            <span class="summary-value">{{ formatoMoneda(totalMonto) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">📉</span>
          <div class="summary-info">
            <span class="summary-label">Costo Total</span>
            <span class="summary-value">{{ formatoMoneda(totalCosto) }}</span>
          </div>
        </div>
        <div class="summary-card highlight ganancia">
          <span class="summary-icon">💵</span>
          <div class="summary-info">
            <span class="summary-label">Ganancia Neta</span>
            <span class="summary-value">{{ formatoMoneda(totalGanancia) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">📂</span>
          <div class="summary-info">
            <span class="summary-label">Categorías con Ventas</span>
            <span class="summary-value">{{ categoriasConVentas }}</span>
          </div>
        </div>
        <div class="summary-card highlight">
          <span class="summary-icon">🏆</span>
          <div class="summary-info">
            <span class="summary-label">Categoría Top</span>
            <span class="summary-value category-top">{{ categoriaTop?.nombre || 'N/D' }}</span>
          </div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card chart-wide">
          <h3 class="chart-title">💰 Monto por Categoría</h3>
          <div class="chart-container">
            <Bar :data="chartCategoriasMonto" :options="{ ...chartOptions, indexAxis: 'y' as const }" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">🧾 Cantidad de Ventas por Categoría</h3>
          <div class="chart-container">
            <Bar :data="chartCategoriasVentas" :options="{ ...chartOptions, indexAxis: 'y' as const }" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">📊 Distribución por Categoría</h3>
          <div class="chart-container chart-pie">
            <Pie :data="chartCategoriasPie" :options="chartPieOptions" />
          </div>
        </div>

        <div class="chart-card chart-wide">
          <h3 class="chart-title">📋 Detalle por Categoría</h3>
          <div class="tabla-container">
            <table class="tabla-categorias">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th class="text-right">Ventas</th>
                  <th class="text-right">Productos Únicos</th>
                  <th class="text-right">Cantidad Total</th>
                  <th class="text-right">Venta Total</th>
                  <th class="text-right">Costo Total</th>
                  <th class="text-right">Ganancia</th>
                  <th class="text-right">% del Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cat in categoriasStats" :key="cat.idCategoria ?? 'sin-cat'">
                  <td class="categoria-nombre">{{ cat.nombre }}</td>
                  <td class="text-right">{{ cat.ventasCount }}</td>
                  <td class="text-right">{{ cat.productosVendidos.size }}</td>
                  <td class="text-right">{{ formatoCantidad(cat.cantidadTotal, false) }}</td>
                  <td class="text-right monto">{{ formatoMoneda(cat.montoTotal) }}</td>
                  <td class="text-right costo">{{ formatoMoneda(cat.costoTotal) }}</td>
                  <td class="text-right ganancia">{{ formatoMoneda(cat.gananciaTotal) }}</td>
                  <td class="text-right porcentaje">
                    {{ totalMonto > 0 ? ((cat.montoTotal / totalMonto) * 100).toFixed(1) : 0 }}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ventas-categoria {
  padding: 1rem;
  overflow-y: auto;
  height: 100%;
}

.reporte-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--border-color);
}

.reporte-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.3rem;
  color: var(--accent-color);
  font-family: 'HyliaSerifBeta', 'Palatino Linotype', serif;
}

.title-icon {
  font-size: 1.4rem;
}

.reporte-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.periodo-selector {
  display: flex;
  gap: 0.25rem;
  background: var(--bg-primary);
  padding: 0.25rem;
  border-radius: 8px;
  border: 2px solid var(--border-color);
}

.periodo-btn {
  padding: 0.4rem 0.8rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.periodo-btn:hover {
  color: var(--text-primary);
}

.periodo-btn.active {
  background: var(--accent-color);
  color: var(--bg-primary);
}

.fecha-selector {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.fecha-selector input {
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.btn-cargar {
  padding: 0.5rem 1rem;
  border: 2px solid var(--accent-color);
  border-radius: 8px;
  background: var(--accent-color);
  color: var(--bg-primary);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cargar:hover:not(:disabled) {
  filter: brightness(1.15);
}

.btn-cargar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-panel);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  transition: all 0.2s;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-color);
}

.summary-card.highlight {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-panel));
}

.summary-icon {
  font-size: 1.8rem;
}

.summary-info {
  display: flex;
  flex-direction: column;
}

.summary-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.summary-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.summary-card.highlight .summary-value {
  color: var(--accent-color);
}

.summary-card.ganancia {
  border-color: var(--success-color);
  background: color-mix(in srgb, var(--success-color) 10%, var(--bg-panel));
}

.summary-card.ganancia .summary-value {
  color: var(--success-color);
}

.category-top {
  font-size: 1rem !important;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.chart-card {
  background: var(--bg-panel);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
  overflow: hidden;
}

.chart-wide {
  grid-column: 1 / -1;
}

.chart-title {
  margin: 0 0 1.25rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
  font-weight: 600;
}

.chart-container {
  height: 400px;
  position: relative;
}

.chart-pie {
  height: 350px;
}

.tabla-container {
  max-height: 400px;
  overflow-y: auto;
}

.tabla-categorias {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.tabla-categorias th {
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 700;
  color: var(--accent-color);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  border-bottom: 2px solid var(--accent-color);
  position: sticky;
  top: 0;
  background: var(--bg-panel);
}

.tabla-categorias td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.tabla-categorias tr:hover {
  background: color-mix(in srgb, var(--accent-color) 8%, transparent);
}

.categoria-nombre {
  font-weight: 600;
  color: var(--text-primary);
}

.text-right {
  text-align: right;
}

.monto {
  color: var(--success-color);
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.costo {
  color: var(--error-color);
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.ganancia {
  color: var(--infoBlueColor);
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.porcentaje {
  color: var(--accent-color);
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

@media (max-width: 768px) {
  .reporte-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .reporte-controls {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  
  .periodo-selector {
    justify-content: center;
  }
  
  .fecha-selector {
    justify-content: center;
  }
  
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-container {
    height: 350px;
  }
  
  .tabla-categorias th:nth-child(3),
  .tabla-categorias td:nth-child(3),
  .tabla-categorias th:nth-child(4),
  .tabla-categorias td:nth-child(4) {
    display: none;
  }
}

@media (max-width: 480px) {
  .ventas-categoria {
    padding: 0.5rem;
  }
  
  .reporte-title {
    font-size: 1.1rem;
  }
  
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  .summary-card {
    padding: 0.75rem;
  }
  
  .summary-icon {
    font-size: 1.4rem;
  }
  
  .summary-value {
    font-size: 1rem;
  }
  
  .chart-container {
    height: 300px;
  }
  
  .periodo-btn {
    padding: 0.3rem 0.6rem;
    font-size: 0.7rem;
  }
  
  .tabla-categorias th:nth-child(5),
  .tabla-categorias td:nth-child(5) {
    display: none;
  }
}
</style>
