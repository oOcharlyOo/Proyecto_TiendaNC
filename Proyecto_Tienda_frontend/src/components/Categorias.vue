<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';

type ApiRespuesta<T> = {
  codigo: number;
  mensaje: string;
  datos: T;
};

type CategoriaDTO = {
  idCategoria?: number;
  nombre: string;
  descripcion: string | null;
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const emit = defineEmits<{
  (event: 'categorias-changed'): void;
}>();

const categorias = shallowRef<CategoriaDTO[]>([]);
const cargando = ref(false);
const guardando = ref(false);
const terminoBusqueda = ref('');
const showForm = ref(false);
const isEditing = ref(false);
const showDeleteModal = ref(false);
const categoriaToDelete = ref<CategoriaDTO | null>(null);
const toasts = ref<{ id: number; mensaje: string; tipo: 'ok' | 'error' | 'info' }[]>([]);

const formData = ref<CategoriaDTO>({
  nombre: '',
  descripcion: null
});

let toastIdCounter = 0;

const categoriasFiltradas = computed(() => {
  const termino = terminoBusqueda.value.trim().toLowerCase();
  if (!termino) return [...categorias.value].reverse();
  
  return categorias.value.filter(c => 
    (c.nombre || '').toLowerCase().includes(termino) ||
    (c.descripcion || '').toLowerCase().includes(termino)
  ).reverse();
});

function mostrarToast(texto: string, tipo: 'ok' | 'error' | 'info') {
  const id = toastIdCounter++;
  toasts.value.push({ id, mensaje: texto, tipo });
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, 3000);
}

async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function cargarCategorias() {
  cargando.value = true;
  try {
    const data = await fetchApi<ApiRespuesta<CategoriaDTO[]>>(`${API_BASE}/categorias/listarCategorias`);
    categorias.value = Array.isArray(data?.datos) ? data.datos : [];
  } catch (error) {
    categorias.value = [];
    mostrarToast(`Error al cargar categorías: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally {
    cargando.value = false;
  }
}

function openCreateForm() {
  isEditing.value = false;
  formData.value = { nombre: '', descripcion: null };
  showForm.value = true;
}

function openEditForm(categoria: CategoriaDTO) {
  isEditing.value = true;
  formData.value = { ...categoria };
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
}

async function saveCategoria() {
  if (!formData.value.nombre.trim()) {
    mostrarToast('El nombre de la categoría es obligatorio.', 'error');
    return;
  }

  guardando.value = true;
  try {
    if (isEditing.value && formData.value.idCategoria) {
      const data = await fetchApi<ApiRespuesta<CategoriaDTO>>(
        `${API_BASE}/categorias/actualizarCategoria/${formData.value.idCategoria}`,
        { method: 'PUT', body: JSON.stringify(formData.value) }
      );
      if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo actualizar.');
      mostrarToast(`Categoría "${formData.value.nombre}" actualizada.`, 'ok');
    } else {
      const data = await fetchApi<ApiRespuesta<CategoriaDTO>>(
        `${API_BASE}/categorias/agregarCategoria`,
        { method: 'POST', body: JSON.stringify(formData.value) }
      );
      if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo agregar.');
      mostrarToast(`Categoría "${formData.value.nombre}" creada.`, 'ok');
    }

    await cargarCategorias();
    emit('categorias-changed');
    closeForm();
  } catch (error) {
    mostrarToast(`Error al guardar: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  } finally {
    guardando.value = false;
  }
}

function confirmDelete(categoria: CategoriaDTO) {
  categoriaToDelete.value = categoria;
  showDeleteModal.value = true;
}

async function deleteCategoria() {
  if (!categoriaToDelete.value?.idCategoria) return;

  try {
    const data = await fetchApi<ApiRespuesta<unknown>>(
      `${API_BASE}/categorias/eliminarCategoria/${categoriaToDelete.value.idCategoria}`,
      { method: 'DELETE' }
    );
    if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo eliminar.');
    mostrarToast(`Categoría "${categoriaToDelete.value.nombre}" eliminada.`, 'ok');
    await cargarCategorias();
    emit('categorias-changed');
    showDeleteModal.value = false;
    categoriaToDelete.value = null;
  } catch (error) {
    mostrarToast(`Error al eliminar: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
  }
}

onMounted(() => cargarCategorias());
</script>

<template>
  <div class="categorias-container">
    <div class="categorias-header">
      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input 
          v-model="terminoBusqueda" 
          type="text" 
          placeholder="Buscar categoría..."
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
        <span class="btn-text">Nueva Categoría</span>
      </button>
    </div>

    <div class="categorias-table-container">
      <div v-if="cargando" class="estado-loading">
        <div class="loading-spinner"></div>
        <span>Cargando categorías...</span>
      </div>

      <div v-else-if="categoriasFiltradas.length === 0" class="estado-empty">
        <span class="empty-icon">{{ terminoBusqueda.trim() ? '🔍' : '🏷️' }}</span>
        <span class="empty-text">{{ terminoBusqueda.trim() ? 'No se encontraron categorías' : 'No hay categorías registradas' }}</span>
      </div>

      <table v-else class="tabla-categorias">
        <thead>
          <tr>
            <th class="col-id">ID</th>
            <th class="col-nombre">Nombre</th>
            <th class="col-desc">Descripción</th>
            <th class="col-acciones text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="categoria in categoriasFiltradas" 
            :key="categoria.idCategoria"
            class="categoria-row"
          >
            <td class="col-id">
              <span class="id-badge">#{{ String(categoria.idCategoria).padStart(4, '0') }}</span>
            </td>
            <td class="col-nombre">
              <span class="nombre-text">{{ categoria.nombre }}</span>
            </td>
            <td class="col-desc">
              <span class="desc-text">{{ categoria.descripcion || '—' }}</span>
            </td>
            <td class="col-acciones text-center">
              <div class="acciones-cell">
                <button 
                  type="button" 
                  class="btn-action btn-edit" 
                  @click="openEditForm(categoria)"
                  title="Editar categoría"
                >
                  <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button 
                  type="button" 
                  class="btn-action btn-delete" 
                  @click="confirmDelete(categoria)"
                  title="Eliminar categoría"
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

    <div class="table-footer" v-if="!cargando && categoriasFiltradas.length > 0">
      <span class="footer-count">
        {{ categoriasFiltradas.length }} categoría{{ categoriasFiltradas.length !== 1 ? 's' : '' }}
        <span v-if="terminoBusqueda.trim()" class="filter-indicator">(filtrado)</span>
      </span>
    </div>

    <!-- Slide-over form -->
    <transition name="fade">
      <div v-if="showForm" class="overlay" @click="closeForm"></div>
    </transition>

    <transition name="slide">
      <aside v-if="showForm" class="drawer">
        <div class="drawer-header">
          <h2 class="drawer-title">{{ isEditing ? 'Editar Categoría' : 'Nueva Categoría' }}</h2>
          <button type="button" class="drawer-close" @click="closeForm">✕</button>
        </div>

        <div class="drawer-body">
          <label class="form-label">
            Nombre <span class="required">*</span>
          </label>
          <input 
            v-model="formData.nombre" 
            type="text" 
            placeholder="Ej: Chocolates" 
            class="input-field"
          >

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
            :disabled="guardando || !formData.nombre.trim()"
            @click="saveCategoria"
          >
            {{ guardando ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Categoría' }}
          </button>
        </div>
      </aside>
    </transition>

    <!-- Delete confirmation modal -->
    <transition name="fade">
      <div v-if="showDeleteModal" class="modal-delete">
        <div class="modal-delete-content">
          <div class="modal-delete-icon">⚠️</div>
          <h3 class="modal-delete-title">¿Eliminar categoría?</h3>
          <p class="modal-delete-text">
            Estás a punto de eliminar <strong>{{ categoriaToDelete?.nombre }}</strong>. Esta acción es permanente.
          </p>
          <div class="modal-delete-actions">
            <button type="button" class="btn-secondary" @click="showDeleteModal = false">
              Cancelar
            </button>
            <button type="button" class="btn-danger" @click="deleteCategoria">
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
.categorias-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.categorias-header {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.categorias-table-container {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.tabla-categorias {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.tabla-categorias thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-panel);
  border-bottom: 2px solid var(--accent-color);
}

.tabla-categorias th {
  padding: 0.875rem 1rem;
  text-align: left;
  font-weight: 700;
  color: var(--accent-color);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.text-center {
  text-align: center !important;
}

.categoria-row {
  border-bottom: 1px solid var(--border-color);
  transition: all 0.15s;
}

.categoria-row:hover {
  background: color-mix(in srgb, var(--accent-color) 8%, transparent);
}

.categoria-row td {
  padding: 0.75rem 1rem;
  vertical-align: middle;
}

.id-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.7rem;
  font-family: monospace;
  color: var(--text-secondary);
}

.nombre-text {
  font-weight: 700;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.desc-text {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.acciones-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-action {
  width: 36px;
  height: 36px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  background: var(--bg-primary);
  padding: 0;
  box-shadow: none;
}

.btn-action .action-icon {
  width: 18px;
  height: 18px;
}

.btn-edit {
  color: var(--accent-color);
}

.btn-edit:hover {
  background: var(--accent-color);
  color: var(--bg-primary);
  border-color: var(--accent-color);
  transform: translateY(-2px);
}

.btn-delete {
  color: var(--error-color);
}

.btn-delete:hover {
  background: var(--error-color);
  color: var(--text-primary);
  border-color: var(--error-color);
  transform: translateY(-2px);
}

.table-footer {
  padding: 0.75rem 1.5rem;
  background: var(--bg-panel);
  border-top: 2px solid var(--border-color);
  flex-shrink: 0;
}

.footer-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.filter-indicator {
  color: var(--accent-color);
  margin-left: 0.25rem;
}

.estado-loading,
.estado-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 1rem;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 3.5rem;
  opacity: 0.5;
}

.empty-text {
  font-size: 1rem;
  font-weight: 600;
}

/* Overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 40;
}

/* Drawer */
.drawer {
  position: fixed;
  inset-y: 0;
  right: 0;
  width: 100%;
  max-width: 400px;
  background: var(--bg-secondary);
  border-left: 3px solid var(--border-color);
  box-shadow: -10px 0 30px var(--shadow-color);
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 2px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-panel);
}

.drawer-title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 800;
}

.drawer-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s;
  box-shadow: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-close:hover {
  background: var(--border-color);
  color: var(--text-primary);
  transform: none;
}

.drawer-body {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  font-weight: 700;
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
}

.required {
  color: var(--error-color);
}

.input-field {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  padding: 0.65rem 0.75rem;
  color: var(--text-primary);
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
  transition: all 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 25%, transparent);
}

.input-field::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.textarea {
  resize: vertical;
  min-height: 80px;
}

.drawer-footer {
  padding: 1rem 1.5rem;
  border-top: 2px solid var(--border-color);
  display: flex;
  gap: 0.75rem;
  background: var(--bg-panel);
}

.drawer-footer button {
  flex: 1;
}

/* Delete modal */
.modal-delete {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.modal-delete-content {
  background: var(--bg-secondary);
  border: 3px solid var(--error-color);
  border-radius: 12px;
  padding: 2rem;
  max-width: 380px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 50px var(--shadow-color);
}

.modal-delete-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.modal-delete-title {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
  color: var(--text-primary);
  font-weight: 800;
}

.modal-delete-text {
  margin: 0 0 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.modal-delete-actions {
  display: flex;
  gap: 0.75rem;
}

.modal-delete-actions button {
  flex: 1;
}

.btn-danger {
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  padding: 0.6rem 1rem;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow-color);
  transition: all 0.2s;
}

.btn-danger:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-secondary {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  padding: 0.6rem 1rem;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow-color);
  transition: all 0.2s;
}

.btn-secondary:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

/* Toast */
.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.toast-notification {
  background: var(--bg-panel);
  border-left: 4px solid var(--accent-color);
  border-radius: 8px;
  padding: 0.875rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 8px 20px var(--shadow-color);
  min-width: 280px;
  max-width: 400px;
  pointer-events: auto;
}

.toast-ok {
  border-left-color: var(--success-color);
}

.toast-error {
  border-left-color: var(--error-color);
}

.toast-info {
  border-left-color: var(--infoBlueColor);
}

.toast-icon {
  font-size: 1.2rem;
  font-weight: 900;
}

.toast-ok .toast-icon {
  color: var(--success-color);
}

.toast-error .toast-icon {
  color: var(--error-color);
}

.toast-info .toast-icon {
  color: var(--infoBlueColor);
}

.toast-message {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 600;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-leave-active {
  transition: transform 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.toast-enter-active {
  transition: all 0.3s ease;
}

.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .categorias-header {
    flex-direction: column;
    align-items: stretch;
    padding: 0.875rem 1rem;
  }
  
  .col-desc {
    display: none;
  }
  
  .tabla-categorias th,
  .tabla-categorias td {
    padding: 0.6rem 0.75rem;
  }
  
  .btn-action {
    width: 32px;
    height: 32px;
  }
  
  .btn-action .action-icon {
    width: 16px;
    height: 16px;
  }
  
  .acciones-cell {
    gap: 0.35rem;
  }
  
  .toast-container {
    bottom: 1rem;
    right: 1rem;
    left: 1rem;
  }
  
  .toast-notification {
    min-width: unset;
    max-width: unset;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .btn-primary .btn-text {
    display: none;
  }
  
  .btn-primary {
    padding: 0.6rem 0.875rem;
  }
  
  .categorias-header {
    padding: 0.75rem 0.5rem;
  }
  
  .categorias-title {
    font-size: 1.1rem;
  }
  
  .tabla-categorias {
    font-size: 0.8rem;
  }
  
  .tabla-categorias th,
  .tabla-categorias td {
    padding: 0.5rem 0.5rem;
  }
  
  .btn-action {
    width: 30px;
    height: 30px;
  }
  
  .btn-action .action-icon {
    width: 14px;
    height: 14px;
  }
  
  .acciones-cell {
    gap: 0.25rem;
  }
  
  .toast-container {
    bottom: 0.5rem;
    right: 0.5rem;
    left: 0.5rem;
  }
  
  .toast-notification {
    padding: 0.75rem 0.85rem;
  }
  
  .toast-icon {
    font-size: 1rem;
  }
  
  .toast-message {
    font-size: 0.8rem;
  }
  
  .btn-secondary {
    padding: 0.5rem 0.7rem;
    font-size: 0.7rem;
  }
}
</style>
