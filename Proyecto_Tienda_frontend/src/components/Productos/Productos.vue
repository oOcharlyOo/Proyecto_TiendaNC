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
import ProductosModalCategoria from './secciones/ProductosModalCategoria.vue';
import './estilos/layout.css';
import './estilos/toolbar.css';
import './estilos/tabs.css';
import './estilos/table.css';
import './estilos/grid.css';
import './estilos/modal.css';
import './estilos/responsive.css';
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
        @update:tabActiva="(v) => { tabActiva = v as 'productos' | 'categorias' | 'subcategorias' | 'proveedores' | 'reporte' }"
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
        @update:tabActiva="(v) => { tabActiva = v as 'productos' | 'categorias' | 'subcategorias' | 'proveedores' | 'reporte' }"
        @toggle-seleccion="toggleSeleccionProducto"
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


