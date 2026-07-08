<script setup lang="ts">
defineProps<{ mensaje: string; mensajeTipo: 'ok' | 'error' | 'info' }>();
defineEmits<{ 'cerrar-mensaje': [] }>();
</script>
<template>
  <section class="hero-section">
    <div class="bg-fog"></div>
    <div class="bg-scanlines"></div>
    <div v-if="mensaje" class="mensaje-flash" :class="mensajeTipo">
      <span class="mensaje-texto">{{ mensaje }}</span>
      <button class="mensaje-cerrar" @click="$emit('cerrar-mensaje')">✕</button>
    </div>
    <div class="hero-decoration left">❧</div>
    <div class="hero-content">
      <h1 class="hero-title">Corte de Caja</h1>
      <p class="hero-subtitle">Administración de ingresos, egresos y reportes</p>
    </div>
    <div class="hero-decoration right">❧</div>
  </section>
</template>
