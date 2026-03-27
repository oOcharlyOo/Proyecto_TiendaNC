<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

let autoPlayTimer: ReturnType<typeof setInterval> | null = null;

function startAutoPlay() {
  if (autoPlayTimer) clearInterval(autoPlayTimer);
  autoPlayTimer = setInterval(() => {
    next();
  }, 6000);
}

function stopAutoPlay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
}

onMounted(() => {
  if (props.promociones.length > 1) {
    startAutoPlay();
  }
});

onUnmounted(() => {
  stopAutoPlay();
});

type PromocionDetalleDTO = {
  id_detalle?: number;
  id_producto: number;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

type PromocionDTO = {
  id_promocion: number;
  nombre: string;
  descripcion: string;
  precio_original: number;
  precio_promocion: number;
  imagen_url: string | null;
  activa: boolean;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  detalles: PromocionDetalleDTO[];
};

const props = defineProps<{
  promociones: PromocionDTO[];
}>();

watch(() => props.promociones.length, (newLen) => {
  if (newLen > 1) {
    startAutoPlay();
  } else {
    stopAutoPlay();
  }
});

const emit = defineEmits<{
  (event: 'agregar', promocion: any): void;
}>();

const currentIndex = ref(0);
const isAnimating = ref(false);
const isHovering = ref(false);

const totalSlides = computed(() => props.promociones.length);
const currentPromocion = computed(() => props.promociones[currentIndex.value] || null);

const precioOriginalReal = computed(() => {
  if (!currentPromocion.value) return 0;
  return currentPromocion.value.detalles.reduce((sum, d) => sum + Number(d.subtotal || 0), 0);
});

const descuento = computed(() => {
  if (!currentPromocion.value) return 0;
  const original = precioOriginalReal.value;
  const promo = Number(currentPromocion.value.precio_promocion);
  if (original <= 0) return 0;
  return Math.round(((original - promo) / original) * 100);
});

function next() {
  if (isAnimating.value || totalSlides.value <= 1) return;
  isAnimating.value = true;
  stopAutoPlay();
  setTimeout(() => {
    currentIndex.value = (currentIndex.value + 1) % totalSlides.value;
    isAnimating.value = false;
    if (!isHovering.value) startAutoPlay();
  }, 400);
}

function prev() {
  if (isAnimating.value || totalSlides.value <= 1) return;
  isAnimating.value = true;
  stopAutoPlay();
  setTimeout(() => {
    currentIndex.value = (currentIndex.value - 1 + totalSlides.value) % totalSlides.value;
    isAnimating.value = false;
    if (!isHovering.value) startAutoPlay();
  }, 400);
}

function goTo(index: number) {
  if (isAnimating.value || index === currentIndex.value) return;
  isAnimating.value = true;
  stopAutoPlay();
  setTimeout(() => {
    currentIndex.value = index;
    isAnimating.value = false;
    if (!isHovering.value) startAutoPlay();
  }, 400);
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(valor);
}

function formatearCantidad(cantidad: number): string {
  if (cantidad >= 1000) {
    return (cantidad / 1000).toFixed(1) + 'kg';
  }
  if (cantidad === 1) {
    return cantidad + 'pza';
  }
  return cantidad + 'g';
}

function agregarPromocion() {
  if (currentPromocion.value) {
    emit('agregar', currentPromocion.value);
  }
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
  <section 
    v-if="promociones.length > 0" 
    class="promo-carousel"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <div class="hero-section">
      <div class="hero-decor left">❧</div>
      <div class="hero-content">
        <span class="hero-icon">⚔</span>
        <h3 class="hero-title">Agrupaciones del Reino</h3>
        <span class="hero-subtitle">Ofertas épicas para heroes valientes</span>
      </div>
      <div class="hero-decor right">❧</div>
    </div>

    <div class="carousel-container">
      <Transition name="slide" mode="out-in">
        <article :key="currentIndex" class="promo-card animate-pop-in">
          <div class="card-badge-container" v-if="descuento > 0">
            <div class="card-badge">
              <span class="badge-icon">❧</span>
              <span class="badge-text">-{{ descuento }}%</span>
            </div>
          </div>

          <div class="card-inner">
            <div class="card-image">
              <div class="image-frame">
                <img 
                  :src="formatImagenUrl(currentPromocion?.imagen_url)" 
                  alt="Promoción" 
                  class="promo-img" 
                  @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; }"
                >
                <div v-if="!currentPromocion?.imagen_url" class="image-placeholder">
                  <span class="placeholder-icon">📦</span>
                  <span class="placeholder-text">Tesoro</span>
                </div>
              </div>
              <div class="image-glow"></div>
            </div>

            <div class="card-content">
              <header class="content-header">
                <h4 class="promo-name">{{ currentPromocion?.nombre }}</h4>
                <p class="promo-description">{{ currentPromocion?.descripcion }}</p>
              </header>

              <div class="promo-products">
                <h5 class="products-title">
                  <span class="title-icon">❧</span>
                  Incluye:
                </h5>
                <ul class="products-list">
                  <li v-for="detalle in currentPromocion?.detalles" :key="detalle.id_detalle" class="product-item">
                    <span class="product-qty">{{ formatearCantidad(detalle.cantidad) }}</span>
                    <span class="product-name">{{ detalle.nombre_producto }}</span>
                  </li>
                </ul>
              </div>

              <footer class="content-footer">
                <div class="promo-pricing">
                  <span class="price-original">{{ formatoMoneda(precioOriginalReal) }}</span>
                  <div class="price-promo-container">
                    <span class="price-promo">{{ formatoMoneda(Number(currentPromocion?.precio_promocion)) }}</span>
                  </div>
                </div>

                <button class="btn-agregar" @click="agregarPromocion">
                  <span class="btn-icon">⚔</span>
                  <span class="btn-text">Añadir al Ticket</span>
                  <span class="btn-decor">❧</span>
                </button>
              </footer>
            </div>
          </div>
        </article>
      </Transition>

      <button v-if="totalSlides > 1" class="carousel-btn prev" @click="prev" aria-label="Anterior">
        <span class="btn-arrow">❮</span>
      </button>
      <button v-if="totalSlides > 1" class="carousel-btn next" @click="next" aria-label="Siguiente">
        <span class="btn-arrow">❯</span>
      </button>
    </div>

    <div class="carousel-footer">
      <div class="carousel-dots" v-if="totalSlides > 1">
        <button
          v-for="(_, index) in promociones"
          :key="index"
          class="dot"
          :class="{ active: index === currentIndex }"
          @click="goTo(index)"
          :aria-label="`Ir a promoción ${index + 1}`"
        ></button>
      </div>
      <div class="carousel-counter">
        <span class="counter-current">{{ currentIndex + 1 }}</span>
        <span class="counter-sep">/</span>
        <span class="counter-total">{{ totalSlides }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.promo-carousel {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, color-mix(in srgb, var(--bg-primary) 90%, var(--accent-color)) 100%);
  border: 3px solid var(--accent-color);
  border-radius: 16px;
  padding: 1rem;
  margin: 0.5rem;
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 4px 20px var(--shadow-color),
    inset 0 1px 0 color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.promo-carousel::before {
  content: "❧";
  position: absolute;
  top: 12px;
  left: 12px;
  font-size: 1.5rem;
  color: var(--accent-color);
  opacity: 0.4;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 2px 4px var(--shadow-color));
}

.promo-carousel::after {
  content: "❧";
  position: absolute;
  bottom: 12px;
  right: 12px;
  font-size: 1.5rem;
  color: var(--accent-color);
  opacity: 0.4;
  transform: rotate(180deg);
  animation: float 3s ease-in-out infinite reverse;
  filter: drop-shadow(0 2px 4px var(--shadow-color));
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-5px) rotate(5deg); }
}

.hero-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px dashed var(--border-color);
}

.hero-decor {
  font-size: 1.5rem;
  color: var(--accent-color);
  opacity: 0.6;
  filter: drop-shadow(0 2px 4px var(--shadow-color));
}

.hero-decor.left { animation: sparkle-left 2s ease-in-out infinite; }
.hero-decor.right { animation: sparkle-right 2s ease-in-out infinite; }

@keyframes sparkle-left {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

@keyframes sparkle-right {
  0%, 100% { opacity: 0.4; transform: scale(1) rotate(180deg); }
  50% { opacity: 0.8; transform: scale(1.1) rotate(185deg); }
}

.hero-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.hero-icon {
  font-size: 1.8rem;
  animation: pulse-glow 2s ease-in-out infinite;
  filter: drop-shadow(0 2px 8px var(--accent-color));
}

@keyframes pulse-glow {
  0%, 100% { filter: drop-shadow(0 0 5px var(--accent-color)); }
  50% { filter: drop-shadow(0 0 15px var(--accent-color)); }
}

.hero-title {
  font-family: 'HyliaSerifBeta', serif;
  color: var(--accent-color);
  font-size: 1.2rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin: 0;
  text-shadow: 2px 2px 0 var(--shadow-color);
  filter: drop-shadow(0 1px 2px var(--shadow-color));
}

.hero-subtitle {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-style: italic;
}

.carousel-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
}

.promo-card {
  width: 100%;
  max-width: 700px;
  position: relative;
}

.card-badge-container {
  position: absolute;
  top: -12px;
  right: -12px;
  z-index: 10;
}

.card-badge {
  background: linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #991b1b 100%);
  color: #fef3c7;
  padding: 0.4rem 0.8rem;
  border-radius: 25px;
  font-size: 0.85rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 3px solid #fbbf24;
  box-shadow: 
    0 4px 15px rgba(0, 0, 0, 0.4),
    inset 0 2px 4px rgba(255, 255, 255, 0.2);
  animation: badge-bounce 2s ease-in-out infinite;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
}

@keyframes badge-bounce {
  0%, 100% { transform: scale(1) rotate(-2deg); }
  50% { transform: scale(1.05) rotate(2deg); }
}

.badge-icon {
  font-size: 1rem;
  animation: spin-slow 4s linear infinite;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.card-inner {
  display: flex;
  gap: 1.25rem;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 
    0 8px 30px var(--shadow-color),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.card-image {
  flex-shrink: 0;
  position: relative;
}

.image-frame {
  width: 160px;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  border: 3px solid var(--accent-color);
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 
    inset 0 0 20px rgba(0, 0, 0, 0.3),
    0 4px 15px var(--shadow-color);
  filter: drop-shadow(0 4px 8px var(--shadow-color));
}

.promo-img {
  width: 100%;
  height: 100%;
  object-fit: scale-down;
  transition: transform 0.3s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.promo-card:hover .promo-img {
  transform: scale(1.05);
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
}

.placeholder-icon {
  font-size: 3rem;
  animation: bounce-gentle 2s ease-in-out infinite;
  filter: drop-shadow(0 2px 4px var(--shadow-color));
}

@keyframes bounce-gentle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.placeholder-text {
  font-family: 'HyliaSerifBeta', serif;
  font-size: 0.8rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.image-glow {
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  border-radius: 16px;
  background: linear-gradient(45deg, var(--accent-color), transparent, var(--accent-color));
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s;
  animation: rotate-glow 3s linear infinite;
}

.promo-card:hover .image-glow {
  opacity: 0.3;
}

@keyframes rotate-glow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}

.content-header {
  text-align: center;
}

.promo-name {
  font-family: 'HyliaSerifBeta', serif;
  color: var(--accent-color);
  font-size: 1.3rem;
  margin: 0 0 0.4rem 0;
  text-shadow: 1px 1px 0 var(--shadow-color);
  line-height: 1.2;
  filter: drop-shadow(0 1px 2px var(--shadow-color));
}

.promo-description {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
  font-style: italic;
}

.promo-products {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
}

.products-title {
  font-size: 0.8rem;
  color: var(--accent-color);
  font-weight: bold;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.title-icon {
  font-size: 1rem;
  animation: pulse-glow 2s ease-in-out infinite;
  filter: drop-shadow(0 1px 3px var(--accent-color));
}

.products-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.product-item {
  font-size: 0.8rem;
  background: var(--bg-primary);
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  display: flex;
  gap: 0.6rem;
  align-items: center;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.product-item:hover {
  border-color: var(--accent-color);
  transform: translateX(3px);
}

.product-qty {
  color: var(--success-color);
  font-weight: bold;
  min-width: 50px;
  font-family: "Courier New", monospace;
}

.product-name {
  color: var(--text-primary);
  flex: 1;
}

.content-footer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: auto;
}

.promo-pricing {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.price-original {
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-decoration: line-through;
  opacity: 0.7;
}

.price-promo-container {
  background: linear-gradient(135deg, var(--success-color) 0%, #166534 100%);
  padding: 0.4rem 1rem;
  border-radius: 8px;
  border: 2px solid #4ade80;
  box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
  filter: drop-shadow(0 2px 4px rgba(34, 197, 94, 0.3));
}

.price-promo {
  font-size: 1.4rem;
  font-weight: bold;
  color: white;
  font-family: "Courier New", monospace;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
}

.btn-agregar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: linear-gradient(180deg, var(--accent-color) 0%, #92400e 100%);
  color: var(--bg-primary);
  border: 3px solid var(--border-color);
  border-radius: 10px;
  padding: 0.7rem 1.25rem;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  box-shadow: 0 4px 0 var(--border-color);
  position: relative;
  overflow: hidden;
  filter: drop-shadow(0 4px 0 var(--border-color));
}

.btn-agregar::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

.btn-agregar:hover::before {
  left: 100%;
}

.btn-agregar:hover {
  transform: translateY(-3px);
  box-shadow: 0 7px 0 var(--border-color);
  filter: brightness(1.1) drop-shadow(0 7px 0 var(--border-color));
}

.btn-agregar:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--border-color);
  filter: drop-shadow(0 2px 0 var(--border-color));
}

.btn-icon {
  font-size: 1.2rem;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.btn-decor {
  font-size: 0.8rem;
  opacity: 0.6;
  animation: pulse 1.5s ease-in-out infinite;
}

.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: var(--bg-primary);
  border: 3px solid var(--border-color);
  color: var(--accent-color);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 5;
  box-shadow: 0 3px 10px var(--shadow-color);
  filter: drop-shadow(0 3px 6px var(--shadow-color));
}

.carousel-btn:hover {
  background: var(--accent-color);
  color: var(--bg-primary);
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 5px 15px color-mix(in srgb, var(--accent-color) 40%, transparent);
}

.carousel-btn:active {
  transform: translateY(-50%) scale(0.95);
}

.carousel-btn.prev {
  left: -22px;
}

.carousel-btn.next {
  right: -22px;
}

.btn-arrow {
  font-size: 1.2rem;
  font-weight: bold;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.carousel-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border-color);
}

.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border-color);
  border: 2px solid var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.dot:hover {
  background: var(--accent-color);
  transform: scale(1.2);
}

.dot.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  transform: scale(1.3);
  box-shadow: 0 0 10px var(--accent-color);
  filter: drop-shadow(0 0 6px var(--accent-color));
}

.carousel-counter {
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-family: "Courier New", monospace;
}

.counter-current {
  color: var(--accent-color);
  font-weight: bold;
  font-size: 0.9rem;
}

.counter-sep {
  opacity: 0.5;
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(50px) scale(0.95);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-50px) scale(0.95);
}

.animate-pop-in {
  animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes pop-in {
  0% { opacity: 0; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

/* =========================================
   PANTALLAS GRANDES (1400px+)
   ========================================= */
@media (min-width: 1400px) {
  .promo-carousel {
    max-width: 900px;
    margin: 0.75rem auto;
  }
  
  .carousel-container {
    min-height: 300px;
  }
  
  .promo-card {
    max-width: 800px;
  }
  
  .image-frame {
    width: 180px;
    height: 180px;
  }
  
  .promo-name {
    font-size: 1.5rem;
  }
  
  .hero-title {
    font-size: 1.4rem;
  }
  
  .card-inner {
    gap: 1.5rem;
    padding: 1.25rem;
  }
}

/* =========================================
   PANTALLAS MEDIANAS-GRANDES (992px-1199px)
   ========================================= */
@media (max-width: 1199px) {
  .promo-card {
    max-width: 600px;
  }
  
  .image-frame {
    width: 140px;
    height: 140px;
  }
  
  .hero-title {
    font-size: 1.1rem;
  }
}

/* =========================================
   PANTALLAS MEDIANAS (768px-991px)
   ========================================= */
@media (max-width: 991px) {
  .promo-carousel {
    margin: 0.5rem;
    padding: 0.75rem;
  }
  
  .carousel-container {
    min-height: 240px;
  }
  
  .promo-card {
    max-width: 550px;
  }
  
  .card-inner {
    gap: 1rem;
    padding: 0.875rem;
  }
  
  .image-frame {
    width: 130px;
    height: 130px;
  }
  
  .promo-name {
    font-size: 1.2rem;
  }
  
  .products-list {
    max-height: 120px;
    overflow-y: auto;
  }
}

/* =========================================
   PANTALLAS PEQUEÑAS (600px-767px)
   ========================================= */
@media (max-width: 767px) {
  .promo-carousel {
    margin: 0.4rem;
    padding: 0.6rem;
  }

  .hero-section {
    margin-bottom: 0.6rem;
    padding-bottom: 0.5rem;
    gap: 0.75rem;
  }

  .hero-icon {
    font-size: 1.4rem;
  }

  .hero-title {
    font-size: 1rem;
    letter-spacing: 0.1em;
  }

  .hero-subtitle {
    display: none;
  }

  .hero-decor {
    font-size: 1.2rem;
  }

  .carousel-container {
    min-height: 220px;
  }
  
  .promo-card {
    max-width: 100%;
  }

  .card-inner {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .image-frame {
    width: 120px;
    height: 120px;
    margin: 0 auto;
  }

  .card-badge-container {
    top: -10px;
    right: -10px;
  }

  .card-badge {
    padding: 0.3rem 0.6rem;
    font-size: 0.75rem;
    border-width: 2px;
  }

  .badge-icon {
    font-size: 0.85rem;
  }

  .promo-name {
    font-size: 1.1rem;
    text-align: center;
  }

  .promo-description {
    font-size: 0.75rem;
    text-align: center;
  }

  .promo-products {
    padding: 0.6rem;
  }

  .products-title {
    font-size: 0.75rem;
    justify-content: center;
  }

  .products-list {
    gap: 0.25rem;
    max-height: 100px;
    overflow-y: auto;
  }

  .product-item {
    font-size: 0.75rem;
    padding: 0.3rem 0.5rem;
    gap: 0.5rem;
  }

  .product-qty {
    min-width: 40px;
    font-size: 0.7rem;
  }

  .promo-pricing {
    gap: 0.75rem;
  }

  .price-original {
    font-size: 0.8rem;
  }

  .price-promo-container {
    padding: 0.35rem 0.75rem;
  }

  .price-promo {
    font-size: 1.2rem;
  }

  .btn-agregar {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    gap: 0.4rem;
  }

  .btn-icon {
    font-size: 1rem;
  }

  .carousel-btn {
    width: 36px;
    height: 36px;
  }

  .carousel-btn.prev {
    left: -10px;
  }

  .carousel-btn.next {
    right: -10px;
  }

  .btn-arrow {
    font-size: 1rem;
  }

  .carousel-footer {
    margin-top: 0.75rem;
    padding-top: 0.5rem;
  }

  .dot {
    width: 8px;
    height: 8px;
  }
}

/* =========================================
   PANTALLAS MUY PEQUEÑAS (480px-599px)
   ========================================= */
@media (max-width: 599px) {
  .promo-carousel {
    margin: 0.3rem;
    padding: 0.5rem;
  }

  .hero-section {
    margin-bottom: 0.5rem;
    padding-bottom: 0.4rem;
    gap: 0.5rem;
  }

  .hero-icon {
    font-size: 1.2rem;
  }

  .hero-title {
    font-size: 0.9rem;
  }

  .hero-decor {
    font-size: 1rem;
  }

  .carousel-container {
    min-height: 200px;
  }

  .card-inner {
    padding: 0.6rem;
    gap: 0.5rem;
  }

  .image-frame {
    width: 100px;
    height: 100px;
    border-width: 2px;
  }

  .promo-img {
    object-fit: scale-down;
  }

  .placeholder-icon {
    font-size: 2.5rem;
  }

  .card-badge-container {
    top: -8px;
    right: -8px;
  }

  .card-badge {
    padding: 0.25rem 0.5rem;
    font-size: 0.65rem;
    border-width: 2px;
  }

  .badge-icon {
    font-size: 0.7rem;
  }

  .promo-name {
    font-size: 1rem;
  }

  .promo-description {
    font-size: 0.7rem;
    display: none;
  }

  .products-title {
    font-size: 0.7rem;
  }

  .products-list {
    max-height: 80px;
  }

  .product-item {
    font-size: 0.7rem;
    padding: 0.25rem 0.4rem;
    gap: 0.4rem;
  }

  .product-qty {
    min-width: 35px;
    font-size: 0.65rem;
  }

  .product-name {
    font-size: 0.7rem;
  }

  .content-footer {
    gap: 0.5rem;
  }

  .promo-pricing {
    gap: 0.5rem;
  }

  .price-original {
    font-size: 0.7rem;
  }

  .price-promo-container {
    padding: 0.25rem 0.6rem;
  }

  .price-promo {
    font-size: 1rem;
  }

  .btn-agregar {
    padding: 0.4rem 0.75rem;
    font-size: 0.7rem;
    gap: 0.3rem;
    border-width: 2px;
    box-shadow: 0 3px 0 var(--border-color);
  }

  .btn-icon {
    font-size: 0.9rem;
  }

  .btn-decor {
    display: none;
  }

  .carousel-btn {
    width: 32px;
    height: 32px;
    border-width: 2px;
  }

  .carousel-btn.prev {
    left: -8px;
  }

  .carousel-btn.next {
    right: -8px;
  }

  .btn-arrow {
    font-size: 0.9rem;
  }

  .carousel-footer {
    margin-top: 0.5rem;
    padding-top: 0.4rem;
  }

  .carousel-counter {
    font-size: 0.65rem;
  }

  .counter-current {
    font-size: 0.8rem;
  }
}

/* =========================================
   PANTALLAS EXTRA PEQUEÑAS (400px-479px)
   ========================================= */
@media (max-width: 479px) {
  .hero-decor {
    display: none;
  }

  .carousel-footer {
    flex-direction: column;
    gap: 0.4rem;
  }
}

/* =========================================
   PANTALLAS MÓVILES PEQUEÑAS (375px y menos)
   ========================================= */
@media (max-width: 375px) {
  .promo-carousel {
    margin: 0.25rem;
    padding: 0.4rem;
    border-width: 2px;
    border-radius: 10px;
  }

  .hero-section {
    margin-bottom: 0.4rem;
    padding-bottom: 0.35rem;
    gap: 0.4rem;
  }

  .hero-icon {
    font-size: 1rem;
  }

  .hero-title {
    font-size: 0.8rem;
    letter-spacing: 0.05em;
  }

  .hero-subtitle {
    display: none;
  }

  .hero-decor {
    display: none;
  }

  .carousel-container {
    min-height: 180px;
  }

  .card-badge-container {
    top: -6px;
    right: -6px;
  }

  .card-badge {
    padding: 0.2rem 0.4rem;
    font-size: 0.6rem;
    border-width: 2px;
    gap: 4px;
  }

  .badge-icon {
    font-size: 0.65rem;
  }

  .card-inner {
    padding: 0.5rem;
    gap: 0.4rem;
  }

  .image-frame {
    width: 80px;
    height: 80px;
    border-width: 2px;
    border-radius: 8px;
  }

  .promo-img {
    object-fit: scale-down;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }

  .placeholder-icon {
    font-size: 2rem;
  }

  .placeholder-text {
    display: none;
  }

  .content-header {
    text-align: center;
  }

  .promo-name {
    font-size: 0.85rem;
    text-align: center;
    margin-bottom: 0.2rem;
  }

  .promo-description {
    display: none;
  }

  .promo-products {
    padding: 0.4rem;
  }

  .products-title {
    font-size: 0.65rem;
    justify-content: center;
    margin-bottom: 0.3rem;
  }

  .title-icon {
    font-size: 0.8rem;
  }

  .products-list {
    max-height: 70px;
    gap: 0.15rem;
  }

  .product-item {
    font-size: 0.6rem;
    padding: 0.2rem 0.3rem;
    gap: 0.3rem;
    border-radius: 4px;
  }

  .product-qty {
    min-width: 30px;
    font-size: 0.55rem;
  }

  .product-name {
    font-size: 0.6rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .content-footer {
    gap: 0.4rem;
  }

  .promo-pricing {
    gap: 0.3rem;
  }

  .price-original {
    display: none;
  }

  .price-promo-container {
    padding: 0.2rem 0.5rem;
    border-width: 1px;
  }

  .price-promo {
    font-size: 0.9rem;
  }

  .btn-agregar {
    padding: 0.35rem 0.5rem;
    font-size: 0.65rem;
    gap: 0.25rem;
    border-width: 2px;
    box-shadow: 0 2px 0 var(--border-color);
    border-radius: 8px;
  }

  .btn-icon {
    font-size: 0.85rem;
  }

  .btn-text {
    display: none;
  }

  .btn-agregar::after {
    content: 'Agregar';
    font-size: 0.65rem;
  }

  .btn-decor {
    display: none;
  }

  .carousel-btn {
    width: 28px;
    height: 28px;
    border-width: 2px;
    box-shadow: 0 2px 6px var(--shadow-color);
  }

  .carousel-btn.prev {
    left: -6px;
  }

  .carousel-btn.next {
    right: -6px;
  }

  .btn-arrow {
    font-size: 0.9rem;
  }

  .carousel-footer {
    margin-top: 0.4rem;
    padding-top: 0.3rem;
    gap: 0.3rem;
  }

  .carousel-dots {
    gap: 0.25rem;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-width: 1px;
  }

  .carousel-counter {
    font-size: 0.6rem;
  }

  .counter-current {
    font-size: 0.75rem;
  }
}
</style>
