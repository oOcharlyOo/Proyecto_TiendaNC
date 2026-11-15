<script setup lang="ts">
import { computed } from 'vue';
import type { ProductoVendido, VentaDetalleDTO } from '../logica/useCorte';
import { Bar } from 'vue-chartjs';
import CorteTabla, { type Columna } from './CorteTabla.vue';
import { resumenMensual, filasSemanas } from '../logica/corteReportes';
const props = defineProps<{
  detallesMensual: VentaDetalleDTO[]; formatearCantidad: (c: number, g: boolean) => string;
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

const resumen = computed(() => resumenMensual(props.detallesMensual, props.formatearCantidad));
const kpis = computed(() => resumen.value.kpis);
const semanas = computed(() => filasSemanas(props.mensualSemanas));
const esGranel = computed(() => props.tipoGraficaMensual === 'gramaje');
const productosDetalle = computed(() => (esGranel.value ? resumen.value.granel : resumen.value.unitarios));

const diasPie = computed(() => ({
  fecha: 'Total del periodo', tickets: kpis.value.tickets, ventas: kpis.value.ventas, costo: kpis.value.costo,
  ganancia: kpis.value.ganancia, margen: kpis.value.margen,
  efectivo: resumen.value.dias.reduce((s, d) => s + d.efectivo, 0),
  transferencia: resumen.value.dias.reduce((s, d) => s + d.transferencia, 0),
  tarjeta: resumen.value.dias.reduce((s, d) => s + d.tarjeta, 0),
}));
const productosPie = computed(() => {
  const l = productosDetalle.value;
  const venta = l.reduce((s, p) => s + p.venta, 0), costo = l.reduce((s, p) => s + p.costo, 0);
  return { nombre: `Total (${l.length})`, cantidadTxt: '', venta, costo, ganancia: venta - costo, margen: venta > 0 ? ((venta - costo) / venta) * 100 : 0, porcentaje: 100 };
});

const colDias: Columna[] = [
  { key: 'fecha', label: 'Día', subKey: 'dia' },
  { key: 'tickets', label: 'Tickets', tipo: 'numero' },
  { key: 'ventas', label: 'Ventas', tipo: 'moneda', tono: 'info' },
  { key: 'costo', label: 'Costo', tipo: 'moneda', tono: 'costo' },
  { key: 'ganancia', label: 'Ganancia', tipo: 'moneda', tono: 'ok' },
  { key: 'margen', label: 'Margen', tipo: 'margen' },
  { key: 'efectivo', label: 'Efectivo', tipo: 'moneda' },
  { key: 'transferencia', label: 'Transf.', tipo: 'moneda' },
  { key: 'tarjeta', label: 'Tarjeta', tipo: 'moneda' },
];
const colSemanas: Columna[] = [
  { key: 'semana', label: 'Semana', subKey: 'dias' },
  { key: 'ventas', label: 'Ventas', tipo: 'moneda', tono: 'info' },
  { key: 'ganancia', label: 'Ganancia', tipo: 'moneda', tono: 'ok' },
  { key: 'margen', label: 'Margen', tipo: 'margen' },
  { key: 'variacion', label: 'vs. anterior', tipo: 'variacion' },
];
const colMetodos: Columna[] = [
  { key: 'metodo', label: 'Método' },
  { key: 'tickets', label: 'Tickets', tipo: 'numero' },
  { key: 'monto', label: 'Monto', tipo: 'moneda', tono: 'info' },
  { key: 'porcentaje', label: '% del total', tipo: 'pct' },
  { key: 'ticketPromedio', label: 'Ticket prom.', tipo: 'moneda' },
];
const colProductos: Columna[] = [
  { key: 'nombre', label: 'Producto' },
  { key: 'cantidadTxt', label: 'Cantidad' },
  { key: 'venta', label: 'Venta', tipo: 'moneda', tono: 'info' },
  { key: 'costo', label: 'Costo', tipo: 'moneda', tono: 'costo' },
  { key: 'ganancia', label: 'Ganancia', tipo: 'moneda', tono: 'ok' },
  { key: 'margen', label: 'Margen', tipo: 'margen' },
  { key: 'porcentaje', label: '% de ventas', tipo: 'pct' },
];

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
      <div class="modal-body-content">
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
            <div class="resumen-item c-ventas"><div class="ri-glow"></div><span>Ventas Totales</span><strong>{{ formatoMoneda(mensualTotalVentas) }}</strong></div>
            <div class="resumen-item c-ganancia"><div class="ri-glow"></div><span>Ganancias</span><strong>{{ formatoMoneda(mensualTotalGanancias) }}</strong></div>
            <div class="resumen-item c-transferencia"><div class="ri-glow"></div><span>Transferencia</span><strong>{{ formatoMoneda(mensualTotalTransferencia) }}</strong></div>
            <div class="resumen-item c-tarjeta"><div class="ri-glow"></div><span>Tarjeta</span><strong>{{ formatoMoneda(mensualTotalTarjeta) }}</strong></div>
          </div>
          <div class="kpi-grid">
            <div class="kpi"><span>Costo de lo vendido</span><strong class="t-costo">{{ formatoMoneda(kpis.costo) }}</strong></div>
            <div class="kpi"><span>Margen de ganancia</span><strong :class="kpis.margen >= 30 ? 't-ok' : 't-warn'">{{ kpis.margen.toFixed(1) }}%</strong></div>
            <div class="kpi"><span>Tickets</span><strong>{{ kpis.tickets.toLocaleString('es-MX') }}</strong></div>
            <div class="kpi"><span>Ticket promedio</span><strong>{{ formatoMoneda(kpis.ticketPromedio) }}</strong></div>
            <div class="kpi"><span>Promedio por día ({{ kpis.diasConVenta }} días)</span><strong>{{ formatoMoneda(kpis.promedioDiario) }}</strong></div>
            <div class="kpi" v-if="kpis.mejorDia"><span>🔥 Mejor día</span><strong class="t-ok">{{ formatoMoneda(kpis.mejorDia.ventas) }}</strong><small>{{ kpis.mejorDia.dia }} {{ kpis.mejorDia.fecha }}</small></div>
            <div class="kpi" v-if="kpis.peorDia"><span>🧊 Día más bajo</span><strong class="t-costo">{{ formatoMoneda(kpis.peorDia.ventas) }}</strong><small>{{ kpis.peorDia.dia }} {{ kpis.peorDia.fecha }}</small></div>
          </div>
          <h4>Progreso Semanal</h4>
          <div class="chart-wrapper"><Bar :data="weeklyChartData" :options="weeklyChartOptions" /></div>
          <CorteTabla :columnas="colSemanas" :filas="semanas" :formato-moneda="formatoMoneda" />
          <h4>Ventas por día</h4>
          <CorteTabla :columnas="colDias" :filas="resumen.dias" :pie="diasPie" :limite-movil="7" :formato-moneda="formatoMoneda" vacio="No hay ventas por día en este periodo." />
          <h4>Métodos de pago</h4>
          <CorteTabla :columnas="colMetodos" :filas="resumen.metodos" :formato-moneda="formatoMoneda" />
          <h4>Productos</h4>
          <div class="toggle-buttons">
            <button :class="{ active: tipoGraficaMensual === 'unitario' }" @click="$emit('cambiar-tipo-grafica', 'unitario')">Unitarios</button>
            <button :class="{ active: tipoGraficaMensual === 'gramaje' }" @click="$emit('cambiar-tipo-grafica', 'gramaje')">Granel</button>
          </div>
          <div class="chart-box" v-if="tipoGraficaMensual === 'unitario' && productosUnitariosMensual.length">
            <div class="chart-wrapper"><Bar :data="chartDataMensualUnitarios" :options="chartOptionsMensualUnitarios" /></div>
          </div>
          <div class="chart-box" v-if="tipoGraficaMensual === 'gramaje' && productosGranelMensual.length">
            <div class="chart-wrapper"><Bar :data="chartDataMensualGranel" :options="chartOptionsMensualGranel" /></div>
          </div>
          <h4>Detalle de {{ esGranel ? 'granel' : 'unitarios' }} ({{ productosDetalle.length }})</h4>
          <CorteTabla :columnas="colProductos" :filas="productosDetalle" :pie="productosPie" :limite="10" :formato-moneda="formatoMoneda" max-alto-desktop="32rem" />
          <div v-if="uniqueHorariosMensual.length">
            <h4>Productos por Horario</h4>
            <div class="chart-wrapper timeline"><Bar :data="buildMensualTimelineChart(tipoGraficaMensual === 'gramaje')" :options="getMensualTimelineOptions(tipoGraficaMensual === 'gramaje')" /></div>
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
  max-height: 90dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
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
  margin: 1rem 0 0.5rem;
}

.rango-divider {
  text-align: center;
  margin: 0.5rem 0;
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

.c-ventas { background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 12%, var(--badge-bg, var(--color-bg-panel))), var(--badge-bg, var(--color-bg-panel))); }
.c-ventas .ri-glow { background: radial-gradient(circle at 30% 20%, var(--color-accent), transparent 70%); }
.c-ventas strong { color: var(--color-accent); }

.c-ganancia { background: linear-gradient(135deg, color-mix(in srgb, var(--color-success) 12%, var(--badge-bg, var(--color-bg-panel))), var(--badge-bg, var(--color-bg-panel))); }
.c-ganancia .ri-glow { background: radial-gradient(circle at 30% 20%, var(--color-success), transparent 70%); }
.c-ganancia strong { color: var(--color-success); }

.c-efectivo { background: linear-gradient(135deg, color-mix(in srgb, #3b82f6 12%, var(--badge-bg, var(--color-bg-panel))), var(--badge-bg, var(--color-bg-panel))); }
.c-efectivo .ri-glow { background: radial-gradient(circle at 30% 20%, #3b82f6, transparent 70%); }
.c-efectivo strong { color: #60a5fa; }

.c-transferencia { background: linear-gradient(135deg, color-mix(in srgb, #14b8a6 12%, var(--badge-bg, var(--color-bg-panel))), var(--badge-bg, var(--color-bg-panel))); }
.c-transferencia .ri-glow { background: radial-gradient(circle at 30% 20%, #14b8a6, transparent 70%); }
.c-transferencia strong { color: #5eead4; }

.c-tarjeta { background: linear-gradient(135deg, color-mix(in srgb, #ec4899 12%, var(--badge-bg, var(--color-bg-panel))), var(--badge-bg, var(--color-bg-panel))); }
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

.chart-box {
  background: rgba(255,255,255,.02);
  border-radius: 12px;
  padding: 1rem;
  margin: 0.5rem 0;
}

.toggle-buttons {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.toggle-buttons button {
  padding: 0.4rem 1.2rem;
  border-radius: 8px;
  border: none;
  box-shadow: 3px 3px 8px rgba(0,0,0,.12), -1px -1px 4px rgba(255,255,255,.02);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
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

.input-group { margin-bottom: 0.3rem; }
.input-group label { display: block; margin-bottom: 0.3rem; color: var(--color-text-secondary); font-size: 0.9rem; }
.input-wrapper input { width: 100%; padding: 0.65rem; border-radius: 10px; border: none; background: rgba(255,255,255,.05); color: var(--color-text-primary); font-size: 1rem; box-sizing: border-box; }
.input-group.row { display: flex; gap: 1rem; }
.input-group.row > div { flex: 1; }
.input-group.row input { width: 100%; box-sizing: border-box; }

.action-btn.mensual-btn {
  width: 100%;
  margin: 0;
  padding: 0.7rem;
  font-size: 0.9rem;
}

/* Indicadores adicionales */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 0.6rem; }
.kpi { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.65rem 0.8rem; border-radius: 12px; background: var(--color-bg-primary); box-shadow: 2px 2px 6px rgba(0,0,0,.1); min-width: 0; }
.kpi span { font-size: 0.68rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: .03em; }
.kpi strong { font-size: 1.1rem; color: var(--color-text-primary); overflow-wrap: anywhere; }
.kpi small { font-size: 0.68rem; color: var(--color-text-secondary); text-transform: capitalize; }
.t-ok { color: var(--color-success) !important; } .t-costo { color: var(--color-error) !important; } .t-warn { color: #c99234 !important; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalSlideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

@media (max-width: 1024px) {
  .modal-container { max-width: 95vw; padding: 1.25rem 1.5rem; }
}

@media (max-width: 768px) {
  .modal-container { max-width: 98vw; padding: 1rem; }
  .resumen-grid { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
  .resumen-item { padding: 0.75rem; }
  .resumen-item strong { font-size: 1.1rem; }
  .input-group.row { flex-direction: column; gap: 0.5rem; }
  .chart-wrapper { height: 250px; }
  .chart-wrapper.timeline { height: 250px; }
  .modal-header h2 { font-size: 1.2rem; }
  .modal-decoration { font-size: 2rem; }
  .chart-box { padding: 0.75rem; }
}

@media (max-width: 640px) {
  .resumen-grid { gap: 0.5rem; }
  .resumen-item strong { font-size: 1rem; }
  .chart-wrapper { height: 200px; }
  .chart-wrapper.timeline { height: 200px; }
}

@media (max-width: 480px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; gap: 0.4rem; }
  .kpi { padding: 0.5rem 0.6rem; }
  .kpi strong { font-size: 0.95rem; }
  .modal-container { max-width: 100vw; border-radius: 12px; padding: 0.65rem; }
  .modal-header { margin-bottom: 1rem; }
  .modal-header h2 { font-size: 1rem; }
  .resumen-grid { grid-template-columns: 1fr 1fr; gap: 0.35rem; }
  .resumen-item { padding: 0.6rem 0.5rem; border-radius: 10px; }
  .resumen-item span { font-size: 0.65rem; margin-bottom: 0.15rem; }
  .resumen-item strong { font-size: 0.9rem; }
  .chart-wrapper { height: 160px; }
  .chart-wrapper.timeline { height: 160px; }
  .modal-body-content h3 { font-size: 0.9rem; margin-top: 0.3rem; }
  .modal-body-content h4 { font-size: 0.8rem; }
  .modal-body-content { gap: 0.6rem; }
  .chart-box { padding: 0.5rem; border-radius: 8px; }
  .toggle-buttons button { font-size: 0.7rem; padding: 0.25rem 0.6rem; }
  .input-wrapper input { padding: 0.5rem; font-size: 0.9rem; }
  .action-btn.mensual-btn { padding: 0.55rem; font-size: 0.8rem; }
  .modal-decoration { font-size: 1.5rem; top: 5px; right: 10px; }
  .modal-close { font-size: 1.2rem; }
}
</style>
