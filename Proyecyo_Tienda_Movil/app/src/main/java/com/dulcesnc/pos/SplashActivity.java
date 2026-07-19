package com.dulcesnc.pos;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.dulcesnc.pos.utils.Constants;

public class SplashActivity extends AppCompatActivity {

    private TextView tvStatus;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        tvStatus = findViewById(R.id.tvStatus);

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            tvStatus.setText("Cargando datos locales...");

            boolean hasSession = getSharedPreferences(Constants.PREF_NAME, MODE_PRIVATE)
                    .contains(Constants.KEY_USER_ID);

            tvStatus.setText(hasSession ? "Bienvenido" : "Iniciar sesión");

            Intent intent = new Intent(SplashActivity.this, MainActivity.class);
            startActivity(intent);
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
            finish();
        }, 2000);
    }
}
