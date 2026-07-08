<script setup lang="ts">
import type { EgresoDTO } from '../logica/useCorte';
defineProps<{
  abierto: boolean; cargando: boolean; entradasDia: EgresoDTO[];
  formatoMoneda: (v: number) => string; formatoFecha: (f?: string) => string;
}>();
defineEmits<{ 'cerrar': [] }>();
</script>
<template>
  <div v-if="abierto" class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-container entradas-modal">
      <div class="modal-decoration">✧</div>
      <div class="modal-header"><h2>Entradas Extra</h2><button class="modal-close" @click="$emit('cerrar')">✕</button></div>
      <div class="modal-body">
        <div v-if="cargando" class="loading">Cargando entradas...</div>
        <div v-else class="pergamino-list">
          <div v-for="entrada in entradasDia" :key="entrada.idCaja" class="pergamino-item">
            <div class="egreso-monto positivo">+{{ formatoMoneda(entrada.monto) }}</div>
            <div class="egreso-detalle">
              <span class="egreso-desc">{{ entrada.descripcion }}</span>
              <span class="egreso-fecha">{{ formatoFecha(entrada.fechaMovimiento) }}</span>
            </div>
          </div>
          <p v-if="!entradasDia.length" class="empty-msg">Sin entradas registradas</p>
        </div>
      </div>
    </div>
  </div>
</template>
