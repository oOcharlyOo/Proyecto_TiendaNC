package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;
import java.util.List;

public class CrearPromocionDTO {

    @SerializedName("nombre")
    private String nombre;

    @SerializedName("descripcion")
    private String descripcion;

    @SerializedName("precio_promocion")
    private BigDecimal precioPromocion;

    @SerializedName("imagen_url")
    private String imagenUrl;

    @SerializedName("activa")
    private Boolean activa;

    @SerializedName("fecha_inicio")
    private String fechaInicio;

    @SerializedName("fecha_fin")
    private String fechaFin;

    @SerializedName("productos")
    private List<ProductoPromocionDTO> productos;

    public String getNombre() { return nombre; }
    public void setNombre(String s) { this.nombre = s; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String s) { this.descripcion = s; }
    public BigDecimal getPrecioPromocion() { return precioPromocion; }
    public void setPrecioPromocion(BigDecimal b) { this.precioPromocion = b; }
    public String getImagenUrl() { return imagenUrl; }
    public void setImagenUrl(String s) { this.imagenUrl = s; }
    public Boolean getActiva() { return activa; }
    public void setActiva(Boolean b) { this.activa = b; }
    public String getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(String s) { this.fechaInicio = s; }
    public String getFechaFin() { return fechaFin; }
    public void setFechaFin(String s) { this.fechaFin = s; }
    public List<ProductoPromocionDTO> getProductos() { return productos; }
    public void setProductos(List<ProductoPromocionDTO> p) { this.productos = p; }
}
