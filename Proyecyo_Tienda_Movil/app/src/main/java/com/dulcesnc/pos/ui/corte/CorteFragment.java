package com.dulcesnc.pos.ui.corte;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.cardview.widget.CardView;
import androidx.fragment.app.Fragment;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.DatabaseClient;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.CajaAperturaDTO;
import com.dulcesnc.pos.data.remote.dto.CorteDTO;
import com.dulcesnc.pos.utils.SessionManager;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import io.reactivex.rxjava3.schedulers.Schedulers;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;

public class CorteFragment extends Fragment {

    private TextView tvTotalVentas, tvEfectivo, tvTarjeta, tvResumen;
    private CardView btnCierreTurno;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_corte, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        tvTotalVentas = view.findViewById(R.id.tvTotalVentas);
        tvEfectivo = view.findViewById(R.id.tvEfectivo);
        tvTarjeta = view.findViewById(R.id.tvTarjeta);
        tvResumen = view.findViewById(R.id.tvResumenVentas);
        btnCierreTurno = view.findViewById(R.id.btnCierreTurno);

        btnCierreTurno.setOnClickListener(v -> realizarCorte());

        loadDailyReport();
        cargarCorteServidor();
    }

    private void loadDailyReport() {
        String hoy = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);

        DatabaseClient.getInstance(requireContext())
                .getAppDatabase().ventaDao().getVentasDelDia(hoy)
                .observe(getViewLifecycleOwner(), ventas -> {
                    BigDecimal total = BigDecimal.ZERO;
                    BigDecimal efectivo = BigDecimal.ZERO;
                    BigDecimal tarjeta = BigDecimal.ZERO;
                    int count = 0;

                    for (var v : ventas) {
                        if (v.getMontoTotal() != null) {
                            total = total.add(v.getMontoTotal());
                            count++;
                            if ("EFECTIVO".equals(v.getMetodoPago())) {
                                efectivo = efectivo.add(v.getMontoTotal());
                            } else if ("TARJETA".equals(v.getMetodoPago())) {
                                tarjeta = tarjeta.add(v.getMontoTotal());
                            }
                        }
                    }

                    DecimalFormat f = new DecimalFormat("#,##0.00");
                    tvTotalVentas.setText("$" + f.format(total));
                    tvEfectivo.setText("$" + f.format(efectivo));
                    tvTarjeta.setText("$" + f.format(tarjeta));
                    tvResumen.setText(count + " ventas hoy");
                });
    }

    private void cargarCorteServidor() {
        long idUsuario = SessionManager.getInstance(requireContext()).getUserId();
        RetrofitClient.getInstance().getApiService()
                .consultarCorte(idUsuario)
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(corte -> mostrarCorte(corte),
                        err -> Toast.makeText(requireContext(),
                                "Sin corte en servidor: " + err.getMessage(), Toast.LENGTH_SHORT).show());
    }

    private void mostrarCorte(CorteDTO corte) {
        if (corte == null) return;
        DecimalFormat f = new DecimalFormat("#,##0.00");
        StringBuilder sb = new StringBuilder();
        if (corte.getMontoInicial() != null) sb.append("Inicial: $").append(f.format(corte.getMontoInicial())).append("\n");
        if (corte.getTotalVentas() != null) sb.append("Total ventas: $").append(f.format(corte.getTotalVentas())).append("\n");
        if (corte.getVentasEfectivo() != null) sb.append("Efectivo: $").append(f.format(corte.getVentasEfectivo())).append("\n");
        if (corte.getVentasTarjeta() != null) sb.append("Tarjeta: $").append(f.format(corte.getVentasTarjeta())).append("\n");
        if (sb.length() > 0) tvResumen.setText(sb.toString().trim());
    }

    private void realizarCorte() {
        androidx.appcompat.app.AlertDialog.Builder b = new androidx.appcompat.app.AlertDialog.Builder(requireContext());
        b.setTitle("Apertura / Cierre de Caja");
        b.setMessage("Ingrese el monto inicial para abrir el turno:");
        final android.widget.EditText et = new android.widget.EditText(requireContext());
        et.setHint("0.00");
        et.setInputType(android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL);
        b.setView(et);
        b.setPositiveButton("Abrir", (d, w) -> {
            try {
                BigDecimal monto = et.getText().toString().trim().isEmpty()
                        ? BigDecimal.ZERO : new BigDecimal(et.getText().toString().trim());
                long idUsuario = SessionManager.getInstance(requireContext()).getUserId();
                CajaAperturaDTO dto = new CajaAperturaDTO(idUsuario, monto);
                RetrofitClient.getInstance().getApiService()
                        .aperturaCaja(dto)
                        .subscribeOn(Schedulers.io())
                        .observeOn(AndroidSchedulers.mainThread())
                        .subscribe(r -> {
                            Toast.makeText(requireContext(), "Caja abierta", Toast.LENGTH_SHORT).show();
                            cargarCorteServidor();
                        }, e -> Toast.makeText(requireContext(),
                                "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
            } catch (NumberFormatException e) {
                Toast.makeText(requireContext(), "Monto invalido", Toast.LENGTH_SHORT).show();
            }
        });
        b.setNegativeButton("Cancelar", null);
        b.show();
    }
}
