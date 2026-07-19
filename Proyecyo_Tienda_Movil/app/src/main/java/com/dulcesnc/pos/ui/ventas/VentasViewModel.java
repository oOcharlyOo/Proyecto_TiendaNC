package com.dulcesnc.pos.ui.ventas;

import android.app.Application;
import android.os.Handler;
import android.os.Looper;

import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.Transformations;

import com.dulcesnc.pos.data.local.DatabaseClient;
import com.dulcesnc.pos.data.local.dao.TicketDao;
import com.dulcesnc.pos.data.local.dao.TicketItemDao;
import com.dulcesnc.pos.data.local.entity.CategoriaEntity;
import com.dulcesnc.pos.data.local.entity.ProductoEntity;
import com.dulcesnc.pos.data.local.entity.TicketEntity;
import com.dulcesnc.pos.data.local.entity.TicketItemEntity;
import com.dulcesnc.pos.data.remote.ApiService;
import com.dulcesnc.pos.data.remote.dto.ApiResponse;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.ProductoDTO;
import com.dulcesnc.pos.data.remote.dto.VentaRequestDTO;
import com.dulcesnc.pos.data.repository.ProductoRepository;
import com.dulcesnc.pos.utils.SessionManager;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class VentasViewModel extends AndroidViewModel {

    public static final String ESTADO_ACTIVO = "ACTIVO";
    public static final String ESTADO_PENDIENTE = "PENDIENTE";
    public static final String ESTADO_COMPLETADO = "COMPLETADO";

    private final ProductoRepository productoRepository;
    private final TicketDao ticketDao;
    private final TicketItemDao ticketItemDao;
    private final SessionManager session;
    private final ExecutorService dbExecutor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private final MutableLiveData<List<TicketEntity>> tickets = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<Long> ticketActualId = new MutableLiveData<>(null);
    private final MutableLiveData<List<TicketItem>> itemsActual = new MutableLiveData<>(new ArrayList<>());
    private final MutableLiveData<BigDecimal> ticketTotal = new MutableLiveData<>(BigDecimal.ZERO);
    private final MutableLiveData<Integer> ticketCount = new MutableLiveData<>(0);
    private final MutableLiveData<Boolean> ventaGuardada = new MutableLiveData<>(false);
    private final MutableLiveData<String> searchQuery = new MutableLiveData<>("");
    private final MutableLiveData<Long> selectedCategoriaId = new MutableLiveData<>(null);
    private final MutableLiveData<ProductoEntity> gramajePendiente = new MutableLiveData<>(null);

    private LiveData<List<ProductoEntity>> filteredProducts;
    private LiveData<List<CategoriaEntity>> categorias;

    public VentasViewModel(Application application) {
        super(application);
        productoRepository = new ProductoRepository(application);
        ticketDao = DatabaseClient.getInstance(application).getAppDatabase().ticketDao();
        ticketItemDao = DatabaseClient.getInstance(application).getAppDatabase().ticketItemDao();
        session = SessionManager.getInstance(application);

        LiveData<List<ProductoEntity>> base = Transformations.switchMap(searchQuery, query -> {
            if (query != null && !query.trim().isEmpty()) {
                return productoRepository.searchByName(query.trim());
            }
            return Transformations.switchMap(selectedCategoriaId, catId -> {
                if (catId != null) {
                    return productoRepository.getByCategoria(catId);
                }
                return productoRepository.getAllActivos();
            });
        });

        filteredProducts = Transformations.map(base, productos -> {
            if (productos == null) return null;
            List<ProductoEntity> result = new ArrayList<>();
            for (ProductoEntity p : productos) {
                Integer stock = p.getStock();
                if (stock != null && stock > 0) {
                    result.add(p);
                }
            }
            return result;
        });

        categorias = new MutableLiveData<>();
    }

    public void loadCategorias(List<CategoriaEntity> cats) {
        ((MutableLiveData<List<CategoriaEntity>>) categorias).setValue(cats);
    }

    public LiveData<List<ProductoEntity>> getFilteredProducts() { return filteredProducts; }
    public LiveData<List<CategoriaEntity>> getCategorias() { return categorias; }
    public LiveData<List<TicketEntity>> getTickets() { return tickets; }
    public LiveData<Long> getTicketActualId() { return ticketActualId; }
    public LiveData<List<TicketItem>> getItemsActual() { return itemsActual; }
    public LiveData<BigDecimal> getTicketTotal() { return ticketTotal; }
    public LiveData<Integer> getTicketCount() { return ticketCount; }
    public LiveData<Boolean> getVentaGuardada() { return ventaGuardada; }
    public LiveData<ProductoEntity> getGramajePendiente() { return gramajePendiente; }

    public void setSearchQuery(String query) { searchQuery.setValue(query); }
    public void setSelectedCategoria(Long categoriaId) { selectedCategoriaId.setValue(categoriaId); }

    public void cargarTicketsDesdeBackend() {
        dbExecutor.execute(() -> {
            final List<TicketEntity> locales = ticketDao.getAllSync();
            final List<TicketEntity> resultado = locales != null ? locales : new ArrayList<>();
            mainHandler.post(() -> tickets.setValue(resultado));
        });
    }

    private volatile boolean creandoTicket = false;

    public void inicializarTicketsSiVacios() {
        dbExecutor.execute(() -> {
            List<TicketEntity> existentes = obtenerTicketsSync();
            if (existentes != null && !existentes.isEmpty()) {
                long id = existentes.get(0).getIdTicket();
                mainHandler.post(() -> {
                    ticketActualId.setValue(id);
                    seleccionarTicket(id);
                    recargarTickets();
                });
                return;
            }
            crearNuevoTicket();
        });
    }

    public void crearNuevoTicket() {
        if (creandoTicket) return;
        creandoTicket = true;
        dbExecutor.execute(() -> {
            List<TicketEntity> existentes = obtenerTicketsSync();
            if (existentes != null && !existentes.isEmpty()) {
                long id = existentes.get(0).getIdTicket();
                mainHandler.post(() -> {
                    ticketActualId.setValue(id);
                    seleccionarTicket(id);
                    recargarTickets();
                    creandoTicket = false;
                });
                return;
            }
            int numeroWeb = obtenerSiguienteNumeroTicketServidor();
            TicketEntity t = new TicketEntity(
                    null,
                    numeroWeb,
                    ESTADO_ACTIVO,
                    new Date().getTime(),
                    "",
                    session.getUserId(),
                    false,
                    session.getUserName()
            );
            long id = ticketDao.insert(t);
            TicketEntity creado = ticketDao.getByIdSync(id);
            // crear en backend para obtener idVenta servidor
            Long idServidor = crearVentaEnServidor(creado);
            if (idServidor != null) {
                creado.setIdVentaServidor(idServidor);
                creado.setDesdeBackend(true);
                ticketDao.update(creado);
            }
            mainHandler.post(() -> {
                ticketActualId.setValue(id);
                seleccionarTicket(id);
                recargarTickets();
                creandoTicket = false;
            });
        });
    }

    private int obtenerSiguienteNumeroTicketServidor() {
        try {
            ApiService api = RetrofitClient.getInstance().getApiService();
            ApiResponse<Integer> resp = api.siguienteNumeroTicket().blockingGet();
            if (resp != null && resp.getCodigo() == 200 && resp.getDatos() != null) {
                return resp.getDatos();
            }
        } catch (Exception e) {
            android.util.Log.e("VentasVM", "Error siguiente numero ticket", e);
        }
        return 1;
    }

    private Long crearVentaEnServidor(TicketEntity t) {
        try {
            ApiService api = RetrofitClient.getInstance().getApiService();
            VentaRequestDTO req = new VentaRequestDTO();
            req.setIdUsuario(session.getUserId());
            req.setMontoTotal(BigDecimal.ZERO);
            req.setEstatus("P");
            req.setMetodoPago("EFECTIVO");
            req.setNumeroTicket(t.getNumeroTicket());
            ApiResponse<VentaRequestDTO> resp = api.agregarVenta(req).blockingGet();
            if (resp != null && resp.getCodigo() == 200 && resp.getDatos() != null) {
                return resp.getDatos().getIdVenta();
            }
        } catch (Exception e) {
            android.util.Log.e("VentasVM", "Error crear venta servidor", e);
        }
        return null;
    }

    public void seleccionarTicket(long id) {
        ticketActualId.setValue(id);
        dbExecutor.execute(() -> {
            List<TicketItemEntity> ents = ticketItemDao.getByTicketSync(id);
            List<TicketItem> items = new ArrayList<>();
            if (ents != null) {
                for (TicketItemEntity e : ents) {
                    items.add(mapearAItem(e));
                }
            }
            mainHandler.post(() -> {
                itemsActual.setValue(items);
                recalcular(items);
            });
        });
    }

    public void eliminarTicket(long id) {
        dbExecutor.execute(() -> {
            ticketDao.deleteById(id);
            ticketItemDao.deleteByTicket(id);
            List<TicketEntity> restantes = obtenerTicketsSync();
            mainHandler.post(() -> {
                tickets.setValue(restantes);
                if (!restantes.isEmpty()) {
                    seleccionarTicket(restantes.get(0).getIdTicket());
                } else {
                    crearNuevoTicket();
                }
            });
        });
    }

    public void addProducto(ProductoEntity producto) {
        if (producto.getIsGramaje() != null && producto.getIsGramaje()) {
            gramajePendiente.postValue(producto);
            return;
        }
        long tid = ticketActualId.getValue() == null ? -1 : ticketActualId.getValue();
        if (tid < 0) { crearNuevoTicket(); return; }
        final long ticketId = tid;
        dbExecutor.execute(() -> {
            List<TicketItemEntity> existentes = ticketItemDao.getByTicketSync(ticketId);
            TicketItemEntity encontrado = null;
            for (TicketItemEntity e : existentes) {
                if (e.getIdProducto() != null && e.getIdProducto().equals(producto.getIdProducto())
                        && !e.isGramaje()) {
                    encontrado = e;
                    break;
                }
            }
            BigDecimal precio = producto.getPrecioMayoreo() != null
                    ? producto.getPrecioMayoreo() : producto.getPrecioVenta();
            if (precio == null) precio = BigDecimal.ZERO;
            if (encontrado == null) {
                TicketItemEntity ne = new TicketItemEntity(
                        ticketId,
                        producto.getIdProducto(),
                        producto.getNombre(),
                        1,
                        precio,
                        producto.getPrecioMayoreo() != null ? "MAYOREO" : "NORMAL",
                        false,
                        producto.getPrecioEnvase() != null ? producto.getPrecioEnvase() : BigDecimal.ZERO,
                        producto.getRequiereEnvase() != null && producto.getRequiereEnvase()
                                && producto.getPrecioEnvase() != null,
                        1,
                        null,
                        null
                );
                ticketItemDao.insert(ne);
            } else {
                encontrado.setCantidad(encontrado.getCantidad() + 1);
                ticketItemDao.update(encontrado);
            }
            recargarItemsYTotal(ticketId);
        });
    }

    public void addGramaje(long idProducto, String nombre, int gramos, BigDecimal precioTotal) {
        long tid = ticketActualId.getValue() == null ? -1 : ticketActualId.getValue();
        if (tid < 0) { crearNuevoTicket(); return; }
        final long ticketId = tid;
        gramajePendiente.postValue(null);
        dbExecutor.execute(() -> {
            TicketItemEntity e = new TicketItemEntity(
                    ticketId, idProducto, nombre, gramos, precioTotal,
                    "VENTA_GRAMAJE", true, BigDecimal.ZERO, false, gramos, null, null);
            ticketItemDao.insert(e);
            recargarItemsYTotal(ticketId);
        });
    }

    public void addPromocion(long idPromocion, String nombre, BigDecimal precioPromocion) {
        long tid = ticketActualId.getValue() == null ? -1 : ticketActualId.getValue();
        if (tid < 0) return;
        final long ticketId = tid;
        dbExecutor.execute(() -> {
            TicketItemEntity e = new TicketItemEntity(
                    ticketId, null, nombre, 1, precioPromocion, "PROMOCION",
                    false, BigDecimal.ZERO, false, 0, null, idPromocion);
            ticketItemDao.insert(e);
            recargarItemsYTotal(ticketId);
        });
    }

    public void aumentarCantidad(TicketItem item) {
        cambiarCantidad(item, item.getCantidad() + 1);
    }

    public void disminuirCantidad(TicketItem item) {
        if (item.getCantidad() <= 1) {
            quitarItem(item);
        } else {
            cambiarCantidad(item, item.getCantidad() - 1);
        }
    }

    public void cambiarCantidad(TicketItem item, int nuevaCantidad) {
        long tid = ticketActualId.getValue() == null ? -1 : ticketActualId.getValue();
        if (tid < 0) return;
        final long ticketId = tid;
        dbExecutor.execute(() -> {
            List<TicketItemEntity> ents = ticketItemDao.getByTicketSync(ticketId);
            for (TicketItemEntity e : ents) {
                if (mismaLinea(e, item)) {
                    if (nuevaCantidad <= 0) {
                        ticketItemDao.deleteById(e.getIdItem());
                    } else {
                        e.setCantidad(nuevaCantidad);
                        if (e.isCobroEnvase() && e.getCantidadEnvase() <= 0) {
                            e.setCantidadEnvase(nuevaCantidad);
                        }
                        ticketItemDao.update(e);
                    }
                    break;
                }
            }
            recargarItemsYTotal(ticketId);
        });
    }

    public void quitarItem(TicketItem item) {
        long tid = ticketActualId.getValue() == null ? -1 : ticketActualId.getValue();
        if (tid < 0) return;
        final long ticketId = tid;
        dbExecutor.execute(() -> {
            List<TicketItemEntity> ents = ticketItemDao.getByTicketSync(ticketId);
            for (TicketItemEntity e : ents) {
                if (mismaLinea(e, item)) {
                    ticketItemDao.deleteById(e.getIdItem());
                    break;
                }
            }
            recargarItemsYTotal(ticketId);
        });
    }

    public void removeFromTicket(TicketItem item) {
        quitarItem(item);
    }

    public void toggleMayoreo(TicketItem item, BigDecimal precioNormal, BigDecimal precioMayoreo) {
        long tid = ticketActualId.getValue() == null ? -1 : ticketActualId.getValue();
        if (tid < 0 || precioMayoreo == null || precioMayoreo.compareTo(BigDecimal.ZERO) <= 0) return;
        final long ticketId = tid;
        dbExecutor.execute(() -> {
            List<TicketItemEntity> ents = ticketItemDao.getByTicketSync(ticketId);
            for (TicketItemEntity e : ents) {
                if (mismaLinea(e, item)) {
                    boolean esMayoreo = "MAYOREO".equals(e.getTipoPrecio());
                    e.setTipoPrecio(esMayoreo ? "NORMAL" : "MAYOREO");
                    e.setPrecioUnitario(esMayoreo ? precioNormal : precioMayoreo);
                    ticketItemDao.update(e);
                    break;
                }
            }
            recargarItemsYTotal(ticketId);
        });
    }

    public void toggleEnvase(TicketItem item) {
        long tid = ticketActualId.getValue() == null ? -1 : ticketActualId.getValue();
        if (tid < 0) return;
        final long ticketId = tid;
        dbExecutor.execute(() -> {
            List<TicketItemEntity> ents = ticketItemDao.getByTicketSync(ticketId);
            for (TicketItemEntity e : ents) {
                if (mismaLinea(e, item)) {
                    e.setCobroEnvase(!e.isCobroEnvase());
                    if (e.isCobroEnvase() && e.getCantidadEnvase() <= 0) {
                        e.setCantidadEnvase(e.getCantidad());
                    }
                    ticketItemDao.update(e);
                    break;
                }
            }
            recargarItemsYTotal(ticketId);
        });
    }

    public void limpiarTicket() {
        long tid = ticketActualId.getValue() == null ? -1 : ticketActualId.getValue();
        if (tid < 0) return;
        final long ticketId = tid;
        dbExecutor.execute(() -> {
            ticketItemDao.deleteByTicket(ticketId);
            recargarItemsYTotal(ticketId);
        });
    }

    public void syncProducts() {
        productoRepository.syncFromServer().subscribe();
    }

    public void cobrar(String metodoPago, String descripcionPendiente, String nombreCliente) {
        long tid = ticketActualId.getValue() == null ? -1 : ticketActualId.getValue();
        if (tid < 0) return;
        final long ticketId = tid;
        dbExecutor.execute(() -> {
            TicketEntity ticket = ticketDao.getByIdSync(ticketId);
            List<TicketItemEntity> ents = ticketItemDao.getByTicketSync(ticketId);
            if (ticket == null || ents == null || ents.isEmpty()) {
                mainHandler.post(() -> ventaGuardada.postValue(false));
                return;
            }
            BigDecimal total = BigDecimal.ZERO;
            for (TicketItemEntity e : ents) {
                if (e.isGramaje()) {
                    total = total.add(e.getPrecioUnitario());
                } else {
                    total = total.add(e.getPrecioUnitario().multiply(BigDecimal.valueOf(e.getCantidad())));
                }
                if (e.isCobroEnvase() && e.getPrecioEnvase() != null) {
                    int ce = e.getCantidadEnvase() > 0 ? e.getCantidadEnvase() : e.getCantidad();
                    total = total.add(e.getPrecioEnvase().multiply(BigDecimal.valueOf(ce)));
                }
            }
            String estatus = "PENDIENTE".equals(metodoPago) ? "P" : "C";
            ticket.setMontoTotal(total);
            ticket.setMetodoPago(metodoPago);
            ticket.setDescripcionPendiente(descripcionPendiente);
            ticket.setNombreCliente(nombreCliente);
            if ("PENDIENTE".equals(metodoPago)) {
                ticket.setEstado(ESTADO_PENDIENTE);
            } else {
                ticket.setEstado(ESTADO_COMPLETADO);
            }
            ticketDao.update(ticket);
            mainHandler.post(() -> {
                ventaGuardada.postValue(true);
                recargarItemsYTotal(ticketId);
                recargarTickets();
            });
        });
    }

    public void cancelarVenta(long idVenta) {
        dbExecutor.execute(() -> {
            try {
                TicketEntity ticket = ticketDao.getByVentaServidorSync(idVenta);
                if (ticket != null) {
                    ticketDao.deleteById(ticket.getIdTicket());
                    ticketItemDao.deleteByTicket(ticket.getIdTicket());
                }
                com.dulcesnc.pos.data.local.AppDatabase db =
                        DatabaseClient.getInstance(getApplication()).getAppDatabase();
                com.dulcesnc.pos.data.local.entity.VentaEntity venta = db.ventaDao().getByIdSync(idVenta);
                if (venta != null) {
                    List<com.dulcesnc.pos.data.local.entity.VentaDetalleEntity> detalles =
                            db.ventaDetalleDao().getByVentaIdSync(idVenta);
                    if (detalles != null) {
                        for (com.dulcesnc.pos.data.local.entity.VentaDetalleEntity det : detalles) {
                            com.dulcesnc.pos.data.local.entity.ProductoEntity p =
                                    db.productoDao().getByIdSync(det.getIdProducto());
                            if (p != null) {
                                Integer stock = p.getStock();
                                int ns = (stock == null ? 0 : stock) + det.getCantidad();
                                p.setStock(ns);
                                db.productoDao().update(p);
                            }
                        }
                    }
                    venta.setEstatus("X");
                    venta.setSincronizado(false);
                    db.ventaDao().update(venta);
                }
            } catch (Exception e) {
                android.util.Log.e("VentasVM", "Error cancelar", e);
            }
        });
    }

    private boolean mismaLinea(TicketItemEntity e, TicketItem item) {
        if (e.isGramaje() || item.isGramaje()) {
            return e.getIdItem() == item.getIdItemLocal();
        }
        if (e.getIdProducto() != null && item.getProductoId() == e.getIdProducto()) {
            if (e.getIdPromocion() != null || item.getIdPromocion() != null) {
                return java.util.Objects.equals(e.getIdPromocion(), item.getIdPromocion());
            }
            return true;
        }
        return e.getIdItem() == item.getIdItemLocal();
    }

    private TicketItem mapearAItem(TicketItemEntity e) {
        TicketItem it = new TicketItem(
                e.getIdProducto() != null ? e.getIdProducto() : 0,
                e.getNombre(),
                e.getCantidad(),
                e.getPrecioUnitario(),
                e.getTipoPrecio()
        );
        it.setIdItemLocal(e.getIdItem());
        it.setCobroEnvase(e.getPrecioEnvase());
        it.setCantidadEnvase(e.getCantidadEnvase());
        it.setGramaje(e.isGramaje());
        it.setIdVentaDetalle(e.getIdVentaDetalleServidor());
        it.setIdPromocion(e.getIdPromocion());
        return it;
    }

    private List<TicketEntity> obtenerTicketsSync() {
        try {
            List<TicketEntity> todos = ticketDao.getAllSync();
            return todos != null ? todos : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private void recargarItemsYTotal(long ticketId) {
        List<TicketItemEntity> ents = ticketItemDao.getByTicketSync(ticketId);
        List<TicketItem> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        int count = 0;
        if (ents != null) {
            for (TicketItemEntity e : ents) {
                TicketItem it = mapearAItem(e);
                items.add(it);
                count += e.getCantidad();
                if (e.isGramaje()) {
                    total = total.add(e.getPrecioUnitario());
                } else {
                    total = total.add(e.getPrecioUnitario().multiply(BigDecimal.valueOf(e.getCantidad())));
                }
                if (e.isCobroEnvase() && e.getPrecioEnvase() != null) {
                    int ce = e.getCantidadEnvase() > 0 ? e.getCantidadEnvase() : e.getCantidad();
                    total = total.add(e.getPrecioEnvase().multiply(BigDecimal.valueOf(ce)));
                }
            }
        }
        final List<TicketItem> fItems = items;
        final BigDecimal fTotal = total;
        final int fCount = count;
        TicketEntity ticket = ticketDao.getByIdSync(ticketId);
        if (ticket != null) {
            ticket.setMontoTotal(total);
            ticketDao.update(ticket);
        }
        mainHandler.post(() -> {
            itemsActual.setValue(fItems);
            ticketTotal.setValue(fTotal);
            ticketCount.setValue(fCount);
            recargarTickets();
        });
    }

    private void recalcular(List<TicketItem> items) {
        BigDecimal total = BigDecimal.ZERO;
        int count = 0;
        for (TicketItem it : items) {
            count += it.getCantidad();
            total = total.add(it.getTotalConEnvase());
        }
        ticketTotal.setValue(total);
        ticketCount.setValue(count);
    }

    private void recargarTickets() {
        dbExecutor.execute(() -> {
            List<TicketEntity> todos = obtenerTicketsSync();
            mainHandler.post(() -> tickets.setValue(todos));
        });
    }
}
