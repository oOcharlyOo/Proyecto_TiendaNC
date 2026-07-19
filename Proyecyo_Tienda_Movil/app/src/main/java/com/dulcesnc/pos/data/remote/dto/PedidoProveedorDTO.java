package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

import java.math.BigDecimal;
import java.util.List;

public class PedidoProveedorDTO {

    @SerializedName("idPedido")
    private Long idPedido;

    @SerializedName("idProveedor")
    private Long idProveedor;

    @SerializedName("nombreProveedor")
    private String nombreProveedor;

    @SerializedName("fechaCreacion")
    private String fechaCreacion;

    @SerializedName("fechaEntregaEsperada")
    private String fechaEntregaEsperada;

    @SerializedName("montoTotal")
    private BigDecimal montoTotal;

    @SerializedName("montoApartado")
    private BigDecimal montoApartado;

    @SerializedName("estatus")
    private String estatus;

    @SerializedName("notas")
    private String notas;

    @SerializedName("detalles")
    private List<PedidoDetalleDTO> detalles;

    public PedidoProveedorDTO() {}

    public Long getIdPedido() { return idPedido; }
    public void setIdPedido(Long id) { this.idPedido = id; }
    public Long getIdProveedor() { return idProveedor; }
    public void setIdProveedor(Long id) { this.idProveedor = id; }
    public String getNombreProveedor() { return nombreProveedor; }
    public void setNombreProveedor(String s) { this.nombreProveedor = s; }
    public String getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(String s) { this.fechaCreacion = s; }
    public String getFechaEntregaEsperada() { return fechaEntregaEsperada; }
    public void setFechaEntregaEsperada(String s) { this.fechaEntregaEsperada = s; }
    public BigDecimal getMontoTotal() { return montoTotal; }
    public void setMontoTotal(BigDecimal b) { this.montoTotal = b; }
    public BigDecimal getMontoApartado() { return montoApartado; }
    public void setMontoApartado(BigDecimal b) { this.montoApartado = b; }
    public String getEstatus() { return estatus; }
    public void setEstatus(String s) { this.estatus = s; }
    public String getNotas() { return notas; }
    public void setNotas(String s) { this.notas = s; }
    public List<PedidoDetalleDTO> getDetalles() { return detalles; }
    public void setDetalles(List<PedidoDetalleDTO> d) { this.detalles = d; }
}
