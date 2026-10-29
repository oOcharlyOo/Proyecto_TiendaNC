package com.dulcesnc.pos.data.local.entity;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "subcategorias")
public class SubcategoriaEntity {

    @PrimaryKey
    @ColumnInfo(name = "id_subcategoria")
    private Long idSubcategoria;

    @ColumnInfo(name = "nombre")
    private String nombre;

    @ColumnInfo(name = "descripcion")
    private String descripcion;

    @ColumnInfo(name = "id_categoria")
    private Long idCategoria;

    @ColumnInfo(name = "estatus")
    private String estatus;

    @ColumnInfo(name = "sincronizado")
    private boolean sincronizado;

    public SubcategoriaEntity() {}

    public SubcategoriaEntity(Long idSubcategoria, String nombre, String descripcion,
                              Long idCategoria, String estatus, boolean sincronizado) {
        this.idSubcategoria = idSubcategoria;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.idCategoria = idCategoria;
        this.estatus = estatus;
        this.sincronizado = sincronizado;
    }

    public Long getIdSubcategoria() { return idSubcategoria; }
    public void setIdSubcategoria(Long idSubcategoria) { this.idSubcategoria = idSubcategoria; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public Long getIdCategoria() { return idCategoria; }
    public void setIdCategoria(Long idCategoria) { this.idCategoria = idCategoria; }
    public String getEstatus() { return estatus; }
    public void setEstatus(String estatus) { this.estatus = estatus; }
    public boolean isSincronizado() { return sincronizado; }
    public void setSincronizado(boolean sincronizado) { this.sincronizado = sincronizado; }
}
