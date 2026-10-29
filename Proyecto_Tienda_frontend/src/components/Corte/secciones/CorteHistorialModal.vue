<script setup lang="ts">
import { computed } from 'vue';
import type { VentaDTO, VentaDetalleDTO } from '../logica/useCorte';
const props = defineProps<{
  abierto: boolean; cargando: boolean; historialData: { venta: VentaDTO; detalles: VentaDetalleDTO[] }[];
  historialTotalFiltrado: number;
  historialGananciaFiltrada: number;
  filtroMesHistorial: string; filtroAnioHistorial: number; filtroDiaHistorial: number | null; filtroDiscrepanciaHistorial: boolean;
  historialPagina: number; historialTotalPaginas: number; historialTotalElementos: number;
  ventasHistorialSeleccionadas: Set<number>; corrigiendoHistorial: boolean; correccionHistorialMsg: string;
  modalDetalleAbierto: boolean; ventaDetalleSeleccionada: VentaDTO | null;
  ventaDetalleItems: VentaDetalleDTO[]; ventaDetalleEditando: boolean;
  ventaDetalleMontoEditado: number; ventaDetalleItemEditando: number | null;
  ventaDetalleCantidadTemp: number; ventaDetallePrecioTemp: number;
  ventaDetalleEnvases: VentaDetalleDTO[]; ventaDetalleEnvaseTotal: number;
  esAdministrador: boolean;
  usuariosConSueldo: { id: number; nombre: string; surname: string }[];
  formatoMoneda: (v: number) => string; formatearCantidad: (c: number, g: boolean) => string;
  formatoFecha: (f?: string) => string; getMetodoClase: (m?: string) => string; getMetodoIcono: (m?: string) => string;
  getRankIcon: (i: number) => string; getRankClass: (i: number) => string;
}>();
defineEmits<{
  'cerrar': []; 'cambiar-filtro-mes': [v: string]; 'cambiar-filtro-anio': [v: number]; 'cambiar-filtro-dia': [v: number | null]; 'toggle-filtro-discrepancia': [];
  'cambiar-pagina': [n: number];
  'abrir-detalle': [id: number]; 'toggle-seleccion': [id: number]; 'seleccionar-todas': [];
  'corregir-seleccionadas': []; 'iniciar-edicion': []; 'iniciar-edicion-total': [];
  'guardar-edicion': []; 'cancelar-edicion': [];
  'cerrar-detalle': []; 'iniciar-editar-item': [idx: number];
  'confirmar-editar-item': [idx: number]; 'cancelar-editar-item': [];
  'eliminar-item': [idx: number]; 'cambiar-cantidad-temp': [v: number];
  'cambiar-precio-temp': [v: number];
}>();

const nombreUsuario = computed(() => {
  const map = new Map<number, string>();
  for (const u of props.usuariosConSueldo) {
    map.set(u.id, `${u.nombre} ${u.surname}`.trim());
  }
  return (id: number | undefined) => id ? (map.get(id) || `#${id}`) : '—';
});
</script>
<template>
  <div v-if="abierto" class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-container historial-modal">
      <div class="modal-decoration">✧</div>
      <div class="modal-header"><h2>Historial de Ventas</h2><button class="modal-close" @click="$emit('cerrar')">✕</button></div>
      <div class="modal-body">
        <div class="filtros-historial">
          <select :value="filtroMesHistorial" @change="$emit('cambiar-filtro-mes', ($event.target as HTMLSelectElement).value)">
            <option value="all">Todos los meses</option>
            <option v-for="m in 12" :key="m - 1" :value="String(m - 1)">{{ new Date(2024, m - 1).toLocaleString('es-MX', { month: 'long' }) }}</option>
          </select>
          <input type="number" :value="filtroAnioHistorial" @change="$emit('cambiar-filtro-anio', Number(($event.target as HTMLInputElement).value))" class="input-year" placeholder="Año" min="2020" />
          <input v-if="filtroMesHistorial !== 'all'" type="number" :value="filtroDiaHistorial" @change="$emit('cambiar-filtro-dia', ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null)" class="input-day" placeholder="Día" min="1" max="31" />
          <label class="checkbox-label"><input type="checkbox" :checked="filtroDiscrepanciaHistorial" @change="$emit('toggle-filtro-discrepancia')" /> Solo discrepancias</label>
        </div>
        <div v-if="correccionHistorialMsg" class="correccion-msg">{{ correccionHistorialMsg }}</div>
        <div v-if="ventasHistorialSeleccionadas.size > 0" class="batch-actions">
          <span>{{ ventasHistorialSeleccionadas.size }} seleccionadas</span>
          <button class="action-btn small" :disabled="corrigiendoHistorial" @click="$emit('corregir-seleccionadas')">{{ corrigiendoHistorial ? 'Corrigiendo...' : 'Corregir Discrepancias' }}</button>
        </div>
        <div class="historial-total">Total filtrado: <span class="total-monto">{{ formatoMoneda(historialTotalFiltrado) }}</span> · Ganancia: <span class="total-ganancia">{{ formatoMoneda(Math.round(historialGananciaFiltrada)) }}</span></div>
        <div v-if="cargando" class="loading">Cargando historial...</div>
        <div v-else class="historial-table-wrap">
          <table class="historial-table">
            <thead>
              <tr>
                <th class="historial-check-th"></th>
                <th>Ticket</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Ganancia</th>
                <th>Pago</th>
                <th>Cajero</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in historialData" :key="item.venta.idVenta" class="historial-row" :class="{ discrepancia: item.venta.tieneDiscrepancia }" @click="$emit('abrir-detalle', item.venta.idVenta)">
                <td class="historial-check-cell" @click.stop>
                  <label class="checkbox-label historial-check" @change="$emit('toggle-seleccion', item.venta.idVenta)">
                    <input type="checkbox" :checked="ventasHistorialSeleccionadas.has(item.venta.idVenta)" />
                  </label>
                </td>
                <td class="venta-id"><span v-if="item.venta.tieneDiscrepancia" class="discrepancia-badge">⚠️</span> #{{ item.venta.idVenta }}</td>
                <td class="venta-fecha">{{ formatoFecha(item.venta.fechaVenta) }}</td>
                <td class="venta-monto">{{ formatoMoneda(Number(item.venta.montoTotal)) }}</td>
                <td class="venta-ganancia">{{ formatoMoneda(Math.round(Number(item.venta.ganancia ?? 0))) }}</td>
                <td class="venta-pago"><span class="metodo-badge" :class="getMetodoClase(item.venta.metodoPago)">{{ getMetodoIcono(item.venta.metodoPago) }} {{ item.venta.metodoPago || 'EFECTIVO' }}</span></td>
                <td class="venta-usuario">{{ item.venta.nombreUsuario || item.venta.usuario?.nombre || nombreUsuario(item.venta.idUsuario) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="historialTotalPaginas > 1" class="pagination">
          <button class="pagination-btn" :disabled="historialPagina === 0" @click="$emit('cambiar-pagina', historialPagina - 1)">‹ Anterior</button>
          <span class="pagination-info">Página {{ historialPagina + 1 }} de {{ historialTotalPaginas }} ({{ historialTotalElementos }} resultados)</span>
          <button class="pagination-btn" :disabled="historialPagina >= historialTotalPaginas - 1" @click="$emit('cambiar-pagina', historialPagina + 1)">Siguiente ›</button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="modalDetalleAbierto && ventaDetalleSeleccionada" class="modal-overlay" @click.self="$emit('cerrar-detalle')">
    <div class="modal-container detalle-modal">
      <div class="modal-decoration">✧</div>
      <div class="modal-header">
        <h2>Venta #{{ ventaDetalleSeleccionada.idVenta }}</h2>
        <button class="modal-close" @click="$emit('cerrar-detalle')">✕</button>
      </div>
      <div class="modal-body">
        <div class="venta-metadata">
          <p><strong>Fecha:</strong> {{ formatoFecha(ventaDetalleSeleccionada.fechaVenta) }}</p>
          <p><strong>Método:</strong> {{ ventaDetalleSeleccionada.metodoPago || 'Efectivo' }}</p>
          <p><strong>Usuario:</strong> {{ ventaDetalleSeleccionada.nombreUsuario || ventaDetalleSeleccionada.usuario?.nombre || nombreUsuario(ventaDetalleSeleccionada.idUsuario) }}</p>
          <p v-if="ventaDetalleSeleccionada.numeroTicket"><strong>Ticket:</strong> #{{ ventaDetalleSeleccionada.numeroTicket }}</p>
        </div>
        <div v-if="esAdministrador && !ventaDetalleEditando" class="edit-actions">
          <button class="action-btn small" @click="$emit('iniciar-edicion')">✏️ Editar Detalles</button>
          <button class="action-btn small" @click="$emit('iniciar-edicion-total')">✏️ Editar Total</button>
        </div>
        <table class="detalle-table">
          <thead><tr><th>Producto</th><th>Cantidad</th><th>P/U</th><th>Importe</th><th>Envase</th><th v-if="ventaDetalleEditando">Acción</th></tr></thead>
          <tbody>
            <tr v-for="(detalle, idx) in ventaDetalleItems" :key="detalle.idVentaDetalle">
              <td>{{ detalle.productoNombre || detalle.producto?.nombre || detalle.Producto?.nombre || '#' + detalle.idVentaDetalle }}</td>
              <td v-if="ventaDetalleItemEditando !== idx">{{ formatearCantidad(detalle.cantidad, detalle.tipoPrecioAplicado === 'VENTA_GRAMAJE') }}</td>
              <td v-else><input type="number" :value="ventaDetalleCantidadTemp" @input="$emit('cambiar-cantidad-temp', Number(($event.target as HTMLInputElement).value))" class="input-small" /></td>
              <td v-if="ventaDetalleItemEditando !== idx">{{ formatoMoneda(detalle.precioUnitarioVenta) }}</td>
              <td v-else><input type="number" step="0.01" :value="ventaDetallePrecioTemp" @input="$emit('cambiar-precio-temp', Number(($event.target as HTMLInputElement).value))" class="input-small" /></td>
              <td>{{ detalle.tipoPrecioAplicado === 'VENTA_GRAMAJE' ? formatoMoneda(detalle.precioUnitarioVenta) : formatoMoneda(detalle.cantidad * detalle.precioUnitarioVenta) }}</td>
              <td>{{ formatoMoneda(Number((detalle as any).cobroEnvaseTotal ?? (detalle as any).cobro_envase_total ?? 0)) }}</td>
              <td v-if="ventaDetalleEditando">
                <button v-if="ventaDetalleItemEditando !== idx" class="btn-icon" @click="$emit('iniciar-editar-item', idx)">✏️</button>
                <template v-else><button class="btn-icon" @click="$emit('confirmar-editar-item', idx)">✅</button><button class="btn-icon" @click="$emit('cancelar-editar-item')">❌</button></template>
                <button class="btn-icon danger" @click="$emit('eliminar-item', idx)">🗑️</button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr><td colspan="4"><strong>Total</strong></td>
              <td><strong>{{ formatoMoneda(ventaDetalleEnvaseTotal) }}</strong></td>
              <td v-if="ventaDetalleEditando">
                <input type="number" step="0.01" :value="ventaDetalleMontoEditado" @input="$emit('cambiar-precio-temp', Number(($event.target as HTMLInputElement).value))" class="input-small" />
              </td>
              <td v-else><strong>{{ formatoMoneda(ventaDetalleMontoEditado) }}</strong></td>
            </tr>
          </tfoot>
        </table>
        <div v-if="ventaDetalleEditando" class="modal-actions">
          <button class="action-btn" @click="$emit('guardar-edicion')">💾 Guardar</button>
          <button class="action-btn cancel-btn" @click="$emit('cancelar-edicion')">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease;  }
.modal-container { background: var(--color-bg-panel); border:none;box-shadow:3px 3px 8px rgba(0,0,0,.12),-1px -1px 4px rgba(255,255,255,.02); border-radius: 20px; width: 100%; max-width: 900px; max-height: 85vh; overflow-y: auto; padding: 1.5rem; position: relative; animation: modalSlideIn 0.3s ease; }
.modal-decoration { position: absolute; top: 10px; right: 20px; font-size: 2rem; color: var(--color-accent); opacity: 0.1; pointer-events: none; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-header h2 {  font-size: 1.3rem; color: var(--color-accent); margin: 0; }
.modal-close { background: none; border: none; color: var(--color-text-secondary); font-size: 1.5rem; cursor: pointer; padding: 0.3rem; line-height: 1; transition: color 0.2s; }
.modal-close:hover { color: var(--color-text-primary); }
.modal-actions { display: flex; justify-content: center; gap: 1rem; margin-top: 1.5rem; }
.loading { text-align: center; padding: 2rem; color: var(--color-text-secondary); font-size: 1rem; }

/* Filtros */
.filtros-historial { display: flex; gap: 0.8rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center; }
.filtros-historial select, .filtros-historial .checkbox-label { flex: 1; min-width: 140px; }
.filtros-historial select { padding: 0.5rem; border-radius: 8px; border:none;box-shadow:3px 3px 8px rgba(0,0,0,.12),-1px -1px 4px rgba(255,255,255,.02); background: var(--color-bg-primary); color: var(--color-text-primary); font-family: inherit; }
.checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--color-text-primary); cursor: pointer; }
.checkbox-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--color-accent); }
.correccion-msg { text-align: center; padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 8px; background: color-mix(in srgb, var(--color-success) 10%, transparent); color: var(--color-success); font-weight: 500; }
.batch-actions { display: flex; align-items: center; gap: 1rem; padding: 0.5rem; background: color-mix(in srgb, var(--color-accent) 10%, transparent); border-radius: 10px; margin-bottom: 0.5rem; }
.historial-total { text-align: right; font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 0.5rem; }
.total-monto { font-weight: 700; color: var(--color-success); font-family: "Courier New", monospace; }
.total-ganancia { font-weight: 700; color: var(--color-info); font-family: "Courier New", monospace; }

/* Tabla historial */
.historial-table-wrap { max-height: 60vh; overflow-y: auto; }
.historial-table { width: 100%; border-collapse: collapse; }
.historial-table thead { position: sticky; top: 0; z-index: 5; }
.historial-table th { padding: 0.5rem 0.75rem; font-size: 0.65rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; background: var(--color-bg-panel); border-bottom: 2px solid var(--color-border); text-align: left; }
.historial-table th:nth-child(4), .historial-table th:nth-child(5), .historial-table th:nth-child(6) { text-align: center; }
.historial-check-th { width: 30px; }
.historial-row { border-bottom: 1px solid var(--color-border); cursor: pointer; transition: background 0.15s; }
.historial-row:hover { background: rgba(255,255,255,.03); }
.historial-row.discrepancia { border-left: 3px solid var(--color-error); background: color-mix(in srgb, var(--color-error) 5%, transparent); }
.historial-row td { padding: 0.5rem 0.75rem; font-size: 0.82rem; vertical-align: middle; }
.historial-check-cell { width: 30px; }
.venta-id { font-weight: 700; color: var(--color-accent); font-family: "Courier New", monospace; white-space: nowrap; }
.venta-id .discrepancia-badge { margin-right: 0.3rem; }
.venta-fecha { font-size: 0.8rem; color: var(--color-text-secondary); white-space: nowrap; }
.venta-monto { font-weight: 700; color: var(--color-success); font-family: "Courier New", monospace; text-align: center; }
.venta-ganancia { font-weight: 700; color: var(--color-info); font-family: "Courier New", monospace; text-align: center; }
.venta-pago { text-align: center; }
.venta-usuario { font-size: 0.78rem; color: var(--color-text-secondary); white-space: nowrap; }
.historial-check { margin: 0; padding: 0; display: inline-flex; }
.metodo-badge { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 600; white-space: nowrap; }
.metodo-badge.efectivo { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
.metodo-badge.transfer { background: color-mix(in srgb, var(--color-info) 15%, transparent); color: var(--color-info); }
.metodo-badge.tarjeta { background: color-mix(in srgb,var(--color-accent) 15%,transparent); color: var(--color-accent); }
.discrepancia-badge { font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 6px; background: color-mix(in srgb, var(--color-error) 15%, transparent); color: var(--color-error); white-space: nowrap; }

/* Detalle tabla */
.venta-metadata { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.5rem; margin-bottom: 1rem; }
.venta-metadata p { margin: 0; font-size: 0.85rem; color: var(--color-text-primary); }
.venta-metadata strong { color: var(--color-text-secondary); }
.edit-actions { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.detalle-table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.85rem; }
.detalle-table th { text-align: left; padding: 0.5rem; border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: 0.75rem; text-transform: uppercase; }
.detalle-table td { padding: 0.5rem; border-bottom: 1px solid var(--color-border); }
.detalle-table tfoot td { font-weight: 700; border-bottom: none; border-top: 2px solid var(--color-border); }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.2rem; transition: transform 0.2s; }
.btn-icon:hover { transform: scale(1.2); }
.btn-icon.danger:hover { filter: brightness(1.5); }
.input-small { width: 80px; padding: 0.3rem 0.5rem; border-radius: 6px; border:none;box-shadow:3px 3px 8px rgba(0,0,0,.12),-1px -1px 4px rgba(255,255,255,.02); background: var(--color-bg-primary); color: var(--color-text-primary); font-size: 0.8rem; font-family: inherit; }
.input-year, .input-day { width: 80px; padding: 0.5rem; border-radius: 8px; border:none;box-shadow:3px 3px 8px rgba(0,0,0,.12),-1px -1px 4px rgba(255,255,255,.02); background: var(--color-bg-primary); color: var(--color-text-primary); font-family: inherit; text-align: center; }
.cancel-btn { border-color: color-mix(in srgb, var(--color-error) 30%, transparent); color: var(--color-error); }
.cancel-btn:hover { background: color-mix(in srgb, var(--color-error) 10%, transparent); }

/* Pagination */
.pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; padding: 1rem 0; margin-top: 0.5rem; border-top: 1px solid var(--color-border); }
.pagination-btn { padding: 0.5rem 1rem; border-radius: 8px; border:none;box-shadow:3px 3px 8px rgba(0,0,0,.12),-1px -1px 4px rgba(255,255,255,.02); background: var(--color-bg-primary); color: var(--color-text-primary); font-family: inherit; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
.pagination-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--color-accent) 15%, transparent); color: var(--color-accent); }
.pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination-info { font-size: 0.85rem; color: var(--color-text-secondary); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalSlideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

@media (max-width: 768px) {
  .modal-container { max-width: 95vw; padding: 1rem; }
  .filtros-historial { flex-direction: column; }
  .filtros-historial select, .filtros-historial .checkbox-label { width: 100%; }
  .historial-table th:nth-child(3), .historial-table td:nth-child(3),
  .historial-table th:nth-child(6), .historial-table td:nth-child(6),
  .historial-table th:nth-child(7), .historial-table td:nth-child(7) { display: none; }
}
</style>
