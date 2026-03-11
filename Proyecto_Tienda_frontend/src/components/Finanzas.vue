<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
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

// Datos de Bóveda Maestra (Ahora desde la tabla boveda)
const saldoBovedaReal = ref(0);
const historialBoveda = ref<any[]>([]);

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

async function cargarDatos() {
  cargando.value = true;
  try {
    // 1. Obtener estado actual de la bóveda (tabla boveda)
    const resBoveda = await fetch(`${API_BASE}/boveda/estado`);
    const dataBoveda = await resBoveda.json();
    if (resBoveda.ok && dataBoveda.datos) {
      saldoBovedaReal.value = dataBoveda.datos.montoTotal;
    }

    // 2. Obtener historial de la bóveda
    const resHist = await fetch(`${API_BASE}/boveda/historial?limit=30`);
    const dataHist = await resHist.json();
    if (resHist.ok && dataHist.datos) {
      historialBoveda.value = dataHist.datos;
    }
  } catch (err) {
    mostrarMensaje("Error al sincronizar con la bóveda real.", "error");
  } finally {
    cargando.value = false;
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

onMounted(() => {
  cargarDatos();
});
</script>

<template>
  <main class="finanzas-layout">
    <div class="bg-fog"></div>
    <section class="panel panel-main">
      <header class="header-finanzas">
        <div class="crown-icon">👑</div>
        <h1>Boveda Real</h1>
        <p>Historial exacto por hora del capital en bóveda.</p>
      </header>

      <div v-if="mensaje" class="estado" :class="`estado-${mensajeTipo}`">{{ mensaje }}</div>

      <!-- MONITOR DE BÓVEDA EDITABLE -->
      <div class="vault-monitor">
        <article class="main-card editable" @click="modalAjusteAbierto = true" title="Click para ajustar saldo manualmente">
          <div class="card-content">
            <span class="label">Total Actual en Bóveda 🖊️</span>
            <strong class="balance-text">{{ formatoMoneda(saldoRealCalculado) }}</strong>
            <p class="edit-hint">Toca para reajustar según tu conteo físico semanal</p>
          </div>
        </article>

        <div class="details-grid-single">
          <div class="detail-box info">
            <p>Último Movimiento</p>
            <strong v-if="historialBoveda.length">
              {{ historialBoveda[0].tipoMovimiento }}: 
              <span :class="historialBoveda[0].montoAjuste >= 0 ? 'txt-pos' : 'txt-neg'">
                {{ historialBoveda[0].montoAjuste >= 0 ? '+' : '' }} {{ formatoMoneda(historialBoveda[0].montoAjuste) }}
              </span>
            </strong>
            <strong v-else>Sin movimientos registrados</strong>
          </div>
        </div>
      </div>

      <!-- ACCIONES -->
      <div class="action-panel">
        <button class="wood-btn entry" @click="modalEntradaAbierto = true">
          <span class="icon">💰</span> Ingreso Extra
        </button>
        <button class="wood-btn exit" @click="modalSalidaAbierto = true">
          <span class="icon">💸</span> Salida / Gasto
        </button>
        <button class="wood-btn adjust" @click="modalAjusteAbierto = true">
          <span class="icon">⚖️</span> Ajustar Saldo Físico
        </button>
      </div>

      <!-- HISTORIAL -->
      <section class="history-log">
        <h3>📜 Libro de Movimientos de Boveda (Tiempo Real)</h3>
        <div class="parchment-list">
          <table v-if="historialBoveda.length">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Concepto / Tipo</th>
                <th>Monto Mov.</th>
                <th>Total en Bóveda</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in historialBoveda" :key="m.idBoveda" class="log-entry">
                <td>{{ new Date(m.fechaMovimiento).toLocaleString() }}</td>
                <td class="desc">
                  <strong>{{ m.tipoMovimiento }}</strong><br>
                  <small>{{ m.descripcion }}</small>
                </td>
                <td :class="m.montoAjuste >= 0 ? 'txt-pos' : 'txt-neg'">
                  {{ m.montoAjuste >= 0 ? '+' : '' }} {{ formatoMoneda(m.montoAjuste) }}
                </td>
                <td class="txt-balance">{{ formatoMoneda(m.montoTotal) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="no-data">Cargando historial de bóveda...</div>
        </div>
      </section>
    </section>

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
  </main>
</template>

<style scoped>
.finanzas-layout { padding: 2rem; background: var(--bg-primary); height: 100%; overflow-y: auto; }
.header-finanzas { text-align: center; margin-bottom: 2rem; }
.crown-icon { font-size: 3rem; margin-bottom: 0.5rem; }
.header-finanzas h1 { font-size: 2.2rem; color: var(--accent-color); text-transform: uppercase; text-shadow: 2px 2px 0 black; margin: 0; }

.main-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 4px solid var(--accent-color);
  padding: 2.5rem;
  border-radius: 20px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  box-shadow: 0 10px 20px rgba(0,0,0,0.4);
}

.main-card:hover { transform: scale(1.02); box-shadow: 0 0 20px var(--accent-color); }
.balance-text { display: block; font-size: 4.5rem; color: var(--accent-color); font-family: 'Courier New', monospace; margin: 0.5rem 0; }
.edit-hint { font-size: 0.8rem; color: var(--text-secondary); font-style: italic; margin: 0; }

.details-grid-single { margin-top: 1.5rem; margin-bottom: 2rem; display: flex; justify-content: center; }
.detail-box { background: var(--bg-secondary); border: 2px solid var(--border-color); padding: 1rem 2rem; border-radius: 10px; text-align: center; min-width: 300px; }

.action-panel { display: flex; justify-content: center; gap: 1.5rem; margin-bottom: 3rem; flex-wrap: wrap; }
.wood-btn {
  background: #5c4033;
  color: white;
  padding: 1rem 1.5rem;
  border: 3px solid #3d2b1f;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  text-transform: uppercase;
  box-shadow: 0 5px 0 #2a1d15;
  transition: all 0.1s;
}

.wood-btn:active { transform: translateY(4px); box-shadow: 0 2px 0 #2a1d15; }
.wood-btn.entry { background: #27ae60; border-color: #1e8449; }
.wood-btn.exit { background: #c0392b; border-color: #922b21; }
.wood-btn.adjust { background: #d4ac0d; border-color: #9a7d0a; }

.parchment-list { background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 10px; border: 1px solid var(--border-color); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 600px; }
td, th { padding: 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
th { color: var(--accent-color); border-bottom: 2px solid var(--accent-color); text-transform: uppercase; font-size: 0.8rem; }
.txt-pos { color: #2ecc71; font-weight: bold; }
.txt-neg { color: #e74c3c; font-weight: bold; }
.txt-balance { color: var(--accent-color); font-weight: bold; }

.desc small { color: var(--text-secondary); }

.estado { padding: 1rem; border-radius: 8px; margin-bottom: 1rem; text-align: center; font-weight: bold; }
.estado-ok { background: #27ae60; color: white; }
.estado-error { background: #c0392b; color: white; }
.estado-info { background: #2980b9; color: white; }

@media (max-width: 900px) {
  .balance-text { font-size: 2.8rem; }
  .detail-box { min-width: 100%; }
}
</style>
