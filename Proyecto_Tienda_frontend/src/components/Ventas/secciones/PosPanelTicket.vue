<script setup lang="ts">

import { formatoMoneda, formatImagenUrl, ticketInfoText } from '../logica/usePosTicket';
import { playSound } from '../logica/usePosSonido';
import { asAny } from '../logica/usePosTipos';
import type { Ticket, TicketItem, TicketItemPromocion } from '../logica/usePosTipos';

defineProps<{
  ticket: (TicketItem | TicketItemPromocion)[];
  ticketActual: Ticket | null;
  totalVenta: number;
  nombreUsuario: string;
  ticketVisibleMobile: boolean;
}>();

const emit = defineEmits<{
  'update:ticketVisibleMobile': [val: boolean];
  'start-resize': [event: MouseEvent | TouchEvent];
  'limpiar-ticket': [];
  'toggle-mayoreo': [item: TicketItem];
  'toggle-envase': [item: TicketItem];
  'editar-gramaje': [item: TicketItem];
  'disminuir-cantidad': [item: TicketItem];
  'aumentar-cantidad': [item: TicketItem];
  'quitar-item': [id: number];
  'cobrar': [];
  'abrir-proveedores-pedidos': [];
  'historial-ventas-abrir': [];
  'entrada-efectivo': [];
  'salida-efectivo': [];
}>();
</script>

<template>
  <aside class="pos-right" :class="{ 'is-open': ticketVisibleMobile }">
    <div v-if="ticketVisibleMobile" class="ticket-backdrop" @click="emit('update:ticketVisibleMobile', false)"></div>
    <!-- Activador para móviles con resize handle -->
    <div class="mobile-ticket-trigger" @click="emit('update:ticketVisibleMobile', !ticketVisibleMobile)">
      <div class="resize-handle-trigger" @mousedown.stop="emit('start-resize', $event)" @touchstart.stop="emit('start-resize', $event)">
        <span class="resize-dots">⋮⋮</span>
      </div>
      <div class="trigger-info">
        <span class="icon">🛒</span>
        <span class="count">{{ ticketInfoText }}</span>
      </div>
      <div class="trigger-total">{{ formatoMoneda(totalVenta) }}</div>
      <span class="chevron">{{ ticketVisibleMobile ? '▼' : '▲' }}</span>
    </div>

    <div class="checkout-container parchment-bg">
      <header class="checkout-header">
        <div class="header-title">
          <span class="icon">📜</span>
          <h3>Cuenta #{{ ticketActual?.numero ?? '-' }}</h3>
        </div>
        <button class="btn-clear-all" @click="emit('limpiar-ticket')" v-if="ticket.length > 0">Limpiar</button>
      </header>

      <!-- LISTA DE ITEMS EN EL TICKET -->
      <div class="ticket-items-list custom-scrollbar">
        <TransitionGroup name="list">
          <article v-for="item in ticket" :key="item.id" class="ticket-item-row" :class="{ 'is-promo': asAny(item).is_promocion }">
            <div class="item-main">
              <div v-if="asAny(item).is_promocion" class="item-image">
                <img
                  v-if="asAny(item).promocion?.imagen_url"
                  :src="formatImagenUrl(asAny(item).promocion.imagen_url)"
                  :alt="item.nombre"
                />
                <span v-else class="promo-placeholder">🎁</span>
              </div>
              <div class="item-info">
                <h4 class="item-name">
                  <span v-if="asAny(item).is_promocion" class="promo-badge">❧</span>
                  <span class="item-name-inner">{{ item.nombre }}</span>
                </h4>
                <div class="item-meta" v-if="asAny(item).is_promocion">
                  <span class="promo-contents">{{ asAny(item).promocion.detalles.map((d: any) => `${d.cantidad >= 1000 ? (d.cantidad / 1000) + 'kg' : d.cantidad + 'pza'} ${d.nombre_producto}`).join(', ') }}</span>
                </div>
                <div class="item-meta" v-else>
                  <span class="unit-price" v-if="asAny(item).is_gramaje">{{ formatoMoneda(asAny(item).dto?.precio_venta || item.precio) }}/kg</span>
                  <span class="unit-price" v-else>{{ formatoMoneda(item.precio) }}</span>
                  <label v-if="asAny(item).precio_mayoreo && asAny(item).precio_mayoreo > 0" class="mayoreo-toggle">
                    <input type="checkbox" :checked="asAny(item).is_mayoreo" @change="emit('toggle-mayoreo', asAny(item))">
                    <span>Mayoreo</span>
                  </label>
                  <label v-if="asAny(item).requiere_envase && asAny(item).precio_envase" class="envase-toggle">
                    <input type="checkbox" :checked="asAny(item).envase_aplicado" @change="emit('toggle-envase', asAny(item))">
                    <span>Envase</span>
                  </label>
                  <input v-if="asAny(item).envase_aplicado" type="number" min="0" :max="item.cantidad" v-model.number="asAny(item).cantidad_envase" class="envase-qty-input" @change="playSound('add')" title="Cantidad de envases a cobrar">
                </div>
              </div>

              <div class="item-actions">
                <div class="qty-control" v-if="asAny(item).is_gramaje">
                  <button class="qty-btn calc-btn" @click="emit('editar-gramaje', asAny(item))" title="Editar cantidad">⚖️</button>
                  <span class="qty-val">{{ item.cantidad }}g</span>
                </div>
                <div class="qty-control" v-else-if="!asAny(item).is_promocion">
                  <button class="qty-btn" @click="emit('disminuir-cantidad', asAny(item))">-</button>
                  <span class="qty-val">{{ item.cantidad }}</span>
                  <button class="qty-btn" @click="emit('aumentar-cantidad', asAny(item))">+</button>
                </div>
                <div v-else class="qty-control promo-qty">
                  <button class="qty-btn" @click="emit('disminuir-cantidad', asAny(item))">-</button>
                  <span class="qty-val">{{ item.cantidad }}</span>
                  <button class="qty-btn" @click="emit('aumentar-cantidad', asAny(item))">+</button>
                </div>
                <div class="item-subtotal" :class="{ 'promo-price': asAny(item).is_promocion }">
                  {{ formatoMoneda(asAny(item).is_gramaje ? item.precio : item.precio * item.cantidad) }}
                </div>
              </div>
            </div>
            <button class="btn-remove-item" @click="emit('quitar-item', item.id)" title="Quitar item">×</button>
          </article>
        </TransitionGroup>

        <div v-if="ticket.length === 0" class="empty-ticket-msg">
          <p>No hay productos en esta cuenta</p>
        </div>

        <!-- Zelda sprites dentro del ticket -->
        <div class="zelda-sprites-overlay" aria-hidden="true">
          <div class="link-sprite">
            <div class="link-frame frame1"></div>
            <div class="link-frame frame2"></div>
          </div>

          <div class="octo-sprite">
            <div class="octo-frame frame1"></div>
            <div class="octo-frame frame2"></div>
          </div>
        </div>
      </div>

      <!-- RESUMEN FINAL -->
      <footer class="checkout-footer">
        <div class="summary-table">
          <div class="summary-row">
            <span>Artículos:</span>
            <strong>{{ ticketInfoText }}</strong>
          </div>
          <div class="summary-row total">
            <span>TOTAL</span>
            <strong class="pos-total-amount">{{ formatoMoneda(totalVenta) }}</strong>
          </div>
        </div>

        <div class="checkout-actions-scroll">
          <div class="checkout-actions">
            <button class="btn-checkout primary" @click="emit('cobrar')" :disabled="ticket.length === 0">
              <span class="icon">💰</span>
              <span class="text">COBRAR AHORA</span>
              <span class="shortcut-badge">F12</span>
            </button>

            <div class="extra-actions">
              <button class="btn-checkout secondary" @click="emit('abrir-proveedores-pedidos')" title="Proveedores y Pedidos">🚚</button>
              <button class="btn-checkout secondary" @click="emit('historial-ventas-abrir')" title="Historial">📜</button>
              <button class="btn-checkout secondary" @click="emit('entrada-efectivo')" title="Entrada Cash">📥</button>
              <button class="btn-checkout secondary" @click="emit('salida-efectivo')" title="Salida Cash">📤</button>
            </div>
          </div>
        </div>

        <div class="cashier-badge">
          <span class="dot"></span> Cajero: {{ nombreUsuario }}
        </div>
      </footer>
    </div>
  </aside>
</template>

<style scoped>
.pos-container .pos-right {
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
  .pos-container .pos-right {
    width: 400px;
    min-width: 400px;
    max-width: 400px;
  }
}

@media (max-width: 1199px) {
  .pos-container .pos-right {
    width: 320px;
    min-width: 320px;
    max-width: 320px;
  }
}

@media (max-width: 991px) {
  .pos-container .pos-right {
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
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .pos-container .pos-right:not(.is-open) {
    transform: translateY(calc(100% - 52px));
    height: auto;
    min-height: 52px;
  }
  .pos-container .pos-right.is-open {
    transform: translateY(0);
    height: 65vh;
  }
  .pos-container .is-open .ticket-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.35);
    z-index: -1;
  }
  .pos-container .mobile-ticket-trigger {
    display: flex;
    flex-shrink: 0;
  }
  .pos-container .checkout-container {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
}

/* Mobile ticket trigger — hidden on desktop */
.pos-container .ticket-backdrop {
  display: none;
}
.pos-container .mobile-ticket-trigger {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: var(--color-bg-secondary);
  border-top: none;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  gap: 0.5rem;
  min-height: 48px;
  box-shadow: 0 -2px 8px rgba(0,0,0,.1);
}

.pos-container .resize-handle-trigger{display:none}.pos-container .mobile-ticket-trigger .resize-handle-trigger{display:flex;align-items:center;justify-content:center;height:24px;cursor:row-resize;flex-shrink:0}
.pos-container .resize-dots{font-size:18px;color:var(--color-text-secondary);opacity:.8}
.pos-container .resize-handle-trigger:active .resize-dots{opacity:1;color:var(--color-accent)}

.pos-container .trigger-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pos-container .trigger-info .icon {
  font-size: 1.1rem;
}

.pos-container .trigger-total {
  font-size: 1rem;
  font-weight: 700;
  color: var(--success-color);
}

.pos-container .chevron {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

@media (max-width: 480px) {
  .pos-container .mobile-ticket-trigger {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    min-height: 36px;
  }
  .pos-container .trigger-info .icon {
    font-size: 0.9rem;
  }
  .pos-container .trigger-total {
    font-size: 0.9rem;
  }
}

.pos-container .checkout-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.pos-container .parchment-bg {
  background-color: var(--bg-secondary);
}

.pos-container .checkout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.pos-container .header-title { display: flex; align-items: center; gap: 0.4rem; }
.pos-container .header-title h3 { 
  color: var(--accent-color); 
  font-size: 1.1rem;
  font-weight: 700;
}

@media (max-width: 991px) {
  .pos-container .checkout-header {
    padding-bottom: 0.5rem;
    margin-bottom: 0.6rem;
  }
  .pos-container .header-title h3 {
    font-size: 1rem;
  }
}

.pos-container .btn-clear-all {
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
  box-shadow:
    3px 3px 6px rgba(0, 0, 0, 0.15),
    -2px -2px 4px rgba(255, 255, 255, 0.02);
}

.pos-container .btn-clear-all:hover {
  color: var(--color-text-primary);
  box-shadow:
    5px 5px 10px rgba(0, 0, 0, 0.2),
    -2px -2px 6px rgba(255, 255, 255, 0.03);
}

.pos-container .btn-clear-all:active {
  transform: scale(0.97);
  box-shadow:
    inset 2px 2px 4px rgba(0, 0, 0, 0.15),
    inset -1px -1px 3px rgba(255, 255, 255, 0.02);
}

.pos-container .ticket-items-list {
  flex: 1;
  min-height: 100px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding-right: 0.5rem;
  box-sizing: border-box;
  position: relative;
}

.pos-container .ticket-item-row {
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

.pos-container .ticket-item-row:hover {
  border-color: var(--accent-color);
}

.pos-container .ticket-item-row.is-promo {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 6%, var(--bg-primary));
}

.pos-container .ticket-item-row.is-promo .item-name {
  color: var(--accent-color);
}

.pos-container .item-main { 
  display: flex; 
  flex-direction: column; 
  gap: 0.4rem; 
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.pos-container .item-name { 
  font-size: 0.9rem; 
  font-weight: 600; 
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;
  width: 100%;
}

.pos-container .item-name-inner {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.pos-container .item-image {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
}

.pos-container .item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pos-container .promo-placeholder {
  font-size: 1.5rem;
  color: var(--accent-color);
}

.pos-container .promo-badge {
  margin-right: 0.3rem;
  font-size: 1rem;
}

.pos-container .promo-contents {
  font-size: 0.7rem;
  color: var(--text-secondary);
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
}

.pos-container .promo-qty {
  opacity: 0.7;
}

.pos-container .promo-price {
  color: var(--success-color);
  font-weight: bold;
  font-family: "Courier New", monospace;
}

.pos-container .item-meta { 
  display: flex; 
  align-items: center; 
  gap: 0.8rem; 
  font-size: 0.75rem; 
  flex-wrap: wrap;
}
.pos-container .unit-price { color: var(--text-secondary); font-size: 0.7rem; font-family: "Courier New", monospace; }

.pos-container .mayoreo-toggle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--accent-color);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.7rem;
  background: color-mix(in srgb, var(--accent-color) 10%, transparent);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--accent-color);
  transition: all 0.15s;
}

.pos-container .mayoreo-toggle:hover {
  background: color-mix(in srgb, var(--accent-color) 18%, transparent);
}

.pos-container .mayoreo-toggle input {
  accent-color: var(--accent-color);
}

.pos-container .envase-toggle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--warning-color);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.7rem;
  background: color-mix(in srgb, var(--warning-color) 10%, transparent);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--warning-color);
  transition: all 0.15s;
}

.pos-container .envase-toggle:hover {
  background: color-mix(in srgb, var(--warning-color) 18%, transparent);
}

.pos-container .envase-toggle input {
  accent-color: var(--warning-color);
}

.pos-container .envase-qty-input {
  width: 42px;
  padding: 0.15rem 0.25rem;
  background: color-mix(in srgb, var(--warning-color) 15%, transparent);
  border: 1px solid var(--warning-color);
  border-radius: 4px;
  color: var(--warning-color);
  font-size: 0.7rem;
  font-weight: 700;
  font-family: "Courier New", monospace;
  text-align: center;
  outline: none;
  transition: all 0.15s;
}

.pos-container .envase-qty-input:focus {
  background: color-mix(in srgb, var(--warning-color) 25%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--warning-color) 30%, transparent);
}

.pos-container .envase-qty-input::-webkit-inner-spin-button {
  opacity: 1;
}

.pos-container .item-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.3rem;
  min-width: 0;
  flex-shrink: 0;
}

.pos-container .qty-control {
  display: flex;
  align-items: center;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow:
    inset 3px 3px 6px rgba(0, 0, 0, 0.2),
    inset -2px -2px 4px rgba(255, 255, 255, 0.02);
}

.pos-container .qty-btn {
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

.pos-container .qty-btn:hover { 
  background: color-mix(in srgb, var(--color-accent) 25%, transparent);
  color: var(--color-accent);
}

.pos-container .qty-btn:active {
  background: color-mix(in srgb, var(--color-accent) 35%, transparent);
  color: var(--color-accent);
  transform: scale(0.95);
}

.pos-container .calc-btn {
  font-size: 1.1rem;
  width: 36px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

@media (max-width: 480px) {
  .pos-container .calc-btn {
    font-size: 1rem;
    width: 32px;
    height: 28px;
  }
}

.pos-container .calc-btn:hover {
  background: color-mix(in srgb, var(--success-color) 25%, transparent);
  color: var(--success-color);
}

.pos-container .qty-val { 
  width: 45px; 
  text-align: center; 
  font-size: 0.85rem; 
  font-weight: bold;
  font-family: "Courier New", monospace;
}

.pos-container .item-subtotal { 
  font-weight: 700; 
  color: var(--success-color); 
  font-size: 0.95rem;
  font-family: "Courier New", monospace;
  flex-shrink: 0;
  white-space: nowrap;
}

/* Media queries para items del ticket en panel derecho */
@media (max-width: 1199px) {
  .pos-container .ticket-item-row {
    padding: 0.6rem;
  }
  .pos-container .item-name {
    font-size: 0.85rem;
  }
  .pos-container .qty-control {
    transform: scale(0.9);
  }
  .pos-container .item-subtotal {
    font-size: 0.9rem;
  }
}

@media (max-width: 991px) {
  .pos-container .ticket-item-row {
    padding: 0.5rem;
  }
  .pos-container .item-name {
    font-size: 0.8rem;
  }
  .pos-container .qty-control {
    transform: scale(0.8);
  }
  .pos-container .qty-val {
    width: 35px;
    font-size: 0.8rem;
  }
  .pos-container .item-subtotal {
    font-size: 0.85rem;
  }
}

@media (max-width: 767px) {
  .pos-container .ticket-item-row {
    padding: 0.35rem 0.45rem;
    gap: 0.2rem;
  }
  .pos-container .item-main {
    gap: 0.15rem;
  }
  .pos-container .item-name {
    font-size: 0.78rem;
  }
  .pos-container .item-price {
    font-size: 0.72rem;
  }
  .pos-container .item-subtotal {
    font-size: 0.8rem;
  }
  .pos-container .qty-control {
    transform: scale(0.8);
  }
  .pos-container .qty-val {
    width: 28px;
    font-size: 0.75rem;
  }
  .pos-container .qty-btn {
    width: 24px;
    height: 24px;
    font-size: 0.8rem;
  }
  .pos-container .btn-remove-item {
    width: 22px;
    height: 22px;
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .pos-container .ticket-item-row {
    padding: 0.25rem 0.35rem;
    gap: 0.15rem;
    border-radius: 6px;
  }
  .pos-container .item-name {
    font-size: 0.7rem;
  }
  .pos-container .item-price {
    font-size: 0.65rem;
  }
  .pos-container .item-subtotal {
    font-size: 0.7rem;
    min-width: 50px;
  }
  .pos-container .qty-control {
    transform: scale(0.7);
    gap: 1px;
  }
  .pos-container .qty-val {
    width: 24px;
    font-size: 0.7rem;
  }
  .pos-container .qty-btn {
    width: 20px;
    height: 20px;
    font-size: 0.7rem;
    border-radius: 4px;
  }
  .pos-container .btn-remove-item {
    width: 18px;
    height: 18px;
    font-size: 0.7rem;
    top: 2px;
    right: 2px;
  }
}

@media (max-width: 400px) {
  .pos-container .ticket-item-row {
    padding: 0.2rem 0.3rem;
    gap: 0.1rem;
    border-radius: 5px;
  }
  .pos-container .item-name {
    font-size: 0.65rem;
  }
  .pos-container .item-price {
    font-size: 0.6rem;
  }
  .pos-container .item-subtotal {
    font-size: 0.65rem;
    min-width: 45px;
  }
}

.pos-container .btn-remove-item {
  position: absolute;
  top: 4px;
  right: 4px;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  cursor: pointer;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow:
    2px 2px 4px rgba(0, 0, 0, 0.15),
    -1px -1px 3px rgba(255, 255, 255, 0.02);
}

.pos-container .btn-remove-item:hover, .pos-container .btn-remove-item:active { 
  background: var(--color-error);
  color: #fff;
  box-shadow:
    4px 4px 8px rgba(0, 0, 0, 0.2);
}

.pos-container .checkout-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  flex-shrink: 0;
}

.pos-container .empty-ticket-msg {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.pos-container .empty-ticket-msg p {
  margin: 0;
  font-style: italic;
  font-size: 0.9rem;
}

.pos-container .empty-ticket-icon {
  font-size: 3rem;
  opacity: 0.4;
}



.pos-container .empty-catalog {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.pos-container .empty-catalog p {
  margin: 0;
  font-style: italic;
}

.pos-container .pos-empty-icon {
  font-size: 4rem;
  opacity: 0.3;
}

.pos-container .summary-table { display: flex; flex-direction: column; gap: 0.3rem; }
.pos-container .summary-row { 
  display: flex; 
  justify-content: space-between; 
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.pos-container .summary-row.total {
  font-size: 1.4rem;
  color: var(--accent-color);
  border-top: 1px solid var(--border-color);
  padding-top: 0.4rem;
  margin-top: 0.3rem;
}

.pos-container .pos-total-amount { 
  font-weight: 700; 
  color: var(--success-color);
}

@media (max-width: 991px) {
  .pos-container .summary-row {
    font-size: 0.8rem;
  }
  .pos-container .summary-row.total {
    font-size: 1.2rem;
  }
}

.pos-container .checkout-actions-scroll {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.3rem;
}

.pos-container .checkout-actions-scroll .checkout-actions {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  min-width: min-content;
  align-items: center;
}

.pos-container .checkout-actions-scroll .btn-checkout.primary {
  width: auto;
  min-width: 140px;
  max-width: 220px;
  height: auto;
  min-height: 42px;
  white-space: normal;
  background: linear-gradient(135deg, var(--color-success), color-mix(in srgb, var(--color-success) 60%, black));
  border: none;
  transition: all 0.15s;
  padding: 0.5rem 0.8rem;
  box-shadow:
    4px 4px 8px rgba(0, 0, 0, 0.2),
    -2px -2px 6px rgba(255, 255, 255, 0.03);
}

.pos-container .checkout-actions-scroll .btn-checkout.primary .text {
  text-align: center;
  word-break: break-word;
  line-height: 1.2;
}

.pos-container .checkout-actions-scroll .btn-checkout.primary:hover {
  box-shadow:
    6px 6px 12px rgba(0, 0, 0, 0.25),
    -3px -3px 8px rgba(255, 255, 255, 0.04);
  transform: translateY(-1px);
}

.pos-container .checkout-actions-scroll .btn-checkout.primary:active {
  transform: scale(0.97);
  box-shadow:
    inset 3px 3px 6px rgba(0, 0, 0, 0.2),
    inset -2px -2px 4px rgba(255, 255, 255, 0.02);
}

.pos-container .checkout-actions-scroll .btn-checkout.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.pos-container .checkout-actions-scroll .extra-actions {
  display: flex;
  gap: 0.4rem;
}
.pos-container .extra-actions {
  justify-content: center;
}

.pos-container .checkout-actions-scroll .extra-actions .btn-checkout.secondary {
  background: var(--color-bg-primary);
  border: none;
  transition: all 0.15s;
  box-shadow:
    3px 3px 6px rgba(0, 0, 0, 0.15),
    -2px -2px 4px rgba(255, 255, 255, 0.02);
}

.pos-container .checkout-actions-scroll .extra-actions .btn-checkout.secondary:hover {
  color: var(--color-accent);
  box-shadow:
    5px 5px 10px rgba(0, 0, 0, 0.2),
    -3px -3px 6px rgba(255, 255, 255, 0.03);
}

.pos-container .checkout-actions-scroll .extra-actions .btn-checkout.secondary:active {
  transform: scale(0.95);
}

.pos-container .checkout-actions-scroll .btn-checkout.secondary {
  width: 42px;
  min-width: 42px;
  height: 42px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pos-container .checkout-actions { display: flex; flex-direction: column; gap: 0.6rem; }

.pos-container .btn-checkout.primary {
  width: 100%;
  height: auto;
  min-height: 50px;
  background: linear-gradient(135deg, var(--color-success), color-mix(in srgb, var(--color-success) 60%, black));
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.15s;
  padding: 0.7rem 1rem;
  font-family: inherit;
  box-shadow:
    5px 5px 12px rgba(0, 0, 0, 0.25),
    -3px -3px 8px rgba(255, 255, 255, 0.03);
}

.pos-container .btn-checkout.primary .text {
  text-align: center;
  word-break: break-word;
  line-height: 1.2;
  flex: 1;
  min-width: 0;
}

.pos-container .btn-checkout.primary:hover:not(:disabled) { 
  box-shadow:
    7px 7px 16px rgba(0, 0, 0, 0.3),
    -4px -4px 10px rgba(255, 255, 255, 0.04);
  transform: translateY(-2px);
}

.pos-container .btn-checkout.primary:active:not(:disabled) {
  transform: scale(0.98);
  box-shadow:
    inset 3px 3px 6px rgba(0, 0, 0, 0.2),
    inset -2px -2px 4px rgba(255, 255, 255, 0.02);
}

.pos-container .btn-checkout.primary:disabled { 
  opacity: 0.4; 
  cursor: not-allowed; 
  transform: none;
  box-shadow: none;
}

.pos-container .shortcut-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  background: color-mix(in srgb, white 20%, transparent);
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  font-family: monospace;
}

.pos-container .btn-checkout.primary:disabled .shortcut-badge {
  opacity: 0.6;
}

.pos-container .extra-actions { 
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 0.4rem; 
}

.pos-container .btn-checkout.secondary {
  height: 42px;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  transition: all 0.15s;
  font-family: inherit;
  box-shadow:
    3px 3px 6px rgba(0, 0, 0, 0.15),
    -2px -2px 4px rgba(255, 255, 255, 0.02);
}

.pos-container .btn-checkout.secondary:hover {
  color: var(--color-accent);
  box-shadow:
    5px 5px 10px rgba(0, 0, 0, 0.2),
    -3px -3px 6px rgba(255, 255, 255, 0.03);
  transform: translateY(-1px);
}
.pos-container .btn-checkout.secondary:active {
  box-shadow:
    inset 2px 2px 4px rgba(0, 0, 0, 0.15),
    inset -1px -1px 3px rgba(255, 255, 255, 0.02);
  transform: scale(0.95);
}

.pos-container .btn-checkout.secondary:active {
  transform: scale(0.95);
}

@media (max-width: 991px) {
  .pos-container .btn-checkout.primary {
    height: 48px;
    font-size: 1rem;
  }
  .pos-container .btn-checkout.secondary {
    height: 38px;
    font-size: 1rem;
  }
}

@media (max-width: 767px) {
  .pos-container .btn-checkout.primary {
    height: 48px;
    font-size: 0.95rem;
  }
  .pos-container .extra-actions {
    gap: 0.3rem;
  }
  .pos-container .btn-checkout.secondary {
    height: 36px;
    font-size: 0.95rem;
  }
}

.pos-container .btn-checkout.secondary:hover { 
  border-color: var(--accent-color); 
  background: var(--bg-secondary);
  filter: brightness(1.1);
}

.pos-container .cashier-badge {
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  font-weight: 600;
  background: var(--bg-primary);
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}
.pos-container .cashier-badge .dot { 
  width: 7px; 
  height: 7px; 
  background: var(--success-color);
  border-radius: 50%;
}
</style>
