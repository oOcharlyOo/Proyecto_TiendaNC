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

export function useCategorias(emit?: (event: 'categorias-changed') => void) {

  onMounted(() => cargarCategorias());

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
      emit?.('categorias-changed');
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
      emit?.('categorias-changed');
      showDeleteModal.value = false;
      categoriaToDelete.value = null;
    } catch (error) {
      mostrarToast(`Error al eliminar: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
    }
  }

  return {
    categorias,
    cargando,
    guardando,
    terminoBusqueda,
    showForm,
    isEditing,
    showDeleteModal,
    categoriaToDelete,
    toasts,
    formData,
    categoriasFiltradas,
    mostrarToast,
    cargarCategorias,
    openCreateForm,
    openEditForm,
    closeForm,
    saveCategoria,
    confirmDelete,
    deleteCategoria
  };
}