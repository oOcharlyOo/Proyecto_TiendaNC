<script setup lang="ts">
import { Bar } from 'vue-chartjs';
defineProps<{
  abierto: boolean; anioReporte: number; cargando: boolean;
  reporteAnualData: any;
  annualMonthlyChartData: any; annualMonthlyChartOptions: any;
  uniqueHorarios: string[];
  formatoMoneda: (v: number) => string; formatearCantidad: (c: number, g: boolean) => string;
  getRankIcon: (i: number) => string; getRankClass: (i: number) => string;
  buildHorarioTimelineChart: (g: boolean) => any; getHorarioTimelineOptions: (g: boolean) => any;
  getProductosPorHorario: (h: string, g: boolean) => any[];
}>();
defineEmits<{
  'cerrar': []; 'cambiar-anio': [a: number]; 'generar': [];
}>();
</script>
<template>
  <div v-if="abierto" class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-container anual-modal">
      <div class="modal-decoration">✦</div>
      <div class="modal-header"><h2>Reporte Anual {{ anioReporte }}</h2><button class="modal-close" @click="$emit('cerrar')">✕</button></div>
      <div class="modal-body-content">
        <div class="controls-row">
          <div class="input-group">
            <label>Año:</label>
            <div class="input-wrapper"><input type="number" :value="anioReporte" @input="$emit('cambiar-anio', Number(($event.target as HTMLInputElement).value))" class="input-fancy" min="2020" :max="new Date().getFullYear()" /></div>
          </div>
          <button class="action-btn anual-btn" :disabled="cargando" @click="$emit('generar')">{{ cargando ? 'Cargando...' : 'Generar Reporte' }}</button>
        </div>
        <template v-if="reporteAnualData">
          <div class="resumen-grid">
            <div class="resumen-item c-ventas"><div class="ri-glow"></div><span>Ventas Totales</span><strong>{{ formatoMoneda(reporteAnualData.ventasTotales) }}</strong></div>
            <div class="resumen-item c-ganancia"><div class="ri-glow"></div><span>Ganancia Total</span><strong>{{ formatoMoneda(reporteAnualData.gananciaTotal) }}</strong></div>
            <div class="resumen-item c-efectivo"><div class="ri-glow"></div><span>Efectivo</span><strong>{{ formatoMoneda(reporteAnualData.ventasEfectivo) }}</strong></div>
            <div class="resumen-item c-transferencia"><div class="ri-glow"></div><span>Transferencia</span><strong>{{ formatoMoneda(reporteAnualData.ventasTransferencia) }}</strong></div>
            <div class="resumen-item c-tarjeta"><div class="ri-glow"></div><span>Tarjeta</span><strong>{{ formatoMoneda(reporteAnualData.ventasTarjeta) }}</strong></div>
          </div>
          <h3>Ventas Mensuales</h3>
          <div class="chart-wrapper"><Bar :data="annualMonthlyChartData" :options="annualMonthlyChartOptions" /></div>
          <div class="top-products-grid" v-if="reporteAnualData.topProductosUnitarios?.length || reporteAnualData.topProductosGranel?.length">
            <div class="top-list top-unitarios" v-if="reporteAnualData.topProductosUnitarios?.length">
              <h4>🏆 Top Unitarios</h4>
              <div class="product-item" v-for="(p, i) in reporteAnualData.topProductosUnitarios.slice(0, 5)" :key="i">
                <span class="product-rank" :class="getRankClass(i)">{{ getRankIcon(i) }}</span>
                <span class="product-name">{{ p.nombreProducto }}</span>
                <span class="product-qty">{{ formatearCantidad(p.cantidadVendida, false) }}</span>
              </div>
            </div>
            <div class="top-list top-granel" v-if="reporteAnualData.topProductosGranel?.length">
              <h4>🏆 Top Granel</h4>
              <div class="product-item" v-for="(p, i) in reporteAnualData.topProductosGranel.slice(0, 5)" :key="i">
                <span class="product-rank" :class="getRankClass(i)">{{ getRankIcon(i) }}</span>
                <span class="product-name">{{ p.nombreProducto }}</span>
                <span class="product-qty">{{ formatearCantidad(p.cantidadVendida, true) }}</span>
              </div>
            </div>
          </div>
          <div v-if="uniqueHorarios.length">
            <h3>Productos por Horario</h3>
            <div class="chart-wrapper timeline"><Bar :data="buildHorarioTimelineChart(false)" :options="getHorarioTimelineOptions(false)" /></div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

.modal-container {
  background: var(--color-bg-panel);
  border: none;
  box-shadow: 3px 3px 8px rgba(0,0,0,.12), -1px -1px 4px rgba(255,255,255,.02);
  border-radius: 20px;
  width: 100%;
  max-width: 1100px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem 2rem;
  position: relative;
  animation: modalSlideIn 0.3s ease;
}

.modal-decoration {
  position: absolute;
  top: 10px;
  right: 20px;
  font-size: 2.5rem;
  color: var(--color-accent);
  opacity: 0.1;
  pointer-events: none;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h2 {
  font-size: 1.5rem;
  color: var(--color-accent);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.3rem;
  line-height: 1;
  transition: color 0.2s;
}

.modal-close:hover { color: var(--color-text-primary); }

.modal-body-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-body-content h3 {
  font-size: 1.15rem;
  color: var(--color-accent);
  margin: 0.5rem 0 0;
}

.modal-body-content h4 {
  font-size: 1rem;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem;
}

.controls-row {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.controls-row .input-group {
  flex: 1;
  margin: 0;
}

.controls-row .action-btn {
  white-space: nowrap;
  padding: 0.65rem 1.5rem;
  font-size: 0.9rem;
}

.input-group { margin-bottom: 0.3rem; }
.input-group label { display: block; margin-bottom: 0.3rem; color: var(--color-text-secondary); font-size: 0.9rem; }
.input-wrapper input { width: 100%; padding: 0.65rem; border-radius: 10px; border: none; background: rgba(255,255,255,.05); color: var(--color-text-primary); font-size: 1rem; box-sizing: border-box; }

.resumen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin: 0.5rem 0;
}

.resumen-item {
  border-radius: 14px;
  padding: 1rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  border: none;
  box-shadow: 3px 3px 8px rgba(0,0,0,.1), -1px -1px 4px rgba(255,255,255,.02);
}

.ri-glow {
  position: absolute;
  inset: 0;
  opacity: 0.12;
  pointer-events: none;
}

.resumen-item span {
  display: block;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.3rem;
  position: relative;
  z-index: 1;
}

.resumen-item strong {
  font-size: 1.3rem;
  color: var(--color-text-primary);
  position: relative;
  z-index: 1;
}

/* Card color themes */
.c-ventas { background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 12%, var(--color-bg-panel)), var(--color-bg-panel)); }
.c-ventas .ri-glow { background: radial-gradient(circle at 30% 20%, var(--color-accent), transparent 70%); }
.c-ventas strong { color: var(--color-accent); }

.c-ganancia { background: linear-gradient(135deg, color-mix(in srgb, var(--color-success) 12%, var(--color-bg-panel)), var(--color-bg-panel)); }
.c-ganancia .ri-glow { background: radial-gradient(circle at 30% 20%, var(--color-success), transparent 70%); }
.c-ganancia strong { color: var(--color-success); }

.c-efectivo { background: linear-gradient(135deg, color-mix(in srgb, #3b82f6 12%, var(--color-bg-panel)), var(--color-bg-panel)); }
.c-efectivo .ri-glow { background: radial-gradient(circle at 30% 20%, #3b82f6, transparent 70%); }
.c-efectivo strong { color: #60a5fa; }

.c-transferencia { background: linear-gradient(135deg, color-mix(in srgb, #14b8a6 12%, var(--color-bg-panel)), var(--color-bg-panel)); }
.c-transferencia .ri-glow { background: radial-gradient(circle at 30% 20%, #14b8a6, transparent 70%); }
.c-transferencia strong { color: #5eead4; }

.c-tarjeta { background: linear-gradient(135deg, color-mix(in srgb, #ec4899 12%, var(--color-bg-panel)), var(--color-bg-panel)); }
.c-tarjeta .ri-glow { background: radial-gradient(circle at 30% 20%, #ec4899, transparent 70%); }
.c-tarjeta strong { color: #f472b6; }

.chart-wrapper {
  width: 100%;
  height: 350px;
  position: relative;
}

.chart-wrapper.timeline {
  height: 350px;
}

.top-products-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 0.5rem 0;
}

.top-list {
  border: none;
  box-shadow: 3px 3px 8px rgba(0,0,0,.1), -1px -1px 4px rgba(255,255,255,.02);
  border-radius: 14px;
  padding: 1rem;
}

.top-unitarios {
  background: linear-gradient(135deg, color-mix(in srgb, #3b82f6 6%, var(--color-bg-panel)), var(--color-bg-panel));
}

.top-granel {
  background: linear-gradient(135deg, color-mix(in srgb, #14b8a6 6%, var(--color-bg-panel)), var(--color-bg-panel));
}

.top-list h4 {
  font-size: 0.9rem;
  margin: 0 0 0.6rem;
  text-align: center;
}

.top-unitarios h4 { color: #60a5fa; }
.top-granel h4 { color: #5eead4; }

.product-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.65rem;
  background: rgba(255,255,255,.02);
  border-radius: 8px;
  transition: all 0.2s;
}

.product-item:hover { background: rgba(255,255,255,.04); }

.product-rank {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}

.product-rank.gold { background: color-mix(in srgb,var(--color-accent) 20%,transparent); color: var(--color-accent); }
.product-rank.silver { background: rgba(255,255,255,.08); color: var(--color-text-secondary); }
.product-rank.bronze { background: color-mix(in srgb,var(--color-warning) 20%,transparent); color: var(--color-warning); }

.product-name { font-size: 0.85rem; font-weight: 500; flex: 1; }
.product-qty { font-size: 0.8rem; color: var(--color-text-secondary); white-space: nowrap; }

.action-btn.anual-btn {
  margin: 0;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalSlideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

@media (max-width: 1024px) {
  .modal-container { max-width: 95vw; padding: 1.25rem 1.5rem; }
}

@media (max-width: 768px) {
  .modal-container { max-width: 98vw; padding: 1rem; }
  .modal-header h2 { font-size: 1.2rem; }
  .resumen-grid { grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
  .resumen-item { padding: 0.75rem; }
  .resumen-item strong { font-size: 1.1rem; }
  .top-products-grid { grid-template-columns: 1fr; gap: 0.8rem; }
  .chart-wrapper { height: 250px; }
  .chart-wrapper.timeline { height: 250px; }
  .controls-row { flex-direction: column; gap: 0.5rem; }
  .controls-row .action-btn { width: 100%; }
  .modal-decoration { font-size: 2rem; }
  .top-list { padding: 0.85rem; }
  .product-item { padding: 0.4rem 0.55rem; }
}

@media (max-width: 640px) {
  .resumen-grid { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
  .resumen-item strong { font-size: 1.05rem; }
}

@media (max-width: 480px) {
  .modal-container { max-width: 100vw; border-radius: 12px; padding: 0.65rem; }
  .modal-header { margin-bottom: 1rem; }
  .modal-header h2 { font-size: 0.95rem; }
  .resumen-grid { grid-template-columns: repeat(2, 1fr); gap: 0.35rem; }
  .resumen-item { padding: 0.6rem 0.5rem; border-radius: 10px; }
  .resumen-item span { font-size: 0.65rem; margin-bottom: 0.15rem; }
  .resumen-item strong { font-size: 0.9rem; }
  .top-list { padding: 0.6rem; border-radius: 10px; }
  .top-list h4 { font-size: 0.75rem; margin-bottom: 0.4rem; }
  .product-item { padding: 0.3rem 0.45rem; gap: 0.4rem; }
  .product-name { font-size: 0.7rem; }
  .product-qty { font-size: 0.65rem; }
  .product-rank { width: 20px; height: 20px; font-size: 0.55rem; }
  .chart-wrapper { height: 160px; }
  .chart-wrapper.timeline { height: 160px; }
  .modal-body-content h3 { font-size: 0.9rem; margin-top: 0.3rem; }
  .modal-body-content { gap: 0.6rem; }
  .controls-row { gap: 0.4rem; }
  .controls-row .action-btn { font-size: 0.8rem; padding: 0.5rem 1rem; }
  .modal-decoration { font-size: 1.5rem; top: 5px; right: 10px; }
  .modal-close { font-size: 1.2rem; }
}
</style>
