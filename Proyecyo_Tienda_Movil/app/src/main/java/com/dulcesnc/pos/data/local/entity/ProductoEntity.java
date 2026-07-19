package com.dulcesnc.pos.data.local.entity;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.io.Serializable;
import java.math.BigDecimal;

@Entity(tableName = "productos")
public class ProductoEntity implements Serializable {

    @PrimaryKey
    @ColumnInfo(name = "id_producto")
    private Long idProducto;

    @ColumnInfo(name = "nombre")
    private String nombre;

    @ColumnInfo(name = "precio_costo")
    private BigDecimal precioCosto;

    @ColumnInfo(name = "precio_venta")
    private BigDecimal precioVenta;

    @ColumnInfo(name = "stock")
    private Integer stock;

    @ColumnInfo(name = "cantidad_min")
    private Integer cantidadMin;

    @ColumnInfo(name = "cantidad_max")
    private Integer cantidadMax;

    @ColumnInfo(name = "precio_mayoreo")
    private BigDecimal precioMayoreo;

    @ColumnInfo(name = "is_gramaje")
    private Boolean isGramaje;

    @ColumnInfo(name = "requiere_envase")
    private Boolean requiereEnvase;

    @ColumnInfo(name = "precio_envase")
    private BigDecimal precioEnvase;

    @ColumnInfo(name = "codigo_barras")
    private String codigoBarras;

    @ColumnInfo(name = "id_categoria")
    private Long idCategoria;

    @ColumnInfo(name = "id_subcategoria")
    private Long idSubcategoria;

    @ColumnInfo(name = "estatus")
    private String estatus;

    @ColumnInfo(name = "presentacion_caja")
    private String presentacionCaja;

    @ColumnInfo(name = "sincronizado")
    private boolean sincronizado;

    public ProductoEntity() {}

    public ProductoEntity(Long idProducto, String nombre, BigDecimal precioCosto, BigDecimal precioVenta,
                          Integer stock, Integer cantidadMin, Integer cantidadMax, BigDecimal precioMayoreo,
                          Boolean isGramaje, Boolean requiereEnvase, BigDecimal precioEnvase,
                          String codigoBarras, Long idCategoria, Long idSubcategoria,
                          String estatus, String presentacionCaja) {
        this.idProducto = idProducto;
        this.nombre = nombre;
        this.precioCosto = precioCosto;
        this.precioVenta = precioVenta;
        this.stock = stock;
        this.cantidadMin = cantidadMin;
        this.cantidadMax = cantidadMax;
        this.precioMayoreo = precioMayoreo;
        this.isGramaje = isGramaje;
        this.requiereEnvase = requiereEnvase;
        this.precioEnvase = precioEnvase;
        this.codigoBarras = codigoBarras;
        this.idCategoria = idCategoria;
        this.idSubcategoria = idSubcategoria;
        this.estatus = estatus;
        this.presentacionCaja = presentacionCaja;
    }

    public Long getIdProducto() { return idProducto; }
    public void setIdProducto(Long idProducto) { this.idProducto = idProducto; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public BigDecimal getPrecioCosto() { return precioCosto; }
    public void setPrecioCosto(BigDecimal precioCosto) { this.precioCosto = precioCosto; }
    public BigDecimal getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(BigDecimal precioVenta) { this.precioVenta = precioVenta; }
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
    public Integer getCantidadMin() { return cantidadMin; }
    public void setCantidadMin(Integer cantidadMin) { this.cantidadMin = cantidadMin; }
    public Integer getCantidadMax() { return cantidadMax; }
    public void setCantidadMax(Integer cantidadMax) { this.cantidadMax = cantidadMax; }
    public BigDecimal getPrecioMayoreo() { return precioMayoreo; }
    public void setPrecioMayoreo(BigDecimal precioMayoreo) { this.precioMayoreo = precioMayoreo; }
    public Boolean getIsGramaje() { return isGramaje; }
    public void setIsGramaje(Boolean isGramaje) { this.isGramaje = isGramaje; }
    public Boolean getRequiereEnvase() { return requiereEnvase; }
    public void setRequiereEnvase(Boolean requiereEnvase) { this.requiereEnvase = requiereEnvase; }
    public BigDecimal getPrecioEnvase() { return precioEnvase; }
    public void setPrecioEnvase(BigDecimal precioEnvase) { this.precioEnvase = precioEnvase; }
    public String getCodigoBarras() { return codigoBarras; }
    public void setCodigoBarras(String codigoBarras) { this.codigoBarras = codigoBarras; }
    public Long getIdCategoria() { return idCategoria; }
    public void setIdCategoria(Long idCategoria) { this.idCategoria = idCategoria; }
    public Long getIdSubcategoria() { return idSubcategoria; }
    public void setIdSubcategoria(Long idSubcategoria) { this.idSubcategoria = idSubcategoria; }
    public String getEstatus() { return estatus; }
    public void setEstatus(String estatus) { this.estatus = estatus; }
    public String getPresentacionCaja() { return presentacionCaja; }
    public void setPresentacionCaja(String presentacionCaja) { this.presentacionCaja = presentacionCaja; }
    public boolean isSincronizado() { return sincronizado; }
    public void setSincronizado(boolean sincronizado) { this.sincronizado = sincronizado; }
}
