<script setup lang="ts">
import type { Opcion } from './logica/useRental';
import './estilos/rental-layout.css';
import './estilos/rental-station-card.css';
import './estilos/rental-modals.css';
import './estilos/rental-responsive.css';
import { useRental } from './logica/useRental';
const { estaciones, ticker, productosDisponibles, mostrarModalSeleccionarProducto, mostrarModalEditarOpciones, estacionEditando, opcionEditando, mostrarModalAgregarProducto, opcionProductoSeleccionado, opcionProductoCantidad, buscarProductoModal, productosFiltradosModal, formatTime, formatoMoneda, getTiempoRestante, getStationBorderClass, getStatusBadgeClass, getTimerColorClass, getStationTotal, abrirModalSeleccionarProducto, crearEstacionDesdeProducto, abrirEditarOpciones, guardarOpciones, agregarOpcion, eliminarOpcion, abrirAgregarProducto, agregarProductoAOpcion, eliminarProductoDeOpcion, agregarTiempo, cobrar, cancelarTemporizador, eliminarEstacion } = useRental();
import RentalHeader from './secciones/RentalHeader.vue';
import RentalStationCard from './secciones/RentalStationCard.vue';
import RentalModalSelectProducto from './secciones/RentalModalSelectProducto.vue';
import RentalModalEditarOpciones from './secciones/RentalModalEditarOpciones.vue';
import RentalModalAgregarProducto from './secciones/RentalModalAgregarProducto.vue';

</script>

<template>
  <div class="rental-container">
    <RentalHeader />

    <main class="rental-main">
      <section class="crear-estacion-section">
        <button class="btn-grande-crear" @click="abrirModalSeleccionarProducto">
          <span class="btn-icono">➕</span>
          <span class="btn-texto">Crear Estación</span>
        </button>
      </section>

      <section v-if="estaciones.length > 0" class="estaciones-section">
        <h2 class="section-title">🎮 Estaciones Activas</h2>
        <div class="estaciones-grid">
          <RentalStationCard
            v-for="station in estaciones"
            :key="`${station.id}-${ticker}`"
            :station="station"
            :ticker="ticker"
            :format-time="formatTime"
            :formato-moneda="formatoMoneda"
            :get-tiempo-restante="getTiempoRestante"
            :get-station-border-class="getStationBorderClass"
            :get-status-badge-class="getStatusBadgeClass"
            :get-timer-color-class="getTimerColorClass"
            :get-station-total="getStationTotal"
            @agregar-tiempo="(s, m, p, n) => agregarTiempo(s, m, p, n)"
            @cobrar="(s) => cobrar(s)"
            @cancelar-temporizador="(s) => cancelarTemporizador(s)"
            @editar-opciones="(s) => abrirEditarOpciones(s)"
            @eliminar-estacion="(id) => eliminarEstacion(id)"
          />
        </div>
      </section>
    </main>

    <RentalModalSelectProducto
      :open="mostrarModalSeleccionarProducto"
      :productos-filtrados="productosFiltradosModal"
      :buscar-producto="buscarProductoModal"
      @close="mostrarModalSeleccionarProducto = false"
      @update:buscar-producto="buscarProductoModal = $event"
      @seleccionar="crearEstacionDesdeProducto"
    />

    <RentalModalEditarOpciones
      :open="mostrarModalEditarOpciones"
      :estacion="estacionEditando"
      :productos-disponibles="productosDisponibles"
      @close="mostrarModalEditarOpciones = false"
      @guardar="guardarOpciones"
      @agregar-opcion="agregarOpcion"
      @eliminar-opcion="(idx) => eliminarOpcion(idx)"
      @agregar-producto="(opt: Opcion) => abrirAgregarProducto(opt)"
      @eliminar-producto="(opt: Opcion, idx) => eliminarProductoDeOpcion(opt, idx)"
    />

    <RentalModalAgregarProducto
      :open="mostrarModalAgregarProducto"
      :productos-disponibles="productosDisponibles"
      :producto-seleccionado="opcionProductoSeleccionado"
      :cantidad="opcionProductoCantidad"
      :formato-moneda="formatoMoneda"
      @close="mostrarModalAgregarProducto = false"
      @update:producto-seleccionado="opcionProductoSeleccionado = $event"
      @update:cantidad="opcionProductoCantidad = $event"
      @agregar="agregarProductoAOpcion"
    />
  </div>
</template>


