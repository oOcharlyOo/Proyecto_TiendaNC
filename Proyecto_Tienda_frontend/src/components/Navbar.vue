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
    { to: '/ventas', label: 'Ventas', adminOnly: false },
    { to: '/productos', label: 'Productos', adminOnly: false },
    { to: '/usuarios', label: 'Usuarios', adminOnly: true },
    { to: '/inventario', label: 'Inventario', adminOnly: true },
    { to: '/corte', label: 'Corte', adminOnly: false }
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
        <span class="brand-title">La Leyenda del Dulce</span>
      </div>

      <button
        type="button"
        class="hamburger triforce-btn"
        :aria-expanded="menuAbierto"
        aria-label="Abrir menu"
        @click="toggleMenu"
      >
        <span class="triforce-icon" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      <ul class="menu-links desktop-links">
        <li v-for="link in links" :key="link.to">
          <RouterLink
            :to="link.to"
            class="menu-link"
            :class="{ activo: route.path === link.to }"
            @click="cerrarMenu"
          >
            {{ link.label }}
          </RouterLink>
        </li>
      </ul>

      <button
        type="button"
        class="user-menu-btn"
        :aria-expanded="menuAbierto"
        aria-label="Menu de usuario"
        @click="toggleMenu"
      >
        <div class="user-avatar-small">
          <img v-if="avatarUsuario" :src="avatarUsuario" alt="Avatar" />
          <span v-else class="avatar-initial">{{ nombreUsuario.charAt(0).toUpperCase() }}</span>
        </div>
      </button>

      <div class="menu" :class="{ abierto: menuAbierto }">
        <div class="menu-user-section">
          <div class="user-avatar">
            <img v-if="avatarUsuario" :src="avatarUsuario" alt="Avatar" />
            <span v-else class="avatar-initial">{{ nombreUsuario.charAt(0).toUpperCase() }}</span>
          </div>
          <span class="user-name">{{ nombreUsuario }}</span>
        </div>

        <ul class="menu-links mobile-only-links">
          <li v-for="link in links" :key="link.to">
            <RouterLink
              :to="link.to"
              class="menu-link"
              :class="{ activo: route.path === link.to }"
              @click="cerrarMenu"
            >
              {{ link.label }}
            </RouterLink>
          </li>
        </ul>

        <div class="theme-selector">
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
          Cerrar sesión
        </button>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.navbar-wrap {
  padding: 0.75rem 0.75rem 0 0.75rem;
  background: var(--bg-primary);
}

.navbar {
  padding: 0.7rem 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  position: relative;
  background: var(--bg-secondary);
  border: var(--border-width-thick) solid var(--accent-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow-color);
}

.brand-title {
  color: var(--accent-color);
  font-size: clamp(0.8rem, 2vw, 1.1rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-shadow: 2px 2px 0 var(--border-color);
  font-weight: 900;
}

.desktop-links {
  list-style: none;
  display: flex;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  gap: 0.5rem;
}

.menu-link {
  display: inline-block;
  border: var(--border-width) solid var(--border-color);
  padding: 0.45rem 0.7rem;
  color: var(--btn-text, var(--bg-primary));
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 45%, var(--gradient-btn-end) 100%);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
  font-weight: 900;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-color) 20%, white), 0 2px 0 var(--border-color);
  transition: all 0.1s;
}

.menu-link.activo {
  filter: brightness(1.1);
  transform: translateY(1px);
  box-shadow: none;
  border-color: var(--accent-hover);
}

.user-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.user-avatar-small {
  width: 42px;
  height: 42px;
  overflow: hidden;
  border: 2px solid var(--accent-color);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 8px color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.user-avatar-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initial {
  font-weight: 900;
  color: var(--accent-color);
}

/* Menú Desplegable */
.menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 240px;
  background: var(--bg-secondary);
  border: var(--border-width-thick) solid var(--accent-color);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  box-shadow: 0 10px 25px var(--shadow-color);
  z-index: 100;
  opacity: 0;
  transform: translateY(-10px);
  pointer-events: none;
  transition: all 0.2s ease-out;
}

.menu.abierto {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.menu-user-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px dashed var(--border-color);
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--accent-color);
}

.user-avatar img { width: 100%; height: 100%; object-fit: cover; }

.user-name {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--accent-color);
  text-transform: uppercase;
}

.mobile-only-links {
  display: none;
  flex-direction: column;
  gap: 0.4rem;
  list-style: none;
  align-content: center;
  align-items: center;
}

.theme-selector {
  padding: 0.5rem 0;
  border-top: 1px solid color-mix(in srgb, var(--border-color) 50%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 50%, transparent);
  align-items: center;
  align-content: center;
  text-align: center;
  justify-content: center;
}

.theme-carousel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  align-content: center;
  justify-content: center;
  justify-items: center;
  text-align: center;
  gap: 0.4rem;
}

.theme-btn {
  width: 38px;
  height: 38px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  background: var(--bg-primary);
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.theme-btn:hover { transform: scale(1.1); border-color: var(--accent-color); }
.theme-btn.active { 
  background: var(--accent-color); 
  border-color: var(--text-primary);
  box-shadow: 0 0 10px var(--accent-color);
}

.logout-btn {
  background: var(--error-color);
  color: var(--text-primary);
  border: var(--border-width) solid var(--border-color);
  padding: 0.6rem;
  text-transform: uppercase;
  font-weight: 900;
  font-size: 0.75rem;
  cursor: pointer;
}

/* Mobile */
.hamburger {
  display: none;
  border: var(--border-width) solid var(--border-color);
  padding: 0.4rem;
  background: var(--bg-primary);
  cursor: pointer;
}

.triforce-icon {
  width: 28px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
}

.triforce-icon span {
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 12px solid var(--accent-color);
}

.triforce-icon span:nth-child(1) { grid-column: 1 / span 2; justify-self: center; }

@media (max-width: 760px) {
  .desktop-links { display: none; }
  .user-menu-btn { display: none; }
  .hamburger { display: block; }
  .mobile-only-links { display: flex; }
  .menu {
    width: 100%;
    right: auto;
    left: 0;
  }
}
</style>
