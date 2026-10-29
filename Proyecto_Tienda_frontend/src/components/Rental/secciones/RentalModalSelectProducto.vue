<script setup lang="ts">
import type { ProductoDTO } from '../logica/useRental';

defineProps<{
  open: boolean;
  productosFiltrados: ProductoDTO[];
  buscarProducto: string;
}>();

const emit = defineEmits<{
  'close': [];
  'update:buscar-producto': [value: string];
  'seleccionar': [producto: ProductoDTO];
}>();
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content modal-seleccionar-producto">
      <h2 class="modal-title">🎮 Seleccionar Producto</h2>
      <p class="modal-subtitle">Elige un producto para crear la estación</p>

      <div class="buscador-modal">
        <span class="buscador-icono">🔍</span>
        <input
          :value="buscarProducto"
          type="text"
          placeholder="Buscar producto..."
          class="buscador-input"
          @input="emit('update:buscar-producto', ($event.target as HTMLInputElement).value)"
        />
        <button
          v-if="buscarProducto"
          class="buscador-limpiar"
          @click="emit('update:buscar-producto', '')"
        >
          ✕
        </button>
      </div>

      <div class="productos-lista-modal">
        <div
          v-for="producto in productosFiltrados"
          :key="producto.idProducto"
          class="producto-item-modal"
          @click="emit('seleccionar', producto)"
        >
          <div class="producto-imagen-modal">
            <img v-if="producto.imagen_url" :src="producto.imagen_url" :alt="producto.nombre" />
            <span v-else>📦</span>
          </div>
          <div class="producto-datos-modal">
            <span class="producto-nombre-modal">{{ producto.nombre }}</span>
            <span class="producto-stock-modal">🎮 Rentable</span>
          </div>
          <span class="producto-seleccionar-icon">→</span>
        </div>
        <div v-if="productosFiltrados.length === 0" class="no-resultados">
          No se encontraron productos
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-cancelar" @click="emit('close')">Cancelar</button>
      </div>
    </div>
  </div>
</template>
