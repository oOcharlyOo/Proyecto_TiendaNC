<script setup lang="ts">
defineProps<{ esAdministrador: boolean; cargandoCorte: boolean }>();
defineEmits<{
  'generar-corte': []; 'abrir-modal-diario': []; 'abrir-modal-mensual': [];
  'abrir-historial': []; 'abrir-modal-apartados': []; 'abrir-modal-anual': [];
}>();
</script>
<template>
  <section class="actions-section">
    <div class="actions-primary">
      <button class="action-btn corte-btn btn-primary" :disabled="cargandoCorte" @click="$emit('generar-corte')">
        <span class="action-icon">⚔️</span>
        <span class="btn-text">{{ cargandoCorte ? 'Generando...' : 'GENERAR CORTE' }}</span>
      </button>
    </div>
    <div v-if="esAdministrador" class="actions-secondary">
      <button class="action-btn diario-btn" @click="$emit('abrir-modal-diario')">
        <span class="action-icon">📅</span> Reporte Diario
      </button>
      <button class="action-btn mensual-btn" @click="$emit('abrir-modal-mensual')">
        <span class="action-icon">📆</span> Reporte Mensual
      </button>
      <button class="action-btn historial-btn" @click="$emit('abrir-historial')">
        <span class="action-icon">📜</span> Historial
      </button>
      <button class="action-btn apartados-btn" @click="$emit('abrir-modal-apartados')">
        <span class="action-icon">📦</span> Apartados
      </button>
      <button class="action-btn anual-btn" @click="$emit('abrir-modal-anual')">
        <span class="action-icon">📊</span> Reporte Anual
      </button>
    </div>
  </section>
</template>

<style scoped>
.actions-section {
  padding: 1rem 0 1.5rem;
  position: relative;
  z-index: 1;
}

.actions-primary {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.btn-primary {
  font-size: 1.3rem !important;
  padding: 1.2rem 3rem !important;
  border-radius: 16px !important;
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 20%, transparent), color-mix(in srgb, var(--color-accent) 5%, transparent)) !important;
  border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent) !important;
  box-shadow: 0 0 30px color-mix(in srgb, var(--color-accent) 15%, transparent) !important;
  letter-spacing: 2px;
  transition: all 0.3s ease !important;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 0 40px color-mix(in srgb, var(--color-accent) 25%, transparent) !important;
}

.btn-primary .action-icon {
  font-size: 1.8rem !important;
}

.actions-secondary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.6rem;
}

.actions-secondary .action-btn {
  font-size: 0.8rem;
  padding: 0.6rem 0.8rem;
}

@media (max-width: 768px) {
  .btn-primary {
    font-size: 1.1rem !important;
    padding: 1rem 2rem !important;
  }
  .actions-secondary {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .btn-primary {
    font-size: 1rem !important;
    padding: 0.85rem 1.5rem !important;
    width: 100%;
  }
  .btn-primary .action-icon {
    font-size: 1.4rem !important;
  }
  .actions-secondary {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem;
  }
  .actions-secondary .action-btn {
    font-size: 0.7rem;
    padding: 0.5rem 0.5rem;
  }
  .actions-section {
    padding: 0.5rem 0 1rem;
  }
}
</style>
