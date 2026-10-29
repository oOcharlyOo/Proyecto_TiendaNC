import { baseApiActual } from '@/interceptors/sucursal';

/**
 * Convierte una URL de imagen almacenada (MinIO, proxy del backend, ruta
 * relativa o data URL) en una URL que apunte al backend activo.
 *
 * Las imágenes no pasan por el interceptor de fetch, por eso usamos la base
 * activa (localhost o remota) en lugar de la URL fija del build.
 */
export function formatImagenUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const base = baseApiActual();

  if (!url.startsWith('http')) {
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  try {
    const urlObj = new URL(url);

    // Ya viene por el proxy del backend: solo cambiamos el origen.
    if (urlObj.pathname.includes('/imagenes/obtener/')) {
      return `${base}${urlObj.pathname}${urlObj.search}`;
    }

    const partes = urlObj.pathname.split('/').filter(Boolean);
    if (partes.length >= 2) {
      const folder = partes[partes.length - 2];
      const fileName = partes[partes.length - 1];
      return `${base}/imagenes/obtener/${folder}/${fileName}`;
    }

    return url;
  } catch {
    return url;
  }
}
