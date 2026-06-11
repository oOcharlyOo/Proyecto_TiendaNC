<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import ProductoFormModal from './modals/Productos/ProductoFormModal.vue';
import ProductoScannerModal from './modals/Productos/ProductoScannerModal.vue';
import Categorias from './Categorias.vue';
import Subcategorias from './Subcategorias.vue';
import Proveedores from './Proveedores.vue';
import ReporteVentas from './ReporteVentas.vue';

type ApiRespuesta<T> = {
  codigo: number;
  mensaje: string;
  datos: T;
};

type CategoriaDTO = {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
};

type SubcategoriaDTO = {
  idSubcategoria: number;
  nombre: string;
  descripcion?: string | null;
  idCategoria: number | null;
};

type ProductoDTO = {
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

watch(categoriaFiltro, () => {
  subcategoriaFiltro.value = null;
});

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

const EMOJIS_DULCES = ['🍬', '🍭', '🍫', '🍩', '🍪', '🧁', '🍰', '🎂', '🍮', '🍯', '🥤', '🍦', '🍧', '🍨', '🥧', '🥐', '🥨', '🥞', '🧇', '🥖'];

const gamingCategoryId = computed(() => {
  const cat = categorias.value.find(c => c.nombre.toLowerCase() === 'gaming');
  return cat ? cat.idCategoria : null;
});

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

    // Guardar presentaciones de caja si existen
    if (payload.cajas && payload.cajas.length > 0) {
      // Eliminar cajas existentes del producto
      await fetch(`${API_BASE}/producto-presentacion-caja/eliminar-por-producto/${idProducto}`, { method: 'DELETE' });
      // Crear cada presentación
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
      // No hay cajas seleccionadas, limpiar las existentes
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

const subcategoriasParaModal = computed(() => {
  if (nuevaCategoria.value === null) return subcategorias.value;
  return subcategorias.value.filter(s => s.idCategoria === nuevaCategoria.value);
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
</script>

<template>
  <main class="productos-layout">
    <section class="productos-panel">
      <header class="toolbar">
        <div class="toolbar-left">
          <h1 class="toolbar-title">
            <span class="title-icon">🍬</span>
            <span class="title-text">Catálogo de Productos</span>
          </h1>
          <p class="toolbar-subtitle">Administra altas, cambios y bajas del catálogo</p>
        </div>
        
        <div class="toolbar-right">
          <select 
            v-model="categoriaFiltro" 
            class="category-filter"
            @change="categoriaFiltro = categoriaFiltro ? Number(categoriaFiltro) : null"
          >
            <option :value="null">Todas las categorías</option>
            <option v-for="cat in categorias" :key="cat.idCategoria" :value="cat.idCategoria">
              {{ cat.nombre }}
            </option>
          </select>
          <select 
            v-model="subcategoriaFiltro" 
            class="category-filter"
            :disabled="categoriaFiltro === null"
            @change="subcategoriaFiltro = subcategoriaFiltro === 'general' ? 'general' : (subcategoriaFiltro ? Number(subcategoriaFiltro) : null)"
          >
            <option :value="null">{{ categoriaFiltro === null ? 'Selecciona categoría' : 'Todas las subcategorías' }}</option>
            <option value="general">General</option>
            <option v-for="sub in subcategoriasFiltradas" :key="sub.idSubcategoria" :value="sub.idSubcategoria">
              {{ sub.nombre }}
            </option>
          </select>
          <select 
            v-model="ordenStock" 
            class="category-filter"
          >
            <option :value="null">Stock: Todos</option>
            <option value="mayor">Mayor stock</option>
            <option value="menor">Menor stock</option>
          </select>
          <select 
            v-model="filtroTipo" 
            class="category-filter"
          >
            <option :value="null">Tipo: Todos</option>
            <option value="unidad">📦 Unidad</option>
            <option value="gramaje">⚖️ Gramaje</option>
          </select>
          <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              v-model="terminoBusqueda" 
              type="text" 
              placeholder="Buscar producto..."
              class="search-input"
            >
            <button 
              v-if="terminoBusqueda" 
              type="button" 
              class="search-clear"
              @click="terminoBusqueda = ''"
            >✕</button>
          </div>
          <div class="import-export-group">
            <button type="button" class="btn-secondary btn-sm" @click="exportarCSV" title="Exportar CSV">
              <span class="btn-icon">📄</span>
              <span class="btn-text">CSV</span>
            </button>
            <button type="button" class="btn-secondary btn-sm" @click="exportarXLSX" title="Exportar Excel">
              <span class="btn-icon">📊</span>
              <span class="btn-text">Excel</span>
            </button>
            <button type="button" class="btn-secondary btn-sm" @click="triggerImport" :disabled="importando" title="Importar archivo">
              <span class="btn-icon">{{ importando ? '⏳' : '📥' }}</span>
              <span class="btn-text">{{ importando ? '...' : 'Importar' }}</span>
            </button>
            <button type="button" class="btn-danger btn-sm" @click="vaciarInventario" :disabled="vaciando" title="Vaciar inventario (stock a 0)">
              <span class="btn-icon">{{ vaciando ? '⏳' : '🗑️' }}</span>
              <span class="btn-text">{{ vaciando ? '...' : 'Vaciar' }}</span>
            </button>
          </div>
          <div class="view-toggles">
            <button :class="['view-btn', { on: vistaLista }]" @click="vistaLista = true" title="Lista">📋</button>
            <button :class="['view-btn', { on: !vistaLista }]" @click="vistaLista = false" title="Cuadrícula">🔲</button>
          </div>
          <button type="button" class="btn-primary" @click="abrirModalNuevoProducto">
            <span class="btn-icon">＋</span>
            <span class="btn-text">Nuevo</span>
          </button>
        </div>
      </header>

      <div class="tabs-bar">
        <button 
          type="button" 
          class="tab-btn" 
          :class="{ active: tabActiva === 'productos' }"
          @click="tabActiva = 'productos'"
        >
          <span class="tab-icon">📦</span>
          <span class="tab-text">Productos</span>
        </button>
        <button 
          type="button" 
          class="tab-btn" 
          :class="{ active: tabActiva === 'categorias' }"
          @click="tabActiva = 'categorias'"
        >
          <span class="tab-icon">🏷️</span>
          <span class="tab-text">Categorías</span>
        </button>
        <button 
          type="button" 
          class="tab-btn" 
          :class="{ active: tabActiva === 'subcategorias' }"
          @click="tabActiva = 'subcategorias'"
        >
          <span class="tab-icon">📂</span>
          <span class="tab-text">Subcategorías</span>
        </button>
        <button 
          type="button" 
          class="tab-btn" 
          :class="{ active: tabActiva === 'proveedores' }"
          @click="tabActiva = 'proveedores'"
        >
          <span class="tab-icon">🚚</span>
          <span class="tab-text">Proveedores</span>
        </button>
        <button 
          type="button" 
          class="tab-btn" 
          :class="{ active: tabActiva === 'reporte' }"
          @click="tabActiva = 'reporte'"
        >
          <span class="tab-icon">📊</span>
          <span class="tab-text">Reporte Ventas</span>
        </button>
      </div>

      <div v-if="tabActiva === 'productos'" class="tab-content">
        <div class="table-container">
          <div v-if="cargando" class="estado-loading">
            <div class="loading-spinner"></div>
            <span>Cargando productos...</span>
          </div>
          
          <div v-else-if="productosFiltrados.length === 0" class="estado-empty">
            <span class="empty-icon">{{ (terminoBusqueda.trim() || categoriaFiltro !== null) ? '🔍' : '📦' }}</span>
            <span class="empty-text">
              <template v-if="terminoBusqueda.trim() || categoriaFiltro !== null">
                No se encontraron productos con los filtros activos
              </template>
              <template v-else>
                No hay productos registrados
              </template>
            </span>
            <button v-if="!terminoBusqueda.trim() && categoriaFiltro === null" type="button" class="btn-primary btn-sm" @click="abrirModalNuevoProducto">
              Agregar primer producto
            </button>
          </div>

          <table v-else-if="vistaLista" class="tabla-productos">
            <thead>
              <tr>
                <th class="col-check">
                  <input 
                    type="checkbox" 
                    class="row-checkbox"
                    :checked="productosFiltrados.length > 0 && selectedProductos.size === productosFiltrados.length"
                    @change="toggleSeleccionTodos"
                  >
                </th>
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
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="producto in productosFiltrados" 
                :key="producto.idProducto"
                class="producto-row"
                :class="{ 
                  'low-stock': Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) && Number(producto.stock || 0) > 0,
                  'out-of-stock': Number(producto.stock || 0) === 0,
                  'selected': selectedProductos.has(producto.idProducto!)
                }"
              >
                <td class="col-check">
                  <input 
                    type="checkbox" 
                    class="row-checkbox"
                    :checked="selectedProductos.has(producto.idProducto!)"
                    @change="toggleSeleccionProducto(producto.idProducto!)"
                  >
                </td>
                <td class="col-icon">
                  <div class="icon-cell">
                    {{ obtenerEmojiDulce(producto.idProducto) }}
                  </div>
                </td>
                <td class="col-nombre">
                  <div class="nombre-cell">
                    <span class="nombre-text">{{ producto.nombre }}</span>
                    <span class="nombre-id">#{{ String(producto.idProducto).padStart(4, '0') }}</span>
                  </div>
                </td>
                <td class="col-categoria">
                  <span class="categoria-badge">{{ obtenerNombreCategoria(producto.idCategoria) }}</span>
                </td>
                <td class="col-subcategoria">
                  <span class="subcategoria-badge">{{ obtenerNombreSubcategoria(producto.idSubcategoria) }}</span>
                </td>
                <td class="col-codigo">
                  <span class="codigo-badge" v-if="producto.codigoBarras">
                    {{ producto.codigoBarras }}
                  </span>
                  <span class="codigo-empty" v-else>Sin código</span>
                </td>
                <td class="col-precio text-right">
                  <div class="precio-cell">
                    <span class="precio-value">{{ formatoMoneda(Number(producto.precio_venta || 0)) }}</span>
                    <span class="precio-mayoreo" v-if="producto.precio_mayoreo">
                      Mayoreo: {{ formatoMoneda(producto.precio_mayoreo) }}
                    </span>
                  </div>
                </td>
                <td class="col-stock text-center">
                  <div class="stock-cell" :class="{
                    'stock-low': !esCategoriaGaming(producto.idCategoria) && Number(producto.stock || 0) > 0 && Number(producto.stock || 0) <= Number(producto.cantidad_min || 0),
                    'stock-critical': !esCategoriaGaming(producto.idCategoria) && Number(producto.stock || 0) === 0
                  }">
                    <template v-if="esCategoriaGaming(producto.idCategoria)">
                      <span class="stock-icon">🎮</span>
                      <span class="stock-value rentable-text">Rentable</span>
                    </template>
                    <template v-else>
                      <span class="stock-icon">{{ Number(producto.stock || 0) === 0 ? '⚠️' : Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) ? '⚠' : '📦' }}</span>
                      <span class="stock-value">{{ producto.stock || 0 }}{{ producto.is_gramaje ? 'g' : 'u' }}</span>
                    </template>
                  </div>
                </td>
                <td class="col-tipo text-center">
                  <span class="tipo-badge tipo-rentable" v-if="esCategoriaGaming(producto.idCategoria)">🎮 Rentable</span>
                  <span class="tipo-badge" v-else-if="producto.is_gramaje">⚖️ Gramaje</span>
                  <span class="tipo-badge tipo-normal" v-else>📦 Unidad</span>
                </td>
                <td class="col-envase text-center">
                  <span class="envase-badge envase-si" v-if="producto.requiere_envase">
                    🧴 {{ formatoMoneda(producto.precio_envase || 0) }}
                  </span>
                  <span class="envase-badge envase-no" v-else>—</span>
                </td>
                <td class="col-acciones text-center">
                  <div class="acciones-cell">
                    <button 
                      type="button" 
                      class="btn-action btn-edit" 
                      @click="abrirModalEditarProducto(producto)"
                      title="Editar producto"
                    >
                      <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                    </button>
                    <button 
                      type="button" 
                      class="btn-action btn-delete" 
                      @click="handleDeleteProducto(producto)"
                      title="Eliminar producto"
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

          <!-- GRID VIEW -->
          <div v-else class="productos-grid">
            <article v-for="producto in productosFiltrados" :key="producto.idProducto" class="producto-card" :class="{ 'low-stock': !esCategoriaGaming(producto.idCategoria) && Number(producto.stock || 0) > 0 && Number(producto.stock || 0) <= Number(producto.cantidad_min || 0), 'out-of-stock': !esCategoriaGaming(producto.idCategoria) && Number(producto.stock || 0) === 0 }">
              <div class="pc-top">
                <span class="pc-id">#{{ String(producto.idProducto).padStart(4, '0') }}</span>
                <span class="pc-dot" :class="esCategoriaGaming(producto.idCategoria) ? 'dot-gaming' : (Number(producto.stock || 0) === 0 ? 'dot-out' : (Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) ? 'dot-low' : 'dot-ok'))"></span>
              </div>
              <div class="pc-ico">{{ obtenerEmojiDulce(producto.idProducto) }}</div>
              <h3 class="pc-name">{{ producto.nombre }}</h3>
              <div class="pc-badges">
                <span class="pc-badge">{{ obtenerNombreCategoria(producto.idCategoria) }}</span>
                <span class="pc-badge pc-type">{{ producto.is_gramaje ? '⚖️ Gramaje' : '📦 Unidad' }}</span>
              </div>
              <div class="pc-stats">
                <div class="pc-stat">
                  <span class="pc-stat-l">Stock</span>
                  <span class="pc-stat-v" :class="esCategoriaGaming(producto.idCategoria) ? 'stat-rentable' : (Number(producto.stock || 0) === 0 ? 'stat-out' : (Number(producto.stock || 0) <= Number(producto.cantidad_min || 0) ? 'stat-low' : 'stat-ok'))">{{ esCategoriaGaming(producto.idCategoria) ? '🎮 Rentable' : `${producto.stock || 0}${producto.is_gramaje ? 'g' : 'u'}` }}</span>
                </div>
                <div class="pc-stat">
                  <span class="pc-stat-l">Venta</span>
                  <span class="pc-stat-v stat-price">{{ formatoMoneda(Number(producto.precio_venta || 0)) }}</span>
                </div>
                <div class="pc-stat" v-if="producto.precio_mayoreo">
                  <span class="pc-stat-l">Mayoreo</span>
                  <span class="pc-stat-v stat-price">{{ formatoMoneda(producto.precio_mayoreo) }}</span>
                </div>
              </div>
              <div class="pc-actions">
                <button class="pc-btn" @click="abrirModalEditarProducto(producto)" title="Editar">✏️</button>
                <button class="pc-btn pc-btn-del" @click="handleDeleteProducto(producto)" title="Eliminar">🗑️</button>
              </div>
            </article>
          </div>
        </div>

        <div v-if="selectedProductos.size > 0" class="bulk-action-bar">
          <div class="bulk-info">
            <span class="bulk-count">{{ selectedProductos.size }} producto(s) seleccionado(s)</span>
            <button type="button" class="btn-clear-selection" @click="selectedProductos = new Set()">✕ Deseleccionar</button>
          </div>
          <button type="button" class="btn-bulk-action" @click="abrirModalCategoria">
            <span class="btn-icon">🏷️</span>
            <span class="btn-text">Cambiar Categoría</span>
          </button>
        </div>

        <div class="table-footer" v-if="!cargando && productosFiltrados.length > 0">
          <span class="footer-count">
            {{ productosFiltrados.length }} producto{{ productosFiltrados.length !== 1 ? 's' : '' }}
            <span v-if="terminoBusqueda.trim() || categoriaFiltro !== null || filtroTipo !== null" class="filter-indicator">
              (filtrado
              <span v-if="categoriaFiltro !== null"> por: {{ obtenerNombreCategoria(categoriaFiltro) }}</span>
              <span v-if="filtroTipo !== null">{{ categoriaFiltro !== null ? ',' : '' }} {{ filtroTipo === 'unidad' ? 'Unidad' : 'Gramaje' }}</span>
              )
            </span>
          </span>
        </div>
      </div>

      <div v-else-if="tabActiva === 'categorias'" class="tab-content">
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
          <p class="modal-desc">
            Se actualizará la categoría de <strong>{{ selectedProductos.size }} producto(s)</strong> seleccionado(s).
          </p>
          <div class="form-group">
            <label class="form-label">Nueva Categoría</label>
            <select v-model="nuevaCategoria" class="form-select">
              <option :value="null">— Sin cambiar —</option>
              <option v-for="cat in categorias" :key="cat.idCategoria" :value="cat.idCategoria">
                {{ cat.nombre }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Nueva Subcategoría</label>
            <select v-model="nuevaSubcategoria" class="form-select">
              <option :value="null">— Sin cambiar —</option>
              <option v-for="sub in subcategoriasParaModal" :key="sub.idSubcategoria" :value="sub.idSubcategoria">
                {{ sub.nombre }}
              </option>
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

    <input 
      ref="fileInputRef" 
      type="file" 
      accept=".csv,.xlsx,.xls" 
      class="hidden-file-input"
      @change="handleImport"
    />

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
  </main>
</template>

<style scoped>
.productos-layout {
  height: 100dvh;
  width: 100%;
  padding: 1rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--gradient-bg-start) 0%, var(--gradient-bg-mid) 50%, var(--bg-primary) 100%);
  position: relative;
}

.productos-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border: var(--border-width-thick) solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 10px 25px var(--shadow-color);
  overflow: hidden;
}

.toolbar {
  padding: 1rem 1.5rem;
  background: var(--bg-panel);
  border-bottom: 2px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tabs-bar {
  display: flex;
  gap: 0;
  background: var(--bg-panel);
  border-bottom: 2px solid var(--border-color);
  padding: 0 1.5rem;
  flex-shrink: 0;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  margin-bottom: -2px;
  box-shadow: none;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent-color) 5%, transparent);
  transform: none;
  filter: none;
}

.tab-btn.active {
  color: var(--accent-color);
  border-bottom-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, transparent);
}

.tab-icon {
  font-size: 1.1rem;
}

.tab-text {
  font-family: inherit;
}

.tab-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-proveedores {
  overflow-y: auto;
}

.tab-reporte {
  overflow-y: auto;
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: clamp(1.25rem, 2.5vw, 1.5rem);
  font-weight: 900;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-shadow: 2px 2px 0 var(--border-color);
}

.title-icon {
  font-size: 1.5rem;
}

.toolbar-subtitle {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.category-filter {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  padding: 0.6rem 2.5rem 0.6rem 0.85rem;
  color: var(--text-primary);
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23b0a890' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  min-width: 180px;
}

.category-filter:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 25%, transparent);
}

.category-filter option {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  font-size: 0.85rem;
  pointer-events: none;
  opacity: 0.7;
}

.search-input {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  padding: 0.6rem 2.25rem 0.6rem 2.25rem;
  color: var(--text-primary);
  border-radius: 8px;
  font-size: 0.85rem;
  width: 240px;
  transition: all 0.2s;
  font-family: inherit;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 25%, transparent);
}

.search-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.search-clear {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  width: 24px;
  height: 24px;
}

.search-clear:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.import-export-group {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.btn-secondary {
  border: 2px solid var(--border-color);
  padding: 0.6rem 0.85rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-family: inherit;
  color: var(--text-primary);
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-primary) 100%);
  cursor: pointer;
  box-shadow: 0 3px 8px var(--shadow-color);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 8px;
  flex-shrink: 0;
}

.btn-secondary:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-2px);
  border-color: var(--accent-color);
}

.btn-secondary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  border: 2px solid #c75a5a;
  padding: 0.6rem 0.85rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-family: inherit;
  color: #fff;
  background: linear-gradient(180deg, #c75a5a 0%, #a04040 100%);
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(199, 90, 90, 0.3);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 8px;
  flex-shrink: 0;
}

.btn-danger:hover:not(:disabled) {
  filter: brightness(1.15);
  transform: translateY(-2px);
  box-shadow: 0 5px 12px rgba(199, 90, 90, 0.4);
}

.btn-danger:active:not(:disabled) {
  transform: translateY(0);
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.5rem 0.7rem;
  font-size: 0.7rem;
}

.hidden-file-input {
  display: none;
}

.btn-primary {
  border: 2px solid var(--border-color);
  padding: 0.6rem 1.25rem;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: inherit;
  color: var(--btn-text, var(--bg-primary));
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 50%, var(--gradient-btn-end) 100%);
  cursor: pointer;
  box-shadow: 0 4px 12px var(--shadow-color);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 8px;
  flex-shrink: 0;
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--shadow-color);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 1.1rem;
  font-weight: 900;
}

.table-container {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0;
}

.tabla-productos {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.tabla-productos thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-panel);
  border-bottom: 2px solid var(--accent-color);
}

.tabla-productos th {
  padding: 0.875rem 1rem;
  text-align: left;
  font-weight: 700;
  color: var(--accent-color);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.text-right {
  text-align: right !important;
}

.text-center {
  text-align: center !important;
}

.producto-row {
  border-bottom: 1px solid var(--border-color);
  transition: all 0.15s;
}

.producto-row:hover {
  background: color-mix(in srgb, var(--accent-color) 8%, transparent);
}

.producto-row.low-stock {
  background: color-mix(in srgb, var(--warning-color) 18%, transparent);
  border-left: 4px solid var(--warning-color);
}

.producto-row.low-stock:hover {
  background: color-mix(in srgb, var(--warning-color) 25%, transparent);
}

.producto-row.out-of-stock {
  background: color-mix(in srgb, var(--error-color) 20%, transparent);
  border-left: 4px solid var(--error-color);
  animation: pulse-stock 2s ease-in-out infinite;
}

.producto-row.out-of-stock:hover {
  background: color-mix(in srgb, var(--error-color) 30%, transparent);
}

@keyframes pulse-stock {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

.col-check {
  width: 40px;
  text-align: center;
}

.row-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-color);
  cursor: pointer;
}

.producto-row.selected {
  background: color-mix(in srgb, var(--accent-color) 15%, transparent);
  border-left: 4px solid var(--accent-color);
}

.producto-row.selected:hover {
  background: color-mix(in srgb, var(--accent-color) 22%, transparent);
}

.bulk-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  margin-top: 0.5rem;
  background: color-mix(in srgb, var(--accent-color) 12%, var(--bg-panel));
  border: 2px solid var(--accent-color);
  border-radius: 10px;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bulk-count {
  font-weight: 700;
  color: var(--accent-color);
  font-size: 0.9rem;
}

.btn-clear-selection {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.15s;
}

.btn-clear-selection:hover {
  color: var(--error-color);
  background: color-mix(in srgb, var(--error-color) 10%, transparent);
}

.btn-bulk-action {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: var(--accent-color);
  color: var(--bg-primary);
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-bulk-action:hover {
  filter: brightness(1.15);
}

.modal-categoria {
  max-width: 420px;
}

.modal-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}

.form-select {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: border-color 0.15s;
}

.form-select:focus {
  outline: none;
  border-color: var(--accent-color);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.producto-row td {
  padding: 0.75rem 1rem;
  vertical-align: middle;
}

.icon-cell {
  width: 40px;
  height: 40px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  transition: all 0.2s;
}

.producto-row:hover .icon-cell {
  border-color: var(--accent-color);
}

.nombre-cell {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.nombre-text {
  font-weight: 700;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.nombre-id {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: monospace;
}

.categoria-badge {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  background: color-mix(in srgb, var(--infoBlueColor) 15%, transparent);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--infoBlueColor);
  white-space: nowrap;
}

.subcategoria-badge {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  background: color-mix(in srgb, var(--accent-color) 15%, transparent);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-color);
  white-space: nowrap;
}

.categoria-badge:empty::before,
.categoria-badge[data-default]::before {
  content: 'Sin asignar';
  opacity: 0.6;
}

.codigo-badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--text-secondary);
}

.codigo-empty {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.6;
  font-style: italic;
}

.precio-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
}

.precio-value {
  font-weight: 900;
  color: var(--success-color);
  font-size: 0.95rem;
  font-family: monospace;
}

.precio-mayoreo {
  font-size: 0.7rem;
  color: var(--accent-color);
  font-family: monospace;
}

.stock-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-weight: 800;
  font-family: monospace;
  font-size: 0.9rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
}

.stock-icon {
  font-size: 1rem;
}

.stock-cell.stock-low {
  color: #000;
  background: #fbbf24;
  font-weight: 900;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.3);
  animation: pulse-stock-warning 2s ease-in-out infinite;
}

@keyframes pulse-stock-warning {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(251, 191, 36, 0); }
}

.stock-cell.stock-critical {
  color: #fff;
  background: #dc2626;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  animation: pulse-stock-badge 2s ease-in-out infinite;
}

@keyframes pulse-stock-badge {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
}

.stock-value {
  color: inherit;
}

.stock-value.rentable-text {
  color: #7c3aed;
  font-weight: 700;
}

.tipo-badge {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  background: color-mix(in srgb, var(--accent-color) 15%, transparent);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tipo-badge.tipo-normal {
  background: color-mix(in srgb, var(--success-color) 15%, transparent);
  color: var(--success-color);
}

.tipo-badge.tipo-rentable {
  background: color-mix(in srgb, #7c3aed 15%, transparent);
  color: #7c3aed;
  border-color: #7c3aed;
}

.envase-badge {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  font-family: monospace;
  white-space: nowrap;
}

.envase-badge.envase-si {
  background: color-mix(in srgb, var(--warning-color) 15%, transparent);
  color: var(--warning-color);
  border-color: var(--warning-color);
}

.envase-badge.envase-no {
  color: var(--text-secondary);
  opacity: 0.4;
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

@media (max-width: 1024px) {
  .col-categoria,
  .col-subcategoria,
  .col-codigo,
  .col-tipo {
    display: none;
  }
  
  .tabs-bar {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  
  .tabs-bar::-webkit-scrollbar {
    display: none;
  }
  
  .tab-btn {
    padding: 0.75rem 1rem;
    white-space: nowrap;
  }
}

@media (max-width: 768px) {
  .productos-layout {
    padding: 0.5rem;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    padding: 0.875rem 1rem;
  }
  
  .toolbar-left {
    text-align: center;
  }
  
  .toolbar-title {
    justify-content: center;
  }
  
  .toolbar-right {
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .view-toggles {
    order: -1;
    width: 100%;
    max-width: 120px;
    margin: 0 auto;
  }
  
  .import-export-group {
    width: 100%;
    justify-content: center;
  }
  
  .category-filter {
    width: 100%;
    min-width: unset;
  }
  
  .search-input {
    width: 100%;
  }
  
  .col-precio,
  .col-stock {
    display: none;
  }
  
  .col-codigo {
    display: none;
  }
  
  .col-envase {
    display: none;
  }
  
  .col-subcategoria {
    display: none;
  }
  
  .bulk-action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .bulk-info {
    justify-content: center;
  }
  
  .btn-bulk-action {
    justify-content: center;
  }
  
  .tabla-productos th,
  .tabla-productos td {
    padding: 0.6rem 0.75rem;
  }
  
  .tabs-bar {
    padding: 0 1rem;
  }
  
  .tab-btn {
    padding: 0.65rem 0.85rem;
    font-size: 0.8rem;
  }
  
  .tab-icon {
    font-size: 1rem;
  }
  
  .icon-cell {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }
  
  .nombre-text {
    font-size: 0.85rem;
  }
  
  .nombre-id {
    font-size: 0.65rem;
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
  
  .toolbar-right {
    flex-direction: column;
    align-items: stretch;
  }
  
  .toolbar-right .category-filter,
  .toolbar-right .search-wrapper,
  .toolbar-right .import-export-group {
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
  
  .tab-text {
    display: none;
  }
  
  .tab-btn {
    padding: 0.75rem;
    justify-content: center;
  }
  
  .tab-icon {
    font-size: 1.2rem;
    margin: 0;
  }
  
  .tabs-bar {
    justify-content: space-around;
    padding: 0 0.5rem;
  }
  
  .toolbar {
    padding: 0.75rem 0.5rem;
  }
  
  .toolbar-right {
    gap: 0.4rem;
  }
  
  .view-toggles {
    max-width: 100px;
  }
  
  .toolbar-title {
    font-size: 1.1rem;
  }
  
  .title-icon {
    font-size: 1.2rem;
  }
  
  .toolbar-subtitle {
    font-size: 0.7rem;
  }
  
  .tabla-productos {
    font-size: 0.8rem;
  }
  
  .tabla-productos th,
  .tabla-productos td {
    padding: 0.5rem 0.5rem;
  }
  
  .icon-cell {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
  
  .nombre-text {
    font-size: 0.8rem;
  }
  
  .nombre-id {
    font-size: 0.6rem;
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
  
  .stock-cell {
    padding: 0.25rem 0.4rem;
    font-size: 0.8rem;
  }
  
  .stock-icon {
    font-size: 0.85rem;
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
  
  .estado-loading,
  .estado-empty {
    padding: 2.5rem 0.5rem;
  }
  
  .empty-icon {
    font-size: 2.5rem;
  }
  
  .empty-text {
    font-size: 0.9rem;
  }
  
  .loading-spinner {
    width: 36px;
    height: 36px;
    border-width: 3px;
  }
  
  .category-filter,
  .search-input {
    font-size: 0.8rem;
    padding: 0.5rem 2rem 0.5rem 0.7rem;
  }
  
  .btn-secondary {
    padding: 0.5rem 0.7rem;
    font-size: 0.7rem;
  }
  
  .col-categoria {
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .categoria-badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
  }
  
  .table-footer {
    padding: 0.6rem 1rem;
  }
  
  .footer-count {
    font-size: 0.7rem;
  }
  
  .bulk-action-bar {
    padding: 0.6rem 0.75rem;
  }
  
  .bulk-count {
    font-size: 0.8rem;
  }
  
  .btn-bulk-action {
    padding: 0.45rem 0.75rem;
    font-size: 0.75rem;
  }
}

@media (max-width: 360px) {
  .import-export-group {
    gap: 0.25rem;
  }

  .import-export-group .btn-text {
    display: none;
  }

  .import-export-group .btn-secondary {
    padding: 0.45rem 0.55rem;
    min-width: 36px;
    justify-content: center;
  }

  .import-export-group .btn-icon {
    font-size: 1rem;
    margin: 0;
  }

  .toolbar-right {
    gap: 0.4rem;
  }

  .btn-secondary.btn-sm {
    padding: 0.4rem 0.5rem;
  }

  /* Table view ultra-compact */
  .col-categoria {
    display: none;
  }

  .tabla-productos th,
  .tabla-productos td {
    padding: 0.35rem 0.3rem;
  }

  .nombre-cell {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
  }

  .nombre-text {
    font-size: 0.65rem;
    line-height: 1.2;
  }

  .nombre-id {
    font-size: 0.5rem;
  }

  .stock-cell {
    padding: 0.15rem 0.25rem;
    font-size: 0.65rem;
  }

  .stock-icon {
    font-size: 0.7rem;
  }

  .stock-value {
    font-size: 0.65rem;
  }

  .tipo-badge {
    font-size: 0.55rem;
    padding: 0.08rem 0.25rem;
  }

  .btn-action {
    width: 24px;
    height: 24px;
  }

  .btn-action .action-icon {
    width: 11px;
    height: 11px;
  }

  .acciones-cell {
    gap: 0.15rem;
  }

  .productos-layout {
    padding: 0.35rem;
  }
  
  .toolbar {
    padding: 0.6rem 0.4rem;
    gap: 0.35rem;
  }
  
  .toolbar-title {
    font-size: 0.95rem;
  }
  
  .title-icon {
    font-size: 1rem;
  }
  
  .toolbar-subtitle {
    font-size: 0.65rem;
  }
  
  .toolbar-right {
    gap: 0.3rem;
  }
  
  .category-filter,
  .search-input {
    font-size: 0.75rem;
    padding: 0.45rem 1.8rem 0.45rem 0.6rem;
  }
  
  .search-wrapper {
    width: 100%;
  }
  
  .search-input {
    width: 100%;
  }
  
  .view-toggles {
    max-width: 90px;
  }
  
  .tab-btn {
    padding: 0.6rem 0.4rem;
  }
  
  .tab-icon {
    font-size: 1rem;
  }
  
  .tabs-bar {
    padding: 0 0.3rem;
    gap: 0;
  }
  
  /* Table view ultra-compact */
  .tabla-productos {
    font-size: 0.7rem;
  }
  
  .tabla-productos th,
  .tabla-productos td {
    padding: 0.4rem 0.35rem;
  }
  
  .col-check {
    width: 30px;
  }
  
  .row-checkbox {
    width: 14px;
    height: 14px;
  }
  
  .col-icon {
    width: 30px;
  }
  
  .icon-cell {
    width: 28px;
    height: 28px;
    font-size: 0.85rem;
  }
  
  .nombre-text {
    font-size: 0.7rem;
  }
  
  .nombre-id {
    font-size: 0.55rem;
  }
  
  .categoria-badge {
    font-size: 0.6rem;
    padding: 0.1rem 0.3rem;
  }
  
  .btn-action {
    width: 26px;
    height: 26px;
  }
  
  .btn-action .action-icon {
    width: 12px;
    height: 12px;
  }
  
  .stock-value {
    font-size: 0.7rem;
  }
  
  .stock-icon {
    font-size: 0.75rem;
  }
  
  .tipo-badge {
    font-size: 0.6rem;
    padding: 0.1rem 0.3rem;
  }
  
  .envase-badge {
    font-size: 0.6rem;
  }
  
  /* Grid view ultra-compact */
  .productos-grid {
    gap: 0.35rem;
    padding: 0.3rem 0;
  }
  
  .producto-card {
    padding: 0.45rem;
    gap: 0.25rem;
    border-radius: 8px;
  }
  
  .pc-top {
    margin-bottom: 0.1rem;
  }
  
  .pc-id {
    font-size: 0.5rem;
  }
  
  .pc-dot {
    width: 6px;
    height: 6px;
  }
  
  .pc-ico {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
  }
  
  .pc-name {
    font-size: 0.6rem;
    min-height: 1.2em;
    -webkit-line-clamp: 1;
  }
  
  .pc-badges {
    gap: 0.2rem;
  }
  
  .pc-badge {
    font-size: 0.45rem;
    padding: 0.05rem 0.25rem;
    border-radius: 4px;
  }
  
  .pc-stats {
    gap: 0.15rem;
  }
  
  .pc-stat {
    padding: 0.12rem 0.2rem;
    border-radius: 4px;
  }
  
  .pc-stat-l {
    font-size: 0.4rem;
  }
  
  .pc-stat-v {
    font-size: 0.5rem;
  }
  
  .pc-actions {
    gap: 0.15rem;
    margin-top: 0.05rem;
  }
  
  .pc-btn {
    height: 24px;
    font-size: 0.7rem;
    border-radius: 4px;
  }
  
  /* Toast */
  .toast-container {
    bottom: 0.3rem;
    right: 0.3rem;
    left: 0.3rem;
  }
  
  .toast-notification {
    padding: 0.6rem 0.7rem;
    font-size: 0.75rem;
  }
  
  .toast-icon {
    font-size: 0.9rem;
  }
  
  .toast-message {
    font-size: 0.7rem;
  }
  
  /* Empty/loading states */
  .estado-loading,
  .estado-empty {
    padding: 2rem 0.3rem;
  }
  
  .empty-icon {
    font-size: 2rem;
  }
  
  .empty-text {
    font-size: 0.8rem;
  }
  
  .loading-spinner {
    width: 30px;
    height: 30px;
    border-width: 2px;
  }
  
  /* Bulk action bar */
  .bulk-action-bar {
    padding: 0.5rem 0.6rem;
    gap: 0.4rem;
  }
  
  .bulk-count {
    font-size: 0.7rem;
  }
  
  .btn-clear-selection {
    font-size: 0.65rem;
    padding: 0.15rem 0.35rem;
  }
  
  .btn-bulk-action {
    padding: 0.4rem 0.6rem;
    font-size: 0.7rem;
  }
  
  .btn-icon {
    font-size: 0.85rem;
  }
  
  .btn-text {
    font-size: 0.65rem;
  }
}

/* VIEW TOGGLES */
.view-toggles {
  display: flex;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.view-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 1rem;
  line-height: 1;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.view-btn.on { 
  background: var(--accent-color); 
  color: var(--bg-primary);
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
}
.view-btn:hover:not(.on) { background: var(--bg-secondary); }
.view-btn:active { transform: scale(0.95); }

@media (max-width: 768px) {
  .view-btn {
    width: 34px;
    height: 34px;
    font-size: 0.95rem;
  }
}

@media (max-width: 480px) {
  .view-toggles {
    border-width: 1px;
    border-radius: 6px;
  }
  
  .view-btn {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
  }
}

@media (max-width: 360px) {
  .view-btn {
    width: 30px;
    height: 30px;
    font-size: 0.85rem;
  }
}

/* PRODUCTOS GRID */
.productos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
  padding: 0.5rem 0;
}

@media (max-width: 768px) {
  .productos-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.6rem;
  }
}

@media (max-width: 480px) {
  .productos-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  
  .producto-card {
    padding: 0.6rem;
  }
  
  .pc-ico {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
  
  .pc-name {
    font-size: 0.7rem;
  }
  
  .pc-stat-l {
    font-size: 0.5rem;
  }
  
  .pc-stat-v {
    font-size: 0.6rem;
  }
  
  .pc-btn {
    height: 28px;
    font-size: 0.8rem;
  }
}

@media (max-width: 360px) {
  .productos-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem;
  }
  
  .producto-card {
    padding: 0.5rem;
    gap: 0.3rem;
  }
  
  .pc-ico {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
  }
  
  .pc-name {
    font-size: 0.65rem;
    -webkit-line-clamp: 1;
  }
  
  .pc-badge {
    font-size: 0.5rem;
    padding: 0.05rem 0.3rem;
  }
  
  .pc-stat {
    padding: 0.15rem 0.25rem;
  }
  
  .pc-stat-l {
    font-size: 0.45rem;
  }
  
  .pc-stat-v {
    font-size: 0.55rem;
  }
  
  .pc-actions {
    gap: 0.2rem;
  }
  
  .pc-btn {
    height: 26px;
    font-size: 0.75rem;
  }
}

.producto-card {
  position: relative;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  transition: all 0.2s;
}

.producto-card:hover {
  border-color: rgba(255, 215, 0, 0.25);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.producto-card.low-stock { border-color: rgba(245, 158, 11, 0.4); }
.producto-card.out-of-stock { border-color: rgba(239, 68, 68, 0.4); }

.pc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pc-id {
  font-size: 0.55rem;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
}

.pc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-ok { background: #22c55e; box-shadow: 0 0 4px #22c55e; }
.dot-low { background: #f59e0b; box-shadow: 0 0 4px #f59e0b; }
.dot-out { background: #ef4444; box-shadow: 0 0 4px #ef4444; }
.dot-gaming { background: #8b5cf6; box-shadow: 0 0 4px #8b5cf6; }

.pc-ico {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: var(--bg-secondary);
  border-radius: 50%;
  font-size: 1.2rem;
  border: 1px solid var(--border-color);
  align-self: center;
}

.pc-name {
  margin: 0;
  font-size: 0.75rem;
  color: var(--accent-color);
  text-align: center;
  line-height: 1.25;
  min-height: 1.5em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-family: 'HyliaSerif', serif;
}

.pc-badges {
  display: flex;
  gap: 0.3rem;
  justify-content: center;
  flex-wrap: wrap;
}

.pc-badge {
  font-size: 0.55rem;
  color: var(--text-secondary);
  padding: 0.1rem 0.4rem;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.pc-type { color: var(--accent-color); }

.pc-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.pc-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.2rem 0.35rem;
  background: var(--bg-secondary);
  border-radius: 5px;
}

.pc-stat-l {
  font-size: 0.55rem;
  color: var(--text-secondary);
}

.pc-stat-v {
  font-size: 0.65rem;
  font-family: 'Courier New', monospace;
  font-weight: 600;
  white-space: nowrap;
}

.stat-ok { color: #22c55e; }
.stat-low { color: #f59e0b; }
.stat-out { color: #ef4444; }
.stat-rentable { color: #8b5cf6; }
.stat-price { color: var(--success-color); }

.pc-actions {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.1rem;
}

.pc-btn {
  flex: 1;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.pc-btn:hover {
  transform: scale(1.05);
  border-color: var(--accent-color);
}

.pc-btn-del:hover {
  border-color: var(--error-color);
  background: color-mix(in srgb, var(--error-color) 15%, var(--bg-secondary));
}
</style>
