package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;

public class CreditoAbonoDTO {

    @SerializedName("idAbono")
    private Long idAbono;

    @SerializedName("idCreditoVenta")
    private Long idCreditoVenta;

    @SerializedName("monto")
    private BigDecimal monto;

    @SerializedName("fechaAbono")
    private String fechaAbono;

    @SerializedName("idUsuario")
    private Long idUsuario;

    @SerializedName("nombreUsuario")
    private String nombreUsuario;

    @SerializedName("metodoPago")
    private String metodoPago;

    public Long getIdAbono() { return idAbono; }
    public void setIdAbono(Long id) { this.idAbono = id; }
    public Long getIdCreditoVenta() { return idCreditoVenta; }
    public void setIdCreditoVenta(Long id) { this.idCreditoVenta = id; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal b) { this.monto = b; }
    public String getFechaAbono() { return fechaAbono; }
    public void setFechaAbono(String s) { this.fechaAbono = s; }
    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long id) { this.idUsuario = id; }
    public String getNombreUsuario() { return nombreUsuario; }
    public void setNombreUsuario(String s) { this.nombreUsuario = s; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String s) { this.metodoPago = s; }
}
