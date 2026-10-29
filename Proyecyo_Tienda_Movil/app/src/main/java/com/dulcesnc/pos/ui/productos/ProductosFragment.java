package com.dulcesnc.pos.ui.productos;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.entity.ProductoEntity;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.ProductoDTO;
import com.dulcesnc.pos.utils.Constants;
import com.google.android.material.textfield.TextInputEditText;

import java.util.ArrayList;
import android.widget.Toast;
import java.util.List;

import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;
import io.reactivex.rxjava3.disposables.CompositeDisposable;
import io.reactivex.rxjava3.schedulers.Schedulers;

public class ProductosFragment extends Fragment {

    private ProductosViewModel viewModel;
    private ProductoListAdapter adapter;
    private CompositeDisposable disposables = new CompositeDisposable();
    private TextInputEditText etBuscar;
    private RecyclerView rvProductos;
    private View btnAgregar;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_productos, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        viewModel = new ViewModelProvider(this).get(ProductosViewModel.class);

        etBuscar = view.findViewById(R.id.etBuscar);
        rvProductos = view.findViewById(R.id.rvProductos);
        btnAgregar = view.findViewById(R.id.btnAgregar);

        setupList();
        setupSearch();
        setupAgregar();
        setupCategorias();
        observeData();
        syncData();
    }

    private void setupCategorias() {
        View btnCat = requireView().findViewById(R.id.btnCategorias);
        if (btnCat != null) {
            btnCat.setOnClickListener(v -> {
                CategoriasDialogFragment d = new CategoriasDialogFragment();
                d.show(getParentFragmentManager(), "categorias_dialog");
            });
        }
    }

    private void setupList() {
        adapter = new ProductoListAdapter();
        rvProductos.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvProductos.setAdapter(adapter);

        adapter.setOnProductoActionListener(new com.dulcesnc.pos.ui.productos.ProductoListAdapter.OnProductoActionListener() {
            @Override
            public void onEditarClick(com.dulcesnc.pos.data.local.entity.ProductoEntity producto) {
                ProductoDialogFragment dialog = ProductoDialogFragment.newInstance(producto);
                dialog.show(getParentFragmentManager(), "producto_dialog");
            }

            @Override
            public void onEliminarClick(com.dulcesnc.pos.data.local.entity.ProductoEntity producto) {
                new androidx.appcompat.app.AlertDialog.Builder(requireContext())
                        .setTitle("Eliminar producto")
                        .setMessage("¿Eliminar " + producto.getNombre() + "?")
                        .setPositiveButton("Eliminar", (d, w) -> eliminarProducto(producto))
                        .setNegativeButton("Cancelar", null)
                        .show();
            }
        });
    }

    private void setupSearch() {
        etBuscar.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                viewModel.setSearchQuery(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });
    }

    private void setupAgregar() {
        btnAgregar.setOnClickListener(v -> {
            ProductoDialogFragment dialog = ProductoDialogFragment.newInstance();
            dialog.show(getParentFragmentManager(), "producto_dialog");
        });
    }

    private void observeData() {
        viewModel.getFilteredProducts().observe(getViewLifecycleOwner(), productos -> {
            adapter.submitList(productos);
        });
    }

    private void eliminarProducto(ProductoEntity producto) {
        if (producto.getIdProducto() == null) return;
        RetrofitClient.getInstance().getApiService()
                .eliminarProducto(producto.getIdProducto())
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(r -> {
                    com.dulcesnc.pos.data.local.DatabaseClient.getInstance(requireContext())
                            .getAppDatabase().productoDao().deleteById(producto.getIdProducto());
                    Toast.makeText(requireContext(), "Producto eliminado", Toast.LENGTH_SHORT).show();
                }, err -> Toast.makeText(requireContext(),
                        "Error: " + err.getMessage(), Toast.LENGTH_LONG).show());
    }

    private void syncData() {
        String sucursal = requireActivity()
                .getSharedPreferences(Constants.PREF_NAME, android.content.Context.MODE_PRIVATE)
                .getString(Constants.KEY_SUCURSAL, Constants.SUCURSAL_DULCERIA);
        RetrofitClient.getInstance().setSucursal(sucursal);

        disposables.add(RetrofitClient.getInstance().getApiService().listarProductos()
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(response -> {
                    if (response.isSuccess() && response.getDatos() != null) {
                        com.dulcesnc.pos.data.local.DatabaseClient.getInstance(requireContext())
                                .getAppDatabase().productoDao().deleteAll();
                        for (ProductoDTO dto : response.getDatos()) {
                            com.dulcesnc.pos.data.local.DatabaseClient.getInstance(requireContext())
                                    .getAppDatabase().productoDao().insert(new ProductoEntity(
                                            dto.getIdProducto(), dto.getNombre(),
                                            dto.getPrecioCosto(), dto.getPrecioVenta(),
                                            dto.getStock(), dto.getCantidadMin(),
                                            dto.getCantidadMax(), dto.getPrecioMayoreo(),
                                            dto.getIsGramaje(), dto.getRequiereEnvase(),
                                            dto.getPrecioEnvase(), dto.getCodigoBarras(),
                                            dto.getIdCategoria(), dto.getIdSubcategoria(),
                                            dto.getEstatus(), dto.getPresentacionCaja()
                                    ));
                        }
                    }
                }, throwable -> {}));
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        disposables.clear();
    }
}
