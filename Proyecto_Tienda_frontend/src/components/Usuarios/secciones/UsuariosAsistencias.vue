<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { DiasTrabajadosData, SemanaInfo, UsuarioDiasData } from '../logica/useUsuarios';

const props = defineProps<{
  diasTrabajados: DiasTrabajadosData | null;
  cargandoAsistencias: boolean;
  guardandoHora: boolean;
  filtroMesVentas: string;
  esAdmin: boolean;
  semanasDelMes: SemanaInfo[];
  horasMaxJornada: number | null;
  guardandoConfig: boolean;
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

type TrabajadorCal = { idUsuario: number; nombre: string; horas: number; apertura: string; cierre: string | null };
type DiaCal = { numero: number; fecha: string; esHoy: boolean; trabajadores: TrabajadorCal[]; esVacio: boolean; horasTotales: number; esOverflow: boolean };

const DURACION_TURNO_DEFECTO = 6.5;
const UMBRAL_AUTO_CIERRE_DEFECTO = 10;

/* El tope de jornada de la sucursal manda: si esta configurado (> 0), el
   cierre sugerido y el umbral de cierre automatico usan ese valor. */
const duracionTurnoSugerida = computed(() =>
  props.horasMaxJornada && props.horasMaxJornada > 0 ? props.horasMaxJornada : DURACION_TURNO_DEFECTO
);
const umbralAutoCierre = computed(() =>
  props.horasMaxJornada && props.horasMaxJornada > 0 ? props.horasMaxJornada : UMBRAL_AUTO_CIERRE_DEFECTO
);

const editModal = ref<{ fecha: string; idUsuario: number; nombre: string; turnoAbierto: boolean } | null>(null);
const entradaInput = ref('');
const salidaInput = ref('');

/* Edicion del tope de jornada (input del header). */
const topeInput = ref<number | null>(null);
watch(
  () => props.horasMaxJornada,
  (v) => { topeInput.value = v ?? null; },
  { immediate: true }
);
const topeModificado = computed(() => topeInput.value !== props.horasMaxJornada);

function sumarHoras(hhmm: string, horas: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + Math.round(horas * 60);
  const mins = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function horasTranscurridas(hhmm: string, fecha: string): number {
  const apertura = new Date(`${fecha}T${hhmm}`);
  if (isNaN(apertura.getTime())) return 0;
  return Math.max(0, (new Date().getTime() - apertura.getTime()) / 3600000);
}

function abrirEdicionHora(t: TrabajadorCal, fecha: string) {
  const turnoAbierto = !t.cierre;
  editModal.value = { fecha, idUsuario: t.idUsuario, nombre: t.nombre, turnoAbierto };
  entradaInput.value = t.apertura ? props.formatoHora(t.apertura) : '';
  salidaInput.value = t.cierre
    ? props.formatoHora(t.cierre)
    : (t.apertura ? sumarHoras(props.formatoHora(t.apertura), duracionTurnoSugerida.value) : '');
}

function cerrarEdicionHora() {
  editModal.value = null;
  entradaInput.value = '';
  salidaInput.value = '';
}

function guardarEdicionHora() {
  const mod = editModal.value;
  if (!mod) return;
  const entrada = entradaInput.value.trim();
  const salida = salidaInput.value.trim();
  if (!entrada && !salida) return;
  const re = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (entrada && !re.test(entrada)) { alert('Hora de entrada inválida (use HH:MM)'); return; }
  if (salida && !re.test(salida)) { alert('Hora de salida inválida (use HH:MM)'); return; }

  if (entrada && salida && entrada === salida) {
    if (!window.confirm('La salida es igual a la entrada: el día marcará 0h 0m. ¿Guardar de todos modos?')) return;
  }

  let cierre = salida;
  if (!cierre && mod.turnoAbierto && entrada) {
    if (horasTranscurridas(entrada, mod.fecha) >= umbralAutoCierre.value) {
      cierre = sumarHoras(entrada, duracionTurnoSugerida.value);
    } else {
      alert(`El turno aún puede estar activo (lleva menos de ${umbralAutoCierre.value}h desde la entrada). Escribe la hora de salida para cerrarlo.`);
      return;
    }
  }

  // Se emiten ambas operaciones juntas y el padre las guarda en secuencia:
  // así la recarga del mes ocurre una sola vez, al final, y la pantalla ya
  // no se queda con datos viejos por la carrera entre los dos POST.
  const ops: Array<{ idUsuario: number; fecha: string; hora: string; tipo: 'apertura' | 'cierre' }> = [];
  if (entrada) ops.push({ idUsuario: mod.idUsuario, fecha: mod.fecha, hora: entrada, tipo: 'apertura' });
  if (cierre) ops.push({ idUsuario: mod.idUsuario, fecha: mod.fecha, hora: cierre, tipo: 'cierre' });
  if (ops.length === 0) return;

  emit('guardar-horas', ops);
  cerrarEdicionHora();
}

const usuariosConSueldo = computed(() => {
  if (!props.diasTrabajados?.usuarios) return [];
  return props.diasTrabajados.usuarios.filter(u => props.getSueldoHora(u.idUsuario) > 0);
});

const calendarioDias = computed(() => {
  const dt = props.diasTrabajados;
  if (!dt) return [];
  const dias: DiaCal[] = [];
  const rawDay = new Date(dt.anio, dt.mes - 1, 1).getDay();
  const firstDay = (rawDay + 6) % 7;
  const daysInMonth = new Date(dt.anio, dt.mes, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const hoy = new Date();
  const empty: DiaCal = { numero: 0, fecha: '', esHoy: false, trabajadores: [], esVacio: true, horasTotales: 0, esOverflow: true };

  const prevMonth = dt.mes === 1 ? 12 : dt.mes - 1;
  const prevYear = dt.mes === 1 ? dt.anio - 1 : dt.anio;
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
  const nextMonth = dt.mes === 12 ? 1 : dt.mes + 1;
  const nextYear = dt.mes === 12 ? dt.anio + 1 : dt.anio;

  function getOverflowWorkers(user: UsuarioDiasData, fechaStr: string): TrabajadorCal[] {
    const workers: TrabajadorCal[] = [];
    if (!user.overflow) return workers;
    const entry = user.overflow.find(o => o.fecha === fechaStr);
    if (entry && entry.horas > 0) {
      workers.push({
        idUsuario: user.idUsuario,
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
    const trabajadores: TrabajadorCal[] = [];
    let horasTotales = 0;
    if (dt.usuarios) {
      for (const user of dt.usuarios) {
        const workers = getOverflowWorkers(user, fechaStr);
        trabajadores.push(...workers);
        horasTotales += workers.reduce((s, w) => s + w.horas, 0);
      }
    }
    dias.push({ numero: dayNum, fecha: fechaStr, esHoy: false, trabajadores, esVacio: false, horasTotales, esOverflow: true });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const trabajadores: TrabajadorCal[] = [];
    let horasTotales = 0;
    const fechaStr = `${dt.anio}-${String(dt.mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (dt.usuarios) {
      for (const user of dt.usuarios) {
        if (user.diasLaborados?.includes(d)) {
          const horas = props.getHorasDelDia(user, d);
          horasTotales += horas;
          trabajadores.push({
            idUsuario: user.idUsuario,
            nombre: user.nombreUsuario,
            horas,
            apertura: user.aperturas?.[d] || '',
            cierre: user.cierres?.[d] || null
          });
        }
      }
    }
    const esHoy = d === hoy.getDate() && dt.mes === hoy.getMonth() + 1 && dt.anio === hoy.getFullYear();
    dias.push({ numero: d, fecha: fechaStr, esHoy, trabajadores, esVacio: false, horasTotales, esOverflow: false });
  }

  const remaining = totalCells - dias.length;
  for (let i = 1; i <= remaining; i++) {
    const fechaStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const trabajadores: TrabajadorCal[] = [];
    let horasTotales = 0;
    if (dt.usuarios) {
      for (const user of dt.usuarios) {
        const workers = getOverflowWorkers(user, fechaStr);
        trabajadores.push(...workers);
        horasTotales += workers.reduce((s, w) => s + w.horas, 0);
      }
    }
    dias.push({ numero: i, fecha: fechaStr, esHoy: false, trabajadores, esVacio: false, horasTotales, esOverflow: true });
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
  'guardar-horas': [ops: Array<{ idUsuario: number; fecha: string; hora: string; tipo: 'apertura' | 'cierre' }>];
  'eliminar-turno': [{ idUsuario: number; fecha: string; nombre: string }];
  'guardar-config': [horas: number];
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
        <div class="tope-jornada" title="Horas máximo que se contabilizan por día en este negocio. 0 = sin límite.">
          <label for="tope-jornada-input">⏱ Tope de jornada</label>
          <input
            id="tope-jornada-input"
            v-model.number="topeInput"
            type="number"
            min="0"
            max="24"
            step="0.5"
          />
          <span class="tope-unidad">h <small>(0 = sin límite)</small></span>
          <button
            class="btn-tope-guardar"
            :disabled="!topeModificado || guardandoConfig || topeInput === null || topeInput < 0 || topeInput > 24"
            @click="emit('guardar-config', topeInput ?? 0)"
          >
            {{ guardandoConfig ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
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
              'dia-trabajado': dia.trabajadores.length > 0,
              'dia-overflow': dia.esOverflow,
              'dia-finde': index % 7 >= 5
            }"
          >
            <div v-if="!dia.esVacio" class="dia-header">
              <span class="dia-numero">{{ dia.numero }}</span>
              <span v-if="dia.esHoy" class="dia-hoy-pill">Hoy</span>
              <span v-if="dia.horasTotales > 0" class="dia-total-horas" title="Horas totales del día">
                {{ getHorasFormateadas(dia.horasTotales) }}
              </span>
            </div>
            <div v-if="dia.trabajadores.length > 0" class="dia-trabajadores">
              <div
                v-for="(trabajador, idx) in dia.trabajadores.slice(0, 3)"
                :key="idx"
                class="trabajador-chip"
                :class="{ 'trabajando': !trabajador.cierre }"
                :title="`${trabajador.nombre}\nEntrada: ${formatoHora(trabajador.apertura)}\nSalida: ${trabajador.cierre ? formatoHora(trabajador.cierre) : 'en turno'}\nHoras: ${getHorasFormateadas(trabajador.horas)}`"
              >
                <span class="trabajador-inicial">{{ getIniciales(trabajador.nombre) }}</span>
                <div class="trabajador-info">
                  <span class="trabajador-horario">
                    {{ trabajador.apertura ? formatoHora(trabajador.apertura) : '--:--' }}
                    –
                    {{ trabajador.cierre ? formatoHora(trabajador.cierre) : 'en turno' }}
                  </span>
                  <span class="trabajador-horas">{{ getHorasFormateadas(trabajador.horas) }}</span>
                </div>
                <span v-if="!trabajador.cierre" class="trabajando-dot" aria-label="Turno abierto"></span>
                <div v-if="esAdmin" class="trabajador-acciones">
                  <button
                    class="btn-edit-hora"
                    title="Editar entrada/salida"
                    @click.stop="abrirEdicionHora(trabajador, dia.fecha)"
                  >✏️</button>
                  <button
                    class="btn-del-hora"
                    title="Eliminar turno"
                    @click.stop="emit('eliminar-turno', { idUsuario: trabajador.idUsuario, fecha: dia.fecha, nombre: trabajador.nombre })"
                  >🗑️</button>
                </div>
              </div>
              <div
                v-if="dia.trabajadores.length > 3"
                class="trabajador-chip mas"
                :title="dia.trabajadores.slice(3).map(t => t.nombre).join('\n')"
              >
                +{{ dia.trabajadores.length - 3 }} más
              </div>
            </div>
          </div>
        </div>

        <div class="calendario-leyenda">
          <span class="leyenda-item"><i class="leyenda-swatch cerrado"></i>Turno cerrado</span>
          <span class="leyenda-item"><i class="leyenda-swatch abierto"></i>En turno (sin salida)</span>
          <span class="leyenda-item"><i class="leyenda-swatch hoy"></i>Hoy</span>
          <span class="leyenda-item"><i class="leyenda-swatch overflow"></i>Día de otro mes</span>
          <span v-if="esAdmin" class="leyenda-hint">Pasa el cursor sobre un turno para editarlo o eliminarlo</span>
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
                <button
                  v-if="esAdmin"
                  class="btn-edit-hora"
                  title="Editar entrada/salida"
                  @click.stop="abrirEdicionHora({ idUsuario: usuario.idUsuario, nombre: usuario.nombreUsuario, horas: getHorasDelDia(usuario, dia), apertura: usuario.aperturas?.[dia] || '', cierre: usuario.cierres?.[dia] || null }, `${diasTrabajados?.anio}-${String(diasTrabajados?.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`)"
                >✏️</button>
                <button
                  v-if="esAdmin"
                  class="btn-del-hora"
                  title="Eliminar turno"
                  @click.stop="emit('eliminar-turno', { idUsuario: usuario.idUsuario, fecha: `${diasTrabajados?.anio}-${String(diasTrabajados?.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`, nombre: usuario.nombreUsuario })"
                >🗑️</button>
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

    <div v-if="editModal" class="modal-edit-hora" @click.self="cerrarEdicionHora">
      <div class="modal-edit-card">
        <div class="modal-edit-header">
          <h3>✏️ Editar Hora</h3>
          <button class="modal-edit-close" @click="cerrarEdicionHora">✕</button>
        </div>
        <div class="modal-edit-body">
          <div class="modal-edit-info">
            <span><strong>{{ editModal.nombre }}</strong></span>
            <span class="modal-edit-fecha">📅 {{ editModal.fecha }}</span>
          </div>
          <div v-if="editModal.turnoAbierto" class="modal-edit-alert">
            🔴 Turno abierto sin cierre. Se cerrará solo si lleva más de {{ umbralAutoCierre }}h; si no, escribe la hora de salida.
          </div>
          <div class="modal-edit-fields">
            <label>
              <span>Entrada</span>
              <input v-model="entradaInput" type="time" placeholder="HH:MM" />
            </label>
            <label>
              <span>Salida</span>
              <input v-model="salidaInput" type="time" placeholder="HH:MM" />
            </label>
          </div>
          <p class="modal-edit-hint">Regla fija de nómina: minutos &lt; 15 cuentan en la hora en punto, 15–44 a y media, y ≥ 45 en la siguiente hora. Si la salida es menor que la entrada se cuenta como turno que cruza medianoche.</p>
          <div class="modal-edit-actions">
            <button class="btn-edit-cancel" @click="cerrarEdicionHora">Cancelar</button>
            <button class="btn-edit-save" @click="guardarEdicionHora" :disabled="guardandoHora">
              {{ guardandoHora ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
