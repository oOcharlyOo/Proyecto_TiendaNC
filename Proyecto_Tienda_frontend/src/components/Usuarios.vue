<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import confetti from 'canvas-confetti';
import SueldoXHoraModal from './modals/SueldoXHoraModal.vue';

type Usuario = {
  idUsuario: number;
  usuario: string;
  nombre: string;
  apellido_p: string;
  apellido_m: string;
  avatar: string | null;
  id_tipo_usuario: number;
  sueldo_hora?: number;
};

type UsuarioForm = {
  idUsuario?: number;
  usuario: string;
  nombre: string;
  apellido_p: string;
  apellido_m: string;
  password_hash: string;
  id_tipo_usuario: number;
  avatar: string;
};

type VentaUsuario = {
  idVenta: number;
  numeroTicket: number;
  montoTotal: number;
  metodoPago: string;
  fechaVenta: string;
  estatus: string;
};

type ProductoVenta = {
  nombre: string;
  cantidadTotal: number;
  montoTotal: number;
  isGramaje: boolean;
};

type UsuarioVentas = {
  usuario: Usuario;
  ventas: VentaUsuario[];
  totalVentas: number;
  totalMonto: number;
  productos: ProductoVenta[];
};

type DiasCalendario = {
  [dia: number]: string;
};

type DiaDetalle = {
  nombre: string;
  horas: number;
};

type DiasCompletosDetallado = {
  [dia: number]: DiaDetalle;
};

type UsuarioDiasData = {
  idUsuario: number;
  nombreUsuario: string;
  avatar: string | null;
  totalDias: number;
  diasLaborados: number[];
  diasCompletos: DiasCalendario;
  horasPorDia?: { [dia: number]: number };
};

type DiasTrabajadosData = {
  mes: number;
  anio: number;
  totalDiasMes: number;
  usuarios: UsuarioDiasData[];
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
const posicionAvatar = ref({ x: 0, y: 0 });
const escalaAvatar = ref(1);
const imgAvatar = ref<HTMLImageElement | null>(null);

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

onMounted(() => {
  cargarUsuarios();
  inicializarFechas();
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      theme.value = e.newValue || 'zelda';
    }
  });
});

function inicializarFechas() {
  const ahora = new Date();
  const anio = ahora.getFullYear().toString();
  const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
  filtroMesVentas.value = `${anio}-${mes}`;
}

async function cargarUsuarios() {
  cargando.value = true;
  try {
    const res = await fetch(`${API_BASE}/usuarios/listarUsuarios`);
    const data = await res.json();
    if (data.codigo === 200) {
      usuarios.value = data.datos || [];
    }
  } catch (e) {
    console.error('Error al cargar usuarios:', e);
  } finally {
    cargando.value = false;
  }
}

async function cargarVentasPorUsuario() {
  if (!filtroMesVentas.value) return;
  
  const [anio, mes] = filtroMesVentas.value.split('-');
  if (!anio || !mes) return;
  
  cargandoVentas.value = true;
  try {
    const res = await fetch(
      `${API_BASE}/ventas/ventasPorUsuario?mes=${mes}&anio=${anio}`
    );
    const data = await res.json();
    if (data.codigo === 200) {
      ventasPorUsuario.value = data.datos || [];
      if (ventasPorUsuario.value.length > 0) {
        setTimeout(() => triggerConfetti(), 300);
      }
    }
  } catch (e) {
    console.error('Error al cargar ventas por usuario:', e);
  } finally {
    cargandoVentas.value = false;
  }
}

async function cargarAsistencias() {
  if (!filtroMesVentas.value) return;
  
  const [anio, mes] = filtroMesVentas.value.split('-');
  if (!anio || !mes) return;
  
  cargandoAsistencias.value = true;
  try {
    const [diasRes, ventasRes] = await Promise.all([
      fetch(`${API_BASE}/ventas/diasTrabajados?mes=${mes}&anio=${anio}`),
      fetch(`${API_BASE}/ventas/ventasPorUsuario?mes=${mes}&anio=${anio}`)
    ]);
    
    const diasData = await diasRes.json();
    const ventasData = await ventasRes.json();
    
    if (diasData.codigo === 200) {
      let datos = diasData.datos;
      
      if (datos?.usuarios && ventasData.codigo === 200) {
        const ventasPorUsuarioData = ventasData.datos || [];
        console.log('Ventas por usuario:', ventasPorUsuarioData);
        
        const horasPorUsuario: { [idUsuario: number]: { [dia: number]: number } } = {};
        
        for (const usuarioData of ventasPorUsuarioData) {
          const usuarioId = usuarioData.usuario?.idUsuario || usuarioData.usuario?.id;
          if (usuarioId) {
            const ventasUsuario = usuarioData.ventas || [];
            horasPorUsuario[usuarioId] = calcularHorasPorDiaUsuario(ventasUsuario);
            console.log(`Horas del usuario ${usuarioId}:`, horasPorUsuario[usuarioId]);
          }
        }
        
        datos = {
          ...datos,
          usuarios: datos.usuarios.map((u: any) => ({
            ...u,
            horasPorDia: horasPorUsuario[u.idUsuario] || {}
          }))
        };
      }
      
      diasTrabajados.value = datos;
      console.log('Datos finales con horas:', diasTrabajados.value);
    }
  } catch (e) {
    console.error('Error al cargar asistencia:', e);
  } finally {
    cargandoAsistencias.value = false;
  }
}

function calcularHorasPorDiaUsuario(ventas: any[]): { [dia: number]: number } {
  const horasPorDia: { [dia: number]: number } = {};
  
  if (!ventas || ventas.length === 0) return horasPorDia;
  
  const ventasPorDia = new Map<number, { primera: Date; ultima: Date }>();
  
  for (const venta of ventas) {
    if (!venta.fechaVenta) continue;
    
    const fecha = new Date(venta.fechaVenta);
    const dia = fecha.getDate();
    
    if (!ventasPorDia.has(dia)) {
      ventasPorDia.set(dia, { primera: fecha, ultima: fecha });
    }
    
    const existente = ventasPorDia.get(dia)!;
    if (fecha < existente.primera) existente.primera = fecha;
    if (fecha > existente.ultima) existente.ultima = fecha;
  }
  
  for (const [dia, horas] of ventasPorDia) {
    const diffMs = horas.ultima.getTime() - horas.primera.getTime();
    let horasTotales = diffMs / (1000 * 60 * 60);
    
    if (horasTotales < 0.5) horasTotales = 0.5;
    if (horasTotales > 12) horasTotales = 12;
    
    horasPorDia[dia] = Math.round(horasTotales * 2) / 2;
  }
  
  return horasPorDia;
}



function triggerConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#c4a035', '#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1']
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#c4a035', '#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
}

function cambiarSeccion(seccion: 'usuarios' | 'ventas' | 'asistencias') {
  seccionActiva.value = seccion;
  if (seccion === 'ventas' && ventasPorUsuario.value.length === 0) {
    cargarVentasPorUsuario();
  }
  if (seccion === 'asistencias') {
    cargarAsistencias();
  }
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(valor);
}

function formatoFecha(fecha?: string) {
  if (!fecha) return 'N/D';
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return 'N/D';
  return parsed.toLocaleString('es-MX');
}

function formatoCantidad(cantidad: number, isGramaje: boolean) {
  if (!isGramaje) return `${cantidad} pza`;
  if (cantidad >= 1000) {
    const kg = cantidad / 1000;
    return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2)} kg`;
  }
  return `${cantidad} g`;
}

function abrirModalNuevo() {
  editando.value = false;
  form.value = {
    usuario: '',
    nombre: '',
    apellido_p: '',
    apellido_m: '',
    password_hash: '',
    id_tipo_usuario: 2,
    avatar: ''
  };
  avatarPreview.value = null;
  avatarBase64.value = '';
  posicionAvatar.value = { x: 0, y: 0 };
  escalaAvatar.value = 1;
  modalAbierto.value = true;
}

function abrirModalEditar(usuario: Usuario) {
  editando.value = true;
  form.value = {
    idUsuario: usuario.idUsuario,
    usuario: usuario.usuario,
    nombre: usuario.nombre,
    apellido_p: usuario.apellido_p,
    apellido_m: usuario.apellido_m || '',
    password_hash: '',
    id_tipo_usuario: usuario.id_tipo_usuario,
    avatar: usuario.avatar || ''
  };
  avatarPreview.value = usuario.avatar;
  avatarBase64.value = '';
  posicionAvatar.value = { x: 0, y: 0 };
  escalaAvatar.value = 1;
  modalAbierto.value = true;
}

function cerrarModal() {
  modalAbierto.value = false;
  avatarPreview.value = null;
  avatarBase64.value = '';
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
  if (file) {
    procesarArchivo(file);
  }
}

function procesarArchivo(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    avatarBase64.value = result;
    avatarPreview.value = result;
    form.value.avatar = result;
    posicionAvatar.value = { x: 0, y: 0 };
    escalaAvatar.value = 1;
  };
  reader.readAsDataURL(file);
}

let isDragging = false;
let startX = 0;
let startY = 0;

function handleMouseDown(e: MouseEvent) {
  if (!avatarPreview.value) return;
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  posicionAvatar.value = {
    x: posicionAvatar.value.x + dx,
    y: posicionAvatar.value.y + dy
  };
  startX = e.clientX;
  startY = e.clientY;
}

function handleMouseUp() {
  isDragging = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
}

function handleWheel(e: WheelEvent) {
  if (!avatarPreview.value) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  escalaAvatar.value = Math.max(0.5, Math.min(2, escalaAvatar.value + delta));
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

async function guardarUsuario() {
  if (!esAdmin.value && form.value.id_tipo_usuario === 1) {
    alert('No tienes permisos para asignar rol de administrador');
    return;
  }

  const payload = {
    usuario: form.value.usuario,
    nombre: form.value.nombre,
    apellido_p: form.value.apellido_p,
    apellido_m: form.value.apellido_m,
    password_hash: form.value.password_hash,
    id_tipo_usuario: form.value.id_tipo_usuario,
    avatar: avatarBase64.value || form.value.avatar
  };

  const url = editando.value 
    ? `${API_BASE}/usuarios/actualizarUsuario/${form.value.idUsuario}`
    : `${API_BASE}/usuarios/agregarUsuario`;

  const method = editando.value ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.codigo === 200) {
      await cargarUsuarios();
      cerrarModal();
    } else {
      alert(data.mensaje || 'Error al guardar');
    }
  } catch (e) {
    console.error('Error:', e);
    alert('Error al guardar usuario');
  }
}

async function eliminarUsuario(id: number) {
  if (!confirm('¿Eliminar este usuario?')) return;
  
  try {
    const res = await fetch(`${API_BASE}/usuarios/eliminarUsuario/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.codigo === 200) {
      await cargarUsuarios();
    } else {
      alert(data.mensaje || 'Error al eliminar');
    }
  } catch (e) {
    console.error('Error:', e);
    alert('Error al eliminar usuario');
  }
}

function getTipoLabel(tipo: number) {
  return tipo === 1 ? 'Admin' : 'Usuario';
}

function getNombreMes(mes: number): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return meses[mes - 1] || '';
}

function getIniciales(nombre: string): string {
  if (!nombre) return '?';
  const partes = nombre.trim().split(' ');
  if (partes.length === 1) {
    return partes[0].substring(0, 2).toUpperCase();
  }
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function getHorasTotales(usuario: UsuarioDiasData): number {
  if (usuario.horasPorDia) {
    return Object.values(usuario.horasPorDia).reduce((sum, h) => sum + h, 0);
  }
  return usuario.totalDias * 8;
}

function getHorasFormateadas(horas: number): string {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getHorasDelDia(usuario: UsuarioDiasData, dia: number): number {
  if (usuario.horasPorDia && usuario.horasPorDia[dia] !== undefined) {
    return usuario.horasPorDia[dia];
  }
  return 8;
}

function getDiasCalendario(): Array<{numero: number | null; esHoy: boolean; trabajadores: {nombre: string; horas: number}[]; esVacio: boolean; horasTotales: number}> {
  if (!diasTrabajados.value) return [];
  
  const { mes, anio, totalDiasMes, usuarios } = diasTrabajados.value;
  const hoy = new Date();
  const esMesActual = hoy.getFullYear() === anio && (hoy.getMonth() + 1) === mes;
  
  const primerDia = new Date(anio, mes - 1, 1);
  const diaSemanaInicio = primerDia.getDay();
  const offsetSemana = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1;
  
  const diasMap: Map<number, {nombre: string; horas: number}[]> = new Map();
  usuarios.forEach(usuario => {
    Object.entries(usuario.diasCompletos).forEach(([diaStr, nombre]) => {
      const dia = parseInt(diaStr, 10);
      const horas = getHorasDelDia(usuario, dia);
      if (!diasMap.has(dia)) {
        diasMap.set(dia, []);
      }
      diasMap.get(dia)!.push({ nombre, horas });
    });
  });
  
  const dias: Array<{numero: number | null; esHoy: boolean; trabajadores: {nombre: string; horas: number}[]; esVacio: boolean; horasTotales: number}> = [];
  
  for (let i = 0; i < offsetSemana; i++) {
    dias.push({ numero: null, esHoy: false, trabajadores: [], esVacio: true, horasTotales: 0 });
  }
  
  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const trabajadoresDia = diasMap.get(dia) || [];
    const horasTotales = trabajadoresDia.reduce((sum, t) => sum + t.horas, 0);
    const esDiaHoy = esMesActual && dia === hoy.getDate();
    dias.push({ numero: dia, esHoy: esDiaHoy, trabajadores: trabajadoresDia, esVacio: false, horasTotales });
  }
  
  const remainder = dias.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      dias.push({ numero: null, esHoy: false, trabajadores: [], esVacio: true, horasTotales: 0 });
    }
  }
  
  return dias;
}
</script>

<template>
  <main class="usuarios-layout">
    <div class="bg-fog"></div>
    <div class="bg-scanlines"></div>
    
    <header class="hero-section">
      <div class="hero-decoration left">❧</div>
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="title-icon">👥</span>
          Gestión de Héroes
          <span class="title-icon">⚔</span>
        </h1>
        <p class="hero-subtitle">Administra los guerreros del reino</p>
      </div>
      <div class="hero-decoration right">❧</div>
    </header>

    <section class="tabs-section">
      <div class="tabs-container">
        <button 
          class="tab-btn" 
          :class="{ active: seccionActiva === 'usuarios' }"
          @click="cambiarSeccion('usuarios')"
        >
          <span class="tab-icon">👥</span>
          <span class="tab-text">Héroes</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: seccionActiva === 'ventas' }"
          @click="cambiarSeccion('ventas')"
        >
          <span class="tab-icon">📊</span>
          <span class="tab-text">Desempeño</span>
          <span class="tab-badge">BETA</span>
        </button>
        <button 
          v-if="esAdmin"
          class="tab-btn" 
          :class="{ active: seccionActiva === 'asistencias' }"
          @click="cambiarSeccion('asistencias')"
        >
          <span class="tab-icon">📅</span>
          <span class="tab-text">Asistencias</span>
        </button>
      </div>
    </section>

    <section class="stats-section" v-if="seccionActiva === 'usuarios'">
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

    <!-- Sección Gestión de Usuarios -->
    <div v-if="seccionActiva === 'usuarios'" class="seccion-usuarios">
      <div class="header-actions" v-if="esAdmin">
        <button class="btn-primary" @click="abrirModalNuevo">
          <span class="btn-icon">➕</span>
          Nuevo Héroe
        </button>
        <button class="btn-secondary" @click="modalSueldoAbierto = true">
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
            <button class="btn-edit" @click="abrirModalEditar(usuario)">
              <span class="btn-icon">✏️</span>
            </button>
            <button 
              class="btn-delete" 
              @click="eliminarUsuario(usuario.idUsuario)"
              :disabled="usuario.idUsuario === tipoUsuarioActual"
            >
              <span class="btn-icon">🗑️</span>
            </button>
          </div>
          <div v-else-if="puedeEditar(usuario.idUsuario)" class="usuario-actions">
            <button class="btn-edit" @click="abrirModalEditar(usuario)">
              <span class="btn-icon">✏️</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección Ventas por Usuario (BETA) -->
    <div v-if="seccionActiva === 'ventas'" class="seccion-ventas">
      <div class="ventas-filtros">
        <div class="filtro-group">
          <label>📅 Período</label>
          <div class="filtro-fecha">
            <input v-model="filtroMesVentas" type="month" @change="cargarVentasPorUsuario">
            <button class="btn-load" @click="cargarVentasPorUsuario" :disabled="cargandoVentas">
              {{ cargandoVentas ? 'Cargando...' : 'Cargar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Usuario Top -->
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

      <!-- Sección Asistencias (Solo Admin) -->
      <div v-if="seccionActiva === 'asistencias' && esAdmin" class="seccion-asistencias">
        <div class="ventas-filtros">
          <div class="filtro-group">
            <label>📅 Período</label>
            <div class="filtro-fecha">
              <input v-model="filtroMesVentas" type="month" @change="cargarAsistencias">
              <button class="btn-load" @click="cargarAsistencias" :disabled="cargandoAsistencias">
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
                    :title="`${trabajador.nombre} - ${getHorasFormateadas(trabajador.horas)}`"
                  >
                    <span class="trabajador-inicial">{{ getIniciales(trabajador.nombre) }}</span>
                    <span class="trabajador-horas">{{ getHorasFormateadas(trabajador.horas) }}</span>
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
                    :title="`Día ${dia} - ${getHorasFormateadas(getHorasDelDia(usuario, dia))}`"
                  >
                    <span class="dia-num">{{ dia }}</span>
                    <span class="dia-horas">{{ getHorasFormateadas(getHorasDelDia(usuario, dia)) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    <Transition name="modal">
      <div v-if="modalAbierto" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal-card panel">
          <div class="modal-corner tl"></div>
          <div class="modal-corner tr"></div>
          <div class="modal-corner bl"></div>
          <div class="modal-corner br"></div>
          <button class="btn-cerrar-modal" @click="cerrarModal">✕</button>
          
          <div class="modal-content-scroll">
            <div class="modal-header-zelda">
              <span class="modal-icon-zelda">{{ editando ? '✏️' : '⚔' }}</span>
              <h3>{{ editando ? 'Editar Héroe' : 'Nuevo Héroe' }}</h3>
            </div>

            <div class="modal-body-zelda">
              <div class="avatar-upload-section">
                <div 
                  class="avatar-dropzone"
                  :class="{ dragando }"
                  @dragover="handleDragOver"
                  @dragleave="handleDragLeave"
                  @drop="handleDrop"
                  @click="(($refs.fileInput as HTMLInputElement)?.click())"
                  @mousedown="handleMouseDown"
                  @wheel="handleWheel"
                >
                  <input 
                    ref="fileInput"
                    type="file" 
                    accept="image/*" 
                    @change="handleFileSelect"
                    style="display: none"
                  />
                  
                  <div 
                    v-if="avatarPreview" 
                    class="avatar-preview-container"
                  >
                    <img 
                      ref="imgAvatar"
                      :src="avatarPreview" 
                      class="avatar-preview"
                      :style="{
                        transform: `translate(${posicionAvatar.x}px, ${posicionAvatar.y}px) scale(${escalaAvatar})`
                      }"
                      draggable="false"
                    />
                  </div>
                  <div v-else class="dropzone-placeholder">
                    <span class="drop-icon">📁</span>
                    <span>Arrastra imagen</span>
                    <small>Scroll para zoom</small>
                  </div>
                </div>
              </div>

              <div class="form-grid-zelda">
                <div class="form-group-zelda">
                  <label>Usuario</label>
                  <input v-model="form.usuario" type="text" required placeholder="Nombre de usuario" class="zelda-input" />
                </div>
                <div class="form-group-zelda">
                  <label>Nombre</label>
                  <input v-model="form.nombre" type="text" required placeholder="Nombre" class="zelda-input" />
                </div>
                <div class="form-group-zelda">
                  <label>Apellido Paterno</label>
                  <input v-model="form.apellido_p" type="text" placeholder="Apellido paterno" class="zelda-input" />
                </div>
                <div class="form-group-zelda">
                  <label>Apellido Materno</label>
                  <input v-model="form.apellido_m" type="text" placeholder="Apellido materno" class="zelda-input" />
                </div>
                <div class="form-group-zelda">
                  <label>Password</label>
                  <input 
                    v-model="form.password_hash" 
                    type="password" 
                    :placeholder="editando ? 'Dejar vacio para mantener' : 'Contraseña'"
                    class="zelda-input"
                  />
                </div>
                <div class="form-group-zelda">
                  <label>Tipo</label>
                  <select v-model="form.id_tipo_usuario" :disabled="!esAdmin && esEdicionPerfilPropio" class="zelda-input zelda-select">
                    <option :value="1">👑 Administrador</option>
                    <option :value="2">🛡 Usuario</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="modal-actions-zelda">
              <button class="btn-cancel-zelda" @click="cerrarModal">
                <span>✕</span> Cancelar
              </button>
              <button class="btn-save-zelda" @click="guardarUsuario">
                <span>⚔</span> {{ editando ? 'Actualizar' : 'Crear' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <SueldoXHoraModal 
      :open="modalSueldoAbierto" 
      @close="modalSueldoAbierto = false"
      @save="(usuarios) => { cargarUsuarios(); modalSueldoAbierto = false; }"
    />
  </main>
</template>

<style scoped>
.usuarios-layout {
  height: 100%;
  min-height: 0;
  width: 100%;
  padding: 1rem;
  background: var(--bg-primary);
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  z-index: 1;
}

.hero-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  position: relative;
}

.hero-decoration {
  font-size: 2rem;
  color: var(--accent-color);
  text-shadow: 0 0 10px var(--accent-color);
  animation: pulse 2s ease-in-out infinite;
}

.hero-decoration.left { transform: rotate(-15deg); }
.hero-decoration.right { transform: rotate(15deg); }

@keyframes pulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.hero-decoration.left { animation-delay: 0s; }
.hero-decoration.right { animation-delay: 0.5s; }

.hero-content { text-align: center; }

.hero-title {
  font-family: 'HyliaSerifBeta', 'Palatino Linotype', serif;
  font-size: clamp(1.5rem, 5vw, 2.2rem);
  color: var(--accent-color);
  text-shadow: 3px 3px 0 var(--border-color), 0 0 20px var(--accent-color);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.title-icon { font-size: 1.5em; }

.hero-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
  font-style: italic;
}

.tabs-section { padding: 0 0.5rem; }

.tabs-container {
  display: flex;
  gap: 0.5rem;
  background: var(--bg-secondary);
  padding: 0.3rem;
  border-radius: 12px;
  border: 2px solid var(--border-color);
  justify-content: center;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.6rem 1.2rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent-color) 10%, transparent);
}

.tab-btn.active {
  background: var(--accent-color);
  color: var(--bg-primary);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--accent-color) 40%, transparent);
}

.tab-icon { font-size: 1.1rem; }

.tab-badge {
  font-size: 0.55rem;
  background: var(--error-color);
  color: white;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-weight: 700;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  padding: 0 0.5rem;
}

.stat-card-wrapper {
  animation: fadeSlideIn 400ms ease-out backwards;
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(-15px); }
  to { opacity: 1; transform: translateY(0); }
}

.stat-card {
  position: relative;
  padding: 0.85rem;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  box-shadow: 0 4px 0 var(--border-color), 0 6px 12px var(--shadow-color);
  text-align: center;
  overflow: hidden;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 var(--border-color), 0 8px 16px var(--shadow-color);
}

.stat-card.gold {
  border-color: var(--accent-color);
  background: linear-gradient(135deg, var(--bg-secondary) 0%, color-mix(in srgb, var(--accent-color) 20%, var(--bg-primary)) 100%);
}

.stat-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, var(--accent-color) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.stat-card:hover .stat-glow { opacity: 0.05; }

.stat-icon-wrapper { margin-bottom: 0.4rem; }

.stat-icon {
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px var(--shadow-color));
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.stat-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  font-weight: 600;
}

.stat-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.stat-card.gold .stat-value { color: var(--accent-color); }

.stat-decoration {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.6rem;
  color: var(--accent-color);
  opacity: 0.5;
}

.seccion-usuarios { padding: 0 0.5rem; }

.header-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.btn-primary, .btn-secondary {
  padding: 0.7rem 1.2rem;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  border: 2px solid var(--border-color);
  box-shadow: 0 4px 0 var(--border-color);
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 50%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-primary:hover, .btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 var(--border-color);
}

.btn-primary:active, .btn-secondary:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--border-color);
}

.btn-icon { font-size: 1.1rem; }

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.usuarios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  padding-bottom: 1rem;
}

.usuario-card {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-panel) 100%);
  border: 3px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
  animation: fadeInUp 0.5s ease forwards;
  opacity: 0;
  box-shadow: 0 6px 0 var(--border-color), 0 8px 16px var(--shadow-color);
}

.usuario-card:hover {
  transform: translateY(-8px) scale(1.02);
  border-color: var(--accent-color);
  box-shadow: 0 12px 0 var(--accent-color), 0 16px 30px var(--shadow-color);
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.avatar-container {
  width: 100px;
  height: 100px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid var(--accent-color);
  box-shadow: 0 4px 12px var(--shadow-color);
  transition: all 0.3s ease;
  background: var(--bg-primary);
  position: relative;
}

.avatar-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px dashed var(--accent-color);
  opacity: 0;
  transition: opacity 0.3s;
}

.usuario-card:hover .avatar-ring { opacity: 1; }

.usuario-card:hover .avatar-container {
  transform: scale(1.1);
}

.avatar-img { width: 100%; height: 100%; object-fit: cover; }

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 900;
  color: var(--accent-color);
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
}

.usuario-info { margin-bottom: 0.5rem; }

.usuario-nombre {
  font-size: 1.1rem;
  margin-bottom: 0.2rem;
  color: var(--text-primary);
  font-family: 'HyliaSerifBeta', 'Palatino Linotype', serif;
}

.usuario-user {
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.tipo-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.8rem;
  font-size: 0.75rem;
  border-radius: 20px;
  text-transform: uppercase;
  font-weight: 600;
  background: var(--bg-panel);
  color: var(--accent-color);
  border: 2px solid var(--border-color);
}

.tipo-badge.admin {
  background: linear-gradient(135deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 70%, black) 100%);
  color: var(--bg-primary);
  border-color: var(--accent-color);
}

.badge-icon { font-size: 0.9rem; }

.usuario-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: center;
}

.btn-edit, .btn-delete {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: 2px solid var(--border-color);
  box-shadow: 0 3px 0 var(--border-color);
}

.btn-edit {
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  color: var(--bg-primary);
}

.btn-delete {
  background: linear-gradient(180deg, var(--error-color) 0%, color-mix(in srgb, var(--error-color) 70%, black) 100%);
  color: var(--text-primary);
}

.btn-edit:hover, .btn-delete:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 0 var(--border-color);
}

.btn-delete:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

.bg-fog {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(ellipse 90% 60% at 10% 50%, rgba(31, 91, 53, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse 70% 50% at 90% 40%, rgba(31, 91, 53, 0.1) 0%, transparent 50%);
  animation: bgFogDrift 10s ease-in-out infinite;
}

@keyframes bgFogDrift {
  0% { transform: translateX(-2%) translateY(0); }
  50% { transform: translateX(2%) translateY(-5px); }
  100% { transform: translateX(-2%) translateY(0); }
}

.bg-scanlines {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.05;
  background-image: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0 2px, rgba(0, 0, 0, 0.03) 2px 4px);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 0.5rem;
  background: var(--shadow-color);
  backdrop-filter: blur(4px);
  overflow: hidden;
}

.modal-card.panel {
  width: 100%;
  max-width: 480px;
  max-height: 95vh;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-panel) 100%);
  border: 3px solid var(--accent-color);
  box-shadow: 0 0 0 2px var(--border-color), 0 10px 30px var(--shadow-color);
  position: relative;
  overflow: hidden;
}

.modal-corner {
  position: absolute;
  width: 30px;
  height: 30px;
  z-index: 10;
}

.modal-corner::before,
.modal-corner::after {
  content: '';
  position: absolute;
  background: var(--accent-color);
}

.modal-corner::before { width: 100%; height: 3px; }
.modal-corner::after { width: 3px; height: 100%; }

.modal-corner.tl { top: 10px; left: 10px; }
.modal-corner.tl::before, .modal-corner.tl::after { top: 0; left: 0; }
.modal-corner.tr { top: 10px; right: 10px; }
.modal-corner.tr::before { top: 0; right: 0; }
.modal-corner.tr::after { top: 0; right: 0; }
.modal-corner.bl { bottom: 10px; left: 10px; }
.modal-corner.bl::before { bottom: 0; left: 0; }
.modal-corner.bl::after { bottom: 0; left: 0; }
.modal-corner.br { bottom: 10px; right: 10px; }
.modal-corner.br::before { bottom: 0; right: 0; }
.modal-corner.br::after { bottom: 0; right: 0; }

.btn-cerrar-modal {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 50%;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-color);
  z-index: 20;
  transition: all 0.2s;
}

.btn-cerrar-modal:hover {
  background: var(--accent-color);
  color: var(--bg-primary);
  transform: rotate(90deg);
}

.modal-content-scroll {
  max-height: 95vh;
  padding: 1.5rem;
  overflow-y: auto;
}

.modal-header-zelda {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px dashed var(--border-color);
}

.modal-icon-zelda { font-size: 1.8rem; }

.modal-header-zelda h3 {
  margin: 0;
  font-family: 'HyliaSerifBeta', 'Palatino Linotype', serif;
  font-size: 1.5rem;
  color: var(--accent-color);
  text-shadow: 2px 2px 0 var(--border-color);
  text-transform: uppercase;
}

.modal-body-zelda { margin-bottom: 1.5rem; }

.avatar-upload-section { margin-bottom: 1.5rem; }

.avatar-dropzone {
  width: 140px;
  height: 140px;
  margin: 0 auto;
  border: 3px dashed var(--border-color);
  border-radius: 50%;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.avatar-dropzone:hover, .avatar-dropzone.dragando {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-primary));
}

.avatar-preview-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.avatar-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.dropzone-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-align: center;
}

.drop-icon { font-size: 2rem; }

.form-grid-zelda {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group-zelda {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-group-zelda:first-child {
  grid-column: span 2;
}

.form-group-zelda label {
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.zelda-input {
  padding: 0.7rem 1rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.zelda-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 20%, transparent);
}

.zelda-select {
  cursor: pointer;
}

.modal-actions-zelda {
  display: flex;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 2px dashed var(--border-color);
}

.btn-cancel-zelda, .btn-save-zelda {
  flex: 1;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.9rem;
  border: 2px solid var(--border-color);
  box-shadow: 0 4px 0 var(--border-color);
  transition: all 0.2s;
}

.btn-cancel-zelda {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-save-zelda {
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  color: var(--bg-primary);
}

.btn-cancel-zelda:hover, .btn-save-zelda:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 var(--border-color);
}

/* Sección Ventas */
.seccion-ventas, .seccion-asistencias {
  position: relative;
  z-index: 1;
  padding: 0 0.5rem;
}

.ventas-filtros {
  background: var(--bg-secondary);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  border: 2px solid var(--border-color);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.filtro-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.filtro-group label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.filtro-fecha {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filtro-fecha input {
  padding: 0.6rem 0.8rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.btn-load {
  padding: 0.6rem 1rem;
  background: var(--accent-color);
  color: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 3px 0 var(--border-color);
}

.btn-load:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 0 var(--border-color);
}

.btn-load:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

.top-vendedor {
  background: linear-gradient(135deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 70%, black) 100%);
  border: 3px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 8px 30px color-mix(in srgb, var(--accent-color) 40%, transparent);
}

.top-badge { font-size: 4rem; animation: bounce 1s ease-in-out infinite; }

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.top-info { flex: 1; }

.top-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--bg-primary);
  opacity: 0.8;
}

.top-nombre {
  font-size: 1.8rem;
  margin: 0.3rem 0;
  color: var(--text-primary);
  text-shadow: 2px 2px 0 var(--border-color);
  font-family: 'HyliaSerifBeta', serif;
}

.top-stats {
  display: flex;
  gap: 1.5rem;
  color: var(--bg-primary);
  font-size: 1rem;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }

.usuarios-ventas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.usuario-ventas-card {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  animation: fadeSlideIn 0.3s ease-out backwards;
  transition: all 0.2s;
}

.usuario-ventas-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px var(--shadow-color);
  border-color: var(--accent-color);
}

.usuario-ventas-card.top {
  border-color: var(--accent-color);
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent-color) 10%, var(--bg-secondary)) 0%, var(--bg-secondary) 100%);
}

.usuario-ventas-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.usuario-avatar-small {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--accent-color);
}

.usuario-avatar-small img { width: 100%; height: 100%; object-fit: cover; }

.avatar-placeholder-small {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-color);
  color: var(--bg-primary);
  font-weight: 700;
  font-size: 1.2rem;
}

.usuario-ventas-info { flex: 1; }

.usuario-ventas-info h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
  font-family: 'HyliaSerifBeta', serif;
}

.usuario-ventas-total { text-align: right; }

.total-label {
  display: block;
  font-size: 0.65rem;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.usuario-ventas-total strong {
  font-size: 1.1rem;
  color: var(--success-color);
  font-family: "Courier New", monospace;
}

.usuario-ventas-stats {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat-item {
  flex: 1;
  background: var(--bg-primary);
  padding: 0.6rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid var(--border-color);
}

.stat-icon { font-size: 1rem; display: block; margin-bottom: 0.2rem; }
.stat-value { display: block; font-size: 1.2rem; font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; }

.usuario-productos h5, .usuario-ventas-detalles h5 {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
  letter-spacing: 0.05em;
}

.productos-list, .ventas-list {
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.producto-item, .venta-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.8rem;
  align-items: center;
}

.producto-item:last-child, .venta-item:last-child { border-bottom: none; }
.producto-nombre { color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.producto-qty { color: var(--text-secondary); font-size: 0.75rem; }
.producto-monto, .venta-monto { color: var(--success-color); font-weight: 600; font-family: "Courier New", monospace; }
.productos-more { padding: 0.4rem 0.6rem; font-size: 0.7rem; color: var(--text-secondary); text-align: center; background: var(--bg-secondary); }
.venta-ticket { font-weight: 700; color: var(--accent-color); }
.venta-fecha { color: var(--text-secondary); font-size: 0.75rem; }

/* Asistencias */
.asistencias-content { display: flex; flex-direction: column; gap: 1.5rem; }

.calendario-header {
  text-align: center;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 2px solid var(--border-color);
}

.calendario-header h3 {
  margin: 0;
  color: var(--accent-color);
  font-size: 1.2rem;
  font-family: 'HyliaSerifBeta', serif;
}

.calendario-grid {
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 2px solid var(--border-color);
  padding: 1rem;
}

.dias-semana {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.calendario-dias { 
  display: grid; 
  grid-template-columns: repeat(7, 1fr); 
  gap: 0.4rem; 
}

.calendario-grid {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  border: 2px solid var(--border-color);
  margin-bottom: 1.5rem;
}

.calendario-header {
  text-align: center;
  margin-bottom: 1rem;
}

.calendario-header h3 {
  font-family: 'HyliaSerifBeta', serif;
  color: var(--accent-color);
  font-size: 1.1rem;
  margin: 0 0 0.5rem 0;
}

.dias-semana {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.dias-semana span {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-color);
  text-transform: uppercase;
  padding: 0.3rem;
}

.dia-cell {
  min-height: 85px;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.dia-cell::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: transparent;
  transition: all 0.2s;
}

.dia-cell.dia-vacio { 
  background: transparent; 
  border: none; 
  min-height: 40px;
}

.dia-cell.dia-hoy { 
  border-color: var(--accent-color); 
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-primary));
  box-shadow: 0 0 15px color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.dia-cell.dia-hoy::before {
  background: linear-gradient(90deg, var(--accent-color), var(--accent-hover), var(--accent-color));
}

.dia-cell.dia-trabajado { 
  background: linear-gradient(135deg, color-mix(in srgb, var(--success-color) 10%, var(--bg-primary)) 0%, var(--bg-primary) 100%);
  border-color: color-mix(in srgb, var(--success-color) 50%, var(--border-color)); 
}

.dia-cell.dia-trabajado::before {
  background: var(--success-color);
}

.dia-numero { 
  font-weight: 700; 
  font-size: 0.85rem; 
  color: var(--text-primary);
  font-family: "Courier New", monospace;
}

.dia-cell.dia-hoy .dia-numero { 
  color: var(--accent-color); 
  text-shadow: 0 0 8px var(--accent-color);
}

.dia-cell.dia-trabajado .dia-numero {
  color: var(--success-color);
}

.dia-trabajadores { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 0.2rem; 
  justify-content: center; 
  max-width: 100%;
  width: 100%;
}

.trabajador-chip { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  padding: 0.15rem 0.25rem; 
  background: linear-gradient(135deg, var(--accent-color) 0%, #92400e 100%);
  color: var(--bg-primary); 
  border-radius: 4px; 
  font-size: 0.6rem;
  min-width: 36px;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 4px var(--shadow-color);
  transition: all 0.2s;
}

.trabajador-chip:hover {
  transform: scale(1.05);
  box-shadow: 0 3px 8px var(--shadow-color);
}

.trabajador-inicial { 
  font-weight: 700; 
  font-size: 0.55rem; 
  line-height: 1.1;
}

.trabajador-horas { 
  font-size: 0.65rem; 
  font-weight: 700;
  opacity: 1; 
  line-height: 1;
  font-family: "Courier New", monospace;
}

.dia-vacio-text { 
  color: var(--text-secondary); 
  opacity: 0.3; 
  font-size: 0.8rem; 
}

.dia-hoy-text { 
  font-size: 0.55rem; 
  color: var(--accent-color); 
  font-weight: 700; 
  text-transform: uppercase;
  background: color-mix(in srgb, var(--accent-color) 20%, transparent);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}

.dia-total-horas {
  font-size: 0.6rem;
  color: var(--success-color);
  font-weight: 700;
  font-family: "Courier New", monospace;
  background: color-mix(in srgb, var(--success-color) 15%, transparent);
  padding: 0.1rem 0.25rem;
  border-radius: 3px;
  margin-top: auto;
}

.trabajador-chip.mas {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 0.5rem;
  min-width: 20px;
}

@media (max-width: 600px) {
  .trabajador-chip.mas {
    font-size: 0.4rem;
    min-width: 16px;
  }
}

@media (max-width: 375px) {
  .trabajador-chip.mas {
    font-size: 0.35rem;
    min-width: 14px;
  }
}

/* Responsive Calendario */
@media (max-width: 992px) {
  .calendario-grid {
    padding: 0.75rem;
  }
  
  .calendario-header h3 {
    font-size: 1rem;
  }
  
  .dias-semana span {
    font-size: 0.7rem;
  }
  
  .dia-cell {
    min-height: 75px;
    padding: 0.35rem;
  }
  
  .dia-numero {
    font-size: 0.8rem;
  }
  
  .trabajador-chip {
    min-width: 32px;
    padding: 0.1rem 0.2rem;
  }
  
  .trabajador-inicial {
    font-size: 0.5rem;
  }
  
  .trabajador-horas {
    font-size: 0.6rem;
  }
}

@media (max-width: 768px) {
  .calendario-grid {
    padding: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .calendario-header h3 {
    font-size: 0.9rem;
  }
  
  .dias-semana {
    gap: 0.25rem;
  }
  
  .dias-semana span {
    font-size: 0.6rem;
    padding: 0.2rem;
  }
  
  .calendario-dias {
    gap: 0.3rem;
  }
  
  .dia-cell {
    min-height: 65px;
    padding: 0.25rem;
    border-radius: 6px;
  }
  
  .dia-cell.dia-vacio {
    min-height: 30px;
  }
  
  .dia-numero {
    font-size: 0.75rem;
  }
  
  .dia-trabajadores {
    gap: 0.15rem;
  }
  
  .trabajador-chip {
    min-width: 28px;
    padding: 0.08rem 0.15rem;
    font-size: 0.55rem;
  }
  
  .trabajador-inicial {
    font-size: 0.45rem;
  }
  
  .trabajador-horas {
    font-size: 0.55rem;
  }
}

@media (max-width: 600px) {
  .calendario-grid {
    padding: 0.4rem;
  }
  
  .calendario-header {
    margin-bottom: 0.75rem;
  }
  
  .calendario-header h3 {
    font-size: 0.85rem;
  }
  
  .dias-semana {
    gap: 0.2rem;
    margin-bottom: 0.4rem;
  }
  
  .dias-semana span {
    font-size: 0.55rem;
  }
  
  .calendario-dias {
    gap: 0.25rem;
  }
  
  .dia-cell {
    min-height: 55px;
    padding: 0.2rem;
    border-radius: 5px;
    border-width: 1px;
  }
  
  .dia-cell.dia-vacio {
    min-height: 25px;
  }
  
  .dia-numero {
    font-size: 0.7rem;
  }
  
  .dia-trabajadores {
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }
  
  .trabajador-chip {
    min-width: 26px;
    width: 100%;
    padding: 0.05rem 0.1rem;
  }
  
  .trabajador-inicial {
    font-size: 0.4rem;
  }
  
  .trabajador-horas {
    font-size: 0.5rem;
  }
  
  .dia-total-horas {
    font-size: 0.5rem;
  }
}

@media (max-width: 480px) {
  .calendario-grid {
    padding: 0.35rem;
    border-width: 1px;
  }
  
  .calendario-header h3 {
    font-size: 0.75rem;
    margin-bottom: 0.4rem;
  }
  
  .dias-semana {
    gap: 0.15rem;
  }
  
  .dias-semana span {
    font-size: 0.5rem;
    padding: 0.15rem 0;
  }
  
  .calendario-dias {
    gap: 0.2rem;
  }
  
  .dia-cell {
    min-height: 48px;
    padding: 0.15rem;
    border-radius: 4px;
  }
  
  .dia-cell.dia-vacio {
    min-height: 20px;
  }
  
  .dia-numero {
    font-size: 0.65rem;
  }
  
  .dia-trabajadores {
    gap: 0.08rem;
  }
  
  .trabajador-chip {
    min-width: 22px;
    padding: 0.05rem 0.1rem;
    border-radius: 3px;
  }
  
  .trabajador-inicial {
    font-size: 0.35rem;
  }
  
  .trabajador-horas {
    font-size: 0.45rem;
  }
  
  .dia-hoy-text {
    font-size: 0.45rem;
  }
  
  .dia-vacio-text {
    font-size: 0.6rem;
  }
}

@media (max-width: 375px) {
  .calendario-grid {
    padding: 0.25rem;
    margin-bottom: 0.75rem;
  }
  
  .calendario-header h3 {
    font-size: 0.7rem;
  }
  
  .dias-semana {
    gap: 0.1rem;
  }
  
  .dias-semana span {
    font-size: 0.45rem;
  }
  
  .calendario-dias {
    gap: 0.15rem;
  }
  
  .dia-cell {
    min-height: 42px;
    padding: 0.1rem;
    border-width: 1px;
  }
  
  .dia-cell.dia-vacio {
    min-height: 18px;
  }
  
  .dia-numero {
    font-size: 0.6rem;
    font-weight: 600;
  }
  
  .dia-trabajadores {
    gap: 0.05rem;
  }
  
  .trabajador-chip {
    min-width: 18px;
    padding: 0.03rem 0.05rem;
    border-radius: 2px;
    border-width: 1px;
  }
  
  .trabajador-inicial {
    font-size: 0.3rem;
  }
  
  .trabajador-horas {
    font-size: 0.4rem;
  }
  
  .dia-hoy-text {
    font-size: 0.4rem;
    padding: 0.05rem 0.15rem;
  }
}

.usuarios-asistencia {
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 2px solid var(--border-color);
  padding: 1rem;
}

.usuarios-asistencia h3 {
  margin: 0 0 1rem 0;
  color: var(--accent-color);
  font-size: 1rem;
  font-family: 'HyliaSerifBeta', serif;
  text-align: center;
}

.usuarios-asistencia-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }

.usuario-asistencia-card {
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 1rem;
  transition: all 0.2s;
}

.usuario-asistencia-card:hover { border-color: var(--accent-color); transform: translateY(-2px); }
.usuario-asistencia-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); }
.usuario-asistencia-info { flex: 1; }
.usuario-asistencia-info h4 { margin: 0 0 0.3rem 0; font-size: 0.9rem; color: var(--text-primary); }
.usuario-stats-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.stat-badge { 
  display: inline-flex; 
  align-items: center; 
  gap: 0.2rem; 
  font-size: 0.7rem; 
  color: var(--text-secondary); 
  background: var(--bg-secondary);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}
.stat-badge.highlight { 
  background: color-mix(in srgb, var(--accent-color) 15%, var(--bg-secondary)); 
  color: var(--accent-color); 
  border-color: var(--accent-color);
}
.stat-icon-small { font-size: 0.7rem; }
.dias-laborados-mini { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.dia-chip { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  padding: 0.25rem 0.4rem; 
  background: var(--bg-secondary); 
  color: var(--text-primary); 
  border-radius: 6px; 
  border: 1px solid var(--border-color); 
  min-width: 36px;
  cursor: help;
}
.dia-num { font-size: 0.75rem; font-weight: 700; line-height: 1; }
.dia-horas { font-size: 0.55rem; color: var(--accent-color); line-height: 1; }

/* Responsive */
@media (max-width: 992px) {
  .usuarios-asistencia-grid { 
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
    gap: 0.75rem;
  }
  
  .usuario-asistencia-card {
    padding: 0.75rem;
  }
  
  .usuario-asistencia-header {
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
  }
  
  .usuario-asistencia-info h4 {
    font-size: 0.85rem;
  }
}

@media (max-width: 768px) {
  .tabs-container { width: 100%; }
  .tab-text { display: none; }
  .top-vendedor { flex-direction: column; text-align: center; }
  .top-stats { justify-content: center; flex-wrap: wrap; }
  .usuarios-ventas-grid { grid-template-columns: 1fr; }
  .usuarios-asistencia-grid { grid-template-columns: 1fr; }
  .usuarios-asistencia {
    padding: 0.75rem;
  }
  .usuarios-asistencia h3 {
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }
  .form-grid-zelda { grid-template-columns: 1fr; }
  .form-group-zelda:first-child { grid-column: span 1; }
  .modal-content-scroll { padding: 1rem; }
  
  .usuario-asistencia-card {
    padding: 0.6rem;
  }
  
  .usuario-asistencia-header {
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
  }
  
  .usuario-avatar-small {
    width: 40px;
    height: 40px;
  }
  
  .avatar-placeholder-small {
    font-size: 1rem;
  }
  
  .usuario-asistencia-info h4 {
    font-size: 0.8rem;
  }
  
  .stat-badge {
    font-size: 0.6rem;
    padding: 0.1rem 0.3rem;
  }
  
  .dias-laborados-mini {
    gap: 0.2rem;
  }
  
  .dia-chip {
    padding: 0.2rem 0.3rem;
    min-width: 30px;
  }
  
  .dia-num {
    font-size: 0.65rem;
  }
  
  .dia-horas {
    font-size: 0.5rem;
  }
}

@media (max-width: 600px) {
  .usuarios-asistencia-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .usuarios-asistencia {
    padding: 0.5rem;
  }
  
  .usuarios-asistencia h3 {
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }
  
  .usuario-asistencia-card {
    padding: 0.5rem;
  }
  
  .usuario-asistencia-header {
    gap: 0.4rem;
  }
  
  .usuario-avatar-small {
    width: 36px;
    height: 36px;
  }
  
  .avatar-placeholder-small {
    font-size: 0.9rem;
  }
  
  .usuario-asistencia-info h4 {
    font-size: 0.75rem;
    margin-bottom: 0.2rem;
  }
  
  .usuario-stats-row {
    gap: 0.3rem;
  }
  
  .stat-badge {
    font-size: 0.55rem;
    padding: 0.08rem 0.25rem;
  }
  
  .stat-icon-small {
    font-size: 0.6rem;
  }
  
  .dias-laborados-mini {
    gap: 0.15rem;
  }
  
  .dia-chip {
    padding: 0.15rem 0.25rem;
    min-width: 26px;
    border-radius: 4px;
  }
  
  .dia-num {
    font-size: 0.6rem;
  }
  
  .dia-horas {
    font-size: 0.45rem;
  }
}

@media (max-width: 480px) {
  .stats-section { grid-template-columns: repeat(3, 1fr); }
  .stat-card { padding: 0.6rem; }
  .stat-icon { font-size: 1.2rem; }
  .stat-value { font-size: 0.8rem; }
  .usuarios-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
  .usuario-card { padding: 1rem; }
  .avatar-container { width: 70px; height: 70px; }
  .avatar-placeholder { font-size: 1.8rem; }
  .usuario-nombre { font-size: 0.9rem; }
  .header-actions { flex-direction: column; }
  .btn-primary, .btn-secondary { width: 100%; justify-content: center; }
  
  .usuarios-asistencia {
    padding: 0.4rem;
    border-radius: 8px;
  }
  
  .usuarios-asistencia h3 {
    font-size: 0.8rem;
  }
  
  .usuario-asistencia-card {
    padding: 0.4rem;
  }
  
  .usuario-asistencia-header {
    flex-wrap: wrap;
  }
  
  .usuario-avatar-small {
    width: 32px;
    height: 32px;
  }
  
  .avatar-placeholder-small {
    font-size: 0.8rem;
  }
  
  .usuario-asistencia-info h4 {
    font-size: 0.7rem;
  }
  
  .stat-badge {
    font-size: 0.5rem;
    padding: 0.05rem 0.2rem;
  }
  
  .dias-laborados-mini {
    max-width: 100%;
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 0.25rem;
  }
  
  .dia-chip {
    flex-shrink: 0;
    padding: 0.12rem 0.2rem;
    min-width: 24px;
  }
  
  .dia-num {
    font-size: 0.55rem;
  }
  
  .dia-horas {
    font-size: 0.4rem;
  }
}

@media (max-width: 375px) {
  .usuarios-asistencia {
    padding: 0.35rem;
    border-width: 1px;
  }
  
  .usuarios-asistencia h3 {
    font-size: 0.75rem;
    margin-bottom: 0.4rem;
  }
  
  .usuarios-asistencia-grid {
    gap: 0.4rem;
  }
  
  .usuario-asistencia-card {
    padding: 0.35rem;
  }
  
  .usuario-asistencia-header {
    gap: 0.3rem;
  }
  
  .usuario-avatar-small {
    width: 28px;
    height: 28px;
  }
  
  .avatar-placeholder-small {
    font-size: 0.7rem;
  }
  
  .usuario-asistencia-info h4 {
    font-size: 0.65rem;
  }
  
  .usuario-stats-row {
    gap: 0.2rem;
    flex-wrap: wrap;
  }
  
  .stat-badge {
    font-size: 0.45rem;
    padding: 0.05rem 0.15rem;
  }
  
  .stat-icon-small {
    font-size: 0.5rem;
  }
  
  .dias-laborados-mini {
    gap: 0.1rem;
  }
  
  .dia-chip {
    padding: 0.1rem 0.15rem;
    min-width: 22px;
    border-radius: 3px;
  }
  
  .dia-num {
    font-size: 0.5rem;
  }
  
  .dia-horas {
    font-size: 0.35rem;
  }
}
</style>
