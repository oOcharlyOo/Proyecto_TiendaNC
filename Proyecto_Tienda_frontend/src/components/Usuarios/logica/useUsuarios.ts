import { ref, computed, onMounted, watch, shallowRef, nextTick } from 'vue';
import confetti from 'canvas-confetti';
import Swal from 'sweetalert2';

export type Usuario = {
  idUsuario: number;
  usuario: string;
  nombre: string;
  apellido_p: string;
  apellido_m: string;
  avatar: string | null;
  id_tipo_usuario: number;
  sueldo_hora?: number;
};

export type UsuarioForm = {
  idUsuario?: number;
  usuario: string;
  nombre: string;
  apellido_p: string;
  apellido_m: string;
  password_hash: string;
  id_tipo_usuario: number;
  avatar: string;
};

export type VentaUsuario = {
  idVenta: number;
  numeroTicket: number;
  montoTotal: number;
  metodoPago: string;
  fechaVenta: string;
  estatus: string;
};

export type ProductoVenta = {
  nombre: string;
  cantidadTotal: number;
  montoTotal: number;
  isGramaje: boolean;
};

export type UsuarioVentas = {
  usuario: Usuario;
  ventas: VentaUsuario[];
  totalVentas: number;
  totalMonto: number;
  productos: ProductoVenta[];
};

export type DiasCalendario = {
  [dia: number]: string;
};

export type DiaDetalle = {
  nombre: string;
  horas: number;
};

export type DiasCompletosDetallado = {
  [dia: number]: DiaDetalle;
};

export type UsuarioDiasData = {
  idUsuario: number;
  nombreUsuario: string;
  avatar: string | null;
  totalDias: number;
  diasLaborados: number[];
  diasCompletos: DiasCalendario;
  horasPorDia?: { [dia: number]: number };
  aperturas?: { [dia: number]: string };
  cierres?: { [dia: number]: string | null };
  horasXTrabajadas?: { [dia: number]: string };
  overflow?: OverflowDay[];
};

export type DiasTrabajadosData = {
  mes: number;
  anio: number;
  totalDiasMes: number;
  usuarios: UsuarioDiasData[];
};

export type SemanaInfo = {
  numero: number;
  dias: number[];
  label: string;
  fechaInicio: string;
  fechaFin: string;
};

export type TrabajadorInfo = {
  nombre: string;
  horas: number;
  apertura: string;
  cierre: string | null;
};

export type OverflowDay = {
  fecha: string;
  horas: number;
  apertura: string;
  cierre: string | null;
  horasX: string;
};

type DiaCalendarioItem = {
  numero: number | null;
  esHoy: boolean;
  trabajadores: TrabajadorInfo[];
  esVacio: boolean;
  horasTotales: number;
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const usuarios = ref<Usuario[]>([]);
const cargando = ref(false);
const modalAbierto = ref(false);
const editando = ref(false);
const modalSueldoAbierto = ref(false);

const seccionActiva = ref<'usuarios' | 'ventas' | 'asistencias'>('usuarios');
const ventasPorUsuario = ref<UsuarioVentas[]>([]);
const cargandoVentas = ref(false);
const filtroMesVentas = ref('');
const diasTrabajados = ref<DiasTrabajadosData | null>(null);
const cargandoAsistencias = ref(false);

const avatarPreview = ref<string | null>(null);
const avatarBase64 = ref<string>('');
const dragando = ref(false);

const form = ref<UsuarioForm>({
  usuario: '',
  nombre: '',
  apellido_p: '',
  apellido_m: '',
  password_hash: '',
  id_tipo_usuario: 2,
  avatar: ''
});

const tipoUsuarioActual = computed(() => Number(localStorage.getItem('tipoUsuario') || 2));
const esAdmin = computed(() => tipoUsuarioActual.value === 1);
const usuarioActualId = computed(() => Number(localStorage.getItem('idUsuario') || 0));

function puedeEditar(usuarioId: number) {
  return esAdmin.value || usuarioId === usuarioActualId.value;
}

const esEdicionPerfilPropio = computed(() => {
  return form.value.idUsuario === usuarioActualId.value;
});

const theme = ref(localStorage.getItem('theme') || 'zelda');

const usuarioTop = computed(() => {
  if (ventasPorUsuario.value.length === 0) return null;
  return ventasPorUsuario.value.reduce((top, actual) =>
    actual.totalMonto > top.totalMonto ? actual : top
  );
});

export function useUsuarios() {

  onMounted(() => {
    cargarUsuarios();
    inicializarFechas();
    window.addEventListener('storage', (e) => {
      if (e.key === 'theme') {
        theme.value = e.newValue || 'zelda';
      }
    });
  });

  async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json() as Promise<T>;
  }

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

  async function cargarUsuarios() {
    cargando.value = true;
    try {
      const usuariosData = await fetchApi<{ codigo: number; datos: Usuario[] }>(`${API_BASE}/usuarios/listarUsuarios`);
      usuarios.value = Array.isArray(usuariosData?.datos)
        ? usuariosData.datos.map(u => ({ ...u, avatar: u.avatar ? (formatAvatarUrl(u.avatar) ?? null) : null }))
        : [];
    } catch (error) {
      usuarios.value = [];
      console.error('Error al cargar usuarios:', error);
    } finally {
      cargando.value = false;
    }
  }

  function abrirModalNuevo() {
    editando.value = false;
    form.value = { usuario: '', nombre: '', apellido_p: '', apellido_m: '', password_hash: '', id_tipo_usuario: 2, avatar: '' };
    avatarPreview.value = null;
    avatarBase64.value = '';
    modalAbierto.value = true;
  }

  function abrirModalEditar(usuario: Usuario) {
    editando.value = true;
    form.value = { ...usuario, password_hash: '', avatar: usuario.avatar || '' };
    avatarPreview.value = usuario.avatar;
    avatarBase64.value = '';
    modalAbierto.value = true;
  }

  function cerrarModal() {
    modalAbierto.value = false;
    avatarPreview.value = null;
    avatarBase64.value = '';
    dragando.value = false;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragando.value = true;
  }

  function handleDragLeave() {
    dragando.value = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragando.value = false;
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      procesarArchivo(file);
    }
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) procesarArchivo(file);
  }

  function procesarArchivo(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      avatarBase64.value = result;
      avatarPreview.value = result;
      form.value.avatar = result;
    };
    reader.readAsDataURL(file);
  }

  async function guardarUsuario() {
    if (!form.value.usuario.trim() || !form.value.nombre.trim()) return;
    cargando.value = true;
    try {
      const body = { ...form.value };
      if (avatarBase64.value) {
        body.avatar = avatarBase64.value;
      }
      if (editando.value && form.value.idUsuario) {
        await fetchApi(`${API_BASE}/usuarios/actualizarUsuario/${form.value.idUsuario}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await fetchApi(`${API_BASE}/usuarios/agregarUsuario`, { method: 'POST', body: JSON.stringify(body) });
      }
      await cargarUsuarios();
      cerrarModal();
      if (!editando.value) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } catch (error) {
      console.error('Error al guardar usuario:', error);
    } finally {
      cargando.value = false;
    }
  }

  async function eliminarUsuario(id: number) {
    const result = await Swal.fire({
      title: '¿Eliminar usuario?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--error-color)',
      cancelButtonColor: 'var(--accent-color)',
      background: 'var(--bg-panel)',
      color: 'var(--text-primary)',
      customClass: { popup: 'swal2-popup-papyrus' }
    });

    if (!result.isConfirmed) return;
    try {
      await fetchApi(`${API_BASE}/usuarios/eliminarUsuario/${id}`, { method: 'DELETE' });
      await cargarUsuarios();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
    }
  }

  async function eliminarTurno(idUsuario: number, fecha: string, nombre: string): Promise<boolean> {
    const result = await Swal.fire({
      title: '¿Eliminar turno?',
      html: `Se eliminará la apertura y cierre de <strong>${nombre}</strong> del día <strong>${fecha}</strong>.<br/>Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--error-color)',
      cancelButtonColor: 'var(--accent-color)',
      background: 'var(--bg-panel)',
      color: 'var(--text-primary)',
      customClass: { popup: 'swal2-popup-papyrus' }
    });

    if (!result.isConfirmed) return false;
    try {
      const res = await fetch(`${API_BASE}/asistencias/turno?idUsuario=${idUsuario}&fecha=${fecha}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.codigo === 200) return true;
      console.error('Error al eliminar turno:', json.mensaje);
      return false;
    } catch (error) {
      console.error('Error de red al eliminar turno:', error);
      return false;
    }
  }

  function getTipoLabel(id: number): string {
    return id === 1 ? '🧙 Admin' : '⚔️ Vendedor';
  }

  function getNombreMes(mes: number): string {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mes - 1] || '';
  }

  function getIniciales(nombre: string, apellido_p?: string): string {
    return `${(nombre || '')[0] || ''}${(apellido_p || '')[0] || ''}`.toUpperCase();
  }

  async function cargarVentasPorUsuario(mes?: number, anio?: number) {
    cargandoVentas.value = true;
    const now = new Date();
    const m = mes ?? now.getMonth() + 1;
    const a = anio ?? now.getFullYear();
    filtroMesVentas.value = `${a}-${String(m).padStart(2, '0')}`;
    try {
      const data = await fetchApi<{ codigo: number; datos: UsuarioVentas[] }>(`${API_BASE}/ventas/ventasPorUsuario?mes=${m}&anio=${a}`);
      if (data?.codigo === 200 && Array.isArray(data.datos)) {
        ventasPorUsuario.value = data.datos;
      } else {
        ventasPorUsuario.value = [];
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      ventasPorUsuario.value = [];
    } finally {
      cargandoVentas.value = false;
    }
  }

  function cambiarSeccion(seccion: 'usuarios' | 'ventas' | 'asistencias') {
    seccionActiva.value = seccion;
  }

  function formatoMoneda(valor: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
  }

  function formatoFecha(fecha?: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatoCantidad(cantidad: number, isGramaje: boolean): string {
    if (!isGramaje) return `${cantidad} pza`;
    if (cantidad >= 1000) {
      const kg = cantidad / 1000;
      return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2)} kg`;
    }
    return `${cantidad} g`;
  }

  function inicializarFechas() {
    const now = new Date();
    const year = now.getFullYear();
    const mes = now.getMonth() + 1;
    cargarVentasPorUsuario(mes, year);
  }

  async function cargarAsistencias(mes?: number, anio?: number) {
    if (usuarios.value.length === 0) {
      await cargarUsuarios();
    }
    cargandoAsistencias.value = true;
    const now = new Date();
    const m = mes ?? now.getMonth() + 1;
    const a = anio ?? now.getFullYear();
    try {
      const data = await fetchApi<{ codigo: number; datos: DiasTrabajadosData }>(`${API_BASE}/asistencias/dias-trabajados?mes=${m}&anio=${a}`);
      if (data?.codigo === 200 && data.datos) {
        diasTrabajados.value = data.datos;
        await nextTick();
      }
    } catch (error) {
      console.error('Error al cargar asistencias:', error);
    } finally {
      cargandoAsistencias.value = false;
    }
  }

  const guardandoHora = ref(false);

  async function guardarHoraCaja(idUsuario: number, fecha: string, hora: string, tipo: 'apertura' | 'cierre'): Promise<boolean> {
    guardandoHora.value = true;
    try {
      const res = await fetch(`${API_BASE}/asistencias/hora`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuario, fecha, hora, tipo })
      });
      const json = await res.json();
      if (json.codigo === 200) return true;
      console.error('Error al guardar hora:', json.mensaje);
      return false;
    } catch (error) {
      console.error('Error de red al guardar hora:', error);
      return false;
    } finally {
      guardandoHora.value = false;
    }
  }

  function getHorasTotales(usuario: UsuarioDiasData): number {
    let total = 0;
    if (usuario.horasPorDia) {
      total += Object.values(usuario.horasPorDia).reduce((a, b) => a + b, 0);
    } else if (usuario.diasLaborados) {
      total += usuario.diasLaborados.length * 8;
    }
    if (usuario.overflow) {
      total += usuario.overflow.reduce((sum, ov) => sum + (ov.horas || 0), 0);
    }
    return total;
  }

  function getHorasFormateadas(horas: number): string {
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return `${h}h ${m}m`;
  }

  function formatoHora(hora: string | null | undefined): string {
    if (!hora) return '—';
    const timePart = hora.includes('T') ? hora.split('T')[1] : hora;
    return timePart.slice(0, 5);
  }

  function getHorasDelDia(usuario: UsuarioDiasData, dia: number): number {
    return usuario.horasPorDia?.[dia] || 0;
  }

  function getDiasCalendario(mes: number, anio: number): DiaCalendarioItem[] {
    const dias: DiaCalendarioItem[] = [];
    const firstDay = new Date(anio, mes - 1, 1).getDay();
    const daysInMonth = new Date(anio, mes, 0).getDate();
    const hoy = new Date();

    for (let i = 0; i < firstDay; i++) {
      dias.push({ numero: null, esHoy: false, trabajadores: [], esVacio: true, horasTotales: 0 });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const trabajadores: TrabajadorInfo[] = [];
      let horasTotales = 0;

      if (diasTrabajados.value?.usuarios) {
        for (const user of diasTrabajados.value.usuarios) {
          if (user.diasLaborados?.includes(d)) {
            const horas = getHorasDelDia(user, d);
            horasTotales += horas;
            trabajadores.push({
              nombre: user.nombreUsuario,
              horas,
              apertura: user.aperturas?.[d] || '—',
              cierre: user.cierres?.[d] || null
            });
          }
        }
      }

      const esHoy = d === hoy.getDate() && mes === hoy.getMonth() + 1 && anio === hoy.getFullYear();
      dias.push({ numero: d, esHoy, trabajadores, esVacio: false, horasTotales });
    }

    return dias;
  }

  function semanasDelMes(mes: number, anio: number): SemanaInfo[] {
    const semanas: SemanaInfo[] = [];
    const rawDay = new Date(anio, mes - 1, 1).getDay();
    const offset = (rawDay + 6) % 7;
    const daysInMonth = new Date(anio, mes, 0).getDate();
    let semanaNum = 0;
    let currentWeek: number[] = [];
    let weekStartDay = 1 - offset;

    for (let i = 0; i < offset; i++) {
      currentWeek.push(0);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        const startDate = new Date(anio, mes - 1, weekStartDay);
        const endDate = new Date(anio, mes - 1, weekStartDay + 6);
        semanas.push({
          numero: ++semanaNum,
          dias: currentWeek,
          label: `Semana ${semanaNum}`,
          fechaInicio: startDate.toISOString().slice(0, 10),
          fechaFin: endDate.toISOString().slice(0, 10)
        });
        currentWeek = [];
        weekStartDay += 7;
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(0);
      }
      const startDate = new Date(anio, mes - 1, weekStartDay);
      const endDate = new Date(anio, mes - 1, weekStartDay + 6);
      semanas.push({
        numero: ++semanaNum,
        dias: currentWeek,
        label: `Semana ${semanaNum}`,
        fechaInicio: startDate.toISOString().slice(0, 10),
        fechaFin: endDate.toISOString().slice(0, 10)
      });
    }

    return semanas;
  }

  function getHorasOverflowEnSemana(usuario: UsuarioDiasData, semana: SemanaInfo): number {
    if (!usuario.overflow || usuario.overflow.length === 0) return 0;
    return usuario.overflow.reduce((sum, ov) => {
      if (ov.fecha >= semana.fechaInicio && ov.fecha <= semana.fechaFin) {
        return sum + (ov.horas || 0);
      }
      return sum;
    }, 0);
  }

  function getPagoSemanal(usuario: UsuarioDiasData, semana: SemanaInfo): number {
    const horasMes = semana.dias.reduce((sum, dia) => {
      if (dia === 0) return sum;
      return sum + getHorasDelDia(usuario, dia);
    }, 0);
    const horasOv = getHorasOverflowEnSemana(usuario, semana);
    const sueldo = usuario.idUsuario ? usuarios.value.find(u => u.idUsuario === usuario.idUsuario)?.sueldo_hora || 0 : 0;
    return (horasMes + horasOv) * sueldo;
  }

  function getPagoTotal(usuario: UsuarioDiasData): number {
    if (!diasTrabajados.value) return 0;
    const semanas = semanasDelMes(diasTrabajados.value.mes, diasTrabajados.value.anio);
    return semanas.reduce((sum, sem) => sum + getPagoSemanal(usuario, sem), 0);
  }

  function getSueldoHora(usuarioId: number): number {
    return usuarios.value.find(u => u.idUsuario === usuarioId)?.sueldo_hora || 0;
  }

  function getHorasSemana(usuario: UsuarioDiasData, semana: SemanaInfo): number {
    const horasMes = semana.dias.reduce((sum, dia) => {
      if (dia === 0) return sum;
      return sum + getHorasDelDia(usuario, dia);
    }, 0);
    return horasMes + getHorasOverflowEnSemana(usuario, semana);
  }

  return {
    usuarios, cargando, modalAbierto, editando, modalSueldoAbierto,
    seccionActiva, ventasPorUsuario, cargandoVentas, filtroMesVentas,
    diasTrabajados, cargandoAsistencias,
    guardandoHora,
    avatarPreview, dragando, form,
    tipoUsuarioActual, esAdmin, puedeEditar,
    esEdicionPerfilPropio, usuarioTop,
    cargarUsuarios, cargarVentasPorUsuario, cargarAsistencias,
    guardarHoraCaja,
    cambiarSeccion, formatoMoneda, formatoFecha, formatoCantidad,
    abrirModalNuevo, abrirModalEditar, cerrarModal,
    handleDragOver, handleDragLeave, handleDrop, handleFileSelect,
    formatAvatarUrl, guardarUsuario, eliminarUsuario,
    eliminarTurno,
    getTipoLabel, getNombreMes, getIniciales,
    getHorasTotales, getHorasFormateadas, formatoHora,
    getHorasDelDia, getDiasCalendario, semanasDelMes,
    getPagoSemanal, getPagoTotal, getSueldoHora, getHorasSemana
  };
}