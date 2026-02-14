<script setup lang="ts">
import { computed, watch, ref } from 'vue';

type ProductoPayload = {
  idProducto?: number;
  nombre: string;
  stock: number;
  codigoBarras: string | null;
  precio_costo: number;
  precio_venta: number;
  cantidad_min: number;
  cantidad_max: number;
  precio_mayoreo: number | null;
  is_gramaje: boolean;
};

const props = defineProps<{
  open: boolean;
  data?: ProductoPayload;
  loading?: boolean;
  prefillCode?: string;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'submit', payload: ProductoPayload): void;
  (event: 'delete'): void;
  (event: 'scan'): void;
}>();

const form = ref<ProductoPayload>({
  nombre: '',
  stock: 0,
  codigoBarras: '',
  precio_costo: 0,
  precio_venta: 0,
  cantidad_min: 0,
  cantidad_max: 0,
  precio_mayoreo: null,
  is_gramaje: false
});

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    setFormFromData();
  },
  { immediate: true }
);

watch(
  () => props.prefillCode,
  (value) => {
    if (!props.open || !value) return;
    form.value.codigoBarras = value.trim();
  }
);

function setFormFromData() {
  const source = props.data;
  if (!source) {
  form.value = {
    nombre: '',
    stock: 0,
    codigoBarras: props.prefillCode?.trim() || '',
    precio_costo: 0,
    precio_venta: 0,
    cantidad_min: 0,
    cantidad_max: 0,
    precio_mayoreo: null,
    is_gramaje: false
  };
    return;
  }

  form.value = {
    idProducto: source.idProducto,
    nombre: source.nombre,
    stock: Number(source.stock || 0),
    codigoBarras: (source.codigoBarras ?? props.prefillCode?.trim()) || '',
    precio_costo: Number(source.precio_costo || 0),
    precio_venta: Number(source.precio_venta || 0),
    cantidad_min: Number(source.cantidad_min || 0),
    cantidad_max: Number(source.cantidad_max || 0),
    precio_mayoreo: source.precio_mayoreo ?? null,
    is_gramaje: Boolean(source.is_gramaje)
  };
}

function handleSubmit() {
  emit('submit', {
    ...form.value,
    codigoBarras: form.value.codigoBarras?.trim() || null,
    nombre: form.value.nombre.trim()
  });
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <section class="modal-card">
      <header class="modal-header">
        <h3>{{ props.data?.idProducto ? `Modificar Producto #${props.data.idProducto}` : 'Agregar Nuevo Producto' }}</h3>
        <p>Completa la ficha y guarda el registro.</p>
      </header>

      <div class="modal-scroll">
        <div class="modal-grid">
          <label>Código de Barras / PIN</label>
          <div class="barcode-row">
            <input v-model="form.codigoBarras" type="text" placeholder="750000000001">
            <button type="button" class="btn-secondary" @click="emit('scan')">📷 Escanear</button>
          </div>

          <label>Nombre</label>
          <input v-model="form.nombre" type="text" required>

          <label>{{ form.is_gramaje ? 'Precio de venta (kg)' : 'Precio de venta ($)' }}</label>
          <input v-model.number="form.precio_venta" type="number" step="0.01" min="0" required>

          <label>Precio de mayoreo</label>
          <input v-model.number="form.precio_mayoreo" type="number" step="0.01" min="0">

          <label>{{ form.is_gramaje ? 'Precio de costo (kg)' : 'Precio de costo ($)' }}</label>
          <input v-model.number="form.precio_costo" type="number" step="0.01" min="0" required>

          <label>{{ form.is_gramaje ? 'Stock (gramos)' : 'Stock' }}</label>
          <input v-model.number="form.stock" type="number" min="0" required>

          <label>Cantidad mínima</label>
          <input v-model.number="form.cantidad_min" type="number" min="0" required>

          <label>Cantidad máxima</label>
          <input v-model.number="form.cantidad_max" type="number" min="0" required>

          <label class="check-row">
            <input v-model="form.is_gramaje" type="checkbox">
            Usa gramaje
          </label>
        </div>
      </div>

      <footer class="modal-actions">
        <button type="button" :disabled="props.loading" @click="handleSubmit">
          {{ props.loading ? 'Guardando...' : props.data?.idProducto ? 'Actualizar' : 'Guardar' }}
        </button>
        <button v-if="props.data?.idProducto" type="button" class="btn-danger" @click="$emit('delete')">Eliminar</button>
        <button type="button" class="btn-secondary" @click="$emit('close')">Cancelar</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.modal-grid label {
  grid-column: span 2;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: var(--pixel-paper);
  letter-spacing: 0.1em;
  font-family: "Courier New", monospace;
}

.modal-grid input[type="text"],
.modal-grid input[type="number"] {
  grid-column: span 2;
  background: #f2e8bf;
  border: 3px solid #2a1807;
  padding: 0.55rem 0.65rem;
  color: #1d1606;
  font-family: "Courier New", monospace;
  font-size: 0.9rem;
  outline: none;
  box-shadow: inset 0 0 0 2px #d4c27e;
}

.modal-grid input:focus {
  box-shadow: inset 0 0 0 2px #e1cc80, 0 0 0 2px var(--pixel-gold);
}

.barcode-row {
  grid-column: span 2;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
}

.barcode-row button {
  border: 2px solid #2a1807;
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  color: var(--pixel-ink);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 2px 0 #6f4b1c;
  padding: 0.5rem 0.7rem;
}

.barcode-row button:hover {
  filter: brightness(1.08);
}

.barcode-row button:active {
  transform: translateY(1px);
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 1px 0 #6f4b1c;
}

.check-row {
  grid-column: span 2;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--pixel-paper);
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
}

.check-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--pixel-gold);
}

.modal-actions {
  grid-column: span 2;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 2px solid rgba(248, 214, 103, 0.3);
}

.modal-actions button {
  border: 3px solid #2a1807;
  padding: 0.6rem 1rem;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 3px 0 #6f4b1c, 0 5px 8px rgba(0, 0, 0, 0.3);
}

.modal-actions button:first-child {
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  color: var(--pixel-ink);
}

.modal-actions button.btn-danger {
  background: linear-gradient(180deg, #e88b8b 0%, #c94f4f 50%, #a32d2d 100%);
  color: #fff;
  box-shadow: inset 0 0 0 2px #ffb4b4, 0 3px 0 #6f2025, 0 5px 8px rgba(0, 0, 0, 0.3);
}

.modal-actions button.btn-secondary {
  background: linear-gradient(180deg, #e2deca 0%, #bdb696 100%);
  color: var(--pixel-ink);
}

.modal-actions button:hover {
  filter: brightness(1.08);
}

.modal-actions button:active {
  transform: translateY(2px);
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 1px 0 #6f4b1c;
}

.modal-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

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
  width: min(100%, 640px);
  background: linear-gradient(180deg, var(--pixel-forest) 0%, var(--pixel-forest-dark) 100%);
  border: 4px solid var(--pixel-gold);
  box-shadow: 
    0 0 0 4px #2f1f09,
    0 14px 0 #271c0f,
    0 20px 28px rgba(0, 0, 0, 0.5);
  padding: 1.5rem;
  max-height: 86vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-card::before {
  content: '';
  position: absolute;
  inset: 12px;
  border: 2px dashed rgba(250, 217, 103, 0.5);
  pointer-events: none;
}

.modal-scroll {
  overflow: auto;
  padding-right: 0.2rem;
  display: grid;
  gap: 0.65rem;
}

.modal-card .modal-header {
  position: relative;
  padding-bottom: 0.4rem;
  margin-bottom: 0.8rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.modal-card .modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--pixel-gold);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-weight: 900;
  text-shadow: 2px 2px 0 #000;
}

.modal-card .modal-header p {
  margin: 0.2rem 0 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

@media (max-width: 600px) {
  .modal-grid {
    grid-template-columns: 1fr;
  }
  .modal-grid label,
  .modal-grid input,
  .barcode-row {
    grid-column: span 1;
  }
}
</style>
