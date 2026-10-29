package com.dulcesnc.pos.ui.ventas;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
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
import com.dulcesnc.pos.data.local.entity.ProductoEntity;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.ApiResponse;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import io.reactivex.rxjava3.schedulers.Schedulers;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;

public class GramajeDialogFragment extends DialogFragment {

    private ProductoEntity producto;
    private double precioPorKilo = 0.0;

    private EditText etGramos;
    private EditText etTotal;
    private TextView tvPrecioKilo;
    private boolean recalculando = false;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setStyle(DialogFragment.STYLE_NORMAL, R.style.Theme_ZeldaDialog);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.dialog_gramaje, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        VentasFragment vf = null;
        androidx.fragment.app.FragmentManager fm = requireActivity().getSupportFragmentManager();
        for (androidx.fragment.app.Fragment f : fm.getFragments()) {
            if (f instanceof VentasFragment) { vf = (VentasFragment) f; break; }
            if (f instanceof androidx.navigation.fragment.NavHostFragment) {
                for (androidx.fragment.app.Fragment cf : f.getChildFragmentManager().getFragments()) {
                    if (cf instanceof VentasFragment) { vf = (VentasFragment) cf; break; }
                }
            }
            if (vf != null) break;
        }
        VentasViewModel vm = vf != null
                ? new androidx.lifecycle.ViewModelProvider(vf).get(VentasViewModel.class)
                : new androidx.lifecycle.ViewModelProvider(requireActivity()).get(VentasViewModel.class);
        producto = vm.getGramajePendiente().getValue();

        TextView tvProducto = view.findViewById(R.id.tvProducto);
        etGramos = view.findViewById(R.id.etGramos);
        etTotal = view.findViewById(R.id.etTotal);
        tvPrecioKilo = view.findViewById(R.id.tvPrecioKilo);
        TextView btnCancelar = view.findViewById(R.id.btnCancelar);
        TextView btnAgregar = view.findViewById(R.id.btnAgregar);

        if (producto != null) {
            tvProducto.setText(producto.getNombre());
        }

        btnCancelar.setOnClickListener(v -> dismiss());
        btnAgregar.setOnClickListener(v -> confirmar(vm));

        view.findViewById(R.id.btn250).setOnClickListener(v -> setGramos(250));
        view.findViewById(R.id.btn500).setOnClickListener(v -> setGramos(500));
        view.findViewById(R.id.btn1000).setOnClickListener(v -> setGramos(1000));
        view.findViewById(R.id.btn10).setOnClickListener(v -> setTotal(10));
        view.findViewById(R.id.btn20).setOnClickListener(v -> setTotal(20));
        view.findViewById(R.id.btn30).setOnClickListener(v -> setTotal(30));

        etGramos.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) {}
            @Override public void afterTextChanged(Editable s) {}
            @Override
            public void onTextChanged(CharSequence s, int a, int b, int c) {
                if (recalculando) return;
                recalcularDesdeGramos();
            }
        });
        etTotal.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) {}
            @Override public void afterTextChanged(Editable s) {}
            @Override
            public void onTextChanged(CharSequence s, int a, int b, int c) {
                if (recalculando) return;
                recalcularDesdeTotal();
            }
        });

        cargarPrecioPorKilo();
    }

    private void cargarPrecioPorKilo() {
        if (producto == null || producto.getIdProducto() == null) return;
        Map<String, Object> req = new HashMap<>();
        req.put("idProducto", producto.getIdProducto());
        req.put("cantidad", 0);
        req.put("tipoInput", "GRAMOS");
        RetrofitClient.getInstance().getApiService()
                .calcularGramaje(req)
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(
                        resp -> {
                            if (resp != null && resp.getDatos() != null) {
                                Object pk = resp.getDatos().get("precioPorKilo");
                                if (pk instanceof Number) {
                                    precioPorKilo = ((Number) pk).doubleValue();
                                    tvPrecioKilo.setText("Precio por kilo: $" +
                                            String.format(Locale.US, "%.2f", precioPorKilo));
                                }
                            }
                        },
                        err -> tvPrecioKilo.setText("Precio por kilo: $0.00")
                );
    }

    private void setGramos(int g) {
        etGramos.setText(String.valueOf(g));
    }

    private void setTotal(double t) {
        etTotal.setText(String.valueOf(t));
    }

    private void recalcularDesdeGramos() {
        String gs = etGramos.getText().toString().trim();
        if (gs.isEmpty() || precioPorKilo <= 0) return;
        int gramos = Integer.parseInt(gs);
        if (gramos <= 0) return;
        double total = (gramos / 1000.0) * precioPorKilo;
        recalculando = true;
        etTotal.setText(String.format(Locale.US, "%.2f", total));
        recalculando = false;
        recalculando = false;
    }

    private void recalcularDesdeTotal() {
        String ts = etTotal.getText().toString().trim();
        if (ts.isEmpty() || precioPorKilo <= 0) return;
        double total = Double.parseDouble(ts);
        if (total <= 0) return;
        int gramos = (int) Math.round((total / precioPorKilo) * 1000);
        recalculando = true;
        etGramos.setText(String.valueOf(gramos));
        recalculando = false;
    }

    private void confirmar(VentasViewModel vm) {
        String gs = etGramos.getText().toString().trim();
        String ts = etTotal.getText().toString().trim();
        if (gs.isEmpty() || ts.isEmpty()) {
            Toast.makeText(requireContext(), "Completa gramaje y total", Toast.LENGTH_SHORT).show();
            return;
        }
        int gramos = Integer.parseInt(gs);
        BigDecimal total = new BigDecimal(ts);
        if (producto == null || gramos <= 0 || total.compareTo(BigDecimal.ZERO) <= 0) {
            Toast.makeText(requireContext(), "Datos inválidos", Toast.LENGTH_SHORT).show();
            return;
        }
        vm.addGramaje(producto.getIdProducto(), producto.getNombre(), gramos, total);
        dismiss();
    }
}
