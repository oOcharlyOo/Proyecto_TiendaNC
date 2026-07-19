package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;
import java.util.List;

public class VentaRequestDTO {

    @SerializedName("idUsuario")
    private Long idUsuario;

    @SerializedName("fechaVenta")
    private String fechaVenta;

    @SerializedName("montoTotal")
    private BigDecimal montoTotal;

    @SerializedName("estatus")
    private String estatus;

    @SerializedName("numeroTicket")
    private int numeroTicket;

    @SerializedName("metodoPago")
    private String metodoPago;

    @SerializedName("nombreUsuario")
    private String nombreUsuario;

    @SerializedName("descripcionPendiente")
    private String descripcionPendiente;

    @SerializedName("ganancia")
    private java.math.BigDecimal ganancia;

    @SerializedName("tieneDiscrepancia")
    private Boolean tieneDiscrepancia;

    @SerializedName("ventasDetalle")
    private List<VentaDetalleDTO> ventasDetalle;

    public VentaRequestDTO() {}

    public VentaRequestDTO(Long idUsuario, BigDecimal montoTotal, String estatus,
                           int numeroTicket, String metodoPago, List<VentaDetalleDTO> ventasDetalle) {
        this.idUsuario = idUsuario;
        this.fechaVenta = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        this.montoTotal = montoTotal;
        this.estatus = estatus;
        this.numeroTicket = numeroTicket;
        this.metodoPago = metodoPago;
        this.ventasDetalle = ventasDetalle;
    }

    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long idUsuario) { this.idUsuario = idUsuario; }
    public String getFechaVenta() { return fechaVenta; }
    public BigDecimal getMontoTotal() { return montoTotal; }
    public void setMontoTotal(BigDecimal montoTotal) { this.montoTotal = montoTotal; }
    public String getEstatus() { return estatus; }
    public void setEstatus(String estatus) { this.estatus = estatus; }
    public int getNumeroTicket() { return numeroTicket; }
    public void setNumeroTicket(int numeroTicket) { this.numeroTicket = numeroTicket; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public String getNombreUsuario() { return nombreUsuario; }
    public void setNombreUsuario(String s) { this.nombreUsuario = s; }
    public String getDescripcionPendiente() { return descripcionPendiente; }
    public void setDescripcionPendiente(String s) { this.descripcionPendiente = s; }
    public java.math.BigDecimal getGanancia() { return ganancia; }
    public void setGanancia(java.math.BigDecimal b) { this.ganancia = b; }
    public Boolean getTieneDiscrepancia() { return tieneDiscrepancia; }
    public void setTieneDiscrepancia(Boolean b) { this.tieneDiscrepancia = b; }
    public List<VentaDetalleDTO> getVentasDetalle() { return ventasDetalle; }
    public void setVentasDetalle(List<VentaDetalleDTO> ventasDetalle) { this.ventasDetalle = ventasDetalle; }

    @SerializedName("idVenta")
    private Long idVenta;

    public Long getIdVenta() { return idVenta; }
    public void setIdVenta(Long idVenta) { this.idVenta = idVenta; }
}
