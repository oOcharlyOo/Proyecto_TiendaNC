import { ref } from 'vue';
import type { ApiRespuesta, Producto } from './usePosTipos';

/**
 * Ofertas para mover productos ATORADOS (sin venta en mucho tiempo y con stock).
 *
 * Cuando se agrega al ticket un producto atorado, se abre un modal con ofertas que el cajero
 * le propone al cliente: 2x1 / "otra por $X" del mismo producto, o "+$X y llévate <otro atorado>".
 * Regla de oro: ninguna pieza se ofrece por debajo de su costo (no se vende con pérdida).
 */

export type ProductoAtorado = {
  idProducto: number;
  nombre: string;
  gramaje: boolean;
  stock: number;
  precioCosto: number;
  precioVenta: number;
  diasSinMovimiento: number | null;
  valorInmovilizado: number;
};

export type Oferta = {
  id: string;
  tipo: 'MISMO' | 'OTRO';
  /** Texto grande: "2x1", "2ª por $8", "+$10". */
  etiqueta: string;
  titulo: string;
  descripcion: string;
  productoId: number;
  nombre: string;
  precioNormal: number;
  /** Lo que se cobra por la pieza extra. */
  precioOferta: number;
  ahorro: number;
  diasSinMovimiento: number | null;
};

/**
 * Cuántas ofertas de "otro producto" preparar como máximo. Son varias porque no a todos
 * los clientes les gusta lo mismo; el modal muestra unas cuantas y el resto con "Ver más".
 */
const MAX_OTROS = 15;
const CACHE_MS = 10 * 60 * 1000;

const atorados = ref<Map<number, ProductoAtorado>>(new Map());
let cargadoEn = 0;
let cargando: Promise<void> | null = null;

const modalOfertaAbierto = ref(false);
const ofertasActuales = ref<Oferta[]>([]);
const productoOferta = ref<{ id: number; nombre: string; diasSinMovimiento: number | null } | null>(null);
const aplicandoOferta = ref(false);


async function cargarAtorados(forzar = false) {
  if (!forzar && Date.now() - cargadoEn < CACHE_MS && atorados.value.size) return;
  if (cargando) return cargando;
  cargando = (async () => {
    try {
      const { getJson } = await import('./usePosTicket');
      const res = await getJson<ApiRespuesta<any[]>>('/inteligencia/atorados');
      const mapa = new Map<number, ProductoAtorado>();
      for (const p of res?.datos ?? []) {
        mapa.set(Number(p.idProducto), {
          idProducto: Number(p.idProducto),
          nombre: p.nombre ?? '',
          gramaje: !!p.gramaje,
          stock: Number(p.stock) || 0,
          precioCosto: Number(p.precioCosto) || 0,
          precioVenta: Number(p.precioVenta) || 0,
          diasSinMovimiento: p.diasSinMovimiento != null ? Number(p.diasSinMovimiento) : null,
          valorInmovilizado: Number(p.valorInmovilizado) || 0,
        });
      }
      atorados.value = mapa;
      cargadoEn = Date.now();
    } catch {
      // Sin datos de inteligencia: simplemente no se ofrecen promociones.
    } finally {
      cargando = null;
    }
  })();
  return cargando;
}

// ------------------------------------------------------------------
// Cálculo de precios (puro, sin estado)
// ------------------------------------------------------------------

/**
 * Precio de la pieza extra: nunca menos del costo, redondeado "bonito" (múltiplo de 5)
 * si así sigue siendo una rebaja real (≤ 70 % del precio). Sin costo conocido: mitad de precio.
 * Devuelve null si no hay una rebaja que valga la pena.
 */
export function precioPiezaExtra(precio: number, costo: number): number | null {
  if (!(precio > 0)) return null;
  let x: number;
  if (costo > 0) {
    const justo = Math.ceil(costo);
    const bonito = Math.ceil(costo / 5) * 5;
    x = bonito <= precio * 0.7 ? bonito : justo;
  } else {
    x = Math.max(1, Math.round(precio * 0.5));
  }
  // Tiene que ser una rebaja de verdad (al menos 10 % y $1).
  if (x > precio * 0.9 || precio - x < 1) return null;
  return x;
}

/** Ofertas posibles al vender `producto` (que es atorado), según el ticket actual. */
export function generarOfertas(
  producto: { id: number; nombre: string; precio: number; stock: number },
  cantidadEnTicket: (id: number) => number,
  tieneOferta: (id: number) => boolean,
  mapaAtorados: Map<number, ProductoAtorado>,
  productosPos: { id: number; nombre: string; precio: number; stock: number; gramaje: boolean; porPaquete: boolean }[],
): Oferta[] {
  const ofertas: Oferta[] = [];
  const at = mapaAtorados.get(producto.id);
  if (!at) return ofertas;

  // 1) Del mismo producto: 2x1 si el precio cubre el costo de las dos piezas; si no, "otra por $X".
  if (!tieneOferta(producto.id) && producto.stock >= cantidadEnTicket(producto.id) + 1) {
    const costo = at.precioCosto;
    if (costo > 0 && producto.precio >= costo * 2) {
      ofertas.push({
        id: `mismo-${producto.id}`, tipo: 'MISMO', etiqueta: '2x1',
        titulo: `2x1 en ${producto.nombre}`,
        descripcion: `Se lleva 2 y paga solo 1 (${fmt(producto.precio)}).`,
        productoId: producto.id, nombre: producto.nombre,
        precioNormal: producto.precio, precioOferta: 0, ahorro: producto.precio,
        diasSinMovimiento: at.diasSinMovimiento,
      });
    } else {
      const x = precioPiezaExtra(producto.precio, costo);
      if (x != null) {
        ofertas.push({
          id: `mismo-${producto.id}`, tipo: 'MISMO', etiqueta: `2ª por ${fmt(x)}`,
          titulo: `Llévate otro ${producto.nombre} por ${fmt(x)}`,
          descripcion: `La segunda pieza a ${fmt(x)} en vez de ${fmt(producto.precio)}.`,
          productoId: producto.id, nombre: producto.nombre,
          precioNormal: producto.precio, precioOferta: x, ahorro: producto.precio - x,
          diasSinMovimiento: at.diasSinMovimiento,
        });
      }
    }
  }

  // 2) Otro producto atorado por unos pesos más (primero los que más dinero tienen detenido).
  const porId = new Map(productosPos.map(p => [p.id, p]));
  for (const otro of mapaAtorados.values()) {
    if (ofertas.filter(o => o.tipo === 'OTRO').length >= MAX_OTROS) break;
    if (otro.idProducto === producto.id || otro.gramaje) continue;
    const pos = porId.get(otro.idProducto);
    // Los que se venden sueltos o por paquete (tenedores, cigarros…) no se regalan de a uno.
    if (!pos || pos.gramaje || pos.porPaquete || !(pos.precio > 0)) continue;
    if (tieneOferta(pos.id) || pos.stock < cantidadEnTicket(pos.id) + 1) continue;
    const x = precioPiezaExtra(pos.precio, otro.precioCosto);
    if (x == null) continue;
    ofertas.push({
      id: `otro-${pos.id}`, tipo: 'OTRO', etiqueta: `+${fmt(x)}`,
      titulo: `Por ${fmt(x)} más llévate ${pos.nombre}`,
      descripcion: `Precio normal ${fmt(pos.precio)}.`,
      productoId: pos.id, nombre: pos.nombre,
      precioNormal: pos.precio, precioOferta: x, ahorro: pos.precio - x,
      diasSinMovimiento: otro.diasSinMovimiento,
    });
  }
  return ofertas;
}

function fmt(v: number) {
  return Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`;
}

/**
 * Productos con precio de mayoreo: en la tienda el mayoreo se usa para vender el paquete
 * completo (bolsa de tenedores, cajetilla) y sin él se venden sueltos. No tiene sentido
 * ofrecer una pieza suelta, así que quedan fuera de las ofertas.
 */
function seVendePorPaquete(p: { precio_mayoreo?: number | null; dto?: any }): boolean {
  const mayoreo = Number(p.precio_mayoreo ?? p.dto?.precio_mayoreo ?? p.dto?.precioMayoreo ?? 0);
  return mayoreo > 0;
}

// ------------------------------------------------------------------
// Flujo en el punto de venta
// ------------------------------------------------------------------

/** Se llama después de agregar un producto al ticket. Si es atorado, abre el modal de ofertas. */
async function evaluarOfertaAtorado(producto: Producto) {
  if (modalOfertaAbierto.value || producto.is_gramaje || seVendePorPaquete(producto)) return;
  await cargarAtorados();
  if (!atorados.value.has(producto.id)) return;

  const { ticketActual } = await import('./usePosTicket');
  const { productos } = await import('./usePosProductos');
  const ticket = ticketActual.value;
  if (!ticket) return;

  const items = ticket.items as any[];
  // Si ya hay una oferta activa que salió de este producto, no se vuelve a preguntar.
  // Si el cajero la quitó (o la rechazó), al escanear otra vez se vuelve a ofrecer.
  if (items.some(i => i.oferta?.origenId === producto.id)) return;
  const linea = (id: number) => items.find(i => !i.is_promocion && i.id === id);
  const lineaProducto = linea(producto.id);
  const precioActual = Number(lineaProducto?.oferta?.precioNormal ?? lineaProducto?.precio ?? producto.precio) || 0;

  const ofertas = generarOfertas(
    { id: producto.id, nombre: producto.nombre, precio: precioActual, stock: Number(producto.dto?.stock ?? 0) },
    (id) => Number(linea(id)?.cantidad ?? 0),
    (id) => !!linea(id)?.oferta,
    atorados.value,
    productos.value.map(p => ({
      id: p.id, nombre: p.nombre, precio: Number(p.precio) || 0,
      stock: Number(p.dto?.stock ?? 0), gramaje: !!p.is_gramaje, porPaquete: seVendePorPaquete(p),
    })),
  );
  if (!ofertas.length) return;

  productoOferta.value = { id: producto.id, nombre: producto.nombre, diasSinMovimiento: atorados.value.get(producto.id)?.diasSinMovimiento ?? null };
  ofertasActuales.value = ofertas;
  modalOfertaAbierto.value = true;
}

/** Aplica la oferta elegida al ticket (misma línea si el producto ya está; si no, una nueva). */
async function aceptarOferta(oferta: Oferta) {
  if (aplicandoOferta.value) return;
  aplicandoOferta.value = true;
  const { ticketActual, crearDetalleVenta, mostrarMensaje } = await import('./usePosTicket');
  const { productos } = await import('./usePosProductos');
  const { playSound } = await import('./usePosSonido');
  try {
    const ticket = ticketActual.value;
    if (!ticket) return;
    const items = ticket.items as any[];
    let item = items.find(i => !i.is_promocion && i.id === oferta.productoId);
    const stock = Number((item ?? productos.value.find(p => p.id === oferta.productoId))?.dto?.stock ?? 0);
    if (stock < Number(item?.cantidad ?? 0) + 1) {
      mostrarMensaje(`Ya no hay stock de ${oferta.nombre} para la oferta.`, 'error');
      return;
    }

    if (item) {
      const anterior = { cantidad: item.cantidad, precio: item.precio, oferta: item.oferta };
      item.oferta = {
        piezas: 1, precioOferta: oferta.precioOferta, precioNormal: oferta.precioNormal,
        etiqueta: oferta.etiqueta, origenId: productoOferta.value?.id,
        // 2x1 / "2ª por $X": si se quita la pieza que se paga, la oferta deja de aplicar.
        minimoNormal: oferta.tipo === 'MISMO' ? 1 : 0,
      };
      item.cantidad += 1;
      try { await crearDetalleVenta(ticket.id, item); }
      catch (e) { Object.assign(item, anterior); if (!anterior.oferta) delete item.oferta; throw e; }
    } else {
      const p = productos.value.find(x => x.id === oferta.productoId);
      if (!p) { mostrarMensaje(`No se encontró ${oferta.nombre}.`, 'error'); return; }
      items.push({
        ...p, cantidad: 1, envase_aplicado: false, cantidad_envase: 1,
        oferta: {
          piezas: 1, precioOferta: oferta.precioOferta, precioNormal: oferta.precioNormal,
          etiqueta: oferta.etiqueta, minimoNormal: 0, origenId: productoOferta.value?.id,
        },
      });
      item = items[items.length - 1];
      try { await crearDetalleVenta(ticket.id, item); }
      catch (e) { items.pop(); throw e; }
    }

    mostrarMensaje(`Oferta aplicada: ${oferta.titulo}`, 'ok');
    playSound('add');
    cerrarOferta();
  } catch (e) {
    const { mostrarMensaje: msg } = await import('./usePosTicket');
    msg(`No se pudo aplicar la oferta: ${e instanceof Error ? e.message : 'error'}`, 'error');
  } finally {
    aplicandoOferta.value = false;
  }
}

/**
 * Quita la oferta de un renglón del ticket: se retiran las piezas de oferta y el resto vuelve
 * a precio normal. Si el renglón solo existía por la oferta, se elimina.
 */
async function quitarOferta(item: any) {
  const o = item?.oferta;
  if (!o) return;
  const { ticketActual, crearDetalleVenta, quitarItem, mostrarMensaje } = await import('./usePosTicket');
  const ticket = ticketActual.value;
  if (!ticket) return;
  const restantes = item.cantidad - o.piezas;
  if (restantes <= 0) {
    await quitarItem(item.id);
  } else {
    const anterior = { cantidad: item.cantidad, precio: item.precio, oferta: o };
    item.cantidad = restantes;
    item.precio = o.precioNormal;
    delete item.oferta;
    try { await crearDetalleVenta(ticket.id, item); }
    catch { Object.assign(item, anterior); mostrarMensaje('No se pudo quitar la oferta.', 'error'); return; }
  }
  mostrarMensaje('Oferta quitada.', 'info');
}

function cerrarOferta() {
  modalOfertaAbierto.value = false;
  ofertasActuales.value = [];
  productoOferta.value = null;
}

export {
  atorados, modalOfertaAbierto, ofertasActuales, productoOferta, aplicandoOferta,
  cargarAtorados, evaluarOfertaAtorado, aceptarOferta, quitarOferta, cerrarOferta,
};
