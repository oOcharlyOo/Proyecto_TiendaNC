<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import CobroModal from './CobroModal.vue';

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'persona-seleccionada', persona: CreditoPersonaDTO): void;
  (event: 'credito-actualizado'): void;
}>();

const props = defineProps<{
  open: boolean;
  seleccionar?: boolean;
}>();

type CreditoPersonaDTO = {
  idPersona: number;
  nombre: string;
  telefono?: string;
  direccion?: string;
  correo?: string;
  fechaRegistro?: string;
  totalDeuda: number;
  ventasActivas: number;
};

type CreditoVentaDTO = {
  idCreditoVenta: number;
  idPersona: number;
  nombrePersona: string;
  telefonoPersona?: string;
  idVenta?: number;
  numeroTicket?: number;
  montoTotal: number;
  montoPagado: number;
  saldoPendiente: number;
  estatus: string;
  fechaCreacion: string;
  notas?: string;
  abonos?: CreditoAbonoDTO[];
};

type CreditoAbonoDTO = {
  idAbono: number;
  idCreditoVenta: number;
  monto: number;
  fechaAbono: string;
  idUsuario: number;
  nombreUsuario: string;
  metodoPago?: string;
};

type CreditoPersonaDetalleDTO = CreditoPersonaDTO & {
  totalPagado: number;
  creditos: CreditoVentaDTO[];
  abonos: CreditoAbonoDTO[];
};

const personas = ref<CreditoPersonaDTO[]>([]);
const creditos = ref<CreditoVentaDTO[]>([]);
const creditosFiltrados = ref<CreditoVentaDTO[]>([]);
const personaSeleccionada = ref<CreditoPersonaDTO | null>(null);
const mostrarFormPersona = ref(false);
const editandoPersona = ref(false);
const formPersona = ref<{ idPersona?: number; nombre: string; telefono: string; direccion: string; correo: string }>({
  nombre: '', telefono: '', direccion: '', correo: ''
});
const abrirCreditosPersona = ref<CreditoPersonaDTO | null>(null);
const detallePersona = ref<CreditoPersonaDetalleDTO | null>(null);
const modalAbonoPersonaAbierto = ref(false);
const showVentaHistorial = ref(false);


type VentaDetalleProducto = {
  idProducto: number;
  nombre: string;
  precio_venta?: number | string;
  is_gramaje?: boolean;
};

type VentaDetalleDTO = {
  idVentaDetalle?: number;
  cantidad: number;
  precioUnitarioVenta: number;
  producto?: VentaDetalleProducto;
  Producto?: VentaDetalleProducto;
  idProducto?: number;
  tipoPrecioAplicado?: string;
};

type DetalleAgrupado = {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  isGramaje: boolean;
};

const expandidoId = ref<number | null>(null);
const detallesMap = ref<Record<number, VentaDetalleDTO[]>>({});
const discrepanciasMap = ref<Record<number, number>>({});
const cargandoDetalle = ref(false);

const cargando = ref(false);
const mensaje = ref('');
const tipoMsj = ref<'ok' | 'error' | 'info'>('ok');
const vistaPersonas = ref<'lista' | 'cuadricula'>('lista');

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

async function getJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const jwt = localStorage.getItem('jwt');
  const res = await fetch(`${API_BASE}${url}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {}), ...opts?.headers }
  });
  return res.json();
}

function mostrarMensaje(texto: string, tipo: 'ok' | 'error' | 'info' = 'ok') {
  mensaje.value = texto;
  tipoMsj.value = tipo;
  setTimeout(() => { mensaje.value = ''; }, 1000);
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
}

function formatearFecha(fecha?: string) {
  if (!fecha) return '';
  return fecha.slice(0, 10);
}

function abonosAgrupados(abonos: CreditoAbonoDTO[]): { monto: number; fechaAbono: string; metodoPago: string; nombreUsuario: string; idUsuario: number }[] {
  const grupos = new Map<string, { monto: number; fechaAbono: string; metodoPago: string; nombreUsuario: string; idUsuario: number }>();
  for (const ab of abonos) {
    const key = (ab.fechaAbono?.slice(0, 16) || '') + '-' + (ab.idUsuario || 0) + '-' + (ab.metodoPago || '');
    const existente = grupos.get(key);
    if (existente) {
      existente.monto += ab.monto;
    } else {
      grupos.set(key, {
        monto: ab.monto,
        fechaAbono: ab.fechaAbono || '',
        metodoPago: ab.metodoPago || '',
        nombreUsuario: ab.nombreUsuario || '',
        idUsuario: ab.idUsuario || 0,
      });
    }
  }
  return Array.from(grupos.values()).sort((a, b) => (b.fechaAbono || '').localeCompare(a.fechaAbono || ''));
}

async function cargarPersonas() {
  cargando.value = true;
  try {
    const res = await getJson<{ codigo: number; datos: CreditoPersonaDTO[] }>('/credito/persona');
    if (res.codigo === 200) {
      personas.value = res.datos;
    }
  } catch (e) {
    console.error('Error al cargar personas', e);
  } finally {
    cargando.value = false;
  }
}

async function cargarCreditos() {
  try {
    const res = await getJson<{ codigo: number; datos: CreditoVentaDTO[] }>('/credito/venta/activos');
    if (res.codigo === 200) {
      creditos.value = res.datos;
    }
  } catch (e) {
    console.error('Error al cargar créditos', e);
  }
}

async function guardarPersona() {
  if (!formPersona.value.nombre.trim()) {
    mostrarMensaje('El nombre es obligatorio.', 'error');
    return;
  }
  cargando.value = true;
  try {
    if (editandoPersona.value && formPersona.value.idPersona) {
      const res = await getJson<{ codigo: number; mensaje: string }>(`/credito/persona/${formPersona.value.idPersona}`, {
        method: 'PUT',
        body: JSON.stringify(formPersona.value)
      });
      if (res.codigo === 200) {
        mostrarMensaje('Persona actualizada.', 'ok');
      } else {
        mostrarMensaje(res.mensaje, 'error');
      }
    } else {
      const res = await getJson<{ codigo: number; mensaje: string }>('/credito/persona', {
        method: 'POST',
        body: JSON.stringify(formPersona.value)
      });
      if (res.codigo === 200) {
        mostrarMensaje('Persona creada.', 'ok');
      } else {
        mostrarMensaje(res.mensaje, 'error');
      }
    }
    await cargarPersonas();
    cerrarFormPersona();
  } catch (e) {
    mostrarMensaje('Error al guardar.', 'error');
  } finally {
    cargando.value = false;
  }
}

async function eliminarPersona(persona: CreditoPersonaDTO) {
  if (!confirm(`¿Eliminar a "${persona.nombre}"?`)) return;
  try {
    const res = await getJson<{ codigo: number; mensaje: string }>(`/credito/persona/${persona.idPersona}`, { method: 'DELETE' });
    if (res.codigo === 200) {
      mostrarMensaje('Persona eliminada.', 'ok');
      await cargarPersonas();
    } else {
      mostrarMensaje(res.mensaje, 'error');
    }
  } catch (e) {
    mostrarMensaje('Error al eliminar.', 'error');
  }
}

function abrirFormNueva() {
  formPersona.value = { nombre: '', telefono: '', direccion: '', correo: '' };
  editandoPersona.value = false;
  mostrarFormPersona.value = true;
}

function abrirFormEditar(persona: CreditoPersonaDTO) {
  formPersona.value = {
    idPersona: persona.idPersona,
    nombre: persona.nombre,
    telefono: persona.telefono || '',
    direccion: persona.direccion || '',
    correo: persona.correo || ''
  };
  editandoPersona.value = true;
  mostrarFormPersona.value = true;
}

function cerrarFormPersona() {
  mostrarFormPersona.value = false;
  editandoPersona.value = false;
}

function seleccionarPersona(persona: CreditoPersonaDTO) {
  if (props.seleccionar) {
    emit('persona-seleccionada', persona);
  }
}

async function verCreditos(persona: CreditoPersonaDTO) {
  abrirCreditosPersona.value = persona;
  detallePersona.value = null;
  try {
    const res = await getJson<{ codigo: number; datos: CreditoPersonaDetalleDTO }>(`/credito/persona/${persona.idPersona}/detalle`);
    if (res.codigo === 200) {
      detallePersona.value = res.datos;
      creditosFiltrados.value = res.datos.creditos;
    }
  } catch (e) {
    console.error(e);
  }
}

function cerrarCreditosPersona() {
  abrirCreditosPersona.value = null;
  detallePersona.value = null;
  creditosFiltrados.value = [];
}

async function abrirAbonoPersona() {
  modalAbonoPersonaAbierto.value = true;
}

async function confirmarAbonoPersona(payload: { monto: number; metodoPago: string }) {
  if (!detallePersona.value || payload.monto <= 0) {
    mostrarMensaje('Monto inválido.', 'error');
    return;
  }
  const idUsuario = Number(localStorage.getItem('idUsuario')) || 1;
  try {
    const res = await getJson<{ codigo: number; mensaje: string }>(`/credito/abono/persona/${detallePersona.value.idPersona}?monto=${payload.monto}&idUsuario=${idUsuario}&metodoPago=${payload.metodoPago}`, {
      method: 'POST'
    });
    if (res.codigo === 200) {
      mostrarMensaje(`Abono de ${formatoMoneda(payload.monto)} registrado vía ${payload.metodoPago}.`, 'ok');
      modalAbonoPersonaAbierto.value = false;
      await cargarPersonas();
      await cargarCreditos();
      if (abrirCreditosPersona.value) {
        await verCreditos(abrirCreditosPersona.value);
      }
      emit('credito-actualizado');
    } else {
      mostrarMensaje(res.mensaje, 'error');
    }
  } catch (e) {
    mostrarMensaje('Error al registrar abono.', 'error');
  }
}

function abrirWhatsApp(credito: CreditoVentaDTO) {
  const telefono = credito.telefonoPersona || '';
  const saldo = credito.saldoPendiente;
  const montoTotal = credito.montoTotal;
  const montoPagado = credito.montoPagado;
  const mensaje = encodeURIComponent(
    `Hola ${credito.nombrePersona}, te recordamos que tienes un saldo pendiente de $${saldo.toFixed(2)} (Total: $${montoTotal.toFixed(2)}, Pagado: $${montoPagado.toFixed(2)}) en "Tienda El Orejas". ¡Agradecemos tu pago!`
  );
  if (telefono) {
    const limpio = telefono.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/52${limpio}?text=${mensaje}`, '_blank');
  } else {
    mostrarMensaje('La persona no tiene teléfono registrado.', 'error');
  }
}

async function toggleDetalles(credito: CreditoVentaDTO) {
  if (expandidoId.value === credito.idCreditoVenta) {
    expandidoId.value = null;
    return;
  }
  if (!credito.idVenta) {
    mostrarMensaje('Sin id de venta asociado.', 'error');
    return;
  }
  expandidoId.value = credito.idCreditoVenta;
  if (detallesMap.value[credito.idCreditoVenta]) return;
  cargandoDetalle.value = true;
  try {
    const res = await getJson<{ codigo: number; datos: VentaDetalleDTO[] }>(`/ventasDetalle/porVenta/${credito.idVenta}`);
    if (res.codigo === 200) {
      const detalles = res.datos || [];
      detallesMap.value[credito.idCreditoVenta] = detalles;
      const sumaDetalles = detalles.reduce((acc, d) => {
        const prod = d.Producto || d.producto;
        const esGramaje = prod?.is_gramaje ?? false;
        return acc + (esGramaje ? Number(d.precioUnitarioVenta) : d.cantidad * Number(d.precioUnitarioVenta));
      }, 0);
      if (Math.abs(sumaDetalles - Number(credito.montoTotal)) > 0.01) {
        discrepanciasMap.value[credito.idCreditoVenta] = Number(credito.montoTotal) - sumaDetalles;
      }
    } else {
      mostrarMensaje('Error al obtener detalles.', 'error');
    }
  } catch (e) {
    mostrarMensaje('Error al cargar detalles.', 'error');
  } finally {
    cargandoDetalle.value = false;
  }
}

function detallesAgrupados(creditoId: number): DetalleAgrupado[] {
  const raw = detallesMap.value[creditoId];
  if (!raw || raw.length === 0) return [];
  const map = new Map<number, DetalleAgrupado>();
  for (const d of raw) {
    const prod = d.Producto || d.producto;
    const id = prod?.idProducto ?? -Math.random();
    const esGramaje = prod?.is_gramaje ?? false;
    const precio = Number(d.precioUnitarioVenta);
    const subtotal = esGramaje ? precio : d.cantidad * precio;
    const existente = map.get(id);
    if (existente) {
      existente.cantidad += d.cantidad;
      existente.subtotal += subtotal;
    } else {
      map.set(id, {
        nombre: prod?.nombre || 'Producto',
        cantidad: d.cantidad,
        precioUnitario: precio,
        subtotal,
        isGramaje: esGramaje,
      });
    }
  }
  return Array.from(map.values());
}

const totalDeudaGeneral = computed(() => {
  return personas.value.reduce((s, p) => s + (p.totalDeuda || 0), 0);
});

const totalPersonasActivas = computed(() => {
  return personas.value.filter(p => p.ventasActivas > 0).length;
});

onMounted(() => {
  cargarPersonas();
  cargarCreditos();
});

watch(() => props.open, (val) => {
  if (val) {
    cargarPersonas();
    cargarCreditos();
  }
});
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="open" class="pos-modal-overlay" @click.self="emit('close')">
      <div class="pos-modal-card animate-pop-in">
        <header class="modal-h">
          <h3>{{ seleccionar ? 'Seleccionar Persona' : 'Créditos' }}</h3>
          <button class="close-x" @click="emit('close')">×</button>
        </header>

        <div class="modal-b custom-scrollbar">

          <!-- Resumen -->
          <div class="resumen-bar" v-if="!seleccionar">
            <span class="resumen-item">👥 {{ personas.length }} personas</span>
            <span class="resumen-item">💳 {{ totalPersonasActivas }} con deuda</span>
            <span class="resumen-item total-deuda">💰 {{ formatoMoneda(totalDeudaGeneral) }}</span>
          </div>

          <!-- Toolbar -->
          <div class="toolbar">
            <div class="toolbar-left">
              <button class="btn-add" @click="abrirFormNueva">+ Nueva Persona</button>
            </div>
            <div class="toolbar-right">
              <button :class="['vbtn', { on: vistaPersonas === 'lista' }]" @click="vistaPersonas = 'lista'" title="Lista">📋</button>
              <button :class="['vbtn', { on: vistaPersonas === 'cuadricula' }]" @click="vistaPersonas = 'cuadricula'" title="Cuadrícula">🔲</button>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="personas.length === 0 && !cargando" class="empty-state">
            <span class="empty-ico">📋</span>
            <p>No hay personas registradas</p>
          </div>

          <!-- Vista Lista -->
          <div v-else-if="vistaPersonas === 'lista'" class="personas-list">
            <div v-for="p in personas" :key="p.idPersona" class="persona-row" :class="{ clickable: seleccionar }" @click="seleccionar ? seleccionarPersona(p) : null">
              <div class="persona-avatar">{{ p.nombre.charAt(0).toUpperCase() }}</div>
              <div class="persona-info">
                <span class="persona-name">{{ p.nombre }}</span>
                <span class="persona-detail" v-if="p.telefono">📞 {{ p.telefono }}</span>
                <span class="persona-detail" v-if="p.direccion">📍 {{ p.direccion }}</span>
              </div>
              <div class="persona-deuda">
                <span class="deuda-amount">{{ formatoMoneda(p.totalDeuda) }}</span>
                <span class="deuda-count" v-if="p.ventasActivas > 0">{{ p.ventasActivas }} crédito{{ p.ventasActivas > 1 ? 's' : '' }}</span>
                <span class="deuda-count paga" v-else>Sin deuda</span>
              </div>
              <div class="persona-actions" v-if="!seleccionar">
                <button class="action-btn" @click.stop="verCreditos(p)" title="Ver créditos">💳</button>
                <button class="action-btn" @click.stop="abrirFormEditar(p)" title="Editar">✏️</button>
                <button class="action-btn action-del" @click.stop="eliminarPersona(p)" title="Eliminar">🗑️</button>
              </div>
            </div>
          </div>

          <!-- Vista Cuadrícula -->
          <div v-else class="personas-grid">
            <div v-for="p in personas" :key="p.idPersona" class="persona-card" :class="{ clickable: seleccionar }" @click="seleccionar ? seleccionarPersona(p) : null">
              <div class="card-avatar">{{ p.nombre.charAt(0).toUpperCase() }}</div>
              <h4 class="card-name">{{ p.nombre }}</h4>
              <div class="card-details">
                <span v-if="p.telefono" class="card-detail">📞 {{ p.telefono }}</span>
                <span v-if="p.direccion" class="card-detail">📍 {{ p.direccion }}</span>
              </div>
              <div class="card-deuda">
                <span class="card-deuda-amount">{{ formatoMoneda(p.totalDeuda) }}</span>
                <span class="card-deuda-count" v-if="p.ventasActivas > 0">{{ p.ventasActivas }} crédito{{ p.ventasActivas > 1 ? 's' : '' }}</span>
                <span class="card-deuda-count paga" v-else>Sin deuda</span>
              </div>
              <div class="card-actions" v-if="!seleccionar">
                <button class="card-btn" @click.stop="verCreditos(p)" title="Ver créditos">💳</button>
                <button class="card-btn" @click.stop="abrirFormEditar(p)" title="Editar">✏️</button>
                <button class="card-btn card-btn-del" @click.stop="eliminarPersona(p)" title="Eliminar">🗑️</button>
              </div>
            </div>
          </div>

          <!-- Créditos de persona específica -->
          <div v-if="abrirCreditosPersona" class="inner-overlay">
            <div class="inner-panel">
              <header class="inner-header">
                <h3>💳 {{ abrirCreditosPersona.nombre }}</h3>
                <button class="close-x" @click="cerrarCreditosPersona">×</button>
              </header>
              <div class="inner-list">

                <!-- Resumen agregado -->
                <div v-if="detallePersona" class="resumen-agregado">
                  <div class="resumen-agregado-row">
                    <div class="resumen-agregado-item total-deuda">
                      <span class="ra-label">Deuda total</span>
                      <span class="ra-valor">{{ formatoMoneda(detallePersona.totalDeuda) }}</span>
                    </div>
                    <div class="resumen-agregado-item">
                      <span class="ra-label">Pagado</span>
                      <span class="ra-valor pagado">{{ formatoMoneda(detallePersona.totalPagado) }}</span>
                    </div>
                    <div class="resumen-agregado-item">
                      <span class="ra-label">Créditos</span>
                      <span class="ra-valor">{{ detallePersona.ventasActivas }} act{{ detallePersona.ventasActivas !== 1 ? 's' : '' }}</span>
                    </div>
                  </div>
                  <div v-if="detallePersona.ventasActivas > 0" class="resumen-agregado-abonar">
                    <button class="btn-abonar-persona" @click="abrirAbonoPersona">💰 Abonar {{ formatoMoneda(detallePersona.totalDeuda) }}</button>
                  </div>
                </div>

                <!-- Historial de abonos consolidado -->
                <div v-if="detallePersona?.abonos && detallePersona.abonos.length > 0" class="abonos-global">
                  <span class="abonos-global-title">Historial de pagos</span>
                  <div v-for="(grp, idx) in abonosAgrupados(detallePersona.abonos)" :key="idx" class="abono-global-item">
                    <span class="abono-global-monto">{{ formatoMoneda(grp.monto) }}</span>
                    <span class="abono-global-fecha">{{ grp.fechaAbono?.slice(11, 16) }} {{ grp.fechaAbono?.slice(0, 10) }}</span>
                    <span class="abono-global-metodo">{{ grp.metodoPago }}</span>
                    <span class="abono-global-user">👤 {{ grp.nombreUsuario }}</span>
                  </div>
                </div>

                <!-- Botón historial de ventas -->
                <div v-if="creditosFiltrados.length > 0" class="historial-toggle">
                  <button class="btn-historial" @click="showVentaHistorial = !showVentaHistorial">
                    📋 Historial de ventas crédito
                    <span class="historial-arrow">{{ showVentaHistorial ? '▲' : '▼' }}</span>
                  </button>
                </div>
                <div v-if="creditosFiltrados.length === 0" class="empty-state small">
                  <p>Sin créditos registrados</p>
                </div>

                <!-- Ventas expandibles -->
                <Transition name="expand">
                  <div v-if="showVentaHistorial" class="ventas-list">
                    <div v-for="cv in creditosFiltrados" :key="cv.idCreditoVenta" class="venta-item" :class="[cv.estatus.toLowerCase(), { 'is-expanded': expandidoId === cv.idCreditoVenta }]">
                      <div class="venta-item-head" @click="toggleDetalles(cv)" style="cursor:pointer">
                        <div class="venta-item-left">
                          <span class="venta-ticket" v-if="cv.numeroTicket">#{{ cv.numeroTicket }}</span>
                          <span :class="['venta-status', cv.estatus === 'PENDIENTE' ? 'st-pendiente' : 'st-pagado']">{{ cv.estatus === 'PENDIENTE' ? 'Pendiente' : 'Pagado' }}</span>
                        </div>
                        <div class="venta-item-right">
                          <span class="venta-fecha">{{ formatearFecha(cv.fechaCreacion) }}</span>
                          <span class="venta-monto">{{ formatoMoneda(cv.montoTotal) }}</span>
                          <button class="venta-whatsapp" @click.stop="abrirWhatsApp(cv)" title="WhatsApp">📱</button>
                          <span class="venta-expand-icon">{{ expandidoId === cv.idCreditoVenta ? '▲' : '▼' }}</span>
                        </div>
                      </div>
                      <Transition name="expand">
                        <div v-if="expandidoId === cv.idCreditoVenta" class="detalle-inline">
                          <div v-if="cargandoDetalle && !detallesMap[cv.idCreditoVenta]" class="detalle-loading">Cargando productos...</div>
                          <template v-else>
                            <div v-if="discrepanciasMap[cv.idCreditoVenta] !== undefined" class="detalle-discrepancia">
                              ⚠️ Discrepancia: {{ formatoMoneda(Math.abs(discrepanciasMap[cv.idCreditoVenta])) }}
                              <span class="disc-signo">{{ discrepanciasMap[cv.idCreditoVenta] > 0 ? ' (sobra)' : ' (falta)' }}</span>
                            </div>
                            <div v-if="!detallesMap[cv.idCreditoVenta] || detallesMap[cv.idCreditoVenta].length === 0" class="detalle-loading">Sin productos</div>
                            <div v-else class="detalle-productos">
                              <div class="detalle-producto" v-for="(d, idx) in detallesAgrupados(cv.idCreditoVenta)" :key="idx">
                                <span class="dp-nombre">{{ d.nombre }}</span>
                                <span class="dp-cant">{{ d.cantidad }} {{ d.isGramaje ? 'g' : 'pza' }}</span>
                                <span class="dp-subtotal">{{ formatoMoneda(d.subtotal) }}</span>
                              </div>
                            </div>
                          </template>
                        </div>
                      </Transition>
                      <div v-if="cv.abonos && cv.abonos.length > 0" class="abonos-list">
                        <span class="abonos-title">Pagos de este crédito</span>
                        <div v-for="ab in cv.abonos" :key="ab.idAbono" class="abono-item">
                          <span class="abono-monto">{{ formatoMoneda(ab.monto) }}</span>
                          <span class="abono-fecha">{{ ab.fechaAbono?.slice(11, 16) }} {{ ab.fechaAbono?.slice(0, 10) }}</span>
                          <span class="abono-user">👤 {{ ab.nombreUsuario }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>

          <!-- Formulario persona -->
          <div v-if="mostrarFormPersona" class="inner-overlay">
            <div class="inner-panel inner-panel--sm">
              <h4>{{ editandoPersona ? 'Editar Persona' : 'Nueva Persona' }}</h4>
              <div class="form-grid">
                <div class="field">
                  <label class="field-label">Nombre *</label>
                  <input v-model="formPersona.nombre" placeholder="Nombre completo" class="input-field" />
                </div>
                <div class="field">
                  <label class="field-label">Teléfono</label>
                  <input v-model="formPersona.telefono" placeholder="(000) 000-0000" class="input-field" />
                </div>
                <div class="field">
                  <label class="field-label">Dirección</label>
                  <input v-model="formPersona.direccion" placeholder="Dirección" class="input-field" />
                </div>
                <div class="field">
                  <label class="field-label">Correo</label>
                  <input v-model="formPersona.correo" placeholder="correo@ejemplo.com" type="email" class="input-field" />
                </div>
              </div>
              <div class="form-actions">
                <button class="btn-cancel" @click="cerrarFormPersona">Cancelar</button>
                <button class="btn-save" @click="guardarPersona" :disabled="cargando">💾 {{ editandoPersona ? 'Actualizar' : 'Guardar' }}</button>
              </div>
            </div>
          </div>

          <!-- Modal abono por persona (consolidado) -->
          <CobroModal 
            :open="modalAbonoPersonaAbierto"
            :modo="'abono'"
            :total="detallePersona?.totalDeuda || 0"
            :saldo-pendiente="detallePersona?.totalDeuda || 0"
            :nombre-persona="detallePersona?.nombre || ''"
            @close="modalAbonoPersonaAbierto = false"
            @confirmar-abono="confirmarAbonoPersona"
          />

        </div>

        <footer class="modal-f">
          <button class="cancel-btn" @click="emit('close')">
            {{ seleccionar ? 'Cancelar' : 'Cerrar' }}
          </button>
        </footer>

        <Transition name="toast">
          <div v-if="mensaje" class="toast" :class="`toast-${tipoMsj}`">
            <span>{{ mensaje }}</span>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pos-modal-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(6px);
  display: grid; place-items: center;
  padding: 1rem;
}

.pos-modal-card {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: 8px 8px 24px rgba(0,0,0,0.35), -4px -4px 16px rgba(255,255,255,0.03);
  width: min(100%, 900px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.animate-pop-in {
  animation: popIn 200ms ease-out;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.modal-h {
  padding: 1rem 1.25rem;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-h h3 {
  color: var(--color-accent);
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
}

.close-x {
  width: 34px; height: 34px;
  border: none; border-radius: 50%;
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  font-size: 1rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.1);
  transition: all .15s;
}

.close-x:hover {
  background: var(--color-error);
  color: #fff;
}

.modal-b {
  padding: 1.25rem;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: var(--color-bg-primary);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--color-accent);
  border-radius: 3px;
}

.resumen-bar {
  display: flex; gap: 1.25rem; justify-content: center;
  background: var(--color-bg-primary);
  border-radius: 8px;
  padding: 0.65rem 1rem; margin-bottom: 1rem;
}

.resumen-item {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.total-deuda {
  color: var(--color-accent);
  font-weight: 700;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.85rem;
  gap: 0.5rem;
}

.btn-add {
  padding: 0.5rem 0.9rem;
  background: var(--color-bg-primary);
  border: none;
  border-radius: 6px;
  color: var(--color-accent);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.08);
}

.btn-add:hover {
  color: var(--color-on-brand);
  background: var(--color-accent);
}

.vbtn {
  width: 32px; height: 32px;
  border: none; border-radius: 5px;
  background: var(--color-bg-primary);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s;
  color: var(--color-text-secondary);
  display: flex; align-items: center; justify-content: center;
}

.vbtn.on {
  background: var(--color-accent);
  color: var(--color-on-brand);
}

.vbtn:hover:not(.on) {
  color: var(--color-text-primary);
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-secondary);
}

.empty-state .empty-ico {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.empty-state p {
  font-size: 1rem;
}

.empty-state.small {
  padding: 1.5rem;
}

.personas-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.persona-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--color-bg-primary);
  border-radius: 8px;
  padding: 0.65rem 0.85rem;
  transition: all 0.15s;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.06);
}

.persona-row:hover {
  box-shadow: 4px 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}

.persona-row.clickable {
  cursor: pointer;
}

.persona-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, black));
  color: var(--color-on-brand);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1.1rem; flex-shrink: 0;
}

.persona-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.persona-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-text-primary);
}

.persona-detail {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  margin-top: 0.1rem;
}

.persona-deuda {
  text-align: right;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.deuda-amount {
  display: block;
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-text-primary);
}

.deuda-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.deuda-count.paga {
  color: var(--color-success);
  font-weight: 600;
}

.persona-actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.action-btn {
  width: 34px; height: 34px;
  border: none; border-radius: 6px;
  background: var(--color-bg-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
  color: var(--color-text-secondary);
  display: flex; align-items: center; justify-content: center;
}

.action-btn:hover {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-secondary));
}

.action-btn.action-del:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, var(--color-bg-secondary));
}

.personas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.75rem;
}

.persona-card {
  background: var(--color-bg-primary);
  border-radius: 10px;
  padding: 1rem 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.15s;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.06);
}

.persona-card:hover {
  box-shadow: 4px 4px 10px rgba(0,0,0,0.12);
  transform: translateY(-2px);
}

.persona-card.clickable {
  cursor: pointer;
}

.card-avatar {
  width: 50px; height: 50px; border-radius: 50%;
  background: linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, black));
  color: var(--color-on-brand);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1.3rem;
}

.card-name {
  margin: 0.2rem 0 0;
  font-size: 0.95rem;
  color: var(--color-text-primary);
  text-align: center;
  font-weight: 700;
}

.card-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.card-detail {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.card-deuda {
  text-align: center;
  margin-top: 0.15rem;
}

.card-deuda-amount {
  display: block;
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-text-primary);
}

.card-deuda-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.card-deuda-count.paga {
  color: var(--color-success);
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.4rem;
}

.card-btn {
  width: 34px; height: 34px;
  border: none; border-radius: 6px;
  background: var(--color-bg-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  transition: all 0.15s;
  display: flex; align-items: center; justify-content: center;
}

.card-btn:hover {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-secondary));
}

.card-btn.card-btn-del:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, var(--color-bg-secondary));
}

/* Inner overlays (creditos panel, forms, abono) */
.inner-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 210;
}

.inner-panel {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  width: min(95%, 660px);
  max-height: 82vh;
  min-height: 40vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 8px 8px 24px rgba(0,0,0,0.35), -4px -4px 16px rgba(255,255,255,0.03);
}

.inner-panel--sm {
  padding: 1.5rem;
  width: min(95%, 440px);
  min-height: unset;
}

.inner-panel h4 {
  margin: 0 0 0.85rem;
  font-size: 1.05rem;
  color: var(--color-accent);
}

.inner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1.1rem;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.inner-header h3 {
  margin: 0;
  font-size: 1.05rem;
  color: var(--color-accent);
}

.inner-list {
  padding: 0.65rem;
  overflow-y: auto;
  flex: 1;
}

.venta-item {
  background: var(--color-bg-primary);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  margin-bottom: 0.35rem;
  box-shadow: 1px 1px 3px rgba(0,0,0,0.05);
}

.venta-item.pagado {
  opacity: 0.55;
}

.venta-item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.venta-item-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.venta-ticket {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--color-accent);
}

.venta-status {
  font-size: 0.6rem;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-weight: 700;
  text-transform: uppercase;
}

.st-pendiente {
  background: var(--color-accent);
  color: var(--color-on-brand);
}

.st-pagado {
  background: var(--color-success);
  color: white;
}

.venta-item-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.venta-fecha {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.venta-monto {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--color-text-primary);
  min-width: 4rem;
  text-align: right;
}

.venta-whatsapp {
  width: 26px; height: 26px;
  border: none; border-radius: 4px;
  background: #25d366;
  color: #fff;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
  opacity: 0.7;
}

.venta-whatsapp:hover {
  opacity: 1;
  transform: scale(1.1);
}

.venta-expand-icon {
  font-size: 0.55rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.venta-item.is-expanded {
  box-shadow: 1px 1px 3px rgba(0,0,0,0.05), 0 0 0 1px var(--color-accent);
}

.ventas-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.historial-toggle {
  margin-bottom: 0.4rem;
}

.btn-historial {
  width: 100%;
  padding: 0.55rem 0.75rem;
  background: var(--color-bg-primary);
  border: none;
  border-radius: 6px;
  color: var(--color-accent);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.06);
  transition: all 0.15s;
}

.btn-historial:hover {
  box-shadow: 3px 3px 6px rgba(0,0,0,0.1);
  color: var(--color-on-brand);
  background: var(--color-accent);
}

.historial-arrow {
  font-size: 0.7rem;
}

.detalle-inline {
  margin-top: 0.4rem;
  padding-top: 0.35rem;
  border-top: 1px solid var(--color-border);
  overflow: hidden;
}

.detalle-loading {
  text-align: center;
  padding: 0.4rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.detalle-productos {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.detalle-producto {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.35rem;
  font-size: 0.75rem;
  border-radius: 4px;
  background: var(--color-bg-secondary);
}

.dp-nombre {
  flex: 1;
  color: var(--color-text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.dp-cant {
  color: var(--color-text-secondary);
  white-space: nowrap;
  text-align: right;
  font-size: 0.7rem;
}

.dp-subtotal {
  color: var(--color-accent);
  font-weight: 700;
  white-space: nowrap;
  text-align: right;
  min-width: 4rem;
  font-size: 0.78rem;
}

.detalle-discrepancia {
  background: color-mix(in srgb, var(--color-error) 12%, transparent);
  color: var(--color-error);
  padding: 0.3rem 0.45rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.disc-signo {
  font-weight: 400;
  opacity: 0.85;
}

.abonos-list {
  margin-top: 0.35rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.3rem;
}

.abonos-title {
  display: block;
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.abono-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  padding: 0.1rem 0;
  color: var(--color-text-secondary);
  gap: 0.4rem;
}

.abono-monto {
  font-weight: 700;
  color: var(--color-text-primary);
  flex-shrink: 0;
}

.abono-fecha {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.abono-user {
  color: var(--color-text-secondary);
  text-align: right;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  margin-top: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Form */
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-label {
  font-size: 0.78rem;
  color: var(--color-accent);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.input-field {
  background: var(--color-bg-primary);
  border: none;
  border-radius: 6px;
  padding: 0.55rem 0.75rem;
  font-size: 0.92rem;
  color: var(--color-text-primary);
  outline: none;
  box-shadow: inset 2px 2px 4px rgba(0,0,0,0.08);
  transition: all 0.2s;
}

.input-field:focus {
  box-shadow: inset 2px 2px 4px rgba(0,0,0,0.08), 0 0 0 2px var(--color-accent);
}

.form-actions {
  display: flex;
  gap: 0.6rem;
  margin-top: 1.25rem;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 0.55rem 1.1rem;
  background: var(--color-bg-primary);
  border: none;
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.06);
}

.btn-cancel:hover {
  color: var(--color-text-primary);
  box-shadow: 3px 3px 6px rgba(0,0,0,0.1);
}

.btn-save {
  padding: 0.55rem 1.1rem;
  background: linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 70%, black));
  border: none;
  border-radius: 6px;
  color: var(--color-on-brand);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 3px 3px 6px rgba(0,0,0,0.1);
}

.btn-save:hover {
  box-shadow: 4px 4px 8px rgba(0,0,0,0.15);
  transform: translateY(-1px);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.abono-info p {
  margin: 0.2rem 0;
  font-size: 0.85rem;
  color: var(--color-text-primary);
}

.modal-f {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.cancel-btn {
  width: 100%;
  padding: 0.6rem;
  background: var(--color-bg-primary);
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.06);
}

.cancel-btn:hover {
  color: var(--color-accent);
  box-shadow: 4px 4px 8px rgba(0,0,0,0.1);
}

.toast {
  z-index: 9999;
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.7rem 1.4rem;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 700;
}

.toast-ok {
  background: var(--color-success);
  color: white;
}

.toast-error {
  background: var(--color-error);
  color: white;
}

.toast-info {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
}



.resumen-agregado {
  background: var(--color-bg-primary);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  margin-bottom: 0.75rem;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.08);
}

.resumen-agregado-row {
  display: flex;
  gap: 1rem;
  justify-content: space-around;
}

.resumen-agregado-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.ra-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.ra-valor {
  font-size: 1.2rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: var(--color-text-primary);
}

.ra-valor.total-deuda {
  color: var(--color-error);
}

.ra-valor.pagado {
  color: var(--color-success);
}

.resumen-agregado-abonar {
  margin-top: 0.6rem;
  text-align: center;
}

.btn-abonar-persona {
  width: 100%;
  padding: 0.7rem;
  background: linear-gradient(135deg, var(--color-success), color-mix(in srgb, var(--color-success) 70%, black));
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 3px 3px 6px rgba(0,0,0,0.12);
}

.btn-abonar-persona:hover {
  box-shadow: 4px 4px 8px rgba(0,0,0,0.18);
  transform: translateY(-1px);
}

.abonos-global {
  margin-bottom: 0.75rem;
  background: var(--color-bg-primary);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
}

.abonos-global-title {
  display: block;
  font-size: 0.68rem;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
  margin-bottom: 0.3rem;
}

.abono-global-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem 0.5rem;
  font-size: 0.72rem;
  padding: 0.25rem 0;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}

.abono-global-item:last-child {
  border-bottom: none;
}

.abono-global-monto {
  font-weight: 700;
  color: var(--color-text-primary);
  flex-shrink: 0;
  min-width: 3.8rem;
}

.abono-global-fecha {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.abono-global-metodo {
  font-size: 0.65rem;
  background: var(--color-bg-secondary);
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.abono-global-user {
  flex: 1 1 auto;
  min-width: 5rem;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 380px) {
  .abono-global-item {
    font-size: 0.65rem;
    gap: 0.2rem 0.4rem;
  }
  .abono-global-monto {
    min-width: 3rem;
  }
}

.ventas-section-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
  padding: 0 0.15rem;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .pos-modal-card,
.modal-fade-leave-to .pos-modal-card {
  transform: scale(0.97);
}

@media (max-width: 480px) {
  .resumen-agregado-row {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .resumen-agregado-item {
    min-width: 5rem;
  }
  .ra-valor {
    font-size: 1rem;
  }
  .venta-item-head {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }
  .venta-item-right {
    justify-content: space-between;
  }
  .venta-item-left {
    justify-content: space-between;
  }
}

@media (max-width: 380px) {
  .pos-modal-card {
    width: 100%;
  }
  .modal-b {
    padding: 0.75rem;
  }
  .inner-list {
    padding: 0.4rem;
  }
  .persona-row {
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .persona-deuda {
    margin-left: 0;
    text-align: left;
  }
  .persona-actions {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }
  .resumen-bar {
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }
  .resumen-item {
    font-size: 0.75rem;
  }
  .venta-fecha {
    font-size: 0.6rem;
  }
  .btn-historial {
    font-size: 0.75rem;
    padding: 0.45rem 0.5rem;
  }
  .btn-abonar-persona {
    font-size: 0.82rem;
    padding: 0.6rem;
  }
  .inner-panel {
    width: 100%;
    max-height: 90vh;
    min-height: unset;
  }
}
</style>
