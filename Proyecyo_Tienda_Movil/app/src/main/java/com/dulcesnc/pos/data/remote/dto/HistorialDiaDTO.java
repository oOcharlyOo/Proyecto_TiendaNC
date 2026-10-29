package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;
import java.util.List;

public class HistorialDiaDTO {

    @SerializedName("ventas")
    private List<VentaRequestDTO> ventas;

    @SerializedName("cobroTotal")
    private BigDecimal cobroTotal;

    @SerializedName("gananciaTotal")
    private BigDecimal gananciaTotal;

    @SerializedName("usuariosUnicos")
    private Integer usuariosUnicos;

    public List<VentaRequestDTO> getVentas() { return ventas; }
    public BigDecimal getCobroTotal() { return cobroTotal; }
    public BigDecimal getGananciaTotal() { return gananciaTotal; }
    public Integer getUsuariosUnicos() { return usuariosUnicos; }
}
