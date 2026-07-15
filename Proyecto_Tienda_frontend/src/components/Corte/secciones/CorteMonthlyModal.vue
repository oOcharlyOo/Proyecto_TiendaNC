<script setup lang="ts">
import type { ProductoVendido } from '../logica/useCorte';
import { Bar } from 'vue-chartjs';
defineProps<{
  abierto: boolean; mesMensual: string; fechaRangoInicio: string; fechaRangoFin: string;
  cargando: boolean; tipoGraficaMensual: 'unitario' | 'gramaje';
  mensualTotalVentas: number; mensualTotalGanancias: number;
  mensualTotalTransferencia: number; mensualTotalTarjeta: number;
  mensualSemanas: any[]; rangoFechasSemanas: any;
  productosUnitariosMensual: ProductoVendido[]; productosGranelMensual: ProductoVendido[];
  chartDataMensualCombinado: any; chartDataMensualUnitarios: any; chartDataMensualGranel: any;
  chartOptionsMensualCombinado: any; chartOptionsMensualUnitarios: any; chartOptionsMensualGranel: any;
  weeklyChartData: any; weeklyChartOptions: any;
  uniqueHorariosMensual: string[];
  formatoMoneda: (v: number) => string;
  buildMensualTimelineChart: (g: boolean) => any; getMensualTimelineOptions: (g: boolean) => any;
}>();
defineEmits<{
  'cerrar': []; 'cambiar-mes': [mes: string]; 'generar-mensual': [];
  'cambiar-rango-inicio': [f: string]; 'cambiar-rango-fin': [f: string]; 'generar-rango': [];
  'cambiar-tipo-grafica': [t: 'unitario' | 'gramaje'];
}>();
</script>
<template>
  <div v-if="abierto" class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-container mensual-modal">
      <div class="modal-decoration">✧</div>
      <div class="modal-header"><h2>Reporte Mensual</h2><button class="modal-close" @click="$emit('cerrar')">✕</button></div>
      <div class="monthly-scroll">
        <div class="input-group">
          <label>Mes:</label>
          <div class="input-wrapper"><input type="month" :value="mesMensual" @input="$emit('cambiar-mes', ($event.target as HTMLInputElement).value)" class="input-fancy" /></div>
        </div>
        <button class="action-btn mensual-btn" :disabled="cargando" @click="$emit('generar-mensual')">{{ cargando ? 'Generando...' : 'Generar Reporte Mensual' }}</button>
        <div class="rango-divider"><span>O reporte por rango de fechas</span></div>
        <div class="input-group row">
          <div><label>Inicio:</label><input type="date" :value="fechaRangoInicio" @input="$emit('cambiar-rango-inicio', ($event.target as HTMLInputElement).value)" class="input-fancy" /></div>
          <div><label>Fin:</label><input type="date" :value="fechaRangoFin" @input="$emit('cambiar-rango-fin', ($event.target as HTMLInputElement).value)" class="input-fancy" /></div>
        </div>
        <button class="action-btn mensual-btn" :disabled="cargando" @click="$emit('generar-rango')">{{ cargando ? 'Generando...' : 'Generar por Rango' }}</button>
        <template v-if="mensualSemanas.length">
          <h3>Resumen Mensual</h3>
          <div class="resumen-grid">
            <div class="resumen-item"><span>Ventas Totales</span><strong>{{ formatoMoneda(mensualTotalVentas) }}</strong></div>
            <div class="resumen-item"><span>Ganancias</span><strong>{{ formatoMoneda(mensualTotalGanancias) }}</strong></div>
            <div class="resumen-item"><span>Transferencia</span><strong>{{ formatoMoneda(mensualTotalTransferencia) }}</strong></div>
            <div class="resumen-item"><span>Tarjeta</span><strong>{{ formatoMoneda(mensualTotalTarjeta) }}</strong></div>
          </div>
          <h4>Progreso Semanal</h4>
          <div class="bar-chart-container" style="height:300px"><Bar :data="weeklyChartData" :options="weeklyChartOptions" /></div>
          <h4>Productos</h4>
          <div class="toggle-buttons">
            <button :class="{ active: tipoGraficaMensual === 'unitario' }" @click="$emit('cambiar-tipo-grafica', 'unitario')">Unitarios</button>
            <button :class="{ active: tipoGraficaMensual === 'gramaje' }" @click="$emit('cambiar-tipo-grafica', 'gramaje')">Granel</button>
          </div>
          <div class="chart-box" v-if="tipoGraficaMensual === 'unitario' && productosUnitariosMensual.length">
            <div class="bar-chart-container"><Bar :data="chartDataMensualUnitarios" :options="chartOptionsMensualUnitarios" /></div>
          </div>
          <div class="chart-box" v-if="tipoGraficaMensual === 'gramaje' && productosGranelMensual.length">
            <div class="bar-chart-container"><Bar :data="chartDataMensualGranel" :options="chartOptionsMensualGranel" /></div>
          </div>
          <div v-if="uniqueHorariosMensual.length">
            <h4>Productos por Horario</h4>
            <div class="bar-chart-container" style="height:300px"><Bar :data="buildMensualTimelineChart(tipoGraficaMensual === 'gramaje')" :options="getMensualTimelineOptions(tipoGraficaMensual === 'gramaje')" /></div>
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

.monthly-scroll {
  max-height: 70vh;
  overflow-y: auto;
  padding: 0 0.5rem;
}

.rango-divider {
  text-align: center;
  margin: 1rem 0;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  position: relative;
}

.rango-divider::before,
.rango-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 30%;
  height: 1px;
  background: var(--color-border);
}

.rango-divider::before { left: 0; }
.rango-divider::after { right: 0; }

.resumen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.8rem;
  margin: 1rem 0;
}

.resumen-item {
  background: rgba(255,255,255,.02);
  border-radius: 10px;
  padding: 0.8rem;
  text-align: center;
}

.resumen-item span { display: block; font-size: 0.75rem; color: var(--color-text-secondary); }
.resumen-item strong { font-size: 1.1rem; color: var(--color-text-primary);  }

.chart-box {
  background: rgba(255,255,255,.02);
  border-radius: 12px;
  padding: 1rem;
  margin: 1rem 0;
}

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

.bar-chart-container { width: 100%; height: 250px; position: relative; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalSlideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

@media (max-width: 768px) {
  .modal-container { max-width: 95vw; padding: 1rem; }
  .resumen-grid { grid-template-columns: repeat(2, 1fr); }
  .input-group.row { flex-direction: column; gap: 0.5rem; }
}

@media (max-width: 480px) {
  .modal-container { max-width: 100vw; border-radius: 12px; padding: 0.8rem; }
  .resumen-grid { grid-template-columns: 1fr 1fr; gap: 0.4rem; }
}
</style>
