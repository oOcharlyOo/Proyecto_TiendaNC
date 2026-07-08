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
