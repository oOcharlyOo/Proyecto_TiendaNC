<script setup lang="ts">
import type { ProductoDTO } from '../logica/useInvTipos';
import { moneda, numero, stockClass, stockLabel, esGaming, catNombre } from '../logica/useInventario';

defineProps<{ productos: ProductoDTO[]; cargandoMas: boolean; hayMas: boolean }>();
defineEmits<{ editar: [producto: ProductoDTO]; 'cargar-mas': [] }>();
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
    <div v-if="hayMas" class="inv__load-more-wrap">
      <button class="inv__load-more" :disabled="cargandoMas" @click="$emit('cargar-mas')">
        {{ cargandoMas ? '⏳ Cargando...' : '📦 Cargar más productos' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.inv__load-more-wrap{display:flex;justify-content:center;padding:.75rem}
.inv__load-more{padding:.5rem 1.2rem;border:none;border-radius:8px;background:var(--color-bg-panel);color:var(--color-accent);font-size:.8rem;font-weight:700;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,.1);transition:all .2s;font-family:inherit}
.inv__load-more:hover:not(:disabled){transform:translateY(-2px);box-shadow:5px 5px 12px rgba(0,0,0,.16);background:var(--color-accent);color:var(--color-on-brand)}
.inv__load-more:disabled{opacity:.5;cursor:not-allowed}
</style>
