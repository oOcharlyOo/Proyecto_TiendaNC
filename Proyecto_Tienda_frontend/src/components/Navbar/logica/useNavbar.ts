import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme, type Theme } from '@/composables/useTheme';
import { usarApariencia } from '@/composables/useApariencia';
import { formatImagenUrl } from '@/utils/imagenUrl';

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
  const { config: apariencia, guardar: guardarApariencia } = usarApariencia();

  /**
   * Selector rapido de tema del menu. Ademas de aplicarlo debe PERSISTIRLO:
   * si solo se cambiaba el atributo/localStorage, al recargar volvia la
   * apariencia guardada y parecia que el tema "no se respetaba".
   */
  async function elegirTema(id: string) {
    const anterior = (apariencia.value?.temaBase || 'classic') as Theme;
    setTheme(id as Theme);
    if (!esAdministrador.value) return;
    const r = await guardarApariencia({
      temaBase: id,
      acento: apariencia.value?.acento || '#f97316',
      fondo: '',
    });
    if (!r.ok) setTheme(anterior);
  }

  const tipoUsuario = computed(() => {
    return Number(localStorage.getItem('tipoUsuario') || 2);
  });

  const esAdministrador = computed(() => tipoUsuario.value === 1);

  const sucursalActiva = computed(() => {
    return localStorage.getItem('sucursalActiva') || 'dulceria';
  });

  const sucursalLabel = computed(() => {
    // Nombre real de la rama: primero el registro del servidor (puede
    // haberse renombrado en el wizard), luego el cacheado en localStorage
    // y al final el slug.
    const { config } = usarApariencia();
    return config.value?.sucursalNombre || localStorage.getItem('sucursalNombre') || sucursalActiva.value;
  });

  const sucursalIcon = computed(() => '🏪');

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
    return formatImagenUrl(url);
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
    elegirTema,
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
