<script setup lang="ts">
defineProps<{
  pestañaActiva: 'boveda' | 'ganancias';
  mensaje: string;
  mensajeTipo: 'ok' | 'error' | 'info';
}>();

const emit = defineEmits<{
  'cambiar-pestana': [pestana: 'boveda' | 'ganancias'];
}>();
</script>

<template>
  <header class="finanzas-header animate-fade-in">
    <div class="header-main">
      <div class="crown-wrapper">
        <span class="crown-icon">👑</span>
        <div class="crown-glow"></div>
      </div>
      <div class="title-group">
        <h1>{{ pestañaActiva === 'boveda' ? 'Bóveda Real' : 'Ganancias' }}</h1>
        <p class="subtitle">{{ pestañaActiva === 'boveda' ? 'Gestión centralizada del capital y flujo de efectivo' : 'Seguimiento de ganancias y rentabilidad' }}</p>
      </div>
      <div class="tabs-wrapper">
        <button
          class="tab-btn"
          :class="{ active: pestañaActiva === 'boveda' }"
          @click="emit('cambiar-pestana', 'boveda')"
        >
          <span class="tab-icon">💰</span>
          Bóveda
        </button>
        <button
          class="tab-btn"
          :class="{ active: pestañaActiva === 'ganancias' }"
          @click="emit('cambiar-pestana', 'ganancias')"
        >
          <span class="tab-icon">📈</span>
          Ganancias
        </button>
      </div>
    </div>

    <div v-if="mensaje" class="alert-box" :class="`alert-${mensajeTipo}`">
      <span class="alert-icon">{{ mensajeTipo === 'ok' ? '✅' : mensajeTipo === 'error' ? '❌' : 'ℹ️' }}</span>
      {{ mensaje }}
    </div>
  </header>
</template>
