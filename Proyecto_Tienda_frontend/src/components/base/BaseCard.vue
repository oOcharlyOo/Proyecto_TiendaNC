<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'accent' | 'success' | 'error' | 'warning' | 'info'
  clickable?: boolean
}>(), {
  variant: 'default',
  clickable: false
})
</script>

<template>
  <div class="b-card" :class="[`b-card--${variant}`, { 'b-card--clickable': clickable }]">
    <slot />
  </div>
</template>

<style scoped>
.b-card {
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  transition: all var(--transition-normal);
  backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;
}

.b-card:hover {
  border-color: var(--color-brand);
  box-shadow: 0 8px 25px var(--color-shadow);
}

.b-card--clickable {
  cursor: pointer;
}

.b-card--clickable:hover {
  transform: translateY(-2px);
}

.b-card--accent {
  border-color: color-mix(in srgb, var(--color-brand) 30%, transparent);
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-brand) 8%, transparent), var(--color-bg-secondary));
}

.b-card--success {
  border-color: color-mix(in srgb, var(--color-success) 30%, transparent);
}

.b-card--error {
  border-color: color-mix(in srgb, var(--color-error) 30%, transparent);
}

.b-card--warning {
  border-color: color-mix(in srgb, var(--color-warning) 30%, transparent);
}

.b-card--info {
  border-color: color-mix(in srgb, var(--color-info) 30%, transparent);
}
</style>
