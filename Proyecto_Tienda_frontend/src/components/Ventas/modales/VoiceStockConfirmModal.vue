<script setup lang="ts">
import { ref, watch } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const props = defineProps<{ open: boolean; stockData: any }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'done'): void }>();

const executing = ref(false);
const result = ref<'idle' | 'success' | 'error'>('idle');
const resultMsg = ref('');

const manualInput = ref('');
const parseando = ref(false);
const parseError = ref('');
const reconociendo = ref(false);
const micRecognition = ref<any>(null);
const reintentosVoz = ref(0);

function hablar(texto: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-MX';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch { }
}

const localStockData = ref<any>(null);
const vista = ref<'opciones' | 'confirmar' | 'resultado'>('confirmar');

const formatoMoneda = (v: any) =>
  v != null && !isNaN(Number(v)) ? `$${Number(v).toFixed(2)}` : '';

watch(() => props.stockData, (val) => {
  localStockData.value = val;
  if (val?.opciones?.length > 1) {
    vista.value = 'opciones';
  } else {
    vista.value = 'confirmar';
  }
}, { immediate: true });

const showInput = () => !localStockData.value;

function elegirOpcion(op: any) {
  const d = localStockData.value;
  if (!d) return;
  d.productoId = op.productoId;
  d.nombreProducto = op.nombreProducto;
  d.stockActual = op.stock ?? 0;
  if (d.accion === 'CONSULTAR') {
    d.mensaje = `El stock actual de ${op.nombreProducto} es de ${op.stock ?? 0} unidades.`;
    vista.value = 'resultado';
    return;
  }
  const cant = d.cantidad ?? 0;
  if (d.tipo === 'INCREMENTO') d.stockNuevo = d.stockActual + cant;
  else if (d.tipo === 'DECREMENTO') d.stockNuevo = Math.max(0, d.stockActual - cant);
  else d.stockNuevo = cant;
  if (d.accion === 'INCREMENTAR') {
    d.mensaje = `Hay ${d.stockActual} unidades de ${op.nombreProducto}. ¿Quisieras aumentar el stock en ${cant} unidades (quedaria en ${d.stockNuevo})?`;
  } else if (d.accion === 'DECREMENTAR') {
    d.mensaje = `Hay ${d.stockActual} unidades de ${op.nombreProducto}. ¿Quisieras reducir el stock en ${cant} unidades (quedaria en ${d.stockNuevo})?`;
  } else {
    d.mensaje = `Hay ${d.stockActual} unidades de ${op.nombreProducto}. ¿Quisieras actualizar el stock a ${d.stockNuevo} unidades?`;
  }
  vista.value = 'confirmar';
}

async function parsearComando(textoParaVoz?: string) {
  const texto = manualInput.value.trim();
  if (!texto) return;
  parseando.value = true;
  parseError.value = '';
  try {
    const resp = await fetch(`${API_BASE}/voice/stock/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: texto })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.accion && data.accion !== 'ERROR') {
        localStockData.value = data;
        vista.value = data.opciones?.length > 1 ? 'opciones' : 'confirmar';
        reintentosVoz.value = 0;
        if (textoParaVoz) hablar(data.mensaje || `Se encontro la informacion de ${data.nombreProducto || 'el producto'}.`);
        return;
      }
      parseError.value = data.mensaje || 'No se pudo interpretar el comando';
    } else {
      parseError.value = 'Error del servidor';
    }
  } catch {
    parseError.value = 'Error de conexion';
  } finally {
    parseando.value = false;
  }
  if (textoParaVoz && reintentosVoz.value < 2) {
    reintentosVoz.value++;
    hablar(`No entendi "${textoParaVoz}". Repite por favor.`);
    setTimeout(() => { if (!reconociendo.value) iniciarVoz(); }, 1500);
  } else if (textoParaVoz) {
    reintentosVoz.value = 0;
    hablar('No pude entender el comando. Escribelo o toca el microfono de nuevo.');
  }
}

function iniciarVoz() {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) { parseError.value = 'Reconocimiento de voz no soportado'; return; }
  if (reconociendo.value) { micRecognition.value?.stop(); reconociendo.value = false; return; }
  try {
    try { window.speechSynthesis?.cancel(); } catch { }
    const rec = new SR();
    micRecognition.value = rec;
    rec.lang = 'es-MX';
    rec.interimResults = false;
    rec.onresult = (event: any) => {
      const texto = event.results[0][0].transcript.trim();
      manualInput.value = texto;
      parseError.value = '';
      rec.stop();
      reconociendo.value = false;
      if (texto) parsearComando(texto);
    };
    rec.onerror = () => { reconociendo.value = false; parseError.value = 'Error en reconocimiento de voz'; };
    rec.onend = () => { reconociendo.value = false; };
    rec.start();
    reconociendo.value = true;
  } catch {
    reconociendo.value = false;
    parseError.value = 'Error al iniciar el microfono';
  }
}

async function confirmar() {
  if (!localStockData.value || !localStockData.value.productoId) return;
  executing.value = true;
  result.value = 'idle';
  try {
    const idUsuario = localStorage.getItem('idUsuario') || '0';
    const resp = await fetch(`${API_BASE}/voice/stock/execute?idUsuario=${encodeURIComponent(idUsuario)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productoId: localStockData.value.productoId,
        cantidad: localStockData.value.cantidad,
        tipo: localStockData.value.tipo
      })
    });
    const data = await resp.json();
    if (resp.ok && data.accion !== 'ERROR') {
      result.value = 'success';
      resultMsg.value = data.mensaje || 'Stock actualizado correctamente';
    } else {
      result.value = 'error';
      resultMsg.value = data.mensaje || 'Error al actualizar stock';
    }
  } catch (e: any) {
    result.value = 'error';
    resultMsg.value = 'Error de conexion: ' + (e.message || e);
  } finally {
    executing.value = false;
  }
}

function cerrar() {
  micRecognition.value?.stop();
  reconociendo.value = false;
  reintentosVoz.value = 0;
  try { window.speechSynthesis?.cancel(); } catch { }
  result.value = 'idle';
  resultMsg.value = '';
  parseError.value = '';
  manualInput.value = '';
  vista.value = 'confirmar';
  emit('close');
}

watch(() => props.open, (val) => {
  if (val) {
    result.value = 'idle';
    resultMsg.value = '';
    parseError.value = '';
    manualInput.value = '';
    reintentosVoz.value = 0;
    vista.value = localStockData.value?.opciones?.length > 1 ? 'opciones' : 'confirmar';
  } else {
    micRecognition.value?.stop();
    reconociendo.value = false;
    reintentosVoz.value = 0;
    try { window.speechSynthesis?.cancel(); } catch { }
  }
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="stock-modal-overlay" @click.self="cerrar">
      <div class="stock-modal">
        <div class="stock-modal-header">
          <h2>📦 Comando de Inventario</h2>
          <button class="stock-close-btn" @click="cerrar">&times;</button>
        </div>

        <div class="stock-modal-body">
          <!-- Input mode: no stockData yet -->
          <div v-if="result === 'idle' && showInput()">
            <label class="stock-input-label">Escribe un comando de inventario:</label>
            <div class="stock-input-row">
              <input
                v-model="manualInput"
                class="stock-text-input"
                placeholder="Ej: actualiza el stock de cocacola a 15"
                @keyup.enter="parsearComando"
                :disabled="parseando || reconociendo"
              />
              <button
                class="stock-btn stock-btn-mic"
                :class="{ 'stock-btn-mic-active': reconociendo }"
                @click="iniciarVoz"
                :disabled="parseando"
                :title="reconociendo ? 'Detener' : 'Hablar'"
              >
                {{ reconociendo ? '⏹' : '🎤' }}
              </button>
              <button class="stock-btn stock-btn-primary" @click="parsearComando" :disabled="parseando || !manualInput.trim()">
                {{ parseando ? 'Procesando...' : 'Procesar' }}
              </button>
            </div>
            <div v-if="parseError" class="stock-result stock-result-error" style="margin-top:0.5rem">
              {{ parseError }}
            </div>
          </div>

          <!-- Options mode: multiple products found -->
          <div v-if="result === 'idle' && !showInput() && vista === 'opciones'">
            <div class="stock-ai-message">{{ localStockData?.mensaje }}</div>
            <div class="vo-lista">
              <button
                v-for="op in localStockData?.opciones || []"
                :key="op.productoId"
                class="vo-opcion"
                @click="elegirOpcion(op)"
              >
                <span class="vo-opcion-nombre">{{ op.nombreProducto }}</span>
                <span class="vo-opcion-precio">
                  {{ op.stock != null ? op.stock + ' uds' : '' }} {{ formatoMoneda(op.precio) }}
                </span>
              </button>
            </div>
          </div>

          <!-- Confirm mode: stockData parsed -->
          <div v-if="result === 'idle' && !showInput() && vista === 'confirmar'">
            <div class="stock-ai-message">{{ localStockData?.mensaje }}</div>

            <div class="stock-details" v-if="localStockData?.productoId">
              <div class="stock-detail-row">
                <span class="stock-label">Producto</span>
                <span class="stock-value">{{ localStockData?.nombreProducto }}</span>
              </div>
              <div class="stock-detail-row">
                <span class="stock-label">Stock actual</span>
                <span class="stock-value stock-value-old">{{ localStockData?.stockActual ?? '?' }}</span>
              </div>
              <div class="stock-detail-row" v-if="localStockData?.stockNuevo !== null && localStockData?.stockNuevo !== undefined">
                <span class="stock-label">Stock propuesto</span>
                <span class="stock-value stock-value-new">{{ localStockData?.stockNuevo }}</span>
              </div>
              <div class="stock-detail-row">
                <span class="stock-label">Confianza</span>
                <span class="stock-value">{{ Math.round((localStockData?.confianza || 0) * 100) }}%</span>
              </div>
            </div>
          </div>

          <div v-if="result === 'idle' && !showInput() && vista === 'resultado'" class="stock-result stock-result-success">
            {{ localStockData?.mensaje }}
          </div>

          <div v-if="result === 'success'" class="stock-result stock-result-success">
            {{ resultMsg }}
          </div>
          <div v-if="result === 'error'" class="stock-result stock-result-error">
            {{ resultMsg }}
          </div>
        </div>

        <div class="stock-modal-footer">
          <template v-if="result === 'idle' && showInput()">
            <button class="stock-btn stock-btn-secondary" @click="cerrar">Cancelar</button>
          </template>
          <template v-if="result === 'idle' && !showInput() && vista === 'opciones'">
            <button class="stock-btn stock-btn-secondary" @click="cerrar">Cancelar</button>
          </template>
          <template v-if="result === 'idle' && !showInput() && vista === 'confirmar'">
            <button class="stock-btn stock-btn-secondary" @click="cerrar" :disabled="executing">Cancelar</button>
            <button class="stock-btn stock-btn-primary" @click="confirmar" :disabled="executing || !localStockData?.productoId">
              {{ executing ? 'Ejecutando...' : '✅ Confirmar' }}
            </button>
          </template>
          <template v-else-if="result !== 'idle' || vista === 'resultado'">
            <button class="stock-btn stock-btn-secondary" @click="emit('done')">Cerrar</button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.stock-modal-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--perg-bg) 85%, var(--bg-primary));
  backdrop-filter: blur(5px);
  z-index: 400;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.stock-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.stock-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.stock-modal-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--accent-color);
}

.stock-modal-body {
  padding: 1.2rem 1.5rem;
}

.stock-modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.stock-input-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.stock-input-row {
  display: flex;
  gap: 0.5rem;
}

.stock-text-input {
  flex: 1;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
}

.stock-text-input:focus {
  border-color: var(--accent-color);
}

.stock-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.stock-close-btn:hover { color: var(--text-primary); background: var(--bg-secondary); }

.stock-ai-message {
  background: color-mix(in srgb, var(--accent-color) 12%, var(--bg-secondary));
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text-primary);
  border-left: 3px solid var(--accent-color);
}

.stock-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stock-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border-color);
}

.stock-detail-row:last-child { border-bottom: none; }

.stock-label {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.stock-value {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.stock-value-old {
  color: var(--error-color);
}

.stock-value-new {
  color: var(--success-color);
  font-size: 1.1rem;
}

.stock-result {
  text-align: center;
  padding: 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
}

.stock-result-success {
  background: color-mix(in srgb, var(--success-color) 15%, transparent);
  color: var(--success-color);
}

.vo-lista {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 45vh;
  overflow-y: auto;
}

.vo-opcion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.vo-opcion:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 12%, var(--bg-secondary));
}

.vo-opcion-nombre { font-weight: 600; }
.vo-opcion-precio { color: var(--accent-color); font-weight: 700; white-space: nowrap; }

.stock-result-error {
  background: color-mix(in srgb, var(--error-color) 15%, transparent);
  color: var(--error-color);
}

.stock-btn {
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.stock-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.stock-btn-primary {
  background: var(--accent-color);
  color: var(--text-primary);
}

.stock-btn-primary:hover:not(:disabled) { filter: brightness(1.15); }

.stock-btn-mic {
  background: var(--bg-secondary);
  color: var(--accent-color);
  border: 1px solid var(--border-color);
  font-size: 1rem;
}

.stock-btn-mic-active {
  background: var(--error-color);
  color: #fff;
  border-color: var(--error-color);
  animation: stock-mic-pulse 1s infinite;
}

.stock-btn-mic:disabled { opacity: 0.5; cursor: not-allowed; }

@keyframes stock-mic-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.stock-btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.stock-btn-secondary:hover { border-color: var(--accent-color); }

@media (max-width: 480px) {
  .stock-modal { max-width: 100%; margin: 0.5rem; }
  .stock-modal-header { padding: 0.8rem 1rem; }
  .stock-modal-body { padding: 0.8rem 1rem; }
}
</style>
