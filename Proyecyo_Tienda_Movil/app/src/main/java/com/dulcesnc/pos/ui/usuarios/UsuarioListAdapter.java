package com.dulcesnc.pos.ui.usuarios;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.entity.UsuarioEntity;

import java.util.ArrayList;
import java.util.List;

public class UsuarioListAdapter extends RecyclerView.Adapter<UsuarioListAdapter.ViewHolder> {

    private final List<UsuarioEntity> usuarios = new ArrayList<>();
    private OnUsuarioActionListener listener;

    public interface OnUsuarioActionListener {
        void onEditarClick(UsuarioEntity usuario);
        void onEliminarClick(UsuarioEntity usuario);
    }

    public void setOnUsuarioActionListener(OnUsuarioActionListener l) { this.listener = l; }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_usuario, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        UsuarioEntity u = usuarios.get(position);
        holder.tvNombre.setText(u.getNombre() + " " + (u.getApellidoP() != null ? u.getApellidoP() : ""));
        holder.tvUsuario.setText("@" + u.getUsuario());
        holder.tvTipo.setText(u.getIdTipoUsuario() != null && u.getIdTipoUsuario() == 1 ? "Admin" : "Usuario");
        holder.itemView.setOnClickListener(v -> { if (listener != null) listener.onEditarClick(u); });
        holder.itemView.setOnLongClickListener(v -> { if (listener != null) listener.onEliminarClick(u); return true; });
    }

    @Override
    public int getItemCount() {
        return usuarios.size();
    }

    public void submitList(List<UsuarioEntity> list) {
        usuarios.clear();
        if (list != null) usuarios.addAll(list);
        notifyDataSetChanged();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        final TextView tvNombre, tvUsuario, tvTipo;

        ViewHolder(View itemView) {
            super(itemView);
            tvNombre = itemView.findViewById(R.id.tvNombre);
            tvUsuario = itemView.findViewById(R.id.tvUsuario);
            tvTipo = itemView.findViewById(R.id.tvTipo);
        }
    }
}
