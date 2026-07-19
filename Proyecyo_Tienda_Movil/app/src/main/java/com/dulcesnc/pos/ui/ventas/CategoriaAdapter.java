package com.dulcesnc.pos.ui.ventas;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.cardview.widget.CardView;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.entity.CategoriaEntity;

import java.util.ArrayList;
import java.util.List;

public class CategoriaAdapter extends RecyclerView.Adapter<CategoriaAdapter.ViewHolder> {

    private final List<CategoriaEntity> categorias = new ArrayList<>();
    private int selectedPosition = -1;
    private OnCategoriaClickListener listener;

    public interface OnCategoriaClickListener {
        void onCategoriaClick(CategoriaEntity categoria, int position);
    }

    public void setOnCategoriaClickListener(OnCategoriaClickListener listener) {
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_categoria_chip, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        CategoriaEntity categoria = categorias.get(position);
        holder.tvNombre.setText(categoria.getNombre());

        boolean isSelected = position == selectedPosition;
        int bgRes = isSelected ? R.drawable.neumorph_in : R.drawable.neumorph_out;
        holder.cardView.setBackgroundResource(bgRes);
        holder.tvNombre.setTextColor(ContextCompat.getColor(holder.itemView.getContext(),
                isSelected ? R.color.primary : R.color.text_primary));

        holder.itemView.setOnClickListener(v -> {
            int previous = selectedPosition;
            selectedPosition = position;
            notifyItemChanged(previous);
            notifyItemChanged(position);
            if (listener != null) {
                listener.onCategoriaClick(categoria, position);
            }
        });
    }

    @Override
    public int getItemCount() {
        return categorias.size();
    }

    public void submitList(List<CategoriaEntity> list) {
        categorias.clear();
        if (list != null) {
            categorias.addAll(list);
        }
        notifyDataSetChanged();
    }

    public void clearSelection() {
        int previous = selectedPosition;
        selectedPosition = -1;
        notifyItemChanged(previous);
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        final CardView cardView;
        final TextView tvNombre;

        ViewHolder(View itemView) {
            super(itemView);
            cardView = (CardView) itemView;
            tvNombre = itemView.findViewById(R.id.tvNombre);
        }
    }
}
