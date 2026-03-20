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
        <h3>📷 Escanear Código de Barras</h3>
        <p v-if="!scannerActivo">Escanea el código o ingrésalo manualmente</p>
        <p v-else>Apunta la cámara al código de barras</p>
      </header>

      <div class="scanner-content">
        <div v-if="scannerActivo" class="scanner-viewport">
          <div id="scanner-interactive-producto"></div>
          <div class="scanner-overlay">
            <div class="scanner-corner tl"></div>
            <div class="scanner-corner tr"></div>
            <div class="scanner-corner bl"></div>
            <div class="scanner-corner br"></div>
          </div>
          <div class="scanner-laser"></div>
        </div>
        
        <div v-else class="scanner-preview">
          <button type="button" class="btn-camera" @click="iniciarScanner">
            <span class="camera-icon">📷</span>
            <span class="camera-text">Abrir Cámara</span>
            <span class="camera-hint">Apunta al código de barras</span>
          </button>
        </div>

        <div class="manual-entry">
          <label class="manual-label">O ingresa el código manualmente:</label>
          <div class="input-row">
            <input 
              v-model="codigo" 
              type="text" 
              placeholder="750000000002"
              class="code-input"
              @keyup.enter="aplicar"
            >
            <button 
              type="button" 
              class="btn-apply" 
              @click="aplicar" 
              :disabled="!codigo.trim()"
            >
              <span>✓</span>
              <span>Aplicar</span>
            </button>
          </div>
        </div>
        
        <div class="modal-actions">
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
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.scanner-modal {
  width: min(100%, 400px);
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: var(--border-width-thick) solid var(--accent-color);
  box-shadow: 0 8px 30px var(--shadow-color);
  padding: 1.25rem;
  position: relative;
  border-radius: 16px;
  animation: popIn 150ms steps(4);
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.scanner-modal .modal-header {
  position: relative;
  border-bottom: 2px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
  padding-bottom: 0.6rem;
  margin-bottom: 1rem;
}

.scanner-modal h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 900;
}

.scanner-modal p {
  margin: 0.3rem 0 0;
  color: var(--text-secondary);
  font-size: 0.7rem;
  letter-spacing: 0.05em;
}

.scanner-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.scanner-viewport {
  width: 100%;
  height: 220px;
  background: #000;
  border: 3px solid var(--accent-color);
  border-radius: 12px;
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

.scanner-overlay {
  position: absolute;
  inset: 20px;
  pointer-events: none;
}

.scanner-corner {
  position: absolute;
  width: 30px;
  height: 30px;
  border-color: var(--accent-color);
  border-style: solid;
}

.scanner-corner.tl {
  top: 0; left: 0;
  border-width: 3px 0 0 3px;
  border-radius: 8px 0 0 0;
}

.scanner-corner.tr {
  top: 0; right: 0;
  border-width: 3px 3px 0 0;
  border-radius: 0 8px 0 0;
}

.scanner-corner.bl {
  bottom: 0; left: 0;
  border-width: 0 0 3px 3px;
  border-radius: 0 0 0 8px;
}

.scanner-corner.br {
  bottom: 0; right: 0;
  border-width: 0 3px 3px 0;
  border-radius: 0 0 8px 0;
}

.scanner-laser {
  position: absolute;
  width: 80%;
  left: 10%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--error-color), transparent);
  top: 50%;
  animation: scanner-line 2s ease-in-out infinite;
  box-shadow: 0 0 10px var(--error-color);
}

@keyframes scanner-line {
  0%, 100% { top: 25%; }
  50% { top: 75%; }
}

.scanner-preview {
  display: flex;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

.btn-camera {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 1.25rem 2.5rem;
  background: linear-gradient(180deg, var(--success-color) 0%, color-mix(in srgb, var(--success-color) 70%, black) 100%);
  border: var(--border-width) solid var(--border-color);
  border-radius: 12px;
  color: var(--text-primary);
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 0 4px 15px var(--shadow-color);
  transition: all 0.2s;
}

.btn-camera:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-camera:active {
  transform: translateY(0);
}

.camera-icon {
  font-size: 2.2rem;
}

.camera-text {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.camera-hint {
  font-size: 0.65rem;
  opacity: 0.7;
  font-weight: 400;
}

.manual-entry {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.manual-label {
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.code-input {
  flex: 1;
  background: var(--bg-primary);
  border: var(--border-width) solid var(--border-color);
  padding: 0.65rem 0.75rem;
  color: var(--text-primary);
  font-family: "Courier New", monospace;
  font-size: 1rem;
  font-weight: 700;
  outline: none;
  transition: all 0.2s;
  border-radius: 10px;
}

.code-input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 25%, transparent);
}

.code-input::placeholder {
  color: var(--text-secondary);
  font-weight: 400;
}

.btn-apply {
  border: var(--border-width) solid var(--border-color);
  background: linear-gradient(180deg, var(--gradient-btn-start) 0%, var(--gradient-btn-mid) 50%, var(--gradient-btn-end) 100%);
  color: var(--btn-text, var(--bg-primary));
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: 0 4px 15px var(--shadow-color);
  padding: 0.6rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s;
  border-radius: 10px;
}

.btn-apply:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-apply:active:not(:disabled) {
  transform: translateY(0);
}

.btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-top: 0.75rem;
  border-top: 2px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.modal-actions button {
  border: var(--border-width) solid var(--border-color);
  padding: 0.55rem 0.85rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Courier New", monospace;
  cursor: pointer;
  box-shadow: 0 4px 15px var(--shadow-color);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s;
  border-radius: 10px;
}

.btn-secondary {
  background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  color: var(--text-primary);
}

.btn-secondary:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-secondary:active {
  transform: translateY(0);
}

@media (max-width: 480px) {
  .scanner-modal {
    padding: 1rem;
    border-radius: 12px;
  }
  
  .input-row {
    flex-direction: column;
  }
  
  .btn-apply {
    justify-content: center;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .modal-actions button {
    width: 100%;
    justify-content: center;
  }
}
</style>
