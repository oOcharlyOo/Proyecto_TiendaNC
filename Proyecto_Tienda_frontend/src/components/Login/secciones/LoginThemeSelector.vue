<script setup lang="ts">
defineProps<{ currentTheme: string }>();
defineEmits<{ selectTheme: [value: string] }>();

const themes = [
  { id: 'classic', icon: '🟠', label: 'Tema Clásico' },
  { id: 'modern', icon: '💠', label: 'Tema Moderno' },
  { id: 'ocean', icon: '🌊', label: 'Tema Océano' },
  { id: 'forest', icon: '🌳', label: 'Tema Bosque' },
];
</script>

<template>
  <div class="theme-selector">
    <span class="theme-label">Seleccionar Tema</span>
    <div class="theme-carousel">
      <button v-for="t in themes" :key="t.id" type="button"
        :class="['theme-btn', { active: currentTheme === t.id }]"
        @click="$emit('selectTheme', t.id)" :title="t.label">
        {{ t.icon }}
      </button>
    </div>
  </div>
</template>
