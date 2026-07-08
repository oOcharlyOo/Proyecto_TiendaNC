import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from '@/composables/useTheme';

const AUTH_KEY = 'isAuth';
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

const menuAbierto = ref(false);
const syncLoading = ref(false);
const syncMessage = ref('');
const syncDirection = ref<'abarrotera' | 'dulceria' | null>(null);

export function useNavbar() {
  const route = useRoute();
  const router = useRouter();
  const { currentTheme, setTheme, toggleTheme } = useTheme();

  const tipoUsuario = computed(() => {
    return Number(localStorage.getItem('tipoUsuario') || 2);
  });

  const esAdministrador = computed(() => tipoUsuario.value === 1);

  const sucursalActiva = computed(() => {
    return localStorage.getItem('sucursalActiva') || 'dulceria';
  });

  const sucursalLabel = computed(() => {
    return sucursalActiva.value === 'abarrotera' ? 'Abarrotera' : 'Dulceria';
  });

  const sucursalIcon = computed(() => {
    return sucursalActiva.value === 'abarrotera' ? '🏪' : '🍬';
  });

  async function sincronizarUsuarios(direccion: 'abarrotera' | 'dulceria') {
    if (syncLoading.value) return;
    syncLoading.value = true;
    syncDirection.value = direccion;
    syncMessage.value = '';
    try {
      const endpoint = direccion === 'abarrotera' ? 'sincronizarAbarrotera' : 'sincronizarDulceria';
      const res = await fetch(`${API_BASE}/usuarios/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.codigo === 200) {
        syncMessage.value = data.mensaje;
      } else {
        syncMessage.value = data.mensaje || 'Error al sincronizar.';
      }
    } catch (e) {
      syncMessage.value = 'Error de conexion al sincronizar.';
    } finally {
      syncLoading.value = false;
      syncDirection.value = null;
      setTimeout(() => { syncMessage.value = ''; }, 5000);
    }
  }

  const avatarUsuario = computed(() => {
    const avatar = localStorage.getItem('avatarUsuario');
    return formatAvatarUrl(avatar);
  });

  function formatAvatarUrl(url: string | null): string | undefined {
    if (!url) return undefined;
    if (url.startsWith('data:')) return url;

    if (url.startsWith('http')) {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const fileName = path.split('/').pop();
      const folder = path.split('/').slice(-2, -1)[0];
      if (fileName && folder) {
        return `${API_BASE}/imagenes/obtener/${folder}/${fileName}`;
      }
      return url;
    }
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  const nombreUsuario = computed(() => {
    return localStorage.getItem('nombreUsuario') || 'Usuario';
  });

  const links = computed(() => {
    const linksBase = [
      { to: '/ventas', label: 'Ventas', adminOnly: false, icon: 'sword' },
      { to: '/productos', label: 'Productos', adminOnly: false, icon: 'potion' },
      { to: '/usuarios', label: 'Usuarios', adminOnly: false, icon: 'hero' },
      { to: '/inventario', label: 'Inventario', adminOnly: true, icon: 'chest' },
      { to: '/corte', label: 'Corte', adminOnly: false, icon: 'rupee' },
      { to: '/rental', label: 'Rental', adminOnly: false, icon: 'clock' },
      { to: '/finanzas', label: 'Finanzas', adminOnly: true, icon: 'triforce' }
    ];
    return linksBase.filter(l => !l.adminOnly || esAdministrador.value);
  });

  function toggleMenu() {
    menuAbierto.value = !menuAbierto.value;
  }

  function cerrarMenu() {
    menuAbierto.value = false;
  }

  function cerrarSesion() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem('tipoUsuario');
    localStorage.removeItem('sucursalActiva');
    menuAbierto.value = false;
    router.push('/');
  }

  return {
    route,
    router,
    menuAbierto,
    currentTheme,
    setTheme,
    toggleTheme,
    syncLoading,
    syncMessage,
    syncDirection,
    tipoUsuario,
    esAdministrador,
    sucursalActiva,
    sucursalLabel,
    sucursalIcon,
    sincronizarUsuarios,
    avatarUsuario,
    formatAvatarUrl,
    nombreUsuario,
    links,
    toggleMenu,
    cerrarMenu,
    cerrarSesion
  };
}
