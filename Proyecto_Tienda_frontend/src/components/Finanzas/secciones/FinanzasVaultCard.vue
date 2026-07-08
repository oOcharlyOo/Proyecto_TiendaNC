<script setup lang="ts">
defineProps<{
  saldoRealCalculado: number;
  historialBoveda: any[];
  formatoMoneda: (v: number) => string;
}>();

const emit = defineEmits<{
  'ajustar': [];
}>();
</script>

<template>
  <section class="main-stats-section animate-slide-up">
    <article
      class="vault-card clickable"
      @click="emit('ajustar')"
      title="Click para ajustar saldo físicamente"
    >
      <div class="vault-card-inner">
        <div class="vault-decoration">
          <span class="dec-corner top-left"></span>
          <span class="dec-corner top-right"></span>
          <span class="dec-corner bottom-left"></span>
          <span class="dec-corner bottom-right"></span>
        </div>

        <div class="card-label">
          <span class="icon-label">💰</span>
          Total en Bóveda
        </div>

        <div class="balance-display">
          <span class="currency-symbol">$</span>
          <strong class="balance-amount">{{ formatoMoneda(saldoRealCalculado).replace('$', '') }}</strong>
        </div>

        <div class="card-footer">
          <span class="edit-badge">
            <span class="pencil">🖊️</span> Sincronizar Físico
          </span>
        </div>
      </div>
    </article>

    <div class="quick-stats-grid">
      <div class="mini-stat-card">
        <div class="stat-icon-circle info">📜</div>
        <div class="stat-details">
          <span class="stat-label">Último Registro</span>
          <strong v-if="historialBoveda.length" class="stat-value">
            {{ historialBoveda[0].tipoMovimiento }}
          </strong>
          <strong v-else class="stat-value">Sin datos</strong>
        </div>
      </div>

      <div class="mini-stat-card">
        <div class="stat-icon-circle" :class="historialBoveda[0]?.montoAjuste >= 0 ? 'success' : 'danger'" v-if="historialBoveda.length">
          {{ historialBoveda[0].montoAjuste >= 0 ? '📈' : '📉' }}
        </div>
        <div class="stat-details" v-if="historialBoveda.length">
          <span class="stat-label">Monto Variación</span>
          <strong :class="historialBoveda[0].montoAjuste >= 0 ? 'txt-pos' : 'txt-neg'" class="stat-value">
            {{ historialBoveda[0].montoAjuste >= 0 ? '+' : '' }}{{ formatoMoneda(historialBoveda[0].montoAjuste) }}
          </strong>
        </div>
        <div class="stat-details" v-else>
          <span class="stat-label">Monto Variación</span>
          <strong class="stat-value">--</strong>
        </div>
      </div>
    </div>
  </section>
</template>
