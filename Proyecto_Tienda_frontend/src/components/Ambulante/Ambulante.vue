<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useAmbulante } from './logica/useAmbulante';
import { useSucursal } from '@/composables/useSucursal';

const {
  tabActivo, cargando, mensaje, mensajeTipo,
  terminoBusqueda, productosFiltrados, itemsCarga,
  inventarioCargado, inventario, itemsVenta, metodoPago,
  totalVenta, corteReporte, fechaCorte,
  devolucionIds,
  seleccionarTab, inicializar, cargarCortes,
  agregarItemCarga, quitarItemCarga, setCantidadCarga, setCostoBolsitaCarga, enviarCarga,
  agregarAVenta, quitarDeVenta, setCantidadVenta, registrarVenta,
  devolverProductos, toggleDevolucion, formatoMoneda
} = useAmbulante();

const { getOrigen } = useSucursal();

const origenLabel = computed(() => getOrigen() === 'abarrotera' ? 'Abarrotera' : 'Dulcería');

const ticketVisibleMobile = ref(false);

const tabs = [
  { k: 'inventario' as const, l: 'Inventario', icon: '🎒' },
  { k: 'cargar' as const, l: 'Cargar', icon: '🛺' },
  { k: 'vender' as const, l: 'Vender', icon: '💰' },
  { k: 'corte' as const, l: 'Corte', icon: '📜' }
];

const inventarioFiltrado = computed(() => {
  const t = terminoBusqueda.value.toLowerCase().replace(/[-\s–—]/g, '');
  if (!t) return inventarioCargado.value;
  return inventarioCargado.value.filter((it) =>
    it.nombreProducto.toLowerCase().replace(/[-\s–—]/g, '').includes(t)
  );
});

const artVenta = computed(() => itemsVenta.value.reduce((acc, i) => acc + i.cantidad, 0));
const costoVenta = computed(() => itemsVenta.value.reduce((acc, i) => {
  const inv = inventarioCargado.value.find((x) => x.idProducto === i.idProducto);
  return acc + (inv ? Number(inv.precioCosto || 0) * i.cantidad : 0);
}, 0));
const gananciaVenta = computed(() => Math.max(0, totalVenta.value - costoVenta.value));

const artCarga = computed(() => itemsCarga.value.reduce((acc, i) => acc + i.cantidad, 0));
const costoCargaTotal = computed(() => itemsCarga.value.reduce((acc, i) => {
  const costoU = i.isGramaje ? Number(i.precioCosto || 0) : Number(i.precioCosto || 0);
  return acc + costoU * i.cantidad;
}, 0));

const invTotalCosto = computed(() => inventarioCargado.value.reduce((acc, i) => acc + Number(i.precioCosto || 0) * i.cantidad, 0));

const inventarioVendido = computed(() => inventario.value.filter((i) => i.estatus === 'VENDIDO'));
const inventarioDevuelto = computed(() => inventario.value.filter((i) => i.estatus === 'DEVUELTO'));

const panelTotal = computed(() => {
  if (tabActivo.value === 'vender') return totalVenta.value;
  if (tabActivo.value === 'cargar') return costoCargaTotal.value;
  if (tabActivo.value === 'inventario') return invTotalCosto.value;
  return 0;
});
const ticketInfoText = computed(() => {
  if (tabActivo.value === 'vender') {
    const n = artVenta.value;
    return `${n} artículo${n === 1 ? '' : 's'}`;
  }
  if (tabActivo.value === 'cargar') {
    const n = artCarga.value;
    return `${n} artículo${n === 1 ? '' : 's'} · ${formatoMoneda(costoCargaTotal.value)}`;
  }
  if (tabActivo.value === 'inventario') {
    const total = inventario.value.length;
    return `${total} registro${total === 1 ? '' : 's'}`;
  }
  return 'Resumen del corte';
});

function onSeleccionarTab(tab: 'cargar' | 'inventario' | 'vender' | 'corte') {
  ticketVisibleMobile.value = false;
  seleccionarTab(tab);
}

function limpiarVenta() {
  itemsVenta.value = [];
}

function limpiarCarga() {
  itemsCarga.value = [];
}

function onTogglePanelMobile() {
  if (window.innerWidth <= 991) ticketVisibleMobile.value = !ticketVisibleMobile.value;
}

function setPrecioVenta(index: number, valor: number) {
  if (valor < 0) valor = 0;
  itemsVenta.value[index].precioVenta = valor;
}

onMounted(() => {
  void inicializar();
});
</script>

<template>
  <main class="ambulante-page" :class="{ 'is-single': tabActivo !== 'vender' && tabActivo !== 'cargar' }">
    <div v-if="cargando" class="cargando-badge">Cargando...</div>
    <div v-if="mensaje" class="toast-ambulante" :class="mensajeTipo">{{ mensaje }}</div>

    <!-- ===== NAV MÓVIL (pestañas horizontales) ===== -->
    <nav class="amb-tabs-mobile">
      <button
        v-for="tab in tabs"
        :key="tab.k"
        type="button"
        class="amb-tab-mobile"
        :class="{ 'is-active': tabActivo === tab.k }"
        @click="onSeleccionarTab(tab.k)"
      >
        <span class="amb-tab-mobile-icon">{{ tab.icon }}</span>
        <span class="amb-tab-mobile-label">{{ tab.l }}</span>
      </button>
    </nav>

    <!-- ===== SIDEBAR ===== -->
    <aside class="amb-sidebar">
      <div class="sidebar-header">
        <span class="amb-logo">🛺</span>
        <h3>Ambulante</h3>
        <span class="amb-origen-dot" :title="'Origen: ' + origenLabel">🏪</span>
      </div>
      <nav class="amb-nav-list custom-scrollbar">
        <button
          v-for="tab in tabs"
          :key="tab.k"
          type="button"
          class="amb-nav-item"
          :class="{ 'is-active': tabActivo === tab.k }"
          :title="tab.l"
          @click="onSeleccionarTab(tab.k)"
        >
          <span class="amb-nav-icon">{{ tab.icon }}</span>
          <span class="amb-nav-label">{{ tab.l }}</span>
        </button>
      </nav>
    </aside>

    <!-- ===== CENTRO ===== -->
    <section class="amb-center">
      <!-- Barra móvil para abrir el panel derecho -->
      <div class="amb-mobile-bar">
        <button class="amb-mobile-toggle" type="button" @click="ticketVisibleMobile = !ticketVisibleMobile">
          <span class="amb-mobile-icon">{{ tabActivo === 'vender' ? '🛒' : (tabActivo === 'cargar' ? '📥' : (tabActivo === 'inventario' ? '🎒' : '📜')) }}</span>
          <span class="amb-mobile-text">{{ ticketInfoText }}</span>
          <span v-if="tabActivo !== 'corte'" class="amb-mobile-total">{{ formatoMoneda(panelTotal) }}</span>
          <span v-else class="amb-mobile-total">⇧</span>
        </button>
      </div>

      <!-- ========== VENDER ========== -->
      <template v-if="tabActivo === 'vender'">
        <header class="catalog-header">
          <div class="search-input-row">
            <span class="pos-search-icon">🔍</span>
            <input v-model="terminoBusqueda" type="text" placeholder="Buscar en mi inventario..." />
          </div>
          <div class="amb-header-stats">
            <span class="amb-header-stat">{{ inventarioCargado.length }} productos</span>
            <span class="amb-header-stat success">{{ formatoMoneda(totalVenta) }} en venta</span>
          </div>
        </header>

        <div class="catalog-grid custom-scrollbar">
          <div class="products-grid">
            <article
              v-for="it in inventarioFiltrado"
              :key="it.id"
              class="product-card clickable"
              :class="{ disabled: it.cantidad <= 0 }"
              @click="it.cantidad > 0 && agregarAVenta(it)"
            >
              <div class="product-icon">🎒</div>
              <div class="product-details">
                <h4 class="pos-product-name">{{ it.nombreProducto }}</h4>
                <div class="product-price-tag">{{ formatoMoneda(it.precioCosto) }}</div>
              </div>
              <div class="stock-badge" :class="(it.cantidad ?? 0) > 5 ? 'in-stock' : 'pos-low-stock'">
                {{ it.cantidad }} disp.
                <template v-if="it.gramosPorPieza"> · {{ it.gramosPorPieza }}g/bol</template>
              </div>
            </article>
          </div>
          <div v-if="inventarioFiltrado.length === 0" class="empty-catalog">
            <span class="pos-empty-icon">🎒</span>
            <p>No hay productos cargados. Carga producto primero.</p>
          </div>
        </div>
      </template>

      <!-- ========== CARGAR ========== -->
      <template v-else-if="tabActivo === 'cargar'">
        <header class="catalog-header">
          <div class="search-input-row">
            <span class="pos-search-icon">🔍</span>
            <input v-model="terminoBusqueda" type="text" placeholder="Buscar producto de {{ origenLabel }}..." />
          </div>
          <div class="amb-header-stats">
            <span class="amb-header-stat">{{ productosFiltrados.length }} productos</span>
            <span class="amb-header-stat muted">{{ origenLabel }}</span>
          </div>
        </header>

        <div class="catalog-grid custom-scrollbar">
          <div class="products-grid">
            <article
              v-for="prod in productosFiltrados"
              :key="prod.idProducto"
              class="product-card clickable"
              :class="{ disabled: prod.stock <= 0 }"
              @click="agregarItemCarga(prod)"
            >
              <div class="product-icon">📦</div>
              <div class="product-details">
                <h4 class="pos-product-name">{{ prod.nombre }}</h4>
                <div class="product-price-tag">{{ formatoMoneda(prod.precio_venta) }}</div>
              </div>
              <div class="stock-badge" :class="prod.stock > 5 ? 'in-stock' : 'pos-low-stock'">
                Stock: {{ prod.stock }}{{ prod.is_gramaje ? 'g' : '' }}
              </div>
            </article>
          </div>
          <div v-if="productosFiltrados.length === 0" class="empty-catalog">
            <span class="pos-empty-icon">🏺</span>
            <p>No hay productos disponibles</p>
          </div>
        </div>
      </template>

      <!-- ========== INVENTARIO ========== -->
      <template v-else-if="tabActivo === 'inventario'">
        <header class="catalog-header">
          <div class="search-input-row">
            <span class="pos-search-icon">🔍</span>
            <input v-model="terminoBusqueda" type="text" placeholder="Buscar en mi inventario..." />
          </div>
          <div class="amb-header-stats">
            <span class="amb-header-stat">{{ inventarioFiltrado.length }} cargados</span>
          </div>
        </header>

        <div class="catalog-grid custom-scrollbar">
          <div class="products-grid">
            <article
              v-for="it in inventarioFiltrado"
              :key="it.id"
              class="product-card clickable"
              @click="toggleDevolucion(it.id)"
            >
              <div class="product-icon" :class="{ 'is-selected': devolucionIds.includes(it.id) }">
                {{ devolucionIds.includes(it.id) ? '✅' : '🎒' }}
              </div>
              <div class="product-details">
                <h4 class="pos-product-name">{{ it.nombreProducto }}</h4>
                <div class="product-price-tag">{{ formatoMoneda(it.precioCosto) }}/u</div>
              </div>
              <div class="stock-badge" :class="(it.cantidad ?? 0) > 5 ? 'in-stock' : 'pos-low-stock'">
                {{ it.cantidad }} pz
                <template v-if="it.gramosPorPieza"> · {{ it.gramosPorPieza }}g/bol</template>
              </div>
            </article>
          </div>
          <div v-if="inventarioFiltrado.length === 0" class="empty-catalog">
            <span class="pos-empty-icon">🎒</span>
            <p>No tienes productos cargados. Ve a la pestaña "Cargar".</p>
          </div>
        </div>
      </template>

      <!-- ========== CORTE ========== -->
      <template v-else-if="tabActivo === 'corte'">
        <header class="catalog-header">
          <div class="search-input-row corte-search">
            <span class="pos-search-icon">📅</span>
            <input v-model="fechaCorte" type="date" />
          </div>
          <div class="amb-header-stats">
            <button class="btn-checkout secondary" type="button" @click="cargarCortes">
              Ver corte
            </button>
          </div>
        </header>

        <div class="catalog-grid custom-scrollbar">
          <div v-if="corteReporte && corteReporte.detalle.length" class="report-list">
            <div
              v-for="d in corteReporte.detalle"
              :key="d.idVenta"
              class="report-row"
            >
              <div class="report-main">
                <span class="report-ticket">📜 Venta #{{ d.idVenta }}</span>
                <span class="report-meta">{{ d.nombreUsuario }} · {{ d.metodoPago }}</span>
              </div>
              <div class="report-total">{{ formatoMoneda(d.montoTotal) }}</div>
            </div>
          </div>
          <div v-else-if="corteReporte" class="empty-catalog">
            <span class="pos-empty-icon">📜</span>
            <p>Sin ventas ambulantes este día.</p>
          </div>
          <div v-if="!corteReporte" class="empty-catalog">
            <span class="pos-empty-icon">🗓️</span>
            <p>Selecciona una fecha y pulsa "Ver corte".</p>
          </div>
        </div>
      </template>
    </section>

    <!-- ===== PANEL DERECHO ===== -->
    <aside class="amb-right" :class="{ 'is-open': ticketVisibleMobile }">
      <!-- ===== Panel Venta ===== -->
      <div v-if="tabActivo === 'vender'" class="amb-right-inner">
        <div class="ticket-backdrop" @click="ticketVisibleMobile = false"></div>
        <header class="checkout-header" @click="onTogglePanelMobile">
          <div class="header-title">
            <span class="icon">💰</span>
            <h3>Cuenta de Venta</h3>
            <span class="amb-chevron">⌄</span>
          </div>
          <button class="btn-clear-all" v-if="itemsVenta.length > 0" @click.stop="limpiarVenta">Limpiar</button>
        </header>

        <div class="ticket-items-list custom-scrollbar">
          <article v-for="(it, index) in itemsVenta" :key="index" class="ticket-item-row">
            <div class="item-main">
              <h4 class="item-name">{{ it.nombreProducto }}</h4>
              <div class="item-actions">
                <div class="qty-control">
                  <button class="qty-btn" type="button" @click="setCantidadVenta(index, it.cantidad - 1)">-</button>
                  <span class="qty-val">{{ it.cantidad }}</span>
                  <button class="qty-btn" type="button" @click="setCantidadVenta(index, it.cantidad + 1)">+</button>
                </div>
                <input
                  type="number"
                  class="precio-input"
                  step="0.01"
                  min="0"
                  :value="it.precioVenta"
                  @change="setPrecioVenta(index, Number(($event.target as HTMLInputElement).value))"
                />
                <div class="item-subtotal">{{ formatoMoneda(it.precioVenta * it.cantidad) }}</div>
              </div>
            </div>
            <button class="btn-remove-item" type="button" @click="quitarDeVenta(index)">×</button>
          </article>

          <div v-if="itemsVenta.length === 0" class="empty-ticket-msg">
            <p>No hay productos en la venta</p>
          </div>
        </div>

        <footer class="checkout-footer">
          <div class="checkout-actions">
            <select v-model="metodoPago" class="metodo-select">
              <option value="EFECTIVO">💵 Efectivo</option>
              <option value="TARJETA">💳 Tarjeta</option>
              <option value="TRANSFERENCIA">🏦 Transferencia</option>
            </select>
          </div>
          <div class="summary-table">
            <div class="summary-row">
              <span>Artículos:</span>
              <strong>{{ artVenta }}</strong>
            </div>
            <div class="summary-row">
              <span>Costo:</span>
              <strong>{{ formatoMoneda(costoVenta) }}</strong>
            </div>
            <div class="summary-row ganancia">
              <span>Ganancia:</span>
              <strong>{{ formatoMoneda(gananciaVenta) }}</strong>
            </div>
            <div class="summary-row total">
              <span>TOTAL</span>
              <strong class="pos-total-amount">{{ formatoMoneda(totalVenta) }}</strong>
            </div>
          </div>
          <button
            class="btn-checkout primary"
            type="button"
            :disabled="itemsVenta.length === 0 || cargando"
            @click="registrarVenta"
          >
            <span class="icon">💰</span>
            <span class="text">COBRAR AHORA</span>
            <span class="shortcut-badge">{{ formatoMoneda(totalVenta) }}</span>
          </button>
        </footer>
      </div>

      <!-- ===== Panel Carga ===== -->
      <div v-else-if="tabActivo === 'cargar'" class="amb-right-inner">
        <div class="ticket-backdrop" @click="ticketVisibleMobile = false"></div>
        <header class="checkout-header" @click="onTogglePanelMobile">
          <div class="header-title">
            <span class="icon">📥</span>
            <h3>Lista de Carga</h3>
            <span class="amb-chevron">⌄</span>
          </div>
          <button class="btn-clear-all" v-if="itemsCarga.length > 0" @click.stop="limpiarCarga">Limpiar</button>
        </header>

        <div class="ticket-items-list custom-scrollbar">
          <article v-for="(it, index) in itemsCarga" :key="it.idProducto" class="ticket-item-row">
            <div class="item-main">
              <h4 class="item-name">{{ it.nombreProducto }}</h4>
              <div class="item-actions">
                <div class="qty-control">
                  <button class="qty-btn" type="button" @click="setCantidadCarga(index, it.cantidad - 1)">-</button>
                  <span class="qty-val">{{ it.cantidad }}</span>
                  <button class="qty-btn" type="button" @click="setCantidadCarga(index, it.cantidad + 1)">+</button>
                </div>
                <div class="item-subtotal graje-sell">
                  <template v-if="it.isGramaje && it.gramosPorPieza">{{ it.gramosPorPieza }}g/bol</template>
                </div>
              </div>
              <div v-if="it.isGramaje" class="item-meta">
                <label class="envase-toggle">
                  <span>Costo bolsita ($)</span>
                </label>
                <input
                  type="number"
                  class="envase-qty-input"
                  step="0.01"
                  min="0"
                  :value="it.precioCosto"
                  @change="setCostoBolsitaCarga(index, Number(($event.target as HTMLInputElement).value))"
                />
              </div>
            </div>
            <button class="btn-remove-item" type="button" @click="quitarItemCarga(index)">×</button>
          </article>

          <div v-if="itemsCarga.length === 0" class="empty-ticket-msg">
            <p>Toca productos del catálogo para agregarlos aquí</p>
          </div>
        </div>

        <footer class="checkout-footer">
          <div class="summary-table">
            <div class="summary-row">
              <span>Artículos:</span>
              <strong>{{ artCarga }}</strong>
            </div>
            <div v-if="itemsCarga.length > 0" class="summary-row ganancia">
              <span>Costo estimado:</span>
              <strong>{{ formatoMoneda(costoCargaTotal) }}</strong>
            </div>
          </div>
          <button
            class="btn-checkout primary"
            type="button"
            :disabled="itemsCarga.length === 0 || cargando"
            @click="enviarCarga"
          >
            <span class="icon">📥</span>
            <span class="text">CARGAR AL INVENTARIO</span>
            <span class="shortcut-badge">{{ itemsCarga.length }}</span>
          </button>
        </footer>
      </div>

      <!-- ===== Panel Inventario ===== -->
      <div v-else-if="tabActivo === 'inventario'" class="amb-right-inner">
        <header class="checkout-header" @click="onTogglePanelMobile">
          <div class="header-title">
            <span class="icon">🎒</span>
            <h3>Mi Inventario</h3>
            <span class="amb-chevron">⌄</span>
          </div>
        </header>

        <div class="ticket-items-list custom-scrollbar">
          <template v-if="inventario.length > 0">
            <div v-if="inventarioCargado.length > 0" class="amb-grupo-titulo">Cargadas</div>
            <article v-for="it in inventarioCargado" :key="it.id" class="ticket-item-row">
              <div class="item-main">
                <h4 class="item-name">{{ it.nombreProducto }}</h4>
                <div class="item-meta">
                  <span class="unit-price">{{ it.cantidad }} pz</span>
                  <span v-if="it.gramosPorPieza" class="unit-price">{{ it.gramosPorPieza }}g/bol</span>
                  <span class="amb-est-badge cargado">Cargada</span>
                </div>
              </div>
              <div class="item-subtotal">{{ formatoMoneda(it.precioCosto * it.cantidad) }}</div>
            </article>

            <div v-if="inventarioVendido.length > 0" class="amb-grupo-titulo">Vendidas</div>
            <article v-for="it in inventarioVendido" :key="it.id" class="ticket-item-row amb-row-historial">
              <div class="item-main">
                <h4 class="item-name">{{ it.nombreProducto }}</h4>
                <div class="item-meta">
                  <span class="unit-price">{{ it.cantidad }} pz</span>
                  <span v-if="it.gramosPorPieza" class="unit-price">{{ it.gramosPorPieza }}g/bol</span>
                  <span class="amb-est-badge vendido">Vendida</span>
                </div>
              </div>
              <div class="item-subtotal historial">
                <span v-if="it.idVenta">Venta #{{ it.idVenta }}</span>
                <span v-else>{{ formatoMoneda(it.precioCosto * it.cantidad) }}</span>
              </div>
            </article>

            <div v-if="inventarioDevuelto.length > 0" class="amb-grupo-titulo">Devueltas</div>
            <article v-for="it in inventarioDevuelto" :key="it.id" class="ticket-item-row amb-row-historial">
              <div class="item-main">
                <h4 class="item-name">{{ it.nombreProducto }}</h4>
                <div class="item-meta">
                  <span class="unit-price">{{ it.cantidad }} pz</span>
                  <span v-if="it.gramosPorPieza" class="unit-price">{{ it.gramosPorPieza }}g/bol</span>
                  <span class="amb-est-badge devuelto">Devuelta</span>
                </div>
              </div>
              <div class="item-subtotal historial">{{ formatoMoneda(it.precioCosto * it.cantidad) }}</div>
            </article>
          </template>
          <div v-else class="empty-ticket-msg">
            <p>Sin productos cargados</p>
          </div>
        </div>

        <footer class="checkout-footer">
          <div class="summary-table">
            <div class="summary-row">
              <span>Registros:</span>
              <strong>{{ inventario.length }}</strong>
            </div>
            <div class="summary-row">
              <span>Activas:</span>
              <strong>{{ inventarioCargado.length }}</strong>
            </div>
            <div class="summary-row total">
              <span>COSTO ACTIVO</span>
              <strong class="pos-total-amount">{{ formatoMoneda(invTotalCosto) }}</strong>
            </div>
          </div>
          <button
            v-if="devolucionIds.length > 0"
            class="btn-checkout primary danger"
            type="button"
            :disabled="cargando"
            @click="devolverProductos(devolucionIds)"
          >
            <span class="icon">↩️</span>
            <span class="text">DEVOLVER SELECCIONADOS</span>
            <span class="shortcut-badge">{{ devolucionIds.length }}</span>
          </button>
          <p v-else class="amb-hint block">Toca los productos del catálogo para marcarlos como devolver.</p>
        </footer>
      </div>

      <!-- ===== Panel Corte ===== -->
      <div v-else-if="tabActivo === 'corte'" class="amb-right-inner">
        <header class="checkout-header" @click="onTogglePanelMobile">
          <div class="header-title">
            <span class="icon">📜</span>
            <h3>Resumen del Corte</h3>
            <span class="amb-chevron">⌄</span>
          </div>
        </header>

        <div class="ticket-items-list corte-resumen">
          <div v-if="corteReporte" class="corte-kpis">
            <div class="corte-kpi">
              <span class="corte-kpi-label">Ventas</span>
              <span class="corte-kpi-value">{{ formatoMoneda(corteReporte.totalVentas) }}</span>
            </div>
            <div class="corte-kpi">
              <span class="corte-kpi-label">Costo</span>
              <span class="corte-kpi-value">{{ formatoMoneda(corteReporte.totalCosto) }}</span>
            </div>
            <div class="corte-kpi">
              <span class="corte-kpi-label">Ganancia</span>
              <span class="corte-kpi-value success">{{ formatoMoneda(corteReporte.totalGanancia) }}</span>
            </div>
            <div class="corte-kpi">
              <span class="corte-kpi-label">Operaciones</span>
              <span class="corte-kpi-value">{{ corteReporte.totalVentasCount }}</span>
            </div>
          </div>
          <div v-else class="empty-ticket-msg">
            <p>Selecciona fecha y pulsa "Ver corte"</p>
          </div>
        </div>
      </div>
    </aside>
  </main>
</template>

<style scoped>
.ambulante-page {
  display: grid;
  grid-template-columns: 70px 1fr 360px;
  grid-template-rows: 1fr;
  height: calc(98vh - 64px);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  position: relative;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

@media (min-width: 1400px) {
  .ambulante-page {
    grid-template-columns: 70px 1fr 400px;
  }
}

@media (max-width: 1199px) {
  .ambulante-page {
    grid-template-columns: 60px 1fr 320px;
  }
}

@media (max-width: 991px) {
  .ambulante-page {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    gap: 0.4rem;
    padding: 0.5rem;
    align-content: start;
  }
  .ambulante-page > .amb-tabs-mobile {
    grid-row: 1;
    grid-column: 1;
    align-self: start;
  }
  .ambulante-page > .amb-center {
    grid-row: 2;
    grid-column: 1;
    min-height: 0;
  }
}

@media (max-width: 767px) {
  .ambulante-page {
    max-height: 100dvh;
    overflow: hidden;
  }
}

/* ===== Badges ===== */
.cargando-badge {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 200;
  background: var(--color-accent, #c9a227);
  color: #fff;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.75rem;
}
.toast-ambulante {
  position: fixed;
  bottom: 1.2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  padding: 0.7rem 1.2rem;
  border-radius: 10px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 6px 20px rgba(0,0,0,.3);
}
.toast-ambulante.ok { background: var(--success-color, #3a9e5a); }
.toast-ambulante.error { background: var(--error-color, #c75a5a); }

/* ===== Nav móvil (pestañas horizontales) ===== */
.amb-tabs-mobile {
  display: none;
}
@media (max-width: 991px) {
  .amb-tabs-mobile {
    display: flex;
    gap: 0.4rem;
    padding: 0.5rem 0.6rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    position: sticky;
    top: 0;
    z-index: 40;
  }
  .amb-tab-mobile {
    flex: 1;
    min-width: 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    padding: 0.45rem 0.3rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
    font-family: inherit;
    cursor: pointer;
    box-shadow: 2px 2px 4px rgba(0,0,0,.1), -1px -1px 3px rgba(255,255,255,.02);
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    transition: all 0.15s;
  }
  .amb-tab-mobile.is-active {
    background: linear-gradient(180deg, var(--gradient-btn-start), var(--gradient-btn-end));
    color: var(--color-on-brand);
    border-color: var(--color-accent);
  }
  .amb-tab-mobile-icon { font-size: 1.1rem; line-height: 1; }
  .amb-tab-mobile-label {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
}

/* ===== Sidebar ===== */
.amb-sidebar {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 0.8rem 0.4rem;
  z-index: 20;
  width: 70px;
  min-width: 70px;
  max-width: 70px;
  overflow: hidden;
  box-sizing: border-box;
}
@media (max-width: 1199px) {
  .amb-sidebar {
    width: 60px;
    min-width: 60px;
    max-width: 60px;
    padding: 0.6rem 0.3rem;
  }
}
@media (max-width: 991px) {
  .amb-sidebar {
    display: none !important;
  }
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1.2rem;
  text-align: center;
}
.amb-logo { font-size: 1.8rem; }
.sidebar-header h3 {
  margin: 0;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--accent-color);
  font-weight: 700;
  letter-spacing: 0.08em;
}
.amb-origen-dot { font-size: 1rem; opacity: 0.8; }

.amb-nav-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.2rem;
}
.amb-nav-item {
  width: 100%;
  max-width: 54px;
  min-height: 60px;
  margin: 0 auto;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  box-sizing: border-box;
  box-shadow:
    3px 3px 6px rgba(0, 0, 0, 0.15),
    -2px -2px 4px rgba(255, 255, 255, 0.02);
  color: var(--color-text-secondary);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.amb-nav-item:hover {
  box-shadow:
    5px 5px 10px rgba(0, 0, 0, 0.2),
    -3px -3px 6px rgba(255, 255, 255, 0.03);
  transform: translateX(3px);
  color: var(--color-accent);
}
.amb-nav-item.is-active {
  background: color-mix(in srgb, var(--color-accent) 15%, var(--color-bg-secondary));
  box-shadow:
    inset 3px 3px 6px rgba(0, 0, 0, 0.15),
    inset -2px -2px 4px rgba(255, 255, 255, 0.02);
  transform: translateX(5px);
  color: var(--color-accent);
}
.amb-nav-icon { font-size: 1.3rem; line-height: 1; }
.amb-nav-label {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
@media (max-width: 1199px) {
  .amb-nav-item { max-width: 46px; min-height: 52px; }
  .amb-nav-label { font-size: 0.52rem; }
}

/* ===== Centro ===== */
.amb-center {
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.amb-mobile-bar {
  display: none;
  align-items: center;
  gap: .35rem;
  padding: .4rem .6rem;
  background: var(--color-bg-secondary);
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
}
@media (max-width: 991px) {
  .amb-mobile-bar { display: flex; }
}
.amb-mobile-toggle {
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 34px;
  padding: 0.3rem 0.6rem;
  background: var(--color-bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--color-text-primary);
  font-size: 0.75rem;
  cursor: pointer;
  box-shadow: 2px 2px 4px rgba(0,0,0,.08);
}
.amb-mobile-toggle:hover { border-color: var(--color-accent); }
.amb-mobile-text { font-weight: 600; }
.amb-mobile-total { margin-left: auto; font-weight: 700; color: var(--success-color); font-family: monospace; }

.catalog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(to bottom, var(--bg-secondary), var(--bg-primary));
  border-bottom: var(--border-width) solid var(--border-color);
}
@media (max-width: 767px) {
  .catalog-header { flex-direction: column; align-items: stretch; padding: 0.5rem 0.6rem; }
}

.search-input-row {
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.4rem 0.7rem;
  gap: 0.5rem;
  box-sizing: border-box;
}
.search-input-row:focus-within { border-color: var(--accent-color); }
.search-input-row input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1rem;
  outline: none;
  min-width: 0;
}
.search-input-row input::placeholder { color: var(--text-secondary); }
.corte-search { max-width: 420px; }

.amb-header-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.amb-header-stat {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  white-space: nowrap;
}
.amb-header-stat.success { color: var(--success-color); }
.amb-header-stat.muted { opacity: 0.85; }
@media (max-width: 767px) {
  .amb-header-stats { justify-content: flex-end; }
}

.catalog-grid {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  box-sizing: border-box;
}
@media (max-width: 767px) { .catalog-grid { padding: 0.75rem; } }

.products-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.8rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
@media (max-width: 991px) { .products-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 400px) { .products-grid { grid-template-columns: repeat(1, 1fr); } }

.product-card {
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
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.product-card:hover {
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-secondary));
  box-shadow:
    6px 6px 14px rgba(0, 0, 0, 0.25),
    -3px -3px 8px rgba(255, 255, 255, 0.03);
  transform: translateY(-2px);
}
.product-card:active {
  transform: scale(0.97);
  box-shadow:
    inset 3px 3px 6px rgba(0, 0, 0, 0.15),
    inset -2px -2px 4px rgba(255, 255, 255, 0.02);
}
.product-card.disabled { opacity: 0.45; cursor: not-allowed; }
.product-card.disabled:hover { transform: none; box-shadow: 4px 4px 8px rgba(0,0,0,.2); background: var(--color-bg-secondary); }

.product-icon { font-size: 2.5rem; transition: transform 0.15s; }
.product-card:hover .product-icon { transform: scale(1.05); }
.product-icon.is-selected { filter: drop-shadow(0 0 6px var(--success-color)); }

.pos-product-name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--text-primary);
  overflow: hidden;
}
.product-price-tag {
  background: var(--success-color);
  color: var(--text-primary);
  padding: 0.25rem 0.7rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  font-family: "Courier New", monospace;
}

.stock-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
}
.in-stock { background: color-mix(in srgb, var(--success-color) 15%, transparent); color: var(--success-color); }
.pos-low-stock { background: color-mix(in srgb, var(--error-color) 15%, transparent); color: var(--error-color); }

.empty-catalog {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.empty-catalog p { margin: 0; font-style: italic; }
.pos-empty-icon { font-size: 4rem; opacity: 0.3; }

/* ===== Panel derecho ===== */
.amb-right {
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 30;
  height: 100%;
  min-height: 0;
  width: 360px;
  min-width: 360px;
  max-width: 360px;
  box-sizing: border-box;
  overflow: hidden;
}
@media (min-width: 1400px) {
  .amb-right { width: 400px; min-width: 400px; max-width: 400px; }
}
@media (max-width: 1199px) {
  .amb-right { width: 320px; min-width: 320px; max-width: 320px; }
}
@media (max-width: 991px) {
  .amb-right {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    z-index: 100;
    width: 100%;
    min-width: unset;
    max-width: unset;
    border-left: none;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -8px 30px rgba(0,0,0,.35);
    transition: transform .3s ease;
    overflow: hidden;
  }
  .amb-right:not(.is-open) { transform: translateY(calc(100% - 48px)); height: auto; min-height: 48px; }
  .amb-right.is-open { transform: translateY(0); height: 65vh; }
}
.ticket-backdrop { display: none; }
@media (max-width: 991px) {
  .is-open .ticket-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.35);
    z-index: -1;
  }
}

.amb-right-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}
@media (max-width: 991px) { .amb-right-inner { overflow-y: auto; } }

.checkout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}
.header-title { display: flex; align-items: center; gap: 0.4rem; }
.header-title h3 { margin: 0; color: var(--accent-color); font-size: 1.1rem; font-weight: 700; }

.amb-chevron {
  display: none;
  font-size: 0.95rem;
  line-height: 1;
  color: var(--color-text-secondary);
  transition: transform 0.2s ease;
}
@media (max-width: 991px) {
  .amb-chevron {
    display: inline-block;
    margin-left: 0.35rem;
  }
  .ambulante-page .amb-right.is-open .header-title .amb-chevron {
    transform: rotate(180deg);
  }
  .checkout-header {
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-clear-all { cursor: pointer; }
}

.btn-clear-all {
  font-size: 0.7rem;
  font-weight: 600;
  background: color-mix(in srgb, var(--color-error) 15%, var(--color-bg-panel));
  border: none;
  color: var(--color-error);
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-transform: uppercase;
  transition: all 0.15s;
  font-family: inherit;
  box-shadow: 3px 3px 6px rgba(0,0,0,0.15), -2px -2px 4px rgba(255,255,255,0.02);
}
.btn-clear-all:hover { color: var(--color-text-primary); }
.btn-clear-all:active { transform: scale(0.97); }

.ticket-items-list {
  flex: 1;
  min-height: 100px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding-right: 0.5rem;
  box-sizing: border-box;
}

.ticket-item-row {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.6rem;
  position: relative;
  transition: all 0.15s;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  overflow: hidden;
  flex-shrink: 0;
}
.ticket-item-row:hover { border-color: var(--accent-color); }

.item-main { display: flex; flex-direction: column; gap: 0.3rem; flex: 1; min-width: 0; }
.item-name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.item-meta { display: flex; align-items: center; gap: 0.8rem; font-size: 0.75rem; flex-wrap: wrap; }
.unit-price { color: var(--text-secondary); font-size: 0.7rem; font-family: "Courier New", monospace; }

.amb-grupo-titulo {
  margin: 0.4rem 0 0.2rem;
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}
.amb-est-badge {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  line-height: 1;
}
.amb-est-badge.cargado { background: var(--success-color, #3a9e5a); color: #fff; }
.amb-est-badge.vendido { background: var(--accent-color, #c9a227); color: #1b1307; }
.amb-est-badge.devuelto { background: color-mix(in srgb, var(--color-error) 18%, var(--color-bg-panel)); color: var(--color-error); border: 1px solid currentColor; }
.amb-row-historial { opacity: 0.72; }
.amb-row-historial:hover { opacity: 1; }
.item-subtotal.historial {
  font-size: 0.68rem;
  color: var(--text-secondary);
  white-space: nowrap;
}
.item-subtotal.historial > span { display: block; text-align: right; }

.item-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex-wrap: wrap;
}

.qty-control {
  display: flex;
  align-items: center;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow:
    inset 3px 3px 6px rgba(0, 0, 0, 0.2),
    inset -2px -2px 4px rgba(255, 255, 255, 0.02);
}
.qty-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
  transition: all 0.15s;
  font-family: inherit;
}
.qty-btn:hover { background: color-mix(in srgb, var(--color-accent) 25%, transparent); color: var(--color-accent); }
.qty-btn:active { background: color-mix(in srgb, var(--color-accent) 35%, transparent); transform: scale(0.95); }
.qty-val {
  width: 42px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: bold;
  font-family: "Courier New", monospace;
}

.precio-input {
  width: 82px;
  padding: 0.25rem 0.35rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 700;
  font-family: "Courier New", monospace;
  text-align: center;
  outline: none;
  transition: all 0.15s;
}
.precio-input:focus { border-color: var(--color-accent); }

.envase-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--warning-color);
  font-weight: 600;
  font-size: 0.7rem;
  background: color-mix(in srgb, var(--warning-color) 10%, transparent);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--warning-color);
}
.envase-qty-input {
  width: 72px;
  padding: 0.15rem 0.25rem;
  background: color-mix(in srgb, var(--warning-color) 15%, transparent);
  border: 1px solid var(--warning-color);
  border-radius: 4px;
  color: var(--warning-color);
  font-size: 0.8rem;
  font-weight: 700;
  font-family: "Courier New", monospace;
  text-align: center;
  outline: none;
}
.envase-qty-input:focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--warning-color) 30%, transparent); }

.item-subtotal {
  font-weight: 700;
  color: var(--success-color);
  font-size: 0.95rem;
  font-family: "Courier New", monospace;
  flex-shrink: 0;
  white-space: nowrap;
}
.graje-sell { font-size: 0.75rem; }

.btn-remove-item {
  position: absolute;
  top: 4px;
  right: 4px;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  cursor: pointer;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.15), -1px -1px 3px rgba(255,255,255,0.02);
}
.btn-remove-item:hover, .btn-remove-item:active { background: var(--color-error); color: #fff; }

.empty-ticket-msg {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.empty-ticket-msg p { margin: 0; font-style: italic; font-size: 0.9rem; }

.checkout-footer {
  margin-top: auto;
  padding-top: 0.7rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  flex-shrink: 0;
}

.summary-table { display: flex; flex-direction: column; gap: 0.3rem; }
.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.summary-row.total {
  font-size: 1.2rem;
  color: var(--accent-color);
  border-top: 1px solid var(--border-color);
  padding-top: 0.3rem;
  margin-top: 0.2rem;
}
.summary-row.ganancia { color: var(--success-color); }
.pos-total-amount { font-weight: 700; color: var(--success-color); }

.metodo-select {
  width: 100%;
  padding: 0.6rem 0.7rem;
  background: var(--color-bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 3px 3px 6px rgba(0,0,0,0.15), -2px -2px 4px rgba(255,255,255,0.02);
}
.metodo-select:focus { outline: none; border-color: var(--accent-color); }

.checkout-actions { display: flex; flex-direction: column; gap: 0.5rem; }

.btn-checkout {
  width: 100%;
  min-height: 48px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.15s;
  padding: 0.7rem 1rem;
  font-family: inherit;
  color: #fff;
  box-shadow: 4px 4px 8px rgba(0,0,0,0.2), -2px -2px 6px rgba(255,255,255,0.03);
}
.btn-checkout.primary {
  background: linear-gradient(135deg, var(--color-success), color-mix(in srgb, var(--color-success) 60%, black));
}
.btn-checkout.primary:hover:not(:disabled) {
  box-shadow: 7px 7px 16px rgba(0,0,0,0.3), -4px -4px 10px rgba(255,255,255,0.04);
  transform: translateY(-2px);
}
.btn-checkout.primary:active:not(:disabled) {
  transform: scale(0.98);
  box-shadow: inset 3px 3px 6px rgba(0,0,0,0.2), inset -2px -2px 4px rgba(255,255,255,0.02);
}
.btn-checkout.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.btn-checkout.primary.danger {
  background: linear-gradient(135deg, var(--color-error), color-mix(in srgb, var(--color-error) 60%, black));
}
.btn-checkout .text { text-align: center; flex: 1; min-width: 0; }
.btn-checkout .shortcut-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  background: color-mix(in srgb, white 20%, transparent);
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  font-family: monospace;
}

.btn-checkout.secondary {
  height: 38px;
  min-height: 38px;
  width: auto;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  box-shadow: 3px 3px 6px rgba(0,0,0,0.15), -2px -2px 4px rgba(255,255,255,0.02);
  padding: 0.4rem 1rem;
}
.btn-checkout.secondary:hover { color: var(--color-accent); transform: translateY(-1px); }

/* ===== Corte ===== */
.report-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.report-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  transition: all 0.15s;
}
.report-row:hover { border-color: var(--accent-color); }
.report-main { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.report-ticket { font-weight: 700; font-size: 0.85rem; color: var(--accent-color); }
.report-meta { font-size: 0.7rem; color: var(--text-secondary); }
.report-total { font-weight: 800; color: var(--success-color); font-family: "Courier New", monospace; font-size: 0.95rem; }

.corte-resumen { gap: 0.6rem; }
.corte-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.corte-kpi {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.8rem;
  box-shadow: 3px 3px 6px rgba(0,0,0,0.12), -2px -2px 4px rgba(255,255,255,0.02);
}
.corte-kpi-label {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  font-weight: 700;
}
.corte-kpi-value { font-size: 1.1rem; font-weight: 900; color: var(--accent-color); font-family: "Courier New", monospace; }
.corte-kpi-value.success { color: var(--success-color); }

.amb-hint { margin: 0; font-size: 0.7rem; opacity: 0.75; text-align: center; }
.amb-hint.block { margin-top: 0.4rem; }
</style>