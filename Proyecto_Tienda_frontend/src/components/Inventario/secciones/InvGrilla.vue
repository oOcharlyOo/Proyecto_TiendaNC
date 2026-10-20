<script setup lang="ts">
import type { ProductoDTO } from '../logica/useInvTipos';
import { moneda, numero, stockClass, stockLabel, esGaming, catNombre, diasSinMov, diasMovClase, diasMovLabel, diasMovTitulo, requiereValidarStock } from '../logica/useInventario';

defineProps<{ productos: ProductoDTO[]; cargandoMas: boolean; hayMas: boolean }>();
defineEmits<{ editar: [producto: ProductoDTO]; restaurar: [producto: ProductoDTO]; 'cargar-mas': [] }>();
</script>

<template>
  <div class="inv__grid">
    <article v-for="p in productos" :key="p.idProducto" :class="p.estatus === 'I' ? ['inv__cd', 'c-inactivo'] : ['inv__cd', `c-${stockClass(p)}`, esGaming(p.idCategoria) ? 'c-gaming' : '']" @click="$emit('editar', p)">
      <div class="inv__cd-head">
        <span class="inv__cd-id">#{{ p.idProducto }}</span>
        <span :class="['inv__cd-dot', p.estatus === 'I' ? 'd-inactivo' : `d-${stockClass(p)}`]" :title="p.estatus === 'I' ? 'Producto inactivo' : (stockLabel(p) || 'OK')"></span>
      </div>
      <div class="inv__cd-ico-wrap">
        <span class="inv__cd-ico">{{ p.is_gramaje ? '⚖️' : '📦' }}</span>
      </div>
      <h3 class="inv__cd-nm">{{ p.nombre }}</h3>
      <span class="inv__cd-cat">{{ catNombre(p.idCategoria) }}</span>
      <span v-if="p.estatus === 'I'" class="inv__tag t-inactivo inv__cd-inactive">Inactivo</span>
      <span v-else-if="requiereValidarStock(p)" class="inv__tag t-validar inv__cd-inactive" title="Más de 30 días sin movimiento con stock: valida si el stock es real">Validar stock</span>
      <div class="inv__cd-stats">
        <div class="inv__cs">
          <span class="inv__cs-ico">📊</span>
          <div class="inv__cs-body">
            <span class="inv__cs-l">Stock</span>
            <span :class="['inv__cs-v', p.estatus === 'I' ? 'v-inactivo' : `v-${stockClass(p)}`]">{{ numero(p.stock) }}<small>{{ p.is_gramaje ? 'g' : 'u' }}</small></span>
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
        <div class="inv__cs">
          <span class="inv__cs-ico">🕰️</span>
          <div class="inv__cs-body">
            <span class="inv__cs-l">Sin movimiento</span>
            <span :class="['inv__cs-v', diasMovClase(diasSinMov(p))]" :title="diasMovTitulo(p)">{{ diasMovLabel(diasSinMov(p)) }}</span>
          </div>
        </div>
      </div>
      <div class="inv__cd-bar-wrap">
        <div class="inv__cd-bar-bg">
          <div class="inv__cd-bar-fill" :style="{ width: `${Math.min(100, (p.stock / (p.cantidad_min * 3 || 1)) * 100)}%` }" :class="p.estatus === 'I' ? 'bf-inactivo' : `bf-${stockClass(p)}`"></div>
        </div>
        <span class="inv__cd-bar-pct">{{ Math.round((p.stock / (p.cantidad_min * 3 || 1)) * 100) }}%</span>
      </div>
      <button v-if="p.estatus === 'I'" class="inv__cd-ed inv__cd-rb" @click.stop="$emit('restaurar', p)" title="Restaurar producto (volver a activo)">🔄</button>
      <button v-else class="inv__cd-ed" @click.stop="$emit('editar', p)" title="Editar">✏️</button>
    </article>
    <div v-if="hayMas" class="inv__load-more-wrap">
      <button class="inv__load-more" :disabled="cargandoMas" @click="$emit('cargar-mas')">
        {{ cargandoMas ? '⏳ Cargando...' : '📦 Cargar más productos' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.inv__cd-inactive{align-self:center}
.inv__load-more-wrap{display:flex;justify-content:center;padding:.75rem;grid-column:1/-1}
.inv__load-more{padding:.5rem 1.2rem;border:none;border-radius:8px;background:var(--color-bg-panel);color:var(--color-accent);font-size:.8rem;font-weight:700;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,.1);transition:all .2s;font-family:inherit}
.inv__load-more:hover:not(:disabled){transform:translateY(-2px);box-shadow:5px 5px 12px rgba(0,0,0,.16);background:var(--color-accent);color:var(--color-on-brand)}
.inv__load-more:disabled{opacity:.5;cursor:not-allowed}
</style>
