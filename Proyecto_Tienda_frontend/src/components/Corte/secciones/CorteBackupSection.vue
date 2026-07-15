<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ mostrarBackupManager: boolean; mostrarImportModal: boolean; cargandoBackup: boolean; backupLog: string[]; dragOver: boolean; selectedFiles: File[] }>();
defineEmits<{
  'toggle-backup': []; 'toggle-import': []; 'descargar-backups': [];
  'file-select': [Event]; 'file-drop': [DragEvent]; 'drag-over': [boolean];
  'importar-backup': [];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);

function triggerFileSelect() {
  fileInputRef.value?.click();
}
</script>
<template>
  <section class="backup-section">
    <div class="section-header">
      <h2 class="section-title">
        <span class="title-icon">💾</span>
        <span>Respaldo de Datos</span>
      </h2>
    </div>
    <div class="backup-actions">
      <button class="action-btn backup-btn" :disabled="cargandoBackup" @click="$emit('descargar-backups')">
        <span class="action-icon">⬇️</span> Descargar Backup
      </button>
      <button class="action-btn restore-btn" @click="$emit('toggle-import')">
        <span class="action-icon">⬆️</span> Importar Backup
      </button>
    </div>
    <div v-if="mostrarImportModal" class="import-modal-overlay" @click.self="$emit('toggle-import')">
      <div class="import-modal">
        <h3>Importar Backup</h3>
        <div class="drop-zone" :class="{ 'drag-over': dragOver }" @click="triggerFileSelect" @dragover.prevent="$emit('drag-over', true)" @dragleave.prevent="$emit('drag-over', false)" @drop.prevent="$emit('file-drop', $event)">
          <p v-if="selectedFiles.length === 0">Arrastra archivos .sql/.tar.gz aquí o haz clic para seleccionar</p>
          <div v-else>
            <p v-for="f in selectedFiles" :key="f.name"><strong>{{ f.name }}</strong> ({{ (f.size / 1024 / 1024).toFixed(1) }} MB)</p>
          </div>
          <input type="file" ref="fileInputRef" accept=".sql,.dump,.bak,.gz,.tgz" class="file-input-hidden" multiple @change="$emit('file-select', $event)" />
        </div>
        <p v-if="selectedFiles.some(f => f.size > 50 * 1024 * 1024)" class="file-size-warning">⚠️ Algunos archivos son muy grandes (&gt;50 MB). El servidor podría rechazarlos.</p>
        <button class="action-btn restore-btn" :disabled="selectedFiles.length === 0 || cargandoBackup" @click="$emit('importar-backup')">
          {{ cargandoBackup ? 'Importando...' : `Importar (${selectedFiles.length} archivo${selectedFiles.length !== 1 ? 's' : ''})` }}
        </button>
        <div v-if="backupLog.length" class="backup-log"><pre v-for="(line, i) in backupLog" :key="i">{{ line }}</pre></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.backup-section {
  position: relative;
  z-index: 1;
  padding: 1.5rem 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.section-title {
  
  font-size: 1.5rem;
  color: var(--color-accent);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
}

.title-icon { font-size: 1.3rem; }

.backup-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.action-btn.backup-btn {
  border-color: color-mix(in srgb, var(--color-info) 30%, transparent);
  color: var(--color-info);
}

.action-btn.restore-btn {
  border-color: color-mix(in srgb, var(--color-success) 30%, transparent);
  color: var(--color-success);
}

.import-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.import-modal {
  background: var(--color-bg-panel);
  border:none;box-shadow:3px 3px 8px rgba(0,0,0,.12),-1px -1px 4px rgba(255,255,255,.02);
  border-radius: 20px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
}

.import-modal h3 {
  
  color: var(--color-accent);
  margin: 0 0 1rem;
  text-align: center;
}

.drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 1rem;
}

.drop-zone.drag-over {
  
  background: color-mix(in srgb, var(--color-accent) 5%, transparent);
}

.drop-zone p { margin: 0; color: var(--color-text-secondary); }
.file-input-hidden { display: none; }
.file-size-warning { color: var(--color-error); font-size: 0.8rem; margin: -0.5rem 0 0.75rem; text-align: center; }
.backup-log { margin-top: 1rem; max-height: 200px; overflow-y: auto; }
.backup-log pre { margin: 0; font-size: 0.75rem; color: var(--color-text-secondary); padding: 0.2rem 0; }

@media (max-width: 768px) {
  .backup-actions { flex-direction: column; align-items: center; }
}
</style>
