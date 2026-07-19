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
import com.dulcesnc.pos.data.remote.dto.PedidoProveedorDTO;
import com.dulcesnc.pos.data.remote.dto.ProveedorDTO;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.ArrayList;
import java.util.List;

import io.reactivex.rxjava3.schedulers.Schedulers;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;

public class ProveedoresDialogFragment extends DialogFragment {

    private ProveedorAdapter proveedorAdapter;
    private PedidoAdapter pedidoAdapter;
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
        return inflater.inflate(R.layout.dialog_proveedores, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        RecyclerView rvP = view.findViewById(R.id.rvProveedores);
        RecyclerView rvPed = view.findViewById(R.id.rvPedidos);
        tvVacio = view.findViewById(R.id.tvVacio);
        TextView btnNuevoProv = view.findViewById(R.id.btnNuevoProveedor);
        TextView btnNuevoPed = view.findViewById(R.id.btnNuevoPedido);
        TextView btnProv = view.findViewById(R.id.btnProvision);
        TextView btnCerrar = view.findViewById(R.id.btnCerrar);

        proveedorAdapter = new ProveedorAdapter();
        rvP.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvP.setAdapter(proveedorAdapter);
        proveedorAdapter.setOnProvListener(this::editarProveedor);

        pedidoAdapter = new PedidoAdapter();
        rvPed.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvPed.setAdapter(pedidoAdapter);
        pedidoAdapter.setOnRecibirListener(this::recibir);
        pedidoAdapter.setOnPedListener(this::editarPedido);

        btnCerrar.setOnClickListener(v -> dismiss());
        btnNuevoProv.setOnClickListener(v -> crearProveedor());
        btnNuevoPed.setOnClickListener(v -> crearPedido());
        btnProv.setOnClickListener(v -> verProvision());

        cargarProveedores();
        cargarPedidos();
    }

    private void cargarProveedores() {
        RetrofitClient.getInstance().getApiService()
                .listarProveedores()
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(
                        resp -> { if (resp != null && resp.getDatos() != null) proveedorAdapter.submitList(resp.getDatos()); },
                        err -> Toast.makeText(requireContext(), "Error proveedores: " + err.getMessage(), Toast.LENGTH_LONG).show()
                );
    }

    private void cargarPedidos() {
        RetrofitClient.getInstance().getApiService()
                .listarPedidos()
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(
                        resp -> {
                            if (resp != null && resp.getDatos() != null && !resp.getDatos().isEmpty()) {
                                pedidoAdapter.submitList(resp.getDatos());
                                tvVacio.setVisibility(View.GONE);
                            } else {
                                tvVacio.setVisibility(View.VISIBLE);
                            }
                        },
                        err -> {
                            tvVacio.setVisibility(View.VISIBLE);
                            tvVacio.setText("Error pedidos: " + err.getMessage());
                        }
                );
    }

    private void crearProveedor() {
        EditText etNombre = new EditText(requireContext());
        etNombre.setHint("Nombre");
        EditText etContacto = new EditText(requireContext());
        etContacto.setHint("Contacto");
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Nuevo proveedor")
                .setView(etNombre)
                .setView(etContacto)
                .setPositiveButton("Crear", (d, w) -> {
                    String nombre = etNombre.getText().toString().trim();
                    if (nombre.isEmpty()) return;
                    ProveedorDTO p = new ProveedorDTO();
                    p.setNombre(nombre);
                    p.setContacto(etContacto.getText().toString().trim());
                    RetrofitClient.getInstance().getApiService()
                            .crearProveedor(p)
                            .subscribeOn(Schedulers.io())
                            .observeOn(AndroidSchedulers.mainThread())
                            .subscribe(r -> cargarProveedores(),
                                    e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void editarProveedor(ProveedorDTO p) {
        if (p.getIdProveedor() == null) return;
        EditText etNombre = new EditText(requireContext());
        etNombre.setText(p.getNombre());
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Editar proveedor")
                .setView(etNombre)
                .setPositiveButton("Guardar", (d, w) -> {
                    String nombre = etNombre.getText().toString().trim();
                    if (nombre.isEmpty()) return;
                    p.setNombre(nombre);
                    RetrofitClient.getInstance().getApiService()
                            .actualizarProveedor(p.getIdProveedor(), p)
                            .subscribeOn(Schedulers.io())
                            .observeOn(AndroidSchedulers.mainThread())
                            .subscribe(r -> cargarProveedores(),
                                    e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
                })
                .setNeutralButton("Eliminar", (d, w) ->
                        RetrofitClient.getInstance().getApiService()
                                .eliminarProveedor(p.getIdProveedor())
                                .subscribeOn(Schedulers.io())
                                .observeOn(AndroidSchedulers.mainThread())
                                .subscribe(r -> cargarProveedores(),
                                        e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show()))
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void crearPedido() {
        EditText etProv = new EditText(requireContext());
        etProv.setHint("Id proveedor");
        EditText etMonto = new EditText(requireContext());
        etMonto.setHint("Monto total");
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Nuevo pedido")
                .setView(etProv)
                .setView(etMonto)
                .setPositiveButton("Crear", (d, w) -> {
                    try {
                        if (etProv.getText().toString().trim().isEmpty()) return;
                        long idProv = Long.parseLong(etProv.getText().toString().trim());
                        String montoStr = etMonto.getText().toString().trim();
                        PedidoProveedorDTO ped = new PedidoProveedorDTO();
                        ped.setIdProveedor(idProv);
                        ped.setMontoTotal(montoStr.isEmpty() ? java.math.BigDecimal.ZERO : new java.math.BigDecimal(montoStr));
                        ped.setEstatus("P");
                        RetrofitClient.getInstance().getApiService()
                                .crearPedido(ped)
                                .subscribeOn(Schedulers.io())
                                .observeOn(AndroidSchedulers.mainThread())
                                .subscribe(r -> cargarPedidos(),
                                        e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
                    } catch (NumberFormatException e) {
                        Toast.makeText(requireContext(), "Datos invalidos", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void editarPedido(PedidoProveedorDTO p) {
        if (p.getIdPedido() == null) return;
        EditText etMonto = new EditText(requireContext());
        etMonto.setText(p.getMontoTotal() != null ? p.getMontoTotal().toString() : "0");
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Editar pedido #" + p.getIdPedido())
                .setView(etMonto)
                .setPositiveButton("Guardar", (d, w) -> {
                    try {
                        String montoStr = etMonto.getText().toString().trim();
                        p.setMontoTotal(montoStr.isEmpty() ? java.math.BigDecimal.ZERO : new java.math.BigDecimal(montoStr));
                        RetrofitClient.getInstance().getApiService()
                                .actualizarPedido(p.getIdPedido(), p)
                                .subscribeOn(Schedulers.io())
                                .observeOn(AndroidSchedulers.mainThread())
                                .subscribe(r -> cargarPedidos(),
                                        e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
                    } catch (NumberFormatException e) {
                        Toast.makeText(requireContext(), "Monto invalido", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNeutralButton("Eliminar", (d, w) ->
                        RetrofitClient.getInstance().getApiService()
                                .eliminarPedido(p.getIdPedido())
                                .subscribeOn(Schedulers.io())
                                .observeOn(AndroidSchedulers.mainThread())
                                .subscribe(r -> cargarPedidos(),
                                        e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show()))
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void recibir(PedidoProveedorDTO p) {
        if (p.getIdPedido() == null) return;
        RetrofitClient.getInstance().getApiService()
                .recibirPedido(p.getIdPedido())
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(r -> {
                    Toast.makeText(requireContext(), "Pedido recibido", Toast.LENGTH_SHORT).show();
                    cargarPedidos();
                }, e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
    }

    private void verProvision() {
        RetrofitClient.getInstance().getApiService()
                .provisionSemanal()
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(resp -> {
                    StringBuilder sb = new StringBuilder("Provision semanal:\n");
                    if (resp != null && resp.getDatos() != null) {
                        for (Object o : resp.getDatos()) sb.append("- ").append(o.toString()).append("\n");
                    }
                    new MaterialAlertDialogBuilder(requireContext())
                            .setTitle("Provision")
                            .setMessage(sb.toString())
                            .setPositiveButton("Cerrar", null)
                            .show();
                }, e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
    }

    static class ProveedorAdapter extends RecyclerView.Adapter<ProveedorAdapter.VH> {
        private final List<ProveedorDTO> lista = new ArrayList<>();
        private OnProvListener listener;
        interface OnProvListener { void onProv(ProveedorDTO p); }
        void setOnProvListener(OnProvListener l) { this.listener = l; }
        void submitList(List<ProveedorDTO> l) { lista.clear(); if (l != null) lista.addAll(l); notifyDataSetChanged(); }
        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int t) {
            return new VH(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_proveedor, parent, false));
        }
        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            ProveedorDTO p = lista.get(pos);
            h.tvNombre.setText(p.getNombre() != null ? p.getNombre() : "Proveedor");
            h.tvContacto.setText(p.getContacto() != null ? p.getContacto() : "");
            h.itemView.setOnClickListener(x -> { if (listener != null) listener.onProv(p); });
        }
        @Override
        public int getItemCount() { return lista.size(); }
        static class VH extends RecyclerView.ViewHolder {
            final TextView tvNombre, tvContacto;
            VH(View v) {
                super(v);
                tvNombre = (TextView) v.findViewById(R.id.tvNombre);
                tvContacto = (TextView) v.findViewById(R.id.tvContacto);
            }
        }
    }

    static class PedidoAdapter extends RecyclerView.Adapter<PedidoAdapter.VH> {
        private final List<PedidoProveedorDTO> lista = new ArrayList<>();
        private OnRecibirListener recibirListener;
        private OnPedListener pedListener;
        interface OnRecibirListener { void onRecibir(PedidoProveedorDTO p); }
        interface OnPedListener { void onPed(PedidoProveedorDTO p); }
        void setOnRecibirListener(OnRecibirListener l) { this.recibirListener = l; }
        void setOnPedListener(OnPedListener l) { this.pedListener = l; }
        void submitList(List<PedidoProveedorDTO> l) { lista.clear(); if (l != null) lista.addAll(l); notifyDataSetChanged(); }
        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int t) {
            return new VH(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_pedido, parent, false));
        }
        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            PedidoProveedorDTO p = lista.get(pos);
            h.tvInfo.setText("#" + p.getIdPedido() + " - " + (p.getEstatus() != null ? p.getEstatus() : ""));
            h.tvProveedor.setText(p.getIdProveedor() != null ? "Prov #" + p.getIdProveedor() : "");
            h.btnRecibir.setOnClickListener(x -> { if (recibirListener != null) recibirListener.onRecibir(p); });
            h.itemView.setOnLongClickListener(x -> { if (pedListener != null) pedListener.onPed(p); return true; });
        }
        @Override
        public int getItemCount() { return lista.size(); }
        static class VH extends RecyclerView.ViewHolder {
            final TextView tvInfo, tvProveedor, btnRecibir;
            VH(View v) {
                super(v);
                tvInfo = (TextView) v.findViewById(R.id.tvInfo);
                tvProveedor = (TextView) v.findViewById(R.id.tvProveedor);
                btnRecibir = (TextView) v.findViewById(R.id.btnRecibir);
            }
        }
    }
}
