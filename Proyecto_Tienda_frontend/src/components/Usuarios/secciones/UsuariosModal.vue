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

<style scoped>
.modal-enter-active,.modal-leave-active{transition:opacity .2s ease}.modal-enter-from,.modal-leave-to{opacity:0}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem}
.modal-card.panel{position:relative;background:var(--color-bg-secondary);border:none;border-radius:18px;width:min(100%,480px);max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:12px 12px 30px rgba(0,0,0,.4),-6px -6px 20px rgba(255,255,255,.03)}
.modal-corner{position:absolute;width:20px;height:20px;border-color:color-mix(in srgb,var(--color-accent) 20%,transparent);border-style:solid;pointer-events:none;z-index:1}.modal-corner.tl{top:0;left:0;border-width:2px 0 0 2px;border-radius:4px 0 0 0}.modal-corner.tr{top:0;right:0;border-width:2px 2px 0 0;border-radius:0 4px 0 0}.modal-corner.bl{bottom:0;left:0;border-width:0 0 2px 2px;border-radius:0 0 0 4px}.modal-corner.br{bottom:0;right:0;border-width:0 2px 2px 0;border-radius:0 0 4px 0}
.btn-cerrar-modal{position:absolute;top:.75rem;right:.75rem;background:var(--color-bg-primary);border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--color-text-secondary);font-size:1rem;z-index:2;transition:all .15s;box-shadow:2px 2px 4px rgba(0,0,0,.1)}.btn-cerrar-modal:hover{background:var(--color-error);color:#fff}
.modal-content-scroll{overflow-y:auto;flex:1;padding:1.25rem 1.25rem 0}
.modal-header-zelda{display:flex;align-items:center;gap:.5rem;margin-bottom:1rem}.modal-icon-zelda{font-size:1.8rem}.modal-header-zelda h3{margin:0;font-size:1rem;color:var(--color-accent);font-weight:800}
.modal-body-zelda{display:flex;flex-direction:column;gap:1rem}
.avatar-upload-section{display:flex;justify-content:center}
.avatar-dropzone{width:100px;height:100px;border:2px dashed var(--color-border);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;overflow:hidden;background:var(--color-bg-primary)}.avatar-dropzone:hover,.avatar-dropzone.dragando{border-color:var(--color-accent);background:color-mix(in srgb,var(--color-accent) 5%,transparent)}
.avatar-preview{width:100%;height:100%;object-fit:cover;border-radius:50%}
.dropzone-placeholder{display:flex;flex-direction:column;align-items:center;gap:.2rem;color:var(--color-text-secondary);font-size:.68rem}.drop-icon{font-size:1.5rem}
.form-grid-zelda{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}
.form-group-zelda{display:flex;flex-direction:column;gap:.25rem}.form-group-zelda label{font-size:.65rem;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.04em}
.zelda-input,.zelda-select{width:100%;padding:.55rem .7rem;background:var(--color-bg-primary);border:none;border-radius:8px;color:var(--color-text-primary);font-size:.85rem;outline:none;box-shadow:inset 3px 3px 6px rgba(0,0,0,.15);transition:all .2s}.zelda-input:focus,.zelda-select:focus{box-shadow:inset 3px 3px 8px rgba(0,0,0,.2),0 0 0 2px var(--color-accent)}.zelda-input::placeholder{color:var(--color-text-secondary);opacity:.5}
.zelda-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .7rem center;padding-right:2.2rem;cursor:pointer}.zelda-select option{background:var(--color-bg-primary);color:var(--color-text-primary)}
.modal-actions-zelda{display:flex;justify-content:flex-end;gap:.55rem;padding:1rem 1.25rem;border-top:1px solid var(--color-border)}.modal-actions-zelda button{border:none;padding:.6rem 1.1rem;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;cursor:pointer;border-radius:8px;display:inline-flex;align-items:center;gap:.35rem;transition:all .2s}
.btn-save-zelda{background:var(--color-accent);color:var(--color-on-brand);box-shadow:4px 4px 10px rgba(0,0,0,.2)}.btn-save-zelda:hover{transform:translateY(-2px);box-shadow:6px 6px 16px rgba(0,0,0,.28)}
.btn-cancel-zelda{background:var(--color-bg-secondary);color:var(--color-text-secondary);box-shadow:3px 3px 6px rgba(0,0,0,.1)}.btn-cancel-zelda:hover{transform:translateY(-2px);box-shadow:5px 5px 12px rgba(0,0,0,.18);color:var(--color-text-primary)}
@media(max-width:768px){.modal-card.panel{width:95vw;border-radius:14px}.form-grid-zelda{grid-template-columns:1fr}}
@media(max-width:480px){.modal-card.panel{width:95vw;max-height:95vh;border-radius:14px}.modal-content-scroll{padding:1rem 1rem 0}.modal-actions-zelda{flex-direction:column}.modal-actions-zelda button{width:100%;justify-content:center}}
</style>
