<script setup lang="ts">
import { ref, watch } from 'vue';

interface SucursalInfo { slug: string; nombre: string }

const props = defineProps<{
  sucursalSeleccionada: string;
  sucursales: SucursalInfo[];
  creando?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  seleccionar: [value: string, nombre: string];
  crear: [datos: { nombre: string; claveMaestra: string }];
}>();

const mostrandoForm = ref(false);
const nombreNueva = ref('');
const claveNueva = ref('');
const verClave = ref(false);

// Cuando el alta termina bien (cambia la lista), el formulario se cierra solo.
watch(() => props.sucursales.length, () => {
  if (mostrandoForm.value && !props.error && !props.creando) {
    mostrandoForm.value = false;
    nombreNueva.value = '';
    claveNueva.value = '';
  }
});

function submit() {
  const nombre = nombreNueva.value.trim();
  if (nombre.length < 2 || !claveNueva.value || props.creando) return;
  emit('crear', { nombre, claveMaestra: claveNueva.value });
}
</script>

<template>
  <div class="sucursal-selector">
    <span class="sucursal-label">Selecciona tu sucursal</span>
    <div class="sucursal-cards">
      <div
        v-for="s in sucursales"
        :key="s.slug"
        class="sucursal-card"
        :class="{ active: sucursalSeleccionada === s.slug }"
        @click="emit('seleccionar', s.slug, s.nombre)"
      >
        <span class="sucursal-icon">🏪</span>
        <span class="sucursal-name">{{ s.nombre }}</span>
        <span class="sucursal-desc">Base de datos propia</span>
      </div>

      <div v-if="!mostrandoForm" class="sucursal-card sucursal-card-add" @click="mostrandoForm = true">
        <span class="sucursal-icon">➕</span>
        <span class="sucursal-name">Agregar sucursal</span>
        <span class="sucursal-desc">Necesita la clave maestra</span>
      </div>
    </div>

    <form v-if="mostrandoForm" class="sucursal-add-form" @submit.prevent="submit">
      <label class="sucursal-add-label">
        Nombre de la sucursal
        <input
          v-model="nombreNueva"
          type="text"
          maxlength="60"
          placeholder="Ej: Sucursal Centro"
          autocomplete="off"
          :disabled="creando"
        >
      </label>
      <label class="sucursal-add-label">
        Clave maestra del propietario
        <div class="campo-pass">
          <input
            v-model="claveNueva"
            :type="verClave ? 'text' : 'password'"
            placeholder="••••••••••"
            autocomplete="off"
            :disabled="creando"
          >
          <button
            type="button"
            class="ojo-btn"
            :disabled="creando"
            :aria-label="verClave ? 'Ocultar clave' : 'Mostrar clave'"
            :title="verClave ? 'Ocultar clave' : 'Mostrar clave'"
            @click="verClave = !verClave"
          >{{ verClave ? '🙈' : '👁' }}</button>
        </div>
      </label>
      <p v-if="error" class="sucursal-add-error">{{ error }}</p>
      <div class="sucursal-add-actions">
        <button
          type="button"
          class="sucursal-add-cancel"
          :disabled="creando"
          @click="mostrandoForm = false; nombreNueva = ''; claveNueva = ''"
        >
          Cancelar
        </button>
        <button type="submit" class="sucursal-add-ok" :disabled="creando || nombreNueva.trim().length < 2 || !claveNueva">
          {{ creando ? 'Creando base de datos...' : 'Crear sucursal' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.sucursal-card-add {
  border-style: dashed;
  opacity: 0.85;
}
.sucursal-add-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.6rem;
  padding: 0.7rem;
  border: 1px solid var(--color-border, #4a3520);
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-bg-panel, #2a4030) 55%, transparent);
}
.sucursal-add-label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary, #b0a890);
}
.sucursal-add-label input {
  padding: 0.45rem 0.6rem;
  font-size: 0.8rem;
  color: var(--color-text-primary, #e8e0d0);
  background: var(--color-bg-primary, #0a1510);
  border: 1px solid var(--color-border, #4a3520);
  border-radius: 6px;
}
.sucursal-add-label input:focus {
  outline: none;
  border-color: var(--color-accent, #d4a84b);
}
.campo-pass { position: relative; display: block; }
.campo-pass input { width: 100%; padding-right: 2.2rem; }
.ojo-btn {
  position: absolute; right: 0.3rem; top: 50%;
  width: auto; min-width: 0; margin: 0; padding: 0.1rem 0.25rem;
  border: none; background: transparent; box-shadow: none;
  transform: translateY(-50%); font-size: 0.95rem; line-height: 1;
  color: var(--color-text-secondary, #b0a890); cursor: pointer;
}
.ojo-btn:hover { background: transparent; color: var(--color-text-primary, #e8e0d0); }
.sucursal-add-error {
  margin: 0;
  font-size: 0.7rem;
  color: var(--color-error, #c75a5a);
}
.sucursal-add-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
.sucursal-add-actions button {
  padding: 0.4rem 0.9rem;
  font-size: 0.72rem;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid var(--color-border, #4a3520);
}
.sucursal-add-cancel {
  background: transparent;
  color: var(--color-text-secondary, #b0a890);
}
.sucursal-add-ok {
  background: var(--color-accent, #d4a84b);
  border-color: var(--color-accent, #d4a84b);
  color: var(--color-on-brand, #1a1510);
}
.sucursal-add-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
