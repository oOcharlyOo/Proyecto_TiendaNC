<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  product: {
    idProducto?: number;
    nombre: string;
    codigoBarras?: string | null;
    precio_venta?: number;
    precio_mayoreo?: number | null;
    stock?: number;
    cantidad_min?: number;
    is_gramaje?: boolean;
  };
}>();

const emit = defineEmits<{
  (event: 'edit', payload: typeof props.product): void;
  (event: 'delete', payload: typeof props.product): void;
}>();

const lowStock = computed(() => {
  const stock = Number(props.product.stock ?? 0);
  const min = Number(props.product.cantidad_min ?? 0);
  return min > 0 && stock <= min;
});

const formatoMoneda = (valor: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
</script>

<template>
  <tr :class="{ low: lowStock }">
    <td>{{ product.idProducto }}</td>
    <td>{{ product.codigoBarras || 'Sin codigo' }}</td>
    <td>{{ product.nombre }}</td>
    <td>{{ formatoMoneda(Number(product.precio_venta || 0)) }}</td>
    <td>{{ product.precio_mayoreo ? formatoMoneda(Number(product.precio_mayoreo)) : '-' }}</td>
    <td>{{ product.stock || 0 }}{{ product.is_gramaje ? 'g' : '' }}</td>
    <td class="actions-cell">
      <button type="button" class="btn-secondary btn-sm" @click.stop="emit('edit', product)">
        <span class="btn-icono">✏️</span>
        <span class="btn-texto">Editar</span>
      </button>
      <button type="button" class="btn-danger btn-sm" @click.stop="emit('delete', product)">
        <span class="btn-icono">🗑️</span>
        <span class="btn-texto">Eliminar</span>
      </button>
    </td>
  </tr>
</template>

<style scoped>
.actions-cell {
  display: flex;
  gap: 0.4rem;
}

.btn-sm {
  padding: 0.25rem 0.45rem;
  font-size: 0.7rem;
}
</style>
