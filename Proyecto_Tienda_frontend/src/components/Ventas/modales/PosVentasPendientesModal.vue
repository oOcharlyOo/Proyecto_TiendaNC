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
  (e: 'eliminar-producto', detalle: any): void;
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
                <button v-if="d.idsVentaDetalle?.length" class="vp-list-detail-del" @click.stop="emit('eliminar-producto', d)" title="Eliminar producto">✕</button>
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
                <button v-if="d.idsVentaDetalle?.length" class="vp-detail-del" @click.stop="emit('eliminar-producto', d)" title="Eliminar producto">✕</button>
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
.pos-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);backdrop-filter:blur(6px);z-index:200;display:grid;place-items:center;padding:1rem}
.pos-modal-card{background:var(--color-bg-panel);border-radius:var(--radius-lg);width:min(100%,640px);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:8px 8px 24px rgba(0,0,0,0.35),-4px -4px 16px rgba(255,255,255,0.03)}
.vp-modal-head{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;background:var(--color-bg-secondary);border-radius:var(--radius-lg) var(--radius-lg) 0 0}
.vp-head-left{display:flex;align-items:center;gap:.75rem}
.vp-title{font-size:1.1rem;font-weight:700;color:var(--color-accent);margin:0}
.vp-count{font-size:.8rem;color:var(--color-text-secondary);background:var(--color-bg-primary);padding:.2rem .55rem;border-radius:10px;font-weight:600}
.vp-head-right{display:flex;align-items:center;gap:.6rem}
.vp-views{display:flex;background:var(--color-bg-primary);border-radius:6px;overflow:hidden;box-shadow:inset 2px 2px 4px rgba(0,0,0,0.1)}
.vp-vbtn{width:32px;height:32px;border:none;background:transparent;color:var(--color-text-secondary);cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;transition:all .15s}
.vp-vbtn.on{background:var(--color-accent);color:var(--color-on-brand)}
.vp-vbtn:hover:not(.on){color:var(--color-text-primary)}
.vp-close{width:34px;height:34px;border:none;border-radius:50%;background:var(--color-bg-primary);color:var(--color-text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.vp-close:hover{background:var(--color-error);color:#fff}
.vp-modal-body{padding:1.25rem;overflow-y:auto;flex:1;min-height:0}
.vp-empty{text-align:center;padding:3rem 1rem;color:var(--color-text-secondary)}
.vp-empty-ico{font-size:2.5rem;display:block;margin-bottom:.75rem}
.vp-empty-text{font-size:1rem}
.vp-list{display:flex;flex-direction:column;gap:.6rem}
.vp-list-row{background:var(--color-bg-secondary);border-radius:var(--radius-sm);padding:.8rem .9rem;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s}
.vp-list-row:hover{box-shadow:4px 4px 8px rgba(0,0,0,0.15);transform:translateY(-1px)}
.vp-list-main{display:flex;align-items:center;justify-content:space-between;cursor:pointer;gap:.5rem}
.vp-list-left{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
.vp-list-badge{font-weight:700;font-size:.9rem;color:var(--color-accent);background:color-mix(in srgb,var(--color-accent) 12%,transparent);padding:.2rem .5rem;border-radius:4px;font-family:Courier New,monospace}
.vp-list-time{font-size:.78rem;color:var(--color-text-secondary);font-family:Courier New,monospace}
.vp-list-user{font-size:.8rem;color:var(--color-text-secondary)}
.vp-list-amount{font-weight:700;font-size:1.05rem;color:var(--color-text-primary);font-family:Courier New,monospace;white-space:nowrap}
.vp-list-desc{display:flex;align-items:flex-start;gap:.4rem;padding:.35rem .5rem;background:var(--color-bg-primary);border-radius:5px;margin-top:.3rem}
.vp-list-desc-ico{font-size:.75rem;margin-top:.1rem;flex-shrink:0}
.vp-list-desc-text{flex:1;font-size:.8rem;color:var(--color-text-secondary);font-style:italic;line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.vp-list-edit-desc{width:26px;height:26px;border:none;border-radius:4px;background:transparent;cursor:pointer;font-size:.75rem;opacity:.5;transition:all .15s;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.vp-list-edit-desc:hover{opacity:1;background:color-mix(in srgb,var(--color-accent) 15%,transparent)}
.vp-list-details{display:flex;flex-direction:column;gap:.15rem;max-height:90px;overflow-y:auto;padding:.2rem;margin-top:.25rem}
.vp-list-detail-row{display:flex;align-items:center;gap:.35rem;padding:.22rem .35rem;font-size:.78rem;border-radius:4px;background:var(--color-bg-primary)}
.vp-list-detail-qty{background:var(--color-accent);color:var(--color-on-brand);padding:.1rem .28rem;border-radius:4px;font-size:.68rem;font-weight:600;min-width:32px;text-align:center;font-family:Courier New,monospace;flex-shrink:0}
.vp-list-detail-name{flex:1;color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vp-list-detail-price{color:var(--color-success);font-weight:600;font-size:.75rem;font-family:Courier New,monospace;white-space:nowrap;flex-shrink:0}
.vp-list-detail-del{width:20px;height:20px;border:none;border-radius:3px;background:transparent;color:var(--color-text-secondary);font-size:.65rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;opacity:.4;transition:all .15s;padding:0}
.vp-list-detail-del:hover{opacity:1;color:var(--color-error);background:color-mix(in srgb,var(--color-error) 12%,transparent)}
.vp-list-actions{display:flex;gap:.4rem;margin-top:.25rem}
.vp-list-btn-del,.vp-list-btn-add{width:36px;height:36px;border:none;border-radius:var(--radius-sm);background:var(--color-bg-primary);cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s;flex-shrink:0}
.vp-list-btn-del:hover{color:var(--color-error)}
.vp-list-btn-add:hover{color:var(--color-accent)}
.vp-list-btn-cobrar{flex:1;padding:.55rem;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--color-success),color-mix(in srgb,var(--color-success) 60%,black));color:#fff;font-weight:600;font-size:.88rem;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,0.15);transition:all .15s}
.vp-list-btn-cobrar:hover{box-shadow:5px 5px 10px rgba(0,0,0,0.2);transform:translateY(-1px)}
.vp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.75rem}
.vp-card{background:var(--color-bg-secondary);border-radius:var(--radius-sm);padding:.8rem;display:flex;flex-direction:column;gap:.45rem;width:100%;min-width:0;box-sizing:border-box;overflow:hidden;box-shadow:3px 3px 6px rgba(0,0,0,0.1),-1px -1px 3px rgba(255,255,255,0.02);transition:all .15s}
.vp-card:hover{box-shadow:5px 5px 10px rgba(0,0,0,0.15);transform:translateY(-2px)}
.vp-card-head{display:flex;align-items:center;justify-content:space-between}
.vp-ticket-box{display:flex;align-items:center;gap:.5rem}
.vp-ticket-badge{font-weight:700;font-size:.88rem;color:var(--color-accent);background:color-mix(in srgb,var(--color-accent) 12%,transparent);padding:.15rem .4rem;border-radius:4px;font-family:Courier New,monospace}
.vp-time{font-size:.72rem;color:var(--color-text-secondary);font-family:Courier New,monospace}
.vp-amount{font-weight:700;font-size:.95rem;color:var(--color-text-primary);font-family:Courier New,monospace;white-space:nowrap}
.vp-card-user{display:flex;align-items:center;gap:.35rem;font-size:.78rem;color:var(--color-text-secondary)}
.vp-desc{display:flex;align-items:flex-start;gap:.35rem;padding:.3rem .4rem;background:var(--color-bg-primary);border-radius:4px}
.vp-desc-ico{font-size:.7rem;margin-top:.1rem;flex-shrink:0}
.vp-desc-text{flex:1;font-size:.78rem;color:var(--color-text-secondary);font-style:italic;line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.vp-edit-desc{width:24px;height:24px;border:none;border-radius:3px;background:transparent;cursor:pointer;font-size:.7rem;opacity:.5;transition:all .15s;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.vp-edit-desc:hover{opacity:1;background:color-mix(in srgb,var(--color-accent) 15%,transparent)}
.vp-details{display:flex;flex-direction:column;gap:.12rem;max-height:80px;overflow-y:auto;padding:.15rem;margin-top:.15rem}
.vp-detail-row{display:flex;align-items:center;gap:.3rem;padding:.2rem .3rem;font-size:.74rem;border-radius:4px;background:var(--color-bg-primary)}
.vp-detail-qty{background:var(--color-accent);color:var(--color-on-brand);padding:.08rem .24rem;border-radius:4px;font-size:.65rem;font-weight:600;min-width:30px;text-align:center;font-family:Courier New,monospace;flex-shrink:0}
.vp-detail-name{flex:1;color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vp-detail-price{color:var(--color-success);font-weight:600;font-size:.7rem;font-family:Courier New,monospace;white-space:nowrap;flex-shrink:0}
.vp-detail-del{width:18px;height:18px;border:none;border-radius:3px;background:transparent;color:var(--color-text-secondary);font-size:.6rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;opacity:.4;transition:all .15s;padding:0;margin-left:.1rem}
.vp-detail-del:hover{opacity:1;color:var(--color-error);background:color-mix(in srgb,var(--color-error) 12%,transparent)}
.vp-actions{display:flex;gap:.35rem;margin-top:.15rem}
.vp-btn-del,.vp-btn-add{width:36px;height:36px;border:none;border-radius:var(--radius-sm);background:var(--color-bg-primary);cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 4px rgba(0,0,0,0.1);transition:all .15s;flex-shrink:0}
.vp-btn-del:hover{color:var(--color-error)}
.vp-btn-add:hover{color:var(--color-accent)}
.vp-btn-cobrar{flex:1;padding:.55rem;border:none;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--color-success),color-mix(in srgb,var(--color-success) 60%,black));color:#fff;font-weight:600;font-size:.88rem;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,0.15);transition:all .15s;display:flex;align-items:center;justify-content:center;gap:.35rem}
.vp-btn-cobrar:hover{box-shadow:5px 5px 10px rgba(0,0,0,0.2);transform:translateY(-1px)}
@media(max-width:640px){.vp-grid{grid-template-columns:1fr}}
</style>