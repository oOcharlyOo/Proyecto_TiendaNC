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

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease;  }
.modal-container { background: var(--color-bg-panel); border:none;box-shadow:3px 3px 8px rgba(0,0,0,.12),-1px -1px 4px rgba(255,255,255,.02); border-radius: 20px; width: 100%; max-width: 1000px; max-height: 85vh; overflow-y: auto; padding: 1.5rem; position: relative; animation: modalSlideIn 0.3s ease; }
.modal-decoration { position: absolute; top: 10px; right: 20px; font-size: 2rem; color: var(--color-accent); opacity: 0.1; pointer-events: none; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-header h2 {  font-size: 1.3rem; color: var(--color-accent); margin: 0; }
.modal-close { background: none; border: none; color: var(--color-text-secondary); font-size: 1.5rem; cursor: pointer; padding: 0.3rem; line-height: 1; transition: color 0.2s; }
.modal-close:hover { color: var(--color-text-primary); }
.resumen-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.8rem; margin: 1rem 0; }
.resumen-item { background: rgba(255,255,255,.02); border-radius: 10px; padding: 0.8rem; text-align: center; }
.resumen-item span { display: block; font-size: 0.75rem; color: var(--color-text-secondary); }
.resumen-item strong { font-size: 1.1rem; color: var(--color-text-primary);  }
.bar-chart-container { width: 100%; height: 250px; position: relative; }
.top-products-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
.top-list { background: rgba(255,255,255,.02); border-radius: 12px; padding: 1rem; }
.top-list h4 { font-size: 0.85rem; color: var(--color-accent); margin: 0 0 0.5rem; text-align: center; }
.product-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(255,255,255,.02); border-radius: 8px; transition: all 0.2s; }
.product-item:hover { background: rgba(255,255,255,.03); }
.product-rank { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
.product-rank.gold { background: color-mix(in srgb,var(--color-accent) 20%,transparent); color: var(--color-accent); }
.product-rank.silver { background: rgba(255,255,255,.08); color: var(--color-text-secondary); }
.product-rank.bronze { background: color-mix(in srgb,var(--color-warning) 20%,transparent); color: var(--color-warning); }
.product-name { font-size: 0.85rem; font-weight: 500; flex: 1; }
.product-qty { font-size: 0.8rem; color: var(--color-text-secondary); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalSlideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
