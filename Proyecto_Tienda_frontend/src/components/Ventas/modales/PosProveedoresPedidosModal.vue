<template>
    <div v-if="open" class="pos-modal-overlay" @click.self="emit('close')">
      <div class="pos-modal-card proveedores-pedidos-modal">
        <div class="pp-header">
          <h3>📦 Proveedores y Pedidos</h3>
          <button class="btn-close" @click="emit('close')">✕</button>
        </div>
        <div class="pp-tabs">
          <button :class="['pp-tab', { active: pedidoProveedorTab === 'proveedores' }]" @click="emit('update:pedidoProveedorTab', 'proveedores')">Proveedores</button>
          <button :class="['pp-tab', { active: pedidoProveedorTab === 'pedidos' }]" @click="emit('update:pedidoProveedorTab', 'pedidos')">Pedidos ({{ pedidosProveedor.length }})</button>
          <button :class="['pp-tab', { active: pedidoProveedorTab === 'sugerido' }]" @click="emit('update:pedidoProveedorTab', 'sugerido')">🧙 Sugerido</button>
          <button :class="['pp-tab', { active: pedidoProveedorTab === 'sugeridoHoy' }]" @click="emit('update:pedidoProveedorTab', 'sugeridoHoy')">📅 Sugerido Hoy</button>
        </div>
        <div class="pp-body">
          <!-- PROVEEDORES -->
          <div v-if="pedidoProveedorTab === 'proveedores'" class="pp-section">
            <div class="pp-toolbar">
              <button class="pp-btn-add" @click="emit('open-proveedor-modal', null)">+ Proveedor</button>
              <div class="pp-views">
                <button :class="['pp-vbtn', { on: ppVistaListaProv }]" @click="emit('update:ppVistaListaProv', true)" title="Lista">📋</button>
                <button :class="['pp-vbtn', { on: !ppVistaListaProv }]" @click="emit('update:ppVistaListaProv', false)" title="Cuadrícula">🔲</button>
              </div>
            </div>
            <div v-if="proveedores.length === 0" class="pp-empty">No hay proveedores</div>
            <!-- Lista -->
            <div v-else-if="ppVistaListaProv" class="pp-list">
              <div v-for="p in proveedores" :key="p.idProveedor" class="pp-item">
                <div class="pp-item-avatar">{{ p.nombre.charAt(0) }}</div>
                <div class="pp-item-info">
                  <span class="pp-item-name">{{ p.nombre }}</span>
                  <span class="pp-item-detail" v-if="p.telefono">📞 {{ p.telefono }}</span>
                  <span class="pp-item-detail" v-if="p.email">✉️ {{ p.email }}</span>
                </div>
                <div class="pp-item-actions">
                  <button class="pp-btn-sm" @click="emit('open-proveedor-modal', p)">✏️</button>
                  <button class="pp-btn-sm pp-btn-del" @click="emit('delete-proveedor', p.idProveedor)">🗑️</button>
                </div>
              </div>
            </div>
            <!-- Grid -->
            <div v-else class="pp-grid">
              <div v-for="p in proveedores" :key="p.idProveedor" class="pp-card">
                <div class="pp-card-avatar">{{ p.nombre.charAt(0) }}</div>
                <h4 class="pp-card-name">{{ p.nombre }}</h4>
                <div class="pp-card-details">
                  <span v-if="p.telefono" class="pp-card-detail">📞 {{ p.telefono }}</span>
                  <span v-if="p.email" class="pp-card-detail">✉️ {{ p.email }}</span>
                  <span v-if="p.direccion" class="pp-card-detail">📍 {{ p.direccion }}</span>
                  <span v-if="p.contacto" class="pp-card-detail">👤 {{ p.contacto }}</span>
                </div>
                <div class="pp-card-actions">
                  <button class="pp-card-btn" @click="emit('open-proveedor-modal', p)" title="Editar">✏️</button>
                  <button class="pp-card-btn pp-card-btn-del" @click="emit('delete-proveedor', p.idProveedor)" title="Eliminar">🗑️</button>
                </div>
              </div>
            </div>
          </div>
          <!-- PEDIDOS -->
          <div v-if="pedidoProveedorTab === 'pedidos'" class="pp-section">
            <div class="pp-toolbar">
              <button class="pp-btn-add" @click="emit('open-pedido-modal')">+ Pedido</button>
              <div class="pp-views">
                <button :class="['pp-vbtn', { on: ppVistaListaPed }]" @click="emit('update:ppVistaListaPed', true)" title="Lista">📋</button>
                <button :class="['pp-vbtn', { on: !ppVistaListaPed }]" @click="emit('update:ppVistaListaPed', false)" title="Cuadrícula">🔲</button>
              </div>
            </div>
            <div v-if="pedidosProveedor.length === 0" class="pp-empty">No hay pedidos pendientes</div>
            <!-- Lista -->
            <div v-else-if="ppVistaListaPed" class="pp-list">
              <div v-for="ped in pedidosProveedor" :key="ped.idPedido" class="pp-item pp-pedido">
                <div class="pp-pedido-info">
                  <span class="pp-pedido-prov">{{ ped.nombreProveedor }}</span>
                  <span class="pp-pedido-date">📅 {{ ped.fechaEntregaEsperada }}</span>
                  <span class="pp-pedido-total">{{ formatoMoneda(ped.montoTotal) }}</span>
                </div>
                <div class="pp-item-actions">
                  <button class="pp-btn-sm pp-btn-ok" @click="emit('recibir-pedido', ped.idPedido)">✅</button>
                  <button class="pp-btn-sm pp-btn-del" @click="emit('delete-pedido', ped.idPedido)">🗑️</button>
                </div>
              </div>
            </div>
            <!-- Grid -->
            <div v-else class="pp-grid">
              <div v-for="ped in pedidosProveedor" :key="ped.idPedido" class="pp-card pp-pedido-card">
                <div class="pp-pedido-card-head">
                  <span class="pp-pedido-card-prov">{{ ped.nombreProveedor }}</span>
                  <span class="pp-pedido-card-total">{{ formatoMoneda(ped.montoTotal) }}</span>
                </div>
                <div class="pp-pedido-card-details">
                  <span class="pp-pedido-card-date">📅 {{ ped.fechaEntregaEsperada }}</span>
                  <span v-if="ped.montoApartado" class="pp-pedido-card-apartado">💰 Apartado: {{ formatoMoneda(ped.montoApartado) }}</span>
                </div>
                <div class="pp-pedido-card-actions">
                  <button class="pp-card-btn pp-card-btn-ok" @click="emit('recibir-pedido', ped.idPedido)" title="Recibir">✅</button>
                  <button class="pp-card-btn pp-card-btn-del" @click="emit('delete-pedido', ped.idPedido)" title="Eliminar">🗑️</button>
                </div>
              </div>
            </div>
          </div>
          <!-- SUGERIDO -->
          <div v-if="pedidoProveedorTab === 'sugerido'" class="pp-section pp-section-sugerido">
            <PedidoSugerido @pedido-creado="emit('pedido-creado')" />
          </div>
          <!-- SUGERIDO HOY -->
          <div v-if="pedidoProveedorTab === 'sugeridoHoy'" class="pp-section pp-section-sugerido">
            <SugeridoHoy @pedido-creado="emit('pedido-creado')" />
          </div>
        </div>

        <!-- FORMULARIO PROVEEDOR -->
        <div v-if="showProveedorForm" class="pp-form-overlay">
          <div class="pp-form-card">
            <h4>{{ editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor' }}</h4>
            <div class="pp-form-grid">
              <div class="pp-field">
                <label class="pp-field-label">Nombre del proveedor *</label>
                <input :value="proveedorForm.nombre" @input="emit('update:proveedorForm', { ...proveedorForm, nombre: ($event.target as HTMLInputElement).value })" placeholder="Ej: Distribuidora ABC" class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Persona de contacto</label>
                <input :value="proveedorForm.contacto" @input="emit('update:proveedorForm', { ...proveedorForm, contacto: ($event.target as HTMLInputElement).value })" placeholder="Nombre del contacto" class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Teléfono</label>
                <input :value="proveedorForm.telefono" @input="emit('update:proveedorForm', { ...proveedorForm, telefono: ($event.target as HTMLInputElement).value })" placeholder="(000) 000-0000" class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Email</label>
                <input :value="proveedorForm.email" @input="emit('update:proveedorForm', { ...proveedorForm, email: ($event.target as HTMLInputElement).value })" type="email" placeholder="correo@ejemplo.com" class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Dirección</label>
                <input :value="proveedorForm.direccion" @input="emit('update:proveedorForm', { ...proveedorForm, direccion: ($event.target as HTMLInputElement).value })" placeholder="Calle, número, colonia..." class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Notas</label>
                <textarea :value="proveedorForm.notas" @input="emit('update:proveedorForm', { ...proveedorForm, notas: ($event.target as HTMLTextAreaElement).value })" rows="2" placeholder="Notas adicionales..." class="pp-input pp-textarea"></textarea>
              </div>
            </div>
            <div class="pp-form-actions">
              <button class="pp-btn-cancel" @click="emit('update:showProveedorForm', false)">Cancelar</button>
              <button class="pp-btn-save" @click="emit('save-proveedor')">{{ editingProveedor ? 'Actualizar' : 'Guardar' }}</button>
            </div>
          </div>
        </div>

        <!-- FORMULARIO PEDIDO -->
        <div v-if="showPedidoForm" class="pp-form-overlay">
          <div class="pp-form-card pp-form-card-pedido">
            <h4>{{ editingPedido ? 'Editar Pedido' : 'Nuevo Pedido' }}</h4>
            <div class="pp-form-grid">
              <div class="pp-field">
                <label class="pp-field-label">Proveedor *</label>
                <select :value="pedidoForm.idProveedor" @input="emit('update:pedidoForm', { ...pedidoForm, idProveedor: Number(($event.target as HTMLSelectElement).value) })" class="pp-input">
                  <option :value="0">Seleccionar proveedor...</option>
                  <option v-for="p in proveedores" :key="p.idProveedor" :value="p.idProveedor">{{ p.nombre }}</option>
                </select>
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Fecha de entrega esperada *</label>
                <input :value="pedidoForm.fechaEntregaEsperada" @input="emit('update:pedidoForm', { ...pedidoForm, fechaEntregaEsperada: ($event.target as HTMLInputElement).value })" type="date" class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Monto apartado</label>
                <input :value="pedidoForm.montoApartado" @input="emit('update:pedidoForm', { ...pedidoForm, montoApartado: Number(($event.target as HTMLInputElement).value) })" type="number" step="0.01" min="0" placeholder="0.00" class="pp-input" />
              </div>
              <div class="pp-field">
                <label class="pp-checkbox-label">
                  <input type="checkbox" :checked="montoManual" @input="emit('update:montoManual', ($event.target as HTMLInputElement).checked)" />
                  Monto total sin productos
                </label>
              </div>
              <div v-if="montoManual" class="pp-field">
                <label class="pp-field-label">Monto total *</label>
                <input :value="pedidoForm.montoTotal" @input="emit('update:pedidoForm', { ...pedidoForm, montoTotal: Number(($event.target as HTMLInputElement).value) })" type="number" step="0.01" min="0" placeholder="0.00" class="pp-input" />
              </div>
            </div>

            <!-- PRODUCTOS DEL PEDIDO -->
            <div v-if="!montoManual" class="pp-product-section">
              <h5>📦 Productos del Pedido</h5>
              <div class="pp-product-search-wrap">
                <div ref="searchWrapperRef" class="pp-search-wrapper">
                  <input
                    :value="searchProductoPedido"
                    @input="emit('update:searchProductoPedido', ($event.target as HTMLInputElement).value); emit('update:showProductoDropdownPedido', true)"
                    type="text"
                    placeholder="Buscar producto..."
                    class="pp-input"
                    @focus="emit('update:showProductoDropdownPedido', true)"
                  />
                  <div v-if="showProductoDropdownPedido && filteredProductosPedido.length" class="pp-dropdown">
                    <div
                      v-for="prod in filteredProductosPedido"
                      :key="prod.idProducto"
                      class="pp-dropdown-item"
                      @click="emit('select-producto-pedido', prod)"
                    >
                      <span class="pp-dropdown-name">{{ prod.nombre }}</span>
                      <span class="pp-dropdown-price">{{ formatoMoneda(prod.precio_costo) }}</span>
                    </div>
                  </div>
                </div>
                <input :value="newDetallePedido.cantidad" @input="emit('update:newDetallePedido', { ...newDetallePedido, cantidad: Number(($event.target as HTMLInputElement).value) })" type="number" min="1" placeholder="Cant" class="pp-input pp-qty" />
                <input :value="newDetallePedido.precioUnitario" @input="emit('update:newDetallePedido', { ...newDetallePedido, precioUnitario: Number(($event.target as HTMLInputElement).value) })" type="number" step="0.01" min="0" placeholder="$" class="pp-input pp-price" />
                <button class="pp-btn-add-prod" @click="emit('add-detalle-pedido')">+</button>
              </div>

              <!-- LISTA DE DETALLES -->
              <div v-if="pedidoForm.detalles.length > 0" class="pp-detalle-list">
                <div v-for="(d, idx) in pedidoForm.detalles" :key="idx" class="pp-detalle-row">
                  <span class="pp-detalle-name">{{ d.nombreProducto }}</span>
                  <span class="pp-detalle-qty">{{ d.cantidad }} × {{ formatoMoneda(d.precioUnitario) }}</span>
                  <span class="pp-detalle-sub">{{ formatoMoneda(d.subtotal) }}</span>
                  <button class="pp-btn-remove" @click="emit('remove-detalle-pedido', idx)">✕</button>
                </div>
                <div class="pp-detalle-total">
                  <span>Total:</span>
                  <strong>{{ formatoMoneda(pedidoForm.montoTotal) }}</strong>
                </div>
              </div>
            </div>

            <div class="pp-form-actions">
              <button class="pp-btn-cancel" @click="emit('update:showPedidoForm', false)">Cancelar</button>
              <button class="pp-btn-save" @click="emit('save-pedido')">{{ editingPedido ? 'Actualizar' : 'Crear' }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { formatoMoneda } from '../logica/usePosTicket'
import PedidoSugerido from '../../modals/PedidoSugerido.vue'
import SugeridoHoy from '../../modals/SugeridoHoy.vue'

interface Props {
  open: boolean
  pedidoProveedorTab: 'proveedores' | 'pedidos' | 'sugerido' | 'sugeridoHoy'
  ppVistaListaProv: boolean
  ppVistaListaPed: boolean
  proveedores: any[]
  pedidosProveedor: any[]
  showProveedorForm: boolean
  showPedidoForm: boolean
  editingProveedor: any
  editingPedido: any
  proveedorForm: any
  pedidoForm: any
  montoManual: boolean
  searchProductoPedido: string
  showProductoDropdownPedido: boolean
  filteredProductosPedido: any[]
  newDetallePedido: any
  searchWrapperRef: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'update:pedidoProveedorTab': [value: string]
  'update:ppVistaListaProv': [value: boolean]
  'update:ppVistaListaPed': [value: boolean]
  'update:showProveedorForm': [value: boolean]
  'update:showPedidoForm': [value: boolean]
  'update:proveedorForm': [value: any]
  'update:pedidoForm': [value: any]
  'update:montoManual': [value: boolean]
  'update:searchProductoPedido': [value: string]
  'update:showProductoDropdownPedido': [value: boolean]
  'update:newDetallePedido': [value: any]
  'open-proveedor-modal': [value: any]
  'delete-proveedor': [value: number]
  'save-proveedor': []
  'open-pedido-modal': []
  'recibir-pedido': [value: number]
  'delete-pedido': [value: number]
  'save-pedido': []
  'add-detalle-pedido': []
  'remove-detalle-pedido': [value: number]
  'select-producto-pedido': [value: any]
  'pedido-creado': []
}>()
</script>
