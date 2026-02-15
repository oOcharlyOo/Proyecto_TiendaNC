<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'apply', code: string): void;
}>();

const codigo = ref('');
const scannerActivo = ref(false);

function aplicar() {
  emit('apply', codigo.value.trim());
}

watch(() => props.open, async (newVal) => {
  if (newVal) {
    codigo.value = '';
    scannerActivo.value = false;
  }
});

async function iniciarScanner() {
  if (typeof (window as any).Quagga === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.8.4/dist/quagga.min.js';
    script.onload = () => initQuagga();
    script.onerror = () => alert('Error al cargar el escáner');
    document.head.appendChild(script);
    return;
  }
  initQuagga();
}

async function initQuagga() {
  scannerActivo.value = true;
  
  await nextTick();
  
  const targetElement = document.querySelector('#scanner-interactive-producto');
  if (!targetElement) return;

  (window as any).Quagga.init(
    {
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: targetElement,
        constraints: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      decoder: {
        readers: [
          'code_128_reader',
          'ean_reader',
          'ean_8_reader',
          'code_39_reader',
          'upc_reader',
        ],
      },
      locate: true,
    },
    function (err: any) {
      if (err) {
        console.error(err);
        scannerActivo.value = false;
        return;
      }
      (window as any).Quagga.start();
    }
  );

  (window as any).Quagga.onDetected((data: any) => {
    const code = data.codeResult.code;
    if (code) {
      codigo.value = code;
      detenerScanner();
    }
  });
}

function detenerScanner() {
  if (typeof (window as any).Quagga !== 'undefined') {
    (window as any).Quagga.stop();
    (window as any).Quagga.offDetected(() => {});
  }
  scannerActivo.value = false;
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="detenerScanner(); emit('close')">
    <section class="modal-card scanner-modal">
      <header class="modal-header">
        <h3>📷 Escanear Código</h3>
        <p v-if="!scannerActivo">Pega el código o escribe manualmente.</p>
        <p v-else>Apunta la cámara al código de barras.</p>
      </header>

      <div class="space-y-3">
        <div v-if="scannerActivo" class="scanner-viewport">
          <div id="scanner-interactive-producto"></div>
          <div class="scanner-laser"></div>
        </div>
        
        <div v-else class="scanner-preview">
          <button type="button" class="btn-camera" @click="iniciarScanner">
            <span class="camera-icon">📷</span>
            <span>Abrir Cámara</span>
          </button>
        </div>

        <input v-model="codigo" type="text" placeholder="750000000002">
        
        <div class="modal-actions">
          <button type="button" @click="aplicar" :disabled="!codigo.trim()">
            <span class="btn-icono">✓</span>
            <span class="btn-texto">Aplicar</span>
          </button>
          <button type="button" class="btn-secondary" @click="detenerScanner(); emit('close')">
            <span class="btn-icono">✕</span>
            <span class="btn-texto">Cancelar</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 95;
  background: rgba(2, 4, 2, 0.92);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.scanner-modal {
  width: min(100%, 420px);
  background: linear-gradient(180deg, #1f5b35 0%, #133523 100%);
  border: 4px solid #f8d667;
  box-shadow: 
    0 0 0 4px #2f1f09,
    0 14px 0 #271c0f,
    0 20px 28px rgba(0, 0, 0, 0.5);
  padding: 1.3rem;
  position: relative;
}

.scanner-modal::before {
  content: "";
  position: absolute;
  inset: 10px;
  border: 2px dashed rgba(248, 214, 103, 0.4);
  pointer-events: none;
}

.scanner-modal .modal-header {
  position: relative;
  border-bottom: 2px solid rgba(248, 214, 103, 0.3);
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.scanner-modal h3 {
  margin: 0;
  font-size: 1rem;
  color: #f8d667;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 900;
  text-shadow: 2px 2px 0 #000;
}

.scanner-modal p {
  margin: 0.25rem 0 0;
  color: #f6f2de;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  opacity: 0.8;
}

.scanner-viewport {
  width: 100%;
  height: 200px;
  background: #000;
  border: 3px solid #f8d667;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.scanner-viewport :deep(#scanner-interactive-producto) {
  width: 100%;
  height: 100%;
}

.scanner-viewport :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scanner-laser {
  position: absolute;
  width: 100%;
  height: 2px;
  background: red;
  top: 50%;
  animation: scanner-line 2s infinite;
  box-shadow: 0 0 8px red;
}

@keyframes scanner-line {
  0%, 100% { top: 20%; }
  50% { top: 80%; }
}

.scanner-preview {
  display: flex;
  justify-content: center;
  padding: 1rem;
}

.btn-camera {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  background: linear-gradient(180deg, #67e0a8 0%, #2a9d5c 100%);
  border: 3px solid #133523;
  border-radius: 8px;
  color: #0a1912;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 0 3px 0 #0a1912;
}

.btn-camera:hover {
  filter: brightness(1.1);
}

.btn-camera:active {
  transform: translateY(2px);
  box-shadow: none;
}

.camera-icon {
  font-size: 2rem;
}

.scanner-modal input {
  width: 100%;
  background: #f2e8bf;
  border: 3px solid #2a1807;
  padding: 0.6rem 0.7rem;
  color: #1d1606;
  font-family: "Courier New", monospace;
  font-size: 0.95rem;
  outline: none;
  box-shadow: inset 0 0 0 2px #d4c27e;
  position: relative;
}

.scanner-modal input:focus {
  box-shadow: inset 0 0 0 2px #e1cc80, 0 0 0 2px #f8d667;
}

.modal-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  position: relative;
}

.modal-actions button {
  border: 3px solid #2a1807;
  padding: 0.55rem 0.85rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 3px 0 #6f4b1c, 0 5px 8px rgba(0, 0, 0, 0.3);
}

.modal-actions button:first-child {
  background: linear-gradient(180deg, #ffe48b 0%, #e2b84f 45%, #c99234 100%);
  color: #1a1401;
}

.modal-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-actions button.btn-secondary {
  background: linear-gradient(180deg, #e2deca 0%, #bdb696 100%);
  color: #1a1401;
}

.modal-actions button:hover:not(:disabled) {
  filter: brightness(1.08);
}

.modal-actions button:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: inset 0 0 0 2px #ffeeb4, 0 1px 0 #6f4b1c;
}
</style>
