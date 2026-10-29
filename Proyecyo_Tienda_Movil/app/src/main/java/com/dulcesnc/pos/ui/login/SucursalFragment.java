package com.dulcesnc.pos.ui.login;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.cardview.widget.CardView;
import androidx.fragment.app.Fragment;
import androidx.navigation.NavController;
import androidx.navigation.Navigation;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.utils.Constants;

import static android.content.Context.MODE_PRIVATE;

public class SucursalFragment extends Fragment {

    private NavController navController;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_sucursal, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        navController = Navigation.findNavController(view);

        CardView cardDulceria = view.findViewById(R.id.cardDulceria);
        CardView cardAbarrotera = view.findViewById(R.id.cardAbarrotera);

        cardDulceria.setOnClickListener(v -> selectSucursal(Constants.SUCURSAL_DULCERIA));
        cardAbarrotera.setOnClickListener(v -> selectSucursal(Constants.SUCURSAL_ABARROTERA));
    }

    private void selectSucursal(String sucursal) {
        requireActivity().getSharedPreferences(Constants.PREF_NAME, MODE_PRIVATE)
                .edit()
                .putString(Constants.KEY_SUCURSAL, sucursal)
                .apply();

        navController.navigate(R.id.action_sucursal_to_ventas);
    }
}
