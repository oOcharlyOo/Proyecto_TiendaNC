package com.dulcesnc.pos.ui.productos;

import android.app.Dialog;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.CheckBox;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.cardview.widget.CardView;
import androidx.fragment.app.DialogFragment;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.DatabaseClient;
import com.dulcesnc.pos.data.local.entity.ProductoEntity;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.ProductoDTO;
import com.google.android.material.textfield.TextInputEditText;

import java.math.BigDecimal;

import io.reactivex.rxjava3.schedulers.Schedulers;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;

public class ProductoDialogFragment extends DialogFragment {

    private static final String ARG_PRODUCTO = "producto";

    private ProductoEntity productoEdit;
    private TextInputEditText etNombre, etPrecioVenta, etPrecioCosto, etStock,
            etCodigoBarras, etCantidadMin, etCantidadMax, etPrecioMayoreo, etPrecioEnvase;
    private CheckBox cbIsGramaje, cbRequiereEnvase;
    private CardView btnGuardar, btnCancelar;

    public static ProductoDialogFragment newInstance() {
        return new ProductoDialogFragment();
    }

    public static ProductoDialogFragment newInstance(ProductoEntity producto) {
        ProductoDialogFragment f = new ProductoDialogFragment();
        Bundle args = new Bundle();
        args.putSerializable(ARG_PRODUCTO, producto);
        f.setArguments(args);
        return f;
    }

    @NonNull
    @Override
    public Dialog onCreateDialog(@Nullable Bundle savedInstanceState) {
        Dialog dialog = super.onCreateDialog(savedInstanceState);
        dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        return dialog;
    }

    @Nullable
    @Override
    public android.view.View onCreateView(@NonNull android.view.LayoutInflater inflater,
                                          @Nullable android.view.ViewGroup container,
                                          @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.dialog_producto, container, false);
    }

    @Override
    public void onViewCreated(@NonNull android.view.View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        if (getArguments() != null) {
            productoEdit = (ProductoEntity) getArguments().getSerializable(ARG_PRODUCTO, ProductoEntity.class);
        }

        etNombre = view.findViewById(R.id.etNombre);
        etPrecioVenta = view.findViewById(R.id.etPrecioVenta);
        etPrecioCosto = view.findViewById(R.id.etPrecioCosto);
        etStock = view.findViewById(R.id.etStock);
        etCodigoBarras = view.findViewById(R.id.etCodigoBarras);
        etCantidadMin = view.findViewById(R.id.etCantidadMin);
        etCantidadMax = view.findViewById(R.id.etCantidadMax);
        etPrecioMayoreo = view.findViewById(R.id.etPrecioMayoreo);
        etPrecioEnvase = view.findViewById(R.id.etPrecioEnvase);
        cbIsGramaje = view.findViewById(R.id.cbIsGramaje);
        cbRequiereEnvase = view.findViewById(R.id.cbRequiereEnvase);
        btnGuardar = view.findViewById(R.id.btnGuardar);
        btnCancelar = view.findViewById(R.id.btnCancelar);

        if (productoEdit != null) {
            TextView tvTitle = view.findViewById(R.id.tvDialogTitle);
            tvTitle.setText("Editar Producto");
            populateFields();
        }

        btnGuardar.setOnClickListener(v -> guardarProducto());
        btnCancelar.setOnClickListener(v -> dismiss());
    }

    private void populateFields() {
        if (productoEdit == null) return;
        etNombre.setText(productoEdit.getNombre());
        if (productoEdit.getPrecioVenta() != null)
            etPrecioVenta.setText(productoEdit.getPrecioVenta().toString());
        if (productoEdit.getPrecioCosto() != null)
            etPrecioCosto.setText(productoEdit.getPrecioCosto().toString());
        if (productoEdit.getStock() != null)
            etStock.setText(String.valueOf(productoEdit.getStock()));
        etCodigoBarras.setText(productoEdit.getCodigoBarras());
        if (productoEdit.getCantidadMin() != null)
            etCantidadMin.setText(String.valueOf(productoEdit.getCantidadMin()));
        if (productoEdit.getCantidadMax() != null)
            etCantidadMax.setText(String.valueOf(productoEdit.getCantidadMax()));
        if (productoEdit.getPrecioMayoreo() != null)
            etPrecioMayoreo.setText(productoEdit.getPrecioMayoreo().toString());
        if (productoEdit.getPrecioEnvase() != null)
            etPrecioEnvase.setText(productoEdit.getPrecioEnvase().toString());
        if (productoEdit.getIsGramaje() != null)
            cbIsGramaje.setChecked(productoEdit.getIsGramaje());
        if (productoEdit.getRequiereEnvase() != null)
            cbRequiereEnvase.setChecked(productoEdit.getRequiereEnvase());
    }

    private ProductoEntity buildProducto() {
        String nombre = etNombre.getText() != null ? etNombre.getText().toString().trim() : "";
        String precioVentaStr = etPrecioVenta.getText() != null ? etPrecioVenta.getText().toString().trim() : "";
        String precioCostoStr = etPrecioCosto.getText() != null ? etPrecioCosto.getText().toString().trim() : "";
        String stockStr = etStock.getText() != null ? etStock.getText().toString().trim() : "";
        String codigo = etCodigoBarras.getText() != null ? etCodigoBarras.getText().toString().trim() : "";
        String minStr = etCantidadMin.getText() != null ? etCantidadMin.getText().toString().trim() : "";
        String maxStr = etCantidadMax.getText() != null ? etCantidadMax.getText().toString().trim() : "";
        String mayoreoStr = etPrecioMayoreo.getText() != null ? etPrecioMayoreo.getText().toString().trim() : "";
        String envaseStr = etPrecioEnvase.getText() != null ? etPrecioEnvase.getText().toString().trim() : "";

        Long id = productoEdit != null ? productoEdit.getIdProducto() : System.currentTimeMillis();

        BigDecimal precioVenta = !TextUtils.isEmpty(precioVentaStr) ? new BigDecimal(precioVentaStr) : BigDecimal.ZERO;
        BigDecimal precioCosto = !TextUtils.isEmpty(precioCostoStr) ? new BigDecimal(precioCostoStr) : BigDecimal.ZERO;
        Integer stock = !TextUtils.isEmpty(stockStr) ? Integer.parseInt(stockStr) : 0;
        Integer min = !TextUtils.isEmpty(minStr) ? Integer.parseInt(minStr) : 0;
        Integer max = !TextUtils.isEmpty(maxStr) ? Integer.parseInt(maxStr) : 0;
        BigDecimal mayoreo = !TextUtils.isEmpty(mayoreoStr) ? new BigDecimal(mayoreoStr) : null;
        BigDecimal envase = !TextUtils.isEmpty(envaseStr) ? new BigDecimal(envaseStr) : BigDecimal.ZERO;

        return new ProductoEntity(
                id, nombre, precioCosto, precioVenta, stock, min, max,
                mayoreo, cbIsGramaje.isChecked(), cbRequiereEnvase.isChecked(),
                envase, codigo, productoEdit != null ? productoEdit.getIdCategoria() : null,
                productoEdit != null ? productoEdit.getIdSubcategoria() : null,
                "A", null
        );
    }

    private void guardarProducto() {
        if (etNombre.getText() == null || TextUtils.isEmpty(etNombre.getText().toString().trim())) {
            Toast.makeText(requireContext(), "El nombre es obligatorio", Toast.LENGTH_SHORT).show();
            return;
        }
        if (TextUtils.isEmpty(etPrecioVenta.getText())) {
            Toast.makeText(requireContext(), "El precio de venta es obligatorio", Toast.LENGTH_SHORT).show();
            return;
        }

        ProductoEntity producto = buildProducto();
        ProductoDTO dto = toDto(producto);
        boolean esEdicion = productoEdit != null;

        var api = RetrofitClient.getInstance().getApiService();
        var call = esEdicion
                ? api.actualizarProducto(producto.getIdProducto(), dto)
                : api.agregarProducto(dto);

        call.subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(
                        resp -> {
                            ProductoDTO r = resp != null ? resp.getDatos() : null;
                            if (r != null && r.getIdProducto() != null) {
                                producto.setIdProducto(r.getIdProducto());
                            }
                            producto.setSincronizado(true);
                            DatabaseClient.getInstance(requireContext())
                                    .getAppDatabase().productoDao().insert(producto);
                            Toast.makeText(requireContext(),
                                    esEdicion ? "Producto actualizado" : "Producto guardado",
                                    Toast.LENGTH_SHORT).show();
                            dismiss();
                        },
                        err -> {
                            producto.setSincronizado(false);
                            DatabaseClient.getInstance(requireContext())
                                    .getAppDatabase().productoDao().insert(producto);
                            Toast.makeText(requireContext(),
                                    "Guardado local (se sincronizara): " + err.getMessage(),
                                    Toast.LENGTH_LONG).show();
                            dismiss();
                        }
                );
    }

    private ProductoDTO toDto(ProductoEntity p) {
        ProductoDTO d = new ProductoDTO();
        d.setIdProducto(p.getIdProducto());
        d.setNombre(p.getNombre());
        d.setPrecioCosto(p.getPrecioCosto());
        d.setPrecioVenta(p.getPrecioVenta());
        d.setStock(p.getStock());
        d.setCantidadMin(p.getCantidadMin());
        d.setCantidadMax(p.getCantidadMax());
        d.setPrecioMayoreo(p.getPrecioMayoreo());
        d.setIsGramaje(p.getIsGramaje());
        d.setRequiereEnvase(p.getRequiereEnvase());
        d.setPrecioEnvase(p.getPrecioEnvase());
        d.setCodigoBarras(p.getCodigoBarras());
        d.setIdCategoria(p.getIdCategoria());
        d.setIdSubcategoria(p.getIdSubcategoria());
        d.setEstatus(p.getEstatus());
        d.setPresentacionCaja(p.getPresentacionCaja());
        return d;
    }
}
