<script setup lang="ts">
defineProps<{
  ventasEfectivo: number; ventasTransferencia: number; ventasTarjeta: number;
  totalEnvase: number; abonoTotalDia: number; totalTicketsDia: number;
  montoInicialCajaActiva: number;
  formatoMoneda: (v: number) => string;
}>();
defineEmits<{ 'abrir-modal-entradas': []; 'abrir-modal-egresos': []; 'abrir-modal-apartados': [] }>();
</script>
<template>
  <section class="stats-section">
    <div class="stat-card-wrapper" v-for="(stat, index) in [
      { label: 'Total Ventas Efectivo', value: formatoMoneda(ventasEfectivo), icon: '💰', color: '#28a745' },
      { label: 'Total Ventas Transferencia', value: formatoMoneda(ventasTransferencia), icon: '📱', color: '#007bff' },
      { label: 'Total Ventas Tarjeta', value: formatoMoneda(ventasTarjeta), icon: '💳', color: '#6f42c1' },
      { label: 'Total Envases', value: formatoMoneda(totalEnvase), icon: '♻️', color: '#17a2b8' },
      { label: 'Abono del Día', value: formatoMoneda(abonoTotalDia), icon: '📋', color: '#fd7e14' },
      { label: 'Tickets Emitidos', value: String(totalTicketsDia), icon: '🎫', color: '#c99234' },
      { label: 'Fondo Inicial Caja', value: formatoMoneda(montoInicialCajaActiva), icon: '🏦', color: '#20c997' }
    ]" :key="index">
      <div class="stat-glow" :style="{ background: `radial-gradient(circle, ${stat.color}33 0%, transparent 70%)` }"></div>
      <div class="stat-icon-wrapper" :style="{ background: `${stat.color}1a`, borderColor: stat.color }">
        <span class="stat-icon">{{ stat.icon }}</span>
      </div>
      <div class="stat-info">
        <span class="stat-label">{{ stat.label }}</span>
        <span class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</span>
      </div>
      <div class="stat-decoration">✦</div>
    </div>
  </section>
</template>
