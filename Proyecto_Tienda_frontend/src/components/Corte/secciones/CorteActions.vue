<script setup lang="ts">
defineProps<{ esAdministrador: boolean; cargandoCorte: boolean }>();
defineEmits<{
  'generar-corte': []; 'abrir-modal-diario': []; 'abrir-modal-mensual': [];
  'abrir-historial': []; 'abrir-modal-apartados': []; 'abrir-modal-anual': [];
}>();
</script>
<template>
  <section class="actions-section">
    <div class="actions-grid" :class="{ 'solo-corte': !esAdministrador }">
      <button class="action-btn corte-btn" :disabled="cargandoCorte" @click="$emit('generar-corte')">
        <span class="action-icon">⚔️</span> Generar Corte
      </button>
      <button class="action-btn diario-btn" @click="$emit('abrir-modal-diario')">
        <span class="action-icon">📅</span> Reporte Diario
      </button>
      <button class="action-btn mensual-btn" @click="$emit('abrir-modal-mensual')">
        <span class="action-icon">📆</span> Reporte Mensual
      </button>
      <button class="action-btn historial-btn" @click="$emit('abrir-historial')">
        <span class="action-icon">📜</span> Historial
      </button>
      <button v-if="esAdministrador" class="action-btn apartados-btn" @click="$emit('abrir-modal-apartados')">
        <span class="action-icon">📦</span> Apartados
      </button>
      <button class="action-btn anual-btn" @click="$emit('abrir-modal-anual')">
        <span class="action-icon">📊</span> Reporte Anual
      </button>
    </div>
  </section>
</template>
