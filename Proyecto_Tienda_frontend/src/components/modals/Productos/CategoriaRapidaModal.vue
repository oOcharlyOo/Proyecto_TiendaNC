<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

type CategoriaDTO = {
  idCategoria: number;
  nombre: string;
};

type SubcategoriaDTO = {
  idSubcategoria: number;
  nombre: string;
  idCategoria: number | null;
};

type Tipo = 'categoria' | 'subcategoria';

type ApiRespuesta = {
  codigo: number;
  mensaje: string;
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const props = defineProps<{
  open: boolean;
  tipo: Tipo;
  categorias?: CategoriaDTO[];
  subcategorias?: SubcategoriaDTO[];
  /** Categoría preseleccionada al crear una subcategoría (la que está elegida en el formulario de producto). */
  idCategoriaInicial?: number | null;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  /** Se creó en el backend. El backend no devuelve el id, así que el padre recarga y busca por nombre. */
  (event: 'creada', payload: { tipo: Tipo; nombre: string; idCategoria: number | null }): void;
  /** Ya existía una con ese nombre: en vez de duplicarla, se selecciona la existente. */
  (event: 'existente', payload: { tipo: Tipo; idCategoria: number | null; idSubcategoria: number | null }): void;
}>();

const nombre = ref('');
const idCategoria = ref<number | null>(null);
const guardando = ref(false);
const error = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

const esSubcategoria = computed(() => props.tipo === 'subcategoria');
const titulo = computed(() => (esSubcategoria.value ? 'Nueva subcategoría' : 'Nueva categoría'));

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    nombre.value = '';
    error.value = '';
    guardando.value = false;
    idCategoria.value = props.idCategoriaInicial ?? props.categorias?.[0]?.idCategoria ?? null;
    await nextTick();
    inputRef.value?.focus();
  },
  { immediate: true }
);

function normalizar(valor: string): string {
  return valor.trim().toLowerCase();
}

async function guardar() {
  if (guardando.value) return;
  error.value = '';

  const nombreLimpio = nombre.value.trim();
  if (!nombreLimpio) {
    error.value = esSubcategoria.value
      ? 'El nombre de la subcategoría es obligatorio.'
      : 'El nombre de la categoría es obligatorio.';
    return;
  }
  if (esSubcategoria.value && !idCategoria.value) {
    error.value = 'Elige la categoría a la que pertenece.';
    return;
  }

  // Evita duplicados: si ya existe, solo se selecciona.
  if (esSubcategoria.value) {
    const existente = (props.subcategorias || []).find(
      s => s.idCategoria === idCategoria.value && normalizar(s.nombre) === normalizar(nombreLimpio)
    );
    if (existente) {
      emit('existente', { tipo: 'subcategoria', idCategoria: idCategoria.value, idSubcategoria: existente.idSubcategoria });
      emit('close');
      return;
    }
  } else {
    const existente = (props.categorias || []).find(c => normalizar(c.nombre) === normalizar(nombreLimpio));
    if (existente) {
      emit('existente', { tipo: 'categoria', idCategoria: existente.idCategoria, idSubcategoria: null });
      emit('close');
      return;
    }
  }

  guardando.value = true;
  try {
    const url = esSubcategoria.value
      ? `${API_BASE}/subcategorias/agregarSubcategoria`
      : `${API_BASE}/categorias/agregarCategoria`;
    const body = esSubcategoria.value
      ? { nombre: nombreLimpio, descripcion: null, idCategoria: idCategoria.value }
      : { nombre: nombreLimpio, descripcion: null };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as ApiRespuesta;
    if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo guardar.');

    emit('creada', { tipo: props.tipo, nombre: nombreLimpio, idCategoria: idCategoria.value });
    emit('close');
  } catch (e) {
    error.value = `Error al guardar: ${e instanceof Error ? e.message : 'Error inesperado.'}`;
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="cr-overlay" @click.self="emit('close')" @keydown.esc="emit('close')">
      <form class="cr-card" @submit.prevent="guardar">
        <header class="cr-header">
          <h3>{{ esSubcategoria ? '🗂️' : '🏷️' }} {{ titulo }}</h3>
          <p>{{ esSubcategoria ? 'Se creará dentro de la categoría que elijas' : 'Podrás usarla de inmediato en este producto' }}</p>
        </header>

        <div class="cr-body">
          <template v-if="esSubcategoria">
            <label for="cr-categoria">Categoría <span class="cr-required">*</span></label>
            <select id="cr-categoria" v-model="idCategoria" class="cr-input cr-select">
              <option v-for="cat in categorias" :key="cat.idCategoria" :value="cat.idCategoria">{{ cat.nombre }}</option>
            </select>
          </template>

          <label for="cr-nombre">Nombre <span class="cr-required">*</span></label>
          <input
            id="cr-nombre"
            ref="inputRef"
            v-model="nombre"
            type="text"
            maxlength="80"
            autocomplete="off"
            :placeholder="esSubcategoria ? 'Ej: Chocolates' : 'Ej: Dulces'"
            class="cr-input"
          >

          <p v-if="error" class="cr-error" role="alert">{{ error }}</p>
        </div>

        <footer class="cr-actions">
          <button type="submit" class="cr-btn cr-primary" :disabled="guardando">
            <span>{{ guardando ? '⏳' : '💾' }}</span>
            <span>{{ guardando ? 'Guardando...' : 'Crear' }}</span>
          </button>
          <button type="button" class="cr-btn cr-secondary" :disabled="guardando" @click="emit('close')">
            <span>✕</span>
            <span>Cancelar</span>
          </button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
/* Por encima del formulario de producto: Productos.vue (.productos-layout .modal-overlay) lo eleva a z-index 1000. */
.cr-overlay{position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);display:grid;place-items:center;padding:1rem;animation:crFadeIn .15s ease}
@keyframes crFadeIn{from{opacity:0}to{opacity:1}}
.cr-card{width:min(100%,380px);background:var(--color-bg-secondary);border-radius:16px;padding:1.1rem;display:flex;flex-direction:column;gap:.7rem;box-shadow:8px 8px 24px rgba(0,0,0,.35);animation:crPopIn .18s ease-out}
@keyframes crPopIn{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.cr-header{padding-bottom:.5rem;border-bottom:1px solid color-mix(in srgb,var(--color-accent) 25%,transparent)}
.cr-header h3{margin:0;font-size:.9rem;color:var(--color-accent);text-transform:uppercase;letter-spacing:.1em;font-weight:800}
.cr-header p{margin:.25rem 0 0;color:var(--color-text-secondary);font-size:.65rem;letter-spacing:.05em}
.cr-body{display:flex;flex-direction:column;gap:.4rem;background:var(--color-bg-primary);border-radius:10px;padding:.85rem;box-shadow:inset 3px 3px 6px rgba(0,0,0,.12)}
.cr-body label{text-transform:uppercase;font-size:.62rem;color:var(--color-text-secondary);letter-spacing:.08em;font-weight:600}
.cr-required{color:var(--color-error)}
.cr-input{width:100%;box-sizing:border-box;background:var(--color-bg-primary);border:none;padding:.55rem .65rem;color:var(--color-text-primary);font-size:.87rem;outline:none;border-radius:8px;box-shadow:inset 3px 3px 6px rgba(0,0,0,.15)}
.cr-input:focus{box-shadow:inset 3px 3px 8px rgba(0,0,0,.2),0 0 0 2px var(--color-accent)}
.cr-input::placeholder{color:var(--color-text-secondary);opacity:.5}
.cr-select{appearance:none;cursor:pointer}
.cr-select option{background:var(--color-bg-primary);color:var(--color-text-primary)}
.cr-error{margin:.2rem 0 0;font-size:.72rem;color:var(--color-error);font-weight:600}
.cr-actions{display:flex;gap:.55rem;justify-content:flex-end;flex-wrap:wrap}
.cr-btn{border:none;padding:.6rem .9rem;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;cursor:pointer;display:flex;align-items:center;gap:.35rem;transition:all .2s;border-radius:10px}
.cr-primary{background:linear-gradient(145deg,color-mix(in srgb,var(--color-accent) 90%,#fff) 0%,var(--color-accent) 40%,color-mix(in srgb,var(--color-accent) 75%,#000) 100%);color:var(--color-on-brand);box-shadow:4px 4px 10px rgba(0,0,0,.2)}
.cr-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:6px 6px 16px rgba(0,0,0,.28)}
.cr-secondary{background:var(--color-bg-secondary);color:var(--color-text-secondary);box-shadow:3px 3px 6px rgba(0,0,0,.1)}
.cr-secondary:hover:not(:disabled){transform:translateY(-2px);color:var(--color-text-primary)}
.cr-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
</style>
