package com.example.myapplication.model

import com.google.gson.annotations.SerializedName

data class RespuestaPersonalizada<T>(
    @SerializedName("codigo") val codigo: Int,
    @SerializedName("mensaje") val mensaje: String,
    @SerializedName("datos") val datos: T?
)

data class Product(
    @SerializedName("id_producto") val id_producto: Long? = null,
    @SerializedName("id") val id: Long? = null,
    @SerializedName("idProducto") val idProducto: Long? = null,
    @SerializedName("nombre") val nombre: String = "",
    @SerializedName("precio") val precio: Double = 0.0,
    @SerializedName("precio_venta") val precioVenta: Double = 0.0,
    @SerializedName("precio_mayoreo") val precioMayoreo: Double? = null,
    @SerializedName("stock") val stock: Int = 0,
    @SerializedName("categoria") val categoria: String = "",
    @SerializedName("codigoBarras") val codigoBarras: String? = null,
    @SerializedName("codigo_barras") val codigoBarrasAlt: String? = null,
    @SerializedName("is_gramaje") val isGramaje: Boolean = false,
    @SerializedName("dto") val dto: Product? = null
) {
    val precioFinal: Double get() = if (precio > 0) precio else precioVenta
    val productoId: Long get() = id_producto ?: id ?: idProducto ?: 0L
}

data class UsuariosDTO(
    @SerializedName("id") val id: Long? = null,
    @SerializedName("idUsuario") val idUsuario: Long? = null,
    @SerializedName("nombre") val nombre: String = "",
    @SerializedName("usuario") val usuario: String = "",
    @SerializedName("contrasena") val contrasena: String = "",
    @SerializedName("rol") val rol: String = "",
    @SerializedName("password_hash") val passwordHash: String? = null,
    @SerializedName("avatar") val avatar: String? = null,
    @SerializedName("apellido_p") val apellidoP: String? = null,
    @SerializedName("apellido_m") val apellidoM: String? = null,
    @SerializedName("id_tipo_usuario") val idTipoUsuario: Int? = null
)

data class VentasDTO(
    @SerializedName("id_venta") val id_venta: Long? = null,
    @SerializedName("idVenta") val idVenta: Long? = null,
    @SerializedName("idUsuario") val idUsuario: Long? = null,
    @SerializedName("fecha_venta") val fecha_venta: String? = null,
    @SerializedName("fechaVenta") val fechaVenta: String? = null,
    @SerializedName("monto_total") val monto_total: Double = 0.0,
    @SerializedName("montoTotal") val montoTotal: Double = 0.0,
    @SerializedName("numeroTicket") val numeroTicket: Int = 0,
    @SerializedName("numero") val numero: Int? = null,
    @SerializedName("estatus") val estatus: String = "P",
    @SerializedName("metodo_pago") val metodo_pago: String = "EFECTIVO",
    @SerializedName("metodoPago") val metodoPago: String? = null,
    @SerializedName("usuario") val usuario: UsuariosDTO? = null,
    @SerializedName("nombreUsuario") val nombreUsuario: String? = null
)

data class VentasDetalleDTO(
    @SerializedName("idVentaDetalle") val idVentaDetalle: Long? = null,
    @SerializedName("idUsuario") val idUsuario: Long? = null,
    @SerializedName("Venta") val venta: VentasDTO? = null,
    @SerializedName("Producto") val producto: Product? = null,
    @SerializedName("producto") val productoAlt: Product? = null,
    @SerializedName("cantidad") val cantidad: Int = 1,
    @SerializedName("precioUnitarioVenta") val precioUnitarioVenta: Double = 0.0,
    @SerializedName("tipoPrecioAplicado") val tipoPrecioAplicado: String = "VENTA",
    @SerializedName("idProducto") val idProducto: Long? = null,
    @SerializedName("productoId") val productoId: Long? = null,
    @SerializedName("productoNombre") val productoNombre: String? = null,
    @SerializedName("productoIsGramaje") val productoIsGramaje: Boolean = false
)

data class AperturaDTO(
    @SerializedName("idUsuario") val idUsuario: Long,
    @SerializedName("montoInicial") val montoInicial: Double
)

data class ApartadoDTO(
    @SerializedName("id") val id: Long? = null,
    @SerializedName("idApartado") val idApartado: Long? = null,
    @SerializedName("cliente") val cliente: String = "",
    @SerializedName("nombreProducto") val nombreProducto: String? = null,
    @SerializedName("total") val total: Double = 0.0,
    @SerializedName("montoTotal") val montoTotal: Double = 0.0,
    @SerializedName("abonado") val abonado: Double = 0.0,
    @SerializedName("montoPagado") val montoPagado: Double = 0.0,
    @SerializedName("montoRestante") val montoRestante: Double = 0.0,
    @SerializedName("frecuenciaPago") val frecuenciaPago: String? = null,
    @SerializedName("montoPorPeriodo") val montoPorPeriodo: Double = 0.0,
    @SerializedName("montoDiario") val montoDiario: Double = 0.0,
    @SerializedName("fechaInicio") val fechaInicio: String? = null,
    @SerializedName("fechaFin") val fechaFin: String? = null,
    @SerializedName("estatus") val estatus: String = "ACTIVO",
    @SerializedName("idUsuario") val idUsuario: Long? = null,
    @SerializedName("nombreUsuario") val nombreUsuario: String? = null,
    @SerializedName("fechaRegistro") val fechaRegistro: String? = null
)

data class CorteDTO(
    @SerializedName("fechaCorte") val fechaCorte: String? = null,
    @SerializedName("montoInicial") val montoInicial: Double = 0.0,
    @SerializedName("totalVentas") val totalVentas: Double = 0.0,
    @SerializedName("totalEgresos") val totalEgresos: Double = 0.0,
    @SerializedName("otrosIngresos") val otrosIngresos: Double = 0.0,
    @SerializedName("saldoFinalCalculado") val saldoFinalCalculado: Double = 0.0,
    @SerializedName("gananciaTotal") val gananciaTotal: Double = 0.0,
    @SerializedName("ventasEfectivo") val ventasEfectivo: Double = 0.0,
    @SerializedName("ventasTransferencia") val ventasTransferencia: Double = 0.0,
    @SerializedName("totalTickets") val totalTickets: Int = 0,
    @SerializedName("totalEfectivo") val totalEfectivo: Double = 0.0,
    @SerializedName("totalTransferencia") val totalTransferencia: Double = 0.0
)

data class EgresoDTO(
    @SerializedName("idCaja") val idCaja: Long? = null,
    @SerializedName("fechaMovimiento") val fechaMovimiento: String? = null,
    @SerializedName("tipoMovimiento") val tipoMovimiento: String = "",
    @SerializedName("monto") val monto: Double = 0.0,
    @SerializedName("descripcion") val descripcion: String = "",
    @SerializedName("saldoResultante") val saldoResultante: Double = 0.0,
    @SerializedName("estatus") val estatus: String = ""
)

data class LoginRequest(
    @SerializedName("usuario") val usuario: String,
    @SerializedName("password_hash") val passwordHash: String
)

data class CajaDTO(
    @SerializedName("id") val id: Long? = null,
    @SerializedName("idUsuario") val idUsuario: Long? = null,
    @SerializedName("montoInicial") val montoInicial: Double = 0.0,
    @SerializedName("montoActual") val montoActual: Double = 0.0,
    @SerializedName("fechaApertura") val fechaApertura: String? = null,
    @SerializedName("estatus") val estatus: String = "CERRADO"
)

data class EntradaSalidaDTO(
    @SerializedName("id") val id: Long? = null,
    @SerializedName("idUsuario") val idUsuario: Long? = null,
    @SerializedName("montoEoS") val montoEoS: Double = 0.0,
    @SerializedName("descripcion") val descripcion: String = "",
    @SerializedName("tipo") val tipo: String = "ENTRADA",
    @SerializedName("fecha") val fecha: String? = null
)

data class GananciasDTO(
    @SerializedName("cobroTotal") val cobroTotal: Double = 0.0,
    @SerializedName("gananciaTotal") val gananciaTotal: Double = 0.0,
    @SerializedName("totalVentas") val totalVentas: Double = 0.0,
    @SerializedName("totalEfectivo") val totalEfectivo: Double = 0.0,
    @SerializedName("totalTarjeta") val totalTarjeta: Double = 0.0,
    @SerializedName("totalTransferencia") val totalTransferencia: Double = 0.0,
    @SerializedName("cantidadVentas") val cantidadVentas: Int = 0,
    @SerializedName("ventas") val ventas: List<VentasDTO>? = null,
    @SerializedName("nombreUsuario") val nombreUsuario: String? = null
)

data class CrearApartadoDTO(
    @SerializedName("idUsuario") val idUsuario: Long,
    @SerializedName("nombreCliente") val nombreCliente: String,
    @SerializedName("telefono") val telefono: String,
    @SerializedName("productos") val productos: List<ApartadoProductoDTO>
)

data class ApartadoProductoDTO(
    @SerializedName("idProducto") val idProducto: Long,
    @SerializedName("cantidad") val cantidad: Int
)

data class ApartadoPagoDTO(
    @SerializedName("id") val id: Long? = null,
    @SerializedName("idApartado") val idApartado: Long? = null,
    @SerializedName("monto") val monto: Double = 0.0,
    @SerializedName("fecha") val fecha: String? = null
)
