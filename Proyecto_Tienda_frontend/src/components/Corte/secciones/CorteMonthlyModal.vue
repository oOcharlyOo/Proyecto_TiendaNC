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
