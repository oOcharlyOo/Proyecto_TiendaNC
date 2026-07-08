import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';

export type ApiRespuesta<T> = {
  codigo: number;
  mensaje: string;
  datos: T;
};

export type CategoriaDTO = {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
};

export type SubcategoriaDTO = {
  idSubcategoria: number;
  nombre: string;
  descripcion?: string | null;
  idCategoria: number | null;
};

export type ProductoDTO = {
  idProducto?: number;
  nombre: string;
  stock: number;
  codigoBarras: string | null;
  precio_costo: number;
  precio_venta: number;
  cantidad_min: number;
  cantidad_max: number;
  precio_mayoreo: number | null;
  is_gramaje: boolean;
  idCategoria?: number;
  idSubcategoria?: number | null;
  requiere_envase?: boolean;
  precio_envase?: number;
  presentacion_caja?: string;
  cajas?: { piezas: number }[];
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const productos = shallowRef<ProductoDTO[]>([]);
const categorias = shallowRef<CategoriaDTO[]>([]);
const subcategorias = shallowRef<SubcategoriaDTO[]>([]);
const cargando = ref(false);
const guardando = ref(false);
const terminoBusqueda = ref('');
const categoriaFiltro = ref<number | null>(null);
const subcategoriaFiltro = ref<number | string | null>(null);
const ordenStock = ref<'mayor' | 'menor' | null>(null);
const filtroTipo = ref<'unidad' | 'gramaje' | null>(null);
const vistaLista = ref(true);
const toasts = ref<{ id: number; mensaje: string; tipo: 'ok' | 'error' | 'info' }[]>([]);
const tabActiva = ref<'productos' | 'categorias' | 'subcategorias' | 'proveedores' | 'reporte'>('productos');

const modalFormOpen = ref(false);
const modalScannerOpen = ref(false);
const selectedProduct = ref<ProductoDTO | null>(null);
const scannerCode = ref('');

const selectedProductos = ref<Set<number>>(new Set());
const modalCategoriaOpen = ref(false);
const nuevaCategoria = ref<number | null>(null);
const nuevaSubcategoria = ref<number | null>(null);
const cambiandoCategoria = ref(false);

let scannerBuffer = '';
let scannerTimer: ReturnType<typeof setTimeout> | null = null;
let lastScannerKeyTime = 0;

let toastIdCounter = 0;

const fileInputRef = ref<HTMLInputElement | null>(null);
const importando = ref(false);
const vaciando = ref(false);

const EMOJIS_DULCES = ['🍬', '🍭', '🍫', '🍩', '🍪', '🧁', '🍰', '🎂', '🍮', '🍯', '🥤', '🍦', '🍧', '🍨', '🥧', '🥐', '🥨', '🥞', '🧇', '🥖'];

let _initialized = false;

export function useProductos() {

  const productosFiltrados = computed(() => {
    let results = [...productos.value];

    const cat = categoriaFiltro.value;
    if (cat !== null) {
      results = results.filter(p => p.idCategoria === cat);
    }

    const sub = subcategoriaFiltro.value;
    if (sub !== null) {
      if (sub === 'general') {
        const generalSub = subcategorias.value.find(s => s.nombre.toLowerCase() === 'general');
        if (generalSub) {
          results = results.filter(p => p.idSubcategoria === generalSub.idSubcategoria);
        } else {
          results = results.filter(p => p.idSubcategoria === null || p.idSubcategoria === undefined);
        }
      } else {
        results = results.filter(p => p.idSubcategoria === sub);
      }
    }

    const termino = terminoBusqueda.value.trim().toLowerCase();
    if (termino) {
      results = results.filter(p =>
        (p.nombre || '').toLowerCase().includes(termino) ||
        (p.codigoBarras || '').toLowerCase().includes(termino) ||
        normalizarCodigo(p.codigoBarras || '') === normalizarCodigo(termino)
      );
    }

    if (filtroTipo.value === 'unidad') {
      results = results.filter(p => !p.is_gramaje);
    } else if (filtroTipo.value === 'gramaje') {
      results = results.filter(p => p.is_gramaje);
    }

    if (ordenStock.value === 'mayor') {
      results.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    } else if (ordenStock.value === 'menor') {
      results.sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
    } else {
      results.reverse();
    }

    if (termino) {
      results.sort((a, b) => {
        const aExact = (a.codigoBarras || '').toLowerCase() === termino || normalizarCodigo(a.codigoBarras || '') === normalizarCodigo(termino);
        const bExact = (b.codigoBarras || '').toLowerCase() === termino || normalizarCodigo(b.codigoBarras || '') === normalizarCodigo(termino);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });
    }

    return results;
  });

  const subcategoriasFiltradas = computed(() => {
    if (categoriaFiltro.value === null) return subcategorias.value;
    return subcategorias.value.filter(s => s.idCategoria === categoriaFiltro.value);
  });

  const gamingCategoryId = computed(() => {
    const cat = categorias.value.find(c => c.nombre.toLowerCase() === 'gaming');
    return cat ? cat.idCategoria : null;
  });

  const subcategoriasParaModal = computed(() => {
    if (nuevaCategoria.value === null) return subcategorias.value;
    return subcategorias.value.filter(s => s.idCategoria === nuevaCategoria.value);
  });

  if (!_initialized) {
    _initialized = true;

    watch(categoriaFiltro, () => {
      subcategoriaFiltro.value = null;
    });

    onMounted(() => {
      cargarProductos();
      cargarCategorias();
      cargarSubcategorias();
      window.addEventListener('keydown', manejarEscannerProductos);
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', manejarEscannerProductos);
      if (scannerTimer) clearTimeout(scannerTimer);
    });
  }

  function obtenerNombreCategoria(idCategoria: number | undefined): string {
    if (!idCategoria) return 'Sin asignar';
    const cat = categorias.value.find(c => c.idCategoria === idCategoria);
    return cat ? cat.nombre : 'Sin asignar';
  }

  function obtenerNombreSubcategoria(idSubcategoria: number | null | undefined): string {
    if (!idSubcategoria) return '—';
    const sub = subcategorias.value.find(s => s.idSubcategoria === idSubcategoria);
    return sub ? sub.nombre : '—';
  }

  function formatoMoneda(valor: number) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor || 0));
  }

  function esCategoriaGaming(idCategoria: number | undefined): boolean {
    if (!idCategoria || !gamingCategoryId.value) return false;
    return idCategoria === gamingCategoryId.value;
  }

  function obtenerEmojiDulce(id: number | undefined): string {
    const indice = (id ?? 0) % EMOJIS_DULCES.length;
    return EMOJIS_DULCES[indice];
  }

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

  async function cargarProductos() {
    cargando.value = true;
    try {
      const data = await fetchApi<ApiRespuesta<ProductoDTO[]>>(`${API_BASE}/productos/listarProductos`);
      productos.value = Array.isArray(data?.datos)
        ? [...data.datos].sort((a, b) => Number(a.idProducto || 0) - Number(b.idProducto || 0))
        : [];
    } catch (error) {
      productos.value = [];
      mostrarToast(`Error al cargar productos: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
    } finally {
      cargando.value = false;
    }
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
    try {
      const data = await fetchApi<ApiRespuesta<SubcategoriaDTO[]>>(`${API_BASE}/subcategorias/listarSubcategorias`);
      subcategorias.value = Array.isArray(data?.datos) ? data.datos : [];
    } catch (error) {
      subcategorias.value = [];
    }
  }

  function abrirModalNuevoProducto() {
    selectedProduct.value = null;
    scannerCode.value = '';
    modalFormOpen.value = true;
  }

  function abrirModalEditarProducto(producto: ProductoDTO) {
    selectedProduct.value = producto;
    scannerCode.value = '';
    modalFormOpen.value = true;
  }

  async function handleSubmitProducto(payload: ProductoDTO) {
    if (!payload.nombre.trim()) {
      mostrarToast('El nombre del producto es obligatorio.', 'error');
      return;
    }

    guardando.value = true;
    try {
      let idProducto: number;
      if (payload.idProducto) {
        const data = await fetchApi<ApiRespuesta<ProductoDTO>>(
          `${API_BASE}/productos/actualizarProducto/${payload.idProducto}`,
          { method: 'PUT', body: JSON.stringify(payload) }
        );
        if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo actualizar.');
        idProducto = payload.idProducto;
        mostrarToast('Producto actualizado correctamente.', 'ok');
      } else {
        const data = await fetchApi<ApiRespuesta<ProductoDTO>>(
          `${API_BASE}/productos/agregarProducto`,
          { method: 'POST', body: JSON.stringify(payload) }
        );
        if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo agregar.');
        idProducto = data.datos!.idProducto!;
        mostrarToast('Producto agregado correctamente.', 'ok');
      }

      if (payload.cajas && payload.cajas.length > 0) {
        await fetch(`${API_BASE}/producto-presentacion-caja/eliminar-por-producto/${idProducto}`, { method: 'DELETE' });
        for (const caja of payload.cajas) {
          const res = await fetch(`${API_BASE}/producto-presentacion-caja/asignar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: null, id_producto: idProducto, piezas: caja.piezas })
          });
          const json = await res.json();
          if (json?.codigo !== 200) throw new Error(json?.mensaje || 'Error al guardar presentación de caja');
        }
      } else if (payload.idProducto) {
        await fetch(`${API_BASE}/producto-presentacion-caja/eliminar-por-producto/${idProducto}`, { method: 'DELETE' });
      }

      await cargarProductos();
      modalFormOpen.value = false;
    } catch (error) {
      mostrarToast(`Error al guardar: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
    } finally {
      guardando.value = false;
    }
  }

  async function handleDeleteProducto(product?: ProductoDTO) {
    const target = product ?? selectedProduct.value;
    if (!target?.idProducto) return;
    selectedProduct.value = target;
    const id = selectedProduct.value?.idProducto;
    if (!id) return;
    const confirmacion = window.confirm(`Se eliminará el producto #${id}. Esta acción no se puede deshacer.`);
    if (!confirmacion) return;

    try {
      const data = await fetchApi<ApiRespuesta<unknown>>(`${API_BASE}/productos/eliminarProducto/${id}`, {
        method: 'DELETE'
      });
      if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo eliminar.');
      mostrarToast('Producto eliminado correctamente.', 'ok');
      modalFormOpen.value = false;
      await cargarProductos();
    } catch (error) {
      mostrarToast(`Error al eliminar: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
    }
  }

  function handleScannerApply(code: string) {
    scannerCode.value = code;
    modalScannerOpen.value = false;
  }

  function toggleSeleccionProducto(id: number) {
    const s = new Set(selectedProductos.value);
    if (s.has(id)) {
      s.delete(id);
    } else {
      s.add(id);
    }
    selectedProductos.value = s;
  }

  function toggleSeleccionTodos() {
    if (selectedProductos.value.size === productosFiltrados.value.length) {
      selectedProductos.value = new Set();
    } else {
      selectedProductos.value = new Set(productosFiltrados.value.map(p => p.idProducto!).filter(Boolean));
    }
  }

  function abrirModalCategoria() {
    if (selectedProductos.value.size === 0) return;
    nuevaCategoria.value = null;
    nuevaSubcategoria.value = null;
    modalCategoriaOpen.value = true;
  }

  async function aplicarCambioCategoria() {
    if (selectedProductos.value.size === 0) return;
    if (nuevaCategoria.value === null && nuevaSubcategoria.value === null) {
      mostrarToast('Selecciona al menos una categoría o subcategoría.', 'error');
      return;
    }
    cambiandoCategoria.value = true;
    try {
      const body = {
        ids: Array.from(selectedProductos.value),
        idCategoria: nuevaCategoria.value,
        idSubcategoria: nuevaSubcategoria.value
      };
      const data = await fetchApi<ApiRespuesta<number>>(
        `${API_BASE}/productos/actualizarCategoriaMasiva`,
        { method: 'PUT', body: JSON.stringify(body) }
      );
      if (data?.codigo !== 200) throw new Error(data?.mensaje || 'No se pudo actualizar.');
      mostrarToast(`${data.datos} producto(s) actualizado(s).`, 'ok');
      selectedProductos.value = new Set();
      modalCategoriaOpen.value = false;
      await cargarProductos();
    } catch (error) {
      mostrarToast(`Error al actualizar: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
    } finally {
      cambiandoCategoria.value = false;
    }
  }

  function manejarEscannerProductos(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (e.key === 'Enter' && !isInput && scannerBuffer.length > 0) {
      e.preventDefault();
      procesarEscaneoProductos(scannerBuffer);
      scannerBuffer = '';
      return;
    }

    if (!isInput && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now();
      const timeDiff = now - lastScannerKeyTime;

      if (lastScannerKeyTime > 0 && timeDiff > 100) {
        scannerBuffer = '';
      }

      scannerBuffer += e.key;
      lastScannerKeyTime = now;

      if (scannerTimer) clearTimeout(scannerTimer);
      scannerTimer = setTimeout(() => {
        if (scannerBuffer.length > 0) {
          procesarEscaneoProductos(scannerBuffer);
          scannerBuffer = '';
        }
      }, 300);
    }
  }

  function normalizarCodigo(codigo: string): string {
    return codigo.replace(/^0+/, '') || '0';
  }

  function procesarEscaneoProductos(codigo: string) {
    const codigoLimpio = codigo.trim();
    if (!codigoLimpio) return;

    const codigoNormalizado = normalizarCodigo(codigoLimpio);

    const productoEncontrado = productos.value.find(p => {
      if (!p.codigoBarras) return false;
      const codigoProducto = normalizarCodigo(p.codigoBarras);
      return codigoProducto === codigoNormalizado || p.codigoBarras === codigoLimpio;
    });

    if (productoEncontrado) {
      terminoBusqueda.value = productoEncontrado.codigoBarras || productoEncontrado.nombre;
    } else {
      terminoBusqueda.value = codigoLimpio;
    }
  }

  async function exportarCSV() {
    const XLSX = await import('xlsx');
    const headers = ['ID', 'Nombre', 'Código de Barras', 'Categoría', 'Subcategoría', 'Precio Costo', 'Precio Venta', 'Precio Mayoreo', 'Stock', 'Cantidad Mínima', 'Cantidad Máxima', 'Gramaje'];
    const rows = productos.value.map(p => [
      p.idProducto ?? '',
      p.nombre,
      p.codigoBarras || '',
      obtenerNombreCategoria(p.idCategoria),
      obtenerNombreSubcategoria(p.idSubcategoria),
      p.precio_costo,
      p.precio_venta,
      p.precio_mayoreo ?? '',
      p.stock,
      p.cantidad_min,
      p.cantidad_max,
      p.is_gramaje ? 'Sí' : 'No'
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, `productos_${new Date().toISOString().slice(0, 10)}.csv`, { bookType: 'csv' });
    mostrarToast('Archivo CSV exportado correctamente.', 'ok');
  }

  async function exportarXLSX() {
    const XLSX = await import('xlsx');
    const headers = ['ID', 'Nombre', 'Código de Barras', 'Categoría', 'Subcategoría', 'Precio Costo', 'Precio Venta', 'Precio Mayoreo', 'Stock', 'Cantidad Mínima', 'Cantidad Máxima', 'Gramaje'];
    const rows = productos.value.map(p => [
      p.idProducto ?? '',
      p.nombre,
      p.codigoBarras || '',
      obtenerNombreCategoria(p.idCategoria),
      obtenerNombreSubcategoria(p.idSubcategoria),
      p.precio_costo,
      p.precio_venta,
      p.precio_mayoreo ?? '',
      p.stock,
      p.cantidad_min,
      p.cantidad_max,
      p.is_gramaje ? 'Sí' : 'No'
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, `productos_${new Date().toISOString().slice(0, 10)}.xlsx`, { bookType: 'xlsx' });
    mostrarToast('Archivo Excel exportado correctamente.', 'ok');
  }

  function triggerImport() {
    fileInputRef.value?.click();
  }

  async function handleImport(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      mostrarToast('Formato no válido. Use .csv o .xlsx', 'error');
      target.value = '';
      return;
    }

    importando.value = true;
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (json.length === 0) {
        mostrarToast('El archivo está vacío.', 'error');
        importando.value = false;
        target.value = '';
        return;
      }

      let importados = 0;
      let errores = 0;

      for (const row of json) {
        const nombre = String(row['Nombre'] || '').trim();
        if (!nombre) { errores++; continue; }

        const catNombre = String(row['Categoría'] || '').trim();
        const subNombre = String(row['Subcategoría'] || '').trim();

        const cat = categorias.value.find(c => c.nombre.toLowerCase() === catNombre.toLowerCase());
        const sub = subcategorias.value.find(s => s.nombre.toLowerCase() === subNombre.toLowerCase());

        const payload: ProductoDTO = {
          nombre,
          codigoBarras: String(row['Código de Barras'] || '').trim() || null,
          precio_costo: Number(row['Precio Costo']) || 0,
          precio_venta: Number(row['Precio Venta']) || 0,
          precio_mayoreo: row['Precio Mayoreo'] ? Number(row['Precio Mayoreo']) : null,
          stock: Number(row['Stock']) || 0,
          cantidad_min: Number(row['Cantidad Mínima']) || 0,
          cantidad_max: Number(row['Cantidad Máxima']) || 0,
          is_gramaje: String(row['Gramaje'] || '').toLowerCase() === 'sí',
          idCategoria: cat?.idCategoria,
          idSubcategoria: sub?.idSubcategoria ?? null
        };

        try {
          await fetchApi<ApiRespuesta<ProductoDTO>>(
            `${API_BASE}/productos/agregarProducto`,
            { method: 'POST', body: JSON.stringify(payload) }
          );
          importados++;
        } catch {
          errores++;
        }
      }

      await cargarProductos();
      mostrarToast(`Importación completada: ${importados} agregados, ${errores} errores.`, importados > 0 ? 'ok' : 'error');
    } catch (error) {
      mostrarToast(`Error al importar: ${error instanceof Error ? error.message : 'Error inesperado.'}`, 'error');
    } finally {
      importando.value = false;
      target.value = '';
    }
  }

  async function vaciarInventario() {
    if (!confirm('⚠️ ¿Estás seguro de que quieres VACIAR el inventario?\n\nEsto pondrá el stock de TODOS los productos en 0.\n\nLos productos NO se eliminarán, solo se reiniciará su stock.')) {
      return;
    }
    if (!confirm('⚠️ CONFIRMACIÓN FINAL\n\nEsta acción no se puede deshacer fácilmente.\n\n¿Realmente deseas continuar?')) {
      return;
    }
    vaciando.value = true;
    try {
      const res = await fetch(`${API_BASE}/productos/vaciarInventario`, { method: 'PUT' });
      const data = await res.json();
      if (data?.codigo === 200) {
        mostrarToast(`Inventario vaciado: ${data.datos} productos con stock en 0.`, 'ok');
        await cargarProductos();
      } else {
        mostrarToast(data?.mensaje || 'Error al vaciar inventario.', 'error');
      }
    } catch (error) {
      mostrarToast('Error de conexión al vaciar inventario.', 'error');
    } finally {
      vaciando.value = false;
    }
  }

  return {
    API_BASE,
    productos,
    categorias,
    subcategorias,
    cargando,
    guardando,
    terminoBusqueda,
    categoriaFiltro,
    subcategoriaFiltro,
    ordenStock,
    filtroTipo,
    vistaLista,
    toasts,
    tabActiva,
    modalFormOpen,
    modalScannerOpen,
    selectedProduct,
    scannerCode,
    selectedProductos,
    modalCategoriaOpen,
    nuevaCategoria,
    nuevaSubcategoria,
    cambiandoCategoria,
    fileInputRef,
    importando,
    vaciando,
    EMOJIS_DULCES,
    productosFiltrados,
    subcategoriasFiltradas,
    gamingCategoryId,
    subcategoriasParaModal,
    exportarCSV,
    exportarXLSX,
    triggerImport,
    handleImport,
    vaciarInventario,
    obtenerNombreCategoria,
    obtenerNombreSubcategoria,
    formatoMoneda,
    esCategoriaGaming,
    obtenerEmojiDulce,
    mostrarToast,
    fetchApi,
    cargarProductos,
    cargarCategorias,
    cargarSubcategorias,
    abrirModalNuevoProducto,
    abrirModalEditarProducto,
    handleSubmitProducto,
    handleDeleteProducto,
    handleScannerApply,
    toggleSeleccionProducto,
    toggleSeleccionTodos,
    abrirModalCategoria,
    aplicarCambioCategoria,
    manejarEscannerProductos,
    normalizarCodigo,
    procesarEscaneoProductos,
  };
}
