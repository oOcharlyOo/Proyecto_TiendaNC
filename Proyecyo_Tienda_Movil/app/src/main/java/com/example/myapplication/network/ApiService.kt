package com.example.myapplication.network

import com.example.myapplication.model.*
import retrofit2.http.*

interface ApiService {
    // --- PRODUCTOS ---
    @GET("productos/listarProductos")
    suspend fun getProducts(): RespuestaPersonalizada<List<Product>>

    @GET("productos/buscarPorCodigoBarras/{codigo}")
    suspend fun getProductByBarcode(@Path("codigo") barcode: String): RespuestaPersonalizada<Product>

    @POST("productos/agregarProducto")
    suspend fun addProduct(@Body product: Product): RespuestaPersonalizada<Product>

    @PUT("productos/actualizarProducto/{id}")
    suspend fun updateProduct(@Path("id") id: Long, @Body product: Product): RespuestaPersonalizada<Product>

    @DELETE("productos/eliminarProducto/{id}")
    suspend fun deleteProduct(@Path("id") id: Long): RespuestaPersonalizada<Product>

    // --- USUARIOS ---
    @POST("usuarios/login")
    suspend fun login(@Body loginRequest: LoginRequest): RespuestaPersonalizada<UsuariosDTO>

    @GET("usuarios/listarUsuarios")
    suspend fun getUsuarios(): RespuestaPersonalizada<List<UsuariosDTO>>

    // --- VENTAS ---
    @POST("ventas/agregarVenta")
    suspend fun addVenta(@Body venta: VentasDTO): RespuestaPersonalizada<VentasDTO>

    @POST("ventasDetalle/agregarVentaDetalle")
    suspend fun addVentaDetalle(@Body detalle: VentasDetalleDTO): RespuestaPersonalizada<VentasDetalleDTO>

    @GET("ventas/obtenerVentaPorDia/{fechaVenta}")
    suspend fun getVentasPorDia(@Path("fechaVenta") fecha: String): RespuestaPersonalizada<GananciasDTO>

    @GET("ventas/buscarVentasPendientes")
    suspend fun getVentasPendientes(): RespuestaPersonalizada<List<VentasDTO>>

    @GET("ventas/buscarVentaPendiente")
    suspend fun getVentaPendiente(): RespuestaPersonalizada<VentasDTO>

    @PUT("ventas/completarVenta/{id}?montoTotal={montoTotal}&metodoPago={metodoPago}")
    suspend fun completarVenta(
        @Path("id") idVenta: Long,
        @Query("montoTotal") montoTotal: Double,
        @Query("metodoPago") metodoPago: String
    ): RespuestaPersonalizada<VentasDTO>

    @PUT("ventas/cancelarVenta/{id}")
    suspend fun cancelarVenta(@Path("id") idVenta: Long): RespuestaPersonalizada<VentasDTO>

    @DELETE("ventas/eliminarVenta/{id}")
    suspend fun eliminarVenta(@Path("id") idVenta: Long): RespuestaPersonalizada<VentasDTO>

    // --- VENTAS DETALLE ---
    @GET("ventasDetalle/porVenta/{idVenta}")
    suspend fun getVentaDetalles(@Path("idVenta") idVenta: Long): RespuestaPersonalizada<List<VentasDetalleDTO>>

    @PUT("ventasDetalle/actualizarVentaDetalle/{idVentaDetalle}")
    suspend fun actualizarVentaDetalle(
        @Path("idVentaDetalle") idVentaDetalle: Long,
        @Body detalle: VentasDetalleDTO
    ): RespuestaPersonalizada<VentasDetalleDTO>

    @DELETE("ventasDetalle/eliminarVentaDetalle/{idVentaDetalle}")
    suspend fun eliminarVentaDetalle(@Path("idVentaDetalle") idVentaDetalle: Long): RespuestaPersonalizada<VentasDetalleDTO>

    // --- CAJA ---
    @POST("caja/apertura")
    suspend fun abrirCaja(@Body apertura: AperturaDTO): RespuestaPersonalizada<CajaDTO>

    @GET("caja/apertura/activa")
    suspend fun verificarCajaActiva(@Query("idUsuario") idUsuario: Long): RespuestaPersonalizada<CajaDTO>

    @POST("caja/corte")
    suspend fun realizarCorte(@Query("idUsuario") idUsuario: Long, @Query("montoInicial") montoInicial: Double): RespuestaPersonalizada<CorteDTO>

    @POST("caja/entrada")
    suspend fun crearEntrada(@Body entrada: EntradaSalidaDTO): RespuestaPersonalizada<EntradaSalidaDTO>

    @POST("caja/salida")
    suspend fun crearSalida(@Body salida: EntradaSalidaDTO): RespuestaPersonalizada<EntradaSalidaDTO>

    @GET("caja/reporteDiario/{fecha}")
    suspend fun getReporteDiario(@Path("fecha") fecha: String): RespuestaPersonalizada<CorteDTO>

    // --- APARTADOS ---
    @POST("apartado")
    suspend fun crearApartado(@Body apartado: CrearApartadoDTO): RespuestaPersonalizada<ApartadoDTO>

    @GET("apartado/activos")
    suspend fun getApartadosActivos(@Query("idUsuario") idUsuario: Long): RespuestaPersonalizada<List<ApartadoDTO>>

    @GET("apartado")
    suspend fun getApartados(@Query("idUsuario") idUsuario: Long): RespuestaPersonalizada<List<ApartadoDTO>>

    @GET("apartado/{id}")
    suspend fun getApartadoPorId(@Path("id") id: Long): RespuestaPersonalizada<ApartadoDTO>

    @PUT("apartado/pagar/{id}")
    suspend fun pagarApartado(@Path("id") id: Long, @Query("monto") monto: Double, @Query("idUsuario") idUsuario: Long): RespuestaPersonalizada<ApartadoDTO>

    @PUT("apartado/cancelar/{id}")
    suspend fun cancelarApartado(@Path("id") id: Long): RespuestaPersonalizada<ApartadoDTO>

    @GET("apartado/historial/{id}")
    suspend fun getHistorialPagos(@Path("id") id: Long): RespuestaPersonalizada<List<ApartadoPagoDTO>>

    // --- CORTE ---
    @GET("corte/obtenerReporteDelDia")
    suspend fun getDailyReport(): RespuestaPersonalizada<Map<String, Any>>

    // --- COMANDOS ---
    @POST("ventas/comando-texto")
    suspend fun procesarComandoTexto(@Body comando: Map<String, String>): RespuestaPersonalizada<List<Product>>
}
