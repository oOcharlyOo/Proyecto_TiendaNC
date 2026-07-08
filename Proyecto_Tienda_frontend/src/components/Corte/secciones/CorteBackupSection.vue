<script setup lang="ts">
defineProps<{ mostrarBackupManager: boolean; mostrarImportModal: boolean; cargandoBackup: boolean; backupLog: string[]; dragOver: boolean; selectedFile: File | null; backupFileRef: HTMLInputElement | null }>();
defineEmits<{
  'toggle-backup': []; 'toggle-import': []; 'descargar-backups': [];
  'file-select': [Event]; 'file-drop': [DragEvent]; 'drag-over': [boolean];
  'importar-backup': [];
}>();
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
        <div class="drop-zone" :class="{ 'drag-over': dragOver }" @dragover.prevent="$emit('drag-over', true)" @dragleave.prevent="$emit('drag-over', false)" @drop.prevent="$emit('file-drop', $event)">
          <p v-if="!selectedFile">Arrastra un archivo .sql aquí o haz clic para seleccionar</p>
          <p v-else>{{ selectedFile.name }}</p>
          <input type="file" ref="backupFileRef" accept=".sql,.dump,.bak" @change="$emit('file-select', $event)" />
        </div>
        <button class="action-btn restore-btn" :disabled="!selectedFile || cargandoBackup" @click="$emit('importar-backup')">
          {{ cargandoBackup ? 'Importando...' : 'Importar' }}
        </button>
        <div v-if="backupLog.length" class="backup-log"><pre v-for="(line, i) in backupLog" :key="i">{{ line }}</pre></div>
      </div>
    </div>
  </section>
</template>
