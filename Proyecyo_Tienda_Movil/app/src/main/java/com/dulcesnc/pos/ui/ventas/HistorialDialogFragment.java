package com.dulcesnc.pos.ui.ventas;

import android.os.Bundle;
import android.view.LayoutInflater;

import java.math.BigDecimal;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.DialogFragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.ApiResponse;
import com.dulcesnc.pos.data.remote.dto.VentaRequestDTO;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import io.reactivex.rxjava3.schedulers.Schedulers;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;

public class HistorialDialogFragment extends DialogFragment {

    private HistorialAdapter adapter;
    private TextView tvVacio;
    private TextView tvTotalDia;
    private TextView tvGanancia;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setStyle(DialogFragment.STYLE_NORMAL, R.style.Theme_ZeldaDialog);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.dialog_historial, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        RecyclerView rv = view.findViewById(R.id.rvHistorial);
        tvVacio = view.findViewById(R.id.tvVacio);
        tvTotalDia = view.findViewById(R.id.tvTotalDia);
        tvGanancia = view.findViewById(R.id.tvGanancia);
        TextView btnCerrar = view.findViewById(R.id.btnCerrar);

        adapter = new HistorialAdapter();
        rv.setLayoutManager(new LinearLayoutManager(requireContext()));
        rv.setAdapter(adapter);

        adapter.setOnEditarListener(this::editar);
        adapter.setOnCancelarListener(this::cancelar);

        btnCerrar.setOnClickListener(v -> dismiss());
        cargar();
    }

    private void cargar() {
        RetrofitClient.getInstance().getApiService()
                .buscarVentasEnProceso()
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(
                        resp -> {
                            if (resp != null && resp.getDatos() != null && !resp.getDatos().isEmpty()) {
                                adapter.submitList(resp.getDatos());
                                tvVacio.setVisibility(View.GONE);
                            } else {
                                tvVacio.setText("Sin ventas en proceso");
                                tvVacio.setVisibility(View.VISIBLE);
                            }
                        },
                        err -> {
                            tvVacio.setText("Error: " + err.getMessage());
                            tvVacio.setVisibility(View.VISIBLE);
                        }
                );

        String fecha = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        RetrofitClient.getInstance().getApiService()
                .historialDia(fecha)
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(
                        resp -> {
                            if (resp != null && resp.getDatos() != null) {
                                BigDecimal cobro = resp.getDatos().getCobroTotal();
                                BigDecimal gan = resp.getDatos().getGananciaTotal();
                                tvTotalDia.setText("Total: $" + String.format(Locale.US, "%.2f",
                                        cobro != null ? cobro : java.math.BigDecimal.ZERO));
                                tvGanancia.setText("Ganancia: $" + String.format(Locale.US, "%.2f",
                                        gan != null ? gan : java.math.BigDecimal.ZERO));
                            }
                        },
                        err -> {}
                );
    }

    private void editar(VentaRequestDTO v) {
        if (v.getIdVenta() == null) return;
        Toast.makeText(requireContext(), "Editando venta #" + v.getIdVenta(), Toast.LENGTH_SHORT).show();
        dismiss();
    }

    private void cancelar(VentaRequestDTO v) {
        if (v.getIdVenta() == null) return;
        RetrofitClient.getInstance().getApiService()
                .cancelarVenta(v.getIdVenta())
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(r -> {
                    Toast.makeText(requireContext(), "Venta cancelada", Toast.LENGTH_SHORT).show();
                    cargar();
                }, e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(),
                        Toast.LENGTH_LONG).show());
    }

    static class HistorialAdapter extends RecyclerView.Adapter<HistorialAdapter.VH> {
        private final List<VentaRequestDTO> lista = new ArrayList<>();
        private OnEditarListener editarListener;
        private OnCancelarListener cancelarListener;

        interface OnEditarListener { void onEditar(VentaRequestDTO v); }
        interface OnCancelarListener { void onCancelar(VentaRequestDTO v); }
        void setOnEditarListener(OnEditarListener l) { this.editarListener = l; }
        void setOnCancelarListener(OnCancelarListener l) { this.cancelarListener = l; }

        void submitList(List<VentaRequestDTO> l) {
            lista.clear();
            if (l != null) lista.addAll(l);
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int t) {
            return new VH(LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_historial, parent, false));
        }

        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            VentaRequestDTO v = lista.get(pos);
            h.tvInfo.setText("#" + v.getIdVenta() + " - " + (v.getMetodoPago() != null ? v.getMetodoPago() : ""));
            h.tvTotal.setText("$" + String.format(Locale.US, "%.2f",
                    v.getMontoTotal() != null ? v.getMontoTotal() : java.math.BigDecimal.ZERO));
            h.btnEditar.setOnClickListener(x -> { if (editarListener != null) editarListener.onEditar(v); });
            h.btnCancelar.setOnClickListener(x -> { if (cancelarListener != null) cancelarListener.onCancelar(v); });
        }

        @Override
        public int getItemCount() { return lista.size(); }

        static class VH extends RecyclerView.ViewHolder {
            final TextView tvInfo, tvTotal, btnEditar, btnCancelar;
            VH(View v) {
                super(v);
                tvInfo = (TextView) v.findViewById(R.id.tvInfo);
                tvTotal = (TextView) v.findViewById(R.id.tvTotal);
                btnEditar = (TextView) v.findViewById(R.id.btnEditar);
                btnCancelar = (TextView) v.findViewById(R.id.btnCancelar);
            }
        }
    }
}
