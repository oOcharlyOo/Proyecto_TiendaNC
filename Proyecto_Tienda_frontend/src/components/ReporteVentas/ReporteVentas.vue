<script setup lang="ts">
import { ref, watch } from 'vue';
import { Bar, Pie, Line } from 'vue-chartjs';
import * as r from './logica/useReporteVentas';
import { useReporteVentas } from './logica/useReporteVentas';
useReporteVentas();

const categoriasExpandidas = ref<Record<string, boolean>>({});
function toggleCategoria(cat: string) {
  categoriasExpandidas.value[cat] = !categoriasExpandidas.value[cat];
}

const rentaEditable = ref<number>(r.rentaMensual.value);
const guardandoRenta = ref(false);
watch(() => r.rentaMensual.value, (v) => {
  rentaEditable.value = v;
});

async function guardarRentaLocal() {
  guardandoRenta.value = true;
  const ok = await r.guardarRenta(Number(rentaEditable.value || 0));
  guardandoRenta.value = false;
  if (ok) rentaEditable.value = r.rentaMensual.value;
}

const limiteUnitarios = ref(10);
const limiteGramaje = ref(10);
function toggleLimite(tipo: 'unitarios' | 'gramaje') {
  const total = tipo === 'unitarios' ? r.productosUnitarios.value.length : r.productosGramaje.value.length;
  const limite = tipo === 'unitarios' ? limiteUnitarios : limiteGramaje;
  limite.value = limite.value === 10 ? total : 10;
}
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

    <div v-if="r.esAdmin.value" class="card-section s-renta renta-admin">
      <h3 class="section-title"><span class="section-icon">🏠</span> Renta del Local</h3>
      <div class="renta-admin-controls">
        <label class="renta-admin-label" for="renta-mensual">Monto mensual</label>
        <input id="renta-mensual" v-model="rentaEditable" type="number" min="0" step="0.01" class="renta-admin-input" />
        <button class="btn-cargar" @click="guardarRentaLocal" :disabled="guardandoRenta">
          {{ guardandoRenta ? '...' : 'Guardar' }}
        </button>
      </div>
    </div>

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
      <div class="cards-sections">

        <div class="card-section s-ventas">
          <h3 class="section-title"><span class="section-icon">💰</span> Ventas</h3>
          <div class="section-cards">
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
            <div class="summary-card highlight">
              <span class="summary-icon">📅</span>
              <div class="summary-info">
                <span class="summary-label">Ventas Prom. por Día</span>
                <span class="summary-value">{{ r.formatoMoneda(r.ventasPromedioDia.value) }}</span>
              </div>
            </div>
            <div class="summary-card">
              <span class="summary-icon">🎯</span>
              <div class="summary-info">
                <span class="summary-label">Venta Promedio ($)</span>
                <span class="summary-value">{{ r.formatoMoneda(r.ticketPromedio.value) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card-section s-ganancias">
          <h3 class="section-title"><span class="section-icon">💵</span> Ganancias</h3>
          <div class="section-cards">
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
                <span class="summary-label">Ganancia Bruta</span>
                <span class="summary-value">{{ r.formatoMoneda(r.gananciaBruta.value) }}</span>
              </div>
            </div>
            <div class="summary-card">
              <span class="summary-icon">👥</span>
              <div class="summary-info">
                <span class="summary-label">Sueldos Pagados</span>
                <span class="summary-value">{{ r.formatoMoneda(r.totalSueldosPagados.value) }}</span>
              </div>
            </div>
            <div class="summary-card">
              <span class="summary-icon">🏠</span>
              <div class="summary-info">
                <span class="summary-label">Renta del Local</span>
                <span class="summary-value">{{ r.formatoMoneda(r.rentaPeriodo.value) }}</span>
              </div>
            </div>
            <div class="summary-card highlight ganancia">
              <span class="summary-icon">📊</span>
              <div class="summary-info">
                <span class="summary-label">Ganancia Neta</span>
                <span class="summary-value">{{ r.formatoMoneda(r.gananciaNeta.value) }}</span>
              </div>
            </div>
            <div class="summary-card highlight ganancia">
              <span class="summary-icon">📅</span>
              <div class="summary-info">
                <span class="summary-label">Ganancia Bruta Prom. por Día</span>
                <span class="summary-value">{{ r.formatoMoneda(r.gananciaBrutaPromedioDia.value) }}</span>
              </div>
            </div>
            <div class="summary-card highlight ganancia">
              <span class="summary-icon">📈</span>
              <div class="summary-info">
                <span class="summary-label">Ganancia Neta Prom. por Día</span>
                <span class="summary-value">{{ r.formatoMoneda(r.gananciaNetaPromedioDia.value) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card-section s-pagos">
          <h3 class="section-title"><span class="section-icon">💳</span> Métodos de Pago</h3>
          <div class="section-cards">
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
          </div>
        </div>

        <div class="card-section s-flujo">
          <h3 class="section-title"><span class="section-icon">💹</span> Flujo de Caja</h3>
          <div class="section-cards">
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
            <div class="summary-card" style="cursor:pointer" @click="r.abrirMovimientos('salidas', 'proveedores')">
              <span class="summary-icon">🚚</span>
              <div class="summary-info">
                <span class="summary-label">Salidas Proveedores</span>
                <span class="summary-value">{{ r.formatoMoneda(r.totalSalidasProveedores.value) }}</span>
              </div>
            </div>
            <div class="summary-card" style="cursor:pointer" @click="r.abrirMovimientos('salidas', 'otras')">
              <span class="summary-icon">📤</span>
              <div class="summary-info">
                <span class="summary-label">Otras Salidas</span>
                <span class="summary-value">{{ r.formatoMoneda(r.totalSalidasOtras.value) }}</span>
              </div>
            </div>
            <div class="summary-card highlight" :class="{ 'ganancia': r.flujoNeto.value >= 0 }">
              <span class="summary-icon">💹</span>
              <div class="summary-info">
                <span class="summary-label">Flujo Neto</span>
                <span class="summary-value">{{ r.formatoMoneda(r.flujoNeto.value) }}</span>
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
              <span class="summary-icon">📈</span>
              <div class="summary-info">
                <span class="summary-label">{{ r.etiquetaPromedio.value }}</span>
                <span class="summary-value">{{ r.valorPromedio.value }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div class="charts-sections">

        <div class="chart-section s-tendencia">
          <h3 class="section-title"><span class="section-icon">📈</span> Tendencia</h3>
          <div class="section-charts">
            <div class="chart-card chart-wide chart-tall">
              <h3 class="chart-title">📈 Tendencia de Ventas</h3>
              <div class="chart-container">
                <Line :data="r.chartTendencia.value" :options="r.chartOptionsTendencia.value" />
              </div>
            </div>
            <div class="chart-card chart-wide chart-tall">
              <h3 class="chart-title">💹 Movimiento de Dinero en Caja</h3>
              <div class="chart-container">
                <Line :data="r.chartFlujoDinero.value" :options="r.chartOptionsFlujo.value" />
              </div>
            </div>
          </div>
        </div>

        <div class="chart-section s-top">
          <h3 class="section-title"><span class="section-icon">🏆</span> Top Productos</h3>
          <div class="section-charts charts-2col">
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
              <h3 class="chart-title">💵 Top Productos por Ganancia</h3>
              <div class="chart-container">
                <Bar :data="r.chartTopGanancia.value" :options="r.chartOptionsBar" />
              </div>
            </div>
          </div>
        </div>

        <div class="chart-section s-pagos">
          <h3 class="section-title"><span class="section-icon">💳</span> Métodos de Pago</h3>
          <div class="section-charts charts-2col">
            <div class="chart-card">
              <h3 class="chart-title">💳 Ventas por Método de Pago</h3>
              <div class="chart-container chart-pie">
                <Pie :data="r.chartMetodos.value" :options="r.chartPieOptions.value" />
              </div>
            </div>
          </div>
        </div>

        <div class="chart-section s-categorias">
          <h3 class="section-title"><span class="section-icon">🏷️</span> Categorías</h3>
          <div class="section-charts">
            <div class="chart-card chart-wide">
              <h3 class="chart-title">🏷️ Ventas por Categoría (Monto)</h3>
              <div class="chart-container">
                <Bar v-if="!r.esMovil.value" :data="r.chartVentasCategoria.value" :options="r.chartOptionsCategoria" />
                <Bar v-else :data="r.chartVentasCategoriaMovil.value" :options="r.chartOptionsCategoriaMovil.value" />
              </div>
            </div>
            <div class="chart-card chart-wide">
              <h3 class="chart-title">🏷️ Ganancia por Categoría</h3>
              <div class="chart-container">
                <Bar v-if="!r.esMovil.value" :data="r.chartGananciaCategoria.value" :options="r.chartOptionsCategoria" />
                <Bar v-else :data="r.chartGananciaCategoriaMovil.value" :options="r.chartOptionsCategoriaMovil.value" />
              </div>
            </div>
            <div class="chart-card chart-wide">
              <h3 class="chart-title">📊 Ventas vs Costo vs Ganancia por Categoría</h3>
              <div v-if="!r.esMovil.value" class="tabla-container">
                <table class="tabla-productos">
                  <thead>
                    <tr>
                      <th>Categoría / Subcategoría</th>
                      <th class="text-right">Ventas</th>
                      <th class="text-right">Costo</th>
                      <th class="text-right">Ganancia</th>
                      <th class="text-right">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="cat in r.categoriasJerarquicas.value.slice(0, 10)" :key="cat.categoria">
                      <tr class="cat-total-row" @click="toggleCategoria(cat.categoria)">
                        <td>
                          <span class="expand-icon">{{ categoriasExpandidas[cat.categoria] ? '▼' : '▶' }}</span>
                          <strong>{{ cat.categoria }}</strong>
                          <span class="modal-icon" @click.stop="r.categoriaSeleccionada.value = cat.categoria; r.subCategoriaSeleccionada.value = ''; r.modalCategoriaOpen.value = true" title="Ver productos">🔍</span>
                        </td>
                        <td class="text-right monto"><strong>{{ r.formatoMoneda(cat.totalMonto) }}</strong></td>
                        <td class="text-right costo"><strong>{{ r.formatoMoneda(cat.totalCosto) }}</strong></td>
                        <td class="text-right ganancia"><strong>{{ r.formatoMoneda(cat.totalGanancia) }}</strong></td>
                        <td class="text-right" :style="{ color: cat.totalMonto > 0 ? (cat.totalGanancia / cat.totalMonto * 100 >= 30 ? '#28a745' : '#c99234') : '#888', fontWeight: 'bold' }">
                          {{ cat.totalMonto > 0 ? (cat.totalGanancia / cat.totalMonto * 100).toFixed(1) + '%' : '—' }}
                        </td>
                      </tr>
                      <tr v-for="sub in cat.subcategorias" :key="sub.nombre" class="sub-row" v-show="categoriasExpandidas[cat.categoria]">
                        <td>
                          <span class="sub-indent">└─ </span>
                          <span class="sub-name">{{ sub.nombre }}</span>
                          <span class="modal-icon" @click.stop="r.categoriaSeleccionada.value = cat.categoria; r.subCategoriaSeleccionada.value = sub.nombre; r.modalCategoriaOpen.value = true" title="Ver productos">🔍</span>
                        </td>
                        <td class="text-right monto">{{ r.formatoMoneda(sub.monto) }}</td>
                        <td class="text-right costo">{{ r.formatoMoneda(sub.costo) }}</td>
                        <td class="text-right ganancia">{{ r.formatoMoneda(sub.ganancia) }}</td>
                        <td class="text-right" :style="{ color: sub.monto > 0 ? (sub.ganancia / sub.monto * 100 >= 30 ? '#28a745' : '#c99234') : '#888' }">
                          {{ sub.monto > 0 ? (sub.ganancia / sub.monto * 100).toFixed(1) + '%' : '—' }}
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
              <div v-else class="chart-container" style="height: 360px;">
                <Bar :data="r.chartCategoriaComparativa.value" :options="r.chartOptionsCategoriaComparativa" />
              </div>
            </div>
          </div>
        </div>

        <div class="chart-section s-detalle">
          <h3 class="section-title"><span class="section-icon">📦</span> Detalle por Tipo</h3>
          <div class="section-charts charts-2col">
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
                    <tr v-for="p in r.productosUnitarios.value.slice(0, limiteUnitarios)" :key="p.nombre">
                      <td>{{ p.nombre }}</td>
                      <td class="text-right">{{ r.formatoCantidad(p.cantidadTotal, p.isGramaje) }}</td>
                      <td class="text-right monto">{{ r.formatoMoneda(p.montoTotal) }}</td>
                      <td class="text-right costo">{{ r.formatoMoneda(p.costoTotal) }}</td>
                      <td class="text-right ganancia">{{ r.formatoMoneda(p.gananciaTotal) }}</td>
                    </tr>
                  </tbody>
                </table>
                <button v-if="r.productosUnitarios.value.length > 10" class="table-more-btn" @click="toggleLimite('unitarios')">
                  {{ limiteUnitarios === 10 ? `Ver más (${r.productosUnitarios.value.length - 10} restantes)` : 'Ver menos' }}
                </button>
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
                    <tr v-for="p in r.productosGramaje.value.slice(0, limiteGramaje)" :key="p.nombre">
                      <td>{{ p.nombre }}</td>
                      <td class="text-right">{{ r.formatoCantidad(p.cantidadTotal, p.isGramaje) }}</td>
                      <td class="text-right monto">{{ r.formatoMoneda(p.montoTotal) }}</td>
                      <td class="text-right costo">{{ r.formatoMoneda(p.costoTotal) }}</td>
                      <td class="text-right ganancia">{{ r.formatoMoneda(p.gananciaTotal) }}</td>
                    </tr>
                  </tbody>
                </table>
                <button v-if="r.productosGramaje.value.length > 10" class="table-more-btn" @click="toggleLimite('gramaje')">
                  {{ limiteGramaje === 10 ? `Ver más (${r.productosGramaje.value.length - 10} restantes)` : 'Ver menos' }}
                </button>
              </div>
            </div>
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
          <div v-if="r.movimientosEsSalidas.value" class="mov-tabs">
            <button :class="['mov-tab', { active: r.movimientosFiltro.value === 'todas' }]" @click="r.movimientosFiltro.value = 'todas'">
              Todas ({{ r.salidasCaja.value.length }})
            </button>
            <button :class="['mov-tab', { active: r.movimientosFiltro.value === 'proveedores' }]" @click="r.movimientosFiltro.value = 'proveedores'">
              🚚 Proveedores ({{ r.salidasProveedores.value.length }})
            </button>
            <button :class="['mov-tab', { active: r.movimientosFiltro.value === 'otras' }]" @click="r.movimientosFiltro.value = 'otras'">
              Otras ({{ r.salidasOtras.value.length }})
            </button>
          </div>
          <div v-if="r.movimientosVisibles.value.length === 0" class="modal-empty">
            No hay {{ r.movimientosTitulo.value.toLowerCase() }} en este período.
          </div>
          <table v-else class="tabla-movimientos">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Descripción</th>
                <th class="text-right">Monto</th>
                <th class="text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in r.movimientosVisibles.value" :key="m.idCaja">
                <td class="fecha-col">{{ r.formatearFechaHora(m.fechaMovimiento) }}</td>
                <td class="user-col">{{ r.nombreDeUsuario(m) }}</td>
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
                <td colspan="3"><strong>Total</strong></td>
                <td class="text-right"><strong>{{ r.formatoMoneda(r.movimientosVisibles.value.reduce((s, m) => s + Number(m.monto || 0), 0)) }}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reporte-ventas{padding:.6rem;display:flex;flex-direction:column;gap:.7rem;height:100%;overflow:auto}.reporte-ventas :deep(*){font-family:var(--font-body)}
.reporte-ventas :deep(.reporte-header){display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}.reporte-ventas :deep(.reporte-title){display:flex;align-items:center;gap:.4rem;margin:0;font-size:1.1rem;color:var(--color-accent);font-weight:800}.reporte-ventas :deep(.title-icon){font-size:1.2rem}
.reporte-ventas :deep(.reporte-controls){display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
.reporte-ventas :deep(.periodo-selector){display:flex;background:var(--color-bg-panel);border:none;border-radius:8px;overflow:hidden;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08)}.reporte-ventas :deep(.periodo-btn){padding:.4rem .7rem;border:none;background:transparent;color:var(--color-text-secondary);font-size:.7rem;font-weight:600;cursor:pointer;transition:all .15s}.reporte-ventas :deep(.periodo-btn.active){background:var(--color-accent);color:var(--color-on-brand)}.reporte-ventas :deep(.periodo-btn:hover:not(.active)){color:var(--color-text-primary)}
.reporte-ventas :deep(.fecha-selector){display:flex;gap:.4rem;align-items:center}.reporte-ventas :deep(.fecha-selector input){padding:.4rem .6rem;background:var(--color-bg-primary);border:none;border-radius:7px;color:var(--color-text-primary);font-size:.78rem;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08)}.reporte-ventas :deep(.fecha-selector input:focus){outline:none;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08),0 0 0 2px var(--color-accent)}.reporte-ventas :deep(.btn-cargar){padding:.4rem .8rem;border:none;border-radius:7px;background:var(--color-accent);color:var(--color-on-brand);font-size:.72rem;font-weight:700;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,.12);transition:all .15s}.reporte-ventas :deep(.btn-cargar:hover:not(:disabled)){transform:translateY(-1px);box-shadow:5px 5px 10px rgba(0,0,0,.18)}.reporte-ventas :deep(.btn-cargar:disabled){opacity:.5;cursor:not-allowed}
.reporte-ventas :deep(.rango-actual){display:flex;align-items:center;gap:.5rem;padding:.35rem .7rem;background:var(--color-bg-panel);border:none;border-radius:8px;font-size:.72rem;box-shadow:2px 2px 4px rgba(0,0,0,.06)}.reporte-ventas :deep(.rango-label){color:var(--color-text-secondary);font-weight:600}.reporte-ventas :deep(.rango-fechas){color:var(--color-accent);font-weight:700;font-family:'Courier New',monospace}.reporte-ventas :deep(.rango-detalle){color:var(--color-text-secondary);opacity:.7}
.reporte-ventas :deep(.loading-state){display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;padding:3rem;color:var(--color-text-secondary)}.reporte-ventas :deep(.loading-spinner){width:40px;height:40px;border:3px solid var(--color-border);border-top-color:var(--color-accent);border-radius:50%;animation:repSpin .8s linear infinite}@keyframes repSpin{to{transform:rotate(360deg)}}
.reporte-ventas :deep(.cards-sections){display:flex;flex-direction:column;gap:.75rem}.reporte-ventas :deep(.card-section){background:var(--color-bg-secondary);border:none;border-radius:12px;padding:.7rem .85rem;box-shadow:3px 3px 8px rgba(0,0,0,.08)}.reporte-ventas :deep(.card-section.s-ventas){border-left:4px solid var(--color-success)}.reporte-ventas :deep(.card-section.s-ganancias){border-left:4px solid #9b59b6}.reporte-ventas :deep(.card-section.s-pagos){border-left:4px solid #3498db}.reporte-ventas :deep(.card-section.s-flujo){border-left:4px solid #e67e22}.reporte-ventas :deep(.section-title){margin:0 0 .45rem;font-size:.82rem;color:var(--color-text-primary);font-weight:800;display:flex;align-items:center;gap:.35rem}.reporte-ventas :deep(.section-icon){font-size:1rem}.reporte-ventas :deep(.section-cards){display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.4rem}.reporte-ventas :deep(.summary-card){display:flex;align-items:center;gap:.6rem;padding:.7rem .85rem;background:var(--color-bg-primary);border:none;border-radius:10px;box-shadow:3px 3px 6px rgba(0,0,0,.08),-1px -1px 3px rgba(255,255,255,.02)}.reporte-ventas :deep(.summary-card.highlight){box-shadow:3px 3px 6px rgba(0,0,0,.08),0 0 8px color-mix(in srgb,var(--color-accent) 15%,transparent)}.reporte-ventas :deep(.summary-card.ganancia){box-shadow:3px 3px 6px rgba(0,0,0,.08),0 0 8px color-mix(in srgb,var(--color-success) 15%,transparent)}.reporte-ventas :deep(.summary-icon){font-size:1.5rem}.reporte-ventas :deep(.summary-info){display:flex;flex-direction:column;gap:.05rem}.reporte-ventas :deep(.summary-label){font-size:.6rem;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.03em}.reporte-ventas :deep(.summary-value){font-size:1rem;font-weight:800;color:var(--color-text-primary)}
.reporte-ventas :deep(.card-section.s-renta){border-left:4px solid #e67e22}.reporte-ventas :deep(.renta-admin-controls){display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}.reporte-ventas :deep(.renta-admin-label){font-size:.68rem;color:var(--color-text-secondary);font-weight:700}.reporte-ventas :deep(.renta-admin-input){width:140px;padding:.4rem .6rem;background:var(--color-bg-primary);border:none;border-radius:7px;color:var(--color-text-primary);font-size:.78rem;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08)}.reporte-ventas :deep(.renta-admin-input:focus){outline:none;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08),0 0 0 2px var(--color-accent)}
.reporte-ventas :deep(.charts-sections){display:flex;flex-direction:column;gap:.75rem}.reporte-ventas :deep(.chart-section){background:var(--color-bg-secondary);border:none;border-radius:12px;padding:.7rem .85rem;box-shadow:3px 3px 8px rgba(0,0,0,.08)}.reporte-ventas :deep(.chart-section.s-tendencia){border-left:4px solid #1abc9c}.reporte-ventas :deep(.chart-section.s-top){border-left:4px solid #f39c12}.reporte-ventas :deep(.chart-section.s-pagos){border-left:4px solid #3498db}.reporte-ventas :deep(.chart-section.s-categorias){border-left:4px solid #9b59b6}.reporte-ventas :deep(.chart-section.s-detalle){border-left:4px solid var(--color-success)}.reporte-ventas :deep(.section-charts){display:grid;grid-template-columns:1fr;gap:.5rem}.reporte-ventas :deep(.section-charts.charts-2col){grid-template-columns:repeat(2,1fr)}.reporte-ventas :deep(.chart-wide){grid-column:1 / -1}.reporte-ventas :deep(.chart-card){background:var(--color-bg-primary);border:none;border-radius:12px;padding:.75rem .85rem;box-shadow:3px 3px 8px rgba(0,0,0,.08)}.reporte-ventas :deep(.chart-title){margin:0 0 .4rem;font-size:.78rem;color:var(--color-accent);font-weight:700}.reporte-ventas :deep(.chart-container){position:relative;height:280px}.reporte-ventas :deep(.chart-container canvas){width:100%!important}.reporte-ventas :deep(.chart-container.chart-pie){height:240px}.reporte-ventas :deep(.chart-tall .chart-container){height:340px}
.reporte-ventas :deep(.tabla-container){overflow-x:auto;max-height:400px;overflow-y:auto}.reporte-ventas :deep(.tabla-container::-webkit-scrollbar){width:5px}.reporte-ventas :deep(.tabla-container::-webkit-scrollbar-thumb){background:var(--color-border);border-radius:3px}.reporte-ventas :deep(.tabla-productos){width:100%;border-collapse:collapse;font-size:.72rem}.reporte-ventas :deep(.tabla-productos th){padding:.4rem .6rem;text-align:left;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;font-size:.6rem;border-bottom:1px solid var(--color-border);position:sticky;top:0;background:var(--color-bg-secondary)}.reporte-ventas :deep(.tabla-productos td){padding:.35rem .6rem;border-bottom:1px solid rgba(255,255,255,.02);color:var(--color-text-primary)}.reporte-ventas :deep(.tabla-productos tr:hover td){background:color-mix(in srgb,var(--color-accent) 4%,transparent)}.reporte-ventas :deep(.text-right){text-align:right}.reporte-ventas :deep(.monto){color:var(--color-success);font-weight:700}.reporte-ventas :deep(.costo){color:var(--color-accent)}.reporte-ventas :deep(.ganancia){color:var(--color-success);font-weight:700}.reporte-ventas :deep(.table-more-btn){display:block;margin:.5rem auto 0;padding:.35rem .8rem;background:var(--color-bg-primary);border:none;border-radius:8px;color:var(--color-accent);font-size:.7rem;font-weight:700;cursor:pointer;box-shadow:2px 2px 5px rgba(0,0,0,.08)}.reporte-ventas :deep(.table-more-btn:hover){box-shadow:2px 2px 5px rgba(0,0,0,.08),0 0 6px color-mix(in srgb,var(--color-accent) 25%,transparent)}
.reporte-ventas :deep(.modal-overlay-cat){position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem}.reporte-ventas :deep(.modal-card-cat){background:var(--color-bg-secondary);border:none;border-radius:14px;width:min(100%,700px);max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:12px 12px 30px rgba(0,0,0,.4),-6px -6px 20px rgba(255,255,255,.03)}.reporte-ventas :deep(.modal-movimientos){max-width:600px}.reporte-ventas :deep(.mov-tabs){display:flex;gap:.3rem;margin-bottom:.6rem;flex-wrap:wrap}.reporte-ventas :deep(.mov-tab){padding:.3rem .7rem;border:none;border-radius:7px;background:var(--color-bg-primary);color:var(--color-text-secondary);font-size:.65rem;font-weight:700;cursor:pointer;box-shadow:2px 2px 4px rgba(0,0,0,.08);transition:all .15s}.reporte-ventas :deep(.mov-tab:hover){color:var(--color-text-primary)}.reporte-ventas :deep(.mov-tab.active){background:var(--color-accent);color:var(--color-on-brand)}.reporte-ventas :deep(.modal-header-cat){display:flex;align-items:center;justify-content:space-between;padding:.8rem 1.1rem;border-bottom:1px solid color-mix(in srgb,var(--color-accent) 20%,transparent)}.reporte-ventas :deep(.modal-header-cat h3){margin:0;font-size:.9rem;color:var(--color-accent);font-weight:700}.reporte-ventas :deep(.modal-close-cat){background:var(--color-bg-primary);border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--color-text-secondary);font-size:.9rem;box-shadow:2px 2px 4px rgba(0,0,0,.1);transition:all .15s}.reporte-ventas :deep(.modal-close-cat:hover){background:var(--color-error);color:#fff}.reporte-ventas :deep(.modal-body-cat){padding:1rem;overflow-y:auto;flex:1}.reporte-ventas :deep(.modal-empty){padding:2rem;text-align:center;color:var(--color-text-secondary)}.reporte-ventas :deep(.chart-container-modal){height:250px;margin-bottom:.75rem}
.reporte-ventas :deep(.tabla-modal table){width:100%;border-collapse:collapse;font-size:.7rem}.reporte-ventas :deep(.tabla-modal th){padding:.35rem .5rem;text-align:left;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;font-size:.58rem;border-bottom:1px solid var(--color-border)}.reporte-ventas :deep(.tabla-modal td){padding:.3rem .5rem;border-bottom:1px solid rgba(255,255,255,.02)}
.reporte-ventas :deep(.tabla-movimientos){width:100%;border-collapse:collapse;font-size:.72rem}.reporte-ventas :deep(.tabla-movimientos th){padding:.4rem .6rem;text-align:left;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;font-size:.58rem;border-bottom:1px solid var(--color-border)}.reporte-ventas :deep(.tabla-movimientos td){padding:.35rem .6rem;border-bottom:1px solid rgba(255,255,255,.02)}.reporte-ventas :deep(.tabla-movimientos tfoot td){font-weight:700;border-top:1px solid var(--color-border)}.reporte-ventas :deep(.fecha-col){white-space:nowrap;font-family:monospace;font-size:.68rem;color:var(--color-text-secondary)}.reporte-ventas :deep(.user-col){white-space:nowrap;font-size:.7rem;color:var(--color-accent);font-weight:600}.reporte-ventas :deep(.desc-text){color:var(--color-text-primary)}.reporte-ventas :deep(.edit-desc-input){padding:.25rem .4rem;background:var(--color-bg-primary);border:none;border-radius:4px;color:var(--color-text-primary);font-size:.7rem;width:100%;box-shadow:inset 2px 2px 3px rgba(0,0,0,.1)}.reporte-ventas :deep(.edit-actions){display:inline-flex;gap:.2rem;margin-left:.3rem}.reporte-ventas :deep(.btn-edit-save){border:none;border-radius:3px;background:var(--color-success);color:#fff;font-size:.6rem;cursor:pointer;padding:.1rem .25rem}.reporte-ventas :deep(.btn-edit-cancel),.reporte-ventas :deep(.btn-edit-icon){border:none;background:var(--color-bg-primary);color:var(--color-text-secondary);cursor:pointer;border-radius:3px;padding:0 .25rem;font-size:.65rem;box-shadow:1px 1px 2px rgba(0,0,0,.05)}.reporte-ventas :deep(.btn-edit-cancel:hover),.reporte-ventas :deep(.btn-edit-icon:hover){color:var(--color-accent)}
.reporte-ventas :deep(.cat-total-row td){border-bottom:2px solid var(--color-border);background:color-mix(in srgb,var(--color-accent) 4%,transparent)}.reporte-ventas :deep(.cat-total-row){cursor:pointer}.reporte-ventas :deep(.cat-total-row:hover td){background:color-mix(in srgb,var(--color-accent) 10%,transparent)!important}.reporte-ventas :deep(.sub-row td){padding-left:1.5rem!important;font-size:.68rem}.reporte-ventas :deep(.sub-indent){color:var(--color-text-secondary);opacity:.5;margin-right:2px}.reporte-ventas :deep(.expand-icon){display:inline-block;width:12px;margin-right:4px;font-size:.6rem;color:var(--color-accent)}.reporte-ventas :deep(.modal-icon){margin-left:6px;font-size:.7rem;cursor:pointer;opacity:0;transition:opacity .15s}.reporte-ventas :deep(tr:hover .modal-icon){opacity:1}.reporte-ventas :deep(.sub-name){color:var(--color-text-primary)}

@media(max-width:1024px){.reporte-ventas :deep(.chart-tall .chart-container){height:300px}}
@media(max-width:768px){.reporte-ventas :deep(.section-cards){grid-template-columns:repeat(2,1fr)}.reporte-ventas :deep(.section-charts.charts-2col){grid-template-columns:1fr}.reporte-ventas :deep(.chart-tall .chart-container){height:280px}}
@media(max-width:480px){.reporte-ventas{padding:.4rem}.reporte-ventas :deep(.reporte-header){flex-direction:column;align-items:stretch}.reporte-ventas :deep(.reporte-controls){flex-direction:column}.reporte-ventas :deep(.section-cards){grid-template-columns:1fr 1fr;gap:.35rem}.reporte-ventas :deep(.card-section),.reporte-ventas :deep(.chart-section){padding:.5rem .6rem}.reporte-ventas :deep(.section-title){font-size:.75rem}.reporte-ventas :deep(.chart-container){height:240px}.reporte-ventas :deep(.chart-tall .chart-container){height:260px}.reporte-ventas :deep(.tabla-container){max-height:280px}}
</style>
