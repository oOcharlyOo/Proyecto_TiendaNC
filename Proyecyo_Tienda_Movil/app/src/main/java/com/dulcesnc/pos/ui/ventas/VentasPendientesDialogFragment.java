package com.dulcesnc.pos.ui.ventas;

import android.os.Bundle;
import android.view.LayoutInflater;
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
import com.dulcesnc.pos.utils.SessionManager;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import io.reactivex.rxjava3.schedulers.Schedulers;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;

public class VentasPendientesDialogFragment extends DialogFragment {

    private PendienteAdapter adapter;
    private TextView tvVacio;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setStyle(DialogFragment.STYLE_NORMAL, R.style.Theme_ZeldaDialog);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.dialog_ventas_pendientes, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        RecyclerView rv = view.findViewById(R.id.rvPendientes);
        tvVacio = view.findViewById(R.id.tvVacio);
        TextView btnCerrar = view.findViewById(R.id.btnCerrar);

        adapter = new PendienteAdapter();
        rv.setLayoutManager(new LinearLayoutManager(requireContext()));
        rv.setAdapter(adapter);

        adapter.setOnCobrarListener(venta -> cobrar(venta));

        btnCerrar.setOnClickListener(v -> dismiss());

        cargar();
    }

    private void cargar() {
        long idUsuario = SessionManager.getInstance(requireContext()).getUserId();
        RetrofitClient.getInstance().getApiService()
                .buscarVentasPendientes(idUsuario)
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(
                        resp -> {
                            if (resp != null && resp.getDatos() != null && !resp.getDatos().isEmpty()) {
                                adapter.submitList(resp.getDatos());
                                tvVacio.setVisibility(View.GONE);
                            } else {
                                tvVacio.setVisibility(View.VISIBLE);
                            }
                        },
                        err -> {
                            tvVacio.setVisibility(View.VISIBLE);
                            tvVacio.setText("Error al cargar: " + err.getMessage());
                        }
                );
    }

    private void cobrar(VentaRequestDTO venta) {
        if (venta.getIdVenta() == null) return;
        double total = venta.getMontoTotal() != null ? venta.getMontoTotal().doubleValue() : 0.0;
        long idUsuario = SessionManager.getInstance(requireContext()).getUserId();
        RetrofitClient.getInstance().getApiService()
                .cobrarVentaPendiente(venta.getIdVenta(), idUsuario, "EFECTIVO", total)
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(
                        resp -> {
                            Toast.makeText(requireContext(), "Pendiente cobrado", Toast.LENGTH_SHORT).show();
                            cargar();
                        },
                        err -> Toast.makeText(requireContext(), "Error: " + err.getMessage(),
                                Toast.LENGTH_LONG).show()
                );
    }

    static class PendienteAdapter extends RecyclerView.Adapter<PendienteAdapter.VH> {
        private final List<VentaRequestDTO> lista = new ArrayList<>();
        private OnClickListener listener;

        interface OnClickListener { void onCobrar(VentaRequestDTO v); }

        void setOnCobrarListener(OnClickListener l) { this.listener = l; }

        void submitList(List<VentaRequestDTO> l) {
            lista.clear();
            if (l != null) lista.addAll(l);
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_pendiente, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            VentaRequestDTO v = lista.get(pos);
            h.tvInfo.setText("#" + v.getIdVenta() +
                    (v.getDescripcionPendiente() != null ? " - " + v.getDescripcionPendiente() : ""));
            h.tvTotal.setText("$" + String.format(Locale.US, "%.2f",
                    v.getMontoTotal() != null ? v.getMontoTotal() : java.math.BigDecimal.ZERO));
            h.btnCobrar.setOnClickListener(x -> { if (listener != null) listener.onCobrar(v); });
        }

        @Override
        public int getItemCount() { return lista.size(); }

        static class VH extends RecyclerView.ViewHolder {
            final TextView tvInfo, tvTotal, btnCobrar;
            VH(View v) {
                super(v);
                tvInfo = (TextView) v.findViewById(R.id.tvInfo);
                tvTotal = (TextView) v.findViewById(R.id.tvTotal);
                btnCobrar = (TextView) v.findViewById(R.id.btnCobrar);
            }
        }
    }
}
