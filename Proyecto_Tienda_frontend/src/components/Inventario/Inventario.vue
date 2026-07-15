<script setup lang="ts">
import { useInventario } from './logica/useInventario';
const { cargando, mensaje, categorias, filtroBusqueda, filtroCategoria, ordenarPor, verSoloProblemas, modalFormOpen, modalProductoEditando, guardando, vistaLista, cargar, guardar, editar, productosFiltrados, bajoStock, productosAgotados, costoTotal, gananciaPot, totalItems, catsConTodas } = useInventario();

import InvHeader from './secciones/InvHeader.vue';
import InvKpisBar from './secciones/InvKpisBar.vue';
import InvToolbar from './secciones/InvToolbar.vue';
import InvTabla from './secciones/InvTabla.vue';
import InvGrilla from './secciones/InvGrilla.vue';
import ProductoFormModal from '../modals/Productos/ProductoFormModal.vue';

</script>

<template>
  <div class="inv">
    <InvHeader :total-items="totalItems" :cargando="cargando" :vista-lista="vistaLista"
      @update:vista-lista="vistaLista = $event" @recargar="cargar" />

    <InvKpisBar :total-items="totalItems" :bajo-stock="bajoStock.length" :productos-agotados="productosAgotados.length"
      :costo-total="costoTotal" :ganancia-pot="gananciaPot" />

    <InvToolbar :filtro-busqueda="filtroBusqueda" :filtro-categoria="filtroCategoria" :ordenar-por="ordenarPor"
      :ver-solo-problemas="verSoloProblemas" :cats-con-todas="catsConTodas"
      @update:filtro-busqueda="filtroBusqueda = $event"
      @update:filtro-categoria="filtroCategoria = $event"
      @update:ordenar-por="ordenarPor = $event"
      @update:ver-solo-problemas="verSoloProblemas = $event" />

    <div class="inv__body">
      <div v-if="cargando" class="inv__wait"><div class="inv__spin"></div><p>Cargando inventario...</p></div>
      <p v-else-if="mensaje" class="inv__err">⚠️ {{ mensaje }}</p>
      <p v-else-if="productosFiltrados.length === 0" class="inv__nil">📭 {{ verSoloProblemas ? 'Sin alertas' : 'Sin resultados' }}</p>

      <InvTabla v-else-if="vistaLista" :productos="productosFiltrados" @editar="editar" />
      <InvGrilla v-else :productos="productosFiltrados" @editar="editar" />
    </div>

    <ProductoFormModal :open="modalFormOpen" :data="modalProductoEditando" :loading="guardando"
      :categorias="categorias" @close="modalFormOpen = false; modalProductoEditando = undefined"
      @submit="guardar" />
  </div>
</template>

<style>
.inv{height:96vh;display:flex;flex-direction:column;gap:.5rem;padding:.5rem;background:var(--color-bg-primary);color:var(--color-text-primary);overflow:hidden;font-family:var(--font-body)}
.inv__head{display:flex;align-items:center;justify-content:space-between;padding:.2rem 0;flex-shrink:0}
.inv__head-left{display:flex;align-items:baseline;gap:.5rem}
.inv__title{margin:0;font-size:1.15rem;font-weight:700;color:var(--color-accent)}
.inv__badge{font-size:.65rem;color:var(--color-text-secondary);padding:.15rem .55rem;background:var(--color-bg-panel);border:none;border-radius:12px;box-shadow:2px 2px 4px rgba(0,0,0,.08)}
.inv__head-right{display:flex;align-items:center;gap:.35rem}
.inv__views{display:flex;background:var(--color-bg-panel);border:none;border-radius:6px;overflow:hidden;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08)}
.inv__vbtn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;color:var(--color-text-secondary);cursor:pointer;transition:all .15s;font-size:.85rem;line-height:1}.inv__vbtn.on{background:var(--color-accent);color:var(--color-on-brand);box-shadow:inset 1px 1px 2px rgba(0,0,0,.15)}.inv__vbtn:hover:not(.on){background:var(--color-bg-secondary)}
.inv__reload{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:none;border-radius:6px;background:var(--color-bg-panel);color:var(--color-text-secondary);cursor:pointer;transition:all .15s;font-size:.85rem;box-shadow:2px 2px 4px rgba(0,0,0,.08)}.inv__reload:hover:not(:disabled){color:var(--color-accent);box-shadow:3px 3px 6px rgba(0,0,0,.12)}.inv__reload:disabled{opacity:.4}.inv__reload.spin{animation:invSpin .7s linear infinite}
@keyframes invSpin{to{transform:rotate(360deg)}}
.inv__kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:.4rem;flex-shrink:0}
.inv__kpi{display:flex;align-items:center;gap:.5rem;padding:.4rem .6rem;background:var(--color-bg-panel);border:none;border-radius:10px;transition:all .2s;box-shadow:3px 3px 6px rgba(0,0,0,.08),-1px -1px 3px rgba(255,255,255,.02)}.inv__kpi:hover{transform:translateY(-1px);box-shadow:5px 5px 12px rgba(0,0,0,.12),-2px -2px 5px rgba(255,255,255,.03)}
.inv__kpi-ico{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:8px;flex-shrink:0;font-size:1.2rem;box-shadow:inset 2px 2px 4px rgba(0,0,0,.1)}.ico-blue{background:color-mix(in srgb,var(--color-info) 15%,transparent)}.ico-amber{background:color-mix(in srgb,var(--color-warning) 15%,transparent)}.ico-red{background:color-mix(in srgb,var(--color-error) 15%,transparent)}.ico-gold{background:color-mix(in srgb,var(--color-accent) 15%,transparent)}.ico-green{background:color-mix(in srgb,var(--color-success) 15%,transparent)}
.inv__kpi-txt{display:flex;flex-direction:column;gap:0;min-width:0}.inv__kpi-l{font-size:.58rem;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-secondary)}.inv__kpi-v{font-size:.85rem;font-weight:700;font-family:'Courier New',monospace;white-space:nowrap}
.inv__bar{display:flex;gap:.4rem;flex-wrap:wrap;flex-shrink:0;align-items:center}
.inv__src{flex:1;min-width:150px;position:relative;display:flex;align-items:center}.inv__src-ico{position:absolute;left:.65rem;font-size:.8rem;pointer-events:none;opacity:.7}
.inv__src input{width:100%;padding:.4rem 1.8rem .4rem 2rem;background:var(--color-bg-panel);border:none;border-radius:7px;color:var(--color-text-primary);font-size:.75rem;box-shadow:inset 2px 2px 4px rgba(0,0,0,.1);transition:all .15s}.inv__src input:focus{outline:none;box-shadow:inset 2px 2px 4px rgba(0,0,0,.1),0 0 0 2px var(--color-accent)}.inv__src input::placeholder{color:var(--color-text-secondary);opacity:.4}
.inv__x{position:absolute;right:.35rem;width:18px;height:18px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;color:var(--color-text-secondary);font-size:.9rem;cursor:pointer;border-radius:50%}.inv__x:hover{background:var(--color-error);color:#fff}
.inv__ctrls{display:flex;gap:.35rem;align-items:center}.inv__ctrls select{padding:.4rem .6rem;background:var(--color-bg-panel);border:none;border-radius:7px;color:var(--color-text-primary);font-size:.7rem;cursor:pointer;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08)}.inv__ctrls select:focus{outline:none;box-shadow:inset 2px 2px 3px rgba(0,0,0,.08),0 0 0 2px var(--color-accent)}
.inv__tog{display:flex;align-items:center;gap:.3rem;cursor:pointer;font-size:.65rem;color:var(--color-text-secondary);user-select:none}.inv__tog input{display:none}
.inv__tog-t{width:30px;height:16px;background:var(--color-bg-secondary);border:none;border-radius:8px;position:relative;transition:all .2s;box-shadow:inset 2px 2px 3px rgba(0,0,0,.12)}.inv__tog-d{position:absolute;top:2px;left:2px;width:12px;height:12px;background:var(--color-text-secondary);border-radius:50%;transition:all .2s;box-shadow:1px 1px 2px rgba(0,0,0,.1)}.inv__tog input:checked+.inv__tog-t{background:var(--color-accent);box-shadow:inset 2px 2px 3px rgba(0,0,0,.15)}.inv__tog input:checked+.inv__tog-t .inv__tog-d{left:16px;background:var(--color-on-brand)}
.inv__body{flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0}
.inv__wait,.inv__err,.inv__nil{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;padding:3rem;color:var(--color-text-secondary);font-size:.8rem;flex:1}.inv__err{color:var(--color-error)}
.inv__spin{width:24px;height:24px;border:2px solid var(--color-border);border-top-color:var(--color-accent);border-radius:50%;animation:invSpin .7s linear infinite}
.inv__tbl-wrap{flex:1;overflow:auto;min-height:0}.inv__tbl-wrap::-webkit-scrollbar{width:5px;height:5px}.inv__tbl-wrap::-webkit-scrollbar-track{background:transparent}.inv__tbl-wrap::-webkit-scrollbar-thumb{background:var(--color-border);border-radius:3px}.inv__tbl-wrap::-webkit-scrollbar-thumb:hover{background:var(--color-accent)}
.inv__tbl{width:100%;border-collapse:collapse;font-size:.78rem}.inv__tbl th{text-align:left;padding:.45rem .65rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.04em;color:var(--color-text-secondary);border-bottom:1px solid var(--color-border);background:var(--color-bg-panel);position:sticky;top:0;z-index:2;white-space:nowrap;font-weight:600}.tc{text-align:center}.tr{text-align:right}
.inv__row{border-bottom:1px solid rgba(255,255,255,.02);transition:background .1s;cursor:pointer}.inv__row:hover{background:var(--color-bg-panel)}.inv__row.r-agotado{border-left:2px solid var(--color-error)}.inv__row.r-bajo{border-left:2px solid var(--color-warning)}.inv__row.r-ok,.inv__row.r-normal{border-left:2px solid var(--color-success)}.inv__row.r-gaming{border-left:2px solid var(--color-accent)}
.inv__cell{padding:.4rem .65rem;vertical-align:middle;white-space:nowrap}.inv__name-cell{display:flex;align-items:center;gap:.45rem;padding-left:.75rem}.inv__emoji{font-size:1rem;flex-shrink:0}.inv__ni{display:flex;flex-direction:column;min-width:0}.inv__nn{font-weight:600;color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;max-width:260px;line-height:1.2}.inv__nid{font-size:.52rem;color:var(--color-text-secondary);font-family:'Courier New',monospace}
.cat{color:var(--color-text-secondary);font-size:.68rem}.stock{font-weight:700;font-family:'Courier New',monospace}.stock small{font-size:.55rem;color:var(--color-text-secondary);margin-left:.1rem;font-weight:400}
.inv__tag{display:inline-block;padding:.12rem .45rem;border-radius:4px;font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;box-shadow:1px 1px 2px rgba(0,0,0,.05)}.t-agotado{background:color-mix(in srgb,var(--color-error) 15%,transparent);color:var(--color-error)}.t-bajo{background:color-mix(in srgb,var(--color-warning) 15%,transparent);color:var(--color-warning)}.t-ok{background:color-mix(in srgb,var(--color-success) 15%,transparent);color:var(--color-success)}.t-gaming{background:color-mix(in srgb,var(--color-accent) 15%,transparent);color:var(--color-accent)}
.costo{color:var(--color-accent)}.venta{color:var(--color-success)}.gain{color:var(--color-accent)}.total{font-weight:700}.ac{text-align:center;padding:.4rem .45rem}
.inv__eb{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:none;border-radius:5px;background:transparent;cursor:pointer;opacity:0;transition:all .15s;font-size:.75rem;box-shadow:2px 2px 4px rgba(0,0,0,.08)}.inv__row:hover .inv__eb{opacity:1}.inv__eb:hover{background:var(--color-accent);color:var(--color-on-brand);box-shadow:3px 3px 6px rgba(0,0,0,.15)}

.inv__grid{flex:1;overflow-y:auto;padding:.4rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:.5rem;min-height:0;align-content:start}.inv__grid::-webkit-scrollbar{width:5px}.inv__grid::-webkit-scrollbar-track{background:transparent}.inv__grid::-webkit-scrollbar-thumb{background:var(--color-border);border-radius:3px}
.inv__cd{position:relative;background:var(--color-bg-panel);border:none;border-radius:12px;padding:.7rem;display:flex;flex-direction:column;gap:.35rem;transition:all .2s;cursor:pointer;min-width:0;box-shadow:4px 4px 8px rgba(0,0,0,.1),-2px -2px 5px rgba(255,255,255,.02)}.inv__cd:hover{transform:translateY(-2px);box-shadow:7px 7px 16px rgba(0,0,0,.18),-3px -3px 8px rgba(255,255,255,.03)}.inv__cd.c-bajo{box-shadow:4px 4px 8px rgba(0,0,0,.1),0 0 0 1px color-mix(in srgb,var(--color-warning) 40%,transparent)}.inv__cd.c-agotado{box-shadow:4px 4px 8px rgba(0,0,0,.1),0 0 0 1px color-mix(in srgb,var(--color-error) 40%,transparent)}.inv__cd.c-ok,.inv__cd.c-normal{box-shadow:4px 4px 8px rgba(0,0,0,.1),0 0 0 1px color-mix(in srgb,var(--color-success) 25%,transparent)}.inv__cd.c-gaming{box-shadow:4px 4px 8px rgba(0,0,0,.1),0 0 0 1px color-mix(in srgb,var(--color-accent) 30%,transparent)}
.inv__cd-head{display:flex;align-items:center;justify-content:space-between}.inv__cd-id{font-size:.5rem;color:var(--color-text-secondary);font-family:'Courier New',monospace}.inv__cd-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}.d-agotado{background:var(--color-error);box-shadow:0 0 5px color-mix(in srgb,var(--color-error) 50%,transparent)}.d-bajo{background:var(--color-warning);box-shadow:0 0 5px color-mix(in srgb,var(--color-warning) 50%,transparent)}.d-ok,.d-normal{background:var(--color-success);box-shadow:0 0 5px color-mix(in srgb,var(--color-success) 50%,transparent)}.d-gaming{background:var(--color-accent);box-shadow:0 0 5px color-mix(in srgb,var(--color-accent) 50%,transparent)}
.inv__cd-ico-wrap{display:flex;justify-content:center;padding:.2rem 0}.inv__cd-ico{display:flex;align-items:center;justify-content:center;width:42px;height:42px;background:var(--color-bg-secondary);border-radius:50%;font-size:1.1rem;border:none;box-shadow:inset 2px 2px 4px rgba(0,0,0,.08),2px 2px 4px rgba(0,0,0,.06);flex-shrink:0}
.inv__cd-nm{margin:0;font-size:.7rem;color:var(--color-accent);text-align:center;line-height:1.2}.inv__cd-cat{text-align:center;font-size:.5rem;color:var(--color-text-secondary);padding:.1rem .4rem;background:var(--color-bg-secondary);border-radius:8px;align-self:center;box-shadow:1px 1px 2px rgba(0,0,0,.04)}
.inv__cd-stats{display:flex;flex-direction:column;gap:.25rem}.inv__cs{display:flex;align-items:center;gap:.35rem;padding:.2rem .35rem;background:var(--color-bg-secondary);border-radius:6px;box-shadow:inset 1px 1px 2px rgba(0,0,0,.04)}.inv__cs:hover{background:var(--color-bg-primary)}.inv__cs-ico{font-size:.8rem;flex-shrink:0;width:16px;text-align:center}.inv__cs-body{display:flex;justify-content:space-between;align-items:center;flex:1;min-width:0}.inv__cs-l{font-size:.5rem;color:var(--color-text-secondary)}.inv__cs-v{font-size:.6rem;font-family:'Courier New',monospace;font-weight:600;white-space:nowrap}.inv__cs-v small{font-size:.48rem;font-weight:400;color:var(--color-text-secondary);margin-left:.05rem}.v-venta{color:var(--color-success)}.v-gain{color:var(--color-accent)}.v-agotado{color:var(--color-error)}.v-bajo{color:var(--color-warning)}.v-ok,.v-normal{color:var(--color-success)}
.inv__cd-bar-wrap{display:flex;align-items:center;gap:.35rem;margin-top:.05rem}.inv__cd-bar-bg{flex:1;height:4px;background:var(--color-bg-secondary);border-radius:2px;overflow:hidden;box-shadow:inset 1px 1px 2px rgba(0,0,0,.06)}.inv__cd-bar-fill{height:100%;border-radius:2px;transition:width .4s ease}.bf-ok,.bf-normal{background:var(--color-success)}.bf-bajo{background:var(--color-warning)}.bf-agotado{background:var(--color-error)}.inv__cd-bar-pct{font-size:.5rem;color:var(--color-text-secondary);font-family:'Courier New',monospace;min-width:24px;text-align:right}
.inv__cd-ed{position:absolute;top:.35rem;right:.35rem;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border:none;background:var(--color-bg-secondary);cursor:pointer;border-radius:4px;opacity:0;transition:all .15s;font-size:.65rem;box-shadow:2px 2px 4px rgba(0,0,0,.08)}.inv__cd:hover .inv__cd-ed{opacity:1}.inv__cd-ed:hover{background:var(--color-accent);color:var(--color-on-brand);box-shadow:3px 3px 6px rgba(0,0,0,.15)}

@media(max-width:1200px){.inv__kpis{grid-template-columns:repeat(3,1fr)}}
@media(max-width:768px){
  .inv{height:auto;min-height:100dvh}.inv__kpis{grid-template-columns:repeat(2,1fr);gap:.25rem}.inv__kpi{padding:.25rem .4rem;gap:.35rem}.inv__kpi-ico{width:28px;height:28px;font-size:1rem}.inv__kpi-l{font-size:.42rem}.inv__kpi-v{font-size:.65rem}
  .inv__bar{gap:.25rem}.inv__ctrls select{padding:.25rem .4rem;font-size:.58rem}
  .inv__tbl{font-size:.55rem}.inv__tbl th{padding:.25rem .35rem;font-size:.45rem}.inv__cell{padding:.25rem .35rem}.inv__nn{max-width:100px}
  .inv__grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:.3rem}.inv__cd{padding:.4rem}.inv__cd-ico{width:30px;height:30px;font-size:.9rem}.inv__cd-nm{font-size:.55rem}.inv__cd-ed{opacity:1}
}
@media(max-width:480px){
  .inv__kpis{grid-template-columns:repeat(2,1fr)}.inv__head{flex-wrap:wrap;gap:.25rem}.inv__title{font-size:.85rem}
  .inv__grid{grid-template-columns:repeat(2,1fr);gap:.25rem}.inv__cd{padding:.35rem;gap:.2rem}.inv__cd-ico{width:26px;height:26px;font-size:.8rem}.inv__cd-nm{font-size:.5rem}.inv__cs{padding:.12rem .18rem;gap:.15rem}.inv__cs-ico{display:none}
  .inv__tbl th,.inv__cell{padding:.2rem .25rem;font-size:.5rem}.inv__nn{max-width:70px}
}
</style>
