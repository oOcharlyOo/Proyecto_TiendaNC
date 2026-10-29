<script setup lang="ts">
defineProps<{ sucursalSeleccionada: string }>();
defineEmits<{ seleccionar: [value: string] }>();
</script>

<template>
  <div class="sucursal-selector">
    <span class="sucursal-label">Selecciona tu sucursal</span>
    <div class="sucursal-cards">
      <div class="sucursal-card" :class="{ active: sucursalSeleccionada === 'dulceria' }"
        @click="$emit('seleccionar', 'dulceria')">
        <span class="sucursal-icon">🍬</span>
        <span class="sucursal-name">Dulcería</span>
        <span class="sucursal-desc">La Leyenda del Dulce</span>
      </div>
      <div class="sucursal-card" :class="{ active: sucursalSeleccionada === 'abarrotera' }"
        @click="$emit('seleccionar', 'abarrotera')">
        <span class="sucursal-icon">🏪</span>
        <span class="sucursal-name">Abarrotera</span>
        <span class="sucursal-desc">Nueva Sucursal</span>
      </div>
      <div class="sucursal-card" :class="{ active: sucursalSeleccionada === 'ambulante_dulceria' }"
        @click="$emit('seleccionar', 'ambulante_dulceria')">
        <span class="sucursal-icon">🚚</span>
        <span class="sucursal-name">Ambulante - Dulcería</span>
        <span class="sucursal-desc">Ventas aisladas, se fusionan al cierre</span>
      </div>
      <div class="sucursal-card" :class="{ active: sucursalSeleccionada === 'ambulante_abarrotera' }"
        @click="$emit('seleccionar', 'ambulante_abarrotera')">
        <span class="sucursal-icon">🚚</span>
        <span class="sucursal-name">Ambulante - Abarrotera</span>
        <span class="sucursal-desc">Ventas aisladas, se fusionan al cierre</span>
      </div>
    </div>
  </div>
</template>
