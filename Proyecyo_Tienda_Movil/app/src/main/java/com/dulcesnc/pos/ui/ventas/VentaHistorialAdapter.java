package com.dulcesnc.pos.ui.ventas;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.entity.VentaEntity;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class VentaHistorialAdapter extends RecyclerView.Adapter<VentaHistorialAdapter.VentaViewHolder> {

    private List<VentaEntity> ventas = new ArrayList<>();
    private OnCancelarVentaListener cancelarListener;

    public interface OnCancelarVentaListener {
        void onCancelar(VentaEntity venta);
    }

    public void setOnCancelarVentaListener(OnCancelarVentaListener listener) {
        this.cancelarListener = listener;
    }

    @NonNull
    @Override
    public VentaViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_venta_historial, parent, false);
        return new VentaViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull VentaViewHolder holder, int position) {
        holder.bind(ventas.get(position), cancelarListener);
    }

    @Override
    public int getItemCount() {
        return ventas.size();
    }

    public void submitList(List<VentaEntity> list) {
        this.ventas = list != null ? list : new ArrayList<>();
        notifyDataSetChanged();
    }

    static class VentaViewHolder extends RecyclerView.ViewHolder {
        private final TextView tvFecha, tvMetodo, tvEstado, tvTotal, tvSync;
        private final Button btnCancelar;

        VentaViewHolder(@NonNull View itemView) {
            super(itemView);
            tvFecha = itemView.findViewById(R.id.tvFecha);
            tvMetodo = itemView.findViewById(R.id.tvMetodo);
            tvEstado = itemView.findViewById(R.id.tvEstado);
            tvTotal = itemView.findViewById(R.id.tvTotal);
            tvSync = itemView.findViewById(R.id.tvSync);
            btnCancelar = itemView.findViewById(R.id.btnCancelar);
        }

        void bind(VentaEntity venta, OnCancelarVentaListener listener) {
            String fecha = venta.getFechaVenta();
            if (fecha != null && fecha.contains("T")) {
                try {
                    SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
                    Date d = iso.parse(fecha);
                    SimpleDateFormat out = new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.US);
                    fecha = out.format(d);
                } catch (Exception ignored) {}
            }
            tvFecha.setText(fecha != null ? fecha : "");

            String metodo = venta.getMetodoPago() != null ? venta.getMetodoPago() : "";
            tvMetodo.setText(metodo);

            boolean cancelada = "X".equals(venta.getEstatus());
            boolean cobrada = "C".equals(venta.getEstatus());

            if (cancelada) {
                tvEstado.setText("Cancelada");
                tvEstado.setBackgroundResource(R.drawable.zelda_chip);
                tvEstado.setTextColor(itemView.getContext().getResources().getColor(R.color.gold_light));
            } else if (cobrada) {
                tvEstado.setText("Cobrada");
                tvEstado.setBackgroundResource(R.drawable.zelda_chip);
                tvEstado.setTextColor(itemView.getContext().getResources().getColor(R.color.gold_light));
            } else {
                tvEstado.setText("Pendiente");
                tvEstado.setBackgroundResource(R.drawable.zelda_chip);
                tvEstado.setTextColor(itemView.getContext().getResources().getColor(R.color.gold_light));
            }

            BigDecimal total = venta.getMontoTotal() != null ? venta.getMontoTotal() : BigDecimal.ZERO;
            tvTotal.setText("$" + String.format(Locale.US, "%.2f", total));

            if (cancelada) {
                tvSync.setText("✕ Cancelada");
                tvSync.setTextColor(itemView.getContext().getResources().getColor(R.color.danger));
            } else if (venta.isSincronizado()) {
                tvSync.setText("✓ Sincronizada");
                tvSync.setTextColor(itemView.getContext().getResources().getColor(R.color.success));
            } else {
                tvSync.setText("⏳ Pendiente de sincronizar");
                tvSync.setTextColor(itemView.getContext().getResources().getColor(R.color.warning));
            }

            if (cobrada && listener != null) {
                btnCancelar.setVisibility(View.VISIBLE);
                btnCancelar.setOnClickListener(v -> listener.onCancelar(venta));
            } else {
                btnCancelar.setVisibility(View.GONE);
            }
        }
    }
}
