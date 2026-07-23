<script setup lang="ts">
defineProps<{
  open: boolean;
  ventaPendienteSeleccionada: any;
  descripcionPendienteTexto: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:descripcionPendienteTexto', val: string): void;
  (e: 'guardar'): void;
}>();
</script>

<template>
  <div v-if="open" class="pos-modal-overlay" @click.self="emit('close')">
    <div class="pos-modal-card animate-pop-in">
      <header class="vp-modal-head">
        <h3 class="vp-modal-title">⏳ {{ ventaPendienteSeleccionada ? 'Editar Descripción' : 'Venta Pendiente' }}</h3>
        <button class="vp-modal-close" @click="emit('close')">✕</button>
      </header>
      <div class="vp-modal-body-clean">
        <p class="pendiente-hint">{{ ventaPendienteSeleccionada ? 'Modifica la descripción de la venta pendiente:' : 'Escribe la razón por la que esta venta queda pendiente:' }}</p>
        <textarea
          :value="descripcionPendienteTexto"
          class="pendiente-textarea"
          placeholder="Ej: El cliente regresa en 30 minutos a pagar..."
          rows="4"
          @input="emit('update:descripcionPendienteTexto', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
        <div class="pendiente-actions">
          <button class="btn-cancelar" @click="emit('close')">Cancelar</button>
          <button class="btn-guardar" @click="emit('guardar')">💾 {{ ventaPendienteSeleccionada ? 'Actualizar' : 'Guardar' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pos-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);backdrop-filter:blur(6px);z-index:200;display:grid;place-items:center;padding:1rem}
.pos-modal-card{background:var(--color-bg-panel);border-radius:var(--radius-lg);width:min(100%,480px);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:8px 8px 24px rgba(0,0,0,0.35),-4px -4px 16px rgba(255,255,255,0.03)}
.vp-modal-head{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.25rem;background:var(--color-bg-secondary);border-radius:var(--radius-lg) var(--radius-lg) 0 0}
.vp-modal-title{margin:0;font-size:1.1rem;color:var(--color-accent)}
.vp-modal-close{width:34px;height:34px;border:none;border-radius:50%;background:var(--color-bg-primary);color:var(--color-text-secondary);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,0.15);transition:all .15s}
.vp-modal-close:hover{background:var(--color-error);color:#fff}
.vp-modal-body-clean{padding:1.25rem;display:flex;flex-direction:column;gap:.85rem;flex:1}
.pendiente-hint{font-size:.9rem;color:var(--color-text-secondary);font-style:italic;margin:0}
.pendiente-textarea{width:100%;background:var(--color-bg-secondary);border:none;border-radius:var(--radius-sm);padding:.85rem;font-family:inherit;font-size:.95rem;color:var(--color-text-primary);resize:vertical;min-height:100px;outline:none;box-shadow:inset 3px 3px 6px rgba(0,0,0,0.2),inset -2px -2px 4px rgba(255,255,255,0.02);transition:all .2s;box-sizing:border-box}
.pendiente-textarea:focus{box-shadow:inset 3px 3px 6px rgba(0,0,0,0.2),inset -2px -2px 4px rgba(255,255,255,0.02),0 0 0 2px var(--color-accent)}
.pendiente-actions{display:flex;gap:.6rem;justify-content:flex-end}
.btn-cancelar{padding:.6rem 1.25rem;border:none;border-radius:var(--radius-sm);background:var(--color-bg-secondary);color:var(--color-text-secondary);font-size:.85rem;font-weight:600;cursor:pointer;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.btn-cancelar:hover{color:var(--color-text-primary);box-shadow:4px 4px 8px rgba(0,0,0,0.15)}
.btn-guardar{padding:.6rem 1.25rem;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--color-accent),var(--color-accent-hover));color:var(--color-on-brand);font-size:.85rem;font-weight:600;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,0.15);transition:all .15s}
.btn-guardar:hover{box-shadow:5px 5px 10px rgba(0,0,0,0.2);transform:translateY(-1px)}
@media(max-width:480px){.pos-modal-card{width:100%;border-radius:var(--radius-md)}.vp-modal-body-clean{padding:1rem}}
</style>
