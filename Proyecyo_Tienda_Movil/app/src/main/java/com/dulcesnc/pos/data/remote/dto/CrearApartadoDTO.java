package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;

public class CrearApartadoDTO {

    @SerializedName("nombreProducto")
    private String nombreProducto;

    @SerializedName("montoTotal")
    private BigDecimal montoTotal;

    @SerializedName("frecuenciaPago")
    private String frecuenciaPago;

    @SerializedName("plazoMeses")
    private Integer plazoMeses;

    @SerializedName("fechaInicio")
    private String fechaInicio;

    @SerializedName("idUsuario")
    private Long idUsuario;

    public CrearApartadoDTO() {}

    public CrearApartadoDTO(String nombreProducto, BigDecimal montoTotal, String frecuenciaPago,
                           Integer plazoMeses, String fechaInicio, Long idUsuario) {
        this.nombreProducto = nombreProducto;
        this.montoTotal = montoTotal;
        this.frecuenciaPago = frecuenciaPago;
        this.plazoMeses = plazoMeses;
        this.fechaInicio = fechaInicio;
        this.idUsuario = idUsuario;
    }

    public String getNombreProducto() { return nombreProducto; }
    public void setNombreProducto(String s) { this.nombreProducto = s; }
    public BigDecimal getMontoTotal() { return montoTotal; }
    public void setMontoTotal(BigDecimal b) { this.montoTotal = b; }
    public String getFrecuenciaPago() { return frecuenciaPago; }
    public void setFrecuenciaPago(String s) { this.frecuenciaPago = s; }
    public Integer getPlazoMeses() { return plazoMeses; }
    public void setPlazoMeses(Integer i) { this.plazoMeses = i; }
    public String getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(String s) { this.fechaInicio = s; }
    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long id) { this.idUsuario = id; }
}
