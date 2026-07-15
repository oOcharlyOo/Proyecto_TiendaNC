<script setup lang="ts">
import type { ProductoVendido } from '../logica/useCorte';
import { Bar, Pie } from 'vue-chartjs';
defineProps<{
  mostrarReporte: boolean; corteActual: any; reporteTitulo: string;
  mostrarCerrarTurno: boolean; cargandoCerrarTurno: boolean;
  ventasEfectivo: number; ventasTransferencia: number; ventasTarjeta: number;
  totalEnvase: number; abonoTotalDia: number; totalTicketsDia: number;
  montoInicialCajaActiva: number; nombreApartadoActivo: string;
  totalApartarDiario: number; dineroApartarDiario: number;
  tipoGraficaCorte: 'unitario' | 'gramaje' | 'combinado';
  productosMasVendidos: ProductoVendido[]; productosUnitarios: ProductoVendido[]; productosGranel: ProductoVendido[];
  chartData: any; chartDataUnitarios: any; chartDataGranel: any; chartDataCombinado: any;
  chartOptions: any; chartOptionsUnitarios: any; chartOptionsGranel: any; chartOptionsCombinado: any;
  cortePieChartData: any; cortePieChartOptions: any;
  uniqueHorariosDiario: string[]; detallesDiario: any[];
  formatoMoneda: (v: number) => string; formatearCantidad: (c: number, g: boolean) => string;
  getRankIcon: (i: number) => string; getRankClass: (i: number) => string;
  buildDiarioTimelineChart: (g: boolean) => any; getDiarioTimelineOptions: (g: boolean) => any;
  getDailyProductosPorHorario: (h: string, g: boolean) => any[];
}>();
defineEmits<{
  'cerrar-turno': []; 'abrir-egresos': []; 'abrir-entradas': []; 'abrir-apartados': [];
  'cambiar-tipo-grafica': [t: 'unitario' | 'gramaje' | 'combinado'];
}>();
</script>
<template>
  <section v-if="mostrarReporte && corteActual" class="reporte-section">
    <div class="section-header"><h2 class="section-title"><span class="title-icon">📊</span><span>{{ reporteTitulo }}</span></h2></div>
    <div class="reporte-grid">
      <div class="reporte-card main-card">
        <div class="card-header">💰 Total Ventas</div>
        <div class="card-value highlight">{{ formatoMoneda(corteActual.totalVentas) }}</div>
        <div class="card-details"><div class="detail-row"><span>Efectivo:</span><span>{{ formatoMoneda(ventasEfectivo) }}</span></div><div class="detail-row"><span>Transferencia:</span><span>{{ formatoMoneda(ventasTransferencia) }}</span></div></div>
      </div>
      <div class="reporte-card">
        <div class="card-header">📥 Otros Ingresos</div>
        <div class="card-value">{{ formatoMoneda(corteActual.otrosIngresos) }}</div>
        <div class="card-details"><div class="detail-row clickable" @click="$emit('abrir-entradas')"><span>💵 Entradas Extra</span></div></div>
      </div>
      <div class="reporte-card">
        <div class="card-header">💵 Saldo Final Efectivo</div>
        <div class="card-value success">{{ formatoMoneda(corteActual.saldoFinalEfectivo) }}</div>
        <div class="card-details"><div class="detail-row"><span>Calculado:</span><span>{{ formatoMoneda(corteActual.saldoFinalCalculado) }}</span></div></div>
      </div>
      <div class="reporte-card clickable" @click="$emit('abrir-egresos')">
        <div class="card-header">📤 Egresos</div>
        <div class="card-value danger">{{ formatoMoneda(corteActual.totalEgresos) }}</div>
        <div class="card-details"><div class="detail-row"><span>Ver detalle ➜</span></div></div>
      </div>
      <div class="reporte-card envase-card">
        <div class="card-header">♻️ Envases</div>
        <div class="card-value envase-value">{{ formatoMoneda(totalEnvase) }}</div>
        <div class="card-details"><div class="detail-row"><span>Cobro por envases</span></div></div>
      </div>
      <div class="reporte-card" v-if="nombreApartadoActivo" @click="$emit('abrir-apartados')">
        <div class="card-header">📦 Apartado: {{ nombreApartadoActivo }}</div>
        <div class="card-value">{{ formatoMoneda(totalApartarDiario) }}</div>
        <div class="card-details"><div class="detail-row"><span>Apartar diario: {{ formatoMoneda(dineroApartarDiario) }}</span></div></div>
      </div>
      <div class="reporte-card">
        <div class="card-header">📊 Totales</div>
        <div class="card-value">{{ formatoMoneda(corteActual.gananciaTotal) }}</div>
        <div class="card-details"><div class="detail-row"><span>Ganancia Neta: {{ formatoMoneda(corteActual.gananciaNeta) }}</span></div></div>
      </div>
    </div>
    <div class="chart-section" v-if="cortePieChartData.labels?.length">
      <div class="chart-panel">
        <div class="panel-header"><div class="panel-ornament left">❧</div><div class="panel-title">Distribución de Ventas</div><div class="panel-ornament right">❧</div></div>
        <div class="chart-content">
          <div class="pie-wrapper"><div class="pie-chart-container"><Pie :data="cortePieChartData" :options="cortePieChartOptions" /></div><div class="pie-center"><span class="pie-total">{{ formatoMoneda(corteActual.totalVentas) }}</span><span class="pie-label">Total</span></div></div>
          <div class="chart-legend"><div v-for="(label, idx) in cortePieChartData.labels" :key="idx" class="legend-item"><div class="legend-color" :style="{ background: cortePieChartData.datasets[0].backgroundColor[idx] }"></div><span>{{ label }}</span></div></div>
        </div>
        <div class="panel-footer"><div class="footer-ornament">⏣</div></div>
      </div>
      <div class="products-panel">
        <div class="panel-header"><div class="panel-ornament left">🏆</div><div class="panel-title">Productos Más Vendidos</div><div class="panel-ornament right">⚔</div></div>
        <div class="toggle-buttons">
          <button :class="{ active: tipoGraficaCorte === 'unitario' }" @click="$emit('cambiar-tipo-grafica', 'unitario')">Unitarios</button>
          <button :class="{ active: tipoGraficaCorte === 'gramaje' }" @click="$emit('cambiar-tipo-grafica', 'gramaje')">Granel</button>
          <button :class="{ active: tipoGraficaCorte === 'combinado' }" @click="$emit('cambiar-tipo-grafica', 'combinado')">Combinado</button>
        </div>
        <div class="bar-chart-container" v-if="tipoGraficaCorte === 'unitario'"><Bar :data="chartDataUnitarios" :options="chartOptionsUnitarios" /></div>
        <div class="bar-chart-container" v-else-if="tipoGraficaCorte === 'gramaje'"><Bar :data="chartDataGranel" :options="chartOptionsGranel" /></div>
        <div class="bar-chart-container" v-else><Bar :data="chartDataCombinado" :options="chartOptionsCombinado" /></div>
        <div class="products-list"><div v-for="(p, idx) in productosMasVendidos.slice(0, 10)" :key="idx" class="product-item"><span class="product-rank" :class="getRankClass(idx)">{{ getRankIcon(idx) }}</span><div class="product-info"><span class="product-name">{{ p.nombre }}</span><span class="product-category">{{ p.isGramaje ? 'Granel' : 'Unitario' }}</span></div><span class="product-amount">{{ formatearCantidad(p.cantidadTotal, p.isGramaje) }}</span></div></div>
        <div class="panel-footer"><div class="footer-ornament">⏣</div></div>
      </div>
      <div class="products-panel">
        <div class="panel-header"><div class="panel-ornament left">⏰</div><div class="panel-title">Productos por Horario</div><div class="panel-ornament right">⚔</div></div>
        <div class="toggle-buttons"><button :class="{ active: true }">Unitarios</button></div>
        <div class="bar-chart-container" style="height:300px"><Bar :data="buildDiarioTimelineChart(false)" :options="getDiarioTimelineOptions(false)" /></div>
        <div class="panel-footer"><div class="footer-ornament">⏣</div></div>
      </div>
    </div>
    <div v-if="mostrarCerrarTurno" class="close-shift-section">
      <button class="action-btn cerrar-btn" :disabled="cargandoCerrarTurno" @click="$emit('cerrar-turno')">
        <span class="action-icon">🔒</span> {{ cargandoCerrarTurno ? 'Cerrando...' : 'Cerrar Turno' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.reporte-section {
  position: relative;
  z-index: 1;
  padding: 1rem 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.section-title {
  
  font-size: 1.5rem;
  color: var(--color-accent);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
}

.title-icon { font-size: 1.3rem; }

.reporte-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.reporte-card {
  background: var(--color-bg-secondary);
  border:none;box-shadow:3px 3px 8px rgba(0,0,0,.12),-1px -1px 4px rgba(255,255,255,.02);
  border-radius: 16px;
  padding: 1.25rem;
  transition: all var(--transition-normal);
  
}

.reporte-card:hover {
  transform: translateY(-2px);
  
  box-shadow:8px 8px 20px rgba(0,0,0,.25),-4px -4px 10px rgba(255,255,255,.03);
}

.reporte-card.clickable { cursor: pointer; }

.reporte-card.main-card {
  grid-column: span 2;
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 8%, transparent), var(--color-bg-secondary));
}

.card-header {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
}

.card-value.highlight { color: var(--color-accent); }
.card-value.success { color: var(--color-success); }
.card-value.danger { color: var(--color-error); }
.card-value.envase-value { color: var(--color-info); }

.card-details {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.2rem 0;
}

.detail-row.clickable {
  cursor: pointer;
  color: var(--color-accent);
}

.detail-row.clickable:hover { text-decoration: underline; }

/* Chart Section */
.chart-section { margin-top: 2rem; }

.chart-panel, .products-panel {
  background: var(--color-bg-secondary);
  border:none;box-shadow:3px 3px 8px rgba(0,0,0,.12),-1px -1px 4px rgba(255,255,255,.02);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.panel-ornament {
  color: var(--color-accent);
  font-size: 1.2rem;
  opacity: 0.5;
}

.panel-title {
  
  font-size: 1.1rem;
  color: var(--color-accent);
  text-align: center;
}

.chart-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.pie-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pie-chart-container {
  width: 100%;
  max-width: 280px;
  height: 280px;
  margin: 0 auto;
  position: relative;
}

.pie-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.pie-total {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-accent);
  display: block;
  
}

.pie-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chart-legend {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.75rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-primary);
}

.legend-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
}

.panel-footer {
  text-align: center;
  margin-top: 1rem;
}

.footer-ornament {
  color: var(--color-accent);
  opacity: 0.3;
  font-size: 0.9rem;
}

/* Toggle Buttons */
.toggle-buttons {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
}

.toggle-buttons button {
  padding: 0.4rem 1rem;
  border-radius: 8px;
  border:none;box-shadow:3px 3px 8px rgba(0,0,0,.12),-1px -1px 4px rgba(255,255,255,.02);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-body);
}

.toggle-buttons button.active {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  
  color: var(--color-accent);
}

.toggle-buttons button:hover {
  
  color: var(--color-accent);
}

.toggle-buttons.small button {
  padding: 0.25rem 0.7rem;
  font-size: 0.7rem;
}

/* Products list */
.products-list {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255,255,255,.02);
  border-radius: 8px;
  transition: all 0.2s;
}

.product-item:hover { background: rgba(255,255,255,.03); }

.product-rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.product-rank.gold { background: color-mix(in srgb,var(--color-accent) 20%,transparent); color: var(--color-accent); }
.product-rank.silver { background: rgba(255,255,255,.08); color: var(--color-text-secondary); }
.product-rank.bronze { background: color-mix(in srgb,var(--color-warning) 20%,transparent); color: var(--color-warning); }

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.product-name { font-size: 0.85rem; font-weight: 500; }
.product-category { font-size: 0.7rem; color: var(--color-text-secondary); }
.product-amount { font-size: 0.85rem; font-weight: 600; text-align: right; white-space: nowrap; }

.bar-chart-container { width: 100%; height: 250px; position: relative; }
.close-shift-section { display: flex; justify-content: center; padding: 2rem 0; }

@media (max-width: 1024px) {
  .chart-content { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .reporte-grid { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
  .reporte-card.main-card { grid-column: span 2; }
  .card-value { font-size: 1.2rem; }
  .section-title { font-size: 1.2rem; }
  .pie-chart-container { max-width: 200px; height: 200px; }
}

@media (max-width: 480px) {
  .reporte-grid { grid-template-columns: 1fr; }
  .reporte-card.main-card { grid-column: span 1; }
  .chart-panel, .products-panel { padding: 1rem; }
  .bar-chart-container { height: 200px; }
}
</style>
