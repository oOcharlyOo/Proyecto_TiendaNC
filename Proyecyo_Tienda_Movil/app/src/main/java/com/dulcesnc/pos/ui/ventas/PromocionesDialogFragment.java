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
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.ApiResponse;
import com.dulcesnc.pos.data.remote.dto.CrearPromocionDTO;
import com.dulcesnc.pos.data.remote.dto.PromocionDTO;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import io.reactivex.rxjava3.schedulers.Schedulers;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;

public class PromocionesDialogFragment extends DialogFragment {

    private PromoAdapter adapter;
    private TextView tvVacio;
    private TextView btnNueva;
    private TextView btnCerrar;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setStyle(DialogFragment.STYLE_NORMAL, R.style.Theme_ZeldaDialog);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.dialog_promociones, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        RecyclerView rv = view.findViewById(R.id.rvPromociones);
        tvVacio = view.findViewById(R.id.tvVacio);
        btnNueva = view.findViewById(R.id.btnNuevaPromocion);
        btnCerrar = view.findViewById(R.id.btnCerrar);

        adapter = new PromoAdapter();
        rv.setLayoutManager(new LinearLayoutManager(requireContext()));
        rv.setAdapter(adapter);

        adapter.setOnAddListener(p -> agregarAlTicket(p));
        adapter.setOnEditListener(this::editar);
        adapter.setOnDeleteListener(this::eliminar);
        adapter.setOnToggleListener(this::toggle);

        btnCerrar.setOnClickListener(v -> dismiss());
        btnNueva.setOnClickListener(v -> crearNueva());

        cargar();
    }

    private void cargar() {
        RetrofitClient.getInstance().getApiService()
                .listarPromociones()
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
                            tvVacio.setText("Error: " + err.getMessage());
                        }
                );
    }

    private void agregarAlTicket(PromocionDTO p) {
        VentasFragment parent = (VentasFragment) getParentFragment();
        VentasViewModel vm = parent != null
                ? new androidx.lifecycle.ViewModelProvider(parent).get(VentasViewModel.class)
                : new androidx.lifecycle.ViewModelProvider(requireActivity()).get(VentasViewModel.class);
        BigDecimal precio = p.getPrecioPromocion() != null ? p.getPrecioPromocion() : BigDecimal.ZERO;
        vm.addPromocion(p.getIdPromocion() != null ? p.getIdPromocion() : 0,
                p.getNombre() != null ? p.getNombre() : "Promocion", precio);
        Toast.makeText(requireContext(), "Promocion agregada al ticket", Toast.LENGTH_SHORT).show();
        dismiss();
    }

    private CrearPromocionDTO dtoDesde(PromocionDTO p) {
        CrearPromocionDTO dto = new CrearPromocionDTO();
        dto.setNombre(p.getNombre());
        dto.setDescripcion(p.getDescripcion());
        dto.setPrecioPromocion(p.getPrecioPromocion());
        dto.setImagenUrl(p.getImagenUrl());
        dto.setActiva(p.getActiva());
        dto.setFechaInicio(p.getFechaInicio());
        dto.setFechaFin(p.getFechaFin());
        return dto;
    }

    private void crearNueva() {
        EditText etNombre = new EditText(requireContext());
        EditText etPrecio = new EditText(requireContext());
        etPrecio.setHint("Precio promocion");
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Nueva promocion")
                .setView(etNombre)
                .setView(etPrecio)
                .setPositiveButton("Crear", (d, w) -> {
                    try {
                        String nombre = etNombre.getText().toString().trim();
                        String precioStr = etPrecio.getText().toString().trim();
                        if (nombre.isEmpty() || precioStr.isEmpty()) {
                            Toast.makeText(requireContext(), "Completa nombre y precio", Toast.LENGTH_SHORT).show();
                            return;
                        }
                        CrearPromocionDTO dto = new CrearPromocionDTO();
                        dto.setNombre(nombre);
                        dto.setPrecioPromocion(new BigDecimal(precioStr));
                        dto.setActiva(true);
                        RetrofitClient.getInstance().getApiService()
                                .crearPromocion(dto)
                                .subscribeOn(Schedulers.io())
                                .observeOn(AndroidSchedulers.mainThread())
                                .subscribe(r -> {
                                    Toast.makeText(requireContext(), "Promocion creada", Toast.LENGTH_SHORT).show();
                                    cargar();
                                }, e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(),
                                        Toast.LENGTH_LONG).show());
                    } catch (NumberFormatException e) {
                        Toast.makeText(requireContext(), "Precio invalido", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void editar(PromocionDTO p) {
        if (p.getIdPromocion() == null) return;
        EditText etNombre = new EditText(requireContext());
        etNombre.setText(p.getNombre());
        EditText etPrecio = new EditText(requireContext());
        etPrecio.setText(p.getPrecioPromocion() != null ? p.getPrecioPromocion().toString() : "0");
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Editar promocion")
                .setView(etNombre)
                .setView(etPrecio)
                .setPositiveButton("Guardar", (d, w) -> {
                    try {
                        String nombre = etNombre.getText().toString().trim();
                        String precioStr = etPrecio.getText().toString().trim();
                        if (nombre.isEmpty() || precioStr.isEmpty()) return;
                        CrearPromocionDTO dto = dtoDesde(p);
                        dto.setNombre(nombre);
                        dto.setPrecioPromocion(new BigDecimal(precioStr));
                        RetrofitClient.getInstance().getApiService()
                                .actualizarPromocion(p.getIdPromocion(), dto)
                                .subscribeOn(Schedulers.io())
                                .observeOn(AndroidSchedulers.mainThread())
                                .subscribe(r -> cargar(),
                                        e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(),
                                                Toast.LENGTH_LONG).show());
                    } catch (NumberFormatException e) {
                        Toast.makeText(requireContext(), "Precio invalido", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void eliminar(PromocionDTO p) {
        if (p.getIdPromocion() == null) return;
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Eliminar promocion")
                .setMessage("¿Eliminar " + p.getNombre() + "?")
                .setPositiveButton("Eliminar", (d, w) ->
                        RetrofitClient.getInstance().getApiService()
                                .eliminarPromocion(p.getIdPromocion())
                                .subscribeOn(Schedulers.io())
                                .observeOn(AndroidSchedulers.mainThread())
                                .subscribe(r -> cargar(),
                                        e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(),
                                                Toast.LENGTH_LONG).show()))
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void toggle(PromocionDTO p) {
        if (p.getIdPromocion() == null) return;
        RetrofitClient.getInstance().getApiService()
                .toggleActivaPromocion(p.getIdPromocion())
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(r -> cargar(),
                        e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(),
                                Toast.LENGTH_LONG).show());
    }

    static class PromoAdapter extends RecyclerView.Adapter<PromoAdapter.VH> {
        private final List<PromocionDTO> lista = new ArrayList<>();
        private OnAddListener addListener;
        private OnEditListener editListener;
        private OnDeleteListener deleteListener;
        private OnToggleListener toggleListener;

        interface OnAddListener { void onAdd(PromocionDTO p); }
        interface OnEditListener { void onEdit(PromocionDTO p); }
        interface OnDeleteListener { void onDelete(PromocionDTO p); }
        interface OnToggleListener { void onToggle(PromocionDTO p); }

        void setOnAddListener(OnAddListener l) { this.addListener = l; }
        void setOnEditListener(OnEditListener l) { this.editListener = l; }
        void setOnDeleteListener(OnDeleteListener l) { this.deleteListener = l; }
        void setOnToggleListener(OnToggleListener l) { this.toggleListener = l; }

        void submitList(List<PromocionDTO> l) {
            lista.clear();
            if (l != null) lista.addAll(l);
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_promocion, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            PromocionDTO p = lista.get(pos);
            h.tvNombre.setText(p.getNombre() != null ? p.getNombre() : "Promocion");
            h.tvPrecio.setText("$" + String.format(Locale.US, "%.2f",
                    p.getPrecioPromocion() != null ? p.getPrecioPromocion() : BigDecimal.ZERO));
            String estado = (p.getActiva() != null && p.getActiva()) ? "Activa" : "Inactiva";
            h.tvEstado.setText(estado);
            h.btnAdd.setOnClickListener(x -> { if (addListener != null) addListener.onAdd(p); });
            h.btnEdit.setOnClickListener(x -> { if (editListener != null) editListener.onEdit(p); });
            h.btnDelete.setOnClickListener(x -> { if (deleteListener != null) deleteListener.onDelete(p); });
            h.btnToggle.setOnClickListener(x -> { if (toggleListener != null) toggleListener.onToggle(p); });
        }

        @Override
        public int getItemCount() { return lista.size(); }

        static class VH extends RecyclerView.ViewHolder {
            final TextView tvNombre, tvPrecio, tvEstado, btnAdd, btnEdit, btnDelete, btnToggle;
            VH(View v) {
                super(v);
                tvNombre = (TextView) v.findViewById(R.id.tvNombre);
                tvPrecio = (TextView) v.findViewById(R.id.tvPrecio);
                tvEstado = (TextView) v.findViewById(R.id.tvEstado);
                btnAdd = (TextView) v.findViewById(R.id.btnAdd);
                btnEdit = (TextView) v.findViewById(R.id.btnEdit);
                btnDelete = (TextView) v.findViewById(R.id.btnDelete);
                btnToggle = (TextView) v.findViewById(R.id.btnToggle);
            }
        }
    }
}
