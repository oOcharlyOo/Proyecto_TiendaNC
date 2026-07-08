<script setup lang="ts">
defineProps<{
  mensaje: string;
  mensajeTipo: 'ok' | 'error' | 'info';
}>();
</script>

<template>
  <Transition name="toast">
    <div v-if="mensaje" class="toast-overlay">
      <div class="toast-card" :class="`toast-${mensajeTipo}`">
        <span class="toast-icon">{{ mensajeTipo === 'ok' ? '✓' : mensajeTipo === 'error' ? '✕' : 'ℹ' }}</span>
        <span class="toast-text">{{ mensaje }}</span>
      </div>
    </div>
  </Transition>
</template>
