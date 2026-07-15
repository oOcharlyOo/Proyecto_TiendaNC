<script setup lang="ts">

defineProps<{
  mensaje: string;
  mensajeTipo: 'ok' | 'error' | 'info';
}>();
</script>

<template>
  <Transition name="pos-toast">
    <div v-if="mensaje" class="pos-toast-overlay">
      <div class="pos-toast-card" :class="`pos-toast-${mensajeTipo}`">
        <span class="pos-toast-icon">{{ mensajeTipo === 'ok' ? '✓' : mensajeTipo === 'error' ? '✕' : 'ℹ' }}</span>
        <span class="pos-toast-text">{{ mensaje }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pos-toast-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: transparent; pointer-events: none;
}
.pos-toast-card {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 24px; border-radius: var(--radius-sm);
  font-size: 0.95rem; font-weight: 600;
  box-shadow: 4px 4px 16px rgba(0,0,0,0.3);
  border: none;
  animation: posToastPop 0.3s ease-out;
}
.pos-toast-ok { background: var(--color-success); color: #fff; }
.pos-toast-error { background: var(--color-error); color: #fff; }
.pos-toast-info { background: var(--color-bg-panel); color: var(--color-accent); box-shadow: 6px 6px 16px rgba(0,0,0,0.3); }
.pos-toast-icon { font-size: 1.1rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
.pos-toast-text { max-width: 300px; text-align: center; }
@keyframes posToastPop { 0% { opacity: 0; transform: scale(0.8) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
.pos-toast-enter-active { animation: posToastPop 0.3s ease-out; }
.pos-toast-leave-active { animation: posToastPop 0.2s ease-in reverse; }
@media(max-width:480px){.pos-toast-card{max-width:90vw;font-size:.85rem;padding:10px 16px}}
</style>
