<script setup lang="ts">
defineProps<{
  showCategoriaModal: boolean; nuevaCategoria: string;
  guardando: boolean;
}>();
defineEmits<{
  'cerrar': []; 'update:nuevaCategoria': [v: string];
  'guardar': [];
}>();
</script>
<template>
  <div v-if="showCategoriaModal" class="modal-dialog modal-categoria">
    <div class="modal-header">
      <h2 class="modal-title">Nueva Categoría</h2>
      <button type="button" class="modal-close" @click="$emit('cerrar')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Nombre de la categoría</label>
        <input :value="nuevaCategoria" @input="$emit('update:nuevaCategoria', ($event.target as HTMLInputElement).value)" type="text" class="input-field" placeholder="Ej: Chocolates" />
      </div>
      <div class="form-group">
        <label class="form-label">Vista previa</label>
        <div class="preview-chip">{{ nuevaCategoria || 'Nombre de la categoría' }}</div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" @click="$emit('cerrar')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="guardando || !nuevaCategoria.trim()" @click="$emit('guardar')">{{ guardando ? 'Guardando...' : 'Crear Categoría' }}</button>
    </div>
  </div>
</template>
