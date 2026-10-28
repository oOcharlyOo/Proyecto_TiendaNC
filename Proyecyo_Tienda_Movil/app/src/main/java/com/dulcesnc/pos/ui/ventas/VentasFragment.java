package com.dulcesnc.pos.ui.ventas;

import android.content.Context;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.core.view.GravityCompat;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.navigation.Navigation;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.dulcesnc.pos.R;
import com.dulcesnc.pos.data.local.entity.CategoriaEntity;
import com.dulcesnc.pos.data.local.entity.TicketEntity;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.utils.Constants;

import java.util.ArrayList;
import java.util.List;

public class VentasFragment extends Fragment {

    private VentasViewModel viewModel;

    private ProductoAdapter productoAdapter;
    private CategoriaAdapter categoriaAdapter;
    private TicketAdapter cartAdapter;
    private TicketRailAdapter ticketRailAdapter;

    private EditText etBuscar;
    private RecyclerView rvProductos;
    private RecyclerView rvCategorias;
    private RecyclerView rvCartItems;
    private RecyclerView rvTickets;
    private View btnTickets;
    private View bottomBarContainer;
    private View ticketRailContainer;
    private View cartHeader;
    private View cartDivider;
    private View cartActions;
    private TextView tvTicketInfo;
    private TextView tvTicketTotal;
    private TextView cartBadge;
    private View btnNuevoTicket;
    private View btnClear;
    private View btnMenu;
    private View cardBarcode;
    private View btnHistorial;
    private View btnEntrada;
    private View btnSalida;
    private View btnPendientes;
    private View btnCreditos;
    private View btnPromociones;
    private View btnProveedores;
    private View btnCobrarCart;
    private DrawerLayout drawerLayout;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        try {
            return inflater.inflate(R.layout.fragment_ventas, container, false);
        } catch (Exception e) {
            android.util.Log.e("VentasFragment", "Error inflating layout", e);
            return new View(requireContext());
        }
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        try {
            setupFragment(view);
        } catch (Exception e) {
            android.util.Log.e("VentasFragment", "Error in setup", e);
            Toast.makeText(requireContext(), "Error: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void setupFragment(View view) {
        viewModel = new ViewModelProvider(this).get(VentasViewModel.class);

        initViews(view);
        setupProductGrid();
        setupCategorias();
        setupSearch();
        setupCart();
        setupTicketRail();
        setupBarcode();
        setupMenu();
        setupHistorial();
        setupAcciones();
        setupDrawerNavigation(view);
        observeData();

        syncInitialData();
        triggerSync();
    }

    private void initViews(View view) {
        btnMenu = view.findViewById(R.id.btnMenu);
        etBuscar = view.findViewById(R.id.etBuscar);
        rvProductos = view.findViewById(R.id.rvProductos);
        rvCategorias = view.findViewById(R.id.rvCategorias);
        rvCartItems = view.findViewById(R.id.rvCartItems);
        rvTickets = view.findViewById(R.id.rvTickets);
        btnTickets = view.findViewById(R.id.btnTickets);
        bottomBarContainer = view.findViewById(R.id.bottomBarContainer);
        ticketRailContainer = view.findViewById(R.id.ticketRailContainer);
        cartHeader = view.findViewById(R.id.cartHeader);
        cartDivider = view.findViewById(R.id.cartDivider);
        cartActions = view.findViewById(R.id.cartActions);
        tvTicketInfo = view.findViewById(R.id.tvTicketInfo);
        tvTicketTotal = view.findViewById(R.id.tvTicketTotal);
        cartBadge = view.findViewById(R.id.cartBadge);
        cardBarcode = view.findViewById(R.id.cardBarcode);
        btnHistorial = view.findViewById(R.id.btnHistorial);
        btnNuevoTicket = view.findViewById(R.id.btnNuevoTicket);
        btnClear = view.findViewById(R.id.btnClear);
        btnEntrada = view.findViewById(R.id.btnEntrada);
        btnSalida = view.findViewById(R.id.btnSalida);
        btnPendientes = view.findViewById(R.id.btnPendientes);
        btnCreditos = view.findViewById(R.id.btnCreditos);
        btnPromociones = view.findViewById(R.id.btnPromociones);
        btnProveedores = view.findViewById(R.id.btnProveedores);
        btnCobrarCart = view.findViewById(R.id.btnCobrarCart);
        drawerLayout = view.findViewById(R.id.drawerLayout);
    }

    private void setupTicketRail() {
        ticketRailAdapter = new TicketRailAdapter();
        rvTickets.setLayoutManager(new LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false));
        rvTickets.setAdapter(ticketRailAdapter);

        ticketRailAdapter.setOnTicketSeleccionadoListener(ticket -> {
            viewModel.seleccionarTicket(ticket.getIdTicket());
        });

        if (btnNuevoTicket != null) {
            btnNuevoTicket.setOnClickListener(v -> viewModel.crearNuevoTicket());
        }
        if (btnClear != null) {
            btnClear.setOnClickListener(v -> viewModel.limpiarTicket());
        }

        if (btnTickets != null) {
            btnTickets.setOnClickListener(v -> viewModel.crearNuevoTicket());
        }

        if (bottomBarContainer != null) {
            bottomBarContainer.setOnClickListener(v -> toggleBottomBar());
        }
    }

    private boolean bottomBarExpanded = true;

    private void toggleBottomBar() {
        bottomBarExpanded = !bottomBarExpanded;
        animateBottomBar(bottomBarExpanded);
    }

    private void animateBottomBar(boolean expand) {
        final View bar = bottomBarContainer;
        if (bar == null) return;
        int collapsed = (int) (120 * requireContext().getResources().getDisplayMetrics().density);
        ViewGroup.LayoutParams base = bar.getLayoutParams();
        if (!(base instanceof LinearLayout.LayoutParams)) { base = null; }
        if (expand) {
            setBarSectionVisibility(View.VISIBLE);
            bar.setMinimumHeight((int) (220 * requireContext().getResources().getDisplayMetrics().density));
            ViewGroup.LayoutParams lp = bar.getLayoutParams();
            lp.height = ViewGroup.LayoutParams.WRAP_CONTENT;
            if (base != null) ((LinearLayout.LayoutParams) lp).weight = 1f;
            bar.setLayoutParams(lp);
            return;
        }
        setBarSectionVisibility(View.GONE);
        bar.setMinimumHeight(0);
        int startHeight = bar.getHeight();
        if (startHeight <= 0) startHeight = (int) (220 * requireContext().getResources().getDisplayMetrics().density);
        LinearLayout.LayoutParams target = base != null ? (LinearLayout.LayoutParams) base : null;
        if (target != null) target.weight = 0f;
        android.animation.ValueAnimator anim = android.animation.ValueAnimator.ofInt(startHeight, collapsed);
        anim.setDuration(250);
        anim.setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator());
        anim.addUpdateListener(valueAnimator -> {
            ViewGroup.LayoutParams lp = bar.getLayoutParams();
            lp.height = (int) valueAnimator.getAnimatedValue();
            if (target != null) target.weight = 0f;
            bar.setLayoutParams(lp);
        });
        anim.start();
    }

    private void setBarSectionVisibility(int vis) {
        if (ticketRailContainer != null) ticketRailContainer.setVisibility(vis);
        if (btnNuevoTicket != null) btnNuevoTicket.setVisibility(vis);
        if (cartDivider != null) cartDivider.setVisibility(vis);
        if (rvCartItems != null) rvCartItems.setVisibility(vis);
        if (cartActions != null) cartActions.setVisibility(vis);
    }

    private void setupAcciones() {
        if (btnEntrada != null) {
            btnEntrada.setOnClickListener(v -> {
                EntradaSalidaDialogFragment dialog = new EntradaSalidaDialogFragment();
                Bundle args = new Bundle();
                args.putString("tipo", "ENTRADA");
                dialog.setArguments(args);
                dialog.show(getParentFragmentManager(), "entrada_salida");
            });
        }
        if (btnSalida != null) {
            btnSalida.setOnClickListener(v -> {
                EntradaSalidaDialogFragment dialog = new EntradaSalidaDialogFragment();
                Bundle args = new Bundle();
                args.putString("tipo", "SALIDA");
                dialog.setArguments(args);
                dialog.show(getParentFragmentManager(), "entrada_salida");
            });
        }
        if (btnPendientes != null) {
            btnPendientes.setOnClickListener(v -> {
                VentasPendientesDialogFragment dialog = new VentasPendientesDialogFragment();
                dialog.show(getParentFragmentManager(), "pendientes");
            });
        }
        if (btnCreditos != null) {
            btnCreditos.setOnClickListener(v -> {
                CreditosDialogFragment dialog = new CreditosDialogFragment();
                dialog.show(getParentFragmentManager(), "creditos");
            });
        }
        if (btnPromociones != null) {
            btnPromociones.setOnClickListener(v -> {
                PromocionesDialogFragment dialog = new PromocionesDialogFragment();
                dialog.show(getParentFragmentManager(), "promociones");
            });
        }
        if (btnProveedores != null) {
            btnProveedores.setOnClickListener(v -> {
                ProveedoresDialogFragment dialog = new ProveedoresDialogFragment();
                dialog.show(getParentFragmentManager(), "proveedores");
            });
        }

        viewModel.getGramajePendiente().observe(getViewLifecycleOwner(), prod -> {
            if (prod != null) {
                GramajeDialogFragment dialog = new GramajeDialogFragment();
                dialog.show(getParentFragmentManager(), "gramaje");
            }
        });
    }

    private void setupProductGrid() {
        productoAdapter = new ProductoAdapter();
        rvProductos.setLayoutManager(new GridLayoutManager(requireContext(), 3));
        rvProductos.setAdapter(productoAdapter);

        productoAdapter.setOnProductoClickListener(producto -> {
            viewModel.addProducto(producto);
        });
    }

    private void setupCategorias() {
        categoriaAdapter = new CategoriaAdapter();
        rvCategorias.setLayoutManager(
                new LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false));
        rvCategorias.setAdapter(categoriaAdapter);

        categoriaAdapter.setOnCategoriaClickListener((categoria, position) -> {
            if (position == 0) {
                viewModel.setSelectedCategoria(null);
            } else {
                viewModel.setSelectedCategoria(categoria.getIdCategoria());
            }
        });
    }

    private void setupSearch() {
        etBuscar.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                viewModel.setSearchQuery(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        etBuscar.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                viewModel.setSearchQuery(etBuscar.getText().toString());
                return true;
            }
            return false;
        });
    }

    private void setupCart() {
        cartAdapter = new TicketAdapter();
        rvCartItems.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvCartItems.setAdapter(cartAdapter);

        cartAdapter.setOnTicketItemListener((item, position) -> {
            viewModel.removeFromTicket(item);
        });

        btnCobrarCart.setOnClickListener(v -> {
            try {
                CobroDialogFragment dialog = new CobroDialogFragment();
                dialog.show(getParentFragmentManager(), "cobro");
            } catch (Exception e) {
                android.util.Log.e("VentasFragment", "Error cobro", e);
            }
        });
    }

    private void setupBarcode() {
        cardBarcode.setOnClickListener(v -> {
            // TODO: Abrir escáner de código de barras
        });
    }

    private void setupMenu() {
        btnMenu.setOnClickListener(v -> {
            if (drawerLayout != null) {
                drawerLayout.openDrawer(GravityCompat.START);
            }
        });
    }

    private void setupHistorial() {
        if (btnHistorial != null) {
            btnHistorial.setOnClickListener(v -> {
                HistorialDialogFragment dialog = new HistorialDialogFragment();
                dialog.show(getParentFragmentManager(), "historial");
            });
        }
    }

    private void setupDrawerNavigation(View view) {
        int[][] drawerItems = {
            {R.id.navVentas, -1},
            {R.id.navProductos, R.id.action_ventas_to_productos},
            {R.id.navUsuarios, R.id.action_ventas_to_usuarios},
            {R.id.navCorte, R.id.action_ventas_to_corte},
            {R.id.navFinanzas, R.id.action_ventas_to_finanzas},
            {R.id.navRental, R.id.action_ventas_to_rental},
            {R.id.navInventario, R.id.action_ventas_to_inventario},
            {R.id.navApartados, R.id.action_ventas_to_apartados},
            {R.id.navHistorial, R.id.action_ventas_to_historial},
        };

        for (int[] item : drawerItems) {
            View navItem = view.findViewById(item[0]);
            int actionId = item[1];
            if (navItem != null) {
                navItem.setOnClickListener(v -> {
                    if (actionId != -1 && getActivity() != null) {
                        Navigation.findNavController(getActivity(), R.id.nav_host_fragment)
                                .navigate(actionId);
                    }
                    if (drawerLayout != null) {
                        drawerLayout.closeDrawer(GravityCompat.START);
                    }
                });
            }
        }
    }

    private void observeData() {
        viewModel.inicializarTicketsSiVacios();
        viewModel.getFilteredProducts().observe(getViewLifecycleOwner(), productos -> {
            productoAdapter.submitList(productos);
        });

        viewModel.getTicketCount().observe(getViewLifecycleOwner(), count -> {
            if (count != null && cartBadge != null) {
                cartBadge.setText(count + " art");
            }
        });

        viewModel.getTicketTotal().observe(getViewLifecycleOwner(), total -> {
            String totalStr = "$" + String.format(java.util.Locale.US, "%.2f", total);
            tvTicketTotal.setText(totalStr);
        });

        viewModel.getItemsActual().observe(getViewLifecycleOwner(), items -> {
            if (cartAdapter != null) {
                cartAdapter.submitList(items);
            }
        });

        viewModel.getTickets().observe(getViewLifecycleOwner(), lista -> {
            if (lista == null) lista = new ArrayList<>();
            if (ticketRailAdapter != null) {
                ticketRailAdapter.submitList(lista);
            }
            Long selId = viewModel.getTicketActualId().getValue();
            if (selId != null && tvTicketInfo != null) {
                for (TicketEntity t : lista) {
                    if (t.getIdTicket() == selId) {
                        tvTicketInfo.setText("#" + t.getNumeroTicket());
                        break;
                    }
                }
            }
        });

        viewModel.getTicketActualId().observe(getViewLifecycleOwner(), id -> {
            if (id != null && tvTicketInfo != null) {
                List<TicketEntity> ts = viewModel.getTickets().getValue();
                if (ts != null) {
                    for (int i = 0; i < ts.size(); i++) {
                        if (ts.get(i).getIdTicket() == id) {
                            tvTicketInfo.setText("#" + ts.get(i).getNumeroTicket());
                            break;
                        }
                    }
                }
                if (ticketRailAdapter != null) {
                    ticketRailAdapter.setSeleccionado(id);
                }
            }
        });
    }

    private void syncInitialData() {
        try {
            String sucursal = requireActivity()
                    .getSharedPreferences(Constants.PREF_NAME, Context.MODE_PRIVATE)
                    .getString(Constants.KEY_SUCURSAL, Constants.SUCURSAL_DULCERIA);
            RetrofitClient.getInstance().setSucursal(sucursal);

            com.dulcesnc.pos.data.local.DatabaseClient.getInstance(requireContext())
                    .getAppDatabase().categoriaDao().getAllActivas()
                    .observe(getViewLifecycleOwner(), categorias -> {
                        try {
                            List<CategoriaEntity> list = new ArrayList<>();
                            list.add(new CategoriaEntity(0L, "Todos", "", "A", true));
                            if (categorias != null) list.addAll(categorias);
                            categoriaAdapter.submitList(list);
                        } catch (Exception e) {
                            android.util.Log.e("VentasFragment", "Error categorias observer", e);
                        }
                    });
        } catch (Exception e) {
            android.util.Log.e("VentasFragment", "Error syncInitialData", e);
        }
    }

    private void triggerSync() {
        try {
            viewModel.syncProducts();
            android.util.Log.d("VentasFragment", "Sync triggered");
        } catch (Exception e) {
            android.util.Log.e("VentasFragment", "Error triggering sync", e);
        }
    }
}
