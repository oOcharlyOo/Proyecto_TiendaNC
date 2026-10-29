<script setup lang="ts">
import type { ProductoVendido } from '../logica/useCorte';
import { Bar, Pie } from 'vue-chartjs';
defineProps<{
  mostrarReporte: boolean; corteActual: any; reporteTitulo: string;
  mostrarCerrarTurno: boolean; cargandoCerrarTurno: boolean; esAdministrador: boolean;
  ventasEfectivo: number; ventasTransferencia: number; ventasTarjeta: number;
  totalEnvase: number; abonoTotalDia: number; totalTicketsDia: number;
  montoInicialCajaActiva: number; nombreApartadoActivo: string;
  totalApartarDiario: number; dineroApartarDiario: number;
  horasTrabajadas: string; horaInicioCaja: string | null; horaFinCaja: string | null;
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
  'volver': []; 'abrir-modal-diario': []; 'abrir-modal-mensual': [];
  'abrir-historial': []; 'abrir-modal-anual': [];
}>();
</script>
<template>
  <section v-if="mostrarReporte && corteActual" class="reporte-section">
    <!-- Encabezado del Reporte -->
    <div class="report-header">
      <div class="header-top-row">
        <button class="back-btn" @click="$emit('volver')">← Volver</button>
        <div class="header-main">
          <span class="header-icon">📊</span>
          <h2 class="header-title">{{ reporteTitulo }}</h2>
        </div>
      </div>
      <div class="header-info-bar">
        <div class="info-chip">
          <span class="chip-icon">🏦</span>
          <span class="chip-label">Fondo Inicial</span>
          <span class="chip-value">{{ formatoMoneda(montoInicialCajaActiva) }}</span>
        </div>
        <div class="info-chip">
          <span class="chip-icon">🎫</span>
          <span class="chip-label">Tickets</span>
          <span class="chip-value">{{ totalTicketsDia }}</span>
        </div>
        <div class="info-chip">
          <span class="chip-icon">⏱️</span>
          <span class="chip-label">Horas</span>
          <span class="chip-value">{{ horasTrabajadas }}</span>
        </div>
        <div class="info-chip">
          <span class="chip-icon">🕐</span>
          <span class="chip-label">Turno</span>
          <span class="chip-value">{{ horaInicioCaja ? new Date(horaInicioCaja).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'N/D' }} → {{ horaFinCaja ? new Date(horaFinCaja).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '...' }}</span>
        </div>
      </div>
    </div>

    <!-- Sección: VENTAS -->
    <div class="section-block section-ventas">
      <div class="section-accent"></div>
      <div class="section-content">
        <div class="section-header-row">
          <span class="section-icon">💰</span>
          <h3 class="section-title">Ventas</h3>
          <span class="section-subtitle">Totales del día</span>
        </div>
        <div class="section-grid">
          <div class="reporte-card main-card">
            <div class="card-header">Total Ventas</div>
            <div class="card-value highlight">{{ formatoMoneda(corteActual.totalVentas) }}</div>
            <div class="card-details">
              <div class="detail-row"><span>Efectivo:</span><span>{{ formatoMoneda(ventasEfectivo) }}</span></div>
              <div class="detail-row"><span>Transferencia:</span><span>{{ formatoMoneda(ventasTransferencia) }}</span></div>
              <div class="detail-row"><span>Tarjeta:</span><span>{{ formatoMoneda(ventasTarjeta) }}</span></div>
            </div>
          </div>
          <div class="reporte-card envase-card">
            <div class="card-header">♻️ Envases</div>
            <div class="card-value envase-value">{{ formatoMoneda(totalEnvase) }}</div>
            <div class="card-details"><div class="detail-row"><span>Cobro por envases</span></div></div>
          </div>
          <div class="reporte-card">
            <div class="card-header">📋 Abono del Día</div>
            <div class="card-value abono-value">{{ formatoMoneda(abonoTotalDia) }}</div>
            <div class="card-details"><div class="detail-row"><span>Pagos a crédito</span></div></div>
          </div>
          <div class="reporte-card">
            <div class="card-header">💵 Ventas Efectivo</div>
            <div class="card-value success">{{ formatoMoneda(ventasEfectivo) }}</div>
            <div class="card-details"><div class="detail-row"><span>Total en efectivo</span></div></div>
          </div>
          <div class="reporte-card">
            <div class="card-header">📱 Ventas Transferencia</div>
            <div class="card-value trans-value">{{ formatoMoneda(ventasTransferencia) }}</div>
            <div class="card-details"><div class="detail-row"><span>Total transferido</span></div></div>
          </div>
          <div class="reporte-card">
            <div class="card-header">💳 Ventas Tarjeta</div>
            <div class="card-value tarjeta-value">{{ formatoMoneda(ventasTarjeta) }}</div>
            <div class="card-details"><div class="detail-row"><span>Total con tarjeta</span></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección: CAJA -->
    <div class="section-block section-caja">
      <div class="section-accent"></div>
      <div class="section-content">
        <div class="section-header-row">
          <span class="section-icon">🏦</span>
          <h3 class="section-title">Caja</h3>
          <span class="section-subtitle">Movimientos y saldos</span>
        </div>
        <div class="section-grid">
          <div class="reporte-card">
            <div class="card-header">🏦 Fondo Inicial</div>
            <div class="card-value">{{ formatoMoneda(montoInicialCajaActiva) }}</div>
          </div>
          <div class="reporte-card clickable" @click="$emit('abrir-entradas')">
            <div class="card-header">💵 Entradas Extra</div>
            <div class="card-value info-value">{{ formatoMoneda(corteActual.otrosIngresos) }}</div>
            <div class="card-details"><div class="detail-row"><span>Ver detalle ➜</span></div></div>
          </div>
          <div class="reporte-card clickable" @click="$emit('abrir-egresos')">
            <div class="card-header">📤 Egresos</div>
            <div class="card-value danger">{{ formatoMoneda(corteActual.totalEgresos) }}</div>
            <div class="card-details"><div class="detail-row"><span>Ver detalle ➜</span></div></div>
          </div>
          <div class="reporte-card">
            <div class="card-header">💵 Saldo Final Efectivo</div>
            <div class="card-value success">{{ formatoMoneda(corteActual.saldoFinalEfectivo) }}</div>
            <div class="card-details"><div class="detail-row"><span>Calculado:</span><span>{{ formatoMoneda(corteActual.saldoFinalCalculado) }}</span></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección: GANANCIAS -->
    <div class="section-block section-ganancias">
      <div class="section-accent"></div>
      <div class="section-content">
        <div class="section-header-row">
          <span class="section-icon">💎</span>
          <h3 class="section-title">Ganancias</h3>
          <span class="section-subtitle">Rentabilidad del período</span>
        </div>
        <div class="section-grid">
          <div class="reporte-card main-card">
            <div class="card-header">Ganancia Bruta</div>
            <div class="card-value highlight">{{ formatoMoneda(corteActual.gananciaTotal) }}</div>
            <div class="card-details"><div class="detail-row"><span>Ventas − Costos</span></div></div>
          </div>
          <div class="reporte-card" v-if="nombreApartadoActivo">
            <div class="card-header">📦 {{ nombreApartadoActivo }}</div>
            <div class="card-value">{{ formatoMoneda(totalApartarDiario) }}</div>
            <div class="card-details"><div class="detail-row"><span>Apartar diario: {{ formatoMoneda(dineroApartarDiario) }}</span></div></div>
          </div>
          <div class="reporte-card">
            <div class="card-header">💰 Dinero a Apartar</div>
            <div class="card-value abono-value">{{ formatoMoneda(dineroApartarDiario) }}</div>
            <div class="card-details"><div class="detail-row"><span>Reservado para apartados</span></div></div>
          </div>
          <div class="reporte-card main-card">
            <div class="card-header">Ganancia Neta</div>
            <div class="card-value ganancia-neta">{{ formatoMoneda(corteActual.gananciaNeta) }}</div>
            <div class="card-details"><div class="detail-row"><span>Bruta − Apartado diario</span></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección: PRODUCTOS (charts) -->
    <div class="section-block section-productos">
      <div class="section-accent"></div>
      <div class="section-content">
        <div class="section-header-row">
          <span class="section-icon">🏆</span>
          <h3 class="section-title">Productos Más Vendidos</h3>
          <span class="section-subtitle">Top de ventas del período</span>
        </div>
        <div class="chart-section" v-if="cortePieChartData.labels?.length">
          <div class="double-panel">
            <div class="chart-panel">
              <div class="panel-header">
                <div class="panel-ornament left">❧</div>
                <div class="panel-title">Distribución de Ventas</div>
                <div class="panel-ornament right">❧</div>
              </div>
              <div class="chart-content">
                <div class="pie-wrapper">
                  <div class="pie-chart-container"><Pie :data="cortePieChartData" :options="cortePieChartOptions" /></div>
                  <div class="pie-center"><span class="pie-total">{{ formatoMoneda(corteActual.totalVentas) }}</span><span class="pie-label">Total</span></div>
                </div>
                <div class="chart-legend">
                  <div v-for="(label, idx) in cortePieChartData.labels" :key="idx" class="legend-item">
                    <div class="legend-color" :style="{ background: cortePieChartData.datasets[0].backgroundColor[idx] }"></div>
                    <span>{{ label }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="products-panel">
              <div class="panel-header">
                <div class="panel-ornament left">🏆</div>
                <div class="panel-title">Ranking de Productos</div>
                <div class="panel-ornament right">⚔</div>
              </div>
              <div class="toggle-buttons small">
                <button :class="{ active: tipoGraficaCorte === 'unitario' }" @click="$emit('cambiar-tipo-grafica', 'unitario')">Unitarios</button>
                <button :class="{ active: tipoGraficaCorte === 'gramaje' }" @click="$emit('cambiar-tipo-grafica', 'gramaje')">Granel</button>
                <button :class="{ active: tipoGraficaCorte === 'combinado' }" @click="$emit('cambiar-tipo-grafica', 'combinado')">Combinado</button>
              </div>
              <div class="bar-chart-container" v-if="tipoGraficaCorte === 'unitario'"><Bar :data="chartDataUnitarios" :options="chartOptionsUnitarios" /></div>
              <div class="bar-chart-container" v-else-if="tipoGraficaCorte === 'gramaje'"><Bar :data="chartDataGranel" :options="chartOptionsGranel" /></div>
              <div class="bar-chart-container" v-else><Bar :data="chartDataCombinado" :options="chartOptionsCombinado" /></div>
              <div class="products-list">
                <div v-for="(p, idx) in productosMasVendidos.slice(0, 8)" :key="idx" class="product-item">
                  <span class="product-rank" :class="getRankClass(idx)">{{ getRankIcon(idx) }}</span>
                  <div class="product-info">
                    <span class="product-name">{{ p.nombre }}</span>
                    <span class="product-category">{{ p.isGramaje ? 'Granel' : 'Unitario' }}</span>
                  </div>
                  <span class="product-amount">{{ formatearCantidad(p.cantidadTotal, p.isGramaje) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="products-panel timeline-panel">
            <div class="panel-header">
              <div class="panel-ornament left">⏰</div>
              <div class="panel-title">Productos por Horario</div>
              <div class="panel-ornament right">⚔</div>
            </div>
            <div class="toggle-buttons small"><button :class="{ active: true }">Unitarios</button></div>
            <div class="bar-chart-container" style="height:300px"><Bar :data="buildDiarioTimelineChart(false)" :options="getDiarioTimelineOptions(false)" /></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Acciones rápidas -->
    <div v-if="esAdministrador" class="report-actions-bar">
      <button class="action-btn diario-btn" @click="$emit('abrir-modal-diario')">
        <span class="action-icon">📅</span> Reporte Diario
      </button>
      <button class="action-btn mensual-btn" @click="$emit('abrir-modal-mensual')">
        <span class="action-icon">📆</span> Reporte Mensual
      </button>
      <button class="action-btn historial-btn" @click="$emit('abrir-historial')">
        <span class="action-icon">📜</span> Historial
      </button>
      <button class="action-btn apartados-btn" @click="$emit('abrir-apartados')">
        <span class="action-icon">📦</span> Apartados
      </button>
      <button class="action-btn anual-btn" @click="$emit('abrir-modal-anual')">
        <span class="action-icon">📊</span> Reporte Anual
      </button>
    </div>

    <!-- Cerrar Turno -->
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
  padding: 0.5rem 0 2rem;
}

/* ===== REPORT HEADER ===== */
.report-header {
  background: var(--color-bg-secondary);
  border: none;
  box-shadow: 3px 3px 8px rgba(0,0,0,.12), -1px -1px 4px rgba(255,255,255,.02);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
}

.header-top-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.back-btn {
  background: rgba(255,255,255,.05);
  border: none;
  border-radius: 10px;
  padding: 0.5rem 1rem;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-body);
  white-space: nowrap;
  flex-shrink: 0;
}

.back-btn:hover {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
}

.header-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex: 1;
}

.header-icon {
  font-size: 1.5rem;
}

.header-title {
  font-size: 1.3rem;
  color: var(--color-accent);
  margin: 0;
  text-align: center;
}

.header-info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.info-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--color-bg-panel);
  border-radius: 10px;
  padding: 0.5rem 0.9rem;
  font-size: 0.8rem;
  box-shadow: inset 2px 2px 4px rgba(0,0,0,.08);
}

.chip-icon {
  font-size: 0.95rem;
}

.chip-label {
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-size: 0.7rem;
}

.chip-value {
  font-weight: 700;
  color: var(--color-text-primary);
}

/* ===== SECTION BLOCKS ===== */
.section-block {
  display: flex;
  gap: 0;
  margin-bottom: 1.5rem;
  background: var(--color-bg-secondary);
  border: none;
  box-shadow: 3px 3px 8px rgba(0,0,0,.12), -1px -1px 4px rgba(255,255,255,.02);
  border-radius: 16px;
  overflow: hidden;
}

.section-accent {
  width: 6px;
  flex-shrink: 0;
}

.section-content {
  flex: 1;
  padding: 1.25rem 1.5rem;
}

.section-header-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid rgba(255,255,255,.06);
}

.section-icon {
  font-size: 1.3rem;
}

.section-title {
  font-size: 1.1rem;
  margin: 0;
  font-weight: 700;
}

.section-subtitle {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-left: auto;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Section accent colors */
.section-ventas .section-accent { background: var(--color-success); }
.section-ventas .section-title { color: var(--color-success); }
.section-ventas .section-icon { color: var(--color-success); }

.section-caja .section-accent { background: var(--color-info); }
.section-caja .section-title { color: var(--color-info); }
.section-caja .section-icon { color: var(--color-info); }

.section-ganancias .section-accent { background: #a855f7; }
.section-ganancias .section-title { color: #a855f7; }
.section-ganancias .section-icon { color: #a855f7; }

.section-productos .section-accent { background: var(--color-accent); }
.section-productos .section-title { color: var(--color-accent); }
.section-productos .section-icon { color: var(--color-accent); }

/* ===== REPORTE GRID ===== */
.section-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.8rem;
}

.reporte-card {
  background: var(--color-bg-panel);
  border: none;
  box-shadow: 3px 3px 8px rgba(0,0,0,.08), -1px -1px 4px rgba(255,255,255,.02);
  border-radius: 14px;
  padding: 1rem 1.2rem;
  transition: all var(--transition-normal);
}

.reporte-card:hover {
  transform: translateY(-2px);
  box-shadow: 6px 6px 15px rgba(0,0,0,.18), -3px -3px 8px rgba(255,255,255,.03);
}

.reporte-card.clickable { cursor: pointer; }

.reporte-card.main-card {
  grid-column: span 2;
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 8%, transparent), var(--color-bg-panel));
}

.card-header {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.4rem;
}

.card-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 0.4rem;
}

.card-value.highlight { color: var(--color-accent); }
.card-value.success { color: var(--color-success); }
.card-value.danger { color: var(--color-error); }
.card-value.envase-value { color: var(--color-info); }
.card-value.trans-value { color: #60a5fa; }
.card-value.tarjeta-value { color: #f472b6; }
.card-value.abono-value { color: var(--color-warning); }
.card-value.info-value { color: var(--color-info); }
.card-value.ganancia-neta { color: #a855f7; }

.card-details {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.15rem 0;
}

.detail-row.clickable {
  cursor: pointer;
  color: var(--color-accent);
}

.detail-row.clickable:hover { text-decoration: underline; }

/* ===== CHARTS ===== */
.chart-section { margin-top: 0.5rem; }

.double-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.chart-panel, .products-panel {
  background: var(--color-bg-panel);
  border: none;
  box-shadow: 3px 3px 8px rgba(0,0,0,.08), -1px -1px 4px rgba(255,255,255,.02);
  border-radius: 14px;
  padding: 1.2rem;
}

.timeline-panel {
  margin-top: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.panel-ornament {
  color: var(--color-accent);
  font-size: 1rem;
  opacity: 0.4;
}

.panel-title {
  font-size: 0.95rem;
  color: var(--color-accent);
  text-align: center;
}

.chart-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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
  max-width: 240px;
  height: 240px;
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
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-accent);
  display: block;
}

.pie-label {
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chart-legend {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.6rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-primary);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  flex-shrink: 0;
}

.toggle-buttons {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.toggle-buttons button {
  padding: 0.35rem 0.9rem;
  border-radius: 8px;
  border: none;
  box-shadow: 2px 2px 5px rgba(0,0,0,.1), -1px -1px 3px rgba(255,255,255,.02);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
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
  padding: 0.2rem 0.6rem;
  font-size: 0.7rem;
}

.bar-chart-container {
  width: 100%;
  height: 220px;
  position: relative;
}

/* Products list */
.products-list {
  margin-top: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.4rem 0.65rem;
  background: rgba(255,255,255,.02);
  border-radius: 8px;
  transition: all 0.2s;
}

.product-item:hover { background: rgba(255,255,255,.03); }

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

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.product-name { font-size: 0.8rem; font-weight: 500; }
.product-category { font-size: 0.65rem; color: var(--color-text-secondary); }
.product-amount { font-size: 0.8rem; font-weight: 600; text-align: right; white-space: nowrap; }

/* Actions bar */
.report-actions-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: center;
  padding: 0 0 1.5rem;
}

.report-actions-bar .action-btn {
  padding: 0.6rem 1rem;
  font-size: 0.8rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.08);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-body);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.report-actions-bar .action-btn:hover {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-accent);
  border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
}

/* Close shift */
.close-shift-section {
  display: flex;
  justify-content: center;
  padding: 2rem 0 0.5rem;
}

.action-btn.cerrar-btn {
  padding: 1rem 3rem;
  font-size: 1.2rem;
  border-radius: 14px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-error) 20%, transparent), color-mix(in srgb, var(--color-error) 5%, transparent));
  border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
  color: var(--color-error);
}

.action-btn.cerrar-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 0 30px color-mix(in srgb, var(--color-error) 20%, transparent);
}

/* ===== RESPONSIVE ===== */
@media (max-width: 1024px) {
  .double-panel { grid-template-columns: 1fr; }
  .chart-content { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .section-grid { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
  .reporte-card.main-card { grid-column: span 2; }
  .card-value { font-size: 1.2rem; }
  .header-title { font-size: 1.1rem; }
  .section-content { padding: 1rem; }
  .info-chip { padding: 0.4rem 0.7rem; font-size: 0.7rem; }
  .pie-chart-container { max-width: 180px; height: 180px; }
  .header-info-bar { gap: 0.5rem; }
  .section-subtitle { display: none; }
  .reporte-card { padding: 0.8rem 1rem; }
  .back-btn { font-size: 0.75rem; padding: 0.4rem 0.7rem; }
  .header-top-row { gap: 0.5rem; }
}

@media (max-width: 480px) {
  .section-grid { grid-template-columns: 1fr; }
  .reporte-card.main-card { grid-column: span 1; }
  .chart-panel, .products-panel { padding: 0.6rem; }
  .bar-chart-container { height: 150px; }
  .header-info-bar { flex-direction: column; align-items: center; }
  .section-content { padding: 0.75rem; }
  .section-accent { width: 4px; }
  .reporte-card { padding: 0.65rem 0.85rem; }
  .card-value { font-size: 1.1rem; }
  .card-header { font-size: 0.65rem; }
  .pie-chart-container { max-width: 150px; height: 150px; }
  .pie-total { font-size: 1rem; }
  .report-header { padding: 0.8rem 1rem; }
  .header-title { font-size: 0.95rem; }
  .info-chip { padding: 0.3rem 0.55rem; font-size: 0.65rem; gap: 0.25rem; }
  .info-chip .chip-label { display: none; }
  .action-btn.cerrar-btn { padding: 0.8rem 2rem; font-size: 1rem; width: 100%; }
  .back-btn { font-size: 0.7rem; padding: 0.35rem 0.6rem; }
  .report-actions-bar { gap: 0.4rem; }
  .report-actions-bar .action-btn { font-size: 0.7rem; padding: 0.45rem 0.7rem; }
  .product-name { font-size: 0.75rem; }
  .product-rank { width: 22px; height: 22px; font-size: 0.6rem; }
  .panel-title { font-size: 0.8rem; }
  .panel-ornament { display: none; }
  .toggle-buttons button { padding: 0.25rem 0.5rem; font-size: 0.65rem; }
  .section-icon { font-size: 1rem; }
  .section-title { font-size: 0.9rem; }
}
</style>
