package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

public class UsuarioDTO {

    @SerializedName("idUsuario")
    private Long idUsuario;

    @SerializedName("usuario")
    private String usuario;

    @SerializedName("nombre")
    private String nombre;

    @SerializedName("apellido_p")
    private String apellidoP;

    @SerializedName("apellido_m")
    private String apellidoM;

    @SerializedName("password_hash")
    private String passwordHash;

    @SerializedName("id_tipo_usuario")
    private Integer idTipoUsuario;

    @SerializedName("avatar")
    private String avatar;

    @SerializedName("sueldo_hora")
    private Double sueldoHora;

    @SerializedName("dias_semana")
    private Integer diasSemana;

    @SerializedName("horas_trabajadas")
    private Integer horasTrabajadas;

    public Long getIdUsuario() { return idUsuario; }
    public String getUsuario() { return usuario; }
    public String getNombre() { return nombre; }
    public String getApellidoP() { return apellidoP; }
    public String getApellidoM() { return apellidoM; }
    public String getPasswordHash() { return passwordHash; }
    public Integer getIdTipoUsuario() { return idTipoUsuario; }
    public String getAvatar() { return avatar; }
    public Double getSueldoHora() { return sueldoHora; }
    public Integer getDiasSemana() { return diasSemana; }
    public Integer getHorasTrabajadas() { return horasTrabajadas; }
    public void setIdUsuario(Long idUsuario) { this.idUsuario = idUsuario; }
    public void setUsuario(String usuario) { this.usuario = usuario; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public void setApellidoP(String apellidoP) { this.apellidoP = apellidoP; }
    public void setApellidoM(String apellidoM) { this.apellidoM = apellidoM; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setIdTipoUsuario(Integer idTipoUsuario) { this.idTipoUsuario = idTipoUsuario; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public void setSueldoHora(Double sueldoHora) { this.sueldoHora = sueldoHora; }
    public void setDiasSemana(Integer diasSemana) { this.diasSemana = diasSemana; }
    public void setHorasTrabajadas(Integer horasTrabajadas) { this.horasTrabajadas = horasTrabajadas; }
}
