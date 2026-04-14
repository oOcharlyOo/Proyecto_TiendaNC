<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from '@/composables/useTheme';

const AUTH_KEY = 'isAuth';
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const route = useRoute();
const router = useRouter();
const menuAbierto = ref(false);
const { currentTheme, setTheme, toggleTheme } = useTheme();

const tipoUsuario = computed(() => {
  return Number(localStorage.getItem('tipoUsuario') || 2);
});

const esAdministrador = computed(() => tipoUsuario.value === 1);

const avatarUsuario = computed(() => {
  const avatar = localStorage.getItem('avatarUsuario');
  return formatAvatarUrl(avatar);
});

function formatAvatarUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  
  if (url.startsWith('http')) {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const fileName = path.split('/').pop();
    const folder = path.split('/').slice(-2, -1)[0];
    if (fileName && folder) {
      return `${API_BASE}/imagenes/obtener/${folder}/${fileName}`;
    }
    return url;
  }
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

const nombreUsuario = computed(() => {
  return localStorage.getItem('nombreUsuario') || 'Usuario';
});

const links = computed(() => {
  const linksBase = [
    { to: '/ventas', label: 'Ventas', adminOnly: false, icon: 'sword' },
    { to: '/productos', label: 'Productos', adminOnly: false, icon: 'potion' },
    { to: '/usuarios', label: 'Usuarios', adminOnly: false, icon: 'hero' },
    { to: '/inventario', label: 'Inventario', adminOnly: true, icon: 'chest' },
    { to: '/corte', label: 'Corte', adminOnly: false, icon: 'rupee' },
    { to: '/rental', label: 'Rental', adminOnly: false, icon: 'clock' },
    { to: '/finanzas', label: 'Finanzas', adminOnly: true, icon: 'triforce' }
  ];
  return linksBase.filter(l => !l.adminOnly || esAdministrador.value);
});

function toggleMenu() {
  menuAbierto.value = !menuAbierto.value;
}

function cerrarMenu() {
  menuAbierto.value = false;
}

function cerrarSesion() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem('tipoUsuario');
  menuAbierto.value = false;
  router.push('/');
}
</script>

<template>
  <header class="navbar-wrap">
    <nav class="navbar panel">
      <div class="brand">
        <div class="brand-text">
          <span class="brand-title">La Leyenda</span>
          <span class="brand-subtitle">Del Dulce</span>
        </div>
        <div class="brand-decoration left">
          <svg viewBox="0 0 30 30" class="rupee-icon">
            <polygon points="15,2 25,8 25,22 15,28 5,22 5,8" fill="#f8d667" opacity="0.6"/>
            <polygon points="15,6 21,10 21,20 15,24 9,20 9,10" fill="var(--bg-primary)" opacity="0.8"/>
          </svg>
        </div>
        <div class="brand-decoration right">
          <svg viewBox="0 0 30 30" class="rupee-icon">
            <polygon points="15,2 25,8 25,22 15,28 5,22 5,8" fill="#f8d667" opacity="0.6"/>
            <polygon points="15,6 21,10 21,20 15,24 9,20 9,10" fill="var(--bg-primary)" opacity="0.8"/>
          </svg>
        </div>
      </div>

      <button
        type="button"
        class="hamburger triforce-btn"
        :class="{ active: menuAbierto }"
        :aria-expanded="menuAbierto"
        aria-label="Abrir menu"
        @click="toggleMenu"
      >
        <div class="triforce-hamburger" :class="{ open: menuAbierto }">
          <span class="tf-piece"></span>
          <span class="tf-piece"></span>
          <span class="tf-piece"></span>
        </div>
      </button>

      <ul class="menu-links desktop-links">
        <li v-for="link in links" :key="link.to">
          <RouterLink
            :to="link.to"
            class="menu-link"
            :class="{ activo: route.path === link.to }"
            @click="cerrarMenu"
          >
            <span class="link-icon" :class="link.icon"></span>
            <span class="link-text">{{ link.label }}</span>
            <span class="link-shine"></span>
          </RouterLink>
        </li>
      </ul>

      <button
        type="button"
        class="user-menu-btn"
        :class="{ active: menuAbierto }"
        :aria-expanded="menuAbierto"
        aria-label="Menu de usuario"
        @click="toggleMenu"
      >
        <div class="user-avatar-small">
          <div class="avatar-frame">
            <img v-if="avatarUsuario" :src="avatarUsuario" alt="Avatar" />
            <span v-else class="avatar-initial">{{ nombreUsuario.charAt(0).toUpperCase() }}</span>
          </div>
          <div class="avatar-glow"></div>
        </div>
      </button>

      <Transition name="menu-fade">
        <div class="menu" v-if="menuAbierto" @click="cerrarMenu">
          <div class="menu-corner top-left"></div>
          <div class="menu-corner top-right"></div>
          <div class="menu-corner bottom-left"></div>
          <div class="menu-corner bottom-right"></div>
          
          <div class="menu-header-pattern"></div>
          
          <div class="menu-user-section">
            <div class="user-avatar">
              <div class="avatar-frame-large">
                <img v-if="avatarUsuario" :src="avatarUsuario" alt="Avatar" />
                <span v-else class="avatar-initial">{{ nombreUsuario.charAt(0).toUpperCase() }}</span>
              </div>
              <div class="avatar-glow-large"></div>
            </div>
            <span class="user-name">{{ nombreUsuario }}</span>
            <span class="user-badge" v-if="esAdministrador">
              <svg viewBox="0 0 20 20" class="badge-icon">
                <polygon points="10,2 18,8 18,16 10,22 2,16 2,8" fill="var(--zelda-gold)"/>
                <text x="10" y="15" text-anchor="middle" fill="var(--bg-primary)" font-size="10" font-weight="bold">★</text>
              </svg>
              Administrador
            </span>
          </div>

          <div class="menu-links-container">
            <RouterLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              class="menu-link-mobile"
              :class="{ activo: route.path === link.to }"
              @click="cerrarMenu"
            >
              <span class="link-icon" :class="link.icon"></span>
              <span class="link-text">{{ link.label }}</span>
            </RouterLink>
          </div>

          <div class="theme-selector">
            <div class="theme-label">
              <svg viewBox="0 0 24 24" class="theme-icon">
                <circle cx="12" cy="12" r="10" fill="none" stroke="var(--zelda-gold)" stroke-width="2"/>
                <circle cx="12" cy="12" r="4" fill="var(--zelda-gold)"/>
              </svg>
              <span>Seleccionar Tema</span>
            </div>
            <div class="theme-carousel">
              <button 
                type="button" 
                class="theme-btn" 
                :class="{ active: currentTheme === 'zelda' }"
                @click="setTheme('zelda')"
                title="Tema Zelda"
              >
                🛡️
              </button>
              <button 
                type="button" 
                class="theme-btn" 
                :class="{ active: currentTheme === 'alforja' }"
                @click="setTheme('alforja')"
                title="Tema Alforja"
              >
                🎒
              </button>
              <button 
                type="button" 
                class="theme-btn" 
                :class="{ active: currentTheme === 'skyward' }"
                @click="setTheme('skyward')"
                title="Tema Skyward"
              >
                ☁️
              </button>
              <button 
                type="button" 
                class="theme-btn" 
                :class="{ active: currentTheme === 'deathmountain' }"
                @click="setTheme('deathmountain')"
                title="Tema Muerte Montaña"
              >
                🌋
              </button>
              <button 
                type="button" 
                class="theme-btn dark" 
                :class="{ active: currentTheme === 'darkforest' }"
                @click="setTheme('darkforest')"
                title="Tema Bosque Oscuro"
              >
                🌲
              </button>
              <button 
                type="button" 
                class="theme-btn dark" 
                :class="{ active: currentTheme === 'darkmountain' }"
                @click="setTheme('darkmountain')"
                title="Tema Montaña Oscura"
              >
                ⛰️
              </button>
              <button 
                type="button" 
                class="theme-btn dark" 
                :class="{ active: currentTheme === 'darkskyward' }"
                @click="setTheme('darkskyward')"
                title="Tema Cielo Oscuro"
              >
                🌙
              </button>
              <button 
                type="button" 
                class="theme-btn dark" 
                :class="{ active: currentTheme === 'darknight' }"
                @click="setTheme('darknight')"
                title="Tema Noche Oscura"
              >
                ⭐
              </button>
            </div>
          </div>

          <button type="button" class="logout-btn" @click="cerrarSesion">
            <svg viewBox="0 0 24 24" class="logout-icon">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke="currentColor" stroke-width="2"/>
              <polyline points="16 17 21 12 16 7" fill="none" stroke="currentColor" stroke-width="2"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </Transition>
    </nav>
  </header>
</template>

<style scoped>
.navbar-wrap {
  padding: 0.75rem 0.75rem 0 0.75rem;
  background: var(--bg-primary);
  position: relative;
}

.navbar-wrap::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--zelda-gold), transparent);
  opacity: 0.6;
}

.navbar {
  padding: 0.6rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  position: relative;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-panel) 100%);
  border: var(--border-width-thick) solid var(--accent-color);
  border-radius: 12px;
  box-shadow: 
    0 4px 12px var(--shadow-color),
    inset 0 1px 0 color-mix(in srgb, var(--accent-color) 30%, white),
    0 0 30px color-mix(in srgb, var(--accent-color) 10%, transparent);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  position: relative;
}

.triforce-brand {
  width: 42px;
  height: 50px;
  animation: triforceFloat 3s ease-in-out infinite;
}

.triforce-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--zelda-gold) 50%, transparent));
}

@keyframes triforceFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.brand-title {
  color: var(--accent-color);
  font-size: clamp(0.9rem, 1.5vw, 1.2rem);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-shadow: 
    2px 2px 0 var(--border-color),
    0 0 10px color-mix(in srgb, var(--zelda-gold) 40%, transparent);
  font-weight: 900;
  animation: titleGlow 2s ease-in-out infinite alternate;
}

.brand-subtitle {
  color: var(--zelda-gold);
  font-size: clamp(0.7rem, 1.2vw, 0.95rem);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 700;
  opacity: 0.9;
}

@keyframes titleGlow {
  from { text-shadow: 2px 2px 0 var(--border-color), 0 0 10px color-mix(in srgb, var(--zelda-gold) 30%, transparent); }
  to { text-shadow: 2px 2px 0 var(--border-color), 0 0 20px color-mix(in srgb, var(--zelda-gold) 60%, transparent), 0 0 30px color-mix(in srgb, var(--zelda-gold) 30%, transparent); }
}

.brand-decoration {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.5;
  animation: rupeePulse 2s ease-in-out infinite;
}

.brand-decoration.left {
  left: -18px;
}

.brand-decoration.right {
  right: -18px;
  animation-delay: 1s;
}

.rupee-icon {
  width: 20px;
  height: 20px;
}

@keyframes rupeePulse {
  0%, 100% { opacity: 0.4; transform: translateY(-50%) scale(1); }
  50% { opacity: 0.8; transform: translateY(-50%) scale(1.1); }
}

.desktop-links {
  list-style: none;
  display: flex;
  gap: 0.4rem;
}

.menu-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-width: 90px;
  padding: 0.5rem 0.8rem;
  color: var(--text-primary);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: clamp(0.65rem, 0.8vw, 0.75rem);
  font-weight: 800;
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 45%, var(--gradient-btn-end) 100%);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 
    inset 0 0 0 1px color-mix(in srgb, var(--accent-color) 20%, white),
    0 3px 0 var(--border-color),
    0 4px 8px var(--shadow-color);
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
}

.menu-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.4s ease;
}

.menu-link:hover::before {
  left: 100%;
}

.menu-link:hover {
  transform: translateY(-2px);
  box-shadow: 
    inset 0 0 0 1px color-mix(in srgb, var(--accent-color) 40%, white),
    0 5px 0 var(--border-color),
    0 6px 15px var(--shadow-color),
    0 0 20px color-mix(in srgb, var(--zelda-gold) 30%, transparent);
  border-color: var(--accent-hover);
}

.menu-link.activo {
  transform: translateY(1px);
  box-shadow: 
    inset 0 0 0 2px var(--accent-hover),
    0 1px 0 var(--border-color),
    0 0 25px color-mix(in srgb, var(--zelda-gold) 50%, transparent);
  border-color: var(--accent-hover);
  color: var(--btn-text);
}

.link-icon {
  width: 14px;
  height: 14px;
  display: inline-block;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.9;
}

.link-icon.sword::before { content: '⚔'; font-size: 12px; }
.link-icon.potion::before { content: '🧪'; font-size: 11px; }
.link-icon.hero::before { content: '👤'; font-size: 11px; }
.link-icon.chest::before { content: '📦'; font-size: 11px; }
.link-icon.rupee::before { content: '💎'; font-size: 11px; }
.link-icon.triforce::before { content: '🔺'; font-size: 11px; }
.link-icon.clock::before { content: '⏱️'; font-size: 11px; }

.link-text {
  position: relative;
  z-index: 1;
}

.user-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s ease;
}

.user-menu-btn:hover {
  transform: scale(1.05);
}

.user-avatar-small {
  position: relative;
  width: 44px;
  height: 44px;
}

.avatar-frame {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--accent-color);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  box-shadow: 
    0 0 10px color-mix(in srgb, var(--zelda-gold) 40%, transparent),
    inset 0 0 10px color-mix(in srgb, var(--accent-color) 20%, transparent);
}

.avatar-frame::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--zelda-gold);
  opacity: 0.5;
  animation: frameSpin 8s linear infinite;
}

@keyframes frameSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.avatar-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 60px;
  height: 60px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, var(--zelda-gold) 0%, transparent 70%);
  opacity: 0.3;
  animation: avatarPulse 2s ease-in-out infinite;
  z-index: 1;
}

@keyframes avatarPulse {
  0%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.4; transform: translate(-50%, -50%) scale(1.2); }
}

.avatar-initial {
  font-size: 1.2rem;
  font-weight: 900;
  color: var(--accent-color);
  text-shadow: 0 0 10px var(--zelda-gold);
}

/* Menu Desplegable */
.menu {
  position: absolute;
  top: calc(100% + 0.6rem);
  right: 0;
  width: 280px;
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-secondary) 100%);
  border: var(--border-width-thick) solid var(--accent-color);
  border-radius: 12px;
  padding: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 
    0 15px 40px var(--shadow-color),
    0 0 30px color-mix(in srgb, var(--zelda-gold) 15%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--accent-color) 30%, white);
  z-index: 100;
  overflow: hidden;
}

.menu-corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid var(--zelda-gold);
  opacity: 0.5;
}

.menu-corner.top-left { top: 8px; left: 8px; border-right: none; border-bottom: none; }
.menu-corner.top-right { top: 8px; right: 8px; border-left: none; border-bottom: none; }
.menu-corner.bottom-left { bottom: 8px; left: 8px; border-right: none; border-top: none; }
.menu-corner.bottom-right { bottom: 8px; right: 8px; border-left: none; border-top: none; }

.menu-header-pattern {
  height: 4px;
  background: repeating-linear-gradient(
    90deg,
    var(--zelda-gold) 0px,
    var(--zelda-gold) 10px,
    transparent 10px,
    transparent 20px
  );
  opacity: 0.3;
}

.menu-user-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-bottom: 1px dashed var(--border-color);
}

.user-avatar {
  position: relative;
}

.avatar-frame-large {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--accent-color);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 0 15px color-mix(in srgb, var(--zelda-gold) 40%, transparent),
    inset 0 0 15px color-mix(in srgb, var(--accent-color) 20%, transparent);
  position: relative;
}

.avatar-frame-large::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px dashed var(--zelda-gold);
  opacity: 0.4;
  animation: frameSpin 12s linear infinite reverse;
}

.avatar-frame-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-glow-large {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 90px;
  height: 90px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, var(--zelda-gold) 0%, transparent 70%);
  opacity: 0.25;
  animation: avatarPulse 2s ease-in-out infinite;
  z-index: -1;
}

.user-name {
  font-size: 1rem;
  font-weight: 800;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: var(--zelda-gold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-icon {
  width: 16px;
  height: 16px;
}

.menu-links-container {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.8rem;
}

.menu-link-mobile {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.8rem;
  color: var(--text-primary);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
  font-weight: 700;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.menu-link-mobile:hover {
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-end) 100%);
  border-color: var(--accent-color);
  transform: translateX(5px);
  color: var(--btn-text);
}

.menu-link-mobile.activo {
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 50%, var(--gradient-btn-end) 100%);
  border-color: var(--accent-hover);
  box-shadow: 0 0 15px color-mix(in srgb, var(--zelda-gold) 30%, transparent);
}

.theme-selector {
  padding: 0.8rem;
  border-top: 1px solid color-mix(in srgb, var(--border-color) 50%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 50%, transparent);
}

.theme-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.6rem;
}

.theme-icon {
  width: 14px;
  height: 14px;
}

.theme-carousel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  justify-items: center;
}

.theme-btn {
  width: 38px;
  height: 38px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--accent-color);
}

.theme-btn {
  font-size: 1.3rem;
  line-height: 1;
}

.theme-btn:hover {
  transform: scale(1.1) rotate(5deg);
  border-color: var(--accent-color);
  box-shadow: 0 0 12px color-mix(in srgb, var(--zelda-gold) 40%, transparent);
}

.theme-btn.active {
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-end) 100%);
  border-color: var(--zelda-gold);
  box-shadow: 
    0 0 15px color-mix(in srgb, var(--zelda-gold) 50%, transparent),
    inset 0 0 8px rgba(255,255,255,0.2);
  color: var(--btn-text);
  transform: scale(1.05);
}

.theme-btn.dark {
  border-color: color-mix(in srgb, var(--border-color) 70%, black);
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0.8rem;
  padding: 0.7rem;
  background: linear-gradient(180deg, #c75a5a 0%, #a04040 100%);
  color: #fff;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  text-transform: uppercase;
  font-weight: 800;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 3px 0 var(--border-color);
}

.logout-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 0 var(--border-color), 0 0 20px rgba(199, 90, 90, 0.4);
}

.logout-btn:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 var(--border-color);
}

.logout-icon {
  width: 16px;
  height: 16px;
}

/* Hamburger */
.hamburger {
  display: none;
  border: 2px solid var(--border-color);
  padding: 0.5rem;
  background: var(--bg-primary);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.hamburger:hover {
  border-color: var(--accent-color);
  box-shadow: 0 0 15px color-mix(in srgb, var(--zelda-gold) 30%, transparent);
}

.hamburger.active {
  background: var(--accent-color);
  border-color: var(--zelda-gold);
}

.triforce-hamburger {
  width: 24px;
  height: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 0;
  position: relative;
}

.tf-piece {
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 10px solid #f8d667;
  transition: all 0.3s ease;
  justify-self: center;
  align-self: end;
}

.tf-piece:nth-child(1) {
  grid-column: 1 / span 2;
  grid-row: 1;
  align-self: end;
}

.tf-piece:nth-child(2) {
  grid-column: 1;
  grid-row: 2;
  align-self: start;
  margin-top: -2px;
}

.tf-piece:nth-child(3) {
  grid-column: 2;
  grid-row: 2;
  align-self: start;
  margin-top: -2px;
}

.triforce-hamburger.open .tf-piece:nth-child(1) {
  border-bottom-color: var(--btn-text);
}

.triforce-hamburger.open .tf-piece:nth-child(2) {
  border-bottom-color: var(--btn-text);
}

.triforce-hamburger.open .tf-piece:nth-child(3) {
  border-bottom-color: var(--btn-text);
}

/* Menu Fade Transition */
.menu-fade-enter-active {
  animation: menuSlideIn 0.25s ease-out;
}

.menu-fade-leave-active {
  animation: menuSlideOut 0.2s ease-in;
}

@keyframes menuSlideIn {
  from {
    opacity: 0;
    transform: translateY(-15px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes menuSlideOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
}

/* Responsive */
@media (max-width: 900px) {
  .desktop-links {
    display: none;
  }
  .user-menu-btn {
    display: none;
  }
  .hamburger {
    display: block;
  }
  
  .brand-title {
    font-size: clamp(0.75rem, 2.5vw, 1rem);
  }
  
  .brand-subtitle {
    font-size: clamp(0.6rem, 2vw, 0.8rem);
  }
  
  .brand-decoration {
    display: none;
  }
  
  .triforce-brand {
    width: 36px;
    height: 42px;
  }
}

@media (max-width: 480px) {
  .navbar-wrap {
    padding: 0.5rem 0.5rem 0 0.5rem;
  }
  
  .navbar {
    padding: 0.5rem 0.7rem;
    gap: 0.5rem;
  }
  
  .triforce-brand {
    width: 30px;
    height: 36px;
  }
  
  .brand-text {
    gap: 0;
  }
  
  .brand-title {
    font-size: 0.7rem;
    letter-spacing: 0.05em;
  }
  
  .brand-subtitle {
    font-size: 0.55rem;
  }
  
  .hamburger {
    padding: 0.4rem;
  }
  
  .triforce-hamburger {
    width: 22px;
    height: 18px;
  }
  
  .tf-piece {
    border-left-width: 6px;
    border-right-width: 6px;
    border-bottom-width: 10px;
  }
  
  .menu {
    width: 100%;
    right: auto;
    left: 0;
    border-radius: 0 0 12px 12px;
    max-height: 85vh;
    overflow-y: auto;
  }

  .menu-user-section {
    padding: 0.6rem;
    gap: 0.3rem;
  }

  .avatar-frame-large {
    width: 50px;
    height: 50px;
  }

  .avatar-glow-large {
    width: 65px;
    height: 65px;
  }

  .user-name {
    font-size: 0.85rem;
  }

  .user-badge {
    font-size: 0.6rem;
  }

  .menu-links-container {
    padding: 0.5rem;
    gap: 0.25rem;
  }

  .menu-link-mobile {
    padding: 0.5rem 0.6rem;
    font-size: 0.7rem;
  }

  .theme-selector {
    padding: 0.5rem;
  }

  .theme-label {
    font-size: 0.55rem;
    margin-bottom: 0.4rem;
  }

  .theme-carousel {
    grid-template-columns: repeat(4, 1fr);
    gap: 0.3rem;
  }

  .theme-btn {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }

  .theme-btn svg {
    width: 20px;
    height: 20px;
  }

  .logout-btn {
    margin: 0.5rem;
    padding: 0.5rem;
    font-size: 0.65rem;
  }

  .logout-icon {
    width: 14px;
    height: 14px;
  }
}

@media (min-width: 2000px) {
  .navbar {
    padding: 0.8rem 1.5rem;
    gap: 1.5rem;
  }
  
  .brand-title {
    font-size: 1.4rem;
  }
  
  .brand-subtitle {
    font-size: 1.1rem;
  }
  
  .triforce-brand {
    width: 56px;
    height: 66px;
  }
  
  .menu-link {
    min-width: 120px;
    padding: 0.7rem 1.2rem;
    font-size: 0.9rem;
  }
  
  .user-avatar-small {
    width: 54px;
    height: 54px;
  }
}
</style>
