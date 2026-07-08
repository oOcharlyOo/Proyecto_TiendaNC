<script setup lang="ts">
defineProps<{
  historialUnico: any[];
  cargando: boolean;
  pestañaActiva: 'boveda' | 'ganancias';
  paginaActual: number;
  totalPaginas: number;
  formatoMoneda: (v: number) => string;
}>();

const emit = defineEmits<{
  'cambiar-pagina': [pagina: number];
}>();
</script>

<template>
  <section class="history-section animate-slide-up" style="animation-delay: 0.2s">
    <div class="section-card history-card">
      <div class="history-header">
        <h3><span class="icon">📖</span> Libro de Bóveda</h3>
        <div class="loading-indicator" v-if="cargando">
          <span class="spinner"></span>
        </div>
      </div>

      <div class="history-list-container parchment-effect">
        <div class="history-labels-list" v-if="historialUnico.length">
          <div v-for="m in historialUnico" :key="m.idBoveda" class="history-entry-label animate-fade-in">
            <div class="label-header">
              <div class="label-time">
                <span class="icon">🕒</span>
                <span class="text">{{ new Date(m.fechaMovimiento).toLocaleString() }}</span>
              </div>
              <div class="label-indicator" :class="m.montoAjuste >= 0 ? 'indicator-pos' : 'label-indicator-neg'">
                {{ m.montoAjuste >= 0 ? '▲ Ingreso' : '▼ Salida' }}
              </div>
            </div>

            <div class="label-body">
              <p class="label-desc">{{ m.descripcion }}</p>
            </div>

            <div class="label-footer">
              <div class="footer-segment">
                <span class="caption">Monto:</span>
                <strong :class="m.montoAjuste >= 0 ? 'txt-pos' : 'txt-neg'">
                  {{ m.montoAjuste >= 0 ? '+' : '' }}{{ formatoMoneda(m.montoAjuste) }}
                </strong>
              </div>
              <div class="footer-divider"></div>
              <div class="footer-segment">
                <span class="caption">Balance:</span>
                <strong class="txt-balance">{{ formatoMoneda(m.montoTotal) }}</strong>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!historialUnico.length && !cargando" class="empty-state">
          <span class="empty-icon">📭</span>
          <p>No hay registros en el libro de bóveda.</p>
        </div>
      </div>

      <footer v-if="totalPaginas > 1 && pestañaActiva === 'boveda'" class="pagination-footer">
        <button
          class="nav-btn"
          :disabled="paginaActual === 0"
          @click="emit('cambiar-pagina', paginaActual - 1)"
        >
          <span class="arrow">←</span> Anterior
        </button>

        <div class="page-info">
          Página <strong>{{ paginaActual + 1 }}</strong> de {{ totalPaginas }}
        </div>

        <button
          class="nav-btn"
          :disabled="paginaActual >= totalPaginas - 1"
          @click="emit('cambiar-pagina', paginaActual + 1)"
        >
          Siguiente <span class="arrow">→</span>
        </button>
      </footer>
    </div>
  </section>
</template>
