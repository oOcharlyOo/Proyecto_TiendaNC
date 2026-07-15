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
};

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
const modalAbonoAbierto = ref(false);
const creditoAbonando = ref<CreditoVentaDTO | null>(null);
const expandidoId = ref<number | null>(null);
const detallesMap = ref<Record<number, VentaDetalleDTO[]>>({});
const discrepanciasMap = ref<Record<number, number>>({});
const cargandoDetalle = ref(false);

type DetalleAgrupado = {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  isGramaje: boolean;
};
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
  setTimeout(() => { mensaje.value = ''; }, 3000);
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
}

function formatearFecha(fecha?: string) {
  if (!fecha) return '';
  return fecha.slice(0, 10);
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
  try {
    const res = await getJson<{ codigo: number; datos: CreditoVentaDTO[] }>(`/credito/venta/persona/${persona.idPersona}`);
    if (res.codigo === 200) {
      creditosFiltrados.value = res.datos;
    }
  } catch (e) {
    console.error(e);
  }
}

function cerrarCreditosPersona() {
  abrirCreditosPersona.value = null;
  creditosFiltrados.value = [];
}

async function abrirAbono(credito: CreditoVentaDTO) {
  creditoAbonando.value = credito;
  modalAbonoAbierto.value = true;
}

async function confirmarAbono(payload: { monto: number; metodoPago: string }) {
  if (!creditoAbonando.value || payload.monto <= 0) {
    mostrarMensaje('Monto inválido.', 'error');
    return;
  }
  const idUsuario = Number(localStorage.getItem('idUsuario')) || 1;
  try {
    const res = await getJson<{ codigo: number; mensaje: string }>(`/credito/abono/${creditoAbonando.value.idCreditoVenta}?monto=${payload.monto}&idUsuario=${idUsuario}&metodoPago=${payload.metodoPago}`, {
      method: 'POST'
    });
    if (res.codigo === 200) {
      mostrarMensaje(`Abono de ${formatoMoneda(payload.monto)} registrado vía ${payload.metodoPago}.`, 'ok');
      modalAbonoAbierto.value = false;
      creditoAbonando.value = null;
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
      const montoTotal = Number(credito.montoTotal);
      if (Math.abs(sumaDetalles - montoTotal) > 0.01) {
        discrepanciasMap.value[credito.idCreditoVenta] = montoTotal - sumaDetalles;
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
              <button class="btn-add" @click="abrirFormNueva">➕ Nueva Persona</button>
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
                <div v-if="creditosFiltrados.length === 0" class="empty-state small">
                  <p>Sin créditos registrados</p>
                </div>
                  <div v-for="cv in creditosFiltrados" :key="cv.idCreditoVenta" class="credito-item" :class="[cv.estatus.toLowerCase(), { 'is-expanded': expandidoId === cv.idCreditoVenta }]">
                    <div class="credito-head">
                      <span class="credito-ticket" v-if="cv.numeroTicket">#{{ cv.numeroTicket }}</span>
                      <span :class="['credito-status', cv.estatus === 'PENDIENTE' ? 'badge-pendiente' : 'badge-pagado']">{{ cv.estatus }}</span>
                    </div>
                    <div class="credito-monto">
                      <span class="credito-label">Total:</span>
                      <span class="credito-valor">{{ formatoMoneda(cv.montoTotal) }}</span>
                    </div>
                    <div class="credito-monto">
                      <span class="credito-label">Pagado:</span>
                      <span class="credito-valor pagado">{{ formatoMoneda(cv.montoPagado) }}</span>
                    </div>
                    <div class="credito-monto">
                      <span class="credito-label">Saldo:</span>
                      <span class="credito-valor saldo">{{ formatoMoneda(cv.saldoPendiente) }}</span>
                    </div>
                    <div class="credito-fecha" v-if="cv.fechaCreacion">
                      📅 {{ formatearFecha(cv.fechaCreacion) }}
                    </div>
                    <div class="credito-actions">
                      <button class="btn-ver-detalle" :class="{ active: expandidoId === cv.idCreditoVenta }" @click="toggleDetalles(cv)" title="Ver productos">📦</button>
                      <button v-if="cv.estatus === 'PENDIENTE'" class="btn-abonar" @click="abrirAbono(cv)">💰 Abonar</button>
                      <button v-if="cv.estatus === 'PENDIENTE'" class="btn-whatsapp" @click="abrirWhatsApp(cv)">📱 WhatsApp</button>
                    </div>
                    <Transition name="expand">
                      <div v-if="expandidoId === cv.idCreditoVenta" class="detalle-inline">
                        <div v-if="cargandoDetalle && !detallesMap[cv.idCreditoVenta]" class="detalle-loading">Cargando...</div>
                        <template v-else>
                          <div v-if="discrepanciasMap[cv.idCreditoVenta] !== undefined" class="detalle-discrepancia">
                            ⚠️ Discrepancia: {{ formatoMoneda(Math.abs(discrepanciasMap[cv.idCreditoVenta])) }}
                            <span class="disc-signo">{{ discrepanciasMap[cv.idCreditoVenta] > 0 ? ' (sobra)' : ' (falta)' }}</span>
                          </div>
                          <div v-if="detallesMap[cv.idCreditoVenta]?.length === 0" class="detalle-loading">Sin productos</div>
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
                      <div v-for="ab in cv.abonos" :key="ab.idAbono" class="abono-item">
                        <span class="abono-monto">{{ formatoMoneda(ab.monto) }}</span>
                        <span class="abono-fecha">{{ ab.fechaAbono?.slice(11, 16) }} {{ ab.fechaAbono?.slice(0, 10) }}</span>
                        <span class="abono-user">👤 {{ ab.nombreUsuario }}</span>
                      </div>
                    </div>
                  </div>
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
                <button class="btn-cancel" @click="cerrarFormPersona">❌ Cancelar</button>
                <button class="btn-save" @click="guardarPersona" :disabled="cargando">💾 {{ editandoPersona ? 'Actualizar' : 'Guardar' }}</button>
              </div>
            </div>
          </div>

          <!-- Modal abono con CobroModal -->
          <CobroModal 
            :open="modalAbonoAbierto"
            :modo="'abono'"
            :total="creditoAbonando?.saldoPendiente || 0"
            :saldo-pendiente="creditoAbonando?.saldoPendiente || 0"
            :nombre-persona="creditoAbonando?.nombrePersona || ''"
            @close="modalAbonoAbierto = false; creditoAbonando = null"
            @confirmar-abono="confirmarAbono"
          />



        </div>

        <footer class="modal-f">
          <button class="cancel-btn" @click="emit('close')">
            ❌ {{ seleccionar ? 'Cancelar' : 'Cerrar' }}
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
  background: color-mix(in srgb, var(--bg-primary) 85%, black);
  backdrop-filter: blur(5px);
  display: grid; place-items: center;
  padding: 1rem;
}

.pos-modal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  width: min(100%, 900px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: visible;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
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
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-h h3 {
  color: var(--accent-color);
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.close-x {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-x:hover {
  background: var(--error-color);
  border-color: var(--error-color);
  color: white;
}

.modal-b {
  padding: 1.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: var(--bg-primary);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--accent-color);
  border-radius: 3px;
}

.resumen-bar {
  display: flex; gap: 1rem; justify-content: center;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.5rem 1rem; margin-bottom: 0.75rem;
}

.resumen-item {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.total-deuda {
  color: var(--accent-color);
  font-weight: bold;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  gap: 0.5rem;
}

.btn-add {
  padding: 0.4rem 0.8rem;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  color: var(--accent-color);
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover {
  border-color: var(--accent-color);
}

.vbtn {
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  color: var(--text-primary);
}

.vbtn.on {
  background: var(--bg-panel);
  border-color: var(--accent-color);
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary);
}

.empty-state .empty-ico {
  font-size: 2rem;
}

.empty-state p {
  font-size: 0.9rem;
}

.empty-state.small {
  padding: 1rem;
}

.personas-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.persona-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  transition: all 0.15s;
}

.persona-row:hover {
  border-color: var(--accent-color);
}

.persona-row.clickable {
  cursor: pointer;
}

.persona-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--accent-color);
  color: var(--bg-primary);
  display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 1rem; flex-shrink: 0;
}

.persona-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.persona-name {
  font-weight: bold;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.persona-detail {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.persona-deuda {
  text-align: right;
  flex-shrink: 0;
}

.deuda-amount {
  display: block;
  font-weight: bold;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.deuda-count {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.deuda-count.paga {
  color: var(--success-color);
}

.persona-actions {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}

.action-btn {
  padding: 0.3rem 0.4rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.15s;
  color: var(--text-primary);
}

.action-btn:hover {
  border-color: var(--accent-color);
}

.action-del:hover {
  border-color: var(--error-color);
}

.personas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.6rem;
}

.persona-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.15s;
}

.persona-card:hover {
  border-color: var(--accent-color);
}

.persona-card.clickable {
  cursor: pointer;
}

.card-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--accent-color);
  color: var(--bg-primary);
  display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 1.2rem;
}

.card-name {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-primary);
  text-align: center;
}

.card-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.card-detail {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.card-deuda {
  text-align: center;
}

.card-deuda-amount {
  display: block;
  font-weight: bold;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.card-deuda-count {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.card-deuda-count.paga {
  color: var(--success-color);
}

.card-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.3rem;
}

.card-btn {
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--text-primary);
  transition: all 0.15s;
}

.card-btn:hover {
  border-color: var(--accent-color);
}

.card-btn-del:hover {
  border-color: var(--error-color);
}

/* Inner overlays (creditos panel, forms, abono) */
.inner-overlay {
  position: absolute; inset: 0;
  background: color-mix(in srgb, var(--bg-primary) 85%, black);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.inner-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  width: min(95%, 500px);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.inner-overlay .inner-panel {
  width: min(95%, 550px);
}

.inner-panel--sm {
  padding: 1.25rem;
  width: min(95%, 420px);
}

.inner-panel h4 {
  margin: 0 0 0.75rem;
  color: var(--accent-color);
}

.inner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.inner-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.inner-list {
  padding: 0.5rem;
  overflow-y: auto;
  flex: 1;
}

.credito-item {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.6rem;
  margin-bottom: 0.4rem;
}

.credito-item.pagado {
  opacity: 0.7;
}

.credito-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
}

.credito-ticket {
  font-weight: bold;
  font-size: 0.8rem;
  color: var(--accent-color);
}

.credito-status {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-weight: bold;
  text-transform: uppercase;
}

.badge-pendiente {
  background: var(--accent-color);
  color: var(--bg-primary);
}

.badge-pagado {
  background: var(--success-color);
  color: white;
}

.credito-monto {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  padding: 0.1rem 0;
}

.credito-label {
  color: var(--text-secondary);
}

.credito-valor {
  color: var(--text-primary);
}

.credito-valor.pagado {
  color: var(--success-color);
  font-weight: bold;
}

.credito-valor.saldo {
  color: var(--error-color);
  font-weight: bold;
}

.credito-fecha {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
}

.credito-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.4rem;
}

.btn-abonar {
  padding: 0.35rem 0.6rem;
  background: var(--success-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
}

.btn-abonar:hover {
  filter: brightness(1.15);
}

.btn-whatsapp {
  padding: 0.35rem 0.6rem;
  background: #25d366;
  border: 1px solid #128C7E;
  border-radius: 4px;
  color: #fff;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
}

.btn-whatsapp:hover {
  filter: brightness(1.15);
}

.abonos-list {
  margin-top: 0.4rem;
  border-top: 1px solid var(--border-color);
  padding-top: 0.3rem;
}

.abono-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  padding: 0.1rem 0;
  color: var(--text-secondary);
}

.abono-monto {
  font-weight: bold;
  color: var(--text-primary);
}

.abono-fecha {
  color: var(--text-secondary);
}

.abono-user {
  color: var(--text-secondary);
}

/* Form */
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.field-label {
  font-size: 0.75rem;
  color: var(--accent-color);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.input-field {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  padding: 0.5rem 0.7rem;
  font-size: 0.9rem;
  color: var(--text-primary);
  outline: none;
}

.input-field:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 20%, transparent);
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 0.4rem 0.8rem;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
}

.btn-cancel:hover {
  border-color: var(--accent-color);
}

.btn-save {
  padding: 0.4rem 0.8rem;
  background: var(--accent-color);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  color: var(--bg-primary);
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.abono-info p {
  margin: 0.2rem 0;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.modal-f {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-panel);
}

.cancel-btn {
  width: 100%;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.toast { z-index: 9999;
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: bold;
  
}

.toast-ok {
  background: var(--success-color);
  color: white;
}

.toast-error {
  background: var(--error-color);
  color: white;
}

.toast-info {
  background: var(--bg-panel);
  border: 1px solid var(--accent-color);
  color: var(--accent-color);
}

.btn-ver-detalle {
  padding: 0.35rem 0.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-ver-detalle:hover {
  border-color: var(--accent-color);
}

/* --- Detalle inline expandible --- */

.credito-item.is-expanded {
  border-color: var(--accent-color);
}

.detalle-inline {
  margin-top: 0.4rem;
  padding-top: 0.4rem;
  border-top: 1px solid var(--border-color);
  animation: fadeSlideIn 200ms ease-out;
}

@keyframes fadeSlideIn {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 500px; }
}

.detalle-loading {
  text-align: center;
  padding: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.detalle-productos {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.detalle-producto {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  font-size: 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 40%, transparent);
}

.detalle-producto:last-child {
  border-bottom: none;
}

.dp-nombre {
  flex: 1;
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.dp-cant {
  color: var(--text-secondary);
  white-space: nowrap;
  text-align: right;
}

.dp-subtotal {
  color: var(--accent-color);
  font-weight: 700;
  white-space: nowrap;
  text-align: right;
  min-width: 4.5rem;
}

@media (max-width: 480px) {
  .detalle-producto {
    font-size: 0.7rem;
    gap: 0.3rem;
    flex-wrap: wrap;
  }
  .dp-nombre {
    width: 100%;
    margin-bottom: 0.1rem;
  }
  .dp-subtotal {
    min-width: auto;
  }
}

/* Transición expand */
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

/* --- Discrepancia --- */

.detalle-discrepancia {
  background: color-mix(in srgb, var(--error-color) 12%, transparent);
  color: var(--error-color);
  padding: 0.35rem 0.5rem;
  border-radius: 5px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.disc-signo {
  font-weight: 400;
  opacity: 0.85;
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
</style>
