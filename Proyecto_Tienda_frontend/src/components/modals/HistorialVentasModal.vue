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
      <header class="modal-header">
        <h3>Historial de Ventas del Dia</h3>
      </header>

      <div class="totales-wrap">
        <article class="total-card">
          <p>Cobro Total</p>
          <strong>{{ formatoMoneda(cobroTotal) }}</strong>
        </article>
        <article class="total-card">
          <p>Ganancia Total</p>
          <strong>{{ formatoMoneda(gananciaTotal) }}</strong>
        </article>
      </div>

      <div class="tabla-wrap">
        <p v-if="loading" class="estado">Cargando historial...</p>
        <p v-else-if="ventas.length === 0" class="estado">No hay ventas para hoy.</p>

        <table v-else>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Monto</th>
              <th>Metodo</th>
              <th>Estatus</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="venta in ventas" :key="venta.idVenta">
              <td>#{{ venta.numeroTicket ?? venta.idVenta }}</td>
              <td>{{ formatoMoneda(Number(venta.montoTotal ?? 0)) }}</td>
              <td>{{ venta.metodoPago || 'N/D' }}</td>
              <td>{{ venta.estatus || 'N/D' }}</td>
              <td>{{ formatoFecha(venta.fechaVenta) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="modal-actions">
        <button type="button" @click="emit('close')">Cerrar</button>
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
}

.modal-card {
  width: min(100%, 920px);
  max-height: 88vh;
  background: linear-gradient(180deg, #1f5b35 0%, #133523 100%);
  border: 4px solid #f8d667;
  box-shadow: 
    0 0 0 4px #2f1f09,
    0 14px 0 #271c0f,
    0 20px 28px rgba(0, 0, 0, 0.5);
  padding: 1.2rem;
  display: grid;
  gap: 0.8rem;
  position: relative;
  overflow: hidden;
  animation: popIn 150ms steps(4);
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-card::before {
  content: "";
  position: absolute;
  inset: 10px;
  border: 2px dashed rgba(248, 214, 103, 0.4);
  pointer-events: none;
}

.modal-header {
  position: relative;
  border-bottom: 2px solid rgba(248, 214, 103, 0.3);
  padding-bottom: 0.5rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
  color: #f8d667;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 900;
  text-shadow: 2px 2px 0 #000;
}

.modal-header h3::before {
  content: "📜 ";
}

.totales-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  position: relative;
}

.total-card {
  border: 3px solid #2a1807;
  background: linear-gradient(180deg, #fdfbf3 0%, #e8d9a8 100%);
  color: #1d1606;
  padding: 0.7rem;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5), 0 4px 0 #1a1005;
}

.total-card p {
  font-size: 0.72rem;
  text-transform: uppercase;
  margin: 0 0 0.25rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.total-card strong {
  font-size: 1.1rem;
  font-family: "Courier New", monospace;
}

.total-card:first-child strong::before {
  content: "💎 ";
}

.total-card:last-child strong::before {
  content: "💰 ";
}

.tabla-wrap {
  overflow: auto;
  border: 3px solid #2a1807;
  background: #f2e8bf;
  color: #1d1606;
  min-height: 220px;
  box-shadow: inset 0 0 0 3px #d4c27e;
  position: relative;
}

.estado {
  padding: 1.5rem;
  text-align: center;
  color: #5a4a2a;
  font-family: "Courier New", monospace;
  font-size: 0.9rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.55rem;
  border-bottom: 1px solid #baa15c;
  text-align: left;
  font-size: 0.74rem;
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
}

tr:hover td {
  background: rgba(248, 214, 103, 0.2);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  position: relative;
  padding-top: 0.5rem;
  border-top: 2px solid rgba(248, 214, 103, 0.3);
}

.modal-actions button {
  border: 3px solid #2a1807;
  padding: 0.6rem 1.2rem;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  color: #1a1401;
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 3px 0 #6f4b1c, 0 5px 8px rgba(0, 0, 0, 0.3);
  transition: transform 80ms steps(2), filter 80ms linear;
}

.modal-actions button:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.modal-actions button:active {
  transform: translateY(2px);
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 1px 0 #6f4b1c;
}

@media (max-width: 700px) {
  .totales-wrap {
    grid-template-columns: 1fr;
  }
}
</style>
