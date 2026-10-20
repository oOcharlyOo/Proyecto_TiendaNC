type ApiRespuesta<T> = { codigo: number; mensaje: string; datos: T };
type CategoriaDTO = { idCategoria: number; nombre: string };
type ProductoDTO = {
  idProducto?: number; nombre: string; stock: number; codigoBarras: string | null;
  precio_costo: number; precio_venta: number; cantidad_min: number; cantidad_max: number;
  precio_mayoreo: number | null; is_gramaje: boolean; idCategoria?: number;
  /** 'A' = activo, 'I' = inactivo (borrado lógico). */
  estatus?: string;
  /** ISO datetime del último movimiento (venta o pedido recibido). null = nunca. undefined = backend sin este dato. */
  fecha_ultimo_movimiento?: string | null;
  /** Días desde el último movimiento. null = nunca. undefined = backend sin este dato. */
  dias_sin_movimiento?: number | null;
};
type ResumenInventarioDTO = {
  totalItems: number; bajoStock: number; productosAgotados: number;
  costoTotal: number; gananciaPot: number;
};
type PaginatedResponse<T> = {
  content: T[]; page: number; size: number; totalElements: number; totalPages: number;
};

export type { ApiRespuesta, CategoriaDTO, ProductoDTO, ResumenInventarioDTO, PaginatedResponse };
