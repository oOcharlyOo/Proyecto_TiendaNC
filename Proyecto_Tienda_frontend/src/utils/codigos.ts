/**
 * Un producto puede tener hasta 3 códigos de barras (empaques distintos del mismo producto).
 * Se guardan en la misma columna `codigoBarras`, separados por coma: "7500810000465,7500810003671".
 * El primero es el principal.
 */
export const MAX_CODIGOS = 3;

/** "a,b" -> ["a","b"] (sin vacíos ni repetidos, máximo 3). */
export function codigosDe(valor: string | null | undefined): string[] {
  const lista = String(valor ?? '').split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
  return [...new Set(lista)].slice(0, MAX_CODIGOS);
}

/** ["a","b"] -> "a,b" ('' si no hay ninguno). */
export function unirCodigos(codigos: string[]): string {
  return codigosDe(codigos.join(",")).join(',');
}

const sinCeros = (c: string) => c.replace(/^0+/, '') || '0';

/** ¿Alguno de los códigos del producto es exactamente `codigo` (ignorando ceros a la izquierda y mayúsculas)? */
export function tieneCodigo(valor: string | null | undefined, codigo: string): boolean {
  const q = codigo.trim().toLowerCase();
  if (!q) return false;
  const qn = sinCeros(q);
  return codigosDe(valor).some(c => c.toLowerCase() === q || sinCeros(c) === qn);
}

/** ¿Alguno de los códigos contiene `texto` (búsqueda parcial) o es exactamente igual? */
export function codigoCoincide(valor: string | null | undefined, texto: string): boolean {
  const q = texto.trim().toLowerCase();
  if (!q) return false;
  return codigosDe(valor).some(c => c.toLowerCase().includes(q)) || tieneCodigo(valor, q);
}

/** Para mostrar: "a · b". */
export function mostrarCodigos(valor: string | null | undefined): string {
  return codigosDe(valor).join(' · ');
}
