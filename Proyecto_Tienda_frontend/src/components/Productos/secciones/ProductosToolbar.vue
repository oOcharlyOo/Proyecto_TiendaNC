<script setup lang="ts">
import type { CategoriaDTO, SubcategoriaDTO } from '../logica/useProductos';
defineProps<{
  categorias: CategoriaDTO[]; subcategoriasFiltradas: SubcategoriaDTO[];
  categoriaFiltro: number | null; subcategoriaFiltro: number | null | string;
  ordenStock: string | null; filtroTipo: string | null;
  terminoBusqueda: string; tabActiva: string;
  importando: boolean; vaciando: boolean; vistaLista: boolean;
}>();
defineEmits<{
  'update:categoriaFiltro': [v: number | null]; 'update:subcategoriaFiltro': [v: number | null | string];
  'update:ordenStock': [v: string | null]; 'update:filtroTipo': [v: string | null];
  'update:terminoBusqueda': [v: string]; 'update:tabActiva': [v: string];
  'update:vistaLista': [v: boolean];
  'exportar-csv': []; 'exportar-xlsx': []; 'importar': []; 'vaciar-inventario': [];
  'nuevo-producto': [];
}>();
</script>
<template>
  <header v-if="tabActiva === 'productos'" class="toolbar">
    <div class="toolbar-left">
      <h1 class="toolbar-title"><span class="title-icon">🍬</span><span class="title-text">Catálogo de Productos</span></h1>
      <p class="toolbar-subtitle">Administra altas, cambios y bajas del catálogo</p>
    </div>
    <div class="toolbar-right">
      <span class="select-wrap"><select :value="categoriaFiltro ?? ''" @change="$emit('update:categoriaFiltro', ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)" class="category-filter">
        <option value="">Todas las categorías</option>
        <option v-for="cat in categorias" :key="cat.idCategoria" :value="cat.idCategoria">{{ cat.nombre }}</option>
      </select></span>
      <span class="select-wrap"><select :value="subcategoriaFiltro ?? ''" @change="$emit('update:subcategoriaFiltro', ($event.target as HTMLSelectElement).value === 'general' ? 'general' : Number(($event.target as HTMLSelectElement).value) || null)" class="category-filter" :disabled="categoriaFiltro === null">
        <option value="">{{ categoriaFiltro === null ? 'Selecciona categoría' : 'Todas las subcategorías' }}</option>
        <option value="general">General</option>
        <option v-for="sub in subcategoriasFiltradas" :key="sub.idSubcategoria" :value="sub.idSubcategoria">{{ sub.nombre }}</option>
      </select></span>
      <span class="select-wrap"><select :value="ordenStock ?? ''" @change="$emit('update:ordenStock', ($event.target as HTMLSelectElement).value || null)" class="category-filter">
        <option value="">Stock: Todos</option>
        <option value="mayor">Mayor stock</option>
        <option value="menor">Menor stock</option>
      </select></span>
      <span class="select-wrap"><select :value="filtroTipo ?? ''" @change="$emit('update:filtroTipo', ($event.target as HTMLSelectElement).value || null)" class="category-filter">
        <option value="">Tipo: Todos</option>
        <option value="unidad">📦 Unidad</option>
        <option value="gramaje">⚖️ Gramaje</option>
      </select></span>
      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input :value="terminoBusqueda" @input="$emit('update:terminoBusqueda', ($event.target as HTMLInputElement).value)" type="text" placeholder="Buscar producto..." class="search-input" />
        <button v-if="terminoBusqueda" type="button" class="search-clear" @click="$emit('update:terminoBusqueda', '')">✕</button>
      </div>
      <div class="import-export-group">
        <button type="button" class="btn-secondary btn-sm" @click="$emit('exportar-csv')"><span class="btn-icon">📄</span><span class="btn-text">CSV</span></button>
        <button type="button" class="btn-secondary btn-sm" @click="$emit('exportar-xlsx')"><span class="btn-icon">📊</span><span class="btn-text">Excel</span></button>
        <button type="button" class="btn-secondary btn-sm" :disabled="importando" @click="$emit('importar')"><span class="btn-icon">{{ importando ? '⏳' : '📥' }}</span><span class="btn-text">{{ importando ? '...' : 'Importar' }}</span></button>
        <button type="button" class="btn-danger btn-sm" :disabled="vaciando" @click="$emit('vaciar-inventario')"><span class="btn-icon">{{ vaciando ? '⏳' : '🗑️' }}</span><span class="btn-text">{{ vaciando ? '...' : 'Vaciar' }}</span></button>
      </div>
      <div class="view-toggles">
        <button :class="['view-btn', { on: vistaLista }]" @click="$emit('update:vistaLista', true)" title="Lista">📋</button>
        <button :class="['view-btn', { on: !vistaLista }]" @click="$emit('update:vistaLista', false)" title="Cuadrícula">🔲</button>
      </div>
      <button type="button" class="btn-primary" @click="$emit('nuevo-producto')"><span class="btn-icon">＋</span><span class="btn-text">Nuevo</span></button>
    </div>
  </header>
  <div class="tabs-bar">
    <button type="button" class="tab-btn" :class="{ active: tabActiva === 'productos' }" @click="$emit('update:tabActiva', 'productos')"><span class="tab-icon">📦</span><span class="tab-text">Productos</span></button>
    <button type="button" class="tab-btn" :class="{ active: tabActiva === 'categorias' }" @click="$emit('update:tabActiva', 'categorias')"><span class="tab-icon">🏷️</span><span class="tab-text">Categorías</span></button>
    <button type="button" class="tab-btn" :class="{ active: tabActiva === 'subcategorias' }" @click="$emit('update:tabActiva', 'subcategorias')"><span class="tab-icon">📂</span><span class="tab-text">Subcategorías</span></button>
    <button type="button" class="tab-btn" :class="{ active: tabActiva === 'proveedores' }" @click="$emit('update:tabActiva', 'proveedores')"><span class="tab-icon">🚚</span><span class="tab-text">Proveedores</span></button>
    <button type="button" class="tab-btn" :class="{ active: tabActiva === 'reporte' }" @click="$emit('update:tabActiva', 'reporte')"><span class="tab-icon">📊</span><span class="tab-text">Reporte Ventas</span></button>
  </div>
</template>
