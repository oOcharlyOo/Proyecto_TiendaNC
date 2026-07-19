package com.dulcesnc.pos;

import android.app.Application;

import io.reactivex.rxjava3.plugins.RxJavaPlugins;

public class MainApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();

        RxJavaPlugins.setErrorHandler(throwable -> {
            // Evita UndeliverableException que crashea la app
            if (throwable != null) {
                android.util.Log.e("RxJava", "Undeliverable exception", throwable);
            }
        });

        // El sync ahora es manual (botón "Sincronizar" en Historial).
        // No se programa ningún sync automático.
    }
}
