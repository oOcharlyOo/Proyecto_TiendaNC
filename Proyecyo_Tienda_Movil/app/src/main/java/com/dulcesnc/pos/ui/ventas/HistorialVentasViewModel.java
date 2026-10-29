package com.dulcesnc.pos.ui.ventas;

import android.app.Application;

import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;

import com.dulcesnc.pos.data.local.DatabaseClient;
import com.dulcesnc.pos.data.local.entity.ProductoEntity;
import com.dulcesnc.pos.data.local.entity.VentaDetalleEntity;
import com.dulcesnc.pos.data.local.entity.VentaEntity;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class HistorialVentasViewModel extends AndroidViewModel {

    private final LiveData<List<VentaEntity>> ventas;
    private final ExecutorService dbExecutor = Executors.newSingleThreadExecutor();

    public HistorialVentasViewModel(Application application) {
        super(application);
        ventas = DatabaseClient.getInstance(application)
                .getAppDatabase().ventaDao().getAll();
    }

    public LiveData<List<VentaEntity>> getVentas() {
        return ventas;
    }

    public void cancelarVenta(long idVenta) {
        dbExecutor.execute(() -> {
            try {
                com.dulcesnc.pos.data.local.AppDatabase db =
                        DatabaseClient.getInstance(getApplication()).getAppDatabase();

                List<VentaDetalleEntity> detalles = db.ventaDetalleDao().getByVentaIdSync(idVenta);
                if (detalles != null) {
                    for (VentaDetalleEntity det : detalles) {
                        ProductoEntity producto = db.productoDao().getByIdSync(det.getIdProducto());
                        if (producto != null) {
                            Integer stock = producto.getStock();
                            int nuevoStock = (stock == null ? 0 : stock) + det.getCantidad();
                            producto.setStock(nuevoStock);
                            db.productoDao().update(producto);
                        }
                    }
                }

                VentaEntity venta = db.ventaDao().getByIdSync(idVenta);
                if (venta != null) {
                    venta.setEstatus("X");
                    venta.setSincronizado(false);
                    db.ventaDao().update(venta);
                }
            } catch (Exception e) {
                android.util.Log.e("HistorialVM", "Error al cancelar venta", e);
            }
        });
    }
}
