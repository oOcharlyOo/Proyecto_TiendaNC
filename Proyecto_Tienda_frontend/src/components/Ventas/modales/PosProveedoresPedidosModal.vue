<template>
    <div v-if="open" class="pos-modal-overlay" @click.self="emit('close')">
      <div class="pos-modal-card proveedores-pedidos-modal">
        <div class="pp-header">
          <h3>📦 Proveedores y Pedidos</h3>
          <button class="btn-close" @click="emit('close')">✕</button>
        </div>
        <div class="pp-tabs">
          <button :class="['pp-tab', { active: pedidoProveedorTab === 'proveedores' }]" @click="emit('update:pedidoProveedorTab', 'proveedores')"><span class="pp-tab-icon">🚚</span><span class="pp-tab-text">Proveedores</span></button>
          <button :class="['pp-tab', { active: pedidoProveedorTab === 'pedidos' }]" @click="emit('update:pedidoProveedorTab', 'pedidos')"><span class="pp-tab-icon">📦</span><span class="pp-tab-text">Pedidos ({{ pedidosProveedor.length }})</span></button>
          <button :class="['pp-tab', { active: pedidoProveedorTab === 'sugerido' }]" @click="emit('update:pedidoProveedorTab', 'sugerido')"><span class="pp-tab-icon">🧙</span><span class="pp-tab-text">Sugerido</span></button>
          <button :class="['pp-tab', { active: pedidoProveedorTab === 'sugeridoHoy' }]" @click="emit('update:pedidoProveedorTab', 'sugeridoHoy')"><span class="pp-tab-icon">📅</span><span class="pp-tab-text">Sugerido Hoy</span></button>
          <button :class="['pp-tab', { active: pedidoProveedorTab === 'inteligencia' }]" @click="emit('update:pedidoProveedorTab', 'inteligencia')"><span class="pp-tab-icon">📊</span><span class="pp-tab-text">Inteligencia</span></button>
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
          <!-- INTELIGENCIA -->
          <div v-if="pedidoProveedorTab === 'inteligencia'" class="pp-section pp-section-sugerido">
            <AnalisisInventario />
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
import AnalisisInventario from '../../Proveedores/secciones/AnalisisInventario.vue'

interface Props {
  open: boolean
  pedidoProveedorTab: 'proveedores' | 'pedidos' | 'sugerido' | 'sugeridoHoy' | 'inteligencia'
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


<style scoped>
.pos-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);backdrop-filter:blur(6px);z-index: 200;display:grid;place-items:center;padding:1rem}
.pos-modal-card{background:var(--color-bg-panel);border-radius:var(--radius-lg);width:min(100%,960px);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:8px 8px 24px rgba(0,0,0,0.35),-4px -4px 16px rgba(255,255,255,0.03)}
.pp-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;background:var(--color-bg-secondary);border-radius:var(--radius-lg) var(--radius-lg) 0 0}
.pp-header h3{margin:0;font-size:1.1rem;color:var(--color-accent)}
.btn-close{width:34px;height:34px;border-radius:50%;border:none;background:var(--color-bg-primary);color:var(--color-text-secondary);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 6px rgba(0,0,0,0.15);transition:all .15s}
.btn-close:hover{background:var(--color-error);color:#fff}
.pp-tabs{display:flex;gap:.3rem;padding:.5rem 1rem;background:var(--color-bg-secondary);border-bottom:1px solid var(--color-border);flex-wrap:wrap}
.pp-tab{padding:.4rem .8rem;border:none;border-radius:var(--radius-sm);background:var(--color-bg-primary);color:var(--color-text-secondary);font-size:.8rem;font-weight:600;cursor:pointer;transition:all .15s;box-shadow:2px 2px 4px rgba(0,0,0,0.1);white-space:nowrap}
.pp-tab-icon,.pp-tab-text{display:inline;vertical-align:middle}
.pp-tab:hover{color:var(--color-text-primary)}
.pp-tab.active{background:var(--color-accent);color:var(--color-on-brand);box-shadow:3px 3px 6px rgba(0,0,0,0.2)}
.pp-body{flex:1;overflow-y:auto;padding:1rem}
.pp-section{display:flex;flex-direction:column;gap:.75rem}
.pp-toolbar{display:flex;align-items:center;gap:.5rem}
.pp-btn-add{padding:.5rem 1rem;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--color-accent),var(--color-accent-hover));color:var(--color-on-brand);font-size:.85rem;font-weight:600;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,0.15);transition:all .15s}
.pp-btn-add:hover{box-shadow:5px 5px 10px rgba(0,0,0,0.2);transform:translateY(-1px)}
.pp-views{display:flex;gap:.3rem;margin-left:auto}
.pp-vbtn{width:32px;height:32px;border:none;border-radius:var(--radius-sm);background:var(--color-bg-primary);color:var(--color-text-secondary);cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.pp-vbtn.on{background:var(--color-accent);color:var(--color-on-brand)}
.pp-empty{text-align:center;padding:2rem;color:var(--color-text-secondary)}
.pp-list{display:flex;flex-direction:column;gap:.4rem}
.pp-item{display:flex;align-items:center;gap:.75rem;padding:.6rem;background:var(--color-bg-secondary);border-radius:var(--radius-sm);box-shadow:2px 2px 4px rgba(0,0,0,0.1)}
.pp-item-avatar{width:36px;height:36px;border-radius:50%;background:var(--color-accent);color:var(--color-on-brand);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.9rem;flex-shrink:0}
.pp-item-info{flex:1;min-width:0}
.pp-item-name{display:block;font-weight:600;color:var(--color-text-primary);font-size:.9rem}
.pp-item-detail{display:block;font-size:.75rem;color:var(--color-text-secondary)}
.pp-item-actions{display:flex;gap:.3rem;flex-shrink:0}
.pp-btn-sm{width:30px;height:30px;border:none;border-radius:var(--radius-sm);background:var(--color-bg-primary);cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.pp-btn-sm:hover{color:var(--color-accent)}
.pp-btn-del:hover{color:var(--color-error)}
.pp-btn-ok:hover{color:var(--color-success)}
.pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.75rem}
.pp-card{background:var(--color-bg-secondary);border-radius:var(--radius-sm);padding:.8rem;box-shadow:3px 3px 6px rgba(0,0,0,0.1);display:flex;flex-direction:column;align-items:center;gap:.4rem}
.pp-card-avatar{width:40px;height:40px;border-radius:50%;background:var(--color-accent);color:var(--color-on-brand);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem}
.pp-card-name{margin:0;font-size:.85rem;color:var(--color-text-primary)}
.pp-card-details{display:flex;flex-direction:column;gap:.2rem;width:100%}
.pp-card-detail{font-size:.7rem;color:var(--color-text-secondary)}
.pp-card-actions{display:flex;gap:.3rem;margin-top:auto}
.pp-card-btn{width:28px;height:28px;border:none;border-radius:var(--radius-sm);background:var(--color-bg-primary);cursor:pointer;font-size:.75rem;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.pp-card-btn:hover{color:var(--color-accent)}
.pp-card-btn-del:hover{color:var(--color-error)}
.pp-card-btn-ok:hover{color:var(--color-success)}
.pp-pedido-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:.2rem}
.pp-pedido-prov{font-weight:700;font-size:.85rem;color:var(--color-text-primary)}
.pp-pedido-date{font-size:.73rem;color:var(--color-text-secondary)}
.pp-pedido-total{font-size:.8rem;font-weight:700;color:var(--color-success);font-family:Courier New,monospace}
.pp-form-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index: 300;display:grid;place-items:center;padding:1rem}
.pp-form-card{background:var(--color-bg-panel);border-radius:var(--radius-lg);width:min(100%,480px);max-height:90vh;overflow-y:auto;padding:1.5rem;box-shadow:8px 8px 24px rgba(0,0,0,0.35)}
.pp-form-card h4{margin:0 0 1rem;color:var(--color-accent)}
.pp-field{display:flex;flex-direction:column;gap:.3rem;margin-bottom:.75rem}
.pp-field-label{font-size:.78rem;color:var(--color-text-secondary);text-transform:uppercase;font-weight:600}
.pp-input{padding:.65rem .75rem;background:var(--color-bg-secondary);border:none;border-radius:var(--radius-sm);color:var(--color-text-primary);font-family:inherit;box-shadow:inset 2px 2px 4px rgba(0,0,0,0.15);transition:all .2s}
.pp-input:focus{outline:none;box-shadow:inset 2px 2px 4px rgba(0,0,0,0.15),0 0 0 2px var(--color-accent)}
.pp-form-actions{display:flex;gap:.75rem;margin-top:1rem}
.pp-btn-cancel{flex:1;padding:.7rem;border:none;border-radius:var(--radius-sm);background:var(--color-bg-secondary);color:var(--color-text-secondary);font-weight:600;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,0.15);transition:all .15s}
.pp-btn-cancel:hover{color:var(--color-text-primary)}
.pp-btn-save{flex:1;padding:.7rem;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--color-accent),var(--color-accent-hover));color:var(--color-on-brand);font-weight:600;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,0.15);transition:all .15s}
.pp-btn-save:hover{box-shadow:5px 5px 10px rgba(0,0,0,0.2);transform:translateY(-1px)}
.pp-btn-remove{padding:.2rem .4rem;border:none;border-radius:var(--radius-sm);background:var(--color-bg-primary);color:var(--color-text-secondary);cursor:pointer;font-size:.8rem}
.pp-btn-remove:hover{color:var(--color-error)}
.pp-product-search-wrap{display:flex;gap:.5rem;align-items:center}
.pp-search-wrapper{position:relative;flex:1}
.pp-dropdown{position:absolute;top:100%;left:0;right:0;background:var(--color-bg-panel);border-radius:var(--radius-sm);box-shadow:0 4px 12px rgba(0,0,0,0.3);max-height:200px;overflow-y:auto;z-index:10}
.pp-dropdown-item{padding:.5rem .75rem;cursor:pointer;font-size:.85rem;color:var(--color-text-primary)}
.pp-dropdown-item:hover{background:color-mix(in srgb,var(--color-accent) 10%,transparent)}
.pp-qty,.pp-price{width:70px}
.pp-detalle-row{display:flex;align-items:center;gap:.5rem;padding:.4rem;background:var(--color-bg-secondary);border-radius:var(--radius-sm);margin-bottom:.3rem;font-size:.85rem}
.pp-detalle-name{flex:1}
.pp-checkbox-label{display:flex;align-items:center;gap:.5rem;font-size:.85rem;color:var(--color-text-secondary);cursor:pointer}
@media(max-width:768px){.pos-modal-card{width:95vw}.pp-tabs{gap:.2rem}.pp-tab{flex:1;padding:.35rem .3rem;font-size:.72rem;text-align:center}.pp-tab-text{display:none}.pp-tab-icon{font-size:.95rem}.pp-form-card{width:95vw;padding:1rem}}
@media(max-width:480px){.pp-tabs{padding:.4rem .5rem;gap:.15rem}.pp-tab{padding:.3rem .2rem}.pp-tab-icon{font-size:.85rem}}
</style>