type ApiRespuesta<T> = { codigo: number; mensaje: string; datos: T };
type CategoriaDTO = { idCategoria: number; nombre: string };
type ProductoDTO = {
  idProducto?: number; nombre: string; stock: number; codigoBarras: string | null;
  precio_costo: number; precio_venta: number; cantidad_min: number; cantidad_max: number;
  precio_mayoreo: number | null; is_gramaje: boolean; idCategoria?: number;
};

export type { ApiRespuesta, CategoriaDTO, ProductoDTO };
