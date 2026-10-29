<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useLogin } from '../logica/useLogin';
import { usarApariencia } from '@/composables/useApariencia';
import PasoApariencia from './PasoApariencia.vue';
import FirstAdminForm from './FirstAdminForm.vue';

/**
 * Asistente de primer arranque del proyecto generico:
 *   1. Nombre del negocio   2. Colores (tema + acento)   3. Administrador
 * Se muestra mientras la sucursal seleccionada no tenga usuarios.
 */
const { crearPrimerAdmin, creandoPrimerAdmin, cargarSucursales } = useLogin();
const { config, cargar, aplicar, guardar } = usarApariencia();

const paso = ref(0);
const guardando = ref(false);
const error = ref('');

const nombre = ref('');
const temaBase = ref('classic');
const acento = ref('#f97316');
const fondo = ref('');

// sembrar con lo que ya exista en el servidor
function sincronizar() {
  const c = config.value;
  nombre.value = c?.sucursalNombre && c.sucursalNombre !== 'Sucursal Principal' ? c.sucursalNombre : '';
  temaBase.value = c?.temaBase || 'classic';
  acento.value = c?.acento || '#f97316';
  fondo.value = c?.fondo || '';
}
sincronizar();

// La config llega async (o cambia al seleccionar otra rama): refrescar el
// wizard mientras el usuario no haya escrito todavia.
watch(config, () => {
  if (paso.value === 0 && !nombre.value.trim() && !guardando.value) sincronizar();
  else if (paso.value === 1) {
    temaBase.value = config.value?.temaBase || temaBase.value;
    acento.value = config.value?.acento || acento.value;
    fondo.value = config.value?.fondo || '';
  }
});

// Si el login llega aqui, la rama esta virgen: el paso de colores sigue
// siendo util, pero si la rama ya fue creada desde "Agregar sucursal" su
// nombre esta puesto, igual dejamos confirmar/editar (paso 0).
const pasos = ['Negocio', 'Estilo', 'Admin'];
const titulo = computed(() => ['¿Cómo se llama tu negocio?', 'Personaliza tu estilo', 'Crea tu administrador'][paso.value]);
const subtitulo = computed(() => [
  'El nombre aparecerá en el sistema y en tus reportes.',
  'Elige la paleta base y el color principal. Verás los cambios al instante.',
  'Crea la cuenta con la que entrarás a administrar el negocio.',
][paso.value]);

async function siguiente() {
  if (guardando.value) return;
  error.value = '';
  if (paso.value === 0) {
    const n = nombre.value.trim();
    if (n.length < 2) { error.value = 'Escribe un nombre de al menos 2 caracteres.'; return; }
    guardando.value = true;
    const r = await guardar({ nombre: n });
    guardando.value = false;
    if (!r.ok) { error.value = r.mensaje || 'No se pudo guardar el nombre.'; return; }
    cargarSucursales(); // la tarjeta del selector muestra el nuevo nombre
    paso.value = 1;
  } else if (paso.value === 1) {
    guardando.value = true;
    const r = await guardar({
      temaBase: temaBase.value,
      acento: acento.value,
      fondo: temaBase.value === 'custom' ? fondo.value : '',
    });
    guardando.value = false;
    if (!r.ok) { error.value = r.mensaje || 'No se pudo guardar la apariencia.'; return; }
    paso.value = 2;
  }
}

function atras() {
  error.value = '';
  if (paso.value > 0) paso.value -= 1;
}

function submitAdmin(datos: { nombre: string; apellido_p: string; apellido_m: string; usuario: string; password_hash: string }) {
  error.value = '';
  crearPrimerAdmin(datos);
}

// Al salir del wizard, devolver la app a la apariencia realmente guardada.
onBeforeUnmount(async () => {
  await cargar();
  aplicar();
});
</script>

<template>
  <div class="setup-wizard">
    <div class="sw-progreso">
      <template v-for="(p, i) in pasos" :key="p">
        <span class="sw-paso" :class="{ actual: paso === i, hecho: paso > i }">
          <span class="sw-punto">{{ paso > i ? '✓' : i + 1 }}</span>
          <span class="sw-paso-nombre">{{ p }}</span>
        </span>
        <span v-if="i < pasos.length - 1" class="sw-linea" :class="{ hecha: paso > i }" />
      </template>
    </div>

    <h3 class="sw-titulo">{{ titulo }}</h3>
    <p class="sw-sub">{{ subtitulo }}</p>

    <div v-if="paso === 0" class="sw-cuerpo">
      <input
        v-model="nombre"
        type="text"
        maxlength="60"
        placeholder="Ej: Refresquería Lola"
        class="sw-input"
        :disabled="guardando"
        @keyup.enter="siguiente"
      >
    </div>

    <div v-else-if="paso === 1" class="sw-cuerpo">
      <PasoApariencia v-model:temaBase="temaBase" v-model:acento="acento" v-model:fondo="fondo" />
    </div>

    <div v-else class="sw-cuerpo">
      <FirstAdminForm @submit="submitAdmin" />
      <p v-if="creandoPrimerAdmin" class="sw-creando">Creando tu cuenta...</p>
    </div>

    <p v-if="error" class="sw-error">{{ error }}</p>

    <div class="sw-acciones">
      <button v-if="paso > 0" type="button" class="sw-atras" :disabled="guardando || creandoPrimerAdmin" @click="atras">
        ← Atrás
      </button>
      <button
        v-if="paso < 2"
        type="button"
        class="sw-siguiente"
        :disabled="guardando"
        @click="siguiente"
      >
        {{ guardando ? 'Guardando...' : 'Siguiente →' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-wizard {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  animation: fadeSlideIn 400ms ease-out;
}
.sw-progreso {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}
.sw-paso {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  opacity: 0.45;
  transition: opacity 0.2s;
}
.sw-paso.actual, .sw-paso.hecho { opacity: 1; }
.sw-punto {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.66rem;
  font-weight: 900;
  background: var(--bg-secondary, #334155);
  color: var(--text-primary, #f1f5f9);
}
.sw-paso.actual .sw-punto { background: var(--accent-fill, var(--accent-color)); color: var(--color-on-brand); }
.sw-paso.hecho .sw-punto { background: var(--success-color, #22c55e); color: var(--bg-primary); }
.sw-paso-nombre {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}
.sw-linea {
  width: 26px;
  height: 2px;
  background: var(--border-color, #475569);
  border-radius: 2px;
}
.sw-linea.hecha { background: var(--success-color, #22c55e); }
.sw-titulo {
  margin: 0.2rem 0 0;
  font-size: 1rem;
  font-weight: 900;
  text-align: center;
  color: var(--text-primary);
}
.sw-sub {
  margin: 0;
  font-size: 0.68rem;
  text-align: center;
  color: var(--text-secondary);
}
.sw-cuerpo { margin-top: 0.2rem; }
.sw-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.sw-input:focus { outline: none; border-color: var(--accent-color); }
.sw-acciones {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}
.sw-atras, .sw-siguiente {
  padding: 0.5rem 1rem;
  font-size: 0.74rem;
  font-weight: 800;
  border-radius: 8px;
  cursor: pointer;
  border: none;
}
.sw-atras {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}
.sw-siguiente {
  margin-left: auto;
  background: linear-gradient(135deg, var(--gradient-btn-start), var(--gradient-btn-end));
  color: var(--bg-primary);
}
.sw-atras:disabled, .sw-siguiente:disabled { opacity: 0.55; cursor: not-allowed; }
.sw-error {
  margin: 0;
  font-size: 0.68rem;
  text-align: center;
  color: var(--error-color, #ef4444);
}
.sw-creando {
  margin: 0.4rem 0 0;
  text-align: center;
  font-size: 0.7rem;
  color: var(--text-secondary);
}
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
