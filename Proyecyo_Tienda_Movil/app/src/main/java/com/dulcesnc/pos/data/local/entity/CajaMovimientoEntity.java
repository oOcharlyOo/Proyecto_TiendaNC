package com.dulcesnc.pos.data.local.entity;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

import java.io.Serializable;

@Entity(tableName = "caja_movs")
public class CajaMovimientoEntity implements Serializable {

    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id_movimiento")
    private long idMovimiento;

    @ColumnInfo(name = "tipo")
    private String tipo; // ENTRADA | SALIDA

    @ColumnInfo(name = "monto")
    private double monto;

    @ColumnInfo(name = "descripcion")
    private String descripcion;

    @ColumnInfo(name = "id_usuario")
    private Long idUsuario;

    @ColumnInfo(name = "fecha")
    private String fecha;

    @ColumnInfo(name = "sincronizado")
    private boolean sincronizado;

    public CajaMovimientoEntity() {}

    public CajaMovimientoEntity(String tipo, double monto, String descripcion,
                                 Long idUsuario, String fecha, boolean sincronizado) {
        this.tipo = tipo;
        this.monto = monto;
        this.descripcion = descripcion;
        this.idUsuario = idUsuario;
        this.fecha = fecha;
        this.sincronizado = sincronizado;
    }

    public long getIdMovimiento() { return idMovimiento; }
    public void setIdMovimiento(long id) { this.idMovimiento = id; }
    public String getTipo() { return tipo; }
    public void setTipo(String s) { this.tipo = s; }
    public double getMonto() { return monto; }
    public void setMonto(double d) { this.monto = d; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String s) { this.descripcion = s; }
    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long id) { this.idUsuario = id; }
    public String getFecha() { return fecha; }
    public void setFecha(String s) { this.fecha = s; }
    public boolean isSincronizado() { return sincronizado; }
    public void setSincronizado(boolean b) { this.sincronizado = b; }
}
