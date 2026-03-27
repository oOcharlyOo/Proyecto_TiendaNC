<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

interface Usuario {
  idUsuario: number;
  nombre: string;
  apellido_p: string;
  apellido_m: string;
  usuario: string;
  sueldo_hora: number;
  dias_semana: number;
}

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [usuarios: Usuario[]];
}>();

const usuarios = ref<Usuario[]>([]);
const loading = ref(false);
const guardarCargando = ref(false);

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

async function fetchUsuarios() {
  loading.value = true;
  try {
    const res = await fetch(`${API_BASE}/usuarios/listarUsuarios`);
    const data = await res.json();
    if (data.codigo === 200 && data.datos) {
      usuarios.value = data.datos.map((u: any) => ({
        ...u,
        sueldo_hora: u.sueldo_hora || 0,
        dias_semana: u.dias_semana || 6
      }));
    }
  } catch (e) {
    console.error('Error al cargar usuarios:', e);
  } finally {
    loading.value = false;
  }
}

watch(() => props.open, (newVal) => {
  if (newVal) {
    fetchUsuarios();
  }
});

async function guardarCambios() {
  guardarCargando.value = true;
  let errores = 0;
  
  try {
    for (const usuario of usuarios.value) {
      const res = await fetch(`${API_BASE}/usuarios/sueldoHora/${usuario.idUsuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sueldo_hora: Number(usuario.sueldo_hora) || 0,
          dias_semana: Number(usuario.dias_semana) || 6
        })
      });
      
      if (!res.ok) {
        console.error(`Error al guardar usuario ${usuario.idUsuario}:`, res.status);
        errores++;
      }
    }
    
    if (errores === 0) {
      emit('save', usuarios.value);
      emit('close');
    } else {
      alert(`Se guardaron ${usuarios.value.length - errores} de ${usuarios.value.length} usuarios. Revisa la consola.`);
      emit('save', usuarios.value);
      emit('close');
    }
  } catch (e) {
    console.error('Error al guardar:', e);
    alert('Error de conexión. Intenta de nuevo.');
  } finally {
    guardarCargando.value = false;
  }
}

function close() {
  emit('close');
}

onMounted(() => {
  if (props.open) {
    fetchUsuarios();
  }
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="close">
      <div class="modal-card panel">
        <div class="modal-corner tl"></div>
        <div class="modal-corner tr"></div>
        <div class="modal-corner bl"></div>
        <div class="modal-corner br"></div>
        
        <button class="btn-cerrar-modal" @click="close">×</button>
        
        <div class="modal-content-scroll">
          <div class="modal-header">
            <span class="modal-icon">⚔️</span>
            <h3>🪙 Configurar Sueldo por Hora</h3>
          </div>
          
          <div v-if="loading" class="loading-spinner">
            <div class="zelda-spinner"></div>
          </div>
          
          <div v-else class="sueldo-list">
            <div v-for="user in usuarios" :key="user.idUsuario" class="sueldo-item">
              <div class="user-info">
                <span class="user-name">{{ user.nombre }} {{ user.apellido_p }}</span>
                <span class="user-username">@{{ user.usuario }}</span>
              </div>
              <div class="sueldo-inputs-row">
                <div class="sueldo-input-group">
                  <label>$</label>
                  <input 
                    type="number" 
                    v-model.number="user.sueldo_hora" 
                    min="0" 
                    step="0.01"
                    placeholder="0.00"
                  />
                  <span class="sueldo-label">/hora</span>
                </div>
                <div class="sueldo-input-group small">
                  <input 
                    type="number" 
                    v-model.number="user.dias_semana" 
                    min="1" 
                    max="7"
                    placeholder="6"
                  />
                  <span class="sueldo-label">días/sem</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-actions">
            <button class="btn-cancelar" @click="close">Cancelar</button>
            <button 
              class="btn-guardar" 
              @click="guardarCambios" 
              :disabled="guardarCargando"
            >
              <span v-if="guardarCargando">💾 Guardando...</span>
              <span v-else>💾 Guardar Cambios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--shadow-color);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.modal-card {
  width: min(100%, 500px);
  background: var(--bg-panel) !important;
  border: none !important;
  padding: 0 !important;
  animation: fadeSlideIn 200ms ease-out !important;
  position: relative !important;
  margin: 1rem auto;
  box-shadow: none !important;
}

.modal-card::before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  border: 4px solid var(--accent-color) !important;
  border-radius: 16px !important;
  pointer-events: none !important;
  z-index: 1 !important;
  box-shadow: 
    inset 0 0 0 2px var(--border-color),
    inset 0 0 0 6px var(--bg-panel),
    0 8px 32px var(--shadow-color),
    0 0 0 1px var(--border-color) !important;
}

.modal-card::after {
  content: '' !important;
  position: absolute !important;
  inset: 12px !important;
  border: 2px dashed var(--border-color) !important;
  border-radius: 8px !important;
  pointer-events: none !important;
  z-index: 1 !important;
  opacity: 0.5 !important;
}

.modal-corner {
  position: absolute !important;
  width: 40px !important;
  height: 40px !important;
  pointer-events: none !important;
  z-index: 10 !important;
}

.modal-corner::before,
.modal-corner::after {
  content: '' !important;
  position: absolute !important;
  background: var(--accent-color) !important;
  border-radius: 2px !important;
}

.modal-corner.tl { top: 16px; left: 16px; }
.modal-corner.tl::before { width: 25px; height: 3px; top: 0; left: 0; }
.modal-corner.tl::after { width: 3px; height: 25px; top: 0; left: 0; }

.modal-corner.tr { top: 16px; right: 16px; }
.modal-corner.tr::before { width: 25px; height: 3px; top: 0; right: 0; }
.modal-corner.tr::after { width: 3px; height: 25px; top: 0; right: 0; }

.modal-corner.bl { bottom: 16px; left: 16px; }
.modal-corner.bl::before { width: 25px; height: 3px; bottom: 0; left: 0; }
.modal-corner.bl::after { width: 3px; height: 25px; bottom: 0; left: 0; }

.modal-corner.br { bottom: 16px; right: 16px; }
.modal-corner.br::before { width: 25px; height: 3px; bottom: 0; right: 0; }
.modal-corner.br::after { width: 3px; height: 25px; bottom: 0; right: 0; }

.btn-cerrar-modal {
  position: absolute !important;
  top: 20px;
  right: 20px;
  z-index: 20;
  width: 36px;
  height: 36px;
  background: var(--bg-secondary) !important;
  border: 2px solid var(--border-color) !important;
  border-radius: 50%;
  color: var(--text-primary) !important;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-cerrar-modal:hover {
  background: var(--error-color) !important;
  border-color: var(--error-color) !important;
  color: white !important;
  transform: scale(1.1);
}

.modal-content-scroll {
  max-height: 80vh;
  overflow-y: auto;
  padding: 24px;
  position: relative;
  z-index: 2;
}

.modal-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.modal-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.modal-header h3 {
  font-family: var(--font-title);
  color: var(--accent-color);
  margin: 0;
  font-size: 1.3rem;
}

.loading-spinner {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.zelda-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sueldo-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.sueldo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: bold;
  color: var(--text-primary);
}

.user-username {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.sueldo-inputs-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.sueldo-input-group {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.sueldo-input-group.small {
  flex-direction: column;
  gap: 0.1rem;
}

.sueldo-input-group.small input {
  width: 60px;
  text-align: center;
}

.sueldo-input-group.small .sueldo-label {
  font-size: 0.65rem;
}

.sueldo-input-group label {
  font-size: 1.2rem;
  color: var(--accent-color);
  font-weight: bold;
}

.sueldo-input-group input {
  width: 100px;
  padding: 0.5rem;
  font-size: 1rem;
  background: var(--bg-panel);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  text-align: right;
}

.sueldo-input-group input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-color);
}

.sueldo-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-cancelar {
  padding: 0.75rem 1.5rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.btn-cancelar:hover {
  filter: brightness(1.1);
}

.btn-guardar {
  padding: 0.75rem 1.5rem;
  background: var(--accent-color);
  color: white;
  border: 2px solid var(--accent-color);
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.btn-guardar:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-guardar:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .modal-card {
    width: 100%;
    max-width: calc(100vw - 1rem);
  }

  .sueldo-item {
    flex-direction: column;
    gap: 0.75rem;
  }

  .sueldo-input-group {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>