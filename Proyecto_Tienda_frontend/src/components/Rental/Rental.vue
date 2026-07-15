<script setup lang="ts">
import type { Opcion } from './logica/useRental';
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

<style scoped>
/* rental-layout.css */
.rental-container {
  min-height: 100vh;
  color: var(--color-text-primary);
  background: linear-gradient(180deg, var(--gradient-bg-start, var(--color-bg-secondary)) 0%, var(--gradient-bg-mid, var(--color-bg-primary)) 100%);
}

.rental-container :deep(.rental-header) {
  text-align: center;
  padding: 40px 20px 30px;
  background: linear-gradient(180deg, var(--color-bg-secondary) 0%, transparent 100%);
  border-bottom: 3px solid var(--color-accent);
  position: relative;
}

.rental-container :deep(.rental-header::before),
.rental-container :deep(.rental-header::after) {
  content: '✦';
  position: absolute;
  top: 20px;
  font-size: 1.5rem;
  color: var(--color-accent);
}

.rental-container :deep(.rental-header::before) { left: 30px; }
.rental-container :deep(.rental-header::after) { right: 30px; }

.rental-container :deep(.header-content) {
  max-width: 600px;
  margin: 0 auto;
}

.rental-container :deep(.zelda-title) {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--color-accent);
  text-shadow: 2px 2px 0 var(--color-border);
  margin: 0 0 8px;
  letter-spacing: 0.1em;
}

.rental-container :deep(.zelda-subtitle) {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  margin: 0;
  font-style: italic;
}

.rental-container .rental-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 20px;
}

.rental-container .section-title {
  font-size: 1.5rem;
  color: var(--color-accent);
  text-align: center;
  margin-bottom: 8px;
}

.rental-container .crear-estacion-section {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
}

.rental-container .btn-grande-crear {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 80px;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-bg-secondary) 100%);
  color: var(--color-text-primary);
  border: 4px solid var(--color-accent);
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
  font-family: var(--font-body);
  transition: all 0.3s;
  box-shadow: 6px 6px 0 var(--color-border);
}

.rental-container .btn-grande-crear:hover {
  transform: translateY(-4px);
  box-shadow: 8px 10px 0 var(--color-border);
  filter: brightness(1.1);
}

.rental-container .btn-grande-crear:active {
  transform: translateY(0);
  box-shadow: 4px 4px 0 var(--color-border);
}

.rental-container .btn-icono {
  font-size: 3rem;
  margin-bottom: 10px;
}

.rental-container .btn-texto {
  font-size: 1.5rem;
  letter-spacing: 0.05em;
}

.rental-container .estaciones-section {
  margin-bottom: 40px;
}

.rental-container .estaciones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 30px;
}

/* rental-station-card.css */
.rental-container :deep(.station-card) {
  perspective: 1000px;
}

.rental-container :deep(.card-papiro) {
  background: var(--color-bg-panel);
  border: 2px solid var(--color-brand);
  border-radius: 8px;
  padding: 20px;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.rental-container :deep(.card-papiro::before) {
  display: none;
}

.rental-container :deep(.station-header) {
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px dashed var(--color-border);
  position: relative;
  z-index: 1;
}

.rental-container :deep(.station-title) {
  align-items: center;
  gap: 10px;
}

.rental-container :deep(.station-icon) {
  font-size: 1.8rem;
}

.rental-container :deep(.station-title h2) {
  font-size: 1.3rem;
  color: var(--color-text-primary);
  margin: 0;
  text-shadow: 1px 1px 0 var(--color-accent);
}

.rental-container :deep(.station-actions) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rental-container :deep(.status-badge) {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: bold;
  letter-spacing: 0.05em;
}

.rental-container :deep(.status-badge.status-activo) {
  background: linear-gradient(135deg, #2d5016 0%, #1a3009 100%);
  color: #90ee90;
  border: 2px solid var(--color-accent);
}

.rental-container :deep(.status-badge.status-terminado) {
  background: linear-gradient(135deg, var(--color-warning) 0%, var(--color-bg-secondary) 100%);
  color: #ffb0b0;
  border: 2px solid #a03030;
  animation: pulse 1s infinite;
}

.rental-container :deep(.status-badge.status-disponible) {
  background: linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 100%);
  color: #c0c0c0;
  border: 2px solid #606060;
}

.rental-container :deep(.btn-config),
.rental-container :deep(.btn-delete) {
  background: var(--color-bg-panel);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 1rem;
  transition: all var(--transition-normal);
}

.rental-container :deep(.btn-config:hover),
.rental-container :deep(.btn-delete:hover) {
  background: var(--color-bg-panel);
  transform: scale(1.1);
  border-color: var(--color-brand);
}

.rental-container :deep(.station-timer) {
  text-align: center;
  margin: 24px 0;
  position: relative;
  z-index: 1;
}

.rental-container :deep(.timer-display) {
  font-size: 3.5rem;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  text-shadow: 2px 2px 0 var(--color-accent);
}

.rental-container :deep(.timer-disponible) { color: #a0a0a0; }
.rental-container :deep(.timer-activo) { color: #2d5016; }
.rental-container :deep(.timer-warning) { color: var(--color-warning); animation: glow 0.5s infinite; }
.rental-container :deep(.timer-terminado) { color: var(--color-warning); }

.rental-container :deep(.timer-warning) {
  color: var(--color-warning);
  font-weight: bold;
  margin-top: 8px;
  font-size: 0.9rem;
}

.rental-container :deep(.station-options) {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.rental-container :deep(.option-btn) {
  background: linear-gradient(135deg, var(--color-text-primary)9f0 0%, var(--color-bg-panel) 100%);
  border: 3px solid var(--color-border);
  border-radius: 12px;
  padding: 14px 12px;
  cursor: pointer;
  font-family: var(--font-body);
  transition: all var(--transition-normal);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.rental-container :deep(.option-btn:hover) {
  transform: translateY(-2px);
  box-shadow: 5px 5px 0 var(--color-shadow);
  border-color: var(--color-brand);
}

.rental-container :deep(.option-btn:active) {
  transform: translateY(0);
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.rental-container :deep(.option-nombre) {
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-text-primary);
  text-align: center;
}

.rental-container :deep(.option-precio) {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-success);
}

.rental-container :deep(.option-combo-badge) {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--color-warning);
  color: var(--color-text-primary);
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 10px;
  border: 2px solid var(--color-border);
}

.rental-container :deep(.no-opciones) {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--color-text-primary);
  font-style: italic;
  padding: 20px;
}

.rental-container :deep(.ticket-panel) {
  background: var(--color-bg-panel);
  border: 2px solid var(--color-accent);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
  box-shadow: 0 2px 8px var(--color-shadow);
}

.rental-container :deep(.ticket-title) {
  font-size: 0.9rem;
  color: var(--color-text-primary);
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--color-accent);
}

.rental-container :deep(.ticket-empty) {
  text-align: center;
  color: var(--color-shadow);
  font-style: italic;
  padding: 12px;
}

.rental-container :deep(.ticket-list) {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rental-container :deep(.ticket-item) {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dotted var(--color-accent);
  font-size: 0.9rem;
}

.rental-container :deep(.ticket-item:last-child) {
  border-bottom: none;
}

.rental-container :deep(.ticket-price) {
  font-weight: bold;
  color: #2d5016;
}

.rental-container :deep(.station-footer) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 2px dashed var(--color-border);
  position: relative;
  z-index: 1;
}

.rental-container :deep(.station-total) {
  font-size: 1.2rem;
  color: var(--color-text-primary);
}

.rental-container :deep(.total-value) {
  font-weight: bold;
  color: var(--color-success);
  font-size: 1.4rem;
}

.rental-container :deep(.btn-cobrar) {
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--color-accent) 0%, #3d6530 100%);
  color: var(--color-text-primary);
  border: 3px solid #2d5016;
  border-radius: 12px;
  font-weight: bold;
  font-family: var(--font-body);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all var(--transition-normal);
  box-shadow: 3px 3px 0 #2d5016;
}

.rental-container :deep(.btn-cobrar:hover:not(:disabled)) {
  transform: translateY(-2px);
  box-shadow: 5px 5px 0 #2d5016;
}

.rental-container :deep(.btn-cobrar:disabled) {
  background: #a0a0a0;
  border-color: #808080;
  box-shadow: 2px 2px 0 #606060;
  cursor: not-allowed;
}

.rental-container :deep(.station-footer-buttons) {
  display: flex;
  gap: 10px;
}

.rental-container :deep(.btn-cancelar-timer) {
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--color-warning) 0%, var(--color-bg-secondary) 100%);
  color: var(--color-text-primary);
  border: 3px solid #3d0a0a;
  border-radius: 12px;
  font-weight: bold;
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all var(--transition-normal);
  box-shadow: 3px 3px 0 #3d0a0a;
}

.rental-container :deep(.btn-cancelar-timer:hover) {
  transform: translateY(-2px);
  box-shadow: 5px 5px 0 #3d0a0a;
}

/* rental-modals.css */
.rental-container :deep(.modal-overlay) {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.rental-container :deep(.modal-content) {
  background: var(--color-bg-panel);
  border: 3px solid var(--color-accent);
  border-radius: 12px;
  padding: 28px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 6px 20px var(--color-shadow);
}

.rental-container :deep(.modal-opciones) {
  max-width: 650px;
}

.rental-container :deep(.modal-seleccionar-producto) {
  max-width: 600px;
}

.rental-container :deep(.modal-subtitle) {
  text-align: center;
  color: var(--color-text-primary);
  margin-bottom: 20px;
  font-style: italic;
}

.rental-container :deep(.buscador-modal) {
  display: flex;
  align-items: center;
  background: var(--color-bg-panel);
  border: 3px solid var(--color-border);
  border-radius: 12px;
  padding: 8px 16px;
  margin-bottom: 20px;
  gap: 10px;
}

.rental-container :deep(.buscador-icono) {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.rental-container :deep(.buscador-input) {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1rem;
  color: var(--color-text-primary);
  outline: none;
}

.rental-container :deep(.buscador-input::placeholder) {
  color: var(--color-shadow);
}

.rental-container :deep(.buscador-limpiar) {
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 50%;
  transition: all var(--transition-normal);
}

.rental-container :deep(.buscador-limpiar:hover) {
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
}

.rental-container :deep(.no-resultados) {
  text-align: center;
  color: var(--color-text-primary);
  font-style: italic;
  padding: 30px;
}

.rental-container :deep(.productos-lista-modal) {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding-right: 8px;
}

.rental-container :deep(.producto-item-modal) {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-bg-panel);
  border: 3px solid var(--color-border);
  border-radius: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all var(--transition-normal);
  box-shadow: 3px 3px 0 var(--color-accent);
}

.rental-container :deep(.producto-item-modal:hover) {
  border-color: var(--color-accent);
  background: #e8f5e9;
  box-shadow: 4px 4px 0 #c4b090;
  transform: translateX(4px);
}

.rental-container :deep(.producto-imagen-modal) {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--color-bg-panel);
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  overflow: hidden;
  flex-shrink: 0;
}

.rental-container :deep(.producto-imagen-modal img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rental-container :deep(.producto-datos-modal) {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rental-container :deep(.producto-nombre-modal) {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-text-primary);
}

.rental-container :deep(.producto-stock-modal) {
  font-size: 0.85rem;
  color: var(--color-text-primary);
}

.rental-container :deep(.producto-seleccionar-icon) {
  font-size: 1.5rem;
  color: var(--color-accent);
  font-weight: bold;
}

.rental-container :deep(.modal-title) {
  font-size: 1.5rem;
  color: var(--color-accent);
  text-align: center;
  margin-bottom: 24px;
  text-shadow: 1px 1px 0 var(--color-shadow);
}

.rental-container :deep(.form-group) {
  margin-bottom: 20px;
}

.rental-container :deep(.form-group label) {
  display: block;
  color: var(--color-text-primary);
  margin-bottom: 8px;
  font-weight: bold;
}

.rental-container :deep(.form-group input),
.rental-container :deep(.form-group select) {
  width: 100%;
  padding: 12px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: 1rem;
}

.rental-container :deep(.form-group input:focus),
.rental-container :deep(.form-group select:focus) {
  outline: none;
  border-color: var(--color-text-primary);
}

.rental-container :deep(.modal-actions) {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.rental-container :deep(.btn-cancelar),
.rental-container :deep(.btn-confirmar) {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 1rem;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.rental-container :deep(.btn-cancelar) {
  background: var(--color-bg-panel);
  border: 3px solid var(--color-border);
  color: var(--color-text-primary);
}

.rental-container :deep(.btn-cancelar:hover) {
  background: var(--color-bg-panel);
}

.rental-container :deep(.btn-confirmar) {
  background: linear-gradient(135deg, var(--color-border) 0%, var(--color-text-primary) 100%);
  border: 3px solid var(--color-text-primary);
  color: var(--color-text-primary)9f0;
  box-shadow: 3px 3px 0 #3d2510;
}

.rental-container :deep(.btn-confirmar:hover) {
  transform: translateY(-2px);
  box-shadow: 5px 5px 0 #3d2510;
}

.rental-container :deep(.opciones-config) {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding-right: 8px;
}

.rental-container :deep(.opciones-list) {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rental-container :deep(.opcion-item) {
  background: var(--color-bg-panel);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
}

.rental-container :deep(.opcion-header) {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.rental-container :deep(.input-nombre) {
  flex: 1;
  padding: 10px 12px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: 0.95rem;
  font-weight: bold;
}

.rental-container :deep(.btn-delete-opcion) {
  background: #ffebee;
  border: 2px solid #c47f7f;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.9rem;
}

.rental-container :deep(.btn-delete-opcion:hover) {
  background: #ffcdd2;
}

.rental-container :deep(.opcion-detalles) {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.rental-container :deep(.input-group) {
  flex: 1;
}

.rental-container :deep(.input-group label) {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.rental-container :deep(.input-mini) {
  width: 100%;
  padding: 8px;
  border: 2px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  text-align: center;
}

.rental-container :deep(.opcion-productos) {
  background: var(--color-bg-panel);
  border-radius: 8px;
  padding: 12px;
}

.rental-container :deep(.productos-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.85rem;
  color: var(--color-text-primary);
}

.rental-container :deep(.btn-agregar-producto) {
  background: #e8f5e9;
  border: 2px solid var(--color-accent);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 0.8rem;
}

.rental-container :deep(.btn-agregar-producto:hover) {
  background: #c8e6c9;
}

.rental-container :deep(.productos-list) {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rental-container :deep(.productos-list li) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 0.85rem;
  border-bottom: 1px dotted var(--color-accent);
}

.rental-container :deep(.productos-list li:last-child) {
  border-bottom: none;
}

.rental-container :deep(.btn-quitar) {
  background: transparent;
  border: none;
  color: #c47f7f;
  cursor: pointer;
  font-size: 0.9rem;
}

.rental-container :deep(.btn-quitar:hover) {
  color: var(--color-error);
}

.rental-container :deep(.btn-agregar-opcion) {
  width: 100%;
  padding: 14px;
  background: transparent;
  border: 3px dashed var(--color-border);
  border-radius: 12px;
  color: var(--color-text-primary);
  font-weight: bold;
  font-family: var(--font-body);
  cursor: pointer;
  font-size: 1rem;
  transition: all var(--transition-normal);
}

.rental-container :deep(.btn-agregar-opcion:hover) {
  background: var(--color-bg-panel);
  border-color: var(--color-text-primary);
  color: var(--color-text-primary);
}

/* rental-responsive.css */
@media (max-width: 768px) {
  .rental-container .btn-grande-crear {
    padding: 30px 50px;
  }

  .rental-container .btn-icono {
    font-size: 2.5rem;
  }

  .rental-container .btn-texto {
    font-size: 1.2rem;
  }

  .rental-container :deep(.productos-grid) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }

  .rental-container :deep(.producto-item) {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .rental-container :deep(.producto-info-row) {
    flex-direction: column;
    width: 100%;
  }

  .rental-container :deep(.btn-crear-estacion) {
    width: 100%;
  }

  .rental-container .estaciones-grid {
    grid-template-columns: 1fr;
  }

  .rental-container :deep(.zelda-title) {
    font-size: 1.8rem;
  }

  .rental-container :deep(.station-options) {
    grid-template-columns: 1fr;
  }

  .rental-container :deep(.station-footer) {
    flex-direction: column;
    gap: 16px;
  }

  .rental-container :deep(.btn-cobrar) {
    width: 100%;
  }

  .rental-container :deep(.opcion-detalles) {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .rental-container :deep(.rental-header) {
    padding: 20px 16px;
  }

  .rental-container .rental-main {
    padding: 20px 12px;
  }

  .rental-container :deep(.productos-grid) {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .rental-container :deep(.producto-card) {
    padding: 12px;
  }

  .rental-container :deep(.producto-imagen) {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }

  .rental-container :deep(.timer-display) {
    font-size: 2.5rem;
  }
}

@keyframes glow {
  50% { text-shadow: 2px 2px 0 var(--color-accent), 0 0 20px var(--color-warning); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.rental-container :deep(.swal2-popup-papyrus) {
  background: var(--color-bg-panel) !important;
  border: 4px solid var(--color-border) !important;
  border-radius: 16px !important;
  box-shadow: 6px 6px 0 var(--color-shadow) !important;
}

.rental-container :deep(.swal2-title) {
  color: var(--color-brand) !important;
  font-family: inherit !important;
}

.rental-container :deep(.swal2-html-container) {
  color: var(--color-text-primary) !important;
}

.rental-container :deep(.swal2-confirm) {
  background: linear-gradient(135deg, var(--color-border) 0%, var(--color-text-primary) 100%) !important;
  border: 3px solid var(--color-text-primary) !important;
  border-radius: 10px !important;
  box-shadow: 3px 3px 0 #3d2510 !important;
}

.rental-container :deep(.swal2-confirm:hover) {
  transform: translateY(-2px) !important;
  box-shadow: 5px 5px 0 #3d2510 !important;
}
</style>

