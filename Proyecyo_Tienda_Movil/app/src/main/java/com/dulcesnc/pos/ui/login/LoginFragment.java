package com.dulcesnc.pos.ui.login;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.navigation.NavController;
import androidx.navigation.Navigation;

import com.dulcesnc.pos.R;
import com.google.android.material.textfield.TextInputEditText;

public class LoginFragment extends Fragment {

    private LoginViewModel viewModel;
    private NavController navController;

    private TextInputEditText etUsuario;
    private TextInputEditText etPassword;
    private Button btnLogin;
    private TextView tvError;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_login, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        viewModel = new ViewModelProvider(this).get(LoginViewModel.class);
        navController = Navigation.findNavController(view);

        etUsuario = view.findViewById(R.id.etUsuario);
        etPassword = view.findViewById(R.id.etPassword);
        btnLogin = view.findViewById(R.id.btnLogin);
        tvError = view.findViewById(R.id.tvError);

        setupListeners();
        setupObservers();
    }

    private void setupListeners() {
        etUsuario.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                viewModel.setUsuario(s.toString());
                viewModel.clearError();
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        etPassword.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                viewModel.setPassword(s.toString());
                viewModel.clearError();
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnLogin.setOnClickListener(v -> viewModel.login());
    }

    private void setupObservers() {
        viewModel.getError().observe(getViewLifecycleOwner(), error -> {
            if (error != null) {
                tvError.setText(error);
                tvError.setVisibility(View.VISIBLE);
            } else {
                tvError.setVisibility(View.GONE);
            }
        });

        viewModel.getIsLoading().observe(getViewLifecycleOwner(), loading -> {
            btnLogin.setEnabled(!loading);
            btnLogin.setText(loading ? "Entrando..." : getString(R.string.login_button));
        });

        viewModel.getLoginSuccess().observe(getViewLifecycleOwner(), success -> {
            if (success) {
                navController.navigate(R.id.action_login_to_sucursal);
            }
        });
    }
}
