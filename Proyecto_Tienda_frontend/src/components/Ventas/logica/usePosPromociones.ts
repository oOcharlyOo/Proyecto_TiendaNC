import { ref } from 'vue';
import type { ApiRespuesta, PromocionDTO, CrearPromocionDTO } from './usePosTipos';
import { getJson, ticketActual, crearNuevoTicket, mostrarMensaje } from './usePosTicket';
import { playSound } from './usePosSonido';

const promocionesActivas = ref<PromocionDTO[]>([]);

async function apiListarPromociones(): Promise<PromocionDTO[]> {
  const response = await getJson<ApiRespuesta<PromocionDTO[]>>('/promociones/listarPromociones');
  return response?.datos ?? [];
}

async function apiListarPromocionesActivas(): Promise<PromocionDTO[]> {
  const response = await getJson<ApiRespuesta<any[]>>('/promociones/listarActivas');
  const datos = response?.datos ?? [];
  return datos.map((p: any) => ({
    id_promocion: p.idPromocion, nombre: p.nombre || '', descripcion: p.descripcion || '',
    precio_original: Number(p['precio_original']) || 0, precio_promocion: Number(p['precio_promocion']) || 0,
    imagen_url: p['imagen_url'] || null, activa: p.activa ?? true,
    fecha_inicio: p.fechaInicio, fecha_fin: p.fechaFin,
    detalles: (p.detalles || []).map((d: any) => ({
      id_detalle: d.idDetalle, id_producto: d['id_producto'],
      nombre_producto: d.nombreProducto || '', cantidad: Number(d.cantidad) || 0,
      precio_unitario: Number(d.precioUnitario) || 0, subtotal: Number(d.subtotal) || 0
    }))
  }));
}

async function apiCrearPromocion(dto: CrearPromocionDTO): Promise<PromocionDTO | null> {
  const response = await getJson<ApiRespuesta<PromocionDTO>>('/promociones/crear', { method: 'POST', body: JSON.stringify(dto) });
  return response?.datos ?? null;
}

async function apiActualizarPromocion(id: number, dto: CrearPromocionDTO): Promise<PromocionDTO | null> {
  const response = await getJson<ApiRespuesta<PromocionDTO>>(`/promociones/actualizar/${id}`, { method: 'PUT', body: JSON.stringify(dto) });
  return response?.datos ?? null;
}

async function apiEliminarPromocion(id: number): Promise<boolean> {
  const response = await getJson<ApiRespuesta<null>>(`/promociones/eliminar/${id}`, { method: 'DELETE' });
  return response?.codigo === 200;
}

async function apiTogglePromocionActiva(id: number): Promise<PromocionDTO | null> {
  const response = await getJson<ApiRespuesta<PromocionDTO>>(`/promociones/toggleActiva/${id}`, { method: 'PATCH' });
  return response?.datos ?? null;
}

function agregarPromocionAlTicket(promocion: PromocionDTO) {
  if (!ticketActual.value) crearNuevoTicket();
  if (!ticketActual.value) { mostrarMensaje('No se pudo crear el ticket', 'error'); return; }
  const items: any[] = ticketActual.value.items as any[];
  const promoItem: any = {
    id: -(promocion.id_promocion || Date.now()), nombre: promocion.nombre,
    precio: Number(promocion.precio_promocion) || 0, cantidad: 1,
    is_promocion: true, promocion
  };
  const existente = items.find((item: any) => item.is_promocion && item.id === promoItem.id);
  if (existente) { existente.cantidad += 1; mostrarMensaje(`Combo "${promocion.nombre}" agregado al ticket`, 'ok'); }
  else { items.push(promoItem); mostrarMensaje(`Combo "${promocion.nombre}" agregado al ticket`, 'ok'); }
  playSound('add');
}

async function cargarPromocionesActivas() {
  try { promocionesActivas.value = await apiListarPromocionesActivas(); }
  catch (e) { console.error('Error al cargar promociones activas:', e); }
}

export {
  promocionesActivas, apiListarPromociones, apiListarPromocionesActivas,
  apiCrearPromocion, apiActualizarPromocion, apiEliminarPromocion,
  apiTogglePromocionActiva, agregarPromocionAlTicket, cargarPromocionesActivas
};
