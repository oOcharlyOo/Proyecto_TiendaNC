<script setup lang="ts">
import { formatoMoneda, obtenerIniciales } from '../logica/usePosTicket';
import type { Ticket } from '../logica/usePosTipos';

defineProps<{
  tickets: Ticket[];
  ticketActualId: number | null;
  creandoTicket: boolean;
  totalPersonasCredito: number;
  ventasPendientesCount: number;
}>();

const emit = defineEmits<{
  'crear-nuevo-ticket': [];
  'seleccionar-ticket': [id: number];
  'eliminar-ticket': [id: number];
  'abrir-creditos': [];
  'abrir-pendientes': [];
}>();
</script>

<template>
  <aside class="pos-sidebar tickets-nav animate-slide-in-left">
    <div class="sidebar-header">
      <span class="icon">🎫</span>
      <h3>Tickets</h3>
      <button type="button" class="btn-add-ticket" :disabled="creandoTicket" @click="emit('crear-nuevo-ticket')" title="Nuevo Ticket">
        <span class="plus">+</span>
      </button>
    </div>

    <nav class="tickets-list custom-scrollbar">
      <div
        v-for="t in tickets"
        :key="t.id"
        class="ticket-nav-item"
        :class="{
          'is-active': t.id === ticketActualId,
          'is-completed': t.estado === 'completado',
          'is-empty': t.items.length === 0
        }"
        @click="emit('seleccionar-ticket', t.id)"
      >
        <div class="ticket-info">
          <span class="ticket-num">#{{ t.numero }}</span>
          <span class="ticket-total" v-if="t.items.length > 0">
            {{ formatoMoneda(t.items.reduce((sum, i) => sum + ((i as any).is_gramaje ? i.precio : i.precio * i.cantidad), 0)) }}
          </span>
          <span class="ticket-status" v-else>vacío</span>
          <span class="ticket-initials">{{ obtenerIniciales(t.nombreUsuario) }}</span>
        </div>
        <button
          v-if="t.items.length === 0 && tickets.length > 1"
          type="button"
          class="btn-delete-ticket"
          @click.stop="emit('eliminar-ticket', t.id)"
        >
          ×
        </button>
      </div>
    </nav>

    <div class="sidebar-actions">
      <button class="btn-creditos-sidebar" @click="emit('abrir-creditos')" title="Créditos">
        <span class="creditos-badge" v-if="totalPersonasCredito > 0">{{ totalPersonasCredito }}</span>
        💳
      </button>
      <button class="btn-pendientes-ticket" @click="emit('abrir-pendientes')" title="Ventas Pendientes">
        <span class="pending-badge" v-if="ventasPendientesCount > 0">{{ ventasPendientesCount }}</span>
        P
      </button>
    </div>
  </aside>
</template>
