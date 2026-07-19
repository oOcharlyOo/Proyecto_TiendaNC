package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;
import java.util.List;

public class PromocionDTO {

    @SerializedName("idPromocion")
    private Long idPromocion;

    @SerializedName("nombre")
    private String nombre;

    @SerializedName("descripcion")
    private String descripcion;

    @SerializedName("precio_original")
    private BigDecimal precioOriginal;

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

    @SerializedName("detalles")
    private List<PromocionDetalleDTO> detalles;

    public Long getIdPromocion() { return idPromocion; }
    public void setIdPromocion(Long id) { this.idPromocion = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String s) { this.nombre = s; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String s) { this.descripcion = s; }
    public BigDecimal getPrecioOriginal() { return precioOriginal; }
    public void setPrecioOriginal(BigDecimal b) { this.precioOriginal = b; }
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
    public List<PromocionDetalleDTO> getDetalles() { return detalles; }
    public void setDetalles(List<PromocionDetalleDTO> d) { this.detalles = d; }
}
