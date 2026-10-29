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

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease;  }
.modal-overlay.inner { position: absolute; background: rgba(0,0,0,0.5); z-index: 1001; }
.modal-container { background: var(--color-bg-panel); border:none;box-shadow:3px 3px 8px rgba(0,0,0,.12),-1px -1px 4px rgba(255,255,255,.02); border-radius: 20px; width: 100%; max-width: 700px; max-height: 85vh; overflow-y: auto; padding: 1.5rem; position: relative; animation: modalSlideIn 0.3s ease; }
.modal-container.small { max-width: 450px; }
.modal-decoration { position: absolute; top: 10px; right: 20px; font-size: 2rem; color: var(--color-accent); opacity: 0.1; pointer-events: none; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-header h2 {  font-size: 1.3rem; color: var(--color-accent); margin: 0; }
.modal-close { background: none; border: none; color: var(--color-text-secondary); font-size: 1.5rem; cursor: pointer; padding: 0.3rem; line-height: 1; transition: color 0.2s; }
.modal-close:hover { color: var(--color-text-primary); }
.modal-actions { display: flex; justify-content: center; gap: 1rem; margin-top: 1.5rem; }
.apartado-stats { text-align: center; padding: 0.8rem; background: color-mix(in srgb, var(--color-accent) 8%, transparent); border-radius: 10px; margin-bottom: 1rem; }
.apartado-stats span { font-size: 1rem; color: var(--color-text-primary); }
.apartado-stats strong { color: var(--color-accent); }
.crear-apartado { background: rgba(255,255,255,.02); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; }
.crear-apartado h3 { font-size: 1rem; color: var(--color-accent); margin: 0 0 1rem; }
.apartados-list h3 { font-size: 1rem; color: var(--color-accent); display: flex; align-items: center; gap: 0.5rem; }
.apartado-item { display: flex; justify-content: space-between; align-items: center; padding: 0.8rem; border-radius: 10px; background: rgba(255,255,255,.02); margin-bottom: 0.5rem; gap: 0.5rem; }
.apartado-item.completado { opacity: 0.7; }
.apartado-info { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
.apartado-info strong { font-size: 0.9rem; }
.apartado-info span { font-size: 0.8rem; color: var(--color-text-secondary); }
.apartado-acciones { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.historial-pagos { margin-top: 1rem; padding: 1rem; background: rgba(255,255,255,.02); border-radius: 12px; }
.historial-pagos h3 { font-size: 0.9rem; color: var(--color-accent); margin: 0 0 0.5rem; }
.pago-item { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,.02); font-size: 0.85rem; }
.error-msg { color: var(--color-error); font-size: 0.8rem; margin: 0.3rem 0; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalSlideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
