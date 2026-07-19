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
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.DatabaseClient;
import com.dulcesnc.pos.data.local.entity.ApartadoEntity;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.ApiResponse;
import com.dulcesnc.pos.data.remote.dto.ApartadoDTO;
import com.dulcesnc.pos.data.remote.dto.ApartadoPagoDTO;
import com.dulcesnc.pos.data.remote.dto.CrearApartadoDTO;
import com.dulcesnc.pos.utils.SessionManager;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import io.reactivex.rxjava3.schedulers.Schedulers;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;

public class ApartadosFragment extends Fragment {

    private ApartadoAdapter adapter;
    private TextView tvVacio;
    private boolean mostrarCompletados = false;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_apartados, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        RecyclerView rv = view.findViewById(R.id.rvApartados);
        tvVacio = view.findViewById(R.id.tvVacio);
        TextView btnNuevo = view.findViewById(R.id.btnNuevoApartado);
        TextView btnCompletados = view.findViewById(R.id.btnCompletados);

        adapter = new ApartadoAdapter();
        rv.setLayoutManager(new LinearLayoutManager(requireContext()));
        rv.setAdapter(adapter);
        adapter.setOnPagarListener(this::pagar);
        adapter.setOnCancelarListener(this::cancelar);
        adapter.setOnHistorialListener(this::verHistorial);

        btnNuevo.setOnClickListener(v -> crearApartado());
        btnCompletados.setOnClickListener(v -> {
            mostrarCompletados = !mostrarCompletados;
            btnCompletados.setText(mostrarCompletados ? "Activos" : "Completados");
            cargar();
        });

        cargar();
    }

    @Override
    public void onResume() {
        super.onResume();
        cargar();
    }

    private void cargar() {
        long idUsuario = SessionManager.getInstance(requireContext()).getUserId();
        var api = RetrofitClient.getInstance().getApiService();
        var call = mostrarCompletados ? api.apartadosCompletados() : api.apartadosActivos(idUsuario);
        call.subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(resp -> {
                    if (resp != null && resp.getDatos() != null && !resp.getDatos().isEmpty()) {
                        List<ApartadoEntity> lista = new ArrayList<>();
                        for (ApartadoDTO d : resp.getDatos()) lista.add(toEntity(d));
                        adapter.submitList(lista);
                        tvVacio.setVisibility(View.GONE);
                    } else {
                        adapter.submitList(new ArrayList<>());
                        tvVacio.setVisibility(View.VISIBLE);
                    }
                }, err -> {
                    tvVacio.setVisibility(View.VISIBLE);
                    tvVacio.setText("Error: " + err.getMessage());
                });
    }

    private ApartadoEntity toEntity(ApartadoDTO d) {
        ApartadoEntity e = new ApartadoEntity();
        e.setIdApartado(d.getIdApartado());
        e.setNombreProducto(d.getNombreProducto());
        e.setMontoTotal(d.getMontoTotal());
        e.setMontoPagado(d.getMontoPagado());
        e.setMontoRestante(d.getMontoRestante());
        e.setFrecuenciaPago(d.getFrecuenciaPago());
        e.setMontoPorPeriodo(d.getMontoPorPeriodo());
        e.setFechaInicio(d.getFechaInicio());
        e.setFechaFin(d.getFechaFin());
        e.setEstatus(d.getEstatus());
        e.setIdUsuario(d.getIdUsuario());
        e.setSincronizado(true);
        return e;
    }

    private void crearApartado() {
        EditText etNombre = new EditText(requireContext());
        etNombre.setHint("Producto");
        EditText etMonto = new EditText(requireContext());
        etMonto.setHint("Monto total");
        etMonto.setInputType(android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL);
        EditText etFreq = new EditText(requireContext());
        etFreq.setHint("Frecuencia (SEMANAL/MENSUAL)");
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Nuevo apartado")
                .setView(etNombre)
                .setView(etMonto)
                .setView(etFreq)
                .setPositiveButton("Crear", (d, w) -> {
                    try {
                        if (etNombre.getText().toString().trim().isEmpty()) return;
                        BigDecimal monto = etMonto.getText().toString().trim().isEmpty()
                                ? BigDecimal.ZERO : new BigDecimal(etMonto.getText().toString().trim());
                        long idUsuario = SessionManager.getInstance(requireContext()).getUserId();
                        CrearApartadoDTO dto = new CrearApartadoDTO();
                        dto.setNombreProducto(etNombre.getText().toString().trim());
                        dto.setMontoTotal(monto);
                        dto.setFrecuenciaPago(etFreq.getText().toString().trim().toUpperCase());
                        dto.setFechaInicio(new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));
                        dto.setIdUsuario(idUsuario);
                        RetrofitClient.getInstance().getApiService()
                                .crearApartado(dto)
                                .subscribeOn(Schedulers.io())
                                .observeOn(AndroidSchedulers.mainThread())
                                .subscribe(r -> { Toast.makeText(requireContext(), "Apartado creado", Toast.LENGTH_SHORT).show(); cargar(); },
                                        e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
                    } catch (NumberFormatException e) {
                        Toast.makeText(requireContext(), "Monto invalido", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void pagar(ApartadoEntity a) {
        if (a.getIdApartado() == null) return;
        EditText etMonto = new EditText(requireContext());
        etMonto.setHint("Monto a abonar");
        etMonto.setInputType(android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL);
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Abonar apartado #" + a.getIdApartado())
                .setView(etMonto)
                .setPositiveButton("Pagar", (d, w) -> {
                    try {
                        BigDecimal monto = new BigDecimal(etMonto.getText().toString().trim());
                        long idUsuario = SessionManager.getInstance(requireContext()).getUserId();
                        RetrofitClient.getInstance().getApiService()
                                .pagarApartado(a.getIdApartado(), monto.doubleValue(), idUsuario)
                                .subscribeOn(Schedulers.io())
                                .observeOn(AndroidSchedulers.mainThread())
                                .subscribe(r -> { Toast.makeText(requireContext(), "Abono registrado", Toast.LENGTH_SHORT).show(); cargar(); },
                                        e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
                    } catch (NumberFormatException e) {
                        Toast.makeText(requireContext(), "Monto invalido", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void cancelar(ApartadoEntity a) {
        if (a.getIdApartado() == null) return;
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Cancelar apartado #" + a.getIdApartado())
                .setMessage("¿Cancelar este apartado?")
                .setPositiveButton("Cancelar apartado", (d, w) ->
                        RetrofitClient.getInstance().getApiService()
                                .cancelarApartado(a.getIdApartado())
                                .subscribeOn(Schedulers.io())
                                .observeOn(AndroidSchedulers.mainThread())
                                .subscribe(r -> { Toast.makeText(requireContext(), "Apartado cancelado", Toast.LENGTH_SHORT).show(); cargar(); },
                                        e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show()))
                .setNegativeButton("Volver", null)
                .show();
    }

    private void verHistorial(ApartadoEntity a) {
        if (a.getIdApartado() == null) return;
        RetrofitClient.getInstance().getApiService()
                .historialApartado(a.getIdApartado())
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(resp -> {
                    StringBuilder sb = new StringBuilder();
                    if (resp != null && resp.getDatos() != null) {
                        DecimalFormat f = new DecimalFormat("#,##0.00");
                        for (ApartadoPagoDTO p : resp.getDatos()) {
                            sb.append("- $").append(f.format(p.getMonto() == null ? BigDecimal.ZERO : p.getMonto()))
                                    .append("  ").append(p.getFechaPago() != null ? p.getFechaPago() : "").append("\n");
                        }
                    }
                    new MaterialAlertDialogBuilder(requireContext())
                            .setTitle("Historial #" + a.getIdApartado())
                            .setMessage(sb.length() > 0 ? sb.toString() : "Sin pagos")
                            .setPositiveButton("Cerrar", null)
                            .show();
                }, e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
    }

    static class ApartadoAdapter extends RecyclerView.Adapter<ApartadoAdapter.VH> {
        private final List<ApartadoEntity> lista = new ArrayList<>();
        private OnPagarListener pagarListener;
        private OnCancelarListener cancelarListener;
        private OnHistorialListener historialListener;
        interface OnPagarListener { void onPagar(ApartadoEntity a); }
        interface OnCancelarListener { void onCancelar(ApartadoEntity a); }
        interface OnHistorialListener { void onHistorial(ApartadoEntity a); }
        void setOnPagarListener(OnPagarListener l) { this.pagarListener = l; }
        void setOnCancelarListener(OnCancelarListener l) { this.cancelarListener = l; }
        void setOnHistorialListener(OnHistorialListener l) { this.historialListener = l; }
        void submitList(List<ApartadoEntity> l) { lista.clear(); if (l != null) lista.addAll(l); notifyDataSetChanged(); }
        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int t) {
            return new VH(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_apartado, parent, false));
        }
        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            ApartadoEntity a = lista.get(pos);
            DecimalFormat f = new DecimalFormat("#,##0.00");
            h.tvNombre.setText(a.getNombreProducto() != null ? a.getNombreProducto() : "Apartado");
            BigDecimal total = a.getMontoTotal() != null ? a.getMontoTotal() : BigDecimal.ZERO;
            BigDecimal rest = a.getMontoRestante() != null ? a.getMontoRestante() : BigDecimal.ZERO;
            h.tvInfo.setText("Restante: $" + f.format(rest) + " / Total: $" + f.format(total));
            boolean activo = "A".equals(a.getEstatus());
            h.btnPagar.setVisibility(activo ? View.VISIBLE : View.GONE);
            h.btnCancelar.setVisibility(activo ? View.VISIBLE : View.GONE);
            h.btnPagar.setOnClickListener(x -> { if (pagarListener != null) pagarListener.onPagar(a); });
            h.btnCancelar.setOnClickListener(x -> { if (cancelarListener != null) cancelarListener.onCancelar(a); });
            h.itemView.setOnClickListener(x -> { if (historialListener != null) historialListener.onHistorial(a); });
        }
        @Override
        public int getItemCount() { return lista.size(); }
        static class VH extends RecyclerView.ViewHolder {
            final TextView tvNombre, tvInfo, btnPagar, btnCancelar;
            VH(View v) {
                super(v);
                tvNombre = (TextView) v.findViewById(R.id.tvNombre);
                tvInfo = (TextView) v.findViewById(R.id.tvInfo);
                btnPagar = (TextView) v.findViewById(R.id.btnPagar);
                btnCancelar = (TextView) v.findViewById(R.id.btnCancelar);
            }
        }
    }
}
