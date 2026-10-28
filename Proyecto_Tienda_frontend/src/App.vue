<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar/Navbar.vue';
import { usarApariencia } from './composables/useApariencia';

const route = useRoute();
const showNavbar = computed(() => route.name !== 'Login');

// Traer la marca de la rama activa (tema + acento + nombre) antes de pintar.
onMounted(() => { usarApariencia().cargar(); });
</script>

<template>
  <div class="app-shell">
    <Navbar v-if="showNavbar" />
    <main class="view-shell">
      <router-view />
    </main>
  </div>
</template>

<style>
.app-shell {
  height: 100dvh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.view-shell {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.view-shell > * {
  height: 100%;
}
</style>
