<script setup lang="ts">
import { defineEmits } from 'vue';
import { useSubcategorias } from './logica/useSubcategorias';
const { subcategorias, categorias, cargando, guardando, terminoBusqueda, filtroCategoria, showForm, isEditing, showDeleteModal, subcategoriaToDelete, toasts, formData, subcategoriasFiltradas, getNombreCategoria, openCreateForm, openEditForm, closeForm, saveSubcategoria,
  confirmDelete,
  deleteSubcategoria
} = useSubcategorias();

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
        <span class="select-wrap">
          <select 
            v-model="filtroCategoria" 
            class="category-filter"
          >
            <option :value="null">Todas las categorías</option>
            <option v-for="cat in categorias" :key="cat.idCategoria" :value="cat.idCategoria">
              {{ cat.nombre }}
            </option>
          </select>
        </span>
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

<style scoped>
.subcategorias-container{display:flex;flex-direction:column;gap:.6rem;padding:.6rem;height:100%;overflow:hidden}
.subcategorias-toolbar{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;flex-shrink:0;padding:.2rem 0}
.toolbar-left{display:flex;flex-direction:column;gap:.15rem}
.toolbar-title{display:flex;align-items:center;gap:.4rem;margin:0;font-size:1.1rem;font-weight:900;color:var(--color-accent);text-transform:uppercase;letter-spacing:.04em}.title-icon{font-size:1.3rem}.title-text{font-family:inherit}
.toolbar-subtitle{margin:0;font-size:.65rem;color:var(--color-text-secondary);letter-spacing:.02em}
.toolbar-right{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
.select-wrap select{padding:.45rem .7rem;background:var(--color-bg-primary);border:none;border-radius:7px;color:var(--color-text-primary);font-size:.78rem;cursor:pointer;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08);appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .6rem center;padding-right:2rem}.select-wrap select:focus{outline:none;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08),0 0 0 2px var(--color-accent)}
.search-wrapper{position:relative;display:flex;align-items:center;flex:1;min-width:180px}.search-icon{position:absolute;left:.65rem;font-size:.8rem;pointer-events:none;opacity:.6}.search-input{width:100%;padding:.45rem 2rem .45rem 2rem;background:var(--color-bg-primary);border:none;border-radius:7px;color:var(--color-text-primary);font-size:.78rem;outline:none;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08)}.search-input:focus{box-shadow:inset 2px 2px 3px rgba(0,0,0,.08),0 0 0 2px var(--color-accent)}.search-input::placeholder{color:var(--color-text-secondary);opacity:.5}.search-clear{position:absolute;right:.35rem;background:none;border:none;color:var(--color-text-secondary);cursor:pointer;padding:.15rem;font-size:.85rem;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center}.search-clear:hover{background:var(--color-border);color:var(--color-text-primary)}
.btn-primary{border:none;padding:.5rem 1rem;font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--color-on-brand);background:var(--color-accent);cursor:pointer;box-shadow:4px 4px 10px rgba(0,0,0,.2),-1px -1px 4px rgba(255,255,255,.04);transition:all .2s;display:inline-flex;align-items:center;gap:.3rem;border-radius:8px;white-space:nowrap}.btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:6px 6px 16px rgba(0,0,0,.28),-3px -3px 8px rgba(255,255,255,.05)}.btn-primary:active:not(:disabled){transform:translateY(1px);box-shadow:inset 2px 2px 5px rgba(0,0,0,.2)}.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}.btn-icon{font-size:.95rem}
.btn-secondary{border:none;padding:.45rem .8rem;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--color-text-secondary);background:var(--color-bg-secondary);cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,.1),-1px -1px 3px rgba(255,255,255,.02);transition:all .2s;display:inline-flex;align-items:center;gap:.3rem;border-radius:8px}.btn-secondary:hover{transform:translateY(-2px);box-shadow:5px 5px 12px rgba(0,0,0,.18);color:var(--color-text-primary)}.btn-secondary:active{transform:translateY(1px);box-shadow:inset 2px 2px 4px rgba(0,0,0,.15)}
.btn-danger{border:none;padding:.45rem .8rem;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#fff;background:linear-gradient(145deg,var(--color-error) 0%,color-mix(in srgb,var(--color-error) 60%,#000) 100%);cursor:pointer;box-shadow:4px 4px 10px rgba(0,0,0,.2);transition:all .2s;display:inline-flex;align-items:center;gap:.3rem;border-radius:8px}.btn-danger:hover{transform:translateY(-2px);box-shadow:6px 6px 16px rgba(0,0,0,.28)}.btn-danger:active{transform:translateY(1px);box-shadow:inset 2px 2px 5px rgba(0,0,0,.2)}
.subcategorias-table-container{flex:1;overflow:auto;min-height:0}.estado-loading,.estado-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:3rem 1rem;color:var(--color-text-secondary)}.loading-spinner{width:40px;height:40px;border:3px solid var(--color-border);border-top-color:var(--color-accent);border-radius:50%;animation:spinSub .8s linear infinite}@keyframes spinSub{to{transform:rotate(360deg)}}.empty-icon{font-size:2.5rem;opacity:.5}.empty-text{font-size:.9rem;font-weight:600}
.tabla-subcategorias{width:100%;border-collapse:collapse;font-size:.85rem}.tabla-subcategorias thead{position:sticky;top:0;z-index:5;background:var(--color-bg-panel)}.tabla-subcategorias th{padding:.6rem .8rem;text-align:left;font-weight:700;color:var(--color-accent);text-transform:uppercase;font-size:.65rem;letter-spacing:.06em;border-bottom:2px solid var(--color-border)}.text-center{text-align:center}.col-id{width:80px}.col-acciones{width:110px}
.subcategoria-row{border-bottom:1px solid rgba(255,255,255,.03);transition:all .1s}.subcategoria-row:hover{background:color-mix(in srgb,var(--color-accent) 5%,transparent)}.subcategoria-row td{padding:.55rem .8rem;vertical-align:middle}.id-badge{font-family:'Courier New',monospace;font-size:.75rem;color:var(--color-text-secondary);background:var(--color-bg-primary);padding:.15rem .45rem;border-radius:4px;box-shadow:1px 1px 2px rgba(0,0,0,.05)}.nombre-text{font-weight:700;color:var(--color-text-primary)}.categoria-badge{display:inline-block;padding:.2rem .5rem;background:color-mix(in srgb,var(--color-info) 12%,transparent);border:none;border-radius:5px;font-size:.7rem;font-weight:600;color:var(--color-info);box-shadow:2px 2px 3px rgba(0,0,0,.05)}.desc-text{color:var(--color-text-secondary);font-size:.8rem}.acciones-cell{display:flex;align-items:center;justify-content:center;gap:.4rem}.btn-action{width:32px;height:32px;border:none;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;background:var(--color-bg-primary);box-shadow:2px 2px 4px rgba(0,0,0,.08)}.action-icon{width:16px;height:16px}.btn-edit{color:var(--color-accent)}.btn-edit:hover{background:var(--color-accent);color:var(--color-on-brand);transform:translateY(-1px);box-shadow:4px 4px 8px rgba(0,0,0,.15)}.btn-delete{color:var(--color-error)}.btn-delete:hover{background:var(--color-error);color:#fff;transform:translateY(-1px);box-shadow:4px 4px 8px rgba(0,0,0,.15)}
.table-footer{padding:.5rem 1rem;background:var(--color-bg-panel);border:none;border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.02);flex-shrink:0}.footer-count{font-size:.7rem;color:var(--color-text-secondary);font-weight:600}.filter-indicator{color:var(--color-accent)}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);z-index:500}.drawer{position:fixed;top:0;right:0;bottom:0;width:min(100%,420px);background:var(--color-bg-secondary);border:none;box-shadow:-10px 0 30px rgba(0,0,0,.3);z-index:501;display:flex;flex-direction:column}.drawer-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid color-mix(in srgb,var(--color-accent) 20%,transparent)}.drawer-title{margin:0;font-size:1.05rem;font-weight:800;color:var(--color-accent)}.drawer-close{background:var(--color-bg-primary);border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--color-text-secondary);font-size:1rem;transition:all .15s;box-shadow:2px 2px 4px rgba(0,0,0,.1)}.drawer-close:hover{background:var(--color-error);color:#fff}.drawer-body{padding:1.25rem;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:.8rem}.form-label{font-size:.68rem;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.04em}.required{color:var(--color-error)}.input-field{width:100%;padding:.55rem .7rem;background:var(--color-bg-primary);border:none;border-radius:8px;color:var(--color-text-primary);font-size:.85rem;outline:none;box-shadow:inset 3px 3px 6px rgba(0,0,0,.12)}.input-field:focus{box-shadow:inset 3px 3px 6px rgba(0,0,0,.12),0 0 0 2px var(--color-accent)}.input-field::placeholder{color:var(--color-text-secondary);opacity:.5}.select-field{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .7rem center;padding-right:2.2rem;cursor:pointer}.textarea{resize:vertical;min-height:80px}.drawer-footer{display:flex;justify-content:flex-end;gap:.5rem;padding:1rem 1.25rem;border-top:1px solid var(--color-border)}
.modal-delete{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:600;padding:1rem}.modal-delete-content{background:var(--color-bg-secondary);border:none;border-radius:16px;padding:2rem;text-align:center;max-width:400px;width:100%;box-shadow:12px 12px 30px rgba(0,0,0,.4),-6px -6px 20px rgba(255,255,255,.03)}.modal-delete-icon{font-size:3rem;margin-bottom:.75rem}.modal-delete-title{margin:0 0 .5rem;font-size:1.1rem;color:var(--color-accent);font-weight:800}.modal-delete-text{color:var(--color-text-secondary);font-size:.85rem;margin:0 0 1.25rem;line-height:1.4}.modal-delete-actions{display:flex;gap:.5rem;justify-content:center}
.toast-container{position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:.4rem;pointer-events:none}.toast-notification{background:var(--color-bg-panel);border:none;border-radius:10px;padding:.75rem 1rem;display:flex;align-items:center;gap:.6rem;box-shadow:8px 8px 20px rgba(0,0,0,.3);min-width:260px;max-width:380px;pointer-events:auto;border-left:4px solid var(--color-accent)}.toast-ok{border-left-color:var(--color-success)}.toast-error{border-left-color:var(--color-error)}.toast-info{border-left-color:var(--color-info)}.toast-icon{font-size:1.1rem;font-weight:900}.toast-ok .toast-icon{color:var(--color-success)}.toast-error .toast-icon{color:var(--color-error)}.toast-info .toast-icon{color:var(--color-info)}.toast-message{font-size:.8rem;color:var(--color-text-primary);font-weight:600}
.fade-enter-active,.fade-leave-active{transition:opacity .2s}.fade-enter-from,.fade-leave-to{opacity:0}.slide-enter-active,.slide-leave-active{transition:transform .25s ease}.slide-enter-from,.slide-leave-to{transform:translateX(100%)}.toast-enter-active{transition:all .3s ease}.toast-leave-active{transition:all .2s ease}.toast-enter-from{opacity:0;transform:translateX(100%)}.toast-leave-to{opacity:0;transform:translateX(100%)}

@media(max-width:600px){.subcategorias-toolbar{flex-direction:column;align-items:stretch}.toolbar-right{flex-direction:column;align-items:stretch}.search-wrapper{min-width:0}.btn-primary{justify-content:center}.drawer{width:100%}}
</style>
