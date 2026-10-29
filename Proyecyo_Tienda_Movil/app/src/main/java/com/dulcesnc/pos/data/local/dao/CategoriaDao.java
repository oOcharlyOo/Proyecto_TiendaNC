package com.dulcesnc.pos.data.local.dao;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

import com.dulcesnc.pos.data.local.entity.CategoriaEntity;

import java.util.List;

@Dao
public interface CategoriaDao {

    @Query("SELECT * FROM categorias WHERE estatus = 'A' ORDER BY nombre ASC")
    LiveData<List<CategoriaEntity>> getAllActivas();

    @Query("SELECT * FROM categorias WHERE id_categoria = :id")
    LiveData<CategoriaEntity> getById(long id);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertAll(List<CategoriaEntity> categorias);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insert(CategoriaEntity categoria);

    @Query("SELECT * FROM categorias WHERE sincronizado = 0")
    List<CategoriaEntity> getNoSincronizados();

    @Query("UPDATE categorias SET sincronizado = 1 WHERE id_categoria = :id")
    void marcarSincronizado(long id);

    @Query("DELETE FROM categorias WHERE id_categoria = :id")
    void deleteById(long id);

    @Query("DELETE FROM categorias")
    void deleteAll();
}
