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
      <div class="modal-corner tl"></div>
      <div class="modal-corner tr"></div>
      <div class="modal-corner bl"></div>
      <div class="modal-corner br"></div>
      
      <header class="modal-header">
        <h3>Entrada de Efectivo</h3>
      </header>

      <div class="modal-body">
        <label>Monto</label>
        <div class="input-wrapper">
          <span class="input-icon">💰</span>
          <input v-model="monto" type="number" step="0.01" min="0" placeholder="0.00">
        </div>

        <label>Descripcion</label>
        <textarea v-model="descripcion" rows="3" placeholder="Motivo de la entrada"></textarea>
      </div>

      <footer class="modal-actions">
        <button type="button" class="btn-secondary" @click="emit('close')">
          <span class="btn-icono">✕</span>
          <span class="btn-texto">Cancelar</span>
        </button>
        <button type="button" class="btn-success" @click="confirmar">
          <span class="btn-icono">✅</span>
          <span class="btn-texto">Registrar</span>
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
  width: min(100%, 420px);
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: 3px solid var(--accent-color);
  box-shadow: 
    0 0 0 4px var(--border-color),
    0 14px 0 var(--border-color),
    0 20px 28px rgba(0, 0, 0, 0.5);
  padding: 1.3rem;
  display: grid;
  gap: 0.8rem;
  position: relative;
  animation: popIn 200ms ease-out;
  border-radius: 16px;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
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

.modal-corner.br { bottom: 8px; right: 8px; }
.modal-corner.br::before { width: 20px; height: 3px; bottom: 0; right: 0; border-radius: 2px; }
.modal-corner.br::after { width: 3px; height: 20px; bottom: 0; right: 0; border-radius: 2px; }

.modal-card::before {
  content: "";
  position: absolute;
  inset: 10px;
  border: 2px dashed color-mix(in srgb, var(--accent-color) 30%, transparent);
  pointer-events: none;
  border-radius: 12px;
}

.modal-header {
  position: relative;
  border-bottom: 2px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
  padding-bottom: 0.5rem;
  text-align: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 900;
  text-shadow: 2px 2px 0 var(--border-color);
}

.modal-body {
  display: grid;
  gap: 0.8rem;
  position: relative;
}

.modal-body label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: "Courier New", monospace;
  font-weight: 600;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  font-size: 1.2rem;
  z-index: 1;
}

.modal-body input,
.modal-body textarea {
  width: 100%;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  padding: 0.7rem 0.8rem;
  padding-left: 2.5rem;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
  border-radius: 10px;
}

.modal-body input:focus,
.modal-body textarea:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 25%, transparent);
}

.modal-body input::placeholder,
.modal-body textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.modal-body textarea {
  resize: none;
  padding-left: 0.8rem;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  position: relative;
  padding-top: 0.8rem;
  border-top: 2px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.modal-actions button {
  border: 2px solid var(--border-color);
  padding: 0.7rem 0.9rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: 0 4px 15px var(--shadow-color);
  transition: all 0.2s;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.modal-actions .btn-secondary {
  background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  color: var(--text-primary);
}

.modal-actions .btn-success {
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  color: white;
}

.modal-actions button:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.modal-actions button:active {
  transform: translateY(0);
}

.btn-icono {
  font-size: 1.1rem;
}

@media (max-width: 480px) {
  .modal-card {
    padding: 1rem;
  }
  
  .modal-actions {
    grid-template-columns: 1fr;
  }
  
  .modal-actions button {
    width: 100%;
  }

  .btn-texto {
    display: none;
  }
  
  .btn-icono {
    font-size: 1.3rem;
  }
}
</style>
