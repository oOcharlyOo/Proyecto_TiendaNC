package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;

public class PedidoDetalleDTO {

    @SerializedName("idDetalle")
    private Long idDetalle;

    @SerializedName("idProducto")
    private Long idProducto;

    @SerializedName("nombreProducto")
    private String nombreProducto;

    @SerializedName("cantidad")
    private Integer cantidad;

    @SerializedName("precioUnitario")
    private BigDecimal precioUnitario;

    @SerializedName("subtotal")
    private BigDecimal subtotal;

    public Long getIdDetalle() { return idDetalle; }
    public void setIdDetalle(Long id) { this.idDetalle = id; }
    public Long getIdProducto() { return idProducto; }
    public void setIdProducto(Long id) { this.idProducto = id; }
    public String getNombreProducto() { return nombreProducto; }
    public void setNombreProducto(String s) { this.nombreProducto = s; }
    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer i) { this.cantidad = i; }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal b) { this.precioUnitario = b; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal b) { this.subtotal = b; }
}
