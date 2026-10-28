<script setup lang="ts">
import { ref, watch } from 'vue';
import { useTheme } from '@/composables/useTheme';

const props = withDefaults(defineProps<{
  open: boolean;
  title?: string;
  subtitle?: string;
  confirmText?: string;
  label?: string;
  initialValue?: number;
}>(), {
  title: 'Monto Inicial de Caja',
  subtitle: 'Ingresa el monto con el que abres la caja hoy',
  confirmText: 'Continuar a Ventas',
  label: 'Cantidad inicial',
  initialValue: 0
});

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'submit', payload: any): void;
}>();

const { currentTheme } = useTheme();
const montoInicial = ref<number | string>('');
const cargando = ref(false);

watch(
  () => props.open,
  (abierto) => {
    if (abierto) {
      montoInicial.value = props.initialValue || '';
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
    <div class="bag-modal">
      <div class="bag-straps">
        <div class="strap strap-left"></div>
        <div class="strap strap-right"></div>
      </div>
      
      <div class="bag-body">
        <div class="bag-buckle">
          <div class="buckle-frame"></div>
        </div>
        
        <div class="bag-content">
          <header class="modal-header">
            <div class="header-icon">🎒</div>
            <h3>{{ title }}</h3>
            <p>{{ subtitle }}</p>
          </header>

          <div class="modal-body">
            <label for="monto-inicial">{{ label }}</label>
            <div class="input-wrapper">
              <span class="currency-symbol">$</span>
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
          </div>

          <footer class="modal-actions">
            <button
              type="button"
              class="btn-confirm"
              :disabled="cargando"
              @click="confirmar"
            >
              <span class="btn-icon">🗡️</span>
              <span>{{ cargando ? 'Procesando...' : confirmText }}</span>
            </button>
            
            <button
              type="button"
              class="btn-skip"
              @click="emit('submit', { montoInicial: 0 })"
            >
              <span class="btn-icon">📊</span>
              <span>Modo Reportes</span>
            </button>
          </footer>
        </div>
        
        <div class="bag-buckle bottom">
          <div class="buckle-frame"></div>
        </div>
      </div>
      
      <div class="bag-stitching">
        <div class="stitch-row top"></div>
        <div class="stitch-row bottom"></div>
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
      0 0 0 3px var(--border-color),
      0 8px 20px var(--shadow-color),
      inset 0 0 30px color-mix(in srgb, var(--zelda-gold) 10%, transparent);
  }
  50% {
    box-shadow: 
      0 0 0 3px var(--border-color),
      0 12px 30px var(--shadow-color),
      inset 0 0 40px color-mix(in srgb, var(--zelda-gold) 20%, transparent);
  }
}

@keyframes strapSwing {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.85);
  display: grid;
  place-items: center;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.bag-modal {
  width: min(100%, 420px);
  max-height: 90vh;
  position: relative;
  animation: fadeSlideIn 300ms ease-out, pulseGlow 4s ease-in-out infinite;
}

.bag-straps {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 40px;
  display: flex;
  justify-content: space-between;
  z-index: 10;
}

.strap {
  width: 12px;
  height: 35px;
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-end) 100%);
  border-radius: 6px 6px 0 0;
  border: 2px solid var(--border-color);
  border-bottom: none;
  animation: strapSwing 3s ease-in-out infinite;
}

.strap-left { margin-right: 50px; }
.strap-right { margin-left: 50px; }

.bag-body {
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border: 3px solid var(--accent-color);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 
    0 0 0 3px var(--border-color),
    inset 0 1px 0 color-mix(in srgb, var(--accent-color) 30%, white);
  position: relative;
  overflow: hidden;
}

.bag-body::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
  opacity: 0.6;
}

.bag-buckle {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
}

.bag-buckle.bottom {
  top: auto;
  bottom: -12px;
}

.buckle-frame {
  width: 40px;
  height: 20px;
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-end) 100%);
  border: 2px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.bag-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-header {
  text-align: center;
  padding-bottom: 1rem;
  border-bottom: 2px dashed color-mix(in srgb, var(--accent-color) 40%, transparent);
}

.header-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  filter: drop-shadow(0 2px 4px var(--shadow-color));
}

.modal-header h3 {
  margin: 0 0 0.4rem 0;
  font-size: 1.1rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 900;
  font-family: "Courier New", monospace;
  text-shadow: 2px 2px 0 var(--border-color);
}

.modal-header p {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-family: "Courier New", monospace;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.modal-body label {
  font-size: 0.75rem;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  font-family: "Courier New", monospace;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.currency-symbol {
  position: absolute;
  left: 1rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-color);
  font-family: "Courier New", monospace;
  text-shadow: 1px 1px 0 var(--border-color);
  z-index: 1;
}

.input-monto {
  width: 100%;
  background: var(--bg-primary);
  border: 3px solid var(--border-color);
  padding: 1rem 1rem 1rem 2.5rem;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  outline: none;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent-color) 20%, transparent);
  transition: all 200ms ease;
}

.input-monto::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.input-monto:focus {
  border-color: var(--accent-color);
  box-shadow: 
    inset 0 0 0 2px var(--accent-color),
    0 0 0 2px var(--accent-color),
    0 0 20px color-mix(in srgb, var(--zelda-gold) 30%, transparent);
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.btn-confirm,
.btn-skip {
  width: 100%;
  border: 2px solid var(--border-color);
  padding: 0.8rem 1rem;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 200ms ease;
}

.btn-confirm {
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 45%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
  box-shadow: 
    inset 0 0 0 2px color-mix(in srgb, white 30%, var(--accent-color)),
    0 3px 0 var(--border-color),
    0 4px 10px var(--shadow-color);
}

.btn-confirm:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 
    inset 0 0 0 2px color-mix(in srgb, white 40%, var(--accent-color)),
    0 5px 0 var(--border-color),
    0 8px 20px var(--shadow-color),
    0 0 20px color-mix(in srgb, var(--zelda-gold) 30%, transparent);
}

.btn-confirm:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 
    inset 0 0 0 2px color-mix(in srgb, white 30%, var(--accent-color)),
    0 1px 0 var(--border-color);
}

.btn-skip {
  background: transparent;
  color: var(--text-secondary);
  border-style: dashed;
}

.btn-skip:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.btn-icon {
  font-size: 1rem;
}

.btn-confirm:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.bag-stitching {
  position: absolute;
  inset: 8px;
  pointer-events: none;
  border: 1px dashed color-mix(in srgb, var(--accent-color) 20%, transparent);
  border-radius: 12px;
}

.stitch-row {
  position: absolute;
  left: 20px;
  right: 20px;
  height: 1px;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 4px,
    color-mix(in srgb, var(--accent-color) 30%, transparent) 4px,
    color-mix(in srgb, var(--accent-color) 30%, transparent) 8px
  );
}

.stitch-row.top { top: 30px; }
.stitch-row.bottom { bottom: 30px; }

@media (max-width: 480px) {
  .bag-modal {
    margin: 0.5rem;
  }

  .bag-body {
    padding: 1rem;
  }

  .bag-straps {
    width: 100px;
  }

  .strap {
    width: 10px;
    height: 28px;
  }

  .strap-left { margin-right: 40px; }
  .strap-right { margin-left: 40px; }

  .header-icon {
    font-size: 1.5rem;
  }

  .modal-header h3 {
    font-size: 0.95rem;
  }

  .input-monto {
    font-size: 1.25rem;
    padding: 0.8rem 1rem 0.8rem 2rem;
  }

  .currency-symbol {
    font-size: 1.2rem;
    left: 0.8rem;
  }

  .btn-confirm,
  .btn-skip {
    padding: 0.7rem 0.8rem;
    font-size: 0.7rem;
  }
}
</style>
