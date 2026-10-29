package com.dulcesnc.pos.ui.ventas;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.DialogFragment;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;

import java.math.BigDecimal;
import java.util.Locale;

public class CobroDialogFragment extends DialogFragment {

    private VentasViewModel viewModel;

    private TextView tvTotal, tvCambio;
    private LinearLayout btnEfectivo, btnTarjeta, btnTransferencia, btnPendiente, btnCredito;
    private LinearLayout layoutExtraFields, extraEfectivo, extraPendiente, extraCredito;
    private EditText etMontoRecibido, etDescripcionPendiente, etNombreCliente;
    private Button btnCobrar, btnCancelar, btnSugerencia1, btnSugerencia2;
    private RecyclerView rvTicket;
    private TicketAdapter ticketAdapter;

    private String metodoPagoSeleccionado = "EFECTIVO";
    private BigDecimal cambio = BigDecimal.ZERO;
    private BigDecimal montoRecibido = BigDecimal.ZERO;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setStyle(DialogFragment.STYLE_NORMAL, R.style.Theme_ZeldaDialog);
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getDialog() != null && getDialog().getWindow() != null) {
            getDialog().getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            getDialog().getWindow().setLayout(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
            );
            getDialog().getWindow().setDimAmount(0.0f);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.dialog_cobro, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        viewModel = findVentasViewModel();

        tvTotal = view.findViewById(R.id.tvTotal);
        tvCambio = view.findViewById(R.id.tvCambio);
        btnEfectivo = view.findViewById(R.id.btnEfectivo);
        btnTarjeta = view.findViewById(R.id.btnTarjeta);
        btnTransferencia = view.findViewById(R.id.btnTransferencia);
        btnPendiente = view.findViewById(R.id.btnPendiente);
        btnCredito = view.findViewById(R.id.btnCredito);
        btnCobrar = view.findViewById(R.id.btnCobrar);
        btnCancelar = view.findViewById(R.id.btnCancelar);
        btnSugerencia1 = view.findViewById(R.id.btnSugerencia1);
        btnSugerencia2 = view.findViewById(R.id.btnSugerencia2);
        layoutExtraFields = view.findViewById(R.id.layoutExtraFields);
        extraEfectivo = view.findViewById(R.id.extraEfectivo);
        extraPendiente = view.findViewById(R.id.extraPendiente);
        extraCredito = view.findViewById(R.id.extraCredito);
        etMontoRecibido = view.findViewById(R.id.etMontoRecibido);
        etDescripcionPendiente = view.findViewById(R.id.etDescripcionPendiente);
        etNombreCliente = view.findViewById(R.id.etNombreCliente);
        rvTicket = view.findViewById(R.id.rvTicket);

        setupBlurBackground(view);
        setupTicketList();
        setupMetodoPago();
        setupMontoRecibidoListener();
        setupCobrar();
        setupCancelar();
        observeData();

        selectMethod(btnEfectivo, "EFECTIVO");
    }

    private void setupBlurBackground(View view) {
        try {
            ImageView ivBlur = view.findViewById(R.id.ivBlurBg);
            if (ivBlur == null) return;

            if (getActivity() == null) return;

            View decorView = getActivity().getWindow().getDecorView();
            decorView.setDrawingCacheEnabled(true);
            decorView.buildDrawingCache();
            Bitmap original = decorView.getDrawingCache();
            if (original == null) return;

            int scale = 8;
            int smallW = original.getWidth() / scale;
            int smallH = original.getHeight() / scale;

            Bitmap scaled = Bitmap.createScaledBitmap(original, smallW, smallH, true);
            decorView.setDrawingCacheEnabled(false);

            Bitmap blurred = Bitmap.createScaledBitmap(scaled, original.getWidth() / 2, original.getHeight() / 2, true);
            scaled.recycle();

            Canvas canvas = new Canvas(blurred);
            canvas.drawColor(Color.argb(80, 0, 0, 0));

            ivBlur.setImageBitmap(blurred);
        } catch (Exception e) {
            android.util.Log.e("CobroDialog", "Blur error", e);
        }
    }

    private void setupTicketList() {
        ticketAdapter = new TicketAdapter();
        rvTicket.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvTicket.setAdapter(ticketAdapter);

        ticketAdapter.setOnTicketItemListener((item, position) -> {
            viewModel.removeFromTicket(item);
        });
    }

    private void setupMetodoPago() {
        View.OnClickListener listener = v -> {
            if (v == btnEfectivo) selectMethod(btnEfectivo, "EFECTIVO");
            else if (v == btnTarjeta) selectMethod(btnTarjeta, "TARJETA");
            else if (v == btnTransferencia) selectMethod(btnTransferencia, "TRANSFERENCIA");
            else if (v == btnPendiente) selectMethod(btnPendiente, "PENDIENTE");
            else if (v == btnCredito) selectMethod(btnCredito, "CREDITO");
        };

        btnEfectivo.setOnClickListener(listener);
        btnTarjeta.setOnClickListener(listener);
        btnTransferencia.setOnClickListener(listener);
        btnPendiente.setOnClickListener(listener);
        btnCredito.setOnClickListener(listener);
    }

    private void selectMethod(LinearLayout selected, String method) {
        metodoPagoSeleccionado = method;

        resetMethodButtons();
        selected.setBackgroundResource(R.drawable.neumorph_in);

        extraEfectivo.setVisibility(View.GONE);
        extraPendiente.setVisibility(View.GONE);
        extraCredito.setVisibility(View.GONE);

        switch (method) {
            case "EFECTIVO":
                layoutExtraFields.setVisibility(View.VISIBLE);
                extraEfectivo.setVisibility(View.VISIBLE);
                setupSugerencias();
                etMontoRecibido.setText("");
                tvCambio.setText("Cambio: $0.00");
                tvCambio.setTextColor(Color.parseColor("#10B981"));
                break;
            case "PENDIENTE":
                layoutExtraFields.setVisibility(View.VISIBLE);
                extraPendiente.setVisibility(View.VISIBLE);
                break;
            case "CREDITO":
                layoutExtraFields.setVisibility(View.VISIBLE);
                extraCredito.setVisibility(View.VISIBLE);
                break;
            default:
                layoutExtraFields.setVisibility(View.GONE);
                break;
        }
    }

    private void resetMethodButtons() {
        int normal = R.drawable.neumorph_selector_button;
        btnEfectivo.setBackgroundResource(normal);
        btnTarjeta.setBackgroundResource(normal);
        btnTransferencia.setBackgroundResource(normal);
        btnPendiente.setBackgroundResource(normal);
        btnCredito.setBackgroundResource(normal);
    }

    private void setupSugerencias() {
        BigDecimal total = viewModel.getTicketTotal().getValue();
        if (total == null) total = BigDecimal.ZERO;

        double totalD = total.doubleValue();
        double sug1 = Math.ceil(totalD / 100.0) * 100.0;
        double sug2 = Math.ceil(totalD / 500.0) * 500.0;

        btnSugerencia1.setText(String.format(Locale.US, "$%.0f", sug1));
        btnSugerencia2.setText(String.format(Locale.US, "$%.0f", sug2));

        btnSugerencia1.setOnClickListener(v -> {
            etMontoRecibido.setText(String.valueOf(sug1));
        });
        btnSugerencia2.setOnClickListener(v -> {
            etMontoRecibido.setText(String.valueOf(sug2));
        });
    }

    private void setupMontoRecibidoListener() {
        etMontoRecibido.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void afterTextChanged(Editable s) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                try {
                    String text = s.toString().replace("$", "").replace(",", "");
                    montoRecibido = text.isEmpty() ? BigDecimal.ZERO : new BigDecimal(text);
                    BigDecimal total = viewModel.getTicketTotal().getValue();
                    if (total == null) total = BigDecimal.ZERO;
                    cambio = montoRecibido.subtract(total);
                    if (cambio.compareTo(BigDecimal.ZERO) < 0) {
                        tvCambio.setText("Monto insuficiente");
                        tvCambio.setTextColor(Color.RED);
                    } else {
                        tvCambio.setText("Cambio: $" + String.format(Locale.US, "%.2f", cambio));
                        tvCambio.setTextColor(Color.parseColor("#10B981"));
                    }
                } catch (NumberFormatException e) {
                    tvCambio.setText("Monto inválido");
                    tvCambio.setTextColor(Color.RED);
                }
            }
        });
    }

    private void setupCobrar() {
        final boolean[] cobroObservado = {false};
        btnCobrar.setOnClickListener(v -> {
            if ("EFECTIVO".equals(metodoPagoSeleccionado)) {
                BigDecimal total = viewModel.getTicketTotal().getValue();
                if (total == null) total = BigDecimal.ZERO;
                if (montoRecibido.compareTo(total) < 0) {
                    Toast.makeText(requireContext(),
                            "Error: El dinero recibido es menor al total",
                            Toast.LENGTH_SHORT).show();
                    return;
                }
            }

            String descripcion = null;
            String nombreCliente = null;

            if ("PENDIENTE".equals(metodoPagoSeleccionado)) {
                descripcion = etDescripcionPendiente.getText() != null ?
                        etDescripcionPendiente.getText().toString().trim() : null;
            } else if ("CREDITO".equals(metodoPagoSeleccionado)) {
                nombreCliente = etNombreCliente.getText() != null ?
                        etNombreCliente.getText().toString().trim() : null;
                if (nombreCliente == null || nombreCliente.isEmpty()) {
                    Toast.makeText(requireContext(),
                            "Ingrese el nombre del cliente para crédito",
                            Toast.LENGTH_SHORT).show();
                    return;
                }
            }

            String pseudoTxId = "TX-" + (int)(Math.random() * 90000000 + 10000000);

            if (!cobroObservado[0]) {
                cobroObservado[0] = true;
                viewModel.getVentaGuardada().observe(this, guardada -> {
                    if (guardada != null && guardada) {
                        Toast.makeText(requireContext(),
                                "Venta registrada  ID: " + pseudoTxId,
                                Toast.LENGTH_SHORT).show();
                        dismiss();
                    } else if (guardada != null) {
                        Toast.makeText(requireContext(),
                                "Error al registrar la venta",
                                Toast.LENGTH_SHORT).show();
                    }
                });
            }

            viewModel.cobrar(metodoPagoSeleccionado, descripcion, nombreCliente);
        });
    }

    private void setupCancelar() {
        btnCancelar.setOnClickListener(v -> dismiss());
    }

    private void observeData() {
        viewModel.getItemsActual().observe(this, items -> {
            if (ticketAdapter != null) {
                ticketAdapter.submitList(items);
            }
        });

        viewModel.getTicketTotal().observe(this, total -> {
            tvTotal.setText("$" + String.format(Locale.US, "%.2f", total));
        });
    }

    private VentasViewModel findVentasViewModel() {
        FragmentManager fm = getParentFragmentManager();
        if (fm != null) {
            for (Fragment f : fm.getFragments()) {
                if (f instanceof VentasFragment) {
                    return new ViewModelProvider(f).get(VentasViewModel.class);
                }
            }
        }
        return new ViewModelProvider(requireActivity()).get(VentasViewModel.class);
    }
}
