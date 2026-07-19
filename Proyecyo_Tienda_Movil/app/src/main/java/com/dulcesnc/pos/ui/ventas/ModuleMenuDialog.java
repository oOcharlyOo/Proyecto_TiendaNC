package com.dulcesnc.pos.ui.ventas;

import android.app.Dialog;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.cardview.widget.CardView;
import androidx.fragment.app.DialogFragment;
import androidx.navigation.Navigation;

import com.dulcesnc.pos.R;

public class ModuleMenuDialog extends DialogFragment {

    @NonNull
    @Override
    public Dialog onCreateDialog(@Nullable Bundle savedInstanceState) {
        Dialog dialog = super.onCreateDialog(savedInstanceState);
        dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        return dialog;
    }

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.dialog_module_menu, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        setupModuleCard(view, R.id.cardVentas, R.id.action_ventas_to_productos);
        setupModuleCard(view, R.id.cardUsuarios, R.id.action_ventas_to_usuarios);
        setupModuleCard(view, R.id.cardCorte, R.id.action_ventas_to_corte);
        setupModuleCard(view, R.id.cardFinanzas, R.id.action_ventas_to_finanzas);
        setupModuleCard(view, R.id.cardRental, R.id.action_ventas_to_rental);
        setupModuleCard(view, R.id.cardInventario, R.id.action_ventas_to_inventario);
    }

    private void setupModuleCard(View parent, int cardId, int actionId) {
        CardView card = parent.findViewById(cardId);
        card.setOnClickListener(v -> {
            if (getActivity() != null) {
                Navigation.findNavController(getActivity(), R.id.nav_host_fragment)
                        .navigate(actionId);
            }
            dismiss();
        });
    }
}
