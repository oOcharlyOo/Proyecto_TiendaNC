<script setup lang="ts">
</script>

<template>
  <div aria-hidden="true">
    <div class="fog-layer"></div>
    <div class="scanlines"></div>
    <div class="rupee-stars" aria-hidden="true">
      <span v-for="i in 10" :key="i" class="rupee-star"></span>
    </div>
    <div class="floating-particles" aria-hidden="true">
      <span v-for="i in 6" :key="i" class="particle"></span>
    </div>
  </div>
</template>
