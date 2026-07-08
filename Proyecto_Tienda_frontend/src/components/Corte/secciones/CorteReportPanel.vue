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
