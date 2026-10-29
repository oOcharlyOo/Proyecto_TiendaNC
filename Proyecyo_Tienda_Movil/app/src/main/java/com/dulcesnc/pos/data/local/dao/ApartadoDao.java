package com.dulcesnc.pos.data.local.dao;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import androidx.room.Update;

import com.dulcesnc.pos.data.local.entity.ApartadoEntity;

import java.util.List;

@Dao
public interface ApartadoDao {

    @Query("SELECT * FROM apartados ORDER BY fecha_inicio DESC")
    LiveData<List<ApartadoEntity>> getAll();

    @Query("SELECT * FROM apartados WHERE estatus = 'A' ORDER BY fecha_inicio DESC")
    LiveData<List<ApartadoEntity>> getActivos();

    @Query("SELECT * FROM apartados WHERE id_apartado = :id")
    ApartadoEntity getByIdSync(long id);

    @Query("SELECT * FROM apartados WHERE sincronizado = 0")
    List<ApartadoEntity> getNoSincronizados();

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insert(ApartadoEntity apartado);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertAll(List<ApartadoEntity> apartados);

    @Update
    void update(ApartadoEntity apartado);

    @Query("UPDATE apartados SET sincronizado = 1 WHERE id_apartado = :id")
    void marcarSincronizado(long id);

    @Query("DELETE FROM apartados WHERE id_apartado = :id")
    void deleteById(long id);

    @Query("DELETE FROM apartados")
    void deleteAll();
}
