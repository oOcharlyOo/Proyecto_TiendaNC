<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  open: boolean;
  total: number;
  modo?: 'venta' | 'abono';
  saldoPendiente?: number;
  nombrePersona?: string;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirmar-efectivo', payload: { montoRecibido: number }): void;
  (event: 'confirmar-transferencia'): void;
  (event: 'confirmar-tarjeta'): void;
  (event: 'confirmar-pendiente'): void;
  (event: 'confirmar-credito'): void;
  (event: 'confirmar-abono', payload: { monto: number; metodoPago: string }): void;
}>();

const montoRecibido = ref<number | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

const modoActual = computed(() => props.modo || 'venta');
const esAbono = computed(() => modoActual.value === 'abono');

watch(
  () => props.open,
  (abierto) => {
    if (abierto) {
      montoRecibido.value = esAbono.value ? (props.saldoPendiente || props.total) : null;
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
  }
);

const cambio = computed(() => {
  if (esAbono.value) return 0;
  const recibido = Number(montoRecibido.value ?? 0);
  const restante = recibido - Number(props.total ?? 0);
  return restante > 0 ? restante : 0;
});

const montoValido = computed(() => {
  if (esAbono.value) {
    const monto = Number(montoRecibido.value ?? 0);
    const maximo = props.saldoPendiente || props.total;
    return monto > 0 && monto <= maximo;
  }
  return true;
});

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(valor);
}

function confirmarEfectivo() {
  if (esAbono.value) {
    const monto = montoRecibido.value && montoRecibido.value > 0 ? montoRecibido.value : (props.saldoPendiente || props.total);
    emit('confirmar-abono', { monto, metodoPago: 'EFECTIVO' });
    return;
  }
  const recibido = montoRecibido.value && montoRecibido.value > 0 ? montoRecibido.value : props.total;
  emit('confirmar-efectivo', { montoRecibido: recibido });
}

function confirmarTransferencia() {
  if (esAbono.value) {
    const monto = montoRecibido.value && montoRecibido.value > 0 ? montoRecibido.value : (props.saldoPendiente || props.total);
    emit('confirmar-abono', { monto, metodoPago: 'TRANSFERENCIA' });
    return;
  }
  emit('confirmar-transferencia');
}

function confirmarTarjeta() {
  if (esAbono.value) {
    const monto = montoRecibido.value && montoRecibido.value > 0 ? montoRecibido.value : (props.saldoPendiente || props.total);
    emit('confirmar-abono', { monto, metodoPago: 'TARJETA' });
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
  } else if (e.key === 'F5' && !esAbono.value) {
    e.preventDefault();
    emit('confirmar-pendiente');
  } else if (e.key === 'F6' && !esAbono.value) {
    e.preventDefault();
    emit('confirmar-credito');
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

          <div class="total-parchment" :class="{ 'abono-mode': esAbono }">
            <span class="parchment-label">{{ esAbono ? 'Monto a abonar' : 'Total a pagar' }}</span>
            <span class="parchment-amount">{{ formatoMoneda(total) }}</span>
          </div>

          <div class="input-parchment">
            <label>{{ esAbono ? 'Monto a abonar' : 'Monto recibido' }}</label>
            <div class="input-container">
              <span class="coin-icon">🪙</span>
              <input 
                ref="inputRef"
                v-model.number="montoRecibido" 
                type="number" 
                step="0.01" 
                min="0" 
                :max="esAbono ? (saldoPendiente || total) : undefined"
                :placeholder="esAbono ? '0.00' : '0.00'"
                @keydown.enter="manejarEnter"
                :class="{ 'input-invalid': !montoValido && montoRecibido !== null && montoRecibido > 0 }"
              >
            </div>
            <span v-if="!montoValido && montoRecibido !== null && montoRecibido > 0" class="input-error">
              El monto no puede ser mayor al saldo pendiente
            </span>
          </div>

          <div v-if="!esAbono" class="cambio-parchment" :class="{ active: cambio > 0 }">
            <span class="cambio-label">Cambio</span>
            <span class="cambio-amount">{{ formatoMoneda(cambio) }}</span>
          </div>
        </div>

          <footer class="modal-footer">
            <div class="payment-buttons" :class="{ 'abono-buttons': esAbono }">
              <button class="pay-btn efectivo" @click="confirmarEfectivo" :disabled="!montoValido && montoRecibido !== null && montoRecibido > 0">
                <span class="btn-rune">◈</span>
                💵<span class="btn-label">Efectivo</span>
                <span class="btn-shortcut">F2</span>
                <span class="btn-rune">◈</span>
              </button>
              
              <button class="pay-btn transferencia" @click="confirmarTransferencia" :disabled="!montoValido && montoRecibido !== null && montoRecibido > 0">
                <span class="btn-rune">◈</span>
                📲<span class="btn-label">Transferencia</span>
                <span class="btn-shortcut">F3</span>
                <span class="btn-rune">◈</span>
              </button>
              
              <button class="pay-btn tarjeta" @click="confirmarTarjeta" :disabled="!montoValido && montoRecibido !== null && montoRecibido > 0">
                <span class="btn-rune">◈</span>
                💳<span class="btn-label">Tarjeta</span>
                <span class="btn-shortcut">F4</span>
                <span class="btn-rune">◈</span>
              </button>
              
              <button v-if="!esAbono" class="pay-btn pendiente" @click="emit('confirmar-pendiente')">
                <span class="btn-rune">◈</span>
                ⏳<span class="btn-label">Pendiente</span>
                <span class="btn-shortcut">F5</span>
                <span class="btn-rune">◈</span>
              </button>
              
              <button v-if="!esAbono" class="pay-btn credito" @click="emit('confirmar-credito')">
                <span class="btn-rune">◈</span>
                💰<span class="btn-label">Crédito</span>
                <span class="btn-shortcut">F6</span>
                <span class="btn-rune">◈</span>
              </button>
            </div>
            
            <button class="cancel-btn" @click="emit('close')">
              ❌ Cancelar
            </button>
          </footer>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(20, 15, 10, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.pergamino {
  width: min(100%, 420px);
  background: 
    linear-gradient(135deg, #d4c4a8 0%, #c9b896 20%, #d9c9a8 40%, #c4b492 60%, #d4c4a8 80%, #bea87a 100%);
  border-radius: 4px;
  position: relative;
  box-shadow: 
    0 0 0 3px #5c4a2a,
    0 0 0 6px #8b7355,
    0 8px 0 #3d2f1f,
    0 12px 20px rgba(0, 0, 0, 0.6),
    inset 0 0 60px rgba(139, 115, 85, 0.3);
}

.pergamino::before {
  content: '';
  position: absolute;
  inset: 3px;
  border: 2px solid #8b7355;
  border-radius: 2px;
  pointer-events: none;
}

.pergamino-inner {
  padding: 1.5rem;
  position: relative;
}

.corner-decor {
  position: absolute;
  width: 32px;
  height: 32px;
  z-index: 1;
}

.ornament {
  width: 100%;
  height: 100%;
  border: 2px solid #5c4a2a;
  position: relative;
}

.ornament::before,
.ornament::after {
  content: '';
  position: absolute;
  background: #5c4a2a;
}

.corner-tl {
  top: -8px;
  left: -8px;
}

.corner-tl .ornament {
  border-right: none;
  border-bottom: none;
  border-radius: 8px 0 0 0;
}

.corner-tr {
  top: -8px;
  right: -8px;
}

.corner-tr .ornament {
  border-left: none;
  border-bottom: none;
  border-radius: 0 8px 0 0;
}

.corner-bl {
  bottom: -8px;
  left: -8px;
}

.corner-bl .ornament {
  border-right: none;
  border-top: none;
  border-radius: 0 0 0 8px;
}

.corner-br {
  bottom: -8px;
  right: -8px;
}

.corner-br .ornament {
  border-left: none;
  border-top: none;
  border-radius: 0 0 8px 0;
}

.modal-header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #8b7355;
  position: relative;
}

.header-emblem {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 28px;
  background: linear-gradient(180deg, #c4b492 0%, #a08050 100%);
  border: 2px solid #5c4a2a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emblem-icon {
  color: #5c4a2a;
  font-size: 1rem;
}

.modal-header h2 {
  margin: 0;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 1.4rem;
  color: #3d2f1f;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: bold;
  text-shadow: 1px 1px 0 #d4c4a8;
}

.header-line {
  margin-top: 0.5rem;
  height: 2px;
  background: linear-gradient(90deg, transparent, #8b7355 20%, #8b7355 80%, transparent);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.total-parchment {
  background: linear-gradient(180deg, #3d2f1f 0%, #2a1f15 100%);
  border: 3px solid #5c4a2a;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  box-shadow: 
    inset 0 0 20px rgba(0, 0, 0, 0.4),
    0 2px 0 #1a120a;
}

.total-parchment.abono-mode {
  background: linear-gradient(180deg, #4a2f4f 0%, #2a1f35 100%);
  border-color: #6a4a7a;
}

.parchment-label {
  display: block;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.75rem;
  color: #c4b492;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.25rem;
}

.parchment-amount {
  display: block;
  font-family: 'Courier New', monospace;
  font-size: 2rem;
  font-weight: bold;
  color: #f4e8c1;
  text-shadow: 0 0 10px rgba(244, 232, 193, 0.3);
}

.input-parchment {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.input-parchment label {
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.8rem;
  color: #5c4a2a;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.coin-icon {
  position: absolute;
  left: 12px;
  font-size: 1rem;
  z-index: 1;
}

.input-container input {
  width: 100%;
  background: 
    linear-gradient(180deg, #f4e8d4 0%, #e8d9be 100%);
  border: 2px solid #8b7355;
  border-radius: 6px;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  font-family: 'Courier New', monospace;
  font-size: 1.25rem;
  font-weight: bold;
  color: #3d2f1f;
  outline: none;
  box-shadow: 
    inset 0 1px 3px rgba(0, 0, 0, 0.15),
    0 1px 0 #d4c4a8;
  transition: all 0.2s;
}

.input-container input:focus {
  border-color: #5c4a2a;
  box-shadow: 
    inset 0 1px 3px rgba(0, 0, 0, 0.15),
    0 0 0 3px rgba(139, 115, 85, 0.3);
}

.input-container input::placeholder {
  color: #a08060;
}

.cambio-parchment {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: 
    linear-gradient(180deg, #c9b896 0%, #bea87a 100%);
  border: 2px solid #8b7355;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  transition: all 0.3s;
}

.cambio-parchment.active {
  background: linear-gradient(180deg, #6b8e4e 0%, #4a6b32 100%);
  border-color: #3d5a2a;
}

.cambio-label {
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.85rem;
  color: #5c4a2a;
  font-weight: 600;
}

.cambio-parchment.active .cambio-label {
  color: #d4e8c1;
}

.cambio-amount {
  font-family: 'Courier New', monospace;
  font-size: 1.25rem;
  font-weight: bold;
  color: #3d2f1f;
  transition: all 0.3s;
}

.cambio-parchment.active .cambio-amount {
  color: #f4e8c1;
}

.saldo-pendiente-banner {
  background: linear-gradient(180deg, #6a4a7a 0%, #4a2f5f 100%);
  border: 2px solid #8a5a9a;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  text-align: center;
  margin-bottom: 0.5rem;
  box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.3);
}

.banner-label {
  display: block;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.7rem;
  color: #d4b8e8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.25rem;
}

.banner-amount {
  display: block;
  font-family: 'Courier New', monospace;
  font-size: 1.5rem;
  font-weight: bold;
  color: #f4e8ff;
  text-shadow: 0 0 10px rgba(244, 232, 255, 0.3);
}

.banner-persona {
  display: block;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.8rem;
  color: #c8a8d8;
  margin-top: 0.25rem;
}

.input-error {
  display: block;
  font-size: 0.7rem;
  color: #ff6b6b;
  margin-top: 0.25rem;
  font-weight: bold;
}

.input-container input.input-invalid {
  border-color: #ff6b6b;
  background: linear-gradient(180deg, #ffe8e8 0%, #ffd4d4 100%);
}

.payment-buttons.abono-buttons {
  grid-template-columns: repeat(3, 1fr) !important;
}

.modal-footer {
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.payment-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.pay-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.6rem 0.3rem;
  border: 2px solid #5c4a2a;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.btn-rune {
  font-size: 0.5rem;
  color: rgba(0, 0, 0, 0.4);
}

.btn-label {
  font-size: 0.65rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: center;
  word-break: break-word;
  line-height: 1.2;
  max-width: 100%;
}

.btn-shortcut {
  display: inline-block;
  padding: 0.1rem 0.3rem;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.25);
  border-radius: 4px;
  font-size: 0.55rem;
  font-weight: 900;
  font-family: monospace;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.efectivo .btn-shortcut {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.35);
}

.transferencia .btn-shortcut {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.35);
}

.tarjeta .btn-shortcut {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.35);
}

.efectivo {
  background: linear-gradient(180deg, #7fa86b 0%, #5a7a45 100%);
  color: #1a2a0f;
}

.efectivo:hover {
  background: linear-gradient(180deg, #8fb87a 0%, #6a8a55 100%);
}

.transferencia {
  background: linear-gradient(180deg, #6b8cb4 0%, #4a6a8a 100%);
  color: #1a2a3f;
}

.transferencia:hover {
  background: linear-gradient(180deg, #7b9cc4 0%, #5a7a9a 100%);
}

.tarjeta {
  background: linear-gradient(180deg, #b47a6b 0%, #8a5a4a 100%);
  color: #3f1a1a;
}

.tarjeta:hover {
  background: linear-gradient(180deg, #c48a7b 0%, #9a6a5a 100%);
}

.pendiente {
  background: linear-gradient(180deg, #c4a86b 0%, #8a7a4a 100%);
  color: #3f3a1a;
}

.pendiente:hover {
  background: linear-gradient(180deg, #d4b87b 0%, #9a8a5a 100%);
}

.credito {
  background: linear-gradient(180deg, #8a6bb4 0%, #6a4a8a 100%);
  color: #f0e8ff;
}

.credito:hover {
  background: linear-gradient(180deg, #9a7bc4 0%, #7a5a9a 100%);
}

.cancel-btn {
  width: 100%;
  padding: 0.6rem;
  background: 
    linear-gradient(180deg, #c9b896 0%, #a08050 100%);
  border: 2px solid #5c4a2a;
  border-radius: 6px;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  font-size: 0.8rem;
  font-weight: bold;
  color: #3d2f1f;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: linear-gradient(180deg, #d9c8a8 0%, #b09060 100%);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .pergamino,
.modal-fade-leave-to .pergamino {
  transform: scale(0.9) rotateX(10deg);
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 0.75rem;
  }
  
  .pergamino {
    width: 100%;
    max-width: 100%;
  }
  
  .pergamino-inner {
    padding: 1.25rem 1rem;
  }
  
  .payment-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem;
  }
  
  .payment-buttons.abono-buttons {
    grid-template-columns: repeat(3, 1fr) !important;
  }
  
  .pay-btn {
    padding: 0.7rem 0.5rem;
    gap: 0.4rem;
  }
  
  .btn-shortcut {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
  }
  
  .pergamino-amount {
    font-size: 1.6rem;
  }
  
  .total-parchment {
    padding: 0.8rem;
  }
  
  .parchment-label {
    font-size: 0.7rem;
  }
  
  .input-parchment {
    padding: 0.8rem;
  }
  
  .input-parchment label {
    font-size: 0.75rem;
  }
  
  .input-container input {
    font-size: 1rem;
    padding: 0.6rem 0.6rem 0.6rem 2rem;
  }
  
  .cambio-parchment {
    padding: 0.7rem;
  }
  
  .cambio-label {
    font-size: 0.7rem;
  }
  
  .cambio-amount {
    font-size: 0.95rem;
  }
  
  .modal-header h2 {
    font-size: 1rem;
  }
  
  .cancel-btn {
    padding: 0.7rem;
    font-size: 0.75rem;
  }
  
  .saldo-pendiente-banner {
    padding: 0.6rem 0.8rem;
  }
  
  .banner-label {
    font-size: 0.65rem;
  }
  
  .banner-amount {
    font-size: 1.2rem;
  }
  
  .banner-persona {
    font-size: 0.7rem;
  }
}

@media (max-width: 360px) {
  .pergamino-inner {
    padding: 1rem 0.75rem;
  }
  
  .btn-shortcut {
    font-size: 0.6rem;
    padding: 0.1rem 0.3rem;
  }
  
  .pay-btn {
    padding: 0.6rem 0.4rem;
  }
  
  .payment-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.3rem;
  }
  
  .payment-buttons.abono-buttons {
    grid-template-columns: 1fr !important;
  }
  
  .banner-amount {
    font-size: 1rem;
  }
  
  .parchment-amount {
    font-size: 1.4rem;
  }
}
</style>
