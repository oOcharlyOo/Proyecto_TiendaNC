<template>
  <div class="zelda-classic-scene">
    <div class="fog-layer"></div>
    <div class="scanlines"></div>
    <div class="rupee-stars" aria-hidden="true">
      <span class="rupee-star"></span>
      <span class="rupee-star"></span>
      <span class="rupee-star"></span>
      <span class="rupee-star"></span>
      <span class="rupee-star"></span>
      <span class="rupee-star"></span>
      <span class="rupee-star"></span>
      <span class="rupee-star"></span>
      <span class="rupee-star"></span>
      <span class="rupee-star"></span>
    </div>
    <div class="floating-particles" aria-hidden="true">
      <span class="particle"></span>
      <span class="particle"></span>
      <span class="particle"></span>
      <span class="particle"></span>
      <span class="particle"></span>
      <span class="particle"></span>
    </div>

    <div class="link-sprite" aria-hidden="true">
      <div class="link-frame frame1"></div>
      <div class="link-frame frame2"></div>
    </div>

    <div class="octo-sprite" aria-hidden="true">
      <div class="octo-frame frame1"></div>
      <div class="octo-frame frame2"></div>
    </div>

    <div class="classic-card">
      <div class="triforce-classic" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>

      <h2 class="classic-title">La Leyenda Del Dulce</h2>
      <p class="classic-subtitle">Pulsa Start para entrar al reino</p>

      <form @submit.prevent="iniciarSesion" class="classic-form">
        <div>
          <label for="name">Nombre del viajero</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Link"
            autocomplete="username"
          >
        </div>

        <div>
          <label for="password">Contrasena secreta</label>
          <input
            id="password"
            v-model="pass"
            type="password"
            placeholder="........"
            autocomplete="current-password"
          >
        </div>

        <button type="submit">Abrir portal</button>
      </form>

      <div ref="toastContainer" class="toast-container"></div>
    </div>

    <MontoInicialModal
      :open="modalMontoInicialAbierto"
      @close="cerrarModalMontoInicial"
      @submit="registrarMontoInicial"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import MontoInicialModal from './modals/MontoInicialModal.vue';

const AUTH_KEY = 'isAuth';
const AUTH_USER_ID_KEY = 'idUsuario';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const name = ref("");
const pass = ref("");
const toastContainer = ref<HTMLElement | null>(null);
const router = useRouter();
const modalMontoInicialAbierto = ref(false);
const idUsuarioActual = ref<number | null>(null);

async function iniciarSesion() {
  const usuarioDTO = { usuario: name.value, password_hash: pass.value };
  try {
    const resLogin = await fetch(`${API_BASE}/usuarios/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(usuarioDTO)
    });

    const usuario = await resLogin.json();
    if (usuario.codigo === 200) {
      localStorage.setItem(AUTH_KEY, 'true');
      if (usuario?.datos?.idUsuario) {
        const userId = usuario.datos.idUsuario;
        localStorage.setItem(AUTH_USER_ID_KEY, String(userId));
        localStorage.setItem('nombreUsuario', name.value);
        localStorage.setItem('tipoUsuario', String(usuario.datos.id_tipo_usuario || 2));
        idUsuarioActual.value = userId;
        
        await verificarCajaActiva(userId);
      }
    } else {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_USER_ID_KEY);
      mostrarToast(usuario.mensaje || 'Credenciales no validas', 'error');
    }
  } catch (err) {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_USER_ID_KEY);
    mostrarToast("El servidor no responde.", 'error');
    console.error(err);
  }
}

async function verificarCajaActiva(idUsuario: number) {
  try {
    const res = await fetch(`${API_BASE}/caja/apertura/activa?idUsuario=${idUsuario}`);
    const data = await res.json();

    if (res.ok && data.datos !== null) {
      localStorage.setItem('montoInicialCaja', String(data.datos.monto));
      mostrarToast("Bienvenido, heroe.", 'success');
      setTimeout(() => {
        router.push('/ventas');
      }, 500);
    } else {
      modalMontoInicialAbierto.value = true;
    }
  } catch (err) {
    console.error("Error al verificar caja activa:", err);
    mostrarToast("Bienvenido, heroe.", 'success');
    setTimeout(() => {
      router.push('/ventas');
    }, 500);
  }
}

async function registrarMontoInicial(payload: { montoInicial: number }) {
  if (!idUsuarioActual.value) return;

  try {
    const res = await fetch(`${API_BASE}/caja/apertura`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        idUsuario: idUsuarioActual.value,
        montoInicial: payload.montoInicial
      })
    });

    const data = await res.json();

    if (res.ok && data.codigo === 200) {
      localStorage.setItem('montoInicialCaja', String(payload.montoInicial));
      modalMontoInicialAbierto.value = false;
      mostrarToast("Caja iniciada. Bienvenido, heroe.", 'success');
      setTimeout(() => {
        router.push('/ventas');
      }, 500);
    } else {
      mostrarToast(data.mensaje || 'Error al iniciar caja', 'error');
    }
  } catch (err) {
    console.error("Error al registrar monto inicial:", err);
    mostrarToast("Error de conexion.", 'error');
  }
}

function cerrarModalMontoInicial() {
  modalMontoInicialAbierto.value = false;
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_USER_ID_KEY);
  idUsuarioActual.value = null;
  name.value = "";
  pass.value = "";
}

function mostrarToast(mensaje: string, type: 'success' | 'error' = 'success') {
  if (!toastContainer.value) return;

  const toast = document.createElement('div');
  toast.innerText = mensaje;

  toast.classList.add('toast-message');

  if (type === 'success') {
    toast.classList.add('toast-success');
  } else {
    toast.classList.add('toast-error');
  }

  toast.style.opacity = '0';
  toast.style.transform = 'translateY(20px)';
  toast.style.transition = 'opacity 0.5s, transform 0.5s';

  toastContainer.value.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
}
</script>
