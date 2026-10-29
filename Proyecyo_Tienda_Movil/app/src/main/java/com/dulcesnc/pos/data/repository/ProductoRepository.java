package com.dulcesnc.pos.data.repository;

import android.content.Context;

import androidx.lifecycle.LiveData;

import com.dulcesnc.pos.data.local.DatabaseClient;
import com.dulcesnc.pos.data.local.dao.ProductoDao;
import com.dulcesnc.pos.data.local.entity.ProductoEntity;
import com.dulcesnc.pos.data.remote.RetrofitClient;
import com.dulcesnc.pos.data.remote.dto.ProductoDTO;

import java.util.ArrayList;
import java.util.List;

import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;
import io.reactivex.rxjava3.core.Single;
import io.reactivex.rxjava3.schedulers.Schedulers;

public class ProductoRepository {

    private final ProductoDao productoDao;
    private final RetrofitClient retrofitClient;

    public ProductoRepository(Context context) {
        productoDao = DatabaseClient.getInstance(context).getAppDatabase().productoDao();
        retrofitClient = RetrofitClient.getInstance();
    }

    public LiveData<List<ProductoEntity>> getAllActivos() {
        return productoDao.getAllActivos();
    }

    public LiveData<ProductoEntity> getById(long id) {
        return productoDao.getById(id);
    }

    public LiveData<ProductoEntity> getByCodigoBarras(String codigo) {
        return productoDao.getByCodigoBarras(codigo);
    }

    public LiveData<List<ProductoEntity>> searchByName(String query) {
        return productoDao.searchByName(query);
    }

    public LiveData<List<ProductoEntity>> getByCategoria(long categoriaId) {
        return productoDao.getByCategoria(categoriaId);
    }

    public LiveData<Integer> countActivos() {
        return productoDao.countActivos();
    }

    public LiveData<Integer> countLowStock() {
        return productoDao.countLowStock();
    }

    public LiveData<Integer> countOutOfStock() {
        return productoDao.countOutOfStock();
    }

    public Single<List<ProductoEntity>> syncFromServer() {
        return retrofitClient.getApiService().listarProductos()
                .subscribeOn(Schedulers.io())
                .map(response -> {
                    if (response.isSuccess() && response.getDatos() != null) {
                        List<ProductoEntity> entities = new ArrayList<>();
                        for (ProductoDTO dto : response.getDatos()) {
                            entities.add(mapToEntity(dto));
                        }
                        productoDao.deleteAll();
                        productoDao.insertAll(entities);
                        return entities;
                    }
                    throw new RuntimeException("Error al sincronizar productos: " + response.getMensaje());
                })
                .observeOn(AndroidSchedulers.mainThread());
    }

    private ProductoEntity mapToEntity(ProductoDTO dto) {
        return new ProductoEntity(
                dto.getIdProducto(),
                dto.getNombre(),
                dto.getPrecioCosto(),
                dto.getPrecioVenta(),
                dto.getStock(),
                dto.getCantidadMin(),
                dto.getCantidadMax(),
                dto.getPrecioMayoreo(),
                dto.getIsGramaje(),
                dto.getRequiereEnvase(),
                dto.getPrecioEnvase(),
                dto.getCodigoBarras(),
                dto.getIdCategoria(),
                dto.getIdSubcategoria(),
                dto.getEstatus(),
                dto.getPresentacionCaja()
        );
    }
}
