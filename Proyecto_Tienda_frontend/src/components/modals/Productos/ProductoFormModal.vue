<script setup lang="ts">
import { computed, watch, ref } from 'vue';

type CategoriaDTO = {
  idCategoria: number;
  nombre: string;
  descripcion?: string | null;
};

type SubcategoriaDTO = {
  idSubcategoria: number;
  nombre: string;
  descripcion?: string | null;
  idCategoria: number | null;
};

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
  idCategoria?: number;
  idSubcategoria?: number | null;
  requiere_envase?: boolean;
  precio_envase?: number;
};

const props = defineProps<{
  open: boolean;
  data?: ProductoPayload;
  loading?: boolean;
  prefillCode?: string;
  categorias?: CategoriaDTO[];
  subcategorias?: SubcategoriaDTO[];
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
  is_gramaje: false,
  idCategoria: 1,
  idSubcategoria: null,
  requiere_envase: false,
  precio_envase: 0
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

watch(
  () => form.value.idCategoria,
  () => {
    form.value.idSubcategoria = null;
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
    is_gramaje: false,
    idCategoria: 1,
    idSubcategoria: null,
    requiere_envase: false,
    precio_envase: 0
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
    is_gramaje: Boolean(source.is_gramaje),
    idCategoria: source.idCategoria || 1,
    idSubcategoria: source.idSubcategoria ?? null,
    requiere_envase: Boolean(source.requiere_envase),
    precio_envase: Number(source.precio_envase || 0)
  };
}

function handleSubmit() {
  emit('submit', {
    ...form.value,
    codigoBarras: form.value.codigoBarras?.trim() || null,
    nombre: form.value.nombre.trim()
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0));
}

const subcategoriasFiltradas = computed(() => {
  if (!form.value.idCategoria) return [];
  return (props.subcategorias || []).filter(s => s.idCategoria === form.value.idCategoria);
});

const esCategoriaGaming = computed(() => {
  if (!form.value.idCategoria || !props.categorias) return false;
  const cat = props.categorias.find(c => c.idCategoria === form.value.idCategoria);
  return cat ? cat.nombre.toLowerCase() === 'gaming' : false;
});
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <section class="modal-card">
      <header class="modal-header">
        <h3>{{ props.data?.idProducto ? `✏️ Editar Producto #${props.data.idProducto}` : '➕ Nuevo Producto' }}</h3>
        <p>{{ props.data?.idProducto ? 'Modifica los datos del producto' : 'Completa la información del nuevo producto' }}</p>
      </header>

      <div class="modal-scroll">
        <div class="form-section">
          <h4 class="section-title">📋 Identificación</h4>
          <div class="modal-grid">
            <label>Código de Barras / PIN</label>
            <div class="barcode-row">
              <input v-model="form.codigoBarras" type="text" placeholder="750000000001" class="input-field">
              <button type="button" class="btn-scan" @click="emit('scan')">
                <span>📷</span>
                <span>Escanear</span>
              </button>
            </div>

            <label>Nombre del producto <span class="required">*</span></label>
            <input v-model="form.nombre" type="text" required placeholder="Ej: Chocolate Ferrero" class="input-field">

            <label>Categoría</label>
            <select v-model="form.idCategoria" class="input-field select-field">
              <option v-for="cat in props.categorias" :key="cat.idCategoria" :value="cat.idCategoria">
                {{ cat.nombre }}
              </option>
            </select>

            <label>Subcategoría</label>
            <select v-model="form.idSubcategoria" class="input-field select-field">
              <option :value="null">Sin subcategoría</option>
              <option v-for="sub in subcategoriasFiltradas" :key="sub.idSubcategoria" :value="sub.idSubcategoria">
                {{ sub.nombre }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-section">
          <h4 class="section-title">💰 Precios</h4>
          <div class="modal-grid prices-grid">
            <div class="price-field">
              <label>{{ form.is_gramaje ? 'Precio venta (kg)' : 'Precio venta ($)' }} <span class="required">*</span></label>
              <input v-model.number="form.precio_venta" type="number" step="0.01" min="0" required class="input-field">
            </div>
            <div class="price-field">
              <label>Precio mayoreo ($)</label>
              <input v-model.number="form.precio_mayoreo" type="number" step="0.01" min="0" placeholder="Opcional" class="input-field">
            </div>
            <div class="price-field">
              <label>{{ form.is_gramaje ? 'Precio costo (kg)' : 'Precio costo ($)' }} <span class="required">*</span></label>
              <input v-model.number="form.precio_costo" type="number" step="0.01" min="0" required class="input-field">
            </div>
            <div class="price-field highlight">
              <label>Ganancia unitaria</label>
              <span class="calculated-value" :class="{ positive: (form.precio_venta - form.precio_costo) > 0, negative: (form.precio_venta - form.precio_costo) < 0 }">
                {{ formatCurrency(form.precio_venta - form.precio_costo) }}
              </span>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4 class="section-title">📦 Inventario</h4>
          <div class="modal-grid inventory-grid">
            <div class="stock-field" v-if="!esCategoriaGaming">
              <label>{{ form.is_gramaje ? 'Stock actual (gramos)' : 'Stock actual (unidades)' }} <span class="required">*</span></label>
              <input v-model.number="form.stock" type="number" min="0" required class="input-field stock-input">
            </div>
            <div v-else class="stock-field rentable-info">
              <label>Stock</label>
              <span class="rentable-label">🎮 Producto Rentable (no maneja inventario)</span>
            </div>
            <div class="stock-field" v-if="!esCategoriaGaming">
              <label>Cantidad mínima <span class="required">*</span></label>
              <input v-model.number="form.cantidad_min" type="number" min="0" required class="input-field">
            </div>
            <div class="stock-field" v-if="!esCategoriaGaming">
              <label>Cantidad máxima <span class="required">*</span></label>
              <input v-model.number="form.cantidad_max" type="number" min="0" required class="input-field">
            </div>
            <div class="stock-field checkbox-field">
              <label class="check-row">
                <input v-model="form.is_gramaje" type="checkbox" class="checkbox-input">
                <span class="checkbox-custom"></span>
                <span class="checkbox-label">Usa gramaje <span class="hint">(peso en gramos)</span></span>
              </label>
            </div>
            <div class="stock-field checkbox-field">
              <label class="check-row">
                <input v-model="form.requiere_envase" type="checkbox" class="checkbox-input">
                <span class="checkbox-custom"></span>
                <span class="checkbox-label">Requiere envase <span class="hint">(cobro adicional)</span></span>
              </label>
            </div>
            <div v-if="form.requiere_envase" class="stock-field">
              <label>Precio del envase ($) <span class="required">*</span></label>
              <input v-model.number="form.precio_envase" type="number" step="0.01" min="0" required class="input-field">
            </div>
          </div>
        </div>
      </div>

      <footer class="modal-actions">
        <button type="button" class="btn-primary" :disabled="props.loading" @click="handleSubmit">
          <span class="btn-icono">{{ props.loading ? '⏳' : '💾' }}</span>
          <span class="btn-texto">{{ props.loading ? 'Guardando...' : props.data?.idProducto ? 'Actualizar' : 'Guardar' }}</span>
        </button>
        <button v-if="props.data?.idProducto" type="button" class="btn-danger" @click="$emit('delete')">
          <span class="btn-icono">🗑️</span>
          <span class="btn-texto">Eliminar</span>
        </button>
        <button type="button" class="btn-secondary" @click="$emit('close')">
          <span class="btn-icono">✕</span>
          <span class="btn-texto">Cancelar</span>
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.form-section {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 0.75rem;
}

.section-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.75rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.modal-grid label {
  grid-column: span 2;
  text-transform: uppercase;
  font-size: 0.65rem;
  color: var(--text-secondary);
  letter-spacing: 0.1em;
  font-family: "Courier New", monospace;
  display: flex;
  align-items: baseline;
}

.required {
  color: var(--error-color);
  margin-left: 0.2rem;
}

.input-field {
  grid-column: span 2;
  background: var(--bg-primary);
  border: var(--border-width) solid var(--border-color);
  padding: 0.6rem 0.7rem;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;
  border-radius: 8px;
}

.input-field:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 25%, transparent);
}

.input-field::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.select-field {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23b0a890' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.5rem;
  cursor: pointer;
}

.select-field option {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.barcode-row {
  grid-column: span 2;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
}

.btn-scan {
  border: var(--border-width) solid var(--border-color);
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  color: var(--text-primary);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  box-shadow: 0 3px 10px var(--shadow-color);
  padding: 0.55rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s;
  border-radius: 8px;
}

.btn-scan:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-scan:active {
  transform: translateY(0);
}

.prices-grid {
  grid-template-columns: 1fr 1fr;
}

.price-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.price-field label {
  grid-column: span 1;
}

.price-field .input-field {
  grid-column: span 1;
}

.price-field.highlight {
  background: rgba(0, 0, 0, 0.2);
  padding: 0.5rem;
  border-radius: 8px;
  justify-content: center;
}

.calculated-value {
  font-size: 1rem;
  font-weight: 900;
  font-family: "Courier New", monospace;
  text-align: center;
}

.calculated-value.positive {
  color: var(--success-color);
}

.calculated-value.negative {
  color: var(--error-color);
}

.inventory-grid {
  grid-template-columns: 1fr 1fr;
}

.stock-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.stock-field label {
  grid-column: span 1;
}

.stock-field .input-field {
  grid-column: span 1;
}

.stock-input {
  font-weight: 700;
  font-size: 1rem;
}

.rentable-label {
  color: #7c3aed;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 0.5rem 0;
}

.rentable-info {
  justify-content: center;
}

.checkbox-field {
  grid-column: span 2;
}

.check-row {
  grid-column: span 2;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-primary);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  padding: 0.6rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  transition: background 0.2s;
}

.check-row:hover {
  background: rgba(0, 0, 0, 0.2);
}

.checkbox-input {
  display: none;
}

.checkbox-custom {
  width: 22px;
  height: 22px;
  border: var(--border-width) solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.checkbox-input:checked + .checkbox-custom {
  background: var(--accent-color);
  border-color: var(--accent-color);
}

.checkbox-input:checked + .checkbox-custom::after {
  content: '✓';
  color: var(--bg-primary);
  font-weight: 900;
  font-size: 0.85rem;
}

.checkbox-label .hint {
  font-size: 0.6rem;
  opacity: 0.7;
  text-transform: none;
}

.modal-actions {
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
  padding-top: 1rem;
  margin-top: 0.5rem;
  border-top: 2px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
  flex-wrap: wrap;
}

.modal-actions button {
  border: var(--border-width) solid var(--border-color);
  padding: 0.65rem 1rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: 0 4px 15px var(--shadow-color);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s;
  border-radius: 10px;
}

.btn-primary {
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 50%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-danger {
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  color: var(--text-primary);
}

.btn-danger:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-secondary {
  background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  color: var(--text-primary);
  border: var(--border-width) solid var(--border-color);
}

.btn-secondary:hover {
  filter: brightness(1.1);
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
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.modal-card {
  width: min(100%, 560px);
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: var(--border-width-thick) solid var(--accent-color);
  box-shadow: 0 8px 30px var(--shadow-color);
  padding: 1.25rem;
  max-height: 88vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  animation: popIn 150ms steps(4);
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-scroll {
  overflow-y: auto;
  padding-right: 0.3rem;
  flex: 1;
}

.modal-scroll::-webkit-scrollbar {
  width: 8px;
}

.modal-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.modal-scroll::-webkit-scrollbar-thumb {
  background: var(--accent-color);
  border-radius: 4px;
}

.modal-card .modal-header {
  position: relative;
  padding-bottom: 0.6rem;
  margin-bottom: 0.5rem;
  border-bottom: 2px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.modal-card .modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 900;
}

.modal-card .modal-header p {
  margin: 0.3rem 0 0;
  color: var(--text-secondary);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
}

@media (max-width: 600px) {
  .modal-card {
    max-height: 95vh;
    padding: 1rem;
    border-radius: 12px;
  }
  
  .modal-grid,
  .prices-grid,
  .inventory-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-grid label,
  .modal-grid .input-field,
  .barcode-row,
  .price-field label,
  .price-field .input-field,
  .stock-field label,
  .stock-field .input-field,
  .checkbox-field {
    grid-column: span 1;
  }
  
  .barcode-row {
    grid-template-columns: 1fr;
  }
  
  .btn-scan {
    justify-content: center;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .modal-actions button {
    width: 100%;
    justify-content: center;
  }
}
</style>
