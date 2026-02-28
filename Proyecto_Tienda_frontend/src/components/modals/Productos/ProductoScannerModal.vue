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
        <h3>Escanear Codigo</h3>
        <p v-if="!scannerActivo">Pega el codigo o escribe manualmente.</p>
        <p v-else>Apunta la camara al codigo de barras.</p>
      </header>

      <div class="scanner-content">
        <div v-if="scannerActivo" class="scanner-viewport">
          <div id="scanner-interactive-producto"></div>
          <div class="scanner-laser"></div>
        </div>
        
        <div v-else class="scanner-preview">
          <button type="button" class="btn-camera" @click="iniciarScanner">
            Abrir Camara
          </button>
        </div>

        <input v-model="codigo" type="text" placeholder="750000000002">
        
        <div class="modal-actions">
          <button type="button" @click="aplicar" :disabled="!codigo.trim()">
            Aplicar
          </button>
          <button type="button" class="btn-secondary" @click="detenerScanner(); emit('close')">
            Cancelar
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
  background: rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.scanner-modal {
  width: min(100%, 420px);
  background: var(--bg-panel);
  border: 2px solid var(--border-color);
  box-shadow: 0 8px 24px var(--shadow-color);
  padding: 1.3rem;
  border-radius: 12px;
}

.modal-header {
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.scanner-modal h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--accent-color);
  font-weight: 600;
}

.scanner-modal p {
  margin: 0.25rem 0 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.scanner-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.scanner-viewport {
  width: 100%;
  height: 200px;
  background: #000;
  border: 2px solid var(--accent-color);
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
  background: var(--error-color);
  top: 50%;
  animation: scanner-line 2s infinite;
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
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  background: var(--accent-color);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-camera:hover {
  background: var(--accent-hover);
}

.scanner-modal input {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  padding: 0.6rem 0.7rem;
  color: var(--text-primary);
  font-size: 0.95rem;
  outline: none;
  border-radius: 6px;
}

.scanner-modal input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.2);
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.modal-actions button {
  padding: 0.55rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  border: 1px solid transparent;
}

.modal-actions button:first-child {
  background: var(--accent-color);
  color: #fff;
}

.modal-actions button:first-child:hover:not(:disabled) {
  background: var(--accent-hover);
}

.modal-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-actions button.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.modal-actions button.btn-secondary:hover {
  background: var(--bg-panel);
}
</style>
