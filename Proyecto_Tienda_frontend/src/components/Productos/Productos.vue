<script setup lang="ts">
import { computed } from 'vue';
import ProductoFormModal from '../modals/Productos/ProductoFormModal.vue';
import ProductoScannerModal from '../modals/Productos/ProductoScannerModal.vue';
import Categorias from '../Categorias/Categorias.vue';
import Subcategorias from '../Subcategorias/Subcategorias.vue';
import Proveedores from '../Proveedores/Proveedores.vue';
import ReporteVentas from '../ReporteVentas/ReporteVentas.vue';
import ProductosToolbar from './secciones/ProductosToolbar.vue';
import ProductosTabs from './secciones/ProductosTabs.vue';
import AjustePrecioAdmin from './secciones/AjustePrecioAdmin.vue';

import { useProductos } from './logica/useProductos';

const {
  productos, categorias, subcategorias, cargando, guardando,
  terminoBusqueda, categoriaFiltro, subcategoriaFiltro, ordenStock, filtroTipo,
  vistaLista, toasts, tabActiva, modalFormOpen, modalScannerOpen, selectedProduct,
  scannerCode, selectedProductos, modalCategoriaOpen, nuevaCategoria, nuevaSubcategoria,
  cambiandoCategoria, fileInputRef, importando, vaciando,
  productosFiltrados, subcategoriasFiltradas, gamingCategoryId,
  exportarCSV, exportarXLSX, triggerImport, handleImport, vaciarInventario,
  obtenerNombreCategoria, obtenerNombreSubcategoria, formatoMoneda,
  esCategoriaGaming, obtenerEmojiDulce,
  cargarProductos, cargarCategorias,
  abrirModalNuevoProducto, abrirModalEditarProducto,
  handleSubmitProducto, handleDeleteProducto, handleScannerApply,
  toggleSeleccionProducto, toggleSeleccionTodos,
  abrirModalCategoria, aplicarCambioCategoria
} = useProductos();
</script>

<template>
  <main class="productos-layout">
    <section class="productos-panel">
      <ProductosToolbar
        :categorias="categorias"
        :subcategoriasFiltradas="subcategoriasFiltradas"
        :categoriaFiltro="categoriaFiltro"
        :subcategoriaFiltro="subcategoriaFiltro"
        :ordenStock="ordenStock"
        :filtroTipo="filtroTipo"
        :terminoBusqueda="terminoBusqueda"
        :tabActiva="tabActiva"
        :importando="importando"
        :vaciando="vaciando"
        :vistaLista="vistaLista"
        @update:categoriaFiltro="(v) => { categoriaFiltro = v; subcategoriaFiltro = null }"
        @update:subcategoriaFiltro="(v) => { subcategoriaFiltro = v }"
        @update:ordenStock="(v) => { ordenStock = v as 'mayor' | 'menor' | null }"
        @update:filtroTipo="(v) => { filtroTipo = v as 'unidad' | 'gramaje' | null }"
        @update:terminoBusqueda="(v) => { terminoBusqueda = v }"
        @update:tabActiva="(v) => { tabActiva = v as 'productos' | 'categorias' | 'subcategorias' | 'proveedores' | 'reporte' | 'ajustePrecio' }"
        @update:vistaLista="(v) => { vistaLista = v }"
        @exportar-csv="exportarCSV"
        @exportar-xlsx="exportarXLSX"
        @importar="triggerImport"
        @vaciar-inventario="vaciarInventario"
        @nuevo-producto="abrirModalNuevoProducto"
      />

      <ProductosTabs
        :tabActiva="tabActiva"
        :cargando="cargando"
        :productosFiltrados="productosFiltrados"
        :vistaLista="vistaLista"
        :terminoBusqueda="terminoBusqueda"
        :categoriaFiltro="categoriaFiltro"
        :selectedProductos="selectedProductos"
        :escaneando="false"
        :escanerActivo="false"
        :formatMoneda="formatoMoneda"
        :obtenerEmojiDulce="obtenerEmojiDulce"
        :esCategoriaGaming="esCategoriaGaming"
        :categoriaNombre="(id?: number) => obtenerNombreCategoria(id || 0)"
        :subcategoriaNombre="(id: number | null | undefined) => obtenerNombreSubcategoria(id || 0)"
        @update:tabActiva="(v) => { tabActiva = v as 'productos' | 'categorias' | 'subcategorias' | 'proveedores' | 'reporte' | 'ajustePrecio' }"
        @toggle-seleccion-todos="toggleSeleccionTodos"
        @editar="abrirModalEditarProducto"
        @nuevo-producto="abrirModalNuevoProducto"
        @abrir-modal-categoria="modalCategoriaOpen = true"
        @eliminar="handleDeleteProducto"
        @iniciar-escaneo="() => {}"
        @detener-escaneo="() => {}"
      />

      <div v-if="tabActiva === 'categorias'" class="tab-content">
        <Categorias @categorias-changed="cargarCategorias" />
      </div>
      <div v-else-if="tabActiva === 'subcategorias'" class="tab-content">
        <Subcategorias />
      </div>
      <div v-else-if="tabActiva === 'proveedores'" class="tab-content tab-proveedores">
        <Proveedores />
      </div>
      <div v-else-if="tabActiva === 'reporte'" class="tab-content tab-reporte">
        <ReporteVentas />
      </div>
      <div v-else-if="tabActiva === 'ajustePrecio'" class="tab-content tab-ajuste">
        <AjustePrecioAdmin />
      </div>
    </section>

    <ProductoFormModal
      :open="modalFormOpen"
      :data="selectedProduct ?? undefined"
      :loading="guardando"
      :prefill-code="scannerCode"
      :categorias="categorias"
      :subcategorias="subcategorias"
      @submit="handleSubmitProducto"
      @delete="handleDeleteProducto"
      @close="modalFormOpen = false"
      @scan="modalScannerOpen = true"
    />

    <ProductoScannerModal
      :open="modalScannerOpen"
      @apply="handleScannerApply"
      @close="modalScannerOpen = false"
    />

    <div v-if="modalCategoriaOpen" class="modal-overlay" @click.self="modalCategoriaOpen = false">
      <div class="modal-dialog modal-categoria">
        <div class="modal-header">
          <h3 class="modal-title">🏷️ Cambiar Categoría</h3>
          <button type="button" class="modal-close" @click="modalCategoriaOpen = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">Se actualizará la categoría de <strong>{{ selectedProductos.size }} producto(s)</strong> seleccionado(s).</p>
          <div class="form-group">
            <label class="form-label">Nueva Categoría</label>
            <select v-model="nuevaCategoria" class="form-select">
              <option :value="null">— Sin cambiar —</option>
              <option v-for="cat in categorias" :key="cat.idCategoria" :value="cat.idCategoria">{{ cat.nombre }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Nueva Subcategoría</label>
            <select v-model="nuevaSubcategoria" class="form-select">
              <option :value="null">— Sin cambiar —</option>
              <option v-for="sub in subcategorias" :key="sub.idSubcategoria" :value="sub.idSubcategoria">{{ sub.nombre }}</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="modalCategoriaOpen = false">Cancelar</button>
          <button type="button" class="btn-primary" @click="aplicarCambioCategoria" :disabled="cambiandoCategoria">
            {{ cambiandoCategoria ? 'Aplicando...' : 'Aplicar Cambio' }}
          </button>
        </div>
      </div>
    </div>

    <input ref="fileInputRef" type="file" accept=".csv,.xlsx,.xls" class="hidden-file-input" @change="handleImport" />

    <transition-group name="toast" tag="div" class="toast-container">
      <div v-for="toast in toasts" :key="toast.id" class="toast-notification" :class="`toast-${toast.tipo}`">
        <span class="toast-icon">{{ toast.tipo === 'ok' ? '✓' : toast.tipo === 'error' ? '✕' : 'ℹ' }}</span>
        <span class="toast-message">{{ toast.mensaje }}</span>
      </div>
    </transition-group>
  </main>
</template>

<style scoped>
.productos-layout{height:100dvh;width:100%;padding:1rem;overflow:hidden;display:flex;flex-direction:column;background:linear-gradient(180deg,var(--gradient-bg-start) 0%,var(--gradient-bg-mid) 50%,var(--color-bg-primary) 100%);position:relative}
.productos-layout :deep(.productos-panel){flex:1;min-height:0;display:flex;flex-direction:column;background:var(--color-bg-secondary);border:none;border-radius:14px;box-shadow:10px 10px 30px rgba(0,0,0,.35),-4px -4px 16px rgba(255,255,255,.03);overflow:hidden}
.productos-layout .tab-content{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.productos-layout .tab-proveedores{overflow-y:auto}
.productos-layout .tab-reporte{overflow-y:auto}
.productos-layout .tab-ajuste{overflow-y:auto}
.productos-layout .hidden-file-input{display:none}
.productos-layout :deep(.table-container){flex:1;min-height:0;overflow:auto;padding:0}
.productos-layout :deep(.estado-loading),.productos-layout :deep(.estado-empty){display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:4rem 1rem;color:var(--color-text-secondary)}
.productos-layout :deep(.loading-spinner){width:48px;height:48px;border:4px solid var(--color-border);border-top-color:var(--color-accent);border-radius:50%;animation:spPr 1s linear infinite}
@keyframes spPr{to{transform:rotate(360deg)}}
.productos-layout :deep(.empty-icon){font-size:3.5rem;opacity:.5}
.productos-layout :deep(.empty-text){font-size:1rem;font-weight:600}
.productos-layout :deep(.bulk-action-bar){display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;margin-top:.5rem;background:var(--color-bg-panel);border:none;border-radius:10px;flex-wrap:wrap;gap:.5rem;box-shadow:inset 2px 2px 5px rgba(0,0,0,.1),0 0 0 1px color-mix(in srgb,var(--color-accent) 20%,transparent)}
.productos-layout :deep(.bulk-info){display:flex;align-items:center;gap:.75rem}
.productos-layout :deep(.bulk-count){font-weight:700;color:var(--color-accent);font-size:.9rem}
.productos-layout :deep(.btn-clear-selection){background:transparent;border:none;color:var(--color-text-secondary);font-size:.8rem;cursor:pointer;padding:.25rem .5rem;border-radius:4px;transition:all .15s;font-family:var(--font-body)}
.productos-layout :deep(.btn-clear-selection:hover){color:var(--color-error);background:color-mix(in srgb,var(--color-error) 10%,transparent)}
.productos-layout :deep(.btn-bulk-action){display:flex;align-items:center;gap:.4rem;padding:.5rem 1rem;background:var(--color-accent);color:var(--color-on-brand);border:none;border-radius:8px;font-weight:700;font-size:.85rem;cursor:pointer;transition:all .15s;font-family:var(--font-body);box-shadow:3px 3px 8px rgba(0,0,0,.15)}
.productos-layout :deep(.btn-bulk-action:hover){transform:translateY(-1px);box-shadow:5px 5px 12px rgba(0,0,0,.2)}
.productos-layout :deep(.table-footer){padding:.75rem 1.5rem;background:var(--color-bg-panel);border:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.03),0 -1px 0 var(--color-border);flex-shrink:0}
.productos-layout :deep(.footer-count){font-size:.75rem;color:var(--color-text-secondary);font-weight:600}
.productos-layout :deep(.filter-indicator){color:var(--color-accent);margin-left:.25rem}
.productos-layout .toast-container{position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;pointer-events:none}
.productos-layout .toast-notification{background:var(--color-bg-panel);border:none;border-radius:10px;padding:.875rem 1rem;display:flex;align-items:center;gap:.75rem;box-shadow:8px 8px 20px rgba(0,0,0,.3),-2px -2px 8px rgba(255,255,255,.02);min-width:280px;max-width:400px;pointer-events:auto;border-left:4px solid var(--color-accent)}
.productos-layout .toast-ok{border-left-color:var(--color-success)}
.productos-layout .toast-error{border-left-color:var(--color-error)}
.productos-layout .toast-info{border-left-color:var(--color-info)}
.productos-layout .toast-icon{font-size:1.2rem;font-weight:900}
.productos-layout .toast-ok .toast-icon{color:var(--color-success)}
.productos-layout .toast-error .toast-icon{color:var(--color-error)}
.productos-layout .toast-info .toast-icon{color:var(--color-info)}
.productos-layout .toast-message{font-size:.85rem;color:var(--color-text-primary);font-weight:600}
.productos-layout .toast-enter-active{transition:all .3s ease}
.productos-layout .toast-leave-active{transition:all .2s ease}
.productos-layout .toast-enter-from{opacity:0;transform:translateX(100%)}
.productos-layout .toast-leave-to{opacity:0;transform:translateX(100%)}
.productos-layout :deep(.view-toggles){display:flex;background:var(--color-bg-primary);border:none;border-radius:8px;overflow:hidden;flex-shrink:0;box-shadow:inset 2px 2px 4px rgba(0,0,0,.12)}
.productos-layout :deep(.view-btn){width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;color:var(--color-text-secondary);cursor:pointer;transition:all .15s;font-size:1rem;line-height:1;font-family:var(--font-body)}
.productos-layout :deep(.view-btn.on){background:var(--color-accent);color:var(--color-on-brand);box-shadow:inset 1px 1px 3px rgba(0,0,0,.2)}
.productos-layout :deep(.view-btn:hover:not(.on)){background:var(--color-bg-secondary)}
.productos-layout :deep(.view-btn:active){transform:scale(.95)}
.productos-layout :deep(.toolbar){padding:1rem 1.5rem;background:var(--color-bg-panel);border:none;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-shrink:0;box-shadow:inset 0 -1px 0 rgba(255,255,255,.03),0 2px 4px rgba(0,0,0,.08)}
.productos-layout :deep(.toolbar-left){display:flex;flex-direction:column;gap:.25rem}
.productos-layout :deep(.toolbar-title){display:flex;align-items:center;gap:.5rem;margin:0;font-size:clamp(1.25rem,2.5vw,1.5rem);font-weight:900;color:var(--color-accent);text-transform:uppercase;letter-spacing:.05em}
.productos-layout :deep(.title-icon){font-size:1.5rem}
.productos-layout :deep(.toolbar-subtitle){margin:0;font-size:.75rem;color:var(--color-text-secondary);letter-spacing:.02em}
.productos-layout :deep(.toolbar-right){display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
.productos-layout :deep(.category-filter){background:var(--color-bg-primary);border:none;padding:.6rem 2.5rem .6rem .85rem;color:var(--color-text-primary);border-radius:8px;font-size:.85rem;font-family:inherit;cursor:pointer;transition:all .2s;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .75rem center;min-width:180px;box-shadow:inset 2px 2px 4px rgba(0,0,0,.12)}
.productos-layout :deep(.category-filter:focus){outline:none;box-shadow:inset 2px 2px 4px rgba(0,0,0,.12),0 0 0 2px var(--color-accent)}
.productos-layout :deep(.category-filter option){background:var(--color-bg-primary);color:var(--color-text-primary)}
.productos-layout :deep(.search-wrapper){position:relative;display:flex;align-items:center}
.productos-layout :deep(.search-icon){position:absolute;left:.75rem;font-size:.85rem;pointer-events:none;opacity:.7}
.productos-layout :deep(.search-input){background:var(--color-bg-primary);border:none;padding:.6rem 2.25rem .6rem 2.25rem;color:var(--color-text-primary);border-radius:8px;font-size:.85rem;width:240px;transition:all .2s;font-family:inherit;box-shadow:inset 2px 2px 4px rgba(0,0,0,.12)}
.productos-layout :deep(.search-input:focus){outline:none;box-shadow:inset 2px 2px 4px rgba(0,0,0,.12),0 0 0 2px var(--color-accent)}
.productos-layout :deep(.search-input::placeholder){color:var(--color-text-secondary);opacity:.6}
.productos-layout :deep(.search-clear){position:absolute;right:.5rem;background:none;border:none;color:var(--color-text-secondary);cursor:pointer;padding:.25rem;font-size:.9rem;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:all .2s;width:24px;height:24px;font-family:var(--font-body)}
.productos-layout :deep(.search-clear:hover){background:var(--color-border);color:var(--color-text-primary)}
.productos-layout :deep(.import-export-group){display:flex;gap:.4rem;align-items:center}
.productos-layout :deep(.btn-secondary){border:none;padding:.6rem .85rem;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-family:var(--font-body);color:var(--color-text-secondary);background:var(--color-bg-secondary);cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,.1),-1px -1px 3px rgba(255,255,255,.02);transition:all .2s;display:flex;align-items:center;gap:.35rem;border-radius:8px;flex-shrink:0}
.productos-layout :deep(.btn-secondary:hover:not(:disabled)){transform:translateY(-2px);box-shadow:5px 5px 12px rgba(0,0,0,.18);color:var(--color-text-primary)}
.productos-layout :deep(.btn-secondary:active:not(:disabled)){transform:translateY(1px);box-shadow:inset 2px 2px 4px rgba(0,0,0,.15)}
.productos-layout :deep(.btn-secondary:disabled){opacity:.5;cursor:not-allowed;transform:none}
.productos-layout :deep(.btn-danger){border:none;padding:.6rem .85rem;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-family:var(--font-body);color:#fff;background:linear-gradient(145deg,var(--color-error) 0%,color-mix(in srgb,var(--color-error) 60%,#000) 100%);cursor:pointer;box-shadow:4px 4px 10px rgba(0,0,0,.2);transition:all .2s;display:flex;align-items:center;gap:.35rem;border-radius:8px;flex-shrink:0}
.productos-layout :deep(.btn-danger:hover:not(:disabled)){transform:translateY(-2px);box-shadow:6px 6px 16px rgba(0,0,0,.28)}
.productos-layout :deep(.btn-danger:active:not(:disabled)){transform:translateY(1px);box-shadow:inset 2px 2px 5px rgba(0,0,0,.2)}
.productos-layout :deep(.btn-danger:disabled){opacity:.5;cursor:not-allowed;transform:none}
.productos-layout :deep(.btn-sm){padding:.5rem .7rem;font-size:.7rem}
.productos-layout :deep(.btn-primary){border:none;padding:.6rem 1.25rem;font-size:.8rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-family:var(--font-body);color:var(--color-on-brand);background:var(--color-accent);cursor:pointer;box-shadow:4px 4px 10px rgba(0,0,0,.2),-1px -1px 4px rgba(255,255,255,.04);transition:all .2s;display:flex;align-items:center;gap:.4rem;border-radius:8px;flex-shrink:0}
.productos-layout :deep(.btn-primary:hover){transform:translateY(-2px);box-shadow:6px 6px 16px rgba(0,0,0,.28),-3px -3px 8px rgba(255,255,255,.05)}
.productos-layout :deep(.btn-primary:active){transform:translateY(1px);box-shadow:inset 2px 2px 5px rgba(0,0,0,.2)}
.productos-layout :deep(.btn-icon){font-size:1.1rem;font-weight:900}
.productos-layout :deep(.tabs-bar){display:flex;gap:0;background:var(--color-bg-panel);border:none;box-shadow:inset 0 -1px 0 var(--color-border);padding:0 1.5rem;flex-shrink:0}
.productos-layout :deep(.tab-btn){padding:.75rem 1.5rem;background:transparent;border:none;border-bottom:3px solid transparent;color:var(--color-text-secondary);font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;cursor:pointer;display:flex;align-items:center;gap:.5rem;transition:all .2s;margin-bottom:-1px;box-shadow:none;font-family:var(--font-body)}
.productos-layout :deep(.tab-btn:hover){color:var(--color-text-primary);background:color-mix(in srgb,var(--color-accent) 5%,transparent);transform:none;filter:none}
.productos-layout :deep(.tab-btn.active){color:var(--color-accent);border-bottom-color:var(--color-accent);background:color-mix(in srgb,var(--color-accent) 10%,transparent)}
.productos-layout :deep(.tab-icon){font-size:1.1rem}
.productos-layout :deep(.tab-text){font-family:inherit}
.productos-layout :deep(.tabla-productos){width:100%;border-collapse:collapse;font-size:.9rem}
.productos-layout :deep(.tabla-productos thead){position:sticky;top:0;z-index:10;background:var(--color-bg-panel);box-shadow:inset 0 -1px 0 var(--color-accent)}
.productos-layout :deep(.tabla-productos th){padding:.875rem 1rem;text-align:left;font-weight:700;color:var(--color-accent);text-transform:uppercase;font-size:.7rem;letter-spacing:.08em;white-space:nowrap;background:var(--color-bg-panel);font-family:var(--font-body)}
.productos-layout :deep(.text-right){text-align:right!important}
.productos-layout :deep(.text-center){text-align:center!important}
.productos-layout :deep(.producto-row){border-bottom:1px solid var(--color-border);transition:all .15s}
.productos-layout :deep(.producto-row:hover){background:color-mix(in srgb,var(--color-accent) 8%,transparent)}
.productos-layout :deep(.producto-row.low-stock){background:color-mix(in srgb,var(--color-warning) 18%,transparent);border-left:4px solid var(--color-warning)}
.productos-layout :deep(.producto-row.low-stock:hover){background:color-mix(in srgb,var(--color-warning) 25%,transparent)}
.productos-layout :deep(.producto-row.out-of-stock){background:color-mix(in srgb,var(--color-error) 20%,transparent);border-left:4px solid var(--color-error);animation:psPr 2s ease-in-out infinite}
@keyframes psPr{0%,100%{opacity:1}50%{opacity:.85}}
.productos-layout :deep(.producto-row.out-of-stock:hover){background:color-mix(in srgb,var(--color-error) 30%,transparent)}
.productos-layout :deep(.col-check){width:40px;text-align:center}
.productos-layout :deep(.row-checkbox){width:16px;height:16px;accent-color:var(--color-accent);cursor:pointer}
.productos-layout :deep(.producto-row.selected){background:color-mix(in srgb,var(--color-accent) 15%,transparent);border-left:4px solid var(--color-accent)}
.productos-layout :deep(.producto-row.selected:hover){background:color-mix(in srgb,var(--color-accent) 22%,transparent)}
.productos-layout :deep(.producto-row td){padding:.75rem 1rem;vertical-align:middle;border-bottom:none;background:transparent}
.productos-layout :deep(.icon-cell){width:40px;height:40px;background:var(--color-bg-primary);border:none;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;transition:all .2s;box-shadow:inset 2px 2px 4px rgba(0,0,0,.08)}
.productos-layout :deep(.producto-row:hover .icon-cell){box-shadow:inset 2px 2px 4px rgba(0,0,0,.08),0 0 0 1px var(--color-accent)}
.productos-layout :deep(.nombre-cell){display:flex;flex-direction:column;gap:.2rem}
.productos-layout :deep(.nombre-text){font-weight:700;color:var(--color-text-primary);font-size:.9rem}
.productos-layout :deep(.nombre-id){font-size:.7rem;color:var(--color-text-secondary);font-family:monospace}
.productos-layout :deep(.categoria-badge){display:inline-block;padding:.3rem .6rem;background:color-mix(in srgb,var(--color-info) 15%,transparent);border:none;border-radius:6px;font-size:.75rem;font-weight:600;color:var(--color-info);white-space:nowrap;box-shadow:2px 2px 4px rgba(0,0,0,.06)}
.productos-layout :deep(.subcategoria-badge){display:inline-block;padding:.3rem .6rem;background:color-mix(in srgb,var(--color-accent) 15%,transparent);border:none;border-radius:6px;font-size:.75rem;font-weight:600;color:var(--color-accent);white-space:nowrap;box-shadow:2px 2px 4px rgba(0,0,0,.06)}
.productos-layout :deep(.categoria-badge:empty::before),.productos-layout :deep(.categoria-badge[data-default]::before){content:'Sin asignar';opacity:.6}
.productos-layout :deep(.codigo-badge){display:inline-block;padding:.25rem .6rem;background:var(--color-bg-primary);border:none;border-radius:6px;font-size:.75rem;font-family:monospace;color:var(--color-text-secondary);box-shadow:inset 1px 1px 3px rgba(0,0,0,.06)}
.productos-layout :deep(.codigo-empty){font-size:.75rem;color:var(--color-text-secondary);opacity:.6;font-style:italic}
.productos-layout :deep(.col-precio){color:var(--color-success);font-weight:900;font-family:monospace;font-size:.95rem}
.productos-layout :deep(.col-tipo){font-weight:700;font-size:.82rem;color:var(--color-text-primary)}
.productos-layout :deep(.col-categoria){color:var(--color-info);font-weight:600;font-size:.82rem}
.productos-layout :deep(.col-subcategoria){color:var(--color-text-secondary);font-weight:500;font-size:.8rem}
.productos-layout :deep(.col-envase){color:var(--color-warning);font-size:.78rem}
.productos-layout :deep(.col-nombre){font-weight:600;color:var(--color-text-primary);font-size:.88rem}
.productos-layout :deep(.stock-badge){display:inline-block;padding:.25rem .5rem;border-radius:5px;font-weight:800;font-family:monospace;font-size:.85rem;min-width:36px;text-align:center;color:var(--color-success);background:color-mix(in srgb,var(--color-success) 15%,transparent)}
.productos-layout :deep(.stock-badge.low){color:var(--color-bg-primary);background:var(--color-warning);animation:psWarn 2s ease-in-out infinite}
.productos-layout :deep(.stock-badge.out){color:#fff;background:var(--color-error);animation:psBadge 2s ease-in-out infinite}
.productos-layout :deep(.stock-badge.gaming){color:var(--color-accent);background:color-mix(in srgb,var(--color-accent) 15%,transparent);font-weight:800}
@keyframes psWarn{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--color-warning) 40%,transparent)}50%{box-shadow:0 0 0 6px color-mix(in srgb,var(--color-warning) 0%,transparent)}}
@keyframes psBadge{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--color-error) 40%,transparent)}50%{box-shadow:0 0 0 6px color-mix(in srgb,var(--color-error) 0%,transparent)}}
.productos-layout :deep(.stock-value){color:inherit}
.productos-layout :deep(.stock-value.rentable-text){color:var(--color-accent);font-weight:700}
.productos-layout :deep(.tipo-badge){display:inline-block;padding:.3rem .6rem;background:color-mix(in srgb,var(--color-accent) 15%,transparent);border:none;border-radius:6px;font-size:.7rem;font-weight:700;color:var(--color-accent);text-transform:uppercase;letter-spacing:.04em;box-shadow:2px 2px 4px rgba(0,0,0,.06)}
.productos-layout :deep(.tipo-badge.tipo-normal){background:color-mix(in srgb,var(--color-success) 15%,transparent);color:var(--color-success)}
.productos-layout :deep(.tipo-badge.tipo-rentable){background:color-mix(in srgb,var(--color-accent) 18%,transparent);color:var(--color-accent);box-shadow:2px 2px 4px rgba(0,0,0,.06),0 0 6px color-mix(in srgb,var(--color-accent) 20%,transparent)}
.productos-layout :deep(.envase-badge){display:inline-block;padding:.3rem .6rem;border:none;border-radius:6px;font-size:.7rem;font-weight:700;font-family:monospace;white-space:nowrap}
.productos-layout :deep(.envase-badge.envase-si){background:color-mix(in srgb,var(--color-warning) 15%,transparent);color:var(--color-warning);box-shadow:2px 2px 4px rgba(0,0,0,.06)}
.productos-layout :deep(.envase-badge.envase-no){color:var(--color-text-secondary);opacity:.4}
.productos-layout :deep(.acciones-cell){display:flex;align-items:center;justify-content:center;gap:.5rem}
.productos-layout :deep(.btn-action){width:36px;height:36px;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;background:var(--color-bg-primary);padding:0;font-family:var(--font-body);box-shadow:3px 3px 6px rgba(0,0,0,.1)}
.productos-layout :deep(.btn-action .action-icon){width:18px;height:18px}
.productos-layout :deep(.btn-edit){color:var(--color-accent)}
.productos-layout :deep(.btn-edit:hover){background:var(--color-accent);color:var(--color-on-brand);transform:translateY(-2px);box-shadow:5px 5px 10px rgba(0,0,0,.18)}
.productos-layout :deep(.btn-delete){color:var(--color-error)}
.productos-layout :deep(.btn-delete:hover){background:var(--color-error);color:#fff;transform:translateY(-2px);box-shadow:5px 5px 10px rgba(0,0,0,.18)}
.productos-layout :deep(.productos-grid){display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.75rem;padding:.5rem 0}
.productos-layout :deep(.producto-card){position:relative;background:var(--color-bg-primary);border:none;border-radius:12px;padding:.75rem;display:flex;flex-direction:column;align-items:center;gap:.35rem;transition:all .2s;box-shadow:4px 4px 8px rgba(0,0,0,.12),-2px -2px 5px rgba(255,255,255,.02);text-align:center}
.productos-layout :deep(.producto-card:hover){transform:translateY(-3px);box-shadow:6px 6px 14px rgba(0,0,0,.18),-3px -3px 8px rgba(255,255,255,.03)}
.productos-layout :deep(.producto-card.low-stock){box-shadow:4px 4px 8px rgba(0,0,0,.12),-2px -2px 5px rgba(255,255,255,.02),inset 0 0 0 2px color-mix(in srgb,var(--color-warning) 35%,transparent)}
.productos-layout :deep(.producto-card.out-of-stock){box-shadow:4px 4px 8px rgba(0,0,0,.12),-2px -2px 5px rgba(255,255,255,.02),inset 0 0 0 2px color-mix(in srgb,var(--color-error) 35%,transparent)}
.productos-layout :deep(.pc-top){display:flex;align-items:center;justify-content:space-between;width:100%}
.productos-layout :deep(.pc-badges){display:flex;gap:.25rem;justify-content:flex-end}
.productos-layout :deep(.badge-gramaje),.productos-layout :deep(.badge-envase){font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:.15rem .4rem;border-radius:5px;color:var(--color-text-secondary);background:var(--color-bg-secondary);box-shadow:1px 1px 3px rgba(0,0,0,.06)}
.productos-layout :deep(.badge-gramaje){color:var(--color-accent);background:color-mix(in srgb,var(--color-accent) 10%,var(--color-bg-secondary))}
.productos-layout :deep(.badge-envase){color:var(--color-success);background:color-mix(in srgb,var(--color-success) 10%,var(--color-bg-secondary))}
.productos-layout :deep(.pc-ico){display:flex;align-items:center;justify-content:center;width:48px;height:48px;background:var(--color-bg-secondary);border-radius:50%;font-size:1.3rem;border:none;margin:.15rem 0;box-shadow:inset 2px 2px 5px rgba(0,0,0,.08),2px 2px 4px rgba(0,0,0,.06)}
.productos-layout :deep(.pc-name){margin:0;font-size:.75rem;font-weight:700;color:var(--color-text-primary);text-align:center;line-height:1.3;min-height:1.5em;width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-family:var(--font-body);word-break:break-word}
.productos-layout :deep(.pc-stats){display:flex;flex-direction:column;gap:.2rem;width:100%}
.productos-layout :deep(.pc-stat){display:flex;align-items:center;justify-content:space-between;padding:.2rem .4rem;background:var(--color-bg-secondary);border-radius:5px;box-shadow:inset 1px 1px 3px rgba(0,0,0,.05)}
.productos-layout :deep(.stat-label){font-size:.55rem;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.03em}
.productos-layout :deep(.stat-value){font-size:.65rem;font-family:'Courier New',monospace;font-weight:600;white-space:nowrap}
.productos-layout :deep(.stat-low){color:var(--color-warning)}
.productos-layout :deep(.stat-out){color:var(--color-error)}
.productos-layout :deep(.stat-price){color:var(--color-success)}
.productos-layout :deep(.pc-actions){display:flex;gap:.3rem;width:100%;margin-top:.1rem}
.productos-layout :deep(.pc-btn){flex:1;height:30px;display:flex;align-items:center;justify-content:center;border:none;border-radius:6px;background:var(--color-bg-secondary);cursor:pointer;font-size:.8rem;transition:all .15s;box-shadow:2px 2px 4px rgba(0,0,0,.08)}
.productos-layout :deep(.pc-btn:hover){transform:scale(1.05);box-shadow:3px 3px 6px rgba(0,0,0,.12)}
.productos-layout :deep(.pc-btn-edit:hover){color:var(--color-accent);background:color-mix(in srgb,var(--color-accent) 10%,var(--color-bg-secondary))}
.productos-layout :deep(.pc-btn-del:hover){color:var(--color-error);background:color-mix(in srgb,var(--color-error) 10%,var(--color-bg-secondary))}
.productos-layout .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem}
.productos-layout .modal-dialog{background:var(--color-bg-panel);border:none;border-radius:14px;box-shadow:12px 12px 30px rgba(0,0,0,.4),-6px -6px 20px rgba(255,255,255,.03);width:100%;max-width:500px;overflow:hidden}
.productos-layout .modal-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid color-mix(in srgb,var(--color-accent) 20%,transparent)}
.productos-layout .modal-title{margin:0;font-size:1.1rem;font-weight:800;color:var(--color-accent);text-transform:uppercase}
.productos-layout .modal-close{background:transparent;border:none;color:var(--color-text-secondary);cursor:pointer;font-size:1.2rem;padding:.25rem;line-height:1;border-radius:4px;transition:all .15s;font-family:var(--font-body)}
.productos-layout .modal-close:hover{color:var(--color-error);background:color-mix(in srgb,var(--color-error) 10%,transparent)}
.productos-layout .modal-body{padding:1.25rem}
.productos-layout .modal-desc{color:var(--color-text-secondary);font-size:.9rem;margin-bottom:1rem}
.productos-layout .modal-footer{display:flex;justify-content:flex-end;gap:.5rem;padding:1rem 1.25rem;border-top:1px solid var(--color-border)}
.productos-layout .modal-categoria{max-width:420px}
.productos-layout .form-group{margin-bottom:1rem}
.productos-layout .form-label{display:block;font-size:.8rem;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem}
.productos-layout .form-select{width:100%;padding:.6rem .75rem;border:none;border-radius:8px;background:var(--color-bg-primary);color:var(--color-text-primary);font-size:.9rem;transition:all .15s;box-shadow:inset 2px 2px 4px rgba(0,0,0,.12)}
.productos-layout .form-select:focus{outline:none;box-shadow:inset 2px 2px 4px rgba(0,0,0,.12),0 0 0 2px var(--color-accent)}
@media(max-width:1024px){.productos-layout :deep(.col-categoria),.productos-layout :deep(.col-subcategoria),.productos-layout :deep(.col-codigo),.productos-layout :deep(.col-tipo){display:none}.productos-layout :deep(.tabs-bar){overflow-x:auto;scrollbar-width:none}.productos-layout :deep(.tabs-bar::-webkit-scrollbar){display:none}.productos-layout :deep(.tab-btn){padding:.75rem 1rem;white-space:nowrap}}
@media(max-width:768px){.productos-layout{padding:.5rem}.productos-layout :deep(.toolbar){flex-direction:column;align-items:stretch;padding:.875rem 1rem}.productos-layout :deep(.toolbar-left){text-align:center}.productos-layout :deep(.toolbar-title){justify-content:center}.productos-layout :deep(.toolbar-right){justify-content:center;flex-wrap:wrap;gap:.5rem}.productos-layout :deep(.view-toggles){order:-1;width:100%;max-width:120px;margin:0 auto}.productos-layout :deep(.import-export-group){width:100%;justify-content:center}.productos-layout :deep(.category-filter){width:100%;min-width:unset}.productos-layout :deep(.search-input){width:100%}.productos-layout :deep(.col-precio),.productos-layout :deep(.col-stock){display:none}.productos-layout :deep(.col-codigo){display:none}.productos-layout :deep(.col-envase){display:none}.productos-layout :deep(.col-subcategoria){display:none}.productos-layout :deep(.bulk-action-bar){flex-direction:column;align-items:stretch}.productos-layout :deep(.bulk-info){justify-content:center}.productos-layout :deep(.btn-bulk-action){justify-content:center}.productos-layout :deep(.tabla-productos th),.productos-layout :deep(.tabla-productos td){padding:.6rem .75rem}.productos-layout :deep(.tabs-bar){padding:0 1rem}.productos-layout :deep(.tab-btn){padding:.65rem .85rem;font-size:.8rem}.productos-layout :deep(.tab-icon){font-size:1rem}.productos-layout :deep(.icon-cell){width:36px;height:36px;font-size:1.1rem}.productos-layout :deep(.nombre-text){font-size:.85rem}.productos-layout :deep(.nombre-id){font-size:.65rem}.productos-layout :deep(.btn-action){width:32px;height:32px}.productos-layout :deep(.btn-action .action-icon){width:16px;height:16px}.productos-layout :deep(.acciones-cell){gap:.35rem}.productos-layout .toast-container{bottom:1rem;right:1rem;left:1rem}.productos-layout .toast-notification{min-width:unset;max-width:unset;width:100%}.productos-layout :deep(.toolbar-right){flex-direction:column;align-items:stretch}.productos-layout :deep(.toolbar-right .category-filter),.productos-layout :deep(.toolbar-right .search-wrapper),.productos-layout :deep(.toolbar-right .import-export-group){width:100%}.productos-layout :deep(.productos-grid){grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.6rem}.productos-layout :deep(.view-btn){width:34px;height:34px;font-size:.95rem}}
@media(max-width:480px){.productos-layout :deep(.toolbar-left){display:none}.productos-layout :deep(.toolbar){padding:.4rem .45rem;gap:.2rem}.productos-layout :deep(.toolbar-right){gap:.2rem}.productos-layout :deep(.category-filter){padding:.3rem .2rem;font-size:.6rem;min-width:0;width:100%}.productos-layout :deep(.search-input){padding:.3rem 1.5rem .3rem 1.5rem;font-size:.65rem;width:100%}.productos-layout :deep(.search-wrapper){width:100%}.productos-layout :deep(.search-icon){left:.3rem;font-size:.65rem}.productos-layout :deep(.import-export-group .btn-text){display:none}.productos-layout :deep(.import-export-group .btn-secondary){padding:.3rem .35rem;min-width:28px;justify-content:center;font-size:.6rem}.productos-layout :deep(.import-export-group .btn-icon){font-size:.85rem;margin:0}.productos-layout :deep(.btn-danger.btn-sm){padding:.3rem .35rem;font-size:.6rem}.productos-layout :deep(.btn-primary .btn-text){display:none}.productos-layout :deep(.btn-primary){padding:.35rem .55rem;font-size:.65rem}.productos-layout :deep(.tab-text){display:none}.productos-layout :deep(.tab-btn){padding:.45rem .35rem;justify-content:center;font-size:.65rem}.productos-layout :deep(.tab-icon){font-size:1rem;margin:0}.productos-layout :deep(.tabs-bar){justify-content:space-around;padding:0 .2rem}.productos-layout :deep(.view-toggles){max-width:70px}.productos-layout :deep(.view-btn){width:26px;height:26px;font-size:.75rem}.productos-layout :deep(.tabla-productos){font-size:.8rem}.productos-layout :deep(.tabla-productos th),.productos-layout :deep(.tabla-productos td){padding:.5rem .5rem}.productos-layout :deep(.icon-cell){width:32px;height:32px;font-size:1rem}.productos-layout :deep(.nombre-text){font-size:.8rem}.productos-layout :deep(.nombre-id){font-size:.6rem}.productos-layout :deep(.btn-action){width:30px;height:30px}.productos-layout :deep(.btn-action .action-icon){width:14px;height:14px}.productos-layout :deep(.acciones-cell){gap:.25rem}.productos-layout :deep(.stock-badge){padding:.25rem .4rem;font-size:.8rem}.productos-layout :deep(.stock-icon){font-size:.85rem}.productos-layout .toast-container{bottom:.5rem;right:.5rem;left:.5rem}.productos-layout .toast-notification{padding:.75rem .85rem}.productos-layout .toast-icon{font-size:1rem}.productos-layout .toast-message{font-size:.8rem}.productos-layout :deep(.estado-loading),.productos-layout :deep(.estado-empty){padding:2.5rem .5rem}.productos-layout :deep(.empty-icon){font-size:2.5rem}.productos-layout :deep(.empty-text){font-size:.9rem}.productos-layout :deep(.loading-spinner){width:36px;height:36px;border-width:3px}.productos-layout :deep(.category-filter),.productos-layout :deep(.search-input){font-size:.8rem;padding:.5rem 2rem .5rem .7rem}.productos-layout :deep(.btn-secondary){padding:.5rem .7rem;font-size:.7rem}.productos-layout :deep(.categoria-badge){font-size:.65rem;padding:.15rem .4rem}.productos-layout :deep(.table-footer){padding:.6rem 1rem}.productos-layout :deep(.footer-count){font-size:.7rem}.productos-layout :deep(.bulk-action-bar){padding:.6rem .75rem}.productos-layout :deep(.bulk-count){font-size:.8rem}.productos-layout :deep(.btn-bulk-action){padding:.45rem .75rem;font-size:.75rem}.productos-layout :deep(.productos-grid){grid-template-columns:repeat(2,1fr);gap:.5rem}.productos-layout :deep(.producto-card){padding:.6rem}.productos-layout :deep(.pc-ico){width:36px;height:36px;font-size:1rem}.productos-layout :deep(.pc-name){font-size:.7rem}.productos-layout :deep(.pc-stat-l){font-size:.5rem}.productos-layout :deep(.pc-stat-v){font-size:.6rem}.productos-layout :deep(.pc-btn){height:28px;font-size:.8rem}.productos-layout :deep(.view-toggles){border-radius:6px}.productos-layout :deep(.view-btn){width:32px;height:32px;font-size:.9rem}}
@media(max-width:360px){.productos-layout :deep(.toolbar){padding:.3rem .25rem;gap:.15rem}.productos-layout :deep(.toolbar-right){gap:.15rem}.productos-layout :deep(.category-filter){padding:.25rem .15rem;font-size:.55rem}.productos-layout :deep(.search-input){padding:.25rem 1.2rem .25rem 1.2rem;font-size:.6rem}.productos-layout :deep(.search-icon){font-size:.6rem}.productos-layout :deep(.import-export-group){gap:.15rem}.productos-layout :deep(.import-export-group .btn-text){display:none}.productos-layout :deep(.import-export-group .btn-secondary){padding:.25rem .3rem;min-width:24px;justify-content:center;font-size:.55rem}.productos-layout :deep(.import-export-group .btn-icon){font-size:.75rem;margin:0}.productos-layout :deep(.btn-danger.btn-sm){padding:.25rem .3rem;font-size:.55rem}.productos-layout :deep(.btn-primary .btn-text){display:none}.productos-layout :deep(.btn-primary){padding:.3rem .45rem;font-size:.6rem}.productos-layout :deep(.btn-icon){font-size:.75rem}.productos-layout :deep(.btn-text){font-size:.55rem}.productos-layout :deep(.tab-btn){padding:.4rem .25rem;font-size:.6rem}.productos-layout :deep(.tab-icon){font-size:.85rem}.productos-layout :deep(.tabs-bar){padding:0 .15rem;gap:0}.productos-layout :deep(.view-btn){width:24px;height:24px;font-size:.7rem}.productos-layout :deep(.view-toggles){max-width:60px}.productos-layout :deep(.tabla-productos th),.productos-layout :deep(.tabla-productos td){padding:.4rem .35rem}.productos-layout :deep(.col-check){width:30px}.productos-layout :deep(.row-checkbox){width:14px;height:14px}.productos-layout :deep(.col-icon){width:30px}.productos-layout :deep(.icon-cell){width:28px;height:28px;font-size:.85rem}.productos-layout :deep(.nombre-text){font-size:.7rem}.productos-layout :deep(.nombre-id){font-size:.55rem}.productos-layout :deep(.categoria-badge){font-size:.6rem;padding:.1rem .3rem}.productos-layout :deep(.btn-action){width:26px;height:26px}.productos-layout :deep(.btn-action .action-icon){width:12px;height:12px}.productos-layout :deep(.stock-value){font-size:.7rem}.productos-layout :deep(.stock-icon){font-size:.75rem}.productos-layout :deep(.tipo-badge){font-size:.6rem;padding:.1rem .3rem}.productos-layout :deep(.envase-badge){font-size:.6rem}.productos-layout :deep(.productos-grid){gap:.35rem;padding:.3rem 0}.productos-layout :deep(.producto-card){padding:.45rem;gap:.25rem;border-radius:8px}.productos-layout :deep(.pc-top){margin-bottom:.1rem}.productos-layout :deep(.pc-id){font-size:.5rem}.productos-layout :deep(.pc-dot){width:6px;height:6px}.productos-layout :deep(.pc-ico){width:28px;height:28px;font-size:.8rem}.productos-layout :deep(.pc-name){font-size:.6rem;min-height:1.2em;-webkit-line-clamp:1}.productos-layout :deep(.pc-badges){gap:.2rem}.productos-layout :deep(.pc-badge){font-size:.45rem;padding:.05rem .25rem;border-radius:4px}.productos-layout :deep(.pc-stats){gap:.15rem}.productos-layout :deep(.pc-stat){padding:.12rem .2rem;border-radius:4px}.productos-layout :deep(.pc-stat-l){font-size:.4rem}.productos-layout :deep(.pc-stat-v){font-size:.5rem}.productos-layout :deep(.pc-actions){gap:.15rem;margin-top:.05rem}.productos-layout :deep(.pc-btn){height:24px;font-size:.7rem;border-radius:4px}.productos-layout .toast-container{bottom:.3rem;right:.3rem;left:.3rem}.productos-layout .toast-notification{padding:.6rem .7rem;font-size:.75rem}.productos-layout .toast-icon{font-size:.9rem}.productos-layout .toast-message{font-size:.7rem}.productos-layout :deep(.estado-loading),.productos-layout :deep(.estado-empty){padding:2rem .3rem}.productos-layout :deep(.empty-icon){font-size:2rem}.productos-layout :deep(.empty-text){font-size:.8rem}.productos-layout :deep(.loading-spinner){width:30px;height:30px;border-width:2px}.productos-layout :deep(.bulk-action-bar){padding:.5rem .6rem;gap:.4rem}.productos-layout :deep(.bulk-count){font-size:.7rem}.productos-layout :deep(.btn-clear-selection){font-size:.65rem;padding:.15rem .35rem}.productos-layout :deep(.btn-bulk-action){padding:.4rem .6rem;font-size:.7rem}.productos-layout :deep(.btn-icon){font-size:.85rem}.productos-layout :deep(.btn-text){font-size:.65rem}.productos-layout :deep(.productos-grid){grid-template-columns:repeat(2,1fr);gap:.4rem}.productos-layout :deep(.producto-card){padding:.5rem;gap:.3rem}.productos-layout :deep(.pc-ico){width:32px;height:32px;font-size:.9rem}.productos-layout :deep(.pc-name){font-size:.65rem;-webkit-line-clamp:1}.productos-layout :deep(.pc-badge){font-size:.5rem;padding:.05rem .3rem}.productos-layout :deep(.pc-stat){padding:.15rem .25rem}.productos-layout :deep(.pc-stat-l){font-size:.45rem}.productos-layout :deep(.pc-stat-v){font-size:.55rem}.productos-layout :deep(.pc-actions){gap:.2rem}.productos-layout :deep(.pc-btn){height:26px;font-size:.75rem}.productos-layout :deep(.view-btn){width:30px;height:30px;font-size:.85rem}}
</style>
