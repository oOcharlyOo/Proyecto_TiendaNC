<script setup lang="ts">
import type { EgresoDTO } from '../logica/useCorte';
defineProps<{
  abierto: boolean; cargando: boolean; egresosDia: EgresoDTO[];
  modalSalidaAbierto: boolean;
  formatoMoneda: (v: number) => string; formatoFecha: (f?: string) => string;
}>();
defineEmits<{
  'cerrar': []; 'abrir-modal-salida': []; 'cerrar-modal-salida': [];
  'registrar-salida': [p: { montoEoS: number; descripcion: string }];
}>();
</script>
<template>
  <div v-if="abierto" class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-container egresos-modal">
      <div class="modal-decoration">✧</div>
      <div class="modal-header"><h2>Egresos del Día</h2><button class="modal-close" @click="$emit('cerrar')">✕</button></div>
      <div class="modal-body">
        <div class="modal-actions"><button class="action-btn" @click="$emit('abrir-modal-salida')">➕ Registrar Salida</button></div>
        <div v-if="cargando" class="loading">Cargando egresos...</div>
        <div v-else class="pergamino-list">
          <div v-for="egreso in egresosDia" :key="egreso.idCaja" class="pergamino-item">
            <div class="egreso-monto">-{{ formatoMoneda(egreso.monto) }}</div>
            <div class="egreso-detalle">
              <span class="egreso-desc">{{ egreso.descripcion }}</span>
              <span class="egreso-fecha">{{ formatoFecha(egreso.fechaMovimiento) }}</span>
              <span class="egreso-usuario">{{ egreso.usuario?.nombre || 'N/D' }}</span>
            </div>
          </div>
          <p v-if="!egresosDia.length" class="empty-msg">Sin egresos registrados</p>
        </div>
      </div>
    </div>
  </div>

</template>
