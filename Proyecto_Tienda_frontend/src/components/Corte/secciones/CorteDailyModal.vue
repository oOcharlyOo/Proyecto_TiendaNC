<script setup lang="ts">
import type { ProductoVendido, VentaDetalleDTO } from '../logica/useCorte';
import { Bar, Pie } from 'vue-chartjs';
defineProps<{
  abierto: boolean; fechaDiaria: string; cargando: boolean;
  mostrarReporte: boolean; corteActual: any;
  ventasEfectivo: number; ventasTransferencia: number;
  totalEnvase: number; reporteTitulo: string;
  tipoGraficaDiaria: 'unitario' | 'gramaje';
  productosDiario: ProductoVendido[];
  productosUnitariosDiario: ProductoVendido[];
  productosGranelDiario: ProductoVendido[];
  chartDataDiarioCombinado: any; chartDataDiarioUnitarios: any; chartDataDiarioGranel: any;
  chartOptionsDiarioCombinado: any; chartOptionsDiarioUnitarios: any; chartOptionsDiarioGranel: any;
  chartOptionsDiarioDoughnut: any;
  diarioPieChartData: any; diarioPieChartOptions: any;
  uniqueHorariosDiario: string[];
  detallesDiario: VentaDetalleDTO[];
  formatoMoneda: (v: number) => string; formatearCantidad: (c: number, g: boolean) => string;
  getRankIcon: (i: number) => string; getRankClass: (i: number) => string;
  buildDiarioTimelineChart: (g: boolean) => any; getDiarioTimelineOptions: (g: boolean) => any;
  getDailyProductosPorHorario: (h: string, g: boolean) => any[];
}>();
defineEmits<{
  'cerrar': []; 'cambiar-tipo-grafica': [tipo: 'unitario' | 'gramaje'];
  'generar-reporte': []; 'cambiar-fecha': [fecha: string];
}>();
</script>
<template>
  <div v-if="abierto" class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-container diario-modal">
      <div class="modal-decoration">✧</div>
      <div class="modal-header"><h2>Reporte Diario</h2><button class="modal-close" @click="$emit('cerrar')">✕</button></div>
      <div class="modal-body">
        <div class="input-group">
          <label>Fecha:</label>
          <div class="input-wrapper"><input type="date" :value="fechaDiaria" @input="$emit('cambiar-fecha', ($event.target as HTMLInputElement).value)" class="input-fancy" /></div>
        </div>
        <button class="action-btn diario-btn generar-btn" :disabled="cargando" @click="$emit('generar-reporte')">
          {{ cargando ? 'Generando...' : 'Generar Reporte Diario' }}
        </button>
        <template v-if="mostrarReporte">
          <div class="toggle-buttons">
            <button :class="{ active: tipoGraficaDiaria === 'unitario' }" @click="$emit('cambiar-tipo-grafica', 'unitario')">Unitarios</button>
            <button :class="{ active: tipoGraficaDiaria === 'gramaje' }" @click="$emit('cambiar-tipo-grafica', 'gramaje')">Granel</button>
          </div>
          <div class="chart-grid">
            <div class="chart-box" v-if="tipoGraficaDiaria === 'unitario' && productosUnitariosDiario.length">
              <h4>Top 5 Unitarios</h4>
              <div class="bar-chart-container"><Bar :data="chartDataDiarioUnitarios" :options="chartOptionsDiarioUnitarios" /></div>
            </div>
            <div class="chart-box" v-if="tipoGraficaDiaria === 'gramaje' && productosGranelDiario.length">
              <h4>Top 5 Granel</h4>
              <div class="bar-chart-container"><Bar :data="chartDataDiarioGranel" :options="chartOptionsDiarioGranel" /></div>
            </div>
            <div class="chart-box" v-if="diarioPieChartData.labels?.length">
              <h4>Distribución de Ingresos</h4>
              <div class="pie-chart-container"><Pie :data="diarioPieChartData" :options="diarioPieChartOptions" /></div>
            </div>
          </div>
          <div class="chart-full" v-if="uniqueHorariosDiario.length">
            <h4>Productos por Horario</h4>
            <div class="toggle-buttons small">
              <button :class="{ active: true }">Unitarios</button>
            </div>
            <div class="bar-chart-container" style="height:300px"><Bar :data="buildDiarioTimelineChart(tipoGraficaDiaria === 'gramaje')" :options="getDiarioTimelineOptions(tipoGraficaDiaria === 'gramaje')" /></div>
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
  border:none;box-shadow:3px 3px 8px rgba(0,0,0,.12),-1px -1px 4px rgba(255,255,255,.02);
  border-radius: 20px;
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 1.5rem;
  position: relative;
  animation: modalSlideIn 0.3s ease;
}

.modal-decoration {
  position: absolute;
  top: 10px;
  right: 20px;
  font-size: 2rem;
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
  
  font-size: 1.3rem;
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

.generar-btn { width: 100%; margin: 1rem 0; }

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

.toggle-buttons.small button { padding: 0.25rem 0.7rem; font-size: 0.7rem; }

.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1rem 0;
}

.chart-box {
  background: rgba(255,255,255,.02);
  border-radius: 12px;
  padding: 1rem;
}

.chart-box h4 {
  font-size: 0.85rem;
  color: var(--color-accent);
  text-align: center;
  margin-bottom: 0.8rem;
}

.chart-full {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255,255,255,.02);
  border-radius: 12px;
}

.chart-full h4 {
  font-size: 0.85rem;
  color: var(--color-accent);
  text-align: center;
  margin-bottom: 0.8rem;
}

.bar-chart-container { width: 100%; height: 250px; position: relative; }
.pie-chart-container { width: 100%; max-width: 280px; height: 280px; margin: 0 auto; position: relative; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalSlideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

@media (max-width: 768px) {
  .modal-container { max-width: 95vw; padding: 1rem; }
  .chart-grid { grid-template-columns: 1fr; }
}
</style>
