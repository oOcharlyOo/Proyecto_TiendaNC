package com.dulcesnc.pos.ui.ventas;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.cardview.widget.CardView;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.entity.ProductoEntity;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class ProductoAdapter extends RecyclerView.Adapter<ProductoAdapter.ViewHolder> {

    private static final String[] EMOJIS = {"📦", "🍬", "🍫", "🍭", "🥜", "🎂", "🍪", "🧁"};

    private final List<ProductoEntity> productos = new ArrayList<>();
    private OnProductoClickListener listener;

    public interface OnProductoClickListener {
        void onProductoClick(ProductoEntity producto);
    }

    public void setOnProductoClickListener(OnProductoClickListener listener) {
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_producto_grid, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        ProductoEntity producto = productos.get(position);
        int emojiIndex = Math.abs(producto.getNombre().hashCode()) % EMOJIS.length;
        holder.tvEmoji.setText(EMOJIS[emojiIndex]);
        holder.tvNombre.setText(producto.getNombre());

        BigDecimal precio = producto.getPrecioVenta();
        if (precio != null) {
            holder.tvPrecio.setText("$" + String.format(Locale.US, "%.2f", precio));
        }

        if (producto.getStock() != null && producto.getCantidadMin() != null && producto.getStock() <= producto.getCantidadMin()) {
            holder.tvStock.setVisibility(View.VISIBLE);
            holder.tvStock.setText("Stock: " + producto.getStock());
        } else {
            holder.tvStock.setVisibility(View.GONE);
        }

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) {
                listener.onProductoClick(producto);
            }
        });
    }

    @Override
    public int getItemCount() {
        return productos.size();
    }

    public void submitList(List<ProductoEntity> list) {
        productos.clear();
        if (list != null) {
            productos.addAll(list);
        }
        notifyDataSetChanged();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        final TextView tvEmoji;
        final TextView tvNombre;
        final TextView tvPrecio;
        final TextView tvStock;

        ViewHolder(View itemView) {
            super(itemView);
            tvEmoji = itemView.findViewById(R.id.tvEmoji);
            tvNombre = itemView.findViewById(R.id.tvNombre);
            tvPrecio = itemView.findViewById(R.id.tvPrecio);
            tvStock = itemView.findViewById(R.id.tvStock);
        }
    }
}
