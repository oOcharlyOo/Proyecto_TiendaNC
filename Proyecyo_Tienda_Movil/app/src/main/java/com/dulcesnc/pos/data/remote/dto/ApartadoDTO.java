package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;

public class ApartadoDTO {

    @SerializedName("idApartado")
    private Long idApartado;

    @SerializedName("nombreProducto")
    private String nombreProducto;

    @SerializedName("montoTotal")
    private BigDecimal montoTotal;

    @SerializedName("montoPagado")
    private BigDecimal montoPagado;

    @SerializedName("montoRestante")
    private BigDecimal montoRestante;

    @SerializedName("frecuenciaPago")
    private String frecuenciaPago;

    @SerializedName("montoPorPeriodo")
    private BigDecimal montoPorPeriodo;

    @SerializedName("montoDiario")
    private BigDecimal montoDiario;

    @SerializedName("fechaInicio")
    private String fechaInicio;

    @SerializedName("fechaFin")
    private String fechaFin;

    @SerializedName("estatus")
    private String estatus;

    @SerializedName("idUsuario")
    private Long idUsuario;

    @SerializedName("nombreUsuario")
    private String nombreUsuario;

    @SerializedName("fechaRegistro")
    private String fechaRegistro;

    public Long getIdApartado() { return idApartado; }
    public String getNombreProducto() { return nombreProducto; }
    public BigDecimal getMontoTotal() { return montoTotal; }
    public BigDecimal getMontoPagado() { return montoPagado; }
    public BigDecimal getMontoRestante() { return montoRestante; }
    public String getFrecuenciaPago() { return frecuenciaPago; }
    public BigDecimal getMontoPorPeriodo() { return montoPorPeriodo; }
    public BigDecimal getMontoDiario() { return montoDiario; }
    public String getFechaInicio() { return fechaInicio; }
    public String getFechaFin() { return fechaFin; }
    public String getEstatus() { return estatus; }
    public Long getIdUsuario() { return idUsuario; }
    public String getNombreUsuario() { return nombreUsuario; }
    public String getFechaRegistro() { return fechaRegistro; }
}
