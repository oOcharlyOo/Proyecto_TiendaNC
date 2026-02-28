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
          <label>Codigo de Barras / PIN</label>
          <div class="barcode-row">
            <input v-model="form.codigoBarras" type="text" placeholder="750000000001">
            <button type="button" class="btn-secondary" @click="emit('scan')">Escanear</button>
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

          <label>Cantidad minima</label>
          <input v-model.number="form.cantidad_min" type="number" min="0" required>

          <label>Cantidad maxima</label>
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
        <button v-if="props.data?.idProducto" type="button" class="btn-danger" @click="$emit('delete')">
          Eliminar
        </button>
        <button type="button" class="btn-secondary" @click="$emit('close')">
          Cancelar
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
  background: rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.modal-card {
  width: min(100%, 640px);
  background: var(--bg-panel);
  border: 2px solid var(--border-color);
  box-shadow: 0 8px 24px var(--shadow-color);
  padding: 1.5rem;
  max-height: 86vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
}

.modal-header {
  padding-bottom: 0.4rem;
  margin-bottom: 0.8rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--accent-color);
  font-weight: 600;
}

.modal-header p {
  margin: 0.2rem 0 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.modal-scroll {
  overflow: auto;
  padding-right: 0.2rem;
}

.modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

.modal-grid label {
  grid-column: span 2;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  font-weight: 500;
}

.modal-grid input[type="text"],
.modal-grid input[type="number"] {
  grid-column: span 2;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  padding: 0.6rem 0.7rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  border-radius: 6px;
}

.modal-grid input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.2);
}

.barcode-row {
  grid-column: span 2;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
}

.barcode-row button {
  padding: 0.5rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
}

.check-row {
  grid-column: span 2;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
}

.check-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--accent-color);
  cursor: pointer;
}

.modal-actions {
  grid-column: span 2;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.modal-actions button {
  padding: 0.6rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  border: 1px solid transparent;
}

.modal-actions button:first-child {
  background: var(--accent-color);
  color: #fff;
}

.modal-actions button:first-child:hover {
  background: var(--accent-hover);
}

.modal-actions button.btn-danger {
  background: var(--error-color);
  color: #fff;
}

.modal-actions button.btn-danger:hover {
  filter: brightness(1.1);
}

.modal-actions button.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.modal-actions button.btn-secondary:hover {
  background: var(--bg-panel);
}

.modal-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
