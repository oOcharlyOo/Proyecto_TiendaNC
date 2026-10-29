package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;

public class CajaAperturaDTO {

    @SerializedName("idUsuario")
    private Long idUsuario;

    @SerializedName("montoInicial")
    private BigDecimal montoInicial;

    public CajaAperturaDTO() {}

    public CajaAperturaDTO(Long idUsuario, BigDecimal montoInicial) {
        this.idUsuario = idUsuario;
        this.montoInicial = montoInicial;
    }

    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long id) { this.idUsuario = id; }
    public BigDecimal getMontoInicial() { return montoInicial; }
    public void setMontoInicial(BigDecimal b) { this.montoInicial = b; }
}
