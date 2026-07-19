package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

public class ProveedorDTO {

    @SerializedName("idProveedor")
    private Long idProveedor;

    @SerializedName("nombre")
    private String nombre;

    @SerializedName("contacto")
    private String contacto;

    @SerializedName("telefono")
    private String telefono;

    @SerializedName("email")
    private String email;

    @SerializedName("direccion")
    private String direccion;

    @SerializedName("notas")
    private String notas;

    @SerializedName("tipoProveedor")
    private String tipoProveedor;

    @SerializedName("diasEntrega")
    private Integer diasEntrega;

    @SerializedName("diasPedido")
    private Integer diasPedido;

    @SerializedName("estatus")
    private String estatus;

    public ProveedorDTO() {}

    public ProveedorDTO(Long idProveedor, String nombre, String contacto, String telefono,
                        String email, String direccion, String notas) {
        this.idProveedor = idProveedor;
        this.nombre = nombre;
        this.contacto = contacto;
        this.telefono = telefono;
        this.email = email;
        this.direccion = direccion;
        this.notas = notas;
    }

    public Long getIdProveedor() { return idProveedor; }
    public void setIdProveedor(Long id) { this.idProveedor = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String s) { this.nombre = s; }
    public String getContacto() { return contacto; }
    public void setContacto(String s) { this.contacto = s; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String s) { this.telefono = s; }
    public String getEmail() { return email; }
    public void setEmail(String s) { this.email = s; }
    public String getDireccion() { return direccion; }
    public void setDireccion(String s) { this.direccion = s; }
    public String getNotas() { return notas; }
    public void setNotas(String s) { this.notas = s; }
    public String getTipoProveedor() { return tipoProveedor; }
    public void setTipoProveedor(String s) { this.tipoProveedor = s; }
    public Integer getDiasEntrega() { return diasEntrega; }
    public void setDiasEntrega(Integer i) { this.diasEntrega = i; }
    public Integer getDiasPedido() { return diasPedido; }
    public void setDiasPedido(Integer i) { this.diasPedido = i; }
    public String getEstatus() { return estatus; }
    public void setEstatus(String s) { this.estatus = s; }
}
