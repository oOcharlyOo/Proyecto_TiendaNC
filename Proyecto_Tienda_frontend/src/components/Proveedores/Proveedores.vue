<script setup lang="ts">
import './estilos/proveedores.css';
import { useProveedores } from './logica/useProveedores';
const { activeTab, showProveedorModal, editingProveedor, proveedorForm, showPedidoModal, editingPedido, pedidoForm, newDetalle, barcodeInput, searchProducto, showProductoDropdown, scannerActivo, montoManual, searchProveedor, showHistorial, vistaTarjetas, proveedores, pedidos, provisionSemanal, productosDisponibles, categorias, filteredProveedores, filteredPedidos, historialPedidos, filteredProductosPedido, totalPendienteSemana, totalPendientes, totalRecibidos, totalCancelados, formatoMoneda, formatDate, formatDateTime, diasParaEntrega, loadAll, openProveedorModal, saveProveedor, toggleDia, toggleDiaPedido, deleteProveedor, openPedidoModal, addDetalle, removeDetalle, recalcTotal, updateDetallePrecio, updateDetalleCantidad, selectProductoForDetalle, handleSearchProductoFocus, handleSearchProductoBlur, startScanner, savePedido, deletePedido, recibirPedido, handleEstatusChange, estatusBadge, getProveedorNombre, getProveedorInfo } = useProveedores();
import PedidoSugerido from '../modals/PedidoSugerido.vue';
import SugeridoHoy from '../modals/SugeridoHoy.vue';
import AsignarProductosProveedor from '../modals/AsignarProductosProveedor.vue';
</script>

<template>
  <div class="proveedores-container">
    <div class="proveedores-header">
      <h2>📦 Proveedores y Pedidos</h2>
    </div>

    <div class="tab-bar">
      <button :class="['tab-btn', { active: activeTab === 'proveedores' }]" @click="activeTab = 'proveedores'">
        <span class="tab-icon">🏢</span>
        <span class="tab-label">Proveedores</span>
        <span class="tab-count">{{ proveedores.length }}</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'pedidos' }]" @click="activeTab = 'pedidos'">
        <span class="tab-icon">📋</span>
        <span class="tab-label">Pedidos</span>
        <span class="tab-count badge-pending-pill">{{ totalPendientes }}</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'provision' }]" @click="activeTab = 'provision'">
        <span class="tab-icon">💰</span>
        <span class="tab-label">Provisión</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'sugerido' }]" @click="activeTab = 'sugerido'">
        <span class="tab-icon">🧙</span>
        <span class="tab-label">Sugerido</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'sugeridoHoy' }]" @click="activeTab = 'sugeridoHoy'">
        <span class="tab-icon">📅</span>
        <span class="tab-label">Sugerido Hoy</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'asignar' }]" @click="activeTab = 'asignar'">
        <span class="tab-icon">🔗</span>
        <span class="tab-label">Asignar Productos</span>
      </button>
    </div>

    <!-- PROVEEDORES -->
    <div v-if="activeTab === 'proveedores'" class="tab-content">
      <div class="content-toolbar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model="searchProveedor" placeholder="Buscar por nombre, contacto o teléfono..." class="search-input-modern">
        </div>
        <div class="toolbar-right">
          <div class="view-toggle-prov">
            <button :class="['view-btn-prov', { active: !vistaTarjetas }]" @click="vistaTarjetas = false">📋 Lista</button>
            <button :class="['view-btn-prov', { active: vistaTarjetas }]" @click="vistaTarjetas = true">🗂️ Tarjetas</button>
          </div>
          <button class="btn-primary" @click="openProveedorModal()">
            <span class="btn-icon">+</span> Nuevo Proveedor
          </button>
        </div>
      </div>

      <div v-if="filteredProveedores.length === 0" class="empty-state-modern">
        <div class="empty-icon">🏢</div>
        <p class="empty-title">No hay proveedores</p>
        <p class="empty-subtitle">Agrega tu primer proveedor para comenzar a crear pedidos</p>
        <button class="btn-primary" @click="openProveedorModal()">+ Agregar Proveedor</button>
      </div>

      <!-- VISTA LISTA -->
      <div v-if="!vistaTarjetas" class="proveedores-list-compact">
        <div v-for="p in filteredProveedores" :key="p.idProveedor" class="proveedor-row-compact">
          <div class="proveedor-row-main">
            <div class="proveedor-avatar-sm">
              {{ p.nombre.charAt(0).toUpperCase() }}
            </div>
            <div class="proveedor-row-info">
              <h3 class="proveedor-name">{{ p.nombre }}</h3>
              <div class="proveedor-badges">
                <span class="badge-tipo-prov" :class="p.tipoProveedor === 'PREVENTA' ? 'badge-preventa-prov' : 'badge-directa-prov'">
                  {{ p.tipoProveedor === 'PREVENTA' ? '📋 Preventa' : '🚚 Directa' }}
                </span>
                <span v-if="p.diasPedido" class="badge-dias-prov badge-pedido-prov">📋 {{ p.diasPedido }}</span>
                <span v-if="p.diasEntrega" class="badge-dias-prov badge-entrega-prov">🚚 {{ p.diasEntrega }}</span>
              </div>
              <div class="proveedor-quick-info">
                <span v-if="p.telefono" class="quick-info-item">📞 {{ p.telefono }}</span>
                <span v-if="p.email" class="quick-info-item">✉️ {{ p.email }}</span>
                <span v-if="p.contacto" class="quick-info-item">👤 {{ p.contacto }}</span>
              </div>
            </div>
          </div>
          <div class="proveedor-row-actions">
            <button class="btn-icon-sm btn-edit-sm" @click="openProveedorModal(p)" title="Editar">✏️</button>
            <button class="btn-icon-sm btn-delete-sm" @click="deleteProveedor(p.idProveedor!)" title="Eliminar">🗑️</button>
          </div>
          <div v-if="p.direccion || p.notas" class="proveedor-row-details">
            <span v-if="p.direccion" class="detail-line">📍 {{ p.direccion }}</span>
            <span v-if="p.notas" class="detail-line notas-line">📝 {{ p.notas }}</span>
          </div>
        </div>
      </div>

      <!-- VISTA TARJETAS -->
      <div v-if="vistaTarjetas" class="proveedores-grid">
        <div v-for="p in filteredProveedores" :key="p.idProveedor" class="proveedor-card">
          <div class="prov-card-top">
            <div class="prov-card-avatar">{{ p.nombre.charAt(0).toUpperCase() }}</div>
            <div class="prov-card-tipo" :class="p.tipoProveedor === 'PREVENTA' ? 'tipo-preventa' : 'tipo-directa'">
              {{ p.tipoProveedor === 'PREVENTA' ? '📋 Preventa' : '🚚 Directa' }}
            </div>
          </div>
          <div class="prov-card-body">
            <h3 class="prov-card-name">{{ p.nombre }}</h3>
            <div class="prov-card-days">
              <span v-if="p.diasPedido" class="day-badge day-pedido">📋 Pedido: {{ p.diasPedido }}</span>
              <span v-if="p.diasEntrega" class="day-badge day-entrega">🚚 Entrega: {{ p.diasEntrega }}</span>
            </div>
            <div class="prov-card-contact">
              <span v-if="p.telefono" class="contact-line">📞 {{ p.telefono }}</span>
              <span v-if="p.email" class="contact-line">✉️ {{ p.email }}</span>
              <span v-if="p.contacto" class="contact-line">👤 {{ p.contacto }}</span>
            </div>
            <div v-if="p.direccion" class="prov-card-address">📍 {{ p.direccion }}</div>
            <div v-if="p.notas" class="prov-card-notes">📝 {{ p.notas }}</div>
          </div>
          <div class="prov-card-actions">
            <button class="btn-card-edit" @click="openProveedorModal(p)">✏️ Editar</button>
            <button class="btn-card-delete" @click="deleteProveedor(p.idProveedor!)">🗑️ Eliminar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- PEDIDOS -->
    <div v-if="activeTab === 'pedidos'" class="tab-content">
      <div class="content-toolbar">
        <div class="pedidos-stats">
          <span class="stat-item stat-pending">
            <span class="stat-dot dot-pending"></span>
            {{ totalPendientes }} pendientes
          </span>
          <span class="stat-item stat-received">
            <span class="stat-dot dot-received"></span>
            {{ totalRecibidos }} recibidos
          </span>
          <span class="stat-item stat-cancelled">
            <span class="stat-dot dot-cancelled"></span>
            {{ totalCancelados }} cancelados
          </span>
        </div>
        <div class="toolbar-actions">
          <button class="btn-secondary" :class="{ active: showHistorial }" @click="showHistorial = !showHistorial">
            📜 Historial
          </button>
          <button class="btn-primary" @click="openPedidoModal()">
            <span class="btn-icon">+</span> Nuevo Pedido
          </button>
        </div>
      </div>

      <!-- Pedidos Pendientes -->
      <div v-if="filteredPedidos.length === 0 && !showHistorial" class="empty-state-modern">
        <div class="empty-icon">📋</div>
        <p class="empty-title">No hay pedidos pendientes</p>
        <p class="empty-subtitle">Crea un nuevo pedido para comenzar</p>
        <button class="btn-primary" @click="openPedidoModal()">+ Crear Pedido</button>
      </div>

      <div class="pedidos-grid">
        <div v-for="pedido in filteredPedidos" :key="pedido.idPedido" class="pedido-card-modern">
          <div class="pedido-card-top">
            <div class="pedido-supplier-info">
              <div class="pedido-supplier-avatar">{{ (pedido.nombreProveedor || '?').charAt(0) }}</div>
              <div>
                <h4 class="pedido-supplier-name">{{ pedido.nombreProveedor }}</h4>
                <span class="pedido-date">📅 {{ formatDate(pedido.fechaEntregaEsperada) }}</span>
              </div>
            </div>
            <span :class="['estatus-badge-modern', estatusBadge(pedido.estatus)]">{{ pedido.estatus }}</span>
          </div>

          <div class="pedido-card-amounts">
            <div class="amount-item amount-total">
              <span class="amount-label">Total</span>
              <span class="amount-value">{{ formatoMoneda(pedido.montoTotal) }}</span>
            </div>
            <div class="amount-item amount-apartado">
              <span class="amount-label">Apartado</span>
              <span class="amount-value">{{ formatoMoneda(pedido.montoApartado) }}</span>
            </div>
            <div class="amount-item amount-pendiente">
              <span class="amount-label">Pendiente</span>
              <span class="amount-value">{{ formatoMoneda(pedido.montoTotal - pedido.montoApartado) }}</span>
            </div>
          </div>

          <div v-if="pedido.detalles.length > 0" class="pedido-items-preview">
            <span v-for="d in pedido.detalles.slice(0, 4)" :key="d.idDetalle" class="item-chip">
              {{ d.nombreProducto }} <strong>×{{ d.cantidad }}</strong>
            </span>
            <span v-if="pedido.detalles.length > 4" class="item-chip item-more">+{{ pedido.detalles.length - 4 }} más</span>
          </div>
          <div v-else class="pedido-manual-tag">
            <span class="manual-icon">💲</span> Monto asignado manualmente
          </div>

          <div class="pedido-card-actions">
            <button class="btn-action-modern btn-view" @click="openPedidoModal(pedido)">✏️ Editar</button>
            <button class="btn-action-modern btn-receive-modern" @click="recibirPedido(pedido.idPedido!)">✅ Recibir</button>
            <button class="btn-action-modern btn-cancel-modern" @click="deletePedido(pedido.idPedido!)">🗑️ Cancelar</button>
          </div>
        </div>
      </div>

      <!-- Historial -->
      <div v-if="showHistorial" class="historial-section-modern">
        <div class="historial-header">
          <h3>📜 Historial de Pedidos</h3>
          <span class="historial-count">{{ historialPedidos.length }} pedido{{ historialPedidos.length !== 1 ? 's' : '' }}</span>
        </div>

        <div v-if="historialPedidos.length === 0" class="empty-state-modern small">
          <p>No hay pedidos en el historial</p>
        </div>

        <div class="pedidos-grid">
          <div v-for="pedido in historialPedidos" :key="pedido.idPedido" class="pedido-card-modern pedido-card-historial">
            <div class="pedido-card-top">
              <div class="pedido-supplier-info">
                <div class="pedido-supplier-avatar">{{ (pedido.nombreProveedor || '?').charAt(0) }}</div>
                <div>
                  <h4 class="pedido-supplier-name">{{ pedido.nombreProveedor }}</h4>
                  <span class="pedido-date">Creado: {{ formatDateTime(pedido.fechaCreacion || '') }}</span>
                </div>
              </div>
              <span :class="['estatus-badge-modern', estatusBadge(pedido.estatus)]">{{ pedido.estatus }}</span>
            </div>

            <div class="pedido-card-amounts">
              <div class="amount-item amount-total">
                <span class="amount-label">Total</span>
                <span class="amount-value">{{ formatoMoneda(pedido.montoTotal) }}</span>
              </div>
              <div class="amount-item amount-apartado">
                <span class="amount-label">Apartado</span>
                <span class="amount-value">{{ formatoMoneda(pedido.montoApartado) }}</span>
              </div>
              <div class="amount-item amount-pendiente">
                <span class="amount-label">Pendiente</span>
                <span class="amount-value">{{ formatoMoneda(pedido.montoTotal - pedido.montoApartado) }}</span>
              </div>
            </div>

            <div v-if="pedido.detalles.length > 0" class="pedido-items-preview">
              <span v-for="d in pedido.detalles.slice(0, 4)" :key="d.idDetalle" class="item-chip">
                {{ d.nombreProducto }} <strong>×{{ d.cantidad }}</strong>
              </span>
              <span v-if="pedido.detalles.length > 4" class="item-chip item-more">+{{ pedido.detalles.length - 4 }} más</span>
            </div>
            <div v-else class="pedido-manual-tag">
              <span class="manual-icon">💲</span> Monto asignado manualmente
            </div>

            <div class="pedido-card-actions">
              <button class="btn-action-modern btn-view" @click="openPedidoModal(pedido)">👁️ Ver detalle</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PROVISION SEMANAL -->
    <div v-if="activeTab === 'provision'" class="tab-content">
      <div class="provision-summary-modern">
        <div class="summary-card-modern">
          <div class="summary-icon-modern">💰</div>
          <div class="summary-info-modern">
            <span class="summary-label">Total por apartar (7 días)</span>
            <span class="summary-value">{{ formatoMoneda(totalPendienteSemana) }}</span>
          </div>
        </div>
      </div>

      <div v-if="provisionSemanal.length === 0" class="empty-state-modern">
        <div class="empty-icon">📋</div>
        <p class="empty-title">No hay provisiones pendientes</p>
        <p class="empty-subtitle">Los pedidos con fecha de entrega esta semana aparecerán aquí</p>
      </div>

      <div v-for="dia in provisionSemanal" :key="dia.fecha" class="provision-day-card-modern">
        <div class="day-header-modern">
          <div class="day-info">
            <h3>{{ formatDate(dia.fecha) }}</h3>
            <span class="day-pedidos-count">{{ dia.pedidos.length }} pedido{{ dia.pedidos.length !== 1 ? 's' : '' }}</span>
          </div>
          <span class="day-total-modern">{{ formatoMoneda(dia.montoRequerido) }}</span>
        </div>
        <div class="day-pedidos-modern">
          <div v-for="pedido in dia.pedidos" :key="pedido.idPedido" class="pedido-mini-card-modern">
            <div class="mini-pedido-info">
              <span class="mini-pedido-name">{{ pedido.nombreProveedor }}</span>
              <span class="mini-pedido-total">{{ formatoMoneda(pedido.montoTotal) }}</span>
            </div>
            <span class="mini-pedido-pendiente">{{ formatoMoneda(pedido.montoPendiente) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- SUGERIDO -->
    <div v-if="activeTab === 'sugerido'" class="tab-content tab-sugerido">
      <PedidoSugerido @pedido-creado="loadAll" />
    </div>

    <!-- SUGERIDO HOY -->
    <div v-if="activeTab === 'sugeridoHoy'" class="tab-content tab-sugerido-hoy">
      <SugeridoHoy @pedido-creado="loadAll" />
    </div>

    <!-- ASIGNAR PRODUCTOS -->
    <div v-if="activeTab === 'asignar'" class="tab-content tab-asignar">
      <AsignarProductosProveedor />
    </div>

    <!-- MODAL PROVEEDOR -->
    <div v-if="showProveedorModal" class="modal-overlay" @click.self="showProveedorModal = false">
      <div class="modal-card-modern">
        <div class="modal-header">
          <h3>{{ editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor' }}</h3>
          <button class="modal-close" @click="showProveedorModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group-modern">
            <label>Nombre del proveedor *</label>
            <input v-model="proveedorForm.nombre" placeholder="Ej: Distribuidora ABC" class="input-modern" autofocus>
          </div>
          <div class="form-row">
            <div class="form-group-modern">
              <label>Contacto</label>
              <input v-model="proveedorForm.contacto" placeholder="Persona de contacto" class="input-modern">
            </div>
            <div class="form-group-modern">
              <label>Teléfono</label>
              <input v-model="proveedorForm.telefono" placeholder="(000) 000-0000" class="input-modern">
            </div>
          </div>
          <div class="form-group-modern">
            <label>Email</label>
            <input v-model="proveedorForm.email" type="email" placeholder="correo@ejemplo.com" class="input-modern">
          </div>
          <div class="form-group-modern">
            <label>Dirección</label>
            <input v-model="proveedorForm.direccion" placeholder="Calle, número, colonia..." class="input-modern">
          </div>
          <div class="form-group-modern">
            <label>Notas</label>
            <textarea v-model="proveedorForm.notas" rows="2" placeholder="Notas adicionales..." class="input-modern textarea-modern"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group-modern">
              <label>Tipo de proveedor</label>
              <select v-model="proveedorForm.tipoProveedor" class="input-modern">
                <option value="DIRECTA">Venta directa (mismo día)</option>
                <option value="PREVENTA">Preventa (entrega siguiente día)</option>
              </select>
            </div>
            <div class="form-group-modern">
              <label>Días de entrega</label>
              <div class="dias-checkboxes">
                <label v-for="dia in ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo']" :key="dia" class="dia-check">
                  <input type="checkbox" :value="dia" :checked="(proveedorForm.diasEntrega || '').split(',').includes(dia)" @change="toggleDia(dia)">
                  <span>{{ dia.substring(0, 3) }}</span>
                </label>
              </div>
            </div>
          </div>
          <div class="form-group-modern">
            <label>📋 Días de pedido (Preventa)</label>
            <div class="dias-checkboxes">
              <label v-for="dia in ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo']" :key="dia" class="dia-check">
                <input type="checkbox" :value="dia" :checked="(proveedorForm.diasPedido || '').split(',').includes(dia)" @change="toggleDiaPedido(dia)">
                <span>{{ dia.substring(0, 3) }}</span>
              </label>
            </div>
            <span class="field-hint">Días en que se le puede hacer pedido (ej: Miércoles)</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" @click="showProveedorModal = false">Cancelar</button>
          <button class="btn-modal-save" @click="saveProveedor">{{ editingProveedor ? 'Actualizar' : 'Guardar' }}</button>
        </div>
      </div>
    </div>

    <!-- MODAL PEDIDO -->
    <div v-if="showPedidoModal" class="modal-overlay" @click.self="showPedidoModal = false">
      <div class="modal-card-modern modal-xl">
        <div class="modal-header">
          <h3>{{ editingPedido ? 'Editar Pedido' : 'Nuevo Pedido' }}</h3>
          <button class="modal-close" @click="showPedidoModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="pedido-form-section">
            <h4 class="section-title">📋 Datos del Pedido</h4>
            <div class="form-row">
              <div class="form-group-modern form-lg">
                <label>Proveedor *</label>
                <select v-model="pedidoForm.idProveedor" class="input-modern select-modern">
                  <option :value="0">Seleccionar proveedor...</option>
                  <option v-for="p in proveedores" :key="p.idProveedor" :value="p.idProveedor">{{ p.nombre }}</option>
                </select>
              </div>
              <div class="form-group-modern">
                <label>Fecha de entrega *</label>
                <input v-model="pedidoForm.fechaEntregaEsperada" type="date" class="input-modern">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group-modern">
                <label>Monto apartado</label>
                <input v-model.number="pedidoForm.montoApartado" type="number" step="0.01" min="0" placeholder="0.00" class="input-modern">
              </div>
              <div class="form-group-modern" v-if="editingPedido">
                <label>Estatus</label>
                <select v-model="pedidoForm.estatus" @change="handleEstatusChange" class="input-modern select-modern">
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="RECIBIDO">Recibido</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          <div class="monto-manual-section">
            <label class="monto-toggle">
              <input type="checkbox" v-model="montoManual">
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
              <span class="toggle-label">Monto total sin productos</span>
            </label>
            <div v-if="montoManual" class="monto-input-wrapper">
              <span class="currency-symbol">$</span>
              <input v-model.number="pedidoForm.montoTotal" type="number" step="0.01" min="0" placeholder="0.00" class="monto-input-big">
            </div>
          </div>

          <div class="detalle-section-modern">
            <h4 class="section-title">📦 Productos del Pedido</h4>
            <p class="section-hint">Agrega los productos que llegarán en este pedido. Si aún no los conoces, usa el toggle de arriba para colocar solo el monto total.</p>

            <div class="barcode-row">
              <div class="barcode-input-wrapper">
                <span class="barcode-icon">📷</span>
                <input id="barcode-input-pedido" v-model="barcodeInput" type="text" placeholder="Escanear código de barras" class="input-modern barcode-input">
              </div>
              <button class="btn-scanner" @click="startScanner" :class="{ active: scannerActivo }">
                {{ scannerActivo ? '⏹ Detener' : '📷 Escanear' }}
              </button>
            </div>
            <div v-if="scannerActivo" class="scanner-viewport">
              <div id="scanner-interactive-pedido"></div>
              <div class="scanner-overlay">
                <div class="scanner-corner tl"></div>
                <div class="scanner-corner tr"></div>
                <div class="scanner-corner bl"></div>
                <div class="scanner-corner br"></div>
              </div>
            </div>

            <div class="add-product-row">
              <div class="producto-search-wrapper">
                <input
                  v-model="searchProducto"
                  type="text"
                  placeholder="Buscar producto..."
                  class="input-modern search-product-input"
                  @focus="handleSearchProductoFocus"
                  @input="showProductoDropdown = true"
                >
                <div v-if="showProductoDropdown && filteredProductosPedido.length" class="producto-dropdown">
                  <div
                    v-for="prod in filteredProductosPedido"
                    :key="prod.idProducto"
                    class="producto-dropdown-item"
                    @click="selectProductoForDetalle(prod)"
                  >
                    <span class="producto-dropdown-name">{{ prod.nombre }}</span>
                    <span class="producto-dropdown-info">
                      <span v-if="prod.codigoBarras" class="producto-dropdown-barcode">{{ prod.codigoBarras }}</span>
                      <span class="producto-dropdown-price">{{ formatoMoneda(prod.precio_costo) }}</span>
                    </span>
                  </div>
                </div>
              </div>
              <input v-model.number="newDetalle.cantidad" type="number" min="1" placeholder="Cant" class="input-modern input-qty">
              <input v-model.number="newDetalle.precioUnitario" type="number" step="0.01" min="0" placeholder="$ Precio" class="input-modern input-price">
              <button class="btn-add-product" @click="addDetalle">+ Agregar</button>
            </div>

            <div v-if="pedidoForm.detalles.length > 0" class="detalle-list-modern">
              <div class="detalle-header-modern">
                <span>Producto</span>
                <span>Precio</span>
                <span>Cant</span>
                <span>Subtotal</span>
                <span></span>
              </div>
              <div v-for="(d, idx) in pedidoForm.detalles" :key="idx" class="detalle-row-modern">
                <div class="detalle-product-cell">
                  <span class="detalle-product-name">{{ d.nombreProducto }}</span>
                  <span v-if="d.codigoBarras" class="detalle-barcode">{{ d.codigoBarras }}</span>
                </div>
                <div class="detalle-price-cell">
                  <div class="price-comparison">
                    <span class="price-current">{{ formatoMoneda(d.precioCostoActual || 0) }}</span>
                    <input
                      v-model.number="d.precioUnitario"
                      type="number"
                      step="0.01"
                      min="0"
                      class="input-modern input-price-small"
                      :class="{ 'price-changed': d.precioUnitario !== d.precioCostoActual }"
                      @change="updateDetallePrecio(idx, d.precioUnitario)"
                    >
                  </div>
                </div>
                <input
                  v-model.number="d.cantidad"
                  type="number"
                  min="1"
                  class="input-modern input-qty-small"
                  @change="updateDetalleCantidad(idx, d.cantidad)"
                >
                <span class="detalle-subtotal-cell">{{ formatoMoneda(d.subtotal) }}</span>
                <button class="btn-remove-modern" @click="removeDetalle(idx)">✕</button>
              </div>
            </div>

            <div v-if="pedidoForm.detalles.length > 0" class="detalle-total-modern">
              <span>Total del Pedido</span>
              <strong class="total-amount">{{ formatoMoneda(pedidoForm.montoTotal) }}</strong>
            </div>
          </div>

          <div class="form-group-modern">
            <label>Notas del pedido</label>
            <textarea v-model="pedidoForm.notas" rows="2" placeholder="Observaciones..." class="input-modern textarea-modern"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" @click="showPedidoModal = false">Cancelar</button>
          <button class="btn-modal-save" @click="savePedido">{{ editingPedido ? 'Actualizar' : 'Crear Pedido' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>


