<script setup lang="ts">
import type { Estacion } from '../logica/useRental';

defineProps<{
  station: Estacion;
  ticker: number;
  formatTime: (s: number) => string;
  formatoMoneda: (v: number) => string;
  getTiempoRestante: (s: Estacion) => number;
  getStationBorderClass: (s: Estacion) => string;
  getStatusBadgeClass: (s: Estacion) => string;
  getTimerColorClass: (s: Estacion) => string;
  getStationTotal: (s: Estacion) => number;
}>();

const emit = defineEmits<{
  'agregar-tiempo': [station: Estacion, minutos: number, precio: number, nombre: string];
  'cobrar': [station: Estacion];
  'cancelar-temporizador': [station: Estacion];
  'editar-opciones': [station: Estacion];
  'eliminar-estacion': [id: number];
}>();
</script>

<template>
  <div
    :key="`${station.id}-${ticker}`"
    class="station-card"
    :class="getStationBorderClass(station)"
  >
    <div class="card-papiro">
      <div class="station-header">
        <div class="station-title">
          <span class="station-icon">🎮</span>
          <h2>{{ station.nombreProducto }}</h2>
        </div>
        <div class="station-actions">
          <span class="status-badge" :class="getStatusBadgeClass(station)">
            {{ station.status.toUpperCase() }}
          </span>
          <button class="btn-config" @click="emit('editar-opciones', station)" title="Configurar">⚙️</button>
          <button v-if="station.status === 'disponible'" class="btn-delete" @click="emit('eliminar-estacion', station.id)" title="Eliminar">🗑️</button>
        </div>
      </div>

      <div class="station-timer">
        <div class="timer-display" :class="getTimerColorClass(station)">
          {{ formatTime(getTiempoRestante(station)) }}
        </div>
        <p v-if="station.status === 'activo' && getTiempoRestante(station) <= 300" class="timer-warning">
          ¡Tiempo por terminar!
        </p>
      </div>

      <div class="station-options">
        <button
          v-for="opt in station.opciones"
          :key="opt.id || opt.nombre"
          class="option-btn"
          @click="emit('agregar-tiempo', station, opt.minutos, opt.precio, opt.nombre)"
        >
          <span class="option-nombre">{{ opt.nombre }}</span>
          <span class="option-precio">{{ formatoMoneda(opt.precio) }}</span>
          <span v-if="opt.productosIncluidos.length > 0" class="option-combo-badge">+{{ opt.productosIncluidos.length }}</span>
        </button>
        <p v-if="station.opciones.length === 0" class="no-opciones">
          Sin opciones configuradas
        </p>
      </div>

      <div class="ticket-panel">
        <h3 class="ticket-title">📜 Ticket</h3>
        <div v-if="station.ticket.length === 0" class="ticket-empty">
          Sin cargos
        </div>
        <ul v-else class="ticket-list">
          <li v-for="(item, idx) in station.ticket" :key="idx" class="ticket-item">
            <span>⚔️ {{ item.nombre }}</span>
            <span class="ticket-price">{{ formatoMoneda(item.precio) }}</span>
          </li>
        </ul>
      </div>

      <div class="station-footer">
        <div class="station-total">
          Total: <span class="total-value">{{ formatoMoneda(getStationTotal(station)) }}</span>
        </div>
        <div class="station-footer-buttons">
          <button
            v-if="station.status === 'activo' || station.status === 'terminado'"
            class="btn-cancelar-timer"
            @click="emit('cancelar-temporizador', station)"
          >
            ✕ Cancelar
          </button>
          <button
            class="btn-cobrar"
            :disabled="station.ticket.length === 0"
            @click="emit('cobrar', station)"
          >
            💰 Cobrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
