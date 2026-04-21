<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

type ProductoGramaje = {
  id: number;
  nombre: string;
  precio: number;
  codigo_barras: string;
};

const props = defineProps<{
  open: boolean;
  producto: ProductoGramaje | null;
  isEditing?: boolean;
  cantidadInicial?: number;
  precioInicial?: number;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'add', payload: { gramos: number; precioTotal: number }): void;
}>();

const gramos = ref<number | null>(null);
const precioTotal = ref<number | null>(null);
const precioPorKilo = ref<number>(0);
const loading = ref(false);

watch(
  () => props.open,
  async (abierto) => {
    if (!abierto) return;
    gramos.value = null;
    precioTotal.value = null;
    
    if (props.isEditing && props.cantidadInicial && props.precioInicial) {
      gramos.value = props.cantidadInicial;
      precioTotal.value = props.cantidadInicial * props.precioInicial;
    }
  }
);

watch(() => props.producto, async (prod) => {
  if (prod?.precio) {
    precioPorKilo.value = prod.precio;
  }
  
  if (prod?.id && props.open) {
    await cargarPrecioPorKilo(prod.id);
  }
}, { immediate: true });

async function cargarPrecioPorKilo(idProducto: number) {
  loading.value = true;
  try {
    const respuesta = await fetch(`${API_BASE}/ventasDetalle/calcularGramaje`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idProducto: idProducto,
        cantidad: 0,
        tipoInput: 'GRAMOS'
      })
    });
    const res = await respuesta.json();
    
    if (res?.datos?.precioPorKilo) {
      precioPorKilo.value = Number(res.datos.precioPorKilo);
    }
  } catch (e) {
    console.error('Error al cargar precio por kilo:', e);
  } finally {
    loading.value = false;
  }
}

function recalcularDesdeGramos() {
  const nuevoGramaje = Number(gramos.value ?? 0);
  if (nuevoGramaje <= 0 || precioPorKilo.value <= 0) {
    precioTotal.value = null;
    return;
  }
  precioTotal.value = Number(((nuevoGramaje / 1000) * precioPorKilo.value).toFixed(2));
}

function recalcularDesdeTotal() {
  const nuevoTotal = Number(precioTotal.value ?? 0);
  if (nuevoTotal <= 0 || precioPorKilo.value <= 0) {
    gramos.value = null;
    return;
  }
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

function onGramosChange() {
  recalcularDesdeGramos();
}

function onTotalChange() {
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
          <h3>{{ isEditing ? 'Editar Gramaje' : 'Calculadora de Gramaje' }}</h3>
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

          <div v-if="loading" class="loading-indicator">
            Calculando...
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
                  @input="onGramosChange"
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
                  step="1"
                  placeholder="0"
                  @input="onTotalChange"
                >
              </div>

              <div class="quick-buttons">
                <button type="button" class="btn-quick" @click="setTotalRapido(10)">$10</button>
                <button type="button" class="btn-quick" @click="setTotalRapido(20)">$20</button>
                <button type="button" class="btn-quick" @click="setTotalRapido(30)">$30</button>
              </div>
            </section>
          </div>

          <div v-if="precioPorKilo > 0" class="precio-kilo-info">
            <span class="precio-kilo-label">Precio por kilo:</span>
            <span class="precio-kilo-value">${{ precioPorKilo }}</span>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="emit('close')">
              Cancelar
            </button>
            <button 
              type="button" 
              class="btn-primary" 
              :disabled="!gramos || !precioTotal || loading"
              @click="confirmar"
            >
              {{ isEditing ? 'Actualizar' : 'Agregar' }}
            </button>
          </div>
        </div>
      </div>

      <div class="scale-decor bottom">
        <span class="scale-pan"></span>
        <span class="scale-string"></span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: var(--shadow-color);
  backdrop-filter: blur(4px);
}

.scale-modal {
  width: min(100%, 420px);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.scale-decor {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.scale-decor.top {
  margin-bottom: -30px;
  z-index: 1;
}

.scale-decor.bottom {
  margin-top: -30px;
  transform: rotate(180deg);
}

.scale-string {
  width: 4px;
  height: 40px;
  background: linear-gradient(180deg, var(--accent-color) 0%, var(--border-color) 100%);
}

.scale-pan {
  width: 200px;
  height: 60px;
  border-radius: 0 0 100px 100px;
  background: linear-gradient(180deg, var(--accent-color) 0%, var(--bg-secondary) 100%);
  border: 3px solid var(--accent-color);
  border-top: none;
  box-shadow: 0 4px 12px var(--shadow-color);
}

.scale-modal .modal-card {
  width: 100%;
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border: 4px solid var(--accent-color);
  border-radius: 12px;
  box-shadow: 0 10px 40px var(--shadow-color);
  overflow: hidden;
  position: relative;
}

.modal-glow {
  position: absolute;
  inset: 12px;
  pointer-events: none;
  border-radius: 8px;
  box-shadow: inset 0 0 30px color-mix(in srgb, var(--accent-color) 15%, transparent);
}

.scale-modal .modal-header {
  text-align: center;
  padding: 1.5rem 1rem 1rem;
  border-bottom: 1px dashed color-mix(in srgb, var(--accent-color) 30%, transparent);
  position: relative;
}

.scale-modal .header-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.scale-modal .modal-header h3 {
  color: var(--accent-color);
  font-family: 'HyliaSerif', 'Palatino Linotype', serif;
  font-size: 1.5rem;
  margin: 0;
  text-shadow: 2px 2px 0 var(--border-color);
}

.scale-modal .modal-header p {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0.25rem 0 0;
}

.scale-modal .modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.scale-modal .form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scale-modal .form-group label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.scale-modal .product-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-weight: 500;
}

.scale-modal .product-icon {
  font-size: 1.25rem;
}

.scale-modal .inputs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.scale-modal .input-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scale-modal .input-block label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.scale-modal .input-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 150ms;
}

.scale-modal .input-wrapper:focus-within {
  border-color: var(--accent-color);
  box-shadow: 0 0 10px color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.scale-modal .input-lg {
  flex: 1;
  padding: 0.75rem;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 600;
  outline: none;
  width: 100%;
}

.scale-modal .input-lg::placeholder {
  color: var(--text-secondary);
}

.scale-modal .input-lg:focus {
  outline: none;
}

.scale-modal .input-unit {
  padding: 0 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.scale-modal .input-wrapper.currency {
  padding-left: 0.5rem;
}

.scale-modal .currency-symbol {
  padding: 0 0.25rem 0 0.75rem;
  color: var(--success-color);
  font-weight: 600;
  font-size: 1.25rem;
}

.scale-modal .quick-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.scale-modal .btn-quick {
  flex: 1;
  padding: 0.5rem 0.25rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 150ms;
}

.scale-modal .btn-quick:hover {
  background: var(--accent-color);
  color: var(--bg-primary);
  border-color: var(--accent-color);
}

.scale-modal .precio-kilo-info {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 1px dashed var(--border-color);
  border-radius: 8px;
}

.scale-modal .precio-kilo-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.scale-modal .precio-kilo-value {
  color: var(--accent-color);
  font-weight: 600;
  font-size: 1rem;
}

.scale-modal .modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.scale-modal .btn-secondary,
.scale-modal .btn-primary {
  flex: 1;
  padding: 0.875rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;
  border: 2px solid;
}

.scale-modal .btn-secondary {
  background: transparent;
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.scale-modal .btn-secondary:hover {
  background: var(--bg-secondary);
  border-color: var(--text-secondary);
}

.scale-modal .btn-primary {
  background: linear-gradient(180deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 80%, black) 100%);
  border-color: var(--accent-color);
  color: var(--bg-primary);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.scale-modal .btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--accent-color) 40%, transparent);
}

.scale-modal .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.loading-indicator {
  text-align: center;
  padding: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

@media (max-width: 480px) {
  .scale-modal .inputs-grid {
    grid-template-columns: 1fr;
  }
  
  .scale-modal .quick-buttons {
    flex-wrap: wrap;
  }
  
  .scale-modal .btn-quick {
    min-width: calc(33% - 0.5rem);
  }
}
</style>