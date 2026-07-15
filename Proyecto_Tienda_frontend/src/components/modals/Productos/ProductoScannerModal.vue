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
              <span>✅</span>
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
.modal-overlay{position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.4);backdrop-filter:blur(8px);display:grid;place-items:center;padding:1rem;animation:scFadeIn .2s ease}
@keyframes scFadeIn{from{opacity:0}to{opacity:1}}
.scanner-modal{width:min(100%,400px);background:var(--color-bg-secondary);border:none;border-radius:18px;padding:1.15rem;position:relative;animation:scPopIn .2s ease-out;box-shadow:10px 10px 30px rgba(0,0,0,.4),-6px -6px 20px rgba(255,255,255,.04),inset 0 1px 0 rgba(255,255,255,.03)}
@keyframes scPopIn{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
.scanner-modal .modal-header{position:relative;border-bottom:1px solid color-mix(in srgb,var(--color-accent) 25%,transparent);padding-bottom:.55rem;margin-bottom:.85rem}
.scanner-modal h3{margin:0;font-size:.95rem;color:var(--color-accent);text-transform:uppercase;letter-spacing:.1em;font-weight:800}
.scanner-modal p{margin:.25rem 0 0;color:var(--color-text-secondary);font-size:.68rem;letter-spacing:.05em}
.scanner-content{display:flex;flex-direction:column;gap:.85rem}
.scanner-viewport{width:100%;height:200px;background:#000;border:none;border-radius:12px;overflow:hidden;position:relative;box-shadow:inset 0 0 20px rgba(0,0,0,.5),0 0 0 2px color-mix(in srgb,var(--color-accent) 30%,transparent)}
.scanner-viewport :deep(#scanner-interactive-producto){width:100%;height:100%}
.scanner-viewport :deep(video){width:100%;height:100%;object-fit:cover}
.scanner-overlay{position:absolute;inset:16px;pointer-events:none}
.scanner-corner{position:absolute;width:28px;height:28px;border-color:var(--color-accent);border-style:solid;filter:drop-shadow(0 0 4px rgba(0,0,0,.5))}
.scanner-corner.tl{top:0;left:0;border-width:3px 0 0 3px;border-radius:8px 0 0 0}
.scanner-corner.tr{top:0;right:0;border-width:3px 3px 0 0;border-radius:0 8px 0 0}
.scanner-corner.bl{bottom:0;left:0;border-width:0 0 3px 3px;border-radius:0 0 0 8px}
.scanner-corner.br{bottom:0;right:0;border-width:0 3px 3px 0;border-radius:0 0 8px 0}
.scanner-laser{position:absolute;width:80%;left:10%;height:2px;background:linear-gradient(90deg,transparent,var(--color-error),transparent);top:50%;animation:scLine 2s ease-in-out infinite;box-shadow:0 0 12px var(--color-error)}
@keyframes scLine{0%,100%{top:25%}50%{top:75%}}
.scanner-preview{display:flex;justify-content:center;padding:1.25rem;background:var(--color-bg-primary);border-radius:12px;box-shadow:inset 3px 3px 6px rgba(0,0,0,.15)}
.btn-camera{display:flex;flex-direction:column;align-items:center;gap:.35rem;padding:1.1rem 2rem;background:linear-gradient(145deg,color-mix(in srgb,var(--color-success) 90%,#fff) 0%,var(--color-success) 40%,color-mix(in srgb,var(--color-success) 75%,#000) 100%);border:none;border-radius:12px;color:#fff;font-weight:700;font-size:.8rem;cursor:pointer;box-shadow:4px 4px 10px rgba(0,0,0,.2),-1px -1px 4px rgba(255,255,255,.04);transition:all .2s}
.btn-camera:hover{transform:translateY(-2px);box-shadow:6px 6px 16px rgba(0,0,0,.28),-3px -3px 8px rgba(255,255,255,.05)}
.btn-camera:active{transform:translateY(1px);box-shadow:2px 2px 4px rgba(0,0,0,.1)}
.camera-icon{font-size:2rem}
.camera-text{text-transform:uppercase;letter-spacing:.07em}
.camera-hint{font-size:.6rem;opacity:.75;font-weight:400}
.manual-entry{display:flex;flex-direction:column;gap:.4rem}
.manual-label{font-size:.62rem;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.07em;font-weight:600}
.input-row{display:flex;gap:.45rem}
.code-input{flex:1;background:var(--color-bg-primary);border:none;padding:.6rem .7rem;color:var(--color-text-primary);font-family:"Courier New",monospace;font-size:.95rem;font-weight:700;outline:none;border-radius:10px;box-shadow:inset 3px 3px 6px rgba(0,0,0,.15),inset -1px -1px 2px rgba(255,255,255,.03);transition:all .2s}
.code-input:focus{box-shadow:inset 3px 3px 8px rgba(0,0,0,.2),0 0 0 2px var(--color-accent)}
.code-input::placeholder{color:var(--color-text-secondary);font-weight:400}
.btn-apply{border:none;background:linear-gradient(145deg,var(--color-accent) 0%,color-mix(in srgb,var(--color-accent) 70%,#000) 100%);color:var(--color-on-brand);font-weight:700;text-transform:uppercase;letter-spacing:.05em;cursor:pointer;box-shadow:4px 4px 10px rgba(0,0,0,.2),-1px -1px 4px rgba(255,255,255,.04);padding:.55rem .9rem;display:flex;align-items:center;gap:.3rem;transition:all .2s;border-radius:10px;font-size:.7rem}
.btn-apply:hover:not(:disabled){transform:translateY(-2px);box-shadow:6px 6px 14px rgba(0,0,0,.28),-3px -3px 8px rgba(255,255,255,.05)}
.btn-apply:active:not(:disabled){transform:translateY(1px);box-shadow:inset 2px 2px 5px rgba(0,0,0,.2)}
.btn-apply:disabled{opacity:.5;cursor:not-allowed}
.modal-actions{display:flex;gap:.5rem;justify-content:flex-end;padding-top:.7rem;border-top:1px solid color-mix(in srgb,var(--color-accent) 25%,transparent)}
.modal-actions button{border:none;padding:.5rem .8rem;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;cursor:pointer;box-shadow:3px 3px 6px rgba(0,0,0,.15);display:flex;align-items:center;gap:.3rem;transition:all .2s;border-radius:10px}
.btn-secondary{background:var(--color-bg-secondary);color:var(--color-text-secondary);box-shadow:3px 3px 6px rgba(0,0,0,.1),-1px -1px 3px rgba(255,255,255,.02)}
.btn-secondary:hover{transform:translateY(-2px);box-shadow:5px 5px 12px rgba(0,0,0,.18);color:var(--color-text-primary)}
.btn-secondary:active{transform:translateY(1px);box-shadow:inset 2px 2px 4px rgba(0,0,0,.15)}
@media(max-width:480px){.scanner-modal{padding:.9rem;border-radius:14px}.input-row{flex-direction:column}.btn-apply{justify-content:center}.modal-actions{flex-direction:column}.modal-actions button{width:100%;justify-content:center}}
</style>