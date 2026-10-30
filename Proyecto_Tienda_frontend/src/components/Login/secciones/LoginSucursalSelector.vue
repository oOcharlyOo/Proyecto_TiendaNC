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
    </div>
    <div class="ambulante-row">
      <span class="ambulante-label">🚚 Ambulante</span>
      <button type="button" class="ambulante-chip" :class="{ active: sucursalSeleccionada === 'ambulante_dulceria' }"
        title="Ventas aisladas, se fusionan al cierre" @click="$emit('seleccionar', 'ambulante_dulceria')">Dulcería</button>
      <button type="button" class="ambulante-chip" :class="{ active: sucursalSeleccionada === 'ambulante_abarrotera' }"
        title="Ventas aisladas, se fusionan al cierre" @click="$emit('seleccionar', 'ambulante_abarrotera')">Abarrotera</button>
    </div>
  </div>
</template>
