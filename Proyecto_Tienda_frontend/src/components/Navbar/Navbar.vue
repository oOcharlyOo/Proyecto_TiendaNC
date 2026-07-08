<script setup lang="ts">
import { useNavbar } from './logica/useNavbar';
const { route, menuAbierto, syncLoading, syncDirection, syncMessage, esAdministrador, sucursalIcon, sucursalLabel, avatarUsuario, nombreUsuario, links, toggleMenu, cerrarMenu, cerrarSesion, sincronizarUsuarios, currentTheme, setTheme } = useNavbar();
import './estilos/navbar.css';
</script>

<template>
  <header class="navbar-wrap">
    <nav class="navbar panel">
      <div class="brand">
        <div class="brand-text">
          <span class="brand-title">La Leyenda</span>
          <span class="brand-subtitle">Del Dulce</span>
        </div>
        <span class="sucursal-badge">{{ sucursalIcon }} {{ sucursalLabel }}</span>
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

          <div v-if="esAdministrador" class="sync-section">
            <span class="sync-label">Sincronizar Usuarios</span>
            <div class="sync-buttons">
              <button 
                type="button" 
                class="sync-btn" 
                :class="{ loading: syncLoading && syncDirection === 'abarrotera', success: syncMessage && syncMessage.includes('Abarrotera') }"
                @click="sincronizarUsuarios('abarrotera')"
                :disabled="syncLoading"
              >
                <svg viewBox="0 0 24 24" class="sync-icon">
                  <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Dulceria -> Abarrotera</span>
              </button>
              <button 
                type="button" 
                class="sync-btn" 
                :class="{ loading: syncLoading && syncDirection === 'dulceria', success: syncMessage && syncMessage.includes('Dulceria') }"
                @click="sincronizarUsuarios('dulceria')"
                :disabled="syncLoading"
              >
                <svg viewBox="0 0 24 24" class="sync-icon">
                  <path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Abarrotera -> Dulceria</span>
              </button>
            </div>
            <p v-if="syncMessage" class="sync-msg" :class="{ error: !syncMessage.includes('sincronizados') }">{{ syncMessage }}</p>
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
