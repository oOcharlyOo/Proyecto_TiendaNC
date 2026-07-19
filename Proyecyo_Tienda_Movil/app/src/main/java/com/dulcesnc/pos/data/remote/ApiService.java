package com.dulcesnc.pos.data.remote;

import com.dulcesnc.pos.data.remote.dto.ApiResponse;
import com.dulcesnc.pos.data.remote.dto.ApartadoDTO;
import com.dulcesnc.pos.data.remote.dto.CajaAperturaDTO;
import com.dulcesnc.pos.data.remote.dto.CorteDTO;
import com.dulcesnc.pos.data.remote.dto.CrearApartadoDTO;
import com.dulcesnc.pos.data.remote.dto.CrearCreditoVentaDTO;
import com.dulcesnc.pos.data.remote.dto.CrearPromocionDTO;
import com.dulcesnc.pos.data.remote.dto.CreditoAbonoDTO;
import com.dulcesnc.pos.data.remote.dto.CreditoPersonaDTO;
import com.dulcesnc.pos.data.remote.dto.CreditoVentaDTO;
import com.dulcesnc.pos.data.remote.dto.EntradaSalidaDTO;
import com.dulcesnc.pos.data.remote.dto.HistorialDiaDTO;
import com.dulcesnc.pos.data.remote.dto.LoginRequest;
import com.dulcesnc.pos.data.remote.dto.PedidoProveedorDTO;
import com.dulcesnc.pos.data.remote.dto.ProductoDTO;
import com.dulcesnc.pos.data.remote.dto.PromocionDTO;
import com.dulcesnc.pos.data.remote.dto.ProveedorDTO;
import com.dulcesnc.pos.data.remote.dto.SincronizacionMovilDTO;
import com.dulcesnc.pos.data.remote.dto.UsuarioDTO;
import com.dulcesnc.pos.data.remote.dto.VentaDetalleDTO;
import com.dulcesnc.pos.data.remote.dto.VentaRequestDTO;

import java.util.List;
import java.util.Map;

import io.reactivex.rxjava3.core.Single;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.PATCH;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface ApiService {

    // --- Usuarios ---
    @POST("usuarios/login")
    Single<ApiResponse<UsuarioDTO>> login(@Body LoginRequest request);

    @GET("usuarios/listarUsuarios")
    Single<ApiResponse<List<UsuarioDTO>>> listarUsuarios();

    @POST("usuarios/agregarUsuario")
    Single<ApiResponse<UsuarioDTO>> agregarUsuario(@Body UsuarioDTO usuario);

    @POST("usuarios/actualizarUsuario/{id}")
    Single<ApiResponse<UsuarioDTO>> actualizarUsuario(@Path("id") Long id, @Body UsuarioDTO usuario);

    @DELETE("usuarios/eliminarUsuario/{id}")
    Single<ApiResponse<UsuarioDTO>> eliminarUsuario(@Path("id") Long id);

    // --- Productos / Categorias / Subcategorias ---
    @GET("productos/listarProductos")
    Single<ApiResponse<List<ProductoDTO>>> listarProductos();

    @POST("productos/agregarProducto")
    Single<ApiResponse<ProductoDTO>> agregarProducto(@Body ProductoDTO producto);

    @PUT("productos/actualizarProducto/{id}")
    Single<ApiResponse<ProductoDTO>> actualizarProducto(@Path("id") Long id, @Body ProductoDTO producto);

    @DELETE("productos/eliminarProducto/{id}")
    Single<ApiResponse<Void>> eliminarProducto(@Path("id") Long id);

    @PUT("productos/actualizarCategoriaMasiva")
    Single<ApiResponse<Integer>> actualizarCategoriaMasiva(@Body Map<String, Object> cuerpo);

    @PUT("productos/vaciarInventario")
    Single<ApiResponse<Integer>> vaciarInventario();

    @GET("productos/buscarPorCodigoBarras/{codigo}")
    Single<ApiResponse<ProductoDTO>> buscarPorCodigoBarras(@Path("codigo") String codigo);

    @GET("productos/buscar")
    Single<ApiResponse<List<ProductoDTO>>> buscarProductos(@Query("nombre") String nombre);

    @GET("categorias/listarCategorias")
    Single<ApiResponse<List<com.dulcesnc.pos.data.remote.dto.CategoriaDTO>>> listarCategorias();

    @POST("categorias/agregarCategoria")
    Single<ApiResponse<com.dulcesnc.pos.data.remote.dto.CategoriaDTO>> agregarCategoria(
            @Body com.dulcesnc.pos.data.remote.dto.CategoriaDTO categoria);

    @PUT("categorias/actualizarCategoria/{id}")
    Single<ApiResponse<com.dulcesnc.pos.data.remote.dto.CategoriaDTO>> actualizarCategoria(
            @Path("id") Long id, @Body com.dulcesnc.pos.data.remote.dto.CategoriaDTO categoria);

    @DELETE("categorias/eliminarCategoria/{id}")
    Single<ApiResponse<com.dulcesnc.pos.data.remote.dto.CategoriaDTO>> eliminarCategoria(@Path("id") Long id);

    @GET("subcategorias/listarSubcategorias")
    Single<ApiResponse<List<com.dulcesnc.pos.data.remote.dto.SubcategoriaDTO>>> listarSubcategorias();

    @POST("subcategorias/agregarSubcategoria")
    Single<ApiResponse<com.dulcesnc.pos.data.remote.dto.SubcategoriaDTO>> agregarSubcategoria(
            @Body com.dulcesnc.pos.data.remote.dto.SubcategoriaDTO subcategoria);

    @PUT("subcategorias/actualizarSubcategoria/{id}")
    Single<ApiResponse<com.dulcesnc.pos.data.remote.dto.SubcategoriaDTO>> actualizarSubcategoria(
            @Path("id") Long id, @Body com.dulcesnc.pos.data.remote.dto.SubcategoriaDTO subcategoria);

    @DELETE("subcategorias/eliminarSubcategoria/{id}")
    Single<ApiResponse<com.dulcesnc.pos.data.remote.dto.SubcategoriaDTO>> eliminarSubcategoria(@Path("id") Long id);

    // --- Ventas ---
    @POST("ventas/agregarVenta")
    Single<ApiResponse<VentaRequestDTO>> agregarVenta(@Body VentaRequestDTO venta);

    @GET("ventas/siguienteNumeroTicket")
    Single<ApiResponse<Integer>> siguienteNumeroTicket();

    @GET("ventas/buscarVentasPendientes")
    Single<ApiResponse<List<VentaRequestDTO>>> buscarVentasPendientes(@Query("idUsuario") Long idUsuario);

    @GET("ventas/buscarVentasEnProceso")
    Single<ApiResponse<List<VentaRequestDTO>>> buscarVentasEnProceso();

    @GET("ventas/historialDia/{fecha}")
    Single<ApiResponse<HistorialDiaDTO>> historialDia(@Path("fecha") String fecha);

    @PUT("ventas/actualizarVenta/{id}")
    Single<ApiResponse<VentaRequestDTO>> actualizarVenta(@Path("id") Long id, @Body VentaRequestDTO venta);

    @PUT("ventas/cancelarVenta/{id}")
    Single<ApiResponse<VentaRequestDTO>> cancelarVenta(@Path("id") Long id);

    @DELETE("ventas/eliminarVenta/{id}")
    Single<ApiResponse<VentaRequestDTO>> eliminarVenta(@Path("id") Long id);

    @PUT("ventas/completarVenta/{id}")
    Single<ApiResponse<VentaRequestDTO>> completarVenta(@Path("id") Long id,
                                                      @Query("montoTotal") Double montoTotal,
                                                      @Query("metodoPago") String metodoPago);

    @PUT("ventas/marcarPendiente/{id}")
    Single<ApiResponse<VentaRequestDTO>> marcarPendiente(@Path("id") Long id,
                                                        @Query("descripcion") String descripcion);

    @PUT("ventas/cobrarVentaPendiente/{idVenta}")
    Single<ApiResponse<VentaRequestDTO>> cobrarVentaPendiente(@Path("idVenta") Long idVenta,
                                                            @Query("idUsuario") Long idUsuario,
                                                            @Query("metodoPago") String metodoPago,
                                                            @Query("montoTotal") Double montoTotal);

    @PUT("ventas/agregarProductosAPendiente/{idVenta}")
    Single<ApiResponse<VentaRequestDTO>> agregarProductosAPendiente(@Path("idVenta") Long idVenta,
                                                                  @Body List<VentaDetalleDTO> detalles);

    // --- Ventas Detalle ---
    @POST("ventasDetalle/agregarVentaDetalle")
    Single<ApiResponse<VentaDetalleDTO>> agregarVentaDetalle(@Body VentaDetalleDTO detalle);

    @PUT("ventasDetalle/actualizarVentaDetalle/{id}")
    Single<ApiResponse<VentaDetalleDTO>> actualizarVentaDetalle(@Path("id") Long id,
                                                              @Body VentaDetalleDTO detalle);

    @DELETE("ventasDetalle/eliminarVentaDetalle/{id}")
    Single<ApiResponse<VentaDetalleDTO>> eliminarVentaDetalle(@Path("id") Long id);

    @GET("ventasDetalle/porVenta/{idVenta}")
    Single<ApiResponse<List<VentaDetalleDTO>>> ventaDetallePorVenta(@Path("idVenta") Long idVenta);

    @POST("ventasDetalle/calcularGramaje")
    Single<ApiResponse<Map<String, Double>>> calcularGramaje(@Body Map<String, Object> request);

    // --- Credito ---
    @GET("credito/persona")
    Single<ApiResponse<List<CreditoPersonaDTO>>> listarPersonasCredito();

    @POST("credito/persona")
    Single<ApiResponse<CreditoPersonaDTO>> crearPersonaCredito(@Body CreditoPersonaDTO persona);

    @PUT("credito/persona/{id}")
    Single<ApiResponse<CreditoPersonaDTO>> actualizarPersonaCredito(@Path("id") Long id,
                                                                   @Body CreditoPersonaDTO persona);

    @DELETE("credito/persona/{id}")
    Single<ApiResponse<CreditoPersonaDTO>> eliminarPersonaCredito(@Path("id") Long id);

    @GET("credito/venta/activos")
    Single<ApiResponse<List<CreditoVentaDTO>>> creditosActivos();

    @POST("credito/venta")
    Single<ApiResponse<CreditoVentaDTO>> crearCreditoVenta(@Query("idUsuario") Long idUsuario,
                                                           @Body CrearCreditoVentaDTO cuerpo);

    @GET("credito/venta")
    Single<ApiResponse<List<CreditoVentaDTO>>> listarCreditosVenta();

    @GET("credito/abono/{idCreditoVenta}")
    Single<ApiResponse<List<CreditoAbonoDTO>>> abonosCredito(@Path("idCreditoVenta") Long idCreditoVenta);

    @POST("credito/abono/{idCreditoVenta}")
    Single<ApiResponse<CreditoAbonoDTO>> crearAbono(@Path("idCreditoVenta") Long idCreditoVenta,
                                                   @Query("monto") Double monto,
                                                   @Query("idUsuario") Long idUsuario,
                                                   @Query("metodoPago") String metodoPago);

    // --- Promociones ---
    @GET("promociones/listarPromociones")
    Single<ApiResponse<List<PromocionDTO>>> listarPromociones();

    @GET("promociones/listarActivas")
    Single<ApiResponse<List<PromocionDTO>>> listarPromocionesActivas();

    @POST("promociones/crear")
    Single<ApiResponse<PromocionDTO>> crearPromocion(@Body CrearPromocionDTO promocion);

    @PUT("promociones/actualizar/{id}")
    Single<ApiResponse<PromocionDTO>> actualizarPromocion(@Path("id") Long id,
                                                         @Body CrearPromocionDTO promocion);

    @DELETE("promociones/eliminar/{id}")
    Single<ApiResponse<Void>> eliminarPromocion(@Path("id") Long id);

    @PATCH("promociones/toggleActiva/{id}")
    Single<ApiResponse<PromocionDTO>> toggleActivaPromocion(@Path("id") Long id);

    // --- Proveedores ---
    @GET("proveedores/listar")
    Single<ApiResponse<List<ProveedorDTO>>> listarProveedores();

    @POST("proveedores/agregar")
    Single<ApiResponse<ProveedorDTO>> crearProveedor(@Body ProveedorDTO proveedor);

    @PUT("proveedores/actualizar/{id}")
    Single<ApiResponse<ProveedorDTO>> actualizarProveedor(@Path("id") Long id,
                                                        @Body ProveedorDTO proveedor);

    @DELETE("proveedores/eliminar/{id}")
    Single<ApiResponse<ProveedorDTO>> eliminarProveedor(@Path("id") Long id);

    // --- Pedidos proveedor ---
    @GET("pedidos-proveedor/listar")
    Single<ApiResponse<List<PedidoProveedorDTO>>> listarPedidos();

    @POST("pedidos-proveedor/crear")
    Single<ApiResponse<PedidoProveedorDTO>> crearPedido(@Body PedidoProveedorDTO pedido);

    @PUT("pedidos-proveedor/actualizar/{id}")
    Single<ApiResponse<PedidoProveedorDTO>> actualizarPedido(@Path("id") Long id,
                                                           @Body PedidoProveedorDTO pedido);

    @DELETE("pedidos-proveedor/eliminar/{id}")
    Single<ApiResponse<PedidoProveedorDTO>> eliminarPedido(@Path("id") Long id);

    @PUT("pedidos-proveedor/recibir/{id}")
    Single<ApiResponse<PedidoProveedorDTO>> recibirPedido(@Path("id") Long id);

    @GET("pedidos-proveedor/provision-semanal")
    Single<ApiResponse<List<Map<String, Double>>>> provisionSemanal();

    // --- Caja / Entrada / Salida / Corte ---
    @POST("caja/apertura")
    Single<ApiResponse<Object>> aperturaCaja(@Body CajaAperturaDTO apertura);

    @POST("caja/entrada")
    Single<ApiResponse<Object>> entradaEfectivo(@Body EntradaSalidaDTO cuerpo);

    @POST("caja/salida")
    Single<ApiResponse<Object>> salidaEfectivo(@Body EntradaSalidaDTO cuerpo);

    @GET("caja/corte/consulta")
    Single<CorteDTO> consultarCorte(@Query("idUsuario") Long idUsuario);

    @GET("caja/reporteDiario/{fecha}")
    Single<ApiResponse<Object>> reporteDiario(@Path("fecha") String fecha);

    // --- Boveda ---
    @GET("boveda/estado")
    Single<ApiResponse<Object>> estadoBoveda();

    @POST("boveda/ajuste")
    Single<ApiResponse<Object>> ajusteBoveda(@Body EntradaSalidaDTO cuerpo);

    // --- Apartados ---
    @POST("apartado")
    Single<ApiResponse<ApartadoDTO>> crearApartado(@Body CrearApartadoDTO cuerpo);

    @GET("apartado/activos")
    Single<ApiResponse<List<ApartadoDTO>>> apartadosActivos(@Query("idUsuario") Long idUsuario);

    @GET("apartado")
    Single<ApiResponse<List<ApartadoDTO>>> listarApartados(@Query("idUsuario") Long idUsuario);

    @GET("apartado/completados")
    Single<ApiResponse<List<ApartadoDTO>>> apartadosCompletados();

    @GET("apartado/historial/{idApartado}")
    Single<ApiResponse<List<com.dulcesnc.pos.data.remote.dto.ApartadoPagoDTO>>> historialApartado(@Path("idApartado") Long idApartado);

    @PUT("apartado/pagar/{id}")
    Single<ApiResponse<ApartadoDTO>> pagarApartado(@Path("id") Long id,
                                                   @Query("monto") Double monto,
                                                   @Query("idUsuario") Long idUsuario);

    @PUT("apartado/cancelar/{id}")
    Single<ApiResponse<ApartadoDTO>> cancelarApartado(@Path("id") Long id);

    // --- Sincronizacion ---
    @GET("sincronizacion/exportar")
    Single<ApiResponse<SincronizacionMovilDTO>> exportarDatosMovil();

    @POST("sincronizacion/importar")
    Single<ApiResponse<String>> importarVentasMovil(@Body SincronizacionMovilDTO request);
}
