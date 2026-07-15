<script setup lang="ts">
import { formatoMoneda } from '../logica/usePosTicket';

defineProps<{
  open: boolean;
  ventasPendientes: any[];
  ventasPendientesAgrupadas: any[];
  vpVistaLista: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:vpVistaLista', val: boolean): void;
  (e: 'cobrar', venta: any): void;
  (e: 'editar-descripcion', venta: any): void;
  (e: 'eliminar', venta: any): void;
  (e: 'agregar-productos', venta: any): void;
}>();
</script>

<template>
  <div v-if="open" class="pos-modal-overlay" @click.self="emit('close')">
    <div class="pos-modal-card modal-pendientes animate-pop-in">
      <header class="vp-modal-head">
        <div class="vp-head-left">
          <h3 class="vp-title">📋 Ventas Pendientes</h3>
          <span class="vp-count" v-if="ventasPendientes.length > 0">{{ ventasPendientes.length }} ticket{{ ventasPendientes.length > 1 ? 's' : '' }}</span>
        </div>
        <div class="vp-head-right">
          <div class="vp-views">
            <button :class="['vp-vbtn', { on: vpVistaLista }]" @click="emit('update:vpVistaLista', true)" title="Lista">📋</button>
            <button :class="['vp-vbtn', { on: !vpVistaLista }]" @click="emit('update:vpVistaLista', false)" title="Cuadrícula">🔲</button>
          </div>
          <button class="vp-close" @click="emit('close')">✕</button>
        </div>
      </header>
      <div class="vp-modal-body custom-scrollbar">
        <div v-if="ventasPendientes.length === 0" class="vp-empty">
          <span class="vp-empty-ico">✅</span>
          <p class="vp-empty-text">No hay ventas pendientes</p>
        </div>
        <!-- VISTA LISTA -->
        <div v-else-if="vpVistaLista" class="vp-list">
          <div v-for="v in ventasPendientesAgrupadas" :key="v.idVenta" class="vp-list-row">
            <div class="vp-list-main" @click="emit('cobrar', v)">
              <div class="vp-list-left">
                <span class="vp-list-badge">#{{ v.numeroTicket }}</span>
                <span class="vp-list-time">{{ v.fechaVenta?.slice(11, 16) }}</span>
                <span class="vp-list-user">👤 {{ v.nombreUsuario }}</span>
              </div>
              <span class="vp-list-amount">{{ formatoMoneda(Number(v.montoTotal)) }}</span>
            </div>
            <div v-if="v.descripcionPendiente" class="vp-list-desc">
              <span class="vp-list-desc-ico">📝</span>
              <span class="vp-list-desc-text">{{ v.descripcionPendiente }}</span>
              <button class="vp-list-edit-desc" @click.stop="emit('editar-descripcion', v)" title="Editar">✏️</button>
            </div>
            <div v-if="v.detallesAgrupados && v.detallesAgrupados.length > 0" class="vp-list-details">
              <div v-for="(d, i) in v.detallesAgrupados" :key="i" class="vp-list-detail-row">
                <span class="vp-list-detail-qty">{{ d.cantidad }}{{ d.isGramaje ? 'g' : 'pz' }}</span>
                <span class="vp-list-detail-name">{{ d.productoNombre }}</span>
                <span class="vp-list-detail-price">{{ formatoMoneda(Number(d.precioUnitarioVenta)) }}</span>
              </div>
            </div>
            <div class="vp-list-actions">
              <button class="vp-list-btn-del" @click.stop="emit('eliminar', v)" title="Eliminar">🗑️</button>
              <button class="vp-list-btn-add" @click.stop="emit('agregar-productos', v)" title="Agregar productos">➕</button>
              <button class="vp-list-btn-cobrar" @click.stop="emit('cobrar', v)">💰 Cobrar</button>
            </div>
          </div>
        </div>
        <!-- VISTA GRID -->
        <div v-else class="vp-grid">
          <article v-for="v in ventasPendientesAgrupadas" :key="v.idVenta" class="vp-card">
            <div class="vp-card-head">
              <div class="vp-ticket-box">
                <span class="vp-ticket-badge">#{{ v.numeroTicket }}</span>
                <span class="vp-time">{{ v.fechaVenta?.slice(11, 16) }}</span>
              </div>
              <span class="vp-amount">{{ formatoMoneda(Number(v.montoTotal)) }}</span>
            </div>
            <div class="vp-card-user">
              <span class="vp-user-ico">👤</span>
              <span class="vp-user-name">{{ v.nombreUsuario }}</span>
            </div>
            <div v-if="v.descripcionPendiente" class="vp-desc">
              <span class="vp-desc-ico">📝</span>
              <span class="vp-desc-text">{{ v.descripcionPendiente }}</span>
              <button class="vp-edit-desc" @click.stop="emit('editar-descripcion', v)" title="Editar">✏️</button>
            </div>
            <div v-if="v.detallesAgrupados && v.detallesAgrupados.length > 0" class="vp-details">
              <div v-for="(d, i) in v.detallesAgrupados" :key="i" class="vp-detail-row">
                <span class="vp-detail-qty">{{ d.cantidad }}{{ d.isGramaje ? 'g' : 'pz' }}</span>
                <span class="vp-detail-name">{{ d.productoNombre }}</span>
                <span class="vp-detail-price">{{ formatoMoneda(Number(d.precioUnitarioVenta)) }}</span>
              </div>
            </div>
            <div class="vp-actions">
              <button class="vp-btn-del" @click.stop="emit('eliminar', v)" title="Eliminar">🗑️</button>
              <button class="vp-btn-add" @click.stop="emit('agregar-productos', v)" title="Agregar productos">➕</button>
              <button class="vp-btn-cobrar" @click.stop="emit('cobrar', v)">💰 Cobrar</button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.pos-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);backdrop-filter:blur(6px);z-index: 200;display:grid;place-items:center;padding:1rem}
.pos-modal-card{background:var(--color-bg-panel);border-radius:var(--radius-lg);width:min(100%,560px);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:8px 8px 24px rgba(0,0,0,0.35),-4px -4px 16px rgba(255,255,255,0.03)}
.vp-modal-head{display:flex;align-items:center;justify-content:space-between;padding:.85rem 1.25rem;background:var(--color-bg-secondary);border-radius:var(--radius-lg) var(--radius-lg) 0 0}
.vp-head-left{display:flex;align-items:center;gap:.6rem}
.vp-title{font-size:1rem;font-weight:700;color:var(--color-accent);margin:0}
.vp-count{font-size:.7rem;color:var(--color-text-secondary);background:var(--color-bg-primary);padding:.1rem .45rem;border-radius:10px}
.vp-head-right{display:flex;align-items:center;gap:.5rem}
.vp-views{display:flex;background:var(--color-bg-primary);border-radius:6px;overflow:hidden;box-shadow:inset 2px 2px 4px rgba(0,0,0,0.1)}
.vp-vbtn{width:28px;height:28px;border:none;background:transparent;color:var(--color-text-secondary);cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center;transition:all .15s}
.vp-vbtn.on{background:var(--color-accent);color:var(--color-on-brand)}
.vp-vbtn:hover:not(.on){color:var(--color-text-primary)}
.vp-close{width:30px;height:30px;border:none;border-radius:50%;background:var(--color-bg-primary);color:var(--color-text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.9rem;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.vp-close:hover{background:var(--color-error);color:#fff}
.vp-modal-body{padding:1rem;overflow-y:auto;flex:1;min-height:0}
.vp-empty{text-align:center;padding:2rem 1rem;color:var(--color-text-secondary)}
.vp-empty-ico{font-size:2rem;display:block;margin-bottom:.5rem}
.vp-list{display:flex;flex-direction:column;gap:.5rem}
.vp-list-row{background:var(--color-bg-secondary);border-radius:var(--radius-sm);padding:.65rem .75rem;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.vp-list-row:hover{box-shadow:4px 4px 8px rgba(0,0,0,0.15);transform:translateY(-1px)}
.vp-list-main{display:flex;align-items:center;justify-content:space-between;cursor:pointer}
.vp-list-left{display:flex;align-items:center;gap:.5rem}
.vp-list-badge{font-weight:700;font-size:.8rem;color:var(--color-accent);background:color-mix(in srgb,var(--color-accent) 12%,transparent);padding:.12rem .4rem;border-radius:4px;font-family:Courier New,monospace}
.vp-list-time{font-size:.7rem;color:var(--color-text-secondary);font-family:Courier New,monospace}
.vp-list-user{font-size:.72rem;color:var(--color-text-secondary)}
.vp-list-amount{font-weight:700;font-size:.9rem;color:var(--color-text-primary);font-family:Courier New,monospace}
.vp-list-desc{display:flex;align-items:center;gap:.35rem;padding:.25rem .4rem;background:var(--color-bg-primary);border-radius:5px;margin-top:.25rem}
.vp-list-desc-text{flex:1;font-size:.72rem;color:var(--color-text-secondary);font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vp-list-edit-desc{width:22px;height:22px;border:none;border-radius:3px;background:transparent;cursor:pointer;font-size:.65rem;opacity:.5;transition:all .15s}
.vp-list-edit-desc:hover{opacity:1;background:color-mix(in srgb,var(--color-accent) 15%,transparent)}
.vp-list-details{display:flex;flex-direction:column;gap:.12rem;max-height:70px;overflow-y:auto;padding:.1rem;margin-top:.2rem}
.vp-list-detail-row{display:flex;align-items:center;gap:.3rem;padding:.18rem .3rem;font-size:.7rem;border-radius:3px;background:var(--color-bg-primary)}
.vp-list-detail-qty{background:var(--color-accent);color:var(--color-on-brand);padding:.06rem .22rem;border-radius:3px;font-size:.6rem;font-weight:600;min-width:28px;text-align:center;font-family:Courier New,monospace}
.vp-list-detail-name{flex:1;color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vp-list-detail-price{color:var(--color-success);font-weight:600;font-size:.65rem;font-family:Courier New,monospace}
.vp-list-actions{display:flex;gap:.35rem;margin-top:.15rem}
.vp-list-btn-del,.vp-list-btn-add{width:32px;height:32px;border:none;border-radius:var(--radius-sm);background:var(--color-bg-primary);cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.vp-list-btn-del:hover{color:var(--color-error)}
.vp-list-btn-add:hover{color:var(--color-accent)}
.vp-list-btn-cobrar{flex:1;padding:.45rem;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--color-success),color-mix(in srgb,var(--color-success) 60%,black));color:#fff;font-weight:600;font-size:.78rem;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,0.15);transition:all .15s}
.vp-list-btn-cobrar:hover{box-shadow:5px 5px 10px rgba(0,0,0,0.2);transform:translateY(-1px)}
.vp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.6rem}
.vp-card{background:var(--color-bg-secondary);border-radius:var(--radius-sm);padding:.65rem;display:flex;flex-direction:column;gap:.35rem;width:100%;min-width:0;box-sizing:border-box;overflow:hidden;box-shadow:3px 3px 6px rgba(0,0,0,0.1),-1px -1px 3px rgba(255,255,255,0.02);transition:all .15s}
.vp-card:hover{box-shadow:5px 5px 10px rgba(0,0,0,0.15);transform:translateY(-2px)}
.vp-card-head{display:flex;align-items:center;justify-content:space-between}
.vp-ticket-box{display:flex;align-items:center;gap:.4rem}
.vp-ticket-badge{font-weight:700;font-size:.78rem;color:var(--color-accent);background:color-mix(in srgb,var(--color-accent) 12%,transparent);padding:.1rem .35rem;border-radius:4px;font-family:Courier New,monospace}
.vp-time{font-size:.65rem;color:var(--color-text-secondary);font-family:Courier New,monospace}
.vp-amount{font-weight:700;font-size:.85rem;color:var(--color-text-primary);font-family:Courier New,monospace}
.vp-card-user{display:flex;align-items:center;gap:.3rem;font-size:.68rem;color:var(--color-text-secondary)}
.vp-desc{display:flex;align-items:center;gap:.3rem;padding:.2rem .35rem;background:var(--color-bg-primary);border-radius:4px}
.vp-desc-text{flex:1;font-size:.7rem;color:var(--color-text-secondary);font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vp-edit-desc{width:20px;height:20px;border:none;border-radius:3px;background:transparent;cursor:pointer;font-size:.65rem;opacity:.5;transition:all .15s}
.vp-edit-desc:hover{opacity:1;background:color-mix(in srgb,var(--color-accent) 15%,transparent)}
.vp-details{display:flex;flex-direction:column;gap:.1rem;max-height:60px;overflow-y:auto;padding:.1rem;margin-top:.1rem}
.vp-detail-row{display:flex;align-items:center;gap:.25rem;padding:.15rem .25rem;font-size:.65rem;border-radius:3px;background:var(--color-bg-primary)}
.vp-detail-qty{background:var(--color-accent);color:var(--color-on-brand);padding:.04rem .2rem;border-radius:3px;font-size:.58rem;font-weight:600;min-width:26px;text-align:center;font-family:Courier New,monospace}
.vp-detail-name{flex:1;color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vp-detail-price{color:var(--color-success);font-weight:600;font-size:.62rem;font-family:Courier New,monospace}
.vp-actions{display:flex;gap:.3rem;margin-top:.1rem}
.vp-btn-del,.vp-btn-add{width:32px;height:32px;border:none;border-radius:var(--radius-sm);background:var(--color-bg-primary);cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.vp-btn-del:hover{color:var(--color-error)}
.vp-btn-add:hover{color:var(--color-accent)}
.vp-btn-cobrar{flex:1;padding:.5rem;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--color-success),color-mix(in srgb,var(--color-success) 60%,black));color:#fff;font-weight:600;font-size:.82rem;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,0.15);transition:all .15s;display:flex;align-items:center;justify-content:center;gap:.3rem}
.vp-btn-cobrar:hover{box-shadow:5px 5px 10px rgba(0,0,0,0.2);transform:translateY(-1px)}
@media(max-width:640px){.vp-grid{grid-template-columns:1fr}}
</style>