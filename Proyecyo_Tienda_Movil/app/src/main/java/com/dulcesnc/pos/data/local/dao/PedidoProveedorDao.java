package com.dulcesnc.pos.data.local.dao;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import androidx.room.Update;

import com.dulcesnc.pos.data.local.entity.PedidoProveedorEntity;

import java.util.List;

@Dao
public interface PedidoProveedorDao {

    @Query("SELECT * FROM pedidos_proveedor ORDER BY fecha_creacion DESC")
    LiveData<List<PedidoProveedorEntity>> getAll();

    @Query("SELECT * FROM pedidos_proveedor WHERE id_pedido = :id")
    PedidoProveedorEntity getByIdSync(long id);

    @Query("SELECT * FROM pedidos_proveedor WHERE sincronizado = 0")
    List<PedidoProveedorEntity> getNoSincronizados();

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insert(PedidoProveedorEntity pedido);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertAll(List<PedidoProveedorEntity> pedidos);

    @Update
    void update(PedidoProveedorEntity pedido);

    @Query("UPDATE pedidos_proveedor SET sincronizado = 1 WHERE id_pedido = :id")
    void marcarSincronizado(long id);

    @Query("DELETE FROM pedidos_proveedor WHERE id_pedido = :id")
    void deleteById(long id);

    @Query("DELETE FROM pedidos_proveedor")
    void deleteAll();
}
