<script setup lang="ts">
defineProps<{
  abierto: boolean; fechaDiaria: string; cargando: boolean;
}>();
defineEmits<{
  'cerrar': []; 'generar-reporte': []; 'cambiar-fecha': [fecha: string];
}>();
</script>
<template>
  <div v-if="abierto" class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-container diario-modal">
      <div class="modal-decoration">✧</div>
      <div class="modal-header"><h2>Reporte Diario</h2><button class="modal-close" @click="$emit('cerrar')">✕</button></div>
      <div class="modal-body">
        <div class="input-group">
          <label>Fecha:</label>
          <div class="input-wrapper"><input type="date" :value="fechaDiaria" @input="$emit('cambiar-fecha', ($event.target as HTMLInputElement).value)" class="input-fancy" /></div>
        </div>
        <button class="action-btn diario-btn generar-btn" :disabled="cargando" @click="$emit('generar-reporte')">
          {{ cargando ? 'Generando...' : 'Generar Reporte Diario' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

.modal-container {
  background: var(--color-bg-panel);
  border: none;
  box-shadow: 3px 3px 8px rgba(0,0,0,.12), -1px -1px 4px rgba(255,255,255,.02);
  border-radius: 20px;
  width: 100%;
  max-width: 450px;
  padding: 1.5rem;
  position: relative;
  animation: modalSlideIn 0.3s ease;
}

.modal-decoration {
  position: absolute;
  top: 10px;
  right: 20px;
  font-size: 2rem;
  color: var(--color-accent);
  opacity: 0.1;
  pointer-events: none;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h2 {
  font-size: 1.3rem;
  color: var(--color-accent);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.3rem;
  line-height: 1;
  transition: color 0.2s;
}

.modal-close:hover { color: var(--color-text-primary); }

.generar-btn { width: 100%; margin: 1rem 0; }

.input-group { margin-bottom: 0.5rem; }
.input-group label { display: block; margin-bottom: 0.3rem; color: var(--color-text-secondary); font-size: 0.9rem; }
.input-wrapper input { width: 100%; padding: 0.6rem; border-radius: 10px; border: none; background: rgba(255,255,255,.05); color: var(--color-text-primary); font-size: 1rem; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalSlideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
