<script setup lang="ts">
defineProps<{
  montoInicialCajaActiva: number;
  totalTicketsDia: number;
  horasTrabajadas: string;
  formatoMoneda: (v: number) => string;
}>();
defineEmits<{ 'abrir-modal-entradas': []; 'abrir-modal-egresos': []; 'abrir-modal-apartados': [] }>();
</script>
<template>
  <section class="stats-section">
    <div class="stat-card-wrapper c-inicial">
      <div class="stat-glow"></div>
      <div class="stat-icon-wrapper"><span class="stat-icon">🏦</span></div>
      <div class="stat-info">
        <span class="stat-label">Fondo Inicial Caja</span>
        <span class="stat-value">{{ formatoMoneda(montoInicialCajaActiva) }}</span>
      </div>
    </div>
    <div class="stat-card-wrapper c-tickets">
      <div class="stat-glow"></div>
      <div class="stat-icon-wrapper"><span class="stat-icon">🎫</span></div>
      <div class="stat-info">
        <span class="stat-label">Tickets Emitidos</span>
        <span class="stat-value">{{ totalTicketsDia }}</span>
      </div>
    </div>
    <div class="stat-card-wrapper c-horas">
      <div class="stat-glow"></div>
      <div class="stat-icon-wrapper"><span class="stat-icon">⏱️</span></div>
      <div class="stat-info">
        <span class="stat-label">Horas Trabajadas</span>
        <span class="stat-value">{{ horasTrabajadas }}</span>
      </div>
    </div>
    <div class="stat-card-wrapper c-info">
      <div class="stat-glow"></div>
      <div class="stat-icon-wrapper"><span class="stat-icon">ℹ️</span></div>
      <div class="stat-info">
        <span class="stat-label">Estado</span>
        <span class="stat-value">Caja Abierta</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stats-section{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;padding:1rem 0 0.5rem;position:relative;z-index:1}
.stat-card-wrapper{background:var(--color-bg-panel);border:none;border-radius:16px;padding:1rem 1.25rem;position:relative;overflow:hidden;transition:all .2s;display:flex;align-items:center;gap:1rem;box-shadow:4px 4px 10px rgba(0,0,0,.15),-2px -2px 6px rgba(255,255,255,.02)}
.stat-card-wrapper:hover{transform:translateY(-3px);box-shadow:8px 8px 20px rgba(0,0,0,.25),-4px -4px 10px rgba(255,255,255,.04)}
.stat-glow{position:absolute;inset:0;opacity:.12;pointer-events:none}
.stat-icon-wrapper{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;border:none;flex-shrink:0;position:relative;z-index:1;box-shadow:inset 2px 2px 4px rgba(0,0,0,.15)}
.stat-info{display:flex;flex-direction:column;gap:.25rem;position:relative;z-index:1}
.stat-label{font-size:.75rem;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.5px}
.stat-value{font-size:1.1rem;font-weight:700;}
.c-inicial .stat-glow{background:radial-gradient(circle,var(--color-success) 0%,transparent 70%);opacity:.18}
.c-inicial .stat-icon-wrapper{background:color-mix(in srgb,var(--color-success) 12%,var(--color-bg-primary))}
.c-tickets .stat-glow{background:radial-gradient(circle,var(--color-accent) 0%,transparent 70%);opacity:.18}
.c-tickets .stat-icon-wrapper{background:color-mix(in srgb,var(--color-accent) 12%,var(--color-bg-primary))}
.c-horas .stat-glow{background:radial-gradient(circle,var(--color-info) 0%,transparent 70%);opacity:.18}
.c-horas .stat-icon-wrapper{background:color-mix(in srgb,var(--color-info) 12%,var(--color-bg-primary))}
.c-info .stat-glow{background:radial-gradient(circle,var(--color-warning) 0%,transparent 70%);opacity:.14}
.c-info .stat-icon-wrapper{background:color-mix(in srgb,var(--color-warning) 10%,var(--color-bg-primary))}
@media(max-width:768px){.stats-section{grid-template-columns:repeat(2,1fr);gap:.6rem}.stat-card-wrapper{padding:.8rem}.stat-icon-wrapper{width:36px;height:36px;font-size:1.1rem}.stat-value{font-size:.95rem}.stat-label{font-size:.65rem}}
@media(max-width:480px){.stats-section{grid-template-columns:1fr;gap:.5rem}.stat-card-wrapper{padding:.65rem 1rem}.stat-icon-wrapper{width:32px;height:32px;font-size:.95rem}.stat-value{font-size:.85rem}.stat-label{font-size:.6rem}}
</style>
