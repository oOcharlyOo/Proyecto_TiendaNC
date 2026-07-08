<script setup lang="ts">
import type { Usuario } from '../logica/useUsuarios';

defineProps<{
  usuarios: Usuario[];
  cargando: boolean;
  esAdmin: boolean;
  tipoUsuarioActual: number;
  puedeEditar: (id: number) => boolean;
  formatAvatarUrl: (url: string | null) => string | undefined;
  getTipoLabel: (tipo: number) => string;
}>();

const emit = defineEmits<{
  'abrir-modal-nuevo': [];
  'abrir-modal-editar': [usuario: Usuario];
  'eliminar-usuario': [id: number];
  'abrir-sueldos': [];
}>();
</script>

<template>
  <div class="seccion-usuarios">
    <div class="header-actions" v-if="esAdmin">
      <button class="btn-primary" @click="emit('abrir-modal-nuevo')">
        <span class="btn-icon">➕</span>
        Nuevo Héroe
      </button>
      <button class="btn-secondary" @click="emit('abrir-sueldos')">
        <span class="btn-icon">💰</span>
        Sueldos por Hora
      </button>
    </div>

    <div v-if="cargando" class="loading">
      <div class="loading-spinner"></div>
      <span>Cargando héroes...</span>
    </div>

    <div v-else class="usuarios-grid">
      <div
        v-for="(usuario, index) in usuarios"
        :key="usuario.idUsuario"
        class="usuario-card"
        :style="{ animationDelay: `${index * 0.05}s` }"
      >
        <div class="avatar-container">
          <img
            v-if="usuario.avatar"
            :src="formatAvatarUrl(usuario.avatar)"
            :alt="usuario.nombre"
            class="avatar-img"
          />
          <div v-else class="avatar-placeholder">
            {{ usuario.nombre?.charAt(0)?.toUpperCase() || '?' }}
          </div>
          <div class="avatar-ring"></div>
        </div>

        <div class="usuario-info">
          <h3 class="usuario-nombre">{{ usuario.nombre }} {{ usuario.apellido_p }}</h3>
          <p class="usuario-user">@{{ usuario.usuario }}</p>
          <span class="tipo-badge" :class="{ admin: usuario.id_tipo_usuario === 1 }">
            <span class="badge-icon">{{ usuario.id_tipo_usuario === 1 ? '👑' : '🛡' }}</span>
            {{ getTipoLabel(usuario.id_tipo_usuario) }}
          </span>
        </div>

        <div v-if="esAdmin" class="usuario-actions">
          <button class="btn-edit" @click="emit('abrir-modal-editar', usuario)">
            <span class="btn-icon">✏️</span>
          </button>
          <button
            class="btn-delete"
            @click="emit('eliminar-usuario', usuario.idUsuario)"
            :disabled="usuario.idUsuario === tipoUsuarioActual"
          >
            <span class="btn-icon">🗑️</span>
          </button>
        </div>
        <div v-else-if="puedeEditar(usuario.idUsuario)" class="usuario-actions">
          <button class="btn-edit" @click="emit('abrir-modal-editar', usuario)">
            <span class="btn-icon">✏️</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
