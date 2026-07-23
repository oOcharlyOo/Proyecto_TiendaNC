<script setup lang="ts">
import { useProveedores } from './logica/useProveedores';
const { activeTab, showProveedorModal, editingProveedor, proveedorForm, showPedidoModal, editingPedido, pedidoForm, newDetalle, barcodeInput, searchProducto, showProductoDropdown, scannerActivo, montoManual, searchProveedor, showHistorial, vistaTarjetas, proveedores, pedidos, provisionSemanal, productosDisponibles, categorias, filteredProveedores, filteredPedidos, historialPedidos, filteredProductosPedido, totalPendienteSemana, totalPendientes, totalRecibidos, totalCancelados, formatoMoneda, formatDate, formatDateTime, diasParaEntrega, loadAll, openProveedorModal, saveProveedor, toggleDia, toggleDiaPedido, deleteProveedor, openPedidoModal, addDetalle, removeDetalle, recalcTotal, updateDetallePrecio, updateDetalleCantidad, selectProductoForDetalle, handleSearchProductoFocus, handleSearchProductoBlur, startScanner, savePedido, deletePedido, recibirPedido, handleEstatusChange, estatusBadge, getProveedorNombre, getProveedorInfo } = useProveedores();
import PedidoSugerido from '../modals/PedidoSugerido.vue';
import SugeridoHoy from '../modals/SugeridoHoy.vue';
import AsignarProductosProveedor from '../modals/AsignarProductosProveedor.vue';
import AnalisisInventario from './secciones/AnalisisInventario.vue';
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
      <button :class="['tab-btn', { active: activeTab === 'inteligencia' }]" @click="activeTab = 'inteligencia'">
        <span class="tab-icon">📊</span>
        <span class="tab-label">Inteligencia</span>
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

    <!-- INTELIGENCIA -->
    <div v-if="activeTab === 'inteligencia'" class="tab-content tab-inteligencia">
      <AnalisisInventario />
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
              <select v-model="proveedorForm.tipoProveedor" class="input-modern select-modern">
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

<style scoped>
.proveedores-container{padding:.6rem;display:flex;flex-direction:column;gap:.6rem;height:100%;overflow:auto}
.proveedores-container :deep(.proveedores-header h2){margin:0;font-size:1.15rem;color:var(--color-accent);font-weight:800}
.proveedores-container :deep(.tab-bar){display:flex;gap:0;background:var(--color-bg-panel);border:none;border-radius:10px;overflow:hidden;box-shadow:inset 0 -1px 0 var(--color-border);flex-shrink:0}.proveedores-container :deep(.tab-btn){padding:.6rem 1rem;background:transparent;border:none;border-bottom:3px solid transparent;color:var(--color-text-secondary);font-size:.78rem;font-weight:700;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:.4rem}.proveedores-container :deep(.tab-btn:hover){color:var(--color-text-primary);background:color-mix(in srgb,var(--color-accent) 5%,transparent)}.proveedores-container :deep(.tab-btn.active){color:var(--color-accent);border-bottom-color:var(--color-accent);background:color-mix(in srgb,var(--color-accent) 10%,transparent)}.proveedores-container :deep(.tab-icon){font-size:1rem}.proveedores-container :deep(.tab-count){font-size:.62rem;padding:.05rem .4rem;border-radius:8px;background:var(--color-bg-primary);color:var(--color-text-secondary);box-shadow:inset 1px 1px 2px rgba(0,0,0,.05)}.proveedores-container :deep(.badge-pending-pill){background:color-mix(in srgb,var(--color-warning) 20%,transparent);color:var(--color-warning)}
.proveedores-container :deep(.tab-content){flex:1;overflow:auto;display:flex;flex-direction:column;gap:.5rem}
.proveedores-container :deep(.content-toolbar){display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap}.proveedores-container :deep(.search-box){position:relative;display:flex;align-items:center;flex:1;min-width:200px}.proveedores-container :deep(.search-icon){position:absolute;left:.6rem;font-size:.8rem;opacity:.6;pointer-events:none}.proveedores-container :deep(.search-input-modern){width:100%;padding:.45rem 1rem .45rem 2rem;background:var(--color-bg-primary);border:none;border-radius:7px;color:var(--color-text-primary);font-size:.78rem;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08)}.proveedores-container :deep(.search-input-modern:focus){outline:none;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08),0 0 0 2px var(--color-accent)}.proveedores-container :deep(.toolbar-right){display:flex;align-items:center;gap:.5rem}
.proveedores-container :deep(.view-toggle-prov){display:flex;background:var(--color-bg-panel);border:none;border-radius:6px;overflow:hidden;box-shadow:inset 1px 1px 2px rgba(0,0,0,.06)}.proveedores-container :deep(.view-btn-prov){padding:.35rem .65rem;border:none;background:transparent;color:var(--color-text-secondary);font-size:.7rem;font-weight:600;cursor:pointer;transition:all .15s}.proveedores-container :deep(.view-btn-prov.active){background:var(--color-accent);color:var(--color-on-brand)}
.proveedores-container :deep(.btn-primary){border:none;padding:.45rem .9rem;font-size:.72rem;font-weight:700;color:var(--color-on-brand);background:var(--color-accent);cursor:pointer;border-radius:7px;box-shadow:3px 3px 6px rgba(0,0,0,.12);transition:all .15s;display:inline-flex;align-items:center;gap:.3rem}.proveedores-container :deep(.btn-primary:hover){transform:translateY(-1px);box-shadow:5px 5px 10px rgba(0,0,0,.18)}.proveedores-container :deep(.btn-icon){font-size:1rem}
.proveedores-container :deep(.btn-secondary){border:none;padding:.4rem .7rem;font-size:.68rem;font-weight:700;color:var(--color-text-secondary);background:var(--color-bg-secondary);cursor:pointer;border-radius:7px;box-shadow:2px 2px 4px rgba(0,0,0,.08);transition:all .15s}.proveedores-container :deep(.btn-secondary:hover){transform:translateY(-1px);box-shadow:4px 4px 8px rgba(0,0,0,.12);color:var(--color-text-primary)}.proveedores-container :deep(.btn-secondary.active){background:var(--color-accent);color:var(--color-on-brand)}
.proveedores-container :deep(.empty-state-modern){display:flex;flex-direction:column;align-items:center;gap:.6rem;padding:3rem 1rem;color:var(--color-text-secondary)}.proveedores-container :deep(.empty-state-modern.small){padding:1.5rem}.proveedores-container :deep(.empty-icon){font-size:2.5rem}.proveedores-container :deep(.empty-title){font-size:.9rem;font-weight:700;margin:0}.proveedores-container :deep(.empty-subtitle){font-size:.75rem;opacity:.7;margin:0}

.proveedores-container :deep(.proveedores-list-compact){display:flex;flex-direction:column;gap:.35rem}.proveedores-container :deep(.proveedor-row-compact){background:var(--color-bg-secondary);border:none;border-radius:10px;padding:.7rem .85rem;box-shadow:2px 2px 5px rgba(0,0,0,.06);transition:all .15s}.proveedores-container :deep(.proveedor-row-compact:hover){transform:translateY(-1px);box-shadow:4px 4px 10px rgba(0,0,0,.1)}.proveedores-container :deep(.proveedor-row-main){display:flex;align-items:flex-start;gap:.7rem}.proveedores-container :deep(.proveedor-avatar-sm){width:36px;height:36px;border-radius:50%;background:var(--color-bg-primary);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--color-accent);box-shadow:inset 2px 2px 4px rgba(0,0,0,.08)}.proveedores-container :deep(.proveedor-row-info){flex:1;min-width:0}.proveedores-container :deep(.proveedor-name){margin:0;font-size:.82rem;font-weight:700;color:var(--color-text-primary)}.proveedores-container :deep(.proveedor-badges){display:flex;gap:.25rem;flex-wrap:wrap;margin:.15rem 0}.proveedores-container :deep(.badge-tipo-prov){font-size:.55rem;padding:.1rem .4rem;border-radius:3px;font-weight:600;box-shadow:1px 1px 2px rgba(0,0,0,.04)}.proveedores-container :deep(.badge-preventa-prov){background:color-mix(in srgb,var(--color-info) 15%,transparent);color:var(--color-info)}.proveedores-container :deep(.badge-directa-prov){background:color-mix(in srgb,var(--color-success) 15%,transparent);color:var(--color-success)}.proveedores-container :deep(.badge-pedido-prov){background:color-mix(in srgb,var(--color-accent) 15%,transparent);color:var(--color-accent)}.proveedores-container :deep(.badge-entrega-prov){background:color-mix(in srgb,var(--color-info) 15%,transparent);color:var(--color-info)}.proveedores-container :deep(.badge-dias-prov){font-size:.52rem;padding:.08rem .35rem;border-radius:3px;font-weight:600}.proveedores-container :deep(.proveedor-quick-info){display:flex;gap:.5rem;flex-wrap:wrap;font-size:.65rem;color:var(--color-text-secondary)}.proveedores-container :deep(.quick-info-item){opacity:.8}.proveedores-container :deep(.proveedor-row-actions){position:absolute;top:.6rem;right:.75rem;display:flex;gap:.2rem}.proveedores-container :deep(.proveedor-row-compact){position:relative}.proveedores-container :deep(.btn-icon-sm){width:28px;height:28px;border:none;border-radius:5px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.8rem;transition:all .15s;box-shadow:2px 2px 3px rgba(0,0,0,.06)}.proveedores-container :deep(.btn-edit-sm){background:var(--color-bg-primary);color:var(--color-accent)}.proveedores-container :deep(.btn-edit-sm:hover){background:var(--color-accent);color:var(--color-on-brand);transform:translateY(-1px)}.proveedores-container :deep(.btn-delete-sm){background:var(--color-bg-primary);color:var(--color-error)}.proveedores-container :deep(.btn-delete-sm:hover){background:var(--color-error);color:#fff;transform:translateY(-1px)}.proveedores-container :deep(.proveedor-row-details){margin-top:.35rem;padding-top:.35rem;border-top:1px solid rgba(255,255,255,.03);display:flex;flex-direction:column;gap:.15rem;font-size:.65rem;color:var(--color-text-secondary)}.proveedores-container :deep(.detail-line){display:flex;align-items:center;gap:.2rem}
.proveedores-container :deep(.proveedores-grid){display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:.6rem}.proveedores-container :deep(.proveedor-card){background:var(--color-bg-secondary);border:none;border-radius:12px;padding:.8rem;display:flex;flex-direction:column;gap:.5rem;box-shadow:3px 3px 8px rgba(0,0,0,.08);transition:all .15s}.proveedores-container :deep(.proveedor-card:hover){transform:translateY(-2px);box-shadow:6px 6px 14px rgba(0,0,0,.15)}.proveedores-container :deep(.prov-card-top){display:flex;align-items:center;justify-content:space-between}.proveedores-container :deep(.prov-card-avatar){width:40px;height:40px;border-radius:50%;background:var(--color-bg-primary);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--color-accent);box-shadow:inset 2px 2px 4px rgba(0,0,0,.08)}.proveedores-container :deep(.prov-card-tipo){font-size:.6rem;padding:.1rem .45rem;border-radius:4px;font-weight:600}.proveedores-container :deep(.tipo-preventa){background:color-mix(in srgb,var(--color-info) 15%,transparent);color:var(--color-info)}.proveedores-container :deep(.tipo-directa){background:color-mix(in srgb,var(--color-success) 15%,transparent);color:var(--color-success)}.proveedores-container :deep(.prov-card-name){margin:0;font-size:.85rem;font-weight:700;color:var(--color-text-primary)}.proveedores-container :deep(.prov-card-days){display:flex;gap:.3rem}.proveedores-container :deep(.day-badge){font-size:.55rem;padding:.1rem .35rem;border-radius:3px;font-weight:600}.proveedores-container :deep(.day-pedido){background:color-mix(in srgb,var(--color-accent) 15%,transparent);color:var(--color-accent)}.proveedores-container :deep(.day-entrega){background:color-mix(in srgb,var(--color-info) 15%,transparent);color:var(--color-info)}.proveedores-container :deep(.prov-card-contact){display:flex;flex-direction:column;gap:.1rem;font-size:.65rem;color:var(--color-text-secondary)}.proveedores-container :deep(.prov-card-address),.proveedores-container :deep(.prov-card-notes){font-size:.62rem;color:var(--color-text-secondary);opacity:.8}.proveedores-container :deep(.prov-card-actions){display:flex;gap:.35rem}.proveedores-container :deep(.btn-card-edit){flex:1;padding:.35rem;border:none;border-radius:6px;background:var(--color-bg-primary);color:var(--color-accent);font-size:.65rem;font-weight:700;cursor:pointer;box-shadow:2px 2px 4px rgba(0,0,0,.06)}.proveedores-container :deep(.btn-card-edit:hover){background:var(--color-accent);color:var(--color-on-brand)}.proveedores-container :deep(.btn-card-delete){flex:1;padding:.35rem;border:none;border-radius:6px;background:var(--color-bg-primary);color:var(--color-error);font-size:.65rem;font-weight:700;cursor:pointer;box-shadow:2px 2px 4px rgba(0,0,0,.06)}.proveedores-container :deep(.btn-card-delete:hover){background:var(--color-error);color:#fff}

.proveedores-container :deep(.pedidos-stats){display:flex;gap:.8rem;font-size:.72rem}.proveedores-container :deep(.stat-item){display:flex;align-items:center;gap:.3rem}.proveedores-container :deep(.stat-dot){width:8px;height:8px;border-radius:50%}.proveedores-container :deep(.dot-pending){background:var(--color-warning)}.proveedores-container :deep(.dot-received){background:var(--color-success)}.proveedores-container :deep(.dot-cancelled){background:var(--color-error)}.proveedores-container :deep(.stat-pending){color:var(--color-warning)}.proveedores-container :deep(.stat-received){color:var(--color-success)}.proveedores-container :deep(.stat-cancelled){color:var(--color-error)}.proveedores-container :deep(.toolbar-actions){display:flex;gap:.4rem}
.proveedores-container :deep(.pedidos-grid){display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:.6rem}.proveedores-container :deep(.pedido-card-modern){background:var(--color-bg-secondary);border:none;border-radius:12px;padding:.85rem;display:flex;flex-direction:column;gap:.5rem;box-shadow:3px 3px 8px rgba(0,0,0,.08);transition:all .15s}.proveedores-container :deep(.pedido-card-modern:hover){transform:translateY(-2px);box-shadow:6px 6px 14px rgba(0,0,0,.15)}.proveedores-container :deep(.pedido-card-top){display:flex;align-items:center;justify-content:space-between;gap:.5rem}.proveedores-container :deep(.pedido-supplier-info){display:flex;align-items:center;gap:.5rem}.proveedores-container :deep(.pedido-supplier-avatar){width:36px;height:36px;border-radius:50%;background:var(--color-bg-primary);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--color-accent);box-shadow:inset 2px 2px 3px rgba(0,0,0,.08)}.proveedores-container :deep(.pedido-supplier-name){margin:0;font-size:.78rem;font-weight:700;color:var(--color-text-primary)}.proveedores-container :deep(.pedido-date){font-size:.62rem;color:var(--color-text-secondary)}.proveedores-container :deep(.estatus-badge-modern){font-size:.58rem;padding:.15rem .5rem;border-radius:4px;font-weight:700;text-transform:uppercase}.proveedores-container :deep(.estatus-badge-modern:contains(PENDIENTE)){background:color-mix(in srgb,var(--color-warning) 15%,transparent);color:var(--color-warning)}.proveedores-container :deep(.estatus-badge-modern:contains(RECIBIDO)){background:color-mix(in srgb,var(--color-success) 15%,transparent);color:var(--color-success)}.proveedores-container :deep(.estatus-badge-modern:contains(CANCELADO)){background:color-mix(in srgb,var(--color-error) 15%,transparent);color:var(--color-error)}
.proveedores-container :deep(.pedido-card-amounts){display:flex;gap:.5rem}.proveedores-container :deep(.amount-item){flex:1;padding:.35rem;background:var(--color-bg-primary);border-radius:6px;text-align:center;box-shadow:inset 1px 1px 2px rgba(0,0,0,.04)}.proveedores-container :deep(.amount-label){display:block;font-size:.52rem;color:var(--color-text-secondary);text-transform:uppercase}.proveedores-container :deep(.amount-value){font-size:.78rem;font-weight:700;font-family:'Courier New',monospace}.proveedores-container :deep(.amount-total .amount-value){color:var(--color-success)}.proveedores-container :deep(.amount-apartado .amount-value){color:var(--color-accent)}.proveedores-container :deep(.amount-pendiente .amount-value){color:var(--color-warning)}
.proveedores-container :deep(.pedido-items-preview){display:flex;flex-wrap:wrap;gap:.2rem}.proveedores-container :deep(.item-chip){font-size:.6rem;padding:.1rem .4rem;background:var(--color-bg-primary);border-radius:4px;color:var(--color-text-secondary);box-shadow:1px 1px 2px rgba(0,0,0,.03)}.proveedores-container :deep(.item-chip strong){color:var(--color-accent)}.proveedores-container :deep(.item-more){font-style:italic;opacity:.6}.proveedores-container :deep(.pedido-manual-tag){font-size:.62rem;color:var(--color-text-secondary);opacity:.7}
.proveedores-container :deep(.pedido-card-actions){display:flex;gap:.3rem}.proveedores-container :deep(.btn-action-modern){flex:1;padding:.35rem;border:none;border-radius:6px;font-size:.62rem;font-weight:700;cursor:pointer;transition:all .15s;text-align:center}.proveedores-container :deep(.btn-view){background:var(--color-bg-primary);color:var(--color-accent);box-shadow:2px 2px 3px rgba(0,0,0,.05)}.proveedores-container :deep(.btn-view:hover){background:var(--color-accent);color:var(--color-on-brand)}.proveedores-container :deep(.btn-receive-modern){background:color-mix(in srgb,var(--color-success) 15%,transparent);color:var(--color-success);box-shadow:2px 2px 3px rgba(0,0,0,.05)}.proveedores-container :deep(.btn-receive-modern:hover){background:var(--color-success);color:#fff}.proveedores-container :deep(.btn-cancel-modern){background:color-mix(in srgb,var(--color-error) 15%,transparent);color:var(--color-error);box-shadow:2px 2px 3px rgba(0,0,0,.05)}.proveedores-container :deep(.btn-cancel-modern:hover){background:var(--color-error);color:#fff}

.proveedores-container :deep(.historial-section-modern){display:flex;flex-direction:column;gap:.5rem}.proveedores-container :deep(.historial-header){display:flex;align-items:center;justify-content:space-between}.proveedores-container :deep(.historial-header h3){margin:0;font-size:.9rem;color:var(--color-accent)}.proveedores-container :deep(.historial-count){font-size:.68rem;color:var(--color-text-secondary)}

.proveedores-container :deep(.provision-summary-modern){display:flex;gap:.5rem}.proveedores-container :deep(.summary-card-modern){flex:1;display:flex;align-items:center;gap:.6rem;padding:.7rem .85rem;background:var(--color-bg-secondary);border:none;border-radius:10px;box-shadow:3px 3px 6px rgba(0,0,0,.08)}.proveedores-container :deep(.summary-icon-modern){font-size:1.5rem}.proveedores-container :deep(.summary-info-modern){display:flex;flex-direction:column;gap:.05rem}.proveedores-container :deep(.summary-label){font-size:.6rem;color:var(--color-text-secondary)}.proveedores-container :deep(.summary-value){font-size:1rem;font-weight:800;color:var(--color-text-primary)}
.proveedores-container :deep(.provision-day-card-modern){background:var(--color-bg-secondary);border:none;border-radius:10px;padding:.75rem;box-shadow:2px 2px 5px rgba(0,0,0,.06)}.proveedores-container :deep(.day-header-modern){display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem}.proveedores-container :deep(.day-info h3){margin:0;font-size:.8rem;color:var(--color-accent)}.proveedores-container :deep(.day-pedidos-count){font-size:.6rem;color:var(--color-text-secondary)}.proveedores-container :deep(.day-total-modern){font-size:.9rem;font-weight:800;color:var(--color-success)}.proveedores-container :deep(.day-pedidos-modern){display:flex;flex-direction:column;gap:.2rem}.proveedores-container :deep(.pedido-mini-card-modern){display:flex;align-items:center;justify-content:space-between;padding:.3rem .5rem;background:var(--color-bg-primary);border-radius:6px;box-shadow:inset 1px 1px 2px rgba(0,0,0,.03)}.proveedores-container :deep(.mini-pedido-name){font-size:.7rem;font-weight:600;color:var(--color-text-primary)}.proveedores-container :deep(.mini-pedido-total){font-size:.7rem;color:var(--color-success);font-weight:600;margin-left:.5rem}.proveedores-container :deep(.mini-pedido-pendiente){font-size:.7rem;color:var(--color-warning);font-weight:700}

.proveedores-container :deep(.modal-overlay){position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem}.proveedores-container :deep(.modal-card-modern){background:var(--color-bg-secondary);border:none;border-radius:14px;width:min(100%,520px);max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:12px 12px 30px rgba(0,0,0,.4),-6px -6px 20px rgba(255,255,255,.03)}.proveedores-container :deep(.modal-xl){max-width:800px}.proveedores-container :deep(.modal-header){display:flex;align-items:center;justify-content:space-between;padding:.8rem 1.1rem;border-bottom:1px solid color-mix(in srgb,var(--color-accent) 20%,transparent)}.proveedores-container :deep(.modal-header h3){margin:0;font-size:.9rem;color:var(--color-accent);font-weight:700}.proveedores-container :deep(.modal-close){background:var(--color-bg-primary);border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--color-text-secondary);font-size:.9rem;box-shadow:2px 2px 4px rgba(0,0,0,.1)}.proveedores-container :deep(.modal-close:hover){background:var(--color-error);color:#fff}.proveedores-container :deep(.modal-body){padding:1rem;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:.75rem}.proveedores-container :deep(.modal-footer){display:flex;justify-content:flex-end;gap:.5rem;padding:.8rem 1.1rem;border-top:1px solid var(--color-border)}.proveedores-container :deep(.btn-modal-save){border:none;padding:.55rem 1.1rem;border-radius:8px;background:var(--color-accent);color:var(--color-on-brand);font-size:.72rem;font-weight:700;cursor:pointer;box-shadow:4px 4px 10px rgba(0,0,0,.2);transition:all .15s}.proveedores-container :deep(.btn-modal-save:hover){transform:translateY(-1px);box-shadow:6px 6px 14px rgba(0,0,0,.25)}.proveedores-container :deep(.btn-modal-cancel){border:none;padding:.55rem 1.1rem;border-radius:8px;background:var(--color-bg-secondary);color:var(--color-text-secondary);font-size:.72rem;font-weight:700;cursor:pointer;box-shadow:2px 2px 4px rgba(0,0,0,.08);transition:all .15s}.proveedores-container :deep(.btn-modal-cancel:hover){transform:translateY(-1px);box-shadow:4px 4px 8px rgba(0,0,0,.12);color:var(--color-text-primary)}.proveedores-container :deep(.btn-modal-cancel:hover){color:var(--color-text-primary)}

.proveedores-container :deep(.form-group-modern){display:flex;flex-direction:column;gap:.2rem}.proveedores-container :deep(.form-group-modern label){font-size:.62rem;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase}.proveedores-container :deep(.form-lg){flex:2}.proveedores-container :deep(.form-row){display:flex;gap:.5rem}.proveedores-container :deep(.input-modern){width:100%;padding:.45rem .6rem;background:var(--color-bg-primary);border:none;border-radius:7px;color:var(--color-text-primary);font-size:.78rem;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08)}.proveedores-container :deep(.input-modern:focus){outline:none;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08),0 0 0 2px var(--color-accent)}.proveedores-container :deep(.textarea-modern){resize:vertical;min-height:50px}.proveedores-container :deep(.select-modern){appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .6rem center;padding-right:2rem;cursor:pointer}.proveedores-container :deep(.field-hint){font-size:.55rem;color:var(--color-text-secondary);opacity:.7;margin-top:.1rem}
.proveedores-container :deep(.dias-checkboxes){display:flex;flex-wrap:wrap;gap:.25rem;padding:.15rem 0}
.proveedores-container :deep(.dia-check){display:flex;align-items:center;gap:.25rem;font-size:.62rem;color:var(--color-text-secondary);cursor:pointer;padding:.15rem .45rem;background:var(--color-bg-primary);border-radius:6px;transition:all .15s;box-shadow:inset 1px 1px 3px rgba(0,0,0,.08);user-select:none}
.proveedores-container :deep(.dia-check:hover){box-shadow:inset 2px 2px 4px rgba(0,0,0,.12);color:var(--color-text-primary)}
.proveedores-container :deep(.dia-check input[type=checkbox]){display:none}
.proveedores-container :deep(.dia-check input:checked + span){color:var(--color-on-brand);font-weight:700}
.proveedores-container :deep(.dia-check input:checked){}
.proveedores-container :deep(.dia-check:has(input:checked)){background:var(--color-accent);color:var(--color-on-brand);box-shadow:2px 2px 4px rgba(0,0,0,.15)}
.proveedores-container :deep(.pedido-form-section),.proveedores-container :deep(.detalle-section-modern){display:flex;flex-direction:column;gap:.5rem}.proveedores-container :deep(.section-title){margin:0;font-size:.72rem;color:var(--color-accent);font-weight:700}.proveedores-container :deep(.section-hint){font-size:.6rem;color:var(--color-text-secondary);margin:0}
.proveedores-container :deep(.monto-manual-section){padding:.4rem;background:var(--color-bg-primary);border-radius:8px;box-shadow:inset 1px 1px 2px rgba(0,0,0,.04)}.proveedores-container :deep(.monto-toggle){display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.68rem;color:var(--color-text-secondary)}.proveedores-container :deep(.monto-toggle input){display:none}.proveedores-container :deep(.toggle-track){width:32px;height:16px;background:var(--color-bg-secondary);border-radius:8px;position:relative;box-shadow:inset 1px 1px 2px rgba(0,0,0,.08)}.proveedores-container :deep(.toggle-thumb){position:absolute;top:2px;left:2px;width:12px;height:12px;background:var(--color-text-secondary);border-radius:50%;transition:all .2s}.proveedores-container :deep(.monto-toggle input:checked+.toggle-track){background:var(--color-accent)}.proveedores-container :deep(.monto-toggle input:checked+.toggle-track .toggle-thumb){left:18px;background:var(--color-on-brand)}.proveedores-container :deep(.monto-input-wrapper){display:flex;align-items:center;gap:.3rem;margin-top:.4rem}.proveedores-container :deep(.currency-symbol){font-size:1.1rem;font-weight:700;color:var(--color-success)}.proveedores-container :deep(.monto-input-big){flex:1;padding:.5rem .6rem;background:var(--color-bg-panel);border:none;border-radius:7px;color:var(--color-success);font-size:1.1rem;font-weight:800;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08)}
.proveedores-container :deep(.barcode-row){display:flex;gap:.4rem}.proveedores-container :deep(.barcode-input-wrapper){position:relative;flex:1}.proveedores-container :deep(.barcode-icon){position:absolute;left:.5rem;top:50%;transform:translateY(-50%);font-size:.8rem}.proveedores-container :deep(.barcode-input){padding-left:2rem!important}.proveedores-container :deep(.btn-scanner){border:none;padding:.45rem .7rem;border-radius:7px;background:var(--color-bg-secondary);color:var(--color-text-secondary);font-size:.7rem;font-weight:600;cursor:pointer;box-shadow:2px 2px 3px rgba(0,0,0,.06)}.proveedores-container :deep(.btn-scanner.active){background:var(--color-error);color:#fff}.proveedores-container :deep(.scanner-viewport){width:100%;height:200px;border-radius:8px;overflow:hidden;position:relative;background:#000}
.proveedores-container :deep(.add-product-row){display:flex;gap:.35rem}.proveedores-container :deep(.producto-search-wrapper){position:relative;flex:2}.proveedores-container :deep(.search-product-input){width:100%}.proveedores-container :deep(.input-qty){width:60px;flex-shrink:0}.proveedores-container :deep(.input-price){width:90px;flex-shrink:0}.proveedores-container :deep(.producto-dropdown){position:absolute;top:100%;left:0;right:0;background:var(--color-bg-panel);border:none;border-radius:8px;max-height:200px;overflow-y:auto;z-index:50;box-shadow:6px 6px 16px rgba(0,0,0,.2);margin-top:2px}.proveedores-container :deep(.producto-dropdown-item){display:flex;justify-content:space-between;align-items:center;padding:.4rem .6rem;cursor:pointer;font-size:.72rem;color:var(--color-text-primary)}.proveedores-container :deep(.producto-dropdown-item:hover){background:var(--color-bg-primary)}.proveedores-container :deep(.producto-dropdown-name){font-weight:600}.proveedores-container :deep(.producto-dropdown-barcode){font-size:.6rem;color:var(--color-text-secondary);margin-right:.5rem}.proveedores-container :deep(.producto-dropdown-price){font-weight:700;color:var(--color-accent)}.proveedores-container :deep(.btn-add-product){border:none;padding:.45rem .7rem;border-radius:7px;background:var(--color-accent);color:var(--color-on-brand);font-size:.68rem;font-weight:700;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,.1);white-space:nowrap}
.proveedores-container :deep(.detalle-list-modern){display:flex;flex-direction:column;gap:.15rem}.proveedores-container :deep(.detalle-header-modern){display:flex;gap:.4rem;font-size:.58rem;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;padding:0 .3rem}.proveedores-container :deep(.detalle-header-modern span:nth-child(1)){flex:2}.proveedores-container :deep(.detalle-header-modern span:nth-child(2)){width:80px}.proveedores-container :deep(.detalle-header-modern span:nth-child(3)){width:50px}.proveedores-container :deep(.detalle-header-modern span:nth-child(4)){width:70px}
.proveedores-container :deep(.detalle-row-modern){display:flex;align-items:center;gap:.3rem;padding:.25rem .3rem;background:var(--color-bg-primary);border-radius:6px;box-shadow:inset 1px 1px 2px rgba(0,0,0,.03)}.proveedores-container :deep(.detalle-product-cell){flex:2;min-width:0}.proveedores-container :deep(.detalle-product-name){display:block;font-size:.7rem;font-weight:600;color:var(--color-text-primary)}.proveedores-container :deep(.detalle-barcode){font-size:.55rem;color:var(--color-text-secondary)}.proveedores-container :deep(.detalle-price-cell){width:80px}.proveedores-container :deep(.price-comparison){display:flex;flex-direction:column;gap:1px}.proveedores-container :deep(.price-current){font-size:.55rem;color:var(--color-text-secondary)}.proveedores-container :deep(.input-price-small){width:100%;padding:.15rem .25rem;font-size:.62rem;text-align:right}.proveedores-container :deep(.price-changed){box-shadow:inset 2px 2px 3px rgba(0,0,0,.08),0 0 0 1px var(--color-warning)}.proveedores-container :deep(.input-qty-small){width:50px;padding:.15rem;font-size:.65rem;text-align:center}.proveedores-container :deep(.detalle-subtotal-cell){width:70px;text-align:right;font-size:.7rem;font-weight:700;color:var(--color-success)}.proveedores-container :deep(.btn-remove-modern){width:22px;height:22px;border:none;border-radius:4px;background:transparent;color:var(--color-error);cursor:pointer;font-size:.7rem;flex-shrink:0}.proveedores-container :deep(.btn-remove-modern:hover){background:var(--color-error);color:#fff}.proveedores-container :deep(.detalle-total-modern){display:flex;justify-content:space-between;align-items:center;padding:.4rem .3rem;margin-top:.2rem;border-top:1px solid var(--color-border);font-size:.72rem;color:var(--color-text-secondary)}.proveedores-container :deep(.total-amount){font-size:1rem;color:var(--color-success);font-weight:900}

@media(max-width:768px){.proveedores-container :deep(.pedidos-grid){grid-template-columns:1fr}.proveedores-container :deep(.proveedores-grid){grid-template-columns:1fr}.proveedores-container :deep(.add-product-row){flex-wrap:wrap}.proveedores-container :deep(.form-row){flex-direction:column}}
@media(max-width:480px){.proveedores-container :deep(.tab-bar){overflow-x:auto}.proveedores-container :deep(.tab-btn){padding:.45rem .6rem;font-size:.68rem;white-space:nowrap}.proveedores-container :deep(.content-toolbar){flex-direction:column;align-items:stretch}}
</style>
