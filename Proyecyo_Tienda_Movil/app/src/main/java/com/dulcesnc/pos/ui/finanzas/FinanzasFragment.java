package com.dulcesnc.pos.ui.finanzas;

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
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.DatabaseClient;
import com.dulcesnc.pos.data.local.entity.CajaMovimientoEntity;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.ApiResponse;
import com.dulcesnc.pos.ui.ventas.EntradaSalidaDialogFragment;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import io.reactivex.rxjava3.schedulers.Schedulers;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;

public class FinanzasFragment extends Fragment {

    private TextView tvSaldo;
    private CardView btnEntrada, btnSalida;
    private MovimientoAdapter adapter;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_finanzas, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        tvSaldo = view.findViewById(R.id.tvSaldo);
        btnEntrada = view.findViewById(R.id.btnEntrada);
        btnSalida = view.findViewById(R.id.btnSalida);
        RecyclerView rv = view.findViewById(R.id.rvMovimientos);

        adapter = new MovimientoAdapter();
        rv.setLayoutManager(new LinearLayoutManager(requireContext()));
        rv.setAdapter(adapter);

        btnEntrada.setOnClickListener(v -> abrirMovimiento("ENTRADA"));
        btnSalida.setOnClickListener(v -> abrirMovimiento("SALIDA"));

        cargarSaldo();
        cargarMovimientos();
    }

    @Override
    public void onResume() {
        super.onResume();
        cargarSaldo();
        cargarMovimientos();
    }

    private void abrirMovimiento(String tipo) {
        Bundle args = new Bundle();
        args.putString("tipo", tipo);
        EntradaSalidaDialogFragment d = new EntradaSalidaDialogFragment();
        d.setArguments(args);
        d.show(getChildFragmentManager(), "movimiento");
    }

    private void cargarSaldo() {
        RetrofitClient.getInstance().getApiService()
                .estadoBoveda()
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(resp -> {
                    if (resp != null && resp.getDatos() != null) {
                        tvSaldo.setText("$" + resp.getDatos().toString());
                    }
                }, err -> Toast.makeText(requireContext(),
                        "Error saldo: " + err.getMessage(), Toast.LENGTH_SHORT).show());
    }

    private void cargarMovimientos() {
        String hoy = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        DatabaseClient.getInstance(requireContext()).getAppDatabase()
                .cajaMovimientoDao().getMovimientosDelDia(hoy)
                .observe(getViewLifecycleOwner(), lista -> adapter.submitList(lista));
    }

    static class MovimientoAdapter extends RecyclerView.Adapter<MovimientoAdapter.VH> {
        private final List<CajaMovimientoEntity> lista = new ArrayList<>();
        void submitList(List<CajaMovimientoEntity> l) { lista.clear(); if (l != null) lista.addAll(l); notifyDataSetChanged(); }
        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int t) {
            return new VH(LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_caja_movimiento, parent, false));
        }
        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            CajaMovimientoEntity m = lista.get(pos);
            h.tvInfo.setText((m.getTipo() != null ? m.getTipo() : "") + "  $"
                    + String.format(Locale.US, "%.2f", m.getMonto()));
            h.tvDesc.setText(m.getDescripcion() != null ? m.getDescripcion() : "");
        }
        @Override
        public int getItemCount() { return lista.size(); }
        static class VH extends RecyclerView.ViewHolder {
            final TextView tvInfo, tvDesc;
            VH(View v) {
                super(v);
                tvInfo = (TextView) v.findViewById(R.id.tvInfo);
                tvDesc = (TextView) v.findViewById(R.id.tvDesc);
            }
        }
    }
}
