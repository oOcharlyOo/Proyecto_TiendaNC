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
