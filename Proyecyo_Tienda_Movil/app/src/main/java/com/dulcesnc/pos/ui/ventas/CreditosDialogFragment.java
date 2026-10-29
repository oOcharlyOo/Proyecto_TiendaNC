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
import com.dulcesnc.pos.data.remote.dto.CreditoAbonoDTO;
import com.dulcesnc.pos.data.remote.dto.CreditoPersonaDTO;
import com.dulcesnc.pos.data.remote.dto.CreditoVentaDTO;
import com.dulcesnc.pos.data.remote.dto.CrearCreditoVentaDTO;
import com.dulcesnc.pos.utils.SessionManager;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import io.reactivex.rxjava3.schedulers.Schedulers;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;

public class CreditosDialogFragment extends DialogFragment {

    private CreditoAdapter adapter;
    private PersonaAdapter personaAdapter;
    private TextView tvVacio;
    private RecyclerView rvCreditos;
    private RecyclerView rvPersonas;
    private EditText etNueva;
    private TextView btnAgregar;
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
        return inflater.inflate(R.layout.dialog_creditos, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        rvCreditos = view.findViewById(R.id.rvCreditos);
        rvPersonas = view.findViewById(R.id.rvPersonas);
        tvVacio = view.findViewById(R.id.tvVacio);
        etNueva = view.findViewById(R.id.etNuevaPersona);
        btnAgregar = view.findViewById(R.id.btnAgregarPersona);
        btnCerrar = view.findViewById(R.id.btnCerrar);

        adapter = new CreditoAdapter();
        rvCreditos.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvCreditos.setAdapter(adapter);
        adapter.setOnAbonarListener(this::abonar);
        adapter.setOnCrearCreditoListener(this::crearCreditoDesdeVenta);

        personaAdapter = new PersonaAdapter();
        if (rvPersonas != null) {
            rvPersonas.setLayoutManager(new LinearLayoutManager(requireContext()));
            rvPersonas.setAdapter(personaAdapter);
            personaAdapter.setOnPersonaListener(this::editarPersona);
        }

        btnCerrar.setOnClickListener(v -> dismiss());
        btnAgregar.setOnClickListener(v -> agregarPersona());

        cargar();
        cargarPersonas();
    }

    private void agregarPersona() {
        String nombre = etNueva.getText().toString().trim();
        if (nombre.isEmpty()) {
            Toast.makeText(requireContext(), "Ingrese nombre", Toast.LENGTH_SHORT).show();
            return;
        }
        CreditoPersonaDTO p = new CreditoPersonaDTO();
        p.setNombre(nombre);
        RetrofitClient.getInstance().getApiService()
                .crearPersonaCredito(p)
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(r -> {
                    etNueva.setText("");
                    Toast.makeText(requireContext(), "Persona agregada", Toast.LENGTH_SHORT).show();
                    cargarPersonas();
                }, e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(),
                        Toast.LENGTH_LONG).show());
    }

    private void editarPersona(CreditoPersonaDTO p) {
        EditText input = new EditText(requireContext());
        input.setText(p.getNombre());
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Editar persona")
                .setView(input)
                .setPositiveButton("Guardar", (d, w) -> {
                    String nv = input.getText().toString().trim();
                    if (nv.isEmpty() || p.getIdPersona() == null) return;
                    p.setNombre(nv);
                    RetrofitClient.getInstance().getApiService()
                            .actualizarPersonaCredito(p.getIdPersona(), p)
                            .subscribeOn(Schedulers.io())
                            .observeOn(AndroidSchedulers.mainThread())
                            .subscribe(r -> cargarPersonas(),
                                    e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(),
                                            Toast.LENGTH_LONG).show());
                })
                .setNeutralButton("Eliminar", (d, w) -> {
                    if (p.getIdPersona() == null) return;
                    RetrofitClient.getInstance().getApiService()
                            .eliminarPersonaCredito(p.getIdPersona())
                            .subscribeOn(Schedulers.io())
                            .observeOn(AndroidSchedulers.mainThread())
                            .subscribe(r -> cargarPersonas(),
                                    e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(),
                                            Toast.LENGTH_LONG).show());
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void cargar() {
        RetrofitClient.getInstance().getApiService()
                .creditosActivos()
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

    private void cargarPersonas() {
        if (personaAdapter == null) return;
        RetrofitClient.getInstance().getApiService()
                .listarPersonasCredito()
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(
                        resp -> {
                            if (resp != null && resp.getDatos() != null) {
                                personaAdapter.submitList(resp.getDatos());
                            }
                        },
                        err -> android.util.Log.e("Creditos", "personas", err)
                );
    }

    private void crearCreditoDesdeVenta(CreditoVentaDTO c) {
        if (c.getIdPersona() == null) {
            Toast.makeText(requireContext(), "El credito no tiene persona asociada", Toast.LENGTH_SHORT).show();
            return;
        }
        long idUsuario = SessionManager.getInstance(requireContext()).getUserId();
        CrearCreditoVentaDTO dto = new CrearCreditoVentaDTO(
                c.getIdPersona(), c.getIdVenta(), c.getMontoTotal(), c.getNotas());
        RetrofitClient.getInstance().getApiService()
                .crearCreditoVenta(idUsuario, dto)
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(r -> {
                    Toast.makeText(requireContext(), "Credito registrado", Toast.LENGTH_SHORT).show();
                    cargar();
                }, e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(),
                        Toast.LENGTH_LONG).show());
    }

    private void abonar(CreditoVentaDTO c) {
        if (c.getIdCreditoVenta() == null) return;
        EditText input = new EditText(requireContext());
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Abonar a credito #" + c.getIdCreditoVenta())
                .setView(input)
                .setPositiveButton("Abonar", (d, w) -> {
                    try {
                        double monto = Double.parseDouble(input.getText().toString().trim());
                        long idUsuario = SessionManager.getInstance(requireContext()).getUserId();
                        RetrofitClient.getInstance().getApiService()
                                .crearAbono(c.getIdCreditoVenta(), monto, idUsuario, "EFECTIVO")
                                .subscribeOn(Schedulers.io())
                                .observeOn(AndroidSchedulers.mainThread())
                                .subscribe(r -> {
                                    Toast.makeText(requireContext(), "Abono registrado", Toast.LENGTH_SHORT).show();
                                    cargar();
                                }, e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(),
                                        Toast.LENGTH_LONG).show());
                    } catch (NumberFormatException e) {
                        Toast.makeText(requireContext(), "Monto invalido", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNeutralButton("Ver abonos", (d, w) -> verAbonos(c))
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void verAbonos(CreditoVentaDTO c) {
        if (c.getIdCreditoVenta() == null) return;
        RetrofitClient.getInstance().getApiService()
                .abonosCredito(c.getIdCreditoVenta())
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(resp -> {
                    StringBuilder sb = new StringBuilder("Abonos:\n");
                    if (resp != null && resp.getDatos() != null) {
                        for (CreditoAbonoDTO a : resp.getDatos()) {
                            sb.append("- $").append(String.format(Locale.US, "%.2f",
                                    a.getMonto() != null ? a.getMonto() : BigDecimal.ZERO)).append("\n");
                        }
                    }
                    new MaterialAlertDialogBuilder(requireContext())
                            .setTitle("Historial de abonos")
                            .setMessage(sb.toString())
                            .setPositiveButton("Cerrar", null)
                            .show();
                }, e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(),
                        Toast.LENGTH_LONG).show());
    }

    static class CreditoAdapter extends RecyclerView.Adapter<CreditoAdapter.VH> {
        private final List<CreditoVentaDTO> lista = new ArrayList<>();
        private OnAbonarListener abonarListener;
        private OnCrearCreditoListener crearListener;

        interface OnAbonarListener { void onAbonar(CreditoVentaDTO c); }
        interface OnCrearCreditoListener { void onCrear(CreditoVentaDTO c); }
        void setOnAbonarListener(OnAbonarListener l) { this.abonarListener = l; }
        void setOnCrearCreditoListener(OnCrearCreditoListener l) { this.crearListener = l; }

        void submitList(List<CreditoVentaDTO> l) {
            lista.clear();
            if (l != null) lista.addAll(l);
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_credito, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            CreditoVentaDTO c = lista.get(pos);
            h.tvInfo.setText("#" + c.getIdCreditoVenta());
            h.tvTotal.setText("Saldo: $" + String.format(Locale.US, "%.2f",
                    c.getSaldoPendiente() != null ? c.getSaldoPendiente() : BigDecimal.ZERO));
            h.btnAbonar.setOnClickListener(x -> { if (abonarListener != null) abonarListener.onAbonar(c); });
            h.btnCrear.setOnClickListener(x -> { if (crearListener != null) crearListener.onCrear(c); });
        }

        @Override
        public int getItemCount() { return lista.size(); }

        static class VH extends RecyclerView.ViewHolder {
            final TextView tvInfo, tvTotal, btnAbonar, btnCrear;
            VH(View v) {
                super(v);
                tvInfo = (TextView) v.findViewById(R.id.tvInfo);
                tvTotal = (TextView) v.findViewById(R.id.tvTotal);
                btnAbonar = (TextView) v.findViewById(R.id.btnAbonar);
                btnCrear = (TextView) v.findViewById(R.id.btnCrearCredito);
            }
        }
    }

    static class PersonaAdapter extends RecyclerView.Adapter<PersonaAdapter.VH> {
        private final List<CreditoPersonaDTO> lista = new ArrayList<>();
        private OnPersonaListener listener;
        interface OnPersonaListener { void onPersona(CreditoPersonaDTO p); }
        void setOnPersonaListener(OnPersonaListener l) { this.listener = l; }

        void submitList(List<CreditoPersonaDTO> l) {
            lista.clear();
            if (l != null) lista.addAll(l);
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_credito_persona, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            CreditoPersonaDTO p = lista.get(pos);
            h.tvNombre.setText(p.getNombre());
            BigDecimal deuda = p.getTotalDeuda() != null ? p.getTotalDeuda() : BigDecimal.ZERO;
            h.tvDeuda.setText("Deuda: $" + String.format(Locale.US, "%.2f", deuda));
            h.itemView.setOnClickListener(x -> { if (listener != null) listener.onPersona(p); });
        }

        @Override
        public int getItemCount() { return lista.size(); }

        static class VH extends RecyclerView.ViewHolder {
            final TextView tvNombre, tvDeuda;
            VH(View v) {
                super(v);
                tvNombre = (TextView) v.findViewById(R.id.tvNombrePersona);
                tvDeuda = (TextView) v.findViewById(R.id.tvDeudaPersona);
            }
        }
    }
}
