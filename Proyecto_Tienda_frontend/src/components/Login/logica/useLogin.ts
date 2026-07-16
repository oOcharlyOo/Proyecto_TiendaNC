import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from '@/composables/useTheme';
import { useSucursal, type Sucursal } from '@/composables/useSucursal';

const AUTH_KEY = 'isAuth';
const AUTH_USER_ID_KEY = 'idUsuario';
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const name = ref('');
const pass = ref('');
const sucursalSeleccionada = ref<Sucursal>('dulceria');
const toastContainer = ref<HTMLElement | null>(null);
const modalMontoInicialAbierto = ref(false);
const idUsuarioActual = ref<number | null>(null);

export function useLogin() {
  const router = useRouter();
  const { currentTheme, setTheme } = useTheme();
  const { setSucursal, getHeader } = useSucursal();

  function seleccionarSucursal(sucursal: Sucursal) {
    sucursalSeleccionada.value = sucursal;
  }

  async function iniciarSesion() {
    const usuarioDTO = { usuario: name.value, password_hash: pass.value };
    try {
      const resLogin = await fetch(`${API_BASE}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeader() },
        body: JSON.stringify(usuarioDTO)
      });
      const usuario = await resLogin.json();
      if (usuario.codigo === 200) {
        localStorage.setItem(AUTH_KEY, 'true');
        setSucursal(sucursalSeleccionada.value);
        if (usuario?.datos?.idUsuario) {
          const userId = usuario.datos.idUsuario;
          localStorage.setItem(AUTH_USER_ID_KEY, String(userId));
          const nombreCompleto = `${usuario.datos.nombre || ''} ${usuario.datos.apellido_p || ''}`.trim();
          localStorage.setItem('nombreUsuario', nombreCompleto || 'Usuario');
          localStorage.setItem('tipoUsuario', String(usuario.datos.id_tipo_usuario || 2));
          if (usuario.datos.avatar) localStorage.setItem('avatarUsuario', usuario.datos.avatar);
          localStorage.setItem('horaInicioSesion', new Date().toISOString());
          idUsuarioActual.value = userId;
          await verificarCajaActiva(userId);
        }
      } else {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(AUTH_USER_ID_KEY);
        mostrarToast(usuario.mensaje || 'Credenciales no validas', 'error');
      }
    } catch (err) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_USER_ID_KEY);
      mostrarToast('El servidor no responde.', 'error');
      console.error(err);
    }
  }

  async function verificarCajaActiva(idUsuario: number) {
    try {
      const res = await fetch(`${API_BASE}/caja/apertura/activa?idUsuario=${idUsuario}`, { headers: getHeader() });
      const data = await res.json();
      if (res.ok && data.datos !== null) {
        localStorage.setItem('montoInicialCaja', String(data.datos.monto));
        mostrarToast('Bienvenido, heroe.', 'success');
        setTimeout(() => router.push('/ventas'), 500);
      } else {
        modalMontoInicialAbierto.value = true;
      }
    } catch (err) {
      console.error('Error al verificar caja activa:', err);
      mostrarToast('Bienvenido, heroe.', 'success');
      setTimeout(() => router.push('/ventas'), 500);
    }
  }

  async function registrarMontoInicial(payload: { montoInicial: number }) {
    if (!idUsuarioActual.value) return;
    if (payload.montoInicial === 0) {
      localStorage.setItem('montoInicialCaja', '0');
      localStorage.setItem('modoReportes', 'true');
      modalMontoInicialAbierto.value = false;
      mostrarToast('Modo reportes activado.', 'success');
      setTimeout(() => router.push('/ventas'), 500);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/caja/apertura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeader() },
        body: JSON.stringify({ idUsuario: idUsuarioActual.value, montoInicial: payload.montoInicial })
      });
      const data = await res.json();
      if (res.ok && data.codigo === 200) {
        localStorage.setItem('montoInicialCaja', String(payload.montoInicial));
        localStorage.setItem('modoReportes', 'false');
        modalMontoInicialAbierto.value = false;
        mostrarToast('Caja iniciada. Bienvenido, heroe.', 'success');
        setTimeout(() => router.push('/ventas'), 500);
      } else {
        mostrarToast(data.mensaje || 'Error al iniciar caja', 'error');
      }
    } catch (err) {
      console.error('Error al registrar monto inicial:', err);
      mostrarToast('Error de conexion.', 'error');
    }
  }

  function cerrarModalMontoInicial() {
    modalMontoInicialAbierto.value = false;
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_USER_ID_KEY);
    const { clearSucursal } = useSucursal();
    clearSucursal();
    idUsuarioActual.value = null;
    name.value = '';
    pass.value = '';
  }

  function mostrarToast(mensaje: string, type: 'success' | 'error' = 'success') {
    if (!toastContainer.value) return;
    const toast = document.createElement('div');
    toast.innerText = mensaje;
    toast.classList.add('toast-message');
    toast.classList.add(type === 'success' ? 'toast-success' : 'toast-error');
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'opacity 0.5s, transform 0.5s';
    toastContainer.value.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.addEventListener('transitionend', () => toast.remove());
    }, 1000);
  }

  return {
    name, pass, sucursalSeleccionada, toastContainer,
    modalMontoInicialAbierto, idUsuarioActual,
    currentTheme, setTheme,
    seleccionarSucursal, iniciarSesion, verificarCajaActiva,
    registrarMontoInicial, cerrarModalMontoInicial, mostrarToast
  };
}
