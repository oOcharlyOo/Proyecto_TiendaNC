package com.dulcesnc.pos.data.local.entity;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.Ignore;
import androidx.room.PrimaryKey;

import java.math.BigDecimal;

@Entity(tableName = "ticket_items")
public class TicketItemEntity {

    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id_item")
    private long idItem;

    @ColumnInfo(name = "id_ticket")
    private long idTicket;

    @ColumnInfo(name = "id_producto")
    private Long idProducto;

    @ColumnInfo(name = "nombre")
    private String nombre;

    @ColumnInfo(name = "cantidad")
    private int cantidad;

    @ColumnInfo(name = "precio_unitario")
    private BigDecimal precioUnitario;

    @ColumnInfo(name = "tipo_precio")
    private String tipoPrecio;

    @ColumnInfo(name = "is_gramaje")
    private boolean isGramaje;

    @ColumnInfo(name = "precio_envase")
    private BigDecimal precioEnvase;

    @ColumnInfo(name = "cobro_envase")
    private boolean cobroEnvase;

    @ColumnInfo(name = "cantidad_envase")
    private int cantidadEnvase;

    @ColumnInfo(name = "id_venta_detalle_servidor")
    private Long idVentaDetalleServidor;

    @ColumnInfo(name = "id_promocion")
    private Long idPromocion;

    public TicketItemEntity() {}

    @Ignore
    public TicketItemEntity(long idTicket, Long idProducto, String nombre, int cantidad,
                            BigDecimal precioUnitario, String tipoPrecio, boolean isGramaje,
                            BigDecimal precioEnvase, boolean cobroEnvase, int cantidadEnvase,
                            Long idVentaDetalleServidor, Long idPromocion) {
        this.idTicket = idTicket;
        this.idProducto = idProducto;
        this.nombre = nombre;
        this.cantidad = cantidad;
        this.precioUnitario = precioUnitario;
        this.tipoPrecio = tipoPrecio;
        this.isGramaje = isGramaje;
        this.precioEnvase = precioEnvase;
        this.cobroEnvase = cobroEnvase;
        this.cantidadEnvase = cantidadEnvase;
        this.idVentaDetalleServidor = idVentaDetalleServidor;
        this.idPromocion = idPromocion;
    }

    public long getIdItem() { return idItem; }
    public void setIdItem(long idItem) { this.idItem = idItem; }
    public long getIdTicket() { return idTicket; }
    public void setIdTicket(long idTicket) { this.idTicket = idTicket; }
    public Long getIdProducto() { return idProducto; }
    public void setIdProducto(Long idProducto) { this.idProducto = idProducto; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public int getCantidad() { return cantidad; }
    public void setCantidad(int cantidad) { this.cantidad = cantidad; }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal precioUnitario) { this.precioUnitario = precioUnitario; }
    public String getTipoPrecio() { return tipoPrecio; }
    public void setTipoPrecio(String tipoPrecio) { this.tipoPrecio = tipoPrecio; }
    public boolean isGramaje() { return isGramaje; }
    public void setGramaje(boolean gramaje) { isGramaje = gramaje; }
    public BigDecimal getPrecioEnvase() { return precioEnvase; }
    public void setPrecioEnvase(BigDecimal precioEnvase) { this.precioEnvase = precioEnvase; }
    public boolean isCobroEnvase() { return cobroEnvase; }
    public void setCobroEnvase(boolean cobroEnvase) { this.cobroEnvase = cobroEnvase; }
    public int getCantidadEnvase() { return cantidadEnvase; }
    public void setCantidadEnvase(int cantidadEnvase) { this.cantidadEnvase = cantidadEnvase; }
    public Long getIdVentaDetalleServidor() { return idVentaDetalleServidor; }
    public void setIdVentaDetalleServidor(Long idVentaDetalleServidor) { this.idVentaDetalleServidor = idVentaDetalleServidor; }
    public Long getIdPromocion() { return idPromocion; }
    public void setIdPromocion(Long idPromocion) { this.idPromocion = idPromocion; }
}
