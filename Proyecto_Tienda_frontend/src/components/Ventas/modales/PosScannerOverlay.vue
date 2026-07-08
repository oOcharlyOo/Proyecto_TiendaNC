<script setup lang="ts">
defineProps<{
  scannerActivo: boolean;
}>();

const emit = defineEmits<{
  (e: 'stop-scanner'): void;
}>();
</script>

<template>
  <div v-if="scannerActivo" class="scanner-full-overlay">
    <div class="scanner-frame">
      <div id="scanner-interactive"></div>
      <div class="scan-laser"></div>
      <button class="btn-stop-scan" @click="emit('stop-scanner')">Detener</button>
    </div>
  </div>
</template>
