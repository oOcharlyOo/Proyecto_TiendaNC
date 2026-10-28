<script setup lang="ts">
import type { ProductoDTO } from '../logica/useRental';

defineProps<{
  open: boolean;
  productosDisponibles: ProductoDTO[];
  productoSeleccionado: ProductoDTO | null;
  cantidad: number;
  formatoMoneda: (v: number) => string;
}>();

const emit = defineEmits<{
  'close': [];
  'update:producto-seleccionado': [value: ProductoDTO | null];
  'update:cantidad': [value: number];
  'agregar': [];
}>();
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <h2 class="modal-title">➕ Agregar Producto al Combo</h2>

      <div class="form-group">
        <label>Producto</label>
        <select :value="productoSeleccionado" @change="emit('update:producto-seleccionado', ($event.target as HTMLSelectElement).value ? (productosDisponibles.find(p => p.idProducto === Number(($event.target as HTMLSelectElement).value)) || null) : null)">
          <option :value="null">-- Seleccionar --</option>
          <option v-for="p in productosDisponibles" :key="p.idProducto" :value="p.idProducto">
            {{ p.nombre }} - {{ formatoMoneda(p.precio_venta) }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Cantidad</label>
        <input :value="cantidad" type="number" min="1" @input="emit('update:cantidad', Number(($event.target as HTMLInputElement).value))" />
      </div>

      <div class="modal-actions">
        <button class="btn-cancelar" @click="emit('close')">Cancelar</button>
        <button class="btn-confirmar" @click="emit('agregar')">Agregar</button>
      </div>
    </div>
  </div>
</template>
