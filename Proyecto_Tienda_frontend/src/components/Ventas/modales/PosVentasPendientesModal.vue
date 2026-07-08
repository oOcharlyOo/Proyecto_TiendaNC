<script setup lang="ts">
import { formatoMoneda } from '../logica/usePosTicket';

defineProps<{
  open: boolean;
  ventasPendientes: any[];
  ventasPendientesAgrupadas: any[];
  vpVistaLista: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:vpVistaLista', val: boolean): void;
  (e: 'cobrar', venta: any): void;
  (e: 'editar-descripcion', venta: any): void;
  (e: 'eliminar', venta: any): void;
  (e: 'agregar-productos', venta: any): void;
}>();
</script>

<template>
  <div v-if="open" class="pos-modal-overlay" @click.self="emit('close')">
    <div class="pos-modal-card modal-pendientes animate-pop-in">
      <header class="vp-modal-head">
        <div class="vp-head-left">
          <h3 class="vp-title">📋 Ventas Pendientes</h3>
          <span class="vp-count" v-if="ventasPendientes.length > 0">{{ ventasPendientes.length }} ticket{{ ventasPendientes.length > 1 ? 's' : '' }}</span>
        </div>
        <div class="vp-head-right">
          <div class="vp-views">
            <button :class="['vp-vbtn', { on: vpVistaLista }]" @click="emit('update:vpVistaLista', true)" title="Lista">📋</button>
            <button :class="['vp-vbtn', { on: !vpVistaLista }]" @click="emit('update:vpVistaLista', false)" title="Cuadrícula">🔲</button>
          </div>
          <button class="vp-close" @click="emit('close')">✕</button>
        </div>
      </header>
      <div class="vp-modal-body custom-scrollbar">
        <div v-if="ventasPendientes.length === 0" class="vp-empty">
          <span class="vp-empty-ico">✅</span>
          <p class="vp-empty-text">No hay ventas pendientes</p>
        </div>
        <!-- VISTA LISTA -->
        <div v-else-if="vpVistaLista" class="vp-list">
          <div v-for="v in ventasPendientesAgrupadas" :key="v.idVenta" class="vp-list-row">
            <div class="vp-list-main" @click="emit('cobrar', v)">
              <div class="vp-list-left">
                <span class="vp-list-badge">#{{ v.numeroTicket }}</span>
                <span class="vp-list-time">{{ v.fechaVenta?.slice(11, 16) }}</span>
                <span class="vp-list-user">👤 {{ v.nombreUsuario }}</span>
              </div>
              <span class="vp-list-amount">{{ formatoMoneda(Number(v.montoTotal)) }}</span>
            </div>
            <div v-if="v.descripcionPendiente" class="vp-list-desc">
              <span class="vp-list-desc-ico">📝</span>
              <span class="vp-list-desc-text">{{ v.descripcionPendiente }}</span>
              <button class="vp-list-edit-desc" @click.stop="emit('editar-descripcion', v)" title="Editar">✏️</button>
            </div>
            <div v-if="v.detallesAgrupados && v.detallesAgrupados.length > 0" class="vp-list-details">
              <div v-for="(d, i) in v.detallesAgrupados" :key="i" class="vp-list-detail-row">
                <span class="vp-list-detail-qty">{{ d.cantidad }}{{ d.isGramaje ? 'g' : 'pz' }}</span>
                <span class="vp-list-detail-name">{{ d.productoNombre }}</span>
                <span class="vp-list-detail-price">{{ formatoMoneda(Number(d.precioUnitarioVenta)) }}</span>
              </div>
            </div>
            <div class="vp-list-actions">
              <button class="vp-list-btn-del" @click.stop="emit('eliminar', v)" title="Eliminar">🗑️</button>
              <button class="vp-list-btn-add" @click.stop="emit('agregar-productos', v)" title="Agregar productos">➕</button>
              <button class="vp-list-btn-cobrar" @click.stop="emit('cobrar', v)">💰 Cobrar</button>
            </div>
          </div>
        </div>
        <!-- VISTA GRID -->
        <div v-else class="vp-grid">
          <article v-for="v in ventasPendientesAgrupadas" :key="v.idVenta" class="vp-card">
            <div class="vp-card-head">
              <div class="vp-ticket-box">
                <span class="vp-ticket-badge">#{{ v.numeroTicket }}</span>
                <span class="vp-time">{{ v.fechaVenta?.slice(11, 16) }}</span>
              </div>
              <span class="vp-amount">{{ formatoMoneda(Number(v.montoTotal)) }}</span>
            </div>
            <div class="vp-card-user">
              <span class="vp-user-ico">👤</span>
              <span class="vp-user-name">{{ v.nombreUsuario }}</span>
            </div>
            <div v-if="v.descripcionPendiente" class="vp-desc">
              <span class="vp-desc-ico">📝</span>
              <span class="vp-desc-text">{{ v.descripcionPendiente }}</span>
              <button class="vp-edit-desc" @click.stop="emit('editar-descripcion', v)" title="Editar">✏️</button>
            </div>
            <div v-if="v.detallesAgrupados && v.detallesAgrupados.length > 0" class="vp-details">
              <div v-for="(d, i) in v.detallesAgrupados" :key="i" class="vp-detail-row">
                <span class="vp-detail-qty">{{ d.cantidad }}{{ d.isGramaje ? 'g' : 'pz' }}</span>
                <span class="vp-detail-name">{{ d.productoNombre }}</span>
                <span class="vp-detail-price">{{ formatoMoneda(Number(d.precioUnitarioVenta)) }}</span>
              </div>
            </div>
            <div class="vp-actions">
              <button class="vp-btn-del" @click.stop="emit('eliminar', v)" title="Eliminar">🗑️</button>
              <button class="vp-btn-add" @click.stop="emit('agregar-productos', v)" title="Agregar productos">➕</button>
              <button class="vp-btn-cobrar" @click.stop="emit('cobrar', v)">💰 Cobrar</button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>
