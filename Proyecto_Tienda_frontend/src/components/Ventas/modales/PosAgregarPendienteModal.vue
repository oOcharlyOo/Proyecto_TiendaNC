<script setup lang="ts">
import { formatoMoneda } from '../logica/usePosTicket';

defineProps<{
  open: boolean;
  ventaPendienteSeleccionada: any;
  agregarPendienteBusqueda: string;
  agregarPendienteScannerActivo: boolean;
  productosFiltradosBusqueda: any[];
  agregarPendienteProductos: any[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:agregarPendienteBusqueda', val: string): void;
  (e: 'buscar-y-agregar'): void;
  (e: 'start-scanner-pendiente'): void;
  (e: 'agregar-producto', prod: any): void;
  (e: 'quitar-producto', idx: number): void;
  (e: 'confirmar-agregar'): void;
}>();
</script>

<template>
  <div v-if="open" class="pos-modal-overlay" @click.self="emit('close')">
    <div class="pos-modal-card modal-agregar-pendiente animate-pop-in">
      <header class="modal-header-clean">
        <h3>Agregar a Ticket #{{ ventaPendienteSeleccionada?.numeroTicket }}</h3>
        <button class="close-x" @click="emit('close')">×</button>
      </header>
      <div class="modal-body-clean custom-scrollbar">
        <div class="agregar-pendiente-search">
          <input ref="agregarPendienteInput" :value="agregarPendienteBusqueda" type="text" placeholder="Buscar o escanear producto..." @keyup.enter="emit('buscar-y-agregar')" @input="emit('update:agregarPendienteBusqueda', ($event.target as HTMLInputElement).value)">
          <button class="btn-scanner-mini" @click="emit('start-scanner-pendiente')" :class="{ active: agregarPendienteScannerActivo }">📷</button>
        </div>
        <div v-if="agregarPendienteScannerActivo" class="scanner-mini-viewport">
          <div id="scanner-interactive-pendiente"></div>
        </div>
        <div class="agregar-pendiente-results">
          <div v-for="prod in productosFiltradosBusqueda" :key="prod.idProducto" class="result-item" @click="emit('agregar-producto', prod)">
            <span class="result-name">{{ prod.nombre }}</span>
            <span class="result-price">{{ formatoMoneda(prod.precio_venta ?? 0) }}</span>
          </div>
        </div>
        <div v-if="agregarPendienteProductos.length > 0" class="agregar-pendiente-ticket">
          <h4>Productos a agregar</h4>
          <div v-for="(p, idx) in agregarPendienteProductos" :key="idx" class="ticket-item">
            <span class="ticket-item-name">{{ p.productoNombre }}</span>
            <span class="ticket-item-qty">{{ p.cantidad }} × {{ formatoMoneda(Number(p.precioUnitarioVenta)) }}</span>
            <button class="btn-remove-mini" @click="emit('quitar-producto', idx)">✕</button>
          </div>
          <div class="ticket-total">
            <span>Total:</span>
            <strong>{{ formatoMoneda(agregarPendienteProductos.reduce((s: number, p: any) => s + Number(p.precioUnitarioVenta) * p.cantidad, 0)) }}</strong>
          </div>
          <button class="btn-confirmar-agregar" @click="emit('confirmar-agregar')">Confirmar</button>
        </div>
      </div>
    </div>
  </div>
</template>
