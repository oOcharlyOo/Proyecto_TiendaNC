<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';

type PromocionDetalleDTO = {
  id_detalle?: number;
  id_producto: number;
  nombre_producto?: string;
  cantidad: number;
  precio_unitario?: number;
  subtotal?: number;
};

type PromocionDTO = {
  id_promocion: number;
  nombre: string;
  descripcion: string;
  precio_original: number;
  precio_promocion: number;
  imagen_url: string | null;
  activa: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  detalles: PromocionDetalleDTO[];
};

type ProductoSimple = {
  idProducto: number;
  nombre: string;
  precioVenta: number;
  isGramaje: boolean;
};

type ProductoPromocionItem = {
  id_producto: number;
  cantidad: number;
  nombre: string;
  precio: number;
  is_gramaje: boolean;
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'updated'): void;
}>();

const activeTab = ref<'lista' | 'formulario'>('lista');
const promociones = ref<PromocionDTO[]>([]);
const productos = ref<ProductoSimple[]>([]);
const loading = ref(false);
const error = ref('');

const modalGramajeAbierto = ref(false);
const productoGramajeSeleccionado = ref<ProductoSimple | null>(null);
const gramosTemp = ref(100);

const editingId = ref<number | null>(null);
const imagenPreview = ref<string | null>(null);
const imagenBase64 = ref<string | null>(null);
const imagenOriginalUrl = ref<string | null>(null);
const subiendoImagen = ref(false);

const form = ref({
  nombre: '',
  descripcion: '',
  precio_promocion: 0,
  activa: true,
  productos: [] as ProductoPromocionItem[]
});

const searchTerm = ref('');

const filteredPromociones = computed(() => {
  const result = !searchTerm.value ? promociones.value : promociones.value.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    p.descripcion.toLowerCase().includes(searchTerm.value.toLowerCase())
  );
  console.log('filteredPromociones:', result.map(p => ({ id: p.id_promocion, imagen: p.imagen_url })));
  return result;
});

const precioOriginalCalculado = computed(() => {
  if (!form.value.productos || form.value.productos.length === 0) return 0;
  return form.value.productos.reduce((sum, p) => {
    const cantidad = Number(p.cantidad) || 0;
    const precio = Number(p.precio) || 0;
    if (p.is_gramaje) {
      return sum + (cantidad / 1000) * precio;
    }
    return sum + precio * cantidad;
  }, 0);
});

const precioPromocionSugerido = computed(() => {
  const original = precioOriginalCalculado.value;
  if (original <= 0) return 0;
  return Math.max(0, original * 0.9);
});

const productosDisponibles = computed(() => {
  return productos.value.filter(p => {
    return !form.value.productos.some(fp => fp.id_producto === p.idProducto);
  });
});

function formatearCantidad(cantidad: number): string {
  if (cantidad >= 1000) {
    return (cantidad / 1000) + 'kg';
  }
  if (cantidad === 1) {
    return cantidad + 'pza';
  }
  return cantidad + 'g';
}

onMounted(async () => {
  await Promise.all([cargarPromociones(), cargarProductos()]);
});

watch(() => form.value.productos, async (productos) => {
  if (productos.length > 0 && form.value.precio_promocion === 0) {
    await nextTick();
    form.value.precio_promocion = precioOriginalCalculado.value;
  }
}, { deep: true });

watch(() => promociones.value, (newPromos) => {
  console.log('Promociones cambiaron:', newPromos.map(p => ({ id: p.id_promocion, imagen: p.imagen_url })));
}, { deep: true });

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  return respuesta.json() as Promise<T>;
}

async function cargarPromociones() {
  loading.value = true;
  error.value = '';
  try {
    const res = await getJson<{ codigo: number; datos: any[] }>(`${API_BASE}/promociones/listarPromociones`);
    promociones.value = (res.datos || []).map((p: any) => ({
      id_promocion: p.idPromocion,
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      precio_original: Number(p['precio_original']) || 0,
      precio_promocion: Number(p['precio_promocion']) || 0,
      imagen_url: p['imagen_url'] || null,
      activa: p.activa ?? true,
      fecha_inicio: p.fechaInicio,
      fecha_fin: p.fechaFin,
      detalles: (p.detalles || []).map((d: any) => ({
        id_detalle: d.idDetalle,
        id_producto: d['id_producto'],
        nombre_producto: d.nombreProducto || '',
        cantidad: Number(d.cantidad) || 0,
        precio_unitario: Number(d.precioUnitario) || 0,
        subtotal: Number(d.subtotal) || 0
      }))
    }));
  } catch (e) {
    error.value = 'Error al cargar promociones';
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function cargarProductos() {
  try {
    const res = await getJson<{ codigo: number; datos: any[] }>(`${API_BASE}/productos/listarProductos`);
    productos.value = (res.datos || []).map((p: any) => ({
      idProducto: p.idProducto,
      nombre: p.nombre,
      precioVenta: Number(p.precio_venta),
      isGramaje: p.is_gramaje || false
    }));
  } catch (e) {
    console.error('Error al cargar productos', e);
  }
}

function agregarProducto(producto: ProductoSimple) {
  if (producto.isGramaje) {
    productoGramajeSeleccionado.value = producto;
    modalGramajeAbierto.value = true;
    return;
  }
  
  form.value.productos.push({
    id_producto: producto.idProducto,
    cantidad: 1,
    nombre: producto.nombre,
    precio: producto.precioVenta,
    is_gramaje: false
  });
}

function confirmarGramaje(gramos: number) {
  if (productoGramajeSeleccionado.value && gramos > 0) {
    form.value.productos.push({
      id_producto: productoGramajeSeleccionado.value.idProducto,
      cantidad: gramos,
      nombre: productoGramajeSeleccionado.value.nombre,
      precio: productoGramajeSeleccionado.value.precioVenta,
      is_gramaje: true
    });
  }
  modalGramajeAbierto.value = false;
  productoGramajeSeleccionado.value = null;
}

function cerrarModalGramaje() {
  modalGramajeAbierto.value = false;
  productoGramajeSeleccionado.value = null;
}

function quitarProducto(index: number) {
  form.value.productos.splice(index, 1);
}

function editarPromocion(promocion: PromocionDTO) {
  editingId.value = promocion.id_promocion;
  imagenPreview.value = promocion.imagen_url;
  imagenOriginalUrl.value = promocion.imagen_url;
  imagenBase64.value = null;
  console.log('Editando promocion:', promocion);
  console.log('Detalles:', promocion.detalles);
  form.value = {
    nombre: promocion.nombre || '',
    descripcion: promocion.descripcion || '',
    precio_promocion: Number(promocion.precio_promocion) || 0,
    activa: promocion.activa ?? true,
    productos: (promocion.detalles || []).map((d: any) => {
      console.log('Detalle:', d);
      const prod = productos.value.find(p => p.idProducto === d.id_producto);
      return {
        id_producto: d.id_producto,
        cantidad: Number(d.cantidad) || 0,
        nombre: d.nombre_producto || '',
        precio: Number(d.precio_unitario) || (prod?.precioVenta || 0),
        is_gramaje: prod?.isGramaje || false
      };
    })
  };
  console.log('Form productos:', form.value.productos);
  activeTab.value = 'formulario';
}

function nuevaPromocion() {
  editingId.value = null;
  imagenPreview.value = null;
  imagenBase64.value = null;
  imagenOriginalUrl.value = null;
  form.value = {
    nombre: '',
    descripcion: '',
    precio_promocion: 0,
    activa: true,
    productos: []
  };
  activeTab.value = 'formulario';
}

function onImagenSeleccionada(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    imagenPreview.value = result;
    imagenBase64.value = result;
  };
  reader.readAsDataURL(file);
}

function quitarImagen() {
  imagenPreview.value = null;
  imagenBase64.value = null;
  const input = document.getElementById('imagen-input') as HTMLInputElement;
  if (input) input.value = '';
}

function triggerImagenInput() {
  const input = document.getElementById('imagen-input') as HTMLInputElement;
  if (input) input.click();
}

async function guardarPromocion() {
  if (!form.value.nombre || form.value.productos.length === 0) {
    error.value = 'Completa el nombre y agrega al menos un producto';
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const dto = {
      nombre: form.value.nombre,
      descripcion: form.value.descripcion,
      precio_promocion: form.value.precio_promocion,
      imagen_url: imagenBase64.value ? null : imagenOriginalUrl.value,
      activa: form.value.activa,
      fecha_inicio: null,
      fecha_fin: null,
      productos: form.value.productos.map(p => ({
        id_producto: p.id_producto,
        cantidad: p.cantidad
      }))
    };

    let promoId = editingId.value;

    if (editingId.value) {
      await getJson(`${API_BASE}/promociones/actualizar/${editingId.value}`, {
        method: 'PUT',
        body: JSON.stringify(dto)
      });
    } else {
      const res = await getJson<{ codigo: number; datos: any }>(`${API_BASE}/promociones/crear`, {
        method: 'POST',
        body: JSON.stringify(dto)
      });
      console.log('Respuesta crear promocion:', res);
      if (res.datos?.idPromocion) {
        promoId = res.datos.idPromocion;
      } else if (res.datos?.id_promocion) {
        promoId = res.datos.id_promocion;
      }
    }

    console.log('Subir imagen - imagenBase64:', !!imagenBase64.value, 'promoId:', promoId);
    if (imagenBase64.value && promoId) {
      try {
        console.log('Subiendo imagen para promocion:', promoId);
        const uploadRes = await getJson<{ codigo: number; datos: any }>(`${API_BASE}/promociones/subirImagen/${promoId}`, {
          method: 'POST',
          body: JSON.stringify({ imagen: imagenBase64.value })
        });
        console.log('Respuesta subir imagen:', uploadRes);
        console.log('Datos imagen:', uploadRes.datos);
        if (uploadRes.codigo === 200 && uploadRes.datos?.imagenUrl) {
          imagenPreview.value = uploadRes.datos.imagenUrl;
        }
      } catch (imgErr) {
        console.error('Error al subir imagen:', imgErr);
      }
    }

    await cargarPromociones();
    console.log('Promociones despues de recargar:', promociones.value.map(p => ({ id: p.id_promocion, nombre: p.nombre, imagen: p.imagen_url })));
    activeTab.value = 'lista';
    emit('updated');
    imagenPreview.value = null;
    imagenBase64.value = null;
  } catch (e) {
    error.value = 'Error al guardar promoción';
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function eliminarPromocion(id: number) {
  if (!confirm('¿Eliminar esta promoción?')) return;

  loading.value = true;
  try {
    await getJson(`${API_BASE}/promociones/eliminar/${id}`, { method: 'DELETE' });
    await cargarPromociones();
  } catch (e) {
    error.value = 'Error al eliminar';
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function toggleActiva(promocion: PromocionDTO) {
  try {
    await getJson(`${API_BASE}/promociones/toggleActiva/${promocion.id_promocion}`, { method: 'PATCH' });
    await cargarPromociones();
  } catch (e) {
    console.error(e);
  }
}

function formatoMoneda(valor: number) {
  if (isNaN(valor) || valor === null || valor === undefined) return '$0.00';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
}

function calcularPrecioOriginal(detalles: any[]) {
  if (!detalles || detalles.length === 0) return 0;
  return detalles.reduce((sum, d) => sum + (Number(d.subtotal) || 0), 0);
}

function cerrar() {
  emit('close');
}

function formatImagenUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  
  if (url.startsWith('http')) {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const fileName = path.split('/').pop();
    const folder = path.split('/').slice(-2, -1)[0];
    if (fileName && folder) {
      return `${API_BASE}/imagenes/obtener/${folder}/${fileName}`;
    }
    return url;
  }
  return url;
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="cerrar">
    <section class="crud-panel">
      <header class="panel-header">
        <div class="header-ornaments">
          <span>❧</span>
          <h2>Taberna de Ofertas</h2>
          <span>❧</span>
        </div>
        <button class="btn-close" @click="cerrar">×</button>
      </header>

      <nav class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'lista' }"
          @click="activeTab = 'lista'"
        >
          📜 Inventario
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'formulario' }"
          @click="nuevaPromocion"
        >
          ⚔ Nueva Agrupación
        </button>
      </nav>

      <div class="panel-body">
        <p v-if="error" class="error-msg">{{ error }}</p>

        <Transition name="fade" mode="out-in">
          <div v-if="activeTab === 'lista'" key="lista" class="lista-container">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Buscar promociones..."
                class="search-input"
              >
            </div>

            <div v-if="loading" class="loading">Cargando...</div>

            <div v-else-if="filteredPromociones.length === 0" class="empty-state">
              <span class="empty-icon">🏺</span>
              <p>No hay promociones</p>
            </div>

            <div v-else class="promo-grid">
              <article
                v-for="promo in filteredPromociones"
                :key="`promo-${promo.id_promocion}-${promo.imagen_url}`"
                class="promo-card"
                :class="{ inactive: !promo.activa }"
                :data-imagen="promo.imagen_url"
              >
                <div class="card-image">
                  <img :src="formatImagenUrl(promo.imagen_url)" :alt="promo.nombre" class="card-img" @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; }">
                  <div v-if="!promo.imagen_url" class="image-placeholder">📦</div>
                </div>
                <div class="card-content">
                  <div class="card-header">
                    <h4>{{ promo.nombre }}</h4>
                    <span class="status-badge" :class="promo.activa ? 'active' : 'inactive'">
                      {{ promo.activa ? 'Activa' : 'Inactiva' }}
                    </span>
                  </div>
                  <p class="card-desc">{{ promo.descripcion }}</p>
                  <div class="card-products">
                    <span v-for="(det, i) in promo.detalles.slice(0, 3)" :key="i" class="product-tag">
                      {{ formatearCantidad(det.cantidad) }} {{ det.nombre_producto }}
                    </span>
                    <span v-if="promo.detalles.length > 3" class="more-tag">
                      +{{ promo.detalles.length - 3 }}
                    </span>
                  </div>
                  <div class="card-pricing">
                    <span class="price-original">{{ formatoMoneda(calcularPrecioOriginal(promo.detalles)) }}</span>
                    <span class="price-promo">{{ formatoMoneda(promo.precio_promocion > 0 ? promo.precio_promocion : calcularPrecioOriginal(promo.detalles)) }}</span>
                  </div>
                  <div class="card-actions">
                    <button class="btn-toggle" @click="toggleActiva(promo)">
                      {{ promo.activa ? '⏸ Desact.' : '▶ Activ.' }}
                    </button>
                    <button class="btn-edit" @click="editarPromocion(promo)">✎ Editar</button>
                    <button class="btn-delete" @click="eliminarPromocion(promo.id_promocion)">🗑</button>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div v-else key="formulario" class="form-container">
            <div class="form-group">
              <label>Nombre de la Agrupación</label>
              <input v-model="form.nombre" type="text" placeholder="Ej: Combo Guerrero" class="input-field">
            </div>

            <div class="form-group">
              <label>Descripción</label>
              <textarea v-model="form.descripcion" placeholder="Describe la promoción..." class="input-field textarea"></textarea>
            </div>

            <div class="form-group">
              <label>Imagen de la Promoción</label>
              <div class="imagen-upload">
                <div v-if="imagenPreview" class="imagen-preview">
                  <img :src="imagenPreview" alt="Preview">
                  <button class="btn-quitar-imagen" @click="quitarImagen" type="button">×</button>
                </div>
                <div v-else class="imagen-placeholder" @click="triggerImagenInput">
                  <span class="placeholder-icon">📷</span>
                  <span class="placeholder-text">Subir imagen</span>
                </div>
                <input 
                  id="imagen-input"
                  type="file" 
                  accept="image/*" 
                  @change="onImagenSeleccionada" 
                  class="imagen-input-hidden"
                >
              </div>
            </div>

            <div class="form-group">
              <label>Precio de Promoción</label>
              <input v-model.number="form.precio_promocion" type="number" step="0.01" min="0" class="input-field">
              <small class="price-info">❧ Precio original calculado: <strong>{{ formatoMoneda(precioOriginalCalculado) }}</strong></small>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input v-model="form.activa" type="checkbox">
                <span>Promoción Activa</span>
              </label>
            </div>

            <div class="form-section">
              <h5>Productos Incluidos</h5>
              
                  <div v-if="form.productos.length > 0" class="selected-products">
                <div v-for="(prod, index) in form.productos" :key="prod.id_producto" class="product-row">
                  <span class="prod-name">{{ prod.nombre }}</span>
                  <div class="prod-qty">
                    <input
                      v-model.number="prod.cantidad"
                      type="number"
                      min="1"
                      class="qty-input"
                    >
                    <span v-if="prod.is_gramaje" class="qty-unit">{{ prod.cantidad >= 1000 ? 'kg' : 'g' }}</span>
                    <span v-else class="qty-unit">{{ prod.cantidad === 1 ? 'pza' : 'pzas' }}</span>
                  </div>
                  <button class="btn-remove-prod" @click="quitarProducto(index)">×</button>
                </div>
              </div>

              <div class="add-product">
                <select @change="(e) => { const prodId = Number((e.target as HTMLSelectElement).value); if(prodId) { const prod = productos.find(p => p.idProducto === prodId); if(prod) agregarProducto(prod); } (e.target as HTMLSelectElement).value = ''; }" class="product-select">
                  <option value="">+ Agregar producto</option>
                  <option v-for="prod in productosDisponibles" :key="prod.idProducto" :value="prod.idProducto">
                    {{ prod.nombre }} - {{ formatoMoneda(prod.precioVenta) }} {{ prod.isGramaje ? '(gramaje)' : '' }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn-cancel" @click="activeTab = 'lista'">Cancelar</button>
              <button class="btn-save" @click="guardarPromocion" :disabled="loading">
                {{ loading ? 'Guardando...' : '💾 Guardar' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <div v-if="modalGramajeAbierto" class="gramaje-modal-overlay" @click.self="cerrarModalGramaje">
        <div class="gramaje-modal">
          <header class="gramaje-header">
            <h4>🧮 Configurar Gramaje</h4>
            <button class="btn-close-gramaje" @click="cerrarModalGramaje">×</button>
          </header>
          <div class="gramaje-body">
            <div class="gramaje-info">
              <p class="producto-nombre">{{ productoGramajeSeleccionado?.nombre }}</p>
              <p class="producto-precio">Precio por kg: {{ formatoMoneda(productoGramajeSeleccionado?.precioVenta || 0) }}</p>
            </div>
            <div class="gramaje-input-section">
              <label>Cantidad en gramos:</label>
              <div class="gramaje-input-row">
                <input 
                  v-model.number="gramosTemp" 
                  type="number" 
                  min="1" 
                  step="10"
                  class="gramaje-input"
                  placeholder="100"
                >
                <span class="gramaje-unit">{{ gramosTemp >= 1000 ? 'kg' : 'g' }}</span>
              </div>
              <div class="gramaje-quick-btns">
                <button type="button" @click="gramosTemp = 100">100g</button>
                <button type="button" @click="gramosTemp = 250">250g</button>
                <button type="button" @click="gramosTemp = 500">500g</button>
                <button type="button" @click="gramosTemp = 1000">1kg</button>
              </div>
            </div>
            <p class="gramaje-subtotal" v-if="gramosTemp > 0">
              Subtotal: {{ formatoMoneda((gramosTemp / 1000) * (productoGramajeSeleccionado?.precioVenta || 0)) }}
              <span class="gramaje-display">({{ gramosTemp >= 1000 ? (gramosTemp / 1000) + 'kg' : gramosTemp + 'g' }})</span>
            </p>
          </div>
          <footer class="gramaje-footer">
            <button class="btn-cancelar" @click="cerrarModalGramaje">Cancelar</button>
            <button class="btn-confirmar" @click="() => { confirmarGramaje(gramosTemp); gramosTemp = 0; }" :disabled="!gramosTemp || gramosTemp <= 0">Agregar</button>
          </footer>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.crud-panel {
  --perg-bg: var(--color-bg-primary);
  --perg-bg-panel: var(--color-bg-panel);
  --perg-text: var(--color-text-primary);
  --perg-text-secondary: var(--color-text-secondary);
  --perg-title: var(--color-accent);
  --perg-border: var(--color-border);
  --perg-accent: var(--color-accent);
  --perg-shadow: var(--color-shadow);
  --perg-success: var(--color-success);
  --perg-error: var(--color-error);
  --perg-warning: var(--color-warning);
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  background: var(--color-bg-panel);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  box-shadow: 8px 8px 24px rgba(0,0,0,0.35), -4px -4px 16px rgba(255,255,255,0.03);
  animation: slideUp 0.3s ease-out;
}
@keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--color-bg-secondary);
  border-bottom: none;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.header-ornaments {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--perg-accent);
  font-size: 1.2rem;
}

.header-ornaments h2 {
  margin: 0;
  font-family: 'Palatino Linotype', serif;
  font-size: 1.3rem;
  color: var(--perg-title) !important;
  text-shadow: 2px 2px 0 rgba(40, 20, 10, 0.45) !important;
}

.btn-close {
  width: 36px;
  height: 36px;
  background: var(--perg-error);
  color: white;
  border: 2px solid var(--perg-border);
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tabs {
  display: flex;
  background: var(--perg-bg);
  border-bottom: 1px solid var(--perg-border);
}

.tab {
  flex: 1;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: var(--perg-text-secondary);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
}

.tab:hover {
  background: var(--perg-bg-panel);
}

.tab.active {
  color: var(--perg-accent);
  border-bottom-color: var(--perg-accent);
  background: var(--perg-bg-panel);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.error-msg {
  background: var(--perg-error);
  color: white;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  text-align: center;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--perg-bg);
  border: 2px solid var(--perg-border);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;
}

.search-icon {
  color: var(--perg-text-secondary);
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--perg-text);
  font-size: 0.9rem;
  outline: none;
}

.loading, .empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--perg-text-secondary);
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.promo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.promo-card {
  background: var(--perg-bg);
  border: 2px solid var(--perg-border);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  gap: 0.75rem;
  transition: all 0.2s;
}

.promo-card:hover {
  border-color: var(--perg-accent);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.promo-card.inactive {
  opacity: 0.6;
}

.promo-card .card-image {
  flex-shrink: 0;
  width: 80px;
  border-radius: 6px;
  display: flex;
  align-items: stretch;
}

.promo-card .card-img {
  width: 100%;
  height: 100%;
  object-fit: scale-down;
  filter: drop-shadow(10px 2px 0px black);
}

.promo-card .image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--perg-bg-panel);
  font-size: 1.8rem;
}

.promo-card .card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.card-header h4 {
  margin: 0;
  color: var(--perg-accent);
  font-size: 0.85rem;
  flex: 1;
  line-height: 1.2;
}

.status-badge {
  font-size: 0.6rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: bold;
  text-transform: uppercase;
}

.status-badge.active {
  background: var(--perg-success);
  color: white;
}

.status-badge.inactive {
  background: var(--perg-text-secondary);
  color: white;
}

.card-desc {
  font-size: 0.7rem;
  color: var(--perg-text-secondary);
  margin: 0;
  line-height: 1.3;
}

.card-products {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.product-tag {
  font-size: 0.65rem;
  background: var(--perg-bg-panel);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  color: var(--perg-text);
}

.more-tag {
  font-size: 0.6rem;
  color: var(--perg-accent);
  font-weight: bold;
}

.card-pricing {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  margin-top: auto;
}

.price-original {
  font-size: 0.75rem;
  color: var(--perg-text-secondary);
  text-decoration: line-through;
}

.price-promo {
  font-size: 1rem;
  font-weight: bold;
  color: var(--perg-success);
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn-toggle, .btn-edit {
  flex: 1;
  padding: 0.4rem;
  font-size: 0.65rem;
  background: var(--perg-bg-panel);
  color: var(--perg-text);
  border: 1px solid var(--perg-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-toggle:hover, .btn-edit:hover {
  background: var(--perg-accent);
  color: var(--perg-bg);
}

.btn-delete {
  width: 28px;
  height: 28px;
  background: var(--perg-error);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.8rem;
  color: var(--perg-accent);
  text-transform: uppercase;
  font-weight: bold;
}

.input-field {
  background: var(--perg-bg);
  border: 2px solid var(--perg-border);
  border-radius: 6px;
  padding: 0.75rem;
  color: var(--perg-text);
  font-size: 0.9rem;
}

.input-field:focus {
  outline: none;
  border-color: var(--perg-accent);
}

.price-info {
  color: var(--perg-text-secondary);
  font-size: 0.8rem;
}

.price-info strong {
  color: var(--perg-accent);
}

.textarea {
  min-height: 80px;
  resize: vertical;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--perg-text);
  font-size: 0.9rem;
}

.form-section {
  border-top: 1px dashed var(--perg-border);
  padding-top: 1rem;
}

.form-section h5 {
  margin: 0 0 0.75rem 0;
  color: var(--perg-accent);
  font-size: 0.9rem;
}

.imagen-upload {
  width: 100%;
  max-width: 200px;
}

.imagen-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--perg-accent);
}

.imagen-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-quitar-imagen {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: var(--perg-error);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.imagen-placeholder {
  width: 100%;
  aspect-ratio: 16/9;
  background: var(--perg-bg);
  border: 2px dashed var(--perg-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.imagen-placeholder:hover {
  border-color: var(--perg-accent);
  background: var(--perg-bg-panel);
}

.imagen-placeholder .placeholder-icon {
  font-size: 2rem;
}

.imagen-placeholder .placeholder-text {
  font-size: 0.75rem;
  color: var(--perg-text-secondary);
}

.imagen-input-hidden {
  display: none;
}

.selected-products {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.product-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--perg-bg);
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--perg-border);
}

.prod-name {
  flex: 1;
  font-size: 0.85rem;
  color: var(--perg-text);
}

.prod-qty {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.qty-input {
  width: 50px;
  padding: 0.25rem;
  background: var(--perg-bg-panel);
  border: 1px solid var(--perg-border);
  border-radius: 4px;
  color: var(--perg-text);
  text-align: center;
  font-size: 0.8rem;
}

.qty-unit {
  font-size: 0.7rem;
  color: var(--perg-text-secondary);
}

.btn-remove-prod {
  width: 24px;
  height: 24px;
  background: var(--perg-error);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-product {
  display: flex;
  gap: 0.5rem;
}

.product-select {
  flex: 1;
  padding: 0.75rem;
  background: var(--perg-bg);
  border: 2px dashed var(--perg-border);
  border-radius: 6px;
  color: var(--perg-text);
  font-size: 0.85rem;
  cursor: pointer;
}

.product-select:focus {
  outline: none;
  border-color: var(--perg-accent);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--perg-border);
}

.btn-cancel {
  flex: 1;
  padding: 0.75rem;
  background: var(--perg-bg);
  color: var(--perg-text);
  border: 2px solid var(--perg-border);
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save {
  flex: 2;
  padding: 0.75rem;
  background: linear-gradient(135deg, var(--perg-success) 0%, color-mix(in srgb, var(--perg-success) 60%, black) 100%);
  color: white;
  border: 2px solid var(--perg-border);
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.35); backdrop-filter: blur(6px); display: grid; place-items: center; padding: 1rem; }

@media (max-width: 600px) {
  .crud-panel {
    max-height: 100vh;
    border-radius: 0;
  }

  .promo-grid {
    grid-template-columns: 1fr;
  }

  .tabs {
    font-size: 0.85rem;
  }
}

.gramaje-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.gramaje-modal {
  background: var(--perg-bg-panel);
  border-radius: 18px;
  width: 100%;
  max-width: 360px;
  overflow: hidden;
  animation: popIn 200ms ease-out;
}

.gramaje-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: transparent;
  border-bottom: 2px solid color-mix(in srgb, var(--perg-accent) 25%, transparent);
}

.gramaje-header h4 {
  margin: 0;
  font-family: 'Palatino Linotype', serif;
  font-size: 1rem;
  color: var(--perg-accent);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 900;
}

.btn-close-gramaje {
  width: 28px;
  height: 28px;
  background: var(--perg-error);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gramaje-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.gramaje-info {
  background: var(--perg-bg);
  border: 1px solid var(--perg-border);
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
}

.producto-nombre {
  margin: 0 0 0.25rem 0;
  color: var(--perg-accent);
  font-weight: bold;
  font-size: 0.95rem;
}

.producto-precio {
  margin: 0;
  color: var(--perg-text-secondary);
  font-size: 0.8rem;
}

.gramaje-input-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.gramaje-input-section label {
  font-size: 0.8rem;
  color: var(--perg-text-secondary);
  text-transform: uppercase;
  font-weight: bold;
}

.gramaje-input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.gramaje-input {
  flex: 1;
  background: var(--perg-bg);
  border: 2px solid var(--perg-border);
  border-radius: 8px;
  padding: 0.75rem;
  color: var(--perg-text);
  font-size: 1.2rem;
  font-weight: bold;
  text-align: center;
}

.gramaje-input:focus {
  outline: none;
  border-color: var(--perg-accent);
}

.gramaje-unit {
  font-size: 1.2rem;
  color: var(--perg-accent);
  font-weight: bold;
}

.gramaje-quick-btns {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.gramaje-quick-btns button {
  padding: 0.5rem;
  background: var(--perg-bg);
  border: 1px solid var(--perg-border);
  border-radius: 6px;
  color: var(--perg-text);
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.gramaje-quick-btns button:hover {
  background: var(--perg-accent);
  color: var(--perg-bg);
}

.gramaje-subtotal {
  text-align: center;
  color: var(--perg-success);
  font-weight: bold;
  font-size: 0.9rem;
  margin: 0;
}

.gramaje-display {
  font-size: 0.75rem;
  color: var(--perg-text-secondary);
  margin-left: 0.25rem;
}

.gramaje-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 2px solid color-mix(in srgb, var(--perg-accent) 25%, transparent);
}

.btn-cancelar {
  flex: 1;
  padding: 0.75rem;
  background: var(--perg-bg);
  color: var(--perg-text);
  border: 2px solid var(--perg-border);
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirmar {
  flex: 1;
  padding: 0.75rem;
  background: linear-gradient(135deg, var(--perg-success) 0%, color-mix(in srgb, var(--perg-success) 60%, black) 100%);
  color: white;
  border: 2px solid var(--perg-border);
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirmar:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.btn-confirmar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Pergamino styles consolidated */

/* Todos los h2 y h3 dentro de modales pergamino usan café oscuro */

/* Overlay */

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Pergamino container */
@keyframes popIn {
  from { opacity: 0; transform: scale(0.93); }
  to { opacity: 1; transform: scale(1); }
}

/* Rollo edges (top / bottom) */
/* Reveal content (vertical unroll) */
/* Pergamino inner content */

.pos-container .close-btn {
  background: none;
  border: 2px solid var(--perg-border);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--perg-text-secondary);
  transition: all 0.2s ease;
  padding: 0;
  text-shadow: 0 1px 2px rgba(40, 20, 10, 0.2);
}

.pos-container .close-btn:hover {
  color: var(--perg-text);
  border-color: var(--perg-accent);
  background: color-mix(in srgb, var(--perg-accent) 10%, transparent);
}

/* Responsive */

</style>

