<script setup lang="ts">
import { useLogin } from './logica/useLogin';
const { name, pass, sucursalSeleccionada, toastContainer, modalMontoInicialAbierto, currentTheme, seleccionarSucursal, iniciarSesion, registrarMontoInicial, cerrarModalMontoInicial, setTheme } = useLogin();
import './estilos/login-animaciones.css';
import './estilos/login-principal.css';
import './estilos/login-responsivo.css';
import type { Sucursal } from '@/composables/useSucursal';
import type { Theme } from '@/composables/useTheme';
import MontoInicialModal from '../modals/MontoInicialModal.vue';
import LoginAmbiente from './secciones/LoginAmbiente.vue';
import LoginSucursalSelector from './secciones/LoginSucursalSelector.vue';
import LoginForm from './secciones/LoginForm.vue';
import LoginThemeSelector from './secciones/LoginThemeSelector.vue';

</script>

<template>
  <div class="zelda-classic-scene">
    <LoginAmbiente />

    <div class="classic-card">
      <div class="card-glow"></div>
      <div class="card-corner top-left"></div>
      <div class="card-corner top-right"></div>
      <div class="card-corner bottom-left"></div>
      <div class="card-corner bottom-right"></div>

      <div class="triforce-classic" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>

      <h2 class="classic-title">La Leyenda Del Dulce</h2>
      <p class="classic-subtitle">Pulsa Start para entrar al reino</p>

      <LoginSucursalSelector :sucursal-seleccionada="sucursalSeleccionada" @seleccionar="(v: string) => seleccionarSucursal(v as Sucursal)" />

      <LoginForm :name="name" :pass="pass" @update:name="name = $event" @update:pass="pass = $event" @submit="iniciarSesion" />

      <LoginThemeSelector :current-theme="currentTheme" @select-theme="(v: string) => setTheme(v as Theme)" />

      <div ref="toastContainer" class="toast-container"></div>
    </div>

    <MontoInicialModal :open="modalMontoInicialAbierto" @close="cerrarModalMontoInicial" @submit="registrarMontoInicial" />
  </div>
</template>
