/**
 * Sucursal activa del navegador.
 *
 * En el proyecto genérico las sucursales son dinámicas: el valor es el slug
 * que devuelve el registro del backend (GET /sucursales), no una lista fija.
 * Se conserva el soporte del modo ambulante en el header por compatibilidad
 * con el backend, aunque la UI ya no lo expone.
 */
export type Sucursal = string;

const SUCURSAL_KEY = 'sucursalActiva';
const SUCURSAL_NOMBRE_KEY = 'sucursalNombre';

export function useSucursal() {
  function getSucursal(): Sucursal {
    return localStorage.getItem(SUCURSAL_KEY) || 'dulceria';
  }

  function setSucursal(sucursal: Sucursal, nombre?: string) {
    localStorage.setItem(SUCURSAL_KEY, sucursal);
    if (nombre) localStorage.setItem(SUCURSAL_NOMBRE_KEY, nombre);
  }

  function getSucursalNombre(): string {
    return localStorage.getItem(SUCURSAL_NOMBRE_KEY) || getSucursal();
  }

  function clearSucursal() {
    localStorage.removeItem(SUCURSAL_KEY);
    localStorage.removeItem(SUCURSAL_NOMBRE_KEY);
  }

  function isAmbulante(): boolean {
    const s = getSucursal();
    return s === 'ambulante_dulceria' || s === 'ambulante_abarrotera';
  }

  function getOrigen(): string {
    return getSucursal() === 'ambulante_abarrotera' ? 'abarrotera' : 'dulceria';
  }

  function getHeader(): Record<string, string> {
    const header: Record<string, string> = { 'X-Sucursal': getSucursal() };
    if (isAmbulante()) {
      header['X-Ambulante'] = 'true';
      header['X-Sucursal-Origen'] = getOrigen();
    }
    return header;
  }

  function getLabel(): string {
    return getSucursalNombre();
  }

  function getIcon(): string {
    return '🏪';
  }

  return {
    getSucursal,
    setSucursal,
    getSucursalNombre,
    clearSucursal,
    isAmbulante,
    getOrigen,
    getHeader,
    getLabel,
    getIcon
  };
}
