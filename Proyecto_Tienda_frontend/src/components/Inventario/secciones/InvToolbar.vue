<script setup lang="ts">
import type { CategoriaDTO } from '../logica/useInvTipos';

defineProps<{
  filtroBusqueda: string;
  filtroCategoria: number | null;
  ordenarPor: string;
  verSoloProblemas: boolean;
  catsConTodas: { idCategoria: number | null; nombre: string }[];
}>();
defineEmits<{
  'update:filtro-busqueda': [value: string];
  'update:filtro-categoria': [value: number | null];
  'update:ordenar-por': [value: string];
  'update:ver-solo-problemas': [value: boolean];
}>();
</script>

<template>
  <div class="inv__bar">
    <div class="inv__src">
      <span class="inv__src-ico">🔍</span>
      <input :value="filtroBusqueda" @input="$emit('update:filtro-busqueda', ($event.target as HTMLInputElement).value)" placeholder="Buscar..." />
      <button v-if="filtroBusqueda" @click="$emit('update:filtro-busqueda', '')" class="inv__x">×</button>
    </div>
    <div class="inv__ctrls">
      <select :value="filtroCategoria ?? ''" @change="$emit('update:filtro-categoria', ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)">
        <option value="">Todas</option>
        <option v-for="c in catsConTodas.filter(x => x.idCategoria !== null)" :key="c.idCategoria!" :value="c.idCategoria">{{ c.nombre }}</option>
      </select>
      <select :value="ordenarPor" @change="$emit('update:ordenar-por', ($event.target as HTMLSelectElement).value)">
        <option value="nombre">Nombre</option>
        <option value="stock">Stock ↑</option>
        <option value="stock-desc">Stock ↓</option>
        <option value="precio">Precio</option>
      </select>
      <label class="inv__tog">
        <input type="checkbox" :checked="verSoloProblemas" @change="$emit('update:ver-solo-problemas', ($event.target as HTMLInputElement).checked)" />
        <span class="inv__tog-t"><span class="inv__tog-d"></span></span>
        <span>Alertas</span>
      </label>
    </div>
  </div>
</template>
