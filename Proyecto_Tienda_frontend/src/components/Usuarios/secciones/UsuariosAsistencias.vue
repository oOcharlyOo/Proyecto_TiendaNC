<script setup lang="ts">
import type { DiasTrabajadosData, SemanaInfo, UsuarioDiasData } from '../logica/useUsuarios';

defineProps<{
  diasTrabajados: DiasTrabajadosData | null;
  cargandoAsistencias: boolean;
  filtroMesVentas: string;
  esAdmin: boolean;
  semanasDelMes: SemanaInfo[];
  getDiasCalendario: () => Array<{ numero: number | null; esHoy: boolean; trabajadores: Array<{ nombre: string; horas: number; apertura: string; cierre: string | null }>; esVacio: boolean; horasTotales: number }>;
  formatAvatarUrl: (url: string | null) => string | undefined;
  getNombreMes: (mes: number) => string;
  getIniciales: (nombre: string) => string;
  formatoHora: (isoString: string | null | undefined) => string;
  getHorasFormateadas: (horas: number) => string;
  getHorasTotales: (usuario: UsuarioDiasData) => number;
  getHorasDelDia: (usuario: UsuarioDiasData, dia: number) => number;
  getPagoSemanal: (usuario: UsuarioDiasData, semana: SemanaInfo) => number;
  getPagoTotal: (usuario: UsuarioDiasData) => number;
  getSueldoHora: (usuario: UsuarioDiasData) => number;
  getHorasSemana: (usuario: UsuarioDiasData, semana: SemanaInfo) => number;
  formatoMoneda: (valor: number) => string;
}>();

const emit = defineEmits<{
  'cargar-asistencias': [];
  'update:filtro-mes-ventas': [value: string];
}>();
</script>

<template>
  <div v-if="esAdmin" class="seccion-asistencias">
    <div class="ventas-filtros">
      <div class="filtro-group">
        <label>📅 Período</label>
        <div class="filtro-fecha">
          <input :value="filtroMesVentas" type="month" @change="emit('update:filtro-mes-ventas', ($event.target as HTMLInputElement).value)">
          <button class="btn-load" @click="emit('cargar-asistencias')" :disabled="cargandoAsistencias">
            {{ cargandoAsistencias ? 'Cargando...' : 'Cargar' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="cargandoAsistencias" class="loading">
      <div class="loading-spinner"></div>
      <span>Cargando asistencia...</span>
    </div>

    <div v-else-if="!diasTrabajados" class="empty-state">
      <span class="empty-icon">📅</span>
      <p>Selecciona un mes y carga los datos para ver la asistencia</p>
    </div>

    <div v-else class="asistencias-content">
      <div class="calendario-header">
        <h3>📅 Calendario de Asistencias - {{ getNombreMes(diasTrabajados.mes) }} {{ diasTrabajados.anio }}</h3>
      </div>

      <div class="calendario-grid">
        <div class="dias-semana">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mié</span>
          <span>Jue</span>
          <span>Vie</span>
          <span>Sáb</span>
          <span>Dom</span>
        </div>

        <div class="calendario-dias">
          <div
            v-for="(dia, index) in getDiasCalendario()"
            :key="index"
            class="dia-cell"
            :class="{
              'dia-vacio': !dia.numero,
              'dia-hoy': dia.esHoy,
              'dia-trabajado': dia.trabajadores.length > 0
            }"
          >
            <span v-if="dia.numero" class="dia-numero">{{ dia.numero }}</span>
            <div v-if="dia.trabajadores.length > 0" class="dia-trabajadores">
              <div
                v-for="(trabajador, idx) in dia.trabajadores.slice(0, 3)"
                :key="idx"
                class="trabajador-chip"
                :class="{ 'trabajando': !trabajador.cierre }"
                :title="`${trabajador.nombre}\n🕐 ${formatoHora(trabajador.apertura)} → ${trabajador.cierre ? formatoHora(trabajador.cierre) : '🔴 Trabajando'}\n⏱ ${getHorasFormateadas(trabajador.horas)}`"
              >
                <span class="trabajador-inicial">{{ getIniciales(trabajador.nombre) }}</span>
                <span class="trabajador-horas">{{ getHorasFormateadas(trabajador.horas) }}</span>
                <span v-if="trabajador.apertura" class="trabajador-apertura">{{ formatoHora(trabajador.apertura) }}</span>
                <span v-if="!trabajador.cierre" class="trabajando-badge" title="Turno abierto">🟢</span>
              </div>
              <div v-if="dia.trabajadores.length > 3" class="trabajador-chip mas">
                +{{ dia.trabajadores.length - 3 }}
              </div>
            </div>
            <span v-else-if="dia.numero && !dia.esHoy" class="dia-vacio-text">-</span>
            <span v-if="dia.esHoy && dia.trabajadores.length === 0" class="dia-hoy-text">Hoy</span>
            <span v-if="dia.horasTotales > 0 && dia.numero" class="dia-total-horas">
              {{ getHorasFormateadas(dia.horasTotales) }}
            </span>
          </div>
        </div>
      </div>

      <div class="usuarios-asistencia">
        <h3>👥 Resumen por Usuario</h3>
        <div class="usuarios-asistencia-grid">
          <div
            v-for="usuario in diasTrabajados.usuarios"
            :key="usuario.idUsuario"
            class="usuario-asistencia-card"
          >
            <div class="usuario-asistencia-header">
              <div class="usuario-avatar-small">
                <img
                  v-if="usuario.avatar"
                  :src="formatAvatarUrl(usuario.avatar)"
                  :alt="usuario.nombreUsuario"
                />
                <div v-else class="avatar-placeholder-small">
                  {{ usuario.nombreUsuario?.charAt(0)?.toUpperCase() || '?' }}
                </div>
              </div>
              <div class="usuario-asistencia-info">
                <h4>{{ usuario.nombreUsuario }}</h4>
                <div class="usuario-stats-row">
                  <span class="stat-badge">
                    <span class="stat-icon-small">📅</span>
                    {{ usuario.totalDias }} días
                  </span>
                  <span class="stat-badge highlight">
                    <span class="stat-icon-small">⏱️</span>
                    {{ getHorasFormateadas(getHorasTotales(usuario)) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="dias-laborados-mini">
              <div
                v-for="dia in usuario.diasLaborados"
                :key="dia"
                class="dia-chip"
                :class="{ 'sin-cierre': !usuario.cierres?.[dia] }"
                :title="`Día ${dia}\n🕐 ${formatoHora(usuario.aperturas?.[dia])} → ${usuario.cierres?.[dia] ? formatoHora(usuario.cierres[dia]) : '🔴 Trabajando'}\n⏱ ${getHorasFormateadas(getHorasDelDia(usuario, dia))}`"
              >
                <span class="dia-num">{{ dia }}</span>
                <span v-if="usuario.aperturas?.[dia]" class="dia-apertura">{{ formatoHora(usuario.aperturas[dia]) }}</span>
                <span class="dia-horas">{{ getHorasFormateadas(getHorasDelDia(usuario, dia)) }}</span>
                <span v-if="!usuario.cierres?.[dia]" class="dia-trabajando-text">🔴</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="pago-semanal-section">
        <h3>💰 Resumen de Pago Semanal</h3>
        <div v-if="semanasDelMes.length === 0" class="empty-state">
          <p>No hay datos de asistencia para calcular pago</p>
        </div>
        <div v-else class="pago-semanal-table-wrapper">
          <table class="pago-semanal-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th v-for="semana in semanasDelMes" :key="semana.numero">{{ semana.label }}</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="usuario in diasTrabajados.usuarios" :key="usuario.idUsuario">
                <td class="pago-usuario">
                  <div class="pago-usuario-info">
                    <img v-if="usuario.avatar" :src="formatAvatarUrl(usuario.avatar)" :alt="usuario.nombreUsuario" class="pago-avatar" />
                    <div v-else class="pago-avatar-placeholder">{{ usuario.nombreUsuario?.charAt(0)?.toUpperCase() || '?' }}</div>
                    <div class="pago-usuario-nombre">
                      <span>{{ usuario.nombreUsuario }}</span>
                      <small v-if="getSueldoHora(usuario) > 0">${{ getSueldoHora(usuario).toFixed(2) }}/h</small>
                      <small v-else class="sin-sueldo">Sin sueldo configurado</small>
                    </div>
                  </div>
                </td>
                <td v-for="semana in semanasDelMes" :key="semana.numero" class="pago-cell">
                  <div class="pago-cell-content">
                    <span class="pago-cell-horas">{{ getHorasFormateadas(getHorasSemana(usuario, semana)) }}</span>
                    <span class="pago-cell-monto">{{ formatoMoneda(getPagoSemanal(usuario, semana)) }}</span>
                  </div>
                </td>
                <td class="pago-cell total">
                  <div class="pago-cell-content">
                    <span class="pago-cell-horas total">{{ getHorasFormateadas(getHorasTotales(usuario)) }}</span>
                    <span class="pago-cell-monto total">{{ formatoMoneda(getPagoTotal(usuario)) }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
