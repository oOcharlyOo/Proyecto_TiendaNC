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
  <aside class="pos-right checkout-section animate-slide-in-right resize-trigger-active" :class="{ 'is-open': ticketVisibleMobile }">
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
            <strong class="total-amount">{{ formatoMoneda(totalVenta) }}</strong>
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
