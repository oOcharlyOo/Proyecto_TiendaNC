package com.dulcesnc.pos.ui.usuarios;

import android.app.Dialog;
import android.os.Bundle;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.cardview.widget.CardView;
import androidx.fragment.app.DialogFragment;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.DatabaseClient;
import com.dulcesnc.pos.data.local.entity.UsuarioEntity;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.UsuarioDTO;
import com.google.android.material.textfield.TextInputEditText;

import io.reactivex.rxjava3.schedulers.Schedulers;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;

public class UsuarioDialogFragment extends DialogFragment {

    private static final String ARG_USUARIO = "usuario";
    private UsuarioEntity usuarioEdit;
    private TextInputEditText etUsuario, etNombre, etApellidoP, etApellidoM, etPassword, etTipo;
    private CardView btnGuardar, btnCancelar;

    public static UsuarioDialogFragment newInstance() { return new UsuarioDialogFragment(); }

    public static UsuarioDialogFragment newInstance(UsuarioEntity u) {
        UsuarioDialogFragment f = new UsuarioDialogFragment();
        Bundle args = new Bundle();
        args.putSerializable(ARG_USUARIO, u);
        f.setArguments(args);
        return f;
    }

    @NonNull
    @Override
    public Dialog onCreateDialog(@Nullable Bundle savedInstanceState) {
        Dialog d = super.onCreateDialog(savedInstanceState);
        d.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        return d;
    }

    @Nullable
    @Override
    public android.view.View onCreateView(@NonNull android.view.LayoutInflater inflater,
                                         @Nullable android.view.ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.dialog_usuario, container, false);
    }

    @Override
    public void onViewCreated(@NonNull android.view.View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        if (getArguments() != null) {
            usuarioEdit = (UsuarioEntity) getArguments().getSerializable(ARG_USUARIO, UsuarioEntity.class);
        }
        etUsuario = view.findViewById(R.id.etUsuario);
        etNombre = view.findViewById(R.id.etNombre);
        etApellidoP = view.findViewById(R.id.etApellidoP);
        etApellidoM = view.findViewById(R.id.etApellidoM);
        etPassword = view.findViewById(R.id.etPassword);
        etTipo = view.findViewById(R.id.etTipo);
        btnGuardar = view.findViewById(R.id.btnGuardar);
        btnCancelar = view.findViewById(R.id.btnCancelar);

        if (usuarioEdit != null) {
            android.widget.TextView tv = view.findViewById(R.id.tvDialogTitle);
            tv.setText("Editar Usuario");
            etUsuario.setText(usuarioEdit.getUsuario());
            etNombre.setText(usuarioEdit.getNombre());
            etApellidoP.setText(usuarioEdit.getApellidoP());
            etApellidoM.setText(usuarioEdit.getApellidoM());
            etTipo.setText(usuarioEdit.getIdTipoUsuario() != null ? String.valueOf(usuarioEdit.getIdTipoUsuario()) : "2");
        }

        btnGuardar.setOnClickListener(v -> guardar());
        btnCancelar.setOnClickListener(v -> dismiss());
    }

    private void guardar() {
        String usuario = etUsuario.getText() != null ? etUsuario.getText().toString().trim() : "";
        String nombre = etNombre.getText() != null ? etNombre.getText().toString().trim() : "";
        if (usuario.isEmpty() || nombre.isEmpty()) {
            Toast.makeText(requireContext(), "Usuario y nombre son obligatorios", Toast.LENGTH_SHORT).show();
            return;
        }
        String pass = etPassword.getText() != null ? etPassword.getText().toString() : "";
        final int[] tipoBox = {2};
        try {
            String t = etTipo.getText() != null ? etTipo.getText().toString().trim() : "2";
            if (!t.isEmpty()) tipoBox[0] = Integer.parseInt(t);
        } catch (NumberFormatException ignore) {}
        final int tipo = tipoBox[0];

        UsuarioDTO dto = new UsuarioDTO();
        dto.setUsuario(usuario);
        dto.setNombre(nombre);
        dto.setApellidoP(etApellidoP.getText() != null ? etApellidoP.getText().toString().trim() : "");
        dto.setApellidoM(etApellidoM.getText() != null ? etApellidoM.getText().toString().trim() : "");
        dto.setPasswordHash(pass.isEmpty() ? null : pass);
        dto.setIdTipoUsuario(tipo);

        boolean esEdicion = usuarioEdit != null;
        var api = RetrofitClient.getInstance().getApiService();
        var call = esEdicion
                ? api.actualizarUsuario(usuarioEdit.getIdUsuario(), dto)
                : api.agregarUsuario(dto);

        call.subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(resp -> {
                    UsuarioDTO r = resp != null ? resp.getDatos() : null;
                    UsuarioEntity e = new UsuarioEntity();
                    e.setIdUsuario(r != null && r.getIdUsuario() != null ? r.getIdUsuario() : (esEdicion ? usuarioEdit.getIdUsuario() : System.currentTimeMillis()));
                    e.setUsuario(usuario);
                    e.setNombre(nombre);
                    e.setApellidoP(dto.getApellidoP());
                    e.setApellidoM(dto.getApellidoM());
                    e.setIdTipoUsuario(tipo);
                    e.setSincronizado(true);
                    DatabaseClient.getInstance(requireContext()).getAppDatabase().usuarioDao().insert(e);
                    Toast.makeText(requireContext(), esEdicion ? "Usuario actualizado" : "Usuario creado", Toast.LENGTH_SHORT).show();
                    dismiss();
                }, err -> Toast.makeText(requireContext(), "Error: " + err.getMessage(), Toast.LENGTH_LONG).show());
    }
}
