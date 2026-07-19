package com.dulcesnc.pos.data.local.entity;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.math.BigDecimal;

@Entity(tableName = "ventas_detalle")
public class VentaDetalleEntity {

    @PrimaryKey
    @ColumnInfo(name = "id_venta_detalle")
    private Long idVentaDetalle;

    @ColumnInfo(name = "id_venta")
    private Long idVenta;

    @ColumnInfo(name = "id_producto")
    private Long idProducto;

    @ColumnInfo(name = "cantidad")
    private Integer cantidad;

    @ColumnInfo(name = "precio_unitario_venta")
    private BigDecimal precioUnitarioVenta;

    @ColumnInfo(name = "tipo_precio_aplicado")
    private String tipoPrecioAplicado;

    @ColumnInfo(name = "cobro_envase")
    private BigDecimal cobroEnvase;

    @ColumnInfo(name = "cantidad_envase")
    private Integer cantidadEnvase;

    public VentaDetalleEntity() {}

    public VentaDetalleEntity(Long idVentaDetalle, Long idVenta, Long idProducto, Integer cantidad,
                              BigDecimal precioUnitarioVenta, String tipoPrecioAplicado,
                              BigDecimal cobroEnvase, Integer cantidadEnvase) {
        this.idVentaDetalle = idVentaDetalle;
        this.idVenta = idVenta;
        this.idProducto = idProducto;
        this.cantidad = cantidad;
        this.precioUnitarioVenta = precioUnitarioVenta;
        this.tipoPrecioAplicado = tipoPrecioAplicado;
        this.cobroEnvase = cobroEnvase;
        this.cantidadEnvase = cantidadEnvase;
    }

    public Long getIdVentaDetalle() { return idVentaDetalle; }
    public void setIdVentaDetalle(Long idVentaDetalle) { this.idVentaDetalle = idVentaDetalle; }
    public Long getIdVenta() { return idVenta; }
    public void setIdVenta(Long idVenta) { this.idVenta = idVenta; }
    public Long getIdProducto() { return idProducto; }
    public void setIdProducto(Long idProducto) { this.idProducto = idProducto; }
    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    public BigDecimal getPrecioUnitarioVenta() { return precioUnitarioVenta; }
    public void setPrecioUnitarioVenta(BigDecimal precioUnitarioVenta) { this.precioUnitarioVenta = precioUnitarioVenta; }
    public String getTipoPrecioAplicado() { return tipoPrecioAplicado; }
    public void setTipoPrecioAplicado(String tipoPrecioAplicado) { this.tipoPrecioAplicado = tipoPrecioAplicado; }
    public BigDecimal getCobroEnvase() { return cobroEnvase; }
    public void setCobroEnvase(BigDecimal cobroEnvase) { this.cobroEnvase = cobroEnvase; }
    public Integer getCantidadEnvase() { return cantidadEnvase; }
    public void setCantidadEnvase(Integer cantidadEnvase) { this.cantidadEnvase = cantidadEnvase; }
}
