package com.dulcesnc.pos.data.local.entity;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "usuarios")
public class UsuarioEntity implements java.io.Serializable {

    @PrimaryKey
    @ColumnInfo(name = "id_usuario")
    private Long idUsuario;

    @ColumnInfo(name = "usuario")
    private String usuario;

    @ColumnInfo(name = "nombre")
    private String nombre;

    @ColumnInfo(name = "apellido_p")
    private String apellidoP;

    @ColumnInfo(name = "apellido_m")
    private String apellidoM;

    @ColumnInfo(name = "password_hash")
    private String passwordHash;

    @ColumnInfo(name = "id_tipo_usuario")
    private Integer idTipoUsuario;

    @ColumnInfo(name = "avatar")
    private String avatar;

    @ColumnInfo(name = "sueldo_hora")
    private Double sueldoHora;

    @ColumnInfo(name = "dias_semana")
    private Integer diasSemana;

    @ColumnInfo(name = "horas_trabajadas")
    private Integer horasTrabajadas;

    @ColumnInfo(name = "sincronizado")
    private boolean sincronizado;

    public UsuarioEntity() {}

    public UsuarioEntity(Long idUsuario, String usuario, String nombre, String apellidoP,
                         String apellidoM, String passwordHash, Integer idTipoUsuario,
                         String avatar, Double sueldoHora, Integer diasSemana,
                         Integer horasTrabajadas, boolean sincronizado) {
        this.idUsuario = idUsuario;
        this.usuario = usuario;
        this.nombre = nombre;
        this.apellidoP = apellidoP;
        this.apellidoM = apellidoM;
        this.passwordHash = passwordHash;
        this.idTipoUsuario = idTipoUsuario;
        this.avatar = avatar;
        this.sueldoHora = sueldoHora;
        this.diasSemana = diasSemana;
        this.horasTrabajadas = horasTrabajadas;
        this.sincronizado = sincronizado;
    }

    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long idUsuario) { this.idUsuario = idUsuario; }
    public String getUsuario() { return usuario; }
    public void setUsuario(String usuario) { this.usuario = usuario; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getApellidoP() { return apellidoP; }
    public void setApellidoP(String apellidoP) { this.apellidoP = apellidoP; }
    public String getApellidoM() { return apellidoM; }
    public void setApellidoM(String apellidoM) { this.apellidoM = apellidoM; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Integer getIdTipoUsuario() { return idTipoUsuario; }
    public void setIdTipoUsuario(Integer idTipoUsuario) { this.idTipoUsuario = idTipoUsuario; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public Double getSueldoHora() { return sueldoHora; }
    public void setSueldoHora(Double sueldoHora) { this.sueldoHora = sueldoHora; }
    public Integer getDiasSemana() { return diasSemana; }
    public void setDiasSemana(Integer diasSemana) { this.diasSemana = diasSemana; }
    public Integer getHorasTrabajadas() { return horasTrabajadas; }
    public void setHorasTrabajadas(Integer horasTrabajadas) { this.horasTrabajadas = horasTrabajadas; }
    public boolean isSincronizado() { return sincronizado; }
    public void setSincronizado(boolean sincronizado) { this.sincronizado = sincronizado; }
}
