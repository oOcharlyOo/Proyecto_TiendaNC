<script setup lang="ts">
import { computed } from 'vue';
import { useUsuarios } from './logica/useUsuarios';
const { usuarios, cargando, modalAbierto, editando, modalSueldoAbierto, seccionActiva, ventasPorUsuario, cargandoVentas, filtroMesVentas, diasTrabajados, cargandoAsistencias, avatarPreview, dragando, form, tipoUsuarioActual, esAdmin, puedeEditar, esEdicionPerfilPropio, usuarioTop, cargarUsuarios, cargarVentasPorUsuario, cargarAsistencias, cambiarSeccion, formatoMoneda, formatoFecha, formatoCantidad, abrirModalNuevo, abrirModalEditar, cerrarModal, handleDragOver, handleDragLeave, handleDrop, handleFileSelect, formatAvatarUrl, guardarUsuario, eliminarUsuario, getTipoLabel, getNombreMes, getIniciales, getHorasTotales, getHorasFormateadas, formatoHora, getHorasDelDia, getDiasCalendario, semanasDelMes, getPagoSemanal, getPagoTotal, getSueldoHora, getHorasSemana } = useUsuarios();

const semanasDelMesArray = computed(() => {
  if (!diasTrabajados.value) return [];
  return semanasDelMes(diasTrabajados.value.mes, diasTrabajados.value.anio);
});

import UsuariosHeader from './secciones/UsuariosHeader.vue';
import UsuariosTabs from './secciones/UsuariosTabs.vue';
import UsuariosStats from './secciones/UsuariosStats.vue';
import UsuariosList from './secciones/UsuariosList.vue';
import UsuariosVentas from './secciones/UsuariosVentas.vue';
import UsuariosAsistencias from './secciones/UsuariosAsistencias.vue';
import UsuariosModal from './secciones/UsuariosModal.vue';

import SueldoXHoraModal from '../modals/SueldoXHoraModal.vue';

</script>

<template>
  <main class="usuarios-layout">
    <div class="bg-fog"></div>
    <div class="bg-scanlines"></div>

    <UsuariosHeader />

    <UsuariosTabs
      :seccion-activa="seccionActiva"
      :es-admin="esAdmin"
      @update:seccion-activa="cambiarSeccion"
    />

    <UsuariosStats
      v-if="seccionActiva === 'usuarios'"
      :usuarios="usuarios"
    />

    <UsuariosList
      v-if="seccionActiva === 'usuarios'"
      :usuarios="usuarios"
      :cargando="cargando"
      :es-admin="esAdmin"
      :tipo-usuario-actual="tipoUsuarioActual"
      :puede-editar="puedeEditar"
      :format-avatar-url="formatAvatarUrl"
      :get-tipo-label="getTipoLabel"
      @abrir-modal-nuevo="abrirModalNuevo"
      @abrir-modal-editar="(u) => abrirModalEditar(u)"
      @eliminar-usuario="(id) => eliminarUsuario(id)"
      @abrir-sueldos="modalSueldoAbierto = true"
    />

    <UsuariosVentas
      v-if="seccionActiva === 'ventas'"
      :ventas-por-usuario="ventasPorUsuario"
      :cargando-ventas="cargandoVentas"
      :filtro-mes-ventas="filtroMesVentas"
      :usuario-top="usuarioTop"
      :format-avatar-url="formatAvatarUrl"
      :formato-moneda="formatoMoneda"
      :formato-fecha="formatoFecha"
      :formato-cantidad="formatoCantidad"
      @cargar-ventas="cargarVentasPorUsuario"
      @update:filtro-mes-ventas="filtroMesVentas = $event"
    />

    <UsuariosAsistencias
      v-if="seccionActiva === 'asistencias'"
      :dias-trabajados="diasTrabajados"
      :cargando-asistencias="cargandoAsistencias"
      :filtro-mes-ventas="filtroMesVentas"
      :es-admin="esAdmin"
      :semanas-del-mes="semanasDelMesArray"
      :format-avatar-url="formatAvatarUrl"
      :get-nombre-mes="getNombreMes"
      :get-iniciales="getIniciales"
      :formato-hora="formatoHora"
      :get-horas-formateadas="getHorasFormateadas"
      :get-horas-totales="getHorasTotales"
      :get-horas-del-dia="getHorasDelDia"
      :get-pago-semanal="getPagoSemanal"
      :get-pago-total="getPagoTotal"
      :get-sueldo-hora="getSueldoHora"
      :get-horas-semana="getHorasSemana"
      :formato-moneda="formatoMoneda"
      @cargar-asistencias="() => { const [y, m] = (filtroMesVentas || '').split('-'); cargarAsistencias(Number(m), Number(y)); }"
      @update:filtro-mes-ventas="filtroMesVentas = $event"
    />

    <UsuariosModal
      :modal-abierto="modalAbierto"
      :editando="editando"
      :form="form"
      :avatar-preview="avatarPreview"
      :dragando="dragando"
      :es-admin="esAdmin"
      :es-edicion-perfil-propio="esEdicionPerfilPropio"
      @cerrar-modal="cerrarModal"
      @guardar-usuario="guardarUsuario"
      @handle-drag-over="handleDragOver"
      @handle-drag-leave="handleDragLeave"
      @handle-drop="handleDrop"
      @handle-file-select="handleFileSelect"
    />

    <SueldoXHoraModal
      :open="modalSueldoAbierto"
      @close="modalSueldoAbierto = false"
      @save="() => { cargarUsuarios(); modalSueldoAbierto = false; }"
    />
  </main>
</template>

<style scoped>
.usuarios-layout{height:100dvh;width:100%;padding:1rem;overflow:hidden auto;display:flex;flex-direction:column;background:linear-gradient(180deg,var(--gradient-bg-start) 0%,var(--gradient-bg-mid) 50%,var(--color-bg-primary) 100%);position:relative}
.bg-fog,.bg-scanlines{display:none}
.usuarios-layout :deep(.hero-section){display:flex;align-items:center;justify-content:center;padding:.75rem 1.5rem 1rem;gap:.75rem;flex-shrink:0}
.usuarios-layout :deep(.hero-decoration){font-size:2rem;color:color-mix(in srgb,var(--color-accent) 50%,transparent);opacity:.5;user-select:none}
.usuarios-layout :deep(.hero-content){text-align:center}
.usuarios-layout :deep(.hero-title){display:flex;align-items:center;justify-content:center;gap:.5rem;margin:0;font-size:1.3rem;font-weight:900;color:var(--color-accent);text-transform:uppercase;letter-spacing:.06em}
.usuarios-layout :deep(.title-icon){font-size:1.4rem}
.usuarios-layout :deep(.hero-subtitle){margin:.15rem 0 0;font-size:.7rem;color:var(--color-text-secondary);letter-spacing:.03em}
.usuarios-layout :deep(.tabs-section){padding:0 1.5rem;flex-shrink:0}
.usuarios-layout :deep(.tabs-container){display:flex;gap:0;background:var(--color-bg-panel);border:none;border-radius:12px 12px 0 0;overflow:hidden;box-shadow:inset 0 -1px 0 var(--color-border)}
.usuarios-layout :deep(.tab-btn){padding:.7rem 1.4rem;background:transparent;border:none;border-bottom:3px solid transparent;color:var(--color-text-secondary);font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;cursor:pointer;display:flex;align-items:center;gap:.45rem;transition:all .2s;margin-bottom:-1px;position:relative}
.usuarios-layout :deep(.tab-btn:hover){color:var(--color-text-primary);background:color-mix(in srgb,var(--color-accent) 5%,transparent)}
.usuarios-layout :deep(.tab-btn.active){color:var(--color-accent);border-bottom-color:var(--color-accent);background:color-mix(in srgb,var(--color-accent) 10%,transparent)}
.usuarios-layout :deep(.tab-icon){font-size:1.05rem}
.usuarios-layout :deep(.tab-text){font-family:inherit}
.usuarios-layout :deep(.tab-badge){font-size:.55rem;padding:.1rem .4rem;border-radius:4px;background:color-mix(in srgb,var(--color-accent) 20%,transparent);color:var(--color-accent);font-weight:800}
.usuarios-layout :deep(.stats-section){display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;padding:.75rem 1.5rem;flex-shrink:0}
.usuarios-layout :deep(.stat-card-wrapper){position:relative;background:var(--color-bg-secondary);border:none;border-radius:12px;padding:1rem 1.1rem;display:flex;align-items:center;gap:.85rem;box-shadow:4px 4px 10px rgba(0,0,0,.12),-2px -2px 6px rgba(255,255,255,.02);overflow:hidden}
.usuarios-layout :deep(.stat-card-wrapper.gold){box-shadow:4px 4px 10px rgba(0,0,0,.12),-2px -2px 6px rgba(255,255,255,.02),0 0 14px color-mix(in srgb,var(--color-accent) 18%,transparent)}
.usuarios-layout :deep(.stat-card-wrapper.success){box-shadow:4px 4px 10px rgba(0,0,0,.12),-2px -2px 6px rgba(255,255,255,.02),0 0 10px color-mix(in srgb,var(--color-success) 15%,transparent)}
.usuarios-layout :deep(.stat-glow){position:absolute;inset:8px;pointer-events:none;border-radius:6px;box-shadow:inset 0 0 20px color-mix(in srgb,var(--color-accent) 8%,transparent)}
.usuarios-layout :deep(.stat-icon-wrapper){width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:var(--color-bg-primary);border-radius:50%;box-shadow:inset 2px 2px 5px rgba(0,0,0,.12);flex-shrink:0}
.usuarios-layout :deep(.stat-icon){font-size:1.4rem}
.usuarios-layout :deep(.stat-info){display:flex;flex-direction:column;flex:1}
.usuarios-layout :deep(.stat-value){font-size:1.4rem;font-weight:900;color:var(--color-text-primary);line-height:1.1}
.usuarios-layout :deep(.stat-label){font-size:.65rem;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.05em}
.usuarios-layout :deep(.stat-decoration){position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:1.5rem;opacity:.08;color:var(--color-text-primary);pointer-events:none;user-select:none}
.usuarios-layout :deep(.seccion-usuarios){flex:1;min-height:0;overflow-y:auto;padding:1rem 1.5rem;display:flex;flex-direction:column;gap:1rem}
.usuarios-layout :deep(.header-actions){display:flex;gap:.6rem;flex-wrap:wrap}
.usuarios-layout :deep(.usuarios-grid){display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:.85rem}
.usuarios-layout :deep(.usuario-card){display:flex;align-items:center;gap:1rem;background:var(--color-bg-secondary);border:none;border-radius:14px;padding:1rem 1.15rem;transition:all .2s;box-shadow:4px 4px 10px rgba(0,0,0,.12),-2px -2px 6px rgba(255,255,255,.02)}
.usuarios-layout :deep(.usuario-card:hover){transform:translateY(-3px);box-shadow:8px 8px 20px rgba(0,0,0,.2),-4px -4px 12px rgba(255,255,255,.03)}
.usuarios-layout :deep(.avatar-container){position:relative;width:52px;height:52px;flex-shrink:0}
.usuarios-layout :deep(.avatar-img){width:52px;height:52px;border-radius:50%;object-fit:cover;box-shadow:3px 3px 6px rgba(0,0,0,.15)}
.usuarios-layout :deep(.avatar-ring){position:absolute;inset:-3px;border-radius:50%;border:2px solid color-mix(in srgb,var(--color-accent) 30%,transparent);pointer-events:none}
.usuarios-layout :deep(.avatar-placeholder){width:52px;height:52px;border-radius:50%;background:var(--color-bg-primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.2rem;color:var(--color-accent);box-shadow:inset 2px 2px 5px rgba(0,0,0,.12)}
.usuarios-layout :deep(.usuario-info){flex:1;min-width:0;display:flex;flex-direction:column;gap:.1rem}
.usuarios-layout :deep(.usuario-nombre){margin:0;font-size:.9rem;font-weight:800;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.usuarios-layout :deep(.usuario-user){font-size:.68rem;color:var(--color-text-secondary);font-family:monospace}
.usuarios-layout :deep(.tipo-badge){display:inline-flex;align-items:center;gap:.2rem;padding:.12rem .5rem;border-radius:5px;font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;background:color-mix(in srgb,var(--color-info) 12%,transparent);color:var(--color-info);box-shadow:1px 1px 3px rgba(0,0,0,.06);width:fit-content}
.usuarios-layout :deep(.tipo-badge.admin){background:color-mix(in srgb,var(--color-accent) 15%,transparent);color:var(--color-accent)}
.usuarios-layout :deep(.badge-icon){font-size:.7rem}
.usuarios-layout :deep(.usuario-actions){display:flex;gap:.3rem;flex-shrink:0}
.usuarios-layout :deep(.btn-edit),.usuarios-layout :deep(.btn-delete){width:36px;height:36px;border:none;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.95rem;transition:all .2s;box-shadow:3px 3px 6px rgba(0,0,0,.1)}
.usuarios-layout :deep(.btn-edit){background:var(--color-bg-primary);color:var(--color-accent)}
.usuarios-layout :deep(.btn-edit:hover){background:var(--color-accent);color:var(--color-on-brand);transform:translateY(-2px);box-shadow:5px 5px 10px rgba(0,0,0,.18)}
.usuarios-layout :deep(.btn-delete){background:var(--color-bg-primary);color:var(--color-error)}
.usuarios-layout :deep(.btn-delete:hover){background:var(--color-error);color:#fff;transform:translateY(-2px);box-shadow:5px 5px 10px rgba(0,0,0,.18)}
.usuarios-layout :deep(.btn-delete:disabled){opacity:.4;cursor:not-allowed;transform:none;box-shadow:2px 2px 4px rgba(0,0,0,.05)}
.usuarios-layout :deep(.loading){display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;padding:3rem 1rem;color:var(--color-text-secondary)}
.usuarios-layout :deep(.loading-spinner){width:44px;height:44px;border:4px solid var(--color-border);border-top-color:var(--color-accent);border-radius:50%;animation:spUs 1s linear infinite}
@keyframes spUs{to{transform:rotate(360deg)}}
.usuarios-layout :deep(.empty-state){display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;padding:3rem 1rem;color:var(--color-text-secondary);text-align:center}
.usuarios-layout :deep(.empty-icon){font-size:2.5rem;opacity:.5}
.usuarios-layout :deep(.btn-primary){border:none;padding:.6rem 1.2rem;font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-family:inherit;color:var(--color-on-brand);background:var(--color-accent);cursor:pointer;box-shadow:4px 4px 10px rgba(0,0,0,.2),-1px -1px 4px rgba(255,255,255,.04);transition:all .2s;display:inline-flex;align-items:center;gap:.4rem;border-radius:8px}
.usuarios-layout :deep(.btn-primary:hover){transform:translateY(-2px);box-shadow:6px 6px 16px rgba(0,0,0,.28),-3px -3px 8px rgba(255,255,255,.05)}
.usuarios-layout :deep(.btn-primary:active){transform:translateY(1px);box-shadow:inset 2px 2px 5px rgba(0,0,0,.2)}
.usuarios-layout :deep(.btn-primary:disabled){opacity:.5;cursor:not-allowed;transform:none}
.usuarios-layout :deep(.btn-secondary){border:none;padding:.55rem .85rem;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-family:inherit;color:var(--color-text-secondary);background:var(--color-bg-secondary);cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,.1),-1px -1px 3px rgba(255,255,255,.02);transition:all .2s;display:inline-flex;align-items:center;gap:.35rem;border-radius:8px}
.usuarios-layout :deep(.btn-secondary:hover:not(:disabled)){transform:translateY(-2px);box-shadow:5px 5px 12px rgba(0,0,0,.18);color:var(--color-text-primary)}
.usuarios-layout :deep(.btn-secondary:active:not(:disabled)){transform:translateY(1px);box-shadow:inset 2px 2px 4px rgba(0,0,0,.15)}
.usuarios-layout :deep(.btn-secondary:disabled){opacity:.5;cursor:not-allowed;transform:none}
.usuarios-layout :deep(.btn-icon){font-size:1rem}
.usuarios-layout :deep(.seccion-ventas){flex:1;min-height:0;overflow-y:auto;padding:1rem 1.5rem;display:flex;flex-direction:column;gap:.85rem}
.usuarios-layout :deep(.ventas-filtros){display:flex;gap:.75rem;flex-wrap:wrap;align-items:flex-end}
.usuarios-layout :deep(.filtro-group){display:flex;flex-direction:column;gap:.25rem}.usuarios-layout :deep(.filtro-group label){font-size:.68rem;color:var(--color-text-secondary);font-weight:600;text-transform:uppercase}
.usuarios-layout :deep(.filtro-fecha){display:flex;gap:.4rem;align-items:center}
.usuarios-layout :deep(.filtro-fecha input){padding:.5rem .65rem;background:var(--color-bg-primary);border:none;border-radius:8px;color:var(--color-text-primary);font-size:.85rem;outline:none;box-shadow:inset 2px 2px 4px rgba(0,0,0,.12)}
.usuarios-layout :deep(.filtro-fecha input:focus){box-shadow:inset 2px 2px 4px rgba(0,0,0,.12),0 0 0 2px var(--color-accent)}
.usuarios-layout :deep(.btn-load){border:none;padding:.5rem .9rem;font-size:.72rem;font-weight:700;text-transform:uppercase;background:var(--color-accent);color:var(--color-on-brand);cursor:pointer;border-radius:8px;box-shadow:3px 3px 6px rgba(0,0,0,.15);transition:all .2s}
.usuarios-layout :deep(.btn-load:hover:not(:disabled)){transform:translateY(-1px);box-shadow:5px 5px 10px rgba(0,0,0,.2)}
.usuarios-layout :deep(.btn-load:disabled){opacity:.5;cursor:not-allowed}
.usuarios-layout :deep(.top-vendedor){display:flex;align-items:center;gap:1rem;background:var(--color-bg-secondary);border:none;border-radius:14px;padding:1rem 1.25rem;box-shadow:4px 4px 10px rgba(0,0,0,.12),-2px -2px 6px rgba(255,255,255,.02),0 0 18px color-mix(in srgb,var(--color-accent) 15%,transparent)}
.usuarios-layout :deep(.top-badge){font-size:2.5rem;flex-shrink:0}
.usuarios-layout :deep(.top-info){display:flex;flex-direction:column;gap:.15rem;flex:1}
.usuarios-layout :deep(.top-label){font-size:.62rem;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.06em}
.usuarios-layout :deep(.top-nombre){margin:0;font-size:1rem;font-weight:800;color:var(--color-accent)}
.usuarios-layout :deep(.top-stats){display:flex;gap:.8rem;font-size:.75rem;color:var(--color-success);font-weight:600}
.usuarios-layout :deep(.usuarios-ventas-grid){display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:.75rem}
.usuarios-layout :deep(.usuario-ventas-card){background:var(--color-bg-secondary);border:none;border-radius:14px;padding:1rem 1.15rem;display:flex;flex-direction:column;gap:.75rem;box-shadow:4px 4px 10px rgba(0,0,0,.12),-2px -2px 6px rgba(255,255,255,.02);transition:all .2s}
.usuarios-layout :deep(.usuario-ventas-card:hover){transform:translateY(-2px);box-shadow:8px 8px 20px rgba(0,0,0,.2)}
.usuarios-layout :deep(.usuario-ventas-card.top){box-shadow:4px 4px 10px rgba(0,0,0,.12),-2px -2px 6px rgba(255,255,255,.02),0 0 16px color-mix(in srgb,var(--color-accent) 15%,transparent)}
.usuarios-layout :deep(.usuario-ventas-header){display:flex;align-items:center;gap:.75rem}
.usuarios-layout :deep(.usuario-avatar-small){width:40px;height:40px;flex-shrink:0}.usuarios-layout :deep(.usuario-avatar-small img){width:40px;height:40px;border-radius:50%;object-fit:cover;box-shadow:2px 2px 5px rgba(0,0,0,.12)}
.usuarios-layout :deep(.avatar-placeholder-small){width:40px;height:40px;border-radius:50%;background:var(--color-bg-primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem;color:var(--color-accent);box-shadow:inset 2px 2px 4px rgba(0,0,0,.1)}
.usuarios-layout :deep(.usuario-ventas-info){flex:1;min-width:0}.usuarios-layout :deep(.usuario-ventas-info h4){margin:0;font-size:.82rem;font-weight:700;color:var(--color-text-primary)}
.usuarios-layout :deep(.usuario-ventas-info .usuario-user){font-size:.65rem;color:var(--color-text-secondary)}
.usuarios-layout :deep(.usuario-ventas-total){text-align:right}.usuarios-layout :deep(.usuario-ventas-total .total-label){font-size:.6rem;color:var(--color-text-secondary);text-transform:uppercase;display:block}.usuarios-layout :deep(.usuario-ventas-total strong){font-size:1.2rem;color:var(--color-success)}
.usuarios-layout :deep(.usuario-ventas-stats){display:flex;gap:.5rem}.usuarios-layout :deep(.stat-item){display:flex;align-items:center;gap:.3rem;padding:.3rem .6rem;background:var(--color-bg-primary);border-radius:6px;font-size:.7rem;box-shadow:inset 1px 1px 3px rgba(0,0,0,.06)}.usuarios-layout :deep(.stat-item .stat-icon){font-size:.8rem}.usuarios-layout :deep(.stat-item .stat-value){font-weight:700;color:var(--color-text-primary)}.usuarios-layout :deep(.stat-item .stat-label){font-size:.6rem;color:var(--color-text-secondary)}
.usuarios-layout :deep(.usuario-productos){display:flex;flex-direction:column;gap:.4rem}.usuarios-layout :deep(.usuario-productos h5){margin:0;font-size:.7rem;color:var(--color-text-secondary);text-transform:uppercase}
.usuarios-layout :deep(.productos-list){display:flex;flex-direction:column;gap:.2rem}.usuarios-layout :deep(.producto-item){display:flex;align-items:center;gap:.5rem;padding:.2rem .5rem;background:var(--color-bg-primary);border-radius:5px;font-size:.7rem}.usuarios-layout :deep(.producto-nombre){flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-text-primary)}.usuarios-layout :deep(.producto-qty){color:var(--color-info);font-weight:600}.usuarios-layout :deep(.producto-monto){color:var(--color-success);font-weight:700}.usuarios-layout :deep(.productos-more){font-size:.65rem;color:var(--color-text-secondary);font-style:italic}
.usuarios-layout :deep(.usuario-ventas-detalles){display:flex;flex-direction:column;gap:.3rem}.usuarios-layout :deep(.usuario-ventas-detalles h5){margin:0;font-size:.7rem;color:var(--color-text-secondary);text-transform:uppercase}
.usuarios-layout :deep(.ventas-list){display:flex;flex-direction:column;gap:.15rem}.usuarios-layout :deep(.venta-item){display:flex;align-items:center;gap:.5rem;padding:.15rem .5rem;background:var(--color-bg-primary);border-radius:4px;font-size:.68rem}.usuarios-layout :deep(.venta-ticket){color:var(--color-accent);font-weight:700}.usuarios-layout :deep(.venta-fecha){color:var(--color-text-secondary)}.usuarios-layout :deep(.venta-monto){margin-left:auto;color:var(--color-success);font-weight:700}
.usuarios-layout :deep(.seccion-asistencias){flex:1;min-height:0;overflow-y:auto;padding:1rem 1.5rem;display:flex;flex-direction:column;gap:.85rem}
.usuarios-layout :deep(.asistencias-content){display:flex;flex-direction:column;gap:1rem}
.usuarios-layout :deep(.calendario-header h3){margin:0;font-size:1rem;color:var(--color-accent);font-weight:800}
.usuarios-layout :deep(.calendario-grid){display:flex;flex-direction:column;gap:.25rem;background:var(--color-bg-secondary);border:none;border-radius:14px;padding:1rem;box-shadow:4px 4px 10px rgba(0,0,0,.12),-2px -2px 6px rgba(255,255,255,.02)}
.usuarios-layout :deep(.dias-semana){display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.usuarios-layout :deep(.dias-semana span){text-align:center;font-size:.6rem;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.04em;padding:.3rem 0}
.usuarios-layout :deep(.calendario-dias){display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.usuarios-layout :deep(.dia-cell){min-height:58px;background:var(--color-bg-primary);border:none;border-radius:8px;padding:4px;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:.65rem;font-weight:700;color:var(--color-text-secondary);transition:all .15s;box-shadow:2px 2px 4px rgba(0,0,0,.08);overflow:hidden}
.usuarios-layout :deep(.dia-cell.dia-vacio){opacity:.2;box-shadow:none;background:transparent}
.usuarios-layout :deep(.dia-cell.dia-hoy){box-shadow:2px 2px 4px rgba(0,0,0,.08),0 0 10px color-mix(in srgb,var(--color-accent) 35%,transparent);color:var(--color-accent)}
.usuarios-layout :deep(.dia-cell.dia-trabajado){background:color-mix(in srgb,var(--color-success) 6%,var(--color-bg-primary))}
.usuarios-layout :deep(.dia-numero){font-size:.6rem;font-weight:800;line-height:1}
.usuarios-layout :deep(.dia-vacio-text){font-size:.55rem;opacity:.4}
.usuarios-layout :deep(.dia-hoy-text){font-size:.5rem;color:var(--color-accent);font-weight:800}
.usuarios-layout :deep(.dia-total-horas){font-size:.5rem;color:var(--color-info);font-weight:700;margin-top:auto}
.usuarios-layout :deep(.dia-trabajadores){display:flex;flex-direction:column;gap:1px;width:100%}
.usuarios-layout :deep(.trabajador-chip){display:flex;align-items:center;gap:2px;padding:1px 4px;border-radius:3px;font-size:.48rem;font-weight:600;white-space:nowrap;overflow:hidden;background:color-mix(in srgb,var(--color-info) 12%,var(--color-bg-primary));color:var(--color-info);box-shadow:1px 1px 2px rgba(0,0,0,.05)}
.usuarios-layout :deep(.trabajador-chip.trabajando){background:color-mix(in srgb,var(--color-success) 15%,var(--color-bg-primary));color:var(--color-success)}
.usuarios-layout :deep(.trabajador-chip.mas){background:var(--color-bg-primary);color:var(--color-text-secondary);justify-content:center;font-weight:700}
.usuarios-layout :deep(.trabajador-inicial){font-weight:800;flex-shrink:0}
.usuarios-layout :deep(.trabajador-horas){margin-left:auto;opacity:.8}
.usuarios-layout :deep(.trabajador-apertura){opacity:.7;font-size:.44rem}
.usuarios-layout :deep(.trabajando-badge){font-size:.4rem;flex-shrink:0}
.usuarios-layout :deep(.usuarios-asistencia){display:flex;flex-direction:column;gap:.6rem}
.usuarios-layout :deep(.usuarios-asistencia h3){margin:0;font-size:.9rem;color:var(--color-accent);font-weight:800}
.usuarios-layout :deep(.usuarios-asistencia-grid){display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:.65rem}
.usuarios-layout :deep(.usuario-asistencia-card){background:var(--color-bg-secondary);border:none;border-radius:12px;padding:.85rem 1rem;display:flex;flex-direction:column;gap:.5rem;box-shadow:3px 3px 8px rgba(0,0,0,.1),-1px -1px 4px rgba(255,255,255,.02)}
.usuarios-layout :deep(.usuario-asistencia-header){display:flex;align-items:center;gap:.6rem}
.usuarios-layout :deep(.usuario-asistencia-info){flex:1}.usuarios-layout :deep(.usuario-asistencia-info h4){margin:0;font-size:.78rem;font-weight:700;color:var(--color-text-primary)}
.usuarios-layout :deep(.usuario-stats-row){display:flex;gap:.4rem;margin-top:.2rem}.usuarios-layout :deep(.stat-badge){display:flex;align-items:center;gap:.2rem;padding:.1rem .4rem;background:var(--color-bg-primary);border-radius:4px;font-size:.6rem;color:var(--color-text-secondary);box-shadow:inset 1px 1px 2px rgba(0,0,0,.05)}.usuarios-layout :deep(.stat-badge.highlight){color:var(--color-accent);font-weight:700}.usuarios-layout :deep(.stat-icon-small){font-size:.65rem}
.usuarios-layout :deep(.dias-laborados-mini){display:flex;flex-wrap:wrap;gap:3px}
.usuarios-layout :deep(.dia-chip){display:flex;align-items:center;gap:2px;padding:2px 6px;border-radius:4px;font-size:.6rem;font-weight:600;background:var(--color-bg-primary);color:var(--color-text-secondary);box-shadow:1px 1px 2px rgba(0,0,0,.06)}.usuarios-layout :deep(.dia-chip.sin-cierre){background:color-mix(in srgb,var(--color-success) 12%,var(--color-bg-primary));color:var(--color-success)}.usuarios-layout :deep(.dia-num){font-weight:800}.usuarios-layout :deep(.dia-apertura){opacity:.7;font-size:.5rem}.usuarios-layout :deep(.dia-horas){opacity:.8;font-weight:600}.usuarios-layout :deep(.dia-trabajando-text){font-size:.5rem}
.usuarios-layout :deep(.pago-semanal-section){display:flex;flex-direction:column;gap:.6rem}.usuarios-layout :deep(.pago-semanal-section h3){margin:0;font-size:.9rem;color:var(--color-accent);font-weight:800}
.usuarios-layout :deep(.pago-semanal-table-wrapper){overflow-x:auto}.usuarios-layout :deep(.pago-semanal-table){width:100%;border-collapse:collapse;font-size:.78rem;background:var(--color-bg-secondary);border-radius:12px;overflow:hidden;box-shadow:3px 3px 8px rgba(0,0,0,.1)}.usuarios-layout :deep(.pago-semanal-table thead){background:var(--color-bg-panel)}.usuarios-layout :deep(.pago-semanal-table th){padding:.6rem .7rem;text-align:left;font-weight:700;color:var(--color-accent);text-transform:uppercase;font-size:.62rem;letter-spacing:.05em;border-bottom:1px solid var(--color-border);white-space:nowrap}.usuarios-layout :deep(.pago-semanal-table td){padding:.5rem .7rem;border-bottom:1px solid rgba(255,255,255,.02);color:var(--color-text-primary)}.usuarios-layout :deep(.pago-semanal-table tr:hover td){background:color-mix(in srgb,var(--color-accent) 4%,transparent)}
.usuarios-layout :deep(.pago-usuario-info){display:flex;align-items:center;gap:.4rem}.usuarios-layout :deep(.pago-avatar){width:28px;height:28px;border-radius:50%;object-fit:cover}.usuarios-layout :deep(.pago-avatar-placeholder){width:28px;height:28px;border-radius:50%;background:var(--color-bg-primary);display:flex;align-items:center;justify-content:center;font-size:.55rem;font-weight:800;color:var(--color-accent)}
.usuarios-layout :deep(.pago-usuario-nombre){display:flex;flex-direction:column}.usuarios-layout :deep(.pago-usuario-nombre span){font-weight:700;font-size:.8rem}.usuarios-layout :deep(.pago-usuario-nombre small){font-size:.58rem;color:var(--color-text-secondary)}.usuarios-layout :deep(.pago-usuario-nombre small.sin-sueldo){color:var(--color-error);font-style:italic}
.usuarios-layout :deep(.pago-cell-content){display:flex;flex-direction:column;align-items:center;gap:1px}.usuarios-layout :deep(.pago-cell-horas){font-size:.65rem;color:var(--color-info);font-weight:600}.usuarios-layout :deep(.pago-cell-horas.total){font-weight:700}.usuarios-layout :deep(.pago-cell-monto){font-size:.75rem;color:var(--color-success);font-weight:700}.usuarios-layout :deep(.pago-cell-monto.total){font-weight:900}
.usuarios-layout :deep(.pago-cell.total){background:color-mix(in srgb,var(--color-accent) 8%,transparent)}
@media(max-width:992px){.usuarios-layout :deep(.stats-section){grid-template-columns:repeat(3,1fr)}.usuarios-layout :deep(.usuarios-grid){grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}}
@media(max-width:768px){
  .usuarios-layout{padding:.5rem}
  .usuarios-layout :deep(.hero-section){padding:.6rem 1rem;flex-wrap:wrap}.usuarios-layout :deep(.hero-decoration){display:none}.usuarios-layout :deep(.hero-title){font-size:1.1rem}.usuarios-layout :deep(.title-icon){font-size:1.2rem}
  .usuarios-layout :deep(.tabs-section){padding:0 1rem}.usuarios-layout :deep(.tab-btn){padding:.6rem .85rem;font-size:.75rem}
  .usuarios-layout :deep(.stats-section){grid-template-columns:repeat(2,1fr);gap:.5rem;padding:.6rem 1rem}.usuarios-layout :deep(.stat-card-wrapper){padding:.75rem .85rem}.usuarios-layout :deep(.stat-icon-wrapper){width:38px;height:38px}.usuarios-layout :deep(.stat-value){font-size:1.2rem}
  .usuarios-layout :deep(.seccion-usuarios),.usuarios-layout :deep(.seccion-ventas),.usuarios-layout :deep(.seccion-asistencias){padding:.75rem 1rem}
  .usuarios-layout :deep(.usuarios-grid){grid-template-columns:1fr}.usuarios-layout :deep(.usuarios-ventas-grid){grid-template-columns:1fr}
  .usuarios-layout :deep(.calendario-grid){padding:.75rem}.usuarios-layout :deep(.dia-cell){min-height:46px;font-size:.55rem}.usuarios-layout :deep(.trabajador-chip){font-size:.44rem}
  .usuarios-layout :deep(.usuarios-asistencia-grid){grid-template-columns:1fr}
  .usuarios-layout :deep(.pago-semanal-table){font-size:.7rem}.usuarios-layout :deep(.pago-semanal-table th),.usuarios-layout :deep(.pago-semanal-table td){padding:.35rem .45rem}
}
@media(max-width:480px){
  .usuarios-layout :deep(.hero-title){font-size:.95rem}.usuarios-layout :deep(.tabs-container){border-radius:8px 8px 0 0}.usuarios-layout :deep(.tab-btn){padding:.55rem .5rem;font-size:.68rem}.usuarios-layout :deep(.tab-icon){font-size:.9rem}.usuarios-layout :deep(.tab-badge){font-size:.48rem}
  .usuarios-layout :deep(.stats-section){grid-template-columns:1fr 1fr;gap:.4rem;padding:.5rem .75rem}
  .usuarios-layout :deep(.seccion-usuarios),.usuarios-layout :deep(.seccion-ventas),.usuarios-layout :deep(.seccion-asistencias){padding:.5rem .75rem}
  .usuarios-layout :deep(.usuario-card){padding:.75rem .85rem}.usuarios-layout :deep(.avatar-container){width:42px;height:42px}.usuarios-layout :deep(.avatar-img){width:42px;height:42px}.usuarios-layout :deep(.avatar-placeholder){width:42px;height:42px;font-size:1rem}
  .usuarios-layout :deep(.calendario-grid){padding:.5rem}.usuarios-layout :deep(.dia-cell){min-height:36px;border-radius:6px;padding:2px}.usuarios-layout :deep(.dia-numero){font-size:.5rem}.usuarios-layout :deep(.trabajador-chip){font-size:.4rem}
  .usuarios-layout :deep(.pago-semanal-table){font-size:.62rem}.usuarios-layout :deep(.pago-semanal-table th),.usuarios-layout :deep(.pago-semanal-table td){padding:.25rem .3rem}
}
</style>
