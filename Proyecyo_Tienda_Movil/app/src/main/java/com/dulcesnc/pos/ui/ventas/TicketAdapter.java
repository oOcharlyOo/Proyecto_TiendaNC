package com.dulcesnc.pos.ui.ventas;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class TicketAdapter extends RecyclerView.Adapter<TicketAdapter.ViewHolder> {

    private final List<TicketItem> items = new ArrayList<>();
    private OnTicketItemListener listener;

    public interface OnTicketItemListener {
        void onEliminarClick(TicketItem item, int position);
    }

    public void setOnTicketItemListener(OnTicketItemListener listener) {
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_ticket, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        TicketItem item = items.get(position);
        holder.tvCantidad.setText(String.valueOf(item.getCantidad()));
        holder.tvNombre.setText(item.getNombre());
        holder.tvSubtotal.setText("$" + String.format(Locale.US, "%.2f", item.getSubtotal()));

        holder.btnEliminar.setOnClickListener(v -> {
            if (listener != null) {
                listener.onEliminarClick(item, position);
            }
        });
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    public void submitList(List<TicketItem> list) {
        items.clear();
        if (list != null) {
            items.addAll(list);
        }
        notifyDataSetChanged();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        final TextView tvCantidad;
        final TextView tvNombre;
        final TextView tvSubtotal;
        final TextView btnEliminar;

        ViewHolder(View itemView) {
            super(itemView);
            tvCantidad = itemView.findViewById(R.id.tvCantidad);
            tvNombre = itemView.findViewById(R.id.tvNombre);
            tvSubtotal = itemView.findViewById(R.id.tvSubtotal);
            btnEliminar = itemView.findViewById(R.id.btnEliminar);
        }
    }
}
