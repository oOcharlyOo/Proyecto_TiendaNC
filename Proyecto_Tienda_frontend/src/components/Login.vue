<template>
  <div class="login-scene">
    <div class="login-card">
      <div class="login-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>

      <h2 class="login-title">Mi Negocio POS</h2>
      <p class="login-subtitle">Ingresa tus credenciales</p>

      <form @submit.prevent="iniciarSesion" class="login-form">
        <div>
          <label for="name">Usuario</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Usuario"
            autocomplete="username"
          >
        </div>

        <div>
          <label for="password">Contrasena</label>
          <input
            id="password"
            v-model="pass"
            type="password"
            placeholder="********"
            autocomplete="current-password"
          >
        </div>

        <button type="submit">Iniciar Sesion</button>
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
        if (usuario.datos.avatar) {
          localStorage.setItem('avatarUsuario', usuario.datos.avatar);
        }
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
      mostrarToast("Bienvenido al sistema.", 'success');
      setTimeout(() => {
        router.push('/ventas');
      }, 500);
    } else {
      modalMontoInicialAbierto.value = true;
    }
  } catch (err) {
    console.error("Error al verificar caja activa:", err);
    mostrarToast("Bienvenido al sistema.", 'success');
    setTimeout(() => {
      router.push('/ventas');
    }, 500);
  }
}

async function registrarMontoInicial(payload: { montoInicial: number }) {
  if (!idUsuarioActual.value) return;

  if (payload.montoInicial === 0) {
    localStorage.setItem('montoInicialCaja', '0');
    localStorage.setItem('modoReportes', 'true');
    modalMontoInicialAbierto.value = false;
    mostrarToast("Modo reportes activado.", 'success');
    setTimeout(() => {
      router.push('/ventas');
    }, 500);
    return;
  }

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
      localStorage.setItem('modoReportes', 'false');
      modalMontoInicialAbierto.value = false;
      mostrarToast("Caja iniciada correctamente.", 'success');
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

  toastContainer.value.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
</script>

<style scoped>
.login-scene {
  min-height: 100vh;
  width: 100%;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.login-card {
  width: min(100%, 400px);
  padding: 2rem;
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
  border: 1px solid #475569;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.login-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  border-radius: 50%;
  color: white;
}

.login-title {
  margin: 0;
  text-align: center;
  color: #f1f5f9;
  font-weight: 600;
  font-size: 1.5rem;
}

.login-subtitle {
  margin: 0.5rem 0 1.5rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.875rem;
}

.login-form {
  display: grid;
  gap: 1rem;
}

.login-form label {
  display: block;
  margin-bottom: 0.5rem;
  color: #f1f5f9;
  font-size: 0.875rem;
  font-weight: 500;
}

.login-form input {
  width: 100%;
  border: 1px solid #475569;
  padding: 0.75rem;
  background: #1e293b;
  color: #f1f5f9;
  font-size: 1rem;
  border-radius: 6px;
  outline: none;
  transition: all 0.15s ease;
}

.login-form input::placeholder {
  color: #64748b;
}

.login-form input:focus {
  border-color: #f97316;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.2);
}

.login-form button {
  width: 100%;
  border: none;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  border-radius: 6px;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: all 0.15s ease;
}

.login-form button:hover {
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  transform: translateY(-1px);
}

.login-form button:active {
  transform: translateY(0);
}

.toast-container {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  display: grid;
  gap: 0.5rem;
  z-index: 40;
}

.toast-message {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  color: white;
  font-weight: 500;
  font-size: 0.875rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.toast-success {
  background: #22c55e;
}

.toast-error {
  background: #ef4444;
}

@media (max-width: 480px) {
  .login-card {
    padding: 1.5rem;
  }
  
  .login-icon {
    width: 60px;
    height: 60px;
    margin-bottom: 1rem;
  }
  
  .login-title {
    font-size: 1.25rem;
  }
}
</style>
