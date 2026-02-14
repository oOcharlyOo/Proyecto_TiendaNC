<template>
  <div class="zelda-classic-scene">
    <div class="scanlines"></div>
    <div class="rupee-stars" aria-hidden="true"></div>

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
const API_BASE = 'http://localhost:8080';

const name = ref("");
const pass = ref("");
const toastContainer = ref<HTMLElement | null>(null);
const router = useRouter();
const modalMontoInicialAbierto = ref(false);
const idUsuarioActual = ref<number | null>(null);

async function iniciarSesion() {
  const usuarioDTO = { nombre: name.value, password_hash: pass.value };
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

<style scoped>
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes triforceGlow {
  0%, 100% {
    filter: drop-shadow(0 0 4px rgba(248, 214, 103, 0.6));
  }
  50% {
    filter: drop-shadow(0 0 12px rgba(248, 214, 103, 1));
  }
}

.zelda-classic-scene {
  --pixel-gold: #f8d667;
  --pixel-amber: #c79634;
  --pixel-forest: #1f5b35;
  --pixel-forest-dark: #133523;
  --pixel-bg: #07150d;
  --pixel-sky: #11261b;
  --pixel-ink: #1a1401;
  --pixel-paper: #f6f2de;
  min-height: 100vh;
  width: 100%;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, var(--pixel-sky) 0%, #0a1912 35%, var(--pixel-bg) 100%);
}

.scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.22;
  background-image:
    repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.035) 0 2px,
      rgba(0, 0, 0, 0.05) 2px 4px
    );
}

.rupee-stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
  background-image:
    radial-gradient(circle at 12% 22%, rgba(248, 214, 103, 0.45) 0 2px, transparent 3px),
    radial-gradient(circle at 78% 18%, rgba(248, 214, 103, 0.45) 0 2px, transparent 3px),
    radial-gradient(circle at 20% 80%, rgba(248, 214, 103, 0.38) 0 2px, transparent 3px),
    radial-gradient(circle at 87% 74%, rgba(248, 214, 103, 0.38) 0 2px, transparent 3px);
}

.classic-card {
  width: min(100%, 470px);
  position: relative;
  z-index: 1;
  padding: 1.5rem;
  background: linear-gradient(180deg, var(--pixel-forest) 0%, var(--pixel-forest-dark) 100%);
  border: 4px solid var(--pixel-gold);
  box-shadow:
    0 0 0 4px #2f1f09,
    0 14px 0 #271c0f,
    0 20px 28px rgba(0, 0, 0, 0.5);
  image-rendering: pixelated;
  animation: fadeSlideIn 400ms ease-out;
}

.classic-card::before {
  content: "";
  position: absolute;
  inset: 8px;
  border: 2px dashed rgba(248, 214, 103, 0.45);
  pointer-events: none;
}

.triforce-classic {
  width: 72px;
  margin: 0 auto 0.8rem auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  animation: triforceGlow 2s ease-in-out infinite;
}

.triforce-classic span {
  display: block;
  width: 0;
  height: 0;
  border-left: 17px solid transparent;
  border-right: 17px solid transparent;
  border-bottom: 29px solid var(--pixel-gold);
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.55));
}

.triforce-classic span:nth-child(1) {
  grid-column: 1 / span 2;
  justify-self: center;
}

.triforce-classic span:nth-child(2),
.triforce-classic span:nth-child(3) {
  justify-self: center;
}

.classic-title {
  margin: 0;
  text-align: center;
  color: var(--pixel-gold);
  text-transform: uppercase;
  font-weight: 900;
  font-family: "Courier New", monospace;
  font-size: clamp(1rem, 2.6vw, 1.5rem);
  letter-spacing: 0.09em;
  text-shadow:
    2px 2px 0 #000,
    -1px -1px 0 #000;
  animation: fadeSlideIn 500ms ease-out 100ms backwards;
}

.classic-subtitle {
  margin: 0.4rem 0 1.25rem 0;
  text-align: center;
  color: var(--pixel-paper);
  font-family: "Courier New", monospace;
  font-size: clamp(0.72rem, 2.2vw, 0.85rem);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  animation: fadeSlideIn 500ms ease-out 200ms backwards;
}

.classic-form {
  display: grid;
  gap: 0.95rem;
}

.classic-form > div {
  animation: fadeSlideIn 500ms ease-out 300ms backwards;
}

.classic-form button {
  margin-top: 0.2rem;
  animation: fadeSlideIn 500ms ease-out 400ms backwards;
}

.classic-form label {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--pixel-paper);
  font-size: clamp(0.74rem, 2vw, 0.82rem);
  font-family: "Courier New", monospace;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.classic-form input {
  width: 100%;
  border: 3px solid #2a1807;
  padding: 0.7rem 0.7rem;
  background: #f2e8bf;
  color: #272013;
  font-family: "Courier New", monospace;
  font-size: clamp(0.8rem, 2.1vw, 0.95rem);
  outline: none;
  box-shadow: inset 0 0 0 2px #d4c27e;
  transition: transform 120ms steps(2), filter 120ms linear, box-shadow 120ms linear;
}

.classic-form input::placeholder {
  color: #7f7044;
}

.classic-form input:focus {
  filter: brightness(1.04);
  box-shadow: inset 0 0 0 2px #e1cc80, 0 0 0 2px #f8d667;
  transform: translateY(-1px);
}

.classic-form button {
  width: 100%;
  border: 3px solid #2a1807;
  padding: 0.82rem 1rem;
  font-size: clamp(0.84rem, 2.3vw, 0.98rem);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-family: "Courier New", monospace;
  color: var(--pixel-ink);
  background:
    linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  cursor: pointer;
  box-shadow:
    inset 0 0 0 2px #ffeeb4,
    0 4px 0 #6f4b1c,
    0 8px 16px rgba(0, 0, 0, 0.35);
  transition: transform 120ms steps(2), filter 120ms linear, box-shadow 120ms linear;
}

.classic-form button:hover {
  filter: brightness(1.06);
  transform: translateY(-2px);
}

.classic-form button:active {
  transform: translateY(2px);
  box-shadow:
    inset 0 0 0 2px #ffeeb4,
    0 2px 0 #6f4b1c;
}

.classic-form button::before {
  content: "🗡️ ";
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
  padding: 0.65rem 0.85rem;
  border-radius: 0;
  border: 2px solid #000;
  color: #fff;
  font-weight: 700;
  font-family: "Courier New", monospace;
  box-shadow: 3px 3px 0 #000;
  animation: fadeSlideIn 200ms ease-out;
}

.toast-success {
  background: #1a8f52;
}

.toast-success::before {
  content: "✨ ";
}

.toast-error {
  background: #b7393f;
}

.toast-error::before {
  content: "⚠️ ";
}

@media (max-width: 700px) {
  .zelda-classic-scene {
    padding: 1rem;
  }

  .classic-card {
    width: min(100%, 390px);
    padding: 1rem;
    border-width: 3px;
    box-shadow:
      0 0 0 3px #2f1f09,
      0 10px 0 #271c0f,
      0 16px 20px rgba(0, 0, 0, 0.45);
  }

  .classic-card::before {
    inset: 6px;
  }
}

@media (max-width: 430px) {
  .classic-title {
    letter-spacing: 0.05em;
  }

  .classic-subtitle {
    margin-bottom: 1rem;
  }

  .classic-form {
    gap: 0.8rem;
  }

  .classic-form button {
    padding: 0.75rem 0.7rem;
  }
}
</style>
