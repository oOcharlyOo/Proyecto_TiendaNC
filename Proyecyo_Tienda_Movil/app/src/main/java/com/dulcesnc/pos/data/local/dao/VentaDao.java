package com.dulcesnc.pos.data.local.dao;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import androidx.room.Update;

import com.dulcesnc.pos.data.local.entity.VentaEntity;

import java.util.List;

@Dao
public interface VentaDao {

    @Query("SELECT * FROM ventas ORDER BY fecha_venta DESC")
    LiveData<List<VentaEntity>> getAll();

    @Query("SELECT * FROM ventas WHERE id_venta = :id")
    LiveData<VentaEntity> getById(long id);

    @Query("SELECT * FROM ventas WHERE id_venta = :id")
    VentaEntity getByIdSync(long id);

    @Query("SELECT * FROM ventas WHERE estatus = 'P' ORDER BY fecha_venta DESC")
    LiveData<List<VentaEntity>> getPendientes();

    @Query("SELECT * FROM ventas WHERE estatus = 'C' AND fecha_venta LIKE :fecha || '%' ORDER BY fecha_venta DESC")
    LiveData<List<VentaEntity>> getVentasDelDia(String fecha);

    @Query("SELECT * FROM ventas WHERE sincronizado = 0 ORDER BY fecha_venta ASC")
    List<VentaEntity> getNoSincronizadas();

    @Query("SELECT MAX(numero_ticket) FROM ventas")
    LiveData<Integer> getUltimoNumeroTicket();

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    long insert(VentaEntity venta);

    @Update
    void update(VentaEntity venta);

    @Query("UPDATE ventas SET sincronizado = 1 WHERE id_venta = :id")
    void marcarSincronizado(long id);

    @Query("DELETE FROM ventas")
    void deleteAll();
}
