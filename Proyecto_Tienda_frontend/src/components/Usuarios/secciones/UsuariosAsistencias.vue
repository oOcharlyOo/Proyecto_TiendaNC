<script setup lang="ts">
import { computed } from 'vue';
import type { DiasTrabajadosData, SemanaInfo, UsuarioDiasData } from '../logica/useUsuarios';

const props = defineProps<{
  diasTrabajados: DiasTrabajadosData | null;
  cargandoAsistencias: boolean;
  filtroMesVentas: string;
  esAdmin: boolean;
  semanasDelMes: SemanaInfo[];
  formatAvatarUrl: (url: string | null) => string | undefined;
  getNombreMes: (mes: number) => string;
  getIniciales: (nombre: string) => string;
  formatoHora: (isoString: string | null | undefined) => string;
  getHorasFormateadas: (horas: number) => string;
  getHorasTotales: (usuario: UsuarioDiasData) => number;
  getHorasDelDia: (usuario: UsuarioDiasData, dia: number) => number;
  getPagoSemanal: (usuario: UsuarioDiasData, semana: SemanaInfo) => number;
  getPagoTotal: (usuario: UsuarioDiasData) => number;
  getSueldoHora: (usuarioId: number) => number;
  getHorasSemana: (usuario: UsuarioDiasData, semana: SemanaInfo) => number;
  formatoMoneda: (valor: number) => string;
}>();

const usuariosConSueldo = computed(() => {
  if (!props.diasTrabajados?.usuarios) return [];
  return props.diasTrabajados.usuarios.filter(u => props.getSueldoHora(u.idUsuario) > 0);
});

const calendarioDias = computed(() => {
  const dt = props.diasTrabajados;
  if (!dt) return [];
  type DiaCal = { numero: number; esHoy: boolean; trabajadores: Array<{ nombre: string; horas: number; apertura: string; cierre: string | null }>; esVacio: boolean; horasTotales: number; esOverflow: boolean };
  const dias: DiaCal[] = [];
  const rawDay = new Date(dt.anio, dt.mes - 1, 1).getDay();
  const firstDay = (rawDay + 6) % 7;
  const daysInMonth = new Date(dt.anio, dt.mes, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const hoy = new Date();
  const empty: DiaCal = { numero: 0, esHoy: false, trabajadores: [], esVacio: true, horasTotales: 0, esOverflow: true };

  const prevMonth = dt.mes === 1 ? 12 : dt.mes - 1;
  const prevYear = dt.mes === 1 ? dt.anio - 1 : dt.anio;
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
  const nextMonth = dt.mes === 12 ? 1 : dt.mes + 1;
  const nextYear = dt.mes === 12 ? dt.anio + 1 : dt.anio;

  function getOverflowWorkers(user: UsuarioDiasData, fechaStr: string): Array<{ nombre: string; horas: number; apertura: string; cierre: string | null }> {
    const workers: Array<{ nombre: string; horas: number; apertura: string; cierre: string | null }> = [];
    if (!user.overflow) return workers;
    const entry = user.overflow.find(o => o.fecha === fechaStr);
    if (entry && entry.horas > 0) {
      workers.push({
        nombre: user.nombreUsuario,
        horas: entry.horas,
        apertura: entry.apertura || '',
        cierre: entry.cierre || null
      });
    }
    return workers;
  }

  for (let i = 0; i < firstDay; i++) {
    const dayNum = daysInPrevMonth - firstDay + 1 + i;
    const fechaStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const trabajadores: Array<{ nombre: string; horas: number; apertura: string; cierre: string | null }> = [];
    let horasTotales = 0;
    if (dt.usuarios) {
      for (const user of dt.usuarios) {
        const workers = getOverflowWorkers(user, fechaStr);
        trabajadores.push(...workers);
        horasTotales += workers.reduce((s, w) => s + w.horas, 0);
      }
    }
    dias.push({ numero: dayNum, esHoy: false, trabajadores, esVacio: false, horasTotales, esOverflow: true });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const trabajadores: Array<{ nombre: string; horas: number; apertura: string; cierre: string | null }> = [];
    let horasTotales = 0;
    if (dt.usuarios) {
      for (const user of dt.usuarios) {
        if (user.diasLaborados?.includes(d)) {
          const horas = props.getHorasDelDia(user, d);
          horasTotales += horas;
          trabajadores.push({
            nombre: user.nombreUsuario,
            horas,
            apertura: user.aperturas?.[d] || '',
            cierre: user.cierres?.[d] || null
          });
        }
      }
    }
    const esHoy = d === hoy.getDate() && dt.mes === hoy.getMonth() + 1 && dt.anio === hoy.getFullYear();
    dias.push({ numero: d, esHoy, trabajadores, esVacio: false, horasTotales, esOverflow: false });
  }

  const remaining = totalCells - dias.length;
  for (let i = 1; i <= remaining; i++) {
    const fechaStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const trabajadores: Array<{ nombre: string; horas: number; apertura: string; cierre: string | null }> = [];
    let horasTotales = 0;
    if (dt.usuarios) {
      for (const user of dt.usuarios) {
        const workers = getOverflowWorkers(user, fechaStr);
        trabajadores.push(...workers);
        horasTotales += workers.reduce((s, w) => s + w.horas, 0);
      }
    }
    dias.push({ numero: i, esHoy: false, trabajadores, esVacio: false, horasTotales, esOverflow: true });
  }

  return dias;
});

const totalesPago = computed(() => {
  const usuarios = usuariosConSueldo.value;
  const semanas = props.semanasDelMes;
  const horasPorSemana = semanas.map(semana =>
    usuarios.reduce((sum, u) => sum + props.getHorasSemana(u, semana), 0)
  );
  const pagoPorSemana = semanas.map(semana =>
    usuarios.reduce((sum, u) => sum + props.getPagoSemanal(u, semana), 0)
  );
  const totalHoras = horasPorSemana.reduce((a, b) => a + b, 0);
  const totalPago = pagoPorSemana.reduce((a, b) => a + b, 0);
  return { horasPorSemana, pagoPorSemana, totalHoras, totalPago };
});

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
            v-for="(dia, index) in calendarioDias"
            :key="index"
            class="dia-cell"
            :class="{
              'dia-vacio': dia.esVacio,
              'dia-hoy': dia.esHoy,
              'dia-trabajado': dia.trabajadores.length > 0
            }"
          >
            <span v-if="!dia.esVacio" class="dia-numero">{{ dia.numero }}</span>
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
            <span v-else-if="!dia.esVacio && !dia.esHoy" class="dia-vacio-text">-</span>
            <span v-if="dia.esHoy && dia.trabajadores.length === 0" class="dia-hoy-text">Hoy</span>
            <span v-if="dia.horasTotales > 0 && !dia.esVacio" class="dia-total-horas">
              {{ getHorasFormateadas(dia.horasTotales) }}
            </span>
          </div>
        </div>
      </div>

      <div class="usuarios-asistencia">
        <h3>👥 Resumen por Usuario</h3>
        <div class="usuarios-asistencia-grid">
          <div
            v-for="usuario in usuariosConSueldo"
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
              <tr v-for="usuario in usuariosConSueldo" :key="usuario.idUsuario">
                <td class="pago-usuario">
                  <div class="pago-usuario-info">
                    <img v-if="usuario.avatar" :src="formatAvatarUrl(usuario.avatar)" :alt="usuario.nombreUsuario" class="pago-avatar" />
                    <div v-else class="pago-avatar-placeholder">{{ usuario.nombreUsuario?.charAt(0)?.toUpperCase() || '?' }}</div>
                    <div class="pago-usuario-nombre">
                      <span>{{ usuario.nombreUsuario }}</span>
                      <small v-if="getSueldoHora(usuario.idUsuario) > 0">${{ getSueldoHora(usuario.idUsuario).toFixed(2) }}/h</small>
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
            <tfoot v-if="usuariosConSueldo.length > 0">
              <tr>
                <td><strong>💰 Monto Total</strong></td>
                <td v-for="(semana, idx) in semanasDelMes" :key="'tot-'+semana.numero" class="pago-cell total">
                  <div class="pago-cell-content">
                    <span class="pago-cell-horas">{{ getHorasFormateadas(totalesPago.horasPorSemana[idx]) }}</span>
                    <span class="pago-cell-monto">{{ formatoMoneda(totalesPago.pagoPorSemana[idx]) }}</span>
                  </div>
                </td>
                <td class="pago-cell total">
                  <div class="pago-cell-content">
                    <span class="pago-cell-horas total">{{ getHorasFormateadas(totalesPago.totalHoras) }}</span>
                    <span class="pago-cell-monto total">{{ formatoMoneda(totalesPago.totalPago) }}</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
