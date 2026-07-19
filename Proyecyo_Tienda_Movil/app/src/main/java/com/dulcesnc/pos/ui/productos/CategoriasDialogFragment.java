package com.dulcesnc.pos.ui.productos;

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
import com.dulcesnc.pos.data.local.DatabaseClient;
import com.dulcesnc.pos.data.local.entity.CategoriaEntity;
import com.dulcesnc.pos.data.local.entity.SubcategoriaEntity;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.CategoriaDTO;
import com.dulcesnc.pos.data.remote.dto.SubcategoriaDTO;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.ArrayList;
import java.util.List;

import io.reactivex.rxjava3.schedulers.Schedulers;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;

public class CategoriasDialogFragment extends DialogFragment {

    private CategoriaAdapter catAdapter;
    private SubcategoriaAdapter subAdapter;
    private TextView tvSubTitle;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setStyle(DialogFragment.STYLE_NORMAL, R.style.Theme_ZeldaDialog);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.dialog_categorias, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        RecyclerView rvCat = view.findViewById(R.id.rvCategorias);
        RecyclerView rvSub = view.findViewById(R.id.rvSubcategorias);
        tvSubTitle = view.findViewById(R.id.tvSubTitle);
        TextView btnNuevaCat = view.findViewById(R.id.btnNuevaCategoria);
        TextView btnNuevaSub = view.findViewById(R.id.btnNuevaSubcategoria);
        TextView btnCerrar = view.findViewById(R.id.btnCerrar);

        catAdapter = new CategoriaAdapter();
        rvCat.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvCat.setAdapter(catAdapter);
        catAdapter.setOnCatListener(this::editarCategoria);

        subAdapter = new SubcategoriaAdapter();
        rvSub.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvSub.setAdapter(subAdapter);
        subAdapter.setOnSubListener(this::editarSubcategoria);

        btnNuevaCat.setOnClickListener(v -> crearCategoria());
        btnNuevaSub.setOnClickListener(v -> crearSubcategoria());
        btnCerrar.setOnClickListener(v -> dismiss());

        cargarCategorias();
        cargarSubcategorias();
    }

    private void cargarCategorias() {
        RetrofitClient.getInstance().getApiService().listarCategorias()
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(resp -> {
                    if (resp != null && resp.getDatos() != null) {
                        List<CategoriaEntity> lista = new ArrayList<>();
                        for (CategoriaDTO d : resp.getDatos()) {
                            CategoriaEntity e = new CategoriaEntity();
                            e.setIdCategoria(d.getIdCategoria());
                            e.setNombre(d.getNombre());
                            e.setDescripcion(d.getDescripcion());
                            e.setEstatus(d.getEstatus());
                            e.setSincronizado(true);
                            lista.add(e);
                        }
                        DatabaseClient.getInstance(requireContext()).getAppDatabase()
                                .categoriaDao().insertAll(lista);
                        catAdapter.submitList(lista);
                    }
                }, err -> Toast.makeText(requireContext(),
                        "Error categorias: " + err.getMessage(), Toast.LENGTH_SHORT).show());
    }

    private void cargarSubcategorias() {
        RetrofitClient.getInstance().getApiService().listarSubcategorias()
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(resp -> {
                    if (resp != null && resp.getDatos() != null) {
                        List<SubcategoriaEntity> lista = new ArrayList<>();
                        for (SubcategoriaDTO d : resp.getDatos()) {
                            SubcategoriaEntity e = new SubcategoriaEntity();
                            e.setIdSubcategoria(d.getIdSubcategoria());
                            e.setNombre(d.getNombre());
                            e.setDescripcion(d.getDescripcion());
                            e.setIdCategoria(d.getIdCategoria());
                            e.setEstatus(d.getEstatus());
                            e.setSincronizado(true);
                            lista.add(e);
                        }
                        DatabaseClient.getInstance(requireContext()).getAppDatabase()
                                .subcategoriaDao().insertAll(lista);
                        subAdapter.submitList(lista);
                    }
                }, err -> Toast.makeText(requireContext(),
                        "Error subcategorias: " + err.getMessage(), Toast.LENGTH_SHORT).show());
    }

    private void crearCategoria() {
        EditText et = new EditText(requireContext());
        et.setHint("Nombre de categoria");
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Nueva categoria")
                .setView(et)
                .setPositiveButton("Crear", (d, w) -> {
                    String nombre = et.getText().toString().trim();
                    if (nombre.isEmpty()) return;
                    CategoriaDTO dto = new CategoriaDTO();
                    dto.setNombre(nombre);
                    dto.setEstatus("A");
                    RetrofitClient.getInstance().getApiService().agregarCategoria(dto)
                            .subscribeOn(Schedulers.io())
                            .observeOn(AndroidSchedulers.mainThread())
                            .subscribe(r -> cargarCategorias(),
                                    e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void editarCategoria(CategoriaEntity c) {
        if (c.getIdCategoria() == null) return;
        EditText et = new EditText(requireContext());
        et.setText(c.getNombre());
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Editar categoria")
                .setView(et)
                .setPositiveButton("Guardar", (d, w) -> {
                    String nombre = et.getText().toString().trim();
                    if (nombre.isEmpty()) return;
                    c.setNombre(nombre);
                    RetrofitClient.getInstance().getApiService()
                            .actualizarCategoria(c.getIdCategoria(), toCatDto(c))
                            .subscribeOn(Schedulers.io())
                            .observeOn(AndroidSchedulers.mainThread())
                            .subscribe(r -> cargarCategorias(),
                                    e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
                })
                .setNeutralButton("Eliminar", (d, w) ->
                        RetrofitClient.getInstance().getApiService()
                                .eliminarCategoria(c.getIdCategoria())
                                .subscribeOn(Schedulers.io())
                                .observeOn(AndroidSchedulers.mainThread())
                                .subscribe(r -> { DatabaseClient.getInstance(requireContext()).getAppDatabase().categoriaDao().deleteById(c.getIdCategoria()); cargarCategorias(); },
                                        e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show()))
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void crearSubcategoria() {
        EditText et = new EditText(requireContext());
        et.setHint("Nombre de subcategoria");
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Nueva subcategoria")
                .setView(et)
                .setPositiveButton("Crear", (d, w) -> {
                    String nombre = et.getText().toString().trim();
                    if (nombre.isEmpty()) return;
                    SubcategoriaDTO dto = new SubcategoriaDTO();
                    dto.setNombre(nombre);
                    dto.setEstatus("A");
                    RetrofitClient.getInstance().getApiService().agregarSubcategoria(dto)
                            .subscribeOn(Schedulers.io())
                            .observeOn(AndroidSchedulers.mainThread())
                            .subscribe(r -> cargarSubcategorias(),
                                    e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void editarSubcategoria(SubcategoriaEntity s) {
        if (s.getIdSubcategoria() == null) return;
        EditText et = new EditText(requireContext());
        et.setText(s.getNombre());
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Editar subcategoria")
                .setView(et)
                .setPositiveButton("Guardar", (d, w) -> {
                    String nombre = et.getText().toString().trim();
                    if (nombre.isEmpty()) return;
                    s.setNombre(nombre);
                    RetrofitClient.getInstance().getApiService()
                            .actualizarSubcategoria(s.getIdSubcategoria(), toSubDto(s))
                            .subscribeOn(Schedulers.io())
                            .observeOn(AndroidSchedulers.mainThread())
                            .subscribe(r -> cargarSubcategorias(),
                                    e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
                })
                .setNeutralButton("Eliminar", (d, w) ->
                        RetrofitClient.getInstance().getApiService()
                                .eliminarSubcategoria(s.getIdSubcategoria())
                                .subscribeOn(Schedulers.io())
                                .observeOn(AndroidSchedulers.mainThread())
                                .subscribe(r -> { DatabaseClient.getInstance(requireContext()).getAppDatabase().subcategoriaDao().deleteById(s.getIdSubcategoria()); cargarSubcategorias(); },
                                        e -> Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show()))
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private CategoriaDTO toCatDto(CategoriaEntity c) {
        CategoriaDTO d = new CategoriaDTO();
        d.setIdCategoria(c.getIdCategoria());
        d.setNombre(c.getNombre());
        d.setDescripcion(c.getDescripcion());
        d.setEstatus(c.getEstatus());
        return d;
    }

    private SubcategoriaDTO toSubDto(SubcategoriaEntity s) {
        SubcategoriaDTO d = new SubcategoriaDTO();
        d.setIdSubcategoria(s.getIdSubcategoria());
        d.setNombre(s.getNombre());
        d.setDescripcion(s.getDescripcion());
        d.setIdCategoria(s.getIdCategoria());
        d.setEstatus(s.getEstatus());
        return d;
    }

    static class CategoriaAdapter extends RecyclerView.Adapter<CategoriaAdapter.VH> {
        private final List<CategoriaEntity> lista = new ArrayList<>();
        private OnCatListener listener;
        interface OnCatListener { void onCat(CategoriaEntity c); }
        void setOnCatListener(OnCatListener l) { this.listener = l; }
        void submitList(List<CategoriaEntity> l) { lista.clear(); if (l != null) lista.addAll(l); notifyDataSetChanged(); }
        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int t) {
            return new VH(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_categoria, parent, false));
        }
        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            CategoriaEntity c = lista.get(pos);
            h.tvNombre.setText(c.getNombre() != null ? c.getNombre() : "Categoria");
            h.itemView.setOnClickListener(x -> { if (listener != null) listener.onCat(c); });
        }
        @Override
        public int getItemCount() { return lista.size(); }
        static class VH extends RecyclerView.ViewHolder {
            final TextView tvNombre;
            VH(View v) { super(v); tvNombre = (TextView) v.findViewById(R.id.tvNombre); }
        }
    }

    static class SubcategoriaAdapter extends RecyclerView.Adapter<SubcategoriaAdapter.VH> {
        private final List<SubcategoriaEntity> lista = new ArrayList<>();
        private OnSubListener listener;
        interface OnSubListener { void onSub(SubcategoriaEntity s); }
        void setOnSubListener(OnSubListener l) { this.listener = l; }
        void submitList(List<SubcategoriaEntity> l) { lista.clear(); if (l != null) lista.addAll(l); notifyDataSetChanged(); }
        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int t) {
            return new VH(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_subcategoria, parent, false));
        }
        @Override
        public void onBindViewHolder(@NonNull VH h, int pos) {
            SubcategoriaEntity s = lista.get(pos);
            h.tvNombre.setText(s.getNombre() != null ? s.getNombre() : "Subcategoria");
            h.itemView.setOnClickListener(x -> { if (listener != null) listener.onSub(s); });
        }
        @Override
        public int getItemCount() { return lista.size(); }
        static class VH extends RecyclerView.ViewHolder {
            final TextView tvNombre;
            VH(View v) { super(v); tvNombre = (TextView) v.findViewById(R.id.tvNombre); }
        }
    }
}
