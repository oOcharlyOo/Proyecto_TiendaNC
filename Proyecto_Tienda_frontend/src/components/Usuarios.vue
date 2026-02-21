<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

type Usuario = {
  idUsuario: number;
  usuario: string;
  nombre: string;
  apellido_p: string;
  apellido_m: string;
  avatar: string | null;
  id_tipo_usuario: number;
};

type UsuarioForm = {
  idUsuario?: number;
  usuario: string;
  nombre: string;
  apellido_p: string;
  apellido_m: string;
  password_hash: string;
  id_tipo_usuario: number;
  avatar: string;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const usuarios = ref<Usuario[]>([]);
const cargando = ref(false);
const modalAbierto = ref(false);
const editando = ref(false);

const avatarPreview = ref<string | null>(null);
const avatarBase64 = ref<string>('');
const dragando = ref(false);
const posicionAvatar = ref({ x: 0, y: 0 });
const escalaAvatar = ref(1);
const imgAvatar = ref<HTMLImageElement | null>(null);

const form = ref<UsuarioForm>({
  usuario: '',
  nombre: '',
  apellido_p: '',
  apellido_m: '',
  password_hash: '',
  id_tipo_usuario: 2,
  avatar: ''
});

const tipoUsuarioActual = computed(() => Number(localStorage.getItem('tipoUsuario') || 2));
const esAdmin = computed(() => tipoUsuarioActual.value === 1);

const theme = ref(localStorage.getItem('theme') || 'zelda');

onMounted(() => {
  cargarUsuarios();
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      theme.value = e.newValue || 'zelda';
    }
  });
});

async function cargarUsuarios() {
  cargando.value = true;
  try {
    const res = await fetch(`${API_BASE}/usuarios/listarUsuarios`);
    const data = await res.json();
    if (data.codigo === 200) {
      usuarios.value = data.datos || [];
    }
  } catch (e) {
    console.error('Error al cargar usuarios:', e);
  } finally {
    cargando.value = false;
  }
}

function abrirModalNuevo() {
  editando.value = false;
  form.value = {
    usuario: '',
    nombre: '',
    apellido_p: '',
    apellido_m: '',
    password_hash: '',
    id_tipo_usuario: 2,
    avatar: ''
  };
  avatarPreview.value = null;
  avatarBase64.value = '';
  posicionAvatar.value = { x: 0, y: 0 };
  escalaAvatar.value = 1;
  modalAbierto.value = true;
}

function abrirModalEditar(usuario: Usuario) {
  editando.value = true;
  form.value = {
    idUsuario: usuario.idUsuario,
    usuario: usuario.usuario,
    nombre: usuario.nombre,
    apellido_p: usuario.apellido_p,
    apellido_m: usuario.apellido_m || '',
    password_hash: '',
    id_tipo_usuario: usuario.id_tipo_usuario,
    avatar: usuario.avatar || ''
  };
  avatarPreview.value = usuario.avatar;
  avatarBase64.value = '';
  posicionAvatar.value = { x: 0, y: 0 };
  escalaAvatar.value = 1;
  modalAbierto.value = true;
}

function cerrarModal() {
  modalAbierto.value = false;
  avatarPreview.value = null;
  avatarBase64.value = '';
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  dragando.value = true;
}

function handleDragLeave() {
  dragando.value = false;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  dragando.value = false;
  const file = e.dataTransfer?.files[0];
  if (file && file.type.startsWith('image/')) {
    procesarArchivo(file);
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    procesarArchivo(file);
  }
}

function procesarArchivo(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    avatarBase64.value = result;
    avatarPreview.value = result;
    form.value.avatar = result;
    posicionAvatar.value = { x: 0, y: 0 };
    escalaAvatar.value = 1;
  };
  reader.readAsDataURL(file);
}

let isDragging = false;
let startX = 0;
let startY = 0;

function handleMouseDown(e: MouseEvent) {
  if (!avatarPreview.value) return;
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  posicionAvatar.value = {
    x: posicionAvatar.value.x + dx,
    y: posicionAvatar.value.y + dy
  };
  startX = e.clientX;
  startY = e.clientY;
}

function handleMouseUp() {
  isDragging = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
}

function handleWheel(e: WheelEvent) {
  if (!avatarPreview.value) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  escalaAvatar.value = Math.max(0.5, Math.min(2, escalaAvatar.value + delta));
}

async function guardarUsuario() {
  const payload = {
    usuario: form.value.usuario,
    nombre: form.value.nombre,
    apellido_p: form.value.apellido_p,
    apellido_m: form.value.apellido_m,
    password_hash: form.value.password_hash,
    id_tipo_usuario: form.value.id_tipo_usuario,
    avatar: avatarBase64.value || form.value.avatar
  };

  const url = editando.value 
    ? `${API_BASE}/usuarios/actualizarUsuario/${form.value.idUsuario}`
    : `${API_BASE}/usuarios/agregarUsuario`;

  const method = editando.value ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.codigo === 200) {
      await cargarUsuarios();
      cerrarModal();
    } else {
      alert(data.mensaje || 'Error al guardar');
    }
  } catch (e) {
    console.error('Error:', e);
    alert('Error al guardar usuario');
  }
}

async function eliminarUsuario(id: number) {
  if (!confirm('¿Eliminar este usuario?')) return;
  
  try {
    const res = await fetch(`${API_BASE}/usuarios/eliminarUsuario/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.codigo === 200) {
      await cargarUsuarios();
    } else {
      alert(data.mensaje || 'Error al eliminar');
    }
  } catch (e) {
    console.error('Error:', e);
    alert('Error al eliminar usuario');
  }
}

function getTipoLabel(tipo: number) {
  return tipo === 1 ? 'Admin' : 'Usuario';
}
</script>

<template>
  <div class="usuarios-page">
    <div class="page-header">
      <h1 class="page-title">Gestion de Usuarios</h1>
      <button v-if="esAdmin" class="btn-primary" @click="abrirModalNuevo">
        + Nuevo Usuario
      </button>
    </div>

    <div v-if="cargando" class="loading">
      <div class="loading-spinner"></div>
      <span>Cargando usuarios...</span>
    </div>

    <div v-else class="usuarios-grid">
      <div 
        v-for="(usuario, index) in usuarios" 
        :key="usuario.idUsuario" 
        class="usuario-card"
        :style="{ animationDelay: `${index * 0.05}s` }"
      >
        <div class="avatar-container">
          <img 
            v-if="usuario.avatar" 
            :src="usuario.avatar" 
            :alt="usuario.nombre"
            class="avatar-img"
          />
          <div v-else class="avatar-placeholder">
            {{ usuario.nombre?.charAt(0)?.toUpperCase() || '?' }}
          </div>
        </div>
        
        <div class="usuario-info">
          <h3 class="usuario-nombre">{{ usuario.nombre }} {{ usuario.apellido_p }}</h3>
          <p class="usuario-user">@{{ usuario.usuario }}</p>
          <span class="tipo-badge" :class="{ admin: usuario.id_tipo_usuario === 1 }">
            {{ getTipoLabel(usuario.id_tipo_usuario) }}
          </span>
        </div>

        <div v-if="esAdmin" class="usuario-actions">
          <button class="btn-edit" @click="abrirModalEditar(usuario)">
            <span class="btn-icon">✏️</span> Editar
          </button>
          <button 
            class="btn-delete" 
            @click="eliminarUsuario(usuario.idUsuario)"
            :disabled="usuario.idUsuario === tipoUsuarioActual"
          >
            <span class="btn-icon">🗑️</span> Eliminar
          </button>
        </div>
      </div>
    </div>

    <Transition name="modal">
      <div v-if="modalAbierto" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3>{{ editando ? 'Editar Usuario' : 'Nuevo Usuario' }}</h3>
            <button class="btn-cerrar-modal" @click="cerrarModal">&times;</button>
          </div>

          <div class="modal-body">
            <div class="avatar-upload-section">
              <label>Avatar</label>
              <div 
                class="avatar-dropzone"
                :class="{ dragando }"
                @dragover="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleDrop"
                @click="$refs.fileInput.click()"
                @mousedown="handleMouseDown"
                @wheel="handleWheel"
              >
                <input 
                  ref="fileInput"
                  type="file" 
                  accept="image/*" 
                  @change="handleFileSelect"
                  style="display: none"
                />
                
                <div 
                  v-if="avatarPreview" 
                  class="avatar-preview-container"
                >
                  <img 
                    ref="imgAvatar"
                    :src="avatarPreview" 
                    class="avatar-preview"
                    :style="{
                      transform: `translate(${posicionAvatar.x}px, ${posicionAvatar.y}px) scale(${escalaAvatar})`
                    }"
                    draggable="false"
                  />
                </div>
                <div v-else class="dropzone-placeholder">
                  <span class="drop-icon">📁</span>
                  <span>Arrastra una imagen o haz clic</span>
                  <small>Usa el mouse para mover, scroll para zoom</small>
                </div>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>Usuario</label>
                <input v-model="form.usuario" type="text" required placeholder="Nombre de usuario" />
              </div>
              <div class="form-group">
                <label>Nombre</label>
                <input v-model="form.nombre" type="text" required placeholder="Nombre" />
              </div>
              <div class="form-group">
                <label>Apellido Paterno</label>
                <input v-model="form.apellido_p" type="text" placeholder="Apellido paterno" />
              </div>
              <div class="form-group">
                <label>Apellido Materno</label>
                <input v-model="form.apellido_m" type="text" placeholder="Apellido materno" />
              </div>
              <div class="form-group">
                <label>Password</label>
                <input 
                  v-model="form.password_hash" 
                  type="password" 
                  :placeholder="editando ? 'Dejar vacio para mantener' : 'Contraseña'"
                />
              </div>
              <div class="form-group">
                <label>Tipo</label>
                <select v-model="form.id_tipo_usuario">
                  <option :value="1">Administrador</option>
                  <option :value="2">Usuario</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click="cerrarModal">Cancelar</button>
            <button class="btn-save" @click="guardarUsuario">
              {{ editando ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.usuarios-page {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-title {
  font-size: 2rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.btn-primary {
  padding: 0.7rem 1.5rem;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.usuarios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.usuario-card {
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  animation: fadeInUp 0.5s ease forwards;
  opacity: 0;
}

.usuario-card:hover {
  transform: translateY(-8px);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.avatar-container {
  width: 120px;
  height: 120px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid var(--border-color);
  box-shadow: 0 4px 12px var(--shadow-color);
  transition: transform 0.3s ease;
}

.usuario-card:hover .avatar-container {
  transform: scale(1.05);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: 900;
}

.usuario-nombre {
  font-size: 1.2rem;
  margin-bottom: 0.3rem;
}

.usuario-user {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.tipo-badge {
  display: inline-block;
  padding: 0.3rem 0.8rem;
  font-size: 0.75rem;
  border-radius: 20px;
  text-transform: uppercase;
  font-weight: 600;
}

.usuario-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: center;
}

.btn-edit, .btn-delete {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s ease;
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 1rem;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-card {
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 2px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
}

.btn-cerrar-modal {
  background: rgba(0, 0, 0, 0.3);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-cerrar-modal:hover {
  transform: scale(1.1);
}

.modal-body {
  padding: 1.5rem;
}

.avatar-upload-section {
  margin-bottom: 1.5rem;
}

.avatar-upload-section label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.avatar-dropzone {
  width: 160px;
  height: 160px;
  margin: 0 auto;
  border: 3px dashed var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
}

.avatar-dropzone:hover {
  border-color: var(--accent-color);
}

.avatar-dropzone.dragando {
  border-color: var(--success-color);
  background: rgba(0, 255, 0, 0.1);
}

.avatar-preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: move;
  user-select: none;
  transition: transform 0.1s ease;
}

.dropzone-placeholder {
  text-align: center;
  padding: 1rem;
}

.drop-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.dropzone-placeholder span {
  display: block;
  font-size: 0.9rem;
}

.dropzone-placeholder small {
  display: block;
  font-size: 0.75rem;
  margin-top: 0.5rem;
  opacity: 0.7;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 0.85rem;
  margin-bottom: 0.3rem;
  font-weight: 500;
}

.form-group input,
.form-group select {
  padding: 0.7rem;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--accent-color);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 2px solid var(--border-color);
}

.btn-cancel {
  padding: 0.7rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-save {
  padding: 0.7rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;
  text-transform: uppercase;
  transition: all 0.2s ease;
}

.btn-save:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-card {
  animation: modalIn 0.3s ease;
}

.modal-leave-active .modal-card {
  animation: modalOut 0.3s ease;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modalOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
}

@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .usuarios-grid {
    grid-template-columns: 1fr;
  }
}
</style>
