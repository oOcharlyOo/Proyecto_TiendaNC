<script setup lang="ts">
import type { ProductoDTO } from '../logica/useProductos';
defineProps<{
  tabActiva: string; cargando: boolean; productosFiltrados: ProductoDTO[]; vistaLista: boolean;
  terminoBusqueda: string; categoriaFiltro: number | null;
  selectedProductos: Set<number>; escaneando: boolean; escanerActivo: boolean;
  formatMoneda: (v: number) => string; obtenerEmojiDulce: (id?: number) => string;
  esCategoriaGaming: (id?: number) => boolean;
  categoriaNombre: (id?: number) => string;
  subcategoriaNombre: (id: number | null | undefined) => string;
}>();
defineEmits<{
  'update:tabActiva': [v: string];
  'toggle-seleccion': [id: number]; 'toggle-seleccion-todos': [];
  'editar': [p: ProductoDTO]; 'eliminar': [p?: ProductoDTO];
  'nuevo-producto': []; 'abrir-modal-categoria': [];
  'iniciar-escaneo': []; 'detener-escaneo': [];
}>();
</script>
<template>
  <div v-if="tabActiva === 'productos'" class="tab-content">
    <div class="table-container">
      <div v-if="cargando" class="estado-loading"><div class="loading-spinner"></div><span>Cargando productos...</span></div>
      <div v-else-if="productosFiltrados.length === 0" class="estado-empty">
        <span class="empty-icon">{{ (terminoBusqueda.trim() || categoriaFiltro !== null) ? '🔍' : '📦' }}</span>
        <span class="empty-text">
          <template v-if="terminoBusqueda.trim() || categoriaFiltro !== null">No se encontraron productos con los filtros activos</template>
          <template v-else>No hay productos registrados</template>
        </span>
        <button v-if="!terminoBusqueda.trim() && categoriaFiltro === null" type="button" class="btn-primary btn-sm" @click="$emit('nuevo-producto')">Agregar primer producto</button>
      </div>
      <table v-else-if="vistaLista" class="tabla-productos">
        <thead><tr>
          <th class="col-check"><input type="checkbox" class="row-checkbox" :checked="productosFiltrados.length > 0 && selectedProductos.size === productosFiltrados.length" @change="$emit('toggle-seleccion-todos')" /></th>
          <th class="col-icon">Icono</th>
          <th class="col-nombre">Nombre del Producto</th>
          <th class="col-categoria">Categoría</th>
          <th class="col-subcategoria">Subcategoría</th>
          <th class="col-codigo">Código</th>
          <th class="col-precio text-right">Precio Venta</th>
          <th class="col-stock text-center">Stock</th>
          <th class="col-tipo text-center">Tipo</th>
          <th class="col-envase text-center">Envase</th>
          <th class="col-acciones text-center">Acciones</th>
        </tr></thead>
        <tbody>
          <tr v-for="producto in productosFiltrados" :key="producto.idProducto" class="producto-row" :class="{ 'low-stock': Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) && Number(producto.stock || 0) > 0, 'out-of-stock': Number(producto.stock || 0) === 0, 'selected': selectedProductos.has(producto.idProducto!) }">
            <td class="col-check"><input type="checkbox" class="row-checkbox" :checked="selectedProductos.has(producto.idProducto!)" @change="$emit('toggle-seleccion', producto.idProducto!)" /></td>
            <td class="col-icon"><div class="icon-cell">{{ obtenerEmojiDulce(producto.idProducto) }}</div></td>
            <td class="col-nombre">{{ producto.nombre }}</td>
            <td class="col-categoria">{{ categoriaNombre(producto.idCategoria) }}</td>
            <td class="col-subcategoria">{{ subcategoriaNombre(producto.idSubcategoria) }}</td>
            <td class="col-codigo"><span class="codigo-badge">{{ producto.codigoBarras || '—' }}</span></td>
            <td class="col-precio text-right">{{ formatMoneda(producto.precio_venta) }}</td>
            <td class="col-stock text-center">
              <template v-if="esCategoriaGaming(producto.idCategoria)"><span class="stock-badge gaming">∞</span></template>
              <template v-else><span class="stock-badge" :class="{ 'low': Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) && Number(producto.stock || 0) > 0, 'out': Number(producto.stock || 0) === 0 }">{{ producto.stock }}</span></template>
            </td>
            <td class="col-tipo text-center">{{ producto.is_gramaje ? '⚖️ Gramaje' : '📦 Unidad' }}</td>
            <td class="col-envase text-center">{{ producto.requiere_envase ? `Sí ($${Number(producto.precio_envase || 0).toFixed(2)})` : '—' }}</td>
            <td class="col-acciones text-center">
              <div class="acciones-cell">
                <button type="button" class="btn-action btn-edit" @click="$emit('editar', producto)" title="Editar"><svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                <button type="button" class="btn-action btn-delete" @click="$emit('eliminar', producto)" title="Eliminar"><svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="productos-grid">
        <div v-for="producto in productosFiltrados" :key="producto.idProducto" class="producto-card" :class="{ 'low-stock': Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) && Number(producto.stock || 0) > 0, 'out-of-stock': Number(producto.stock || 0) === 0 }">
          <div class="pc-top"><input type="checkbox" class="row-checkbox" :checked="selectedProductos.has(producto.idProducto!)" @change="$emit('toggle-seleccion', producto.idProducto!)" /></div>
          <div class="pc-ico">{{ obtenerEmojiDulce(producto.idProducto) }}</div>
          <div class="pc-badges"><span v-if="producto.is_gramaje" class="badge-gramaje">Gramaje</span><span v-if="producto.requiere_envase" class="badge-envase">Envase</span></div>
          <strong>{{ producto.nombre }}</strong>
          <div class="pc-stats">
            <div class="pc-stat"><span class="stat-label">Precio</span><span class="stat-value">{{ formatMoneda(producto.precio_venta) }}</span></div>
            <div class="pc-stat"><span class="stat-label">Stock</span><span class="stat-value" :class="{ 'low': Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) && Number(producto.stock || 0) > 0, 'out': Number(producto.stock || 0) === 0 }">{{ producto.stock }}</span></div>
            <div class="pc-stat" v-if="producto.precio_mayoreo"><span class="stat-label">Mayoreo</span><span class="stat-value">{{ formatMoneda(producto.precio_mayoreo) }}</span></div>
          </div>
          <div class="pc-actions"><button class="btn-action btn-edit" @click="$emit('editar', producto)">✏️</button><button class="btn-action btn-delete" @click="$emit('eliminar', producto)">🗑️</button></div>
        </div>
      </div>
      <div class="bulk-info" v-if="selectedProductos.size > 0">
        <span>{{ selectedProductos.size }} producto(s) seleccionado(s)</span>
        <button type="button" class="btn-danger btn-sm" @click="$emit('eliminar', undefined)">Eliminar seleccionados</button>
      </div>
    </div>
    <div class="table-footer" v-if="!cargando && productosFiltrados.length > 0">
      <span class="footer-count">{{ productosFiltrados.length }} producto{{ productosFiltrados.length !== 1 ? 's' : '' }}<span v-if="terminoBusqueda.trim() || categoriaFiltro !== null" class="filter-indicator"> (filtrado)</span></span>
      <button type="button" class="btn-secondary btn-sm" @click="$emit('abrir-modal-categoria')">⚙️ Admin. Categorías</button>
    </div>
  </div>
</template>
