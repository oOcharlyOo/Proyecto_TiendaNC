package com.dulcesnc.pos.ui.inventario;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.repository.ProductoRepository;

public class InventarioFragment extends Fragment {

    private TextView tvTotal, tvStockBajo, tvSinStock, tvGanancia;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_inventario, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        tvTotal = view.findViewById(R.id.tvTotalProductos);
        tvStockBajo = view.findViewById(R.id.tvStockBajo);
        tvSinStock = view.findViewById(R.id.tvSinStock);
        tvGanancia = view.findViewById(R.id.tvGanancia);

        ProductoRepository repo = new ProductoRepository(requireContext());

        repo.countActivos().observe(getViewLifecycleOwner(), count ->
                tvTotal.setText(String.valueOf(count)));

        repo.countLowStock().observe(getViewLifecycleOwner(), count ->
                tvStockBajo.setText(String.valueOf(count)));

        repo.countOutOfStock().observe(getViewLifecycleOwner(), count ->
                tvSinStock.setText(String.valueOf(count)));

        repo.getAllActivos().observe(getViewLifecycleOwner(), productos -> {
            java.math.BigDecimal ganancia = java.math.BigDecimal.ZERO;
            for (com.dulcesnc.pos.data.local.entity.ProductoEntity p : productos) {
                if (p.getPrecioVenta() != null && p.getPrecioCosto() != null && p.getStock() != null) {
                    java.math.BigDecimal diff = p.getPrecioVenta().subtract(p.getPrecioCosto());
                    ganancia = ganancia.add(diff.multiply(java.math.BigDecimal.valueOf(p.getStock())));
                }
            }
            tvGanancia.setText("$" + String.format(java.util.Locale.US, "%.2f", ganancia));
        });
    }
}
