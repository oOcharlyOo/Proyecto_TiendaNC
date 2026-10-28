<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ name: string; pass: string }>();
defineEmits<{ 'update:name': [value: string]; 'update:pass': [value: string]; submit: [] }>();

const verPassword = ref(false);
</script>

<template>
  <form @submit.prevent="$emit('submit')" class="classic-form">
    <div>
      <label for="name">Usuario</label>
      <input id="name" :value="name" @input="$emit('update:name', ($event.target as HTMLInputElement).value)"
        type="text" placeholder="admin" autocomplete="username">
    </div>
    <div>
      <label for="password">Contraseña</label>
      <div class="campo-pass">
        <input id="password" :value="pass" @input="$emit('update:pass', ($event.target as HTMLInputElement).value)"
          :type="verPassword ? 'text' : 'password'" placeholder="........" autocomplete="current-password">
        <button type="button" class="ojo-btn"
          :aria-label="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          :title="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          @click="verPassword = !verPassword">{{ verPassword ? '🙈' : '👁' }}</button>
      </div>
    </div>
    <button type="submit">Iniciar sesión</button>
  </form>
</template>

<style scoped>
/* Campo de contraseña con boton "ojo" para revelarla */
.campo-pass { position: relative; }
.campo-pass input { padding-right: 2.6rem !important; }
.ojo-btn {
  position: absolute; right: 0.45rem; top: 50%;
  width: auto !important; min-width: 0; margin: 0 !important;
  padding: 0.15rem 0.3rem !important; border: none !important;
  background: transparent !important; box-shadow: none !important;
  transform: translateY(-50%); font-size: 1.05rem; line-height: 1;
  text-transform: none !important; letter-spacing: 0 !important;
  color: var(--text-secondary) !important; cursor: pointer;
}
.ojo-btn:hover {
  background: transparent !important; transform: translateY(-50%) !important;
  color: var(--text-primary) !important;
}
</style>
