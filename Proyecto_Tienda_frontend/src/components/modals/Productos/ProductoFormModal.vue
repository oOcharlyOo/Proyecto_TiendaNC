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
  presentacion_caja?: string;
  cajas?: { piezas: number }[];
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
  precio_envase: 0,
  presentacion_caja: ''
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

watch(
  () => form.value.precio_costo,
  () => {
    cajasSeleccionadas.value.forEach(size => {
      cajasPrecios.value[size] = Number(form.value.precio_costo || 0) * size;
    });
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
    precio_envase: 0,
    presentacion_caja: ''
  };
    cajasSeleccionadas.value = [];
    cajasPrecios.value = {};
    return;
  }

  const precioCosto = Number(source.precio_costo || 0);
  form.value = {
    idProducto: source.idProducto,
    nombre: source.nombre,
    stock: Number(source.stock || 0),
    codigoBarras: (source.codigoBarras ?? props.prefillCode?.trim()) || '',
    precio_costo: precioCosto,
    precio_venta: Number(source.precio_venta || 0),
    cantidad_min: Number(source.cantidad_min || 0),
    cantidad_max: Number(source.cantidad_max || 0),
    precio_mayoreo: source.precio_mayoreo ?? null,
    is_gramaje: Boolean(source.is_gramaje),
    idCategoria: source.idCategoria || 1,
    idSubcategoria: source.idSubcategoria ?? null,
    requiere_envase: Boolean(source.requiere_envase),
    precio_envase: Number(source.precio_envase || 0),
    presentacion_caja: source.presentacion_caja || ''
  };
  
  // Cargar cajas existentes y recalcular con precio_costo actual
  cajasSeleccionadas.value = [];
  cajasPrecios.value = {};
  if (source.presentacion_caja) {
    const sizes = source.presentacion_caja.split(',').map(s => parseInt(s.trim())).filter(s => s > 0);
    sizes.forEach(s => {
      cajasSeleccionadas.value.push(s);
      cajasPrecios.value[s] = precioCosto * s;
    });
  }
}

function handleSubmit() {
  const presentacionCaja = cajasSeleccionadas.value.join(',');
  const cajas = cajasSeleccionadas.value.map(s => ({
    piezas: s
  }));
  
  emit('submit', {
    ...form.value,
    codigoBarras: form.value.codigoBarras?.trim() || null,
    nombre: form.value.nombre.trim(),
    presentacion_caja: presentacionCaja,
    cajas
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0));
}

const subcategoriasFiltradas = computed(() => {
  if (!form.value.idCategoria) return [];
  return (props.subcategorias || []).filter(s => s.idCategoria === form.value.idCategoria);
});

const CAJA_SIZES: readonly number[] = [4, 6, 8, 12, 24];
const cajasSeleccionadas = ref<number[]>([]);
const cajasPrecios = ref<Record<number, number>>({});
const customCajaSize = ref<number | null>(null);

function toggleCaja(size: number) {
  const idx = cajasSeleccionadas.value.indexOf(size);
  if (idx >= 0) {
    cajasSeleccionadas.value.splice(idx, 1);
    delete cajasPrecios.value[size];
  } else {
    cajasSeleccionadas.value.push(size);
    cajasPrecios.value[size] = Number(form.value.precio_costo || 0) * size;
  }
}

function addCustomCaja() {
  const size = customCajaSize.value;
  if (!size || size <= 0) return;
  if (cajasSeleccionadas.value.includes(size)) {
    customCajaSize.value = null;
    return;
  }
  cajasSeleccionadas.value.push(size);
  cajasPrecios.value[size] = Number(form.value.precio_costo || 0) * size;
  customCajaSize.value = null;
}

function removeCaja(size: number) {
  const idx = cajasSeleccionadas.value.indexOf(size);
  if (idx >= 0) {
    cajasSeleccionadas.value.splice(idx, 1);
    delete cajasPrecios.value[size];
  }
}

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

        <div class="form-section">
          <h4 class="section-title">📦 Presentación en Cajas</h4>
          <div class="caja-section">
            <p class="caja-description">Selecciona los tamaños de caja. El precio se calcula automáticamente: <strong>precio_costo × piezas</strong>.</p>
            <div class="caja-buttons-grid">
              <div v-for="size in CAJA_SIZES" :key="size" class="caja-item">
                <button 
                  type="button" 
                  class="caja-toggle-btn" 
                  :class="{ active: cajasSeleccionadas.includes(size) }"
                  @click="toggleCaja(size)"
                >
                  📦 {{ size }} pzs
                </button>
                <span v-if="cajasSeleccionadas.includes(size) && cajasPrecios[size] > 0" class="caja-auto-price">
                  {{ formatCurrency(cajasPrecios[size]) }}
                </span>
              </div>
            </div>
            <div class="caja-custom-row">
              <input
                v-model.number="customCajaSize"
                type="number"
                min="1"
                step="1"
                placeholder="Piezas ej: 20"
                class="caja-custom-input"
                @keyup.enter="addCustomCaja"
              />
              <button type="button" class="caja-custom-btn" @click="addCustomCaja">➕ Agregar</button>
            </div>
            <div v-if="cajasSeleccionadas.some(s => !CAJA_SIZES.includes(s))" class="caja-custom-list">
              <span class="caja-custom-list-label">Personalizadas:</span>
              <div
                v-for="size in cajasSeleccionadas.filter(s => !CAJA_SIZES.includes(s))"
                :key="size"
                class="caja-custom-chip"
              >
                📦 {{ size }} pzs
                <span class="caja-chip-price">{{ formatCurrency(cajasPrecios[size] || 0) }}</span>
                <button type="button" class="caja-chip-remove" @click="removeCaja(size)">✕</button>
              </div>
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
.modal-overlay{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.4);backdrop-filter:blur(8px);display:grid;place-items:center;padding:1rem;animation:fmFadeIn .2s ease}
@keyframes fmFadeIn{from{opacity:0}to{opacity:1}}
.modal-card{width:min(100%,540px);background:var(--color-bg-secondary);border:none;border-radius:18px;padding:1.15rem;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;animation:fmPopIn .2s ease-out;box-shadow:10px 10px 30px rgba(0,0,0,.4),-6px -6px 20px rgba(255,255,255,.04),inset 0 1px 0 rgba(255,255,255,.03)}
@keyframes fmPopIn{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.modal-scroll{overflow-y:auto;padding-right:.3rem;flex:1}
.modal-scroll::-webkit-scrollbar{width:6px}
.modal-scroll::-webkit-scrollbar-track{background:rgba(0,0,0,.1);border-radius:3px}
.modal-scroll::-webkit-scrollbar-thumb{background:var(--color-accent);border-radius:3px}
.modal-card .modal-header{position:relative;padding-bottom:.55rem;margin-bottom:.5rem;border-bottom:1px solid color-mix(in srgb,var(--color-accent) 25%,transparent)}
.modal-card .modal-header h3{margin:0;font-size:.95rem;color:var(--color-accent);text-transform:uppercase;letter-spacing:.1em;font-weight:800}
.modal-card .modal-header p{margin:.25rem 0 0;color:var(--color-text-secondary);font-size:.65rem;letter-spacing:.05em}
.form-section{background:var(--color-bg-primary);border-radius:10px;padding:.9rem;margin-bottom:.65rem;box-shadow:inset 3px 3px 6px rgba(0,0,0,.12)}
.section-title{margin:0 0 .6rem;font-size:.7rem;color:var(--color-accent);text-transform:uppercase;letter-spacing:.1em;font-weight:700;display:flex;align-items:center;gap:.35rem}
.modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:.55rem}
.modal-grid label{grid-column:span 2;text-transform:uppercase;font-size:.62rem;color:var(--color-text-secondary);letter-spacing:.08em;font-weight:600;display:flex;align-items:baseline}
.required{color:var(--color-error);margin-left:.15rem}
.input-field{grid-column:span 2;background:var(--color-bg-primary);border:none;padding:.55rem .65rem;color:var(--color-text-primary);font-size:.87rem;outline:none;border-radius:8px;box-shadow:inset 3px 3px 6px rgba(0,0,0,.15),inset -1px -1px 2px rgba(255,255,255,.03);transition:all .2s}
.input-field:focus{box-shadow:inset 3px 3px 8px rgba(0,0,0,.2),0 0 0 2px var(--color-accent)}
.input-field::placeholder{color:var(--color-text-secondary);opacity:.5}
.select-field{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .7rem center;padding-right:2.2rem;cursor:pointer}
.select-field option{background:var(--color-bg-primary);color:var(--color-text-primary)}
.barcode-row{grid-column:span 2;display:grid;grid-template-columns:1fr auto;gap:.45rem}
.btn-scan{border:none;background:linear-gradient(145deg,color-mix(in srgb,var(--color-success) 90%,#fff) 0%,var(--color-success) 40%,color-mix(in srgb,var(--color-success) 75%,#000) 100%);color:#fff;font-weight:700;text-transform:uppercase;font-size:.62rem;letter-spacing:.05em;cursor:pointer;box-shadow:3px 3px 8px rgba(0,0,0,.18);padding:.5rem .7rem;display:flex;align-items:center;gap:.3rem;transition:all .2s;border-radius:8px}
.btn-scan:hover{transform:translateY(-1px);box-shadow:5px 5px 12px rgba(0,0,0,.25)}
.btn-scan:active{transform:translateY(1px);box-shadow:inset 2px 2px 4px rgba(0,0,0,.2)}
.prices-grid{grid-template-columns:1fr 1fr}
.price-field{display:flex;flex-direction:column;gap:.25rem}
.price-field label{grid-column:span 1}
.price-field .input-field{grid-column:span 1}
.price-field.highlight{background:var(--color-bg-primary);padding:.45rem;border-radius:8px;justify-content:center;box-shadow:inset 3px 3px 6px rgba(0,0,0,.12)}
.calculated-value{font-size:.95rem;font-weight:800;text-align:center}
.calculated-value.positive{color:var(--color-success)}
.calculated-value.negative{color:var(--color-error)}
.inventory-grid{grid-template-columns:1fr 1fr}
.stock-field{display:flex;flex-direction:column;gap:.25rem}
.stock-field label{grid-column:span 1}
.stock-field .input-field{grid-column:span 1}
.stock-input{font-weight:700;font-size:.95rem}
.rentable-label{color:var(--color-accent);font-weight:700;font-size:.82rem;padding:.5rem 0;opacity:.85}
.rentable-info{justify-content:center}
.checkbox-field{grid-column:span 2}
.check-row{grid-column:span 2;display:flex;align-items:center;gap:.55rem;color:var(--color-text-primary);text-transform:uppercase;font-size:.65rem;letter-spacing:.06em;cursor:pointer;padding:.5rem .6rem;background:var(--color-bg-primary);border-radius:8px;transition:all .15s;box-shadow:inset 2px 2px 4px rgba(0,0,0,.08)}
.check-row:hover{box-shadow:inset 2px 2px 4px rgba(0,0,0,.15)}
.checkbox-input{display:none}
.checkbox-custom{width:20px;height:20px;border:none;background:var(--color-bg-primary);border-radius:5px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;box-shadow:inset 2px 2px 4px rgba(0,0,0,.2)}
.checkbox-input:checked+.checkbox-custom{background:var(--color-accent);box-shadow:inset 2px 2px 4px rgba(0,0,0,.2),0 0 6px color-mix(in srgb,var(--color-accent) 40%,transparent)}
.checkbox-input:checked+.checkbox-custom::after{content:'✓';color:var(--color-on-brand);font-weight:900;font-size:.75rem}
.checkbox-label .hint{font-size:.58rem;opacity:.65;text-transform:none}
.field-hint{font-size:.58rem;color:var(--color-text-secondary);opacity:.75;margin-top:.15rem}
.full-width{grid-column:span 2}
.caja-section{display:flex;flex-direction:column;gap:.65rem}
.caja-description{font-size:.65rem;color:var(--color-text-secondary);margin:0}
.caja-buttons-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:.6rem}
.caja-item{display:flex;flex-direction:column;gap:.3rem}
.caja-toggle-btn{padding:.5rem .7rem;background:var(--color-bg-secondary);border:none;border-radius:8px;color:var(--color-text-secondary);font-size:.72rem;font-weight:600;cursor:pointer;transition:all .2s;box-shadow:3px 3px 6px rgba(0,0,0,.1),-1px -1px 3px rgba(255,255,255,.02)}
.caja-toggle-btn:hover{transform:translateY(-1px);box-shadow:5px 5px 10px rgba(0,0,0,.15);color:var(--color-text-primary)}
.caja-toggle-btn:active{transform:translateY(1px);box-shadow:inset 2px 2px 4px rgba(0,0,0,.15)}
.caja-toggle-btn.active{background:color-mix(in srgb,var(--color-accent) 20%,var(--color-bg-secondary));color:var(--color-accent);box-shadow:inset 2px 2px 4px rgba(0,0,0,.15),0 0 8px color-mix(in srgb,var(--color-accent) 25%,transparent);font-weight:700}
.caja-auto-price{font-size:.6rem;color:var(--color-text-secondary);font-weight:600;text-align:center}
.caja-custom-row{display:flex;gap:.45rem;align-items:center}
.caja-custom-input{flex:1;max-width:160px;padding:.4rem .55rem;background:var(--color-bg-primary);border:none;border-radius:8px;color:var(--color-text-primary);font-size:.75rem;font-weight:600;outline:none;box-shadow:inset 3px 3px 6px rgba(0,0,0,.15);transition:all .2s}
.caja-custom-input:focus{box-shadow:inset 3px 3px 8px rgba(0,0,0,.2),0 0 0 2px var(--color-accent)}
.caja-custom-input::placeholder{color:var(--color-text-secondary);font-weight:400;font-size:.65rem}
.caja-custom-btn{padding:.4rem .75rem;background:var(--color-accent);border:none;border-radius:8px;color:var(--color-on-brand);font-size:.68rem;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:3px 3px 6px rgba(0,0,0,.15)}
.caja-custom-btn:hover{transform:translateY(-1px);box-shadow:5px 5px 10px rgba(0,0,0,.2)}
.caja-custom-btn:active{transform:translateY(1px)}
.caja-custom-list{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem;padding:.35rem 0}
.caja-custom-list-label{font-size:.6rem;color:var(--color-text-secondary);font-weight:600}
.caja-custom-chip{display:flex;align-items:center;gap:.25rem;padding:.22rem .45rem;background:color-mix(in srgb,var(--color-accent) 15%,var(--color-bg-primary));border:none;border-radius:6px;font-size:.65rem;font-weight:600;color:var(--color-accent);box-shadow:2px 2px 4px rgba(0,0,0,.1)}
.caja-chip-price{font-size:.58rem;opacity:.75;color:var(--color-text-secondary)}
.caja-chip-remove{background:none;border:none;color:var(--color-error);font-size:.58rem;cursor:pointer;padding:0;line-height:1;opacity:.6;transition:opacity .15s}
.caja-chip-remove:hover{opacity:1}
.modal-actions{display:flex;gap:.55rem;justify-content:flex-end;padding-top:.85rem;margin-top:.4rem;border-top:1px solid color-mix(in srgb,var(--color-accent) 25%,transparent);flex-wrap:wrap}
.modal-actions button{border:none;padding:.6rem .9rem;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;cursor:pointer;display:flex;align-items:center;gap:.35rem;transition:all .2s;border-radius:10px}
.btn-primary{background:linear-gradient(145deg,color-mix(in srgb,var(--color-accent) 90%,#fff) 0%,var(--color-accent) 40%,color-mix(in srgb,var(--color-accent) 75%,#000) 100%);color:var(--color-on-brand);box-shadow:4px 4px 10px rgba(0,0,0,.2),-1px -1px 4px rgba(255,255,255,.04)}
.btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:6px 6px 16px rgba(0,0,0,.28),-3px -3px 8px rgba(255,255,255,.05)}
.btn-primary:active:not(:disabled){transform:translateY(1px);box-shadow:inset 2px 2px 5px rgba(0,0,0,.2)}
.btn-danger{background:linear-gradient(145deg,var(--color-error) 0%,color-mix(in srgb,var(--color-error) 60%,#000) 100%);color:#fff;box-shadow:4px 4px 10px rgba(0,0,0,.2)}
.btn-danger:hover{transform:translateY(-2px);box-shadow:6px 6px 16px rgba(0,0,0,.28)}
.btn-danger:active{transform:translateY(1px);box-shadow:inset 2px 2px 5px rgba(0,0,0,.2)}
.btn-secondary{background:var(--color-bg-secondary);color:var(--color-text-secondary);box-shadow:3px 3px 6px rgba(0,0,0,.1),-1px -1px 3px rgba(255,255,255,.02)}
.btn-secondary:hover{transform:translateY(-2px);box-shadow:5px 5px 12px rgba(0,0,0,.18);color:var(--color-text-primary)}
.btn-secondary:active{transform:translateY(1px);box-shadow:inset 2px 2px 4px rgba(0,0,0,.15)}
.modal-actions button:disabled{opacity:.5;cursor:not-allowed;transform:none}
@media(max-width:600px){.modal-card{max-height:95vh;padding:.9rem;border-radius:14px}.modal-grid,.prices-grid,.inventory-grid{grid-template-columns:1fr}.modal-grid label,.modal-grid .input-field,.barcode-row,.price-field label,.price-field .input-field,.stock-field label,.stock-field .input-field,.checkbox-field{grid-column:span 1}.barcode-row{grid-template-columns:1fr}.btn-scan{justify-content:center}.modal-actions{flex-direction:column}.modal-actions button{width:100%;justify-content:center}}
</style>