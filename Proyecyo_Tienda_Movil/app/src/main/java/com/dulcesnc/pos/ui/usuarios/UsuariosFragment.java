package com.dulcesnc.pos.ui.usuarios;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.DatabaseClient;
import com.dulcesnc.pos.data.local.entity.UsuarioEntity;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.UsuarioDTO;

import java.util.ArrayList;
import java.util.List;

import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;
import io.reactivex.rxjava3.schedulers.Schedulers;

public class UsuariosFragment extends Fragment {

    private RecyclerView rvUsuarios;
    private UsuarioListAdapter adapter;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_usuarios, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        rvUsuarios = view.findViewById(R.id.rvUsuarios);
        View btnAgregar = view.findViewById(R.id.btnAgregar);

        adapter = new UsuarioListAdapter();
        rvUsuarios.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvUsuarios.setAdapter(adapter);

        adapter.setOnUsuarioActionListener(new UsuarioListAdapter.OnUsuarioActionListener() {
            @Override
            public void onEditarClick(UsuarioEntity usuario) {
                UsuarioDialogFragment d = UsuarioDialogFragment.newInstance(usuario);
                d.show(getParentFragmentManager(), "usuario_dialog");
            }

            @Override
            public void onEliminarClick(UsuarioEntity usuario) {
                if (usuario.getIdUsuario() == null) return;
                new androidx.appcompat.app.AlertDialog.Builder(requireContext())
                        .setTitle("Eliminar usuario")
                        .setMessage("¿Eliminar " + usuario.getNombre() + "?")
                        .setPositiveButton("Eliminar", (d, w) -> eliminar(usuario))
                        .setNegativeButton("Cancelar", null)
                        .show();
            }
        });

        if (btnAgregar != null) {
            btnAgregar.setOnClickListener(v -> {
                UsuarioDialogFragment d = UsuarioDialogFragment.newInstance();
                d.show(getParentFragmentManager(), "usuario_dialog");
            });
        }

        loadUsers();
        cargarServidor();
    }

    @Override
    public void onResume() {
        super.onResume();
        loadUsers();
    }

    private void loadUsers() {
        DatabaseClient.getInstance(requireContext())
                .getAppDatabase().usuarioDao().getAll()
                .observe(getViewLifecycleOwner(), users -> adapter.submitList(users));
    }

    private void cargarServidor() {
        RetrofitClient.getInstance().getApiService()
                .listarUsuarios()
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(resp -> {
                    if (resp != null && resp.getDatos() != null) {
                        List<UsuarioEntity> lista = new ArrayList<>();
                        for (UsuarioDTO d : resp.getDatos()) {
                            UsuarioEntity e = new UsuarioEntity();
                            e.setIdUsuario(d.getIdUsuario());
                            e.setUsuario(d.getUsuario());
                            e.setNombre(d.getNombre());
                            e.setApellidoP(d.getApellidoP());
                            e.setApellidoM(d.getApellidoM());
                            e.setIdTipoUsuario(d.getIdTipoUsuario());
                            e.setSincronizado(true);
                            lista.add(e);
                        }
                        DatabaseClient.getInstance(requireContext())
                                .getAppDatabase().usuarioDao().insertAll(lista);
                    }
                }, err -> Toast.makeText(requireContext(),
                        "Error cargar usuarios: " + err.getMessage(), Toast.LENGTH_SHORT).show());
    }

    private void eliminar(UsuarioEntity usuario) {
        RetrofitClient.getInstance().getApiService()
                .eliminarUsuario(usuario.getIdUsuario())
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(r -> {
                    DatabaseClient.getInstance(requireContext())
                            .getAppDatabase().usuarioDao().delete(usuario.getIdUsuario());
                    Toast.makeText(requireContext(), "Usuario eliminado", Toast.LENGTH_SHORT).show();
                }, err -> Toast.makeText(requireContext(),
                        "Error: " + err.getMessage(), Toast.LENGTH_LONG).show());
    }
}
