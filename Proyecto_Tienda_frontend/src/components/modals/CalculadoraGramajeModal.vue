<script setup lang="ts">
import { computed, ref, watch } from 'vue';

type ProductoGramaje = {
  id: number;
  nombre: string;
  precio: number;
  codigo_barras: string;
};

const props = defineProps<{
  open: boolean;
  producto: ProductoGramaje | null;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'add', payload: { gramos: number; precioTotal: number }): void;
}>();

const gramos = ref<number | null>(null);
const precioTotal = ref<number | null>(null);
const precioPorKilo = computed(() => Number(props.producto?.precio ?? 0));

watch(
  () => props.open,
  (abierto) => {
    if (!abierto) return;
    gramos.value = null;
    precioTotal.value = null;
  }
);

function recalcularDesdeGramos() {
  const nuevoGramaje = Number(gramos.value ?? 0);
  if (nuevoGramaje <= 0 || precioPorKilo.value <= 0) return;
  precioTotal.value = Number(((nuevoGramaje / 1000) * precioPorKilo.value).toFixed(2));
}

function recalcularDesdeTotal() {
  const nuevoTotal = Number(precioTotal.value ?? 0);
  if (nuevoTotal <= 0 || precioPorKilo.value <= 0) return;
  gramos.value = Math.round((nuevoTotal / precioPorKilo.value) * 1000);
}

function setGramaje(valor: number) {
  gramos.value = valor;
  recalcularDesdeGramos();
}

function setTotalRapido(valor: number) {
  precioTotal.value = valor;
  recalcularDesdeTotal();
}

function confirmar() {
  const gramosVenta = Number(gramos.value ?? 0);
  const total = Number(precioTotal.value ?? 0);

  if (!props.producto || gramosVenta <= 0 || total <= 0) return;

  emit('add', {
    gramos: gramosVenta,
    precioTotal: total
  });
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <section class="scale-modal">
      <div class="scale-decor top">
        <span class="scale-pan"></span>
        <span class="scale-string"></span>
      </div>
      
      <div class="modal-card panel">
        <div class="modal-glow"></div>
        
        <header class="modal-header">
          <div class="header-icon">⚖️</div>
          <h3>Calculadora de Gramaje</h3>
          <p>Pesa tu producto y calcula el precio</p>
        </header>

        <div class="modal-body">
          <div class="form-group">
            <label>Producto</label>
            <div class="product-name">
              <span class="product-icon">📦</span>
              <span>{{ producto?.nombre || '' }}</span>
            </div>
          </div>

          <div class="inputs-grid">
            <section class="input-block">
              <label>⚖️ Gramaje (g)</label>
              <div class="input-wrapper">
                <input
                  v-model.number="gramos"
                  class="input-lg"
                  type="number"
                  min="0"
                  step="10"
                  placeholder="0"
                  @input="recalcularDesdeGramos"
                >
                <span class="input-unit">g</span>
              </div>

              <div class="quick-buttons">
                <button type="button" class="btn-quick" @click="setGramaje(250)">250g</button>
                <button type="button" class="btn-quick" @click="setGramaje(500)">500g</button>
                <button type="button" class="btn-quick" @click="setGramaje(1000)">1kg</button>
              </div>
            </section>

            <section class="input-block">
              <label>💰 Total a cobrar</label>
              <div class="input-wrapper currency">
                <span class="currency-symbol">$</span>
                <input
                  v-model.number="precioTotal"
                  class="input-lg"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  @input="recalcularDesdeTotal"
                >
              </div>

              <div class="quick-buttons">
                <button type="button" class="btn-quick" @click="setTotalRapido(5)">$5</button>
                <button type="button" class="btn-quick" @click="setTotalRapido(10)">$10</button>
                <button type="button" class="btn-quick" @click="setTotalRapido(20)">$20</button>
              </div>
            </section>
          </div>

          <div class="result-card">
            <div class="result-header">
              <span class="result-icon">📊</span>
              <span>Resumen</span>
            </div>
            <div class="result-grid">
              <div class="result-item">
                <span class="result-label">Precio/kg</span>
                <span class="result-value">{{ precioPorKilo.toFixed(2) }}</span>
              </div>
              <div class="result-item">
                <span class="result-label">Gramaje</span>
                <span class="result-value highlight">{{ Number(gramos || 0) }}g</span>
              </div>
              <div class="result-item total">
                <span class="result-label">Total</span>
                <span class="result-value">${{ Number(precioTotal || 0).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-actions">
          <button type="button" class="btn-cancel" @click="emit('close')">
            <span class="btn-icon">✕</span>
            <span>Cancelar</span>
          </button>
          <button type="button" class="btn-save" @click="confirmar" :disabled="!gramos || !precioTotal">
            <span class="btn-icon">➕</span>
            <span>Agregar</span>
          </button>
        </footer>
      </div>
      
      <div class="scale-decor bottom">
        <span class="scale-string"></span>
        <span class="scale-pan"></span>
      </div>
    </section>
  </div>
</template>

<style scoped>
@keyframes popIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px color-mix(in srgb, var(--zelda-gold) 15%, transparent); }
  50% { box-shadow: 0 0 35px color-mix(in srgb, var(--zelda-gold) 25%, transparent); }
}

@keyframes scaleSwing {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
}

.scale-modal {
  width: min(100%, 480px);
  position: relative;
  animation: popIn 300ms ease-out;
}

.scale-decor {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: scaleSwing 4s ease-in-out infinite;
  z-index: 5;
}

.scale-decor.top {
  top: -30px;
}

.scale-decor.bottom {
  bottom: -30px;
  animation-delay: 2s;
}

.scale-pan {
  width: 60px;
  height: 20px;
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-end) 100%);
  border: 2px solid var(--border-color);
  border-radius: 0 0 30px 30px;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.scale-string {
  width: 4px;
  height: 25px;
  background: linear-gradient(180deg, var(--border-color) 0%, color-mix(in srgb, var(--border-color) 50%, transparent) 100%);
}

.modal-card {
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border: 3px solid var(--accent-color);
  box-shadow: 
    0 0 0 3px var(--border-color),
    0 20px 40px var(--shadow-color);
  padding: 1.5rem;
  display: grid;
  gap: 1rem;
  position: relative;
  overflow: hidden;
  animation: pulseGlow 3s ease-in-out infinite;
}

.modal-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
}

.modal-glow {
  position: absolute;
  top: -30%;
  left: -30%;
  width: 160%;
  height: 160%;
  background: radial-gradient(circle, color-mix(in srgb, var(--zelda-gold) 8%, transparent) 0%, transparent 50%);
  pointer-events: none;
  animation: pulseGlow 4s ease-in-out infinite;
}

.modal-header {
  text-align: center;
  padding-bottom: 1rem;
  border-bottom: 2px dashed color-mix(in srgb, var(--accent-color) 30%, transparent);
  position: relative;
}

.header-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  filter: drop-shadow(0 2px 4px var(--shadow-color));
}

.modal-header h3 {
  margin: 0 0 0.3rem 0;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 900;
  font-family: "Courier New", monospace;
  text-shadow: 2px 2px 0 var(--border-color);
}

.modal-header p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: "Courier New", monospace;
}

.modal-body {
  display: grid;
  gap: 1rem;
}

.form-group {
  display: grid;
  gap: 0.4rem;
}

.form-group label {
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  font-weight: 700;
  font-family: "Courier New", monospace;
}

.product-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  font-weight: 700;
  color: var(--text-primary);
}

.product-icon {
  font-size: 1.2rem;
}

.inputs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.input-block {
  display: grid;
  gap: 0.5rem;
}

.input-block label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-primary);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  font-weight: 700;
  font-family: "Courier New", monospace;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-lg {
  width: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  padding: 0.8rem 1rem;
  font-size: 1.2rem;
  font-weight: 700;
  font-family: "Courier New", monospace;
  text-align: center;
  outline: none;
  transition: all 200ms ease;
}

.input-wrapper.currency .input-lg {
  padding-left: 2rem;
}

.input-unit {
  position: absolute;
  right: 1rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 700;
  pointer-events: none;
}

.currency-symbol {
  position: absolute;
  left: 1rem;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--accent-color);
  z-index: 1;
}

.input-lg:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--zelda-gold) 30%, transparent);
}

.input-lg::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

.quick-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}

.btn-quick {
  padding: 0.5rem 0.3rem;
  font-size: 0.7rem;
  font-weight: 700;
  font-family: "Courier New", monospace;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-quick:hover {
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
  border-color: var(--accent-color);
  transform: translateY(-2px);
}

.result-card {
  background: var(--bg-primary);
  border: 2px solid var(--accent-color);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: inset 0 0 20px color-mix(in srgb, var(--zelda-gold) 10%, transparent);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed color-mix(in srgb, var(--accent-color) 30%, transparent);
  font-weight: 700;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.8rem;
}

.result-icon {
  font-size: 1rem;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.8rem;
}

.result-item {
  text-align: center;
}

.result-item.total {
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-end) 100%);
  padding: 0.5rem;
  border-radius: 6px;
  margin-top: -0.5rem;
}

.result-item.total .result-label,
.result-item.total .result-value {
  color: var(--btn-text, var(--bg-primary));
}

.result-label {
  display: block;
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.2rem;
}

.result-value {
  display: block;
  font-size: 1rem;
  font-weight: 900;
  color: var(--accent-color);
  font-family: "Courier New", monospace;
}

.result-value.highlight {
  color: var(--success-color);
}

.result-item.total .result-value {
  font-size: 1.2rem;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 2px dashed color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.btn-cancel,
.btn-save {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1rem;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-cancel:hover {
  background: var(--bg-primary);
  border-color: var(--accent-color);
}

.btn-save {
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 45%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
  box-shadow: 0 3px 0 var(--border-color);
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 0 var(--border-color), 0 0 15px color-mix(in srgb, var(--zelda-gold) 30%, transparent);
}

.btn-save:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 1px 0 var(--border-color);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 1rem;
}

@media (max-width: 520px) {
  .inputs-grid {
    grid-template-columns: 1fr;
  }
  
  .result-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .result-item.total {
    margin-top: 0;
  }
  
  .scale-decor {
    display: none;
  }
  
  .modal-card {
    padding: 1rem;
  }
  
  .header-icon {
    font-size: 2rem;
  }
}
</style>
