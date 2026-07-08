<script setup lang="ts">
import { defineEmits } from 'vue';
import { useSubcategorias } from './logica/useSubcategorias';
const { subcategorias, categorias, cargando, guardando, terminoBusqueda, filtroCategoria, showForm, isEditing, showDeleteModal, subcategoriaToDelete, toasts, formData, subcategoriasFiltradas, getNombreCategoria, openCreateForm, openEditForm, closeForm, saveSubcategoria,
  confirmDelete,
  deleteSubcategoria
} = useSubcategorias();
import './estilos/subcategorias.css';

defineEmits<{
  (event: 'subcategorias-changed'): void
}>();
</script>

<template>
  <div class="subcategorias-container">
    <header class="subcategorias-toolbar">
      <div class="toolbar-left">
        <h1 class="toolbar-title">
          <span class="title-icon">📂</span>
          <span class="title-text">Subcategorías</span>
        </h1>
        <p class="toolbar-subtitle">Administra las subcategorías del catálogo</p>
      </div>

      <div class="toolbar-right">
        <select 
          v-model="filtroCategoria" 
          class="category-filter"
        >
          <option :value="null">Todas las categorías</option>
          <option v-for="cat in categorias" :key="cat.idCategoria" :value="cat.idCategoria">
            {{ cat.nombre }}
          </option>
        </select>
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            v-model="terminoBusqueda" 
            type="text" 
            placeholder="Buscar subcategoría..."
            class="search-input"
          >
          <button 
            v-if="terminoBusqueda" 
            type="button" 
            class="search-clear"
            @click="terminoBusqueda = ''"
          >✕</button>
        </div>
        <button type="button" class="btn-primary" @click="openCreateForm">
          <span class="btn-icon">＋</span>
          <span class="btn-text">Nueva</span>
        </button>
      </div>
    </header>

    <div class="subcategorias-table-container">
      <div v-if="cargando" class="estado-loading">
        <div class="loading-spinner"></div>
        <span>Cargando subcategorías...</span>
      </div>

      <div v-else-if="subcategoriasFiltradas.length === 0" class="estado-empty">
        <span class="empty-icon">{{ terminoBusqueda.trim() ? '🔍' : '📂' }}</span>
        <span class="empty-text">{{ terminoBusqueda.trim() ? 'No se encontraron subcategorías' : 'No hay subcategorías registradas' }}</span>
      </div>

      <table v-else class="tabla-subcategorias">
        <thead>
          <tr>
            <th class="col-id">ID</th>
            <th class="col-nombre">Nombre</th>
            <th class="col-categoria">Categoría</th>
            <th class="col-desc">Descripción</th>
            <th class="col-acciones text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="subcategoria in subcategoriasFiltradas" 
            :key="subcategoria.idSubcategoria"
            class="subcategoria-row"
          >
            <td class="col-id">
              <span class="id-badge">#{{ String(subcategoria.idSubcategoria).padStart(4, '0') }}</span>
            </td>
            <td class="col-nombre">
              <span class="nombre-text">{{ subcategoria.nombre }}</span>
            </td>
            <td class="col-categoria">
              <span class="categoria-badge">{{ getNombreCategoria(subcategoria.idCategoria) }}</span>
            </td>
            <td class="col-desc">
              <span class="desc-text">{{ subcategoria.descripcion || '—' }}</span>
            </td>
            <td class="col-acciones text-center">
              <div class="acciones-cell">
                <button 
                  type="button" 
                  class="btn-action btn-edit" 
                  @click="openEditForm(subcategoria)"
                  title="Editar subcategoría"
                >
                  <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button 
                  type="button" 
                  class="btn-action btn-delete" 
                  @click="confirmDelete(subcategoria)"
                  title="Eliminar subcategoría"
                >
                  <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="table-footer" v-if="!cargando && subcategoriasFiltradas.length > 0">
      <span class="footer-count">
        {{ subcategoriasFiltradas.length }} subcategoría{{ subcategoriasFiltradas.length !== 1 ? 's' : '' }}
        <span v-if="terminoBusqueda.trim() || filtroCategoria !== null" class="filter-indicator">
          (filtrado
          <span v-if="filtroCategoria !== null"> por: {{ getNombreCategoria(filtroCategoria) }}</span>
          )
        </span>
      </span>
    </div>

    <!-- Slide-over form -->
    <transition name="fade">
      <div v-if="showForm" class="overlay" @click="closeForm"></div>
    </transition>

    <transition name="slide">
      <aside v-if="showForm" class="drawer">
        <div class="drawer-header">
          <h2 class="drawer-title">{{ isEditing ? 'Editar Subcategoría' : 'Nueva Subcategoría' }}</h2>
          <button type="button" class="drawer-close" @click="closeForm">✕</button>
        </div>

        <div class="drawer-body">
          <label class="form-label">
            Nombre <span class="required">*</span>
          </label>
          <input 
            v-model="formData.nombre" 
            type="text" 
            placeholder="Ej: Sabritas, Doritos..." 
            class="input-field"
          >

          <label class="form-label">
            Categoría <span class="required">*</span>
          </label>
          <select 
            v-model="formData.idCategoria" 
            class="input-field select-field"
          >
            <option :value="null" disabled>Seleccionar categoría...</option>
            <option 
              v-for="cat in categorias" 
              :key="cat.idCategoria" 
              :value="cat.idCategoria"
            >
              {{ cat.nombre }}
            </option>
          </select>

          <label class="form-label">
            Descripción
          </label>
          <textarea 
            v-model="formData.descripcion" 
            placeholder="Descripción opcional..." 
            class="input-field textarea"
            rows="3"
          ></textarea>
        </div>

        <div class="drawer-footer">
          <button type="button" class="btn-secondary" @click="closeForm">
            Cancelar
          </button>
          <button 
            type="button" 
            class="btn-primary" 
            :disabled="guardando || !formData.nombre.trim() || !formData.idCategoria"
            @click="saveSubcategoria"
          >
            {{ guardando ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Subcategoría' }}
          </button>
        </div>
      </aside>
    </transition>

    <!-- Delete confirmation modal -->
    <transition name="fade">
      <div v-if="showDeleteModal" class="modal-delete">
        <div class="modal-delete-content">
          <div class="modal-delete-icon">⚠️</div>
          <h3 class="modal-delete-title">¿Eliminar subcategoría?</h3>
          <p class="modal-delete-text">
            Estás a punto de eliminar <strong>{{ subcategoriaToDelete?.nombre }}</strong>. Esta acción es permanente.
          </p>
          <div class="modal-delete-actions">
            <button type="button" class="btn-secondary" @click="showDeleteModal = false">
              Cancelar
            </button>
            <button type="button" class="btn-danger" @click="deleteSubcategoria">
              Sí, eliminar
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Toast notifications -->
    <transition-group name="toast" tag="div" class="toast-container">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        class="toast-notification"
        :class="`toast-${toast.tipo}`"
      >
        <span class="toast-icon">{{ toast.tipo === 'ok' ? '✓' : toast.tipo === 'error' ? '✕' : 'ℹ' }}</span>
        <span class="toast-message">{{ toast.mensaje }}</span>
      </div>
    </transition-group>
  </div>
</template>


