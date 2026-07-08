<script setup lang="ts">
import type { ApartadoDTO, ApartadoPagoDTO } from '../logica/useCorte';
defineProps<{
  abierto: boolean; cargando: boolean; apartadosActivos: ApartadoDTO[];
  apartadosCompletados: ApartadoDTO[]; cargandoApartadosCompletados: boolean;
  totalApartarDiario: number; mostrarHistorialApartado: boolean;
  mostrarHistorialCompletados: boolean; historialPagos: ApartadoPagoDTO[];
  cargandoHistorialPagos: boolean; mostrarModalPago: boolean;
  apartadoParaPago: ApartadoDTO | null; montoPagoCustom: number;
  errorMontoPago: string; nuevoApartado: { nombreProducto: string; montoTotal: number; frecuenciaPago: string; plazoMeses: number; fechaInicio: string };
  formatoMoneda: (v: number) => string; formatoFecha: (f?: string) => string;
}>();
defineEmits<{
  'cerrar': []; 'crear-apartado': []; 'input-nuevo-apartado': [k: string, v: any];
  'abrir-pago': [a: ApartadoDTO]; 'cerrar-pago': []; 'cambiar-monto-pago': [v: number];
  'confirmar-pago': []; 'toggle-historial-pagos': [id: number];
  'toggle-historial-completados': []; 'cancelar-apartado': [id: number];
}>();
</script>
<template>
  <div v-if="abierto" class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-container apartados-modal">
      <div class="modal-decoration">✧</div>
      <div class="modal-header"><h2>Apartados</h2><button class="modal-close" @click="$emit('cerrar')">✕</button></div>
      <div class="modal-body">
        <div class="apartado-stats"><span>Total a apartar hoy: <strong>{{ formatoMoneda(totalApartarDiario) }}</strong></span></div>
        <div class="crear-apartado">
          <h3>Nuevo Apartado</h3>
          <div class="input-group"><label>Producto:</label><input type="text" :value="nuevoApartado.nombreProducto" @input="$emit('input-nuevo-apartado', 'nombreProducto', ($event.target as HTMLInputElement).value)" class="input-fancy" /></div>
          <div class="input-group"><label>Monto Total:</label><input type="number" :value="nuevoApartado.montoTotal" @input="$emit('input-nuevo-apartado', 'montoTotal', Number(($event.target as HTMLInputElement).value))" class="input-fancy" /></div>
          <button class="action-btn" @click="$emit('crear-apartado')">Crear Apartado</button>
        </div>
        <div class="apartados-list">
          <h3>Apartados Activos <button class="action-btn small" @click="$emit('toggle-historial-completados')">{{ mostrarHistorialCompletados ? 'Ocultar' : 'Ver completados' }}</button></h3>
          <div v-if="mostrarHistorialCompletados">
            <div v-if="cargandoApartadosCompletados">Cargando...</div>
            <div v-for="a in apartadosCompletados" :key="a.idApartado" class="apartado-item completado">
              <span>{{ a.nombreProducto }}</span><span>{{ formatoMoneda(a.montoTotal) }}</span><span>✅ Completado</span>
            </div>
          </div>
          <div v-if="cargando">Cargando...</div>
          <div v-for="a in apartadosActivos" :key="a.idApartado" class="apartado-item">
            <div class="apartado-info"><strong>{{ a.nombreProducto }}</strong><span>Total: {{ formatoMoneda(a.montoTotal) }}</span><span>Pagado: {{ formatoMoneda(a.montoPagado) }}</span><span>Restante: {{ formatoMoneda(a.montoRestante) }}</span><span>Diario: {{ formatoMoneda(a.montoDiario) }}</span></div>
            <div class="apartado-acciones">
              <button class="action-btn small" @click="$emit('abrir-pago', a)">💳 Pagar</button>
              <button class="action-btn small" @click="$emit('toggle-historial-pagos', a.idApartado)">📜 Historial</button>
              <button class="action-btn small danger" @click="$emit('cancelar-apartado', a.idApartado)">❌ Cancelar</button>
            </div>
          </div>
        </div>
        <div v-if="mostrarHistorialApartado" class="historial-pagos">
          <h3>Historial de Pagos</h3>
          <div v-if="cargandoHistorialPagos">Cargando...</div>
          <div v-for="pago in historialPagos" :key="pago.idPago" class="pago-item">
            <span>{{ formatoFecha(pago.fechaPago) }}</span><span>{{ formatoMoneda(pago.monto) }}</span><span>{{ pago.nombreUsuario }}</span>
          </div>
        </div>
        <div v-if="mostrarModalPago && apartadoParaPago" class="modal-overlay inner" @click.self="$emit('cerrar-pago')">
          <div class="modal-container small">
            <h3>Pagar {{ apartadoParaPago.nombreProducto }}</h3>
            <p>Restante: {{ formatoMoneda(apartadoParaPago.montoRestante) }}</p>
            <div class="input-group"><label>Monto:</label><input type="number" :value="montoPagoCustom" @input="$emit('cambiar-monto-pago', Number(($event.target as HTMLInputElement).value))" class="input-fancy" /></div>
            <p v-if="errorMontoPago" class="error-msg">{{ errorMontoPago }}</p>
            <div class="modal-actions"><button class="action-btn" @click="$emit('confirmar-pago')">Pagar</button><button class="action-btn cancel-btn" @click="$emit('cerrar-pago')">Cancelar</button></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
