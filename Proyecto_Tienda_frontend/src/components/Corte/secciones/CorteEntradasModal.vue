<script setup lang="ts">
import type { EgresoDTO } from '../logica/useCorte';
defineProps<{
  abierto: boolean; cargando: boolean; entradasDia: EgresoDTO[];
  formatoMoneda: (v: number) => string; formatoFecha: (f?: string) => string;
}>();
defineEmits<{ 'cerrar': [] }>();
</script>
<template>
  <div v-if="abierto" class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-container entradas-modal">
      <div class="modal-decoration">✧</div>
      <div class="modal-header"><h2>Entradas Extra</h2><button class="modal-close" @click="$emit('cerrar')">✕</button></div>
      <div class="modal-body">
        <div v-if="cargando" class="loading">Cargando entradas...</div>
        <div v-else class="pergamino-list">
          <div v-for="entrada in entradasDia" :key="entrada.idCaja" class="pergamino-item">
            <div class="egreso-monto positivo">+{{ formatoMoneda(entrada.monto) }}</div>
            <div class="egreso-detalle">
              <span class="egreso-desc">{{ entrada.descripcion }}</span>
              <span class="egreso-fecha">{{ formatoFecha(entrada.fechaMovimiento) }}</span>
            </div>
          </div>
          <p v-if="!entradasDia.length" class="empty-msg">Sin entradas registradas</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease;  }
.modal-container { background: var(--color-bg-panel); border:none;box-shadow:3px 3px 8px rgba(0,0,0,.12),-1px -1px 4px rgba(255,255,255,.02); border-radius: 20px; width: 100%; max-width: 700px; max-height: 85vh; overflow-y: auto; padding: 1.5rem; position: relative; animation: modalSlideIn 0.3s ease; }
.modal-decoration { position: absolute; top: 10px; right: 20px; font-size: 2rem; color: var(--color-accent); opacity: 0.1; pointer-events: none; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-header h2 {  font-size: 1.3rem; color: var(--color-accent); margin: 0; }
.modal-close { background: none; border: none; color: var(--color-text-secondary); font-size: 1.5rem; cursor: pointer; padding: 0.3rem; line-height: 1; transition: color 0.2s; }
.modal-close:hover { color: var(--color-text-primary); }
.loading { text-align: center; padding: 2rem; color: var(--color-text-secondary); font-size: 1rem; }
.pergamino-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 60vh; overflow-y: auto; }
.pergamino-item { display: flex; align-items: center; gap: 1rem; padding: 0.8rem 1rem; background: rgba(255,255,255,.02); border-radius: 10px; border: 1px solid rgba(255,255,255,.03); }
.egreso-monto { font-size: 1.2rem; font-weight: 700; color: var(--color-error); min-width: 100px;  }
.egreso-monto.positivo { color: var(--color-success); }
.egreso-detalle { flex: 1; }
.egreso-desc { display: block; font-size: 0.9rem; }
.egreso-fecha { font-size: 0.75rem; color: var(--color-text-secondary); }
.empty-msg { text-align: center; color: var(--color-text-secondary); padding: 2rem; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalSlideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
