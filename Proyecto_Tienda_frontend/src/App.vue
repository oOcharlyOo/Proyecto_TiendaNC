<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar/Navbar.vue';

const route = useRoute();
const showNavbar = computed(() => route.name !== 'Login');
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
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: auto;
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
