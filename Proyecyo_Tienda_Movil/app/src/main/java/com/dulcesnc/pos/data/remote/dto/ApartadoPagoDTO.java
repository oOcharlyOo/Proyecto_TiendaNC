package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;

public class ApartadoPagoDTO {

    @SerializedName("idPago")
    private Long idPago;

    @SerializedName("idApartado")
    private Long idApartado;

    @SerializedName("monto")
    private BigDecimal monto;

    @SerializedName("fechaPago")
    private String fechaPago;

    @SerializedName("idUsuario")
    private Long idUsuario;

    @SerializedName("nombreUsuario")
    private String nombreUsuario;

    public Long getIdPago() { return idPago; }
    public Long getIdApartado() { return idApartado; }
    public BigDecimal getMonto() { return monto; }
    public String getFechaPago() { return fechaPago; }
    public Long getIdUsuario() { return idUsuario; }
    public String getNombreUsuario() { return nombreUsuario; }
}
