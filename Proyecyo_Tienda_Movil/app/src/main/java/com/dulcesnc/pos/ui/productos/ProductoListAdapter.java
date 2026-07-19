package com.dulcesnc.pos.ui.productos;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.entity.ProductoEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class ProductoListAdapter extends RecyclerView.Adapter<ProductoListAdapter.ViewHolder> {

    private final List<ProductoEntity> productos = new ArrayList<>();
    private OnProductoActionListener listener;

    public interface OnProductoActionListener {
        void onEditarClick(ProductoEntity producto);
        void onEliminarClick(ProductoEntity producto);
    }

    public void setOnProductoActionListener(OnProductoActionListener listener) {
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_producto_lista, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        ProductoEntity p = productos.get(position);
        holder.tvNombre.setText(p.getNombre());
        holder.tvCategoria.setText("ID: " + p.getIdProducto());

        if (p.getPrecioVenta() != null) {
            holder.tvPrecio.setText("$" + String.format(Locale.US, "%.2f", p.getPrecioVenta()));
        }

        if (p.getStock() != null) {
            holder.tvStock.setText("Stock: " + p.getStock());
            if (p.getStock() != null && p.getStock() <= (p.getCantidadMin() != null ? p.getCantidadMin() : 0)) {
                holder.tvStock.setTextColor(holder.itemView.getContext()
                        .getColor(R.color.danger));
            } else {
                holder.tvStock.setTextColor(holder.itemView.getContext()
                        .getColor(R.color.text_secondary));
            }
        }

        holder.btnEditar.setOnClickListener(v -> {
            if (listener != null) listener.onEditarClick(p);
        });

        holder.itemView.setOnLongClickListener(v -> {
            if (listener != null) listener.onEliminarClick(p);
            return true;
        });

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) listener.onEditarClick(p);
        });
    }

    @Override
    public int getItemCount() {
        return productos.size();
    }

    public void submitList(List<ProductoEntity> list) {
        productos.clear();
        if (list != null) productos.addAll(list);
        notifyDataSetChanged();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        final TextView tvNombre, tvCategoria, tvPrecio, tvStock, btnEditar;

        ViewHolder(View itemView) {
            super(itemView);
            tvNombre = itemView.findViewById(R.id.tvNombre);
            tvCategoria = itemView.findViewById(R.id.tvCategoria);
            tvPrecio = itemView.findViewById(R.id.tvPrecio);
            tvStock = itemView.findViewById(R.id.tvStock);
            btnEditar = itemView.findViewById(R.id.btnEditar);
        }
    }
}
