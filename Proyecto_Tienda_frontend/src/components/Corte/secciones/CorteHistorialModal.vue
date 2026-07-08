<script setup lang="ts">
import type { VentaDTO, VentaDetalleDTO } from '../logica/useCorte';
defineProps<{
  abierto: boolean; cargando: boolean; historialFiltrado: { venta: VentaDTO; detalles: VentaDetalleDTO[] }[];
  historialTotalFiltrado: number; historialMeses: string[]; historialDias: string[];
  filtroMesHistorial: string; filtroDiaHistorial: string; filtroDiscrepanciaHistorial: boolean;
  ventasHistorialSeleccionadas: Set<number>; corrigiendoHistorial: boolean; correccionHistorialMsg: string;
  modalDetalleAbierto: boolean; ventaDetalleSeleccionada: VentaDTO | null;
  ventaDetalleItems: VentaDetalleDTO[]; ventaDetalleEditando: boolean;
  ventaDetalleMontoEditado: number; ventaDetalleItemEditando: number | null;
  ventaDetalleCantidadTemp: number; ventaDetallePrecioTemp: number;
  ventaDetalleEnvases: VentaDetalleDTO[]; ventaDetalleEnvaseTotal: number;
  esAdministrador: boolean;
  formatoMoneda: (v: number) => string; formatearCantidad: (c: number, g: boolean) => string;
  formatoFecha: (f?: string) => string; getMetodoClase: (m?: string) => string; getMetodoIcono: (m?: string) => string;
  getRankIcon: (i: number) => string; getRankClass: (i: number) => string;
}>();
defineEmits<{
  'cerrar': []; 'cambiar-filtro-mes': [v: string]; 'cambiar-filtro-dia': [v: string]; 'toggle-filtro-discrepancia': [];
  'abrir-detalle': [id: number]; 'toggle-seleccion': [id: number]; 'seleccionar-todas': [];
  'corregir-seleccionadas': []; 'iniciar-edicion': []; 'iniciar-edicion-total': [];
  'guardar-edicion': []; 'cancelar-edicion': [];
  'cerrar-detalle': []; 'iniciar-editar-item': [idx: number];
  'confirmar-editar-item': [idx: number]; 'cancelar-editar-item': [];
  'eliminar-item': [idx: number]; 'cambiar-cantidad-temp': [v: number];
  'cambiar-precio-temp': [v: number];
}>();
</script>
<template>
  <div v-if="abierto" class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-container historial-modal">
      <div class="modal-decoration">✧</div>
      <div class="modal-header"><h2>Historial de Ventas</h2><button class="modal-close" @click="$emit('cerrar')">✕</button></div>
      <div class="modal-body">
        <div class="filtros-historial">
          <select :value="filtroMesHistorial" @change="$emit('cambiar-filtro-mes', ($event.target as HTMLSelectElement).value)">
            <option value="all">Todos los meses</option><option v-for="m in historialMeses" :key="m" :value="m">{{ new Date(2024, Number(m)).toLocaleString('es-MX', { month: 'long' }) }}</option>
          </select>
          <select :value="filtroDiaHistorial" @change="$emit('cambiar-filtro-dia', ($event.target as HTMLSelectElement).value)">
            <option value="all">Todos los días</option><option v-for="d in historialDias" :key="d" :value="d">{{ d }}</option>
          </select>
          <label class="checkbox-label"><input type="checkbox" :checked="filtroDiscrepanciaHistorial" @change="$emit('toggle-filtro-discrepancia')" /> Solo discrepancias</label>
        </div>
        <div v-if="correccionHistorialMsg" class="correccion-msg">{{ correccionHistorialMsg }}</div>
        <div v-if="ventasHistorialSeleccionadas.size > 0" class="batch-actions">
          <span>{{ ventasHistorialSeleccionadas.size }} seleccionadas</span>
          <button class="action-btn small" :disabled="corrigiendoHistorial" @click="$emit('corregir-seleccionadas')">{{ corrigiendoHistorial ? 'Corrigiendo...' : 'Corregir Discrepancias' }}</button>
        </div>
        <div class="historial-total">Total filtrado: {{ formatoMoneda(historialTotalFiltrado) }}</div>
        <div v-if="cargando" class="loading">Cargando historial...</div>
        <div v-else class="historial-list">
          <div v-for="item in historialFiltrado" :key="item.venta.idVenta" class="historial-item" :class="{ discrepancia: item.venta.tieneDiscrepancia }">
            <div class="historial-main" @click="$emit('abrir-detalle', item.venta.idVenta)">
              <div class="venta-info">
                <span class="venta-id">#{{ item.venta.idVenta }}</span>
                <span class="venta-fecha">{{ formatoFecha(item.venta.fechaVenta) }}</span>
                <span class="venta-monto">{{ formatoMoneda(Number(item.venta.montoTotal)) }}</span>
                <span class="metodo-badge" :class="getMetodoClase(item.venta.metodoPago)">{{ getMetodoIcono(item.venta.metodoPago) }} {{ item.venta.metodoPago || 'EFECTIVO' }}</span>
              </div>
              <div class="venta-usuario">{{ item.venta.nombreUsuario || item.venta.usuario?.nombre || 'N/D' }}</div>
            </div>
            <label class="checkbox-label historial-check" @click.stop @change="$emit('toggle-seleccion', item.venta.idVenta)">
              <input type="checkbox" :checked="ventasHistorialSeleccionadas.has(item.venta.idVenta)" />
            </label>
            <div v-if="item.venta.tieneDiscrepancia" class="discrepancia-badge">⚠️ Discrepancia</div>
          </div>
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
          <p><strong>Usuario:</strong> {{ ventaDetalleSeleccionada.nombreUsuario || ventaDetalleSeleccionada.usuario?.nombre || 'N/D' }}</p>
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
              <td>{{ detalle.productoNombre || (detalle.producto?.nombre || detalle.Producto?.nombre) || 'N/D' }}</td>
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
