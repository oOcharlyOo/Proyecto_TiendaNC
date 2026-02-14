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
        <label>Producto</label>
        <input type="text" :value="producto?.nombre || ''" readonly>

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
        <button type="button" class="btn-secondary" @click="emit('close')">Cancelar</button>
        <button type="button" @click="confirmar">Agregar a Venta</button>
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
  padding: 1.2rem;
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
  font-size: 1rem;
  color: #f8d667;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 900;
  text-shadow: 2px 2px 0 #000;
}

.modal-header h3::before {
  content: "⚖️ ";
}

.modal-body {
  display: grid;
  gap: 0.7rem;
  position: relative;
}

.modal-body label {
  font-size: 0.72rem;
  color: #f6f2de;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: "Courier New", monospace;
}

.modal-body input[type="text"],
.modal-body input[type="number"] {
  width: 100%;
  background: #f2e8bf;
  border: 3px solid #2a1807;
  padding: 0.6rem 0.7rem;
  color: #1d1606;
  font-family: "Courier New", monospace;
  font-size: 1rem;
  font-weight: 600;
  outline: none;
  box-shadow: inset 0 0 0 2px #d4c27e;
}

.modal-body input[type="text"]:focus,
.modal-body input[type="number"]:focus {
  box-shadow: inset 0 0 0 2px #e1cc80, 0 0 0 3px #f8d667;
}

.modal-body input[type="text"] {
  background: #e8d9a8;
  cursor: not-allowed;
}

.inputs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
}

.input-block {
  display: grid;
  gap: 0.45rem;
}

.quick-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
}

.quick-buttons button {
  border: 2px solid #2a1807;
  padding: 0.35rem 0.25rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  background: linear-gradient(180deg, #e2deca 0%, #bdb696 100%);
  color: #1a1401;
  box-shadow: 0 2px 0 #6f4b1c;
  transition: transform 60ms steps(2), filter 60ms linear;
}

.quick-buttons button:hover {
  filter: brightness(1.08);
}

.quick-buttons button:active {
  transform: translateY(2px);
  box-shadow: none;
}

.result-card {
  border: 3px solid #2a1807;
  background: linear-gradient(180deg, #ffe48b 0%, #f8d667 50%, #e2b84f 100%);
  color: #1a1401;
  padding: 0.65rem;
  display: grid;
  gap: 0.15rem;
  box-shadow: inset 0 0 0 3px #ffeeb4, 0 4px 0 #6f4b1c;
}

.result-card p {
  font-size: 0.7rem;
  text-transform: uppercase;
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.03em;
  display: flex;
  justify-content: space-between;
}

.result-card p strong {
  font-family: "Courier New", monospace;
  font-size: 0.85rem;
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
  font-size: 0.72rem;
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
  background: linear-gradient(180deg, #9fd98a 0%, #5ab848 50%, #3d8a2f 100%);
  color: #0a2008;
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
  .inputs-grid {
    grid-template-columns: 1fr;
  }
}
</style>
