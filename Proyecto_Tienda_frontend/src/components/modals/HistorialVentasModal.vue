<script setup lang="ts">
import { ref, computed } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

type VentaResumen = {
  idVenta: number;
  idUsuario?: number;
  nombreUsuario?: string;
  numeroTicket?: number;
  montoTotal?: number | string;
  metodoPago?: string;
  estatus?: string;
  fechaVenta?: string;
  tieneDiscrepancia?: boolean;
  ganancia?: number | string;
};

const props = defineProps<{
  open: boolean;
  loading: boolean;
  cobroTotal: number;
  gananciaTotal: number;
  ventas: VentaResumen[];
  usuariosUnicos?: { idUsuario: number; nombre: string }[];
  esAdmin?: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'ver-detalle', venta: VentaResumen): void;
  (event: 'cancelar', venta: VentaResumen): void;
  (event: 'ventas-corregidas'): void;
}>();

const filtroUsuario = ref<number | 'todos'>('todos');
const filtroDiscrepancia = ref<'todas' | 'discrepancia'>('todas');
const ventasSeleccionadas = ref<Set<number>>(new Set());
const corrigiendo = ref(false);
const correccionMensaje = ref('');

const ventasFiltradas = computed(() => {
  let result = props.ventas;
  if (filtroUsuario.value !== 'todos') result = result.filter(v => v.idUsuario === filtroUsuario.value);
  if (filtroDiscrepancia.value === 'discrepancia') result = result.filter(v => v.tieneDiscrepancia);
  return result;
});

const ventasConDiscrepancia = computed(() => ventasFiltradas.value.filter(v => v.tieneDiscrepancia));

const cobroTotalFiltrado = computed(() => ventasFiltradas.value.reduce((sum, v) => sum + Number(v.montoTotal ?? 0), 0));

const gananciasPorVendedor = computed(() => {
  if (!props.usuariosUnicos?.length) return [];
  return props.usuariosUnicos.map(u => {
    const ventasU = ventasFiltradas.value.filter(v => v.idUsuario === u.idUsuario);
    return {
      idUsuario: u.idUsuario, nombre: u.nombre,
      totalVentas: ventasU.length,
      montoTotal: ventasU.reduce((s, v) => s + Number(v.montoTotal ?? 0), 0),
      gananciaTotal: ventasU.reduce((s, v) => s + Number(v.ganancia ?? 0), 0)
    };
  }).sort((a, b) => b.gananciaTotal - a.gananciaTotal);
});

const maxCobro = computed(() => gananciasPorVendedor.value.length ? Math.max(...gananciasPorVendedor.value.map(v => v.montoTotal)) : 0);
const maxGanancia = computed(() => gananciasPorVendedor.value.length ? Math.max(...gananciasPorVendedor.value.map(v => v.gananciaTotal)) : 0);
const todasSeleccionadas = computed(() => ventasConDiscrepancia.value.length > 0 && ventasConDiscrepancia.value.every(v => ventasSeleccionadas.value.has(v.idVenta)));

function toggleSeleccion(id: number) { ventasSeleccionadas.value.has(id) ? ventasSeleccionadas.value.delete(id) : ventasSeleccionadas.value.add(id); }
function seleccionarTodas() { todasSeleccionadas.value ? ventasSeleccionadas.value.clear() : ventasConDiscrepancia.value.forEach(v => ventasSeleccionadas.value.add(v.idVenta)); }
function formatoMoneda(v: number) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v); }
function formatoHora(f?: string) { if (!f) return 'N/D'; const d = new Date(f); return Number.isNaN(d.getTime()) ? 'N/D' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); }
function getMetodoClase(m?: string) { if (!m) return 'efectivo'; const u = m.toUpperCase(); return u === 'TRANSFERENCIA' ? 'transferencia' : u === 'TARJETA' ? 'tarjeta' : 'efectivo'; }
function getMetodoIcono(m?: string) { if (!m) return ''; const u = m.toUpperCase(); return u === 'TRANSFERENCIA' ? '📱' : u === 'TARJETA' ? '💳' : '💵'; }
function getMetodoLabel(m?: string) { if (!m) return 'N/D'; const u = m.toUpperCase(); return u === 'TRANSFERENCIA' ? 'Transferencia' : u === 'TARJETA' ? 'Tarjeta' : u === 'EFECTIVO' ? 'Efectivo' : m; }

async function corregir(ids: number[]) {
  if (!ids.length) return;
  corrigiendo.value = true;
  correccionMensaje.value = '';
  try {
    const r = await fetch(`${API_BASE}/ventasDetalle/corregirDiscrepancias`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idVentas: ids }) });
    const raw = await r.text();
    let res: any; try { res = JSON.parse(raw); } catch { correccionMensaje.value = '❌ Respuesta inválida'; return; }
    if (res?.codigo === 200) {
      const ok = res.datos?.filter((x: any) => x.corregido)?.length || 0;
      const fail = res.datos?.filter((x: any) => !x.corregido)?.length || 0;
      correccionMensaje.value = `✅ ${ok} corregidas${fail > 0 ? `, ${fail} sin cambios` : ''}`;
      ventasSeleccionadas.value.clear();
      emit('ventas-corregidas');
    } else correccionMensaje.value = `❌ ${res?.mensaje || 'Error'}`;
  } catch (e) { correccionMensaje.value = `❌ ${e instanceof Error ? e.message : 'Error'}`; }
  finally { corrigiendo.value = false; setTimeout(() => correccionMensaje.value = '', 5000); }
}
</script>

<template>
  <div v-if="open" class="hist-overlay" @click.self="emit('close')">
    <section class="hist-modal">
      <button class="hist-close" @click="emit('close')">✕</button>

      <header class="hist-header">
        <h2>📜 Historial de Ventas</h2>
        <div class="hist-summary">
          <div class="hist-sum-item"><span class="hist-sum-label">Ventas</span><span class="hist-sum-val">{{ ventasFiltradas.length }}</span></div>
          <div class="hist-sum-item accent"><span class="hist-sum-label">Cobro Total</span><span class="hist-sum-val">{{ formatoMoneda(cobroTotalFiltrado) }}</span></div>
          <div class="hist-sum-item profit"><span class="hist-sum-label">Ganancia</span><span class="hist-sum-val">{{ formatoMoneda(gananciaTotal) }}</span></div>
        </div>
      </header>

      <div class="hist-filters">
        <select v-if="usuariosUnicos?.length" v-model="filtroUsuario">
          <option value="todos">Todos los cajeros</option>
          <option v-for="u in usuariosUnicos" :key="u.idUsuario" :value="u.idUsuario">{{ u.nombre }}</option>
        </select>
        <label class="hist-check"><input type="checkbox" v-model="filtroDiscrepancia" value="discrepancia"><span>⚠️ Solo discrepancias</span></label>
      </div>

      <div v-if="esAdmin && ventasConDiscrepancia.length > 0" class="hist-correccion">
        <div class="hist-correccion-btns">
          <button v-if="ventasSeleccionadas.size > 0" class="hist-btn corr" :disabled="corrigiendo" @click="corregir(Array.from(ventasSeleccionadas))">🔧 Seleccionadas ({{ ventasSeleccionadas.size }})</button>
          <button class="hist-btn corr primary" :disabled="corrigiendo" @click="corregir(ventasConDiscrepancia.map(v => v.idVenta))">⚡ Todas ({{ ventasConDiscrepancia.length }})</button>
        </div>
        <label class="hist-check"><input type="checkbox" :checked="todasSeleccionadas" @change="seleccionarTodas"><span>Seleccionar todas</span></label>
        <p v-if="correccionMensaje" class="hist-correccion-msg">{{ correccionMensaje }}</p>
      </div>

      <div v-if="gananciasPorVendedor.length > 0" class="hist-vendedores">
        <div v-for="v in gananciasPorVendedor" :key="v.idUsuario" class="hist-vendedor">
          <div class="hist-vendedor-info"><span class="hist-vendedor-name">{{ v.nombre }}</span><span class="hist-vendedor-count">{{ v.totalVentas }} ventas</span></div>
          <div class="hist-vendedor-bars">
            <div class="hist-bar"><span class="hist-bar-label">Cobro</span><div class="hist-bar-track"><div class="hist-bar-fill cobro" :style="{ width: `${maxCobro > 0 ? (v.montoTotal / maxCobro) * 100 : 0}%` }"></div></div><span class="hist-bar-val">{{ formatoMoneda(v.montoTotal) }}</span></div>
            <div class="hist-bar"><span class="hist-bar-label">Ganancia</span><div class="hist-bar-track"><div class="hist-bar-fill gain" :style="{ width: `${maxGanancia > 0 ? (v.gananciaTotal / maxGanancia) * 100 : 0}%` }"></div></div><span class="hist-bar-val">{{ formatoMoneda(v.gananciaTotal) }}</span></div>
          </div>
        </div>
      </div>

      <div class="hist-table-wrap">
        <p v-if="loading" class="hist-empty">📡 Cargando...</p>
        <p v-else-if="!ventasFiltradas.length" class="hist-empty">📭 No hay ventas hoy.</p>
        <table v-else class="hist-table">
          <thead><tr><th>Ticket</th><th>Hora</th><th>Monto</th><th>Pago</th><th>Cajero</th><th></th></tr></thead>
          <tbody>
            <tr v-for="v in ventasFiltradas" :key="v.idVenta" class="hist-row" :class="{ 'row-disc': v.tieneDiscrepancia, 'row-sel': ventasSeleccionadas.has(v.idVenta) }" @click="emit('ver-detalle', v)">
              <td class="hist-td-ticket">
                <span v-if="v.tieneDiscrepancia" class="hist-disc" title="Venta con envase">🧴</span>
                <input v-if="esAdmin && v.tieneDiscrepancia" type="checkbox" class="hist-cb" :checked="ventasSeleccionadas.has(v.idVenta)" @click.stop @change="toggleSeleccion(v.idVenta)">
                <span class="hist-ticket">#{{ v.numeroTicket ?? v.idVenta }}</span>
              </td>
              <td class="hist-td-hora">{{ formatoHora(v.fechaVenta) }}</td>
              <td class="hist-td-monto">{{ formatoMoneda(Number(v.montoTotal ?? 0)) }}</td>
              <td class="hist-td-pago"><span class="hist-badge-pago" :class="getMetodoClase(v.metodoPago)">{{ getMetodoIcono(v.metodoPago) }} {{ getMetodoLabel(v.metodoPago) }}</span></td>
              <td class="hist-td-cajero">{{ v.nombreUsuario || 'Cajero' }}</td>
              <td class="hist-td-act" @click.stop>
                <button v-if="v.estatus === 'C'" class="hist-btn-icon cancel" @click="emit('cancelar', v)">✕</button>
                <button v-else class="hist-btn-icon view" @click="emit('ver-detalle', v)">→</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="hist-footer"><button class="hist-btn-close" @click="emit('close')">Cerrar</button></footer>
    </section>
  </div>
</template>

<style scoped>
.hist-overlay { position: fixed; inset: 0; z-index: 90; background: rgba(0,0,0,0.85); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 1rem; animation: fadeIn 0.15s; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.hist-modal { width: min(100%, 1100px); max-height: 92vh; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; position: relative; animation: slideUp 0.2s; min-height: 0; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.hist-close { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; border: none; border-radius: 50%; background: var(--bg-secondary); color: var(--text-secondary); font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; transition: all 0.2s; }
.hist-close:hover { background: var(--error-color); color: white; }
.hist-header { padding: 1.25rem 1.5rem 1rem; border-bottom: 1px solid var(--border-color); }
.hist-header h2 { margin: 0 0 0.75rem; font-size: 1.2rem; font-weight: 700; color: var(--text-primary); }
.hist-summary { display: flex; gap: 0.75rem; }
.hist-sum-item { flex: 1; display: flex; flex-direction: column; padding: 0.5rem 0.75rem; border-radius: 10px; background: var(--bg-secondary); border: 1px solid var(--border-color); }
.hist-sum-item.accent { border-color: var(--accent-color); }
.hist-sum-item.profit { border-color: var(--success-color); }
.hist-sum-label { font-size: 0.65rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
.hist-sum-val { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); font-family: "Courier New", monospace; }
.hist-sum-item.accent .hist-sum-val { color: var(--accent-color); }
.hist-sum-item.profit .hist-sum-val { color: var(--success-color); }
.hist-filters { display: flex; gap: 0.75rem; padding: 0.6rem 1.5rem; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; align-items: center; }
.hist-filters select { padding: 0.35rem 0.5rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-secondary); color: var(--text-primary); font-size: 0.8rem; }
.hist-check { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer; }
.hist-check input { accent-color: var(--accent-color); }
.hist-correccion { padding: 0.6rem 1.5rem; background: rgba(239,68,68,0.05); border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.4rem; }
.hist-correccion-btns { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.hist-btn { padding: 0.35rem 0.7rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-secondary); color: var(--text-primary); font-size: 0.75rem; font-weight: 600; cursor: pointer; }
.hist-btn:hover:not(:disabled) { border-color: var(--accent-color); color: var(--accent-color); }
.hist-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.hist-btn.corr.primary { background: var(--accent-color); color: var(--bg-primary); border-color: var(--accent-color); }
.hist-correccion-msg { margin: 0; font-size: 0.8rem; font-weight: 600; color: var(--success-color); text-align: center; }
.hist-vendedores { padding: 0.6rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.4rem; }
.hist-vendedor { display: flex; align-items: center; gap: 1rem; padding: 0.4rem 0.6rem; border-radius: 8px; background: var(--bg-secondary); }
.hist-vendedor-info { min-width: 120px; }
.hist-vendedor-name { display: block; font-size: 0.8rem; font-weight: 600; }
.hist-vendedor-count { font-size: 0.7rem; color: var(--text-secondary); }
.hist-vendedor-bars { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
.hist-bar { display: flex; align-items: center; gap: 0.4rem; }
.hist-bar-label { font-size: 0.6rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; min-width: 50px; }
.hist-bar-track { flex: 1; height: 5px; background: var(--border-color); border-radius: 3px; overflow: hidden; }
.hist-bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
.hist-bar-fill.cobro { background: var(--accent-color); }
.hist-bar-fill.gain { background: var(--success-color); }
.hist-bar-val { font-size: 0.7rem; font-weight: 700; font-family: "Courier New", monospace; min-width: 75px; text-align: right; }
.hist-table-wrap { flex: 1; overflow-y: auto; min-height: 180px; min-height: 0; }
.hist-empty { padding: 1.5rem; text-align: center; color: var(--text-secondary); }
.hist-table { width: 100%; border-collapse: collapse; }
.hist-table thead { position: sticky; top: 0; z-index: 5; }
.hist-table th { padding: 0.5rem 0.75rem; font-size: 0.65rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; background: var(--bg-primary); border-bottom: 2px solid var(--border-color); text-align: left; }
.hist-table th:nth-child(3), .hist-table th:nth-child(4) { text-align: center; }
.hist-table th:last-child { width: 36px; text-align: center; }
.hist-row { border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.15s; }
.hist-row:hover { background: var(--bg-secondary); }
.hist-row.row-disc { border-left: 3px solid #eab308; background: rgba(234,179,8,0.03); }
.hist-row.row-disc:hover { background: rgba(234,179,8,0.08); }
.hist-row.row-sel { background: rgba(59,130,246,0.1); }
.hist-row td { padding: 0.5rem 0.75rem; font-size: 0.82rem; vertical-align: middle; }
.hist-td-ticket { display: flex; align-items: center; gap: 0.35rem; }
.hist-disc { width: 15px; height: 15px; border-radius: 50%; background: #eab308; color: white; font-size: 0.6rem; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.hist-cb { width: 13px; height: 13px; accent-color: var(--accent-color); cursor: pointer; flex-shrink: 0; }
.hist-ticket { font-weight: 700; color: var(--accent-color); font-family: "Courier New", monospace; }
.hist-td-hora { font-family: "Courier New", monospace; color: var(--text-secondary); font-size: 0.78rem; }
.hist-td-monto { font-weight: 700; color: var(--success-color); font-family: "Courier New", monospace; text-align: center; }
.hist-badge-pago { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.68rem; font-weight: 600; text-transform: uppercase; }
.hist-badge-pago.efectivo { background: rgba(34,197,94,0.1); color: #166534; }
.hist-badge-pago.transferencia { background: rgba(59,130,246,0.1); color: #1d4ed8; }
.hist-badge-pago.tarjeta { background: rgba(236,72,153,0.1); color: #be185d; }
.hist-td-cajero { color: var(--text-secondary); font-size: 0.78rem; }
.hist-td-act { text-align: center; }
.hist-btn-icon { width: 26px; height: 26px; border: none; border-radius: 5px; cursor: pointer; font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; }
.hist-btn-icon.cancel { background: #ef4444; color: white; }
.hist-btn-icon.cancel:hover { background: #dc2626; transform: scale(1.1); }
.hist-btn-icon.view { background: var(--accent-color); color: var(--bg-primary); }
.hist-btn-icon.view:hover { filter: brightness(1.15); transform: scale(1.1); }
.hist-footer { padding: 0.6rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: center; }
.hist-btn-close { padding: 0.5rem 1.5rem; border: none; border-radius: 8px; background: var(--accent-color); color: var(--bg-primary); font-size: 0.82rem; font-weight: 700; cursor: pointer; }
.hist-btn-close:hover { filter: brightness(1.1); }
@media (max-width: 768px) {
  .hist-overlay { padding: 0.5rem; align-items: flex-start; }
  .hist-modal { max-height: 90vh; width: 100%; border-radius: 12px; }
  .hist-header { padding: 0.8rem 1rem; }
  .hist-header h2 { font-size: 1rem; margin-bottom: 0.5rem; }
  .hist-summary { flex-direction: column; gap: 0.4rem; }
  .hist-sum-item { flex-direction: row; justify-content: space-between; padding: 0.4rem 0.5rem; }
  .hist-sum-val { font-size: 0.9rem; }
  .hist-filters { padding: 0.5rem 1rem; }
  .hist-vendedores { padding: 0.5rem 1rem; }
  .hist-vendedor { flex-direction: column; align-items: flex-start; gap: 0.4rem; }
  .hist-vendedor-info { min-width: auto; }
  .hist-correccion { padding: 0.5rem 1rem; }
  .hist-correccion-btns { flex-direction: column; }
  .hist-btn.corr { width: 100%; text-align: center; }
  .hist-table th, .hist-table td { padding: 0.4rem 0.5rem; font-size: 0.75rem; }
  .hist-td-cajero, .hist-table th:nth-child(5) { display: none; }
  .hist-footer { padding: 0.5rem 1rem; }
}
@media (max-width: 480px) {
  .hist-table th:nth-child(4), .hist-td-pago { display: none; }
  .hist-summary { gap: 0.3rem; }
  .hist-sum-label { font-size: 0.6rem; }
  .hist-sum-val { font-size: 0.85rem; }
}
</style>
