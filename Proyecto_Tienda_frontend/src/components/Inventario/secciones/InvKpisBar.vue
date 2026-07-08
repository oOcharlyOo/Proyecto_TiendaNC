<script setup lang="ts">
import { moneda } from '../logica/useInventario';

defineProps<{
  totalItems: number;
  bajoStock: number;
  productosAgotados: number;
  costoTotal: number;
  gananciaPot: number;
}>();
</script>

<template>
  <div class="inv__kpis">
    <div class="inv__kpi">
      <div class="inv__kpi-ico ico-blue">📦</div>
      <div class="inv__kpi-txt"><span class="inv__kpi-l">Total</span><span class="inv__kpi-v">{{ totalItems }}</span></div>
    </div>
    <div class="inv__kpi">
      <div class="inv__kpi-ico ico-amber">⚠️</div>
      <div class="inv__kpi-txt"><span class="inv__kpi-l">Bajo Stock</span><span class="inv__kpi-v">{{ bajoStock }}</span></div>
    </div>
    <div class="inv__kpi">
      <div class="inv__kpi-ico ico-red">💀</div>
      <div class="inv__kpi-txt"><span class="inv__kpi-l">Agotados</span><span class="inv__kpi-v">{{ productosAgotados }}</span></div>
    </div>
    <div class="inv__kpi">
      <div class="inv__kpi-ico ico-gold">💰</div>
      <div class="inv__kpi-txt"><span class="inv__kpi-l">Costo Total</span><span class="inv__kpi-v">{{ moneda(costoTotal) }}</span></div>
    </div>
    <div class="inv__kpi">
      <div class="inv__kpi-ico ico-green">💎</div>
      <div class="inv__kpi-txt"><span class="inv__kpi-l">Ganancia Pot.</span><span class="inv__kpi-v">{{ moneda(gananciaPot) }}</span></div>
    </div>
  </div>
</template>
