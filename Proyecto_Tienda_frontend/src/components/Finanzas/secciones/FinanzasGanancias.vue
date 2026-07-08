<script setup lang="ts">
defineProps<{
  pestañaActiva: 'boveda' | 'ganancias';
  cargando: boolean;
  gananciasDelDia: number;
  gananciasTotales: number;
  historialGanancias: any[];
  gananciaPaginaActual: number;
  gananciaTotalPaginas: number;
  formatoMoneda: (v: number) => string;
}>();

const emit = defineEmits<{
  'editar-ganancias': [];
  'cambiar-pagina': [pagina: number];
}>();
</script>

<template>
  <section v-if="pestañaActiva === 'ganancias'" class="history-section animate-slide-up" style="animation-delay: 0.2s">
    <div class="section-card history-card">
      <div class="history-header">
        <h3><span class="icon">📈</span> Ganancias del Mes</h3>
        <div class="loading-indicator" v-if="cargando">
          <span class="spinner"></span>
        </div>
      </div>

      <div class="ganancias-cards-grid">
        <div class="ganancia-card">
          <div class="ganancia-card-inner">
            <div class="card-label">
              <span class="icon-label">💵</span>
              Ganancias de Hoy
            </div>
            <div class="balance-display">
              <span class="currency-symbol">$</span>
              <strong class="balance-amount">{{ formatoMoneda(gananciasDelDia).replace('$', '') }}</strong>
            </div>
          </div>
        </div>

        <div
          class="ganancia-card clickable"
          @click="emit('editar-ganancias')"
          title="Click para ajustar ganancias"
        >
          <div class="ganancia-card-inner">
            <div class="card-label">
              <span class="icon-label">📊</span>
              Total del Mes
            </div>
            <div class="balance-display">
              <span class="currency-symbol">$</span>
              <strong class="balance-amount">{{ formatoMoneda(gananciasTotales).replace('$', '') }}</strong>
            </div>
            <div class="card-footer">
              <span class="edit-badge">
                <span class="pencil">🖊️</span> Ajustar
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="history-header" style="margin-top: 1.5rem;">
        <h3><span class="icon">📋</span> Historial de Ajustes</h3>
      </div>

      <div class="history-list-container parchment-effect">
        <div class="history-labels-list" v-if="historialGanancias.length">
          <div v-for="v in historialGanancias" :key="v.id" class="history-entry-label animate-fade-in">
            <div class="label-header">
              <div class="label-time">
                <span class="icon">🕒</span>
                <span class="text">{{ v.fecha }}</span>
              </div>
              <div class="label-indicator indicator-pos">
                ✓ Ajuste
              </div>
            </div>

            <div class="label-body">
              <p class="label-desc">Ajuste #{{ v.id }}</p>
            </div>

            <div class="label-footer">
              <div class="footer-segment">
                <span class="caption">Monto:</span>
                <strong class="txt-pos">{{ formatoMoneda(Number(v.monto) || 0) }}</strong>
              </div>
              <div class="footer-divider"></div>
              <div class="footer-segment">
                <span class="caption">Descripción:</span>
                <strong class="txt-pos">{{ v.descripcion }}</strong>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!historialGanancias.length && !cargando" class="empty-state">
          <span class="empty-icon">📭</span>
          <p>No hay ajustes registrados.</p>
        </div>
      </div>

      <footer v-if="gananciaTotalPaginas > 1" class="pagination-footer">
        <button
          class="nav-btn"
          :disabled="gananciaPaginaActual === 0"
          @click="emit('cambiar-pagina', gananciaPaginaActual - 1)"
        >
          <span class="arrow">←</span> Anterior
        </button>

        <div class="page-info">
          Página <strong>{{ gananciaPaginaActual + 1 }}</strong> de {{ gananciaTotalPaginas }}
        </div>

        <button
          class="nav-btn"
          :disabled="gananciaPaginaActual >= gananciaTotalPaginas - 1"
          @click="emit('cambiar-pagina', gananciaPaginaActual + 1)"
        >
          Siguiente <span class="arrow">→</span>
        </button>
      </footer>
    </div>
  </section>
</template>
