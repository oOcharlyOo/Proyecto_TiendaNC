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

      <div class="menu" :class="{ abierto: menuAbierto }">
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
  gap: 0.3rem;
  justify-content: center;
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

@media (max-width: 760px) {
  .hamburger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
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
    max-height: 420px;
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
    animation: pixelDrop 240ms steps(6);
  }

  .menu-links {
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
