package com.dulcesnc.pos.ui.ventas;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.DialogFragment;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.DatabaseClient;
import com.dulcesnc.pos.data.local.entity.CajaMovimientoEntity;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.ApiResponse;
import com.dulcesnc.pos.data.remote.dto.EntradaSalidaDTO;
import com.dulcesnc.pos.utils.SessionManager;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import io.reactivex.rxjava3.schedulers.Schedulers;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;

public class EntradaSalidaDialogFragment extends DialogFragment {

    private String tipo = "ENTRADA";

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            tipo = getArguments().getString("tipo", "ENTRADA");
        }
        setStyle(DialogFragment.STYLE_NORMAL, R.style.Theme_ZeldaDialog);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.dialog_entrada_salida, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        TextView tvTitulo = view.findViewById(R.id.tvTitulo);
        EditText etMonto = view.findViewById(R.id.etMonto);
        EditText etDescripcion = view.findViewById(R.id.etDescripcion);
        TextView btnAceptar = view.findViewById(R.id.btnAceptar);
        TextView btnCancelar = view.findViewById(R.id.btnCancelar);

        tvTitulo.setText("💰 " + ("SALIDA".equals(tipo) ? "Salida de Efectivo" : "Entrada de Efectivo"));

        btnCancelar.setOnClickListener(v -> dismiss());
        btnAceptar.setOnClickListener(v -> {
            try {
                String m = etMonto.getText().toString().trim();
                if (m.isEmpty()) {
                    Toast.makeText(requireContext(), "Ingrese un monto", Toast.LENGTH_SHORT).show();
                    return;
                }
                BigDecimal monto = new BigDecimal(m);
                SessionManager session = SessionManager.getInstance(requireContext());
                EntradaSalidaDTO dto = new EntradaSalidaDTO(monto, etDescripcion.getText().toString().trim(), session.getUserId());

                String fecha = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date());
                CajaMovimientoEntity local = new CajaMovimientoEntity(
                        tipo, monto.doubleValue(), etDescripcion.getText().toString().trim(),
                        session.getUserId(), fecha, false);
                DatabaseClient.getInstance(requireContext()).getAppDatabase()
                        .cajaMovimientoDao().insert(local);

                var api = RetrofitClient.getInstance().getApiService();
                var call = "SALIDA".equals(tipo)
                        ? api.salidaEfectivo(dto) : api.entradaEfectivo(dto);

                call.subscribeOn(Schedulers.io())
                        .observeOn(AndroidSchedulers.mainThread())
                        .subscribe(
                                resp -> {
                                    Toast.makeText(requireContext(),
                                            tipo + " registrada", Toast.LENGTH_SHORT).show();
                                    com.dulcesnc.pos.sync.SyncWorker.syncNow(requireContext());
                                    dismiss();
                                },
                                err -> Toast.makeText(requireContext(),
                                        "Error: " + err.getMessage(), Toast.LENGTH_LONG).show()
                        );
            } catch (NumberFormatException e) {
                Toast.makeText(requireContext(), "Monto inválido", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
