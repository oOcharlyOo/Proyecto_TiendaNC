package com.dulcesnc.pos.ui.ventas;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.entity.VentaEntity;
import com.dulcesnc.pos.sync.SyncWorker;

import java.util.List;

public class HistorialVentasFragment extends Fragment {

    private HistorialVentasViewModel viewModel;
    private VentaHistorialAdapter adapter;
    private RecyclerView rvHistorial;
    private TextView tvEmpty;
    private Button btnSincronizar;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_historial_ventas, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        viewModel = new ViewModelProvider(this).get(HistorialVentasViewModel.class);

        rvHistorial = view.findViewById(R.id.rvHistorial);
        tvEmpty = view.findViewById(R.id.tvEmpty);
        btnSincronizar = view.findViewById(R.id.btnSincronizar);

        adapter = new VentaHistorialAdapter();
        rvHistorial.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvHistorial.setAdapter(adapter);

        adapter.setOnCancelarVentaListener(venta -> confirmarCancelacion(venta));

        btnSincronizar.setOnClickListener(v -> {
            Toast.makeText(requireContext(), "Sincronizando ventas...", Toast.LENGTH_SHORT).show();
            SyncWorker.syncNow(requireContext());
        });

        viewModel.getVentas().observe(getViewLifecycleOwner(), this::actualizarLista);
    }

    private void confirmarCancelacion(VentaEntity venta) {
        new androidx.appcompat.app.AlertDialog.Builder(requireContext())
                .setTitle("Cancelar venta")
                .setMessage("¿Cancelar esta venta y devolver los productos al stock?")
                .setPositiveButton("Cancelar venta", (dialog, which) -> {
                    viewModel.cancelarVenta(venta.getIdVenta());
                    Toast.makeText(requireContext(),
                            "Venta cancelada. Stock restaurado.", Toast.LENGTH_SHORT).show();
                })
                .setNegativeButton("No", null)
                .show();
    }

    private void actualizarLista(List<VentaEntity> ventas) {
        adapter.submitList(ventas);
        if (ventas == null || ventas.isEmpty()) {
            rvHistorial.setVisibility(View.GONE);
            tvEmpty.setVisibility(View.VISIBLE);
        } else {
            rvHistorial.setVisibility(View.VISIBLE);
            tvEmpty.setVisibility(View.GONE);
        }
    }
}
