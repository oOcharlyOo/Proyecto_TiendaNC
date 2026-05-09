const originalFetch = window.fetch;

window.fetch = async function(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  
  const sucursal = localStorage.getItem('sucursalActiva');
  if (sucursal) {
    headers.set('X-Sucursal', sucursal);
  }
  
  const newInit: RequestInit = {
    ...init,
    headers
  };
  
  return originalFetch.call(window, url, newInit);
};

export {};
