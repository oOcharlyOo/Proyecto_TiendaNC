<script setup lang="ts">
import type { ProductoDTO } from '../logica/useInvTipos';
import { moneda, numero, stockClass, stockLabel, esGaming, catNombre } from '../logica/useInventario';

defineProps<{ productos: ProductoDTO[] }>();
defineEmits<{ editar: [producto: ProductoDTO] }>();
</script>

<template>
  <div class="inv__grid">
    <article v-for="p in productos" :key="p.idProducto" :class="['inv__cd', `c-${stockClass(p)}`, esGaming(p.idCategoria) ? 'c-gaming' : '']" @click="$emit('editar', p)">
      <div class="inv__cd-head">
        <span class="inv__cd-id">#{{ p.idProducto }}</span>
        <span :class="['inv__cd-dot', `d-${stockClass(p)}`]" :title="stockLabel(p) || 'OK'"></span>
      </div>
      <div class="inv__cd-ico-wrap">
        <span class="inv__cd-ico">{{ p.is_gramaje ? '⚖️' : '📦' }}</span>
      </div>
      <h3 class="inv__cd-nm">{{ p.nombre }}</h3>
      <span class="inv__cd-cat">{{ catNombre(p.idCategoria) }}</span>
      <div class="inv__cd-stats">
        <div class="inv__cs">
          <span class="inv__cs-ico">📊</span>
          <div class="inv__cs-body">
            <span class="inv__cs-l">Stock</span>
            <span :class="['inv__cs-v', `v-${stockClass(p)}`]">{{ numero(p.stock) }}<small>{{ p.is_gramaje ? 'g' : 'u' }}</small></span>
          </div>
        </div>
        <div class="inv__cs">
          <span class="inv__cs-ico">💲</span>
          <div class="inv__cs-body">
            <span class="inv__cs-l">Venta</span>
            <span class="inv__cs-v v-venta">{{ moneda(p.precio_venta) }}</span>
          </div>
        </div>
        <div class="inv__cs">
          <span class="inv__cs-ico">💎</span>
          <div class="inv__cs-body">
            <span class="inv__cs-l">Ganancia</span>
            <span class="inv__cs-v v-gain">{{ moneda(Number(p.precio_venta) - Number(p.precio_costo)) }}</span>
          </div>
        </div>
      </div>
      <div class="inv__cd-bar-wrap">
        <div class="inv__cd-bar-bg">
          <div class="inv__cd-bar-fill" :style="{ width: `${Math.min(100, (p.stock / (p.cantidad_min * 3 || 1)) * 100)}%` }" :class="`bf-${stockClass(p)}`"></div>
        </div>
        <span class="inv__cd-bar-pct">{{ Math.round((p.stock / (p.cantidad_min * 3 || 1)) * 100) }}%</span>
      </div>
      <button class="inv__cd-ed" @click.stop="$emit('editar', p)" title="Editar">✏️</button>
    </article>
  </div>
</template>
