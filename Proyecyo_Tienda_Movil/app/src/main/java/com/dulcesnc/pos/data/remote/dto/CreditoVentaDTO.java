package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;
import java.util.List;

public class CreditoVentaDTO {

    @SerializedName("idCreditoVenta")
    private Long idCreditoVenta;

    @SerializedName("idPersona")
    private Long idPersona;

    @SerializedName("nombrePersona")
    private String nombrePersona;

    @SerializedName("telefonoPersona")
    private String telefonoPersona;

    @SerializedName("idVenta")
    private Long idVenta;

    @SerializedName("numeroTicket")
    private Integer numeroTicket;

    @SerializedName("montoTotal")
    private BigDecimal montoTotal;

    @SerializedName("montoPagado")
    private BigDecimal montoPagado;

    @SerializedName("saldoPendiente")
    private BigDecimal saldoPendiente;

    @SerializedName("estatus")
    private String estatus;

    @SerializedName("fechaCreacion")
    private String fechaCreacion;

    @SerializedName("notas")
    private String notas;

    @SerializedName("abonos")
    private List<CreditoAbonoDTO> abonos;

    public Long getIdCreditoVenta() { return idCreditoVenta; }
    public void setIdCreditoVenta(Long id) { this.idCreditoVenta = id; }
    public Long getIdPersona() { return idPersona; }
    public void setIdPersona(Long id) { this.idPersona = id; }
    public String getNombrePersona() { return nombrePersona; }
    public void setNombrePersona(String s) { this.nombrePersona = s; }
    public String getTelefonoPersona() { return telefonoPersona; }
    public void setTelefonoPersona(String s) { this.telefonoPersona = s; }
    public Long getIdVenta() { return idVenta; }
    public void setIdVenta(Long id) { this.idVenta = id; }
    public Integer getNumeroTicket() { return numeroTicket; }
    public void setNumeroTicket(Integer i) { this.numeroTicket = i; }
    public BigDecimal getMontoTotal() { return montoTotal; }
    public void setMontoTotal(BigDecimal b) { this.montoTotal = b; }
    public BigDecimal getMontoPagado() { return montoPagado; }
    public void setMontoPagado(BigDecimal b) { this.montoPagado = b; }
    public BigDecimal getSaldoPendiente() { return saldoPendiente; }
    public void setSaldoPendiente(BigDecimal b) { this.saldoPendiente = b; }
    public String getEstatus() { return estatus; }
    public void setEstatus(String s) { this.estatus = s; }
    public String getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(String s) { this.fechaCreacion = s; }
    public String getNotas() { return notas; }
    public void setNotas(String s) { this.notas = s; }
    public List<CreditoAbonoDTO> getAbonos() { return abonos; }
    public void setAbonos(List<CreditoAbonoDTO> a) { this.abonos = a; }
}
