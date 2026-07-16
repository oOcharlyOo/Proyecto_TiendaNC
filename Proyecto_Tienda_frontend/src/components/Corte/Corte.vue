<script setup lang="ts">
import { Bar, Pie } from 'vue-chartjs';
import SalidaEfectivoModal from '../modals/SalidaEfectivoModal.vue';
import SueldoXHoraModal from '../modals/SueldoXHoraModal.vue';
import CalculadoraGramajeModal from '../modals/CalculadoraGramajeModal.vue';
import CorteHeader from './secciones/CorteHeader.vue';
import CorteStatsCards from './secciones/CorteStatsCards.vue';
import CorteActions from './secciones/CorteActions.vue';
import CorteReportPanel from './secciones/CorteReportPanel.vue';
import CorteDailyModal from './secciones/CorteDailyModal.vue';
import CorteMonthlyModal from './secciones/CorteMonthlyModal.vue';
import CorteAnnualModal from './secciones/CorteAnnualModal.vue';
import CorteHistorialModal from './secciones/CorteHistorialModal.vue';
import CorteEgresosModal from './secciones/CorteEgresosModal.vue';
import CorteEntradasModal from './secciones/CorteEntradasModal.vue';
import CorteApartadosModal from './secciones/CorteApartadosModal.vue';
import CorteBackupSection from './secciones/CorteBackupSection.vue';
import { useCorte } from './logica/useCorte';
import {
  idUsuario, nombreUsuario, tipoUsuario, esAdministrador,
  mensaje, mensajeTipo, mostrarMensaje,
  cargandoCorte, cargandoMensual, cargandoHistorial, cargandoCerrarTurno, cargandoAnual,
  mostrarReporte, mostrarCerrarTurno, cargandoBackup, backupLog,
  modalDiarioAbierto, modalMensualAbierto, modalHistorialAbierto, modalDetalleAbierto,
  modalEgresosAbierto, modalSalidaAbierto, modalEntradasAbierto,
  modalApartadosAbierto, modalAnualAbierto, modalSueldoHoraAbierto, modalGramajeAbierto,
  fechaDiaria, mesMensual, fechaRangoInicio, fechaRangoFin, anioReporte,
  corteActual, montoInicialCajaActiva,
  ventasEfectivo, ventasTarjeta, ventasTransferencia, abonoTotalDia,
  totalEnvase, totalTicketsDia, horaInicioCaja, horaFinCaja, reporteTitulo,
  horasTrabajadas, totalSueldoSemanal, dineroApartarDiario,
  usuariosConSueldo, usuariosQueTrabajaronElDia,
  tipoGraficaCorte, tipoGraficaDiaria, tipoGraficaMensual,
  apartadosActivos, apartadosCompletados, cargandoApartados, cargandoApartadosCompletados,
  totalApartarDiario, historialPagos, cargandoHistorialPagos,
  mostrarHistorialApartado, mostrarHistorialCompletados,
  mostrarModalPago, apartadoParaPago, montoPagoCustom, errorMontoPago,
  nuevoApartado,
  mensualTotalVentas, mensualTotalTransferencia, mensualTotalTarjeta,
  mensualTotalGanancias, mensualSemanas, rangoFechasSemanas,
  productosMasVendidos, productosUnitarios, productosGranel,
  productosDiario, productosUnitariosDiario, productosGranelDiario, detallesDiario,
  productosMensual, productosUnitariosMensual, productosGranelMensual, detallesMensual,
  historialDetalles, filtroMesHistorial, filtroDiaHistorial, filtroDiscrepanciaHistorial,
  ventaDetalleSeleccionada, ventaDetalleItems, ventaDetalleEditando, ventaDetalleMontoEditado,
  ventaDetalleItemEditando, ventaDetalleCantidadTemp, ventaDetallePrecioTemp,
  modalProductoGramaje, gramajeEditandoIndice, gramajeEditandoCantidad, gramajeEditandoPrecio,
  ventasHistorialSeleccionadas, corrigiendoHistorial, correccionHistorialMsg,
  ventaDetalleEnvases, ventaDetalleEnvaseTotal,
  egresosDia, entradasDia, cargandoEntradas, cargandoEgresos,
  reporteAnualData, mostrarBackupManager, mostrarImportModal,
  selectedFiles, dragOver,
  historialVentasAgrupadas, historialMeses, historialDias, historialFiltrado, historialTotalFiltrado,
  chartData, chartDataUnitarios, chartDataGranel, chartDataCombinado, chartOptionsCombinado,
  chartOptions, chartOptionsUnitarios, chartOptionsGranel,
  cortePieChartData, cortePieChartOptions,
  chartDataDiarioCombinado, chartDataDiarioUnitarios, chartDataDiarioGranel,
  chartOptionsDiarioCombinado, chartOptionsDiarioUnitarios, chartOptionsDiarioGranel,
  chartOptionsDiarioDoughnut, diarioPieChartData, diarioPieChartOptions,
  uniqueHorariosDiario, buildDiarioTimelineChart, getDiarioTimelineOptions,
  chartDataMensualCombinado, chartDataMensualUnitarios, chartDataMensualGranel,
  chartOptionsMensualCombinado, chartOptionsMensualUnitarios, chartOptionsMensualGranel,
  uniqueHorariosMensual, buildMensualTimelineChart, getMensualTimelineOptions,
  weeklyChartData, weeklyChartOptions,
  annualMonthlyChartData, annualMonthlyChartOptions,
  uniqueHorarios, buildHorarioTimelineChart, getHorarioTimelineOptions,
  formatoMoneda, formatoMonedaRedondeada, getMetodoClase, getMetodoIcono, formatoFecha, formatearCantidad,
  generarCorte, generarReporteDiario, recalcularGananciaNeta,
  getRankIcon, getRankClass,
  generarReporteMensual, generarReporteRangoFechas,
  generarReporteAnual, cerrarTurno,
  abrirHistorialVentas, abrirDetalleVenta,
  iniciarEdicionVentaDetalle, iniciarEdicionSoloTotal, guardarEdicionVentaDetalle,
  cancelarEdicionVentaDetalle, iniciarEditarItemDetalle, confirmarEdicionGramaje,
  recalcularTotalDetalle, confirmarEditarItemDetalle, cancelarEditarItemDetalle,
  eliminarItemDetalle, corregirVentasHistorial,
  toggleSeleccionHistorial, seleccionarTodasHistorial,
  abrirModalEgresos, abrirModalEntradas, registrarSalida,
  abrirModalApartados, crearApartado, pagarApartado,
  abrirModalPago, cerrarModalPago, validarMontoPago, confirmarPagoCustom,
  toggleHistorialPagos, cancelarApartado, toggleHistorialCompletados,
  descargarBackups, handleFileSelect, handleFileDrop, importarBackup
} from './logica/useCorte';

useCorte();

const nombreApartadoActivo = apartadosActivos.value.length > 0 ? apartadosActivos.value[0]?.nombreProducto || '' : '';
</script>

<template>
  <div class="corte-view">
    <CorteHeader
      :mensaje="mensaje"
      :mensajeTipo="mensajeTipo"
      @cerrar-mensaje="mostrarMensaje('', 'info')"
    />

    <CorteStatsCards
      :ventasEfectivo="ventasEfectivo"
      :ventasTransferencia="ventasTransferencia"
      :ventasTarjeta="ventasTarjeta"
      :totalEnvase="totalEnvase"
      :abonoTotalDia="abonoTotalDia"
      :totalTicketsDia="totalTicketsDia"
      :montoInicialCajaActiva="montoInicialCajaActiva"
      :formatoMoneda="formatoMoneda"
      @abrir-modal-entradas="abrirModalEntradas"
      @abrir-modal-egresos="abrirModalEgresos"
      @abrir-modal-apartados="abrirModalApartados"
    />

    <CorteActions
      :esAdministrador="esAdministrador"
      :cargandoCorte="cargandoCorte"
      @generar-corte="generarCorte"
      @abrir-modal-diario="modalDiarioAbierto = true"
      @abrir-modal-mensual="modalMensualAbierto = true"
      @abrir-historial="abrirHistorialVentas"
      @abrir-modal-apartados="abrirModalApartados"
      @abrir-modal-anual="modalAnualAbierto = true"
    />

    <CorteReportPanel
      :mostrarReporte="mostrarReporte"
      :corteActual="corteActual"
      :reporteTitulo="reporteTitulo"
      :mostrarCerrarTurno="mostrarCerrarTurno"
      :cargandoCerrarTurno="cargandoCerrarTurno"
      :ventasEfectivo="ventasEfectivo"
      :ventasTransferencia="ventasTransferencia"
      :ventasTarjeta="ventasTarjeta"
      :totalEnvase="totalEnvase"
      :abonoTotalDia="abonoTotalDia"
      :totalTicketsDia="totalTicketsDia"
      :montoInicialCajaActiva="montoInicialCajaActiva"
      :nombreApartadoActivo="nombreApartadoActivo"
      :totalApartarDiario="totalApartarDiario"
      :dineroApartarDiario="dineroApartarDiario"
      :tipoGraficaCorte="tipoGraficaCorte"
      :productosMasVendidos="productosMasVendidos"
      :productosUnitarios="productosUnitarios"
      :productosGranel="productosGranel"
      :chartData="chartData"
      :chartDataUnitarios="chartDataUnitarios"
      :chartDataGranel="chartDataGranel"
      :chartDataCombinado="chartDataCombinado"
      :chartOptions="chartOptions"
      :chartOptionsUnitarios="chartOptionsUnitarios"
      :chartOptionsGranel="chartOptionsGranel"
      :chartOptionsCombinado="chartOptionsCombinado"
      :cortePieChartData="cortePieChartData"
      :cortePieChartOptions="cortePieChartOptions"
      :uniqueHorariosDiario="uniqueHorariosDiario"
      :detallesDiario="detallesDiario"
      :formatoMoneda="formatoMoneda"
      :formatearCantidad="formatearCantidad"
      :getRankIcon="getRankIcon"
      :getRankClass="getRankClass"
      :buildDiarioTimelineChart="buildDiarioTimelineChart"
      :getDiarioTimelineOptions="getDiarioTimelineOptions"
      :getDailyProductosPorHorario="(h: string, g: boolean) => []"
      @cerrar-turno="cerrarTurno"
      @abrir-egresos="abrirModalEgresos"
      @abrir-entradas="abrirModalEntradas"
      @abrir-apartados="abrirModalApartados"
      @cambiar-tipo-grafica="(t) => { tipoGraficaCorte = t as 'unitario' | 'gramaje' | 'combinado' }"
    />

    <CorteDailyModal
      :abierto="modalDiarioAbierto"
      :fechaDiaria="fechaDiaria"
      :cargando="cargandoMensual"
      @cerrar="modalDiarioAbierto = false; if (!modalDiarioAbierto) {}"
      @generar-reporte="generarReporteDiario"
      @cambiar-fecha="(f) => { fechaDiaria = f }"
    />

    <CorteMonthlyModal
      :abierto="modalMensualAbierto"
      :mesMensual="mesMensual"
      :fechaRangoInicio="fechaRangoInicio"
      :fechaRangoFin="fechaRangoFin"
      :cargando="cargandoMensual"
      :tipoGraficaMensual="tipoGraficaMensual"
      :mensualTotalVentas="mensualTotalVentas"
      :mensualTotalGanancias="mensualTotalGanancias"
      :mensualTotalTransferencia="mensualTotalTransferencia"
      :mensualTotalTarjeta="mensualTotalTarjeta"
      :mensualSemanas="mensualSemanas"
      :rangoFechasSemanas="rangoFechasSemanas"
      :productosUnitariosMensual="productosUnitariosMensual"
      :productosGranelMensual="productosGranelMensual"
      :chartDataMensualCombinado="chartDataMensualCombinado"
      :chartDataMensualUnitarios="chartDataMensualUnitarios"
      :chartDataMensualGranel="chartDataMensualGranel"
      :chartOptionsMensualCombinado="chartOptionsMensualCombinado"
      :chartOptionsMensualUnitarios="chartOptionsMensualUnitarios"
      :chartOptionsMensualGranel="chartOptionsMensualGranel"
      :weeklyChartData="weeklyChartData"
      :weeklyChartOptions="weeklyChartOptions"
      :uniqueHorariosMensual="uniqueHorariosMensual"
      :formatoMoneda="formatoMoneda"
      :buildMensualTimelineChart="buildMensualTimelineChart"
      :getMensualTimelineOptions="getMensualTimelineOptions"
      @cerrar="modalMensualAbierto = false"
      @cambiar-mes="(m) => { mesMensual = m }"
      @generar-mensual="generarReporteMensual"
      @cambiar-rango-inicio="(f) => { fechaRangoInicio = f }"
      @cambiar-rango-fin="(f) => { fechaRangoFin = f }"
      @generar-rango="generarReporteRangoFechas"
      @cambiar-tipo-grafica="(t) => { tipoGraficaMensual = t }"
    />

    <CorteAnnualModal
      :abierto="modalAnualAbierto"
      :anioReporte="anioReporte"
      :cargando="cargandoAnual"
      :reporteAnualData="reporteAnualData"
      :annualMonthlyChartData="annualMonthlyChartData"
      :annualMonthlyChartOptions="annualMonthlyChartOptions"
      :uniqueHorarios="uniqueHorarios"
      :formatoMoneda="formatoMoneda"
      :formatearCantidad="formatearCantidad"
      :getRankIcon="getRankIcon"
      :getRankClass="getRankClass"
      :buildHorarioTimelineChart="buildHorarioTimelineChart"
      :getHorarioTimelineOptions="getHorarioTimelineOptions"
      :getProductosPorHorario="(h: string, g: boolean) => []"
      @cerrar="modalAnualAbierto = false"
      @cambiar-anio="(a) => { anioReporte = a }"
      @generar="generarReporteAnual"
    />

    <CorteHistorialModal
      :abierto="modalHistorialAbierto"
      :cargando="cargandoHistorial"
      :historialFiltrado="historialFiltrado"
      :historialTotalFiltrado="historialTotalFiltrado"
      :historialMeses="historialMeses"
      :historialDias="historialDias"
      :filtroMesHistorial="filtroMesHistorial"
      :filtroDiaHistorial="filtroDiaHistorial"
      :filtroDiscrepanciaHistorial="filtroDiscrepanciaHistorial"
      :ventasHistorialSeleccionadas="ventasHistorialSeleccionadas"
      :corrigiendoHistorial="corrigiendoHistorial"
      :correccionHistorialMsg="correccionHistorialMsg"
      :modalDetalleAbierto="modalDetalleAbierto"
      :ventaDetalleSeleccionada="ventaDetalleSeleccionada"
      :ventaDetalleItems="ventaDetalleItems"
      :ventaDetalleEditando="ventaDetalleEditando"
      :ventaDetalleMontoEditado="ventaDetalleMontoEditado"
      :ventaDetalleItemEditando="ventaDetalleItemEditando"
      :ventaDetalleCantidadTemp="ventaDetalleCantidadTemp"
      :ventaDetallePrecioTemp="ventaDetallePrecioTemp"
      :ventaDetalleEnvases="ventaDetalleEnvases"
      :ventaDetalleEnvaseTotal="ventaDetalleEnvaseTotal"
      :esAdministrador="esAdministrador"
      :usuarios-con-sueldo="usuariosConSueldo"
      :formatoMoneda="formatoMoneda"
      :formatearCantidad="formatearCantidad"
      :formatoFecha="formatoFecha"
      :getMetodoClase="getMetodoClase"
      :getMetodoIcono="getMetodoIcono"
      :getRankIcon="getRankIcon"
      :getRankClass="getRankClass"
      @cerrar="modalHistorialAbierto = false"
      @cambiar-filtro-mes="(v) => { filtroMesHistorial = v }"
      @cambiar-filtro-dia="(v) => { filtroDiaHistorial = v }"
      @toggle-filtro-discrepancia="filtroDiscrepanciaHistorial = !filtroDiscrepanciaHistorial"
      @abrir-detalle="abrirDetalleVenta"
      @toggle-seleccion="toggleSeleccionHistorial"
      @seleccionar-todas="seleccionarTodasHistorial"
      @corregir-seleccionadas="corregirVentasHistorial(Array.from(ventasHistorialSeleccionadas))"
      @iniciar-edicion="iniciarEdicionVentaDetalle"
      @iniciar-edicion-total="iniciarEdicionSoloTotal"
      @guardar-edicion="guardarEdicionVentaDetalle"
      @cancelar-edicion="cancelarEdicionVentaDetalle"
      @cerrar-detalle="modalDetalleAbierto = false"
      @iniciar-editar-item="iniciarEditarItemDetalle"
      @confirmar-editar-item="confirmarEditarItemDetalle"
      @cancelar-editar-item="cancelarEditarItemDetalle"
      @eliminar-item="eliminarItemDetalle"
      @cambiar-cantidad-temp="(v) => { ventaDetalleCantidadTemp = v }"
      @cambiar-precio-temp="(v) => { ventaDetallePrecioTemp = v }"
    />

    <CorteEgresosModal
      :abierto="modalEgresosAbierto"
      :cargando="cargandoEgresos"
      :egresosDia="egresosDia"
      :modalSalidaAbierto="modalSalidaAbierto"
      :formatoMoneda="formatoMoneda"
      :formatoFecha="formatoFecha"
      @cerrar="modalEgresosAbierto = false"
      @abrir-modal-salida="modalSalidaAbierto = true"
      @cerrar-modal-salida="modalSalidaAbierto = false"
      @registrar-salida="registrarSalida"
    />

    <CorteEntradasModal
      :abierto="modalEntradasAbierto"
      :cargando="cargandoEntradas"
      :entradasDia="entradasDia"
      :formatoMoneda="formatoMoneda"
      :formatoFecha="formatoFecha"
      @cerrar="modalEntradasAbierto = false"
    />

    <CorteApartadosModal
      :abierto="modalApartadosAbierto"
      :cargando="cargandoApartados"
      :apartadosActivos="apartadosActivos"
      :apartadosCompletados="apartadosCompletados"
      :cargandoApartadosCompletados="cargandoApartadosCompletados"
      :totalApartarDiario="totalApartarDiario"
      :mostrarHistorialApartado="mostrarHistorialApartado"
      :mostrarHistorialCompletados="mostrarHistorialCompletados"
      :historialPagos="historialPagos"
      :cargandoHistorialPagos="cargandoHistorialPagos"
      :mostrarModalPago="mostrarModalPago"
      :apartadoParaPago="apartadoParaPago"
      :montoPagoCustom="montoPagoCustom"
      :errorMontoPago="errorMontoPago"
      :nuevoApartado="nuevoApartado"
      :formatoMoneda="formatoMoneda"
      :formatoFecha="formatoFecha"
      @cerrar="modalApartadosAbierto = false"
      @crear-apartado="crearApartado"
      @input-nuevo-apartado="(k, v) => { (nuevoApartado as any)[k] = v }"
      @abrir-pago="abrirModalPago"
      @cerrar-pago="cerrarModalPago"
      @cambiar-monto-pago="(v) => { montoPagoCustom = v }"
      @confirmar-pago="confirmarPagoCustom"
      @toggle-historial-pagos="toggleHistorialPagos"
      @toggle-historial-completados="toggleHistorialCompletados"
      @cancelar-apartado="cancelarApartado"
    />

    <CorteBackupSection
      :mostrarBackupManager="mostrarBackupManager"
      :mostrarImportModal="mostrarImportModal"
      :cargandoBackup="cargandoBackup"
      :backupLog="backupLog"
      :dragOver="dragOver"
      :selectedFiles="selectedFiles"
      @toggle-backup="mostrarBackupManager = !mostrarBackupManager"
      @toggle-import="mostrarImportModal = !mostrarImportModal"
      @descargar-backups="descargarBackups"
      @file-select="handleFileSelect"
      @file-drop="handleFileDrop"
      @drag-over="(v) => { dragOver = v }"
      @importar-backup="importarBackup"
    />

    <SueldoXHoraModal :open="modalSueldoHoraAbierto" @close="modalSueldoHoraAbierto = false" />
    <CalculadoraGramajeModal
      :open="modalGramajeAbierto"
      :producto="modalProductoGramaje"
      :isEditing="true"
      :cantidadInicial="gramajeEditandoCantidad"
      :precioInicial="gramajeEditandoPrecio"
      @add="confirmarEdicionGramaje"
      @close="modalGramajeAbierto = false"
    />
  </div>
</template>


