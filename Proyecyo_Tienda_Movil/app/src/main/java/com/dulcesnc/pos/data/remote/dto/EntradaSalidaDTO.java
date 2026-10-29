package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;

public class EntradaSalidaDTO {

    @SerializedName("montoInicial")
    private BigDecimal montoInicial;

    @SerializedName("montoEoS")
    private BigDecimal montoEoS;

    @SerializedName("descripcion")
    private String descripcion;

    @SerializedName("idUsuario")
    private Long idUsuario;

    public EntradaSalidaDTO() {}

    public EntradaSalidaDTO(BigDecimal montoEoS, String descripcion, Long idUsuario) {
        this.montoEoS = montoEoS;
        this.descripcion = descripcion;
        this.idUsuario = idUsuario;
    }

    public BigDecimal getMontoInicial() { return montoInicial; }
    public void setMontoInicial(BigDecimal b) { this.montoInicial = b; }
    public BigDecimal getMontoEoS() { return montoEoS; }
    public void setMontoEoS(BigDecimal b) { this.montoEoS = b; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String s) { this.descripcion = s; }
    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long id) { this.idUsuario = id; }
}
