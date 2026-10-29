<script setup lang="ts">

defineProps<{
  scannerActivo: boolean;
}>();

const emit = defineEmits<{
  (e: 'stop-scanner'): void;
}>();
</script>

<template>
  <div v-if="scannerActivo" class="scanner-full-overlay">
    <div class="scanner-frame">
      <div id="scanner-interactive"></div>
      <div class="scan-laser"></div>
      <button class="btn-stop-scan" @click="emit('stop-scanner')">⏹️ Detener</button>
    </div>
  </div>
</template>


<style scoped>
.scanner-full-overlay, .pos-modal-overlay, .pos-modal-card, .modal-agregar-pendiente{--perg-bg:var(--color-bg-primary);--perg-bg-panel:var(--color-bg-panel);--perg-text:var(--color-text-primary);--perg-text-secondary:var(--color-text-secondary);--perg-title:var(--color-accent);--perg-border:var(--color-border);--perg-accent:var(--color-accent);--perg-shadow:var(--color-shadow);--perg-success:var(--color-success);--perg-error:var(--color-error);--perg-warning:var(--color-warning);--perg-price:var(--color-success)}


/* =========================================
   ESTILOS PARA EDICIÃ“N DE DETALLE DE VENTA
   ========================================= */
.pos-container .pos-modal-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.pos-container .btn-editar {
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  border: 2px solid var(--perg-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: linear-gradient(180deg, var(--perg-accent) 0%, color-mix(in srgb, var(--perg-accent) 70%, black) 100%);
  color: var(--perg-text);
}

.pos-container .btn-warning {
  background: linear-gradient(180deg, var(--perg-error) 0%, color-mix(in srgb, var(--perg-error) 70%, black) 100%);
  color: var(--perg-text);
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  border: 2px solid color-mix(in srgb, var(--perg-error) 70%, black);
  border-radius: 6px;
  cursor: help;
}

.pos-container .btn-editar:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.pos-container .d-item .editable {
  cursor: pointer;
  border-bottom: 1px dashed var(--perg-accent);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.pos-container .d-item .editable:hover {
  background: color-mix(in srgb, var(--perg-accent) 20%, transparent);
}

.pos-container .edit-input {
  width: 60px;
  padding: 0.25rem;
  font-size: 0.75rem;
  border: 2px solid var(--perg-accent);
  border-radius: 4px;
  background: var(--perg-bg);
  color: var(--perg-text);
  text-align: center;
  font-family: 'Courier New', monospace;
}

.pos-container .edit-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--perg-accent) 40%, transparent);
}

.pos-container .btn-confirm, .pos-container .btn-cancel, .pos-container .btn-edit-item {
  padding: 0.2rem 0.4rem;
  font-size: 0.8rem;
  border: 1px solid var(--perg-border);
  border-radius: 4px;
  cursor: pointer;
  background: var(--perg-bg-panel);
  transition: all 0.2s;
}

.pos-container .btn-confirm {
  background: var(--perg-success);
  color: var(--perg-text);
  border-color: var(--perg-success);
}

.pos-container .btn-confirm:hover {
  filter: brightness(1.1);
}

.pos-container .btn-cancel {
  background: var(--perg-error);
  color: var(--perg-text);
  border-color: var(--perg-error);
}

.pos-container .btn-cancel:hover {
  filter: brightness(1.1);
}

.pos-container .btn-edit-item {
  font-size: 0.7rem;
  padding: 0.15rem 0.3rem;
}

.pos-container .btn-edit-item:hover {
  background: color-mix(in srgb, var(--perg-accent) 30%, transparent);
  transform: scale(1.1);
}

.pos-container .d-actions {
  display: flex;
  gap: 0.3rem;
  align-items: center;
}

.pos-container .btn-delete-item {
  font-size: 0.7rem;
  padding: 0.15rem 0.3rem;
  background: transparent;
  border: 1px solid var(--perg-error);
  color: var(--perg-error);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.pos-container .btn-delete-item:hover {
  background: var(--perg-error);
  color: var(--perg-text);
  transform: scale(1.1);
}

.pos-container .btn-eliminar-todos {
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  background: linear-gradient(180deg, var(--perg-error) 0%, color-mix(in srgb, var(--perg-error) 70%, black) 100%);
  color: var(--perg-text);
  border: 2px solid var(--perg-error);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pos-container .btn-eliminar-todos:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--perg-error) 40%, transparent);
}

.pos-container .items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0;
}

.pos-container .txt-pos.editing {
  color: var(--perg-success);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.pos-container .total-edit-wrapper {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.pos-container .currency-prefix {
  font-size: 0.9rem;
  color: var(--perg-success);
  font-weight: bold;
}

.pos-container .total-input {
  width: 80px;
  padding: 0.25rem 0.4rem;
  font-size: 0.9rem;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  border: 2px solid var(--perg-border);
  border-radius: 6px;
  background: var(--perg-bg);
  color: var(--perg-success);
  text-align: left;
  transition: all 0.2s;
}

.pos-container .total-input:focus {
  outline: none;
  border-color: var(--perg-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--perg-accent) 40%, transparent);
}

.pos-container .total-input.manual-edited {
  border-color: var(--perg-success);
  background: color-mix(in srgb, var(--perg-success) 10%, var(--perg-bg));
}

.pos-container .edit-indicator {
  font-size: 0.8rem;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.pos-container .ticket-items-list {
  position: relative;
}

.pos-container .zelda-sprites-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  overflow: hidden;
}

.pos-container .link-sprite {
  position: absolute;
  bottom: 8%;
  width: 90px;
  height: 65px;
  animation: linkWalk 12s linear infinite;
  opacity: 0;
  animation-fill-mode: forwards;
  animation-delay: 3s;
}

.pos-container .link-frame {
  position: absolute;
  inset: 0;
  image-rendering: pixelated;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  animation: linkSwing 0.8s steps(1) infinite;
}

.pos-container .frame1 {
  background-image: url('@/assets/img/1.png');
  background-size: 90px 65px;
}

.pos-container .frame2 {
  background-image: url('@/assets/img/2.png');
  background-size: 50px 65px;
  animation: linkSwing2 0.8s steps(1) infinite;
}

.pos-container .octo-sprite {
  position: absolute;
  bottom: 8%;
  left: -50px;
  width: 50px;
  height: 50px;
  animation: octoWalk 12s linear infinite;
}

.pos-container .octo-frame {
  position: absolute;
  inset: 0;
  image-rendering: pixelated;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  animation: octoSwing 0.6s steps(1) infinite;
}

.pos-container .octo-sprite .frame1 {
  background-image: url('@/assets/img/octo1.png');
  background-size: 50px 50px;
}

.pos-container .octo-sprite .frame2 {
  background-image: url('@/assets/img/octo2.png');
  background-size: 50px 50px;
  animation: octoSwing2 0.6s steps(1) infinite;
}

@media (max-width: 768px) {
  .pos-container .link-sprite {
    animation-delay: 5s;
  }
}

/* PROVEEDORES Y PEDIDOS MODAL */
.pos-container .proveedores-pedidos-modal {
  max-width: 960px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.pos-container .pp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--perg-border);
}

.pos-container .pp-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--perg-title) !important;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  text-shadow: 1px 1px 2px rgba(40, 20, 10, 0.3) !important;
}

.pos-container .pp-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--perg-border);
}

.pos-container .pp-tab {
  flex: 1;
  padding: 0.5rem;
  border: 2px solid var(--perg-border);
  border-radius: 8px;
  background: var(--perg-bg-panel);
  color: var(--perg-text-secondary);
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'HyliaSerif', 'Palatino Linotype', 'Book Antiqua', Palatino, 'Courier New', serif;
}

.pos-container .pp-tab.active {
  background: var(--perg-accent);
  color: var(--perg-bg);
  border-color: var(--perg-accent);
}

.pos-container .pp-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
  position: relative;
}

.pos-container .pp-section {
  min-height: 200px;
}

.pos-container .pp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.pos-container .pp-views {
  display: flex;
  background: var(--perg-bg-panel);
  border: 1px solid var(--perg-border);
  border-radius: 6px;
  overflow: hidden;
}

.pos-container .pp-vbtn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--perg-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.8rem;
  line-height: 1;
}

.pos-container .pp-vbtn.on { background: var(--perg-accent); color: var(--perg-bg); }
.pos-container .pp-vbtn:hover:not(.on) { background: var(--perg-bg-panel); }

.pos-container .pp-btn-add {
  padding: 0.5rem 1rem;
  background: var(--perg-success);
  color: var(--perg-text);
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.85rem;
  font-family: 'HyliaSerif', 'Palatino Linotype', 'Book Antiqua', Palatino, 'Courier New', serif;
}

.pos-container .pp-empty {
  text-align: center;
  padding: 2rem;
  color: var(--perg-text-secondary);
  font-style: italic;
}

.pos-container .pp-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pos-container .pp-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  background: var(--perg-bg-panel);
  border: 1px solid var(--perg-border);
  border-radius: 10px;
}

.pos-container .pp-item-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--perg-accent), color-mix(in srgb, var(--perg-accent) 70%, black));
  color: var(--perg-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1rem;
  flex-shrink: 0;
}

.pos-container .pp-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.pos-container .pp-item-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--perg-text);
}

.pos-container .pp-item-detail {
  font-size: 0.75rem;
  color: var(--perg-text-secondary);
}

.pos-container .pp-item-actions {
  display: flex;
  gap: 0.3rem;
}

.pos-container .pp-btn-sm {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--perg-border);
  border-radius: 6px;
  background: var(--perg-bg-panel);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.pos-container .pp-btn-sm:hover {
  transform: scale(1.1);
}

.pos-container .pp-btn-del:hover {
  border-color: var(--perg-error);
  background: color-mix(in srgb, var(--perg-error) 15%, var(--perg-bg-panel));
}

.pos-container .pp-btn-ok:hover {
  border-color: var(--perg-success);
  background: color-mix(in srgb, var(--perg-success) 15%, var(--perg-bg-panel));
}

.pos-container .pp-pedido {
  flex-wrap: wrap;
}

.pos-container .pp-pedido-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.pos-container .pp-pedido-prov {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--perg-text);
}

.pos-container .pp-pedido-date {
  font-size: 0.75rem;
  color: var(--perg-text-secondary);
}

.pos-container .pp-pedido-total {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--perg-price);
  font-family: monospace;
}

/* GRID */
.pos-container .pp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.6rem;
}

.pos-container .pp-card {
  position: relative;
  background: var(--perg-bg-panel);
  border: 1px solid var(--perg-border);
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  transition: all 0.2s;
}

.pos-container .pp-card:hover {
  border-color: color-mix(in srgb, var(--perg-accent) 25%, transparent);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--perg-shadow) 40%, transparent);
}

.pos-container .pp-card-avatar {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--perg-accent), color-mix(in srgb, var(--perg-accent) 70%, black));
  color: var(--perg-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.2rem;
  align-self: center;
}

.pos-container .pp-card-name {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--perg-text);
  text-align: center;
  line-height: 1.2;
  min-height: 1.2em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pos-container .pp-card-details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.3rem;
  background: var(--perg-bg-panel);
  border-radius: 6px;
}

.pos-container .pp-card-detail {
  font-size: 0.7rem;
  color: var(--perg-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pos-container .pp-card-actions {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.1rem;
}

.pos-container .pp-card-btn {
  flex: 1;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--perg-border);
  border-radius: 6px;
  background: var(--perg-bg-panel);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
  font-family: 'HyliaSerif', 'Palatino Linotype', 'Book Antiqua', Palatino, 'Courier New', serif;
}

.pos-container .pp-card-btn:hover {
  transform: scale(1.05);
}

.pos-container .pp-card-btn-del:hover {
  border-color: var(--perg-error);
  background: color-mix(in srgb, var(--perg-error) 15%, var(--perg-bg-panel));
}

.pos-container .pp-card-btn-ok:hover {
  border-color: var(--perg-success);
  background: color-mix(in srgb, var(--perg-success) 15%, var(--perg-bg-panel));
}

/* Pedido cards */
.pos-container .pp-pedido-card .pp-pedido-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pos-container .pp-pedido-card-prov {
  font-weight: 700;
  font-size: 0.8rem;
  color: var(--perg-text);
}

.pos-container .pp-pedido-card-total {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--perg-price);
  font-family: monospace;
}

.pos-container .pp-pedido-card-details {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.pos-container .pp-pedido-card-date, .pos-container .pp-pedido-card-apartado {
  font-size: 0.7rem;
  color: var(--perg-text-secondary);
}

.pos-container .pp-pedido-card-actions {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.1rem;
}

/* SUGERIDO */
.pos-container .pp-section-sugerido {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pos-container .sugerido-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  width: 100%;
}

.pos-container .pp-select-periodo {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: var(--perg-bg-panel);
  border: 1px solid var(--perg-border);
  border-radius: 8px;
  color: var(--perg-text);
  font-size: 0.85rem;
}

.pos-container .sugerido-loading {
  text-align: center;
  padding: 2rem;
  color: var(--perg-accent);
  text-shadow: 0 0 4px rgba(40, 20, 10, 0.35);
  animation: pulse-sugerido 1.5s ease-in-out infinite;
}

@keyframes pulse-sugerido {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.pos-container .sugerido-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--perg-bg-panel);
  border-radius: 8px;
  font-size: 0.8rem;
  color: var(--perg-text-secondary);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pos-container .sugerido-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.pos-container .pp-btn-crear-pedido {
  background: var(--perg-accent);
  color: var(--perg-bg);
  padding: 0.4rem 0.75rem;
  width: auto;
  height: auto;
  font-size: 0.8rem;
  border-radius: 6px;
}

.pos-container .pp-btn-crear-pedido:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pos-container .sugerido-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 450px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.pos-container .sugerido-card {
  background: var(--perg-bg-panel);
  border: 2px solid var(--perg-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.pos-container .sugerido-card:hover {
  border-color: var(--perg-accent);
  box-shadow: 0 2px 12px color-mix(in srgb, var(--perg-accent) 15%, transparent);
}

.pos-container .sugerido-card.selected {
  border-color: var(--perg-accent);
  background: color-mix(in srgb, var(--perg-accent) 8%, var(--perg-bg-panel));
}

.pos-container .sugerido-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--perg-border);
}

.pos-container .sugerido-card-check {
  flex-shrink: 0;
}

.pos-container .check-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 2px solid var(--perg-border);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: transparent;
  transition: all 0.15s;
}

.pos-container .sugerido-card.selected .check-box {
  background: var(--perg-accent);
  border-color: var(--perg-accent);
  color: var(--perg-bg);
}

.pos-container .sugerido-card-title {
  flex: 1;
  min-width: 0;
}

.pos-container .sugerido-card-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--perg-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pos-container .sugerido-card-badges {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.25rem;
  flex-wrap: wrap;
}

.pos-container .pos-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pos-container .badge-cat {
  background: color-mix(in srgb, var(--perg-accent) 15%, transparent);
  color: var(--perg-accent);
  text-shadow: 0 0 4px rgba(40, 20, 10, 0.35);
}

.pos-container .badge-sub {
  background: color-mix(in srgb, var(--perg-accent) 15%, transparent);
  color: color-mix(in srgb, var(--perg-accent) 60%, var(--perg-bg));
  text-shadow: 0 0 3px rgba(40, 20, 10, 0.3);
}

.pos-container .badge-gramaje {
  background: color-mix(in srgb, var(--perg-success) 15%, transparent);
  color: color-mix(in srgb, var(--perg-success) 60%, var(--perg-bg));
}

.pos-container .sugerido-card-alert {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
  padding: 0.3rem 0.6rem;
  background: color-mix(in srgb, var(--perg-error) 12%, transparent);
  border-radius: 6px;
}

.pos-container .alert-icon {
  font-size: 0.85rem;
}

.pos-container .alert-text {
  font-size: 0.7rem;
  color: var(--perg-error);
  font-weight: 600;
  white-space: nowrap;
}

.pos-container .sugerido-card-body {
  padding: 0.75rem 1rem;
}

.pos-container .info-group {
  margin-bottom: 0.5rem;
}

.pos-container .info-group:last-child {
  margin-bottom: 0;
}

.pos-container .info-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--perg-text-secondary);
  font-weight: 700;
  margin-bottom: 0.4rem;
}

.pos-container .info-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.pos-container .info-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 80px;
}

.pos-container .info-item-label {
  font-size: 0.65rem;
  color: var(--perg-text-secondary);
}

.pos-container .info-item-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--perg-text);
  font-family: monospace;
}

.pos-container .info-item-value.highlight {
  color: var(--perg-accent);
  text-shadow: 0 0 4px rgba(40, 20, 10, 0.35);
}

.pos-container .info-item-value.critical {
  color: var(--perg-error);
}

.pos-container .info-item-value.low {
  color: var(--perg-warning);
  text-shadow: 0 0 4px rgba(40, 20, 10, 0.35);
}

.pos-container .info-divider {
  height: 1px;
  background: var(--perg-border);
  margin: 0.5rem 0;
}

.pos-container .suggestion-row {
  gap: 1.25rem;
}

.pos-container .suggestion-item {
  padding: 0.4rem 0.6rem;
  background: var(--perg-bg-panel);
  border-radius: 8px;
  flex: none;
}

.pos-container .suggest-qty {
  color: color-mix(in srgb, var(--perg-success) 60%, var(--perg-bg)) !important;
  font-size: 1rem !important;
}

.pos-container .suggest-cost {
  color: var(--perg-price) !important;
  font-size: 0.95rem !important;
}

.pos-container .sugerido-total-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--perg-bg-panel);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--perg-text);
  border: 1px solid var(--perg-border);
}

.pos-container .sugerido-total-bar strong {
  color: var(--perg-price);
  font-size: 1rem;
  font-family: monospace;
}

/* FORM OVERLAY */
.pos-container .pp-form-overlay {
  position: absolute;
  inset: 0;
  background: var(--perg-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 10;
  border-radius: 16px;
}

.pos-container .pp-form-card {
  width: 100%;
  max-width: 400px;
  background: var(--perg-bg-panel);
  border: 1px solid var(--perg-border);
  border-radius: 12px;
  padding: 1.25rem;
}

.pos-container .pp-form-card h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

.pos-container .pp-form-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pos-container .pp-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.pos-container .pp-field-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--perg-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pos-container .pp-input {
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--perg-border);
  border-radius: 8px;
  background: var(--perg-bg);
  color: var(--perg-text);
  font-size: 0.85rem;
}

.pos-container .pp-input:focus {
  outline: none;
  border-color: var(--perg-accent);
}

.pos-container .pp-textarea {
  resize: vertical;
  min-height: 60px;
}

.pos-container .pp-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--perg-text-secondary);
  cursor: pointer;
}

.pos-container .pp-form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: flex-end;
}

.pos-container .pp-btn-cancel {
  padding: 0.5rem 1rem;
  border: 1px solid var(--perg-border);
  border-radius: 8px;
  background: var(--perg-bg-panel);
  color: var(--perg-text);
  cursor: pointer;
  font-weight: 600;
  font-family: 'HyliaSerif', 'Palatino Linotype', 'Book Antiqua', Palatino, 'Courier New', serif;
}

.pos-container .pp-btn-save {
  padding: 0.5rem 1.2rem;
  background: var(--perg-accent);
  color: var(--perg-bg);
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'HyliaSerif', 'Palatino Linotype', 'Book Antiqua', Palatino, 'Courier New', serif;
}

.pos-container .pp-form-card-pedido {
  max-width: 500px;
}

.pos-container .pp-product-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--perg-border);
}

.pos-container .pp-product-section h5 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: var(--perg-text);
}

.pos-container .pp-product-search-wrap {
  display: flex;
  gap: 0.4rem;
  align-items: flex-start;
}

.pos-container .pp-search-wrapper {
  flex: 1;
  position: relative;
}

.pos-container .pp-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: var(--perg-bg);
  border: 1px solid var(--perg-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--perg-shadow) 30%, transparent);
  z-index: 100;
  margin-top: 4px;
}

.pos-container .pp-dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--perg-border);
  transition: background 0.15s;
}

.pos-container .pp-dropdown-item:last-child {
  border-bottom: none;
}

.pos-container .pp-dropdown-item:hover {
  background: var(--perg-bg-panel);
}

.pos-container .pp-dropdown-name {
  font-weight: 500;
  font-size: 0.8rem;
  color: var(--perg-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pos-container .pp-dropdown-price {
  font-size: 0.8rem;
  color: var(--perg-price);
  font-weight: 600;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.pos-container .pp-qty {
  width: 55px;
  text-align: center;
}

.pos-container .pp-price {
  width: 70px;
  text-align: center;
}

.pos-container .pp-btn-add-prod {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--perg-success);
  color: var(--perg-text);
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  flex-shrink: 0;
}

.pos-container .pp-detalle-list {
  margin-top: 0.75rem;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--perg-border);
  border-radius: 8px;
}

.pos-container .pp-detalle-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--perg-border);
  font-size: 0.8rem;
}

.pos-container .pp-detalle-row:last-child {
  border-bottom: none;
}

.pos-container .pp-detalle-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.pos-container .pp-detalle-qty {
  color: var(--perg-text-secondary);
  flex-shrink: 0;
}

.pos-container .pp-detalle-sub {
  font-weight: 700;
  color: var(--perg-price);
  font-family: monospace;
  flex-shrink: 0;
}

.pos-container .pp-btn-remove {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--perg-error);
  border-radius: 4px;
  background: transparent;
  color: var(--perg-error);
  cursor: pointer;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.pos-container .pp-btn-remove:hover {
  background: var(--perg-error);
  color: var(--perg-text);
}

.pos-container .pp-detalle-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.6rem;
  background: var(--perg-bg-panel);
  border-radius: 0 0 8px 8px;
  font-size: 0.85rem;
}

.pos-container .pp-detalle-total strong {
  color: var(--perg-price);
  font-family: monospace;
  font-size: 1rem;
}

@media (max-width: 768px) {
  .pos-container .proveedores-pedidos-modal {
    max-width: 100%;
    max-height: 95vh;
  }
}
</style>
