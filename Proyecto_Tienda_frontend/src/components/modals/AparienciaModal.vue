<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import PasoApariencia from '../Login/secciones/PasoApariencia.vue';
import { usarApariencia } from '@/composables/useApariencia';

/**
 * Panel de personalizacion para administradores (post-setup): cambia el
 * nombre visible y los colores de la sucursal activa. Reutiliza el paso 2
 * del wizard, con vista previa en vivo; al cancelar sin guardar se
 * restaura la apariencia persistida.
 */
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { config, guardar, cargar, aplicar } = usarApariencia();

const nombre = ref('');
const temaBase = ref('classic');
const acento = ref('#f97316');
const guardando = ref(false);
const error = ref('');
const exito = ref('');

watch(
  () => props.open,
  (abierto) => {
    if (!abierto) return;
    error.value = '';
    exito.value = '';
    nombre.value = config.value?.sucursalNombre ?? '';
    temaBase.value = config.value?.temaBase || 'classic';
    acento.value = config.value?.acento || '#f97316';
  }
);

async function guardarCambios() {
  if (guardando.value) return;
  error.value = '';
  exito.value = '';
  const n = nombre.value.trim();
  if (n.length < 2) {
    error.value = 'El nombre debe tener al menos 2 caracteres.';
    return;
  }
  guardando.value = true;
  const r = await guardar({ nombre: n, temaBase: temaBase.value, acento: acento.value });
  guardando.value = false;
  if (!r.ok) {
    error.value = r.mensaje || 'No se pudo guardar.';
    return;
  }
  exito.value = 'Guardado ✔';
  setTimeout(() => emit('close'), 700);
}

function cancelar() {
  // descartar la previsualizacion: volver a la apariencia persistida
  aplicar(true);
  emit('close');
}

onBeforeUnmount(() => aplicar());
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="ap-modals-overlay" @click.self="cancelar">
      <div class="ap-modals-card">
        <div class="ap-header">
          <h3>🎨 Personalización</h3>
          <button type="button" class="ap-close" @click="cancelar">✕</button>
        </div>

        <label class="ap-nombre-label">
          Nombre del negocio
          <input v-model="nombre" type="text" maxlength="60" class="ap-nombre" :disabled="guardando">
        </label>

        <PasoApariencia v-model:temaBase="temaBase" v-model:acento="acento" />

        <p v-if="error" class="ap-error">{{ error }}</p>
        <p v-if="exito" class="ap-exito">{{ exito }}</p>

        <div class="ap-acciones">
          <button type="button" class="ap-cancel" :disabled="guardando" @click="cancelar">Cancelar</button>
          <button type="button" class="ap-save" :disabled="guardando" @click="guardarCambios">
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ap-modals-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.ap-modals-card {
  width: min(100%, 430px);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-bg-panel, #2a4030);
  border: 1px solid var(--color-border, #4a3520);
  border-radius: 14px;
  padding: 1rem 1.1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}
.ap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ap-header h3 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text-primary, #e8e0d0);
}
.ap-close {
  border: none;
  background: transparent;
  color: var(--color-text-secondary, #b0a890);
  font-size: 1rem;
  cursor: pointer;
}
.ap-nombre-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.64rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, #94a3b8);
}
.ap-nombre {
  padding: 0.5rem 0.65rem;
  font-size: 0.82rem;
  color: var(--color-text-primary, #e8e0d0);
  background: var(--color-bg-primary, #0a1510);
  border: 1px solid var(--color-border, #4a3520);
  border-radius: 8px;
}
.ap-nombre:focus {
  outline: none;
  border-color: var(--accent-color);
}
.ap-error {
  margin: 0;
  font-size: 0.68rem;
  color: var(--color-error, #ef4444);
  text-align: center;
}
.ap-exito {
  margin: 0;
  font-size: 0.68rem;
  color: var(--color-success, #22c55e);
  text-align: center;
}
.ap-acciones {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.ap-acciones button {
  padding: 0.45rem 0.9rem;
  font-size: 0.72rem;
  font-weight: 800;
  border-radius: 8px;
  cursor: pointer;
  border: none;
}
.ap-cancel {
  background: transparent;
  border: 1px solid var(--color-border, #4a3520);
  color: var(--color-text-secondary, #b0a890);
}
.ap-save {
  background: linear-gradient(135deg, var(--gradient-btn-start), var(--gradient-btn-end));
  color: var(--color-on-brand, #1a1510);
}
.ap-acciones button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
