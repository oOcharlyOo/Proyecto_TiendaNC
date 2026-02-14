<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'submit', payload: { montoEoS: number; descripcion: string }): void;
}>();

const monto = ref('');
const descripcion = ref('');

watch(
  () => props.open,
  (abierto) => {
    if (abierto) {
      monto.value = '';
      descripcion.value = '';
    }
  }
);

function confirmar() {
  const montoNumber = Number(monto.value);
  if (!Number.isFinite(montoNumber) || montoNumber <= 0) return;
  emit('submit', {
    montoEoS: montoNumber,
    descripcion: descripcion.value.trim()
  });
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <section class="modal-card panel">
      <header class="modal-header">
        <h3>Salida de Efectivo</h3>
      </header>

      <div class="modal-body">
        <label>Monto</label>
        <input v-model="monto" type="number" step="0.01" min="0" placeholder="0.00">

        <label>Descripcion</label>
        <textarea v-model="descripcion" rows="3" placeholder="Motivo de la salida"></textarea>
      </div>

      <footer class="modal-actions">
        <button type="button" class="btn-secondary" @click="emit('close')">Cancelar</button>
        <button type="button" class="btn-danger" @click="confirmar">Registrar Salida</button>
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
  width: min(100%, 420px);
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
  font-size: 1.05rem;
  color: #f8d667;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 900;
  text-shadow: 2px 2px 0 #000;
}

.modal-header h3::before {
  content: "💸 ";
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

.modal-body input,
.modal-body textarea {
  width: 100%;
  background: #f2e8bf;
  border: 3px solid #2a1807;
  padding: 0.6rem 0.7rem;
  color: #1d1606;
  font-family: "Courier New", monospace;
  font-size: 0.95rem;
  outline: none;
  box-shadow: inset 0 0 0 2px #d4c27e;
}

.modal-body input:focus,
.modal-body textarea:focus {
  box-shadow: inset 0 0 0 2px #e1cc80, 0 0 0 3px #f8d667;
}

.modal-body input::placeholder,
.modal-body textarea::placeholder {
  color: #8a7a4a;
}

.modal-body textarea {
  resize: none;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  position: relative;
  padding-top: 0.5rem;
  border-top: 2px solid rgba(248, 214, 103, 0.3);
}

.modal-actions button {
  border: 3px solid #2a1807;
  padding: 0.6rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 3px 0 #6f4b1c, 0 5px 8px rgba(0, 0, 0, 0.3);
  transition: transform 80ms steps(2), filter 80ms linear;
}

.modal-actions button:first-child {
  background: linear-gradient(180deg, #e2deca 0%, #bdb696 100%);
  color: #1a1401;
}

.modal-actions button:last-child {
  background: linear-gradient(180deg, #e88b8b 0%, #c94f4f 50%, #a32d2d 100%);
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
</style>
