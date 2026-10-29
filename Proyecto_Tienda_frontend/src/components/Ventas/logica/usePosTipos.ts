type ApiRespuesta<T> = {
  codigo: number;
  mensaje: string;
  datos: T;
};

type ProductoDTO = {
  idProducto: number;
  nombre: string;
  precio_venta: number | string;
  precio_mayoreo?: number | string | null;
  codigoBarras: string;
  stock?: number;
  is_gramaje?: boolean;
  idCategoria?: number;
  requiere_envase?: boolean;
  precio_envase?: number;
};

type UsuarioDTO = {
  idUsuario: number;
  nombre?: string;
};

type VentaDTO = {
  idVenta: number;
  idUsuario?: number;
  usuario: UsuarioDTO;
  nombreUsuario?: string;
  montoTotal?: number | string;
  estatus?: string;
  numeroTicket?: number;
  metodoPago?: string;
  fechaVenta?: string;
  tieneDiscrepancia?: boolean;
  ganancia?: number | string;
};

type VentaDetalleDTO = {
  idVentaDetalle?: number;
  cantidad: number;
  precioUnitarioVenta: number;
  producto?: ProductoDTO;
  Producto?: ProductoDTO;
  idProducto?: number;
  tipoPrecioAplicado?: string;
  Venta?: {
    idVenta: number;
  };
};

type VentaPendienteDTO = VentaDTO;

type Producto = {
  id: number;
  nombre: string;
  codigo_barras: string | null;
  precio: number;
  precio_mayoreo?: number | null;
  dto: ProductoDTO;
  is_gramaje?: boolean;
  idCategoria?: number;
  idProducto?: number;
  precio_venta?: number;
  requiere_envase?: boolean;
  precio_envase?: number;
};

type TicketItem = Producto & {
  cantidad: number;
  idVentaDetalle?: number;
  is_mayoreo?: boolean;
  is_promocion?: boolean;
  promocion?: never;
  productoId?: number;
  requiere_envase?: boolean;
  precio_envase?: number;
  envase_aplicado?: boolean;
  cantidad_envase?: number;
};

type TicketItemPromocion = {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  is_promocion: true;
  promocion: PromocionDTO;
  idVentaDetalle?: number;
};

type Ticket = {
  id: number;
  numero: number;
  items: (TicketItem | TicketItemPromocion)[];
  estado: 'pendiente' | 'completado';
  creadoEn: number;
  desdeBackend?: boolean;
  nombreUsuario?: string;
};

type PromocionDetalleDTO = {
  id_detalle: number;
  id_producto: number;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

type PromocionDTO = {
  id_promocion: number;
  nombre: string;
  descripcion: string;
  precio_original: number;
  precio_promocion: number;
  imagen_url: string | null;
  detalles: PromocionDetalleDTO[];
  activa: boolean;
};

type CrearPromocionDTO = {
  nombre: string;
  descripcion: string;
  precio_promocion: number;
  imagen_url: string | null;
  activa: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  productos: { id_producto: number; cantidad: number }[];
};

export function asAny(item: TicketItem | TicketItemPromocion): any {
  return item;
}

export type {
  ApiRespuesta,
  ProductoDTO,
  UsuarioDTO,
  VentaDTO,
  VentaDetalleDTO,
  VentaPendienteDTO,
  Producto,
  TicketItem,
  TicketItemPromocion,
  Ticket,
  PromocionDetalleDTO,
  PromocionDTO,
  CrearPromocionDTO
};
