<script setup lang="ts">
import { Bar, Pie, Line } from 'vue-chartjs';
import * as r from './logica/useReporteVentas';
import './estilos/reporteventas.css';
import { useReporteVentas } from './logica/useReporteVentas';
useReporteVentas();
</script>

<template>
  <div class="reporte-ventas">
    <header class="reporte-header">
      <h2 class="reporte-title">
        <span class="title-icon">📊</span>
        Reporte de Ventas
      </h2>
      <div class="reporte-controls">
        <div class="periodo-selector">
          <button 
            v-for="p in ['dia', 'semana', 'mes', 'anio']" 
            :key="p"
            :class="['periodo-btn', { active: r.periodo.value === p }]"
            @click="r.periodo.value = p as any"
          >
            {{ p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Año' }}
          </button>
        </div>
        <div class="fecha-selector">
          <input 
            v-if="r.periodo.value === 'dia'" 
            v-model="r.fechaSeleccionada.value" 
            type="date" 
            @change="r.cargarDatos"
          />
          <input 
            v-else-if="r.periodo.value === 'semana'" 
            v-model="r.fechaSeleccionada.value" 
            type="date" 
            @change="r.cargarDatos"
          />
          <input 
            v-else-if="r.periodo.value === 'mes'" 
            v-model="r.fechaSeleccionada.value" 
            type="month" 
            @change="r.cargarDatos"
          />
          <input 
            v-else 
            v-model="r.fechaSeleccionada.value" 
            type="number" 
            min="2020" 
            max="2030" 
            @change="r.cargarDatos"
          />
          <button class="btn-cargar" @click="r.cargarDatos" :disabled="r.cargando.value">
            {{ r.cargando.value ? '...' : 'Cargar' }}
          </button>
        </div>
      </div>
    </header>

    <div class="rango-actual">
      <span class="rango-label">📅 Rango consultado:</span>
      <span class="rango-fechas">{{ r.rangoActual.value.inicio }} → {{ r.rangoActual.value.fin }}</span>
      <span class="rango-detalle">({{ r.detalles.value.length }} detalles, {{ r.ventasMap.value.size }} ventas únicas)</span>
    </div>

    <div v-if="r.cargando.value" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Cargando reporte...</span>
    </div>

    <template v-else>
      <div class="summary-cards">
        <div class="summary-card">
          <span class="summary-icon">🧾</span>
          <div class="summary-info">
            <span class="summary-label">Total Ventas</span>
            <span class="summary-value">{{ r.totalVentas.value }}</span>
          </div>
        </div>
        <div class="summary-card highlight">
          <span class="summary-icon">💰</span>
          <div class="summary-info">
            <span class="summary-label">Total Cobrado</span>
            <span class="summary-value">{{ r.formatoMoneda(r.totalMonto.value) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">📉</span>
          <div class="summary-info">
            <span class="summary-label">Costo Total</span>
            <span class="summary-value">{{ r.formatoMoneda(r.totalCosto.value) }}</span>
          </div>
        </div>
        <div class="summary-card highlight ganancia">
          <span class="summary-icon">💵</span>
          <div class="summary-info">
            <span class="summary-label">Ganancia Neta</span>
            <span class="summary-value">{{ r.formatoMoneda(r.totalGanancia.value) }}</span>
          </div>
        </div>
        <div class="summary-card highlight ganancia">
          <span class="summary-icon">📊</span>
          <div class="summary-info">
            <span class="summary-label">Ganancia Prom. por Día</span>
            <span class="summary-value">{{ r.formatoMoneda(r.gananciaPromedioDia.value) }}</span>
          </div>
        </div>
        <div class="summary-card highlight">
          <span class="summary-icon">📅</span>
          <div class="summary-info">
            <span class="summary-label">Ventas Prom. por Día</span>
            <span class="summary-value">{{ r.formatoMoneda(r.ventasPromedioDia.value) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">📋</span>
          <div class="summary-info">
            <span class="summary-label">Abonos</span>
            <span class="summary-value">{{ r.formatoMoneda(r.totalAbonos.value) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">💳</span>
          <div class="summary-info">
            <span class="summary-label">Transferencias</span>
            <span class="summary-value">{{ r.formatoMoneda(r.totalTransferencias.value) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">💳</span>
          <div class="summary-info">
            <span class="summary-label">Tarjetas</span>
            <span class="summary-value">{{ r.formatoMoneda(r.totalTarjetas.value) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">🧴</span>
          <div class="summary-info">
            <span class="summary-label">Envases</span>
            <span class="summary-value">{{ r.formatoMoneda(r.totalEnvases.value) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">📦</span>
          <div class="summary-info">
            <span class="summary-label">Productos Únicos</span>
            <span class="summary-value">{{ r.productosUnicos.value }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">🎯</span>
          <div class="summary-info">
            <span class="summary-label">Venta Promedio ($)</span>
            <span class="summary-value">{{ r.formatoMoneda(r.ticketPromedio.value) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">📈</span>
          <div class="summary-info">
            <span class="summary-label">{{ r.etiquetaPromedio.value }}</span>
            <span class="summary-value">{{ r.valorPromedio.value }}</span>
          </div>
        </div>
        <div class="summary-card highlight" style="cursor:pointer" @click="r.abrirMovimientos('entradas')">
          <span class="summary-icon">📥</span>
          <div class="summary-info">
            <span class="summary-label">Total Entradas</span>
            <span class="summary-value">{{ r.formatoMoneda(r.totalEntradas.value) }}</span>
          </div>
        </div>
        <div class="summary-card" style="cursor:pointer" @click="r.abrirMovimientos('salidas')">
          <span class="summary-icon">📤</span>
          <div class="summary-info">
            <span class="summary-label">Total Salidas</span>
            <span class="summary-value">{{ r.formatoMoneda(r.totalSalidas.value) }}</span>
          </div>
        </div>
        <div class="summary-card highlight" :class="{ 'ganancia': r.flujoNeto.value >= 0 }">
          <span class="summary-icon">💹</span>
          <div class="summary-info">
            <span class="summary-label">Flujo Neto</span>
            <span class="summary-value">{{ r.formatoMoneda(r.flujoNeto.value) }}</span>
          </div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card chart-wide">
          <h3 class="chart-title">📈 Tendencia de Ventas</h3>
          <div class="chart-container">
            <Line :data="r.chartTendencia.value" :options="r.chartOptionsTendencia" />
          </div>
        </div>

        <div class="chart-card chart-wide">
          <h3 class="chart-title">💹 Movimiento de Dinero en Caja</h3>
          <div class="chart-container">
            <Line :data="r.chartFlujoDinero.value" :options="r.chartOptionsFlujo.value" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">🏆 Top Productos por Monto</h3>
          <div class="chart-container">
            <Bar :data="r.chartTopProductos.value" :options="r.chartOptionsBar" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">📦 Top Unitarios por Cantidad</h3>
          <div class="chart-container">
            <Bar :data="r.chartTopCantidad.value" :options="r.chartOptionsBar" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">⚖️ Top Gramaje por Cantidad</h3>
          <div class="chart-container">
            <Bar :data="r.chartTopGramaje.value" :options="r.chartOptionsBar" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">💳 Ventas por Método de Pago</h3>
          <div class="chart-container chart-pie">
            <Pie :data="r.chartMetodos.value" :options="r.chartPieOptions" />
          </div>
        </div>

        <div class="chart-card chart-wide">
          <h3 class="chart-title">🏷️ Ventas por Categoría (Monto)</h3>
          <div class="chart-container">
            <Bar :data="r.chartVentasCategoria.value" :options="r.chartOptionsCategoria" />
          </div>
        </div>

        <div class="chart-card chart-wide">
          <h3 class="chart-title">🏷️ Ganancia por Categoría</h3>
          <div class="chart-container">
            <Bar :data="r.chartGananciaCategoria.value" :options="r.chartOptionsCategoria" />
          </div>
        </div>

        <div class="chart-card chart-wide">
          <h3 class="chart-title">💵 Top Productos por Ganancia</h3>
          <div class="chart-container">
            <Bar :data="r.chartTopGanancia.value" :options="r.chartOptionsBar" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">💵 Ganancia Unitarios</h3>
          <div class="chart-container">
            <Bar :data="r.chartGananciaUnitarios.value" :options="r.chartOptionsBar" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">💵 Ganancia Gramaje</h3>
          <div class="chart-container">
            <Bar :data="r.chartGananciaGramaje.value" :options="r.chartOptionsBar" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">📦 Detalle Unitarios</h3>
          <div class="tabla-container">
            <table class="tabla-productos">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="text-right">Cantidad</th>
                  <th class="text-right">Venta</th>
                  <th class="text-right">Costo</th>
                  <th class="text-right">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in r.productosUnitarios.value" :key="p.nombre">
                  <td>{{ p.nombre }}</td>
                  <td class="text-right">{{ r.formatoCantidad(p.cantidadTotal, p.isGramaje) }}</td>
                  <td class="text-right monto">{{ r.formatoMoneda(p.montoTotal) }}</td>
                  <td class="text-right costo">{{ r.formatoMoneda(p.costoTotal) }}</td>
                  <td class="text-right ganancia">{{ r.formatoMoneda(p.gananciaTotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">⚖️ Detalle Gramaje</h3>
          <div class="tabla-container">
            <table class="tabla-productos">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="text-right">Cantidad</th>
                  <th class="text-right">Venta</th>
                  <th class="text-right">Costo</th>
                  <th class="text-right">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in r.productosGramaje.value" :key="p.nombre">
                  <td>{{ p.nombre }}</td>
                  <td class="text-right">{{ r.formatoCantidad(p.cantidadTotal, p.isGramaje) }}</td>
                  <td class="text-right monto">{{ r.formatoMoneda(p.montoTotal) }}</td>
                  <td class="text-right costo">{{ r.formatoMoneda(p.costoTotal) }}</td>
                  <td class="text-right ganancia">{{ r.formatoMoneda(p.gananciaTotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- MODAL DETALLE CATEGORIA -->
    <div v-if="r.modalCategoriaOpen.value" class="modal-overlay-cat" @click.self="r.cerrarModalCategoria">
      <div class="modal-card-cat">
        <div class="modal-header-cat">
          <h3>📦 {{ r.categoriaSeleccionada.value }} → {{ r.subCategoriaSeleccionada.value }}</h3>
          <button class="modal-close-cat" @click="r.cerrarModalCategoria">✕</button>
        </div>
        <div class="modal-body-cat">
          <div v-if="r.productosCategoriaSeleccionada.value.length === 0" class="modal-empty">
            No hay productos para {{ r.categoriaSeleccionada.value }} / {{ r.subCategoriaSeleccionada.value }} en este periodo.
          </div>
          <template v-else>
            <div class="chart-container-modal">
              <Bar :data="r.chartProductosCategoria.value" :options="r.chartOptionsProductosCategoria" />
            </div>
            <div class="tabla-modal">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th class="text-right">Cantidad</th>
                    <th class="text-right">Venta</th>
                    <th class="text-right">Costo</th>
                    <th class="text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in r.productosCategoriaSeleccionada.value" :key="p.nombre">
                    <td>{{ p.nombre }}</td>
                    <td class="text-right">{{ r.formatoCantidad(p.cantidadTotal, p.isGramaje) }}</td>
                    <td class="text-right monto">{{ r.formatoMoneda(p.montoTotal) }}</td>
                    <td class="text-right costo">{{ r.formatoMoneda(p.costoTotal) }}</td>
                    <td class="text-right ganancia">{{ r.formatoMoneda(p.gananciaTotal) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- MODAL MOVIMIENTOS CAJA -->
    <div v-if="r.modalMovimientosOpen.value" class="modal-overlay-cat" @click.self="r.modalMovimientosOpen.value = false">
      <div class="modal-card-cat modal-movimientos">
        <div class="modal-header-cat">
          <h3>{{ r.movimientosTitulo.value }}</h3>
          <button class="modal-close-cat" @click="r.modalMovimientosOpen.value = false">✕</button>
        </div>
        <div class="modal-body-cat">
          <div v-if="r.movimientosLista.value.length === 0" class="modal-empty">
            No hay {{ r.movimientosTitulo.value.toLowerCase() }} en este período.
          </div>
          <table v-else class="tabla-movimientos">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th class="text-right">Monto</th>
                <th class="text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in r.movimientosLista.value" :key="m.idCaja">
                <td class="fecha-col">{{ r.formatearFechaHora(m.fechaMovimiento) }}</td>
                <td>
                  <template v-if="r.editandoMovimientoId.value === m.idCaja">
                    <input v-model="r.editandoDescripcion.value" class="edit-desc-input" type="text" @keyup.enter="r.guardarDescripcion(m.idCaja)" @keyup.escape="r.cancelarEdicionDescripcion" />
                    <span class="edit-actions">
                      <button class="btn-edit-save" @click="r.guardarDescripcion(m.idCaja)" :disabled="r.guardandoDescripcion.value" title="Guardar">✓</button>
                      <button class="btn-edit-cancel" @click="r.cancelarEdicionDescripcion" title="Cancelar">✕</button>
                    </span>
                  </template>
                  <template v-else>
                    <span class="desc-text">{{ m.descripcion }}</span>
                    <button class="btn-edit-icon" @click="r.iniciarEdicionDescripcion(m)" title="Editar descripción">✎</button>
                  </template>
                </td>
                <td class="text-right" :class="r.movimientosTitulo.value.startsWith('Entradas') ? 'monto' : 'costo'">
                  {{ r.formatoMoneda(m.monto) }}
                </td>
                <td class="text-center"></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2"><strong>Total</strong></td>
                <td class="text-right"><strong>{{ r.formatoMoneda(r.movimientosLista.value.reduce((s, m) => s + Number(m.monto || 0), 0)) }}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>


