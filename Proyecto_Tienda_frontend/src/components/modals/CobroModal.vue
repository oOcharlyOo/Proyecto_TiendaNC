<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  total: number;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirmar-efectivo', payload: { montoRecibido: number }): void;
  (event: 'confirmar-transferencia'): void;
}>();

const montoRecibido = ref<number | null>(null);

watch(
  () => props.open,
  (abierto) => {
    if (abierto) {
      montoRecibido.value = null;
    }
  }
);

const cambio = computed(() => {
  const recibido = Number(montoRecibido.value ?? 0);
  const restante = recibido - Number(props.total ?? 0);
  return restante > 0 ? restante : 0;
});

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(valor);
}

function confirmarEfectivo() {
  const recibido = Number(montoRecibido.value ?? 0);
  emit('confirmar-efectivo', { montoRecibido: recibido });
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <section class="modal-card panel">
      <header class="modal-header">
        <h3>Cobro de Venta</h3>
      </header>

      <div class="modal-body">
        <div class="result-card">
          <p>Total a pagar</p>
          <strong>{{ formatoMoneda(total) }}</strong>
        </div>

        <label>Monto recibido</label>
        <input v-model.number="montoRecibido" class="input-lg" type="number" step="0.01" min="0" placeholder="0.00">

        <div class="result-card">
          <p>Cambio</p>
          <strong>{{ formatoMoneda(cambio) }}</strong>
        </div>
      </div>

      <footer class="modal-actions">
        <button type="button" class="btn-secondary" @click="emit('close')">
          <span class="btn-icono">✕</span>
          <span class="btn-texto">Cancelar</span>
        </button>
        <button type="button" @click="confirmarEfectivo">
          <span class="btn-icono">💵</span>
          <span class="btn-texto">Efectivo</span>
        </button>
        <button type="button" @click="emit('confirmar-transferencia')">
          <span class="btn-icono">📱</span>
          <span class="btn-texto">Transferencia</span>
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
}

.modal-card {
  width: min(100%, 480px);
  background: linear-gradient(180deg, #1f5b35 0%, #133523 100%);
  border: 4px solid #f8d667;
  box-shadow: 
    0 0 0 4px #2f1f09,
    0 14px 0 #271c0f,
    0 20px 28px rgba(0, 0, 0, 0.5);
  padding: 1.3rem;
  display: grid;
  gap: 0.8rem;
  position: relative;
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
  font-size: 1.1rem;
  color: #f8d667;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 900;
  text-shadow: 2px 2px 0 #000;
}

.modal-header h3::before {
  content: "💎 ";
}

.modal-body {
  display: grid;
  gap: 0.6rem;
  position: relative;
}

.modal-body label {
  font-size: 0.72rem;
  color: #f6f2de;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: "Courier New", monospace;
}

.modal-body input {
  width: 100%;
  background: #f2e8bf;
  border: 3px solid #2a1807;
  padding: 0.7rem 0.8rem;
  color: #1d1606;
  font-family: "Courier New", monospace;
  font-size: 1.15rem;
  font-weight: 700;
  outline: none;
  box-shadow: inset 0 0 0 2px #d4c27e;
}

.modal-body input:focus {
  box-shadow: inset 0 0 0 2px #e1cc80, 0 0 0 3px #f8d667;
}

.modal-body input::placeholder {
  color: #8a7a4a;
}

.result-card {
  border: 3px solid #2a1807;
  background: linear-gradient(180deg, #ffe48b 0%, #f8d667 50%, #e2b84f 100%);
  color: #1a1401;
  padding: 0.7rem;
  display: grid;
  gap: 0.15rem;
  box-shadow: inset 0 0 0 3px #ffeeb4, 0 4px 0 #6f4b1c;
}

.result-card p {
  font-size: 0.72rem;
  text-transform: uppercase;
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.result-card strong {
  font-size: 1.35rem;
  font-family: "Courier New", monospace;
}

.result-card:first-of-type strong::before {
  content: "💰 ";
}

.result-card:last-of-type strong::before {
  content: "🪙 ";
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
  position: relative;
  padding-top: 0.5rem;
  border-top: 2px solid rgba(248, 214, 103, 0.3);
}

.modal-actions button {
  border: 3px solid #2a1807;
  padding: 0.55rem 0.6rem;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 3px 0 #6f4b1c, 0 5px 8px rgba(0, 0, 0, 0.3);
  transition: transform 80ms steps(2), filter 80ms linear;
}

.modal-actions button:first-child {
  background: linear-gradient(180deg, #e2deca 0%, #bdb696 100%);
  color: #1a1401;
}

.modal-actions button:nth-child(2) {
  background: linear-gradient(180deg, #9fd98a 0%, #5ab848 50%, #3d8a2f 100%);
  color: #0a2008;
}

.modal-actions button:nth-child(3) {
  background: linear-gradient(180deg, #8bcfff 0%, #4a9ed4 50%, #2d7aa8 100%);
  color: #fff;
}

.modal-actions button:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.modal-actions button:active {
  transform: translateY(2px);
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 1px 0 #6f4b1c;
}

@media (max-width: 760px) {
  .modal-actions {
    grid-template-columns: 1fr;
  }
}
</style>
