package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;

public class ProductoDTO {

    @SerializedName("idProducto")
    private Long idProducto;

    @SerializedName("nombre")
    private String nombre;

    @SerializedName("precio_costo")
    private BigDecimal precioCosto;

    @SerializedName("precio_venta")
    private BigDecimal precioVenta;

    @SerializedName("stock")
    private Integer stock;

    @SerializedName("cantidad_min")
    private Integer cantidadMin;

    @SerializedName("cantidad_max")
    private Integer cantidadMax;

    @SerializedName("precio_mayoreo")
    private BigDecimal precioMayoreo;

    @SerializedName("is_gramaje")
    private Boolean isGramaje;

    @SerializedName("requiere_envase")
    private Boolean requiereEnvase;

    @SerializedName("precio_envase")
    private BigDecimal precioEnvase;

    @SerializedName("codigoBarras")
    private String codigoBarras;

    @SerializedName("idCategoria")
    private Long idCategoria;

    @SerializedName("idSubcategoria")
    private Long idSubcategoria;

    @SerializedName("estatus")
    private String estatus;

    @SerializedName("presentacion_caja")
    private String presentacionCaja;

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
}
