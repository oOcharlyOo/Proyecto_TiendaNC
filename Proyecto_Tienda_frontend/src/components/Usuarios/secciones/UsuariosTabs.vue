<script setup lang="ts">
defineProps<{
  seccionActiva: 'usuarios' | 'ventas' | 'asistencias';
  esAdmin: boolean;
}>();

const emit = defineEmits<{
  'update:seccionActiva': [value: 'usuarios' | 'ventas' | 'asistencias'];
}>();
</script>

<template>
  <section class="tabs-section">
    <div class="tabs-container">
      <button
        class="tab-btn"
        :class="{ active: seccionActiva === 'usuarios' }"
        @click="emit('update:seccionActiva', 'usuarios')"
      >
        <span class="tab-icon">👥</span>
        <span class="tab-text">Héroes</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: seccionActiva === 'ventas' }"
        @click="emit('update:seccionActiva', 'ventas')"
      >
        <span class="tab-icon">📊</span>
        <span class="tab-text">Desempeño</span>
        <span class="tab-badge">BETA</span>
      </button>
      <button
        v-if="esAdmin"
        class="tab-btn"
        :class="{ active: seccionActiva === 'asistencias' }"
        @click="emit('update:seccionActiva', 'asistencias')"
      >
        <span class="tab-icon">📅</span>
        <span class="tab-text">Asistencias</span>
      </button>
    </div>
  </section>
</template>
