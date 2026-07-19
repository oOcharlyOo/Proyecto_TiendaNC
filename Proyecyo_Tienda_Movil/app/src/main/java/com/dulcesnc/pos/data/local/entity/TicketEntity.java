package com.dulcesnc.pos.data.local.entity;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.Ignore;
import androidx.room.PrimaryKey;

import java.math.BigDecimal;

@Entity(tableName = "tickets")
public class TicketEntity {

    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id_ticket")
    private long idTicket;

    @ColumnInfo(name = "id_venta_servidor")
    private Long idVentaServidor;

    @ColumnInfo(name = "numero_ticket")
    private int numeroTicket;

    @ColumnInfo(name = "monto_total")
    private BigDecimal montoTotal;

    @ColumnInfo(name = "metodo_pago")
    private String metodoPago;

    @ColumnInfo(name = "estado")
    private String estado;

    @ColumnInfo(name = "creado_en")
    private long creadoEn;

    @ColumnInfo(name = "descripcion_pendiente")
    private String descripcionPendiente;

    @ColumnInfo(name = "nombre_cliente")
    private String nombreCliente;

    @ColumnInfo(name = "id_usuario")
    private Long idUsuario;

    @ColumnInfo(name = "desde_backend")
    private boolean desdeBackend;

    @ColumnInfo(name = "nombre_usuario")
    private String nombreUsuario;

    public TicketEntity() {}

    @Ignore
    public TicketEntity(Long idVentaServidor, int numeroTicket, String estado,
                        long creadoEn, String descripcionPendiente, Long idUsuario,
                        boolean desdeBackend, String nombreUsuario) {
        this.idVentaServidor = idVentaServidor;
        this.numeroTicket = numeroTicket;
        this.estado = estado;
        this.creadoEn = creadoEn;
        this.descripcionPendiente = descripcionPendiente;
        this.idUsuario = idUsuario;
        this.desdeBackend = desdeBackend;
        this.nombreUsuario = nombreUsuario;
    }

    public long getIdTicket() { return idTicket; }
    public void setIdTicket(long idTicket) { this.idTicket = idTicket; }
    public Long getIdVentaServidor() { return idVentaServidor; }
    public void setIdVentaServidor(Long idVentaServidor) { this.idVentaServidor = idVentaServidor; }
    public int getNumeroTicket() { return numeroTicket; }
    public void setNumeroTicket(int numeroTicket) { this.numeroTicket = numeroTicket; }
    public BigDecimal getMontoTotal() { return montoTotal; }
    public void setMontoTotal(BigDecimal montoTotal) { this.montoTotal = montoTotal; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public long getCreadoEn() { return creadoEn; }
    public void setCreadoEn(long creadoEn) { this.creadoEn = creadoEn; }
    public String getDescripcionPendiente() { return descripcionPendiente; }
    public void setDescripcionPendiente(String descripcionPendiente) { this.descripcionPendiente = descripcionPendiente; }
    public String getNombreCliente() { return nombreCliente; }
    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }
    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long idUsuario) { this.idUsuario = idUsuario; }
    public boolean isDesdeBackend() { return desdeBackend; }
    public void setDesdeBackend(boolean desdeBackend) { this.desdeBackend = desdeBackend; }
    public String getNombreUsuario() { return nombreUsuario; }
    public void setNombreUsuario(String nombreUsuario) { this.nombreUsuario = nombreUsuario; }
}
