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

@keyframes starFloat {
  0%, 100% { 
    transform: translateY(0) rotate(0deg); 
    opacity: 0.4;
  }
  50% { 
    transform: translateY(-12px) rotate(180deg); 
    opacity: 1;
  }
}

@keyframes rupeeGlow {
  0%, 100% { 
    filter: drop-shadow(0 0 3px rgba(248, 214, 103, 0.6)) brightness(1);
    transform: scale(1);
  }
  50% { 
    filter: drop-shadow(0 0 12px rgba(248, 214, 103, 1)) brightness(1.3);
    transform: scale(1.15);
  }
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes fogDrift {
  0% { transform: translateX(-5%) translateY(0) scale(1); }
  50% { transform: translateX(5%) translateY(-5px) scale(1.02); }
  100% { transform: translateX(-5%) translateY(0) scale(1); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.05); }
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

@keyframes shootingStar {
  0% { 
    transform: translateX(0) translateY(0); 
    opacity: 1;
  }
  70% { 
    opacity: 1;
  }
  100% { 
    transform: translateX(300px) translateY(300px); 
    opacity: 0;
  }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes floatUp {
  0% { 
    transform: translateY(100vh) scale(0); 
    opacity: 0;
  }
  10% { 
    opacity: 1; 
    transform: translateY(90vh) scale(1);
  }
  90% { 
    opacity: 1;
  }
  100% { 
    transform: translateY(-10vh) scale(0.5); 
    opacity: 0;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes aurora {
  0%, 100% { 
    transform: translateX(0) skewX(0deg);
    opacity: 0.15;
  }
  25% { 
    transform: translateX(20px) skewX(5deg);
    opacity: 0.25;
  }
  50% { 
    transform: translateX(-10px) skewX(-3deg);
    opacity: 0.2;
  }
  75% { 
    transform: translateX(15px) skewX(2deg);
    opacity: 0.22;
  }
}

@keyframes linkWalk {
  0% { left: -100px; opacity: 1; }
  100% { left: calc(100% + 100px); opacity: 1; }
}

@keyframes linkAppear {
  to { opacity: 1; }
}

@keyframes linkSwing {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes linkSwing2 {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

@keyframes octoWalk {
  0% { left: -100px; }
  100% { left: calc(100% + 100px); }
}

@keyframes octoSwing {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes octoSwing2 {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

@keyframes linkBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes linkLegs {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(2px); }
  75% { transform: translateX(-2px); }
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
    linear-gradient(180deg, #050a08 0%, #07150d 30%, #0a1f18 70%, #07150d 100%);
  background-size: 200% 200%;
  animation: gradientShift 15s ease infinite;
}

.aurora-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: 
    radial-gradient(ellipse 100% 60% at 0% 20%, rgba(31, 91, 53, 0.4) 0%, transparent 50%),
    radial-gradient(ellipse 80% 40% at 100% 30%, rgba(72, 211, 8, 0.15) 0%, transparent 40%),
    radial-gradient(ellipse 60% 30% at 50% 80%, rgba(248, 214, 103, 0.1) 0%, transparent 40%);
  animation: aurora 12s ease-in-out infinite;
  mix-blend-mode: screen;
}

.fog-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: 
    radial-gradient(ellipse 90% 60% at 10% 50%, rgba(31, 91, 53, 0.25) 0%, transparent 50%),
    radial-gradient(ellipse 70% 50% at 90% 40%, rgba(31, 91, 53, 0.2) 0%, transparent 50%),
    radial-gradient(ellipse 50% 30% at 50% 90%, rgba(19, 53, 35, 0.3) 0%, transparent 50%);
  animation: fogDrift 10s ease-in-out infinite;
}

.fog-layer-2 {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: 
    radial-gradient(ellipse 70% 40% at 30% 70%, rgba(31, 91, 53, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse 60% 35% at 70% 20%, rgba(72, 211, 8, 0.1) 0%, transparent 40%);
  animation: fogDrift 15s ease-in-out infinite reverse;
  animation-delay: -5s;
}

.scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.15;
  background-image:
    repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.02) 0 2px,
      rgba(0, 0, 0, 0.03) 2px 4px
    );
  animation: pulse 0.1s ease-in-out infinite;
}

.vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.5) 100%);
}

.rupee-stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.rupee-star {
  position: absolute;
  width: 6px;
  height: 6px;
  background: radial-gradient(circle, #f8d667 0%, #c79634 50%, #8b6914 80%, transparent 100%);
  border-radius: 50%;
  animation: rupeeGlow 2.5s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(248, 214, 103, 0.8);
}

.rupee-star::before {
  content: '';
  position: absolute;
  inset: -8px;
  background: radial-gradient(circle, rgba(248, 214, 103, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.rupee-star:nth-child(1) { top: 8%; left: 15%; animation-delay: 0s; }
.rupee-star:nth-child(2) { top: 5%; left: 85%; animation-delay: 0.3s; width: 5px; height: 5px; }
.rupee-star:nth-child(3) { top: 20%; left: 8%; animation-delay: 0.6s; }
.rupee-star:nth-child(4) { top: 12%; left: 70%; animation-delay: 0.9s; width: 4px; height: 4px; }
.rupee-star:nth-child(5) { top: 75%; left: 5%; animation-delay: 1.2s; }
.rupee-star:nth-child(6) { top: 88%; left: 20%; animation-delay: 1.5s; width: 5px; height: 5px; }
.rupee-star:nth-child(7) { top: 65%; left: 92%; animation-delay: 1.8s; }
.rupee-star:nth-child(8) { top: 85%; left: 75%; animation-delay: 2.1s; width: 4px; height: 4px; }
.rupee-star:nth-child(9) { top: 42%; left: 95%; animation-delay: 2.4s; }
.rupee-star:nth-child(10) { top: 55%; left: 3%; animation-delay: 2.7s; width: 5px; height: 5px; }
.rupee-star:nth-child(11) { top: 30%; left: 50%; animation-delay: 1s; }
.rupee-star:nth-child(12) { top: 60%; left: 60%; animation-delay: 1.4s; width: 4px; height: 4px; }

.floating-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: linear-gradient(135deg, #f8d667, #fff8e0);
  border-radius: 50%;
  animation: starFloat 5s ease-in-out infinite;
  box-shadow: 0 0 6px rgba(248, 214, 103, 0.8);
}

.particle:nth-child(1) { left: 10%; animation-delay: 0s; animation-duration: 6s; }
.particle:nth-child(2) { left: 25%; animation-delay: 1s; animation-duration: 5s; }
.particle:nth-child(3) { left: 40%; animation-delay: 2s; animation-duration: 7s; }
.particle:nth-child(4) { left: 55%; animation-delay: 0.5s; animation-duration: 5.5s; }
.particle:nth-child(5) { left: 70%; animation-delay: 1.5s; animation-duration: 6.5s; }
.particle:nth-child(6) { left: 85%; animation-delay: 2.5s; animation-duration: 4.5s; }
.particle:nth-child(7) { left: 15%; animation-delay: 3s; animation-duration: 7s; }
.particle:nth-child(8) { left: 60%; animation-delay: 0.8s; animation-duration: 5.8s; }
.particle:nth-child(9) { left: 80%; animation-delay: 1.8s; animation-duration: 6.2s; }
.particle:nth-child(10) { left: 35%; animation-delay: 2.8s; animation-duration: 5.2s; }

.fireflies {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.firefly {
  position: absolute;
  width: 3px;
  height: 3px;
  background: #f8d667;
  border-radius: 50%;
  box-shadow: 0 0 10px #f8d667, 0 0 20px #f8d667;
  animation: twinkle 3s ease-in-out infinite, floatUp 8s linear infinite;
}

.firefly:nth-child(1) { left: 20%; animation-delay: 0s, 0s; }
.firefly:nth-child(2) { left: 40%; animation-delay: 1s, 2s; }
.firefly:nth-child(3) { left: 60%; animation-delay: 2s, 4s; }
.firefly:nth-child(4) { left: 80%; animation-delay: 0.5s, 1s; }
.firefly:nth-child(5) { left: 30%; animation-delay: 1.5s, 3s; }
.firefly:nth-child(6) { left: 70%; animation-delay: 2.5s, 5s; }

.light-rays {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: 
    conic-gradient(from 0deg at 50% 0%, transparent 0deg, rgba(248, 214, 103, 0.03) 10deg, transparent 20deg),
    conic-gradient(from 120deg at 80% 20%, transparent 0deg, rgba(72, 211, 8, 0.02) 15deg, transparent 30deg),
    conic-gradient(from 240deg at 20% 80%, transparent 0deg, rgba(248, 214, 103, 0.02) 12deg, transparent 24deg);
  animation: rotate 60s linear infinite;
  mix-blend-mode: screen;
}

.link-sprite {
  position: absolute;
  bottom: 8%;
  width: 180px;
  height: 130px;
  animation: linkWalk 12s linear infinite;
  z-index: 0;
  opacity: 0;
  animation-fill-mode: forwards;
  animation-delay: 3s;
}

.link-frame {
  position: absolute;
  inset: 0;
  image-rendering: pixelated;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  animation: linkSwing 0.8s steps(1) infinite;
}

.frame1 {
  background-image: url('@/assets/img/1.png');
  background-size: 180px 130px;
}

.frame2 {
  background-image: url('@/assets/img/2.png');
  background-size: 100px 130px;
  animation: linkSwing2 0.8s steps(1) infinite;
}

.octo-sprite {
  position: absolute;
  bottom: 8%;
  left: -80px;
  width: 100px;
  height: 100px;
  animation: octoWalk 12s linear infinite;
  z-index: 0;
}

.octo-frame {
  position: absolute;
  inset: 0;
  image-rendering: pixelated;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  animation: octoSwing 0.6s steps(1) infinite;
}

.octo-sprite .frame1 {
  background-image: url('@/assets/img/octo1.png');
  background-size: 100px 100px;
}

.octo-sprite .frame2 {
  background-image: url('@/assets/img/octo2.png');
  background-size: 100px 100px;
  animation: octoSwing2 0.6s steps(1) infinite;
}

.moon-glow {
  position: absolute;
  top: 5%;
  right: 15%;
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, rgba(248, 214, 103, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulse 4s ease-in-out infinite;
  pointer-events: none;
}

.moon-glow::before {
  content: '';
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(248, 214, 103, 0.15) 0%, transparent 60%);
  border-radius: 50%;
  animation: pulse 4s ease-in-out infinite reverse;
}
.rupee-star:nth-child(6) { top: 85%; left: 25%; animation-delay: 1.5s; width: 5px; height: 5px; }
.rupee-star:nth-child(7) { top: 68%; left: 88%; animation-delay: 1.8s; }
.rupee-star:nth-child(8) { top: 82%; left: 72%; animation-delay: 0.4s; width: 4px; height: 4px; }
.rupee-star:nth-child(9) { top: 45%; left: 92%; animation-delay: 1.1s; }
.rupee-star:nth-child(10) { top: 55%; left: 5%; animation-delay: 1.4s; width: 5px; height: 5px; }

.floating-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 3px;
  height: 3px;
  background: rgba(248, 214, 103, 0.7);
  border-radius: 50%;
  animation: starFloat 4s ease-in-out infinite;
}

.particle:nth-child(1) { top: 20%; left: 30%; animation-delay: 0s; }
.particle:nth-child(2) { top: 35%; left: 70%; animation-delay: 0.5s; }
.particle:nth-child(3) { top: 50%; left: 20%; animation-delay: 1s; }
.particle:nth-child(4) { top: 65%; left: 80%; animation-delay: 1.5s; }
.particle:nth-child(5) { top: 80%; left: 40%; animation-delay: 2s; }
.particle:nth-child(6) { top: 15%; left: 55%; animation-delay: 2.5s; }

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

  .link-sprite {
    animation-delay: 5s;
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
