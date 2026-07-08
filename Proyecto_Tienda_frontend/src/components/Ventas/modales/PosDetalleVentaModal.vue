<template>
    <!-- Detalle de venta modal optimizado -->
    <div v-if="open" class="pos-modal-overlay" @click.self="emit('cerrar-detalle-venta')">
      <div class="pos-modal-card detalle-modal animate-pop-in">
        <header class="detalle-header">
          <div class="header-left">
            <span class="ticket-badge">#{{ historialVentaSeleccionada?.numeroTicket }}</span>
            <h3>Detalle de Venta</h3>
          </div>
          <div class="modal-actions">
            <button v-if="historialVentaTieneDiscrepancia" class="btn-discrepancia" :title="`Detalles suman ${formatoMonedaRedondeada(calcularSubtotalVenta())}, registrado: ${formatoMonedaRedondeada(Number(historialVentaSeleccionada?.montoTotal))}, diferencia: ${formatoMonedaRedondeada(Math.abs(historialDiscrepanciaMonto))}`">
              <span class="disc-icon">⚠</span>
              <span class="disc-text">{{ formatoMonedaRedondeada(Math.abs(historialDiscrepanciaMonto)) }}</span>
            </button>
            <button v-if="esAdmin && !modoEdicionDetalle" class="btn-edit" @click="emit('iniciar-edicion-detalle')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Editar
            </button>
            <template v-if="modoEdicionDetalle">
              <button class="btn-save" @click="emit('guardar-cambios-detalle')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Guardar
              </button>
              <button class="btn-cancel-edit" @click="emit('cancelar-edicion-detalle')">Cancelar</button>
            </template>
            <button class="btn-close" @click="emit('cerrar-detalle-venta')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </header>
        
        <div class="detalle-body custom-scrollbar">
          <div class="detalle-summary">
            <div class="summary-row">
              <div class="summary-item">
                <span class="summary-label">Fecha</span>
                <span class="summary-value">{{ historialVentaSeleccionada?.fechaVenta?.slice(0, 10) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Hora</span>
                <span class="summary-value">{{ historialVentaSeleccionada?.fechaVenta?.slice(11, 16) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Cajero</span>
                <span class="summary-value">{{ historialVentaSeleccionada?.nombreUsuario || 'Cajero' }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Método</span>
                <span class="method-badge" :class="getMetodoClase(historialVentaSeleccionada?.metodoPago)">
                  {{ historialVentaSeleccionada?.metodoPago }}
                </span>
              </div>
            </div>
            
            <div class="total-section">
              <template v-if="!modoEdicionDetalle">
                <div class="total-amount">{{ formatoMoneda(Number(historialVentaSeleccionada?.montoTotal)) }}</div>
                <div v-if="historialVentaSeleccionada?.ganancia" class="profit-text">Ganancia: {{ formatoMonedaRedondeada(Number(historialVentaSeleccionada?.ganancia)) }}</div>
              </template>
              <template v-else>
                <div class="total-edit-row">
                  <span class="currency">$</span>
                  <input :value="montoTotalInput" type="number" min="0" step="1" class="total-input" :class="{ 'manual-edited': totalManualEditado }" @input="emit('total-manual-change', $event)" />
                  <span v-if="totalManualEditado" class="edit-dot" title="Total modificado manualmente">●</span>
                </div>
              </template>
            </div>
          </div>
          
          <div v-if="historialVentaTieneDiscrepancia" class="discrepancia-alert" :class="historialDiscrepanciaMonto > 0 ? 'alert-faltante' : 'alert-sobrante'">
            <div class="alert-icon">⚠</div>
            <div class="alert-content">
              <div class="alert-row">
                <span class="alert-label">Suma detalles:</span>
                <span class="alert-value">{{ formatoMonedaRedondeada(calcularSubtotalVenta()) }}</span>
              </div>
              <div class="alert-row">
                <span class="alert-label">Registrado:</span>
                <span class="alert-value">{{ formatoMonedaRedondeada(Number(historialVentaSeleccionada?.montoTotal)) }}</span>
              </div>
              <div class="alert-diff">
                {{ historialDiscrepanciaMonto > 0 ? 'Faltan' : 'Sobran' }} {{ formatoMonedaRedondeada(Math.abs(historialDiscrepanciaMonto)) }}
              </div>
            </div>
          </div>
          
          <div v-if="detalleCreditoInfo" class="credito-info-panel">
            <div class="credito-info-header">
              <span class="credito-icon">💰</span>
              <h4>Abono a Crédito</h4>
            </div>
            <div class="credito-info-grid">
              <div class="credito-field">
                <span class="field-label">Persona</span>
                <span class="field-value">{{ detalleCreditoInfo.nombrePersona }}</span>
              </div>
              <div class="credito-field">
                <span class="field-label">Teléfono</span>
                <span class="field-value">{{ detalleCreditoInfo.telefonoPersona || 'N/A' }}</span>
              </div>
              <div class="credito-field">
                <span class="field-label">Crédito creado</span>
                <span class="field-value">{{ formatearFecha(detalleCreditoInfo.fechaCreacion) }}</span>
              </div>
              <div class="credito-field">
                <span class="field-label">Monto total</span>
                <span class="field-value">{{ formatoMoneda(detalleCreditoInfo.montoTotal) }}</span>
              </div>
              <div class="credito-field">
                <span class="field-label">Monto pagado</span>
                <span class="field-value pagado">{{ formatoMoneda(detalleCreditoInfo.montoPagado) }}</span>
              </div>
              <div class="credito-field">
                <span class="field-label">Saldo pendiente</span>
                <span class="field-value saldo">{{ formatoMoneda(detalleCreditoInfo.saldoPendiente) }}</span>
              </div>
              <div class="credito-field">
                <span class="field-label">Estatus</span>
                <span class="field-value estatus" :class="detalleCreditoInfo.estatus.toLowerCase()">{{ detalleCreditoInfo.estatus }}</span>
              </div>
              <div v-if="detalleCreditoInfo.notas" class="credito-field full">
                <span class="field-label">Notas</span>
                <span class="field-value">{{ detalleCreditoInfo.notas }}</span>
              </div>
            </div>
            
            <div v-if="detalleAbonos.length > 0" class="abonos-historial">
              <h5>Historial de Abonos</h5>
              <div class="abono-item" v-for="abono in detalleAbonos" :key="abono.idAbono">
                <span class="abono-monto">{{ formatoMoneda(abono.monto) }}</span>
                <span class="abono-fecha">{{ formatearFechaHora(abono.fechaAbono) }}</span>
                <span class="abono-metodo" :class="abono.metodoPago?.toLowerCase()">{{ abono.metodoPago }}</span>
                <span class="abono-user">👤 {{ abono.nombreUsuario }}</span>
              </div>
            </div>
          </div>
          
          <div v-if="historialEnvases.length > 0" class="envase-section-detalle">
            <div class="envase-section-title">Envases</div>
            <div class="envase-list-detalle">
              <div v-for="d in historialEnvases" :key="`env-${d.idVentaDetalle}`" class="envase-row-detalle">
                <span class="envase-name">{{ (d.producto || d.Producto)?.nombre || 'Producto' }}</span>
                <span class="envase-qty">{{ (d as any).cantidadEnvase || d.cantidad }} env.</span>
                <span class="envase-price">{{ formatoMonedaRedondeada(Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0)) }}</span>
              </div>
            </div>
            <div class="envase-total-detalle">
              <span>Total Envases</span>
              <strong>{{ formatoMonedaRedondeada(historialEnvaseTotal) }}</strong>
            </div>
          </div>
          
          <div class="productos-section">
            <div class="productos-header">
              <span class="prod-title">Productos</span>
              <span class="prod-count">{{ historialVentaDetalle.length }}</span>
              <button v-if="esAdmin && modoEdicionDetalle && historialVentaDetalle.length > 0" class="btn-clear-all" @click="emit('eliminar-todos-detalles')" title="Eliminar todos">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Eliminar todo
              </button>
            </div>
            
            <div v-if="modoEdicionDetalle" class="agregar-producto-section">
              <div class="agregar-input-wrap">
                <svg class="agregar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input :value="busquedaEditar" @input="emit('buscar-producto-editar', ($event.target as HTMLInputElement).value)" type="text" class="agregar-input" placeholder="Buscar por código o nombre..." />
                <button v-if="busquedaEditar" class="agregar-clear" @click="emit('clear-busqueda-editar')">✕</button>
              </div>
              <div v-if="resultadosEditar.length > 0" class="agregar-resultados">
                <div v-for="p in resultadosEditar" :key="p.idProducto" class="agregar-resultado" @click="emit('agregar-producto-detalle', p)">
                  <span class="agregar-prod-name">{{ p.nombre }}</span>
                  <span class="agregar-prod-info">
                    <span v-if="p.is_gramaje" class="agregar-badge-gramaje">Gramaje</span>
                    <span class="agregar-prod-price">{{ formatoMonedaRedondeada(p.precio_venta || 0) }}</span>
                  </span>
                </div>
              </div>
              <div v-if="busquedaEditar && !cargandoBusquedaEditar && resultadosEditar.length === 0" class="agregar-vacio">
                No se encontraron productos
              </div>
            </div>
            
            <div class="productos-list">
              <div v-for="(d, i) in historialVentaDetalle" :key="i" class="producto-item">
                <div class="prod-info">
                  <span class="prod-name" :title="(d.producto || d.Producto)?.nombre">{{ (d.producto || d.Producto)?.nombre }}</span>
                  <template v-if="detalleEditandoIndex === i">
                    <div class="edit-controls">
                      <label class="edit-label">Cantidad:</label>
                      <input :value="cantidadTemporal" @input="emit('update:cantidadTemporal', Number(($event.target as HTMLInputElement).value))" type="number" min="1" class="edit-qty" placeholder="Cant" />
                      <label class="edit-label">Precio:</label>
                      <input :value="precioTemporal" @input="emit('update:precioTemporal', Number(($event.target as HTMLInputElement).value))" type="number" step="0.01" min="0" class="edit-price" placeholder="$" />
                      <button class="btn-ok" @click="emit('confirmar-edicion-item', i)" title="Guardar cambios">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span class="btn-label">Guardar</span>
                      </button>
                      <button class="btn-x" @click="emit('cancelar-edicion-item')" title="Cancelar edición">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        <span class="btn-label">Cancelar</span>
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <div class="prod-meta">
                      <span class="prod-qty" :class="{ editable: esAdmin && modoEdicionDetalle }" @click="esAdmin && modoEdicionDetalle ? emit('iniciar-editar-item', i) : null">
                        {{ d.cantidad }} {{ (d.producto || d.Producto)?.is_gramaje ? 'g' : 'pza' }}
                      </span>
                      <span class="prod-subtotal">{{ formatoMonedaRedondeada(d.tipoPrecioAplicado === 'VENTA_GRAMAJE' ? Number(d.precioUnitarioVenta || 0) : Math.round((Number(d.precioUnitarioVenta || 0) * Number(d.cantidad || 0)) * 100) / 100) }}</span>
                    </div>
                    <div v-if="Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0) > 0" class="prod-envase-line">
                      <span class="envase-label">🧴 {{ (d as any).cantidadEnvase || d.cantidad }} env.</span>
                      <span class="envase-price-line">{{ formatoMonedaRedondeada(Number((d as any).cobroEnvaseTotal ?? (d as any).cobro_envase_total ?? 0)) }}</span>
                    </div>
                    <div v-if="esAdmin && modoEdicionDetalle" class="prod-actions">
                      <button class="btn-action btn-action-edit" @click="emit('iniciar-editar-item', i)" title="Editar cantidad y precio">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        <span>Editar</span>
                      </button>
                      <button class="btn-action btn-action-delete" @click="emit('eliminar-detalle-venta', i)" title="Eliminar producto de la venta">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { formatoMoneda, formatoMonedaRedondeada, getMetodoClase, formatearFecha, formatearFechaHora } from '../logica/usePosTicket';
import { calcularSubtotalVenta } from '../logica/usePosEdicionDetalle';
import type { Producto } from '../logica/usePosTipos';

interface Props {
  open: boolean
  historialVentaSeleccionada: any
  modoEdicionDetalle: boolean
  historialVentaDetalle: any[]
  historialVentaTieneDiscrepancia: boolean
  historialDiscrepanciaMonto: number
  busquedaEditar: string
  resultadosEditar: Producto[]
  cargandoBusquedaEditar: boolean
  detalleEditandoIndex: number | null
  cantidadTemporal: number
  precioTemporal: number
  detalleCreditoInfo: any
  detalleAbonos: any[]
  historialEnvases: any[]
  historialEnvaseTotal: number
  esAdmin: boolean
  montoTotalInput: number
  totalManualEditado: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'iniciar-edicion-detalle': []
  'cancelar-edicion-detalle': []
  'guardar-cambios-detalle': []
  'eliminar-todos-detalles': []
  'update:busquedaEditar': [value: string]
  'buscar-producto-editar': [value: string]
  'agregar-producto-detalle': [value: Producto]
  'iniciar-editar-item': [value: number]
  'confirmar-edicion-item': [value: number]
  'cancelar-edicion-item': []
  'eliminar-detalle-venta': [value: number]
  'update:montoTotalInput': [value: number]
  'total-manual-change': [event: Event]
  'cerrar-detalle-venta': []
  'clear-busqueda-editar': []
  'update:cantidadTemporal': [value: number]
  'update:precioTemporal': [value: number]
}>()
</script>
