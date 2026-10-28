<script setup lang="ts">
defineProps<{ name: string; pass: string }>();
defineEmits<{ 'update:name': [value: string]; 'update:pass': [value: string]; submit: [] }>();
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
      <input id="password" :value="pass" @input="$emit('update:pass', ($event.target as HTMLInputElement).value)"
        type="password" placeholder="........" autocomplete="current-password">
    </div>
    <button type="submit">Iniciar sesión</button>
  </form>
</template>
