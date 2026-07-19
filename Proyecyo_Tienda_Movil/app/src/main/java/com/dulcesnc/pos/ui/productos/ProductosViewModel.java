package com.dulcesnc.pos.ui.productos;

import android.app.Application;

import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.Transformations;

import com.dulcesnc.pos.data.local.entity.ProductoEntity;
import com.dulcesnc.pos.data.repository.ProductoRepository;

import java.util.List;

public class ProductosViewModel extends AndroidViewModel {

    private final ProductoRepository productoRepository;
    private final MutableLiveData<String> searchQuery = new MutableLiveData<>("");

    private final LiveData<List<ProductoEntity>> filteredProducts;

    public ProductosViewModel(Application application) {
        super(application);
        productoRepository = new ProductoRepository(application);

        filteredProducts = Transformations.switchMap(searchQuery, query -> {
            if (query != null && !query.trim().isEmpty()) {
                return productoRepository.searchByName(query.trim());
            }
            return productoRepository.getAllActivos();
        });
    }

    public LiveData<List<ProductoEntity>> getFilteredProducts() {
        return filteredProducts;
    }

    public void setSearchQuery(String query) {
        searchQuery.setValue(query);
    }

    public void sync() {
        productoRepository.syncFromServer().subscribe();
    }
}
