<script setup lang="ts">
import { formatoMoneda } from '../logica/usePosTicket';

defineProps<{
  open: boolean;
  ventaPendienteSeleccionada: any;
  agregarPendienteBusqueda: string;
  agregarPendienteScannerActivo: boolean;
  productosFiltradosBusqueda: any[];
  agregarPendienteProductos: any[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:agregarPendienteBusqueda', val: string): void;
  (e: 'buscar-y-agregar'): void;
  (e: 'start-scanner-pendiente'): void;
  (e: 'agregar-producto', prod: any): void;
  (e: 'quitar-producto', idx: number): void;
  (e: 'confirmar-agregar'): void;
}>();
</script>

<template>
  <div v-if="open" class="pos-modal-overlay" @click.self="emit('close')">
    <div class="pos-modal-card modal-agregar-pendiente animate-pop-in">
      <header class="modal-header-clean">
        <h3>Agregar a Ticket #{{ ventaPendienteSeleccionada?.numeroTicket }}</h3>
        <button class="close-x" @click="emit('close')">×</button>
      </header>
      <div class="modal-body-clean custom-scrollbar">
        <div class="agregar-pendiente-search">
          <input ref="agregarPendienteInput" :value="agregarPendienteBusqueda" type="text" placeholder="Buscar o escanear producto..." @keyup.enter="emit('buscar-y-agregar')" @input="emit('update:agregarPendienteBusqueda', ($event.target as HTMLInputElement).value)">
          <button class="btn-scanner-mini" @click="emit('start-scanner-pendiente')" :class="{ active: agregarPendienteScannerActivo }">📷</button>
        </div>
        <div v-if="agregarPendienteScannerActivo" class="scanner-mini-viewport">
          <div id="scanner-interactive-pendiente"></div>
        </div>
        <div class="agregar-pendiente-results">
          <div v-for="prod in productosFiltradosBusqueda" :key="prod.idProducto" class="result-item" @click="emit('agregar-producto', prod)">
            <span class="result-name">{{ prod.nombre }}</span>
            <span class="result-price">{{ formatoMoneda(prod.precio ?? 0) }}</span>
          </div>
        </div>
        <div v-if="agregarPendienteProductos.length > 0" class="agregar-pendiente-ticket">
          <h4>Productos a agregar</h4>
          <div v-for="(p, idx) in agregarPendienteProductos" :key="idx" class="ticket-item">
            <span class="ticket-item-name">{{ p.productoNombre }}</span>
            <span class="ticket-item-qty">{{ p.isGramaje ? p.cantidad + 'g = ' + formatoMoneda(Number(p.precioUnitarioVenta)) : p.cantidad + ' × ' + formatoMoneda(Number(p.precioUnitarioVenta)) }}</span>
            <button class="btn-remove-mini" @click="emit('quitar-producto', idx)">✕</button>
          </div>
          <div class="ticket-total">
            <span>Total:</span>
            <strong>{{ formatoMoneda(agregarPendienteProductos.reduce((s: number, p: any) => s + (p.isGramaje ? Number(p.precioUnitarioVenta) : Number(p.precioUnitarioVenta) * p.cantidad), 0)) }}</strong>
          </div>
          <button class="btn-confirmar-agregar" @click="emit('confirmar-agregar')">Confirmar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pos-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);backdrop-filter:blur(6px);z-index:200;display:grid;place-items:center;padding:1rem}
.pos-modal-card{background:var(--color-bg-panel);border-radius:var(--radius-lg);width:min(100%,480px);max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:8px 8px 24px rgba(0,0,0,0.35),-4px -4px 16px rgba(255,255,255,0.03)}
.modal-header-clean{display:flex;align-items:center;justify-content:space-between;padding:.85rem 1.25rem;background:var(--color-bg-secondary);border-radius:var(--radius-lg) var(--radius-lg) 0 0}
.modal-header-clean h3{margin:0;font-size:.95rem;color:var(--color-accent);font-weight:700}
.close-x{width:30px;height:30px;border:none;border-radius:50%;background:var(--color-bg-primary);color:var(--color-text-secondary);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.close-x:hover{background:var(--color-error);color:#fff}
.modal-body-clean{padding:1rem 1.25rem;overflow-y:auto;flex:1;min-height:0}
.agregar-pendiente-search{display:flex;gap:.4rem;margin-bottom:.6rem}
.agregar-pendiente-search input{flex:1;padding:.55rem .7rem;border:none;border-radius:var(--radius-sm);background:var(--color-bg-secondary);color:var(--color-text-primary);font-size:.9rem;outline:none;box-shadow:inset 2px 2px 4px rgba(0,0,0,0.15)}
.agregar-pendiente-search input:focus{box-shadow:inset 2px 2px 4px rgba(0,0,0,0.15),0 0 0 2px var(--color-accent)}
.btn-scanner-mini{width:40px;height:40px;border:none;border-radius:var(--radius-sm);background:var(--color-bg-secondary);color:var(--color-text-secondary);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s;flex-shrink:0}
.btn-scanner-mini:hover{color:var(--color-accent)}
.btn-scanner-mini.active{background:var(--color-accent);color:var(--color-on-brand)}
.scanner-mini-viewport{width:100%;height:180px;border-radius:var(--radius-sm);overflow:hidden;margin-bottom:.6rem;background:var(--color-bg-secondary)}
.agregar-pendiente-results{display:flex;flex-direction:column;gap:.2rem;max-height:180px;overflow-y:auto;margin-bottom:.6rem}
.result-item{display:flex;justify-content:space-between;align-items:center;padding:.45rem .65rem;border-radius:var(--radius-sm);cursor:pointer;background:var(--color-bg-secondary);font-size:.85rem;transition:all .1s}
.result-item:hover{background:color-mix(in srgb,var(--color-accent) 10%,var(--color-bg-secondary))}
.result-name{flex:1;color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:.5rem}
.result-price{font-size:.85rem;font-weight:600;color:var(--color-success)}
.agregar-pendiente-ticket{border-top:1px solid var(--color-border);padding-top:.75rem}
.agregar-pendiente-ticket h4{font-size:.8rem;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;margin:0 0 .4rem}
.ticket-item{display:flex;align-items:center;gap:.4rem;padding:.35rem 0;font-size:.82rem}
.ticket-item-name{flex:1;color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ticket-item-qty{color:var(--color-text-secondary);font-size:.78rem}
.btn-remove-mini{width:24px;height:24px;border:none;border-radius:4px;background:transparent;color:var(--color-error);font-size:.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .1s}
.btn-remove-mini:hover{background:color-mix(in srgb,var(--color-error) 15%,transparent)}
.ticket-total{display:flex;justify-content:space-between;padding:.4rem 0;margin-top:.4rem;border-top:1px solid var(--color-border);font-size:.85rem;color:var(--color-text-primary)}
.ticket-total strong{color:var(--color-success);font-size:.95rem}
.btn-confirmar-agregar{width:100%;padding:.65rem;margin-top:.6rem;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--color-accent),var(--color-accent-hover));color:var(--color-on-brand);font-weight:600;font-size:.9rem;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,0.15);transition:all .15s}
.btn-confirmar-agregar:hover{box-shadow:5px 5px 10px rgba(0,0,0,0.2);transform:translateY(-1px)}
.btn-confirmar-agregar:active{transform:scale(.98)}
@media(max-width:480px){.pos-modal-card{width:100%;border-radius:var(--radius-md)}.modal-body-clean{padding:.75rem 1rem}}
</style>

