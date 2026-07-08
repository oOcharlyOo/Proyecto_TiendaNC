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
    <div class="link-sprite" aria-hidden="true">
      <div class="link-frame frame1"></div>
      <div class="link-frame frame2"></div>
    </div>
    <div class="octo-sprite" aria-hidden="true">
      <div class="octo-frame frame1"></div>
      <div class="octo-frame frame2"></div>
    </div>
  </div>
</template>
