export type Sucursal = 'dulceria' | 'abarrotera' | 'ambulante_dulceria' | 'ambulante_abarrotera';

const SUCURSAL_KEY = 'sucursalActiva';

export function useSucursal() {
  function getSucursal(): Sucursal {
    return (localStorage.getItem(SUCURSAL_KEY) as Sucursal) || 'dulceria';
  }

  function setSucursal(sucursal: Sucursal) {
    localStorage.setItem(SUCURSAL_KEY, sucursal);
  }

  function clearSucursal() {
    localStorage.removeItem(SUCURSAL_KEY);
  }

  function getHeader(): Record<string, string> {
    return { 'X-Sucursal': getSucursal() };
  }

  function getLabel(): string {
    return getSucursal() === 'abarrotera' ? 'Abarrotera' : 'Dulcería';
  }

  function getIcon(): string {
    return getSucursal() === 'abarrotera' ? '🏪' : '🍬';
  }

  return {
    getSucursal,
    setSucursal,
    clearSucursal,
    getHeader,
    getLabel,
    getIcon
  };
}
