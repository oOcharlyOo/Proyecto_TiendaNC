<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { ProductoDTO } from '../logica/useProductos';
import { mostrarCodigos } from '@/utils/codigos';
const props = defineProps<{  tabActiva: string; cargando: boolean; productosFiltrados: ProductoDTO[]; vistaLista: boolean;
  terminoBusqueda: string; categoriaFiltro: number | null;
  selectedProductos: Set<number>; escaneando: boolean; escanerActivo: boolean;
  productosInactivos: ProductoDTO[]; inactivosFiltrados: ProductoDTO[]; busquedaInactivos: string; cargandoInactivos: boolean; escaneoInactivoId: number | null;
  formatMoneda: (v: number) => string; obtenerEmojiDulce: (id?: number) => string;
  esCategoriaGaming: (id?: number) => boolean;
  categoriaNombre: (id?: number) => string;
  subcategoriaNombre: (id: number | null | undefined) => string;
  esAdmin?: boolean;
}>();
defineEmits<{
  'update:tabActiva': [v: string]; 'update:busquedaInactivos': [v: string];
  'toggle-seleccion': [id: number]; 'toggle-seleccion-todos': [];
  'editar': [p: ProductoDTO]; 'eliminar': [p?: ProductoDTO]; 'restaurar': [p: ProductoDTO];
  'nuevo-producto': []; 'abrir-modal-categoria': [];
  'iniciar-escaneo': []; 'detener-escaneo': [];
  'editar-cajas': [p: ProductoDTO];
}>();

/**
 * Render por tandas: con cientos de productos, pintarlos todos de golpe traba el scroll.
 * Se muestran 60 y, al acercarse al final, se agregan 60 más (no cambia filtros ni selección).
 */
const TANDA = 60;
const limite = ref(TANDA);
const productosVisibles = computed(() => props.productosFiltrados.slice(0, limite.value));
const hayMas = computed(() => limite.value < props.productosFiltrados.length);
watch(() => props.productosFiltrados, () => { limite.value = TANDA; });

const centinela = ref<HTMLElement | null>(null);
let observador: IntersectionObserver | null = null;
watch(centinela, (el) => {
  observador?.disconnect();
  observador = null;
  if (!el) return;
  observador = new IntersectionObserver((entradas) => {
    if (entradas.some(e => e.isIntersecting) && hayMas.value) {
      limite.value += TANDA;
      // Si la pantalla sigue sin llenarse, el observador se re-evalúa al reconectarlo.
      void nextTick(() => { if (centinela.value && observador) { observador.unobserve(centinela.value); observador.observe(centinela.value); } });
    }
  }, { rootMargin: '600px 0px' });
  observador.observe(el);
});
onBeforeUnmount(() => observador?.disconnect());

function cajasDe(producto: ProductoDTO): number[] {
  if (!producto.presentacion_caja) return [];
  return producto.presentacion_caja.split(',').map(s => parseInt(s.trim(), 10)).filter(n => n > 0);
}
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
          <th class="col-caja text-center">Caja</th>
          <th class="col-envase text-center">Envase</th>
          <th class="col-acciones text-center">Acciones</th>
        </tr></thead>
        <tbody>
          <tr v-for="producto in productosVisibles" :key="producto.idProducto" class="producto-row" :class="{ 'low-stock': producto.estatus !== 'I' && Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) && Number(producto.stock || 0) > 0, 'out-of-stock': producto.estatus !== 'I' && Number(producto.stock || 0) === 0, 'selected': selectedProductos.has(producto.idProducto!), 'inactivo-scan': producto.estatus === 'I', 'inactivo-glow': escaneoInactivoId === producto.idProducto }">
            <td class="col-check"><input type="checkbox" class="row-checkbox" :checked="selectedProductos.has(producto.idProducto!)" @change="$emit('toggle-seleccion', producto.idProducto!)" /></td>
            <td class="col-icon"><div class="icon-cell">{{ obtenerEmojiDulce(producto.idProducto) }}</div></td>
            <td class="col-nombre">{{ producto.nombre }}<span v-if="producto.estatus === 'I'" class="badge-inactivo">⚠️ Producto inactivo</span></td>
            <td class="col-categoria">{{ categoriaNombre(producto.idCategoria) }}</td>
            <td class="col-subcategoria">{{ subcategoriaNombre(producto.idSubcategoria) }}</td>
            <td class="col-codigo"><span class="codigo-badge">{{ mostrarCodigos(producto.codigoBarras) || '—' }}</span></td>
            <td class="col-precio text-right">{{ formatMoneda(producto.precio_venta) }}</td>
            <td class="col-stock text-center">
              <template v-if="esCategoriaGaming(producto.idCategoria)"><span class="stock-badge gaming">∞</span></template>
              <template v-else><span class="stock-badge" :class="{ 'low': producto.estatus !== 'I' && Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) && Number(producto.stock || 0) > 0, 'out': producto.estatus !== 'I' && Number(producto.stock || 0) === 0 }">{{ producto.stock }}</span></template>
            </td>
            <td class="col-tipo text-center">{{ producto.is_gramaje ? '⚖️ Gramaje' : '📦 Unidad' }}</td>
            <td class="col-caja text-center">
              <button v-if="esAdmin && !producto.is_gramaje && cajasDe(producto).length > 0" type="button" class="cajas-btn" @click="$emit('editar-cajas', producto)" title="Editar compra por caja">
                <span v-for="pz in cajasDe(producto)" :key="pz" class="cajas-badge">📦 {{ pz }} pzs</span>
              </button>
              <div v-else-if="cajasDe(producto).length > 0" class="cajas-view">
                <span v-for="pz in cajasDe(producto)" :key="pz" class="cajas-badge">📦 {{ pz }} pzs</span>
              </div>
              <span v-else class="sin-caja">—</span>
            </td>
            <td class="col-envase text-center">{{ producto.requiere_envase ? `Sí ($${Number(producto.precio_envase || 0).toFixed(2)})` : '—' }}</td>
            <td class="col-acciones text-center">
              <div class="acciones-cell">
                <button v-if="producto.estatus === 'I'" type="button" class="btn-action btn-restore" @click="$emit('restaurar', producto)" title="Restaurar producto (volver a activo)">🔄</button>
                <button type="button" class="btn-action btn-edit" @click="$emit('editar', producto)" title="Editar"><svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                <button v-if="esAdmin && !producto.is_gramaje" type="button" class="btn-action btn-cajas" @click="$emit('editar-cajas', producto)" title="Editar compra por caja">📦</button>
                <button type="button" class="btn-action btn-delete" @click="$emit('eliminar', producto)" title="Eliminar"><svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="productos-grid">
        <div v-for="producto in productosVisibles" :key="producto.idProducto" class="producto-card" :class="{ 'low-stock': producto.estatus !== 'I' && Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) && Number(producto.stock || 0) > 0, 'out-of-stock': producto.estatus !== 'I' && Number(producto.stock || 0) === 0, 'inactivo-scan': producto.estatus === 'I' }">
          <div class="pc-top">
            <input type="checkbox" class="row-checkbox" :checked="selectedProductos.has(producto.idProducto!)" @change="$emit('toggle-seleccion', producto.idProducto!)" />
            <div v-if="producto.is_gramaje || producto.requiere_envase" class="pc-badges">
              <span v-if="producto.is_gramaje" class="badge-gramaje">Gramaje</span>
              <span v-if="producto.requiere_envase" class="badge-envase">Envase</span>
            </div>
          </div>
          <div class="pc-ico">{{ obtenerEmojiDulce(producto.idProducto) }}</div>
          <span class="pc-name">{{ producto.nombre }}</span>
          <span v-if="producto.estatus === 'I'" class="badge-inactivo">⚠️ Producto inactivo</span>
          <div class="pc-stats">
            <div class="pc-stat"><span class="stat-label">Precio</span><span class="stat-value stat-price">{{ formatMoneda(producto.precio_venta) }}</span></div>
            <div class="pc-stat"><span class="stat-label">Stock</span><span class="stat-value" :class="producto.estatus === 'I' ? 'stat-inactivo' : { 'stat-low': Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) && Number(producto.stock || 0) > 0, 'stat-out': Number(producto.stock || 0) === 0 }">{{ producto.stock }}</span></div>
            <div class="pc-stat" v-if="cajasDe(producto).length > 0"><span class="stat-label">Caja</span><span class="stat-value stat-caja">📦 {{ cajasDe(producto).join(' · ') }} pzs</span></div>
            <div class="pc-stat" v-if="producto.precio_mayoreo"><span class="stat-label">Mayoreo</span><span class="stat-value stat-price">{{ formatMoneda(producto.precio_mayoreo) }}</span></div>
          </div>
          <div class="pc-actions">
            <button v-if="producto.estatus === 'I'" class="pc-btn pc-btn-restore" @click="$emit('restaurar', producto)" title="Restaurar producto (volver a activo)">🔄</button>
            <button class="pc-btn pc-btn-edit" @click="$emit('editar', producto)" title="Editar">✏️</button>
            <button v-if="esAdmin && !producto.is_gramaje" class="pc-btn pc-btn-cajas" @click="$emit('editar-cajas', producto)" title="Editar compra por caja">📦</button>
            <button class="pc-btn pc-btn-del" @click="$emit('eliminar', producto)" title="Eliminar">🗑️</button>
          </div>
        </div>
      </div>
      <div v-if="hayMas && !cargando && productosFiltrados.length > 0" ref="centinela" class="lista-centinela" aria-hidden="true">Cargando más productos…</div>
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

  <div v-else-if="tabActiva === 'inactivos'" class="tab-content">
    <div class="inactivos-search">
      <label class="ia-box">
        <span class="ia-icon" aria-hidden="true">🔍</span>
        <input :value="busquedaInactivos" @input="$emit('update:busquedaInactivos', ($event.target as HTMLInputElement).value)"
          @keydown.enter="($event.target as HTMLInputElement).select()"
          type="search" enterkeyhint="search" autocomplete="off" placeholder="Escanea un código o busca por nombre" class="ia-input" data-escaner />
        <button v-if="busquedaInactivos" type="button" class="ia-clear" aria-label="Limpiar búsqueda" @click.prevent="$emit('update:busquedaInactivos', '')">✕</button>
      </label>
    </div>
    <div class="table-container">
      <div v-if="cargandoInactivos" class="estado-loading"><div class="loading-spinner"></div><span>Cargando productos inactivos...</span></div>
      <div v-else-if="productosInactivos.length === 0" class="estado-empty">
        <span class="empty-icon">🗑️</span>
        <span class="empty-text">No hay productos inactivos</span>
      </div>
      <div v-else-if="inactivosFiltrados.length === 0" class="estado-empty">
        <span class="empty-icon">🔍</span>
        <span class="empty-text">Ningún producto inactivo coincide con "{{ busquedaInactivos.trim() }}"</span>
      </div>
      <table v-else class="tabla-productos tabla-inactivos">
        <thead><tr>
          <th class="col-icon">Icono</th>
          <th class="col-nombre">Nombre del Producto</th>
          <th class="col-categoria">Categoría</th>
          <th class="col-subcategoria">Subcategoría</th>
          <th class="col-codigo">Código</th>
          <th class="col-precio text-right">Precio Venta</th>
          <th class="col-stock text-center">Stock</th>
          <th class="col-acciones text-center">Acciones</th>
        </tr></thead>
        <tbody>
          <tr v-for="producto in inactivosFiltrados" :key="producto.idProducto" class="producto-row inactivo-row">
            <td class="col-icon"><div class="icon-cell">{{ obtenerEmojiDulce(producto.idProducto) }}</div></td>
            <td class="col-nombre">{{ producto.nombre }}<span class="badge-inactivo">Inactivo</span></td>
            <td class="col-categoria">{{ categoriaNombre(producto.idCategoria) }}</td>
            <td class="col-subcategoria">{{ subcategoriaNombre(producto.idSubcategoria) }}</td>
            <td class="col-codigo"><span class="codigo-badge">{{ mostrarCodigos(producto.codigoBarras) || '—' }}</span></td>
            <td class="col-precio text-right">{{ formatMoneda(producto.precio_venta) }}</td>
            <td class="col-stock text-center"><span class="stock-badge muted">{{ producto.stock }}</span></td>
            <td class="col-acciones text-center">
              <div class="acciones-cell">
                <button type="button" class="btn-action btn-restore" @click="$emit('restaurar', producto)" title="Restaurar producto (volver a activo)">🔄</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="table-footer" v-if="!cargandoInactivos && productosInactivos.length > 0">
      <span class="footer-count">{{ inactivosFiltrados.length }} producto{{ inactivosFiltrados.length !== 1 ? 's' : '' }} inactivo{{ inactivosFiltrados.length !== 1 ? 's' : '' }}<span v-if="busquedaInactivos.trim()" class="filter-indicator"> (filtrado de {{ productosInactivos.length }})</span></span>
    </div>
  </div>
</template>
<style scoped>
.inactivos-search{padding:.75rem 1rem;border-bottom:1px solid var(--color-border)}
.ia-box{display:flex;align-items:center;gap:.6rem;width:100%;max-width:32rem;box-sizing:border-box;padding:0 .5rem 0 .9rem;min-height:2.75rem;background:var(--color-bg-primary);border:1px solid var(--color-border);border-radius:.75rem;box-shadow:inset 2px 2px 4px rgba(0,0,0,.12);transition:border-color .2s,box-shadow .2s;cursor:text}
.ia-box:focus-within{border-color:var(--color-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--color-accent) 35%,transparent)}
.ia-icon{flex-shrink:0;font-size:1rem;opacity:.7}
.ia-input{flex:1;min-width:0;width:100%;padding:.6rem 0;border:none;outline:none;background:transparent;color:var(--color-text-primary);font:inherit;font-size:.95rem;-webkit-appearance:none;appearance:none}
.ia-input::placeholder{color:var(--color-text-secondary);opacity:.65}
.ia-input::-webkit-search-cancel-button{display:none}
.ia-clear{flex-shrink:0;width:2rem;height:2rem;display:flex;align-items:center;justify-content:center;border:none;border-radius:50%;background:transparent;color:var(--color-text-secondary);cursor:pointer;font-size:.9rem}
.ia-clear:hover{background:var(--color-border);color:var(--color-text-primary)}
@media(max-width:768px){.inactivos-search{padding:.6rem}.ia-box{max-width:none}.ia-input{font-size:1rem}}
</style>
