<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

type ModelInfo = {
  name: string;
  size: number;
  modified_at?: string;
  isActive: boolean;
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const models = ref<ModelInfo[]>([]);
const loading = ref(false);
const error = ref('');
const pullName = ref('');
const pulling = ref(false);
const pullProgress = ref('');
const pullStatus = ref('');

function formatSize(bytes: number): string {
  if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + ' MB';
  return (bytes / 1024 ** 3).toFixed(1) + ' GB';
}

async function fetchModels() {
  loading.value = true;
  error.value = '';
  try {
    const resp = await fetch(`${API_BASE}/voice/models`);
    const data = await resp.json();
    if (data.error) { error.value = data.error; models.value = []; return; }
    const activeResp = await fetch(`${API_BASE}/voice/models/active`);
    const activeData = await activeResp.json();
    const activeName = activeData.modelo || '';
    if (data.models) {
      models.value = data.models.map((m: any) => ({
        name: m.name,
        size: m.size || 0,
        modified_at: m.modified_at,
        isActive: m.name === activeName
      }));
    }
  } catch (e: any) {
    error.value = 'Error al conectar con Ollama: ' + (e.message || e);
  } finally {
    loading.value = false;
  }
}

async function switchModel(name: string) {
  error.value = '';
  try {
    const resp = await fetch(`${API_BASE}/voice/models/switch?name=${encodeURIComponent(name)}`);
    const data = await resp.json();
    models.value.forEach(m => m.isActive = m.name === name);
  } catch (e: any) {
    error.value = 'Error al cambiar modelo: ' + (e.message || e);
  }
}

async function deleteModel(name: string) {
  if (!confirm(`Eliminar modelo "${name}"?`)) return;
  error.value = '';
  try {
    const resp = await fetch(`${API_BASE}/voice/models/${encodeURIComponent(name)}`, { method: 'DELETE' });
    const data = await resp.json();
    if (data.error) { error.value = data.error; return; }
    await fetchModels();
  } catch (e: any) {
    error.value = 'Error al eliminar: ' + (e.message || e);
  }
}

async function pullModel() {
  const name = pullName.value.trim();
  if (!name) return;
  pulling.value = true;
  pullProgress.value = '';
  pullStatus.value = 'Descargando...';
  error.value = '';
  try {
    const resp = await fetch(`${API_BASE}/voice/models/pull?name=${encodeURIComponent(name)}`, { method: 'POST' });
    const data = await resp.json();
    if (data.error) {
      error.value = data.error;
      pullStatus.value = 'Error';
    } else {
      pullStatus.value = data.status === 'success' ? 'Descarga completa' : (data.status || 'Completado');
      pullProgress.value = '';
      await fetchModels();
    }
  } catch (e: any) {
    error.value = 'Error al descargar: ' + (e.message || e);
    pullStatus.value = 'Error';
  } finally {
    pulling.value = false;
    if (pullStatus.value !== 'Error') {
      setTimeout(() => { pullName.value = ''; pullStatus.value = ''; }, 3000);
    }
  }
}

watch(() => props.open, (val) => {
  if (val) fetchModels();
  else { pullName.value = ''; pullStatus.value = ''; pullProgress.value = ''; pulling.value = false; }
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="pos-modal-overlay-ia" @click.self="emit('close')">
      <div class="ia-modal">
        <div class="ia-modal-header">
          <h2>🧠 Gesti&oacute;n de Modelos de IA</h2>
          <button class="ia-close-btn" @click="emit('close')">&times;</button>
        </div>

        <div class="ia-modal-body">
          <p v-if="error" class="ia-error">{{ error }}</p>
          <p v-if="loading" class="ia-loading">Cargando modelos...</p>

          <div v-if="!loading">
            <section class="ia-section">
              <h3>Modelos Instalados</h3>
              <div v-if="models.length === 0" class="ia-empty">
                No hay modelos instalados. Descarga uno abajo.
              </div>
              <div v-for="m in models" :key="m.name" class="ia-model-row">
                <div class="ia-model-info">
                  <span class="ia-model-name">{{ m.name }}</span>
                  <span class="ia-model-size">{{ formatSize(m.size) }}</span>
                </div>
                <div class="ia-model-actions">
                  <span v-if="m.isActive" class="ia-badge ia-badge-active">ACTIVO</span>
                  <button v-else class="ia-btn ia-btn-sm ia-btn-outline" @click="switchModel(m.name)">Activar</button>
                  <button class="ia-btn ia-btn-sm ia-btn-danger" @click="deleteModel(m.name)">Eliminar</button>
                </div>
              </div>
            </section>

            <section class="ia-section">
              <h3>Descargar Nuevo Modelo</h3>
              <div class="ia-pull-row">
                <input
                  v-model="pullName"
                  type="text"
                  placeholder="ej: llama3.2:3b, mistral:7b"
                  class="ia-input"
                  :disabled="pulling"
                  @keydown.enter="pullModel"
                />
                <button class="ia-btn ia-btn-primary" :disabled="pulling || !pullName.trim()" @click="pullModel">
                  {{ pulling ? 'Descargando...' : 'Descargar' }}
                </button>
              </div>
              <p v-if="pullStatus && !error" class="ia-pull-status">{{ pullStatus }}</p>
              <p v-if="pullProgress" class="ia-pull-progress">{{ pullProgress }}</p>
            </section>

            <section class="ia-section">
              <h3>Sugerencias</h3>
              <div class="ia-suggestions">
                <button
                  v-for="s in ['qwen2.5:7b', 'llama3.2:3b', 'mistral:7b', 'phi3.5:3.8b', 'gemma2:9b']"
                  :key="s"
                  class="ia-btn ia-btn-sm ia-btn-suggestion"
                  :disabled="pulling"
                  @click="pullName = s"
                >{{ s }}</button>
              </div>
            </section>
          </div>
        </div>

        <div class="ia-modal-footer">
          <button class="ia-btn ia-btn-secondary" @click="emit('close')">Cerrar</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pos-modal-overlay-ia {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--perg-bg) 85%, var(--bg-primary));
  backdrop-filter: blur(5px);
  z-index: 300;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.ia-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.ia-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.ia-modal-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--accent-color);
}

.ia-modal-body {
  padding: 1.2rem 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.ia-modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}

.ia-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.ia-close-btn:hover { color: var(--text-primary); background: var(--bg-secondary); }

.ia-error {
  color: var(--error-color);
  background: color-mix(in srgb, var(--error-color) 15%, transparent);
  padding: 0.6rem 1rem;
  border-radius: 6px;
  margin-bottom: 0.8rem;
}

.ia-loading {
  color: var(--text-secondary);
  text-align: center;
  padding: 2rem 0;
}

.ia-empty {
  color: var(--text-secondary);
  text-align: center;
  padding: 1rem 0;
  font-style: italic;
}

.ia-section {
  margin-bottom: 1.5rem;
}

.ia-section h3 {
  font-size: 0.95rem;
  color: var(--text-primary);
  margin: 0 0 0.8rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ia-model-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.7rem 0.8rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  margin-bottom: 0.4rem;
  gap: 0.5rem;
}

.ia-model-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.ia-model-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
  word-break: break-all;
}

.ia-model-size {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.ia-model-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.ia-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ia-badge-active {
  background: var(--success-color);
  color: var(--text-primary);
}

.ia-pull-row {
  display: flex;
  gap: 0.5rem;
}

.ia-input {
  flex: 1;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
}

.ia-input:focus { border-color: var(--accent-color); }
.ia-input:disabled { opacity: 0.6; }

.ia-pull-status {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--success-color);
}

.ia-pull-progress {
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.ia-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.ia-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.ia-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ia-btn-sm { padding: 0.3rem 0.6rem; font-size: 0.78rem; }
.ia-btn-primary { background: var(--accent-color); color: var(--text-primary); }
.ia-btn-primary:hover:not(:disabled) { filter: brightness(1.15); }
.ia-btn-secondary { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); }
.ia-btn-secondary:hover { border-color: var(--accent-color); }
.ia-btn-outline { background: transparent; border: 1px solid var(--accent-color); color: var(--accent-color); }
.ia-btn-outline:hover { background: color-mix(in srgb, var(--accent-color) 15%, transparent); }
.ia-btn-danger { background: transparent; border: 1px solid var(--error-color); color: var(--error-color); }
.ia-btn-danger:hover { background: color-mix(in srgb, var(--error-color) 15%, transparent); }
.ia-btn-suggestion { background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-secondary)); color: var(--text-secondary); border: 1px solid var(--border-color); font-size: 0.78rem; padding: 0.3rem 0.6rem; }
.ia-btn-suggestion:hover:not(:disabled) { border-color: var(--accent-color); color: var(--accent-color); }

@media (max-width: 480px) {
  .ia-modal { max-width: 100%; margin: 0.5rem; max-height: 95vh; }
  .ia-modal-header { padding: 0.8rem 1rem; }
  .ia-modal-body { padding: 0.8rem 1rem; }
  .ia-model-row { flex-direction: column; align-items: flex-start; gap: 0.4rem; }
  .ia-model-actions { width: 100%; justify-content: flex-end; }
}
</style>
