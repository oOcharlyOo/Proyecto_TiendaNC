package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

public class SubcategoriaDTO {

    @SerializedName("idSubcategoria")
    private Long idSubcategoria;

    @SerializedName("nombre")
    private String nombre;

    @SerializedName("descripcion")
    private String descripcion;

    @SerializedName("idCategoria")
    private Long idCategoria;

    @SerializedName("estatus")
    private String estatus;

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
}
