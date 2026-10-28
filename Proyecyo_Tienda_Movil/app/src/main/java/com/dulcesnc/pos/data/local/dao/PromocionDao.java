package com.dulcesnc.pos.data.local.dao;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import androidx.room.Update;

import com.dulcesnc.pos.data.local.entity.PromocionEntity;

import java.util.List;

@Dao
public interface PromocionDao {

    @Query("SELECT * FROM promociones ORDER BY nombre ASC")
    LiveData<List<PromocionEntity>> getAll();

    @Query("SELECT * FROM promociones WHERE activa = 1 ORDER BY nombre ASC")
    LiveData<List<PromocionEntity>> getActivas();

    @Query("SELECT * FROM promociones WHERE id_promocion = :id")
    PromocionEntity getByIdSync(long id);

    @Query("SELECT * FROM promociones WHERE sincronizado = 0")
    List<PromocionEntity> getNoSincronizados();

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insert(PromocionEntity promocion);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertAll(List<PromocionEntity> promociones);

    @Update
    void update(PromocionEntity promocion);

    @Query("UPDATE promociones SET sincronizado = 1 WHERE id_promocion = :id")
    void marcarSincronizado(long id);

    @Query("DELETE FROM promociones WHERE id_promocion = :id")
    void deleteById(long id);

    @Query("DELETE FROM promociones")
    void deleteAll();
}
