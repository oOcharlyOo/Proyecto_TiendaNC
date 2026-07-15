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
  <aside class="pos-sidebar tickets-nav">
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

<style scoped>
.pos-container .pos-sidebar {
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

@media (min-width: 1400px) {
  .pos-container .pos-sidebar {
    width: 70px;
    min-width: 70px;
    max-width: 70px;
  }
}

@media (max-width: 1199px) {
  .pos-container .pos-sidebar {
    width: 60px;
    min-width: 60px;
    max-width: 60px;
    padding: 0.6rem 0.3rem;
  }
}

@media (max-width: 991px) {
  .pos-container .pos-sidebar {
    display: none !important;
  }
}

.pos-container .sidebar-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.pos-container .sidebar-header h3 { 
  font-size: 0.7rem; 
  text-transform: uppercase; 
  color: var(--accent-color);
  font-weight: 700;
  letter-spacing: 0.1em;
}

.pos-container .btn-add-ticket {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  border: none;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover));
  color: var(--color-on-brand);
  font-size: 1.4rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  box-shadow:
    3px 3px 6px rgba(0, 0, 0, 0.2),
    -2px -2px 4px rgba(255, 255, 255, 0.03);
}

.pos-container .btn-add-ticket:hover { 
  box-shadow:
    5px 5px 10px rgba(0, 0, 0, 0.25),
    -3px -3px 6px rgba(255, 255, 255, 0.04);
  transform: translateY(-1px);
}

.pos-container .btn-add-ticket:active {
  transform: scale(0.95);
  box-shadow:
    inset 2px 2px 4px rgba(0, 0, 0, 0.2),
    inset -1px -1px 3px rgba(255, 255, 255, 0.02);
}

.pos-container .tickets-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.2rem;
}

.pos-container .ticket-nav-item {
  width: 100%;
  max-width: 56px;
  height: 72px;
  margin: 0 auto;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  box-sizing: border-box;
  box-shadow:
    3px 3px 6px rgba(0, 0, 0, 0.15),
    -2px -2px 4px rgba(255, 255, 255, 0.02);
}

.pos-container .ticket-nav-item:hover {
  box-shadow:
    5px 5px 10px rgba(0, 0, 0, 0.2),
    -3px -3px 6px rgba(255, 255, 255, 0.03);
  transform: translateX(3px);
}

.pos-container .ticket-nav-item.is-active {
  background: color-mix(in srgb, var(--color-accent) 15%, var(--color-bg-secondary));
  box-shadow:
    inset 3px 3px 6px rgba(0, 0, 0, 0.15),
    inset -2px -2px 4px rgba(255, 255, 255, 0.02);
  transform: translateX(5px);
}

.pos-container .ticket-nav-item.is-empty {
  opacity: 0.6;
}

.pos-container .ticket-info { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  gap: 2px;
}
.pos-container .ticket-num { 
  font-weight: 600; 
  font-size: 0.8rem; 
  color: var(--accent-color); 
}
.pos-container .ticket-nav-item .ticket-total {
  display: block;
  font-size: 0.55rem;
  color: var(--success-color);
  font-weight: 600;
  white-space: nowrap;
  padding: 0;
  margin-top: 0;
  border-top: none;
}
.pos-container .ticket-status { 
  font-size: 0.45rem; 
  color: var(--text-secondary); 
  text-transform: uppercase; 
}
.pos-container .ticket-initials {
  font-size: 0.45rem;
  color: var(--text-secondary);
  font-weight: 600;
  line-height: 1;
}
.pos-container .chip-user {
  font-size: 0.45rem;
  color: var(--text-secondary);
  font-weight: 600;
  line-height: 1;
  margin-left: 4px;
  flex-shrink: 0;
}

.pos-container .btn-delete-ticket {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  background: var(--error-color);
  color: var(--text-primary);
  border-radius: 50%;
  border: none;
  font-size: 10px;
  font-weight: 600;
  display: none;
  align-items: center;
  justify-content: center;
}

.pos-container .ticket-nav-item:hover .btn-delete-ticket { display: flex; }

.pos-container .sidebar-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin: 0.5rem auto 0.75rem;
}

.pos-container .btn-creditos-sidebar {
  width: 44px;
  height: 44px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: color-mix(in srgb, var(--infoBlueColor) 50%, var(--accent-color));
  font-size: 1.2rem;
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pos-container .btn-creditos-sidebar:hover {
  border-color: color-mix(in srgb, var(--infoBlueColor) 50%, var(--accent-color));
  background: color-mix(in srgb, color-mix(in srgb, var(--infoBlueColor) 50%, var(--accent-color)) 10%, var(--bg-primary));
}

.pos-container .btn-creditos-sidebar .creditos-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: color-mix(in srgb, var(--infoBlueColor) 50%, var(--accent-color));
  color: var(--text-primary);
  font-size: 0.6rem;
  font-weight: 600;
  min-width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pos-container .btn-pendientes-ticket {
  width: 44px;
  height: 44px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--accent-color);
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pos-container .btn-pendientes-ticket:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-primary));
}

.pos-container .btn-pendientes-ticket .pending-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--error-color);
  color: var(--text-primary);
  font-size: 0.6rem;
  font-weight: 600;
  min-width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: badge-pulse 2s infinite;
}

/* Media queries para tickets */
@media (max-width: 1199px) {
  .pos-container .ticket-nav-item {
    max-width: 48px;
    height: 54px;
  }
  .pos-container .ticket-num { font-size: 0.75rem; }
  .pos-container .ticket-total { font-size: 0.5rem; }
}

@media (max-width: 991px) {
  .pos-container .pos-sidebar {
  }
}

@keyframes badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}
</style>
