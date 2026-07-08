<script setup lang="ts">
import type { ProductoDTO } from '../logica/useInvTipos';
import { moneda, numero, stockClass, stockLabel, esGaming, catNombre } from '../logica/useInventario';

defineProps<{ productos: ProductoDTO[] }>();
defineEmits<{ editar: [producto: ProductoDTO] }>();
</script>

<template>
  <div class="inv__tbl-wrap">
    <table class="inv__tbl">
      <thead><tr>
        <th>Producto</th>
        <th>Categoría</th>
        <th class="tc">Stock</th>
        <th class="tc">Estado</th>
        <th class="tr">Costo</th>
        <th class="tr">Venta</th>
        <th class="tr">Ganancia/u</th>
        <th class="tr">Valor Total</th>
        <th style="width:36px"></th>
      </tr></thead>
      <tbody>
        <tr v-for="p in productos" :key="p.idProducto" :class="['inv__row', `r-${stockClass(p)}`, esGaming(p.idCategoria) ? 'r-gaming' : '']" @click="$emit('editar', p)">
          <td class="inv__cell inv__name-cell">
            <span class="inv__emoji">{{ p.is_gramaje ? '⚖️' : '📦' }}</span>
            <div class="inv__ni"><span class="inv__nn">{{ p.nombre }}</span><span class="inv__nid">#{{ p.idProducto }}</span></div>
          </td>
          <td class="inv__cell cat">{{ catNombre(p.idCategoria) }}</td>
          <td class="inv__cell tc stock">{{ numero(p.stock) }}<small>{{ p.is_gramaje ? 'g' : 'u' }}</small></td>
          <td class="inv__cell tc">
            <span v-if="esGaming(p.idCategoria)" class="inv__tag t-gaming">Rentable</span>
            <span v-else-if="stockLabel(p)" :class="['inv__tag', `t-${stockClass(p)}`]">{{ stockLabel(p) }}</span>
            <span v-else class="inv__tag t-ok">OK</span>
          </td>
          <td class="inv__cell tr costo">{{ moneda(p.precio_costo) }}</td>
          <td class="inv__cell tr venta">{{ moneda(p.precio_venta) }}</td>
          <td class="inv__cell tr gain">{{ moneda(Number(p.precio_venta) - Number(p.precio_costo)) }}</td>
          <td class="inv__cell tr total">{{ moneda(p.is_gramaje ? (Number(p.stock) / 1000) * Number(p.precio_venta) : Number(p.stock) * Number(p.precio_venta)) }}</td>
          <td class="inv__cell ac"><button class="inv__eb" @click.stop="$emit('editar', p)" title="Editar">✏️</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
