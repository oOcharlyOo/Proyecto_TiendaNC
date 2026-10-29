<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{ submit: [datos: { nombre: string; apellido_p: string; apellido_m: string; usuario: string; password_hash: string }] }>();

const nombre = ref('');
const apellidoP = ref('');
const apellidoM = ref('');
const usuario = ref('');
const password = ref('');

const loading = ref(false);

function onSubmit() {
  if (!nombre.value.trim() || !apellidoP.value.trim() || !usuario.value.trim() || !password.value.trim()) return;
  loading.value = true;
  emit('submit', {
    nombre: nombre.value.trim(),
    apellido_p: apellidoP.value.trim(),
    apellido_m: apellidoM.value.trim(),
    usuario: usuario.value.trim(),
    password_hash: password.value
  });
}
</script>

<template>
  <form @submit.prevent="onSubmit" class="classic-form first-admin-form">
    <div class="admin-badge">
      <span class="admin-icon">&#x1F451;</span>
      <span>Crear Guardián Principal</span>
    </div>

    <div>
      <label for="fa-nombre">Nombre</label>
      <input id="fa-nombre" v-model="nombre" type="text" placeholder="Link" autocomplete="given-name"
        :disabled="loading" required>
    </div>

    <div class="name-row">
      <div>
        <label for="fa-apellido-p">Apellido Paterno</label>
        <input id="fa-apellido-p" v-model="apellidoP" type="text" placeholder="de Hyrule" autocomplete="family-name"
          :disabled="loading" required>
      </div>
      <div>
        <label for="fa-apellido-m">Apellido Materno</label>
        <input id="fa-apellido-m" v-model="apellidoM" type="text" placeholder="Legend" autocomplete="additional-name"
          :disabled="loading">
      </div>
    </div>

    <div>
      <label for="fa-usuario">Usuario</label>
      <input id="fa-usuario" v-model="usuario" type="text" placeholder="hero_admin" autocomplete="username"
        :disabled="loading" required>
    </div>

    <div>
      <label for="fa-password">Contraseña</label>
      <input id="fa-password" v-model="password" type="password" placeholder="........" autocomplete="new-password"
        :disabled="loading" required>
    </div>

    <button type="submit" :disabled="loading || !nombre.trim() || !apellidoP.trim() || !usuario.trim() || !password.trim()">
      <span v-if="loading" class="btn-spinner"></span>
      <span v-else>Crear Guardián</span>
    </button>
  </form>
</template>

<style scoped>
.first-admin-form { animation: fadeSlideIn 500ms ease-out 300ms backwards; }

.admin-badge {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.6rem 0.8rem; margin-bottom: 0.3rem;
  background: linear-gradient(135deg, rgba(248, 214, 103, 0.15) 0%, rgba(248, 214, 103, 0.05) 100%);
  border: 2px dashed var(--accent-color); border-radius: 8px;
  color: var(--accent-color); font-family: "Courier New", monospace;
  font-size: clamp(0.72rem, 2vw, 0.82rem); text-transform: uppercase;
  letter-spacing: 0.08em; font-weight: 900;
}

.admin-icon { font-size: 1.2rem; }

.name-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
}

.btn-spinner {
  display: inline-block; width: 16px; height: 16px;
  border: 2px solid rgba(0,0,0,0.2); border-top-color: currentColor;
  border-radius: 50%; animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

button:disabled {
  opacity: 0.6; cursor: not-allowed; transform: none !important;
}

@media (max-width: 430px) {
  .name-row { grid-template-columns: 1fr; gap: 0; }
}
</style>
