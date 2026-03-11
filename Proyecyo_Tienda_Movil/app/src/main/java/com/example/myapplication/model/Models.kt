package com.example.myapplication.model

import com.google.gson.annotations.SerializedName

data class RespuestaPersonalizada<T>(
    @SerializedName("codigo") val codigo: Int,
    @SerializedName("mensaje") val mensaje: String,
    @SerializedName("datos") val datos: T?
)

data class Product(
    @SerializedName("id_producto") val id_producto: Long? = null,
    @SerializedName("nombre") val nombre: String = "",
    @SerializedName("precio") val precio: Double = 0.0,
    @SerializedName("precio_venta") val precioVenta: Double = 0.0,
    @SerializedName("precio_mayoreo") val precioMayoreo: Double? = null,
    @SerializedName("stock") val stock: Int = 0,
    @SerializedName("categoria") val categoria: String = "",
    @SerializedName("codigoBarras") val codigoBarras: String? = null,
    @SerializedName("is_gramaje") val isGramaje: Boolean = false
) {
    val precioFinal: Double get() = if (precio > 0) precio else precioVenta
}

data class UsuariosDTO(
    @SerializedName("id") val id: Long? = null,
    @SerializedName("nombre") val nombre: String = "",
    @SerializedName("usuario") val usuario: String = "",
    @SerializedName("contrasena") val contrasena: String = "",
    @SerializedName("rol") val rol: String = ""
)

data class VentasDTO(
    @SerializedName("id_venta") val id_venta: Long? = null,
    @SerializedName("fecha_venta") val fecha_venta: String? = null,
    @SerializedName("monto_total") val monto_total: Double = 0.0,
    @SerializedName("estatus") val estatus: String = "P", // P = Pendiente, C = Completado
    @SerializedName("metodo_pago") val metodo_pago: String = "EFECTIVO"
)

data class VentasDetalleDTO(
    @SerializedName("idVentaDetalle") val idVentaDetalle: Long? = null,
    @SerializedName("idUsuario") val idUsuario: Long? = null,
    @SerializedName("Venta") val venta: VentasDTO? = null,
    @SerializedName("Producto") val producto: Product? = null,
    @SerializedName("cantidad") val cantidad: Int = 1,
    @SerializedName("precioUnitarioVenta") val precioUnitarioVenta: Double = 0.0,
    @SerializedName("tipoPrecioAplicado") val tipoPrecioAplicado: String = "VENTA"
)

data class AperturaDTO(
    @SerializedName("idUsuario") val idUsuario: Long,
    @SerializedName("montoInicial") val montoInicial: Double
)

data class ApartadoDTO(
    @SerializedName("id") val id: Long? = null,
    @SerializedName("cliente") val cliente: String = "",
    @SerializedName("total") val total: Double = 0.0,
    @SerializedName("abonado") val abonado: Double = 0.0,
    @SerializedName("estatus") val estatus: String = "ACTIVO"
)

data class CorteDTO(
    @SerializedName("totalVentas") val totalVentas: Double = 0.0,
    @SerializedName("totalEfectivo") val totalEfectivo: Double = 0.0,
    @SerializedName("totalTransferencia") val totalTransferencia: Double = 0.0,
    @SerializedName("montoInicial") val montoInicial: Double = 0.0
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
    @SerializedName("monto") val monto: Double = 0.0,
    @SerializedName("descripcion") val descripcion: String = "",
    @SerializedName("tipo") val tipo: String = "ENTRADA", // ENTRADA o SALIDA
    @SerializedName("fecha") val fecha: String? = null
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

data class GananciasDTO(
    @SerializedName("totalVentas") val totalVentas: Double = 0.0,
    @SerializedName("totalEfectivo") val totalEfectivo: Double = 0.0,
    @SerializedName("totalTarjeta") val totalTarjeta: Double = 0.0,
    @SerializedName("totalTransferencia") val totalTransferencia: Double = 0.0,
    @SerializedName("cantidadVentas") val cantidadVentas: Int = 0
)
