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
      <button v-if="esAdministrador" class="action-btn corte-btn" :disabled="cargandoCorte" @click="$emit('generar-corte')">
        <span class="action-icon">⚔️</span> Generar Corte
      </button>
      <button v-if="esAdministrador" class="action-btn diario-btn" @click="$emit('abrir-modal-diario')">
        <span class="action-icon">📅</span> Reporte Diario
      </button>
      <button v-if="esAdministrador" class="action-btn mensual-btn" @click="$emit('abrir-modal-mensual')">
        <span class="action-icon">📆</span> Reporte Mensual
      </button>
      <button v-if="esAdministrador" class="action-btn historial-btn" @click="$emit('abrir-historial')">
        <span class="action-icon">📜</span> Historial
      </button>
      <button v-if="esAdministrador" class="action-btn apartados-btn" @click="$emit('abrir-modal-apartados')">
        <span class="action-icon">📦</span> Apartados
      </button>
      <button v-if="esAdministrador" class="action-btn anual-btn" @click="$emit('abrir-modal-anual')">
        <span class="action-icon">📊</span> Reporte Anual
      </button>
    </div>
  </section>
</template>

<style scoped>
.actions-section {
  padding: 0.5rem 0 1.5rem;
  position: relative;
  z-index: 1;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.8rem;
}

.actions-grid.solo-corte {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

@media (max-width: 768px) {
  .actions-grid { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
}
</style>
