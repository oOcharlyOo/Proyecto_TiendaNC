<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

type Alerta = {
  tipo: string;
  mensaje: string;
  severidad: 'alta' | 'media' | 'baja';
};

const alertas = ref<Alerta[]>([]);
const cargando = ref(false);
const abierto = ref(false);
const bellBtnRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});
let intervalId: ReturnType<typeof setInterval> | null = null;

function getIcon(sev: string) {
  if (sev === 'alta') return '🔴';
  if (sev === 'media') return '🟡';
  return '🟢';
}

async function cargarAlertas() {
  cargando.value = true;
  try {
    const [resumen, sugerencias, provision] = await Promise.all([
      fetch(API_BASE + '/productos/resumen').then(r => r.json()).catch(() => ({ datos: null })),
      fetch(API_BASE + '/pedidos-proveedor/sugerido?periodo=mensual&presupuesto=medio').then(r => r.json()).catch(() => ({ datos: [] })),
      fetch(API_BASE + '/pedidos-proveedor/provision-semanal').then(r => r.json()).catch(() => ({ datos: [] }))
    ]);

    const alerts: Alerta[] = [];
    const datosResumen = resumen.datos ?? resumen;
    const datosSugerencia = (sugerencias.datos ?? sugerencias) as any[];
    const datosProv = provision.datos ?? provision;

    if (datosResumen) {
      if (datosResumen.bajoStock > 0) alerts.push({ tipo: 'stock', mensaje: datosResumen.bajoStock + ' producto(s) con stock bajo', severidad: 'alta' });
      if (datosResumen.agotados > 0) alerts.push({ tipo: 'agotado', mensaje: datosResumen.agotados + ' producto(s) agotados', severidad: 'alta' });
    }

    const sinVentas = datosSugerencia.filter((s: any) => s.diasInventarioRestante === -1 && s.stockActual > 0);
    if (sinVentas.length > 0) alerts.push({ tipo: 'sin-movimiento', mensaje: sinVentas.length + ' producto(s) sin ventas', severidad: 'media' });

    if (Array.isArray(datosProv)) {
      const hoy = datosProv.find((d: any) => (d.fecha || '') === new Date().toISOString().split('T')[0]);
      if (hoy && hoy.montoRequerido > 0) {
        alerts.push({ tipo: 'pago', mensaje: 'Hoy: $' + hoy.montoRequerido.toFixed(2) + ' en pedidos', severidad: 'media' });
      }
    }

    alertas.value = alerts;
  } catch (e) {
    console.error('Error cargando alertas POS:', e);
  } finally {
    cargando.value = false;
  }
}

function toggle() {
  abierto.value = !abierto.value;
  if (abierto.value) {
    setTimeout(() => updateDropdownPosition(), 0);
  }
}

function updateDropdownPosition() {
  if (bellBtnRef.value) {
    const rect = bellBtnRef.value.getBoundingClientRect();
    const dropdownHeight = 320;
    const spaceBelow = window.innerHeight - rect.top;

    let top = rect.top;
    if (spaceBelow < dropdownHeight + 16) {
      top = rect.bottom - dropdownHeight;
      if (top < 8) top = 8;
    }

    dropdownStyle.value = {
      position: 'fixed',
      left: (rect.right + 8) + 'px',
      top: top + 'px',
      zIndex: '9999',
    };
  }
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.paw-widget')) {
    abierto.value = false;
  }
}

onMounted(() => {
  cargarAlertas();
  intervalId = setInterval(cargarAlertas, 120000);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="paw-widget">
    <button class="paw-bell-btn" @click="toggle" ref="bellBtnRef" title="Alertas de inventario">
      <span class="paw-bell-icon">🔔</span>
      <span v-if="alertas.length > 0" class="paw-badge" :class="{ urgent: alertas.some(a => a.severidad === 'alta') }">
        {{ alertas.length }}
      </span>
    </button>

    <Teleport to="body">
      <Transition name="paw-drop">
        <div v-if="abierto" class="paw-dropdown" :style="dropdownStyle">
          <div class="paw-drop-header">
            <span>🔔 Alertas</span>
            <button v-if="!cargando" class="paw-refresh-btn" @click.stop="cargarAlertas">🔄</button>
          </div>
          <div v-if="cargando" class="paw-drop-loading">Cargando...</div>
          <div v-else-if="alertas.length === 0" class="paw-drop-empty">
            ✅ Sin alertas
          </div>
          <div v-else class="paw-drop-list">
            <div v-for="(a, i) in alertas" :key="i" class="paw-drop-item" :class="'paw-sev-' + a.severidad">
              <span class="paw-item-icon">{{ getIcon(a.severidad) }}</span>
              <div class="paw-item-info">
                <span class="paw-item-msg">{{ a.mensaje }}</span>
                <span class="paw-item-tipo">{{ a.tipo }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.paw-widget{position:relative}
.paw-bell-btn{width:44px;height:44px;border:1px solid var(--border-color,#444);border-radius:8px;background:var(--bg-primary,#1a1a2e);color:var(--color-accent);font-size:1.1rem;cursor:pointer;position:relative;display:flex;align-items:center;justify-content:center;transition:all .15s}
.paw-bell-btn:hover{border-color:var(--color-accent);background:color-mix(in srgb,var(--color-accent) 10%,var(--bg-primary,#1a1a2e))}
.paw-bell-icon{line-height:1}
.paw-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:50%;background:var(--color-warning,#f59e0b);color:var(--text-primary,#fff);font-size:.65rem;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px;animation:pawPulse 2s infinite}
.paw-badge.urgent{background:var(--color-error,#ef4444)}
@keyframes pawPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}

.paw-dropdown{width:300px;background:var(--color-bg-panel,#1e1e32);border:1px solid var(--color-border,#333);border-radius:10px;box-shadow:8px 8px 24px rgba(0,0,0,.4);overflow:hidden}
.paw-drop-header{display:flex;align-items:center;justify-content:space-between;padding:.6rem .75rem;border-bottom:1px solid var(--color-border,#333);font-size:.8rem;font-weight:700;color:var(--color-accent)}
.paw-refresh-btn{background:none;border:none;color:var(--color-text-secondary);cursor:pointer;font-size:.8rem;padding:.2rem}
.paw-refresh-btn:hover{color:var(--color-accent)}
.paw-drop-loading{padding:1.5rem;text-align:center;color:var(--color-text-secondary);font-size:.75rem}
.paw-drop-empty{padding:1.5rem;text-align:center;color:var(--color-success);font-size:.78rem;font-weight:600}
.paw-drop-list{display:flex;flex-direction:column;max-height:280px;overflow-y:auto}
.paw-drop-item{display:flex;align-items:flex-start;gap:.5rem;padding:.5rem .65rem;border-bottom:1px solid color-mix(in srgb,var(--color-border,#333) 50%,transparent);transition:background .1s}
.paw-drop-item:last-child{border-bottom:none}
.paw-drop-item:hover{background:color-mix(in srgb,var(--color-accent) 5%,transparent)}
.paw-item-icon{font-size:.85rem;flex-shrink:0;margin-top:1px}
.paw-item-info{flex:1;min-width:0}
.paw-item-msg{display:block;font-size:.72rem;color:var(--color-text-primary);font-weight:500}
.paw-item-tipo{display:block;font-size:.58rem;color:var(--color-text-secondary);margin-top:.1rem;text-transform:uppercase;font-weight:600}
.paw-sev-alta{border-left:3px solid var(--color-error)}
.paw-sev-media{border-left:3px solid var(--color-warning)}
.paw-sev-baja{border-left:3px solid var(--color-info)}

.paw-drop-enter-active,.paw-drop-leave-active{transition:all .2s ease}
.paw-drop-enter-from,.paw-drop-leave-to{opacity:0;transform:translateX(-8px)}
</style>
