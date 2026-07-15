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
  position: fixed; inset: 0;
  background: rgba(0,0,0,.4);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 300;
  animation: calcFadeIn .25s ease;
}
@keyframes calcFadeIn{from{opacity:0}to{opacity:1}}

.scale-modal {
  width: min(94%, 390px);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.scale-decor { display:flex; flex-direction:column; align-items:center; width:100% }
.scale-decor.top { margin-bottom:-26px; z-index:1 }
.scale-decor.bottom { display:none }

.scale-string {
  width: 3px; height: 28px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 70%, #fff) 0%, var(--color-accent) 40%, color-mix(in srgb, var(--color-accent) 60%, #000) 100%);
  border-radius: 2px;
  box-shadow: 2px 0 3px rgba(0,0,0,.2);
}

.scale-pan {
  width: 120px; height: 42px;
  border-radius: 0 0 100px 100px;
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--color-accent) 85%, #fff) 0%,
    var(--color-accent) 20%,
    color-mix(in srgb, var(--color-accent) 70%, #000) 100%);
  box-shadow:
    inset 0 -4px 8px rgba(0,0,0,.3),
    0 6px 12px rgba(0,0,0,.25),
    0 1px 0 color-mix(in srgb, var(--color-accent) 60%, #fff);
}

.scale-modal .modal-card {
  width: 100%;
  background: var(--color-bg-secondary);
  border-radius: 18px;
  animation: calcPopIn .25s ease-out;
  box-shadow:
    10px 10px 30px rgba(0,0,0,.4),
    -6px -6px 20px rgba(255,255,255,.04),
    inset 0 1px 0 rgba(255,255,255,.04);
  overflow: hidden;
  position: relative;
}

@keyframes calcPopIn{from{opacity:0;transform:translateY(10px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}

.modal-glow {
  position:absolute; inset:12px; pointer-events:none; border-radius:8px;
  box-shadow: inset 0 0 40px color-mix(in srgb, var(--color-accent) 12%, transparent);
}

.scale-modal .modal-header {
  text-align: center;
  padding: 1rem 1rem .7rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
  box-shadow: 0 1px 0 rgba(255,255,255,.03);
  position: relative;
}

.scale-modal .header-icon {
  display: inline-flex; align-items:center; justify-content:center;
  width: 48px; height: 48px;
  margin-bottom: .4rem;
  font-size: 1.7rem;
  background: var(--color-bg-primary);
  border-radius: 50%;
  box-shadow: inset 2px 2px 5px rgba(0,0,0,.15), 3px 3px 6px rgba(0,0,0,.08);
}

.scale-modal .modal-header h3 {
  color: var(--color-text-primary);
  font-size: 1.05rem; margin:0; font-weight:700;
  letter-spacing: .02em;
}

.scale-modal .modal-header p {
  color: var(--color-text-secondary);
  font-size: .7rem; margin:.2rem 0 0; opacity:.8;
}

.scale-modal .modal-body {
  padding: .85rem 1rem 1rem;
  display: flex; flex-direction:column; gap:.65rem;
}

.scale-modal .form-group { display:flex; flex-direction:column; gap:.3rem }
.scale-modal .form-group label {
  color: var(--color-text-secondary); font-size:.7rem; font-weight:600;
  text-transform: uppercase; letter-spacing: .04em;
}

.scale-modal .product-name {
  display:flex; align-items:center; gap:.4rem;
  padding: .55rem .65rem;
  background: var(--color-bg-primary);
  border-radius: 8px;
  font-size: .82rem; font-weight: 500;
  box-shadow: inset 3px 3px 6px rgba(0,0,0,.12), 0 0 0 1px rgba(255,255,255,.02);
}

.scale-modal .product-icon { font-size:.95rem; opacity:.7 }

.scale-modal .inputs-grid {
  display:grid; grid-template-columns:1fr 1fr; gap:.55rem;
}

.scale-modal .input-block { display:flex; flex-direction:column; gap:.3rem }
.scale-modal .input-block label {
  color: var(--color-text-secondary); font-size:.7rem; font-weight:600;
  text-transform: uppercase; letter-spacing:.04em;
}

.scale-modal .input-wrapper {
  display:flex; align-items:center;
  background: var(--color-bg-primary);
  border-radius: 8px; overflow:hidden;
  box-shadow:
    inset 3px 3px 6px rgba(0,0,0,.15),
    inset -1px -1px 2px rgba(255,255,255,.03);
  transition: box-shadow .2s;
}

.scale-modal .input-wrapper:focus-within {
  box-shadow:
    inset 3px 3px 8px rgba(0,0,0,.2),
    0 0 0 2px var(--color-accent);
}

.scale-modal .input-lg {
  flex:1; padding:.55rem .6rem;
  background:transparent; border:none;
  color:var(--color-text-primary); font-size:1rem; font-weight:600;
  outline:none; width:100%;
}

.scale-modal .input-lg::placeholder{color:var(--color-text-secondary);opacity:.5}

.scale-modal .input-unit {
  padding:0 .55rem; color:var(--color-text-secondary);
  font-weight:500; font-size:.82rem;
}

.scale-modal .input-wrapper.currency{padding-left:.2rem}

.scale-modal .currency-symbol {
  padding:0 .1rem 0 .55rem;
  color:var(--color-success); font-weight:700; font-size:1rem;
}

.scale-modal .quick-buttons{display:flex;gap:.3rem;margin-top:.1rem}

.scale-modal .btn-quick {
  flex:1; padding:.35rem .1rem;
  background: var(--color-bg-secondary);
  border:none; border-radius:7px;
  color:var(--color-text-secondary); font-size:.64rem; font-weight:600;
  cursor:pointer; transition:all .18s;
  box-shadow: 3px 3px 6px rgba(0,0,0,.12), -1px -1px 3px rgba(255,255,255,.03);
}

.scale-modal .btn-quick:hover {
  transform: translateY(-1px);
  box-shadow: 5px 5px 10px rgba(0,0,0,.18), -2px -2px 5px rgba(255,255,255,.04);
  background: var(--color-accent);
  color: var(--color-on-brand);
}

.scale-modal .btn-quick:active {
  transform: translateY(1px);
  box-shadow: inset 2px 2px 4px rgba(0,0,0,.2);
}

.scale-modal .precio-kilo-info {
  display:flex; justify-content:center; align-items:center; gap:.5rem;
  padding:.6rem;
  background: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: inset 3px 3px 6px rgba(0,0,0,.1), 0 0 0 1px rgba(255,255,255,.02);
}

.scale-modal .precio-kilo-label {
  color:var(--color-text-secondary); font-size:.72rem; font-weight:500;
}

.scale-modal .precio-kilo-value {
  color:var(--color-accent); font-weight:700; font-size:.95rem;
  text-shadow: 0 1px 0 rgba(0,0,0,.1);
}

.scale-modal .modal-actions{display:flex;gap:.55rem;margin-top:.3rem}

.scale-modal .btn-secondary,
.scale-modal .btn-primary {
  flex:1; padding:.7rem .5rem; border-radius:10px;
  font-size:.82rem; font-weight:700; cursor:pointer;
  transition:all .18s; border:none; letter-spacing:.03em;
}

.scale-modal .btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  box-shadow: 4px 4px 8px rgba(0,0,0,.15), -2px -2px 5px rgba(255,255,255,.03);
}

.scale-modal .btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 6px 6px 14px rgba(0,0,0,.22), -3px -3px 8px rgba(255,255,255,.04);
  color: var(--color-text-primary);
}

.scale-modal .btn-secondary:active {
  transform: translateY(1px);
  box-shadow: inset 2px 2px 5px rgba(0,0,0,.18), 1px 1px 3px rgba(0,0,0,.05);
}

.scale-modal .btn-primary {
  background: linear-gradient(145deg,
    color-mix(in srgb, var(--color-accent) 90%, #fff) 0%,
    var(--color-accent) 40%,
    color-mix(in srgb, var(--color-accent) 75%, #000) 100%);
  color: var(--color-on-brand);
  box-shadow:
    4px 4px 10px rgba(0,0,0,.2),
    -1px -1px 4px rgba(255,255,255,.04),
    inset 0 1px 0 rgba(255,255,255,.1);
}

.scale-modal .btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow:
    7px 7px 16px rgba(0,0,0,.28),
    -3px -3px 8px rgba(255,255,255,.05),
    inset 0 1px 0 rgba(255,255,255,.15);
}

.scale-modal .btn-primary:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow:
    inset 3px 3px 8px rgba(0,0,0,.25),
    2px 2px 4px rgba(0,0,0,.1);
}

.scale-modal .btn-primary:disabled {
  opacity:.4; cursor:not-allowed; transform:none;
  box-shadow: 2px 2px 4px rgba(0,0,0,.08);
}

.loading-indicator {
  text-align:center; padding:.7rem;
  color:var(--color-text-secondary);
  font-size:.75rem; font-weight:500;
  animation: calcPulse 1.2s ease-in-out infinite;
}

@keyframes calcPulse {
  0%,100%{opacity:.4} 50%{opacity:1}
}

@media(max-width:480px){
  .scale-modal{width:95vw}
  .scale-pan{width:90px;height:34px}
  .scale-string{height:20px}
  .scale-decor.top{margin-bottom:-20px}
  .scale-modal .modal-card{border-radius:14px}
  .scale-modal .modal-header{padding:.8rem .7rem .55rem}
  .scale-modal .modal-body{padding:.7rem .8rem}
  .scale-modal .inputs-grid{grid-template-columns:1fr;gap:.45rem}
  .scale-modal .modal-header h3{font-size:.95rem}
  .scale-modal .header-icon{width:40px;height:40px;font-size:1.4rem}
  .scale-modal .input-lg{font-size:.9rem;padding:.48rem .5rem}
  .scale-modal .btn-quick{font-size:.6rem}
  .scale-modal .btn-secondary,.scale-modal .btn-primary{font-size:.78rem;padding:.6rem .4rem}
}

</style>

