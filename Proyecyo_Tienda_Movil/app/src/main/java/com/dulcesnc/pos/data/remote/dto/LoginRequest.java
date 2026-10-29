package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

public class LoginRequest {

    @SerializedName("usuario")
    private String usuario;

    @SerializedName("password_hash")
    private String passwordHash;

    public LoginRequest(String usuario, String passwordHash) {
        this.usuario = usuario;
        this.passwordHash = passwordHash;
    }

    public String getUsuario() { return usuario; }
    public String getPasswordHash() { return passwordHash; }
}
