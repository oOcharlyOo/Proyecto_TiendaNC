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

<style scoped>
.pos-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);backdrop-filter:blur(6px);z-index:200;display:grid;place-items:center;padding:1rem}
.detalle-modal{background:var(--color-bg-panel);border-radius:var(--radius-lg);width:min(100%,560px);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:8px 8px 24px rgba(0,0,0,0.35),-4px -4px 16px rgba(255,255,255,0.03)}
.detalle-header{display:flex;justify-content:space-between;align-items:center;padding:.85rem 1.25rem;background:var(--color-bg-secondary);border-radius:var(--radius-lg) var(--radius-lg) 0 0}
.header-left{display:flex;align-items:center;gap:.75rem}
.ticket-badge{display:inline-flex;align-items:center;padding:.3rem .6rem;background:var(--color-accent);color:var(--color-on-brand);font-size:.75rem;font-weight:800;border-radius:6px;font-family:Courier New,monospace}
.detalle-header h3{font-size:1rem;font-weight:700;color:var(--color-accent);margin:0}
.modal-actions{display:flex;align-items:center;gap:.4rem}
.btn-discrepancia{display:flex;align-items:center;gap:.35rem;padding:.35rem .65rem;background:color-mix(in srgb,var(--color-warning) 10%,var(--color-bg-secondary));border:none;border-radius:var(--radius-sm);font-size:.75rem;font-weight:600;color:var(--color-warning);cursor:pointer;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.btn-edit,.btn-save,.btn-cancel-edit{display:flex;align-items:center;gap:.35rem;padding:.35rem .7rem;border:none;border-radius:var(--radius-sm);font-size:.78rem;font-weight:600;cursor:pointer;transition:all .15s;box-shadow:2px 2px 4px rgba(0,0,0,0.1)}
.btn-edit{background:var(--color-bg-secondary);color:var(--color-text-secondary)}
.btn-edit:hover{background:var(--color-accent);color:var(--color-on-brand)}
.btn-save{background:linear-gradient(135deg,var(--color-success),color-mix(in srgb,var(--color-success) 60%,black));color:#fff}
.btn-cancel-edit{background:var(--color-bg-secondary);color:var(--color-text-secondary)}
.btn-cancel-edit:hover{background:var(--color-error);color:#fff}
.btn-close{width:32px;height:32px;border:none;border-radius:50%;background:var(--color-bg-primary);color:var(--color-text-secondary);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.btn-close:hover{background:var(--color-error);color:#fff;transform:rotate(90deg)}
.detalle-body{padding:1rem 1.25rem;overflow-y:auto;flex:1;min-height:0}
.detalle-summary{margin-bottom:1rem}
.summary-row{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:.75rem}
.summary-item{display:flex;flex-direction:column;gap:.2rem;padding:.5rem;background:var(--color-bg-secondary);border-radius:var(--radius-sm);box-shadow:2px 2px 4px rgba(0,0,0,0.1)}
.summary-label{font-size:.62rem;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase}
.summary-value{font-size:.8rem;font-weight:700;color:var(--color-text-primary)}
.method-badge{display:inline-block;padding:.15rem .4rem;border-radius:12px;font-size:.65rem;font-weight:700;text-transform:uppercase;text-align:center}
.method-badge.efectivo{background:color-mix(in srgb,var(--color-success) 15%,transparent);color:var(--color-success)}
.method-badge.transferencia{background:color-mix(in srgb,var(--color-accent) 15%,transparent);color:var(--color-accent)}
.method-badge.tarjeta{background:color-mix(in srgb,var(--color-info) 15%,transparent);color:var(--color-info)}
.method-badge.pendiente{background:color-mix(in srgb,var(--color-warning) 15%,transparent);color:var(--color-warning)}
.method-badge.credito,.method-badge.abono-credito{background:color-mix(in srgb,#8e44ad 15%,transparent);color:#8e44ad}
.total-section{background:linear-gradient(135deg,var(--color-success),color-mix(in srgb,var(--color-success) 60%,black));padding:.85rem;border-radius:var(--radius-md);text-align:center;box-shadow:4px 4px 12px rgba(0,0,0,0.2)}
.total-amount{font-size:1.6rem;font-weight:700;font-family:Courier New,monospace;color:#fff}
.profit-text{font-size:.75rem;font-weight:600;color:rgba(255,255,255,.7);margin-top:.2rem}
.total-edit-row{display:flex;align-items:center;justify-content:center;gap:.5rem;background:var(--color-bg-secondary);padding:.5rem .75rem;border-radius:var(--radius-sm);box-shadow:inset 2px 2px 4px rgba(0,0,0,0.1)}
.total-edit-row .currency{font-size:1.2rem;font-weight:700;color:var(--color-success)}
.total-edit-row .total-input{width:100px;padding:.4rem;font-size:1.2rem;font-weight:700;font-family:Courier New,monospace;border:none;border-radius:var(--radius-sm);text-align:right;background:var(--color-bg-primary);color:var(--color-success);box-shadow:inset 2px 2px 4px rgba(0,0,0,0.15)}
.total-edit-row .total-input:focus{outline:none;box-shadow:inset 2px 2px 4px rgba(0,0,0,0.15),0 0 0 2px var(--color-success)}
.edit-dot{font-size:.7rem;color:var(--color-accent)}
.discrepancia-alert{display:flex;align-items:flex-start;gap:.6rem;padding:.7rem;border-radius:var(--radius-sm);margin-bottom:1rem}
.alert-faltante{background:color-mix(in srgb,var(--color-error) 8%,var(--color-bg-secondary));border-left:3px solid var(--color-error)}
.alert-sobrante{background:color-mix(in srgb,var(--color-warning) 8%,var(--color-bg-secondary));border-left:3px solid var(--color-warning)}
.alert-icon{font-size:1.1rem}
.alert-row{font-size:.75rem;display:flex;justify-content:space-between;gap:1rem}
.alert-label{color:var(--color-text-secondary)}
.alert-value{color:var(--color-text-primary);font-weight:600}
.alert-diff{font-size:.7rem;font-weight:700;margin-top:.25rem;color:var(--color-error)}
.alert-faltante .alert-diff{color:var(--color-error)}
.alert-sobrante .alert-diff{color:var(--color-warning)}
.credito-info-panel{padding:.75rem;background:var(--color-bg-secondary);border-radius:var(--radius-sm);margin-bottom:.5rem}
.credito-info-header{display:flex;align-items:center;gap:.4rem;margin-bottom:.5rem;padding-bottom:.4rem;border-bottom:1px solid var(--color-border)}
.credito-icon{font-size:1.1rem}
.credito-info-header h4{margin:0;font-size:.85rem;color:var(--color-accent);font-weight:700}
.credito-info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.35rem}
.credito-field{display:flex;flex-direction:column;gap:.1rem}
.credito-field.full{grid-column:1/-1}
.field-label{font-size:.6rem;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase}
.field-value{font-size:.75rem;color:var(--color-text-primary)}
.field-value.pagado{color:var(--color-success)}
.field-value.saldo{color:var(--color-error);font-weight:700}
.field-value.estatus{display:inline-block;padding:.1rem .4rem;border-radius:3px;font-size:.65rem;font-weight:700;text-transform:uppercase}
.field-value.estatus.pendiente{background:color-mix(in srgb,var(--color-warning) 15%,transparent);color:var(--color-warning)}
.field-value.estatus.pagado{background:color-mix(in srgb,var(--color-success) 15%,transparent);color:var(--color-success)}
.abonos-historial{margin-top:.5rem}
.abonos-historial h5{font-size:.7rem;color:var(--color-text-secondary);text-transform:uppercase;margin:0 0 .3rem}
.abono-item{display:flex;flex-wrap:wrap;gap:.3rem .5rem;font-size:.72rem;padding:.2rem 0;border-bottom:1px solid var(--color-border)}
.abono-item:last-child{border-bottom:none}
.abono-monto{font-weight:700;color:var(--color-success)}
.abono-fecha{color:var(--color-text-secondary);font-size:.68rem}
.abono-metodo{font-size:.68rem;color:var(--color-accent);text-transform:uppercase;font-weight:600}
.abono-user{font-size:.68rem;color:var(--color-text-secondary)}
.envase-section-detalle{margin-top:.5rem;padding:.65rem;background:color-mix(in srgb,var(--color-warning) 8%,var(--color-bg-secondary));border-radius:var(--radius-sm)}
.envase-section-title{font-size:.75rem;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;margin-bottom:.3rem}
.envase-list-detalle{display:flex;flex-direction:column;gap:.15rem;margin-bottom:.3rem}
.envase-row-detalle{display:flex;align-items:center;justify-content:space-between;padding:.25rem .35rem;border-radius:3px;background:var(--color-bg-primary);font-size:.75rem}
.envase-name{flex:1;color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.envase-qty{color:var(--color-text-secondary);margin:0 .4rem;font-size:.7rem}
.envase-price{font-weight:600;color:var(--color-success);white-space:nowrap}
.envase-total-detalle{display:flex;align-items:center;justify-content:space-between;padding-top:.4rem;border-top:1px dashed var(--color-border);font-size:.78rem;color:var(--color-text-primary)}
.envase-total-detalle strong{color:var(--color-success);font-size:.85rem}
.productos-section{margin-top:.75rem}
.productos-header{display:flex;align-items:center;gap:.4rem;padding-bottom:.6rem;margin-bottom:.6rem}
.prod-title{font-size:.8rem;font-weight:700;color:var(--color-text-primary);text-transform:uppercase}
.prod-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 .35rem;background:var(--color-bg-secondary);border-radius:10px;font-size:.65rem;font-weight:700;color:var(--color-text-secondary);box-shadow:inset 1px 1px 2px rgba(0,0,0,0.1)}
.btn-clear-all{display:flex;align-items:center;gap:.3rem;margin-left:auto;padding:.3rem .55rem;border:none;border-radius:var(--radius-sm);font-size:.7rem;font-weight:600;color:var(--color-error);cursor:pointer;background:transparent;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.btn-clear-all:hover{background:var(--color-error);color:#fff}
.agregar-producto-section{margin-bottom:.6rem;padding:.6rem;background:var(--color-bg-secondary);border-radius:var(--radius-sm)}
.agregar-input-wrap{display:flex;align-items:center;gap:.4rem;position:relative}
.agregar-search-icon{color:var(--color-text-secondary);flex-shrink:0}
.agregar-input{flex:1;background:var(--color-bg-primary);border:none;border-radius:var(--radius-sm);padding:.45rem .6rem;color:var(--color-text-primary);font-size:.8rem;outline:none;box-shadow:inset 2px 2px 4px rgba(0,0,0,0.15)}
.agregar-clear{width:22px;height:22px;border:none;border-radius:50%;background:var(--color-bg-primary);color:var(--color-text-secondary);cursor:pointer;font-size:.7rem;display:flex;align-items:center;justify-content:center}
.agregar-resultados{display:flex;flex-direction:column;gap:.15rem;margin-top:.4rem;max-height:150px;overflow-y:auto}
.agregar-resultado{display:flex;justify-content:space-between;align-items:center;padding:.35rem .5rem;border-radius:var(--radius-sm);cursor:pointer;background:var(--color-bg-primary);font-size:.78rem;transition:all .1s}
.agregar-resultado:hover{background:color-mix(in srgb,var(--color-accent) 10%,var(--color-bg-primary))}
.agregar-prod-name{flex:1;color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.agregar-prod-info{display:flex;align-items:center;gap:.3rem;flex-shrink:0}
.agregar-badge-gramaje{font-size:.55rem;font-weight:600;padding:.08rem .25rem;background:color-mix(in srgb,var(--color-accent) 15%,transparent);color:var(--color-accent);border-radius:3px}
.agregar-prod-price{font-size:.72rem;font-weight:600;color:var(--color-success)}
.agregar-vacio{text-align:center;font-size:.7rem;color:var(--color-text-secondary);font-style:italic;margin-top:.3rem}
.productos-list{display:flex;flex-direction:column;gap:.4rem}
.producto-item{background:var(--color-bg-secondary);border:none;border-radius:var(--radius-sm);padding:.65rem;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.producto-item:hover{box-shadow:4px 4px 8px rgba(0,0,0,0.15)}
.prod-info{display:flex;flex-direction:column;gap:.4rem}
.prod-name{font-size:.85rem;font-weight:700;color:var(--color-text-primary);line-height:1.3}
.prod-meta{display:flex;align-items:center;justify-content:space-between;gap:.4rem}
.prod-qty{font-size:.75rem;font-weight:600;color:var(--color-text-secondary);background:var(--color-bg-primary);padding:.25rem .5rem;border-radius:4px;box-shadow:inset 1px 1px 2px rgba(0,0,0,0.08)}
.prod-qty.editable{cursor:pointer}
.prod-qty.editable:hover{color:var(--color-accent)}
.prod-subtotal{font-size:.8rem;font-weight:700;color:var(--color-success);font-family:Courier New,monospace}
.prod-envase-line{font-size:.68rem;color:var(--color-text-secondary);display:flex;justify-content:space-between;padding-top:.2rem;border-top:1px solid var(--color-border)}
.envase-label{color:var(--color-text-secondary)}
.envase-price-line{color:var(--color-warning);font-weight:600}
.prod-actions{display:flex;gap:.3rem;margin-top:.2rem}
.btn-action{display:flex;align-items:center;gap:.25rem;padding:.25rem .45rem;border:none;border-radius:var(--radius-sm);font-size:.68rem;font-weight:600;cursor:pointer;transition:all .15s;box-shadow:2px 2px 4px rgba(0,0,0,0.1)}
.btn-action-edit{background:var(--color-bg-primary);color:var(--color-text-secondary)}
.btn-action-edit:hover{color:var(--color-accent)}
.btn-action-delete{background:var(--color-bg-primary);color:var(--color-text-secondary)}
.btn-action-delete:hover{color:var(--color-error)}
.edit-controls{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;padding:.35rem;background:var(--color-bg-primary);border-radius:var(--radius-sm)}
.edit-label{font-size:.65rem;color:var(--color-text-secondary);font-weight:600}
.edit-qty,.edit-price{width:60px;padding:.3rem;border:none;border-radius:var(--radius-sm);background:var(--color-bg-secondary);color:var(--color-text-primary);font-size:.75rem;text-align:center;box-shadow:inset 2px 2px 4px rgba(0,0,0,0.1)}
.edit-qty:focus,.edit-price:focus{outline:none;box-shadow:inset 2px 2px 4px rgba(0,0,0,0.1),0 0 0 2px var(--color-accent)}
.btn-ok,.btn-x{display:flex;align-items:center;gap:.2rem;padding:.3rem .5rem;border:none;border-radius:var(--radius-sm);font-size:.68rem;font-weight:600;cursor:pointer;transition:all .15s;box-shadow:2px 2px 4px rgba(0,0,0,0.1)}
.btn-ok{background:var(--color-success);color:#fff}
.btn-ok:hover{opacity:.9}
.btn-x{background:var(--color-error);color:#fff}
.btn-x:hover{opacity:.9}

@media(max-width:768px){.summary-row{grid-template-columns:repeat(2,1fr)}.detalle-modal{width:95vw}.credito-info-grid{grid-template-columns:1fr}.abono-item{flex-direction:column;gap:.15rem}}
@media(max-width:480px){.detalle-body{padding:.75rem 1rem}.summary-item{padding:.4rem}.total-amount{font-size:1.4rem}.detalle-header{padding:.7rem 1rem;flex-wrap:wrap;gap:.5rem}.header-left{width:100%;justify-content:space-between}.modal-actions{width:100%;justify-content:flex-end}}
</style>
