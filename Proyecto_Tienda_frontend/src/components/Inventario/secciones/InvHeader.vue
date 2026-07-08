<script setup lang="ts">
defineProps<{ totalItems: number; cargando: boolean; vistaLista: boolean }>();
defineEmits<{
  'update:vista-lista': [value: boolean];
  recargar: [];
}>();
</script>

<template>
  <header class="inv__head">
    <div class="inv__head-left">
      <h1 class="inv__title">Inventario</h1>
      <span class="inv__badge">{{ totalItems }} artículos</span>
    </div>
    <div class="inv__head-right">
      <div class="inv__views">
        <button :class="['inv__vbtn', { on: vistaLista }]" @click="$emit('update:vista-lista', true)" title="Lista">📋</button>
        <button :class="['inv__vbtn', { on: !vistaLista }]" @click="$emit('update:vista-lista', false)" title="Cuadrícula">🔲</button>
      </div>
      <button class="inv__reload" @click="$emit('recargar')" :disabled="cargando" :class="{ spin: cargando }" title="Recargar">🔄</button>
    </div>
  </header>
</template>
