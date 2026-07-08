<script setup lang="ts">
const emit = defineEmits<{
  'entrada': [];
  'salida': [];
}>();
</script>

<template>
  <section class="actions-section animate-slide-up" style="animation-delay: 0.1s">
    <div class="section-card">
      <h3><span class="icon">⚒️</span> Operaciones Rápidas</h3>
      <div class="actions-buttons">
        <button class="action-btn btn-entry" @click="emit('entrada')">
          <div class="btn-content">
            <span class="btn-icon">📥</span>
            <div class="btn-text">
              <span class="primary">Ingreso Extra</span>
              <span class="secondary">Aumentar capital</span>
            </div>
          </div>
        </button>

        <button class="action-btn btn-exit" @click="emit('salida')">
          <div class="btn-content">
            <span class="btn-icon">📤</span>
            <div class="btn-text">
              <span class="primary">Salida / Gasto</span>
              <span class="secondary">Registrar retiro</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>
