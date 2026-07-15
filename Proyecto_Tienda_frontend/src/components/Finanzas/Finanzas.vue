<script setup lang="ts">
import { useFinanzas } from './logica/useFinanzas';
const { mensaje, mensajeTipo, cargando, modalEntradaAbierto, modalSalidaAbierto, modalAjusteAbierto, modalEditarGananciasAbierto, pestañaActiva, saldoRealCalculado, historialBoveda, gananciasDelDia, gananciasTotales, gananciasEditadas, historialGanancias, gananciaPaginaActual, gananciaTotalPaginas, paginaActual, totalPaginas, historialUnico, formatoMoneda, cambiarPestaña, cambiarPagina, handleAjusteBase, editarGanancias, handleEditarGanancias, registrarMovimiento } = useFinanzas();
import EntradaEfectivoModal from '../modals/EntradaEfectivoModal.vue';
import SalidaEfectivoModal from '../modals/SalidaEfectivoModal.vue';
import MontoInicialModal from '../modals/MontoInicialModal.vue';
import FinanzasHeader from './secciones/FinanzasHeader.vue';
import FinanzasVaultCard from './secciones/FinanzasVaultCard.vue';
import FinanzasActions from './secciones/FinanzasActions.vue';
import FinanzasHistory from './secciones/FinanzasHistory.vue';
import FinanzasGanancias from './secciones/FinanzasGanancias.vue';

</script>

<template>
  <main class="finanzas-container">
    <div class="content-wrapper">
      <FinanzasHeader
        :pestaña-activa="pestañaActiva"
        :mensaje="mensaje"
        :mensaje-tipo="mensajeTipo"
        @cambiar-pestana="cambiarPestaña"
      />

      <div class="dashboard-grid">
        <FinanzasVaultCard
          :pestaña-activa="pestañaActiva"
          :saldo-real-calculado="saldoRealCalculado"
          :historial-boveda="historialBoveda"
          :ganancias-del-dia="gananciasDelDia"
          :ganancias-totales="gananciasTotales"
          :formato-moneda="formatoMoneda"
          @ajustar="modalAjusteAbierto = true"
          @editar-ganancias="editarGanancias"
        />

        <FinanzasActions
          @entrada="modalEntradaAbierto = true"
          @salida="modalSalidaAbierto = true"
        />

        <FinanzasHistory
          v-if="pestañaActiva === 'boveda'"
          :historial-unico="historialUnico"
          :cargando="cargando"
          :pestaña-activa="pestañaActiva"
          :pagina-actual="paginaActual"
          :total-paginas="totalPaginas"
          :formato-moneda="formatoMoneda"
          @cambiar-pagina="cambiarPagina"
        />

        <FinanzasGanancias
          :pestaña-activa="pestañaActiva"
          :cargando="cargando"
          :historial-ganancias="historialGanancias"
          :ganancia-pagina-actual="gananciaPaginaActual"
          :ganancia-total-paginas="gananciaTotalPaginas"
          :formato-moneda="formatoMoneda"
          @cambiar-pagina="cambiarPagina"
        />
      </div>
    </div>

    <EntradaEfectivoModal :open="modalEntradaAbierto" @close="modalEntradaAbierto = false" @submit="(p: any) => registrarMovimiento(p, 'entrada')" />
    <SalidaEfectivoModal :open="modalSalidaAbierto" @close="modalSalidaAbierto = false" @submit="(p: any) => registrarMovimiento(p, 'salida')" />
    <MontoInicialModal
      :open="modalAjusteAbierto"
      title="Ajuste de Bóveda Real"
      subtitle="Ingresa el monto total físico que has contado en la bóveda"
      label="Saldo Real Contado"
      confirm-text="Actualizar Saldo de Bóveda"
      @close="modalAjusteAbierto = false"
      @submit="handleAjusteBase"
    />
    <MontoInicialModal
      :open="modalEditarGananciasAbierto"
      title="Ajuste de Ganancias"
      subtitle="Ingresa el monto total de ganancias registrado manualmente"
      label="Total Ganancias"
      confirm-text="Actualizar Ganancias"
      :initial-value="gananciasEditadas"
      @close="modalEditarGananciasAbierto = false"
      @submit="handleEditarGanancias"
    />
  </main>
</template>

<style scoped>
.finanzas-container{position:relative;min-height:100dvh;background:var(--color-bg-primary);color:var(--color-text-primary);overflow-y:auto;padding:1rem}
.content-wrapper{max-width:1200px;margin:0 auto}
.dashboard-grid{display:flex;flex-direction:column;gap:.5rem}

.finanzas-container :deep(.finanzas-header){padding:.5rem 0 0;text-align:center}.finanzas-container :deep(.header-main){display:flex;flex-direction:column;align-items:center;gap:.5rem;margin-bottom:.75rem}
.finanzas-container :deep(.crown-wrapper){width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--color-bg-secondary);border:none;box-shadow:4px 4px 10px rgba(0,0,0,.2),-2px -2px 6px rgba(255,255,255,.02),0 0 16px color-mix(in srgb,var(--color-accent) 15%,transparent)}.finanzas-container :deep(.crown-icon){font-size:1.8rem}.finanzas-container :deep(.crown-glow){display:none}
.finanzas-container :deep(.title-group h1){margin:0;font-size:1.5rem;color:var(--color-accent);font-weight:800}.finanzas-container :deep(.subtitle){font-size:.72rem;color:var(--color-text-secondary);margin:.15rem 0 0}

.finanzas-container :deep(.tabs-wrapper){display:flex;justify-content:center;gap:.35rem;flex-wrap:wrap;margin-bottom:.75rem}.finanzas-container :deep(.tab-btn){padding:.45rem 1rem;border:none;border-radius:8px;background:var(--color-bg-secondary);color:var(--color-text-secondary);font-size:.75rem;font-weight:600;cursor:pointer;transition:all .2s;box-shadow:3px 3px 6px rgba(0,0,0,.1),-1px -1px 3px rgba(255,255,255,.02)}.finanzas-container :deep(.tab-btn:hover){color:var(--color-text-primary);box-shadow:5px 5px 10px rgba(0,0,0,.15);transform:translateY(-1px)}.finanzas-container :deep(.tab-btn.active){background:var(--color-accent);color:var(--color-on-brand);box-shadow:inset 2px 2px 4px rgba(0,0,0,.2)}
.finanzas-container :deep(.tab-icon){font-size:.9rem}

.finanzas-container :deep(.alert-box){padding:.55rem .85rem;border-radius:10px;font-size:.75rem;font-weight:600;display:flex;align-items:center;gap:.5rem;box-shadow:3px 3px 8px rgba(0,0,0,.1)}.finanzas-container :deep(.alert-ok){background:color-mix(in srgb,var(--color-success) 12%,var(--color-bg-panel));color:var(--color-success);border:none}.finanzas-container :deep(.alert-error){background:color-mix(in srgb,var(--color-error) 12%,var(--color-bg-panel));color:var(--color-error);border:none}.finanzas-container :deep(.alert-info){background:color-mix(in srgb,var(--color-info) 12%,var(--color-bg-panel));color:var(--color-info);border:none}
@keyframes animateFadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@keyframes animateSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

.finanzas-container :deep(.main-stats-section){display:flex;flex-direction:column;gap:.6rem}
.finanzas-container :deep(.vault-card){background:linear-gradient(145deg,var(--color-bg-panel) 0%,var(--color-bg-secondary) 100%);border:none;border-radius:16px;box-shadow:6px 6px 14px rgba(0,0,0,.2),-3px -3px 10px rgba(255,255,255,.02)}.finanzas-container :deep(.vault-card.clickable){cursor:pointer}.finanzas-container :deep(.vault-card.clickable:hover){transform:translateY(-2px);box-shadow:10px 10px 22px rgba(0,0,0,.3),-5px -5px 14px rgba(255,255,255,.03)}
.finanzas-container :deep(.vault-card-inner){padding:1rem 1.25rem;position:relative}
.finanzas-container :deep(.vault-decoration){position:absolute;inset:8px;pointer-events:none}.finanzas-container :deep(.dec-corner){position:absolute;width:16px;height:16px;border-color:color-mix(in srgb,var(--color-accent) 15%,transparent);border-style:solid}.finanzas-container :deep(.top-left){top:0;left:0;border-width:2px 0 0 2px;border-radius:4px 0 0 0}.finanzas-container :deep(.top-right){top:0;right:0;border-width:2px 2px 0 0;border-radius:0 4px 0 0}.finanzas-container :deep(.bottom-left){bottom:0;left:0;border-width:0 0 2px 2px;border-radius:0 0 0 4px}.finanzas-container :deep(.bottom-right){bottom:0;right:0;border-width:0 2px 2px 0;border-radius:0 0 4px 0}
.finanzas-container :deep(.card-label){font-size:.65rem;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:.15rem}
.finanzas-container :deep(.balance-display){display:flex;align-items:center;gap:.3rem;margin:.2rem 0}.finanzas-container :deep(.currency-symbol){font-size:1.5rem;font-weight:700;color:var(--color-text-secondary);opacity:.7}.finanzas-container :deep(.balance-amount){font-size:2.2rem;font-weight:900;color:var(--color-success);font-family:'Courier New',monospace}
.finanzas-container :deep(.card-footer){display:flex;justify-content:flex-end}
.finanzas-container :deep(.edit-badge){padding:.25rem .6rem;background:var(--color-bg-secondary);border:none;border-radius:6px;font-size:.62rem;color:var(--color-accent);font-weight:600;cursor:pointer;box-shadow:2px 2px 4px rgba(0,0,0,.08);transition:all .15s}.finanzas-container :deep(.edit-badge:hover){box-shadow:4px 4px 8px rgba(0,0,0,.12);transform:translateY(-1px)}

.finanzas-container :deep(.quick-stats-grid){display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem}.finanzas-container :deep(.mini-stat-card){padding:.5rem .7rem;background:var(--color-bg-secondary);border:none;border-radius:10px;display:flex;align-items:center;gap:.45rem;box-shadow:3px 3px 6px rgba(0,0,0,.08),-1px -1px 3px rgba(255,255,255,.02)}.finanzas-container :deep(.stat-icon-circle){width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.9rem;background:var(--color-bg-primary);box-shadow:inset 2px 2px 4px rgba(0,0,0,.1)}.finanzas-container :deep(.stat-icon-circle.info){color:var(--color-info)}.finanzas-container :deep(.stat-icon-circle.success){color:var(--color-success)}.finanzas-container :deep(.stat-icon-circle.danger){color:var(--color-error)}.finanzas-container :deep(.stat-details){display:flex;flex-direction:column;gap:.05rem}.finanzas-container :deep(.stat-label){font-size:.52rem;color:var(--color-text-secondary);text-transform:uppercase}.finanzas-container :deep(.stat-value){font-size:.8rem;font-weight:700;font-family:'Courier New',monospace}.finanzas-container :deep(.txt-pos){color:var(--color-success)}.finanzas-container :deep(.txt-neg){color:var(--color-error)}

.finanzas-container :deep(.actions-section){display:flex;flex-direction:column;gap:0}.finanzas-container :deep(.section-card){background:var(--color-bg-secondary);border:none;border-radius:14px;padding:.85rem 1rem;box-shadow:4px 4px 10px rgba(0,0,0,.1),-2px -2px 6px rgba(255,255,255,.02)}.finanzas-container :deep(.section-card h3){margin:0 0 .5rem;font-size:.75rem;color:var(--color-accent);text-transform:uppercase;letter-spacing:.05em}.finanzas-container :deep(.actions-buttons){display:flex;flex-direction:column;gap:.35rem}.finanzas-container :deep(.action-btn){display:flex;align-items:center;gap:.7rem;padding:.55rem .8rem;background:var(--color-bg-panel);border:none;border-radius:10px;cursor:pointer;transition:all .2s;box-shadow:3px 3px 8px rgba(0,0,0,.1),-1px -1px 4px rgba(255,255,255,.02)}.finanzas-container :deep(.action-btn:hover){transform:translateY(-2px);box-shadow:6px 6px 14px rgba(0,0,0,.18)}.finanzas-container :deep(.btn-content){display:flex;align-items:center;gap:.6rem;flex:1}.finanzas-container :deep(.btn-icon){width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;background:var(--color-bg-secondary);box-shadow:2px 2px 4px rgba(0,0,0,.08)}.finanzas-container :deep(.btn-text){display:flex;flex-direction:column;text-align:left}.finanzas-container :deep(.btn-text .primary){font-size:.72rem;font-weight:700;color:var(--color-text-primary)}.finanzas-container :deep(.btn-text .secondary){font-size:.58rem;color:var(--color-text-secondary)}.finanzas-container :deep(.btn-entry) .btn-icon{color:var(--color-success);background:color-mix(in srgb,var(--color-success) 12%,var(--color-bg-secondary))}.finanzas-container :deep(.btn-exit) .btn-icon{color:var(--color-error);background:color-mix(in srgb,var(--color-error) 12%,var(--color-bg-secondary))}

.finanzas-container :deep(.history-section){display:flex;flex-direction:column;gap:.35rem;min-height:0;flex:1}.finanzas-container :deep(.history-card){background:var(--color-bg-secondary);border:none;border-radius:14px;padding:.85rem 1rem;box-shadow:4px 4px 10px rgba(0,0,0,.1),-2px -2px 6px rgba(255,255,255,.02);display:flex;flex-direction:column;gap:.5rem;flex:1;min-height:0}.finanzas-container :deep(.history-header){display:flex;align-items:center;justify-content:space-between}.finanzas-container :deep(.history-header h3){margin:0;font-size:.75rem;color:var(--color-accent);text-transform:uppercase}
.finanzas-container :deep(.loading-indicator){display:flex;align-items:center;gap:.4rem;font-size:.7rem;color:var(--color-text-secondary)}.finanzas-container :deep(.spinner){width:18px;height:18px;border:2px solid var(--color-border);border-top-color:var(--color-accent);border-radius:50%;animation:fnSpin .7s linear infinite}@keyframes fnSpin{to{transform:rotate(360deg)}}
.finanzas-container :deep(.history-list-container){flex:1;min-height:0;overflow-y:auto;border-radius:10px;box-shadow:inset 2px 2px 5px rgba(0,0,0,.12)}.finanzas-container :deep(.history-list-container::-webkit-scrollbar){width:5px}.finanzas-container :deep(.history-list-container::-webkit-scrollbar-thumb){background:var(--color-border);border-radius:3px}
.finanzas-container :deep(.history-labels-list){display:grid;grid-template-columns:1fr 1fr;gap:.4rem;padding:.2rem}.finanzas-container :deep(.history-entry-label){padding:.6rem .8rem;background:var(--color-bg-panel);border:none;border-radius:10px;transition:all .2s;box-shadow:2px 2px 5px rgba(0,0,0,.06);display:flex;flex-direction:column;gap:.3rem}.finanzas-container :deep(.history-entry-label:hover){transform:translateY(-2px);box-shadow:5px 5px 12px rgba(0,0,0,.14)}
.finanzas-container :deep(.label-header){display:flex;justify-content:space-between;align-items:center;padding-bottom:.25rem;border-bottom:1px solid color-mix(in srgb,var(--color-border) 50%,transparent)}.finanzas-container :deep(.label-time){display:flex;align-items:center;gap:.3rem;font-size:.58rem;color:var(--color-text-secondary);min-width:0;flex:1}.finanzas-container :deep(.label-time .text){white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.finanzas-container :deep(.label-indicator){flex-shrink:0;display:inline-flex;align-items:center;gap:.2rem;padding:.12rem .45rem;border-radius:5px;font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--color-success);background:color-mix(in srgb,var(--color-success) 12%,transparent)}.finanzas-container :deep(.label-indicator-neg){color:var(--color-error);background:color-mix(in srgb,var(--color-error) 12%,transparent)}
.finanzas-container :deep(.label-body){padding:.05rem 0}.finanzas-container :deep(.label-desc){margin:0;font-size:.7rem;color:var(--color-text-primary);font-weight:600}
.finanzas-container :deep(.label-footer){display:flex;align-items:center;gap:.35rem;font-size:.58rem;flex-wrap:wrap}.finanzas-container :deep(.footer-segment){display:flex;align-items:center;gap:.2rem;min-width:0}.finanzas-container :deep(.footer-segment .caption){color:var(--color-text-secondary);white-space:nowrap}.finanzas-container :deep(.footer-segment strong){font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.finanzas-container :deep(.footer-divider){width:1px;height:10px;background:color-mix(in srgb,var(--color-border) 60%,transparent);flex-shrink:0}.finanzas-container :deep(.txt-pos){color:var(--color-success);font-weight:700}.finanzas-container :deep(.txt-neg){color:var(--color-error);font-weight:700}.finanzas-container :deep(.txt-balance){color:var(--color-success);font-weight:600}
.finanzas-container :deep(.pagination-footer){display:flex;align-items:center;justify-content:center;gap:.5rem;margin-top:.2rem}.finanzas-container :deep(.nav-btn){padding:.25rem .6rem;border:none;border-radius:6px;background:var(--color-bg-panel);color:var(--color-text-secondary);font-size:.65rem;font-weight:600;cursor:pointer;box-shadow:2px 2px 4px rgba(0,0,0,.06);transition:all .15s}.finanzas-container :deep(.nav-btn:hover:not(:disabled)){box-shadow:4px 4px 8px rgba(0,0,0,.12);color:var(--color-text-primary)}.finanzas-container :deep(.nav-btn:disabled){opacity:.4;cursor:not-allowed;box-shadow:none}.finanzas-container :deep(.page-info){font-size:.62rem;color:var(--color-text-secondary)}.finanzas-container :deep(.page-info strong){color:var(--color-accent)}
.finanzas-container :deep(.empty-state){display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.5rem;color:var(--color-text-secondary);gap:.4rem}.finanzas-container :deep(.empty-icon){font-size:1.8rem;opacity:.4}

.finanzas-container :deep(.ganancias-cards-grid){display:grid;grid-template-columns:repeat(2,1fr);gap:.4rem}.finanzas-container :deep(.ganancia-card){background:linear-gradient(145deg,var(--color-bg-panel) 0%,var(--color-bg-secondary) 100%);border:none;border-radius:14px;box-shadow:4px 4px 10px rgba(0,0,0,.1),-2px -2px 6px rgba(255,255,255,.02),0 0 10px color-mix(in srgb,var(--color-success) 5%,transparent)}.finanzas-container :deep(.ganancia-card.clickable){cursor:pointer}.finanzas-container :deep(.ganancia-card.clickable:hover){transform:translateY(-2px);box-shadow:8px 8px 18px rgba(0,0,0,.2),0 0 14px color-mix(in srgb,var(--color-success) 10%,transparent)}.finanzas-container :deep(.ganancia-card-inner){padding:.85rem 1rem}.finanzas-container :deep(.ganancia-card .card-label){font-size:.6rem}.finanzas-container :deep(.ganancia-card .balance-display){margin:.1rem 0}.finanzas-container :deep(.ganancia-card .balance-amount){font-size:1.8rem}

@media(min-width:1024px){.dashboard-grid{display:grid;grid-template-columns:380px 1fr;grid-template-rows:auto 1fr;gap:.85rem;align-items:stretch}.finanzas-container :deep(.main-stats-section){grid-row:1/3}.finanzas-container :deep(.history-labels-list){grid-template-columns:1fr 1fr;gap:.5rem}.finanzas-container :deep(.history-entry-label){padding:.7rem .9rem}.finanzas-container :deep(.label-footer){flex-wrap:nowrap}}
@media(min-width:768px) and (max-width:1023px){.dashboard-grid{display:grid;grid-template-columns:1fr 1fr;gap:.65rem;align-items:start}.finanzas-container :deep(.main-stats-section){grid-column:1/-1}.finanzas-container :deep(.quick-stats-grid){grid-template-columns:repeat(3,1fr)}.finanzas-container :deep(.history-labels-list){grid-template-columns:1fr 1fr;gap:.35rem}}
@media(max-width:767px){.finanzas-container{padding:.4rem}.dashboard-grid{gap:.5rem}.finanzas-container :deep(.main-stats-section){gap:.5rem}.finanzas-container :deep(.vault-card-inner){padding:.85rem 1rem}.finanzas-container :deep(.quick-stats-grid){grid-template-columns:repeat(2,1fr);gap:.3rem}.finanzas-container :deep(.mini-stat-card){padding:.4rem .6rem;gap:.35rem}.finanzas-container :deep(.stat-icon-circle){width:28px;height:28px;font-size:.8rem}.finanzas-container :deep(.section-card){padding:.7rem .85rem}.finanzas-container :deep(.history-card){padding:.65rem .8rem}.finanzas-container :deep(.history-labels-list){grid-template-columns:1fr;gap:.3rem;padding:.1rem}.finanzas-container :deep(.history-entry-label){padding:.5rem .6rem;flex-direction:row;flex-wrap:wrap;align-items:center;gap:.2rem .5rem}.finanzas-container :deep(.label-header){flex:1 1 100%;min-width:0}.finanzas-container :deep(.label-body){flex:1 1 100%}.finanzas-container :deep(.label-footer){flex:1 1 100%;gap:.3rem}.finanzas-container :deep(.footer-segment){min-width:0;flex:1}.finanzas-container :deep(.footer-segment strong){font-size:.55rem}.finanzas-container :deep(.ganancias-cards-grid){grid-template-columns:1fr 1fr;gap:.3rem}.finanzas-container :deep(.ganancia-card-inner){padding:.7rem .85rem}.finanzas-container :deep(.ganancia-card .balance-amount){font-size:1.5rem}}
@media(max-width:480px){.finanzas-container{padding:.3rem}.dashboard-grid{gap:.4rem}.finanzas-container :deep(.crown-wrapper){width:42px;height:42px}.finanzas-container :deep(.crown-icon){font-size:1.2rem}.finanzas-container :deep(.title-group h1){font-size:1.1rem}.finanzas-container :deep(.balance-amount){font-size:1.7rem}.finanzas-container :deep(.quick-stats-grid){grid-template-columns:1fr 1fr;gap:.25rem}.finanzas-container :deep(.history-card){padding:.55rem .7rem}.finanzas-container :deep(.history-entry-label){padding:.4rem .5rem;gap:.15rem .4rem}.finanzas-container :deep(.label-time .text){font-size:.5rem}.finanzas-container :deep(.label-desc){font-size:.62rem}.finanzas-container :deep(.footer-segment .caption){font-size:.48rem}.finanzas-container :deep(.footer-segment strong){font-size:.52rem}.finanzas-container :deep(.ganancias-cards-grid){grid-template-columns:1fr}.finanzas-container :deep(.ganancia-card .balance-amount){font-size:1.3rem}}
</style>
