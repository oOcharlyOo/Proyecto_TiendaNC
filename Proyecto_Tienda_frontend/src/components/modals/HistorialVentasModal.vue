<script setup lang="ts">
type VentaResumen = {
  idVenta: number;
  numeroTicket?: number;
  montoTotal?: number | string;
  metodoPago?: string;
  estatus?: string;
  fechaVenta?: string;
};

const props = defineProps<{
  open: boolean;
  loading: boolean;
  cobroTotal: number;
  gananciaTotal: number;
  ventas: VentaResumen[];
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'ver-detalle', venta: VentaResumen): void;
  (event: 'cancelar', venta: VentaResumen): void;
}>();

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(valor);
}

function formatoFecha(fecha?: string) {
  if (!fecha) return 'N/D';
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return 'N/D';
  return parsed.toLocaleString('es-MX');
}

function getMetodoClase(metodo?: string): string {
  if (!metodo) return 'efectivo';
  const m = metodo.toUpperCase();
  if (m === 'TRANSFERENCIA') return 'transferencia';
  if (m === 'TARJETA') return 'tarjeta';
  return 'efectivo';
}

function getMetodoIcono(metodo?: string): string {
  if (!metodo) return '💵';
  const m = metodo.toUpperCase();
  if (m === 'TRANSFERENCIA') return '📱';
  if (m === 'TARJETA') return '💳';
  return '💵';
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <section class="modal-card panel">
      <div class="modal-corner tl"></div>
      <div class="modal-corner tr"></div>
      <div class="modal-corner bl"></div>
      <div class="modal-corner br"></div>
      
      <button type="button" class="btn-cerrar-modal" @click="emit('close')" title="Cerrar">
        ✕
      </button>
      
      <header class="modal-header">
        <div class="titulo-header">
          <span class="emoji">📜</span>
          <h3>Historial de Ventas del Día</h3>
        </div>
      </header>

      <div class="totales-wrap">
        <article class="total-card">
          <div class="card-icon">💎</div>
          <div class="card-content">
            <p>Cobro Total</p>
            <strong>{{ formatoMoneda(cobroTotal) }}</strong>
          </div>
        </article>
        <article class="total-card profit">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <p>Ganancia Total</p>
            <strong>{{ formatoMoneda(gananciaTotal) }}</strong>
          </div>
        </article>
      </div>

      <div class="tabla-wrap">
        <p v-if="loading" class="estado loading">📡 Cargando historial...</p>
        <p v-else-if="ventas.length === 0" class="estado">📭 No hay ventas para hoy.</p>

        <table v-else>
          <thead>
            <tr>
              <th>🎫 Ticket</th>
              <th>💵 Monto</th>
              <th>💳 Método</th>
              <th>📊 Estatus</th>
              <th>🕐 Fecha</th>
              <th>⚡ Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(venta, index) in ventas" :key="venta.idVenta" class="clickable-row" :style="{ animationDelay: `${index * 30}ms` }" @click="emit('ver-detalle', venta)">
              <td class="ticket-cell">#{{ venta.numeroTicket ?? venta.idVenta }}</td>
              <td class="monto-cell">{{ formatoMoneda(Number(venta.montoTotal ?? 0)) }}</td>
              <td>
                <span class="metodo-badge" :class="getMetodoClase(venta.metodoPago)">
                  {{ getMetodoIcono(venta.metodoPago) }} {{ venta.metodoPago || 'N/D' }}
                </span>
              </td>
              <td>
                <span class="estatus-badge" :class="venta.estatus">
                  {{ venta.estatus === 'C' ? '✅' : venta.estatus === 'F' ? '✅' : venta.estatus === 'P' ? '⏳' : '❌' }}
                  {{ venta.estatus === 'C' ? 'Completada' : venta.estatus === 'F' ? 'Finalizada' : venta.estatus === 'P' ? 'Pendiente' : 'Inactiva' }}
                </span>
              </td>
              <td class="fecha-cell">{{ formatoFecha(venta.fechaVenta) }}</td>
              <td @click.stop>
                <div class="acciones-cell">
                  <button 
                    v-if="venta.estatus === 'C'" 
                    type="button" 
                    class="btn-cancelar btn-cancelar-icono"
                    @click="emit('cancelar', venta)"
                  >
                    ❌
                  </button>
                  <button 
                    v-else
                    type="button" 
                    class="btn-ver"
                    @click="emit('ver-detalle', venta)"
                  >
                    👁️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="modal-actions">
        <button type="button" class="btn-cerrar" @click="emit('close')">
          <span class="btn-icono">👋</span>
          <span class="btn-texto">Cerrar</span>
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(2, 4, 2, 0.92);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 1rem;
  animation: fadeIn 150ms ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-card {
  width: min(100%, 920px);
  max-height: 90vh;
  background: linear-gradient(var(--bg-primary));
  border: 4px solid var(--accent-color);
  box-shadow: 
    0 0 0 4px var(--border-color),
    0 14px 0 var(--border-color),
    0 20px 28px rgba(0, 0, 0, 0.5);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  overflow: visible;
  animation: popIn 200ms ease-out;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-corner {
  position: absolute;
  width: 30px;
  height: 30px;
  pointer-events: none;
  z-index: 10;
}

.modal-corner::before,
.modal-corner::after {
  content: '';
  position: absolute;
  background: var(--accent-color);
}

.modal-corner.tl { top: 8px; left: 8px; }
.modal-corner.tl::before { width: 20px; height: 3px; top: 0; left: 0; border-radius: 2px; }
.modal-corner.tl::after { width: 3px; height: 20px; top: 0; left: 0; border-radius: 2px; }

.modal-corner.tr { top: 8px; right: 8px; }
.modal-corner.tr::before { width: 20px; height: 3px; top: 0; right: 0; border-radius: 2px; }
.modal-corner.tr::after { width: 3px; height: 20px; top: 0; right: 0; border-radius: 2px; }

.modal-corner.bl { bottom: 8px; left: 8px; }
.modal-corner.bl::before { width: 20px; height: 3px; bottom: 0; left: 0; border-radius: 2px; }
.modal-corner.bl::after { width: 3px; height: 20px; bottom: 0; left: 0; border-radius: 2px; }

.modal-corner.br { bottom: -2px; right: -2px; }
.modal-corner.br::before { width: 20px; height: 3px; bottom: 0; right: 0; border-radius: 2px; }
.modal-corner.br::after { width: 3px; height: 20px; bottom: 0; right: 0; border-radius: 2px; }

.modal-card::before {
  content: "";
  position: absolute;
  inset: 12px;
  border: 2px dashed color-mix(in srgb, var(--accent-color) 30%, transparent);
  pointer-events: none;
  border-radius: 8px;
}

.btn-cerrar-modal {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border: 2px solid var(--accent-color);
  background: var(--bg-secondary);
  color: var(--accent-color);
  font-size: 1rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  z-index: 20;
}

.btn-cerrar-modal:hover {
  background: var(--accent-color);
  color: var(--bg-primary);
  transform: rotate(90deg) scale(1.1);
  box-shadow: 0 0 15px color-mix(in srgb, var(--accent-color) 50%, transparent);
}

.modal-header {
  border-bottom: 2px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
  padding-bottom: 0.5rem;
}

.titulo-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.emoji {
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 900;
  text-shadow: 2px 2px 0 var(--border-color);
}

.totales-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.total-card {
  border: 3px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: transform 0.2s, box-shadow 0.2s;
  border-radius: 12px;
}

.total-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.2);
}

.total-card.profit {
  border-color: var(--success-color);
}

.total-card.profit .card-icon {
  font-size: 2rem;
}

.card-icon {
  font-size: 2rem;
}

.card-content p {
  font-size: 0.7rem;
  text-transform: uppercase;
  margin: 0 0 0.25rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.card-content strong {
  font-size: 1.2rem;
  font-family: "Courier New", monospace;
  color: var(--success-color);
}

.tabla-wrap {
  flex: 1;
  overflow: auto;
  border: 3px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  min-height: 200px;
  border-radius: 12px;
}

.estado {
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
  font-family: "Courier New", monospace;
  font-size: 1rem;
}

.estado.loading {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  justify-content: center;
  align-items: center;
  align-content: center;
  text-align: center;
  padding: 0.6rem 0.4rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.8rem;
  font-family: "Courier New", monospace;
}

th {
  position: sticky;
  top: 0;
  background: var(--bg-primary);
  color: var(--accent-color);
  text-transform: uppercase;
  font-weight: 700;
  white-space: nowrap;
}

.clickable-row {
  cursor: pointer;
  animation: slideIn 200ms ease-out backwards;
  transition: background 0.2s;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.clickable-row:hover td {
  background: color-mix(in srgb, var(--accent-color) 20%, transparent);
}

.ticket-cell {
  font-weight: bold;
}

.monto-cell {
  color: var(--success-color);
  font-weight: 600;
}

.metodo-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.metodo-badge.efectivo {
  background: color-mix(in srgb, var(--success-color) 20%, transparent);
  color: var(--success-color);
}

.metodo-badge.transferencia {
  background: color-mix(in srgb, #3b82f6 20%, transparent);
  color: #3b82f6;
}

.metodo-badge.tarjeta {
  background: color-mix(in srgb, #ec4899 20%, transparent);
  color: #ec4899;
}

.estatus-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
}

.estatus-badge.C,
.estatus-badge.F {
  color: var(--success-color);
}

.estatus-badge.P {
  color: #ca8a04;
}

.estatus-badge.I {
  color: var(--error-color);
}

.fecha-cell {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.acciones-cell {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.btn-cancelar,
.btn-ver {
  padding: 0.4rem 0.6rem;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms;
  white-space: nowrap;
}

.btn-cancelar {
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  color: white;
}

.btn-cancelar:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-ver {
  background: linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%);
  color: white;
}

.btn-ver:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.modal-actions {
  display: flex;
  justify-content: center;
  padding-top: 0.5rem;
  border-top: 2px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.btn-cerrar {
  background: linear-gradient(180deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 70%, black) 100%);
  color: var(--bg-primary);
  border: 2px solid color-mix(in srgb, var(--accent-color) 60%, transparent);
  padding: 0.8rem 2rem;
  font-size: 0.9rem;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 
    0 4px 0 color-mix(in srgb, var(--accent-color) 50%, black),
    0 6px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  position: relative;
  overflow: hidden;
}

.btn-cerrar::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.4s ease;
}

.btn-cerrar:hover::before {
  left: 100%;
}

.btn-cerrar:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 6px 0 color-mix(in srgb, var(--accent-color) 50%, black),
    0 10px 20px rgba(0, 0, 0, 0.25);
  filter: brightness(1.1);
}

.btn-cerrar:active {
  transform: translateY(2px);
  box-shadow: 
    0 2px 0 color-mix(in srgb, var(--accent-color) 50%, black),
    0 3px 6px rgba(0, 0, 0, 0.2);
}

.btn-icono {
  font-size: 1.2rem;
}

@media (max-width: 700px) {
  .modal-card {
    padding: 1rem;
    max-height: 95vh;
  }
  
  .totales-wrap {
    grid-template-columns: 1fr;
  }
  
  th, td {
    padding: 0.5rem 0.3rem;
    font-size: 0.7rem;
    justify-content: center;
    align-items: center;
    align-content: center;
    text-align: center;
  }
  
  .modal-header h3 {
    font-size: 1rem;
  }
  
  .emoji {
    font-size: 1.2rem;
  }
  
  .total-card {
    padding: 0.75rem;
  }
  
  .card-icon {
    font-size: 1.5rem;
  }
  
  .card-content strong {
    font-size: 1rem;
  }

  .btn-cerrar .btn-texto {
    display: none;
  }
  
  .btn-cerrar {
    padding: 0.6rem 1.2rem;
    width: auto;
    height: auto;
  }
  
  .btn-cerrar:hover {
    transform: scale(1.05);
  }
}

@media (max-width: 480px) {
  th:nth-child(3),
  td:nth-child(3),
  th:nth-child(5),
  td:nth-child(5) {
    display: none;
  }
  
  .btn-cancelar-icono .btn-texto {
    display: none;
  }
  
  .btn-cerrar-modal {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
}
</style>
