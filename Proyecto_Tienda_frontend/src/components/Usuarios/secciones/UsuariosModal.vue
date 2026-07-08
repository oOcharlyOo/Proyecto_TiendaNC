<script setup lang="ts">
import { ref } from 'vue';
import type { UsuarioForm } from '../logica/useUsuarios';

defineProps<{
  modalAbierto: boolean;
  editando: boolean;
  form: UsuarioForm;
  avatarPreview: string | null;
  dragando: boolean;
  esAdmin: boolean;
  esEdicionPerfilPropio: boolean;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const emit = defineEmits<{
  'cerrar-modal': [];
  'guardar-usuario': [];
  'handle-drag-over': [e: DragEvent];
  'handle-drag-leave': [];
  'handle-drop': [e: DragEvent];
  'handle-file-select': [e: Event];
}>();

function clickFileInput() {
  fileInputRef.value?.click();
}
</script>

<template>
  <Transition name="modal">
    <div v-if="modalAbierto" class="modal-overlay" @click.self="emit('cerrar-modal')">
      <div class="modal-card panel">
        <div class="modal-corner tl"></div>
        <div class="modal-corner tr"></div>
        <div class="modal-corner bl"></div>
        <div class="modal-corner br"></div>
        <button class="btn-cerrar-modal" @click="emit('cerrar-modal')">✕</button>

        <div class="modal-content-scroll">
          <div class="modal-header-zelda">
            <span class="modal-icon-zelda">{{ editando ? '✏️' : '⚔' }}</span>
            <h3>{{ editando ? 'Editar Héroe' : 'Nuevo Héroe' }}</h3>
          </div>

          <div class="modal-body-zelda">
            <div class="avatar-upload-section">
              <div
                class="avatar-dropzone"
                :class="{ dragando }"
                @dragover="emit('handle-drag-over', $event)"
                @dragleave="emit('handle-drag-leave')"
                @drop="emit('handle-drop', $event)"
                @click="clickFileInput"
              >
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  @change="emit('handle-file-select', $event)"
                  style="display: none"
                />

                <img
                  v-if="avatarPreview"
                  :src="avatarPreview"
                  class="avatar-preview"
                  draggable="false"
                />
                <div v-else class="dropzone-placeholder">
                  <span class="drop-icon">📁</span>
                  <span>Seleccionar imagen</span>
                </div>
              </div>
            </div>

            <div class="form-grid-zelda">
              <div class="form-group-zelda">
                <label>Usuario</label>
                <input v-model="form.usuario" type="text" required placeholder="Nombre de usuario" class="zelda-input" />
              </div>
              <div class="form-group-zelda">
                <label>Nombre</label>
                <input v-model="form.nombre" type="text" required placeholder="Nombre" class="zelda-input" />
              </div>
              <div class="form-group-zelda">
                <label>Apellido Paterno</label>
                <input v-model="form.apellido_p" type="text" placeholder="Apellido paterno" class="zelda-input" />
              </div>
              <div class="form-group-zelda">
                <label>Apellido Materno</label>
                <input v-model="form.apellido_m" type="text" placeholder="Apellido materno" class="zelda-input" />
              </div>
              <div class="form-group-zelda">
                <label>Password</label>
                <input
                  v-model="form.password_hash"
                  type="password"
                  :placeholder="editando ? 'Dejar vacio para mantener' : 'Contraseña'"
                  class="zelda-input"
                />
              </div>
              <div class="form-group-zelda">
                <label>Tipo</label>
                <select v-model="form.id_tipo_usuario" :disabled="!esAdmin && esEdicionPerfilPropio" class="zelda-input zelda-select">
                  <option :value="1">👑 Administrador</option>
                  <option :value="2">🛡 Usuario</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modal-actions-zelda">
            <button class="btn-cancel-zelda" @click="emit('cerrar-modal')">
              <span>✕</span> Cancelar
            </button>
            <button class="btn-save-zelda" @click="emit('guardar-usuario')">
              <span>⚔</span> {{ editando ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
