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
      <div class="modal-corner tl"></div>
      <div class="modal-corner tr"></div>
      <div class="modal-corner bl"></div>
      <div class="modal-corner br"></div>

      <header class="modal-h">
        <h3>⏳ {{ ventaPendienteSeleccionada ? 'Editar Descripción' : 'Venta Pendiente' }}</h3>
        <button class="close-x" @click="emit('close')">×</button>
      </header>
      <div class="modal-b">
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
.pos-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);backdrop-filter:blur(6px);z-index: 200;display:grid;place-items:center;padding:1rem}
.pos-modal-card{background:var(--color-bg-panel);border-radius:var(--radius-lg);width:min(100%,440px);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;position:relative;box-shadow:8px 8px 24px rgba(0,0,0,0.35),-4px -4px 16px rgba(255,255,255,0.03)}
.modal-corner{position:absolute;width:24px;height:24px;border:2px solid var(--color-accent)}
.modal-corner.tl{top:-1px;left:-1px;border-right:none;border-bottom:none;border-radius:8px 0 0 0}
.modal-corner.tr{top:-1px;right:-1px;border-left:none;border-bottom:none;border-radius:0 8px 0 0}
.modal-corner.bl{bottom:-1px;left:-1px;border-right:none;border-top:none;border-radius:0 0 0 8px}
.modal-corner.br{bottom:-1px;right:-1px;border-left:none;border-top:none;border-radius:0 0 8px 0}
.modal-h{display:flex;justify-content:space-between;align-items:center;padding:.85rem 1.25rem;background:var(--color-bg-secondary);border-radius:var(--radius-lg) var(--radius-lg) 0 0}
.modal-h h3{margin:0;font-size:1rem;color:var(--color-accent)}
.close-x{width:32px;height:32px;border:none;border-radius:50%;background:var(--color-bg-primary);color:var(--color-text-secondary);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,0.15);transition:all .15s}
.close-x:hover{background:var(--color-error);color:#fff}
.modal-b{padding:1.25rem;display:flex;flex-direction:column;gap:.75rem;flex:1}
.pendiente-hint{font-size:.85rem;color:var(--color-text-secondary);font-style:italic;margin:0}
.pendiente-textarea{width:100%;background:var(--color-bg-secondary);border:none;border-radius:var(--radius-sm);padding:.75rem;font-family:inherit;font-size:.9rem;color:var(--color-text-primary);resize:vertical;min-height:80px;outline:none;box-shadow:inset 3px 3px 6px rgba(0,0,0,0.2),inset -2px -2px 4px rgba(255,255,255,0.02);transition:all .2s;box-sizing:border-box}
.pendiente-textarea:focus{box-shadow:inset 3px 3px 6px rgba(0,0,0,0.2),inset -2px -2px 4px rgba(255,255,255,0.02),0 0 0 2px var(--color-accent)}
.pendiente-actions{display:flex;gap:.5rem;justify-content:flex-end}
.btn-cancelar{padding:.5rem 1rem;border:none;border-radius:var(--radius-sm);background:var(--color-bg-secondary);color:var(--color-text-secondary);font-size:.8rem;font-weight:600;cursor:pointer;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.btn-cancelar:hover{color:var(--color-text-primary);box-shadow:4px 4px 8px rgba(0,0,0,0.15)}
.btn-guardar{padding:.5rem 1rem;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--color-accent),var(--color-accent-hover));color:var(--color-on-brand);font-size:.8rem;font-weight:600;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,0.15);transition:all .15s}
.btn-guardar:hover{box-shadow:5px 5px 10px rgba(0,0,0,0.2);transform:translateY(-1px)}
@media(max-width:480px){.pos-modal-card{width:100%;border-radius:var(--radius-md)}.modal-b{padding:1rem}}
</style>
