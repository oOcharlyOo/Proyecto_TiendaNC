<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useTheme } from '../composables/useTheme';
import EntradaEfectivoModal from './modals/EntradaEfectivoModal.vue';
import SalidaEfectivoModal from './modals/SalidaEfectivoModal.vue';
import MontoInicialModal from './modals/MontoInicialModal.vue';

const { currentTheme } = useTheme();
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';
const idUsuario = ref<number>(Number(localStorage.getItem('idUsuario') || 0));

// Estados de UI
const mensaje = ref('');
const mensajeTipo = ref<'ok' | 'error' | 'info'>('info');
const cargando = ref(false);
const modalEntradaAbierto = ref(false);
const modalSalidaAbierto = ref(false);
const modalAjusteAbierto = ref(false);
const pestañaActiva = ref<'boveda' | 'ganancias'>('boveda');

// Datos de Bóveda Maestra (Ahora desde la tabla boveda)
const saldoBovedaReal = ref(0);
const historialBoveda = ref<any[]>([]);

// Datos de Ganancias
const gananciasTotales = ref(0);
const gananciasDelDia = ref(0);
const gananciasEditadas = ref(0);
const historialGanancias = ref<any[]>([]);
const gananciaPaginaActual = ref(0);
const gananciaTotalPaginas = ref(0);
const modalEditarGananciasAbierto = ref(false);

// Filtrar duplicados por idBoveda para evitar datos repetidos en la UI
const historialUnico = computed(() => {
  const ids = new Set();
  return historialBoveda.value.filter(item => {
    if (ids.has(item.idBoveda)) return false;
    ids.add(item.idBoveda);
    return true;
  });
});

// Estados de paginación
const paginaActual = ref(0);
const totalPaginas = ref(0);
const tamanoPagina = ref(10);

const saldoRealCalculado = computed(() => {
  return saldoBovedaReal.value;
});

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
}

function mostrarMensaje(texto: string, tipo: 'ok' | 'error' | 'info') {
  mensaje.value = texto;
  mensajeTipo.value = tipo;
  setTimeout(() => mensaje.value = '', 5000);
}

async function cargarDatos(pagina = 0) {
  cargando.value = true;
  paginaActual.value = pagina;
  try {
    // 1. Obtener estado actual de la bóveda (tabla boveda)
    const resBoveda = await fetch(`${API_BASE}/boveda/estado`);
    const dataBoveda = await resBoveda.json();
    if (resBoveda.ok && dataBoveda.datos) {
      saldoBovedaReal.value = dataBoveda.datos.montoTotal;
    }

    // 2. Obtener historial de la bóveda (paginado)
    const resHist = await fetch(`${API_BASE}/boveda/historial?page=${pagina}&size=${tamanoPagina.value}`);
    const dataHist = await resHist.json();
    if (resHist.ok && dataHist.datos) {
      historialBoveda.value = dataHist.datos.contenido;
      totalPaginas.value = dataHist.datos.totalPaginas;
    }
  } catch (err) {
    mostrarMensaje("Error al sincronizar con la bóveda real.", "error");
  } finally {
    cargando.value = false;
  }
}

async function cargarGanancias(pagina = 0) {
  cargando.value = true;
  gananciaPaginaActual.value = pagina;
  try {
    const ahora = new Date();
    const hoy = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
    
    // Cargar ganancias reales del día desde ventas
    try {
      const resVentas = await fetch(`${API_BASE}/ventas/obtenerVentaPorDia/${hoy}`);
      if (resVentas.ok) {
        const dataVentas = await resVentas.json();
        console.log('Ganancias del día (backend):', dataVentas);
        const gananciaDia = Number(dataVentas.datos?.gananciaTotal) || 0;
        gananciasDelDia.value = isNaN(gananciaDia) ? 0 : gananciaDia;
      }
    } catch (e) {
      console.log("No se pudieron obtener ventas del día", e);
    }
    
    // Cargar ganancias acumuladas totales (como bóveda)
    try {
      const resGanancias = await fetch(`${API_BASE}/gananciasAcumuladas/estado`);
      if (resGanancias.ok) {
        const dataGanancias = await resGanancias.json();
        console.log('Ganancias acumuladas (backend):', dataGanancias);
        const montoTotal = Number(dataGanancias.datos?.montoTotal) || 0;
        gananciasTotales.value = isNaN(montoTotal) ? 0 : montoTotal;
      }
    } catch (e) {
      console.log("No se pudieron obtener ganancias acumuladas", e);
    }
    
    // Cargar historial de ganancias
    try {
      const resHistorial = await fetch(`${API_BASE}/gananciasAcumuladas/historial?page=${pagina}&size=${tamanoPagina.value}`);
      if (resHistorial.ok) {
        const dataHistorial = await resHistorial.json();
        if (dataHistorial.datos) {
          historialGanancias.value = dataHistorial.datos.contenido.map((g: any) => ({
            id: g.idGanancia,
            monto: g.montoTotal,
            descripcion: g.descripcion,
            fecha: new Date(g.fechaMovimiento).toLocaleString('es-MX'),
            idUsuario: g.usuario?.idUsuario
          }));
          gananciaTotalPaginas.value = dataHistorial.datos.totalPaginas;
        }
      }
    } catch (e) {
      console.log("No se pudo obtener historial de ganancias", e);
    }
    
    gananciaTotalPaginas.value = 1;
  } catch (err) {
    console.error("Error cargando ganancias:", err);
  } finally {
    cargando.value = false;
  }
}

function cambiarPagina(nuevaPagina: number) {
  if (pestañaActiva.value === 'boveda') {
    if (nuevaPagina >= 0 && nuevaPagina < totalPaginas.value) {
      cargarDatos(nuevaPagina);
    }
  } else {
    if (nuevaPagina >= 0 && nuevaPagina < gananciaTotalPaginas.value) {
      cargarGanancias(nuevaPagina);
    }
  }
}

async function handleAjusteBase(payload: { montoInicial: number }) {
  try {
    const res = await fetch(`${API_BASE}/boveda/ajuste`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idUsuario: idUsuario.value,
        montoEoS: payload.montoInicial,
        descripcion: "Ajuste manual de bóveda (Conteo físico semanal)"
      })
    });

    if (res.ok) {
      modalAjusteAbierto.value = false;
      mostrarMensaje("Saldo de Bóveda sincronizado con éxito.", "ok");
      await cargarDatos();
    } else {
      mostrarMensaje("Error al procesar el ajuste.", "error");
    }
  } catch (e) {
    mostrarMensaje("Error de conexión.", "error");
  }
}

const editarGanancias = () => {
  gananciasEditadas.value = Number(gananciasTotales.value) || 0;
  modalEditarGananciasAbierto.value = true;
};

async function registrarMovimiento(payload: { montoEoS: number, descripcion: string }, tipo: 'entrada' | 'salida') {
  try {
    const endpoint = tipo === 'entrada' ? 'entrada' : 'salida';
    const res = await fetch(`${API_BASE}/caja/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, idUsuario: idUsuario.value })
    });
    if (res.ok) {
      mostrarMensaje("Movimiento registrado.", "ok");
      tipo === 'entrada' ? modalEntradaAbierto.value = false : modalSalidaAbierto.value = false;
      await cargarDatos();
    }
  } catch (e) { mostrarMensaje("Error en la operación.", "error"); }
}

let refreshHandler: (() => void) | null = null;

onMounted(() => {
  if (pestañaActiva.value === 'ganancias') {
    cargarGanancias();
  } else {
    cargarDatos();
  }

  refreshHandler = () => {
    if (pestañaActiva.value === 'ganancias') {
      cargarGanancias();
    } else {
      cargarDatos();
    }
  };
  window.addEventListener('venta-completada', refreshHandler);
});

onBeforeUnmount(() => {
  if (refreshHandler) {
    window.removeEventListener('venta-completada', refreshHandler);
  }
});

function cambiarPestaña(pestaña: 'boveda' | 'ganancias') {
  pestañaActiva.value = pestaña;
  if (pestaña === 'ganancias') {
    cargarGanancias();
  } else {
    cargarDatos();
  }
}
</script>

<template>
  <main class="finanzas-container">
    <div class="bg-fog"></div>
    
    <div class="content-wrapper">
      <!-- HEADER SECCIÓN -->
      <header class="finanzas-header animate-fade-in">
        <div class="header-main">
          <div class="crown-wrapper">
            <span class="crown-icon">👑</span>
            <div class="crown-glow"></div>
          </div>
          <div class="title-group">
            <h1>{{ pestañaActiva === 'boveda' ? 'Bóveda Real' : 'Ganancias' }}</h1>
            <p class="subtitle">{{ pestañaActiva === 'boveda' ? 'Gestión centralizada del capital y flujo de efectivo' : 'Seguimiento de ganancias y rentabilidad' }}</p>
          </div>
          <div class="tabs-wrapper">
            <button 
              class="tab-btn" 
              :class="{ active: pestañaActiva === 'boveda' }"
              @click="cambiarPestaña('boveda')"
            >
              <span class="tab-icon">💰</span>
              Bóveda
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: pestañaActiva === 'ganancias' }"
              @click="cambiarPestaña('ganancias')"
            >
              <span class="tab-icon">📈</span>
              Ganancias
            </button>
          </div>
        </div>
        
        <div v-if="mensaje" class="alert-box" :class="`alert-${mensajeTipo}`">
          <span class="alert-icon">{{ mensajeTipo === 'ok' ? '✅' : mensajeTipo === 'error' ? '❌' : 'ℹ️' }}</span>
          {{ mensaje }}
        </div>
      </header>

      <!-- DASHBOARD GRID -->
      <div class="dashboard-grid">
        
        <!-- CARD PRINCIPAL: SALDO -->
        <section class="main-stats-section animate-slide-up">
          <article 
            class="vault-card clickable" 
            @click="modalAjusteAbierto = true"
            title="Click para ajustar saldo físicamente"
          >
            <div class="vault-card-inner">
              <div class="vault-decoration">
                <span class="dec-corner top-left"></span>
                <span class="dec-corner top-right"></span>
                <span class="dec-corner bottom-left"></span>
                <span class="dec-corner bottom-right"></span>
              </div>
              
              <div class="card-label">
                <span class="icon-label">💰</span>
                Total en Bóveda
              </div>
              
              <div class="balance-display">
                <span class="currency-symbol">$</span>
                <strong class="balance-amount">{{ formatoMoneda(saldoRealCalculado).replace('$', '') }}</strong>
              </div>
              
              <div class="card-footer">
                <span class="edit-badge">
                  <span class="pencil">🖊️</span> Sincronizar Físico
                </span>
              </div>
            </div>
          </article>

          <!-- QUICK STATS -->
          <div class="quick-stats-grid">
            <div class="mini-stat-card">
              <div class="stat-icon-circle info">📜</div>
              <div class="stat-details">
                <span class="stat-label">Último Registro</span>
                <strong v-if="historialBoveda.length" class="stat-value">
                  {{ historialBoveda[0].tipoMovimiento }}
                </strong>
                <strong v-else class="stat-value">Sin datos</strong>
              </div>
            </div>
            
            <div class="mini-stat-card">
              <div class="stat-icon-circle" :class="historialBoveda[0]?.montoAjuste >= 0 ? 'success' : 'danger'" v-if="historialBoveda.length">
                {{ historialBoveda[0].montoAjuste >= 0 ? '📈' : '📉' }}
              </div>
              <div class="stat-details" v-if="historialBoveda.length">
                <span class="stat-label">Monto Variación</span>
                <strong :class="historialBoveda[0].montoAjuste >= 0 ? 'txt-pos' : 'txt-neg'" class="stat-value">
                  {{ historialBoveda[0].montoAjuste >= 0 ? '+' : '' }}{{ formatoMoneda(historialBoveda[0].montoAjuste) }}
                </strong>
              </div>
              <div class="stat-details" v-else>
                <span class="stat-label">Monto Variación</span>
                <strong class="stat-value">--</strong>
              </div>
            </div>
          </div>
        </section>

        <!-- PANEL DE ACCIONES -->
        <section class="actions-section animate-slide-up" style="animation-delay: 0.1s">
          <div class="section-card">
            <h3><span class="icon">⚒️</span> Operaciones Rápidas</h3>
            <div class="actions-buttons">
              <button class="action-btn btn-entry" @click="modalEntradaAbierto = true">
                <div class="btn-content">
                  <span class="btn-icon">📥</span>
                  <div class="btn-text">
                    <span class="primary">Ingreso Extra</span>
                    <span class="secondary">Aumentar capital</span>
                  </div>
                </div>
              </button>
              
              <button class="action-btn btn-exit" @click="modalSalidaAbierto = true">
                <div class="btn-content">
                  <span class="btn-icon">📤</span>
                  <div class="btn-text">
                    <span class="primary">Salida / Gasto</span>
                    <span class="secondary">Registrar retiro</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        <!-- HISTORIAL DE MOVIMIENTOS -->
        <section class="history-section animate-slide-up" style="animation-delay: 0.2s">
          <div class="section-card history-card">
            <div class="history-header">
              <h3><span class="icon">📖</span> Libro de Bóveda</h3>
              <div class="loading-indicator" v-if="cargando">
                <span class="spinner"></span>
              </div>
            </div>

            <div class="history-list-container parchment-effect">
              <!-- Unificamos a etiquetas/tarjetas para todos los tamaños -->
              <div class="history-labels-list" v-if="historialUnico.length">
                <div v-for="m in historialUnico" :key="m.idBoveda" class="history-entry-label animate-fade-in">
                  <div class="label-header">
                    <div class="label-time">
                      <span class="icon">🕒</span>
                      <span class="text">{{ new Date(m.fechaMovimiento).toLocaleString() }}</span>
                    </div>
                    <div class="label-indicator" :class="m.montoAjuste >= 0 ? 'indicator-pos' : 'label-indicator-neg'">
                      {{ m.montoAjuste >= 0 ? '▲ Ingreso' : '▼ Salida' }}
                    </div>
                  </div>
                  
                  <div class="label-body">
                    <p class="label-desc">{{ m.descripcion }}</p>
                  </div>
                  
                  <div class="label-footer">
                    <div class="footer-segment">
                      <span class="caption">Monto:</span>
                      <strong :class="m.montoAjuste >= 0 ? 'txt-pos' : 'txt-neg'">
                        {{ m.montoAjuste >= 0 ? '+' : '' }}{{ formatoMoneda(m.montoAjuste) }}
                      </strong>
                    </div>
                    <div class="footer-divider"></div>
                    <div class="footer-segment">
                      <span class="caption">Balance:</span>
                      <strong class="txt-balance">{{ formatoMoneda(m.montoTotal) }}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="!historialUnico.length && !cargando" class="empty-state">
                <span class="empty-icon">📭</span>
                <p>No hay registros en el libro de bóveda.</p>
              </div>
            </div>

            <!-- PAGINACIÓN BÓVEDA -->
            <footer v-if="totalPaginas > 1 && pestañaActiva === 'boveda'" class="pagination-footer">
              <button 
                class="nav-btn" 
                :disabled="paginaActual === 0" 
                @click="cambiarPagina(paginaActual - 1)"
              >
                <span class="arrow">←</span> Anterior
              </button>
              
              <div class="page-info">
                Página <strong>{{ paginaActual + 1 }}</strong> de {{ totalPaginas }}
              </div>
              
              <button 
                class="nav-btn" 
                :disabled="paginaActual >= totalPaginas - 1" 
                @click="cambiarPagina(paginaActual + 1)"
              >
                Siguiente <span class="arrow">→</span>
              </button>
            </footer>
          </div>
        </section>
        
        <!-- SECCIÓN DE GANANCIAS (solo cuando está activa) -->
        <section v-if="pestañaActiva === 'ganancias'" class="history-section animate-slide-up" style="animation-delay: 0.2s">
          <div class="section-card history-card">
            <div class="history-header">
              <h3><span class="icon">📈</span> Ganancias del Mes</h3>
              <div class="loading-indicator" v-if="cargando">
                <span class="spinner"></span>
              </div>
            </div>
            
            <div class="ganancias-cards-grid">
              <div class="ganancia-card">
                <div class="ganancia-card-inner">
                  <div class="card-label">
                    <span class="icon-label">💵</span>
                    Ganancias de Hoy
                  </div>
                  <div class="balance-display">
                    <span class="currency-symbol">$</span>
                    <strong class="balance-amount">{{ formatoMoneda(gananciasDelDia).replace('$', '') }}</strong>
                  </div>
                </div>
              </div>
              
              <div 
                class="ganancia-card clickable" 
                @click="editarGanancias"
                title="Click para ajustar ganancias"
              >
                <div class="ganancia-card-inner">
                  <div class="card-label">
                    <span class="icon-label">📊</span>
                    Total del Mes
                  </div>
                  <div class="balance-display">
                    <span class="currency-symbol">$</span>
                    <strong class="balance-amount">{{ formatoMoneda(gananciasTotales).replace('$', '') }}</strong>
                  </div>
                  <div class="card-footer">
                    <span class="edit-badge">
                      <span class="pencil">🖊️</span> Ajustar
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="history-header" style="margin-top: 1.5rem;">
              <h3><span class="icon">📋</span> Historial de Ajustes</h3>
            </div>
            
            <div class="history-list-container parchment-effect">
              <div class="history-labels-list" v-if="historialGanancias.length">
                <div v-for="v in historialGanancias" :key="v.id" class="history-entry-label animate-fade-in">
                  <div class="label-header">
                    <div class="label-time">
                      <span class="icon">🕒</span>
                      <span class="text">{{ v.fecha }}</span>
                    </div>
                    <div class="label-indicator indicator-pos">
                      ✓ Ajuste
                    </div>
                  </div>
                  
                  <div class="label-body">
                    <p class="label-desc">Ajuste #{{ v.id }}</p>
                  </div>
                  
                  <div class="label-footer">
                    <div class="footer-segment">
                      <span class="caption">Monto:</span>
                      <strong class="txt-pos">{{ formatoMoneda(Number(v.monto) || 0) }}</strong>
                    </div>
                    <div class="footer-divider"></div>
                    <div class="footer-segment">
                      <span class="caption">Descripción:</span>
                      <strong class="txt-pos">{{ v.descripcion }}</strong>
                    </div>
                  </div>
                </div>
              </div>
              
              <div v-if="!historialGanancias.length && !cargando" class="empty-state">
                <span class="empty-icon">📭</span>
                <p>No hay ajustes registrados.</p>
              </div>
            </div>
            
            <!-- PAGINACIÓN GANANCIAS -->
            <footer v-if="gananciaTotalPaginas > 1" class="pagination-footer">
              <button 
                class="nav-btn" 
                :disabled="gananciaPaginaActual === 0" 
                @click="cambiarPagina(gananciaPaginaActual - 1)"
              >
                <span class="arrow">←</span> Anterior
              </button>
              
              <div class="page-info">
                Página <strong>{{ gananciaPaginaActual + 1 }}</strong> de {{ gananciaTotalPaginas }}
              </div>
              
              <button 
                class="nav-btn" 
                :disabled="gananciaPaginaActual >= gananciaTotalPaginas - 1" 
                @click="cambiarPagina(gananciaPaginaActual + 1)"
              >
                Siguiente <span class="arrow">→</span>
              </button>
            </footer>
          </div>
        </section>
      </div>
    </div>

    <!-- MODALES -->
    <EntradaEfectivoModal :open="modalEntradaAbierto" @close="modalEntradaAbierto = false" @submit="(p) => registrarMovimiento(p, 'entrada')" />
    <SalidaEfectivoModal :open="modalSalidaAbierto" @close="modalSalidaAbierto = false" @submit="(p) => registrarMovimiento(p, 'salida')" />
    <MontoInicialModal 
      :open="modalAjusteAbierto" 
      title="Ajuste de Bóveda Real"
      subtitle="Ingresa el monto total físico que has contado en la bóveda"
      label="Saldo Real Contado"
      confirm-text="Actualizar Saldo de Bóveda"
      @close="modalAjusteAbierto = false" 
      @submit="handleAjusteBase" 
    />
    <MontoInicialModal 
      :open="modalEditarGananciasAbierto" 
      title="Ajuste de Ganancias"
      subtitle="Ingresa el monto total de ganancias registrado manualmente"
      label="Total Ganancias"
      confirm-text="Actualizar Ganancias"
      :initial-value="gananciasEditadas"
      @close="modalEditarGananciasAbierto = false" 
      @submit="handleEditarGanancias" 
    />
  </main>
</template>

<style scoped>
/* =========================================
   LAYOUT & CONTAINERS
   ========================================= */
.finanzas-container {
  height: 95vh;
  padding: 1rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-top: 1rem;
}

@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 380px 1fr;
    grid-template-rows: auto 1fr;
  }
  
  .main-stats-section { grid-column: 1; grid-row: 1; }
  .actions-section { grid-column: 1; grid-row: 2; }
  .history-section { grid-column: 2; grid-row: 1 / span 2; }
}

/* =========================================
   HEADER STYLES
   ========================================= */
.finanzas-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 1.2rem;
}

.crown-wrapper {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 2px solid var(--accent-color);
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

.crown-icon { font-size: 2.2rem; z-index: 2; }
.crown-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  background: var(--accent-color);
  filter: blur(15px);
  opacity: 0.2;
  animation: pulse-glow 3s infinite ease-in-out;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.1; transform: scale(0.8); }
  50% { opacity: 0.3; transform: scale(1.1); }
}

.title-group h1 {
  margin: 0;
  font-size: 2.2rem;
  line-height: 1;
  color: var(--accent-color);
  text-shadow: 2px 2px 0 var(--border-color);
}

.subtitle {
  margin: 0.3rem 0 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  letter-spacing: 0.5px;
}

/* =========================================
   VAULT CARD (SALDO PRINCIPAL)
   ========================================= */
.vault-card {
  background: linear-gradient(145deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: 3px solid var(--accent-color);
  border-radius: 16px;
  padding: 4px;
  box-shadow: 0 10px 30px var(--shadow-color);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
}

.vault-card-inner {
  padding: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--accent-color) 20%, transparent);
  border-radius: 12px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vault-decoration .dec-corner {
  position: absolute;
  width: 15px;
  height: 15px;
  border: 2px solid var(--accent-color);
  opacity: 0.5;
}

.top-left { top: 10px; left: 10px; border-right: 0; border-bottom: 0; }
.top-right { top: 10px; right: 10px; border-left: 0; border-bottom: 0; }
.bottom-left { bottom: 10px; left: 10px; border-right: 0; border-top: 0; }
.bottom-right { bottom: 10px; right: 10px; border-left: 0; border-top: 0; }

.card-label {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.balance-display {
  display: flex;
  align-items: baseline;
  color: var(--accent-color);
  margin: 0.5rem 0;
}

.currency-symbol { font-size: 1.8rem; font-weight: bold; margin-right: 2px; }
.balance-amount {
  font-size: 3.2rem;
  font-family: 'HyliaSerif', 'Courier New', monospace;
  line-height: 1;
}

.card-footer {
  margin-top: 1rem;
  width: 100%;
  display: flex;
  justify-content: center;
}

.edit-badge {
  background: color-mix(in srgb, var(--accent-color) 10%, transparent);
  border: 1px solid var(--accent-color);
  color: var(--accent-color);
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.vault-card.clickable:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 15px 40px var(--shadow-color), 0 0 20px color-mix(in srgb, var(--accent-color) 30%, transparent);
  cursor: pointer;
}

/* =========================================
   QUICK STATS
   ========================================= */
.quick-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1.2rem;
}

.mini-stat-card {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.stat-icon-circle {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: color-mix(in srgb, var(--bg-primary) 50%, transparent);
  border: 1px solid var(--border-color);
}

.stat-icon-circle.info { border-color: var(--infoBlueColor); color: var(--infoBlueColor); }
.stat-icon-circle.success { border-color: var(--success-color); color: var(--success-color); }
.stat-icon-circle.danger { border-color: var(--error-color); color: var(--error-color); }

.stat-details {
  display: flex;
  flex-direction: column;
}

.stat-label { font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; }
.stat-value { font-size: 0.9rem; color: var(--text-primary); }

/* =========================================
   ACTION BUTTONS
   ========================================= */
.section-card {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  height: 100%;
}

.section-card h3 {
  margin: 0 0 1.2rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--accent-color);
}

.actions-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.action-btn {
  width: 100%;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 0.8rem 1rem;
  background: var(--bg-panel); 
  position: relative;
  transition: all 0.2s;
  overflow: hidden;
  text-align: left;
}

.action-btn .btn-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 2;
  position: relative;
}

.btn-icon {
  font-size: 1.5rem;
  background: color-mix(in srgb, var(--bg-primary) 40%, transparent);
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--text-primary) 10%, transparent);
}

.btn-text { display: flex; flex-direction: column; }
.btn-text .primary { font-weight: bold; color: var(--text-primary); font-size: 1rem; }
.btn-text .secondary { font-size: 0.75rem; color: color-mix(in srgb, var(--text-primary) 60%, transparent); }

/* Button specific styles */
.btn-entry { 
  background: linear-gradient(135deg, color-mix(in srgb, var(--success-color) 40%, transparent) 0%, var(--bg-secondary) 100%); 
  border-color: var(--success-color); 
}
.btn-exit { 
  background: linear-gradient(135deg, color-mix(in srgb, var(--error-color) 40%, transparent) 0%, var(--bg-secondary) 100%); 
  border-color: var(--error-color); 
}

.action-btn:hover {
  transform: translateX(5px);
  filter: brightness(1.2);
  box-shadow: -5px 0 15px var(--shadow-color);
}

.action-btn:active { transform: scale(0.98); }

/* =========================================
   HISTORY SECTION (LABELS DESIGN)
   ========================================= */
.history-card {
  display: flex;
  flex-direction: column;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.history-list-container {
  flex: 1;
  border-radius: 16px;
  background: color-mix(in srgb, var(--bg-primary) 40%, transparent);
  border: 1px solid var(--border-color);
  padding: 1rem;
}

.history-labels-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 1rem;
  gap: 1rem;
  max-height: 50vh;
  overflow-y: auto;
}

.history-entry-label {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  height: 12rem;
}

.history-entry-label:hover {
  transform: scale(1.01);
  box-shadow: 0 5px 15px var(--shadow-color);
  border-color: var(--accent-color);
}

.label-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.8rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed color-mix(in srgb, var(--text-primary) 10%, transparent);
}

.label-time {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.label-indicator {
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
}

.indicator-pos { background: color-mix(in srgb, var(--success-color) 20%, transparent); color: var(--success-color); border: 1px solid var(--success-color); }
.label-indicator-neg { background: color-mix(in srgb, var(--error-color) 20%, transparent); color: var(--error-color); border: 1px solid var(--error-color); }

.label-body {
  margin-bottom: 1rem;
}

.label-desc {
  font-size: 1rem;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.4;
}

.label-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: color-mix(in srgb, var(--bg-primary) 30%, transparent);
  padding: 0.6rem 1rem;
  border-radius: 8px;
}

.footer-segment {
  display: flex;
  flex-direction: column;
}

.footer-segment .caption {
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.footer-divider {
  width: 1px;
  height: 25px;
  background: color-mix(in srgb, var(--border-color) 50%, transparent);
}

.txt-balance { color: var(--accent-color); }

/* Pagination remains similar but adjusted spacing */
.pagination-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.5rem;
  margin-top: 1rem;
}

.nav-btn {
  background: var(--bg-primary);
  color: var(--accent-color);
  border: 1px solid var(--accent-color);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-btn:hover:not(:disabled) {
  background: var(--accent-color);
  color: var(--bg-primary);
  transform: translateY(-2px);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  border-color: var(--text-secondary);
}

.page-info { font-size: 0.9rem; color: var(--text-secondary); }
.page-info strong { color: var(--accent-color); }

/* =========================================
   UTILITIES & ANIMATIONS
   ========================================= */
.alert-box {
  padding: 0.8rem 1.2rem;
  border-radius: 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  animation: slideInDown 0.4s ease-out;
}

.alert-ok { 
  background: color-mix(in srgb, var(--success-color) 20%, transparent); 
  color: var(--success-color); 
  border: 1px solid var(--success-color); 
}
.alert-error { 
  background: color-mix(in srgb, var(--error-color) 20%, transparent); 
  color: var(--error-color); 
  border: 1px solid var(--error-color); 
}
.alert-info { 
  background: color-mix(in srgb, var(--infoBlueColor) 20%, transparent); 
  color: var(--infoBlueColor); 
  border: 1px solid var(--infoBlueColor); 
}

.txt-pos { color: var(--success-color); }
.txt-neg { color: var(--error-color); }
.text-right { text-align: right; }

.loading-indicator .spinner {
  width: 20px;
  height: 20px;
  border: 2px solid color-mix(in srgb, var(--accent-color) 20%, transparent);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  display: inline-block;
  animation: spin 1s infinite linear;
}

@keyframes spin { to { transform: rotate(360deg); } }

.animate-fade-in { animation: fadeIn 0.6s ease-out; }
.animate-slide-up { animation: slideUp 0.5s ease-out forwards; opacity: 0; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { 
  from { opacity: 0; transform: translateY(20px); } 
  to { opacity: 1; transform: translateY(0); } 
}
@keyframes slideInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.empty-state {
  padding: 4rem 2rem;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon { font-size: 3rem; display: block; margin-bottom: 1rem; opacity: 0.3; }

/* Responsiveness adjustments for very small screens */
@media (max-width: 480px) {
  .balance-amount { font-size: 2.5rem; }
  .crown-wrapper { width: 50px; height: 50px; }
  .crown-icon { font-size: 1.8rem; }
  .title-group h1 { font-size: 1.8rem; }
  .finanzas-container { padding: 1rem; }

  .history-labels-list {
    display: grid;
    grid-template-columns: 1fr;
    padding: 1rem;
    gap: 1rem;
    max-height: 45vh;
    overflow-y: auto;
  }

  .history-entry-label {
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .history-entry-label:hover {
    transform: scale(1.01);
    box-shadow: 0 5px 15px var(--shadow-color);
    border-color: var(--accent-color);
  }
}

/* =========================================
   TABS (PESTAÑAS)
   ========================================= */
.tabs-wrapper {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  border-color: var(--accent-color);
  color: var(--text-primary);
}

.tab-btn.active {
  background: linear-gradient(145deg, var(--accent-color), var(--bg-secondary));
  border-color: var(--accent-color);
  color: var(--bg-primary);
}

.tab-icon {
  font-size: 1.1rem;
}

/* =========================================
   GANANCIAS CARDS
   ========================================= */
.ganancias-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.ganancia-card {
  background: linear-gradient(145deg, var(--success-color), var(--bg-secondary));
  border: 3px solid var(--success-color);
  border-radius: 16px;
  padding: 4px;
}

.ganancia-card-inner {
  background: linear-gradient(145deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
}

.ganancia-card .card-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.ganancia-card .balance-display {
  color: var(--success-color);
}

.ganancia-card .balance-amount {
  font-size: 1.5rem;
}
</style>

