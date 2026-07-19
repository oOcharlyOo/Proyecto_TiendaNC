package com.dulcesnc.pos.data.local.dao;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

import com.dulcesnc.pos.data.local.entity.CajaMovimientoEntity;

import java.util.List;

@Dao
public interface CajaMovimientoDao {

    @Query("SELECT * FROM caja_movs WHERE fecha LIKE :fecha || '%' ORDER BY id_movimiento DESC")
    LiveData<List<CajaMovimientoEntity>> getByFecha(String fecha);

    @Query("SELECT * FROM caja_movs ORDER BY id_movimiento DESC")
    LiveData<List<CajaMovimientoEntity>> getAll();

    @Query("SELECT * FROM caja_movs WHERE fecha LIKE :fecha || '%' ORDER BY id_movimiento DESC")
    LiveData<List<CajaMovimientoEntity>> getMovimientosDelDia(String fecha);

    @Query("SELECT * FROM caja_movs WHERE sincronizado = 0")
    List<CajaMovimientoEntity> getNoSincronizados();

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    long insert(CajaMovimientoEntity movimiento);

    @Query("UPDATE caja_movs SET sincronizado = 1 WHERE id_movimiento = :id")
    void marcarSincronizado(long id);

    @Query("DELETE FROM caja_movs")
    void deleteAll();
}