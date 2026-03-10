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
    <section class="modal-card panel">
      <header class="modal-header">
        <h3>Calculadora de Gramaje</h3>
      </header>

      <div class="modal-body">
        <div class="form-group">
          <label>Producto</label>
          <input type="text" :value="producto?.nombre || ''" readonly>
        </div>

        <div class="inputs-grid">
          <section class="input-block">
            <label>Gramaje a vender (g)</label>
            <input
              v-model.number="gramos"
              class="input-lg"
              type="number"
              min="0"
              step="10"
              placeholder="0"
              @input="recalcularDesdeGramos"
            >

            <div class="quick-buttons">
              <button type="button" class="btn-secondary" @click="setGramaje(250)">250g</button>
              <button type="button" class="btn-secondary" @click="setGramaje(500)">500g</button>
              <button type="button" class="btn-secondary" @click="setGramaje(1000)">1kg</button>
            </div>
          </section>

          <section class="input-block">
            <label>Total a cobrar</label>
            <input
              v-model.number="precioTotal"
              class="input-lg"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              @input="recalcularDesdeTotal"
            >

            <div class="quick-buttons">
              <button type="button" class="btn-secondary" @click="setTotalRapido(5)">$5</button>
              <button type="button" class="btn-secondary" @click="setTotalRapido(10)">$10</button>
              <button type="button" class="btn-secondary" @click="setTotalRapido(20)">$20</button>
            </div>
          </section>
        </div>

        <div class="result-card">
          <p>Precio por kilo: <strong>{{ precioPorKilo.toFixed(2) }}</strong></p>
          <p>Gramaje: <strong>{{ Number(gramos || 0) }} g</strong></p>
          <p>Total: <strong>{{ Number(precioTotal || 0).toFixed(2) }}</strong></p>
        </div>
      </div>

      <footer class="modal-actions">
        <button type="button" class="btn-cancel" @click="emit('close')">
          <span class="btn-icono">✕</span>
          <span class="btn-texto">Cancelar</span>
        </button>
        <button type="button" class="btn-save" @click="confirmar">
          <span class="btn-icono">➕</span>
          <span class="btn-texto">Agregar</span>
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
  display: grid;
  place-items: center;
  padding: 1rem;
  background: var(--shadow-color);
  backdrop-filter: blur(4px);
}

.modal-card {
  width: min(100%, 480px);
  background: var(--bg-panel);
  border: var(--border-width-thick) solid var(--accent-color);
  box-shadow: 0 20px 40px var(--shadow-color);
  padding: 1.5rem;
  display: grid;
  gap: 1rem;
  position: relative;
  animation: popIn 200ms ease-out;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-card::before {
  content: "";
  position: absolute;
  inset: 12px;
  border: 2px dashed color-mix(in srgb, var(--accent-color) 20%, transparent);
  pointer-events: none;
  border-radius: 8px;
}

.modal-header {
  border-bottom: 1px dashed color-mix(in srgb, var(--accent-color) 30%, transparent);
  padding-bottom: 0.75rem;
  text-align: center;
}

.modal-header h3 {
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-shadow: 2px 2px 0 var(--border-color);
}

.modal-body {
  display: grid;
  gap: 1rem;
}

.modal-body label {
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.modal-body input {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: var(--border-width) solid var(--border-color);
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

.quick-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}

.quick-buttons button {
  padding: 0.4rem 0.2rem;
  font-size: 0.7rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.result-card {
  background: var(--bg-primary);
  border: var(--border-width) solid var(--accent-color);
  padding: 1rem;
  border-radius: 8px;
}

.result-card p {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin: 0.2rem 0;
}

.result-card p strong {
  color: var(--accent-color);
  font-size: 1rem;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px dashed color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.btn-cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-save {
  background: var(--success-color);
  color: var(--bg-primary);
  border: var(--border-width) solid var(--border-color);
}

@media (max-width: 520px) {
  .inputs-grid { grid-template-columns: 1fr; }
}
</style>
