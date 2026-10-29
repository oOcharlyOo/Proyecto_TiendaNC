package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;

public class CorteDTO {

    @SerializedName("fechaCorte")
    private String fechaCorte;

    @SerializedName("montoInicial")
    private BigDecimal montoInicial;

    @SerializedName("totalVentas")
    private BigDecimal totalVentas;

    @SerializedName("otrosIngresos")
    private BigDecimal otrosIngresos;

    @SerializedName("totalEgresos")
    private BigDecimal totalEgresos;

    @SerializedName("saldoFinalCalculado")
    private BigDecimal saldoFinalCalculado;

    @SerializedName("saldoFinalReal")
    private BigDecimal saldoFinalReal;

    @SerializedName("diferencia")
    private BigDecimal diferencia;

    @SerializedName("idUsuario")
    private Long idUsuario;

    @SerializedName("gananciaTotal")
    private BigDecimal gananciaTotal;

    @SerializedName("gananciaNeta")
    private BigDecimal gananciaNeta;

    @SerializedName("ventasEfectivo")
    private BigDecimal ventasEfectivo;

    @SerializedName("ventasTarjeta")
    private BigDecimal ventasTarjeta;

    @SerializedName("ventasTransferencia")
    private BigDecimal ventasTransferencia;

    @SerializedName("totalTickets")
    private Integer totalTickets;

    @SerializedName("horasTrabajadas")
    private BigDecimal horasTrabajadas;

    public String getFechaCorte() { return fechaCorte; }
    public BigDecimal getMontoInicial() { return montoInicial; }
    public BigDecimal getTotalVentas() { return totalVentas; }
    public BigDecimal getOtrosIngresos() { return otrosIngresos; }
    public BigDecimal getTotalEgresos() { return totalEgresos; }
    public BigDecimal getSaldoFinalCalculado() { return saldoFinalCalculado; }
    public BigDecimal getSaldoFinalReal() { return saldoFinalReal; }
    public BigDecimal getDiferencia() { return diferencia; }
    public Long getIdUsuario() { return idUsuario; }
    public BigDecimal getGananciaTotal() { return gananciaTotal; }
    public BigDecimal getGananciaNeta() { return gananciaNeta; }
    public BigDecimal getVentasEfectivo() { return ventasEfectivo; }
    public BigDecimal getVentasTarjeta() { return ventasTarjeta; }
    public BigDecimal getVentasTransferencia() { return ventasTransferencia; }
    public Integer getTotalTickets() { return totalTickets; }
    public BigDecimal getHorasTrabajadas() { return horasTrabajadas; }
}
