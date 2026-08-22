<script setup lang="ts">
import { ref, watch } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const props = defineProps<{
  open: boolean;
  idProducto?: number;
  nombreProducto?: string;
  precioCosto?: number;
  presentacionCaja?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', cajas: number[]): void;
}>();

const CAJAS_COMUNES: readonly number[] = [4, 6, 8, 12, 16, 24];
const seleccionadas = ref<number[]>([]);
const tamanoCustom = ref<string>('');
const guardando = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    guardando.value = false;
    tamanoCustom.value = '';
    seleccionadas.value = [];
    if (props.presentacionCaja) {
      const sizes = props.presentacionCaja
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(s => s > 0);
      seleccionadas.value = Array.from(new Set(sizes)).sort((a, b) => a - b);
    }
  },
  { immediate: true }
);

function toggleCaja(size: number) {
  const idx = seleccionadas.value.indexOf(size);
  if (idx >= 0) {
    seleccionadas.value.splice(idx, 1);
  } else {
    seleccionadas.value.push(size);
    seleccionadas.value.sort((a, b) => a - b);
  }
}

function agregarCustom() {
  const size = parseInt(tamanoCustom.value);
  if (!size || size <= 0) return;
  if (!seleccionadas.value.includes(size)) {
    seleccionadas.value.push(size);
    seleccionadas.value.sort((a, b) => a - b);
  }
  tamanoCustom.value = '';
}

function quitarCaja(size: number) {
  const idx = seleccionadas.value.indexOf(size);
  if (idx >= 0) seleccionadas.value.splice(idx, 1);
}

function formatoMoneda(v: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v || 0));
}

function costoPorCaja(piezas: number) {
  return Number(props.precioCosto || 0) * piezas;
}

async function guardar() {
  if (!props.idProducto) return;
  guardando.value = true;
  try {
    const delRes = await fetch(`${API_BASE}/producto-presentacion-caja/eliminar-por-producto/${props.idProducto}`, { method: 'DELETE' });
    const delJson = await delRes.json();
    if (delJson?.codigo !== 200) throw new Error(delJson?.mensaje || 'No se pudo actualizar la configuración de cajas');

    for (const piezas of seleccionadas.value) {
      const res = await fetch(`${API_BASE}/producto-presentacion-caja/asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: null, id_producto: props.idProducto, piezas })
      });
      const json = await res.json();
      if (json?.codigo !== 200) throw new Error(json?.mensaje || 'Error al guardar presentación de caja');
    }

    emit('saved', [...seleccionadas.value]);
  } catch (e) {
    console.error('Error guardando cajas:', e);
    alert(`Error al guardar las cajas: ${e instanceof Error ? e.message : 'Error inesperado'}`);
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div v-if="open" class="ecm-overlay" @click.self="emit('close')">
    <div class="ecm-card">
      <header class="ecm-header">
        <div class="ecm-header-left">
          <span class="ecm-icon">📦</span>
          <div>
            <h3 class="ecm-title">Compra por caja</h3>
            <p class="ecm-subtitle">{{ nombreProducto || `Producto #${idProducto}` }}</p>
          </div>
        </div>
        <button class="ecm-close" @click="emit('close')">✕</button>
      </header>

      <div class="ecm-body">
        <p class="ecm-desc">
          Define cuántas piezas trae la caja al comprar este producto. El pedido sugerido
          recalculará las cantidades en cajas completas.
        </p>

        <div class="ecm-section-label">Tamaños comunes</div>
        <div class="ecm-chips">
          <button
            v-for="size in CAJAS_COMUNES"
            :key="size"
            type="button"
            class="ecm-chip"
            :class="{ active: seleccionadas.includes(size) }"
            @click="toggleCaja(size)"
          >
            📦 {{ size }} pzs
            <span class="ecm-chip-cost">{{ formatoMoneda(costoPorCaja(size)) }}</span>
          </button>
        </div>

        <div class="ecm-section-label">Otro tamaño</div>
        <div class="ecm-custom-row">
          <input
            v-model="tamanoCustom"
            type="number"
            min="1"
            placeholder="Ej: 16"
            class="ecm-input"
            @keyup.enter="agregarCustom"
          />
          <button type="button" class="ecm-btn-add" @click="agregarCustom">+ Agregar</button>
        </div>

        <div v-if="seleccionadas.length > 0" class="ecm-section-label">Seleccionadas</div>
        <div v-if="seleccionadas.length > 0" class="ecm-seleccionadas">
          <span v-for="size in seleccionadas" :key="size" class="ecm-sel-tag">
            📦 {{ size }} pzs · {{ formatoMoneda(costoPorCaja(size)) }}
            <button type="button" class="ecm-sel-remove" @click="quitarCaja(size)">✕</button>
          </span>
        </div>
        <p v-else class="ecm-empty-note">Sin cajas configuradas · se compra en unidad</p>
      </div>

      <footer class="ecm-footer">
        <button type="button" class="ecm-btn-cancel" @click="emit('close')" :disabled="guardando">Cancelar</button>
        <button type="button" class="ecm-btn-save" @click="guardar" :disabled="guardando || !idProducto">
          <span v-if="guardando">Guardando…</span>
          <span v-else>💾 Guardar</span>
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.ecm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem}
.ecm-card{background:var(--color-bg-panel);border:none;border-radius:14px;box-shadow:12px 12px 30px rgba(0,0,0,.4),-6px -6px 20px rgba(255,255,255,.03);width:100%;max-width:460px;display:flex;flex-direction:column;max-height:90vh;overflow:hidden;font-family:var(--font-body)}
.ecm-header{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1.1rem;background:var(--color-bg-secondary);border-bottom:1px solid color-mix(in srgb,var(--color-accent) 20%,transparent)}
.ecm-header-left{display:flex;align-items:center;gap:.6rem;min-width:0}
.ecm-icon{font-size:1.4rem}
.ecm-title{margin:0;font-size:.95rem;font-weight:800;color:var(--color-accent)}
.ecm-subtitle{margin:.1rem 0 0;font-size:.72rem;color:var(--color-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}
.ecm-close{width:30px;height:30px;border-radius:50%;border:none;background:var(--color-bg-primary);color:var(--color-text-secondary);font-size:.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,.15);transition:all .15s}
.ecm-close:hover{background:var(--color-error);color:#fff}
.ecm-body{padding:1rem 1.1rem;overflow-y:auto;display:flex;flex-direction:column;gap:.55rem}
.ecm-desc{margin:0;font-size:.72rem;color:var(--color-text-secondary)}
.ecm-section-label{font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:var(--color-text-secondary);margin-top:.2rem}
.ecm-chips{display:flex;flex-wrap:wrap;gap:.35rem}
.ecm-chip{display:flex;flex-direction:column;align-items:center;gap:.05rem;padding:.4rem .6rem;border:none;border-radius:8px;background:var(--color-bg-primary);color:var(--color-text-primary);font-size:.72rem;font-weight:700;cursor:pointer;box-shadow:2px 2px 4px rgba(0,0,0,.08);transition:all .15s;font-family:inherit}
.ecm-chip:hover{transform:translateY(-1px);box-shadow:3px 3px 6px rgba(0,0,0,.12)}
.ecm-chip.active{background:var(--color-accent);color:var(--color-on-brand);box-shadow:3px 3px 6px rgba(0,0,0,.18)}
.ecm-chip-cost{font-size:.58rem;font-weight:600;opacity:.75}
.ecm-custom-row{display:flex;gap:.4rem}
.ecm-input{flex:1;padding:.5rem .7rem;background:var(--color-bg-primary);border:none;border-radius:8px;color:var(--color-text-primary);font-size:.78rem;box-shadow:inset 2px 2px 4px rgba(0,0,0,.12);font-family:inherit}
.ecm-input:focus{outline:none;box-shadow:inset 2px 2px 4px rgba(0,0,0,.12),0 0 0 2px var(--color-accent)}
.ecm-btn-add{padding:.5rem .8rem;border:none;border-radius:8px;background:var(--color-bg-secondary);color:var(--color-accent);font-size:.72rem;font-weight:700;cursor:pointer;box-shadow:2px 2px 4px rgba(0,0,0,.1);transition:all .15s}
.ecm-btn-add:hover:not(:disabled){transform:translateY(-1px)}
.ecm-seleccionadas{display:flex;flex-wrap:wrap;gap:.3rem}
.ecm-sel-tag{display:inline-flex;align-items:center;gap:.3rem;padding:.25rem .45rem;border-radius:6px;background:color-mix(in srgb,var(--color-info) 12%,transparent);color:var(--color-info);font-size:.68rem;font-weight:600}
.ecm-sel-remove{background:none;border:none;color:inherit;cursor:pointer;font-size:.65rem;padding:0;line-height:1;opacity:.7}
.ecm-sel-remove:hover{opacity:1;color:var(--color-error)}
.ecm-empty-note{margin:0;font-size:.68rem;color:var(--color-text-secondary);font-style:italic}
.ecm-footer{display:flex;gap:.6rem;padding:.9rem 1.1rem;border-top:1px solid var(--color-border);justify-content:flex-end}
.ecm-btn-cancel{padding:.55rem 1rem;border:none;border-radius:8px;background:var(--color-bg-secondary);color:var(--color-text-secondary);font-weight:700;font-size:.75rem;cursor:pointer;box-shadow:2px 2px 4px rgba(0,0,0,.1);transition:all .15s;font-family:inherit}
.ecm-btn-cancel:hover:not(:disabled){color:var(--color-text-primary)}
.ecm-btn-save{padding:.55rem 1.2rem;border:none;border-radius:8px;background:linear-gradient(135deg,var(--color-accent),var(--color-accent-hover));color:var(--color-on-brand);font-weight:800;font-size:.75rem;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,.15);transition:all .15s;font-family:inherit}
.ecm-btn-save:hover:not(:disabled){transform:translateY(-1px);box-shadow:4px 4px 8px rgba(0,0,0,.2)}
.ecm-btn-save:disabled,.ecm-btn-cancel:disabled{opacity:.5;cursor:not-allowed}

@media(max-width:480px){.ecm-card{max-width:100%}.ecm-footer{flex-direction:column}.ecm-btn-save,.ecm-btn-cancel{width:100%}}
</style>
