<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCorners?: boolean
  showClose?: boolean
}>(), {
  size: 'md',
  showCorners: true,
  showClose: true
})

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="b-modal-overlay" @click.self="emit('close')">
        <div class="b-modal-container" :class="[`b-modal--${size}`]">
          <div v-if="showCorners" class="b-modal-corner b-modal-corner--tl"></div>
          <div v-if="showCorners" class="b-modal-corner b-modal-corner--tr"></div>
          <div v-if="showCorners" class="b-modal-corner b-modal-corner--bl"></div>
          <div v-if="showCorners" class="b-modal-corner b-modal-corner--br"></div>

          <div class="b-modal-decoration">◆</div>

          <button v-if="showClose" class="b-modal-close" @click="emit('close')" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <header v-if="title || $slots.header" class="b-modal-header">
            <slot name="header">
              <h2>{{ title }}</h2>
            </slot>
          </header>

          <div class="b-modal-body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="b-modal-footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* --- Overlay --- */
.b-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

/* --- Container --- */
.b-modal-container {
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 1.5rem;
  position: relative;
  animation: b-modal-slide-in 0.3s ease;
}

/* --- Sizes --- */
.b-modal--sm  { max-width: 450px; }
.b-modal--md  { max-width: 700px; }
.b-modal--lg  { max-width: 900px; }
.b-modal--xl  { max-width: 1100px; }

/* --- Decoration --- */
.b-modal-decoration {
  position: absolute;
  top: 10px;
  right: 20px;
  font-size: 2rem;
  color: var(--color-brand);
  opacity: 0.1;
  pointer-events: none;
}

/* --- Header --- */
.b-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.b-modal-header h2 {
  font-family: var(--font-title);
  font-size: 1.3rem;
  color: var(--color-brand);
  margin: 0;
}

/* --- Close button --- */
.b-modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.3rem;
  line-height: 1;
  transition: color var(--transition-fast);
}

.b-modal-close:hover {
  color: var(--color-text-primary);
}

/* --- Corners --- */
.b-modal-corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: var(--color-brand);
  opacity: 0.3;
  pointer-events: none;
}

.b-modal-corner--tl { top: 10px; left: 10px; border-top: 2px solid; border-left: 2px solid; }
.b-modal-corner--tr { top: 10px; right: 10px; border-top: 2px solid; border-right: 2px solid; }
.b-modal-corner--bl { bottom: 10px; left: 10px; border-bottom: 2px solid; border-left: 2px solid; }
.b-modal-corner--br { bottom: 10px; right: 10px; border-bottom: 2px solid; border-right: 2px solid; }

/* --- Body --- */
.b-modal-body {
  position: relative;
}

/* --- Footer --- */
.b-modal-footer {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

/* --- Animation --- */
@keyframes b-modal-slide-in {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* --- Transition --- */
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

/* --- Responsive --- */
@media (max-width: 768px) {
  .b-modal-container {
    max-width: 95vw;
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .b-modal-container {
    max-width: 100vw;
    border-radius: 12px;
    padding: 0.8rem;
  }
}
</style>
