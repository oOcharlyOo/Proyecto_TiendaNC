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
    const s = getSucursal();
    if (s === 'abarrotera') return 'Abarrotera';
    if (s === 'ambulante_dulceria') return 'Ambulante (Dulcería)';
    if (s === 'ambulante_abarrotera') return 'Ambulante (Abarrotera)';
    return 'Dulcería';
  }

  function getIcon(): string {
    const s = getSucursal();
    if (s === 'abarrotera') return '🏪';
    if (s === 'ambulante_dulceria' || s === 'ambulante_abarrotera') return '🛺';
    return '🍬';
  }

  return {
    getSucursal,
    setSucursal,
    clearSucursal,
    isAmbulante,
    getOrigen,
    getHeader,
    getLabel,
    getIcon
  };
}
