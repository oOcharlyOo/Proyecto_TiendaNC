<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'submit', payload: { montoInicial: number }): void;
}>();

const montoInicial = ref<number | string>('');
const cargando = ref(false);

watch(
  () => props.open,
  (abierto) => {
    if (abierto) {
      montoInicial.value = '';
    }
  }
);

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(valor);
}

function confirmar() {
  const monto = Number(montoInicial.value);
  if (!Number.isFinite(monto) || monto < 0) {
    return;
  }
  emit('submit', { montoInicial: monto });
}

function manejarKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    confirmar();
  }
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card">
      <div class="nails">
        <span class="nail"></span>
        <span class="nail"></span>
        <span class="nail"></span>
        <span class="nail"></span>
      </div>

      <div class="parchment-content">
        <header class="modal-header">
          <h3>Monto Inicial de Caja</h3>
          <p>Ingresa el monto con el que abres la caja hoy</p>
        </header>

        <div class="modal-body">
          <label for="monto-inicial">Cantidad inicial</label>
          <input
            id="monto-inicial"
            v-model="montoInicial"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            class="input-monto"
            @keydown="manejarKeydown"
          >
        </div>

        <footer class="modal-actions">
          <button
            type="button"
            class="btn-confirm"
            :disabled="cargando"
            @click="confirmar"
          >
            {{ cargando ? 'Procesando...' : 'Continuar a Ventas' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 
      0 0 0 4px #2f1f09,
      0 14px 0 #271c0f,
      0 20px 28px rgba(0, 0, 0, 0.5),
      inset 0 0 20px rgba(248, 214, 103, 0.1);
  }
  50% {
    box-shadow: 
      0 0 0 4px #2f1f09,
      0 14px 0 #271c0f,
      0 20px 28px rgba(0, 0, 0, 0.5),
      inset 0 0 30px rgba(248, 214, 103, 0.2);
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(2, 4, 2, 0.92);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.modal-card {
  width: min(100%, 480px);
  max-height: 85vh;
  position: relative;
  background: linear-gradient(180deg, #8b6914 0%, #5c4a12 50%, #3d2f0a 100%);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 
    0 0 0 4px #2f1f09,
    0 14px 0 #271c0f,
    0 20px 28px rgba(0, 0, 0, 0.5);
  animation: fadeSlideIn 200ms ease-out, pulseGlow 3s ease-in-out infinite;
}

.nails {
  position: absolute;
  inset: 12px;
  pointer-events: none;
}

.nail {
  position: absolute;
  width: 12px;
  height: 12px;
  background: radial-gradient(circle at 30% 30%, #a08050, #604020);
  border-radius: 50%;
  box-shadow: 
    inset 1px 1px 2px rgba(255, 255, 255, 0.3),
    1px 2px 3px rgba(0, 0, 0, 0.5);
}

.nail:nth-child(1) { top: 0; left: 0; }
.nail:nth-child(2) { top: 0; right: 0; }
.nail:nth-child(3) { bottom: 0; left: 0; }
.nail:nth-child(4) { bottom: 0; right: 0; }

.parchment-content {
  background: linear-gradient(180deg, #fdfbf3 0%, #f0e6c8 50%, #e8d9a8 100%);
  border-radius: 4px;
  padding: 1.5rem;
  margin: 8px;
  overflow-y: auto;
  max-height: calc(85vh - 32px);
}

.modal-header {
  text-align: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px dashed #c4a858;
}

.modal-header h3 {
  margin: 0 0 0.3rem 0;
  font-size: 1.25rem;
  color: #2a1a08;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 900;
  font-family: "Courier New", monospace;
  text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.5);
}

.modal-header h3::before {
  content: "💰 ";
}

.modal-header p {
  margin: 0;
  font-size: 0.82rem;
  color: #5a4a2a;
  font-family: "Courier New", monospace;
}

.modal-body {
  margin-bottom: 1.25rem;
}

.modal-body label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.78rem;
  color: #3a2a15;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  font-family: "Courier New", monospace;
}

.input-monto {
  width: 100%;
  background: #fffef8;
  border: 3px solid #3a2a15;
  padding: 0.9rem 0.8rem;
  color: #1a1005;
  font-family: "Courier New", monospace;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  outline: none;
  box-shadow: inset 0 0 0 2px #d4c27e;
  transition: box-shadow 150ms linear, border-color 150ms linear;
}

.input-monto::placeholder {
  color: #a09070;
}

.input-monto:focus {
  box-shadow: inset 0 0 0 3px #e1cc80, 0 0 0 3px #f8d667;
  border-color: #f8d667;
}

.modal-actions {
  display: flex;
  justify-content: center;
}

.btn-confirm {
  width: 100%;
  border: 3px solid #2a1807;
  padding: 0.85rem 1.2rem;
  font-size: 0.92rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  color: #1a1401;
  box-shadow: 
    inset 0 0 0 2px #ffeeb4,
    0 4px 0 #6f4b1c,
    0 8px 16px rgba(0, 0, 0, 0.35);
  transition: transform 100ms steps(2), filter 100ms linear;
}

.btn-confirm::before {
  content: "🗡️ ";
}

.btn-confirm:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-2px);
}

.btn-confirm:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 
    inset 0 0 0 2px #ffeeb4,
    0 2px 0 #6f4b1c;
}

.btn-confirm:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 520px) {
  .modal-card {
    margin: 0.5rem;
    padding: 6px;
  }

  .parchment-content {
    padding: 1rem;
    margin: 6px;
  }

  .input-monto {
    font-size: 1.25rem;
    padding: 0.75rem 0.6rem;
  }

  .btn-confirm {
    padding: 0.7rem 1rem;
    font-size: 0.82rem;
  }
}
</style>
