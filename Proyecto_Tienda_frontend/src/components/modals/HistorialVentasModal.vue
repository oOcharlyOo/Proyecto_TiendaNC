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
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <section class="modal-card panel">
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
        <article class="total-card">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <p>Ganancia Total</p>
            <strong>{{ formatoMoneda(gananciaTotal) }}</strong>
          </div>
        </article>
      </div>

      <div class="tabla-wrap">
        <p v-if="loading" class="estado">📡 Cargando historial...</p>
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
                <span class="metodo-badge" :class="venta.metodoPago?.toLowerCase()">
                  {{ venta.metodoPago === 'TRANSFERENCIA' ? '📱' : '💵' }} {{ venta.metodoPago || 'N/D' }}
                </span>
              </td>
              <td>
                <span class="estatus-badge" :class="venta.estatus">
                  {{ venta.estatus === 'C' ? '✅' : venta.estatus === 'P' ? '⏳' : '❌' }}
                  {{ venta.estatus === 'C' ? 'Completada' : venta.estatus === 'P' ? 'Pendiente' : 'Cancelada' }}
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
                    ❌ <span class="btn-texto">Cancelar</span>
                  </button>
                  <button 
                    v-else
                    type="button" 
                    class="btn-ver"
                    @click="emit('ver-detalle', venta)"
                  >
                    👁️ Ver
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="modal-actions">
        <button type="button" class="btn-cerrar" @click="emit('close')">
          👋 Cerrar
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
  background: linear-gradient(180deg, #1f5b35 0%, #133523 100%);
  border: 4px solid #f8d667;
  box-shadow: 
    0 0 0 4px #2f1f09,
    0 14px 0 #271c0f,
    0 20px 28px rgba(0, 0, 0, 0.5);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  overflow: hidden;
  animation: popIn 200ms ease-out;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-card::before {
  content: "";
  position: absolute;
  inset: 12px;
  border: 2px dashed rgba(248, 214, 103, 0.3);
  pointer-events: none;
  border-radius: 8px;
}

.btn-cerrar-modal {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0, 0, 0, 0.4);
  color: #f8d667;
  font-size: 1.2rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms;
  z-index: 10;
}

.btn-cerrar-modal:hover {
  background: #ef4444;
  color: white;
  transform: rotate(90deg);
}

.modal-header {
  border-bottom: 2px solid rgba(248, 214, 103, 0.3);
  padding-bottom: 0.5rem;
}

.Titulo-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.emoji {
  font-size: 1.5rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #f8d667;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 900;
  text-shadow: 2px 2px 0 #000;
}

.totales-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.total-card {
  border: 3px solid #2a1807;
  background: linear-gradient(180deg, #fdfbf3 0%, #e8d9a8 100%);
  color: #1d1606;
  padding: 1rem;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5), 0 4px 0 #1a1005;
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
}

.card-content strong {
  font-size: 1.2rem;
  font-family: "Courier New", monospace;
  color: #2a1807;
}

.tabla-wrap {
  flex: 1;
  overflow: auto;
  border: 3px solid #2a1807;
  background: #f2e8bf;
  color: #1d1606;
  min-height: 200px;
  box-shadow: inset 0 0 0 3px #d4c27e;
  position: relative;
}

.estado {
  padding: 2rem;
  text-align: center;
  color: #5a4a2a;
  font-family: "Courier New", monospace;
  font-size: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.6rem 0.4rem;
  border-bottom: 1px solid #baa15c;
  text-align: left;
  font-size: 0.8rem;
  font-family: "Courier New", monospace;
}

th {
  position: sticky;
  top: 0;
  background: linear-gradient(180deg, #e8d790 0%, #d4c27e 100%);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: #1a1401;
  white-space: nowrap;
}

.clickable-row {
  cursor: pointer;
  animation: slideIn 200ms ease-out backwards;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.clickable-row:hover td {
  background: rgba(248, 214, 103, 0.35);
}

.ticket-cell {
  font-weight: bold;
  color: #2a1807;
}

.monto-cell {
  color: #1f5b35;
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
  background: rgba(34, 197, 94, 0.2);
  color: #166534;
}

.metodo-badge.transferencia {
  background: rgba(59, 130, 246, 0.2);
  color: #1d4ed8;
}

.estatus-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
}

.estatus-badge.C {
  color: #16a34a;
}

.estatus-badge.P {
  color: #ca8a04;
}

.fecha-cell {
  font-size: 0.7rem;
  color: #5a4a2a;
}

.acciones-cell {
  display: flex;
  gap: 0.5rem;
}

.btn-cancelar,
.btn-ver {
  padding: 0.35rem 0.6rem;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  border: 2px solid #2a1807;
  border-radius: 4px;
  cursor: pointer;
  transition: all 150ms;
  white-space: nowrap;
}

.btn-cancelar {
  background: linear-gradient(180deg, #fca5a5 0%, #ef4444 100%);
  color: #fff;
  white-space: nowrap;
}

.btn-cancelar:hover {
  filter: brightness(1.1);
}

.btn-ver {
  background: linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%);
  color: #fff;
}

.btn-ver:hover {
  filter: brightness(1.1);
}

.modal-actions {
  display: flex;
  justify-content: center;
  padding-top: 0.5rem;
  border-top: 2px solid rgba(248, 214, 103, 0.3);
}

.btn-cerrar {
  background: linear-gradient(180deg, #f8d667 0%, #c79634 100%);
  color: #1a1401;
  border: none;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms;
  box-shadow: 0 4px 0 #8b6914;
}

.btn-cerrar:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #8b6914;
}

.btn-cerrar:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #8b6914;
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
