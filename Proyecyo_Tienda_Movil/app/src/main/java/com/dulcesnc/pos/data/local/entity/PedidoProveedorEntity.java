package com.dulcesnc.pos.data.local.entity;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.io.Serializable;
import java.math.BigDecimal;

@Entity(tableName = "pedidos_proveedor")
public class PedidoProveedorEntity implements Serializable {

    @PrimaryKey
    @ColumnInfo(name = "id_pedido")
    private Long idPedido;

    @ColumnInfo(name = "id_proveedor")
    private Long idProveedor;

    @ColumnInfo(name = "nombre_proveedor")
    private String nombreProveedor;

    @ColumnInfo(name = "fecha_creacion")
    private String fechaCreacion;

    @ColumnInfo(name = "fecha_entrega_esperada")
    private String fechaEntregaEsperada;

    @ColumnInfo(name = "monto_total")
    private BigDecimal montoTotal;

    @ColumnInfo(name = "monto_apartado")
    private BigDecimal montoApartado;

    @ColumnInfo(name = "estatus")
    private String estatus;

    @ColumnInfo(name = "notas")
    private String notas;

    @ColumnInfo(name = "sincronizado")
    private boolean sincronizado;

    public PedidoProveedorEntity() {}

    public PedidoProveedorEntity(Long idPedido, Long idProveedor, String nombreProveedor,
                                 String fechaCreacion, String fechaEntregaEsperada,
                                 BigDecimal montoTotal, BigDecimal montoApartado,
                                 String estatus, String notas, boolean sincronizado) {
        this.idPedido = idPedido;
        this.idProveedor = idProveedor;
        this.nombreProveedor = nombreProveedor;
        this.fechaCreacion = fechaCreacion;
        this.fechaEntregaEsperada = fechaEntregaEsperada;
        this.montoTotal = montoTotal;
        this.montoApartado = montoApartado;
        this.estatus = estatus;
        this.notas = notas;
        this.sincronizado = sincronizado;
    }

    public Long getIdPedido() { return idPedido; }
    public void setIdPedido(Long idPedido) { this.idPedido = idPedido; }
    public Long getIdProveedor() { return idProveedor; }
    public void setIdProveedor(Long idProveedor) { this.idProveedor = idProveedor; }
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
    public boolean isSincronizado() { return sincronizado; }
    public void setSincronizado(boolean b) { this.sincronizado = b; }
}
