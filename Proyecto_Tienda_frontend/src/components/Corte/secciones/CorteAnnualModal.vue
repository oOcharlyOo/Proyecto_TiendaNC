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
      <div class="modal-decoration">✧</div>
      <div class="modal-header"><h2>Reporte Anual</h2><button class="modal-close" @click="$emit('cerrar')">✕</button></div>
      <div class="modal-body">
        <div class="input-group">
          <label>Año:</label>
          <div class="input-wrapper"><input type="number" :value="anioReporte" @input="$emit('cambiar-anio', Number(($event.target as HTMLInputElement).value))" class="input-fancy" min="2020" :max="new Date().getFullYear()" /></div>
        </div>
        <button class="action-btn anual-btn" :disabled="cargando" @click="$emit('generar')">{{ cargando ? 'Cargando...' : 'Generar Reporte Anual' }}</button>
        <template v-if="reporteAnualData">
          <div class="resumen-grid">
            <div class="resumen-item"><span>Ventas Totales</span><strong>{{ formatoMoneda(reporteAnualData.ventasTotales) }}</strong></div>
            <div class="resumen-item"><span>Ganancia Total</span><strong>{{ formatoMoneda(reporteAnualData.gananciaTotal) }}</strong></div>
          </div>
          <h4>Ventas Mensuales</h4>
          <div class="bar-chart-container" style="height:350px"><Bar :data="annualMonthlyChartData" :options="annualMonthlyChartOptions" /></div>
          <div class="top-products-grid" v-if="reporteAnualData.topProductosUnitarios?.length">
            <div class="top-list"><h4>Top Unitarios</h4>
              <div class="product-item" v-for="(p, i) in reporteAnualData.topProductosUnitarios.slice(0, 5)" :key="i">
                <span class="product-rank" :class="getRankClass(i)">{{ getRankIcon(i) }}</span>
                <span class="product-name">{{ p.nombreProducto }}</span>
                <span class="product-qty">{{ formatearCantidad(p.cantidadVendida, false) }}</span>
              </div>
            </div>
            <div class="top-list"><h4>Top Granel</h4>
              <div class="product-item" v-for="(p, i) in reporteAnualData.topProductosGranel.slice(0, 5)" :key="i">
                <span class="product-rank" :class="getRankClass(i)">{{ getRankIcon(i) }}</span>
                <span class="product-name">{{ p.nombreProducto }}</span>
                <span class="product-qty">{{ formatearCantidad(p.cantidadVendida, true) }}</span>
              </div>
            </div>
          </div>
          <div v-if="uniqueHorarios.length">
            <h4>Productos por Horario</h4>
            <div class="bar-chart-container" style="height:300px"><Bar :data="buildHorarioTimelineChart(false)" :options="getHorarioTimelineOptions(false)" /></div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
