<script setup lang="ts">
defineProps<{ currentTheme: string }>();
defineEmits<{ selectTheme: [value: string] }>();

const themes = [
  { id: 'zelda', icon: '🛡️', label: 'Tema Zelda' },
  { id: 'alforja', icon: '🎒', label: 'Tema Alforja' },
  { id: 'skyward', icon: '☁️', label: 'Tema Skyward' },
  { id: 'deathmountain', icon: '🌋', label: 'Tema Muerte Montaña' },
  { id: 'darkforest', icon: '🌲', label: 'Tema Bosque Oscuro', dark: true },
  { id: 'darkmountain', icon: '⛰️', label: 'Tema Montaña Oscura', dark: true },
  { id: 'darkskyward', icon: '🌙', label: 'Tema Cielo Oscuro', dark: true },
  { id: 'darknight', icon: '⭐', label: 'Tema Noche Oscura', dark: true },
];
</script>

<template>
  <div class="theme-selector">
    <span class="theme-label">Seleccionar Tema</span>
    <div class="theme-carousel">
      <button v-for="t in themes" :key="t.id" type="button"
        :class="['theme-btn', { active: currentTheme === t.id, dark: t.dark }]"
        @click="$emit('selectTheme', t.id)" :title="t.label">
        {{ t.icon }}
      </button>
    </div>
  </div>
</template>
