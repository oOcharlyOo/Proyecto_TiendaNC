const originalFetch = window.fetch;

window.fetch = async function(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const sucursal = localStorage.getItem('sucursalActiva');

  // Rewrite external API URL to relative for internal routing through nginx
  let urlStr = typeof url === 'string' ? url : url.toString();
  urlStr = urlStr.replace('https://api.laleyendadeldulce.com', '');

  // Para FormData, no tocar headers (el navegador debe auto-generar Content-Type con boundary)
  // Pasar sucursal como query param en su lugar
  if (init?.body instanceof FormData && sucursal) {
    const separator = urlStr.includes('?') ? '&' : '?';
    urlStr += `${separator}sucursal=${encodeURIComponent(sucursal)}`;
    return originalFetch.call(window, urlStr, init);
  }

  const headers = new Headers(init?.headers || {});
  if (sucursal) {
    headers.set('X-Sucursal', sucursal);
  }

  return originalFetch.call(window, urlStr, { ...init, headers });
};

export {};
