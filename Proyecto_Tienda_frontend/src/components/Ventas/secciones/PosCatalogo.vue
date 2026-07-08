<script setup lang="ts">
import { formatoMoneda, obtenerIniciales } from '../logica/usePosTicket';
import { esCategoriaGaming } from '../logica/usePosProductos';
import CarruselPromociones from '../modales/CarruselPromociones.vue';
import type { Producto } from '../logica/usePosTipos';

defineProps<{
  productosAccesoRapido: Producto[];
  productosParaMostrar: Producto[];
  promocionesActivas: any[];
  terminoBusqueda: string;
  categoriaFiltro: number | null;
  categorias: { idCategoria: number; nombre: string }[];
  provisionSemanalTotal: number;
  provisionStatusClass: Record<string, boolean>;
  sugerenciasPorNombre: Producto[];
  sugerenciasVisibles: boolean;
  indiceSugerenciaActiva: number;
  isRecording: boolean;
}>();

const emit = defineEmits<{
  'update:terminoBusqueda': [val: string];
  'update:categoriaFiltro': [val: number | null];
  'focus-busqueda': [];
  'input-busqueda': [];
  'ocultar-sugerencias': [];
  'keydown-sugerencias': [event: KeyboardEvent];
  'agregar-desde-buscador': [];
  'seleccionar-sugerencia': [producto: Producto];
  'agregar-producto': [producto: Producto];
  'agregar-promocion': [promocion: any];
  'abrir-promociones': [];
  'start-scanner': [];
  'start-voice-command': [];
}>();
</script>

<template>
  <section class="pos-center catalog-section">
    <!-- BARRA DE TICKETS HORIZONTAL (para tablets y móviles) -->
    <div class="tickets-bar-mobile">
      <div class="tickets-bar-scroll custom-scrollbar">
        <!-- tickets bar content would be provided by parent -->
      </div>
    </div>

    <header class="catalog-header">
      <div class="search-bar-pos">
        <div class="input-wrapper">
          <span class="search-icon">🔍</span>
          <input
            :value="terminoBusqueda"
            type="text"
            placeholder="Buscar por nombre o código..."
            @focus="emit('focus-busqueda')"
            @input="emit('input-busqueda'); emit('update:terminoBusqueda', ($event.target as HTMLInputElement).value)"
            @blur="emit('ocultar-sugerencias')"
            @keydown="emit('keydown-sugerencias', $event)"
            @keydown.enter.prevent="emit('agregar-desde-buscador')"
          >
          <select
            :value="categoriaFiltro"
            class="category-filter-select"
            @change="emit('update:categoriaFiltro', ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)"
          >
            <option :value="null">Todas</option>
            <option v-for="cat in categorias" :key="cat.idCategoria" :value="cat.idCategoria">
              {{ cat.nombre }}
            </option>
          </select>
          <div class="action-tools">
            <button class="tool-btn btn-promo" @click="emit('abrir-promociones')" title="Gestionar Promociones">⚔</button>
            <button class="tool-btn btn-scan" @click="emit('start-scanner')" title="Escanear">📷</button>
            <button class="tool-btn btn-mic" :class="{ 'is-recording': isRecording }" @mousedown.prevent="emit('start-voice-command')">🎤</button>
          </div>
        </div>
      </div>
      <div v-if="provisionSemanalTotal > 0" class="provision-total-badge" :class="provisionStatusClass">
        <span class="provision-label">Total por apartar (7 días)</span>
        <span class="provision-amount">{{ formatoMoneda(provisionSemanalTotal) }}</span>
      </div>
    </header>

    <!-- ÁREA DE PRODUCTOS RÁPIDOS / RESULTADOS -->
    <div class="catalog-grid custom-scrollbar">
      <div class="catalog-items-container">
        <div class="carousel-wrapper" v-if="promocionesActivas.length > 0 && !terminoBusqueda && categoriaFiltro === null">
          <CarruselPromociones
            :promociones="promocionesActivas"
            @agregar="emit('agregar-promocion', $event)"
          />
        </div>

        <!-- Productos de Acceso Rápido (códigos 1-2 dígitos) -->
        <div v-if="productosAccesoRapido.length > 0 && !terminoBusqueda && categoriaFiltro === null" class="acceso-rapido-section">
          <h3 class="acceso-rapido-title">
            <span class="title-icon">⚡</span>
            <span class="title-text">Productos de Acceso Rápido</span>
          </h3>
          <div class="acceso-rapido-grid">
            <button
              v-for="p in productosAccesoRapido"
              :key="p.id"
              class="acceso-rapido-btn clickable animate-pop-in"
              @click="emit('agregar-producto', p)"
              :title="`${p.nombre} - Código: ${p.codigo_barras}`"
            >
              <span class="acceso-code">{{ p.codigo_barras }}</span>
              <span class="acceso-name">{{ p.nombre }}</span>
              <span class="acceso-price">{{ formatoMoneda(p.precio) }}</span>
            </button>
          </div>
        </div>

        <!-- Mostrar todos los productos disponibles -->
        <div v-if="productosParaMostrar.length > 0" class="products-grid">
          <article
            v-for="p in productosParaMostrar"
            :key="p.id"
            class="product-card clickable animate-pop-in"
            @click="emit('agregar-producto', p)"
          >
            <div class="card-glow"></div>
            <div class="product-icon">📦</div>
            <div class="product-details">
              <h4 class="product-name">{{ p.nombre }}</h4>
              <div class="product-price-tag">{{ formatoMoneda(p.precio) }}</div>
            </div>
            <div class="stock-badge" :class="esCategoriaGaming(p.dto?.idCategoria) ? 'rentable' : (p.dto?.stock ?? 0) > 5 ? 'in-stock' : 'low-stock'">
              <template v-if="esCategoriaGaming(p.dto?.idCategoria)">🎮 Rentable</template>
              <template v-else>Stock: {{ p.dto?.stock ?? '∞' }}</template>
            </div>
          </article>
        </div>

        <div v-else class="empty-catalog">
          <span class="empty-icon">🏺</span>
          <p>No hay productos disponibles</p>
        </div>
      </div>
    </div>
  </section>
</template>
