package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

public class ProductoPromocionDTO {

    @SerializedName("id_producto")
    private Long idProducto;

    @SerializedName("cantidad")
    private Integer cantidad;

    public ProductoPromocionDTO() {}

    public ProductoPromocionDTO(Long idProducto, Integer cantidad) {
        this.idProducto = idProducto;
        this.cantidad = cantidad;
    }

    public Long getIdProducto() { return idProducto; }
    public void setIdProducto(Long id) { this.idProducto = id; }
    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer i) { this.cantidad = i; }
}
