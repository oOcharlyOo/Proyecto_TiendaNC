<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import confetti from 'canvas-confetti';

type Usuario = {
  idUsuario: number;
  usuario: string;
  nombre: string;
  apellido_p: string;
  apellido_m: string;
  avatar: string | null;
  id_tipo_usuario: number;
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

type UsuarioDiasData = {
  idUsuario: number;
  nombreUsuario: string;
  avatar: string | null;
  totalDias: number;
  diasLaborados: number[];
  diasCompletos: DiasCalendario;
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
    const res = await fetch(
      `${API_BASE}/ventas/diasTrabajados?mes=${mes}&anio=${anio}`
    );
    const data = await res.json();
    if (data.codigo === 200) {
      diasTrabajados.value = data.datos;
    }
  } catch (e) {
    console.error('Error al cargar asistencia:', e);
  } finally {
    cargandoAsistencias.value = false;
  }
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

function getDiasCalendario(): Array<{numero: number | null; esHoy: boolean; trabajadores: string[]; esVacio: boolean}> {
  if (!diasTrabajados.value) return [];
  
  const { mes, anio, totalDiasMes, usuarios } = diasTrabajados.value;
  const hoy = new Date();
  const esMesActual = hoy.getFullYear() === anio && (hoy.getMonth() + 1) === mes;
  
  const primerDia = new Date(anio, mes - 1, 1);
  const diaSemanaInicio = primerDia.getDay();
  const offsetSemana = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1;
  
  const diasMap: Map<number, string[]> = new Map();
  usuarios.forEach(usuario => {
    Object.entries(usuario.diasCompletos).forEach(([diaStr, nombre]) => {
      const dia = parseInt(diaStr, 10);
      if (!diasMap.has(dia)) {
        diasMap.set(dia, []);
      }
      diasMap.get(dia)!.push(nombre);
    });
  });
  
  const dias: Array<{numero: number | null; esHoy: boolean; trabajadores: string[]; esVacio: boolean}> = [];
  
  for (let i = 0; i < offsetSemana; i++) {
    dias.push({ numero: null, esHoy: false, trabajadores: [], esVacio: true });
  }
  
  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const diaNumero = diasMap.get(dia) || [];
    const esDiaHoy = esMesActual && dia === hoy.getDate();
    dias.push({ numero: dia, esHoy: esDiaHoy, trabajadores: diaNumero, esVacio: false });
  }
  
  const remainder = dias.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      dias.push({ numero: null, esHoy: false, trabajadores: [], esVacio: true });
    }
  }
  
  return dias;
}
</script>

<template>
  <div class="usuarios-page">
    <div class="bg-fog"></div>
    <div class="bg-scanlines"></div>
    
    <div class="page-header">
      <h1 class="page-title">Gestión</h1>
      <div class="submenu">
        <button 
          class="submenu-btn" 
          :class="{ active: seccionActiva === 'usuarios' }"
          @click="cambiarSeccion('usuarios')"
        >
          <span class="submenu-icon">👥</span>
          <span class="submenu-text">Usuarios</span>
        </button>
        <button 
          class="submenu-btn" 
          :class="{ active: seccionActiva === 'ventas' }"
          @click="cambiarSeccion('ventas')"
        >
          <span class="submenu-icon">📊</span>
          <span class="submenu-text">Ventas por Usuario</span>
          <span class="submenu-badge">BETA</span>
        </button>
        <button 
          v-if="esAdmin"
          class="submenu-btn" 
          :class="{ active: seccionActiva === 'asistencias' }"
          @click="cambiarSeccion('asistencias')"
        >
          <span class="submenu-icon">📅</span>
          <span class="submenu-text">Asistencias</span>
        </button>
      </div>
    </div>

    <!-- Sección Gestión de Usuarios -->
    <div v-if="seccionActiva === 'usuarios'" class="seccion-usuarios">
      <div class="header-actions" v-if="esAdmin">
        <button class="btn-primary" @click="abrirModalNuevo">
          + Nuevo Usuario
        </button>
      </div>

      <div v-if="cargando" class="loading">
        <div class="loading-spinner"></div>
        <span>Cargando usuarios...</span>
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
        </div>
        
        <div class="usuario-info">
          <h3 class="usuario-nombre">{{ usuario.nombre }} {{ usuario.apellido_p }}</h3>
          <p class="usuario-user">@{{ usuario.usuario }}</p>
          <span class="tipo-badge" :class="{ admin: usuario.id_tipo_usuario === 1 }">
            {{ getTipoLabel(usuario.id_tipo_usuario) }}
          </span>
        </div>

        <div v-if="esAdmin" class="usuario-actions">
          <button class="btn-edit" @click="abrirModalEditar(usuario)">
            <span class="btn-icon">✏️</span> Editar
          </button>
          <button 
            class="btn-delete" 
            @click="eliminarUsuario(usuario.idUsuario)"
            :disabled="usuario.idUsuario === tipoUsuarioActual"
          >
            <span class="btn-icon">🗑️</span> Eliminar
          </button>
        </div>
        <div v-else-if="puedeEditar(usuario.idUsuario)" class="usuario-actions">
          <button class="btn-edit" @click="abrirModalEditar(usuario)">
            <span class="btn-icon">✏️</span> Editar
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
                <span class="producto-qty">{{ producto.cantidadTotal }}{{ producto.isGramaje ? 'g' : 'pza' }}</span>
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
                  <span 
                    v-for="(trabajador, idx) in dia.trabajadores" 
                    :key="idx"
                    class="trabajador-chip"
                    :title="trabajador"
                  >
                    {{ getIniciales(trabajador) }}
                  </span>
                </div>
                <span v-else-if="dia.numero && !dia.esHoy" class="dia-vacio-text">-</span>
                <span v-if="dia.esHoy && dia.trabajadores.length === 0" class="dia-hoy-text">Hoy</span>
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
                    <span class="usuario-dias-count">{{ usuario.totalDias }} días trabajados</span>
                  </div>
                </div>
                <div class="dias-laborados-mini">
                  <span 
                    v-for="dia in usuario.diasLaborados" 
                    :key="dia"
                    class="dia-chip"
                    :title="`Día ${dia}`"
                  >
                    {{ dia }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    <Transition name="modal">
      <div v-if="modalAbierto" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3>{{ editando ? 'Editar Usuario' : 'Nuevo Usuario' }}</h3>
            <button class="btn-cerrar-modal" @click="cerrarModal">&times;</button>
          </div>

          <div class="modal-body">
            <div class="avatar-upload-section">
              <label>Avatar</label>
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
                  <span>Arrastra una imagen o haz clic</span>
                  <small>Usa el mouse para mover, scroll para zoom</small>
                </div>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>Usuario</label>
                <input v-model="form.usuario" type="text" required placeholder="Nombre de usuario" />
              </div>
              <div class="form-group">
                <label>Nombre</label>
                <input v-model="form.nombre" type="text" required placeholder="Nombre" />
              </div>
              <div class="form-group">
                <label>Apellido Paterno</label>
                <input v-model="form.apellido_p" type="text" placeholder="Apellido paterno" />
              </div>
              <div class="form-group">
                <label>Apellido Materno</label>
                <input v-model="form.apellido_m" type="text" placeholder="Apellido materno" />
              </div>
              <div class="form-group">
                <label>Password</label>
                <input 
                  v-model="form.password_hash" 
                  type="password" 
                  :placeholder="editando ? 'Dejar vacio para mantener' : 'Contraseña'"
                />
              </div>
              <div class="form-group">
                <label>Tipo</label>
                <select v-model="form.id_tipo_usuario" :disabled="!esAdmin && esEdicionPerfilPropio">
                  <option :value="1">Administrador</option>
                  <option :value="2">Usuario</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click="cerrarModal">Cancelar</button>
            <button class="btn-save" @click="guardarUsuario">
              {{ editando ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.usuarios-page {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 90vh;
  position: relative;
  z-index: 1;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
  position: relative;
  z-index: 1;
}

.page-title {
  font-size: 2rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent-color);
  text-shadow: 2px 2px 0 var(--border-color);
}

.btn-primary {
  padding: 0.7rem 1.5rem;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 45%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
  border: var(--border-width) solid var(--border-color);
  box-shadow: 0 4px 0 var(--border-color);
}

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

@keyframes spin {
  to { transform: rotate(360deg); }
}

.usuarios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  position: relative;
  z-index: 1;
}

.usuario-card {
  background: var(--bg-secondary);
  border: var(--border-width-thick) solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  animation: fadeInUp 0.5s ease forwards;
  opacity: 0;
  box-shadow: 0 4px 0 var(--border-color);
}

.usuario-card:hover {
  transform: translateY(-8px);
  filter: brightness(1.05);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.avatar-container {
  width: 120px;
  height: 120px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid var(--accent-color);
  box-shadow: 0 4px 12px var(--shadow-color);
  transition: transform 0.3s ease;
  background: var(--bg-primary);
}

.usuario-card:hover .avatar-container {
  transform: scale(1.05);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: 900;
  color: var(--accent-color);
  background: var(--bg-primary);
}

.usuario-nombre {
  font-size: 1.2rem;
  margin-bottom: 0.3rem;
  color: var(--text-primary);
}

.usuario-user {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.tipo-badge {
  display: inline-block;
  padding: 0.3rem 0.8rem;
  font-size: 0.75rem;
  border-radius: 20px;
  text-transform: uppercase;
  font-weight: 600;
  background: var(--bg-panel);
  color: var(--accent-color);
  border: 1px solid var(--border-color);
}

.tipo-badge.admin {
  background: var(--accent-color);
  color: var(--bg-primary);
}

.usuario-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: center;
}

.btn-edit, .btn-delete {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s ease;
  border: 1px solid var(--border-color);
}

.btn-edit {
  background: var(--success-color);
  color: var(--bg-primary);
}

.btn-delete {
  background: var(--error-color);
  color: var(--text-primary);
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  background: var(--shadow-color);
  backdrop-filter: blur(4px);
}

.modal-card {
  background: var(--bg-panel);
  border: var(--border-width-thick) solid var(--accent-color);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-color);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 2px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.btn-cerrar-modal {
  background: rgba(0, 0, 0, 0.3);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-color);
}

.modal-body {
  padding: 1.5rem;
}

.avatar-upload-section label {
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.8rem;
}

.avatar-dropzone {
  width: 160px;
  height: 160px;
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

.form-group label {
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.75rem;
}

.form-group input,
.form-group select {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: var(--border-width) solid var(--border-color);
}

.modal-actions {
  border-top: 2px solid var(--border-color);
}

.btn-cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-save {
  background: var(--success-color);
  color: var(--bg-primary);
  border: var(--border-width) solid var(--border-color);
}

.bg-fog {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: 
    radial-gradient(ellipse 90% 60% at 10% 50%, rgba(31, 91, 53, 0.1) 0%, transparent 50%),
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

/* Submenu */
.submenu {
  display: flex;
  gap: 0.5rem;
  background: var(--bg-secondary);
  padding: 0.3rem;
  border-radius: 12px;
  border: 2px solid var(--border-color);
}

.submenu-btn {
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

.submenu-btn:hover {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent-color) 10%, transparent);
}

.submenu-btn.active {
  background: var(--accent-color);
  color: var(--bg-primary);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--accent-color) 40%, transparent);
}

.submenu-icon {
  font-size: 1.1rem;
}

.submenu-badge {
  font-size: 0.6rem;
  background: var(--error-color);
  color: white;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 700;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

/* Sección Ventas por Usuario */
.seccion-ventas {
  position: relative;
  z-index: 1;
}

.ventas-filtros {
  background: var(--bg-secondary);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  border: 2px solid var(--border-color);
  margin-bottom: 1.5rem;
}

.filtro-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filtro-group label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.filtro-fecha {
  display: flex;
  gap: 0.5rem;
}

.filtro-fecha input {
  padding: 0.5rem 0.8rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.btn-load {
  padding: 0.5rem 1rem;
  background: var(--accent-color);
  color: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-load:hover {
  filter: brightness(1.1);
}

.btn-load:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Top Vendedor */
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

.top-badge {
  font-size: 4rem;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.top-info {
  flex: 1;
}

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
}

.top-stats {
  display: flex;
  gap: 1.5rem;
  color: var(--bg-primary);
  font-size: 1rem;
  font-weight: 600;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

/* Tabla de ventas */
.ventas-tabla-container {
  overflow-x: auto;
}

.ventas-tabla {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid var(--border-color);
}

.ventas-tabla th {
  background: var(--accent-color);
  color: white;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
}

.ventas-tabla td {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

.ventas-tabla tr:last-child td {
  border-bottom: none;
}

.ventas-tabla tr:hover {
  background: var(--bg-primary);
}

.ventas-tabla tr.top {
  background: linear-gradient(90deg, rgba(196, 160, 53, 0.15), transparent);
}

.ventas-tabla tr.top td {
  font-weight: 600;
}

.usuario-nombre {
  font-weight: 500;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.empty-state p {
  font-size: 1rem;
  margin: 0;
}

/* Usuarios Ventas Grid */
.usuarios-ventas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1rem;
}

.usuario-ventas-card {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  animation: fadeSlideIn 0.3s ease-out backwards;
  transition: transform 0.2s, box-shadow 0.2s;
}

.usuario-ventas-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}

.usuario-ventas-card.top {
  border-color: var(--accent-color);
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent-color) 10%, var(--bg-secondary)) 0%, var(--bg-secondary) 100%);
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
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
  border: 2px solid var(--border-color);
}

.usuario-avatar-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

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

.usuario-ventas-info {
  flex: 1;
}

.usuario-ventas-info h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.usuario-user {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.usuario-ventas-total {
  text-align: right;
}

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
  gap: 1rem;
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

.stat-item.total-estilo {
  background: linear-gradient(135deg, var(--accent-color), #c4a035);
  border: none;
}

.stat-item.total-estilo .stat-value {
  color: white;
}

.stat-item.total-estilo .stat-label {
  color: rgba(255,255,255,0.9);
}

.stat-icon {
  font-size: 1rem;
  display: block;
  margin-bottom: 0.2rem;
}

.stat-value {
  display: block;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.usuario-productos h5,
.usuario-ventas-detalles h5 {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
  letter-spacing: 0.05em;
}

.productos-list {
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.producto-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.8rem;
}

.producto-item:last-child {
  border-bottom: none;
}

.producto-nombre {
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.producto-qty {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.producto-monto {
  color: var(--success-color);
  font-weight: 600;
  font-family: "Courier New", monospace;
}

.productos-more {
  padding: 0.4rem 0.6rem;
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-align: center;
  background: var(--bg-secondary);
}

.ventas-list {
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.venta-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.8rem;
  align-items: center;
}

.venta-item:last-child {
  border-bottom: none;
}

.venta-ticket {
  font-weight: 700;
  color: var(--accent-color);
}

.venta-fecha {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.venta-monto {
  color: var(--success-color);
  font-weight: 600;
  font-family: "Courier New", monospace;
}

/* Sección Asistencias */
.seccion-asistencias {
  position: relative;
  z-index: 1;
}

.asistencias-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

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
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  gap: 0.5rem;
}

.dia-cell {
  min-height: 70px;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
}

.dia-cell.dia-vacio {
  background: transparent;
  border: none;
}

.dia-cell.dia-hoy {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-primary));
}

.dia-cell.dia-trabajado {
  background: color-mix(in srgb, var(--success-color) 8%, var(--bg-primary));
  border-color: color-mix(in srgb, var(--success-color) 40%, var(--border-color));
}

.dia-numero {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.dia-cell.dia-hoy .dia-numero {
  color: var(--accent-color);
  font-size: 1rem;
}

.dia-trabajadores {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  justify-content: center;
}

.trabajador-chip {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.15rem 0.3rem;
  background: var(--accent-color);
  color: var(--bg-primary);
  border-radius: 4px;
  cursor: default;
}

.dia-vacio-text {
  color: var(--text-secondary);
  opacity: 0.3;
  font-size: 0.8rem;
}

.dia-hoy-text {
  font-size: 0.6rem;
  color: var(--accent-color);
  font-weight: 700;
  text-transform: uppercase;
}

/* Resumen por Usuario */
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
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
}

.usuarios-asistencia-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.usuario-asistencia-card {
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 1rem;
  transition: all 0.2s;
}

.usuario-asistencia-card:hover {
  border-color: var(--accent-color);
  transform: translateY(-2px);
}

.usuario-asistencia-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.usuario-asistencia-info {
  flex: 1;
}

.usuario-asistencia-info h4 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.usuario-dias-count {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.dias-laborados-mini {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.dia-chip {
  font-size: 0.7rem;
  font-weight: 600;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .submenu {
    width: 100%;
    justify-content: center;
  }
  
  .submenu-text {
    display: none;
  }
  
  .top-vendedor {
    flex-direction: column;
    text-align: center;
  }
  
  .top-stats {
    justify-content: center;
  }
  
  .usuarios-ventas-grid {
    grid-template-columns: 1fr;
  }
  
  .usuarios-asistencia-grid {
    grid-template-columns: 1fr;
  }
  
  .calendario-dias {
    gap: 0.25rem;
  }
  
  .dia-cell {
    min-height: 50px;
    padding: 0.3rem;
  }
}
</style>
