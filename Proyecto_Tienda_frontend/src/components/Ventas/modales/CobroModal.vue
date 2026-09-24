<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  open: boolean;
  total: number;
  modo?: 'venta' | 'abono';
  saldoPendiente?: number;
  nombrePersona?: string;
}>();

const emit = defineEmits(['close', 'confirmar-efectivo', 'confirmar-transferencia', 'confirmar-tarjeta', 'confirmar-pendiente', 'confirmar-credito', 'confirmar-abono', 'confirmar-mixto']);

const montoRecibido = ref<number | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const modoActual = computed(() => props.modo || 'venta');
const esAbono = computed(() => modoActual.value === 'abono');

const mixtoAbierto = ref(false);
const mixtoSplits = ref<Array<{ metodo: string; monto: number }>>([]);

watch(
  () => props.open,
  (abierto) => {
    if (abierto) {
      montoRecibido.value = esAbono.value ? (props.saldoPendiente || props.total) : null;
      nextTick(() => {
        inputRef.value?.focus();
      });
      mixtoAbierto.value = false;
      mixtoSplits.value = [];
    }
  }
);

const montoAbono = computed(() => {
  const maximo = Number(props.saldoPendiente || props.total || 0);
  const monto = Number(montoRecibido.value ?? 0);
  if (monto <= 0) return maximo;
  return Math.min(monto, maximo);
});

const cambio = computed(() => {
  const recibido = Number(montoRecibido.value ?? 0);
  const restante = recibido - Number(props.total ?? 0);
  return restante > 0 ? restante : 0;
});

const montoValido = computed(() => {
  if (esAbono.value) {
    const monto = Number(montoRecibido.value ?? 0);
    return monto > 0;
  }
  return true;
});

const sumaMixto = computed(() => mixtoSplits.value.reduce((sum, sp) => sum + Number(sp.monto || 0), 0));

const faltaMixto = computed(() => Math.max(0, Number(props.total) - sumaMixto.value));

const mixtoValido = computed(() => {
  if (mixtoSplits.value.length === 0) return false;
  if (mixtoSplits.value.some(sp => Number(sp.monto || 0) <= 0)) return false;
  return Math.round(sumaMixto.value * 100) / 100 === Math.round(Number(props.total) * 100) / 100;
});

function agregarSplit() {
  if (mixtoSplits.value.length >= 4) { alert('Máximo 4 métodos de pago por venta'); return; }
  mixtoSplits.value.push({ metodo: 'EFECTIVO', monto: Number(faltaMixto.value) });
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(valor);
}

function confirmarEfectivo() {
  if (esAbono.value) {
    emit('confirmar-abono', { monto: montoAbono.value, metodoPago: 'EFECTIVO' });
    return;
  }
  const recibido = montoRecibido.value && montoRecibido.value > 0 ? montoRecibido.value : props.total;
  emit('confirmar-efectivo', { montoRecibido: recibido });
}

function confirmarMixto() {
  if (!mixtoValido.value) {
    if (mixtoSplits.value.length === 0) { alert('Agrega al menos un método de pago'); return; }
    if (mixtoSplits.value.some(sp => Number(sp.monto || 0) <= 0)) { alert('Todos los montos deben ser mayores a 0'); return; }
    alert(`La suma de los montos debe ser igual al total (${formatoMoneda(props.total)})`);
    return;
  }
  emit('confirmar-mixto', { splits: mixtoSplits.value });
  mixtoAbierto.value = false;
  mixtoSplits.value = [];
}

function confirmarTransferencia() {
  if (esAbono.value) {
    emit('confirmar-abono', { monto: montoAbono.value, metodoPago: 'TRANSFERENCIA' });
    return;
  }
  emit('confirmar-transferencia');
}

function confirmarTarjeta() {
  if (esAbono.value) {
    emit('confirmar-abono', { monto: montoAbono.value, metodoPago: 'TARJETA' });
    return;
  }
  emit('confirmar-tarjeta');
}

function manejarEnter(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    confirmarEfectivo();
  }
}

function manejarTeclado(e: KeyboardEvent) {
  if (!props.open) return;
  
  if (e.key === 'F2') {
    e.preventDefault();
    confirmarEfectivo();
  } else if (e.key === 'F3') {
    e.preventDefault();
    confirmarTransferencia();
  } else if (e.key === 'F4') {
    e.preventDefault();
    confirmarTarjeta();
  } else if (e.key === 'F7' && !esAbono.value) {
    e.preventDefault();
    mixtoAbierto.value = !mixtoAbierto.value;
    if (mixtoAbierto.value && mixtoSplits.value.length === 0) mixtoSplits.value.push({ metodo: 'EFECTIVO', monto: Number(faltaMixto.value) });
  } else if (e.key === 'F5' && !esAbono.value) {
    e.preventDefault();
    emit('confirmar-pendiente');
  } else if (e.key === 'F6' && !esAbono.value) {
    e.preventDefault();
    emit('confirmar-credito');
  } else if (e.key === 'Escape') {
    if (mixtoAbierto.value) mixtoAbierto.value = false;
  }
}

onMounted(() => {
  window.addEventListener('keydown', manejarTeclado);
});

onUnmounted(() => {
  window.removeEventListener('keydown', manejarTeclado);
});
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="open" class="modal-overlay" @click.self="emit('close')">
      <div class="pergamino">
        <div class="corner-decor corner-tl">
          <div class="ornament"></div>
        </div>
        <div class="corner-decor corner-tr">
          <div class="ornament"></div>
        </div>
        <div class="corner-decor corner-bl">
          <div class="ornament"></div>
        </div>
        <div class="corner-decor corner-br">
          <div class="ornament"></div>
        </div>
        
        <div class="pergamino-inner">
          <header class="modal-header">
            <div class="header-emblem">
              <span class="emblem-icon">⚜</span>
            </div>
            <h2>Cobro de Venta</h2>
            <div class="header-line"></div>
          </header>

<div class="modal-body">
          <div v-if="esAbono" class="saldo-pendiente-banner">
            <span class="banner-label">Saldo pendiente</span>
            <span class="banner-amount">{{ formatoMoneda(saldoPendiente || total) }}</span>
            <span v-if="nombrePersona" class="banner-persona">{{ nombrePersona }}</span>
          </div>

          <div v-if="!esAbono" class="total-parchment">
            <span class="parchment-label">Total a pagar</span>
            <span class="parchment-amount">{{ formatoMoneda(total) }}</span>
          </div>

          <div class="input-parchment">
            <label>Monto recibido</label>
            <div class="input-container">
              <span class="coin-icon">🪙</span>
              <input 
                ref="inputRef"
                v-model.number="montoRecibido" 
                type="number" 
                step="0.01" 
                min="0" 
                :placeholder="esAbono ? '0.00' : '0.00'"
                @keydown.enter="manejarEnter"
              >
            </div>
          </div>

          <div class="cambio-parchment" :class="{ active: cambio > 0 }">
            <span class="cambio-label">Cambio</span>
            <span class="cambio-amount">{{ formatoMoneda(cambio) }}</span>
          </div>

          <!-- Mixed payment dialog (conditional) -->
          <div v-if="!esAbono && mixtoAbierto" class="mixto-dialog" @click.self="mixtoAbierto = false">
            <div class="mixto-panel">
              <button class="mixto-close" @click="mixtoAbierto = false" title="Cerrar">✕</button>
              <header class="mixto-header">
                <h3>💱 Pago Mixto</h3>
                <p>Divide el total en varios métodos de pago:</p>
              </header>

              <div class="mixto-total">
                <span class="mixto-total-label">Total a pagar</span>
                <span class="mixto-total-amount">{{ formatoMoneda(total) }}</span>
              </div>

              <div class="mixto-splits">
                <div v-for="(split, index) in mixtoSplits" :key="index" class="split-row">
                  <select v-model="split.metodo" class="split-select">
                    <option value="EFECTIVO">💵 Efectivo</option>
                    <option value="TRANSFERENCIA">📱 Transferencia</option>
                    <option value="TARJETA">💳 Tarjeta</option>
                    <option value="CREDITO">💰 Crédito</option>
                  </select>
                  <input v-model.number="split.monto" type="number" step="0.01" min="0" class="split-input" placeholder="0.00">
                  <button class="btn-delete" @click="mixtoSplits.splice(index, 1)" title="Eliminar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <button v-if="mixtoSplits.length < 4" class="mixto-add" @click="agregarSplit">＋ Agregar método de pago</button>
                <div v-if="mixtoSplits.length === 0" class="empty-split">Aún no hay métodos de pago</div>
              </div>

              <div class="mixto-resumen">
                <div class="resumen-row">
                  <span>Suma de splits</span>
                  <strong>{{ formatoMoneda(sumaMixto) }}</strong>
                </div>
                <div class="resumen-row" :class="{ ok: faltaMixto <= 0 }">
                  <span>{{ faltaMixto > 0 ? 'Falta por pagar' : 'Cubierto' }}</span>
                  <strong>{{ formatoMoneda(faltaMixto) }}</strong>
                </div>
              </div>

              <div class="mixto-footer">
                <button class="cancel-btn" @click="mixtoAbierto = false">Cancelar</button>
                <button class="confirm-btn" @click="confirmarMixto" :disabled="!mixtoValido">Confirmar Pago Mixto</button>
              </div>
            </div>
          </div>
        </div>

          <footer class="modal-footer">
            <div class="payment-buttons" :class="{ 'abono-buttons': esAbono }">
              <button class="pay-btn efectivo" @click="confirmarEfectivo" :disabled="!montoValido && montoRecibido !== null && montoRecibido > 0">
                <span class="btn-rune">◈</span>
                <span class="btn-label">Efectivo</span>
                <span class="btn-shortcut">F2</span>
                <span class="btn-rune">◈</span>
              </button>
              
              <button class="pay-btn transferencia" @click="confirmarTransferencia" :disabled="!montoValido && montoRecibido !== null && montoRecibido > 0">
                <span class="btn-rune">◈</span>
                <span class="btn-label">Transferencia</span>
                <span class="btn-shortcut">F3</span>
                <span class="btn-rune">◈</span>
              </button>
              
              <button class="pay-btn mixto" @click="mixtoAbierto = true" :disabled="!montoValido && montoRecibido !== null && montoRecibido > 0">
                <span class="btn-rune">◈</span>
                <span class="btn-label">Mixto</span>
                <span class="btn-shortcut">F7</span>
                <span class="btn-rune">◈</span>
              </button>
              
              <button class="pay-btn tarjeta" @click="confirmarTarjeta" :disabled="!montoValido && montoRecibido !== null && montoRecibido > 0">
                <span class="btn-rune">◈</span>
                <span class="btn-label">Tarjeta</span>
                <span class="btn-shortcut">F4</span>
                <span class="btn-rune">◈</span>
              </button>
              
              <button v-if="!esAbono" class="pay-btn credito" @click="emit('confirmar-credito')">
                <span class="btn-rune">◈</span>
                <span class="btn-label">Crédito</span>
                <span class="btn-shortcut">F6</span>
                <span class="btn-rune">◈</span>
              </button>
            </div>

            <div v-if="!esAbono" class="pendiente-row">
              <div class="pendiente-separator"><span>Otras opciones</span></div>
              <button class="pay-btn pendiente" @click="emit('confirmar-pendiente')">
                <span class="btn-rune">◈</span>
                <span class="btn-label">Guardar como Pendiente</span>
                <span class="btn-shortcut">F5</span>
                <span class="btn-rune">◈</span>
              </button>
            </div>
            
            <button class="cancel-btn" @click="emit('close')">
              Cancelar
            </button>
          </footer>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); backdrop-filter: blur(6px); z-index: 220; display: grid; place-items: center; padding: 1rem; }

.pergamino {
  --perg-bg: var(--color-bg-primary);
  --perg-bg-panel: var(--color-bg-panel);
  --perg-text: var(--color-text-primary);
  --perg-text-secondary: var(--color-text-secondary);
  --perg-title: var(--color-accent);
  --perg-border: var(--color-border);
  --perg-accent: var(--color-accent);
  --perg-shadow: var(--color-shadow);
  --perg-success: var(--color-success);
  --perg-error: var(--color-error);
  --perg-warning: var(--color-warning);
  width: min(100%, 440px);
  background: var(--color-bg-panel);
  border-radius: var(--radius-lg);
  position: relative;
  box-shadow: 8px 8px 24px rgba(0,0,0,0.35), -4px -4px 16px rgba(255,255,255,0.03);
}

.pergamino::before { display: none; }

.pergamino-inner { padding: 1.5rem; position: relative; }

.corner-decor { position: absolute; width: 24px; height: 24px; z-index: 1; }
.ornament { width: 100%; height: 100%; border: 2px solid var(--color-accent); position: relative; }
.corner-tl { top: -1px; left: -1px; }
.corner-tl .ornament { border-right: none; border-bottom: none; border-radius: 8px 0 0 0; }
.corner-tr { top: -1px; right: -1px; }
.corner-tr .ornament { border-left: none; border-bottom: none; border-radius: 0 8px 0 0; }
.corner-bl { bottom: -1px; left: -1px; }
.corner-bl .ornament { border-right: none; border-top: none; border-radius: 0 0 0 8px; }
.corner-br { bottom: -1px; right: -1px; }
.corner-br .ornament { border-left: none; border-top: none; border-radius: 0 0 8px 0; }

.modal-header { text-align: center; margin-bottom: 1rem; padding-bottom: .75rem; border-bottom: 1px solid var(--color-border); position: relative; }
.header-emblem { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); width: 28px; height: 28px; background: var(--color-accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 2px 2px 4px rgba(0,0,0,0.2); }
.emblem-icon { color: var(--color-on-brand); font-size: 1rem; }
.modal-header h2 { margin: 0; font-size: 1.2rem; color: var(--color-accent); font-weight: 700; }
.header-line { margin-top: .5rem; height: 1px; background: linear-gradient(90deg, transparent, var(--color-accent) 20%, var(--color-accent) 80%, transparent); }

.modal-body { display: flex; flex-direction: column; gap: 1rem; }

.saldo-pendiente-banner { display: flex; flex-direction: column; align-items: center; gap: .2rem; padding: .75rem; background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-secondary)); border-radius: var(--radius-sm); border-left: 3px solid var(--color-accent); }
.banner-label { font-size: .7rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 600; }
.banner-amount { font-size: 1.1rem; font-weight: 700; color: var(--color-accent); font-family: Courier New, monospace; }
.banner-persona { font-size: .8rem; color: var(--color-text-secondary); }

.total-parchment { background: linear-gradient(135deg, var(--color-success), color-mix(in srgb, var(--color-success) 60%, black)); border-radius: var(--radius-md); padding: 1rem; text-align: center; box-shadow: 4px 4px 12px rgba(0,0,0,0.2); }
.parchment-label { display: block; font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: rgba(255,255,255,.7); margin-bottom: .25rem; }
.parchment-amount { display: block; font-family: Courier New, monospace; font-size: 1.8rem; font-weight: 700; color: #fff; }

.input-parchment { display: flex; flex-direction: column; gap: .3rem; }
.input-parchment label { font-size: .72rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 600; }
.input-container { display: flex; align-items: center; background: var(--color-bg-secondary); border-radius: var(--radius-sm); box-shadow: inset 3px 3px 6px rgba(0,0,0,0.2), inset -2px -2px 4px rgba(255,255,255,0.02); }
.coin-icon { padding: .65rem; font-size: 1.1rem; border-right: 1px solid var(--color-border); }
.input-container input { flex: 1; background: transparent; border: none; padding: .65rem .75rem; color: var(--color-text-primary); font-size: 1rem; font-family: Courier New, monospace; outline: none; }

.cambio-parchment { display: flex; justify-content: space-between; align-items: center; padding: .5rem .75rem; background: var(--color-bg-secondary); border-radius: var(--radius-sm); box-shadow: inset 2px 2px 4px rgba(0,0,0,0.1); }
.cambio-parchment.active { background: color-mix(in srgb, var(--color-success) 10%, var(--color-bg-secondary)); }
.cambio-label { font-size: .8rem; color: var(--color-text-secondary); }
.cambio-amount { font-size: 1rem; font-weight: 700; color: var(--color-success); font-family: Courier New, monospace; }

.modal-footer { padding: 0 1.5rem 1rem; display: flex; flex-direction: column; gap: .6rem; }

.payment-buttons { display: grid; grid-template-columns: repeat(2, 1fr); gap: .4rem; }
.payment-buttons.abono-buttons { grid-template-columns: repeat(2, 1fr); }

.pay-btn { display: flex; align-items: center; justify-content: center; gap: .4rem; padding: .7rem .5rem; border: none; border-radius: var(--radius-sm); font-size: .82rem; font-weight: 600; cursor: pointer; transition: all .15s; color: #fff; box-shadow: 3px 3px 6px rgba(0,0,0,0.15); }
.pay-btn:hover:not(:disabled) { box-shadow: 5px 5px 10px rgba(0,0,0,0.2); transform: translateY(-1px); }
.pay-btn:active:not(:disabled) { transform: scale(.98); box-shadow: inset 2px 2px 4px rgba(0,0,0,0.2); }
.pay-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }

.pay-btn.efectivo { background: linear-gradient(135deg, var(--color-success), color-mix(in srgb, var(--color-success) 60%, black)); }
.pay-btn.transferencia { background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover)); color: var(--color-on-brand); }
.pay-btn.tarjeta { background: linear-gradient(135deg, var(--color-info), color-mix(in srgb, var(--color-info) 50%, black)); }
.pay-btn.pendiente { background: linear-gradient(135deg, var(--color-warning), color-mix(in srgb, var(--color-warning) 50%, black)); }
.pay-btn.credito { background: linear-gradient(135deg, #8e44ad, #6c3483); }
.pay-btn.mixto { background: linear-gradient(135deg, #0ea5e9, #0369a1); color: #fff; }

.btn-rune { font-size: .55rem; opacity: .5; flex-shrink: 0; }
.btn-label { flex: 1; text-align: center; font-weight: 700; text-transform: uppercase; font-size: .72rem; }
.btn-shortcut { font-size: .55rem; opacity: .5; background: rgba(0,0,0,0.2); padding: .1rem .25rem; border-radius: 3px; font-family: monospace; flex-shrink: 0; }

.pendiente-row { display: flex; flex-direction: column; gap: .35rem; }
.pendiente-separator { display: flex; align-items: center; gap: .5rem; font-size: .65rem; color: var(--color-text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: .05em; }
.pendiente-separator::before, .pendiente-separator::after { content: ''; flex: 1; height: 1px; background: var(--color-border); }
.pendiente-row .pay-btn.pendiente { width: 100%; background: linear-gradient(135deg, var(--color-warning), color-mix(in srgb, var(--color-warning) 50%, black)); }

.cancel-btn { width: 100%; padding: .55rem; border: none; border-radius: var(--radius-sm); background: var(--color-bg-secondary); color: var(--color-text-secondary); font-size: .8rem; font-weight: 600; cursor: pointer; transition: all .15s; box-shadow: 2px 2px 4px rgba(0,0,0,0.1); }
.cancel-btn:hover { color: var(--color-accent); box-shadow: 4px 4px 8px rgba(0,0,0,0.15); }
.cancel-btn:active { transform: scale(.98); }

.mixto-dialog { position: fixed; inset: 0; z-index: 230; background: rgba(0,0,0,0.4); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 1rem; }
.mixto-panel { width: min(100%, 420px); max-height: 92vh; overflow-y: auto; background: var(--color-bg-panel); border-radius: var(--radius-lg); box-shadow: 8px 8px 24px rgba(0,0,0,0.45), -4px -4px 16px rgba(255,255,255,0.03); padding: 1.25rem; position: relative; animation: mixtoPop .18s ease; }
@keyframes mixtoPop { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
.mixto-close { position: absolute; top: .6rem; right: .6rem; width: 28px; height: 28px; border: none; border-radius: 50%; background: var(--color-bg-secondary); color: var(--color-text-secondary); font-size: .95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.mixto-close:hover { background: var(--color-error); color: #fff; }
.mixto-header { text-align: center; margin-bottom: .35rem; }
.mixto-header h3 { margin: 0 0 .25rem; font-size: 1.15rem; color: var(--color-accent); }
.mixto-header p { margin: 0; font-size: .8rem; color: var(--color-text-secondary); }
.mixto-total { display: flex; justify-content: space-between; align-items: center; padding: .6rem .8rem; background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover)); color: var(--color-on-brand); border-radius: var(--radius-sm); margin: .9rem 0; box-shadow: 3px 3px 8px rgba(0,0,0,0.15); }
.mixto-total-label { font-size: .68rem; text-transform: uppercase; letter-spacing: .04em; opacity: .85; font-weight: 600; }
.mixto-total-amount { font-size: 1.25rem; font-weight: 800; font-family: Courier New, monospace; }
.mixto-splits { display: flex; flex-direction: column; gap: .45rem; margin-bottom: .9rem; }
.split-row { display: grid; grid-template-columns: 1.4fr 1fr 32px; gap: .4rem; align-items: center; }
.split-select, .split-input { padding: .5rem .55rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg-secondary); color: var(--color-text-primary); font-size: .9rem; outline: none; transition: border-color .15s, box-shadow .15s; }
.split-select:focus, .split-input:focus { border-color: var(--color-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 22%, transparent); }
.split-input { font-family: Courier New, monospace; text-align: right; }
.btn-delete { width: 32px; height: 32px; border: none; border-radius: var(--radius-sm); background: rgba(239,68,68,0.12); color: #dc2626; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all .15s; }
.btn-delete:hover { background: #ef4444; color: #fff; }
.mixto-add { width: 100%; padding: .5rem; border: 1.5px dashed color-mix(in srgb, var(--color-accent) 60%, transparent); border-radius: var(--radius-sm); background: transparent; color: var(--color-accent); font-size: .82rem; font-weight: 700; cursor: pointer; transition: all .15s; }
.mixto-add:hover { background: color-mix(in srgb, var(--color-accent) 10%, transparent); }
.empty-split { text-align: center; padding: .5rem; font-size: .8rem; color: var(--color-text-secondary); border: 1.5px dashed var(--color-border); border-radius: var(--radius-sm); }
.mixto-resumen { display: flex; flex-direction: column; gap: .35rem; padding: .6rem .8rem; background: var(--color-bg-secondary); border-radius: var(--radius-sm); margin-bottom: 1rem; }
.resumen-row { display: flex; justify-content: space-between; align-items: center; font-size: .82rem; color: var(--color-text-secondary); }
.resumen-row strong { font-family: Courier New, monospace; color: var(--color-text-primary); font-size: .95rem; }
.resumen-row.ok span, .resumen-row.ok strong { color: var(--color-success); font-weight: 700; }
.mixto-footer { display: grid; grid-template-columns: 1fr 1.6fr; gap: .5rem; }
.mixto-footer .cancel-btn { width: 100%; }
.confirm-btn { padding: .6rem; border: none; border-radius: var(--radius-sm); background: linear-gradient(135deg, var(--color-success), color-mix(in srgb, var(--color-success) 60%, black)); color: #fff; font-size: .85rem; font-weight: 700; cursor: pointer; transition: all .15s; box-shadow: 3px 3px 6px rgba(0,0,0,0.15); }
.confirm-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 5px 5px 10px rgba(0,0,0,0.2); }
.confirm-btn:disabled { opacity: .45; cursor: not-allowed; }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity .2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

@media(max-width:480px){ .pergamino{width:100%;border-radius:var(--radius-md)} .pergamino-inner{padding:1rem} }
</style>
