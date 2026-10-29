package com.dulcesnc.pos.data.local.entity;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.math.BigDecimal;

@Entity(tableName = "ventas")
public class VentaEntity {

    @PrimaryKey
    @ColumnInfo(name = "id_venta")
    private Long idVenta;

    @ColumnInfo(name = "id_usuario")
    private Long idUsuario;

    @ColumnInfo(name = "fecha_venta")
    private String fechaVenta;

    @ColumnInfo(name = "monto_total")
    private BigDecimal montoTotal;

    @ColumnInfo(name = "estatus")
    private String estatus;

    @ColumnInfo(name = "numero_ticket")
    private int numeroTicket;

    @ColumnInfo(name = "metodo_pago")
    private String metodoPago;

    @ColumnInfo(name = "descripcion_pendiente")
    private String descripcionPendiente;

    @ColumnInfo(name = "nombre_cliente")
    private String nombreCliente;

    @ColumnInfo(name = "sincronizado")
    private boolean sincronizado;

    public VentaEntity() {}

    public VentaEntity(Long idVenta, Long idUsuario, String fechaVenta, BigDecimal montoTotal,
                       String estatus, int numeroTicket, String metodoPago,
                       String descripcionPendiente, String nombreCliente, boolean sincronizado) {
        this.idVenta = idVenta;
        this.idUsuario = idUsuario;
        this.fechaVenta = fechaVenta;
        this.montoTotal = montoTotal;
        this.estatus = estatus;
        this.numeroTicket = numeroTicket;
        this.metodoPago = metodoPago;
        this.descripcionPendiente = descripcionPendiente;
        this.nombreCliente = nombreCliente;
        this.sincronizado = sincronizado;
    }

    public Long getIdVenta() { return idVenta; }
    public void setIdVenta(Long idVenta) { this.idVenta = idVenta; }
    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long idUsuario) { this.idUsuario = idUsuario; }
    public String getFechaVenta() { return fechaVenta; }
    public void setFechaVenta(String fechaVenta) { this.fechaVenta = fechaVenta; }
    public BigDecimal getMontoTotal() { return montoTotal; }
    public void setMontoTotal(BigDecimal montoTotal) { this.montoTotal = montoTotal; }
    public String getEstatus() { return estatus; }
    public void setEstatus(String estatus) { this.estatus = estatus; }
    public int getNumeroTicket() { return numeroTicket; }
    public void setNumeroTicket(int numeroTicket) { this.numeroTicket = numeroTicket; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public String getDescripcionPendiente() { return descripcionPendiente; }
    public void setDescripcionPendiente(String descripcionPendiente) { this.descripcionPendiente = descripcionPendiente; }
    public String getNombreCliente() { return nombreCliente; }
    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }
    public boolean isSincronizado() { return sincronizado; }
    public void setSincronizado(boolean sincronizado) { this.sincronizado = sincronizado; }
}
