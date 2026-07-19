package com.dulcesnc.pos.data.local.entity;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.io.Serializable;
import java.math.BigDecimal;

@Entity(tableName = "apartados")
public class ApartadoEntity implements Serializable {

    @PrimaryKey
    @ColumnInfo(name = "id_apartado")
    private Long idApartado;

    @ColumnInfo(name = "nombre_producto")
    private String nombreProducto;

    @ColumnInfo(name = "monto_total")
    private BigDecimal montoTotal;

    @ColumnInfo(name = "monto_pagado")
    private BigDecimal montoPagado;

    @ColumnInfo(name = "monto_restante")
    private BigDecimal montoRestante;

    @ColumnInfo(name = "frecuencia_pago")
    private String frecuenciaPago;

    @ColumnInfo(name = "monto_por_periodo")
    private BigDecimal montoPorPeriodo;

    @ColumnInfo(name = "fecha_inicio")
    private String fechaInicio;

    @ColumnInfo(name = "fecha_fin")
    private String fechaFin;

    @ColumnInfo(name = "estatus")
    private String estatus;

    @ColumnInfo(name = "id_usuario")
    private Long idUsuario;

    @ColumnInfo(name = "nombre_usuario")
    private String nombreUsuario;

    @ColumnInfo(name = "sincronizado")
    private boolean sincronizado;

    public ApartadoEntity() {}

    public ApartadoEntity(Long idApartado, String nombreProducto, BigDecimal montoTotal,
                          BigDecimal montoPagado, BigDecimal montoRestante, String frecuenciaPago,
                          BigDecimal montoPorPeriodo, String fechaInicio, String fechaFin,
                          String estatus, Long idUsuario, String nombreUsuario, boolean sincronizado) {
        this.idApartado = idApartado;
        this.nombreProducto = nombreProducto;
        this.montoTotal = montoTotal;
        this.montoPagado = montoPagado;
        this.montoRestante = montoRestante;
        this.frecuenciaPago = frecuenciaPago;
        this.montoPorPeriodo = montoPorPeriodo;
        this.fechaInicio = fechaInicio;
        this.fechaFin = fechaFin;
        this.estatus = estatus;
        this.idUsuario = idUsuario;
        this.nombreUsuario = nombreUsuario;
        this.sincronizado = sincronizado;
    }

    public Long getIdApartado() { return idApartado; }
    public void setIdApartado(Long id) { this.idApartado = id; }
    public String getNombreProducto() { return nombreProducto; }
    public void setNombreProducto(String s) { this.nombreProducto = s; }
    public BigDecimal getMontoTotal() { return montoTotal; }
    public void setMontoTotal(BigDecimal b) { this.montoTotal = b; }
    public BigDecimal getMontoPagado() { return montoPagado; }
    public void setMontoPagado(BigDecimal b) { this.montoPagado = b; }
    public BigDecimal getMontoRestante() { return montoRestante; }
    public void setMontoRestante(BigDecimal b) { this.montoRestante = b; }
    public String getFrecuenciaPago() { return frecuenciaPago; }
    public void setFrecuenciaPago(String s) { this.frecuenciaPago = s; }
    public BigDecimal getMontoPorPeriodo() { return montoPorPeriodo; }
    public void setMontoPorPeriodo(BigDecimal b) { this.montoPorPeriodo = b; }
    public String getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(String s) { this.fechaInicio = s; }
    public String getFechaFin() { return fechaFin; }
    public void setFechaFin(String s) { this.fechaFin = s; }
    public String getEstatus() { return estatus; }
    public void setEstatus(String s) { this.estatus = s; }
    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long id) { this.idUsuario = id; }
    public String getNombreUsuario() { return nombreUsuario; }
    public void setNombreUsuario(String s) { this.nombreUsuario = s; }
    public boolean isSincronizado() { return sincronizado; }
    public void setSincronizado(boolean b) { this.sincronizado = b; }
}
