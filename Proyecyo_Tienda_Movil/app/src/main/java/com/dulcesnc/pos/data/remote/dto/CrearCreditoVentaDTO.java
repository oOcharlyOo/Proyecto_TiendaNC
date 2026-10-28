package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

public class CrearCreditoVentaDTO {

    @SerializedName("idPersona")
    private Long idPersona;

    @SerializedName("idVenta")
    private Long idVenta;

    @SerializedName("montoTotal")
    private java.math.BigDecimal montoTotal;

    @SerializedName("notas")
    private String notas;

    public CrearCreditoVentaDTO() {}

    public CrearCreditoVentaDTO(Long idPersona, Long idVenta, java.math.BigDecimal montoTotal, String notas) {
        this.idPersona = idPersona;
        this.idVenta = idVenta;
        this.montoTotal = montoTotal;
        this.notas = notas;
    }

    public Long getIdPersona() { return idPersona; }
    public void setIdPersona(Long idPersona) { this.idPersona = idPersona; }
    public Long getIdVenta() { return idVenta; }
    public void setIdVenta(Long idVenta) { this.idVenta = idVenta; }
    public java.math.BigDecimal getMontoTotal() { return montoTotal; }
    public void setMontoTotal(java.math.BigDecimal montoTotal) { this.montoTotal = montoTotal; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
}
