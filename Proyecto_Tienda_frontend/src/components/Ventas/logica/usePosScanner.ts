import { ref } from 'vue';
import Quagga from '@ericblade/quagga2';
import { nextTick } from 'vue';

const scannerActivo = ref(false);
let scannerProcessing = false;

function handleScannerDetection(data: any) {
  if (scannerProcessing) return;
  const code = data.codeResult.code;
  if (code) {
    scannerProcessing = true;
    stopScanner();
    const { buscarYAgregarProducto } = require('./usePosProductos');
    buscarYAgregarProducto(code);
  }
}

async function initScanner() {
  scannerActivo.value = true;
  scannerProcessing = false;
  await nextTick();
  const targetElement = document.querySelector('#scanner-interactive');
  const { mostrarMensaje } = await import('./usePosTicket');
  if (!targetElement) { mostrarMensaje('Error: Contenedor de escáner no encontrado', 'error'); stopScanner(); return; }
  await new Promise<void>((resolve) => {
    Quagga.init({
      inputStream: { name: 'Live', type: 'LiveStream', target: targetElement, constraints: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
      decoder: { readers: ['code_128_reader', 'ean_reader', 'ean_8_reader', 'code_39_reader', 'upc_reader'] },
      locate: true,
    } as any, function (err: any) {
      if (err) { console.error('Quagga init error:', err); mostrarMensaje('Error al iniciar la cámara: ' + err.message, 'error'); stopScanner(); resolve(); return; }
      Quagga.start(); resolve();
    });
  });
  Quagga.onDetected(handleScannerDetection);
}

async function startScanner() {
  await initScanner();
}

function stopScanner() {
  if (Quagga) { Quagga.stop(); Quagga.offDetected(handleScannerDetection); }
  scannerActivo.value = false;
}

export { scannerActivo, startScanner, stopScanner };
