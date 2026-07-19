package com.dulcesnc.pos.data.local.dao;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

import com.dulcesnc.pos.data.local.entity.VentaDetalleEntity;

import java.util.List;

@Dao
public interface VentaDetalleDao {

    @Query("SELECT * FROM ventas_detalle WHERE id_venta = :ventaId")
    LiveData<List<VentaDetalleEntity>> getByVentaId(long ventaId);

    @Query("SELECT * FROM ventas_detalle WHERE id_venta = :ventaId")
    List<VentaDetalleEntity> getByVentaIdSync(long ventaId);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertAll(List<VentaDetalleEntity> detalles);

    @Query("DELETE FROM ventas_detalle WHERE id_venta = :ventaId")
    void deleteByVentaId(long ventaId);

    @Query("DELETE FROM ventas_detalle")
    void deleteAll();
}
