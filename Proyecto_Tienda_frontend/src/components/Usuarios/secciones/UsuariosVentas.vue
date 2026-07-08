<script setup lang="ts">
import type { UsuarioVentas } from '../logica/useUsuarios';

defineProps<{
  ventasPorUsuario: UsuarioVentas[];
  cargandoVentas: boolean;
  filtroMesVentas: string;
  usuarioTop: UsuarioVentas | null;
  formatAvatarUrl: (url: string | null) => string | undefined;
  formatoMoneda: (valor: number) => string;
  formatoFecha: (fecha?: string) => string;
  formatoCantidad: (cantidad: number, isGramaje: boolean) => string;
}>();

const emit = defineEmits<{
  'cargar-ventas': [];
  'update:filtro-mes-ventas': [value: string];
}>();
</script>

<template>
  <div class="seccion-ventas">
    <div class="ventas-filtros">
      <div class="filtro-group">
        <label>📅 Período</label>
        <div class="filtro-fecha">
          <input :value="filtroMesVentas" type="month" @change="emit('update:filtro-mes-ventas', ($event.target as HTMLInputElement).value)">
          <button class="btn-load" @click="emit('cargar-ventas')" :disabled="cargandoVentas">
            {{ cargandoVentas ? 'Cargando...' : 'Cargar' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="usuarioTop" class="top-vendedor">
      <div class="top-badge">🏆</div>
      <div class="top-info">
        <span class="top-label">Mejor Vendedor del Mes</span>
        <h3 class="top-nombre">{{ usuarioTop.usuario.nombre }} {{ usuarioTop.usuario.apellido_p }}</h3>
        <div class="top-stats">
          <span>💰 {{ formatoMoneda(usuarioTop.totalMonto) }}</span>
          <span>🧾 {{ usuarioTop.totalVentas }} ventas</span>
        </div>
      </div>
    </div>

    <div v-if="cargandoVentas" class="loading">
      <div class="loading-spinner"></div>
      <span>Cargando ventas...</span>
    </div>

    <div v-else-if="ventasPorUsuario.length === 0" class="empty-state">
      <span class="empty-icon">📊</span>
      <p>Selecciona un mes y carga los datos para ver las ventas por usuario</p>
    </div>

    <div v-else class="usuarios-ventas-grid">
      <div
        v-for="(item, index) in ventasPorUsuario"
        :key="item.usuario.idUsuario"
        class="usuario-ventas-card"
        :class="{ top: usuarioTop?.usuario.idUsuario === item.usuario.idUsuario }"
        :style="{ animationDelay: `${index * 0.05}s` }"
      >
        <div class="usuario-ventas-header">
          <div class="usuario-avatar-small">
            <img
              v-if="item.usuario.avatar"
              :src="formatAvatarUrl(item.usuario.avatar)"
              :alt="item.usuario.nombre"
            />
            <div v-else class="avatar-placeholder-small">
              {{ item.usuario.nombre?.charAt(0)?.toUpperCase() || '?' }}
            </div>
          </div>
          <div class="usuario-ventas-info">
            <h4>{{ item.usuario.nombre }} {{ item.usuario.apellido_p }}</h4>
            <span class="usuario-user">@{{ item.usuario.usuario }}</span>
          </div>
          <div class="usuario-ventas-total">
            <span class="total-label">Total</span>
            <strong>{{ formatoMoneda(item.totalMonto) }}</strong>
          </div>
        </div>

        <div class="usuario-ventas-stats">
          <div class="stat-item">
            <span class="stat-icon">🧾</span>
            <span class="stat-value">{{ item.totalVentas }}</span>
            <span class="stat-label">Ventas</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">📦</span>
            <span class="stat-value">{{ item.productos.length }}</span>
            <span class="stat-label">Productos</span>
          </div>
        </div>

        <div class="usuario-productos" v-if="item.productos.length > 0">
          <h5>Productos Vendidos</h5>
          <div class="productos-list">
            <div
              v-for="producto in item.productos.slice(0, 5)"
              :key="producto.nombre"
              class="producto-item"
            >
              <span class="producto-nombre">{{ producto.nombre }}</span>
              <span class="producto-qty">{{ formatoCantidad(producto.cantidadTotal, producto.isGramaje) }}</span>
              <span class="producto-monto">{{ formatoMoneda(producto.montoTotal) }}</span>
            </div>
            <div v-if="item.productos.length > 5" class="productos-more">
              +{{ item.productos.length - 5 }} más
            </div>
          </div>
        </div>

        <div class="usuario-ventas-detalles" v-if="item.ventas.length > 0">
          <h5>Últimas Ventas</h5>
          <div class="ventas-list">
            <div v-for="venta in item.ventas.slice(0, 3)" :key="venta.idVenta" class="venta-item">
              <span class="venta-ticket">#{{ venta.numeroTicket }}</span>
              <span class="venta-fecha">{{ formatoFecha(venta.fechaVenta).split(',')[0] }}</span>
              <span class="venta-monto">{{ formatoMoneda(venta.montoTotal) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
