<script setup lang="ts">
withDefaults(defineProps<{
  modelValue?: string | number
  label?: string
  type?: string
  placeholder?: string
  size?: 'sm' | 'md'
  disabled?: boolean
}>(), {
  type: 'text',
  size: 'md',
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="b-input-group" :class="[`b-input-group--${size}`]">
    <label v-if="label" class="b-input-label">{{ label }}</label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      class="b-input"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.b-input-group {
  margin-bottom: 1rem;
}

.b-input-group--row {
  display: flex;
  gap: 1rem;
}

.b-input-group--row > .b-input-group {
  flex: 1;
}

.b-input-label {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.3rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.b-input {
  width: 100%;
  padding: 0.6rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.9rem;
  font-family: inherit;
  transition: all var(--transition-fast);
  box-sizing: border-box;
}

.b-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.b-input::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.7;
}

/* --- Sizes --- */
.b-input-group--sm .b-input {
  padding: 0.3rem 0.5rem;
  font-size: 0.8rem;
  border-radius: var(--radius-sm);
  width: 80px;
}

/* --- Select variant --- */
select.b-input {
  cursor: pointer;
  appearance: auto;
}
</style>
