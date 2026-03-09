<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from '@/composables/useTheme';

const AUTH_KEY = 'isAuth';

const route = useRoute();
const router = useRouter();
const menuAbierto = ref(false);
const { currentTheme, setTheme, toggleTheme } = useTheme();

const tipoUsuario = computed(() => {
  return Number(localStorage.getItem('tipoUsuario') || 2);
});

const esAdministrador = computed(() => tipoUsuario.value === 1);

const avatarUsuario = computed(() => {
  return localStorage.getItem('avatarUsuario') || null;
});

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

        <ul class="menu-links">
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
          <div class="theme-carousel" ref="carouselRef">
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
          Cerrar sesion
        </button>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.navbar-wrap {
  padding: 0.75rem 0.75rem 0 0.75rem;
}

.navbar {
  padding: 0.7rem 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  position: relative;
}

.brand-title {
  color: #f8d667;
  font-size: clamp(0.8rem, 2vw, 1.1rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-shadow: 2px 2px 0 #000;
  font-weight: 900;
}

.menu {
  display: flex;
  align-items: center;
  width: auto;
  gap: 0.75rem;
  justify-content: flex-end;
}

.menu-user-section {
  display: none;
}

.menu-links {
  list-style: none;
  display: flex;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  justify-content: center;
  align-items: center;
  gap: 0.45rem;
}

.menu-link {
  display: inline-block;
  border: 2px solid #2a1807;
  padding: 0.45rem 0.65rem;
  color: #1a1401;
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.74rem;
  font-weight: 900;
  box-shadow:
    inset 0 0 0 1px #ffeeb4,
    0 2px 0 #6f4b1c;
}

.menu-link.activo {
  filter: brightness(1.1);
  transform: translateY(1px);
}

.theme-selector {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  justify-content: center;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.theme-selector::-webkit-scrollbar {
  display: none;
}

.theme-carousel {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 0.3rem;
  justify-content: center;
  flex-wrap: wrap;
}

.theme-btn {
  width: 36px;
  height: 36px;
  border: 2px solid #2a1807;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, filter 0.2s;
  scroll-snap-align: center;
  flex-shrink: 0;
}

.theme-btn.dark {
  background: linear-gradient(180deg, #3d3d3d 0%, #1a1a1a 50%, #0a0a0a 100%);
  border-color: #f8d667;
}

.theme-btn.dark:hover {
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(248, 214, 103, 0.6);
}

.theme-btn.dark.active {
  filter: brightness(1.3);
  box-shadow: 0 0 10px rgba(248, 214, 103, 0.9);
}

.theme-btn:hover {
  transform: scale(1.1);
}

.theme-btn.active {
  filter: brightness(1.2);
  box-shadow: 0 0 8px rgba(248, 214, 103, 0.8);
}

.logout-btn {
  background: #b7393f;
  color: #fff;
  border: 2px solid #2a1807;
  padding: 0.48rem 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.74rem;
  font-weight: 900;
}

.hamburger {
  display: none;
  border: 2px solid #2a1807;
  padding: 0.35rem;
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
}

.triforce-icon {
  width: 30px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
}

.triforce-icon span {
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 12px solid #f8d667;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.7));
}

.triforce-icon span:nth-child(1) {
  grid-column: 1 / span 2;
  justify-self: center;
}

.triforce-icon span:nth-child(2),
.triforce-icon span:nth-child(3) {
  justify-self: center;
}

.user-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.user-avatar-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #f8d667;
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 980px) {
  .navbar {
    flex-wrap: wrap;
  }

  .menu-link,
  .logout-btn {
    font-size: 0.68rem;
    padding: 0.42rem 0.55rem;
  }
}

@media (min-width: 761px) {
  .desktop-links {
    display: flex;
    list-style: none;
    gap: 0.45rem;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  .theme-carousel {
    width: auto;
    max-width: 400px;
    overflow: hidden;
    flex-wrap: nowrap;
    scroll-behavior: smooth;
  }

  .menu-user-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }

  .menu-user-section .user-avatar {
    width: 64px;
    height: 64px;
  }

  .menu-user-section .avatar-initial {
    font-size: 1.75rem;
  }

  .menu-user-section .user-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: #f8d667;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .menu-user-section .user-avatar {
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid #f8d667;
    background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .menu-user-section .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .menu-user-section .avatar-initial {
    font-weight: 900;
    color: #2a1807;
  }

  .menu .menu-links {
    display: none;
  }

  .menu {
    position: absolute;
    top: 100%;
    right: 0;
    width: max-content;
    background: var(--bg-primary);
    border: 3px solid #f8d667;
    border-radius: 8px;
    padding: 0.75rem;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transform: translateY(-8px);
    pointer-events: none;
    transition:
      max-height 200ms ease-out,
      opacity 150ms ease-out,
      transform 150ms ease-out;
    z-index: 100;
  }

  .menu.abierto {
    max-height: 400px;
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .theme-selector {
    justify-content: center;
    padding: 0.5rem 0;
    border-top: 1px solid rgba(248, 214, 103, 0.3);
    border-bottom: 1px solid rgba(248, 214, 103, 0.3);
    overflow-x: auto;
  }

  .theme-carousel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;

  }

  .logout-btn {
    width: 100%;
    text-align: center;
  }
}

@media (max-width: 760px) {
  .hamburger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .desktop-links {
    display: none;
  }

  .user-menu-btn {
    display: none;
  }

  .menu-user-section .user-avatar {
    width: 72px;
    height: 72px;
  }

  .menu-user-section .avatar-initial {
    font-size: 2rem;
  }

  .menu {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
    padding-top: 0.35rem;
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transform: translateY(-6px);
    pointer-events: none;
    transition:
      max-height 240ms steps(6),
      opacity 180ms linear,
      transform 180ms steps(4);
  }

  .menu.abierto {
    max-height: 500px;
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
    animation: pixelDrop 240ms steps(6);
  }

  .menu-user-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }

  .user-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid #f8d667;
    background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-initial {
    font-size: 2rem;
    font-weight: 900;
    color: #2a1807;
  }

  .user-name {
    font-size: 1rem;
    font-weight: 700;
    color: #f8d667;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .menu .menu-links {
    position: static;
    left: auto;
    transform: none;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .menu-link {
    width: 100%;
    text-align: center;
    padding: 0.62rem 0.6rem;
  }

    .logout-btn {
      width: 100%;
      padding: 0.62rem 0.6rem;
    }

  .theme-selector {
    flex-wrap: wrap;
    justify-content: center;
    overflow-x: visible;
  }

  .theme-carousel {
    flex-wrap: wrap;
    justify-content: center;
  }
}

@keyframes pixelDrop {
  0% {
    clip-path: inset(0 0 100% 0);
  }
  100% {
    clip-path: inset(0 0 0 0);
  }
}
</style>
