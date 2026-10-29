package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;

public class VentaDetalleDTO {

    @SerializedName("idProducto")
    private Long idProducto;

    @SerializedName("cantidad")
    private Integer cantidad;

    @SerializedName("precioUnitarioVenta")
    private BigDecimal precioUnitarioVenta;

    @SerializedName("tipoPrecioAplicado")
    private String tipoPrecioAplicado;

    @SerializedName("cobroEnvase")
    private BigDecimal cobroEnvase;

    @SerializedName("cantidadEnvase")
    private Integer cantidadEnvase;

    @SerializedName("idVentaDetalle")
    private Long idVentaDetalle;

    @SerializedName("idVenta")
    private Long idVenta;

    @SerializedName("Producto")
    private ProductoDTO producto;

    @SerializedName("Venta")
    private VentaRequestDTO venta;

    @SerializedName("isGramaje")
    private Boolean isGramaje;

    @SerializedName("cobroEnvaseTotal")
    private BigDecimal cobroEnvaseTotal;

    public VentaDetalleDTO(Long idProducto, Integer cantidad, BigDecimal precioUnitarioVenta,
                           String tipoPrecioAplicado, BigDecimal cobroEnvase, Integer cantidadEnvase) {
        this.idProducto = idProducto;
        this.cantidad = cantidad;
        this.precioUnitarioVenta = precioUnitarioVenta;
        this.tipoPrecioAplicado = tipoPrecioAplicado;
        this.cobroEnvase = cobroEnvase;
        this.cantidadEnvase = cantidadEnvase;
    }

    public Long getIdProducto() { return idProducto; }
    public Integer getCantidad() { return cantidad; }
    public BigDecimal getPrecioUnitarioVenta() { return precioUnitarioVenta; }
    public String getTipoPrecioAplicado() { return tipoPrecioAplicado; }
    public BigDecimal getCobroEnvase() { return cobroEnvase; }
    public Integer getCantidadEnvase() { return cantidadEnvase; }
    public Long getIdVentaDetalle() { return idVentaDetalle; }
    public void setIdVentaDetalle(Long id) { this.idVentaDetalle = id; }
    public Long getIdVenta() { return idVenta; }
    public void setIdVenta(Long id) { this.idVenta = id; }
    public ProductoDTO getProducto() { return producto; }
    public void setProducto(ProductoDTO p) { this.producto = p; }
    public VentaRequestDTO getVenta() { return venta; }
    public void setVenta(VentaRequestDTO v) { this.venta = v; }
    public Boolean getIsGramaje() { return isGramaje; }
    public void setIsGramaje(Boolean b) { this.isGramaje = b; }
    public BigDecimal getCobroEnvaseTotal() { return cobroEnvaseTotal; }
    public void setCobroEnvaseTotal(BigDecimal b) { this.cobroEnvaseTotal = b; }
}
