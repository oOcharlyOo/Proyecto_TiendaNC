package com.dulcesnc.pos.data.local.dao;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import androidx.room.Update;

import com.dulcesnc.pos.data.local.entity.ProductoEntity;

import java.util.List;

@Dao
public interface ProductoDao {

    @Query("SELECT * FROM productos WHERE estatus = 'A' ORDER BY nombre ASC")
    LiveData<List<ProductoEntity>> getAllActivos();

    @Query("SELECT * FROM productos WHERE id_producto = :id")
    LiveData<ProductoEntity> getById(long id);

    @Query("SELECT * FROM productos WHERE id_producto = :id")
    ProductoEntity getByIdSync(long id);

    @Query("SELECT * FROM productos WHERE codigo_barras = :codigo LIMIT 1")
    LiveData<ProductoEntity> getByCodigoBarras(String codigo);

    @Query("SELECT * FROM productos WHERE nombre LIKE '%' || :query || '%' AND estatus = 'A' ORDER BY nombre ASC")
    LiveData<List<ProductoEntity>> searchByName(String query);

    @Query("SELECT * FROM productos WHERE id_categoria = :categoriaId AND estatus = 'A' ORDER BY nombre ASC")
    LiveData<List<ProductoEntity>> getByCategoria(long categoriaId);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertAll(List<ProductoEntity> productos);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insert(ProductoEntity producto);

    @Update
    void update(ProductoEntity producto);

    @Query("DELETE FROM productos WHERE id_producto = :id")
    void deleteById(long id);

    @Query("DELETE FROM productos")
    void deleteAll();

    @Query("SELECT COUNT(*) FROM productos WHERE estatus = 'A'")
    LiveData<Integer> countActivos();

    @Query("SELECT COUNT(*) FROM productos WHERE stock <= cantidad_min AND estatus = 'A'")
    LiveData<Integer> countLowStock();

    @Query("SELECT COUNT(*) FROM productos WHERE stock <= 0 AND estatus = 'A'")
    LiveData<Integer> countOutOfStock();

    @Query("SELECT * FROM productos WHERE sincronizado = 0")
    List<ProductoEntity> getNoSincronizados();

    @Query("UPDATE productos SET sincronizado = 1 WHERE id_producto = :id")
    void marcarSincronizado(long id);
}
