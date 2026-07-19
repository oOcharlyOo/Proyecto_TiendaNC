package com.dulcesnc.pos.utils;

import android.content.Context;
import android.content.SharedPreferences;

import com.dulcesnc.pos.data.remote.dto.UsuarioDTO;
import com.google.gson.Gson;

public class SessionManager {

    private static SessionManager instance;
    private final SharedPreferences prefs;
    private final Gson gson = new Gson();

    private SessionManager(Context context) {
        prefs = context.getSharedPreferences(Constants.PREF_NAME, Context.MODE_PRIVATE);
    }

    public static synchronized SessionManager getInstance(Context context) {
        if (instance == null) {
            instance = new SessionManager(context.getApplicationContext());
        }
        return instance;
    }

    public void saveSession(UsuarioDTO usuario) {
        prefs.edit()
                .putLong(Constants.KEY_USER_ID, usuario.getIdUsuario())
                .putString(Constants.KEY_USER_NAME, usuario.getNombre() + " " +
                        (usuario.getApellidoP() != null ? usuario.getApellidoP() : ""))
                .putInt(Constants.KEY_USER_TYPE, usuario.getIdTipoUsuario() != null ?
                        usuario.getIdTipoUsuario() : 0)
                .apply();
    }

    public boolean isLoggedIn() {
        return prefs.getLong(Constants.KEY_USER_ID, -1) != -1;
    }

    public long getUserId() {
        return prefs.getLong(Constants.KEY_USER_ID, -1);
    }

    public String getUserName() {
        return prefs.getString(Constants.KEY_USER_NAME, "");
    }

    public int getUserType() {
        return prefs.getInt(Constants.KEY_USER_TYPE, 0);
    }

    public boolean isAdmin() {
        return getUserType() == 1;
    }

    public String getSucursal() {
        return prefs.getString(Constants.KEY_SUCURSAL, Constants.SUCURSAL_DULCERIA);
    }

    public void setSucursal(String sucursal) {
        prefs.edit().putString(Constants.KEY_SUCURSAL, sucursal).apply();
    }

    public void logout() {
        prefs.edit().clear().apply();
    }
}
