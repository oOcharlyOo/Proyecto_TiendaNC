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

onMounted(() => {
  cargarUsuarios();
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

    <div v-if="cargando" class="loading">Cargando...</div>

    <div v-else class="usuarios-grid">
      <div 
        v-for="usuario in usuarios" 
        :key="usuario.idUsuario" 
        class="usuario-card"
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
          <button class="btn-edit" @click="abrirModalEditar(usuario)">Editar</button>
          <button 
            class="btn-delete" 
            @click="eliminarUsuario(usuario.idUsuario)"
            :disabled="usuario.idUsuario === tipoUsuarioActual"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>

    <div v-if="modalAbierto" class="modal-overlay" @click.self="cerrarModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editando ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
          <button class="btn-close" @click="cerrarModal">&times;</button>
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
                <span>Arrastra una imagen o haz clic</span>
                <small>Usa el mouse para mover, scroll para zoom</small>
              </div>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Usuario</label>
              <input v-model="form.usuario" type="text" required />
            </div>
            <div class="form-group">
              <label>Nombre</label>
              <input v-model="form.nombre" type="text" required />
            </div>
            <div class="form-group">
              <label>Apellido Paterno</label>
              <input v-model="form.apellido_p" type="text" />
            </div>
            <div class="form-group">
              <label>Apellido Materno</label>
              <input v-model="form.apellido_m" type="text" />
            </div>
            <div class="form-group">
              <label>Password</label>
              <input 
                v-model="form.password_hash" 
                :type="editando ? 'password' : 'text'" 
                :placeholder="editando ? 'Dejar vacio para mantener' : ''"
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

        <div class="modal-footer">
          <button class="btn-cancel" @click="cerrarModal">Cancelar</button>
          <button class="btn-save" @click="guardarUsuario">
            {{ editando ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.usuarios-page {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-title {
  color: #f8d667;
  font-size: 1.8rem;
  text-shadow: 2px 2px 0 #000;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.btn-primary {
  background: linear-gradient(180deg, #4ade80 0%, #22c55e 100%);
  border: 2px solid #166534;
  color: #000;
  padding: 0.6rem 1.2rem;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
}

.usuarios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
}

.usuario-card {
  background: linear-gradient(180deg, #2a1807 0%, #1a0f05 100%);
  border: 3px solid #c99234;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  transition: transform 0.2s;
}

.usuario-card:hover {
  transform: translateY(-4px);
}

.avatar-container {
  width: 100px;
  height: 100px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #f8d667;
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
  background: linear-gradient(180deg, #4a3728 0%, #2a1807 100%);
  color: #f8d667;
  font-size: 2.5rem;
  font-weight: 900;
}

.usuario-nombre {
  color: #f8d667;
  font-size: 1.1rem;
  margin-bottom: 0.3rem;
}

.usuario-user {
  color: #a89070;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.tipo-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  background: #3d5a3d;
  color: #4ade80;
  font-size: 0.75rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.tipo-badge.admin {
  background: #5a3d3d;
  color: #f87171;
}

.usuario-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: center;
}

.btn-edit, .btn-delete {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  border: 2px solid;
  cursor: pointer;
  text-transform: uppercase;
}

.btn-edit {
  background: linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%);
  border-color: #1d4ed8;
  color: #000;
}

.btn-delete {
  background: linear-gradient(180deg, #f87171 0%, #dc2626 100%);
  border-color: #991b1b;
  color: #fff;
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  color: #f8d667;
  font-size: 1.2rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: linear-gradient(180deg, #2a1807 0%, #1a0f05 100%);
  border: 3px solid #c99234;
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
  border-bottom: 2px solid #c99234;
}

.modal-header h2 {
  color: #f8d667;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  color: #f8d667;
  font-size: 2rem;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
}

.avatar-upload-section {
  margin-bottom: 1.5rem;
}

.avatar-upload-section label {
  display: block;
  color: #f8d667;
  margin-bottom: 0.5rem;
}

.avatar-dropzone {
  width: 150px;
  height: 150px;
  margin: 0 auto;
  border: 3px dashed #c99234;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}

.avatar-dropzone.dragando {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
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
}

.dropzone-placeholder {
  text-align: center;
  color: #a89070;
  padding: 1rem;
}

.dropzone-placeholder span {
  display: block;
  font-size: 0.9rem;
}

.dropzone-placeholder small {
  display: block;
  font-size: 0.7rem;
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
  color: #f8d667;
  font-size: 0.85rem;
  margin-bottom: 0.3rem;
}

.form-group input,
.form-group select {
  padding: 0.6rem;
  border: 2px solid #4a3728;
  background: #1a0f05;
  color: #f8d667;
  border-radius: 4px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #f8d667;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 2px solid #c99234;
}

.btn-cancel {
  background: #4a3728;
  color: #f8d667;
  border: 2px solid #c99234;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
}

.btn-save {
  background: linear-gradient(180deg, #4ade80 0%, #22c55e 100%);
  border: 2px solid #166534;
  color: #000;
  padding: 0.6rem 1.2rem;
  font-weight: 900;
  cursor: pointer;
}
</style>
