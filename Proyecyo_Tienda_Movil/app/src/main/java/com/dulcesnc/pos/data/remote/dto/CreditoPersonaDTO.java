package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

public class CreditoPersonaDTO {

    @SerializedName("idPersona")
    private Long idPersona;

    @SerializedName("nombre")
    private String nombre;

    @SerializedName("telefono")
    private String telefono;

    @SerializedName("direccion")
    private String direccion;

    @SerializedName("correo")
    private String correo;

    @SerializedName("totalDeuda")
    private java.math.BigDecimal totalDeuda;

    public CreditoPersonaDTO() {}

    public CreditoPersonaDTO(Long idPersona, String nombre, String telefono,
                             String direccion, String correo) {
        this.idPersona = idPersona;
        this.nombre = nombre;
        this.telefono = telefono;
        this.direccion = direccion;
        this.correo = correo;
    }

    public Long getIdPersona() { return idPersona; }
    public void setIdPersona(Long idPersona) { this.idPersona = idPersona; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    public java.math.BigDecimal getTotalDeuda() { return totalDeuda; }
    public void setTotalDeuda(java.math.BigDecimal totalDeuda) { this.totalDeuda = totalDeuda; }
}
