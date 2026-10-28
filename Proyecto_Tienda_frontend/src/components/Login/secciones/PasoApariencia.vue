<script setup lang="ts">
import { computed } from 'vue';
import { usarApariencia } from '@/composables/useApariencia';

/**
 * Paso "Personalizacion" del wizard (tambien lo reutiliza el panel de admin):
 * elige tema base y color de acento con vista previa en vivo de toda la app.
 */
const props = defineProps<{ temaBase: string; acento: string }>();
const emit = defineEmits<{
  'update:temaBase': [value: string];
  'update:acento': [value: string];
}>();

const { aplicarValores } = usarApariencia();

const temas = [
  { id: 'classic', nombre: 'Clásico', bg: '#1e293b', panel: '#475569', accent: '#f97316' },
  { id: 'modern', nombre: 'Moderno', bg: '#1a1a2e', panel: '#0f3460', accent: '#e94560' },
  { id: 'ocean', nombre: 'Océano', bg: '#1e3a5f', panel: '#3d5a7f', accent: '#3b82f6' },
  { id: 'forest', nombre: 'Bosque', bg: '#1a2e1a', panel: '#3a4d3a', accent: '#22c55e' },
];

const paleta = [
  '#f97316', '#f59e0b', '#22c55e', '#10b981', '#14b8a6',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#f43f5e',
];

function elegirTema(id: string) {
  emit('update:temaBase', id);
  aplicarValores(id, props.acento, true);
}

function elegirAcento(color: string) {
  emit('update:acento', color);
  aplicarValores(props.temaBase, color, true);
}

const esPersonalizado = computed(
  () => !paleta.some(c => c.toLowerCase() === props.acento.toLowerCase())
);
</script>

<template>
  <div class="paso-apariencia">
    <span class="ap-label">Tema base</span>
    <div class="ap-temas">
      <button
        v-for="t in temas"
        :key="t.id"
        type="button"
        class="ap-tema"
        :class="{ activo: temaBase === t.id }"
        :style="{ background: t.bg }"
        @click="elegirTema(t.id)"
      >
        <span class="ap-tema-panel" :style="{ background: t.panel }">
          <span class="ap-tema-chip" :style="{ background: t.accent }" />
        </span>
        <span class="ap-tema-nombre">{{ t.nombre }}</span>
      </button>
    </div>

    <span class="ap-label">Color de acento</span>
    <div class="ap-acentos">
      <button
        v-for="c in paleta"
        :key="c"
        type="button"
        class="ap-acento"
        :class="{ activo: acento.toLowerCase() === c.toLowerCase() }"
        :style="{ background: c }"
        :title="c"
        @click="elegirAcento(c)"
      />
      <label
        class="ap-acento ap-acento-custom"
        :class="{ activo: esPersonalizado }"
        title="Color personalizado"
      >
        <input
          type="color"
          :value="acento"
          @input="elegirAcento(($event.target as HTMLInputElement).value)"
        >
        <span>🎨</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.paso-apariencia {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.ap-label {
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary, #94a3b8);
}
.ap-temas {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}
.ap-tema {
  border: 2px solid transparent;
  border-radius: 10px;
  padding: 0.45rem 0.3rem 0.35rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  transition: transform 0.12s, border-color 0.12s;
}
.ap-tema:hover { transform: translateY(-2px); }
.ap-tema.activo { border-color: var(--accent-color); }
.ap-tema-panel {
  width: 100%;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ap-tema-chip {
  width: 60%;
  height: 9px;
  border-radius: 999px;
}
.ap-tema-nombre {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--text-primary, #f1f5f9);
}
.ap-acentos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}
.ap-acento {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: transform 0.12s, border-color 0.12s;
}
.ap-acento:hover { transform: scale(1.12); }
.ap-acento.activo { border-color: var(--text-primary, #f1f5f9); box-shadow: 0 0 0 2px var(--accent-color); }
.ap-acento-custom {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f43f5e, #8b5cf6, #0ea5e9);
  font-size: 0.95rem;
}
.ap-acento-custom input[type="color"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
</style>
