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
    <section class="modal-card">
      <header class="modal-header">
        <h3>Salida de Efectivo</h3>
        <button class="close-btn" @click="emit('close')">✕</button>
      </header>

      <div class="modal-body">
        <label>Monto</label>
        <div class="input-group">
          <span class="input-prefix">$</span>
          <input v-model="monto" type="number" step="0.01" min="0" placeholder="0.00">
        </div>

        <label>Descripcion</label>
        <textarea v-model="descripcion" rows="3" placeholder="Motivo de la salida"></textarea>
      </div>

      <footer class="modal-actions">
        <button type="button" class="btn btn-secondary" @click="emit('close')">Cancelar</button>
        <button type="button" class="btn btn-danger" @click="confirmar">Registrar Salida</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.modal-card {
  background: var(--color-bg-panel);
  border-radius: var(--radius-xl);
  width: min(100%, 420px);
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow:
    8px 8px 24px rgba(0, 0, 0, 0.35),
    -4px -4px 16px rgba(255, 255, 255, 0.03);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-accent);
}

.close-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    3px 3px 6px rgba(0, 0, 0, 0.15),
    -2px -2px 4px rgba(255, 255, 255, 0.03);
  transition: all 0.15s;
}
.close-btn:hover {
  background: var(--color-error);
  color: #fff;
}
.close-btn:active { transform: scale(0.95); }

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-body label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.modal-body input,
.modal-body textarea {
  width: 100%;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  color: var(--color-text-primary);
  font-size: 0.95rem;
  font-family: inherit;
  box-sizing: border-box;
  box-shadow:
    inset 3px 3px 8px rgba(0, 0, 0, 0.2),
    inset -2px -2px 4px rgba(255, 255, 255, 0.02);
  transition: all 0.2s;
}
.modal-body input:focus,
.modal-body textarea:focus {
  outline: none;
  box-shadow:
    inset 3px 3px 8px rgba(0, 0, 0, 0.2),
    inset -2px -2px 4px rgba(255, 255, 255, 0.02),
    0 0 0 2px var(--color-accent);
}

.modal-body textarea {
  resize: vertical;
  min-height: 70px;
}

.input-group {
  display: flex;
  align-items: stretch;
}
.input-prefix {
  display: flex;
  align-items: center;
  padding: 0.75rem 0.75rem;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md) 0 0 var(--radius-md);
  font-size: 0.95rem;
  font-weight: 600;
  box-shadow:
    inset 3px 0 8px rgba(0, 0, 0, 0.2),
    inset 0 -2px 4px rgba(255, 255, 255, 0.02);
}
.input-group input {
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  box-shadow:
    inset 3px 3px 8px rgba(0, 0, 0, 0.2),
    inset -2px -2px 4px rgba(255, 255, 255, 0.02);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
}

.btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.btn:active { transform: scale(0.98); }

.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  box-shadow:
    4px 4px 8px rgba(0, 0, 0, 0.2),
    -2px -2px 6px rgba(255, 255, 255, 0.03);
}
.btn-secondary:hover {
  color: var(--color-text-primary);
  box-shadow:
    6px 6px 14px rgba(0, 0, 0, 0.25),
    -3px -3px 8px rgba(255, 255, 255, 0.04);
}
.btn-secondary:active {
  box-shadow:
    inset 3px 3px 6px rgba(0, 0, 0, 0.2),
    inset -2px -2px 4px rgba(255, 255, 255, 0.02);
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover));
  color: var(--color-on-brand);
  box-shadow:
    4px 4px 12px rgba(212, 168, 75, 0.25),
    -2px -2px 6px rgba(255, 255, 255, 0.05);
}
.btn-primary:hover {
  box-shadow:
    6px 6px 18px rgba(212, 168, 75, 0.35),
    -3px -3px 8px rgba(255, 255, 255, 0.06);
  transform: translateY(-1px);
}
.btn-primary:active {
  box-shadow:
    inset 3px 3px 6px rgba(0, 0, 0, 0.25),
    inset -2px -2px 4px rgba(255, 255, 255, 0.03);
}

.btn-danger {
  background: linear-gradient(135deg, var(--color-error), color-mix(in srgb, var(--color-error) 70%, black));
  color: #fff;
  box-shadow:
    4px 4px 12px rgba(199, 90, 90, 0.25),
    -2px -2px 6px rgba(255, 255, 255, 0.05);
}
.btn-danger:hover {
  box-shadow:
    6px 6px 18px rgba(199, 90, 90, 0.35),
    -3px -3px 8px rgba(255, 255, 255, 0.06);
  transform: translateY(-1px);
}
.btn-danger:active {
  box-shadow:
    inset 3px 3px 6px rgba(0, 0, 0, 0.25),
    inset -2px -2px 4px rgba(255, 255, 255, 0.03);
}

@media (max-width: 480px) {
  .modal-card {
    width: 100%;
    border-radius: var(--radius-lg);
    padding: 1.25rem;
  }
  .modal-actions { flex-direction: column; }
}
</style>

