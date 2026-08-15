<script setup lang="ts">

import { formatoMoneda, obtenerIniciales } from '../logica/usePosTicket';
import { esCategoriaGaming } from '../logica/usePosProductos';
import { montoHoy } from '@/composables/useAjustePrecio';
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
  ticketInfoText: string;
  totalVenta: number;
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
  'nuevo-ticket': [];
  'abrir-pendientes': [];
  'abrir-creditos': [];
  'toggle-ticket-mobile': [];
}>();
</script>

<template>
  <section class="pos-center catalog-section">
    <!-- BARRA DE TICKETS HORIZONTAL (para tablets y móviles) -->
    <div class="tickets-bar-mobile">
      <button class="tm-btn tm-btn-new" @click="emit('nuevo-ticket')" title="Nuevo ticket">＋</button>
      <button class="tm-btn tm-btn-pending" @click="emit('abrir-pendientes')" title="Pendientes">📋</button>
      <button class="tm-btn tm-btn-credits" @click="emit('abrir-creditos')" title="Créditos">👤</button>
      <button class="tm-btn tm-btn-toggle" @click="emit('toggle-ticket-mobile')" title="Ver ticket">
        <span class="tm-toggle-icon">🛒</span>
        <span class="tm-toggle-text">{{ ticketInfoText }}</span>
        <span class="tm-toggle-total">{{ formatoMoneda(totalVenta) }}</span>
      </button>
    </div>

    <header class="catalog-header">
      <div class="search-bar-pos">
        <div class="search-input-row">
          <span class="pos-search-icon">🔍</span>
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
        </div>
        <div class="search-controls-row">
          <span class="select-wrap">
            <select
              :value="categoriaFiltro ?? ''"
              class="category-filter-select"
              @change="emit('update:categoriaFiltro', ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)"
            >
              <option value="">Todas</option>
              <option v-for="cat in categorias" :key="cat.idCategoria" :value="cat.idCategoria">
                {{ cat.nombre }}
              </option>
            </select>
          </span>
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
      <div v-if="montoHoy > 0" class="ajuste-hoy-badge">
        <span class="ajuste-hoy-label">Hoy aplica</span>
        <span class="ajuste-hoy-amount">+{{ formatoMoneda(montoHoy) }}</span>
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
              class="acceso-rapido-btn clickable"
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
            class="product-card clickable"
            @click="emit('agregar-producto', p)"
          >
            <div class="product-icon">📦</div>
            <div class="product-details">
              <h4 class="pos-product-name">{{ p.nombre }}</h4>
              <div class="product-price-tag">{{ formatoMoneda(p.precio) }}</div>
            </div>
            <div class="stock-badge" :class="esCategoriaGaming(p.dto?.idCategoria) ? 'rentable' : (p.dto?.stock ?? 0) > 5 ? 'in-stock' : 'pos-low-stock'">
              <template v-if="esCategoriaGaming(p.dto?.idCategoria)">🎮 Rentable</template>
              <template v-else>Stock: {{ p.dto?.stock ?? '∞' }}</template>
            </div>
          </article>
        </div>

        <div v-else class="empty-catalog">
          <span class="pos-empty-icon">🏺</span>
          <p>No hay productos disponibles</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pos-container .pos-center {
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
}

/* Estilos barra tickets móvil */
.pos-container .tickets-bar-mobile{display:none;align-items:center;gap:.35rem;padding:.4rem .6rem;background:var(--color-bg-secondary);border-bottom:none;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.pos-container .tm-btn{border:none;border-radius:8px;cursor:pointer;font-size:.85rem;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;white-space:nowrap;box-shadow:2px 2px 4px rgba(0,0,0,.08)}
.pos-container .tm-btn-new{width:32px;height:32px;background:var(--color-accent);color:var(--color-on-brand);font-size:1.2rem;font-weight:700}
.pos-container .tm-btn-pending,.pos-container .tm-btn-credits{width:32px;height:32px;background:var(--color-bg-primary);font-size:.9rem}
.pos-container .tm-btn-toggle{flex:1;height:32px;padding:.3rem .6rem;gap:.4rem;background:var(--color-bg-primary);color:var(--color-text-primary);font-size:.72rem;justify-content:flex-start}
.pos-container .tm-toggle-icon{font-size:.9rem;flex-shrink:0}
.pos-container .tm-toggle-text{font-weight:600;overflow:hidden;text-overflow:ellipsis}
.pos-container .tm-toggle-total{margin-left:auto;font-weight:700;color:var(--color-success);font-family:monospace}

@media(max-width:991px){.pos-container .tickets-bar-mobile{display:flex}}
@media(max-width:400px){.pos-container .tm-btn{font-size:.75rem}.pos-container .tm-btn-new,.pos-container .tm-btn-pending,.pos-container .tm-btn-credits{width:28px;height:28px}.pos-container .tm-btn-toggle{height:28px;font-size:.68rem}}

.pos-container .catalog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

.pos-container .search-bar-pos {
  flex: 1;
}

.pos-container .provision-total-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid;
  min-width: 160px;
  text-align: right;
}

.pos-container .provision-total-badge.status-ok {
  background: color-mix(in srgb, var(--success-color) 8%, transparent);
  border-color: var(--success-color, var(--success-color));
  color: var(--success-color, var(--success-color));
}

.pos-container .provision-total-badge.status-warning {
  background: color-mix(in srgb, var(--infoBlueColor) 8%, transparent);
  border-color: var(--info-color, var(--infoBlueColor));
  color: var(--info-color, var(--infoBlueColor));
}

.pos-container .provision-total-badge.status-danger {
  background: color-mix(in srgb, var(--error-color) 8%, transparent);
  border-color: var(--error-color, var(--error-color));
  color: var(--error-color, var(--error-color));
}

.pos-container .provision-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  opacity: 0.8;
}

.pos-container .provision-amount {
  font-size: 1rem;
  font-weight: 700;
}

.pos-container .ajuste-hoy-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--warning-color, var(--warning-color));
  background: color-mix(in srgb, var(--warning-color) 10%, transparent);
  color: var(--warning-color, var(--warning-color));
  min-width: 110px;
  text-align: right;
}

.pos-container .ajuste-hoy-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  opacity: 0.85;
}

.pos-container .ajuste-hoy-amount {
  font-size: 1rem;
  font-weight: 700;
}

.pos-container .pos-hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.pos-container .pos-hero-section::after {
  content: '❧';
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.2rem;
  color: var(--accent-color);
  opacity: 0.3;
}

.pos-container .hero-decorations {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.pos-container .deco-left, .pos-container .deco-right {
  font-size: 1.5rem;
  color: var(--accent-color);
  opacity: 0.5;
  animation: sparkle 2s ease-in-out infinite;
}

.pos-container .deco-center {
  font-size: 2rem;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

@keyframes pulse-glow {
  0%, 100% { filter: drop-shadow(0 0 5px var(--accent-color)); transform: scale(1); }
  50% { filter: drop-shadow(0 0 15px var(--accent-color)); transform: scale(1.05); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes linkWalk {
  0% { transform: translateX(-100px); opacity: 1; }
  100% { transform: translateX(calc(100vw + 100px)); opacity: 1; }
}

@keyframes linkSwing {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes linkSwing2 {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

@keyframes octoWalk {
  0% { transform: translateX(-100px); }
  100% { transform: translateX(calc(100vw + 100px)); }
}

@keyframes octoSwing {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes octoSwing2 {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

.pos-container .catalog-header {
  padding: 1rem 1.5rem;
  background: linear-gradient(to bottom, var(--bg-secondary), var(--bg-primary));
  border-bottom: var(--border-width) solid var(--border-color);
}

.pos-container .search-bar-pos {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.pos-container .search-input-row {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.4rem 0.7rem;
  gap: 0.5rem;
  box-sizing: border-box;
}

.pos-container .search-input-row:focus-within {
  border-color: var(--accent-color);
}

.pos-container .search-input-row input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1rem;
  outline: none;
}

.pos-container .search-input-row input::placeholder {
  color: var(--text-secondary);
}

.pos-container .search-controls-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.35rem;
}

.pos-container .select-wrap {
  position: relative;
  display: inline-flex;
}

.pos-container .select-wrap::after {
  content: '▾';
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-primary);
  font-size: 0.7rem;
  pointer-events: none;
  z-index: 1;
}

.pos-container .category-filter-select {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.35rem 1.8rem 0.35rem 0.5rem;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  appearance: none;
  min-width: 100px;
  max-width: 150px;
}

.pos-container .category-filter-select:focus {
  outline: none;
  border-color: var(--accent-color);
}

.pos-container .category-filter-select option {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.pos-container .action-tools {
  display: flex;
  gap: 0.35rem;
  margin-left: auto;
}

.pos-container .tool-btn {
  background: var(--color-bg-secondary);
  border: none;
  border-radius: var(--radius-sm);
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  color: var(--color-text-secondary);
  box-shadow:
    3px 3px 6px rgba(0, 0, 0, 0.15),
    -2px -2px 4px rgba(255, 255, 255, 0.02);
}

.pos-container .tool-btn:hover {
  color: var(--color-accent);
  box-shadow:
    5px 5px 10px rgba(0, 0, 0, 0.2),
    -3px -3px 6px rgba(255, 255, 255, 0.03);
  transform: translateY(-1px);
}

.pos-container .tool-btn:active {
  box-shadow:
    inset 2px 2px 4px rgba(0, 0, 0, 0.15),
    inset -1px -1px 3px rgba(255, 255, 255, 0.02);
  transform: scale(0.95);
}

.pos-container .btn-mic.is-recording {
  background: var(--error-color);
  color: var(--text-primary);
}

.pos-container .btn-promo:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: var(--bg-primary);
}

@media (max-width: 767px) {
  .pos-container .search-input-row {
    padding: 0.4rem 0.6rem;
    gap: 0.4rem;
  }
  .pos-container .search-input-row input {
    font-size: 1rem;
  }
  .pos-container .category-filter-select {
    min-width: 80px;
    max-width: 120px;
    font-size: 0.75rem;
    padding: 0.3rem 1.5rem 0.3rem 0.5rem;
  }
  .pos-container .select-wrap::after {
    right: 6px;
    font-size: 0.65rem;
  }
  .pos-container .search-controls-row {
    gap: 0.35rem;
  }
  .pos-container .tool-btn {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
  }
  .pos-container .catalog-header {
    flex-direction: column;
    align-items: stretch;
  }
  .pos-container .provision-total-badge {
    align-items: center;
    text-align: center;
    min-width: auto;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .pos-container .search-input-row {
    padding: 0.3rem 0.5rem;
    gap: 0.3rem;
  }
  .pos-container .pos-search-icon {
    font-size: 0.85rem;
  }
  .pos-container .search-input-row input {
    font-size: 0.9rem;
  }
  .pos-container .search-controls-row {
    gap: 0.3rem;
    margin-top: 0.3rem;
  }
  .pos-container .category-filter-select {
    min-width: 0;
    max-width: none;
    flex: 1;
    font-size: 0.7rem;
    padding: 0.25rem 1.4rem 0.25rem 0.4rem;
  }
  .pos-container .select-wrap::after {
    font-size: 0.55rem;
    right: 5px;
  }
  .pos-container .action-tools {
    gap: 0.2rem;
    margin-left: 0;
  }
  .pos-container .tool-btn {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
  }
  .pos-container .catalog-header {
    padding: 0.5rem 0.4rem;
  }
}

/* Sugerencias */
.pos-container .search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--accent-color);
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 100;
}

.pos-container .result-item {
  width: 100%;
  padding: 0.7rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.pos-container .result-item:last-child {
  border-bottom: none;
  border-radius: 0 0 8px 8px;
}

.pos-container .result-item:hover, .pos-container .result-item.is-active { 
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-secondary)); 
}

.pos-container .res-info { display: flex; flex-direction: column; gap: 2px; }
.pos-container .res-name { font-weight: 600; font-size: 0.95rem; }
.pos-container .res-code { font-size: 0.75rem; color: var(--text-secondary); }
.pos-container .res-price { 
  color: var(--success-color); 
  font-weight: bold; 
  font-size: 1rem;
}

/* GRID DE PRODUCTOS */
.pos-container .catalog-grid {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-height: 0;
}

@media (min-width: 1600px) {
  .pos-container .catalog-grid {
    max-width: 1400px;
    margin: 0 auto;
  }
}

@media (max-width: 991px) {
  .pos-container .catalog-grid {
    padding: 1rem;
  }
}

@media (max-width: 767px) {
  .pos-container .catalog-grid {
    padding: 0.75rem;
    min-height: 0;
    flex: 1;
  }
  .pos-container .catalog-items-container {
    padding: 0;
    min-height: 0;
  }
}

.pos-container .catalog-items-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.pos-container .carousel-wrapper {
  margin: 0.25rem 0.5rem;
}

@media (max-width: 991px) {
  .pos-container .carousel-wrapper {
    margin: 0.2rem 0.3rem;
  }
}

@media (max-width: 600px) {
  .pos-container .carousel-wrapper {
    margin: 0.15rem 0.2rem;
  }
}

@media (max-width: 400px) {
  .pos-container .carousel-wrapper {
    margin: 0.1rem 0.15rem;
  }
}

.pos-container .products-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.8rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

@media (max-width: 991px) {
  .pos-container .products-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 767px) {
  .pos-container .products-grid {
    gap: 0.5rem;
  }
}

@media (max-width: 400px) {
  .pos-container .products-grid {
    grid-template-columns: repeat(1, 1fr);
    gap: 0.4rem;
  }
  .pos-container .product-card {
    padding: 0.5rem;
    gap: 0.3rem;
  }
}

.pos-container .product-card {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  position: relative;
  transition: all 0.15s;
  cursor: pointer;
  box-sizing: border-box;
  border: none;
  box-shadow:
    4px 4px 8px rgba(0, 0, 0, 0.2),
    -2px -2px 6px rgba(255, 255, 255, 0.02);
}

@media (max-width: 767px) {
  .pos-container .product-card {
    padding: 0.6rem;
    border-radius: var(--radius-md);
    gap: 0.4rem;
  }
}

.pos-container .product-card:hover {
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-secondary));
  box-shadow:
    6px 6px 14px rgba(0, 0, 0, 0.25),
    -3px -3px 8px rgba(255, 255, 255, 0.03);
  transform: translateY(-2px);
}

.pos-container .product-card:active {
  transform: scale(0.97);
  box-shadow:
    inset 3px 3px 6px rgba(0, 0, 0, 0.15),
    inset -2px -2px 4px rgba(255, 255, 255, 0.02);
}

.pos-container .product-icon { 
  font-size: 2.5rem; 
  transition: transform 0.15s;
}

.pos-container .product-card:hover .product-icon {
  transform: scale(1.05);
}

.pos-container .pos-product-name { 
  font-size: 0.9rem; 
  font-weight: 600; 
  line-height: 1.2; 
  overflow: hidden;
  color: var(--text-primary);
}

.pos-container .product-price-tag {
  background: var(--success-color);
  color: var(--text-primary);
  padding: 0.25rem 0.7rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  font-family: "Courier New", monospace;
}

.pos-container .stock-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
}
.pos-container .in-stock { background: color-mix(in srgb, var(--success-color) 15%, transparent); color: var(--success-color); }
.pos-container .pos-low-stock { background: color-mix(in srgb, var(--error-color) 15%, transparent); color: var(--error-color); }
.pos-container .stock-badge.rentable { background: color-mix(in srgb, var(--infoBlueColor) 15%, transparent); color: color-mix(in srgb, var(--infoBlueColor) 60%, white); }

.acceso-rapido-section {
  padding: 1rem;
  margin-bottom: 0.5rem;
}

.acceso-rapido-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.6rem 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-color);
  text-transform: uppercase;
}

.acceso-rapido-title .title-icon {
  font-size: 1rem;
}

.acceso-rapido-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.5rem;
}

.acceso-rapido-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.5rem 0.4rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  overflow: hidden;
  color: var(--text-primary);
}

.acceso-rapido-btn:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 8%, var(--bg-secondary));
}

.acceso-rapido-btn:active {
  transform: scale(0.97);
}

.acceso-code {
  display: inline-block;
  padding: 0.1rem 0.35rem;
  background: var(--accent-color);
  color: var(--bg-primary);
  border-radius: 3px;
  font-size: 0.8rem;
  font-weight: 700;
  font-family: monospace;
}

.acceso-name {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  line-height: 1.2;
}

.acceso-price {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--success-color);
  font-family: monospace;
}
</style>
