package com.dulcesnc.pos.ui.ventas;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.entity.TicketEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class TicketRailAdapter extends RecyclerView.Adapter<TicketRailAdapter.ViewHolder> {

    private final List<TicketEntity> tickets = new ArrayList<>();
    private long seleccionado = -1;
    private OnTicketSeleccionadoListener listener;

    public interface OnTicketSeleccionadoListener {
        void onTicketSeleccionado(TicketEntity ticket);
    }

    public void setOnTicketSeleccionadoListener(OnTicketSeleccionadoListener l) {
        this.listener = l;
    }

    public void setSeleccionado(long id) {
        if (id == seleccionado) return;
        int prev = indexOf(seleccionado);
        seleccionado = id;
        if (prev >= 0) notifyItemChanged(prev);
        int now = indexOf(id);
        if (now >= 0) notifyItemChanged(now);
    }

    private int indexOf(long id) {
        for (int i = 0; i < tickets.size(); i++) {
            if (tickets.get(i).getIdTicket() == id) return i;
        }
        return -1;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_ticket_rail, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        TicketEntity t = tickets.get(position);
        boolean sel = t.getIdTicket() == seleccionado;
        holder.root.setBackgroundResource(sel ? R.drawable.zelda_panel_active : R.drawable.zelda_selector);
        holder.tvNumero.setTextColor(ContextCompat.getColor(holder.itemView.getContext(),
                sel ? R.color.gold_light : R.color.white));
        holder.tvNumero.setText("#" + t.getNumeroTicket());
        holder.tvTotal.setText("$" + String.format(Locale.US, "%.2f",
                t.getMontoTotal() != null ? t.getMontoTotal() : java.math.BigDecimal.ZERO));

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) listener.onTicketSeleccionado(t);
        });
    }

    @Override
    public int getItemCount() {
        return tickets.size();
    }

    public void submitList(List<TicketEntity> list) {
        tickets.clear();
        if (list != null) tickets.addAll(list);
        notifyDataSetChanged();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        final LinearLayout root;
        final TextView tvNumero;
        final TextView tvTotal;

        ViewHolder(View itemView) {
            super(itemView);
            root = (LinearLayout) itemView;
            tvNumero = itemView.findViewById(R.id.tvNumero);
            tvTotal = itemView.findViewById(R.id.tvTotal);
        }
    }
}
