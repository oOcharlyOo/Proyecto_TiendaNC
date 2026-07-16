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

type SubcategoriaDTO = {
  idSubcategoria?: number;
  nombre: string;
  descripcion: string | null;
  idCategoria: number | null;
};

export type SubcategoriasEmits = {
  (event: 'subcategorias-changed'): void;
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const subcategorias = shallowRef<SubcategoriaDTO[]>([]);
const categorias = shallowRef<CategoriaDTO[]>([]);
const cargando = ref(false);
const guardando = ref(false);
const terminoBusqueda = ref('');
const filtroCategoria = ref<number | null>(null);
const showForm = ref(false);
const isEditing = ref(false);
const showDeleteModal = ref(false);
const subcategoriaToDelete = ref<SubcategoriaDTO | null>(null);
const toasts = ref<{ id: number; mensaje: string; tipo: 'ok' | 'error' | 'info' }[]>([]);

const formData = ref<SubcategoriaDTO>({
  nombre: '',
  descripcion: null,
  idCategoria: null
});

let toastIdCounter = 0;

const subcategoriasFiltradas = computed(() => {
  let results = [...subcategorias.value];

  if (filtroCategoria.value !== null) {
    results = results.filter(s => s.idCategoria === filtroCategoria.value);
  }

  const termino = terminoBusqueda.value.trim().toLowerCase();
  if (termino) {
    results = results.filter(s => {
      const catNombre = categorias.value.find(c => c.idCategoria === s.idCategoria)?.nombre || '';
      return (s.nombre || '').toLowerCase().includes(termino) ||
             (s.descripcion || '').toLowerCase().includes(termino) ||
             catNombre.toLowerCase().includes(termino);
    });
  }

  return results.reverse();
});

export function useSubcategorias() {

  onMounted(async () => {
    await cargarCategorias();
    await cargarSubcategorias();
  });

  function mostrarToast(texto: string, tipo: 'ok' | 'error' | 'info') {
    const id = toastIdCounter++;
    toasts.value.push({ id, mensaje: texto, tipo });
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }, 1000);
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
    try {
      const data = await fetchApi<ApiRespuesta<CategoriaDTO[]>>(`${API_BASE}/categorias/listarCategorias`);
      categorias.value = Array.isArray(data?.datos) ? data.datos : [];
    } catch (error) {
      categorias.value = [];
    }
  }

  async function cargarSubcategorias() {
    cargando.value = true;
    try {
      const data = await fetchApi<ApiRespuesta<SubcategoriaDTO[]>>(`${API_BASE}/subcategorias/listarSubcategorias`);
      subcategorias.value = Array.isArray(data?.datos) ? data.datos : [];
    } catch (error) {
      subcategorias.value = [];
      mostrarToast(`Error al cargar subcategorías: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
    } finally {
      cargando.value = false;
    }
  }

  function getNombreCategoria(idCategoria: number | null): string {
    if (!idCategoria) return 'Sin categoría';
    return categorias.value.find(c => c.idCategoria === idCategoria)?.nombre || 'Desconocida';
  }

  function openCreateForm() {
    isEditing.value = false;
    formData.value = { nombre: '', descripcion: null, idCategoria: null };
    showForm.value = true;
  }

  function openEditForm(subcategoria: SubcategoriaDTO) {
    isEditing.value = true;
    formData.value = { ...subcategoria };
    showForm.value = true;
  }

  function closeForm() {
    showForm.value = false;
  }

  async function saveSubcategoria() {
    if (!formData.value.nombre.trim()) {
      mostrarToast('El nombre de la subcategoría es obligatorio.', 'error');
      return;
    }
    if (!formData.value.idCategoria) {
      mostrarToast('Debes seleccionar una categoría.', 'error');
      return;
    }

    guardando.value = true;
    try {
      if (isEditing.value && formData.value.idSubcategoria) {
        const data = await fetchApi<ApiRespuesta<SubcategoriaDTO>>(
          `${API_BASE}/subcategorias/actualizarSubcategoria/${formData.value.idSubcategoria}`,
          { method: 'PUT', body: JSON.stringify(formData.value) }
        );
        if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo actualizar.');
        mostrarToast(`Subcategoría "${formData.value.nombre}" actualizada.`, 'ok');
      } else {
        const data = await fetchApi<ApiRespuesta<SubcategoriaDTO>>(
          `${API_BASE}/subcategorias/agregarSubcategoria`,
          { method: 'POST', body: JSON.stringify(formData.value) }
        );
        if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo agregar.');
        mostrarToast(`Subcategoría "${formData.value.nombre}" creada.`, 'ok');
      }

      await cargarSubcategorias();
      closeForm();
    } catch (error) {
      mostrarToast(`Error al guardar: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
    } finally {
      guardando.value = false;
    }
  }

  function confirmDelete(subcategoria: SubcategoriaDTO) {
    subcategoriaToDelete.value = subcategoria;
    showDeleteModal.value = true;
  }

  async function deleteSubcategoria() {
    if (!subcategoriaToDelete.value?.idSubcategoria) return;

    try {
      const data = await fetchApi<ApiRespuesta<unknown>>(
        `${API_BASE}/subcategorias/eliminarSubcategoria/${subcategoriaToDelete.value.idSubcategoria}`,
        { method: 'DELETE' }
      );
      if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo eliminar.');
      mostrarToast(`Subcategoría "${subcategoriaToDelete.value.nombre}" eliminada.`, 'ok');
      await cargarSubcategorias();
      showDeleteModal.value = false;
      subcategoriaToDelete.value = null;
    } catch (error) {
      mostrarToast(`Error al eliminar: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
    }
  }

  return {
    subcategorias,
    categorias,
    cargando,
    guardando,
    terminoBusqueda,
    filtroCategoria,
    showForm,
    isEditing,
    showDeleteModal,
    subcategoriaToDelete,
    toasts,
    formData,
    subcategoriasFiltradas,
    mostrarToast,
    cargarCategorias,
    cargarSubcategorias,
    getNombreCategoria,
    openCreateForm,
    openEditForm,
    closeForm,
    saveSubcategoria,
    confirmDelete,
    deleteSubcategoria
  };
}