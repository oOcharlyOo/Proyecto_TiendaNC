<script setup lang="ts">
import type { Usuario } from '../logica/useUsuarios';

defineProps<{
  usuarios: Usuario[];
}>();
</script>

<template>
  <section class="stats-section">
    <template v-for="(stat, index) in [
      { label: 'Total Héroes', value: usuarios.length, icon: '⚔', clase: '' },
      { label: 'Administradores', value: usuarios.filter(u => u.id_tipo_usuario === 1).length, icon: '👑', clase: 'gold' },
      { label: 'Usuarios', value: usuarios.filter(u => u.id_tipo_usuario === 2).length, icon: '🛡', clase: 'success' }
    ]" :key="index">
      <div :class="['stat-card-wrapper', stat.clase]" :style="{ animationDelay: `${index * 0.1}s` }">
        <div class="stat-glow"></div>
        <div class="stat-icon-wrapper">
          <span class="stat-icon">{{ stat.icon }}</span>
        </div>
        <div class="stat-info">
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-value">{{ stat.value }}</span>
        </div>
        <div class="stat-decoration">✦</div>
      </div>
    </template>
  </section>
</template>
