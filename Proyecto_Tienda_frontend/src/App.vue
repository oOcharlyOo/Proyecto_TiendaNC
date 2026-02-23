<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar.vue';

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
