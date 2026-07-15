<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'accent' | 'danger' | 'success' | 'info' | 'muted' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  disabled?: boolean
}>(), {
  variant: 'accent',
  size: 'md',
  disabled: false
})
</script>

<template>
  <button
    class="b-btn"
    :class="[
      `b-btn--${variant}`,
      `b-btn--${size}`,
      { 'b-btn--disabled': disabled }
    ]"
    :disabled="disabled"
  >
    <span v-if="icon" class="b-btn-icon">{{ icon }}</span>
    <span class="b-btn-label"><slot /></span>
  </button>
</template>

<style scoped>
.b-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1.2rem;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 0.9rem;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-normal);
  backdrop-filter: blur(6px);
}

.b-btn:hover:not(.b-btn--disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px var(--color-shadow);
}

.b-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* --- Sizes --- */
.b-btn--sm {
  padding: 0.5rem 0.8rem;
  font-size: 0.8rem;
}

.b-btn--md {
  padding: 0.85rem 1.2rem;
  font-size: 0.9rem;
}

.b-btn--lg {
  padding: 1rem 1.5rem;
  font-size: 1rem;
}

/* --- Variants --- */
.b-btn--accent {
  border-color: color-mix(in srgb, var(--color-brand) 30%, transparent);
  color: var(--color-brand);
}

.b-btn--accent:hover:not(.b-btn--disabled) {
  background: color-mix(in srgb, var(--color-brand) 10%, transparent);
  border-color: var(--color-brand);
}

.b-btn--danger {
  border-color: color-mix(in srgb, var(--color-error) 30%, transparent);
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.b-btn--danger:hover:not(.b-btn--disabled) {
  background: color-mix(in srgb, var(--color-error) 20%, transparent);
  border-color: var(--color-error);
}

.b-btn--success {
  border-color: color-mix(in srgb, var(--color-success) 30%, transparent);
  color: var(--color-success);
}

.b-btn--success:hover:not(.b-btn--disabled) {
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
  border-color: var(--color-success);
}

.b-btn--info {
  border-color: color-mix(in srgb, var(--color-info) 30%, transparent);
  color: var(--color-info);
}

.b-btn--info:hover:not(.b-btn--disabled) {
  background: color-mix(in srgb, var(--color-info) 10%, transparent);
  border-color: var(--color-info);
}

.b-btn--muted {
  border-color: color-mix(in srgb, var(--color-text-secondary) 30%, transparent);
  color: var(--color-text-secondary);
}

.b-btn--muted:hover:not(.b-btn--disabled) {
  background: color-mix(in srgb, var(--color-text-secondary) 10%, transparent);
  border-color: var(--color-text-secondary);
}

.b-btn--outline {
  border-color: var(--color-border);
  color: var(--color-text-primary);
  background: transparent;
}

.b-btn--outline:hover:not(.b-btn--disabled) {
  background: color-mix(in srgb, var(--color-text-primary) 5%, transparent);
}

/* --- Icon --- */
.b-btn-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}
</style>
