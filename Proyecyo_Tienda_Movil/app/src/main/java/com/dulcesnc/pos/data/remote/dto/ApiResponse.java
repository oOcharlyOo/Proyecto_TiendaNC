package com.dulcesnc.pos.data.remote.dto;

import com.google.gson.annotations.SerializedName;

public class ApiResponse<T> {

    @SerializedName("codigo")
    private int codigo;

    @SerializedName("mensaje")
    private String mensaje;

    @SerializedName("datos")
    private T datos;

    public int getCodigo() { return codigo; }
    public String getMensaje() { return mensaje; }
    public T getDatos() { return datos; }

    public boolean isSuccess() { return codigo == 200; }
}
