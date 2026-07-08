<script setup lang="ts">
import './estilos/usuarios-layout.css';
import './estilos/usuarios-cards.css';
import './estilos/usuarios-modal.css';
import './estilos/usuarios-ventas.css';
import './estilos/usuarios-asistencias.css';
import './estilos/usuarios-responsive.css';
import { useUsuarios } from './logica/useUsuarios';
const { usuarios, cargando, modalAbierto, editando, modalSueldoAbierto, seccionActiva, ventasPorUsuario, cargandoVentas, filtroMesVentas, diasTrabajados, cargandoAsistencias, avatarPreview, dragando, form, tipoUsuarioActual, esAdmin, puedeEditar, esEdicionPerfilPropio, usuarioTop, cargarUsuarios, cargarVentasPorUsuario, cargarAsistencias, cambiarSeccion, formatoMoneda, formatoFecha, formatoCantidad, abrirModalNuevo, abrirModalEditar, cerrarModal, handleDragOver, handleDragLeave, handleDrop, handleFileSelect, formatAvatarUrl, guardarUsuario, eliminarUsuario, getTipoLabel, getNombreMes, getIniciales, getHorasTotales, getHorasFormateadas, formatoHora, getHorasDelDia, getDiasCalendario, semanasDelMes, getPagoSemanal, getPagoTotal, getSueldoHora, getHorasSemana } = useUsuarios();

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
      :semanas-del-mes="semanasDelMes"
      :get-dias-calendario="getDiasCalendario"
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
      @cargar-asistencias="cargarAsistencias"
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


