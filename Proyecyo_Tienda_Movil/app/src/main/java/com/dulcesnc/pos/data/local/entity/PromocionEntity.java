package com.dulcesnc.pos.data.local.entity;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.io.Serializable;
import java.math.BigDecimal;

@Entity(tableName = "promociones")
public class PromocionEntity implements Serializable {

    @PrimaryKey
    @ColumnInfo(name = "id_promocion")
    private Long idPromocion;

    @ColumnInfo(name = "nombre")
    private String nombre;

    @ColumnInfo(name = "descripcion")
    private String descripcion;

    @ColumnInfo(name = "precio_original")
    private BigDecimal precioOriginal;

    @ColumnInfo(name = "precio_promocion")
    private BigDecimal precioPromocion;

    @ColumnInfo(name = "imagen_url")
    private String imagenUrl;

    @ColumnInfo(name = "activa")
    private Boolean activa;

    @ColumnInfo(name = "fecha_inicio")
    private String fechaInicio;

    @ColumnInfo(name = "fecha_fin")
    private String fechaFin;

    @ColumnInfo(name = "sincronizado")
    private boolean sincronizado;

    public PromocionEntity() {}

    public PromocionEntity(Long idPromocion, String nombre, String descripcion,
                            BigDecimal precioOriginal, BigDecimal precioPromocion,
                            String imagenUrl, Boolean activa, String fechaInicio,
                            String fechaFin, boolean sincronizado) {
        this.idPromocion = idPromocion;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precioOriginal = precioOriginal;
        this.precioPromocion = precioPromocion;
        this.imagenUrl = imagenUrl;
        this.activa = activa;
        this.fechaInicio = fechaInicio;
        this.fechaFin = fechaFin;
        this.sincronizado = sincronizado;
    }

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
    public boolean isSincronizado() { return sincronizado; }
    public void setSincronizado(boolean b) { this.sincronizado = b; }
}
