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
      { label: 'Total Ventas Efectivo', value: formatoMoneda(ventasEfectivo), icon: '💰', clase: 'c-efectivo' },
      { label: 'Total Ventas Transferencia', value: formatoMoneda(ventasTransferencia), icon: '📱', clase: 'c-trans' },
      { label: 'Total Ventas Tarjeta', value: formatoMoneda(ventasTarjeta), icon: '💳', clase: 'c-tarjeta' },
      { label: 'Total Envases', value: formatoMoneda(totalEnvase), icon: '♻️', clase: 'c-envases' },
      { label: 'Abono del Día', value: formatoMoneda(abonoTotalDia), icon: '📋', clase: 'c-abono' },
      { label: 'Tickets Emitidos', value: String(totalTicketsDia), icon: '🎫', clase: 'c-tickets' },
      { label: 'Fondo Inicial Caja', value: formatoMoneda(montoInicialCajaActiva), icon: '🏦', clase: 'c-inicial' }
    ]" :key="index" :class="[stat.clase]">
      <div class="stat-glow"></div>
      <div class="stat-icon-wrapper">
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

<style scoped>
.stats-section{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;padding:1.5rem 0;position:relative;z-index:1}
.stat-card-wrapper{background:var(--color-bg-panel);border:none;border-radius:16px;padding:1.25rem;position:relative;overflow:hidden;transition:all .2s;display:flex;align-items:center;gap:1rem;box-shadow:4px 4px 10px rgba(0,0,0,.15),-2px -2px 6px rgba(255,255,255,.02)}
.stat-card-wrapper:hover{transform:translateY(-3px);box-shadow:8px 8px 20px rgba(0,0,0,.25),-4px -4px 10px rgba(255,255,255,.04)}
.stat-glow{position:absolute;inset:0;opacity:.12;pointer-events:none}
.stat-icon-wrapper{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;border:none;flex-shrink:0;position:relative;z-index:1;box-shadow:inset 2px 2px 4px rgba(0,0,0,.15)}
.stat-info{display:flex;flex-direction:column;gap:.25rem;position:relative;z-index:1}
.stat-label{font-size:.75rem;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.5px}
.stat-value{font-size:1.1rem;font-weight:700;}
.stat-decoration{position:absolute;bottom:5px;right:10px;font-size:1.5rem;opacity:.06}

.c-efectivo .stat-glow{background:radial-gradient(circle,var(--color-success) 0%,transparent 70%);opacity:.18}
.c-efectivo .stat-icon-wrapper{background:color-mix(in srgb,var(--color-success) 12%,var(--color-bg-primary))}
.c-trans .stat-glow{background:radial-gradient(circle,var(--color-info) 0%,transparent 70%);opacity:.18}
.c-trans .stat-icon-wrapper{background:color-mix(in srgb,var(--color-info) 12%,var(--color-bg-primary))}
.c-tarjeta .stat-glow{background:radial-gradient(circle,var(--color-accent) 0%,transparent 70%);opacity:.18}
.c-tarjeta .stat-icon-wrapper{background:color-mix(in srgb,var(--color-accent) 12%,var(--color-bg-primary))}
.c-envases .stat-glow{background:radial-gradient(circle,var(--color-warning) 0%,transparent 70%);opacity:.18}
.c-envases .stat-icon-wrapper{background:color-mix(in srgb,var(--color-warning) 12%,var(--color-bg-primary))}
.c-abono .stat-glow{background:radial-gradient(circle,var(--color-error) 0%,transparent 70%);opacity:.12}
.c-abono .stat-icon-wrapper{background:color-mix(in srgb,var(--color-error) 12%,var(--color-bg-primary))}
.c-tickets .stat-glow{background:radial-gradient(circle,var(--color-accent) 0%,transparent 70%);opacity:.18}
.c-tickets .stat-icon-wrapper{background:color-mix(in srgb,var(--color-accent) 12%,var(--color-bg-primary))}
.c-inicial .stat-glow{background:radial-gradient(circle,var(--color-success) 0%,transparent 70%);opacity:.14}
.c-inicial .stat-icon-wrapper{background:color-mix(in srgb,var(--color-success) 10%,var(--color-bg-primary))}

@media(max-width:768px){.stats-section{grid-template-columns:repeat(2,1fr);gap:.6rem}.stat-card-wrapper{padding:.8rem}.stat-icon-wrapper{width:36px;height:36px;font-size:1.1rem}.stat-value{font-size:.95rem}.stat-label{font-size:.65rem}}
@media(max-width:480px){.stats-section{grid-template-columns:1fr;gap:.5rem}}
</style>
